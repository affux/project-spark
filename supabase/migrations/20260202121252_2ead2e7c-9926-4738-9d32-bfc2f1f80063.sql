
-- Add a validation trigger to ensure wallet payments always have a corresponding transaction
-- This acts as a safety net in case any code bypasses the edge function

CREATE OR REPLACE FUNCTION public.validate_wallet_payment_on_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_cost NUMERIC;
  has_payment_tx BOOLEAN;
BEGIN
  -- Only check when status changes TO paid_by_user from pending_payment
  IF NEW.status = 'paid_by_user' AND 
     (OLD.status IS NULL OR OLD.status = 'pending_payment') AND
     NEW.payment_type = 'wallet' THEN
    
    -- Calculate order cost
    order_cost := NEW.base_price * NEW.quantity;
    
    -- Check if a wallet debit transaction exists for this order
    SELECT EXISTS (
      SELECT 1 FROM wallet_transactions 
      WHERE order_id = NEW.id 
        AND type = 'order_payment' 
        AND amount < 0
    ) INTO has_payment_tx;
    
    -- If no payment transaction exists, log a warning
    -- We don't block the transaction to avoid breaking existing flows,
    -- but this helps with auditing
    IF NOT has_payment_tx THEN
      RAISE WARNING 'Order % marked as paid_by_user with wallet payment_type but no wallet_transaction found', NEW.order_number;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger (drop if exists first)
DROP TRIGGER IF EXISTS validate_wallet_payment_trigger ON orders;

CREATE TRIGGER validate_wallet_payment_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_wallet_payment_on_order_update();

-- Add comment for documentation
COMMENT ON FUNCTION public.validate_wallet_payment_on_order_update() IS 
  'Validates that wallet payments have corresponding wallet_transaction records. Logs warnings for audit purposes.';

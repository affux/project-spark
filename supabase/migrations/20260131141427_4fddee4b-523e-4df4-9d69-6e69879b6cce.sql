-- Drop existing functions first
DROP FUNCTION IF EXISTS public.credit_wallet_on_order_completed() CASCADE;
DROP FUNCTION IF EXISTS public.sync_wallet_on_order_status_change() CASCADE;

-- Create updated function to credit FULL ORDER VALUE on order completion
CREATE OR REPLACE FUNCTION public.credit_wallet_on_order_completed()
RETURNS TRIGGER AS $$
DECLARE
  order_total NUMERIC;
  current_balance NUMERIC;
BEGIN
  -- Only process when status changes TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Check if already credited for this order
    IF EXISTS (
      SELECT 1 FROM public.wallet_transactions 
      WHERE order_id = NEW.id AND type = 'order_commission'
    ) THEN
      RETURN NEW;
    END IF;
    
    -- Calculate FULL ORDER VALUE (not just profit)
    order_total := COALESCE(NEW.selling_price, 0) * COALESCE(NEW.quantity, 0);
    order_total := ROUND(order_total::numeric, 2);
    
    IF order_total > 0 THEN
      SELECT COALESCE(wallet_balance, 0) INTO current_balance
      FROM public.profiles WHERE user_id = NEW.dropshipper_user_id;
      
      UPDATE public.profiles 
      SET wallet_balance = ROUND((COALESCE(wallet_balance, 0) + order_total)::numeric, 2),
          updated_at = now()
      WHERE user_id = NEW.dropshipper_user_id;
      
      INSERT INTO public.wallet_transactions (user_id, order_id, type, amount, description)
      VALUES (
        NEW.dropshipper_user_id,
        NEW.id,
        'order_commission',
        order_total,
        'Order ' || NEW.order_number || ' completed - Full order value'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create updated sync function for status reversals
CREATE OR REPLACE FUNCTION public.sync_wallet_on_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  order_total NUMERIC;
  credited_amount NUMERIC;
BEGIN
  -- Handle reversion FROM completed to non-completed
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    SELECT amount INTO credited_amount
    FROM public.wallet_transactions
    WHERE order_id = NEW.id AND type = 'order_commission'
    LIMIT 1;
    
    IF credited_amount IS NOT NULL AND credited_amount > 0 THEN
      UPDATE public.profiles
      SET wallet_balance = ROUND((COALESCE(wallet_balance, 0) - credited_amount)::numeric, 2),
          updated_at = now()
      WHERE user_id = NEW.dropshipper_user_id;
      
      DELETE FROM public.wallet_transactions
      WHERE order_id = NEW.id AND type = 'order_commission';
      
      INSERT INTO public.wallet_transactions (user_id, order_id, type, amount, description)
      VALUES (
        NEW.dropshipper_user_id,
        NEW.id,
        'order_reversal',
        -credited_amount,
        'Order ' || NEW.order_number || ' status reverted from completed'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate triggers
DROP TRIGGER IF EXISTS trigger_credit_wallet_on_order_completed ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_wallet_on_order_status_change ON public.orders;

CREATE TRIGGER trigger_credit_wallet_on_order_completed
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.credit_wallet_on_order_completed();

CREATE TRIGGER trigger_sync_wallet_on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_wallet_on_order_status_change();
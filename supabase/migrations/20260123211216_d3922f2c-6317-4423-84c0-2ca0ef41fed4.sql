-- Update the sync_wallet_on_order_status_change function to also handle 
-- refunding wallet payments when order is reverted to pending_payment

CREATE OR REPLACE FUNCTION public.sync_wallet_on_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auto_credit_enabled text;
  order_total numeric;
  current_net numeric;
  has_order_value boolean;
  delta numeric;
  wallet_payment_amount numeric;
BEGIN
  IF TG_OP <> 'UPDATE' OR (NEW.status IS NOT DISTINCT FROM OLD.status) THEN
    RETURN NEW;
  END IF;

  -- Calculate order total (base_price * quantity for wallet payments)
  order_total := GREATEST(0, COALESCE(NEW.base_price, 0) * COALESCE(NEW.quantity, 0));

  -- PART 1: Handle wallet payment refunds when reverting to pending_payment
  -- This applies to orders paid via wallet that are being reverted
  IF NEW.status = 'pending_payment'::public.order_status 
     AND OLD.status IN ('paid_by_user'::public.order_status, 'processing'::public.order_status, 'completed'::public.order_status)
     AND NEW.payment_type = 'wallet' THEN
    
    -- Check if there was a wallet payment deduction for this order
    SELECT COALESCE(ABS(SUM(amount)), 0) INTO wallet_payment_amount
      FROM public.wallet_transactions wt
     WHERE wt.order_id = NEW.id
       AND wt.user_id = NEW.dropshipper_user_id
       AND wt.type = 'order_payment'
       AND wt.amount < 0;
    
    -- Check if refund was already issued
    IF wallet_payment_amount > 0 AND NOT EXISTS (
      SELECT 1 FROM public.wallet_transactions wt
       WHERE wt.order_id = NEW.id
         AND wt.user_id = NEW.dropshipper_user_id
         AND wt.type = 'wallet_refund'
    ) THEN
      -- Refund the wallet payment
      UPDATE public.profiles
         SET wallet_balance = COALESCE(wallet_balance, 0) + wallet_payment_amount
       WHERE user_id = NEW.dropshipper_user_id;

      INSERT INTO public.wallet_transactions (user_id, amount, type, description, order_id)
      VALUES (
        NEW.dropshipper_user_id,
        wallet_payment_amount,
        'wallet_refund',
        'Refund for order ' || NEW.order_number || ' reverted to pending payment',
        NEW.id
      );
    END IF;
  END IF;

  -- PART 2: Handle auto_credit_on_complete functionality (existing logic)
  SELECT value INTO auto_credit_enabled
    FROM public.platform_settings
   WHERE key = 'auto_credit_on_complete';

  IF COALESCE(auto_credit_enabled, 'false') <> 'true' THEN
    RETURN NEW;
  END IF;

  -- Use selling_price for auto credit calculations
  order_total := GREATEST(0, COALESCE(NEW.selling_price, 0) * COALESCE(NEW.quantity, 0));
  IF order_total <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO current_net
    FROM public.wallet_transactions wt
   WHERE wt.order_id = NEW.id
     AND wt.user_id = NEW.dropshipper_user_id
     AND wt.type = ANY (ARRAY['order_value'::text, 'order_commission'::text, 'credit'::text, 'debit'::text, 'reversal'::text]);

  SELECT EXISTS (
    SELECT 1 FROM public.wallet_transactions wt
     WHERE wt.order_id = NEW.id
       AND wt.user_id = NEW.dropshipper_user_id
       AND wt.type = 'order_value'
       AND wt.amount > 0
  ) INTO has_order_value;

  IF OLD.status IS DISTINCT FROM 'completed'::public.order_status
     AND NEW.status = 'completed'::public.order_status THEN

    delta := order_total - current_net;

    IF delta > 0 THEN
      UPDATE public.profiles
         SET wallet_balance = COALESCE(wallet_balance, 0) + delta
       WHERE user_id = NEW.dropshipper_user_id;

      INSERT INTO public.wallet_transactions (user_id, amount, type, description, order_id)
      VALUES (
        NEW.dropshipper_user_id,
        delta,
        CASE WHEN has_order_value THEN 'credit' ELSE 'order_value' END,
        CASE
          WHEN has_order_value THEN 'Order re-completed - credit restored for ' || NEW.order_number
          ELSE 'Order value for order ' || NEW.order_number
        END,
        NEW.id
      );
    ELSIF delta < 0 THEN
      UPDATE public.profiles
         SET wallet_balance = COALESCE(wallet_balance, 0) + delta
       WHERE user_id = NEW.dropshipper_user_id;

      INSERT INTO public.wallet_transactions (user_id, amount, type, description, order_id)
      VALUES (
        NEW.dropshipper_user_id,
        delta,
        'debit',
        'Order completed - over-credit correction for ' || NEW.order_number,
        NEW.id
      );
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status = 'completed'::public.order_status
     AND NEW.status IS DISTINCT FROM 'completed'::public.order_status THEN

    delta := 0 - current_net;

    IF delta <> 0 THEN
      UPDATE public.profiles
         SET wallet_balance = COALESCE(wallet_balance, 0) + delta
       WHERE user_id = NEW.dropshipper_user_id;

      INSERT INTO public.wallet_transactions (user_id, amount, type, description, order_id)
      VALUES (
        NEW.dropshipper_user_id,
        delta,
        CASE WHEN delta < 0 THEN 'debit' ELSE 'credit' END,
        'Order status reverted from completed to ' || NEW.status::text || ' for ' || NEW.order_number,
        NEW.id
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;
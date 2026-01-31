-- Fix wallet balance staying unchanged after wallet payments by crediting only PROFIT on order completion
-- Previously, completing an order could credit the full selling_price*qty back into wallet_balance,
-- which cancels out a wallet deduction of base_price*qty and makes the UI look like no deduction happened.

CREATE OR REPLACE FUNCTION public.credit_wallet_on_order_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auto_credit_enabled text;
  profit_total numeric;
  already_credited boolean;
BEGIN
  IF (TG_OP = 'UPDATE')
     AND (NEW.status = 'completed')
     AND (OLD.status IS DISTINCT FROM 'completed') THEN

    SELECT value
      INTO auto_credit_enabled
      FROM public.platform_settings
     WHERE key = 'auto_credit_on_complete';

    IF COALESCE(auto_credit_enabled, 'false') <> 'true' THEN
      RETURN NEW;
    END IF;

    -- Prevent double crediting
    SELECT EXISTS (
      SELECT 1
        FROM public.wallet_transactions wt
       WHERE wt.order_id = NEW.id
         AND wt.type = 'order_commission'
    ) INTO already_credited;

    IF already_credited THEN
      RETURN NEW;
    END IF;

    -- Credit only PROFIT: (selling - base) * qty
    profit_total := (COALESCE(NEW.selling_price, 0) - COALESCE(NEW.base_price, 0)) * COALESCE(NEW.quantity, 0);
    profit_total := GREATEST(0, COALESCE(profit_total, 0));

    IF profit_total <= 0 THEN
      RETURN NEW;
    END IF;

    UPDATE public.profiles
       SET wallet_balance = COALESCE(wallet_balance, 0) + profit_total
     WHERE user_id = NEW.dropshipper_user_id;

    INSERT INTO public.wallet_transactions (user_id, amount, type, description, order_id)
    VALUES (
      NEW.dropshipper_user_id,
      profit_total,
      'order_commission',
      'Profit for order ' || NEW.order_number,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.sync_wallet_on_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auto_credit_enabled text;
  profit_total numeric;
  current_net numeric;
  delta numeric;
  wallet_payment_amount numeric;
BEGIN
  IF TG_OP <> 'UPDATE' OR (NEW.status IS NOT DISTINCT FROM OLD.status) THEN
    RETURN NEW;
  END IF;

  -- PART 1: Handle wallet payment refunds when reverting to pending_payment
  -- Refund based on recorded order_payment deductions
  IF NEW.status = 'pending_payment'::public.order_status 
     AND OLD.status IN ('paid_by_user'::public.order_status, 'processing'::public.order_status, 'completed'::public.order_status) THEN

    SELECT COALESCE(ABS(SUM(amount)), 0) INTO wallet_payment_amount
      FROM public.wallet_transactions wt
     WHERE wt.order_id = NEW.id
       AND wt.user_id = NEW.dropshipper_user_id
       AND wt.type = 'order_payment'
       AND wt.amount < 0;

    IF wallet_payment_amount > 0 AND NOT EXISTS (
      SELECT 1 FROM public.wallet_transactions wt
       WHERE wt.order_id = NEW.id
         AND wt.user_id = NEW.dropshipper_user_id
         AND wt.type = 'wallet_refund'
    ) THEN
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

      NEW.paid_at := NULL;
      NEW.payment_proof_url := NULL;
    END IF;
  END IF;

  -- PART 2: Auto-credit on complete (PROFIT only)
  SELECT value INTO auto_credit_enabled
    FROM public.platform_settings
   WHERE key = 'auto_credit_on_complete';

  IF COALESCE(auto_credit_enabled, 'false') <> 'true' THEN
    RETURN NEW;
  END IF;

  profit_total := (COALESCE(NEW.selling_price, 0) - COALESCE(NEW.base_price, 0)) * COALESCE(NEW.quantity, 0);
  profit_total := GREATEST(0, COALESCE(profit_total, 0));

  -- Track only commission-style credits/debits for this feature
  SELECT COALESCE(SUM(amount), 0) INTO current_net
    FROM public.wallet_transactions wt
   WHERE wt.order_id = NEW.id
     AND wt.user_id = NEW.dropshipper_user_id
     AND wt.type = ANY (ARRAY['order_commission'::text, 'credit'::text, 'debit'::text, 'reversal'::text]);

  -- When moving to completed, ensure wallet reflects profit_total
  IF OLD.status IS DISTINCT FROM 'completed'::public.order_status
     AND NEW.status = 'completed'::public.order_status THEN

    delta := profit_total - current_net;

    IF delta <> 0 THEN
      UPDATE public.profiles
         SET wallet_balance = COALESCE(wallet_balance, 0) + delta
       WHERE user_id = NEW.dropshipper_user_id;

      INSERT INTO public.wallet_transactions (user_id, amount, type, description, order_id)
      VALUES (
        NEW.dropshipper_user_id,
        delta,
        CASE WHEN delta < 0 THEN 'debit' ELSE 'order_commission' END,
        CASE
          WHEN delta < 0 THEN 'Order completed - profit correction for ' || NEW.order_number
          ELSE 'Profit for order ' || NEW.order_number
        END,
        NEW.id
      );
    END IF;

    RETURN NEW;
  END IF;

  -- When reverting from completed, remove any previously credited profit
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

-- Allow controlled bypass of profile field protection for trusted SECURITY DEFINER flows
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean;
  bypass_profile_protection boolean;
BEGIN
  -- Check if caller is admin
  is_admin := has_role(auth.uid(), 'admin'::app_role);

  -- Transaction-local bypass set only by trusted backend functions
  bypass_profile_protection := COALESCE(current_setting('app.bypass_profile_protection', true), 'false') = 'true';

  -- Skip protection for admins
  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Skip in service/backend context
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip when explicitly allowed by trusted SECURITY DEFINER function in this transaction
  IF bypass_profile_protection THEN
    RETURN NEW;
  END IF;

  -- Protect wallet_balance
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    RAISE EXCEPTION 'You are not allowed to modify wallet_balance';
  END IF;

  -- Protect user_level
  IF NEW.user_level IS DISTINCT FROM OLD.user_level THEN
    RAISE EXCEPTION 'You are not allowed to modify user_level';
  END IF;

  -- Protect user_status
  IF NEW.user_status IS DISTINCT FROM OLD.user_status THEN
    RAISE EXCEPTION 'You are not allowed to modify user_status';
  END IF;

  -- Protect commission_override
  IF NEW.commission_override IS DISTINCT FROM OLD.commission_override THEN
    RAISE EXCEPTION 'You are not allowed to modify commission_override';
  END IF;

  -- Protect postpaid fields
  IF NEW.postpaid_enabled IS DISTINCT FROM OLD.postpaid_enabled THEN
    RAISE EXCEPTION 'You are not allowed to modify postpaid_enabled';
  END IF;

  IF NEW.postpaid_credit_limit IS DISTINCT FROM OLD.postpaid_credit_limit THEN
    RAISE EXCEPTION 'You are not allowed to modify postpaid_credit_limit';
  END IF;

  IF NEW.postpaid_used IS DISTINCT FROM OLD.postpaid_used THEN
    RAISE EXCEPTION 'You are not allowed to modify postpaid_used';
  END IF;

  IF NEW.allow_payout_with_dues IS DISTINCT FROM OLD.allow_payout_with_dues THEN
    RAISE EXCEPTION 'You are not allowed to modify allow_payout_with_dues';
  END IF;

  IF NEW.postpaid_due_cycle IS DISTINCT FROM OLD.postpaid_due_cycle THEN
    RAISE EXCEPTION 'You are not allowed to modify postpaid_due_cycle';
  END IF;

  -- Protect is_active
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'You are not allowed to modify is_active';
  END IF;

  RETURN NEW;
END;
$function$;

-- Set transaction-local bypass before updating protected profile fields during postpaid payment
CREATE OR REPLACE FUNCTION public.process_postpaid_payment(_user_id uuid, _order_id uuid, _amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_used numeric;
  current_limit numeric;
  available_credit numeric;
  new_used numeric;
  order_record record;
  result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'You can only process payments for your own orders';
  END IF;

  SELECT postpaid_credit_limit, postpaid_used INTO current_limit, current_used
  FROM profiles WHERE user_id = _user_id FOR UPDATE;

  IF current_limit IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  available_credit := COALESCE(current_limit, 0) - COALESCE(current_used, 0);

  IF current_limit <= 0 THEN
    RAISE EXCEPTION 'Postpaid credit is not enabled for your account. Please contact admin.';
  END IF;

  IF _amount > available_credit THEN
    RAISE EXCEPTION 'Insufficient postpaid limit. Available credit: $%', available_credit;
  END IF;

  SELECT id, order_number, base_price, quantity, status, dropshipper_user_id INTO order_record
  FROM orders WHERE id = _order_id AND dropshipper_user_id = _user_id FOR UPDATE;

  IF order_record IS NULL THEN
    RAISE EXCEPTION 'Order not found or access denied';
  END IF;

  IF order_record.status != 'pending_payment' THEN
    RAISE EXCEPTION 'Order is not in pending_payment status. Current status: %', order_record.status;
  END IF;

  new_used := COALESCE(current_used, 0) + _amount;

  UPDATE orders
  SET status = 'postpaid_pending', payment_type = 'postpaid', paid_at = now(), updated_at = now()
  WHERE id = _order_id;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  UPDATE profiles
  SET postpaid_used = new_used, updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO postpaid_transactions (user_id, order_id, amount, transaction_type, description, balance_before, balance_after, status)
  VALUES (_user_id, _order_id, _amount, 'credit_used', 'Order ' || order_record.order_number || ' - Postpaid payment', current_used, new_used, 'completed');

  INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, changed_by_type, notes)
  VALUES (_order_id, 'pending_payment', 'postpaid_pending', _user_id, 'user', 'Paid using postpaid credit');

  result := jsonb_build_object(
    'success', true,
    'order_number', order_record.order_number,
    'amount', _amount,
    'new_postpaid_used', new_used,
    'available_credit', current_limit - new_used,
    'credit_limit', current_limit
  );

  RETURN result;
END;
$function$;

-- Set transaction-local bypass before updating protected profile fields during postpaid repayment
CREATE OR REPLACE FUNCTION public.process_postpaid_repayment(_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _wallet_balance numeric;
  _postpaid_used numeric;
  _new_wallet_balance numeric;
  _new_postpaid_used numeric;
  _order record;
  _orders_cleared jsonb := '[]'::jsonb;
  _remaining_payment numeric;
  _order_amount numeric;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  SELECT wallet_balance, postpaid_used INTO _wallet_balance, _postpaid_used
  FROM profiles
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _wallet_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF _amount > _wallet_balance THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Available: $%', _wallet_balance;
  END IF;

  IF _amount > _postpaid_used THEN
    RAISE EXCEPTION 'Amount exceeds outstanding postpaid dues ($%)', _postpaid_used;
  END IF;

  _new_wallet_balance := _wallet_balance - _amount;
  _new_postpaid_used := _postpaid_used - _amount;
  _remaining_payment := _amount;

  FOR _order IN
    SELECT id, order_number, base_price, quantity
    FROM orders
    WHERE dropshipper_user_id = _user_id
      AND status = 'postpaid_pending'
    ORDER BY created_at ASC
  LOOP
    _order_amount := _order.base_price * _order.quantity;

    IF _remaining_payment >= _order_amount THEN
      UPDATE orders
      SET status = 'paid_by_user',
          postpaid_paid_at = now(),
          updated_at = now()
      WHERE id = _order.id;

      _orders_cleared := _orders_cleared || jsonb_build_object(
        'id', _order.id,
        'order_number', _order.order_number,
        'amount', _order_amount
      );

      INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, changed_by_type, notes)
      VALUES (_order.id, 'postpaid_pending', 'paid_by_user', _user_id, 'user', 'Cleared via postpaid repayment');

      _remaining_payment := _remaining_payment - _order_amount;
    END IF;

    EXIT WHEN _remaining_payment <= 0;
  END LOOP;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  UPDATE profiles
  SET wallet_balance = _new_wallet_balance,
      postpaid_used = _new_postpaid_used,
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO postpaid_transactions (
    user_id, amount, transaction_type, description,
    balance_before, balance_after, status
  ) VALUES (
    _user_id, _amount, 'credit_repaid',
    CASE
      WHEN jsonb_array_length(_orders_cleared) > 0
      THEN 'Postpaid repayment - cleared ' || jsonb_array_length(_orders_cleared) || ' order(s)'
      ELSE 'Postpaid dues repayment from wallet'
    END,
    _postpaid_used, _new_postpaid_used, 'completed'
  );

  INSERT INTO wallet_transactions (user_id, amount, type, description)
  VALUES (_user_id, -_amount, 'postpaid_repayment',
    CASE
      WHEN jsonb_array_length(_orders_cleared) > 0
      THEN 'Postpaid repayment - ' || jsonb_array_length(_orders_cleared) || ' order(s) cleared'
      ELSE 'Postpaid dues repayment'
    END
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_wallet_balance', _new_wallet_balance,
    'new_postpaid_used', _new_postpaid_used,
    'amount_paid', _amount,
    'orders_cleared', _orders_cleared,
    'orders_cleared_count', jsonb_array_length(_orders_cleared)
  );
END;
$function$;
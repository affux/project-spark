-- Create a SECURITY DEFINER function to process postpaid repayment
-- This bypasses the protect_profile_fields trigger that blocks user modifications

CREATE OR REPLACE FUNCTION public.process_postpaid_repayment(
  _amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- Get authenticated user
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate amount
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  -- Get current profile with lock
  SELECT wallet_balance, postpaid_used INTO _wallet_balance, _postpaid_used
  FROM profiles
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _wallet_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Validate sufficient wallet balance
  IF _amount > _wallet_balance THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Available: $%', _wallet_balance;
  END IF;

  -- Validate amount doesn't exceed postpaid dues
  IF _amount > _postpaid_used THEN
    RAISE EXCEPTION 'Amount exceeds outstanding postpaid dues ($%)', _postpaid_used;
  END IF;

  -- Calculate new balances
  _new_wallet_balance := _wallet_balance - _amount;
  _new_postpaid_used := _postpaid_used - _amount;
  _remaining_payment := _amount;

  -- Find and clear postpaid_pending orders (oldest first)
  FOR _order IN 
    SELECT id, order_number, base_price, quantity
    FROM orders
    WHERE dropshipper_user_id = _user_id
      AND status = 'postpaid_pending'
    ORDER BY created_at ASC
  LOOP
    _order_amount := _order.base_price * _order.quantity;
    
    IF _remaining_payment >= _order_amount THEN
      -- Clear this order
      UPDATE orders
      SET status = 'paid_by_user',
          postpaid_paid_at = now(),
          updated_at = now()
      WHERE id = _order.id;

      -- Add to cleared orders list
      _orders_cleared := _orders_cleared || jsonb_build_object(
        'id', _order.id,
        'order_number', _order.order_number,
        'amount', _order_amount
      );

      -- Record order status history
      INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, changed_by_type, notes)
      VALUES (_order.id, 'postpaid_pending', 'paid_by_user', _user_id, 'user', 'Cleared via postpaid repayment');

      _remaining_payment := _remaining_payment - _order_amount;
    END IF;

    EXIT WHEN _remaining_payment <= 0;
  END LOOP;

  -- Update profile balances
  UPDATE profiles
  SET wallet_balance = _new_wallet_balance,
      postpaid_used = _new_postpaid_used,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Record postpaid transaction
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

  -- Record wallet transaction
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
$$;
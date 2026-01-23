-- =============================================
-- DROPSHIP PLATFORM - INDEXES AND FUNCTIONS
-- =============================================

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_storefront_slug ON public.profiles(storefront_slug);
CREATE INDEX IF NOT EXISTS idx_profiles_user_status ON public.profiles(user_status);
CREATE INDEX IF NOT EXISTS idx_profiles_postpaid_enabled ON public.profiles(postpaid_enabled);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_product_media_product_id ON public.product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_storefront_products_user_id ON public.storefront_products(user_id);
CREATE INDEX IF NOT EXISTS idx_storefront_products_product_id ON public.storefront_products(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_dropshipper_user_id ON public.orders(dropshipper_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_type ON public.orders(payment_type);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user_id ON public.kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_status ON public.kyc_submissions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_order_id ON public.wallet_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_postpaid_transactions_user_id ON public.postpaid_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_postpaid_transactions_order_id ON public.postpaid_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON public.payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_status_history_payout_id ON public.payout_status_history(payout_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON public.chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_reassignment_logs_session_id ON public.chat_reassignment_logs(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_order_chat_messages_order_id ON public.order_chat_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_logs_user_id ON public.ip_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_logs_created_at ON public.ip_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_mfa_codes_user_id ON public.email_mfa_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON public.trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_support_agent_presence_user_id ON public.support_agent_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_user_id ON public.crypto_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_status ON public.crypto_payments(status);
CREATE INDEX IF NOT EXISTS idx_proof_of_work_user_id ON public.proof_of_work(user_id);
CREATE INDEX IF NOT EXISTS idx_proof_of_work_status ON public.proof_of_work(status);
CREATE INDEX IF NOT EXISTS idx_work_types_category ON public.work_types(category);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_custom_payment_methods_type ON public.custom_payment_methods(method_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_messages_enabled ON public.dashboard_messages(is_enabled);
CREATE INDEX IF NOT EXISTS idx_dashboard_message_targets_message_id ON public.dashboard_message_targets(message_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_message_targets_user_id ON public.dashboard_message_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_popup_messages_enabled ON public.popup_messages(is_enabled);
CREATE INDEX IF NOT EXISTS idx_popup_message_targets_message_id ON public.popup_message_targets(message_id);
CREATE INDEX IF NOT EXISTS idx_popup_message_targets_user_id ON public.popup_message_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_popup_acknowledgments_message_id ON public.popup_acknowledgments(message_id);
CREATE INDEX IF NOT EXISTS idx_popup_acknowledgments_user_id ON public.popup_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_top_dropshippers_rank ON public.top_dropshippers(rank_position);
CREATE INDEX IF NOT EXISTS idx_top_dropshippers_active ON public.top_dropshippers(is_active);
CREATE INDEX IF NOT EXISTS idx_user_rank_reference_user_id ON public.user_rank_reference(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON public.login_attempts(email, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON public.login_attempts(ip_address, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_chat_presence_agent_id ON public.agent_chat_presence(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_chat_presence_user_id ON public.agent_chat_presence(viewing_user_id);
CREATE INDEX IF NOT EXISTS idx_video_tutorial_completions_user_id ON public.video_tutorial_completions(user_id);

-- =============================================
-- FUNCTION DEFINITIONS
-- =============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.order_number = 'ORD-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

-- Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auto_approve BOOLEAN;
  initial_status user_status;
BEGIN
  SELECT value::boolean INTO auto_approve 
  FROM public.platform_settings 
  WHERE key = 'auto_user_approval';
  
  IF auto_approve = true THEN
    initial_status := 'approved';
  ELSE
    initial_status := 'pending';
  END IF;

  INSERT INTO public.profiles (user_id, email, name, user_status, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    initial_status,
    true
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Get KYC status
CREATE OR REPLACE FUNCTION public.get_kyc_status(_user_id UUID)
RETURNS kyc_status
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT status FROM public.kyc_submissions WHERE user_id = _user_id),
    'not_submitted'::kyc_status
  )
$$;

-- Check if KYC is approved
CREATE OR REPLACE FUNCTION public.is_kyc_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kyc_submissions 
    WHERE user_id = _user_id 
    AND status = 'approved'
  )
$$;

-- Check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id 
    AND user_status = 'approved'
  )
$$;

-- Get user commission rate
CREATE OR REPLACE FUNCTION public.get_user_commission_rate(_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT commission_override FROM public.profiles WHERE user_id = _user_id),
    (SELECT value::numeric FROM public.platform_settings WHERE key = 'commission_rate'),
    100
  )
$$;

-- Get public storefront profile
CREATE OR REPLACE FUNCTION public.get_public_storefront_profile(_slug TEXT)
RETURNS TABLE(user_id UUID, storefront_name TEXT, storefront_slug TEXT, storefront_banner TEXT, display_name TEXT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.user_id,
    p.storefront_name,
    p.storefront_slug,
    p.storefront_banner,
    COALESCE(p.storefront_name, p.name) as display_name
  FROM public.profiles p
  WHERE p.storefront_slug = _slug
    AND p.is_active = true
    AND p.user_status = 'approved';
$$;

-- Get assigned agent name
CREATE OR REPLACE FUNCTION public.get_assigned_agent_name(p_user_id uuid)
RETURNS TABLE(agent_name text, is_online boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.name as agent_name,
    COALESCE(sap.is_online, false) as is_online
  FROM profiles p
  JOIN chat_sessions cs ON cs.assigned_agent_id = p.user_id
  LEFT JOIN support_agent_presence sap ON sap.user_id = p.user_id
  WHERE cs.user_id = p_user_id
    AND cs.status = 'active'
  LIMIT 1;
$$;

-- Create audit log entry
CREATE OR REPLACE FUNCTION public.create_audit_log(
  _action_type TEXT,
  _admin_id UUID,
  _entity_id UUID,
  _entity_type TEXT,
  _metadata JSONB DEFAULT '{}'::jsonb,
  _new_value JSONB DEFAULT NULL,
  _old_value JSONB DEFAULT NULL,
  _reason TEXT DEFAULT NULL,
  _user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Only administrators can create audit logs';
  END IF;
  
  log_id := gen_random_uuid();
  INSERT INTO public.audit_logs (id, action_type, admin_id, entity_id, entity_type, metadata, new_value, old_value, reason, user_id)
  VALUES (log_id, _action_type, _admin_id, _entity_id, _entity_type, _metadata, _new_value, _old_value, _reason, _user_id);
  RETURN log_id;
END;
$$;

-- Log IP action
CREATE OR REPLACE FUNCTION public.log_ip_action(
  _user_id uuid,
  _ip_address text,
  _action_type text,
  _country text DEFAULT NULL,
  _city text DEFAULT NULL,
  _region text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _log_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;
  
  IF _ip_address IS NULL OR _ip_address = '' THEN
    RAISE EXCEPTION 'ip_address is required';
  END IF;
  
  IF _action_type IS NULL OR _action_type = '' THEN
    RAISE EXCEPTION 'action_type is required';
  END IF;
  
  IF _action_type NOT IN ('login', 'logout', 'order_placed', 'payout_request', 'profile_update') THEN
    RAISE EXCEPTION 'Invalid action_type: %', _action_type;
  END IF;
  
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Cannot log IP action for another user';
  END IF;
  
  INSERT INTO ip_logs (user_id, ip_address, action_type, country, city, region)
  VALUES (_user_id, _ip_address, _action_type, _country, _city, _region)
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Check login rate limit
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(_email text, _ip_address text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_attempts integer := 5;
  window_minutes integer := 15;
  lockout_minutes integer := 30;
  email_attempts integer;
  ip_attempts integer;
  last_attempt timestamptz;
  retry_after integer;
BEGIN
  SELECT COUNT(*), MAX(attempted_at) INTO email_attempts, last_attempt
  FROM login_attempts
  WHERE email = lower(_email)
    AND was_successful = false
    AND attempted_at > (now() - (window_minutes || ' minutes')::interval);
  
  IF email_attempts >= max_attempts THEN
    retry_after := EXTRACT(EPOCH FROM (last_attempt + (lockout_minutes || ' minutes')::interval - now()))::integer;
    IF retry_after > 0 THEN
      RETURN jsonb_build_object(
        'blocked', true,
        'remaining_attempts', 0,
        'retry_after_seconds', retry_after,
        'reason', 'Too many failed login attempts. Please try again later.'
      );
    END IF;
  END IF;
  
  IF _ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO ip_attempts
    FROM login_attempts
    WHERE ip_address = _ip_address
      AND was_successful = false
      AND attempted_at > (now() - (window_minutes || ' minutes')::interval);
    
    IF ip_attempts >= 10 THEN
      SELECT MAX(attempted_at) INTO last_attempt
      FROM login_attempts
      WHERE ip_address = _ip_address
        AND was_successful = false
        AND attempted_at > (now() - (window_minutes || ' minutes')::interval);
      
      retry_after := EXTRACT(EPOCH FROM (last_attempt + (lockout_minutes || ' minutes')::interval - now()))::integer;
      IF retry_after > 0 THEN
        RETURN jsonb_build_object(
          'blocked', true,
          'remaining_attempts', 0,
          'retry_after_seconds', retry_after,
          'reason', 'Too many login attempts from this location. Please try again later.'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'blocked', false,
    'remaining_attempts', max_attempts - email_attempts,
    'retry_after_seconds', 0,
    'reason', NULL
  );
END;
$$;

-- Record login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(_email text, _ip_address text DEFAULT NULL, _was_successful boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO login_attempts (email, ip_address, was_successful)
  VALUES (lower(_email), _ip_address, _was_successful);
  
  IF _was_successful THEN
    DELETE FROM login_attempts
    WHERE email = lower(_email)
      AND was_successful = false
      AND attempted_at < now();
  END IF;
END;
$$;

-- Get public order status
CREATE OR REPLACE FUNCTION public.get_public_order_status(p_order_number text)
RETURNS TABLE(order_number text, status text, created_at timestamp with time zone, updated_at timestamp with time zone, product_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.order_number,
    o.status::text,
    o.created_at,
    o.updated_at,
    p.name as product_name
  FROM orders o
  JOIN storefront_products sp ON o.storefront_product_id = sp.id
  JOIN products p ON sp.product_id = p.id
  WHERE o.order_number = p_order_number;
END;
$$;

-- Get public order status history
CREATE OR REPLACE FUNCTION public.get_public_order_status_history(p_order_number text)
RETURNS TABLE(new_status text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    osh.new_status,
    osh.created_at
  FROM order_status_history osh
  JOIN orders o ON osh.order_id = o.id
  WHERE o.order_number = p_order_number
  ORDER BY osh.created_at DESC;
END;
$$;

-- Get postpaid available credit
CREATE OR REPLACE FUNCTION public.get_postpaid_available_credit(_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  credit_limit numeric;
  used_amount numeric;
BEGIN
  SELECT postpaid_credit_limit, postpaid_used 
  INTO credit_limit, used_amount
  FROM public.profiles 
  WHERE user_id = _user_id;
  
  RETURN COALESCE(credit_limit, 0) - COALESCE(used_amount, 0);
END;
$$;

-- Process postpaid payment
CREATE OR REPLACE FUNCTION public.process_postpaid_payment(_user_id uuid, _order_id uuid, _amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  
  UPDATE orders SET status = 'postpaid_pending', payment_type = 'postpaid', paid_at = now(), updated_at = now()
  WHERE id = _order_id;
  
  UPDATE profiles SET postpaid_used = new_used, updated_at = now() WHERE user_id = _user_id;
  
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
$$;

-- Protect profile fields from unauthorized modification
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF NEW.user_status IS DISTINCT FROM OLD.user_status THEN
    RAISE EXCEPTION 'You are not allowed to modify user_status';
  END IF;
  
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    RAISE EXCEPTION 'You are not allowed to modify wallet_balance';
  END IF;
  
  IF NEW.commission_override IS DISTINCT FROM OLD.commission_override THEN
    RAISE EXCEPTION 'You are not allowed to modify commission_override';
  END IF;
  
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'You are not allowed to modify is_active';
  END IF;
  
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
  
  RETURN NEW;
END;
$$;

-- Validate KYC submission
CREATE OR REPLACE FUNCTION public.validate_kyc_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.aadhaar_number !~ '^[0-9]{12}$' THEN
    RAISE EXCEPTION 'Invalid Aadhaar number format. Must be exactly 12 digits.';
  END IF;
  
  IF NEW.pan_number !~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$' THEN
    RAISE EXCEPTION 'Invalid PAN format. Must be 5 uppercase letters, 4 digits, 1 uppercase letter.';
  END IF;
  
  IF NEW.date_of_birth >= CURRENT_DATE THEN
    RAISE EXCEPTION 'Date of birth must be in the past.';
  END IF;
  
  IF NEW.date_of_birth < '1900-01-01'::date THEN
    RAISE EXCEPTION 'Invalid date of birth.';
  END IF;
  
  IF LENGTH(TRIM(NEW.first_name)) < 1 OR LENGTH(NEW.first_name) > 100 THEN
    RAISE EXCEPTION 'First name must be between 1 and 100 characters.';
  END IF;
  
  IF LENGTH(TRIM(NEW.last_name)) < 1 OR LENGTH(NEW.last_name) > 100 THEN
    RAISE EXCEPTION 'Last name must be between 1 and 100 characters.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Credit wallet on order completion
CREATE OR REPLACE FUNCTION public.credit_wallet_on_order_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auto_credit_enabled text;
  order_total numeric;
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

    SELECT EXISTS (
      SELECT 1
        FROM public.wallet_transactions wt
       WHERE wt.order_id = NEW.id
         AND wt.type = ANY (ARRAY['order_value'::text, 'order_commission'::text])
    ) INTO already_credited;

    IF already_credited THEN
      RETURN NEW;
    END IF;

    order_total := (NEW.selling_price * NEW.quantity);
    order_total := GREATEST(0, COALESCE(order_total, 0));

    IF order_total <= 0 THEN
      RETURN NEW;
    END IF;

    UPDATE public.profiles
       SET wallet_balance = COALESCE(wallet_balance, 0) + order_total
     WHERE user_id = NEW.dropshipper_user_id;

    INSERT INTO public.wallet_transactions (user_id, amount, type, description, order_id)
    VALUES (
      NEW.dropshipper_user_id,
      order_total,
      'order_value',
      'Order value for order ' || NEW.order_number,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Log order status change
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_by_type)
    VALUES (NEW.id, OLD.status::text, NEW.status::text, 'system');
  END IF;
  RETURN NEW;
END;
$$;

-- Permanently delete cleared messages
CREATE OR REPLACE FUNCTION public.permanently_delete_cleared_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_messages_cleared_at IS NOT NULL AND 
     (OLD.user_messages_cleared_at IS NULL OR NEW.user_messages_cleared_at > OLD.user_messages_cleared_at) THEN
    DELETE FROM public.chat_messages 
    WHERE user_id = NEW.user_id 
    AND created_at < NEW.user_messages_cleared_at;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure single default work type
CREATE OR REPLACE FUNCTION public.ensure_single_default_work_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.work_types SET is_default = false WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.check_login_rate_limit(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_order_status(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_order_status_history(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_storefront_profile(text) TO anon, authenticated;
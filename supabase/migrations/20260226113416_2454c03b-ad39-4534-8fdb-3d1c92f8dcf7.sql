
CREATE OR REPLACE FUNCTION public.permanently_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Prevent deleting yourself
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'Cannot delete your own admin account';
  END IF;

  -- Delete child records first respecting FK constraints

  -- Order-related children
  DELETE FROM public.order_chat_audit_logs WHERE order_id IN (SELECT id FROM public.orders WHERE dropshipper_user_id = target_user_id);
  DELETE FROM public.order_chat_messages WHERE order_id IN (SELECT id FROM public.orders WHERE dropshipper_user_id = target_user_id);
  DELETE FROM public.order_customer_names WHERE order_id IN (SELECT id FROM public.orders WHERE dropshipper_user_id = target_user_id);
  DELETE FROM public.order_status_history WHERE order_id IN (SELECT id FROM public.orders WHERE dropshipper_user_id = target_user_id);

  -- Payout children
  DELETE FROM public.payout_status_history WHERE payout_id IN (SELECT id FROM public.payout_requests WHERE user_id = target_user_id);
  DELETE FROM public.payout_requests WHERE user_id = target_user_id;

  -- Postpaid
  DELETE FROM public.postpaid_transactions WHERE user_id = target_user_id;

  -- Orders (after children removed)
  DELETE FROM public.orders WHERE dropshipper_user_id = target_user_id;

  -- Storefront products
  DELETE FROM public.storefront_products WHERE user_id = target_user_id;

  -- Chat
  DELETE FROM public.chat_reassignment_logs WHERE user_id = target_user_id;
  DELETE FROM public.chat_messages WHERE user_id = target_user_id;
  DELETE FROM public.chat_sessions WHERE user_id = target_user_id;
  DELETE FROM public.chat_ratings WHERE user_id = target_user_id;
  DELETE FROM public.chat_customer_names WHERE user_id = target_user_id;
  DELETE FROM public.agent_chat_presence WHERE agent_id = target_user_id;

  -- Wallet
  DELETE FROM public.wallet_transactions WHERE user_id = target_user_id;

  -- Crypto payments
  DELETE FROM public.crypto_payments WHERE user_id = target_user_id;

  -- KYC
  DELETE FROM public.kyc_submissions WHERE user_id = target_user_id;

  -- MFA & auth
  DELETE FROM public.email_mfa_codes WHERE user_id = target_user_id;
  DELETE FROM public.otp_verifications WHERE user_id = target_user_id;
  DELETE FROM public.trusted_devices WHERE user_id = target_user_id;
  DELETE FROM public.login_attempts WHERE email IN (SELECT email FROM public.profiles WHERE user_id = target_user_id);

  -- Notifications
  DELETE FROM public.user_notifications WHERE user_id = target_user_id;
  DELETE FROM public.force_logout_events WHERE user_id = target_user_id;

  -- IP logs
  DELETE FROM public.ip_logs WHERE user_id = target_user_id;

  -- Proof of work
  DELETE FROM public.proof_of_work WHERE user_id = target_user_id;

  -- User payment settings
  DELETE FROM public.user_payment_settings WHERE user_id = target_user_id;

  -- Popup acknowledgments & targets
  DELETE FROM public.popup_acknowledgments WHERE user_id = target_user_id;
  DELETE FROM public.popup_message_targets WHERE user_id = target_user_id;
  DELETE FROM public.dashboard_message_targets WHERE user_id = target_user_id;

  -- Video tutorial completions
  DELETE FROM public.video_tutorial_completions WHERE user_id = target_user_id;

  -- Support agent presence
  DELETE FROM public.support_agent_presence WHERE user_id = target_user_id;

  -- Top dropshippers reference
  DELETE FROM public.top_dropshippers WHERE user_id = target_user_id;
  DELETE FROM public.user_rank_reference WHERE user_id = target_user_id;

  -- User roles (before profile)
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- Profile (last public table)
  DELETE FROM public.profiles WHERE user_id = target_user_id;
END;
$$;

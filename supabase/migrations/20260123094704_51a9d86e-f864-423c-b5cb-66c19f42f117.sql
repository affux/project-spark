-- =============================================
-- DROPSHIP PLATFORM - TRIGGERS AND RLS POLICIES
-- =============================================

-- Create triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_storefront_products_updated_at ON public.storefront_products;
CREATE TRIGGER update_storefront_products_updated_at BEFORE UPDATE ON public.storefront_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_kyc_submissions_updated_at ON public.kyc_submissions;
CREATE TRIGGER update_kyc_submissions_updated_at BEFORE UPDATE ON public.kyc_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payout_requests_updated_at ON public.payout_requests;
CREATE TRIGGER update_payout_requests_updated_at BEFORE UPDATE ON public.payout_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON public.platform_settings;
CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_chat_quick_replies_updated_at ON public.order_chat_quick_replies;
CREATE TRIGGER update_order_chat_quick_replies_updated_at BEFORE UPDATE ON public.order_chat_quick_replies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_agent_presence_updated_at ON public.support_agent_presence;
CREATE TRIGGER update_support_agent_presence_updated_at BEFORE UPDATE ON public.support_agent_presence FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crypto_payments_updated_at ON public.crypto_payments;
CREATE TRIGGER update_crypto_payments_updated_at BEFORE UPDATE ON public.crypto_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_proof_of_work_updated_at ON public.proof_of_work;
CREATE TRIGGER update_proof_of_work_updated_at BEFORE UPDATE ON public.proof_of_work FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_types_updated_at ON public.work_types;
CREATE TRIGGER update_work_types_updated_at BEFORE UPDATE ON public.work_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_type_categories_updated_at ON public.work_type_categories;
CREATE TRIGGER update_work_type_categories_updated_at BEFORE UPDATE ON public.work_type_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_custom_payment_methods_updated_at ON public.custom_payment_methods;
CREATE TRIGGER update_custom_payment_methods_updated_at BEFORE UPDATE ON public.custom_payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_media_updated_at ON public.product_media;
CREATE TRIGGER update_product_media_updated_at BEFORE UPDATE ON public.product_media FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON public.product_reviews;
CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_dashboard_messages_updated_at ON public.dashboard_messages;
CREATE TRIGGER update_dashboard_messages_updated_at BEFORE UPDATE ON public.dashboard_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_popup_messages_updated_at ON public.popup_messages;
CREATE TRIGGER update_popup_messages_updated_at BEFORE UPDATE ON public.popup_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_top_dropshippers_updated_at ON public.top_dropshippers;
CREATE TRIGGER update_top_dropshippers_updated_at BEFORE UPDATE ON public.top_dropshippers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_rank_reference_updated_at ON public.user_rank_reference;
CREATE TRIGGER update_user_rank_reference_updated_at BEFORE UPDATE ON public.user_rank_reference FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS generate_order_number_trigger ON public.orders;
CREATE TRIGGER generate_order_number_trigger BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

DROP TRIGGER IF EXISTS protect_profile_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_fields_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

DROP TRIGGER IF EXISTS validate_kyc_submission_trigger ON public.kyc_submissions;
CREATE TRIGGER validate_kyc_submission_trigger BEFORE INSERT OR UPDATE ON public.kyc_submissions FOR EACH ROW EXECUTE FUNCTION public.validate_kyc_submission();

DROP TRIGGER IF EXISTS credit_wallet_on_order_completed_trigger ON public.orders;
CREATE TRIGGER credit_wallet_on_order_completed_trigger AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.credit_wallet_on_order_completed();

DROP TRIGGER IF EXISTS log_order_status_change_trigger ON public.orders;
CREATE TRIGGER log_order_status_change_trigger AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

DROP TRIGGER IF EXISTS permanently_delete_cleared_messages_trigger ON public.chat_sessions;
CREATE TRIGGER permanently_delete_cleared_messages_trigger AFTER UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION public.permanently_delete_cleared_messages();

DROP TRIGGER IF EXISTS ensure_single_default_work_type_trigger ON public.work_types;
CREATE TRIGGER ensure_single_default_work_type_trigger BEFORE INSERT OR UPDATE ON public.work_types FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_work_type();

-- =============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_customer_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postpaid_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_customer_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reassignment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_chat_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indian_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_chat_quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_chat_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.force_logout_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_mfa_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_agent_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_tutorial_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_of_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_type_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_message_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_message_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.top_dropshippers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rank_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts FORCE ROW LEVEL SECURITY;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can update their own profile safely" ON public.profiles;
CREATE POLICY "Users can update their own profile safely" ON public.profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- User roles policies
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User preferences policies
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- Products policies
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Product media policies
DROP POLICY IF EXISTS "Public can view product media" ON public.product_media;
CREATE POLICY "Public can view product media" ON public.product_media FOR SELECT USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_media.product_id AND p.is_active = true));

DROP POLICY IF EXISTS "Admins can manage product media" ON public.product_media;
CREATE POLICY "Admins can manage product media" ON public.product_media FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Product reviews policies
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.product_reviews;
CREATE POLICY "Anyone can view approved reviews" ON public.product_reviews FOR SELECT USING (is_approved = true);

DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.product_reviews;
CREATE POLICY "Admins can manage all reviews" ON public.product_reviews FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can submit reviews with validation" ON public.product_reviews;
CREATE POLICY "Users can submit reviews with validation" ON public.product_reviews FOR INSERT WITH CHECK (rating >= 1 AND rating <= 5);

-- Storefront products policies
DROP POLICY IF EXISTS "Users can view their own storefront products" ON public.storefront_products;
CREATE POLICY "Users can view their own storefront products" ON public.storefront_products FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all storefront products" ON public.storefront_products;
CREATE POLICY "Admins can manage all storefront products" ON public.storefront_products FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can manage their own storefront products" ON public.storefront_products;
CREATE POLICY "Users can manage their own storefront products" ON public.storefront_products FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view active storefront products" ON public.storefront_products;
CREATE POLICY "Public can view active storefront products" ON public.storefront_products FOR SELECT USING (is_active = true);

-- Orders policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = dropshipper_user_id);

DROP POLICY IF EXISTS "Users can create orders for themselves" ON public.orders;
CREATE POLICY "Users can create orders for themselves" ON public.orders FOR INSERT WITH CHECK (auth.uid() = dropshipper_user_id);

DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = dropshipper_user_id) WITH CHECK (auth.uid() = dropshipper_user_id);

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Order status history policies
DROP POLICY IF EXISTS "Users can view their order history" ON public.order_status_history;
CREATE POLICY "Users can view their order history" ON public.order_status_history FOR SELECT USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_status_history.order_id AND o.dropshipper_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view all order history" ON public.order_status_history;
CREATE POLICY "Admins can view all order history" ON public.order_status_history FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Order customer names policies
DROP POLICY IF EXISTS "Users can view their order customer names" ON public.order_customer_names;
CREATE POLICY "Users can view their order customer names" ON public.order_customer_names FOR SELECT USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_customer_names.order_id AND o.dropshipper_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage order customer names" ON public.order_customer_names;
CREATE POLICY "Admins can manage order customer names" ON public.order_customer_names FOR ALL USING (has_role(auth.uid(), 'admin'));

-- KYC submissions policies
DROP POLICY IF EXISTS "Users can view their own KYC submission" ON public.kyc_submissions;
CREATE POLICY "Users can view their own KYC submission" ON public.kyc_submissions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own KYC submission" ON public.kyc_submissions;
CREATE POLICY "Users can create their own KYC submission" ON public.kyc_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their pending KYC" ON public.kyc_submissions;
CREATE POLICY "Users can update their pending KYC" ON public.kyc_submissions FOR UPDATE USING (auth.uid() = user_id AND status IN ('not_submitted', 'rejected'));

DROP POLICY IF EXISTS "Admins can manage all KYC submissions" ON public.kyc_submissions;
CREATE POLICY "Admins can manage all KYC submissions" ON public.kyc_submissions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Wallet transactions policies
DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view their own wallet transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can manage all wallet transactions" ON public.wallet_transactions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Postpaid transactions policies
DROP POLICY IF EXISTS "Users can view their own postpaid transactions" ON public.postpaid_transactions;
CREATE POLICY "Users can view their own postpaid transactions" ON public.postpaid_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all postpaid transactions" ON public.postpaid_transactions;
CREATE POLICY "Admins can manage all postpaid transactions" ON public.postpaid_transactions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Payout requests policies
DROP POLICY IF EXISTS "Users can view their own payout requests" ON public.payout_requests;
CREATE POLICY "Users can view their own payout requests" ON public.payout_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create payout requests" ON public.payout_requests;
CREATE POLICY "Users can create payout requests" ON public.payout_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all payout requests" ON public.payout_requests;
CREATE POLICY "Admins can manage all payout requests" ON public.payout_requests FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Payout status history policies
DROP POLICY IF EXISTS "Users can view their own payout history" ON public.payout_status_history;
CREATE POLICY "Users can view their own payout history" ON public.payout_status_history FOR SELECT USING (EXISTS (SELECT 1 FROM payout_requests pr WHERE pr.id = payout_status_history.payout_id AND pr.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all payout history" ON public.payout_status_history;
CREATE POLICY "Admins can manage all payout history" ON public.payout_status_history FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Chat messages policies
DROP POLICY IF EXISTS "Users can view their own messages" ON public.chat_messages;
CREATE POLICY "Users can view their own messages" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own messages" ON public.chat_messages;
CREATE POLICY "Users can create their own messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all messages" ON public.chat_messages;
CREATE POLICY "Admins can manage all messages" ON public.chat_messages FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Chat ratings policies
DROP POLICY IF EXISTS "Users can view their own ratings" ON public.chat_ratings;
CREATE POLICY "Users can view their own ratings" ON public.chat_ratings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create ratings" ON public.chat_ratings;
CREATE POLICY "Users can create ratings" ON public.chat_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all ratings" ON public.chat_ratings;
CREATE POLICY "Admins can view all ratings" ON public.chat_ratings FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Chat customer names policies
DROP POLICY IF EXISTS "Users can view their own chat name" ON public.chat_customer_names;
CREATE POLICY "Users can view their own chat name" ON public.chat_customer_names FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all chat names" ON public.chat_customer_names;
CREATE POLICY "Admins can manage all chat names" ON public.chat_customer_names FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Chat sessions policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.chat_sessions;
CREATE POLICY "Users can view their own sessions" ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own sessions" ON public.chat_sessions;
CREATE POLICY "Users can create their own sessions" ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON public.chat_sessions;
CREATE POLICY "Users can update their own sessions" ON public.chat_sessions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all sessions" ON public.chat_sessions;
CREATE POLICY "Admins can manage all sessions" ON public.chat_sessions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Chat reassignment logs policies
DROP POLICY IF EXISTS "Users can view their reassignment logs" ON public.chat_reassignment_logs;
CREATE POLICY "Users can view their reassignment logs" ON public.chat_reassignment_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage reassignment logs" ON public.chat_reassignment_logs;
CREATE POLICY "Admins can manage reassignment logs" ON public.chat_reassignment_logs FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Agent chat presence policies
DROP POLICY IF EXISTS "Admins can manage agent presence" ON public.agent_chat_presence;
CREATE POLICY "Admins can manage agent presence" ON public.agent_chat_presence FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view agent presence" ON public.agent_chat_presence;
CREATE POLICY "Users can view agent presence" ON public.agent_chat_presence FOR SELECT USING (auth.uid() = viewing_user_id);

-- Indian names policies
DROP POLICY IF EXISTS "Authenticated can view indian names" ON public.indian_names;
CREATE POLICY "Authenticated can view indian names" ON public.indian_names FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage indian names" ON public.indian_names;
CREATE POLICY "Admins can manage indian names" ON public.indian_names FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Order chat messages policies
DROP POLICY IF EXISTS "Users can view their order messages" ON public.order_chat_messages;
CREATE POLICY "Users can view their order messages" ON public.order_chat_messages FOR SELECT USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_chat_messages.order_id AND o.dropshipper_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create order messages" ON public.order_chat_messages;
CREATE POLICY "Users can create order messages" ON public.order_chat_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_chat_messages.order_id AND o.dropshipper_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own messages" ON public.order_chat_messages;
CREATE POLICY "Users can update their own messages" ON public.order_chat_messages FOR UPDATE USING (auth.uid() = sender_user_id);

DROP POLICY IF EXISTS "Admins can manage all order messages" ON public.order_chat_messages;
CREATE POLICY "Admins can manage all order messages" ON public.order_chat_messages FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Order chat quick replies policies
DROP POLICY IF EXISTS "Authenticated can view quick replies" ON public.order_chat_quick_replies;
CREATE POLICY "Authenticated can view quick replies" ON public.order_chat_quick_replies FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage quick replies" ON public.order_chat_quick_replies;
CREATE POLICY "Admins can manage quick replies" ON public.order_chat_quick_replies FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Order chat audit logs policies
DROP POLICY IF EXISTS "Admins can manage audit logs" ON public.order_chat_audit_logs;
CREATE POLICY "Admins can manage audit logs" ON public.order_chat_audit_logs FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Platform settings policies
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can read platform settings" ON public.platform_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins can manage platform settings" ON public.platform_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Audit logs policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- IP logs policies
DROP POLICY IF EXISTS "Users can view their own IP logs" ON public.ip_logs;
CREATE POLICY "Users can view their own IP logs" ON public.ip_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own IP logs" ON public.ip_logs;
CREATE POLICY "Users can insert their own IP logs" ON public.ip_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all IP logs" ON public.ip_logs;
CREATE POLICY "Admins can view all IP logs" ON public.ip_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Force logout events policies
DROP POLICY IF EXISTS "Users can view their own force logout events" ON public.force_logout_events;
CREATE POLICY "Users can view their own force logout events" ON public.force_logout_events FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage force logout events" ON public.force_logout_events;
CREATE POLICY "Admins can manage force logout events" ON public.force_logout_events FOR ALL USING (has_role(auth.uid(), 'admin'));

-- OTP verifications policies
DROP POLICY IF EXISTS "Users can manage their own OTPs" ON public.otp_verifications;
CREATE POLICY "Users can manage their own OTPs" ON public.otp_verifications FOR ALL USING (auth.uid() = user_id);

-- Email MFA codes policies
DROP POLICY IF EXISTS "Users can manage their own MFA codes" ON public.email_mfa_codes;
CREATE POLICY "Users can manage their own MFA codes" ON public.email_mfa_codes FOR ALL USING (auth.uid() = user_id);

-- Trusted devices policies
DROP POLICY IF EXISTS "Users can manage their own devices" ON public.trusted_devices;
CREATE POLICY "Users can manage their own devices" ON public.trusted_devices FOR ALL USING (auth.uid() = user_id);

-- Support agent presence policies
DROP POLICY IF EXISTS "Admins can manage support presence" ON public.support_agent_presence;
CREATE POLICY "Admins can manage support presence" ON public.support_agent_presence FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view online agents" ON public.support_agent_presence;
CREATE POLICY "Users can view online agents" ON public.support_agent_presence FOR SELECT USING (is_online = true);

-- Crypto payments policies
DROP POLICY IF EXISTS "Users can view own crypto payments" ON public.crypto_payments;
CREATE POLICY "Users can view own crypto payments" ON public.crypto_payments FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create crypto payments" ON public.crypto_payments;
CREATE POLICY "Users can create crypto payments" ON public.crypto_payments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pending payments" ON public.crypto_payments;
CREATE POLICY "Users can update own pending payments" ON public.crypto_payments FOR UPDATE USING (auth.uid() = user_id AND status = 'pending') WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all crypto payments" ON public.crypto_payments;
CREATE POLICY "Admins can manage all crypto payments" ON public.crypto_payments FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Video tutorial completions policies
DROP POLICY IF EXISTS "Users can manage their own completions" ON public.video_tutorial_completions;
CREATE POLICY "Users can manage their own completions" ON public.video_tutorial_completions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all completions" ON public.video_tutorial_completions;
CREATE POLICY "Admins can view all completions" ON public.video_tutorial_completions FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Proof of work policies
DROP POLICY IF EXISTS "Users can view their own proofs" ON public.proof_of_work;
CREATE POLICY "Users can view their own proofs" ON public.proof_of_work FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own proofs" ON public.proof_of_work;
CREATE POLICY "Users can create their own proofs" ON public.proof_of_work FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their pending proofs" ON public.proof_of_work;
CREATE POLICY "Users can update their pending proofs" ON public.proof_of_work FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Admins can manage all proofs" ON public.proof_of_work;
CREATE POLICY "Admins can manage all proofs" ON public.proof_of_work FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Work types policies
DROP POLICY IF EXISTS "Authenticated users can view active work types" ON public.work_types;
CREATE POLICY "Authenticated users can view active work types" ON public.work_types FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage work types" ON public.work_types;
CREATE POLICY "Admins can manage work types" ON public.work_types FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Work type categories policies
DROP POLICY IF EXISTS "Authenticated users can view active categories" ON public.work_type_categories;
CREATE POLICY "Authenticated users can view active categories" ON public.work_type_categories FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage work type categories" ON public.work_type_categories;
CREATE POLICY "Admins can manage work type categories" ON public.work_type_categories FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.user_notifications;
CREATE POLICY "Users can view their own notifications" ON public.user_notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.user_notifications;
CREATE POLICY "Users can update their own notifications" ON public.user_notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.user_notifications;
CREATE POLICY "Users can delete their own notifications" ON public.user_notifications FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.user_notifications;
CREATE POLICY "Users can insert their own notifications" ON public.user_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.user_notifications;
CREATE POLICY "Admins can manage all notifications" ON public.user_notifications FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Custom payment methods policies
DROP POLICY IF EXISTS "Anyone can read enabled payment methods" ON public.custom_payment_methods;
CREATE POLICY "Anyone can read enabled payment methods" ON public.custom_payment_methods FOR SELECT USING (is_enabled = true);

DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.custom_payment_methods;
CREATE POLICY "Admins can manage payment methods" ON public.custom_payment_methods FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Dashboard messages policies
DROP POLICY IF EXISTS "Users can view enabled messages" ON public.dashboard_messages;
CREATE POLICY "Users can view enabled messages" ON public.dashboard_messages FOR SELECT USING (is_enabled = true AND show_to_users = true AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS "Admins can manage dashboard messages" ON public.dashboard_messages;
CREATE POLICY "Admins can manage dashboard messages" ON public.dashboard_messages FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Dashboard message targets policies
DROP POLICY IF EXISTS "Users can view their own message targets" ON public.dashboard_message_targets;
CREATE POLICY "Users can view their own message targets" ON public.dashboard_message_targets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage message targets" ON public.dashboard_message_targets;
CREATE POLICY "Admins can manage message targets" ON public.dashboard_message_targets FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Popup messages policies
DROP POLICY IF EXISTS "Users can view their targeted popup messages" ON public.popup_messages;
CREATE POLICY "Users can view their targeted popup messages" ON public.popup_messages FOR SELECT USING (
  is_enabled = true
  AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
    OR target_type = 'all'
    OR (target_type = 'specific' AND EXISTS (SELECT 1 FROM popup_message_targets WHERE popup_message_targets.message_id = popup_messages.id AND popup_message_targets.user_id = auth.uid()))
    OR (target_type = 'role' AND target_roles IS NOT NULL AND EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role::text = ANY(popup_messages.target_roles)))
  )
);

DROP POLICY IF EXISTS "Admins can manage popup messages" ON public.popup_messages;
CREATE POLICY "Admins can manage popup messages" ON public.popup_messages FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Popup message targets policies
DROP POLICY IF EXISTS "Users can view their own popup targets" ON public.popup_message_targets;
CREATE POLICY "Users can view their own popup targets" ON public.popup_message_targets FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage popup message targets" ON public.popup_message_targets;
CREATE POLICY "Admins can manage popup message targets" ON public.popup_message_targets FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Popup acknowledgments policies
DROP POLICY IF EXISTS "Users can view their own acknowledgments" ON public.popup_acknowledgments;
CREATE POLICY "Users can view their own acknowledgments" ON public.popup_acknowledgments FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own acknowledgments" ON public.popup_acknowledgments;
CREATE POLICY "Users can create their own acknowledgments" ON public.popup_acknowledgments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all acknowledgments" ON public.popup_acknowledgments;
CREATE POLICY "Admins can view all acknowledgments" ON public.popup_acknowledgments FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Top dropshippers policies
DROP POLICY IF EXISTS "Anyone can view active top dropshippers" ON public.top_dropshippers;
CREATE POLICY "Anyone can view active top dropshippers" ON public.top_dropshippers FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage top dropshippers" ON public.top_dropshippers;
CREATE POLICY "Admins can manage top dropshippers" ON public.top_dropshippers FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User rank reference policies
DROP POLICY IF EXISTS "Users can view their own rank" ON public.user_rank_reference;
CREATE POLICY "Users can view their own rank" ON public.user_rank_reference FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all ranks" ON public.user_rank_reference;
CREATE POLICY "Admins can manage all ranks" ON public.user_rank_reference FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Login attempts policies (restricted access)
DROP POLICY IF EXISTS "No direct access to login_attempts" ON public.login_attempts;
CREATE POLICY "No direct access to login_attempts" ON public.login_attempts FOR ALL USING (false);

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_agent_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.proof_of_work;
ALTER PUBLICATION supabase_realtime ADD TABLE public.postpaid_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.force_logout_events;
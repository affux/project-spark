-- Create auth trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('kyc-documents', 'kyc-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/pdf']),
  ('product-images', 'product-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('branding', 'branding', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']),
  ('proof-of-work', 'proof-of-work', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/pdf']),
  ('storefront-banners', 'storefront-banners', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('payment-proofs', 'payment-proofs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket (public read, authenticated upload)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for kyc-documents bucket (private, user and admin access)
CREATE POLICY "Users can view their own KYC documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all KYC documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for product-images bucket (public read, admin upload)
CREATE POLICY "Product images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can manage product images"
ON storage.objects FOR ALL
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for branding bucket (public read, admin upload)
CREATE POLICY "Branding assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "Admins can manage branding assets"
ON storage.objects FOR ALL
USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for proof-of-work bucket (user and admin access)
CREATE POLICY "Users can view their own proof of work"
ON storage.objects FOR SELECT
USING (bucket_id = 'proof-of-work' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all proof of work"
ON storage.objects FOR SELECT
USING (bucket_id = 'proof-of-work' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can upload their own proof of work"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'proof-of-work' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for storefront-banners bucket (public read, user upload for own)
CREATE POLICY "Storefront banners are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'storefront-banners');

CREATE POLICY "Users can upload their own storefront banner"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'storefront-banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own storefront banner"
ON storage.objects FOR UPDATE
USING (bucket_id = 'storefront-banners' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for payment-proofs bucket (user and admin access)
CREATE POLICY "Users can view their own payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can upload their own payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Insert default platform settings
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('site_name', 'DropShip Pro', 'Platform name displayed in branding'),
  ('site_logo_url', '', 'URL to the site logo'),
  ('site_favicon_url', '', 'URL to the site favicon'),
  ('primary_color', '#3B82F6', 'Primary brand color'),
  ('currency_symbol', '₹', 'Currency symbol for display'),
  ('currency_code', 'INR', 'ISO currency code'),
  ('commission_rate', '100', 'Default commission percentage for dropshippers'),
  ('min_payout_amount', '500', 'Minimum wallet balance required for payout'),
  ('auto_user_approval', 'false', 'Auto-approve new user registrations'),
  ('auto_credit_on_complete', 'true', 'Auto-credit wallet when order completes'),
  ('kyc_required', 'true', 'Require KYC verification for payouts'),
  ('postpaid_enabled', 'false', 'Enable postpaid credit system'),
  ('default_postpaid_limit', '0', 'Default postpaid credit limit for users'),
  ('default_postpaid_cycle', '30', 'Default postpaid due cycle in days'),
  ('chat_enabled', 'true', 'Enable support chat feature'),
  ('chat_reassignment_enabled', 'false', 'Enable automatic chat reassignment'),
  ('chat_reassignment_timeout', '300', 'Seconds before reassigning inactive chat'),
  ('order_chat_enabled', 'true', 'Enable order-specific chat'),
  ('notification_sound_enabled', 'true', 'Enable notification sounds'),
  ('email_notifications_enabled', 'false', 'Enable email notifications'),
  ('sms_notifications_enabled', 'false', 'Enable SMS notifications'),
  ('setup_completed', 'false', 'Whether initial setup wizard is completed'),
  ('maintenance_mode', 'false', 'Enable maintenance mode'),
  ('registration_enabled', 'true', 'Allow new user registrations'),
  ('storefront_enabled', 'true', 'Enable user storefronts'),
  ('crypto_payments_enabled', 'false', 'Enable cryptocurrency payments'),
  ('workspace_enabled', 'true', 'Enable proof of work workspace'),
  ('video_tutorials_enabled', 'true', 'Enable video tutorials feature'),
  ('leaderboard_enabled', 'true', 'Enable dropshipper leaderboard'),
  ('ip_logging_enabled', 'true', 'Enable IP address logging'),
  ('mfa_enabled', 'false', 'Enable multi-factor authentication'),
  ('trusted_devices_enabled', 'true', 'Enable trusted device feature'),
  ('login_rate_limit_enabled', 'true', 'Enable login rate limiting'),
  ('max_login_attempts', '5', 'Maximum login attempts before lockout'),
  ('lockout_duration_minutes', '30', 'Account lockout duration in minutes')
ON CONFLICT (key) DO NOTHING;

-- Drop and recreate the public whitelist policy to include payment method keys
DROP POLICY IF EXISTS "Public can read whitelisted settings only" ON public.platform_settings;

CREATE POLICY "Public can read whitelisted settings only"
ON public.platform_settings FOR SELECT
USING (key = ANY (ARRAY[
  'site_title'::text, 'site_description'::text, 'logo_url'::text, 'favicon_url'::text,
  'primary_color'::text, 'contact_email'::text, 'support_phone'::text,
  'storefront_greeting_message'::text, 'storefront_ordering_enabled'::text,
  'storefront_ordering_disabled_message'::text, 'payout_enabled'::text,
  'payout_disabled_message'::text, 'chat_greeting_message'::text,
  'payout_methods_enabled'::text, 'storefront_payment_icons'::text,
  'storefront_contact_email'::text, 'storefront_contact_phone'::text,
  'storefront_contact_address'::text, 'storefront_contact_whatsapp'::text,
  'storefront_business_hours'::text, 'user_dashboard_video_url'::text,
  'video_tutorials'::text, 'faq_items'::text,
  -- Payment method settings (needed by users for Add Funds)
  'payment_method_upi_enabled'::text, 'payment_method_upi_message'::text,
  'payment_method_card_enabled'::text, 'payment_method_card_message'::text,
  'payment_method_bank_enabled'::text, 'payment_method_bank_message'::text,
  'payment_method_usd_wallet_enabled'::text, 'payment_method_usd_wallet_message'::text,
  'upi_qr_url'::text, 'upi_id'::text
]));

-- Also update the restricted policy to include these keys
DROP POLICY IF EXISTS "Restricted platform settings access" ON public.platform_settings;

CREATE POLICY "Restricted platform settings access"
ON public.platform_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR (key = ANY (ARRAY[
  'site_name'::text, 'site_logo'::text, 'site_logo_dark'::text, 'site_tagline'::text,
  'support_email'::text, 'site_favicon'::text, 'primary_color'::text,
  'faq_enabled'::text, 'storefront_enabled'::text, 'kyc_required'::text,
  'video_enabled'::text, 'video_url'::text, 'video_title'::text,
  'min_payout_amount'::text, 'upi_enabled'::text, 'bank_transfer_enabled'::text,
  'crypto_payments_enabled'::text, 'usdt_wallet_address'::text,
  'usdt_wallet_enabled'::text, 'chat_support_name'::text,
  'onboarding_enabled'::text, 'tutorial_achievements_enabled'::text,
  'top_dropshippers_enabled'::text, 'leaderboard_display_mode'::text,
  'landing_page_enabled'::text, 'auto_user_approval'::text,
  'default_user_level'::text, 'payment_icons_enabled'::text,
  -- Payment method settings
  'payment_method_upi_enabled'::text, 'payment_method_upi_message'::text,
  'payment_method_card_enabled'::text, 'payment_method_card_message'::text,
  'payment_method_bank_enabled'::text, 'payment_method_bank_message'::text,
  'payment_method_usd_wallet_enabled'::text, 'payment_method_usd_wallet_message'::text,
  'payment_method_wallet_balance_enabled'::text, 'payment_method_wallet_balance_message'::text,
  'upi_qr_url'::text, 'upi_id'::text,
  'usd_wallet_id'::text, 'usd_wallet_currency_name'::text, 'usd_wallet_currency_symbol'::text,
  'usd_wallet_qr_url'::text, 'usd_wallet_icon_url'::text, 'usd_wallet_enabled'::text,
  'crypto_wallets'::text, 'postpaid_wallet_payment_enabled'::text,
  'default_currency'::text, 'commission_type'::text, 'commission_rate'::text,
  'commission_rate_bronze'::text, 'commission_rate_silver'::text, 'commission_rate_gold'::text,
  'level_threshold_silver'::text, 'level_threshold_gold'::text,
  'selling_percentage_min'::text, 'selling_percentage_max'::text,
  'default_markup_percentage'::text, 'minimum_wallet_balance_for_payment'::text,
  'notification_sound_enabled'::text, 'notification_sound_volume'::text,
  'chat_welcome_message'::text, 'chat_end_message'::text,
  'order_failed_message'::text, 'auto_credit_on_complete'::text
])));

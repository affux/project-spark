-- Update the public whitelist RLS policy to include site_logo_url and site_favicon_url
DROP POLICY IF EXISTS "Public can read whitelisted settings only" ON public.platform_settings;

CREATE POLICY "Public can read whitelisted settings only"
ON public.platform_settings
FOR SELECT
USING (
  key = ANY (ARRAY[
    'site_title', 'site_description', 'site_logo_url', 'site_favicon_url',
    'logo_url', 'favicon_url', 'primary_color', 'contact_email', 'support_phone',
    'storefront_greeting_message', 'storefront_ordering_enabled', 'storefront_ordering_disabled_message',
    'payout_enabled', 'payout_disabled_message', 'chat_greeting_message', 'payout_methods_enabled',
    'storefront_payment_icons', 'storefront_contact_email', 'storefront_contact_phone',
    'storefront_contact_address', 'storefront_contact_whatsapp', 'storefront_business_hours',
    'user_dashboard_video_url', 'video_tutorials', 'faq_items',
    'payment_method_upi_enabled', 'payment_method_upi_message',
    'payment_method_card_enabled', 'payment_method_card_message',
    'payment_method_bank_enabled', 'payment_method_bank_message',
    'payment_method_usd_wallet_enabled', 'payment_method_usd_wallet_message',
    'upi_qr_url', 'upi_id',
    'landing_page_enabled', 'landing_page_title', 'landing_page_subtitle',
    'landing_video_url', 'footer_text', 'contact_phone', 'site_name'
  ])
);
-- Drop the existing policy
DROP POLICY IF EXISTS "Public can read whitelisted settings only" ON public.platform_settings;

-- Recreate policy with video_tutorials and user_dashboard_video_url added to the whitelist
CREATE POLICY "Public can read whitelisted settings only" ON public.platform_settings
FOR SELECT USING (
  key = ANY (ARRAY[
    'site_title',
    'site_description', 
    'logo_url',
    'favicon_url',
    'primary_color',
    'contact_email',
    'support_phone',
    'storefront_greeting_message',
    'storefront_ordering_enabled',
    'storefront_ordering_disabled_message',
    'payout_enabled',
    'payout_disabled_message',
    'chat_greeting_message',
    'payout_methods_enabled',
    'storefront_payment_icons',
    'storefront_contact_email',
    'storefront_contact_phone',
    'storefront_contact_address',
    'storefront_contact_whatsapp',
    'storefront_business_hours',
    'user_dashboard_video_url',
    'video_tutorials',
    'faq_items'
  ])
);
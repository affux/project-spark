-- ===========================================
-- FIX 1: Secure storefront_products table
-- ===========================================
DROP POLICY IF EXISTS "Public can view active storefront products" ON public.storefront_products;
DROP POLICY IF EXISTS "Authenticated can view storefront products" ON public.storefront_products;
DROP POLICY IF EXISTS "Users can view their own storefront products" ON public.storefront_products;
DROP POLICY IF EXISTS "Admins can manage storefront products" ON public.storefront_products;
DROP POLICY IF EXISTS "Users can manage their own storefront products" ON public.storefront_products;

-- Admins can fully manage
CREATE POLICY "Admins can manage storefront products"
ON public.storefront_products FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own storefront products or products for public storefronts
CREATE POLICY "Users can view storefront products"
ON public.storefront_products FOR SELECT
USING (
  auth.uid() = user_id OR 
  -- Allow public access for approved storefronts (for customers browsing)
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = storefront_products.user_id 
    AND p.is_active = true 
    AND p.user_status = 'approved'
    AND p.storefront_slug IS NOT NULL
  )
);

CREATE POLICY "Users can insert their own storefront products"
ON public.storefront_products FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own storefront products"
ON public.storefront_products FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own storefront products"
ON public.storefront_products FOR DELETE
USING (auth.uid() = user_id);

-- ===========================================
-- FIX 2: Secure wallet_transactions table
-- ===========================================
DROP POLICY IF EXISTS "Users can view their wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can manage wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can insert their own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Service role can insert wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Public can view wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can manage all wallet transactions" ON public.wallet_transactions;

-- Only users can see their own transactions, admins see all
CREATE POLICY "Users can view own wallet transactions"
ON public.wallet_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage wallet transactions"
ON public.wallet_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own wallet transactions"
ON public.wallet_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- ===========================================
-- FIX 3: Secure platform_settings table
-- ===========================================
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Public can read non-sensitive platform settings" ON public.platform_settings;

-- Create policy that only exposes safe public settings
CREATE POLICY "Restricted platform settings access"
ON public.platform_settings FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  key IN (
    'site_name', 'site_logo', 'site_logo_dark', 'site_tagline', 'support_email', 
    'site_favicon', 'primary_color', 'faq_enabled', 'storefront_enabled',
    'kyc_required', 'video_enabled', 'video_url', 'video_title',
    'min_payout_amount', 'upi_enabled', 'bank_transfer_enabled',
    'crypto_payments_enabled', 'usdt_wallet_address', 'usdt_wallet_enabled',
    'chat_support_name', 'onboarding_enabled', 'tutorial_achievements_enabled',
    'top_dropshippers_enabled', 'leaderboard_display_mode', 'landing_page_enabled',
    'auto_user_approval', 'default_user_level', 'payment_icons_enabled'
  )
);

-- ===========================================
-- FIX 4: Secure products table
-- ===========================================
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view active products" ON public.products;

-- Only authenticated users can see products with base_price
CREATE POLICY "Authenticated can view active products"
ON public.products FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

-- ===========================================
-- FIX 5: Secure top_dropshippers table
-- ===========================================
DROP POLICY IF EXISTS "Public can view active top dropshippers" ON public.top_dropshippers;
DROP POLICY IF EXISTS "Authenticated can view top dropshippers" ON public.top_dropshippers;
DROP POLICY IF EXISTS "Anyone can view active top dropshippers" ON public.top_dropshippers;
DROP POLICY IF EXISTS "Admins can manage top_dropshippers" ON public.top_dropshippers;
DROP POLICY IF EXISTS "Authenticated users can view active entries" ON public.top_dropshippers;
DROP POLICY IF EXISTS "Admins can manage top dropshippers" ON public.top_dropshippers;

-- Admins can manage
CREATE POLICY "Admins manage top_dropshippers"
ON public.top_dropshippers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can only view active entries
CREATE POLICY "Auth users view active top_dropshippers"
ON public.top_dropshippers FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

-- ===========================================
-- FIX 6: Secure work_types table
-- ===========================================
DROP POLICY IF EXISTS "Authenticated can view active work types" ON public.work_types;
DROP POLICY IF EXISTS "Admins can manage work types" ON public.work_types;
DROP POLICY IF EXISTS "Authenticated users can view active work types" ON public.work_types;

-- Admins can fully manage
CREATE POLICY "Admins manage work_types"
ON public.work_types FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can only view active work types
CREATE POLICY "Auth users view active work_types"
ON public.work_types FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

-- ===========================================
-- FIX 7: Secure indian_names table
-- ===========================================
DROP POLICY IF EXISTS "Authenticated can view indian names" ON public.indian_names;
DROP POLICY IF EXISTS "Admins can view all indian names" ON public.indian_names;
DROP POLICY IF EXISTS "Users can view their assigned names only" ON public.indian_names;
DROP POLICY IF EXISTS "Admins can manage indian names" ON public.indian_names;

-- Admins can manage
CREATE POLICY "Admins manage indian_names"
ON public.indian_names FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their assigned names only
CREATE POLICY "Users view assigned indian_names"
ON public.indian_names FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_customer_names ccn 
    WHERE ccn.indian_name_id = indian_names.id 
    AND ccn.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.order_customer_names ocn 
    JOIN public.orders o ON o.id = ocn.order_id
    WHERE ocn.indian_name_id = indian_names.id 
    AND o.dropshipper_user_id = auth.uid()
  )
);

-- ===========================================
-- Create secure function for getting random indian name (for internal use)
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_random_indian_name()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.indian_names 
  WHERE is_active = true 
  ORDER BY random() 
  LIMIT 1;
$$;
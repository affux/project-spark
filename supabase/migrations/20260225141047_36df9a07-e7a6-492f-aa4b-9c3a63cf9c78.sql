
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Service role can manage all wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can insert own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can manage wallet transactions" ON public.wallet_transactions;

-- Recreate with proper role targeting

-- Admin full access (authenticated only)
CREATE POLICY "Admins can manage wallet transactions"
ON public.wallet_transactions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own transactions (authenticated only)
CREATE POLICY "Users can view own wallet transactions"
ON public.wallet_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own transactions (authenticated only)
CREATE POLICY "Users can insert own wallet transactions"
ON public.wallet_transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Service role access (restricted to service_role, not public)
CREATE POLICY "Service role can manage all wallet transactions"
ON public.wallet_transactions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

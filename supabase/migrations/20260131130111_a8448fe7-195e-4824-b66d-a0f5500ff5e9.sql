-- Add policy for service role to insert wallet transactions
-- Service role should bypass RLS, but adding an explicit policy for safety
CREATE POLICY "Service role can manage all wallet transactions"
ON public.wallet_transactions
FOR ALL
USING (auth.uid() IS NULL)
WITH CHECK (auth.uid() IS NULL);

-- Also ensure the policy works by adding a comment
COMMENT ON POLICY "Service role can manage all wallet transactions" ON public.wallet_transactions IS 'Allows Edge Functions using service role key to manage wallet transactions';
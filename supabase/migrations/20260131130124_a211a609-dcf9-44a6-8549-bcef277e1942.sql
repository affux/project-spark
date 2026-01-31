-- Add policy for service role to update profiles (for wallet operations from Edge Functions)
CREATE POLICY "Service role can update profiles"
ON public.profiles
FOR UPDATE
USING (auth.uid() IS NULL)
WITH CHECK (auth.uid() IS NULL);

COMMENT ON POLICY "Service role can update profiles" ON public.profiles IS 'Allows Edge Functions using service role key to update profile fields like wallet_balance';
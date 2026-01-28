-- Add RLS policy to allow users to insert their own wallet transactions
-- This is a safety net in case service role key behavior changes
CREATE POLICY "Users can insert their own wallet transactions"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);
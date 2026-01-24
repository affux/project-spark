-- Allow users to update their own pending payout requests (for cancellation)
CREATE POLICY "Users can update their own pending payout requests"
ON public.payout_requests
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'cancelled');
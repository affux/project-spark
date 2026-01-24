-- Allow users to insert payout status history for their own payout requests
CREATE POLICY "Users can insert history for their own payouts"
ON public.payout_status_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM payout_requests pr
    WHERE pr.id = payout_id
    AND pr.user_id = auth.uid()
  )
);
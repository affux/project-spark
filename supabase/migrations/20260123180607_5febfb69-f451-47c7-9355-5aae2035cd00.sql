-- Make payment-proofs bucket public so proof images can be displayed
UPDATE storage.buckets SET public = true WHERE id = 'payment-proofs';
-- Add payment_proof_url column to crypto_payments table for postpaid USDT payments
ALTER TABLE public.crypto_payments 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
-- Add per-user wallet payment setting for postpaid
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS postpaid_wallet_enabled boolean NOT NULL DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.postpaid_wallet_enabled IS 'Whether this user can use wallet balance to repay postpaid dues';
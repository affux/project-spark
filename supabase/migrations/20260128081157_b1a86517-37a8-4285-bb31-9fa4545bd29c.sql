
-- Temporarily disable the protect_profile_fields trigger
ALTER TABLE profiles DISABLE TRIGGER protect_profile_fields_trigger;

-- Fix Hari's wallet balance to match transaction history
-- Current: $25, should be $19 (after $6 order payment deduction)
UPDATE profiles 
SET wallet_balance = 19
WHERE user_id = '9c12d0e3-948c-4134-90a7-0bde47135964';

-- Re-enable the trigger
ALTER TABLE profiles ENABLE TRIGGER protect_profile_fields_trigger;

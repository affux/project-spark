-- Update the protect_profile_fields function to allow system-level updates
-- The function should check if the update is coming from a SECURITY DEFINER context
-- by checking if current_setting('role') is 'rls_off' or if the user is admin

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin boolean;
  is_system_call boolean;
BEGIN
  -- Check if caller is admin
  is_admin := has_role(auth.uid(), 'admin');
  
  -- Check if this is a system call (from SECURITY DEFINER function)
  -- In SECURITY DEFINER context with search_path set, the session_user will be different
  -- We detect system calls by checking if we're in a nested transaction from another SECURITY DEFINER function
  is_system_call := (current_setting('is_superuser', true) = 'on') OR 
                    (session_user != current_user);
  
  -- Skip protection for admins and system calls
  IF is_admin OR is_system_call THEN
    RETURN NEW;
  END IF;
  
  -- Protect wallet_balance
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    RAISE EXCEPTION 'You are not allowed to modify wallet_balance';
  END IF;
  
  -- Protect user_level
  IF NEW.user_level IS DISTINCT FROM OLD.user_level THEN
    RAISE EXCEPTION 'You are not allowed to modify user_level';
  END IF;
  
  -- Protect user_status
  IF NEW.user_status IS DISTINCT FROM OLD.user_status THEN
    RAISE EXCEPTION 'You are not allowed to modify user_status';
  END IF;
  
  -- Protect commission_override
  IF NEW.commission_override IS DISTINCT FROM OLD.commission_override THEN
    RAISE EXCEPTION 'You are not allowed to modify commission_override';
  END IF;
  
  -- Protect postpaid fields
  IF NEW.postpaid_enabled IS DISTINCT FROM OLD.postpaid_enabled THEN
    RAISE EXCEPTION 'You are not allowed to modify postpaid_enabled';
  END IF;
  
  IF NEW.postpaid_credit_limit IS DISTINCT FROM OLD.postpaid_credit_limit THEN
    RAISE EXCEPTION 'You are not allowed to modify postpaid_credit_limit';
  END IF;
  
  IF NEW.postpaid_used IS DISTINCT FROM OLD.postpaid_used THEN
    RAISE EXCEPTION 'You are not allowed to modify postpaid_used';
  END IF;
  
  IF NEW.allow_payout_with_dues IS DISTINCT FROM OLD.allow_payout_with_dues THEN
    RAISE EXCEPTION 'You are not allowed to modify allow_payout_with_dues';
  END IF;
  
  IF NEW.postpaid_due_cycle IS DISTINCT FROM OLD.postpaid_due_cycle THEN
    RAISE EXCEPTION 'You are not allowed to modify postpaid_due_cycle';
  END IF;
  
  -- Protect is_active
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'You are not allowed to modify is_active';
  END IF;

  RETURN NEW;
END;
$$;
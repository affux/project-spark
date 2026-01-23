-- Drop and recreate the log_ip_action function with better error handling
-- and explicit SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.log_ip_action(
  _user_id uuid,
  _ip_address text,
  _action_type text,
  _country text DEFAULT NULL,
  _city text DEFAULT NULL,
  _region text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id uuid;
BEGIN
  -- Validate required parameters
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;
  
  IF _ip_address IS NULL OR _ip_address = '' THEN
    RAISE EXCEPTION 'ip_address is required';
  END IF;
  
  IF _action_type IS NULL OR _action_type = '' THEN
    RAISE EXCEPTION 'action_type is required';
  END IF;
  
  -- Validate action type
  IF _action_type NOT IN ('login', 'logout', 'order_placed', 'payout_request', 'profile_update') THEN
    RAISE EXCEPTION 'Invalid action_type: %', _action_type;
  END IF;
  
  -- Insert into ip_logs - SECURITY DEFINER bypasses RLS
  INSERT INTO ip_logs (user_id, ip_address, action_type, country, city, region)
  VALUES (_user_id, _ip_address, _action_type, _country, _city, _region)
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail completely
    RAISE WARNING 'Failed to log IP action: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.log_ip_action(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_ip_action(uuid, text, text, text, text, text) TO anon;
-- Make payment-proofs bucket private for enhanced security
UPDATE storage.buckets 
SET public = false 
WHERE id = 'payment-proofs';

-- Create encryption helper functions for field-level encryption
-- These will be used to encrypt/decrypt sensitive customer data

-- Function to encrypt text using pgcrypto
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(
  plaintext text,
  encryption_key text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  encrypted bytea;
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN plaintext;
  END IF;
  
  -- Use AES-256 encryption with the provided key
  encrypted := pgp_sym_encrypt(
    plaintext,
    encryption_key,
    'cipher-algo=aes256'
  );
  
  -- Return base64 encoded encrypted data with prefix for identification
  RETURN 'ENC:' || encode(encrypted, 'base64');
END;
$$;

-- Function to decrypt text
CREATE OR REPLACE FUNCTION public.decrypt_sensitive_data(
  ciphertext text,
  encryption_key text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  encrypted_bytes bytea;
BEGIN
  -- If null, empty, or not encrypted, return as-is
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN ciphertext;
  END IF;
  
  -- Check if data is encrypted (has ENC: prefix)
  IF NOT ciphertext LIKE 'ENC:%' THEN
    RETURN ciphertext;
  END IF;
  
  -- Decode from base64 (remove ENC: prefix first)
  encrypted_bytes := decode(substring(ciphertext from 5), 'base64');
  
  -- Decrypt using pgcrypto
  RETURN pgp_sym_decrypt(encrypted_bytes, encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    -- If decryption fails, return the original (might be legacy unencrypted data)
    RETURN ciphertext;
END;
$$;

-- Add comment explaining the encryption
COMMENT ON FUNCTION public.encrypt_sensitive_data IS 'Encrypts sensitive text data using AES-256. Returns ENC: prefixed base64 encoded ciphertext.';
COMMENT ON FUNCTION public.decrypt_sensitive_data IS 'Decrypts ENC: prefixed encrypted data. Returns plaintext unchanged if not encrypted.';
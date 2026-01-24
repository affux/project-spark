import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge function to encrypt order customer data before saving
 * Called by admin when creating orders via the admin panel
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');

    if (!encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    // Create client with user's auth token to verify they're an admin
    const authHeader = req.headers.get('Authorization');
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    // Verify user is authenticated and is an admin
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Check if user is admin using service role client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin, error: roleError } = await adminClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !isAdmin) {
      throw new Error('Admin access required');
    }

    const { customerPhone, customerAddress } = await req.json();

    // Encrypt the sensitive fields
    let encryptedPhone = customerPhone;
    let encryptedAddress = customerAddress;

    if (customerPhone) {
      const { data: phoneData, error: phoneError } = await adminClient
        .rpc('encrypt_sensitive_data', {
          plaintext: customerPhone,
          encryption_key: encryptionKey
        });
      if (!phoneError && phoneData) {
        encryptedPhone = phoneData;
      }
    }

    if (customerAddress) {
      const { data: addressData, error: addressError } = await adminClient
        .rpc('encrypt_sensitive_data', {
          plaintext: customerAddress,
          encryption_key: encryptionKey
        });
      if (!addressError && addressData) {
        encryptedAddress = addressData;
      }
    }

    console.log('Data encrypted for admin order creation by:', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          customer_phone: encryptedPhone,
          customer_address: encryptedAddress
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in encrypt-order-data:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error instanceof Error && error.message.includes('required') ? 403 : 500 }
    );
  }
});

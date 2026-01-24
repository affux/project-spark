import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    // Fetch the order
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id, customer_phone, customer_address')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Decrypt the sensitive fields
    let decryptedPhone = order.customer_phone;
    let decryptedAddress = order.customer_address;

    if (order.customer_phone) {
      const { data: phoneData, error: phoneError } = await adminClient
        .rpc('decrypt_sensitive_data', {
          ciphertext: order.customer_phone,
          encryption_key: encryptionKey
        });
      if (!phoneError && phoneData) {
        decryptedPhone = phoneData;
      }
    }

    if (order.customer_address) {
      const { data: addressData, error: addressError } = await adminClient
        .rpc('decrypt_sensitive_data', {
          ciphertext: order.customer_address,
          encryption_key: encryptionKey
        });
      if (!addressError && addressData) {
        decryptedAddress = addressData;
      }
    }

    console.log('Order data decrypted for admin:', user.id, 'order:', orderId);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          customer_phone: decryptedPhone,
          customer_address: decryptedAddress
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in decrypt-order-data:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error instanceof Error && error.message.includes('required') ? 403 : 500 }
    );
  }
});

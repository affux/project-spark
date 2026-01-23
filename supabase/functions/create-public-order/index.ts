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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      storefrontProductId, 
      customerName, 
      customerEmail, 
      customerPhone, 
      customerAddress,
      quantity = 1
    } = await req.json();

    if (!storefrontProductId || !customerName || !customerEmail || !customerAddress) {
      throw new Error('Missing required fields');
    }

    // Get the storefront product
    const { data: storefrontProduct, error: productError } = await supabase
      .from('storefront_products')
      .select('*, products(*)')
      .eq('id', storefrontProductId)
      .single();

    if (productError || !storefrontProduct) {
      throw new Error('Product not found');
    }

    // Generate order number
    const orderNumber = 'ORD-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        storefront_product_id: storefrontProductId,
        dropshipper_user_id: storefrontProduct.user_id,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        quantity: quantity,
        base_price: storefrontProduct.products.base_price,
        selling_price: storefrontProduct.selling_price,
        status: 'pending_payment',
        payment_type: 'prepaid'
      })
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    console.log('Public order created:', orderNumber);

    return new Response(
      JSON.stringify({ success: true, order }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in create-public-order:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

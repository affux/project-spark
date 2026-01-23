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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { orderId, amount } = await req.json();

    if (!orderId || !amount) {
      throw new Error('orderId and amount are required');
    }

    // Get user's wallet balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    if (profile.wallet_balance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Get the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('dropshipper_user_id', user.id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'pending_payment') {
      throw new Error('Order is not pending payment');
    }

    // Deduct from wallet
    const newBalance = profile.wallet_balance - amount;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    // Record transaction
    await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: -amount,
        type: 'order_payment',
        description: `Payment for order ${order.order_number}`,
        order_id: orderId
      });

    // Update order status
    await supabase
      .from('orders')
      .update({ 
        status: 'paid_by_user', 
        paid_at: new Date().toISOString(),
        payment_type: 'wallet'
      })
      .eq('id', orderId);

    console.log('Wallet payment processed:', { orderId, amount, userId: user.id });

    return new Response(
      JSON.stringify({ success: true, newBalance, message: 'Payment processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in process-wallet-payment:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

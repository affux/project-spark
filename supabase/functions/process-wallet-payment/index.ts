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

    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error('orderId is required');
    }

    // Get the order first to calculate the amount
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, base_price, quantity, status, dropshipper_user_id')
      .eq('id', orderId)
      .eq('dropshipper_user_id', user.id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found or access denied');
    }

    if (order.status !== 'pending_payment') {
      throw new Error(`Order is not pending payment. Current status: ${order.status}`);
    }

    // Calculate the amount from the order
    const amount = order.base_price * order.quantity;

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
      throw new Error(`Insufficient wallet balance. Required: $${amount.toFixed(2)}, Available: $${profile.wallet_balance.toFixed(2)}`);
    }

    // Deduct from wallet
    const newBalance = profile.wallet_balance - amount;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('user_id', user.id);

    if (updateError) {
      throw new Error(`Failed to update wallet: ${updateError.message}`);
    }

    // Record wallet transaction
    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: -amount,
        type: 'order_payment',
        description: `Payment for order ${order.order_number}`,
        order_id: orderId
      });

    if (txError) {
      console.error('Failed to record wallet transaction:', txError);
    }

    // Update order status
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({ 
        status: 'paid_by_user', 
        paid_at: new Date().toISOString(),
        payment_type: 'wallet'
      })
      .eq('id', orderId);

    if (orderUpdateError) {
      throw new Error(`Failed to update order: ${orderUpdateError.message}`);
    }

    // Record order status history
    await supabase
      .from('order_status_history')
      .insert({
        order_id: orderId,
        old_status: 'pending_payment',
        new_status: 'paid_by_user',
        changed_by: user.id,
        changed_by_type: 'user',
        notes: `Paid $${amount.toFixed(2)} using wallet balance`
      });

    console.log('Wallet payment processed:', { orderId, amount, userId: user.id, newBalance });

    return new Response(
      JSON.stringify({ 
        success: true, 
        newBalance, 
        amount,
        orderNumber: order.order_number,
        message: 'Payment processed successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in process-wallet-payment:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

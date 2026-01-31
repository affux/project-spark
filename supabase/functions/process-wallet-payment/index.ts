import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required. Please log in and try again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verify the user's token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError) {
      console.error('Auth error:', authError.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid session. Please log in again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    if (!user) {
      console.error('No user found from token');
      return new Response(
        JSON.stringify({ success: false, error: 'User not found. Please log in again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('Authenticated user:', user.id);

    // Parse request body
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Processing wallet payment for order:', orderId);

    // Get the order first to calculate the amount
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, base_price, quantity, status, dropshipper_user_id')
      .eq('id', orderId)
      .eq('dropshipper_user_id', user.id)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError?.message || 'Order not found');
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found or access denied' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (order.status !== 'pending_payment') {
      return new Response(
        JSON.stringify({ success: false, error: `Order is not pending payment. Current status: ${order.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Calculate the amount from the order
    const amount = order.base_price * order.quantity;
    console.log('Order amount:', amount);

    // Get user's wallet balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError?.message || 'Profile not found');
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const currentBalance = Number(profile.wallet_balance);
    console.log('Current wallet balance:', currentBalance);

    if (currentBalance < amount) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Insufficient wallet balance. Required: $${amount.toFixed(2)}, Available: $${currentBalance.toFixed(2)}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Calculate new balance
    const newBalance = currentBalance - amount;
    console.log('New balance after deduction:', newBalance);

    // Deduct from wallet
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update wallet:', updateError.message);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to update wallet: ${updateError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Wallet balance updated successfully');

    // Record wallet transaction - CRITICAL: This must succeed for proper accounting
    const { data: txData, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: -amount,
        type: 'order_payment',
        description: `Payment for order ${order.order_number}`,
        order_id: orderId
      })
      .select('id')
      .single();

    if (txError) {
      // If transaction record fails, we should rollback the wallet deduction
      console.error('Failed to record wallet transaction:', txError.message);
      
      // Rollback: Restore wallet balance
      const { error: rollbackError } = await supabase
        .from('profiles')
        .update({ wallet_balance: currentBalance })
        .eq('user_id', user.id);
      
      if (rollbackError) {
        console.error('CRITICAL: Rollback failed:', rollbackError.message);
      }
      
      return new Response(
        JSON.stringify({ success: false, error: `Failed to record transaction: ${txError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log('Wallet transaction recorded:', txData?.id);

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
      console.error('Failed to update order:', orderUpdateError.message);
      // Note: We don't rollback wallet here as the payment was processed
      // The order can be manually updated by admin
      return new Response(
        JSON.stringify({ success: false, error: `Failed to update order: ${orderUpdateError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Record order status history
    const { error: historyError } = await supabase
      .from('order_status_history')
      .insert({
        order_id: orderId,
        old_status: 'pending_payment',
        new_status: 'paid_by_user',
        changed_by: user.id,
        changed_by_type: 'user',
        notes: `Paid $${amount.toFixed(2)} using wallet balance`
      });

    if (historyError) {
      console.warn('Failed to record status history:', historyError.message);
      // Non-critical, don't fail the request
    }

    console.log('Wallet payment completed successfully:', { 
      orderId, 
      amount, 
      userId: user.id, 
      newBalance,
      orderNumber: order.order_number 
    });

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
    console.error('Unexpected error in process-wallet-payment:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

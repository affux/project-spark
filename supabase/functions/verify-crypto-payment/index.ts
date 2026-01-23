import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the admin is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { paymentId, status, adminNotes } = await req.json();

    if (!paymentId || !status) {
      throw new Error('Missing required fields: paymentId, status');
    }

    console.log(`Processing payment ${paymentId} with status ${status}`);

    // Get the payment details
    const { data: payment, error: paymentError } = await supabase
      .from('crypto_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment not found');
    }

    console.log('Payment found:', payment);

    // Update the payment status
    const updateData: any = {
      status,
      admin_notes: adminNotes || null,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('crypto_payments')
      .update(updateData)
      .eq('id', paymentId);

    if (updateError) {
      console.error('Failed to update payment:', updateError);
      throw new Error('Failed to update payment status');
    }

    let walletCredited = false;
    let postpaidCleared = false;
    let newBalance = null;

    // If verified, credit the wallet or clear postpaid dues
    if (status === 'verified') {
      const userId = payment.user_id;
      const amount = payment.amount;
      const paymentPurpose = payment.payment_purpose;

      if (paymentPurpose === 'postpaid') {
        // Clear postpaid dues
        console.log(`Clearing postpaid dues for user ${userId}, amount: ${amount}`);
        
        // Get current postpaid used
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('postpaid_used')
          .eq('user_id', userId)
          .single();

        if (profileError) {
          console.error('Failed to get profile:', profileError);
        } else {
          const currentUsed = profile.postpaid_used || 0;
          const newUsed = Math.max(0, currentUsed - amount);

          // Update profile
          const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({ postpaid_used: newUsed, updated_at: new Date().toISOString() })
            .eq('user_id', userId);

          if (updateProfileError) {
            console.error('Failed to update profile:', updateProfileError);
          } else {
            // Record the transaction
            const { error: txError } = await supabase
              .from('postpaid_transactions')
              .insert({
                user_id: userId,
                amount: amount,
                transaction_type: 'repayment',
                description: 'Crypto payment verified - postpaid dues cleared',
                balance_before: currentUsed,
                balance_after: newUsed,
                status: 'completed',
              });

            if (txError) {
              console.error('Failed to record postpaid transaction:', txError);
            } else {
              postpaidCleared = true;
              newBalance = newUsed;
              console.log(`Postpaid dues cleared. New balance: ${newUsed}`);
            }
          }
        }
      } else {
        // Credit wallet for regular payments
        console.log(`Crediting wallet for user ${userId}, amount: ${amount}`);

        // Get current balance
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('user_id', userId)
          .single();

        if (profileError) {
          console.error('Failed to get profile:', profileError);
        } else {
          const currentBalance = profile.wallet_balance || 0;
          const newWalletBalance = currentBalance + amount;

          // Update profile
          const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({ wallet_balance: newWalletBalance, updated_at: new Date().toISOString() })
            .eq('user_id', userId);

          if (updateProfileError) {
            console.error('Failed to update wallet:', updateProfileError);
          } else {
            // Record wallet transaction
            const { error: walletTxError } = await supabase
              .from('wallet_transactions')
              .insert({
                user_id: userId,
                amount: amount,
                type: 'credit',
                description: 'Crypto payment verified - wallet credited',
              });

            if (walletTxError) {
              console.error('Failed to record wallet transaction:', walletTxError);
            } else {
              walletCredited = true;
              newBalance = newWalletBalance;
              console.log(`Wallet credited. New balance: ${newWalletBalance}`);
            }
          }
        }
      }

      // Create notification for user
      const { error: notifError } = await supabase
        .from('user_notifications')
        .insert({
          user_id: userId,
          type: 'payment',
          title: 'Payment Verified',
          message: paymentPurpose === 'postpaid'
            ? `Your postpaid payment of $${amount.toFixed(2)} has been verified and dues cleared.`
            : `Your crypto payment of $${amount.toFixed(2)} has been verified and credited to your wallet.`,
        });

      if (notifError) {
        console.error('Failed to create notification:', notifError);
      }
    } else if (status === 'rejected') {
      // Create rejection notification
      const { error: notifError } = await supabase
        .from('user_notifications')
        .insert({
          user_id: payment.user_id,
          type: 'payment',
          title: 'Payment Rejected',
          message: `Your crypto payment of $${payment.amount.toFixed(2)} was rejected. ${adminNotes || 'Please contact support for details.'}`,
        });

      if (notifError) {
        console.error('Failed to create rejection notification:', notifError);
      }
    }

    console.log(`Payment ${paymentId} processed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        status,
        walletCredited,
        postpaidCleared,
        newBalance,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in verify-crypto-payment:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

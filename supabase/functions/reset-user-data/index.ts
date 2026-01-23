import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetOptions {
  orders?: boolean;
  walletTransactions?: boolean;
  storefrontProducts?: boolean;
  proofOfWork?: boolean;
  payoutRequests?: boolean;
  cryptoPayments?: boolean;
  kycSubmissions?: boolean;
  chatMessages?: boolean;
  notifications?: boolean;
  resetProfile?: boolean;
}

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

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { userId, options } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    const resetOptions: ResetOptions = options || {};
    const deletedCounts: Record<string, number> = {};

    // Delete orders and related data
    if (resetOptions.orders) {
      // First delete order chat messages
      const { data: deletedOrderChat } = await supabase
        .from('order_chat_messages')
        .delete()
        .eq('sender_user_id', userId)
        .select('id');
      
      // Delete order status history for user's orders
      const { data: userOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('dropshipper_user_id', userId);
      
      if (userOrders && userOrders.length > 0) {
        const orderIds = userOrders.map(o => o.id);
        await supabase
          .from('order_status_history')
          .delete()
          .in('order_id', orderIds);
        
        await supabase
          .from('order_customer_names')
          .delete()
          .in('order_id', orderIds);
      }
      
      // Delete orders
      const { data: deletedOrders } = await supabase
        .from('orders')
        .delete()
        .eq('dropshipper_user_id', userId)
        .select('id');
      
      deletedCounts.orders = (deletedOrders?.length || 0) + (deletedOrderChat?.length || 0);
    }

    // Delete wallet transactions and reset balance
    if (resetOptions.walletTransactions) {
      const { data: deleted } = await supabase
        .from('wallet_transactions')
        .delete()
        .eq('user_id', userId)
        .select('id');
      
      // Also reset wallet balance
      await supabase
        .from('profiles')
        .update({ wallet_balance: 0 })
        .eq('user_id', userId);
      
      deletedCounts.wallet_transactions = deleted?.length || 0;
    }

    // Delete storefront products
    if (resetOptions.storefrontProducts) {
      const { data: deleted } = await supabase
        .from('storefront_products')
        .delete()
        .eq('user_id', userId)
        .select('id');
      
      deletedCounts.storefront_products = deleted?.length || 0;
    }

    // Delete proof of work submissions
    if (resetOptions.proofOfWork) {
      const { data: deleted } = await supabase
        .from('proof_of_work')
        .delete()
        .eq('user_id', userId)
        .select('id');
      
      deletedCounts.proof_of_work = deleted?.length || 0;
    }

    // Delete payout requests and history
    if (resetOptions.payoutRequests) {
      // First get payout IDs to delete history
      const { data: payouts } = await supabase
        .from('payout_requests')
        .select('id')
        .eq('user_id', userId);
      
      if (payouts && payouts.length > 0) {
        const payoutIds = payouts.map(p => p.id);
        await supabase
          .from('payout_status_history')
          .delete()
          .in('payout_id', payoutIds);
      }
      
      const { data: deleted } = await supabase
        .from('payout_requests')
        .delete()
        .eq('user_id', userId)
        .select('id');
      
      deletedCounts.payout_requests = deleted?.length || 0;
    }

    // Delete crypto payments
    if (resetOptions.cryptoPayments) {
      const { data: deleted } = await supabase
        .from('crypto_payments')
        .delete()
        .eq('user_id', userId)
        .select('id');
      
      deletedCounts.crypto_payments = deleted?.length || 0;
    }

    // Delete KYC submissions
    if (resetOptions.kycSubmissions) {
      const { data: deleted } = await supabase
        .from('kyc_submissions')
        .delete()
        .eq('user_id', userId)
        .select('id');
      
      deletedCounts.kyc_submissions = deleted?.length || 0;
    }

    // Delete chat messages and sessions
    if (resetOptions.chatMessages) {
      const { data: deletedMsgs } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId)
        .select('id');
      
      // Delete chat sessions
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', userId);
      
      // Delete chat customer names
      await supabase
        .from('chat_customer_names')
        .delete()
        .eq('user_id', userId);
      
      // Delete chat ratings
      await supabase
        .from('chat_ratings')
        .delete()
        .eq('user_id', userId);
      
      deletedCounts.chat_messages = deletedMsgs?.length || 0;
    }

    // Delete notifications
    if (resetOptions.notifications) {
      const { data: deleted } = await supabase
        .from('user_notifications')
        .delete()
        .eq('user_id', userId)
        .select('id');
      
      deletedCounts.notifications = deleted?.length || 0;
    }

    // Reset profile (wallet balance, level, storefront, postpaid)
    if (resetOptions.resetProfile) {
      await supabase
        .from('profiles')
        .update({
          wallet_balance: 0,
          user_level: 'bronze',
          storefront_name: null,
          storefront_slug: null,
          storefront_banner: null,
          postpaid_used: 0,
          postpaid_credit_limit: 0,
          postpaid_enabled: false,
          commission_override: null,
        })
        .eq('user_id', userId);
      
      // Also delete postpaid transactions
      await supabase
        .from('postpaid_transactions')
        .delete()
        .eq('user_id', userId);
      
      deletedCounts.profile_reset = 1;
    }

    console.log('User data reset:', { userId, deleted_counts: deletedCounts });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data reset completed',
        deleted_counts: deletedCounts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in reset-user-data:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

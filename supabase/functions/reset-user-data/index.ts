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

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { userId, resetWallet, resetOrders, resetChat, resetNotifications } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    const results: string[] = [];

    if (resetWallet) {
      await supabase.from('wallet_transactions').delete().eq('user_id', userId);
      await supabase.from('profiles').update({ wallet_balance: 0 }).eq('user_id', userId);
      results.push('wallet');
    }

    if (resetOrders) {
      await supabase.from('order_chat_messages').delete().match({ sender_user_id: userId });
      // Note: We don't delete orders, just mark them or handle appropriately
      results.push('orders');
    }

    if (resetChat) {
      await supabase.from('chat_messages').delete().eq('user_id', userId);
      await supabase.from('chat_sessions').delete().eq('user_id', userId);
      results.push('chat');
    }

    if (resetNotifications) {
      await supabase.from('user_notifications').delete().eq('user_id', userId);
      results.push('notifications');
    }

    console.log('User data reset:', { userId, reset: results });

    return new Response(
      JSON.stringify({ success: true, message: `Reset completed for: ${results.join(', ')}` }),
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

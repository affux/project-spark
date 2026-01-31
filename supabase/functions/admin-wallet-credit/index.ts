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

    // Verify admin authorization
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
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { userId, amount, description } = await req.json();

    if (!userId || !amount) {
      throw new Error('userId and amount are required');
    }

    // Get current balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, name, email')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Round to 2 decimal places to prevent floating-point precision issues
    const newBalance = Math.round((Number(profile.wallet_balance) + Number(amount)) * 100) / 100;

    // Update balance using service role (bypasses trigger)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Failed to update wallet: ${updateError.message}`);
    }

    // Record transaction
    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        amount: Number(amount),
        type: amount > 0 ? 'admin_credit' : 'admin_debit',
        description: description || `Admin wallet adjustment`,
      });

    if (txError) {
      console.error('Failed to record transaction:', txError);
    }

    console.log('Admin wallet credit processed:', { userId, amount, newBalance });

    return new Response(
      JSON.stringify({ 
        success: true, 
        newBalance,
        userName: profile.name,
        message: `Wallet ${amount > 0 ? 'credited' : 'debited'} successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in admin-wallet-credit:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

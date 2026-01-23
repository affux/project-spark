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

    // Check if auto-payout is enabled
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'auto_payout_enabled')
      .single();

    if (settings?.value !== 'true') {
      console.log('Auto-payout is disabled');
      return new Response(
        JSON.stringify({ success: true, message: 'Auto-payout is disabled', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get minimum payout amount
    const { data: minSettings } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'min_payout_amount')
      .single();

    const minAmount = parseFloat(minSettings?.value || '100');

    // Find users eligible for auto-payout
    const { data: eligibleUsers, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, wallet_balance, saved_payment_details')
      .gte('wallet_balance', minAmount)
      .not('saved_payment_details', 'is', null);

    if (usersError) {
      throw usersError;
    }

    let processedCount = 0;

    for (const userProfile of eligibleUsers || []) {
      try {
        // Create payout request
        await supabase
          .from('payout_requests')
          .insert({
            user_id: userProfile.user_id,
            amount: userProfile.wallet_balance,
            payment_method: 'auto',
            payment_details: userProfile.saved_payment_details,
            status: 'pending'
          });

        processedCount++;
      } catch (err) {
        console.error('Error processing auto-payout for user:', userProfile.user_id, err);
      }
    }

    console.log('Auto-payouts processed:', processedCount);

    return new Response(
      JSON.stringify({ success: true, message: `Processed ${processedCount} auto-payouts`, processed: processedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in process-auto-payouts:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

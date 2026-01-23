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

    // Find users with postpaid dues
    const { data: usersWithDues, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, email, name, postpaid_used, postpaid_due_cycle')
      .eq('postpaid_enabled', true)
      .gt('postpaid_used', 0);

    if (usersError) {
      throw usersError;
    }

    let notificationsSent = 0;

    for (const userProfile of usersWithDues || []) {
      try {
        // Create in-app notification
        await supabase
          .from('user_notifications')
          .insert({
            user_id: userProfile.user_id,
            title: 'Postpaid Payment Reminder',
            message: `You have a pending postpaid balance of $${userProfile.postpaid_used.toFixed(2)}. Please make payment to continue using postpaid services.`,
            type: 'payment_reminder'
          });

        notificationsSent++;
      } catch (err) {
        console.error('Error sending reminder to user:', userProfile.user_id, err);
      }
    }

    console.log('Postpaid reminders sent:', notificationsSent);

    return new Response(
      JSON.stringify({ success: true, message: `Sent ${notificationsSent} reminders`, count: notificationsSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in send-postpaid-due-reminder:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

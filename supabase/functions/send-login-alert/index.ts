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

    const { userId, ipAddress, userAgent, location } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    // Create in-app notification about new login
    await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        title: 'New Login Detected',
        message: `A new login was detected from ${location || 'unknown location'} (${ipAddress || 'unknown IP'})`,
        type: 'security_alert',
        entity_type: 'login'
      });

    console.log('Login alert sent:', { userId, ipAddress });

    return new Response(
      JSON.stringify({ success: true, message: 'Login alert sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in send-login-alert:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

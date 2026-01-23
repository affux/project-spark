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

    const { userId, email, subject, message, type } = await req.json();

    if (!userId && !email) {
      throw new Error('userId or email is required');
    }

    let targetEmail = email;

    if (!targetEmail && userId) {
      // Get email from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', userId)
        .single();

      targetEmail = profile?.email;
    }

    if (!targetEmail) {
      throw new Error('Could not determine email address');
    }

    // In production, integrate with email service (SendGrid, Resend, etc.)
    // For now, we just log and create in-app notification
    console.log('Email notification would be sent to:', targetEmail, 'Subject:', subject);

    // Create in-app notification as fallback
    if (userId) {
      await supabase
        .from('user_notifications')
        .insert({
          user_id: userId,
          title: subject || 'Notification',
          message: message || 'You have a new notification',
          type: type || 'email'
        });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in send-notification-email:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

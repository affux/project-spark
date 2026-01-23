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

    const { chatSessionId, newAgentId, reason } = await req.json();

    if (!chatSessionId) {
      throw new Error('chatSessionId is required');
    }

    // Get current session
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', chatSessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Chat session not found');
    }

    const previousAgentId = session.assigned_agent_id;

    // Update the session with new agent
    const { error: updateError } = await supabase
      .from('chat_sessions')
      .update({
        assigned_agent_id: newAgentId,
        previous_agent_id: previousAgentId,
        reassignment_count: (session.reassignment_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', chatSessionId);

    if (updateError) {
      throw updateError;
    }

    // Log the reassignment
    await supabase
      .from('chat_reassignment_logs')
      .insert({
        chat_session_id: chatSessionId,
        user_id: session.user_id,
        previous_agent_id: previousAgentId,
        new_agent_id: newAgentId,
        trigger_reason: reason || 'manual_reassignment'
      });

    console.log('Chat reassigned:', { chatSessionId, previousAgentId, newAgentId });

    return new Response(
      JSON.stringify({ success: true, message: 'Chat reassigned successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in chat-reassignment:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

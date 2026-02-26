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
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace('Bearer ', '')
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const adminId = claimsData.claims.sub;

    // Verify admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminId)
      .single();

    if (roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { userId, permanent = false } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === adminId) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own admin account' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (permanent) {
      console.log('Permanently deleting user:', userId);

      // Use the database function for comprehensive cascading delete within a transaction
      // We need to call it as the authenticated admin so the has_role check passes
      const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } }
      });

      const { error: rpcError } = await adminClient.rpc('permanently_delete_user', {
        target_user_id: userId
      });

      if (rpcError) {
        console.error('Error in permanently_delete_user RPC:', rpcError);
        throw new Error(rpcError.message || 'Failed to delete user data');
      }

      // Delete the auth user last (after all public data is removed)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
      if (deleteError) {
        console.error('Error deleting auth user:', deleteError);
        throw deleteError;
      }

      console.log('User permanently deleted:', userId);

      return new Response(
        JSON.stringify({ success: true, message: 'User permanently deleted', permanent: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } else {
      // SOFT DELETE
      console.log('Soft deleting user:', userId);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          deleted_at: new Date().toISOString(),
          is_active: false,
          user_status: 'disabled'
        })
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      await supabase
        .from('force_logout_events')
        .insert({
          user_id: userId,
          reason: 'Account deleted by admin',
          triggered_by: adminId
        });

      console.log('User soft deleted:', userId);

      return new Response(
        JSON.stringify({ success: true, message: 'User deleted (can be recovered)', permanent: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
  } catch (error: unknown) {
    console.error('Error in delete-user:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

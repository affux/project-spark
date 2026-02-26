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

    // Check platform_settings for setup completion flag FIRST
    const { data: setupFlag } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'admin_setup_completed')
      .single();

    if (setupFlag?.value === 'true') {
      return new Response(
        JSON.stringify({ error: 'Admin setup has already been completed' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Check if admin already exists in user_roles
    const { data: existingAdmins, error: checkError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (checkError) {
      console.error('Error checking existing admins:', checkError);
      throw checkError;
    }

    if (existingAdmins && existingAdmins.length > 0) {
      // Mark setup as completed since admin exists
      await supabase
        .from('platform_settings')
        .upsert({ 
          key: 'admin_setup_completed', 
          value: 'true',
          description: 'Flag indicating first admin setup is complete'
        }, { onConflict: 'key' });

      return new Response(
        JSON.stringify({ error: 'An admin account already exists' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get request body
    const { email, password, name, setupSecret } = await req.json();

    // Validate setup secret if configured
    const expectedSecret = Deno.env.get('SETUP_SECRET');
    if (expectedSecret && expectedSecret.length > 0) {
      if (!setupSecret || setupSecret !== expectedSecret) {
        return new Response(
          JSON.stringify({ error: 'Invalid setup secret. Please provide the correct setup secret.' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403 
          }
        );
      }
    }

    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and name are required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log('Creating first admin user:', email);

    // Create the user using Supabase Auth Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      throw authError;
    }

    const userId = authData.user.id;
    console.log('Auth user created:', userId);

    // Update the role to admin
    const { error: roleUpdateError } = await supabase
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', userId);

    if (roleUpdateError) {
      console.error('Error updating role to admin:', roleUpdateError);
      const { error: roleInsertError } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id' });
      
      if (roleInsertError) {
        console.error('Error inserting admin role:', roleInsertError);
        throw roleInsertError;
      }
    }

    // Update profile status to approved
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        user_status: 'approved',
        name: name 
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // Mark setup as completed to permanently disable this endpoint
    await supabase
      .from('platform_settings')
      .upsert({ 
        key: 'admin_setup_completed', 
        value: 'true',
        description: 'Flag indicating first admin setup is complete'
      }, { onConflict: 'key' });

    console.log('Admin user created successfully:', userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        message: 'Admin account created successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: unknown) {
    console.error('Error in create-first-admin:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

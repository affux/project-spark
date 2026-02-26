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

    // Validate JWT - require authenticated user
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

    const authenticatedUserId = claimsData.claims.sub;

    const { userId, email, code: verifyCode } = await req.json();

    // Determine action: if verifyCode is provided, verify; otherwise, send
    if (verifyCode) {
      // VERIFY flow
      if (!userId) {
        throw new Error('userId is required for verification');
      }

      // Ensure user can only verify their own codes
      if (userId !== authenticatedUserId) {
        return new Response(
          JSON.stringify({ error: 'You can only verify your own MFA codes' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      const { data: mfaCode, error: fetchError } = await supabase
        .from('email_mfa_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !mfaCode) {
        return new Response(
          JSON.stringify({ error: 'No valid MFA code found. Please request a new one.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check max attempts
      if (mfaCode.attempts >= mfaCode.max_attempts) {
        await supabase
          .from('email_mfa_codes')
          .update({ is_used: true })
          .eq('id', mfaCode.id);

        return new Response(
          JSON.stringify({ error: 'Too many failed attempts. Please request a new code.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }

      // Increment attempts
      await supabase
        .from('email_mfa_codes')
        .update({ attempts: mfaCode.attempts + 1 })
        .eq('id', mfaCode.id);

      if (mfaCode.code !== verifyCode) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Invalid code. ${mfaCode.max_attempts - mfaCode.attempts - 1} attempts remaining.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Mark code as used
      await supabase
        .from('email_mfa_codes')
        .update({ is_used: true })
        .eq('id', mfaCode.id);

      return new Response(
        JSON.stringify({ success: true, message: 'MFA code verified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // SEND flow
    if (!userId || !email) {
      throw new Error('userId and email are required');
    }

    // Ensure user can only request codes for themselves
    if (userId !== authenticatedUserId) {
      return new Response(
        JSON.stringify({ error: 'You can only request MFA codes for your own account' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Rate limit: max 3 codes per 15 minutes per user
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recentCodes } = await supabase
      .from('email_mfa_codes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gt('created_at', fifteenMinutesAgo);

    if (recentCodes && recentCodes >= 3) {
      return new Response(
        JSON.stringify({ error: 'Too many code requests. Please wait before requesting a new code.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Invalidate any existing unused codes for this user
    await supabase
      .from('email_mfa_codes')
      .update({ is_used: true })
      .eq('user_id', userId)
      .eq('is_used', false);

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store the code in database
    await supabase
      .from('email_mfa_codes')
      .insert({
        user_id: userId,
        email: email,
        code: code,
        expires_at: expiresAt.toISOString(),
        is_used: false,
        attempts: 0
      });

    // Send actual email via Resend if configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      // Get site branding for email
      const { data: siteName } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'site_name')
        .single();

      const brandName = siteName?.value || 'AFFUX';

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${brandName} <noreply@affux.shop>`,
          to: email,
          subject: `Your ${brandName} Login Verification Code`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #333; margin-bottom: 16px;">${brandName} - Verification Code</h2>
              <p style="color: #555; font-size: 14px;">Your verification code is:</p>
              <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 16px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111;">${code}</span>
              </div>
              <p style="color: #888; font-size: 13px;">This code expires in 10 minutes. Do not share it with anyone.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #aaa; font-size: 12px;">If you did not request this code, please ignore this email.</p>
            </div>
          `
        })
      });

      if (!emailResponse.ok) {
        console.error('Failed to send MFA email via Resend:', await emailResponse.text());
        // Don't expose email delivery failure details to client
      }
    } else {
      // No email service configured - log warning (NOT the code)
      console.warn('RESEND_API_KEY not configured. MFA code generated but email not sent for user:', userId);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'MFA code sent to email' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in send-mfa-email:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

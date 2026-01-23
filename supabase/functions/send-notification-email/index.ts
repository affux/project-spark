import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  userId?: string;
  email?: string;
  subject?: string;
  message?: string;
  type?: string;
}

async function sendEmailWithResend(
  apiKey: string,
  from: string,
  to: string[],
  subject: string,
  html: string
): Promise<{ data?: { id: string }; error?: { message: string } }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', result);
      return { error: { message: result.message || result.error?.message || 'Failed to send email' } };
    }

    return { data: result };
  } catch (error) {
    console.error('Error calling Resend API:', error);
    return { error: { message: error instanceof Error ? error.message : 'Network error' } };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: EmailRequest = await req.json();
    const { userId, email, subject, message, type } = body;

    console.log('send-notification-email called with:', { userId, email, subject, type });

    // Fetch email settings from platform_settings
    const { data: settings, error: settingsError } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['resend_api_key', 'sender_email', 'admin_email', 'email_notifications_enabled', 'site_name']);

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw new Error('Failed to fetch email settings');
    }

    const settingsMap: Record<string, string> = {};
    settings?.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    console.log('Settings loaded:', { 
      hasApiKey: !!settingsMap.resend_api_key, 
      senderEmail: settingsMap.sender_email,
      adminEmail: settingsMap.admin_email,
      emailEnabled: settingsMap.email_notifications_enabled,
      siteName: settingsMap.site_name
    });

    const resendApiKey = settingsMap.resend_api_key;
    const senderEmail = settingsMap.sender_email || 'onboarding@resend.dev';
    const adminEmail = settingsMap.admin_email;
    const emailEnabled = settingsMap.email_notifications_enabled === 'true';
    const siteName = settingsMap.site_name || 'DropShip Pro';

    // Check if email notifications are enabled
    if (!emailEnabled) {
      console.log('Email notifications are disabled');
      return new Response(
        JSON.stringify({ success: false, error: 'Email notifications are disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check for API key
    if (!resendApiKey) {
      console.log('No Resend API key configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Resend API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Determine target email
    let targetEmail = email;

    if (type === 'test_email') {
      // For test emails, send to admin email
      targetEmail = adminEmail;
    } else if (!targetEmail && userId) {
      // Get email from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', userId)
        .single();

      targetEmail = profile?.email;
    }

    if (!targetEmail) {
      console.error('No target email determined');
      throw new Error('Could not determine email address');
    }

    console.log('Sending email to:', targetEmail);

    // Build email content based on type
    let emailSubject = subject || 'Notification';
    let emailHtml = '';

    if (type === 'test_email') {
      emailSubject = `✅ Test Email from ${siteName}`;
      emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Email Configuration Successful!</h1>
          </div>
          <div style="background: #1a1a2e; padding: 30px; border-radius: 0 0 12px 12px; color: #e0e0e0;">
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Congratulations! Your email notifications are now properly configured for <strong style="color: #f97316;">${siteName}</strong>.
            </p>
            <div style="background: #252541; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #f97316; margin-top: 0;">Configuration Details:</h3>
              <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Sender Email: <code style="background: #1a1a2e; padding: 2px 6px; border-radius: 4px;">${senderEmail}</code></li>
                <li>Admin Email: <code style="background: #1a1a2e; padding: 2px 6px; border-radius: 4px;">${targetEmail}</code></li>
                <li>Status: <span style="color: #22c55e;">✓ Active</span></li>
              </ul>
            </div>
            <p style="font-size: 14px; color: #888; margin-bottom: 0;">
              You will now receive email notifications for orders, payouts, chat messages, and other important events.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>This is an automated test email from ${siteName}</p>
          </div>
        </div>
      `;
    } else {
      emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">${siteName}</h1>
          </div>
          <div style="background: #1a1a2e; padding: 30px; border-radius: 0 0 12px 12px; color: #e0e0e0;">
            <h2 style="color: #f97316; margin-top: 0;">${emailSubject}</h2>
            <p style="font-size: 16px; line-height: 1.6;">
              ${message || 'You have a new notification.'}
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>This email was sent from ${siteName}</p>
          </div>
        </div>
      `;
    }

    // Send email using Resend API
    const { data: emailData, error: emailError } = await sendEmailWithResend(
      resendApiKey,
      `${siteName} <${senderEmail}>`,
      [targetEmail],
      emailSubject,
      emailHtml
    );

    if (emailError) {
      console.error('Resend error:', emailError);
      throw new Error(emailError.message || 'Failed to send email via Resend');
    }

    console.log('Email sent successfully:', emailData);

    // Also create in-app notification for non-test emails
    if (userId && type !== 'test_email') {
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
      JSON.stringify({ success: true, message: 'Email sent successfully', id: emailData?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in send-notification-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

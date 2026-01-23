import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  userId?: string;
  email?: string;
  recipientEmail?: string;
  userEmail?: string;
  subject?: string;
  message?: string;
  type?: string;
  userName?: string;
  amount?: number;
  adminNotes?: string;
  pendingOrderCount?: number;
  cancellationReason?: string;
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

// Helper to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// Types that should go to admin
const ADMIN_NOTIFICATION_TYPES = [
  'test_email',
  'new_payout_request_admin',
  'payout_cancelled_admin',
  'payout_blocked_pending_payment',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: EmailRequest = await req.json();
    const { 
      userId, 
      email, 
      recipientEmail,
      userEmail,
      subject, 
      message, 
      type,
      userName,
      amount,
      adminNotes,
      pendingOrderCount,
      cancellationReason,
    } = body;

    console.log('send-notification-email called with:', { 
      userId, 
      email, 
      recipientEmail,
      userEmail,
      subject, 
      type,
      userName,
      amount 
    });

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

    // Determine target email based on notification type
    let targetEmail: string | undefined;

    // Check if this is an admin notification type
    if (type && ADMIN_NOTIFICATION_TYPES.includes(type)) {
      targetEmail = adminEmail;
      console.log('Admin notification type detected, sending to admin email:', adminEmail);
    } else {
      // For user notifications, try multiple sources
      targetEmail = email || recipientEmail || userEmail;
      
      // If still no email, try to fetch from profile using userId
      if (!targetEmail && userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', userId)
          .single();
        targetEmail = profile?.email;
      }
    }

    if (!targetEmail) {
      console.error('No target email determined for type:', type);
      throw new Error('Could not determine email address');
    }

    console.log('Sending email to:', targetEmail, 'for type:', type);

    // Build email content based on type
    let emailSubject = subject || 'Notification';
    let emailHtml = '';

    switch (type) {
      case 'test_email':
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
        break;

      case 'new_payout_request_admin':
        emailSubject = `💰 New Payout Request from ${userName || 'User'}`;
        emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">💰 New Payout Request</h1>
            </div>
            <div style="background: #1a1a2e; padding: 30px; border-radius: 0 0 12px 12px; color: #e0e0e0;">
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                A new payout request has been submitted and requires your review.
              </p>
              <div style="background: #252541; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #f97316; margin-top: 0;">Request Details:</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>User: <strong>${userName || 'Unknown'}</strong></li>
                  <li>Email: <code style="background: #1a1a2e; padding: 2px 6px; border-radius: 4px;">${userEmail || 'N/A'}</code></li>
                  <li>Amount: <strong style="color: #22c55e;">${amount ? formatCurrency(amount) : 'N/A'}</strong></li>
                </ul>
              </div>
              <p style="font-size: 14px; color: #888; margin-bottom: 0;">
                Please log in to the admin panel to review and process this request.
              </p>
            </div>
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p>This is an automated notification from ${siteName}</p>
            </div>
          </div>
        `;
        break;

      case 'payout_cancelled_admin':
        emailSubject = `❌ Payout Request Cancelled by ${userName || 'User'}`;
        emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">❌ Payout Cancelled</h1>
            </div>
            <div style="background: #1a1a2e; padding: 30px; border-radius: 0 0 12px 12px; color: #e0e0e0;">
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                A payout request has been cancelled by the user.
              </p>
              <div style="background: #252541; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #f97316; margin-top: 0;">Cancellation Details:</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>User: <strong>${userName || 'Unknown'}</strong></li>
                  <li>Amount: <strong>${amount ? formatCurrency(amount) : 'N/A'}</strong></li>
                  ${cancellationReason ? `<li>Reason: ${cancellationReason}</li>` : ''}
                </ul>
              </div>
            </div>
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p>This is an automated notification from ${siteName}</p>
            </div>
          </div>
        `;
        break;

      case 'payout_approved':
        emailSubject = `✅ Your Payout Request Has Been Approved`;
        emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">✅ Payout Approved!</h1>
            </div>
            <div style="background: #1a1a2e; padding: 30px; border-radius: 0 0 12px 12px; color: #e0e0e0;">
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Great news, ${userName || 'User'}! Your payout request has been approved.
              </p>
              <div style="background: #252541; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #22c55e; margin-top: 0;">Payout Details:</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Amount: <strong style="color: #22c55e;">${amount ? formatCurrency(amount) : 'N/A'}</strong></li>
                  <li>Status: <span style="color: #22c55e;">✓ Approved</span></li>
                  ${adminNotes ? `<li>Admin Notes: ${adminNotes}</li>` : ''}
                </ul>
              </div>
              <p style="font-size: 14px; color: #888; margin-bottom: 0;">
                Your payment will be processed shortly. Thank you for your patience!
              </p>
            </div>
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p>This is an automated notification from ${siteName}</p>
            </div>
          </div>
        `;
        break;

      case 'payout_rejected':
        emailSubject = `❌ Your Payout Request Has Been Rejected`;
        emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">❌ Payout Rejected</h1>
            </div>
            <div style="background: #1a1a2e; padding: 30px; border-radius: 0 0 12px 12px; color: #e0e0e0;">
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Hi ${userName || 'User'}, unfortunately your payout request has been rejected.
              </p>
              <div style="background: #252541; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #ef4444; margin-top: 0;">Details:</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Amount: <strong>${amount ? formatCurrency(amount) : 'N/A'}</strong></li>
                  <li>Status: <span style="color: #ef4444;">✗ Rejected</span></li>
                  ${adminNotes ? `<li>Reason: ${adminNotes}</li>` : ''}
                </ul>
              </div>
              <p style="font-size: 14px; color: #888; margin-bottom: 0;">
                If you have questions, please contact support.
              </p>
            </div>
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p>This is an automated notification from ${siteName}</p>
            </div>
          </div>
        `;
        break;

      case 'payout_completed':
        emailSubject = `🎉 Your Payout Has Been Completed!`;
        emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Payout Completed!</h1>
            </div>
            <div style="background: #1a1a2e; padding: 30px; border-radius: 0 0 12px 12px; color: #e0e0e0;">
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Great news, ${userName || 'User'}! Your payout has been successfully completed.
              </p>
              <div style="background: #252541; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #22c55e; margin-top: 0;">Payout Details:</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Amount: <strong style="color: #22c55e;">${amount ? formatCurrency(amount) : 'N/A'}</strong></li>
                  <li>Status: <span style="color: #22c55e;">✓ Completed</span></li>
                  ${adminNotes ? `<li>Notes: ${adminNotes}</li>` : ''}
                </ul>
              </div>
              <p style="font-size: 14px; color: #888; margin-bottom: 0;">
                The funds should reflect in your account shortly. Thank you for being part of ${siteName}!
              </p>
            </div>
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p>This is an automated notification from ${siteName}</p>
            </div>
          </div>
        `;
        break;

      case 'payout_blocked_pending_payment':
        emailSubject = `⚠️ Payout Blocked - Pending Order Payments`;
        emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Payout Attempt Blocked</h1>
            </div>
            <div style="background: #1a1a2e; padding: 30px; border-radius: 0 0 12px 12px; color: #e0e0e0;">
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                A user attempted to request a payout but was blocked due to pending order payments.
              </p>
              <div style="background: #252541; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #eab308; margin-top: 0;">Details:</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>User: <strong>${userName || 'Unknown'}</strong></li>
                  <li>Email: <code style="background: #1a1a2e; padding: 2px 6px; border-radius: 4px;">${userEmail || 'N/A'}</code></li>
                  <li>Pending Orders: <strong style="color: #eab308;">${pendingOrderCount || 0}</strong></li>
                </ul>
              </div>
            </div>
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p>This is an automated notification from ${siteName}</p>
            </div>
          </div>
        `;
        break;

      default:
        // Generic notification template
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
        break;
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

    // Also create in-app notification for user notifications (not admin notifications)
    if (userId && type && !ADMIN_NOTIFICATION_TYPES.includes(type)) {
      await supabase
        .from('user_notifications')
        .insert({
          user_id: userId,
          title: emailSubject,
          message: message || `Your ${type?.replace(/_/g, ' ')} notification`,
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

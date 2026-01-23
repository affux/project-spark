import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256, x-github-event',
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFICATION_EMAIL = Deno.env.get("NOTIFICATION_EMAIL") || "support@affux.shop";

interface GitHubPushPayload {
  ref: string;
  repository: {
    name: string;
    full_name: string;
  };
  pusher: {
    name: string;
    email: string;
  };
  head_commit: {
    id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
    };
  };
  commits: Array<{
    message: string;
  }>;
}

interface GitHubWorkflowPayload {
  action: string;
  workflow_run?: {
    name: string;
    conclusion: string | null;
    html_url: string;
    head_branch: string;
    head_commit: {
      message: string;
    };
  };
}

async function sendNotificationEmail(subject: string, htmlContent: string) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return { success: false, error: "Email not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "AFFUX Deployments <onboarding@resend.dev>",
        to: [NOTIFICATION_EMAIL],
        subject,
        html: htmlContent,
      }),
    });

    const data = await res.json();
    console.log("Email sent:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const githubEvent = req.headers.get("x-github-event");
    const payload = await req.json();

    console.log("Received GitHub event:", githubEvent);
    console.log("Payload:", JSON.stringify(payload, null, 2));

    let subject = "";
    let htmlContent = "";

    if (githubEvent === "push") {
      const pushPayload = payload as GitHubPushPayload;
      const branch = pushPayload.ref.replace("refs/heads/", "");
      const repoName = pushPayload.repository.name;
      const commitMessage = pushPayload.head_commit?.message || "No message";
      const author = pushPayload.head_commit?.author?.name || pushPayload.pusher?.name || "Unknown";
      const commitId = pushPayload.head_commit?.id?.substring(0, 7) || "N/A";

      subject = `🚀 New Push to ${repoName} (${branch})`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🚀 New Deployment Triggered</h1>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">A new push has been made to your repository.</p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea;">
              <p style="margin: 5px 0;"><strong>Repository:</strong> ${repoName}</p>
              <p style="margin: 5px 0;"><strong>Branch:</strong> ${branch}</p>
              <p style="margin: 5px 0;"><strong>Commit:</strong> ${commitId}</p>
              <p style="margin: 5px 0;"><strong>Author:</strong> ${author}</p>
              <p style="margin: 5px 0;"><strong>Message:</strong> ${commitMessage}</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              If auto-deploy is configured, your changes should be live shortly.
            </p>
          </div>
        </div>
      `;

    } else if (githubEvent === "workflow_run") {
      const workflowPayload = payload as GitHubWorkflowPayload;
      const workflowRun = workflowPayload.workflow_run;

      if (workflowPayload.action === "completed" && workflowRun) {
        const isSuccess = workflowRun.conclusion === "success";
        const statusEmoji = isSuccess ? "✅" : "❌";
        const statusText = isSuccess ? "Succeeded" : "Failed";
        const statusColor = isSuccess ? "#28a745" : "#dc3545";

        subject = `${statusEmoji} Workflow ${statusText}: ${workflowRun.name}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: ${statusColor}; padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">${statusEmoji} Workflow ${statusText}</h1>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px;">
              <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${statusColor};">
                <p style="margin: 5px 0;"><strong>Workflow:</strong> ${workflowRun.name}</p>
                <p style="margin: 5px 0;"><strong>Branch:</strong> ${workflowRun.head_branch}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> ${workflowRun.conclusion}</p>
                <p style="margin: 5px 0;"><strong>Commit:</strong> ${workflowRun.head_commit?.message || "N/A"}</p>
              </div>
              
              <a href="${workflowRun.html_url}" style="display: inline-block; background: #667eea; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin-top: 10px;">
                View Workflow Run
              </a>
            </div>
          </div>
        `;
      }

    } else if (githubEvent === "ping") {
      // GitHub sends a ping event when webhook is first configured
      subject = "🔔 GitHub Webhook Connected Successfully";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🔔 Webhook Connected!</h1>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">
              Your GitHub webhook has been successfully connected. You will now receive notifications for:
            </p>
            <ul style="color: #666;">
              <li>New pushes to the repository</li>
              <li>Workflow run completions</li>
              <li>Deployment status changes</li>
            </ul>
          </div>
        </div>
      `;
    }

    // Send email notification if we have content
    if (subject && htmlContent) {
      const emailResult = await sendNotificationEmail(subject, htmlContent);
      console.log("Email notification result:", emailResult);
    }

    return new Response(
      JSON.stringify({ success: true, event: githubEvent }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});

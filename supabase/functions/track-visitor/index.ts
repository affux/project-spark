import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type VisitorActionType = 
  | "page_view"
  | "link_click"
  | "button_click"
  | "form_submit"
  | "external_link"
  | "cta_click";

function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = (await req.json().catch(() => ({}))) as {
      action_type?: VisitorActionType;
      page_url?: string;
      referrer?: string;
      link_clicked?: string;
    };

    const actionType = body.action_type || "page_view";
    const allowed: Set<VisitorActionType> = new Set([
      "page_view",
      "link_click",
      "button_click",
      "form_submit",
      "external_link",
      "cta_click",
    ]);

    if (!allowed.has(actionType)) {
      return new Response(JSON.stringify({ error: "Invalid action_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || null;

    if (!ip) {
      console.warn("Could not determine client IP from headers");
    }

    const { data: insertData, error: insertError } = await supabase
      .from("visitor_logs")
      .insert({
        ip_address: ip ?? "unknown",
        action_type: actionType,
        page_url: body.page_url || null,
        referrer: body.referrer || null,
        user_agent: userAgent,
        link_clicked: body.link_clicked || null,
        country: null,
        region: null,
        city: null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting visitor log:", insertError);
      throw insertError;
    }

    console.log("Visitor tracked:", { ip, actionType, page: body.page_url });

    return new Response(JSON.stringify({ success: true, id: insertData?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in track-visitor:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type IPActionType =
  | "login"
  | "logout"
  | "order_placed"
  | "payout_request"
  | "profile_update";

function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list. First is original client.
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

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as {
      action_type?: IPActionType;
    };

    const actionType = body.action_type;
    const allowed: Set<IPActionType> = new Set([
      "login",
      "logout",
      "order_placed",
      "payout_request",
      "profile_update",
    ]);

    if (!actionType || !allowed.has(actionType)) {
      return new Response(JSON.stringify({ error: "Invalid action_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = getClientIp(req);
    if (!ip) {
      // We still log the event with a placeholder to avoid breaking flows.
      // (Better than silently logging nothing.)
      console.warn("Could not determine client IP from headers");
    }

    const userId = authData.user.id;

    const { data: insertData, error: insertError } = await supabase
      .from("ip_logs")
      .insert({
        user_id: userId,
        ip_address: ip ?? "unknown",
        action_type: actionType,
        country: null,
        region: null,
        city: null,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    // Best-effort profile update
    if (ip) {
      await supabase
        .from("profiles")
        .update({ last_ip_address: ip })
        .eq("user_id", userId);
    }

    return new Response(JSON.stringify({ success: true, id: insertData?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in capture-ip-action:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

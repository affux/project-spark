import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ifscCode } = await req.json();

    if (!ifscCode) {
      throw new Error('IFSC code is required');
    }

    // Validate IFSC format: 4 letters + 0 + 6 alphanumeric
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    
    if (!ifscRegex.test(ifscCode.toUpperCase())) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid IFSC format. Must be 4 letters, followed by 0, followed by 6 alphanumeric characters.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Try to fetch bank details from public API (optional enhancement)
    try {
      const response = await fetch(`https://ifsc.razorpay.com/${ifscCode.toUpperCase()}`);
      
      if (response.ok) {
        const bankDetails = await response.json();
        return new Response(
          JSON.stringify({ 
            valid: true, 
            bankDetails: {
              bank: bankDetails.BANK,
              branch: bankDetails.BRANCH,
              city: bankDetails.CITY,
              state: bankDetails.STATE,
              address: bankDetails.ADDRESS
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    } catch {
      // If external API fails, just validate format
    }

    // Format is valid even if we couldn't fetch details
    return new Response(
      JSON.stringify({ valid: true, message: 'IFSC format is valid' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in validate-ifsc:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

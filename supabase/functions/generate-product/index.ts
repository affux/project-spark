import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateProductRequest {
  brand: string;
  category: string;
  minPrice: number;
  maxPrice: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand, category, minPrice, maxPrice }: GenerateProductRequest = await req.json();

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Generate random price within range
    const price = Math.round((minPrice + Math.random() * (maxPrice - minPrice)) * 100) / 100;

    // Generate unique SKU
    const sku = `${brand.substring(0, 3).toUpperCase()}-${category.substring(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const prompt = `You are a professional e-commerce product copywriter. Generate a realistic, market-ready product listing for a ${brand} product in the ${category} category.

IMPORTANT: Create an ORIGINAL product name and description inspired by ${brand}'s product style and brand voice, but DO NOT copy any real product names or descriptions.

Return a JSON object with these exact fields:
{
  "name": "A creative, realistic product name in ${brand}'s naming style (e.g., for Nike: 'Air Velocity Pro', for Apple: 'AirPods Studio Max')",
  "description": "A compelling 2-3 paragraph SEO-friendly description including: key features, materials/specs, use cases, and brand tone. Make it persuasive and trustworthy.",
  "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
  "imagePrompt": "A detailed prompt for generating a professional e-commerce product image with clean white background, studio lighting, showing the product from a flattering angle"
}

The description should:
- Sound premium and professional for ${brand}
- Include technical specifications where relevant
- Highlight unique selling points
- Be SEO-optimized with natural keyword integration
- Match the brand's tone (premium for Apple, sporty for Nike, tech-focused for Samsung, etc.)

Return ONLY valid JSON, no other text.`;

    console.log('Generating product content for:', brand, category);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AI API error:', error);
      throw new Error('Failed to generate product content');
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content generated');
    }

    // Parse JSON from response
    let productData;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      productData = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse product data');
    }

    // Now generate the product image
    console.log('Generating product image...');
    
    const imagePrompt = `Professional e-commerce product photo of a ${brand} ${category} product: ${productData.name}. ${productData.imagePrompt || 'Clean white background, studio lighting, high-end commercial photography style, 4K quality, no text or logos.'}`;

    const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: imagePrompt,
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    let imageBase64 = null;
    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl && imageUrl.startsWith('data:image')) {
        imageBase64 = imageUrl;
      }
    } else {
      console.warn('Image generation failed, continuing without image');
    }

    const result = {
      name: productData.name,
      description: productData.description,
      features: productData.features || [],
      brand,
      category,
      price,
      sku,
      imageBase64,
    };

    console.log('Product generated successfully:', result.name);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate product';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

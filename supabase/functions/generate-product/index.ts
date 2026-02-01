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
  galleryCount?: number;
}

async function generateImage(apiKey: string, prompt: string): Promise<string | null> {
  try {
    const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl && imageUrl.startsWith('data:image')) {
        return imageUrl;
      }
    }
    return null;
  } catch (e) {
    console.error('Image generation error:', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand, category, minPrice, maxPrice, galleryCount = 1 }: GenerateProductRequest = await req.json();

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
  "imagePrompts": [
    "Front view product shot with clean white background",
    "Side angle showing product details",
    "Lifestyle shot showing product in use",
    "Close-up detail shot of key features"
  ]
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
        messages: [{ role: 'user', content: prompt }],
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

    // Generate gallery images
    const numImages = Math.min(galleryCount, 4); // Cap at 4 images
    const galleryImages: string[] = [];
    
    const imagePromptVariations = [
      `Professional e-commerce hero photo of ${brand} ${productData.name}. Clean white background, studio lighting, front view, high-end commercial photography, 4K quality, no text.`,
      `Professional product photo of ${brand} ${productData.name} from a 45-degree angle. Clean white background, soft shadows, studio lighting, showing product depth and design details.`,
      `Lifestyle product photography of ${brand} ${productData.name} in a modern setting. Premium aesthetic, natural lighting, product in context of use.`,
      `Close-up detail shot of ${brand} ${productData.name}. Macro photography showing textures, materials, and craftsmanship. Studio lighting, shallow depth of field.`,
    ];

    console.log(`Generating ${numImages} gallery images...`);

    // Generate images in parallel for speed
    const imagePromises = [];
    for (let i = 0; i < numImages; i++) {
      const customPrompt = productData.imagePrompts?.[i] || imagePromptVariations[i];
      const fullPrompt = `${customPrompt} Product: ${brand} ${category} - ${productData.name}. No text, logos, or watermarks.`;
      imagePromises.push(generateImage(apiKey, fullPrompt));
    }

    const imageResults = await Promise.all(imagePromises);
    for (const img of imageResults) {
      if (img) {
        galleryImages.push(img);
      }
    }

    console.log(`Successfully generated ${galleryImages.length} images`);

    const result = {
      name: productData.name,
      description: productData.description,
      features: productData.features || [],
      brand,
      category,
      price,
      sku,
      imageBase64: galleryImages[0] || null, // Main image
      galleryImages, // All gallery images
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

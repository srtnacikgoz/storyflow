/**
 * Style Studio AI Service
 * Tüm AI çağrı mantığını controller'dan ayırır.
 * Anthropic vs OpenRouter yönlendirmesi burada yapılır.
 */

import { getSystemSettings } from "./configService";

// ─── Tip tanımları ────────────────────────────────────────────────────────────

type UserContentPart =
  | { type: "text"; text: string }
  | { type: "image"; base64: string; mimeType: string };

interface CallAiModelOptions {
  systemPrompt: string;
  userContent: UserContentPart[];
  maxTokens?: number;
}

// ─── Hedef model bazlı yeniden formatlama talimatları ────────────────────────

const MODEL_FORMAT_INSTRUCTIONS: Record<string, string> = {
  gemini: `Rewrite as a single flowing paragraph. Include camera specs (lens, aperture), lighting with color temperature (e.g. "5500K daylight"), and spatial composition directions. Be descriptive about textures and materials.`,
  "dall-e": `Rewrite as structured sentences following this order: 1) Background/Scene 2) Subject/Product reference 3) Key Details 4) Style/Medium 5) Technical lighting 6) Mood. Wrap any text in "double quotes". Specify font style and placement.`,
  midjourney: `Rewrite as comma-separated descriptive phrases — concise, evocative, no full sentences. Keep under 60 words. End with: --ar 2:3 --v 7 --s 150 --q 2 --style raw --no blurry distorted watermark cartoon`,
  flux: `Rewrite as a detailed descriptive paragraph. Include art direction, composition, framing, lighting type and direction, style classification, and material/texture descriptions for realism.`,
};

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────

/**
 * JSON bloğunu AI yanıtından parse eder.
 * Hata durumunda { error, raw } döndürür.
 */
function parseJson<T = unknown>(text: string): T {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    return { error: "JSON bloğu bulunamadı", raw: text } as unknown as T;
  } catch {
    return { error: "JSON parse hatası", raw: text } as unknown as T;
  }
}

/**
 * Anthropic veya OpenRouter üzerinden AI çağrısı yapar.
 * Model adında "/" varsa OpenRouter, yoksa Anthropic SDK kullanılır.
 */
async function callAiModel(options: CallAiModelOptions): Promise<string> {
  const { systemPrompt, userContent, maxTokens = 1500 } = options;

  const systemSettings = await getSystemSettings();
  const anthropicApiKey = systemSettings?.anthropicApiKey;
  const openRouterApiKey = (systemSettings as any)?.openRouterApiKey;
  const model = systemSettings?.posterAnalysisModel;

  if (!model) {
    throw new Error("Poster analiz modeli tanımlı değil (Ayarlar > AI Model Seçimi)");
  }

  const isAnthropicModel = !model.includes("/");

  if (isAnthropicModel && !anthropicApiKey) {
    throw new Error("Anthropic API key tanımlı değil (Ayarlar > API Ayarları)");
  }
  if (!isAnthropicModel && !openRouterApiKey) {
    throw new Error("OpenRouter API key tanımlı değil (Ayarlar > API Ayarları)");
  }

  console.log(`[StyleStudioAI] Model: ${model}, isAnthropic: ${isAnthropicModel}`);

  if (isAnthropicModel) {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    // Anthropic SDK için içerik dönüştür
    const content: Array<any> = userContent.map((part) => {
      if (part.type === "text") {
        return { type: "text", text: part.text };
      }
      return {
        type: "image",
        source: {
          type: "base64",
          media_type: (part.mimeType || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: part.base64,
        },
      };
    });

    const result = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    });

    return result.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  } else {
    // OpenRouter — OpenAI-uyumlu API
    const content: Array<any> = userContent.map((part) => {
      if (part.type === "text") {
        return { type: "text", text: part.text };
      }
      return {
        type: "image_url",
        image_url: { url: `data:${part.mimeType || "image/jpeg"};base64,${part.base64}` },
      };
    });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://instagram-automation-ad77b.web.app",
        "X-Title": "Sade Storyflow",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
        ],
      }),
    });

    const data = await response.json() as any;
    if (!response.ok) {
      const errMsg = data?.error?.message || data?.error?.code || JSON.stringify(data?.error) || "Bilinmeyen OpenRouter hatası";
      throw new Error(`OpenRouter (${model}): ${errMsg}`);
    }

    return (data.choices?.[0]?.message?.content || "").trim();
  }
}

// ─── Dışa aktarılan fonksiyonlar ──────────────────────────────────────────────

/**
 * Sahne/arka plan fotoğrafını analiz eder.
 * Işık, yüzey, atmosfer, renk paleti, kamera açısı gibi özellikleri çıkarır.
 * Tüm çıktı İngilizce'dir.
 */
export async function analyzeScene(
  imageBase64: string,
  imageMimeType: string
): Promise<Record<string, unknown>> {
  const systemPrompt = `You are a professional food photography art director. Analyze the provided scene/background photo and extract precise visual properties for use in AI image generation prompts.
IMPORTANT: ALL output MUST be in English only.

Return ONLY valid JSON with this exact structure:
{
  "background": {
    "type": "solid | gradient | textured | surface | outdoor | indoor",
    "color": "approximate hex or descriptive color name",
    "description": "detailed background description"
  },
  "lighting": {
    "direction": "overhead | side-left | side-right | front | backlit | three-point",
    "quality": "soft diffused | hard directional | natural | mixed",
    "temperature": "warm 2700-3500K | neutral 4000K | cool 5000K+",
    "shadowCharacter": "none | soft | medium | hard | dramatic",
    "description": "precise lighting setup and effect description"
  },
  "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "surface": {
    "material": "marble | wood | fabric | ceramic | concrete | slate | linen | none | other",
    "texture": "smooth | rough | grain | matte | glossy | woven | polished",
    "description": "surface material and texture description"
  },
  "ambiance": {
    "mood": "minimal | cozy | editorial | dramatic | fresh | rustic | elegant | moody | airy | earthy",
    "adjectives": ["adj1", "adj2", "adj3"],
    "description": "overall ambiance, emotional tone, and visual atmosphere"
  },
  "servingBase": {
    "type": "plate | board | tray | none | other",
    "shape": "round | rectangular | oval | irregular | none",
    "color": "color description or none",
    "heightCm": 0,
    "description": "serving surface or base object description, or 'none' if absent"
  },
  "propRules": {
    "allowed": true,
    "types": ["prop type 1", "prop type 2"],
    "maxCount": 3,
    "description": "what props are present and how they complement the scene"
  },
  "depthOfField": {
    "foreground": "sharp | soft | blurred",
    "background": "sharp | soft | blurred | bokeh",
    "description": "depth of field characteristics"
  },
  "cameraAngle": "overhead | 45-degree | eye-level | three-quarter | low-angle",
  "productFrameRatio": "approximate proportion of frame the product should occupy, e.g. '40%' or 'centered third'",
  "scenePrompt": "A product photography scene with [PRODUCT] in the center. [describe background, surface, lighting, props, and atmosphere in a single cohesive English paragraph]. Shot from [cameraAngle].",
  "overallDescription": "2-3 sentences describing the complete scene visual style and how it should frame a food product."
}

The scenePrompt MUST contain the [PRODUCT] placeholder.
Be specific and technical — all data will feed directly into AI image generation.`;

  const responseText = await callAiModel({
    systemPrompt,
    userContent: [
      { type: "image", base64: imageBase64, mimeType: imageMimeType },
      { type: "text", text: "Analyze this scene/background photo and extract all visual properties. Return JSON only." },
    ],
    maxTokens: 1400,
  });

  return parseJson<Record<string, unknown>>(responseText);
}

/**
 * Yiyecek/ürün fotoğrafını analiz eder.
 * Şekil, doku, renk, kaplama, katmanlar ve görsel özellikler çıkarılır.
 * Tüm çıktı İngilizce'dir.
 */
export async function analyzeProduct(
  imageBase64: string,
  imageMimeType: string
): Promise<Record<string, unknown>> {
  const systemPrompt = `You are a food photography specialist. Analyze the provided food/product photo and extract precise visual characteristics for use in AI image generation prompts.
IMPORTANT: ALL output MUST be in English only. Use evocative, sensory language for food descriptions.

Return ONLY valid JSON with this exact structure:
{
  "name": "descriptive product name (e.g. 'chocolate lava cake', 'raspberry tart')",
  "type": "pastry | cake | tart | bread | cookie | beverage | plated dish | other",
  "shape": "round | square | rectangular | irregular | cylindrical | layered | other",
  "sizeCm": "approximate size in cm (e.g. '8cm diameter', '20x10cm')",
  "surfaceTexture": "matte | glossy | flaky | crumbly | smooth fondant | rough rustic | caramelized | glazed | dusted",
  "colors": {
    "primary": "#hex — primary color name and description",
    "secondary": "#hex — secondary color name and description",
    "accent": "#hex — accent or highlight color"
  },
  "toppings": ["topping 1 with texture/color detail", "topping 2"],
  "garnish": "garnish description (e.g. 'fresh mint sprig', 'gold leaf flakes', 'none')",
  "layers": "layer description if visible (e.g. 'three alternating layers of sponge and cream', 'single layer', 'none visible')",
  "distinguishingFeatures": ["feature 1 (e.g. 'glistening raspberry drupelets')", "feature 2 (e.g. 'golden-brown fluted tart shell')", "feature 3"],
  "productPrompt": "A [product type], [describe shape, size], with [describe surface texture and color], topped with [toppings and garnish]. [Describe visible layers, distinguishing features, and any glistening/matte/glossy highlights in evocative sensory English]."
}

Focus on food-specific sensory details: use language like "glistening raspberry drupelets", "golden-brown fluted tart shell", "velvety dark chocolate ganache", "delicate crystalline sugar crust".
The productPrompt must stand alone as a product description usable in any photography prompt.`;

  const responseText = await callAiModel({
    systemPrompt,
    userContent: [
      { type: "image", base64: imageBase64, mimeType: imageMimeType },
      { type: "text", text: "Analyze this food/product photo and extract all visual characteristics. Return JSON only." },
    ],
    maxTokens: 1200,
  });

  return parseJson<Record<string, unknown>>(responseText);
}

/**
 * Sahne ve ürün prompt'larını birleştirerek hedef modele uygun final prompt üretir.
 * Işık-doku uyumu, güvenlik filtre terimleri ve ön planda kritik görsel öğeler dikkate alınır.
 * Tüm çıktı İngilizce'dir.
 */
export async function composePrompt(
  scenePrompt: string,
  productPrompt: string,
  targetModel: string,
  productName: string,
  sceneName: string,
  extras?: {
    aspectRatio?: string;
    additionalInstructions?: string;
  }
): Promise<string> {
  const modelInstruction = MODEL_FORMAT_INSTRUCTIONS[targetModel] || MODEL_FORMAT_INSTRUCTIONS["gemini"];

  const systemPrompt = `You are a professional AI image generation prompt engineer specializing in food photography.
Your task is to merge a scene description and a product description into one cohesive, optimized image generation prompt.

RULES:
1. Front-load the most critical visual elements (product appearance, lighting, surface) within the first 30 words.
2. Ensure lighting-texture harmony — if the scene has warm directional light, reflect that on the product surface.
3. NEVER use terms that trigger safety filters: avoid "feminine", "masculine", "female", "male" for hands. Avoid "cupping", "pinching" grip terms. Use: "holding", "lifting slightly", "resting on palm", "pulling apart".
4. NEVER mention trademarked brand names (Samsung, iPhone, LEGO, etc.).
5. Preserve the [PRODUCT] placeholder in the scene context — replace it with the actual product description.
6. ALL output MUST be in English only. No Turkish, no other languages.
7. Output ONLY the final prompt — no labels, no explanations, no preamble.

TARGET MODEL FORMAT:
${modelInstruction}`;

  const userText = `SCENE: ${sceneName}
SCENE PROMPT: ${scenePrompt.replace("[PRODUCT]", productPrompt)}

PRODUCT: ${productName}
PRODUCT PROMPT: ${productPrompt}

TARGET MODEL: ${targetModel}
${extras?.aspectRatio ? `ASPECT RATIO: ${extras.aspectRatio}` : ""}
${extras?.additionalInstructions ? `ADDITIONAL INSTRUCTIONS: ${extras.additionalInstructions}` : ""}

Merge the scene and product into a single, cohesive, publication-quality image generation prompt optimized for ${targetModel}. Return only the prompt.`;

  const responseText = await callAiModel({
    systemPrompt,
    userContent: [
      { type: "text", text: userText },
    ],
    maxTokens: 800,
  });

  return responseText;
}

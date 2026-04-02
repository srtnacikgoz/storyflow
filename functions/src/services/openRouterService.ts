/**
 * OpenRouter Service
 * Tek API key ile 290+ modele erişim
 * API format: OpenAI compatible
 * https://openrouter.ai/docs
 */

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const OPENROUTER_HEADERS = {
  "HTTP-Referer": "https://instagram-automation-ad77b.web.app",
  "X-Title": "Sade Storyflow",
};

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface OpenRouterTextResponse {
  choices: Array<{
    message: { role: string; content: string };
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * OpenRouter üzerinden text üretimi (prompt yazma, analiz)
 */
export async function generateText(params: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
}): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }> {
  const { apiKey, model, messages, maxTokens = 1500 } = params;

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...OPENROUTER_HEADERS,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${error}`);
  }

  const data = await response.json() as OpenRouterTextResponse;
  const text = data.choices?.[0]?.message?.content || "";

  return {
    text,
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    },
  };
}

/**
 * OpenRouter üzerinden görsel üretimi (poster, içerik)
 * Doğru format: modalities: ["image", "text"] + response.images[]
 * https://openrouter.ai/docs/features/image-generation
 */
export async function generateImageViaOpenRouter(params: {
  apiKey: string;
  model: string;
  prompt: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  aspectRatio?: string;
}): Promise<{ imageBase64: string; mimeType: string; cost: number }> {
  const { apiKey, model, prompt, referenceImageBase64, referenceImageMimeType, aspectRatio } = params;

  // Mesaj oluştur
  const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

  // Önce text, sonra image (OpenRouter önerisi)
  const fullPrompt = aspectRatio
    ? `IMPORTANT: Generate this image in ${aspectRatio} aspect ratio.\n\n${prompt}`
    : prompt;

  contentParts.push({ type: "text", text: fullPrompt });

  if (referenceImageBase64) {
    contentParts.push({
      type: "image_url",
      image_url: { url: `data:${referenceImageMimeType || "image/jpeg"};base64,${referenceImageBase64}` },
    });
  }

  const messages: ChatMessage[] = [{ role: "user", content: contentParts }];

  console.log(`[OpenRouter] Image generation starting with ${model}`);

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...OPENROUTER_HEADERS,
    },
    body: JSON.stringify({
      model,
      messages,
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter Image API error (${response.status}): ${error}`);
  }

  const data = await response.json() as any;
  const message = data.choices?.[0]?.message;

  // Yol 1: message.images[] array (OpenRouter standart format)
  if (message?.images?.length > 0) {
    const imageEntry = message.images[0];
    const url = imageEntry?.image_url?.url || imageEntry?.url;
    if (url && url.startsWith("data:image")) {
      const [header, base64] = url.split(",");
      const mimeType = header.match(/data:(.*?);/)?.[1] || "image/png";
      console.log(`[OpenRouter] Image generated via images[] array`);
      return { imageBase64: base64, mimeType, cost: 0 };
    }
  }

  // Yol 2: content string olarak base64 data URL
  const content = message?.content;
  if (typeof content === "string" && content.startsWith("data:image")) {
    const [header, base64] = content.split(",");
    const mimeType = header.match(/data:(.*?);/)?.[1] || "image/png";
    console.log(`[OpenRouter] Image generated via content string`);
    return { imageBase64: base64, mimeType, cost: 0 };
  }

  // Yol 3: content array (multimodal response)
  if (Array.isArray(content)) {
    const imagePart = content.find((p: any) => p.type === "image_url" || p.type === "image");
    if (imagePart?.image_url?.url) {
      const url = imagePart.image_url.url;
      if (url.startsWith("data:image")) {
        const [header, base64] = url.split(",");
        const mimeType = header.match(/data:(.*?);/)?.[1] || "image/png";
        console.log(`[OpenRouter] Image generated via content array`);
        return { imageBase64: base64, mimeType, cost: 0 };
      }
      // Harici URL ise fetch et
      console.log(`[OpenRouter] Fetching image from URL...`);
      const imgResponse = await fetch(url);
      const buffer = await imgResponse.arrayBuffer();
      return { imageBase64: Buffer.from(buffer).toString("base64"), mimeType: "image/png", cost: 0 };
    }
  }

  // Hiçbir format eşleşmedi — debug log
  console.error("[OpenRouter] Bilinmeyen response formatı:", JSON.stringify(data).substring(0, 500));
  throw new Error("OpenRouter image response formatı tanınamadı");
}

// Eski fonksiyon ismi için uyumluluk
export const generateImage = generateImageViaOpenRouter;

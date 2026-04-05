import { createHttpFunction } from "./shared";
import { getConfig } from "../../config/environment";
import { getSystemSettings } from "../../services/configService";

/**
 * Poster için doğrudan Gemini görsel üretimi
 * POST /generatePosterImage
 *
 * Body:
 *   prompt               - Claude'un yazdığı poster prompt'u (zorunlu)
 *   productImageBase64   - Ürün görseli base64 (zorunlu)
 *   productMimeType      - Ürün görsel MIME tipi (default: image/jpeg)
 *   referenceImageBase64 - Referans poster base64 (opsiyonel)
 *   referenceImageMimeType - Referans MIME tipi (opsiyonel, default: image/jpeg)
 *
 * Response:
 *   { imageBase64, mimeType, model, cost, durationMs }
 */
export const generatePosterImage = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const {
    prompt,
    productImageBase64,
    productMimeType,
    referenceImageBase64,
    referenceImageMimeType,
  } = req.body;

  if (!prompt) {
    res.status(400).json({ success: false, error: "prompt zorunlu." });
    return;
  }
  if (!productImageBase64) {
    res.status(400).json({ success: false, error: "productImageBase64 zorunlu." });
    return;
  }

  // API key environment'dan, model Firestore system-settings'den
  let geminiApiKey: string;
  try {
    const config = getConfig();
    geminiApiKey = config.gemini.apiKey;
  } catch {
    res.status(500).json({ success: false, error: "Gemini API key konfigüre edilmemiş (GEMINI_API_KEY)." });
    return;
  }

  const systemSettings = await getSystemSettings();
  const imageModel = (systemSettings.imageModel || "gemini-3-pro-image-preview") as string;

  // Gemini SDK — lazy import (startup timeout önlemi)
  const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = await import("@google/generative-ai");
  const client = new GoogleGenerativeAI(geminiApiKey);

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];

  const genModel = client.getGenerativeModel({ model: imageModel, safetySettings });

  // Content parts:
  // [0] Ürün görseli
  // [1] Referans poster (opsiyonel) — stil/kompozisyon için
  // [2] Poster prompt + direktifler
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentParts: any[] = [
    {
      inlineData: {
        mimeType: productMimeType || "image/jpeg",
        data: productImageBase64,
      },
    },
  ];

  if (referenceImageBase64) {
    contentParts.push({
      inlineData: {
        mimeType: referenceImageMimeType || "image/jpeg",
        data: referenceImageBase64,
      },
    });
  }

  // Poster-specific prompt — Instagram pipeline'ın SECTION 1/2 yapısından farklı
  const fullPrompt = referenceImageBase64
    ? `IMAGE 1: The product to feature in the poster. Extract only this product.
IMAGE 2: Reference poster — replicate its composition, color palette, lighting style, and visual hierarchy. Do NOT copy the product from it; only borrow its design DNA.

${prompt}

Return ONLY the final poster image.`
    : `${prompt}\n\nReturn ONLY the final poster image.`;

  contentParts.push({ text: fullPrompt });

  const startTime = Date.now();
  console.log(`[PosterImage] Görsel üretimi başlıyor: model=${imageModel}, referans=${referenceImageBase64 ? "VAR" : "YOK"}`);

  try {
    const result = await genModel.generateContent(contentParts);
    const response = result.response;

    // Blok kontrolü
    if (!response.candidates || response.candidates.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blockReason = (response as any).promptFeedback?.blockReason;
      throw new Error(`Gemini yanıt vermedi${blockReason ? `: ${blockReason}` : " — güvenlik filtresi tetiklenmiş olabilir."}`);
    }

    const candidate = response.candidates[0];
    if (candidate.finishReason && candidate.finishReason !== "STOP") {
      throw new Error(`Gemini görsel üretemedi (finishReason: ${candidate.finishReason})`);
    }

    // Görsel part'ı bul (inlineData ile dönen image/*)
    const imagePart = candidate.content?.parts?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.inlineData?.mimeType?.startsWith("image/")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    if (!imagePart) {
      throw new Error("Gemini görsel üretmedi — yalnızca metin döndü. Prompt'u kontrol edin.");
    }

    const duration = Date.now() - startTime;

    // Maliyet — usageMetadata varsa token bazlı, yoksa sabit fallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usageMetadata = (response as any).usageMetadata;
    const COST_PER_MODEL: Record<string, number> = {
      "gemini-3-pro-image-preview": 0.134,
      "gemini-3.1-flash-image-preview": 0.10,
    };
    const cost = COST_PER_MODEL[imageModel] ?? 0.10;

    console.log(`[PosterImage] Tamamlandı: ${duration}ms, model=${imageModel}, promptTokens=${usageMetadata?.promptTokenCount ?? "?"}`);

    res.json({
      success: true,
      data: {
        imageBase64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
        model: imageModel,
        cost,
        durationMs: duration,
      },
    });
  } catch (err: any) {
    console.error("[PosterImage] Hata:", err.message);
    res.status(500).json({ success: false, error: err.message || "Görsel üretimi başarısız." });
  }
}, { timeoutSeconds: 120, memory: "512MiB" });

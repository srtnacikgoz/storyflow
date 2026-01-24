/**
 * Gemini Image Service
 * img2img transformation - orijinal görsel korunarak stil uygulanır
 */

import { AILogService } from "./aiLogService";
import { getSystemSettings } from "./configService";

// Lazy load imports - Cloud Functions startup timeout'unu önler
// @google/generative-ai ve sharp modülleri ilk kullanımda yüklenir

// Sharp lazy loader
let sharpModule: typeof import("sharp") | null = null;
async function getSharp() {
  if (!sharpModule) {
    sharpModule = (await import("sharp")).default;
  }
  return sharpModule;
}

// Gemini SDK lazy loader
let geminiModule: typeof import("@google/generative-ai") | null = null;
async function getGeminiSDK() {
  if (!geminiModule) {
    geminiModule = await import("@google/generative-ai");
  }
  return geminiModule;
}

// Güvenlik ayarlarını runtime'da oluştur (lazy load sonrası)
async function getSafetySettings() {
  const { HarmCategory, HarmBlockThreshold } = await getGeminiSDK();
  return [
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ];
}

/**
 * Gemini model tipleri
 * - gemini-2.0-flash-exp: Hızlı, deneysel
 * - gemini-1.5-pro: Yüksek kalite, kararlı sürüm
 */
export type GeminiModel = "gemini-2.0-flash-exp" | "gemini-1.5-pro" | "gemini-2.5-flash-image" | "gemini-3-pro-image-preview";

/**
 * Gemini config
 */
export interface GeminiConfig {
  apiKey: string;
  model?: GeminiModel;
}

/**
 * Image transform seçenekleri
 */
export interface ImageTransformOptions {
  prompt: string;
  negativePrompt?: string;
  faithfulness?: number; // 0.0 - 1.0 (varsayılan: 0.7)
  aspectRatio?: "1:1" | "9:16" | "16:9" | "4:3" | "3:4";
  textOverlay?: string; // Görsel üzerine yazılacak metin (opsiyonel)
  referenceImages?: Array<{ base64: string; mimeType: string; label: string; description?: string }>; // Ek referans görseller (tabak, masa vb.)
}

/**
 * Transform sonucu
 */
export interface TransformResult {
  imageBase64: string;
  mimeType: string;
  model: string;
  cost: number;
}

/**
 * Gemini API Hata Sınıfı
 */
export class GeminiApiError extends Error {
  constructor(
    message: string,
    public readonly errorType: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "GeminiApiError";
  }
}

/**
 * Gemini Blocked Hata Sınıfı
 */
export class GeminiBlockedError extends GeminiApiError {
  constructor(message: string, errorType: string) {
    super(message, errorType);
    this.name = "GeminiBlockedError";
  }
}

/**
 * GeminiService - Image-to-Image transformation
 */
export class GeminiService {
  private apiKey: string;
  private model: GeminiModel;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null; // Lazy initialized

  // Pipeline context for logging
  private pipelineContext: {
    pipelineId?: string;
    slotId?: string;
    productType?: string;
  } = {};

  /**
   * Maliyet sabitleri (USD per image)
   */
  static readonly COSTS: Record<string, number> = {
    "gemini-2.0-flash-exp": 0.01,
    "gemini-1.5-pro": 0.04,
    "gemini-2.5-flash-image": 0.01,
    "gemini-3-pro-image-preview": 0.04,
  };

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "gemini-2.5-flash-image";
  }

  /**
   * Pipeline context'i ayarla (loglama için)
   */
  setPipelineContext(context: {
    pipelineId?: string;
    slotId?: string;
    productType?: string;
  }): void {
    this.pipelineContext = context;
  }

  /**
   * Lazy client initialization
   */
  private async getClient() {
    if (!this.client) {
      const { GoogleGenerativeAI } = await getGeminiSDK();
      this.client = new GoogleGenerativeAI(this.apiKey);
    }
    return this.client;
  }

  /**
   * Görseli optimize et (max 2048px, kalite korunur)
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    const sharp = await getSharp();
    return sharp(imageBuffer)
      .resize(2048, 2048, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({ quality: 90 })
      .toBuffer();
  }

  /**
   * Image-to-Image transformation
   * Orijinal görseli koruyarak stil uygular
   */
  async transformImage(
    imageBase64: string,
    mimeType: string,
    options: ImageTransformOptions
  ): Promise<TransformResult> {
    // Pre-processing: Görseli optimize et
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const optimizedBuffer = await this.preprocessImage(imageBuffer);
    const optimizedBase64 = optimizedBuffer.toString("base64");

    // Lazy load client ve safety settings
    const client = await this.getClient();
    const safetySettings = await getSafetySettings();

    // Model oluştur (güvenlik ayarları ile)
    const genModel = client.getGenerativeModel({
      model: this.model,
      safetySettings,
    });

    // Faithfulness bilgisini prompt'a ekle (API'de parametre yok, prompt ile kontrol)
    // Default değer config'den okunur (runtime'da değiştirilebilir)
    const systemSettings = await getSystemSettings();
    const faithfulness = options.faithfulness ?? systemSettings.geminiDefaultFaithfulness;
    let faithfulnessInstruction = "";

    if (faithfulness >= 0.8) {
      faithfulnessInstruction = `
CRITICAL INSTRUCTION - HIGH FIDELITY MODE (${Math.round(faithfulness * 100)}%):
- Keep the EXACT product from the input image - do NOT replace, reimagine, or modify the product itself
- Only enhance: lighting, color grading, background, and overall atmosphere
- The product must remain 100% recognizable and identical to the original
- Do NOT add, remove, or change any product features`;
    } else if (faithfulness >= 0.6) {
      faithfulnessInstruction = `
IMPORTANT - BALANCED MODE (${Math.round(faithfulness * 100)}%):
- Maintain the core appearance and identity of the product
- You may enhance the presentation, styling, and environment
- The product should remain clearly recognizable
- Subtle artistic improvements are allowed`;
    } else {
      faithfulnessInstruction = `
CREATIVE MODE (${Math.round(faithfulness * 100)}%):
- You have more freedom to interpret and enhance the image
- Maintain the general concept and product type
- Creative styling and atmospheric changes are encouraged`;
    }

    // IMG2IMG EDIT PREFIX - Gemini'a bu görseli düzenlemesini açıkça söyle
    let editPrefix = `EDIT THIS IMAGE. Multiple reference images are attached.
The FIRST image is the MAIN PRODUCT (pastry/croissant/cake) - this MUST appear in the output exactly as shown.
`;

    // Add reference image instructions if they exist
    if (options.referenceImages && options.referenceImages.length > 0) {
      editPrefix += `The following additional reference images are also attached and should be used in the scene:
`;
      for (const ref of options.referenceImages) {
        if (ref.description) {
          // Detaylı açıklama varsa kullan
          editPrefix += `- ${ref.label.toUpperCase()}: ${ref.description}
`;
        } else {
          // Fallback: basit açıklama
          editPrefix += `- A ${ref.label.toUpperCase()} image - use this exact ${ref.label} in the scene
`;
        }
      }
    }

    editPrefix += `
Your task is to COMPOSE a scene using ALL the attached reference images.
CRITICAL INSTRUCTION: You MUST use the provided reference images EXACTLY as they are.
1. The PRODUCT from the first image MUST appear exactly as shown.
2. If a PLATE reference is provided, you MUST use that EXACT plate. Do NOT generate a different plate.
3. If a TABLE reference is provided, you MUST use that EXACT table surface/texture. Do NOT change the table color or material.
4. If a CUP reference is provided, you MUST use that EXACT cup.

This is a COMPOSITION task. Do NOT generate new props if references are provided. Use the provided assets to build the scene.
STRICTLY ADHERE TO THE COLORS AND MATERIALS OF THE REFERENCE IMAGES.
For example, if the table reference is gray, the table in the output MUST be gray. If the plate has a gold rim, the output plate MUST have a gold rim.

SCENE DIRECTION:
`;

    // Full prompt oluştur - edit prefix ilk sırada
    let fullPrompt = editPrefix + options.prompt + faithfulnessInstruction;

    // Text overlay varsa prompt'a ekle
    if (options.textOverlay) {
      fullPrompt += `\n\nSubtly render the text "${options.textOverlay}" in a modern, elegant serif font in the lower third of the image, with subtle shadow for readability.`;
    }

    // Negative prompt ekle
    if (options.negativePrompt) {
      fullPrompt += `\n\nAVOID: ${options.negativePrompt}`;
    }

    // MUTLAK KISITLAMA - Her zaman eklenir (3. koruma katmanı)
    fullPrompt += `\n\nABSOLUTE RESTRICTION: Use ONLY objects from the uploaded reference images. Do NOT add ANY prop, furniture, decoration, or lighting fixture (lamp, lampshade, vase, candle, flowers, picture frame, clock, etc.) that is not in the reference. The scene must be MINIMALIST - only the product and explicitly provided assets. Nothing else.`;

    // Textile/Napkin halüsinasyon önleme (semantic negative prompting)
    fullPrompt += `\n\nTEXTILE CONSTRAINT: Do NOT add colorful, patterned, or decorative textiles (towels, napkins, tablecloths, fabric) unless explicitly provided in reference images. If a napkin is needed and not in references, use ONLY plain white or cream colored, simple paper napkin. NO colorful patterns, NO stripes, NO decorative prints.`;

    // Metin yanıtını engellemek için kesin talimat
    fullPrompt += "\n\nCRITICAL: Edit the image and return ONLY the edited image. Do not provide any text. The product in your output MUST be the same product from the input image.";

    const startTime = Date.now();
    const inputImageCount = 1 + (options.referenceImages?.length || 0);

    try {
      console.log(`[GeminiService] Generating with model: ${this.model}`);

      // Build content array with main image + reference images
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contentParts: any[] = [
        {
          inlineData: {
            mimeType: mimeType || "image/png",
            data: optimizedBase64,
          },
        },
      ];

      // Add reference images if provided (plate, table, cup)
      if (options.referenceImages && options.referenceImages.length > 0) {
        console.log(`[GeminiService] Adding ${options.referenceImages.length} reference images`);
        for (const refImg of options.referenceImages) {
          contentParts.push({
            inlineData: {
              mimeType: refImg.mimeType || "image/png",
              data: refImg.base64,
            },
          });
        }
      }

      // Add prompt at the end
      contentParts.push({ text: fullPrompt });

      const result = await genModel.generateContent(contentParts);

      const response = result.response;

      // Yanıt kontrolü
      if (!response.candidates || response.candidates.length === 0) {
        throw new GeminiBlockedError(
          "AI generated no candidates.",
          "NO_CANDIDATES"
        );
      }

      const candidate = response.candidates[0];

      // İçerik kontrolü
      if (!candidate.content || !candidate.content.parts) {
        throw new GeminiBlockedError(
          "AI response has no content parts.",
          "NO_CONTENT"
        );
      }

      // Görsel içeriği bul
      const imagePart = candidate.content.parts.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (part: any) => part.inlineData
      );

      if (!imagePart || !("inlineData" in imagePart)) {
        // Eğer görsel yoksa, metin yanıtı olabilir
        const textPart = candidate.content.parts.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (part: any) => part.text
        );
        if (textPart && "text" in textPart) {
          console.log("[GeminiService] Text response:", textPart.text);
        }
        throw new GeminiBlockedError(
          "AI did not generate an image. It may have returned text instead.",
          "NO_IMAGE"
        );
      }

      // inlineData'yı güvenli şekilde al
      const inlineData = imagePart.inlineData!;

      // Maliyet hesapla
      const cost = GeminiService.COSTS[this.model] || 0.0;
      const durationMs = Date.now() - startTime;

      console.log("[GeminiService] Image generated successfully");

      // AI Log kaydet
      await AILogService.logGemini({
        model: this.model,
        userPrompt: fullPrompt,
        negativePrompt: options.negativePrompt,
        status: "success",
        cost,
        durationMs,
        inputImageCount,
        outputImageGenerated: true,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
        productType: this.pipelineContext.productType,
      });

      return {
        imageBase64: inlineData.data,
        mimeType: inlineData.mimeType || "image/png",
        model: this.model,
        cost,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error(`[GeminiService] Error with ${this.model}:`, error);

      // Hata logla
      const errorMessage = error instanceof Error ? error.message : "Unknown Gemini API error";
      const errorType = error instanceof GeminiBlockedError ? "blocked" : "error";

      await AILogService.logGemini({
        model: this.model,
        userPrompt: fullPrompt,
        negativePrompt: options.negativePrompt,
        status: errorType as "error" | "blocked",
        error: errorMessage,
        cost: 0,
        durationMs,
        inputImageCount,
        outputImageGenerated: false,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
        productType: this.pipelineContext.productType,
      });

      // Bilinen hata tiplerini kontrol et
      if (error instanceof GeminiBlockedError) {
        throw error;
      }

      if (error instanceof GeminiApiError) {
        throw error;
      }

      // Genel hata
      throw new GeminiApiError(
        errorMessage,
        "API_ERROR"
      );
    }
  }

  /**
   * Modelin görsel üretip üretemeyeceğini test et
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.getClient();
      const safetySettings = await getSafetySettings();
      const genModel = client.getGenerativeModel({
        model: this.model,
        safetySettings,
      });

      const result = await genModel.generateContent("Say 'OK' if you can hear me.");
      const response = result.response;

      return !!response.text();
    } catch (error) {
      console.error("[GeminiService] Connection test failed:", error);
      return false;
    }
  }
}

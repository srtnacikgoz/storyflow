/**
 * Gemini Image Service
 * img2img transformation - orijinal görsel korunarak stil uygulanır
 */

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
  const {HarmCategory, HarmBlockThreshold} = await getGeminiSDK();
  return [
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
  ];
}

/**
 * Gemini model tipleri
 * - gemini-2.5-flash-image: Hızlı, test/günlük kullanım ($0.01/görsel)
 * - gemini-3-pro-image-preview: Yüksek kalite, final paylaşımlar ($0.04/görsel)
 */
export type GeminiModel = "gemini-2.5-flash-image" | "gemini-3-pro-image-preview";

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

  /**
   * Maliyet sabitleri (USD per image)
   */
  static readonly COSTS: Record<GeminiModel, number> = {
    "gemini-2.5-flash-image": 0.01, // Test/günlük kullanım
    "gemini-3-pro-image-preview": 0.04, // Final kalite
  };

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "gemini-2.5-flash-image";
  }

  /**
   * Lazy client initialization
   */
  private async getClient() {
    if (!this.client) {
      const {GoogleGenerativeAI} = await getGeminiSDK();
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
    const faithfulness = options.faithfulness ?? 0.7;
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

    // Full prompt oluştur
    let fullPrompt = options.prompt + faithfulnessInstruction;

    // Text overlay varsa prompt'a ekle
    if (options.textOverlay) {
      fullPrompt += `\n\nSubtly render the text "${options.textOverlay}" in a modern, elegant serif font in the lower third of the image, with subtle shadow for readability.`;
    }

    // Negative prompt ekle
    if (options.negativePrompt) {
      fullPrompt += `\n\nAVOID: ${options.negativePrompt}`;
    }

    try {
      console.log(`[GeminiService] Generating with model: ${this.model}`);

      const result = await genModel.generateContent([
        {
          inlineData: {
            mimeType: mimeType || "image/png",
            data: optimizedBase64,
          },
        },
        { text: fullPrompt },
      ]);

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

      console.log(`[GeminiService] Image generated successfully`);

      return {
        imageBase64: inlineData.data,
        mimeType: inlineData.mimeType || "image/png",
        model: this.model,
        cost,
      };
    } catch (error) {
      console.error(`[GeminiService] Error with ${this.model}:`, error);

      // Bilinen hata tiplerini kontrol et
      if (error instanceof GeminiBlockedError) {
        throw error;
      }

      if (error instanceof GeminiApiError) {
        throw error;
      }

      // Genel hata
      throw new GeminiApiError(
        error instanceof Error ? error.message : "Unknown Gemini API error",
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

/**
 * Gemini Image Service
 * img2img transformation - orijinal görsel korunarak stil uygulanır
 */

import { AILogService } from "./aiLogService";

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
 * Timeout wrapper - Belirli bir sürede cevap gelmezse hata fırlat
 * Gemini API bazen hang oluyor (hiç cevap vermiyor) - bu durumda timeout gerekiyor
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, context: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[${context}] Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Retry wrapper - Gemini API çağrıları için exponential backoff ile yeniden deneme
 * Cloud Functions'dan Gemini API'ye fetch hataları yaşandığında otomatik retry yapar
 * Ayrıca timeout mekanizması ile hang olan çağrıları yakalar
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    timeoutMs?: number;
    context?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 2000,
    maxDelayMs = 30000,
    timeoutMs = 60000, // 60 saniye varsayılan timeout
    context = "Gemini",
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Her çağrıya timeout uygula
      const result = await withTimeout(fn(), timeoutMs, context);
      return result;
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message || String(lastError);

      // Retry yapılabilir hatalar: fetch failed, network errors, timeout
      const isRetryable =
        errorMessage.includes("fetch failed") ||
        errorMessage.includes("ECONNRESET") ||
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("socket hang up") ||
        errorMessage.includes("network") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("Request timeout");

      if (!isRetryable || attempt === maxRetries) {
        console.error(`[${context}] Final error after ${attempt} attempts:`, errorMessage);
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = Math.min(initialDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const jitter = delay * 0.2 * Math.random(); // %20 jitter
      const waitTime = Math.round(delay + jitter);

      console.warn(`[${context}] Attempt ${attempt}/${maxRetries} failed: ${errorMessage}. Retrying in ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError || new Error(`${context} failed after ${maxRetries} attempts`);
}

/**
 * Gemini model tipleri (Şubat 2026 - Sadece Image Model)
 * Pipeline'da tek AI çağrısı: görsel üretim
 * Admin helper'lar (tema/senaryo açıklaması) için image model text de üretebilir
 */
export type GeminiModel = "gemini-3-pro-image-preview" | "gemini-2.5-flash-image" | "gemini-2.0-flash-exp";

/**
 * Desteklenen image model ID'leri
 * Admin Panel dropdown ve orchestrator validasyonu için
 */
export type ImageModelId = GeminiModel;

/**
 * Gemini config
 */
export interface GeminiConfig {
  apiKey: string;
  imageModel?: GeminiModel; // Görsel üretim modeli (varsayılan: gemini-3-pro-image-preview)
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
  private imageModel: GeminiModel; // Tek model — görsel üretim + admin text helper
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null; // Lazy initialized

  // Pipeline context for logging
  private pipelineContext: {
    pipelineId?: string;
    slotId?: string;
    productType?: string;
    referenceImages?: Array<{ type: string; id: string; filename: string }>;
  } = {};

  /**
   * Maliyet sabitleri (USD per request)
   */
  static readonly COSTS: Record<string, number> = {
    "gemini-3-pro-image-preview": 0.04,
  };

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.imageModel = config.imageModel || "gemini-3-pro-image-preview";
  }

  /**
   * Pipeline context'i ayarla (loglama için)
   */
  setPipelineContext(context: {
    pipelineId?: string;
    slotId?: string;
    productType?: string;
    referenceImages?: Array<{ type: string; id: string; filename: string }>;
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
      model: this.imageModel,
      safetySettings,
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // REFERANS SADAKATİ v3.0 - İki bölümlü yapı
    // SECTION 1: Referans nesneleri (birebir kopyala)
    // SECTION 2: Sahne & atmosfer (yaratıcı yön)
    // ═══════════════════════════════════════════════════════════════════════════

    // SECTION 1: Reference Objects — Gemini'ye referans görsellerin listesi
    let editPrefix = `SECTION 1 — REFERENCE OBJECTS (preserve exactly):
[1] MAIN PRODUCT — use exactly as shown
`;

    // Referans görsellere [N] tagging ile label ekle
    if (options.referenceImages && options.referenceImages.length > 0) {
      let refIndex = 2;
      for (const ref of options.referenceImages) {
        const desc = ref.description ? ` — ${ref.description}` : "";
        editPrefix += `[${refIndex}] ${ref.label.toUpperCase()}${desc}
`;
        refIndex++;
      }
    }

    // Kısa ve kesin fidelity kuralı (25 satır → 3 satır)
    editPrefix += `
Match each reference object exactly. Do not replace, recolor, or add objects not shown in references.
The scene should contain ONLY the referenced objects arranged in the composition described below.

SECTION 2 — SCENE & ATMOSPHERE (creative direction):
`;

    // Full prompt oluştur - editPrefix + Claude's optimized prompt
    let fullPrompt = editPrefix + options.prompt;

    // Text overlay (sadeleştirilmiş)
    if (options.textOverlay) {
      fullPrompt += `\n\nText: "${options.textOverlay}" - elegant serif font, lower third, subtle shadow.`;
    }

    // Negative prompt - --no formatı (en etkili yöntem)
    if (options.negativePrompt) {
      fullPrompt += `\n\n--no ${options.negativePrompt}`;
    }

    // Basit final instruction
    fullPrompt += "\n\nReturn ONLY the edited image.";

    const startTime = Date.now();
    const inputImageCount = 1 + (options.referenceImages?.length || 0);

    try {
      console.log(`[GeminiService] Generating with model: ${this.imageModel}`);

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

      // Retry wrapper ile generateContent çağrısı (fetch hatalarına karşı koruma)
      const result = await withRetry(
        async () => genModel.generateContent(contentParts),
        { maxRetries: 3, initialDelayMs: 3000, maxDelayMs: 60000, context: `GeminiService.transformImage(${this.imageModel})` }
      ) as Awaited<ReturnType<typeof genModel.generateContent>>;

      const response = result.response;

      // Blok nedenini yakala (promptFeedback + candidate finishReason)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promptFeedback = (response as any).promptFeedback;
      const blockReason = promptFeedback?.blockReason || null;
      // TÜM safety rating'leri göster
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safetyRatings = promptFeedback?.safetyRatings || [];

      // Yanıt kontrolü
      if (!response.candidates || response.candidates.length === 0) {
        const details: string[] = [];
        if (blockReason) details.push(`blockReason: ${blockReason}`);
        if (safetyRatings.length > 0) {
          details.push(`safetyFlags: ${safetyRatings.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (r: any) => `${r.category}=${r.probability}${r.blocked ? " [BLOCKED]" : ""}`
          ).join(", ")}`);
        }
        // promptFeedback'teki ek bilgileri de ekle
        if (promptFeedback) {
          const extraKeys = Object.keys(promptFeedback).filter(
            k => k !== "blockReason" && k !== "safetyRatings"
          );
          for (const key of extraKeys) {
            details.push(`${key}: ${JSON.stringify(promptFeedback[key])}`);
          }
        }

        // RAW RESPONSE DUMP — tüm Gemini response bilgisini logla
        const rawDump: Record<string, unknown> = {};
        try {
          rawDump.promptFeedback = promptFeedback || null;
          rawDump.candidates = (response as any).candidates || null;
          rawDump.usageMetadata = (response as any).usageMetadata || null;
          rawDump.modelVersion = (response as any).modelVersion || null;
          // Response'un tüm key'lerini tara
          const responseKeys = Object.keys(response);
          for (const key of responseKeys) {
            if (!rawDump[key] && key !== "text") {
              try {
                rawDump[key] = JSON.parse(JSON.stringify((response as any)[key]));
              } catch {
                rawDump[key] = `[serialize error: ${typeof (response as any)[key]}]`;
              }
            }
          }
        } catch (dumpErr) {
          rawDump.dumpError = String(dumpErr);
        }
        console.error(`[GeminiService] BLOCKED — Raw response dump:`, JSON.stringify(rawDump, null, 2));

        const detailStr = details.length > 0 ? ` [${details.join(" | ")}]` : "";
        const blockedError = new GeminiBlockedError(
          `Görsel üretilemedi — Gemini engelledi.${detailStr}`,
          "NO_CANDIDATES"
        );
        // Raw dump'ı error'a ekle (loglama için)
        (blockedError as any).rawResponseDump = rawDump;
        throw blockedError;
      }

      const candidate = response.candidates[0];

      // Candidate-level blok kontrolü
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const candidateFinishReason = (candidate as any).finishReason;
      // TÜM candidate safety rating'leri göster
      const candidateSafetyRatings = (candidate as any).safetyRatings || [];

      // İçerik kontrolü
      if (!candidate.content || !candidate.content.parts) {
        const details: string[] = [];
        if (candidateFinishReason && candidateFinishReason !== "STOP") details.push(`finishReason: ${candidateFinishReason}`);
        if (candidateSafetyRatings.length > 0) {
          details.push(`safetyFlags: ${candidateSafetyRatings.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (r: any) => `${r.category}=${r.probability}${r.blocked ? " [BLOCKED]" : ""}`
          ).join(", ")}`);
        }

        // RAW CANDIDATE DUMP
        const rawDump: Record<string, unknown> = {
          promptFeedback: promptFeedback || null,
          candidateFinishReason,
          candidateSafetyRatings,
          candidateIndex: (candidate as any).index,
          usageMetadata: (response as any).usageMetadata || null,
        };
        console.error(`[GeminiService] NO_CONTENT — Raw candidate dump:`, JSON.stringify(rawDump, null, 2));

        const detailStr = details.length > 0 ? ` [${details.join(" | ")}]` : "";
        const blockedError = new GeminiBlockedError(
          `Görsel içerik boş döndü.${detailStr}`,
          "NO_CONTENT"
        );
        (blockedError as any).rawResponseDump = rawDump;
        throw blockedError;
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
      const cost = GeminiService.COSTS[this.imageModel] || 0.0;
      const durationMs = Date.now() - startTime;

      console.log("[GeminiService] Image generated successfully");

      // AI Log kaydet
      await AILogService.logGemini("image-generation", {
        model: this.imageModel,
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
        referenceImages: this.pipelineContext.referenceImages,
      });

      return {
        imageBase64: inlineData.data,
        mimeType: inlineData.mimeType || "image/png",
        model: this.imageModel,
        cost,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error(`[GeminiService] Error with ${this.imageModel}:`, error);

      // Hata logla
      const errorMessage = error instanceof Error ? error.message : "Unknown Gemini API error";
      const errorType = error instanceof GeminiBlockedError ? "blocked" : "error";

      // Raw response dump varsa error mesajına ekle
      const rawDump = (error as any)?.rawResponseDump;
      const fullErrorMessage = rawDump
        ? `${errorMessage} | RAW_DUMP: ${JSON.stringify(rawDump)}`
        : errorMessage;

      await AILogService.logGemini("image-generation", {
        model: this.imageModel,
        userPrompt: fullPrompt,
        negativePrompt: options.negativePrompt,
        status: errorType as "error" | "blocked",
        error: fullErrorMessage,
        cost: 0,
        durationMs,
        inputImageCount,
        outputImageGenerated: false,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
        productType: this.pipelineContext.productType,
        referenceImages: this.pipelineContext.referenceImages,
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
   * Admin helper için basit metin üretimi (image model text de üretebilir)
   * Pipeline'da KULLANILMAZ — sadece admin panel'den tema/senaryo açıklaması üretmek için
   */
  async generateTextForAdmin(
    prompt: string,
    systemInstruction?: string,
  ): Promise<{ text: string; cost: number }> {
    const model = this.imageModel;
    const client = await this.getClient();
    const safetySettings = await getSafetySettings();

    const genModel = client.getGenerativeModel({
      model,
      safetySettings,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
    });

    const startTime = Date.now();

    try {
      console.log(`[GeminiService] Admin text generation with ${model}`);

      const result = await withRetry(
        async () => genModel.generateContent(prompt),
        { maxRetries: 2, initialDelayMs: 2000, context: `GeminiService.generateTextForAdmin(${model})` }
      ) as Awaited<ReturnType<typeof genModel.generateContent>>;
      const response = result.response;
      const text = response.text();

      const cost = GeminiService.COSTS[model] || 0.04;
      const durationMs = Date.now() - startTime;

      // AI Log kaydet
      await AILogService.logGemini("prompt-optimization", {
        model,
        userPrompt: prompt.substring(0, 500) + "...",
        status: "success",
        cost,
        durationMs,
      });

      return { text, cost };
    } catch (error) {
      console.error(`[GeminiService] Admin text generation error (${model}):`, error);
      throw error;
    }
  }

  /**
   * Tema Açıklaması Üret (Admin panel)
   */
  async generateThemeDescription(themeName: string, keywords?: string): Promise<{ text: string; cost: number }> {
    const systemPrompt = `You are an expert AI Prompt Engineer for a high-end food photography automation system.
Your goal is to write a "Theme Description" that acts as a "Director's Note" for the AI image generator.

RULES:
1. LANGUAGE: English ONLY. High-quality, descriptive English.
2. LENGTH: Concise (40-60 words).
3. STRUCTURE: Start with Mood/Atmosphere, then Lighting, then Vibes.
4. FOCUS: "Visual Anchor" technique - Keep the product (pastry/coffee) as the hero.
5. TONE: Professional, evocative, sensory.

INPUT:
Theme Name: ${themeName}
Keywords: ${keywords || "None"}

OUTPUT FORMAT:
Return ONLY the description text. No quotes, no "Here is the description:".`;

    const userPrompt = `Write the theme description for: "${themeName}".`;

    try {
      const { text, cost } = await this.generateTextForAdmin(userPrompt, systemPrompt);
      return { text: text.trim(), cost };
    } catch (error) {
      console.error("[GeminiService] Theme description generation failed:", error);
      throw error;
    }
  }

  /**
   * Mood Açıklaması Üret (Admin panel)
   */
  async generateMoodDescription(
    moodName: string,
    weather?: string,
    timeOfDay?: string,
    season?: string,
    keywords?: string
  ): Promise<{ text: string; cost: number }> {
    const systemPrompt = `You are an expert Art Director and Cinematographer for a high-end food photography system.
Your task is to write a concise, atmospheric, and technically precise visual description for an AI image generator.

RULES:
1. LANGUAGE: English ONLY.
2. LENGTH: Concise (30-50 words).
3. FOCUS: Lighting quality, Color Grading, Shadows, and Emotional Vibe.
4. IMPORTANT: You MUST align your description with the provided Weather, Time of Day, and Season constraints.
   - If Weather is 'rainy': mention soft diffused light, overcast sky, no direct sunlight.
   - If Weather is 'sunny': mention warm golden light, sharp shadows.
   - If Weather is 'cloudy': mention flat, even lighting, muted tones.
   - If Weather is 'snowy': mention cool blue-white tones, soft cold light.
5. Do NOT mention specific objects, products, or people. Focus only on the 'Atmosphere'.
6. OUTPUT: Return ONLY the description text. No quotes, no prefixes.`;

    const userPrompt = `Mood Name: ${moodName}
Weather: ${weather !== "any" ? weather : "Flexible"}
Time of Day: ${timeOfDay !== "any" ? timeOfDay : "Flexible"}
Season: ${season !== "any" ? season : "Flexible"}
${keywords ? `Additional Keywords: ${keywords}` : ""}

Write the atmospheric description:`;

    try {
      const { text, cost } = await this.generateTextForAdmin(userPrompt, systemPrompt);
      return { text: text.trim(), cost };
    } catch (error) {
      console.error("[GeminiService] Mood description generation failed:", error);
      throw error;
    }
  }

  /**
   * Senaryo Açıklaması Üret (Admin panel)
   */
  async generateScenarioDescription(params: {
    scenarioName: string;
    includesHands: boolean;
    compositions: string[];
    compositionEntry?: string;
  }): Promise<{ text: string; cost: number }> {
    const { scenarioName, includesHands, compositions, compositionEntry } = params;

    const handInfo = includesHands
      ? `\nHand Style: Yes, includes hands${compositionEntry ? `\nEntry Point: ${compositionEntry}` : ""}`
      : "\nHand Style: No hands in scene";

    const systemPrompt = `You are an expert Food Photography Director for a high-end pastry/cafe brand.
Your task is to write a "Scene Description" that tells the AI image generator WHAT IS HAPPENING in the scene.

RULES:
1. LANGUAGE: English ONLY.
2. LENGTH: Concise (40-60 words).
3. FOCUS ONLY ON:
   - The "moment" being captured (breaking, sipping, presenting, etc.)
   - Hand positioning and gesture (if hands are included)
   - Product placement and camera angle
   - Emotional feeling (intimate, elegant, cozy, premium)
4. DO NOT DESCRIBE:
   - Lighting (that's the Mood's job)
   - Color palette (that's the Mood's job)
   - Weather/atmosphere (that's the Mood's job)
5. HAND RULES (if hands included):
   - Describe hands as: elegant, feminine, well-manicured nails, natural skin tone
   - Focus on the ACTION the hands are performing
6. PRODUCT REFERENCE RULE (CRITICAL):
 - DO NOT describe the product's appearance (color, texture, shape, specific type)
 - Simply refer to it as "the product", "the pastry", or "the item"
 - The AI image generator will use the reference image for exact product details
 - WRONG: "A golden, flaky croissant is captured..."
 - CORRECT: "The pastry is captured..." or "The product is elegantly presented..."
7. PROP & SURFACE RULE (CRITICAL):
 - DO NOT specify materials, colors, or styles for surfaces, tableware, or accessories
 - DO NOT write "rustic wooden table", "marble counter", "ceramic plate", "linen napkin", etc.
 - Use GENERIC references: "the table", "a plate", "a cup", "a napkin", "a small vase"
 - The pipeline selects specific assets separately — your description must not conflict with them
 - WRONG: "placed on a rustic wooden table with a ceramic cup of coffee"
 - CORRECT: "placed on the table with a cup of coffee beside it"
8. ACCESSORY RULE:
 - You may mention the PRESENCE of accessories (cup, napkin, flowers, cutlery) but NOT their material or style
 - Focus on SPATIAL ARRANGEMENT, not object descriptions
9. OUTPUT: Return ONLY the description. No quotes, no prefixes like "Here is:".`;

    const userPrompt = `Scenario Name: ${scenarioName}
Compositions: ${compositions.join(", ")}${handInfo}

Write the scene description:`;

    try {
      const { text, cost } = await this.generateTextForAdmin(userPrompt, systemPrompt);
      return { text: text.trim(), cost };
    } catch (error) {
      console.error("[GeminiService] Scenario description generation failed:", error);
      throw error;
    }
  }
}

/**
 * Gemini Image Service
 * img2img transformation - orijinal görsel korunarak stil uygulanır
 */

import { AILogService } from "./aiLogService";
import { AILogStage } from "../types";
import { getPromptTemplate, interpolatePrompt } from "./configService";
import { getCompactTrainingContext } from "../orchestrator/promptTrainingService";

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
 * Gemini model tipleri (Ocak 2026 - Sadece Gemini 3 Serisi)
 * - gemini-3-pro-preview: Flagship Logic modeli
 * - gemini-3-flash-preview: High-speed Logic modeli
 * - gemini-3-pro-image-preview: Nano Banana Pro (Vision/Image)
 */
export type GeminiModel =
  | "gemini-3-pro-preview"
  | "gemini-3-flash-preview"
  | "gemini-3-pro-image-preview";

/**
 * Gemini config
 */
export interface GeminiConfig {
  apiKey: string;
  imageModel?: GeminiModel; // Görsel üretim modeli (varsayılan: gemini-3-pro-image-preview)
  textModel?: GeminiModel; // Mantık/Logic modeli (varsayılan: gemini-3-pro-preview)
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
  private imageModel: GeminiModel; // Görsel üretim modeli
  private textModel: GeminiModel; // Mantık/Logic modeli
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null; // Lazy initialized

  // Pipeline context for logging
  private pipelineContext: {
    pipelineId?: string;
    slotId?: string;
    productType?: string;
  } = {};

  /**
   * Maliyet sabitleri (USD per request - Gemini 3 Serisi)
   */
  static readonly COSTS: Record<string, number> = {
    "gemini-3-pro-preview": 0.05,
    "gemini-3-flash-preview": 0.01,
    "gemini-3-pro-image-preview": 0.04,
  };

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.imageModel = config.imageModel || "gemini-3-pro-image-preview";
    // Text işlemleri için Flash model kullan (maliyet optimizasyonu: $0.05 → $0.01)
    // Asset seçimi, senaryo seçimi, prompt optimizasyonu, QC gibi basit JSON görevler için yeterli
    this.textModel = config.textModel || "gemini-3-flash-preview";
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
      model: this.imageModel,
      safetySettings,
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // RADİKAL SADELEŞTİRME v2.0 - Gemini Prompt Insights'a göre
    // Hedef: 75-150 kelime, [1][2][3] tagging, --no format
    // ═══════════════════════════════════════════════════════════════════════════

    // Reference tagging ile basit edit prefix
    let editPrefix = `Compose a scene using attached reference images:
[1] MAIN PRODUCT (first image) - use exactly as shown
`;

    // Add reference image instructions with [N] tagging
    if (options.referenceImages && options.referenceImages.length > 0) {
      let refIndex = 2;
      for (const ref of options.referenceImages) {
        const desc = ref.description ? `: ${ref.description}` : "";
        editPrefix += `[${refIndex}] ${ref.label.toUpperCase()}${desc}
`;
        refIndex++;
      }
    }

    // Core constraint - ZERO HALLUCINATION POLİCY (Güçlendirilmiş v2.1)
    editPrefix += `

=== MANDATORY REFERENCE FIDELITY (ZERO HALLUCINATION) ===
CRITICAL RULES - VIOLATION IS UNACCEPTABLE:

1. [TABLE REFERENCE] - EXACT MATCH REQUIRED:
   - Use the EXACT table/surface from reference image [N] (TABLE)
   - Copy its EXACT texture, color, material, grain pattern
   - DO NOT replace with different table (no marble if wood shown, no dark if light shown)
   - DO NOT add window views, backgrounds, or environments not in reference
   - The table edge and surface must match reference EXACTLY

2. [ALL REFERENCES] - STRICT FIDELITY:
   - Every reference [1][2][3][4]... must appear EXACTLY as shown
   - NO color changes, NO material substitution, NO style alterations
   - If plate is white ceramic, keep white ceramic (not cream, not porcelain)
   - If cup contains tea, show tea (amber liquid, not water, not empty)

3. [ZERO ADDITIONS] - NO HALLUCINATION:
   - Add NOTHING that is not in reference images
   - NO extra napkins, NO cutlery, NO flowers, NO decorations unless referenced
   - NO background scenery (windows, walls, plants) unless explicitly referenced
   - Scene should contain ONLY referenced objects + specified composition

VIOLATION = REGENERATION REQUIRED

SCENE:
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

      await AILogService.logGemini("image-generation", {
        model: this.imageModel,
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
   * Metin üretimi (Logic işlemleri için) - Gemini 3 Pro
   */
  async generateText(
    prompt: string,
    systemInstruction?: string,
    jsonMode: boolean = false,
    stage: AILogStage = "image-generation"
  ): Promise<{ text: string; data?: any; cost: number }> {
    const client = await this.getClient();
    const safetySettings = await getSafetySettings();

    const generationConfig: any = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    };

    if (jsonMode) {
      generationConfig.responseMimeType = "application/json";
    }

    const genModel = client.getGenerativeModel({
      model: this.textModel,
      safetySettings,
      generationConfig,
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
    });

    const startTime = Date.now();

    try {
      console.log(`[GeminiService] Text generation with ${this.textModel} (JSON: ${jsonMode})`);

      // Retry wrapper ile generateContent çağrısı (fetch hatalarına karşı koruma)
      const result = await withRetry(
        async () => genModel.generateContent(prompt),
        { maxRetries: 3, initialDelayMs: 2000, context: `GeminiService.generateText(${this.textModel})` }
      ) as Awaited<ReturnType<typeof genModel.generateContent>>;
      const response = result.response;
      const text = response.text();

      const cost = GeminiService.COSTS[this.textModel] || 0.0001;
      const durationMs = Date.now() - startTime;

      let data = undefined;
      if (jsonMode) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("[GeminiService] JSON parse error:", e);
        }
      }

      // AI Log kaydet
      await AILogService.logGemini(stage, {
        model: this.textModel,
        userPrompt: prompt.substring(0, 500) + "...",
        status: "success",
        cost,
        durationMs,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
        productType: this.pipelineContext.productType,
      });

      return { text, data, cost };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error(`[GeminiService] Text generation error (${this.textModel}):`, error);

      await AILogService.logGemini(stage, {
        model: this.textModel,
        userPrompt: prompt.substring(0, 500),
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        cost: 0,
        durationMs,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
      });

      throw error;
    }
  }

  /**
   * En uygun asset kombinasyonunu seç (Gemini 3 Pro)
   *
   * @param assetSelectionRules - Config'den gelen zorunlu/hariç asset kuralları
   *   enabled=true → ZORUNLU (Gemini mutlaka seçmeli)
   *   enabled=false → HARİÇ (Gemini'ye hiç gönderilmez)
   */
  async selectAssets(
    productType: string,
    availableAssets: any,
    timeOfDay: string,
    mood: string,
    effectiveRules?: any,
    fixedAssets?: any,
    assetSelectionRules?: {
      plate: { enabled: boolean };
      table: { enabled: boolean };
      cup: { enabled: boolean };
      accessory: { enabled: boolean };
      napkin: { enabled: boolean };
      cutlery: { enabled: boolean };
    }
  ): Promise<{ success: boolean; data?: any; error?: string; cost: number; tokensUsed: number }> {
    const moodGuidelines: Record<string, string> = {
      energetic: "PARLAK ve CANLI renkler seç. Mermer masalar, metal çatallar tercih et.",
      social: "ÇOKLU ürün yerleşimine uygun geniş tabaklar. Paylaşım atmosferi.",
      relaxed: "MİNİMAL seçim. Tek ürün odaklı, az aksesuar. Sakin his.",
      warm: "SICAK TONLAR: Ahşap masalar, kahverengi/turuncu detaylar.",
      cozy: "SAMİMİ his: Seramik fincanlar, tekstil peçete dahil et.",
      balanced: "DENGELI ve NÖTR: Standart sunum, off-white tonlar.",
    };
    const moodRule = moodGuidelines[mood] || moodGuidelines.balanced;

    // Varsayılan kurallar (config yoksa tümü aktif)
    const rules = assetSelectionRules || {
      plate: { enabled: true },
      table: { enabled: true },
      cup: { enabled: true },
      accessory: { enabled: true },
      napkin: { enabled: true },
      cutlery: { enabled: false },
    };

    // Zorunlu alanları belirle
    const requiredFields: string[] = [];
    if (rules.plate.enabled) requiredFields.push("plateId");
    if (rules.table.enabled) requiredFields.push("tableId");
    if (rules.cup.enabled) requiredFields.push("cupId");
    if (rules.accessory.enabled) requiredFields.push("accessoryId");
    if (rules.napkin.enabled) requiredFields.push("napkinId");
    if (rules.cutlery.enabled) requiredFields.push("cutleryId");

    // Zorunlu seçim kurallarını oluştur
    const requiredRulesText = requiredFields.length > 0
      ? `2. ZORUNLU SEÇİMLER (null OLAMAZ):\n${requiredFields.map(f => `   - ${f}: Bu kategoriden MUTLAKA bir seçim yap`).join("\n")}`
      : "2. Hiçbir kategori zorunlu değil - ihtiyaca göre seç.";

    // System prompt
    const systemPrompt = `Sen profesyonel bir food styling uzmanısın. Pastane ürünleri için en uygun asset kombinasyonunu seç.
MOOD: ${mood.toUpperCase()} - ${moodRule}
${effectiveRules?.shouldIncludePet ? "⭐ KÖPEK DAHİL ET" : "Köpek dahil etme"}

ÖNEMLİ KURALLAR:
1. usageCount düşük olan asset'lere öncelik ver (çeşitlilik için). tags bilgisini mood ve ürün uyumu için kullan.

${requiredRulesText}

3. Eşleşme Mantığı:
   - Ürün bir "Pasta" ise ahşap masa + katlanmış peçete tercih et
   - İçecek ise mermer/cam masa + düz peçete tercih et
   - Mood'a uygun renk tonları seç

KULLANILABİLİR LİSTELER AŞAĞIDADIR.`;

    // User prompt - sadece enabled kategorileri gönder
    const userPromptParts = [
      `Ürün tipi: ${productType}`,
      `Zaman: ${timeOfDay}`,
      `Mood: ${mood}`,
      "",
      `ÜRÜNLER: ${JSON.stringify(availableAssets.products?.map((a: any) => ({ id: a.id, filename: a.filename, tags: a.tags || [], usageCount: a.usageCount || 0 })) || [], null, 2)}`,
    ];

    // Sadece enabled kategorileri ekle
    if (rules.plate.enabled) {
      userPromptParts.push(`TABAKLAR: ${JSON.stringify(availableAssets.plates?.map((a: any) => ({ id: a.id, filename: a.filename, tags: a.tags || [], usageCount: a.usageCount || 0 })) || [], null, 2)}`);
    }
    if (rules.table.enabled) {
      userPromptParts.push(`MASALAR: ${JSON.stringify(availableAssets.tables?.map((a: any) => ({ id: a.id, filename: a.filename, tags: a.tags || [], usageCount: a.usageCount || 0 })) || [], null, 2)}`);
    }
    if (rules.cup.enabled) {
      userPromptParts.push(`FİNCANLAR: ${JSON.stringify(availableAssets.cups?.map((a: any) => ({ id: a.id, filename: a.filename, tags: a.tags || [], usageCount: a.usageCount || 0 })) || [], null, 2)}`);
    }
    if (rules.accessory.enabled) {
      userPromptParts.push(`DEKORLAR/AKSESUARLAR: ${JSON.stringify([
        ...(availableAssets.props || []),
        ...(availableAssets.accessories || []),
        ...(availableAssets.decor || [])
      ].map((a: any) => ({
        id: a.id,
        filename: a.filename,
        subType: a.subType || "generic",
        category: a.category,
        tags: a.tags || [],
        usageCount: a.usageCount || 0
      })) || [], null, 2)}`);
    }
    if (rules.napkin.enabled) {
      userPromptParts.push(`PEÇETELER: ${JSON.stringify(availableAssets.napkins?.map((a: any) => ({ id: a.id, filename: a.filename, tags: a.tags || [], usageCount: a.usageCount || 0 })) || [], null, 2)}`);
    }
    if (rules.cutlery.enabled) {
      userPromptParts.push(`ÇATAL-BIÇAKLAR: ${JSON.stringify(availableAssets.cutlery?.map((a: any) => ({ id: a.id, filename: a.filename, tags: a.tags || [], usageCount: a.usageCount || 0 })) || [], null, 2)}`);
    }

    // JSON yanıt formatı - sadece enabled alanlar
    const jsonFields: string[] = ['"productId": "seçilen ürün id (ZORUNLU)"'];
    if (rules.plate.enabled) jsonFields.push('"plateId": "seçilen tabak id (ZORUNLU)"');
    if (rules.table.enabled) jsonFields.push('"tableId": "seçilen masa id (ZORUNLU)"');
    if (rules.cup.enabled) jsonFields.push('"cupId": "seçilen fincan id (ZORUNLU)"');
    if (rules.accessory.enabled) jsonFields.push('"accessoryId": "seçilen dekor/aksesuar id (ZORUNLU)"');
    if (rules.napkin.enabled) jsonFields.push('"napkinId": "seçilen peçete id (ZORUNLU)"');
    if (rules.cutlery.enabled) jsonFields.push('"cutleryId": "seçilen çatal-bıçak id (ZORUNLU)"');
    jsonFields.push('"reasoning": "seçim gerekçesi"');

    userPromptParts.push("");
    userPromptParts.push("Yanıt formatı (sadece JSON):");
    userPromptParts.push("{");
    userPromptParts.push("  " + jsonFields.join(",\n  "));
    userPromptParts.push("}");

    const userPrompt = userPromptParts.join("\n");

    console.log(`[Gemini] selectAssets kuralları: plate=${rules.plate.enabled}, table=${rules.table.enabled}, cup=${rules.cup.enabled}, accessory=${rules.accessory.enabled}, napkin=${rules.napkin.enabled}, cutlery=${rules.cutlery.enabled}`);

    try {
      const { data, cost } = await this.generateText(userPrompt, systemPrompt, true, "asset-selection");

      if (!data || !data.productId) {
        return { success: false, error: "Geçersiz Gemini yanıtı - productId bulunamadı", cost, tokensUsed: 0 };
      }

      const product = availableAssets.products?.find((a: any) => a.id === data.productId) || availableAssets.products?.[0];

      // Plate - sadece enabled ise
      let plate = undefined;
      if (rules.plate.enabled) {
        plate = data.plateId ? availableAssets.plates?.find((a: any) => a.id === data.plateId) : undefined;
        if (!plate && availableAssets.plates?.length > 0) {
          plate = availableAssets.plates[0];
          console.warn("[Gemini] plateId zorunlu ama seçilmedi, fallback kullanıldı:", plate.id);
        }
      }

      // Cup - sadece enabled ise
      let cup = undefined;
      if (rules.cup.enabled) {
        cup = data.cupId ? availableAssets.cups?.find((a: any) => a.id === data.cupId) : undefined;
        if (!cup && availableAssets.cups?.length > 0) {
          cup = availableAssets.cups[0];
          console.warn("[Gemini] cupId zorunlu ama seçilmedi, fallback kullanıldı:", cup.id);
        }
      }

      // Table - sadece enabled ise
      let table = undefined;
      if (rules.table.enabled) {
        table = data.tableId ? availableAssets.tables?.find((a: any) => a.id === data.tableId) : undefined;
        if (!table && availableAssets.tables?.length > 0) {
          table = availableAssets.tables[0];
          console.warn("[Gemini] tableId zorunlu ama seçilmedi, fallback kullanıldı:", table.id);
        }
      }

      // Accessory - sadece enabled ise
      let accessory = undefined;
      if (rules.accessory.enabled) {
        const allProps = [...(availableAssets.props || []), ...(availableAssets.accessories || [])];
        if (data.accessoryId) {
          accessory = allProps.find((a: any) => a.id === data.accessoryId);
        }
        if (!accessory && allProps.length > 0) {
          accessory = allProps[0];
          console.warn("[Gemini] accessoryId zorunlu ama seçilmedi, fallback kullanıldı:", accessory.id);
        }
      }

      // Napkin - sadece enabled ise
      let napkin = undefined;
      if (rules.napkin.enabled) {
        napkin = data.napkinId ? availableAssets.napkins?.find((a: any) => a.id === data.napkinId) : undefined;
        if (!napkin && availableAssets.napkins?.length > 0) {
          napkin = availableAssets.napkins[0];
          console.warn("[Gemini] napkinId zorunlu ama seçilmedi, fallback kullanıldı:", napkin.id);
        }
      }

      // Cutlery - sadece enabled ise
      let cutlery = undefined;
      if (rules.cutlery.enabled) {
        cutlery = data.cutleryId ? availableAssets.cutlery?.find((a: any) => a.id === data.cutleryId) : undefined;
        if (!cutlery && availableAssets.cutlery?.length > 0) {
          cutlery = availableAssets.cutlery[0];
          console.warn("[Gemini] cutleryId zorunlu ama seçilmedi, fallback kullanıldı:", cutlery.id);
        }
      }

      if (!product) {
        return { success: false, error: "Ürün bulunamadı", cost, tokensUsed: 0 };
      }

      console.log(`[Gemini] selectAssets sonuç: plate=${!!plate}, table=${!!table}, cup=${!!cup}, accessory=${!!accessory}, napkin=${!!napkin}, cutlery=${!!cutlery}`);

      return {
        success: true,
        data: {
          product,
          plate,
          cup,
          table,
          accessory,
          napkin,
          cutlery,
          selectionReasoning: data.reasoning,
          includesPet: effectiveRules?.shouldIncludePet || false,
        },
        cost,
        tokensUsed: 0
      };
    } catch (error) {
      return { success: false, error: String(error), cost: 0, tokensUsed: 0 };
    }
  }

  /**
   * En uygun senaryoyu seç (Gemini 3 Pro)
   */
  async selectScenario(
    productType: string,
    timeOfDay: string,
    selectedAssets: any,
    availableScenarios: any[],
    effectiveRules?: any,
    feedbackHints?: string
  ): Promise<{ success: boolean; data?: any; error?: string; cost: number; tokensUsed: number }> {
    const systemPrompt = `Sen profesyonel bir içerik yöneticisisin. Pastane ürünleri için en uygun senaryo ve kompozisyonu seç.
${selectedAssets?.includesPet ? "⭐ KÖPEK SEÇİLDİ - Köpek uyumlu senaryo seç!" : ""}
${feedbackHints || ""}`;

    const userPrompt = `
Ürün: ${productType}
Zaman: ${timeOfDay}
Seçilen Asset'ler:
- Ürün: ${selectedAssets?.product?.filename || "bilinmiyor"}
- Masa: ${selectedAssets?.table?.filename || "yok"}

MEVCUT SENARYOLAR:
${JSON.stringify(availableScenarios, null, 2)}

Yanıt formatı (sadece JSON):
{
  "scenarioId": "seçilen senaryo id",
  "reasoning": "neden bu senaryo",
  "compositionId": "kompozisyon tipi (bottom-right, center-hold, vb.)"
}`;

    try {
      const { data, cost } = await this.generateText(userPrompt, systemPrompt, true, "scenario-selection");

      if (!data || !data.scenarioId) {
        return { success: false, error: "Geçersiz senaryo yanıtı", cost, tokensUsed: 0 };
      }

      const scenario = availableScenarios.find(s => s.id === data.scenarioId) || availableScenarios[0];

      return {
        success: true,
        data: {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          scenarioDescription: scenario.description,
          reasoning: data.reasoning,
          includesHands: scenario.includesHands || false,
          compositionId: data.compositionId || "default",
        },
        cost,
        tokensUsed: 0
      };
    } catch (error) {
      return { success: false, error: String(error), cost: 0, tokensUsed: 0 };
    }
  }

  /**
   * Görsel için prompt'u optimize et (Gemini 3 Pro)
   *
   * @param assetSelectionRules - Ayarlar'dan gelen asset seçim kuralları (config-driven)
   */
  async optimizePrompt(
    basePrompt: string,
    scenario: any,
    assets: any,
    hints?: string,
    eatingMethod?: string,
    assetSelectionRules?: {
      plate: { enabled: boolean };
      table: { enabled: boolean };
      cup: { enabled: boolean };
      accessory: { enabled: boolean };
      napkin: { enabled: boolean };
      cutlery: { enabled: boolean };
    }
  ): Promise<{ success: boolean; data?: { optimizedPrompt: string; negativePrompt: string; customizations: string[] }; error?: string; cost: number }> {
    // ═══════════════════════════════════════════════════════════════════════════
    // PROMPT STUDIO ENTEGRASYONU
    // Config'den system prompt template'ini al (Prompt Studio'dan düzenlenebilir)
    // ═══════════════════════════════════════════════════════════════════════════
    const optimizationTemplate = await getPromptTemplate("prompt-optimization");
    const trainingContext = getCompactTrainingContext();

    // Kullanıcı kurallarını (AI Rules) güçlü bir başlıkla ekle
    const userRulesSection = hints
      ? `\n\n## ⚠️ ZORUNLU KULLANICI KURALLARI (İHLAL ETME!)\nAşağıdaki kurallar kullanıcı tarafından tanımlanmıştır ve MUTLAKA uygulanmalıdır:\n${hints}`
      : "";

    // Template'i değişkenlerle doldur
    const systemPrompt = interpolatePrompt(optimizationTemplate.systemPrompt, {
      trainingContext,
      userRulesSection,
    });

    // eatingMethod'a göre fiziksel kısıtlama oluştur
    let physicalConstraint = "";
    if (eatingMethod === "hand") {
      physicalConstraint = "\n\nFİZİKSEL KISITLAMA: Bu ürün ELLE yenir. Prompt'ta kesinlikle çatal, bıçak veya kaşık OLMAMALI. Negative prompt'a fork, knife, spoon, cutlery, utensil ekle.";
    } else if (eatingMethod === "fork-knife") {
      physicalConstraint = "\n\nFİZİKSEL KISITLAMA: Bu ürün ÇATAL VE BIÇAKLA yenir. Sahneye ZORUNLU OLARAK hem çatal hem bıçak ekle. (Must include both fork and knife).";
    } else if (eatingMethod === "fork") {
      physicalConstraint = "\n\nFİZİKSEL KISITLAMA: Bu ürün sadece çatalla yenir (bıçak gereksiz). Sahnede sadece çatal olsun.";
    } else if (eatingMethod === "spoon") {
      physicalConstraint = "\n\nFİZİKSEL KISITLAMA: Bu ürün kaşıkla yenir. Sahnede kaşık görünebilir.";
    } else if (eatingMethod === "none") {
      physicalConstraint = "\n\nFİZİKSEL KISITLAMA: Bu ürün yiyecek değil (içecek vb.). Yeme aletleri gerekmez.";
    }

    // Asset tipi → Türkçe etiket ve özel talimat mapping (config-driven)
    const ASSET_CONFIG: Record<string, { label: string; instruction: string }> = {
      product: {
        label: "ANA ÜRÜN",
        instruction: "Bu ürünü referans görselinden BİREBİR kullan."
      },
      plate: {
        label: "TABAK",
        instruction: "Bu tabağı AYNEN kullan, farklı tabak üretme."
      },
      table: {
        label: "MASA/ZEMİN",
        instruction: "KRİTİK: Bu masa/zemini BİREBİR kullan. Malzemeyi değiştirme (ahşap ise ahşap, mermer ise mermer)."
      },
      cup: {
        label: "FİNCAN/BARDAK",
        instruction: "Bu bardağı KESİNLİKLE kullan. Tag'lere göre içeriği doldur (tea, coffee, juice vb.)."
      },
      accessory: {
        label: "AKSESUAR",
        instruction: "Bu aksesuarı sahnede göster."
      },
      napkin: {
        label: "PEÇETE",
        instruction: "Bu peçeteyi AYNEN kullan, farklı peçete üretme."
      },
      cutlery: {
        label: "ÇATAL-BIÇAK",
        instruction: "Bu çatal-bıçağı kullan."
      }
    };

    // Seçilen assetleri config'e göre dinamik olarak formatla
    const assetDetails: string[] = [];

    for (const [assetKey, config] of Object.entries(ASSET_CONFIG)) {
      const asset = assets?.[assetKey];
      if (!asset?.filename) continue;

      // product her zaman eklenir, diğerleri assetSelectionRules'a bağlı
      if (assetKey !== "product" && assetSelectionRules) {
        const rule = assetSelectionRules[assetKey as keyof typeof assetSelectionRules];
        if (!rule?.enabled) continue;
      }

      const tags = asset.tags?.join(", ") || "";
      const tagInfo = tags ? ` Detaylar: ${tags}.` : "";
      assetDetails.push(`- ${config.label}: ${asset.filename}.${tagInfo} ${config.instruction}`);
    }

    const assetSection = assetDetails.length > 0
      ? `\n\nSEÇİLEN ASSETLER (Prompt'ta mutlaka kullan - ZERO HALLUCINATION):\n${assetDetails.join("\n")}`
      : "";

    // Kullanıcı kuralları varsa hatırlat (system prompt'ta detaylı)
    const rulesReminder = hints
      ? "\n\n⚠️ HATIRLATMA: Yukarıdaki ZORUNLU KULLANICI KURALLARI'na mutlaka uy!"
      : "";

    const userPrompt = `
Ana Prompt: ${basePrompt}
Senaryo: ${scenario?.scenarioName || "bilinmiyor"}
Yeme Şekli: ${eatingMethod || "bilinmiyor"}${assetSection}${physicalConstraint}${rulesReminder}

ÖNEMLİ (ZERO HALLUCINATION POLICY): 
1. Optimize edilmiş prompt'ta yukarıdaki seçilen assetlerin HEPSİ açıkça belirtilmeli.
2. EĞER aksesuar seçilmediyse, prompt'a ASLA 'napkin', 'flower', 'cutlery' gibi dekoratif objeler ekleme. Sahne temiz kalsın.
3. Bardak içeriği için girilen tagleri (orange juice, latte vb.) mutlaka dikkate al.
4. Çatal/Bıçak kısıtlamasına ("FİZİKSEL KISITLAMA") kesinlikle uy.

Yanıt formatı (sadece JSON):
{
  "optimizedPrompt": "optimize edilmiş prompt",
  "negativePrompt": "kaçınılacak öğeler (hallucinated objects, wrong cutlery vb.)",
  "customizations": ["özel ayar 1", "özel ayar 2"]
}`;

    try {
      const { data, cost } = await this.generateText(userPrompt, systemPrompt, true, "prompt-optimization");

      return {
        success: true,
        data: {
          optimizedPrompt: data?.optimizedPrompt || basePrompt,
          negativePrompt: data?.negativePrompt || "",
          customizations: data?.customizations || [],
        },
        cost
      };
    } catch (error) {
      return { success: false, error: String(error), cost: 0 };
    }
  }

  /**
   * Görseli değerlendir (Gemini 3 Pro Vision)
   */
  async evaluateImage(
    imageBase64: string,
    mimeType: string,
    scenario: any,
    product: any
  ): Promise<{ success: boolean; data?: any; error?: string; cost: number }> {
    const client = await this.getClient();
    const safetySettings = await getSafetySettings();

    const genModel = client.getGenerativeModel({
      model: this.textModel, // Gemini 3 Pro Vision yeteneği var
      safetySettings,
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
Sen bir kalite kontrol uzmanısın. Üretilen görselin ürün doğruluğunu ve estetik kalitesini değerlendir.

Senaryo: ${scenario?.scenarioName || "bilinmiyor"}
Ürün: ${product?.filename || "bilinmiyor"}

Görseli analiz et ve şu kriterlere göre puanla:
1. Ürün doğruluğu (1-10)
2. Kompozisyon (1-10)
3. Işık (1-10)
4. Gerçekçilik (1-10)
5. Instagram uygunluğu (1-10)

Yanıt formatı (sadece JSON):
{
  "passed": true veya false (ortalama 7 üzeriyse true),
  "score": ortalama puan (0-10),
  "evaluation": { "productAccuracy": 0, "composition": 0, "lighting": 0, "realism": 0, "instagramReadiness": 0 },
  "feedback": "kısa geri bildirim",
  "shouldRegenerate": false
}`;

    try {
      console.log(`[GeminiService] Evaluating image with ${this.textModel}`);

      // Retry wrapper ile generateContent çağrısı
      const result = await withRetry(
        async () => genModel.generateContent([
          { inlineData: { data: imageBase64, mimeType } },
          { text: prompt }
        ]),
        { maxRetries: 2, initialDelayMs: 2000, context: `GeminiService.evaluateImage` }
      ) as Awaited<ReturnType<typeof genModel.generateContent>>;
      const text = result.response.text();
      const feedback = JSON.parse(text);

      const cost = GeminiService.COSTS[this.textModel] || 0.0002;

      return {
        success: true,
        data: feedback,
        cost
      };
    } catch (e) {
      console.error("[GeminiService] Evaluation error:", e);
      return { success: false, error: String(e), cost: 0 };
    }
  }

  /**
   * Tema Açıklaması Üret (AI Theme Writer)
   * Gemini 3 Pro kullanarak, orkestratöre uygun İngilizce açıklama üretir.
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
      const { text, cost } = await this.generateText(userPrompt, systemPrompt, false, "theme-description-generation" as AILogStage);
      return { text: text.trim(), cost };
    } catch (error) {
      console.error("[GeminiService] Theme description generation failed:", error);
      throw error;
    }
  }

  /**
   * Mood Açıklaması Üret (AI Mood Writer)
   * Gemini 3 Pro kullanarak, sinemasal atmosfer açıklaması üretir.
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
      const { text, cost } = await this.generateText(userPrompt, systemPrompt, false, "prompt-optimization");
      return { text: text.trim(), cost };
    } catch (error) {
      console.error("[GeminiService] Mood description generation failed:", error);
      throw error;
    }
  }

  /**
   * Senaryo Açıklaması Üret (AI Scenario Writer)
   * Gemini 3 Pro kullanarak, sahne/senaryo açıklaması üretir.
   */
  async generateScenarioDescription(params: {
    scenarioName: string;
    includesHands: boolean;
    handPose?: string;
    compositions: string[];
    compositionEntry?: string;
  }): Promise<{ text: string; cost: number }> {
    const { scenarioName, includesHands, handPose, compositions, compositionEntry } = params;

    // El pozu açıklamaları
    const handPoseDescriptions: Record<string, string> = {
      "cupping": "cupping pose (hands wrapped around the cup)",
      "pinching": "pinching pose (holding delicately with fingertips)",
      "lifting": "lifting pose (raising the item elegantly)",
      "breaking": "breaking pose (breaking apart the product)",
      "spreading": "spreading pose (applying spread/sauce)",
      "dipping": "dipping pose (dipping into sauce/drink)",
      "pouring": "pouring pose (pouring liquid gracefully)",
      "holding-plate": "holding plate pose (presenting on a plate)",
    };

    const handInfo = includesHands
      ? `\nHand Style: Yes, includes hands
Hand Pose: ${handPose ? handPoseDescriptions[handPose] || handPose : "Not specified"}
${compositionEntry ? `Entry Point: ${compositionEntry}` : ""}`
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
6. OUTPUT: Return ONLY the description. No quotes, no prefixes like "Here is:".`;

    const userPrompt = `Scenario Name: ${scenarioName}
Compositions: ${compositions.join(", ")}${handInfo}

Write the scene description:`;

    try {
      const { text, cost } = await this.generateText(userPrompt, systemPrompt, false, "prompt-optimization");
      return { text: text.trim(), cost };
    } catch (error) {
      console.error("[GeminiService] Scenario description generation failed:", error);
      throw error;
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
        model: this.textModel, // textModel ile test et (daha hızlı)
        safetySettings,
      });

      // Retry wrapper ile bağlantı testi
      const result = await withRetry(
        async () => genModel.generateContent("Say 'OK' if you can hear me."),
        { maxRetries: 2, initialDelayMs: 1000, context: `GeminiService.testConnection` }
      ) as Awaited<ReturnType<typeof genModel.generateContent>>;
      const response = result.response;

      return !!response.text();
    } catch (error) {
      console.error("[GeminiService] Connection test failed:", error);
      return false;
    }
  }
}

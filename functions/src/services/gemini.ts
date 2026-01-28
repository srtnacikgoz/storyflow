/**
 * Gemini Image Service
 * img2img transformation - orijinal görsel korunarak stil uygulanır
 */

import { AILogService } from "./aiLogService";
import { AILogStage } from "../types";

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
  imageModel?: GeminiModel;  // Görsel üretim modeli (varsayılan: gemini-3-pro-image-preview)
  textModel?: GeminiModel;   // Mantık/Logic modeli (varsayılan: gemini-3-pro-preview)
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
  private imageModel: GeminiModel;  // Görsel üretim modeli
  private textModel: GeminiModel;   // Mantık/Logic modeli
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
    this.textModel = config.textModel || "gemini-3-pro-preview";
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

    // Core constraint - tek seferde, net
    editPrefix += `
Constraint: Maintain 100% material and color fidelity for all references. Use only provided assets.

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

      const result = await genModel.generateContent(prompt);
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
   */
  async selectAssets(
    productType: string,
    availableAssets: any,
    timeOfDay: string,
    mood: string,
    effectiveRules?: any,
    fixedAssets?: any
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

    const systemPrompt = `Sen profesyonel bir food styling uzmanısın. Pastane ürünleri için en uygun asset kombinasyonunu seç.
MOOD: ${mood.toUpperCase()} - ${moodRule}
${effectiveRules?.shouldIncludePet ? "⭐ Bu sefer KÖPEK DAHİL ET" : "Köpek dahil etme"}`;

    const userPrompt = `
Ürün tipi: ${productType}
Zaman: ${timeOfDay}
Mood: ${mood}

ÜRÜNLER: ${JSON.stringify(availableAssets.products?.map((a: any) => ({ id: a.id, filename: a.filename })) || [], null, 2)}
TABAKLAR: ${JSON.stringify(availableAssets.plates?.map((a: any) => ({ id: a.id, filename: a.filename })) || [], null, 2)}
MASALAR: ${JSON.stringify(availableAssets.tables?.map((a: any) => ({ id: a.id, filename: a.filename })) || [], null, 2)}
FİNCANLAR: ${JSON.stringify(availableAssets.cups?.map((a: any) => ({ id: a.id, filename: a.filename })) || [], null, 2)}

Yanıt formatı (sadece JSON):
{
  "productId": "seçilen ürün id",
  "plateId": "seçilen tabak id veya null",
  "cupId": "seçilen fincan id veya null",
  "tableId": "seçilen masa id veya null",
  "reasoning": "seçim gerekçesi"
}`;

    try {
      const { data, cost } = await this.generateText(userPrompt, systemPrompt, true, "asset-selection");

      if (!data || !data.productId) {
        return { success: false, error: "Geçersiz Gemini yanıtı - productId bulunamadı", cost, tokensUsed: 0 };
      }

      const product = availableAssets.products?.find((a: any) => a.id === data.productId) || availableAssets.products?.[0];
      const plate = data.plateId ? availableAssets.plates?.find((a: any) => a.id === data.plateId) : undefined;
      const cup = data.cupId ? availableAssets.cups?.find((a: any) => a.id === data.cupId) : undefined;
      const table = data.tableId ? availableAssets.tables?.find((a: any) => a.id === data.tableId) : undefined;

      if (!product) {
        return { success: false, error: "Ürün bulunamadı", cost, tokensUsed: 0 };
      }

      return {
        success: true,
        data: {
          product,
          plate,
          cup,
          table,
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
   */
  async optimizePrompt(
    basePrompt: string,
    scenario: any,
    assets: any,
    hints?: string,
    eatingMethod?: string
  ): Promise<{ success: boolean; data?: { optimizedPrompt: string; negativePrompt: string; customizations: string[] }; error?: string; cost: number }> {
    const systemPrompt = "Sen bir prompt mühendisisin. Verilen girdilere göre Gemini Görsel Üretim modeli için en estetik ve teknik promptu hazırla.";

    // eatingMethod'a göre fiziksel kısıtlama oluştur
    let physicalConstraint = "";
    if (eatingMethod === "hand") {
      physicalConstraint = "\n\nFİZİKSEL KISITLAMA: Bu ürün ELLE yenir. Prompt'ta kesinlikle çatal, bıçak veya kaşık OLMAMALI. Negative prompt'a fork, knife, spoon, cutlery, utensil ekle.";
    } else if (eatingMethod === "fork" || eatingMethod === "fork-knife") {
      physicalConstraint = "\n\nFİZİKSEL KISITLAMA: Bu ürün çatalla yenir. Sahnede ürünün yanında çatal (ve/veya bıçak) görünebilir.";
    } else if (eatingMethod === "spoon") {
      physicalConstraint = "\n\nFİZİKSEL KISITLAMA: Bu ürün kaşıkla yenir. Sahnede kaşık görünebilir.";
    } else if (eatingMethod === "none") {
      physicalConstraint = "\n\nFİZİKSEL KISITLAMA: Bu ürün yiyecek değil (içecek vb.). Yeme aletleri gerekmez.";
    }

    const userPrompt = `
Ana Prompt: ${basePrompt}
Senaryo: ${scenario?.scenarioName || "bilinmiyor"}
Ürün: ${assets?.product?.filename || "bilinmiyor"}
Yeme Şekli: ${eatingMethod || "bilinmiyor"}
İpuçları: ${hints || "yok"}${physicalConstraint}

Yanıt formatı (sadece JSON):
{
  "optimizedPrompt": "optimize edilmiş prompt",
  "negativePrompt": "kaçınılacak öğeler",
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

      const result = await genModel.generateContent([
        { inlineData: { data: imageBase64, mimeType } },
        { text: prompt }
      ]);
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

      const result = await genModel.generateContent("Say 'OK' if you can hear me.");
      const response = result.response;

      return !!response.text();
    } catch (error) {
      console.error("[GeminiService] Connection test failed:", error);
      return false;
    }
  }
}

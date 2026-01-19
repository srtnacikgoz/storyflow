/**
 * Full Orchestrator
 * Claude + Gemini entegrasyonu ile tam otomatik içerik üretimi
 */

import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { ClaudeService } from "./claudeService";
import { GeminiService } from "../services/gemini";
import {
  Asset,
  ProductType,
  TimeSlotRule,
  PipelineResult,
  PipelineStatus,
  GeneratedImage,
  QualityControlResult,
  OrchestratorConfig,
} from "./types";

/**
 * Undefined değerleri recursive olarak temizle (Firestore uyumluluğu için)
 */
function removeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item)) as T;
  }

  if (typeof obj === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned as T;
  }

  return obj;
}

// Senaryo tanımları (lifestyle-scenarios'dan)
const SCENARIOS = [
  { id: "zarif-tutma", name: "Zarif Tutma", description: "Bakımlı el ürün tutuyor", includesHands: true },
  { id: "kahve-ani", name: "Kahve Anı", description: "İki el fincan tutuyor, ürün yanında", includesHands: true },
  { id: "hediye-acilisi", name: "Hediye Açılışı", description: "El kutu açıyor", includesHands: true },
  { id: "ilk-dilim", name: "İlk Dilim", description: "El çatalla pasta alıyor", includesHands: true },
  { id: "cam-kenari", name: "Cam Kenarı", description: "Pencere önü, şehir manzarası", includesHands: false },
  { id: "mermer-zarafet", name: "Mermer Zarafet", description: "Mermer yüzey, altın detaylar", includesHands: false },
  { id: "kahve-kosesi", name: "Kahve Köşesi", description: "Rahat köşe, kitap yanında", includesHands: false },
  { id: "yarim-kaldi", name: "Yarım Kaldı", description: "Isırık alınmış, yarı dolu fincan", includesHands: false },
  { id: "paylasim", name: "Paylaşım", description: "İki tabak, karşılıklı oturma", includesHands: false },
  { id: "paket-servis", name: "Paket Servis", description: "Kraft torba, takeaway kahve", includesHands: false },
];

/**
 * Full Orchestrator Service
 */
export class Orchestrator {
  private db: FirebaseFirestore.Firestore;
  private storage: ReturnType<typeof getStorage>;
  private claude: ClaudeService;
  private gemini: GeminiService;
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.db = getFirestore();
    this.storage = getStorage();
    this.claude = new ClaudeService(config.claudeApiKey, config.claudeModel);
    this.gemini = new GeminiService({
      apiKey: config.geminiApiKey,
      model: config.geminiModel as "gemini-2.5-flash-image" | "gemini-3-pro-image-preview",
    });
  }

  // ==========================================
  // MAIN PIPELINE
  // ==========================================

  /**
   * Tam pipeline'ı çalıştır
   * @param onProgress - Her aşamada çağrılan callback (opsiyonel)
   */
  async runPipeline(
    productType: ProductType,
    timeSlotRule: TimeSlotRule,
    onProgress?: (stage: string, stageIndex: number, totalStages: number) => Promise<void>
  ): Promise<PipelineResult> {
    const TOTAL_STAGES = 7; // asset, scenario, prompt, image, quality, content, telegram
    const startedAt = Date.now();
    let totalCost = 0;

    // Pipeline durumu başlat
    const status: PipelineStatus = {
      currentStage: "asset_selection",
      completedStages: [],
      startedAt,
      updatedAt: startedAt,
    };

    const result: PipelineResult = {
      status,
      totalCost: 0,
      startedAt,
    };

    try {
      // ==========================================
      // STAGE 1: ASSET SELECTION
      // ==========================================
      console.log("[Orchestrator] Stage 1: Asset Selection");
      status.currentStage = "asset_selection";
      if (onProgress) await onProgress("asset_selection", 1, TOTAL_STAGES);

      const assets = await this.loadAvailableAssets(productType);
      const timeOfDay = this.getTimeOfDay();
      const mood = this.getMoodFromTime();

      const assetResponse = await this.claude.selectAssets(
        productType,
        assets,
        timeOfDay,
        mood
      );

      if (!assetResponse.success || !assetResponse.data) {
        throw new Error(`Asset selection failed: ${assetResponse.error}`);
      }

      result.assetSelection = assetResponse.data;
      totalCost += assetResponse.cost;
      status.completedStages.push("asset_selection");

      // ==========================================
      // STAGE 2: SCENARIO SELECTION
      // ==========================================
      console.log("[Orchestrator] Stage 2: Scenario Selection");
      status.currentStage = "scenario_selection";
      if (onProgress) await onProgress("scenario_selection", 2, TOTAL_STAGES);

      const filteredScenarios = timeSlotRule.scenarioPreference
        ? SCENARIOS.filter(s => timeSlotRule.scenarioPreference!.includes(s.id))
        : SCENARIOS;

      const scenarioResponse = await this.claude.selectScenario(
        productType,
        timeOfDay,
        result.assetSelection,
        filteredScenarios
      );

      if (!scenarioResponse.success || !scenarioResponse.data) {
        throw new Error(`Scenario selection failed: ${scenarioResponse.error}`);
      }

      result.scenarioSelection = scenarioResponse.data;
      totalCost += scenarioResponse.cost;
      status.completedStages.push("scenario_selection");

      // ==========================================
      // STAGE 3: PROMPT OPTIMIZATION
      // ==========================================
      console.log("[Orchestrator] Stage 3: Prompt Optimization");
      status.currentStage = "prompt_optimization";
      if (onProgress) await onProgress("prompt_optimization", 3, TOTAL_STAGES);

      const basePrompt = await this.getScenarioPrompt(result.scenarioSelection.scenarioId);

      const promptResponse = await this.claude.optimizePrompt(
        basePrompt,
        result.scenarioSelection,
        result.assetSelection
      );

      if (!promptResponse.success || !promptResponse.data) {
        throw new Error(`Prompt optimization failed: ${promptResponse.error}`);
      }

      result.optimizedPrompt = {
        mainPrompt: promptResponse.data.optimizedPrompt,
        negativePrompt: promptResponse.data.negativePrompt,
        customizations: promptResponse.data.customizations,
        aspectRatio: "9:16",
        faithfulness: 0.8,
      };
      totalCost += promptResponse.cost;
      status.completedStages.push("prompt_optimization");

      // ==========================================
      // STAGE 4: IMAGE GENERATION (with retry)
      // ==========================================
      console.log("[Orchestrator] Stage 4: Image Generation");
      status.currentStage = "image_generation";
      if (onProgress) await onProgress("image_generation", 4, TOTAL_STAGES);

      let generationAttempt = 0;
      let generatedImage: GeneratedImage | null = null;
      let qualityResult: QualityControlResult | null = null;

      while (generationAttempt < this.config.maxRetries) {
        generationAttempt++;
        console.log(`[Orchestrator] Generation attempt ${generationAttempt}/${this.config.maxRetries}`);

        // Ürün görselini yükle
        const productImageBase64 = await this.loadImageAsBase64(result.assetSelection.product.storageUrl);

        // Gemini ile görsel üret
        const geminiResult = await this.gemini.transformImage(
          productImageBase64,
          "image/png",
          {
            prompt: result.optimizedPrompt.mainPrompt,
            negativePrompt: result.optimizedPrompt.negativePrompt,
            faithfulness: result.optimizedPrompt.faithfulness,
            aspectRatio: result.optimizedPrompt.aspectRatio,
          }
        );

        generatedImage = {
          imageBase64: geminiResult.imageBase64,
          mimeType: geminiResult.mimeType,
          model: geminiResult.model,
          cost: geminiResult.cost,
          generatedAt: Date.now(),
          attemptNumber: generationAttempt,
        };

        totalCost += geminiResult.cost;

        // ==========================================
        // STAGE 5: QUALITY CONTROL
        // ==========================================
        console.log("[Orchestrator] Stage 5: Quality Control");
        status.currentStage = "quality_control";
        if (onProgress) await onProgress("quality_control", 5, TOTAL_STAGES);

        const qcResponse = await this.claude.evaluateImage(
          generatedImage.imageBase64,
          result.scenarioSelection,
          result.assetSelection.product
        );

        totalCost += qcResponse.cost;

        if (!qcResponse.success || !qcResponse.data) {
          console.warn(`[Orchestrator] QC failed: ${qcResponse.error}`);
          continue;
        }

        qualityResult = qcResponse.data;

        // Kalite kontrolü geçti mi?
        if (qualityResult.passed) {
          console.log(`[Orchestrator] QC passed with score: ${qualityResult.score}/10`);
          break;
        }

        // Yeniden üretim gerekli
        if (qualityResult.shouldRegenerate && qualityResult.regenerationHints) {
          console.log(`[Orchestrator] QC failed (${qualityResult.score}/10), regenerating...`);
          // Prompt'u güncelle
          result.optimizedPrompt.mainPrompt += `\n\nIMPROVEMENT: ${qualityResult.regenerationHints}`;
        }
      }

      if (!generatedImage || !qualityResult) {
        throw new Error("Image generation failed after all retries");
      }

      result.generatedImage = generatedImage;
      result.qualityControl = qualityResult;
      status.completedStages.push("image_generation");
      status.completedStages.push("quality_control");

      // Görseli Storage'a kaydet
      const storageUrl = await this.saveImageToStorage(generatedImage.imageBase64, generatedImage.mimeType);
      result.generatedImage.storageUrl = storageUrl;

      // ==========================================
      // STAGE 6: CONTENT CREATION
      // ==========================================
      console.log("[Orchestrator] Stage 6: Content Creation");
      status.currentStage = "content_creation";
      if (onProgress) await onProgress("content_creation", 6, TOTAL_STAGES);

      const contentResponse = await this.claude.generateContent(
        productType,
        result.scenarioSelection,
        timeOfDay
      );

      if (!contentResponse.success || !contentResponse.data) {
        throw new Error(`Content generation failed: ${contentResponse.error}`);
      }

      result.contentPackage = {
        ...contentResponse.data,
        // musicAsset kaldırıldı - music desteği şimdilik yok
      };
      totalCost += contentResponse.cost;
      status.completedStages.push("content_creation");

      // ==========================================
      // STAGE 7: TELEGRAM APPROVAL
      // ==========================================
      console.log("[Orchestrator] Stage 7: Telegram Approval");
      status.currentStage = "telegram_approval";
      if (onProgress) await onProgress("telegram_approval", 7, TOTAL_STAGES);

      const telegramMessageId = await this.sendTelegramApproval(result);
      result.telegramMessageId = telegramMessageId;
      result.approvalStatus = "pending";

      status.completedStages.push("telegram_approval");

      // Final
      result.totalCost = totalCost;
      result.completedAt = Date.now();
      result.totalDuration = result.completedAt - startedAt;

      console.log(`[Orchestrator] Pipeline completed in ${result.totalDuration}ms, cost: $${totalCost.toFixed(4)}`);

      return result;

    } catch (error) {
      console.error("[Orchestrator] Pipeline error:", error);

      status.failedStage = status.currentStage;
      status.error = error instanceof Error ? error.message : "Unknown error";
      result.totalCost = totalCost;

      // Hata durumunda da kaydet
      await this.savePipelineResult(result);

      throw error;
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Mevcut asset'leri yükle
   */
  private async loadAvailableAssets(productType: ProductType): Promise<{
    products: Asset[];
    plates: Asset[];
    cups: Asset[];
    tables: Asset[];
  }> {
    const assetsRef = this.db.collection("assets");

    const [products, plates, cups, tables] = await Promise.all([
      assetsRef.where("category", "==", "products").where("subType", "==", productType).where("isActive", "==", true).get(),
      assetsRef.where("category", "==", "props").where("subType", "==", "plates").where("isActive", "==", true).get(),
      assetsRef.where("category", "==", "props").where("subType", "==", "cups").where("isActive", "==", true).get(),
      assetsRef.where("category", "==", "furniture").where("subType", "==", "tables").where("isActive", "==", true).get(),
    ]);

    return {
      products: products.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      plates: plates.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      cups: cups.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      tables: tables.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
    };
  }

  /**
   * Günün zamanını belirle
   */
  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) return "morning";
    if (hour >= 11 && hour < 14) return "noon";
    if (hour >= 14 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 20) return "evening";
    return "night";
  }

  /**
   * Zamana göre mood belirle
   */
  private getMoodFromTime(): string {
    const timeOfDay = this.getTimeOfDay();
    const moodMap: Record<string, string> = {
      morning: "morning-vibes",
      noon: "cozy-cafe",
      afternoon: "afternoon-chill",
      evening: "golden-hour",
      night: "cozy-cafe",
    };
    return moodMap[timeOfDay] || "cozy-cafe";
  }

  /**
   * Senaryo prompt'unu al (Firestore veya sabit)
   */
  private async getScenarioPrompt(scenarioId: string): Promise<string> {
    // Firestore'dan prompt şablonunu çek
    const promptDoc = await this.db.collection("scenario-prompts").doc(scenarioId).get();

    if (promptDoc.exists) {
      return promptDoc.data()?.prompt || "";
    }

    // Fallback: Sabit prompt
    const fallbackPrompts: Record<string, string> = {
      "zarif-tutma": `Using uploaded image as reference for the product.

Lifestyle Instagram story photo of elegant feminine hand holding the product from reference.

HAND STYLING:
- Well-manicured nails with nude/soft pink polish
- Small minimalist finger tattoos (tiny moon, star, fine lines)
- Simple silver midi ring or stacked thin rings
- Thin chain bracelet on wrist
- Natural relaxed grip

COMPOSITION:
- Product held at slight angle toward camera
- Hand entering frame from bottom-right
- Product fills 40% of frame
- Soft blurred background (f/2.0)

LIGHTING:
- Soft natural side light from left
- Warm golden tones
- Gentle highlights on nail surface

9:16 vertical for Instagram Stories. 8K photorealistic.`,

      "kahve-ani": `Using uploaded image as reference for the pastry.

Lifestyle Instagram story with pastry from reference as hero in foreground, feminine hands holding latte cup in soft focus behind.

SCENE CONTEXT:
- White/grey marble table surface visible
- Coffee cup in soft focus background
- Small white plate as base

HAND STYLING:
- Both hands gently cupping ceramic latte cup
- Nude or soft pink nail polish
- Small minimalist finger tattoos
- Simple silver rings, thin chain bracelet

COMPOSITION:
- Pastry as HERO in foreground (55%, sharp focus)
- Hands holding coffee in background (35%, soft focus)
- Shallow depth of field

9:16 vertical for Instagram Stories. 8K photorealistic.`,
    };

    return fallbackPrompts[scenarioId] || fallbackPrompts["zarif-tutma"];
  }

  /**
   * Görseli base64 olarak yükle
   * Firebase download URL'den doğrudan indir
   */
  private async loadImageAsBase64(storageUrl: string): Promise<string> {
    console.log(`[Orchestrator] Loading image from URL: ${storageUrl.substring(0, 80)}...`);

    try {
      // Firebase download URL ise doğrudan fetch ile indir
      if (storageUrl.includes("firebasestorage.googleapis.com")) {
        console.log(`[Orchestrator] Using fetch to download from Firebase URL`);

        // 30 saniye timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        let buffer: Buffer;
        try {
          console.log(`[Orchestrator] Starting fetch request...`);
          const response = await fetch(storageUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          console.log(`[Orchestrator] Fetch response received: ${response.status}`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          console.log(`[Orchestrator] Reading response body...`);
          const arrayBuffer = await response.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
          console.log(`[Orchestrator] Image downloaded successfully, size: ${buffer.length} bytes`);
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            throw new Error('Fetch timeout after 30 seconds');
          }
          throw fetchError;
        }

        const base64 = buffer.toString("base64");
        console.log(`[Orchestrator] Image converted to base64, length: ${base64.length}`);
        return base64;
      }

      // gs:// formatı için Admin SDK kullan
      const bucket = this.storage.bucket();
      let filePath: string;

      if (storageUrl.startsWith("gs://")) {
        filePath = storageUrl.replace(`gs://${bucket.name}/`, "");
      } else {
        filePath = storageUrl;
      }

      console.log(`[Orchestrator] Using Admin SDK for path: ${filePath}`);
      const file = bucket.file(filePath);
      const [buffer] = await file.download();
      console.log(`[Orchestrator] Image downloaded successfully, size: ${buffer.length} bytes`);

      const base64 = buffer.toString("base64");
      return base64;
    } catch (downloadError) {
      console.error(`[Orchestrator] Image download failed:`, downloadError);
      throw new Error(`Failed to download image: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`);
    }
  }

  /**
   * Görseli Storage'a kaydet
   */
  private async saveImageToStorage(imageBase64: string, mimeType: string): Promise<string> {
    const bucket = this.storage.bucket();
    const filename = `generated/${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
    const file = bucket.file(filename);

    const buffer = Buffer.from(imageBase64, "base64");
    await file.save(buffer, {
      metadata: { contentType: mimeType },
    });

    return `gs://${bucket.name}/${filename}`;
  }

  /**
   * Telegram onay mesajı gönder
   */
  private async sendTelegramApproval(result: PipelineResult): Promise<number> {
    // Telegram servisini import et ve mesaj gönder
    // Bu kısım mevcut telegram.ts ile entegre edilecek

    const caption = result.contentPackage?.caption || "";
    const hashtags = result.contentPackage?.hashtags?.join(" ") || "";
    const music = result.contentPackage?.musicAsset?.filename || "Önerilmedi";
    const score = result.qualityControl?.score || 0;
    const cost = result.totalCost.toFixed(4);

    const message = `
🎨 *Yeni İçerik Hazır*

📝 *Caption:*
${caption}

#️⃣ *Hashtags:*
${hashtags}

🎵 *Müzik:* ${music}

📊 *Kalite Skoru:* ${score}/10
💰 *Maliyet:* $${cost}

*Senaryo:* ${result.scenarioSelection?.scenarioName}
*Ürün:* ${result.assetSelection?.product.filename}
`;

    // TODO: Gerçek Telegram entegrasyonu
    console.log("[Orchestrator] Telegram message:", message);

    // Placeholder - gerçek messageId dönecek
    return Date.now();
  }

  /**
   * Pipeline sonucunu kaydet
   */
  private async savePipelineResult(result: PipelineResult): Promise<void> {
    // Undefined değerleri temizle (Firestore uyumluluğu için)
    const cleanedResult = removeUndefined(result);
    await this.db.collection("pipeline-results").add({
      ...cleanedResult,
      savedAt: Date.now(),
    });
  }
}

// Export types
export * from "./types";

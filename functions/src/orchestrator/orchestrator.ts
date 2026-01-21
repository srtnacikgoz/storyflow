/**
 * Full Orchestrator
 * Claude + Gemini entegrasyonu ile tam otomatik içerik üretimi
 */

import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { ClaudeService } from "./claudeService";
import { GeminiService } from "../services/gemini";
import { TelegramService } from "../services/telegram";
import { RulesService } from "./rulesService";
import {
  Asset,
  ProductType,
  TimeSlotRule,
  PipelineResult,
  PipelineStatus,
  GeneratedImage,
  QualityControlResult,
  OrchestratorConfig,
  Theme,
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

// Senaryolar artık RulesService'den yükleniyor

/**
 * Full Orchestrator Service
 */
export class Orchestrator {
  private db: FirebaseFirestore.Firestore;
  private storage: ReturnType<typeof getStorage>;
  private claude: ClaudeService;
  private gemini: GeminiService;
  private telegram: TelegramService;
  private rulesService: RulesService;
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.db = getFirestore();
    this.storage = getStorage();
    this.claude = new ClaudeService(config.claudeApiKey, config.claudeModel);
    this.gemini = new GeminiService({
      apiKey: config.geminiApiKey,
      model: config.geminiModel as "gemini-2.0-flash-exp" | "gemini-1.5-pro" | "gemini-3-pro-image-preview",
    });
    this.telegram = new TelegramService({
      botToken: config.telegramBotToken,
      chatId: config.telegramChatId,
      approvalTimeout: config.approvalTimeout,
    });
    this.rulesService = new RulesService();
  }

  // ==========================================
  // MAIN PIPELINE
  // ==========================================

  /**
   * Tam pipeline'ı çalıştır
   * @param productType - Urun tipi
   * @param timeSlotRule - Zaman kurali
   * @param onProgress - Her aşamada çağrılan callback (opsiyonel)
   * @param slotId - scheduled-slots koleksiyonundaki ID (Telegram callback icin)
   * @param scheduledHour - İçeriğin hedeflediği saat (opsiyonel, yoksa rule.startHour kullanılır)
   */
  async runPipeline(
    productType: ProductType,
    timeSlotRule: TimeSlotRule,
    onProgress?: (stage: string, stageIndex: number, totalStages: number) => Promise<void>,
    slotId?: string,
    scheduledHour?: number
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
      slotId, // scheduled-slots referansi - Telegram callback icin
    };

    try {
      // ==========================================
      // PRE-STAGE: Kuralları yükle (tüm aşamalar için)
      // ==========================================
      console.log("[Orchestrator] Loading effective rules...");
      const effectiveRules = await this.rulesService.getEffectiveRules();
      console.log(`[Orchestrator] Rules loaded - shouldIncludePet: ${effectiveRules.shouldIncludePet}, blockedScenarios: ${effectiveRules.blockedScenarios.length}`);

      // ==========================================
      // STAGE 1: ASSET SELECTION
      // ==========================================
      console.log("[Orchestrator] Stage 1: Asset Selection");
      status.currentStage = "asset_selection";
      if (onProgress) await onProgress("asset_selection", 1, TOTAL_STAGES);

      const assets = await this.loadAvailableAssets(productType);

      // Hedef saati belirle: scheduledHour > timeSlotRule.startHour > şu anki saat
      const targetHour = scheduledHour ?? timeSlotRule.startHour;
      const timeOfDay = this.getTimeOfDay(targetHour);
      const mood = this.getMoodFromTime(targetHour);

      console.log(`[Orchestrator] Target hour: ${targetHour}, timeOfDay: ${timeOfDay}, mood: ${mood}`);

      const assetResponse = await this.claude.selectAssets(
        productType,
        assets,
        timeOfDay,
        mood,
        effectiveRules  // Çeşitlilik kurallarını gönder (köpek dahil mi, bloklu masalar, vb.)
      );

      if (!assetResponse.success || !assetResponse.data) {
        throw new Error(`Asset selection failed: ${assetResponse.error}`);
      }

      result.assetSelection = assetResponse.data;
      totalCost += assetResponse.cost;
      status.completedStages.push("asset_selection");

      console.log(`[Orchestrator] Asset selection complete - Pet included: ${result.assetSelection.includesPet}`);

      // ==========================================
      // STAGE 2: SCENARIO SELECTION
      // ==========================================
      console.log("[Orchestrator] Stage 2: Scenario Selection");
      status.currentStage = "scenario_selection";
      if (onProgress) await onProgress("scenario_selection", 2, TOTAL_STAGES);

      // Senaryolar kurallardan alınıyor (zaten yüklendi)
      const allScenarios = effectiveRules.staticRules.scenarios;

      // Tema veya senaryo tercihini belirle
      let preferredScenarioIds: string[] | null = null;
      let themePetAllowed: boolean | null = null;

      // Önce themeId kontrol et (yeni sistem)
      if (timeSlotRule.themeId) {
        console.log(`[Orchestrator] Using themeId: ${timeSlotRule.themeId}`);
        const themeDoc = await this.db.collection("themes").doc(timeSlotRule.themeId).get();
        if (themeDoc.exists) {
          const theme = themeDoc.data() as Theme;
          preferredScenarioIds = theme.scenarios;
          themePetAllowed = theme.petAllowed;
          console.log(`[Orchestrator] Theme loaded: ${theme.name}, scenarios: [${preferredScenarioIds.join(", ")}], petAllowed: ${themePetAllowed}`);
        } else {
          console.log(`[Orchestrator] Theme not found: ${timeSlotRule.themeId}, falling back`);
        }
      }

      // Tema yoksa veya bulunamadıysa, scenarioPreference'a düş (geriye dönük uyumluluk)
      if (!preferredScenarioIds && timeSlotRule.scenarioPreference) {
        console.log(`[Orchestrator] Using legacy scenarioPreference: [${timeSlotRule.scenarioPreference.join(", ")}]`);
        preferredScenarioIds = timeSlotRule.scenarioPreference;
      }

      // Senaryo filtreleme
      let filteredScenarios = preferredScenarioIds
        ? allScenarios.filter(s => preferredScenarioIds!.includes(s.id))
        : allScenarios;

      // Bloklanmış senaryoları çıkar (son N üretimde kullanılanlar)
      filteredScenarios = filteredScenarios.filter(
        s => !effectiveRules.blockedScenarios.includes(s.id)
      );

      // Eğer tüm senaryolar bloklanmışsa, en az kullanılmış olanı seç
      if (filteredScenarios.length === 0) {
        console.log("[Orchestrator] All scenarios blocked, using full list from preference");
        // Önce tema/preference listesini dene, yoksa tüm senaryolar
        filteredScenarios = preferredScenarioIds
          ? allScenarios.filter(s => preferredScenarioIds!.includes(s.id))
          : allScenarios;
      }

      // Tema'dan gelen petAllowed ayarını effectiveRules'a ekle (varsa)
      if (themePetAllowed !== null) {
        effectiveRules.shouldIncludePet = themePetAllowed && effectiveRules.shouldIncludePet;
        console.log(`[Orchestrator] Pet inclusion after theme check: ${effectiveRules.shouldIncludePet}`);
      }

      // Claude için basitleştirilmiş senaryo listesi
      const scenariosForClaude = filteredScenarios.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        includesHands: s.includesHands,
      }));

      const scenarioResponse = await this.claude.selectScenario(
        productType,
        timeOfDay,
        result.assetSelection,
        scenariosForClaude,
        effectiveRules  // Çeşitlilik kurallarını da gönder
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

        try {
          // Ürün görselini yükle
          const productUrl = result.assetSelection.product.storageUrl;
          console.log(`[Orchestrator] ASSET DEBUG: Selected product: ${result.assetSelection.product.filename}`);
          console.log(`[Orchestrator] ASSET DEBUG: Product URL: ${productUrl}`);
          console.log(`[Orchestrator] ASSET DEBUG: Product ID: ${result.assetSelection.product.id}`);

          const productImageBase64 = await this.loadImageAsBase64(productUrl);
          console.log(`[Orchestrator] ASSET DEBUG: Loaded image size: ${productImageBase64.length} chars (base64)`);

          // Load reference images (plate, table, cup) if selected
          const referenceImages: Array<{ base64: string; mimeType: string; label: string }> = [];

          if (result.assetSelection.plate?.storageUrl) {
            console.log(`[Orchestrator] Loading plate: ${result.assetSelection.plate.filename}`);
            const plateBase64 = await this.loadImageAsBase64(result.assetSelection.plate.storageUrl);
            referenceImages.push({ base64: plateBase64, mimeType: "image/png", label: "plate" });
          }

          if (result.assetSelection.table?.storageUrl) {
            console.log(`[Orchestrator] Loading table: ${result.assetSelection.table.filename}`);
            const tableBase64 = await this.loadImageAsBase64(result.assetSelection.table.storageUrl);
            referenceImages.push({ base64: tableBase64, mimeType: "image/png", label: "table" });
          }

          if (result.assetSelection.cup?.storageUrl) {
            console.log(`[Orchestrator] Loading cup: ${result.assetSelection.cup.filename}`);
            const cupBase64 = await this.loadImageAsBase64(result.assetSelection.cup.storageUrl);
            referenceImages.push({ base64: cupBase64, mimeType: "image/png", label: "cup" });
          }

          console.log(`[Orchestrator] Sending ${referenceImages.length} reference images to Gemini`);

          // Gemini ile görsel üret
          const geminiResult = await this.gemini.transformImage(
            productImageBase64,
            "image/png",
            {
              prompt: result.optimizedPrompt.mainPrompt,
              negativePrompt: result.optimizedPrompt.negativePrompt,
              faithfulness: result.optimizedPrompt.faithfulness,
              aspectRatio: result.optimizedPrompt.aspectRatio,
              referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
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
        } catch (genError) {
          console.error(`[Orchestrator] Generation attempt ${generationAttempt} failed:`, genError);
          // Hata oluştu, bir sonraki denemeye geç
          continue;
        }

        // ==========================================
        // STAGE 5: QUALITY CONTROL
        // ==========================================
        console.log("[Orchestrator] Stage 5: Quality Control");
        status.currentStage = "quality_control";
        if (onProgress) await onProgress("quality_control", 5, TOTAL_STAGES);

        const qcResponse = await this.claude.evaluateImage(
          generatedImage.imageBase64,
          generatedImage.mimeType,
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
   * Mevcut asset'leri yükle (genişletilmiş - tüm asset tipleri)
   */
  private async loadAvailableAssets(productType: ProductType): Promise<{
    products: Asset[];
    plates: Asset[];
    cups: Asset[];
    tables: Asset[];
    decor: Asset[];
    pets: Asset[];
    environments: Asset[];
  }> {
    const assetsRef = this.db.collection("assets");

    // Tüm asset tiplerini paralel yükle
    const [
      products,
      plates,
      cups,
      tables,
      tablesAlt,
      decor,
      decorAlt,
      pets,
      environments,
    ] = await Promise.all([
      // Ürünler
      assetsRef.where("category", "==", "products").where("subType", "==", productType).where("isActive", "==", true).get(),
      // Tabaklar
      assetsRef.where("category", "==", "props").where("subType", "==", "plates").where("isActive", "==", true).get(),
      // Fincanlar
      assetsRef.where("category", "==", "props").where("subType", "==", "cups").where("isActive", "==", true).get(),
      // Masalar (İngilizce)
      assetsRef.where("category", "==", "furniture").where("subType", "==", "tables").where("isActive", "==", true).get(),
      // Masalar (Türkçe)
      assetsRef.where("category", "==", "Mobilya").where("subType", "==", "Masa").where("isActive", "==", true).get(),
      // Dekorasyon (İngilizce)
      assetsRef.where("category", "==", "furniture").where("subType", "==", "decor").where("isActive", "==", true).get(),
      // Dekorasyon (Türkçe) - bitkiler, kitaplar
      assetsRef.where("category", "==", "Aksesuar").where("isActive", "==", true).get(),
      // Evcil hayvanlar (köpek)
      assetsRef.where("category", "==", "pets").where("isActive", "==", true).get(),
      // Mekan/ortam görselleri
      assetsRef.where("category", "==", "environments").where("isActive", "==", true).get(),
    ]);

    const allTables = [
      ...tables.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      ...tablesAlt.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
    ];

    const allDecor = [
      ...decor.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      ...decorAlt.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
    ];

    console.log(`[Orchestrator] Assets found - products: ${products.docs.length}, plates: ${plates.docs.length}, cups: ${cups.docs.length}, tables: ${allTables.length}, decor: ${allDecor.length}, pets: ${pets.docs.length}, environments: ${environments.docs.length}`);

    return {
      products: products.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      plates: plates.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      cups: cups.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      tables: allTables,
      decor: allDecor,
      pets: pets.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      environments: environments.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
    };
  }

  /**
   * Günün zamanını belirle
   * @param targetHour - Hedef saat (opsiyonel, yoksa şu anki TRT saati kullanılır)
   */
  private getTimeOfDay(targetHour?: number): string {
    let hour: number;

    if (targetHour !== undefined) {
      // Hedef saat verilmişse onu kullan (slot'un zamanlanmış saati)
      hour = targetHour;
    } else {
      // Yoksa şu anki TRT saatini kullan
      const hourStr = new Date().toLocaleString("en-US", {
        timeZone: "Europe/Istanbul",
        hour: "numeric",
        hour12: false
      });
      hour = parseInt(hourStr);
    }

    // Zaman dilimi belirleme
    if (hour >= 6 && hour < 11) return "morning";
    if (hour >= 11 && hour < 14) return "noon";
    if (hour >= 14 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 20) return "evening";
    return "night";
  }

  /**
   * Zamana göre mood belirle
   * @param targetHour - Hedef saat (opsiyonel)
   */
  private getMoodFromTime(targetHour?: number): string {
    const timeOfDay = this.getTimeOfDay(targetHour);
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
    // MUTLAK KURAL - Tüm prompt'ların başında olacak
    const ABSOLUTE_RESTRICTION = `ABSOLUTE RESTRICTION:
Use ONLY objects visible in the uploaded reference images.
Do NOT add ANY prop, furniture, decoration, lighting fixture, or object that is not in the reference.
The scene must contain ONLY: the product + selected assets (plate, cup, table if provided).
Nothing else. No lampshade, no vase, no candles, no flowers, no extra items. Minimalist composition.

`;

    const fallbackPrompts: Record<string, string> = {
      "zarif-tutma": ABSOLUTE_RESTRICTION + `Using uploaded image as reference for the product.

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

      "kahve-ani": ABSOLUTE_RESTRICTION + `Using uploaded image as reference for the pastry.

CRITICAL ABSOLUTE RULES (NEVER VIOLATE):
- ONLY ONE PASTRY in the image (the one from reference)
- ONLY ONE COFFEE CUP (Sade branded ceramic cup, in background)
- NO duplicate products - if you see 2 pastries, REJECT
- NO duplicate cups - if you see 2 cups, REJECT
- The pastry from reference MUST be the ONLY food item

Lifestyle Instagram story with SINGLE pastry from reference as hero.

SCENE COMPOSITION:
- FOREGROUND (55%): Single pastry on small plate, SHARP FOCUS
- BACKGROUND (35%): Feminine hands cupping ONE Sade coffee cup, SOFT FOCUS
- DEPTH: Shallow DOF separates product from hands

TABLE SURFACE:
- White/grey marble visible
- Clean, minimal props

HAND STYLING (background, soft focus):
- Both hands gently cupping the ceramic cup
- Hands should be BEHIND the product, out of focus
- Simple elegant styling (nude polish, minimal rings)

LIGHTING:
- Soft natural side light from left
- Warm golden tones on product
- Product is the STAR, hands are supporting element

NEGATIVE REQUIREMENTS:
- NO second pastry or food item
- NO second cup or mug
- NO cluttered composition

9:16 vertical for Instagram Stories. 8K photorealistic.`,

      "kahve-kosesi": ABSOLUTE_RESTRICTION + `Using uploaded image as reference for the product.

Cozy corner Instagram story photo. Product on a small plate, placed on table surface from reference.

COMPOSITION:
- Product as hero, sharp focus, 50% of frame
- Warm, intimate atmosphere
- Shallow depth of field (f/2.0)
- NO hands in frame

SETTING:
- Use ONLY the table surface from reference
- Soft natural lighting, warm tones
- Clean, uncluttered composition

9:16 vertical for Instagram Stories. 8K photorealistic.`,

      "yarim-kaldi": ABSOLUTE_RESTRICTION + `Using uploaded image as reference for the product.

"Left behind" aesthetic - product with a bite taken, casual authentic moment.

COMPOSITION:
- Product partially eaten (one bite missing)
- On plate from reference, on table from reference
- Scattered crumbs for authenticity
- NO hands in frame

MOOD:
- Relaxed, intimate, real moment
- Warm natural lighting
- Shallow depth of field

9:16 vertical for Instagram Stories. 8K photorealistic.`,

      "cam-kenari": ABSOLUTE_RESTRICTION + `Using uploaded image as reference for the product.

Window-side composition with beautiful natural light.

COMPOSITION:
- Product on plate, near window
- Soft natural daylight from side
- Clean background, minimal props
- NO hands in frame

LIGHTING:
- Natural window light, soft and warm
- Gentle shadows
- Bright, airy feel

9:16 vertical for Instagram Stories. 8K photorealistic.`,

      "mermer-zarafet": ABSOLUTE_RESTRICTION + `Using uploaded image as reference for the product.

Elegant marble surface presentation, premium aesthetic.

COMPOSITION:
- Product centered on marble surface from reference
- Clean, luxurious presentation
- Minimal styling, maximum elegance
- NO hands in frame

STYLING:
- White/grey marble texture visible
- Soft diffused lighting
- High-end patisserie feel

9:16 vertical for Instagram Stories. 8K photorealistic.`,

      "hediye-acilisi": ABSOLUTE_RESTRICTION + `Using uploaded image as reference for the product.

Gift unboxing moment with elegant hand interaction.

COMPOSITION:
- Hands opening/revealing product
- Product emerging from gift box
- Excitement and discovery moment

HAND STYLING:
- Well-manicured nails, nude polish
- Minimal jewelry (thin ring, simple bracelet)
- Natural, graceful movement

9:16 vertical for Instagram Stories. 8K photorealistic.`,

      "ilk-dilim": ABSOLUTE_RESTRICTION + `Using uploaded image as reference for the product.

First slice moment - fork entering the product.

COMPOSITION:
- Product on plate from reference
- Elegant hand with fork taking first bite
- Anticipation moment captured

HAND STYLING:
- Feminine hand, well-manicured
- Simple elegant styling
- Fork held gracefully

9:16 vertical for Instagram Stories. 8K photorealistic.`,

      "paylasim": ABSOLUTE_RESTRICTION + `Using uploaded image as reference for the product.

Sharing moment - social, friendly atmosphere.

COMPOSITION:
- Product centered, two small plates suggested
- Social, conversational setting
- Warm, inviting atmosphere
- NO hands required

MOOD:
- Friendly, social gathering feel
- Warm natural lighting
- Clean table surface from reference

9:16 vertical for Instagram Stories. 8K photorealistic.`,

      "paket-servis": ABSOLUTE_RESTRICTION + `Using uploaded image as reference for the product.

Takeaway/delivery presentation with kraft packaging.

COMPOSITION:
- Product with takeaway packaging
- Clean, modern presentation
- Ready-to-go aesthetic
- NO hands in frame

STYLING:
- Kraft paper, simple packaging
- Clean background
- Professional takeaway look

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
    // Use correct extension based on MIME type
    const ext = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/gif" ? "gif" : "png";
    const filename = `generated/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const file = bucket.file(filename);

    const buffer = Buffer.from(imageBase64, "base64");
    await file.save(buffer, {
      metadata: { contentType: mimeType },
      public: true, // Dosyayı public yap (frontend erişimi için)
    });

    // gs:// formatında döndür (Telegram akışı bunu bekliyor)
    return `gs://${bucket.name}/${filename}`;
  }

  /**
   * Telegram onay mesajı gönder
   */
  public async sendTelegramApproval(result: PipelineResult): Promise<number> {
    if (!result.generatedImage || !result.generatedImage.storageUrl) {
      throw new Error("Cannot send approval without generated image URL");
    }

    // Storage URL'i public URL'e veya signed URL'e çevir
    // Telegram'ın erişebilmesi için signed URL oluştur
    const bucket = this.storage.bucket();
    console.log(`[Orchestrator] Bucket: ${bucket.name}, StorageURL: ${result.generatedImage.storageUrl}`);

    // GS URL'den path'i çıkarırken dikkatli olalım
    let filePath = result.generatedImage.storageUrl;
    if (filePath.startsWith(`gs://${bucket.name}/`)) {
      filePath = filePath.replace(`gs://${bucket.name}/`, "");
    } else if (filePath.startsWith("gs://")) {
      // Farklı bir bucket veya format olabilir, manuel parse edelim
      const parts = filePath.split("gs://")[1].split("/");
      parts.shift(); // bucket ismini at
      filePath = parts.join("/");
    }

    const file = bucket.file(filePath);
    console.log(`[Orchestrator] FilePath: ${filePath}`);

    // Generate accessible URL for Telegram
    // Strategy 1: Firebase Download Token (Preferred)
    let imageUrl = "";

    try {
      // Try to get/create download token
      const [metadata] = await file.getMetadata();
      let token = metadata.metadata?.firebaseStorageDownloadTokens;

      if (!token) {
        // Create new token
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { randomUUID } = require("crypto");
          token = randomUUID();
        } catch (e) {
          // Fallback for older node versions or if crypto fails
          token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        }

        // Check token validity
        if (!token) {
          throw new Error("Token generation failed");
        }

        await file.setMetadata({
          metadata: {
            firebaseStorageDownloadTokens: token,
          },
        });
      }

      const encodedPath = encodeURIComponent(filePath).replace(/\//g, "%2F");
      imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;

      console.log(`[Orchestrator] Generated Download URL: ${imageUrl}`);
    } catch (urlError) {
      console.error("[Orchestrator] URL Generation failed:", urlError);
      // Fallback: Don't crash, just send text
      // But sendApprovalRequest expects image... 
      // We will let it try with signedUrl if we haven't tried
      try {
        const [signedUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 3600 * 1000,
        });
        imageUrl = signedUrl;
      } catch (signError) {
        console.error("[Orchestrator] Signed URL also failed:", signError);
        throw new Error("Could not generate any accessible URL for image");
      }
    }

    // Create a safe, unique ID for Telegram callback_data
    // Format: job_{timestamp}_{random} (no dots, no slashes)
    const shortId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Save to photos queue so Telegram callback handler can find it
    const photoItem = {
      id: shortId,
      filename: result.assetSelection?.product.filename || "image.png",
      originalUrl: result.assetSelection?.product.storageUrl || "",
      enhancedUrl: imageUrl, // The generated image URL
      uploadedAt: Date.now(),
      processed: true,
      status: "awaiting_approval",
      schedulingMode: "immediate",
      productName: result.assetSelection?.product.filename || "Ürün",
      productCategory: result.assetSelection?.product.category || "special-orders",
      captionTemplateName: result.scenarioSelection?.scenarioName,
      caption: result.contentPackage?.caption || "",
      styleVariant: result.assetSelection?.product.visualProperties?.style || "lifestyle-moments",
      aiModel: "gemini-pro",
      faithfulness: result.optimizedPrompt?.faithfulness || 0.7,
      // Store reference to pipeline result
      pipelineResultId: shortId, // Reference to this item
      generatedStorageUrl: result.generatedImage.storageUrl,
      // Orchestrator slot referansi - Telegram callback'te scheduled-slots güncellemesi için
      slotId: result.slotId,
    };

    // Save to photos collection with the short ID as document ID
    await this.db.collection("media-queue").doc(shortId).set(photoItem);
    console.log(`[Orchestrator] Saved photo to queue with ID: ${shortId}`);

    const messageId = await this.telegram.sendApprovalRequest(
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...photoItem as any,
      },
      imageUrl
    );

    return messageId;
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

/**
 * Full Orchestrator
 * Gemini AI entegrasyonu ile tam otomatik içerik üretimi
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { GeminiService } from "../services/gemini";
import { ReveService } from "../services/reve";
import { TelegramService } from "../services/telegram";
import { RulesService } from "./rulesService";
import { FeedbackService } from "../services/feedbackService";
import { AIRulesService } from "../services/aiRulesService";
import { AILogService } from "../services/aiLogService";
import { getFixedAssets, getAssetSelectionConfig, isCloudinaryEnabled, getBeverageRulesConfig } from "../services/configService";
import * as categoryService from "../services/categoryService";
import {
  buildGeminiPrompt,
  extractGeminiParamsFromScenario,
  buildNegativePrompt,
  getCompositionTemplate,
} from "./geminiPromptBuilder";
import {
  Asset,
  AssetSelection,
  ProductType,
  TimeSlotRule,
  PipelineResult,
  PipelineStatus,
  GeneratedImage,
  QualityControlResult,
  OrchestratorConfig,
  FirestoreScenario,
} from "./types";
import { SelectionContext, RuleEngineConfig } from "./ruleEngine/types";
import { RuleEngine, AuditLogger } from "./ruleEngine";

// Helpers & Stages - Modüler yapı
import { getTimeOfDay, getMoodFromTime } from "./helpers";
import {
  selectInteriorAsset,
  buildInteriorResult,
  buildInteriorScenarioSelection,
  markInteriorStagesComplete,
} from "./stages";
import {
  buildReferenceImages,
  buildReferenceImagesList,
  loadAssetAsBase64,
  loadImageFromUrl,
  saveImageToStorage,
  loadImageAsBase64,
} from "./helpers";

const DEFAULT_SCORING_WEIGHTS_CONST = {
  tagMatch: { weight: 40, exactMatchBonus: 10, partialMatchBonus: 5 },
  usageBonus: { weight: 20, formula: "linear" as const, maxBonus: 20 },
  moodMatch: { weight: 20, moodTags: {} },
  productCompat: { weight: 20, matrix: {} },
};

const DEFAULT_THRESHOLDS_CONST = {
  default: 50, // Lower threshold for testing start
  products: 50,
  tables: 50,
  plates: 50,
  cups: 50,
  accessories: 50,
  napkins: 50,
  cutlery: 50,
};

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
  private gemini: GeminiService;
  private reve: ReveService | null = null;
  private telegram: TelegramService;
  private rulesService: RulesService;
  private auditLogger: AuditLogger;
  private config: OrchestratorConfig;
  private imageProvider: "gemini" | "reve";

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.db = getFirestore();
    this.storage = getStorage();

    // Image provider seçimi
    this.imageProvider = config.imageProvider || "gemini";

    // Gemini 3.0 entegrasyonu (text işlemleri için her zaman gerekli)
    // Text işlemleri: asset selection, scenario selection, prompt optimization, QC
    this.gemini = new GeminiService({
      apiKey: config.geminiApiKey,
      imageModel: "gemini-3-pro-image-preview",
      textModel: "gemini-3-flash-preview",
    });

    // Reve entegrasyonu (görsel üretimi için - opsiyonel)
    if (this.imageProvider === "reve" && config.reveApiKey) {
      this.reve = new ReveService({
        apiKey: config.reveApiKey,
        version: config.reveVersion || "latest",
      });
      console.log(`[Orchestrator] v2.2.0 - Image Provider: REVE (${config.reveVersion || "latest"})`);
    } else {
      console.log(`[Orchestrator] v2.2.0 - Image Provider: GEMINI (gemini-3-pro-image-preview)`);
    }

    console.log(`[Orchestrator] Text Model: gemini-3-flash-preview`);

    this.telegram = new TelegramService({
      botToken: config.telegramBotToken,
      chatId: config.telegramChatId,
      approvalTimeout: config.approvalTimeout,
    });
    this.rulesService = new RulesService();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Pipeline'ın iptal edilip edilmediğini kontrol et
   * @throws Error eğer pipeline iptal edildiyse
   */
  private async checkCancellation(slotId?: string): Promise<void> {
    if (!slotId) return; // slotId yoksa kontrol edilemez

    const slotDoc = await this.db.collection("scheduled-slots").doc(slotId).get();
    if (!slotDoc.exists) return;

    const slot = slotDoc.data();
    if (slot?.status === "cancelled") {
      console.log(`[Orchestrator] Pipeline cancelled for slot ${slotId}`);
      throw new Error("PIPELINE_CANCELLED");
    }
  }

  // ==========================================
  // MAIN PIPELINE
  // ==========================================

  /**
   * Tam pipeline'ı çalıştır
   * @param productType - Ürün tipi (opsiyonel: yoksa senaryodan otomatik belirlenir)
   * @param onProgress - Her aşamada çağrılan callback (opsiyonel)
   * @param overrideThemeId - Manuel tema seçimi (Dashboard'dan "Şimdi Üret" ile)
   * @param overrideAspectRatio - Manuel aspect ratio seçimi (Instagram formatı için)
   * @param isManual - Manuel üretim mi? (Şimdi Üret butonu = true, Scheduler = false)
   */
  async runPipeline(
    productType: ProductType | undefined,
    timeSlotRule: TimeSlotRule,
    onProgress?: (stage: string, stageIndex: number, totalStages: number) => Promise<void>,
    slotId?: string,
    scheduledHour?: number,
    overrideThemeId?: string,
    overrideAspectRatio?: "1:1" | "3:4" | "9:16",
    isManual?: boolean,
    isRandomMode?: boolean
  ): Promise<PipelineResult> {
    const TOTAL_STAGES = 6; // asset, scenario, prompt, image, quality, telegram (caption kaldırıldı)
    const startedAt = Date.now();
    let totalCost = 0;

    // Benzersiz pipeline ID oluştur (AI loglarını gruplamak için)
    const pipelineId = slotId
      ? `${slotId}-${startedAt}`
      : `manual-${startedAt}-${Math.random().toString(36).substring(2, 8)}`;

    // isAutoMode: sadece "Rastgele Üret" modunda veya productType yokken + rastgele mod açıkça seçildiyse
    const isAutoMode = isRandomMode === true;
    console.log(`[Orchestrator] Starting pipeline: ${pipelineId}${isAutoMode ? " [RASTGELE MOD]" : " [NORMAL MOD]"}`);

    // Gemini'ye pipeline context'i set et (loglama için)
    this.gemini.setPipelineContext({
      pipelineId,
      slotId,
      productType: productType || "auto",
    });

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
      slotId, // Scheduler'dan gelen slot referansı
    };

    try {
      // ==========================================
      // PRE-STAGE: Kuralları yükle (tüm aşamalar için)
      // ==========================================
      console.log("[Orchestrator] Loading effective rules...");
      const [effectiveRules, fixedAssets] = await Promise.all([
        this.rulesService.getEffectiveRules(),
        getFixedAssets(),
      ]);
      console.log(`[Orchestrator] Rules loaded - shouldIncludePet: ${effectiveRules.shouldIncludePet}, blockedScenarios: ${effectiveRules.blockedScenarios.length}`);

      // Sabit asset bilgisini logla
      if (fixedAssets.isEnabled) {
        console.log(`[Orchestrator] 🔒 SABİT ASSET AKTİF - Table: ${fixedAssets.fixedTableId || "yok"}, Plate: ${fixedAssets.fixedPlateId || "yok"}, Cup: ${fixedAssets.fixedCupId || "yok"}`);
      }

      // Tüm senaryoları al (tema kontrolü için de lazım)
      const allScenarios = effectiveRules.staticRules.scenarios;

      // ==========================================
      // PRE-STAGE 2: TEMA KONTROLÜ - Interior-only tema mı?
      // ==========================================
      const effectiveThemeId = overrideThemeId || timeSlotRule.themeId;
      let isInteriorOnlyTheme = false;
      let themeData: FirebaseFirestore.DocumentData | undefined;
      let themeFilteredScenarios = allScenarios;

      if (effectiveThemeId) {
        console.log(`[Orchestrator] PRE-CHECK: Loading theme "${effectiveThemeId}" for interior detection`);
        try {
          const themeDoc = await this.db.collection("themes").doc(effectiveThemeId).get();
          if (themeDoc.exists) {
            themeData = themeDoc.data();
            if (themeData?.scenarios && Array.isArray(themeData.scenarios)) {
              // Temanın senaryolarını filtrele
              themeFilteredScenarios = allScenarios.filter(s => themeData!.scenarios.includes(s.id));
              console.log(`[Orchestrator] Theme "${themeData.name}" has ${themeFilteredScenarios.length} scenarios`);

              // Interior-only tema kontrolü: TÜM senaryolar interior mı?
              if (themeFilteredScenarios.length > 0) {
                isInteriorOnlyTheme = themeFilteredScenarios.every(s => s.isInterior === true);
                console.log(`[Orchestrator] Theme "${themeData.name}" isInteriorOnly: ${isInteriorOnlyTheme}`);
              }
            }
          } else {
            console.warn(`[Orchestrator] Theme "${effectiveThemeId}" not found, using all scenarios`);
          }
        } catch (themeError) {
          console.error(`[Orchestrator] Failed to load theme: ${themeError}`);
        }
      }

      // ==========================================
      // PRE-STAGE 3: CONFIG SNAPSHOT LOGGING (YENİ!)
      // ==========================================
      const timeOfDayForConfig = getTimeOfDay();
      const moodForConfig = themeData?.mood || getMoodFromTime();

      // Mood detaylarını al
      // Admin panel mood field'ına Mood document ID kaydediyor
      const effectiveMoodId = themeData?.mood;
      let moodDetails: {
        name?: string;
        description?: string;
        weather?: string;
        lightingPrompt?: string;
        colorGradePrompt?: string;
        timeOfDay?: string;
        season?: string;
        geminiPresetId?: string; // YENİ: Gemini presets ile eşleşen ID
      } = {};
      if (effectiveMoodId) {
        try {
          const moodDoc = await this.db.collection("moods").doc(effectiveMoodId).get();
          if (moodDoc.exists) {
            const moodData = moodDoc.data();
            moodDetails = {
              name: moodData?.name,
              description: moodData?.description,
              weather: moodData?.weather,
              lightingPrompt: moodData?.lightingPrompt,
              colorGradePrompt: moodData?.colorGradePrompt,
              timeOfDay: moodData?.timeOfDay,
              season: moodData?.season,
              geminiPresetId: moodData?.geminiPresetId, // YENİ: Gemini preset eşleştirmesi
            };
            console.log(`[Orchestrator] 🌤️ Mood loaded: "${moodData?.name}" | weather: ${moodData?.weather} | geminiPresetId: ${moodData?.geminiPresetId || "YOK"} | lighting: ${moodData?.lightingPrompt?.substring(0, 50)}...`);
          }
        } catch (e) {
          console.warn(`[Orchestrator] Could not load mood details: ${e}`);
        }
      }

      // Style detaylarını al (eğer styleId varsa)
      let styleDetails: { name?: string; definition?: string } = {};
      if (themeData?.styleId) {
        try {
          const styleDoc = await this.db.collection("styles").doc(themeData.styleId).get();
          if (styleDoc.exists) {
            const styleData = styleDoc.data();
            styleDetails = {
              name: styleData?.name,
              definition: styleData?.definition,
            };
          }
        } catch (e) {
          console.warn(`[Orchestrator] Could not load style details: ${e}`);
        }
      }

      // Config snapshot logla
      await AILogService.logConfigSnapshot({
        pipelineId,
        slotId,
        productType,
        configSnapshot: {
          themeId: effectiveThemeId,
          themeName: themeData?.name,
          themeColors: themeData?.colors || [],
          moodId: effectiveMoodId,
          moodName: moodDetails.name || moodForConfig,
          moodWeather: moodDetails.weather,
          moodLightingPrompt: moodDetails.lightingPrompt,
          moodColorGradePrompt: moodDetails.colorGradePrompt,
          styleId: themeData?.styleId,
          styleName: styleDetails.name,
          styleDefinition: styleDetails.definition,
          timeOfDay: timeOfDayForConfig,
          aspectRatio: overrideAspectRatio || "9:16",
          scheduledHour,
        },
      });
      console.log(`[Orchestrator] 📋 Config snapshot logged`);

      // ==========================================
      // PRE-STAGE 4: RULES APPLIED LOGGING (YENİ!)
      // ==========================================

      // User rules'ları topla
      const userRulesForLog: Array<{
        id: string;
        category: string;
        content: string;
        ruleType: "do" | "dont";
        applied: boolean;
      }> = [];

      // Aktif user rules varsa ekle
      try {
        const userRulesSnapshot = await this.db.collection("ai-rules")
          .where("isActive", "==", true)
          .limit(50)
          .get();

        userRulesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          // AIRule tipinde content yok, title + description var
          // ruleType değil type kullanılıyor
          userRulesForLog.push({
            id: doc.id,
            category: data.category || "general",
            content: data.title
              ? `${data.title}${data.description ? ": " + data.description : ""}`
              : data.description || "",
            ruleType: data.type || "do",
            applied: true,
          });
        });
      } catch (e) {
        console.warn(`[Orchestrator] Could not load user rules for logging: ${e}`);
      }

      // Bloklanmış asset'leri topla
      const blockedAssetsForLog: Array<{
        id: string;
        name: string;
        type: string;
        reason: string;
      }> = [];

      // Bloklu senaryoları ekle
      effectiveRules.blockedScenarios.forEach(scenarioId => {
        blockedAssetsForLog.push({
          id: scenarioId,
          name: scenarioId,
          type: "scenario",
          reason: "Çeşitlilik kuralı - son kullanımdan bu yana bekleme süresi dolmadı",
        });
      });

      // Bloklu masaları ekle
      effectiveRules.blockedTables.forEach(tableId => {
        blockedAssetsForLog.push({
          id: tableId,
          name: tableId,
          type: "table",
          reason: "Çeşitlilik kuralı - son kullanımdan bu yana bekleme süresi dolmadı",
        });
      });

      // Feedback kurallarını topla
      const feedbackRulesForLog: Array<{
        type: string;
        count: number;
        note?: string;
      }> = [
          { type: "shouldIncludePet", count: effectiveRules.shouldIncludePet ? 1 : 0 },
        ];

      // Rules applied logla
      await AILogService.logRulesApplied({
        pipelineId,
        slotId,
        productType,
        appliedRules: {
          userRules: userRulesForLog,
          blockedAssets: blockedAssetsForLog,
          feedbackRules: feedbackRulesForLog,
        },
      });
      console.log(`[Orchestrator] 📋 Rules applied logged: ${userRulesForLog.length} user rules, ${blockedAssetsForLog.length} blocked assets`);

      // ══════════════════════════════════════════════════════════════════════
      // INTERIOR-ONLY TEMA AKIŞI - Asset Selection ATLANIR
      // ══════════════════════════════════════════════════════════════════════
      if (isInteriorOnlyTheme) {
        console.log(`[Orchestrator] 🏠 INTERIOR-ONLY THEME DETECTED - Skipping normal asset selection`);

        // Interior asset'leri yükle (productType olmadan da çalışır, sadece interior asset'ler kullanılacak)
        const assets = await this.loadAvailableAssets(productType || "interior");

        if (!assets.interior || assets.interior.length === 0) {
          throw new Error(`İç mekan görseli bulunamadı. Assets sayfasından "interior" kategorisinde görsel ekleyin.`);
        }

        console.log(`[Orchestrator] Interior assets available: ${assets.interior.length}`);

        // Rastgele bir interior senaryo seç (tema senaryolarından)
        const interiorScenarios = themeFilteredScenarios.filter(s => s.isInterior === true);
        const randomScenario = interiorScenarios[Math.floor(Math.random() * interiorScenarios.length)];

        console.log(`[Orchestrator] Selected interior scenario: ${randomScenario.name} (type: ${randomScenario.interiorType})`);

        // Interior asset seç (interiorType'a göre)
        const selectedInterior = selectInteriorAsset(assets.interior, randomScenario.interiorType);

        if (!selectedInterior) {
          const typeLabel = randomScenario.interiorType || "herhangi";
          throw new Error(`İç mekan görseli bulunamadı (tip: ${typeLabel}). Assets sayfasından "interior" kategorisinde "${typeLabel}" alt tipinde görsel ekleyin.`);
        }

        console.log(`[Orchestrator] Selected interior asset: ${selectedInterior.filename}`);

        // Minimal asset selection oluştur (interior için)
        result.assetSelection = {
          product: selectedInterior, // Interior asset'i product yerine kullan (tip uyumu için)
          interior: selectedInterior,
          isInteriorScenario: true,
          includesPet: false,
          selectionReasoning: `Interior senaryo: ${randomScenario.name} - AI üretimi atlandı, mevcut fotoğraf kullanıldı`,
        } as AssetSelection;

        // Senaryo bilgisini kaydet
        result.scenarioSelection = {
          scenarioId: randomScenario.id,
          scenarioName: randomScenario.name,
          scenarioDescription: randomScenario.description || "Interior mekan görseli",
          reasoning: `Interior senaryo seçildi: ${randomScenario.name} - Mevcut pastane fotoğrafı kullanılacak`,
          includesHands: false,
          compositionId: "interior-default",
          composition: "Interior mekan görseli - AI üretimi yok",
          handStyle: undefined,
          isInterior: true,
          interiorType: randomScenario.interiorType,
        };

        // Stage 1, 2, 3, 4, 5 tamamlandı (interior için hepsi atlanır)
        status.completedStages.push("asset_selection");
        status.completedStages.push("scenario_selection");
        status.completedStages.push("prompt_optimization");
        status.completedStages.push("image_generation");
        status.completedStages.push("quality_control");

        if (onProgress) await onProgress("interior_asset_selected", 5, TOTAL_STAGES);

        // Interior görseli doğrudan kullan (AI üretimi YOK)
        result.generatedImage = {
          imageBase64: "",
          mimeType: "image/jpeg",
          model: "interior-asset",
          cost: 0,
          generatedAt: Date.now(),
          attemptNumber: 0,
          storageUrl: selectedInterior.storageUrl,
        };

        result.qualityControl = {
          passed: true,
          score: 10,
          evaluation: {
            productAccuracy: 10,
            composition: 10,
            lighting: 10,
            realism: 10,
            instagramReadiness: 10,
          },
          feedback: "Interior asset - Gerçek fotoğraf, AI üretimi yapılmadı",
          shouldRegenerate: false,
        };

        result.optimizedPrompt = {
          mainPrompt: `Interior photo: ${selectedInterior.filename}`,
          negativePrompt: "",
          aspectRatio: overrideAspectRatio || "1:1",
          faithfulness: 1.0,
          customizations: ["interior-asset", "no-ai-generation"],
        };

        // NOT: Content package (caption) oluşturma kaldırıldı - Instagram API caption desteklemiyor

        // Production history'ye ekle (çeşitlilik takibi için)
        const historySuccess = await this.rulesService.addToHistory({
          timestamp: Date.now(),
          scenarioId: "interior",
          compositionId: "interior-default",
          tableId: null,
          handStyleId: null,
          includesPet: false,
          productType: (productType || "croissants") as ProductType, // Interior'da productType önemsiz
          productId: selectedInterior.id,
          plateId: null,
          cupId: null,
        });

        if (!historySuccess) {
          // KRİTİK HATA: Çeşitlilik takibi bozulacak! Ama görsel zaten üretildi, pipeline'ı durdurmuyoruz.
          console.error("[Orchestrator] ❌ KRİTİK: Interior history kaydedilemedi!");
          console.error("[Orchestrator] Sonuç: Çeşitlilik takibi bozulacak, aynı interior tekrar seçilebilir.");
          console.error("[Orchestrator] Slot ID:", result.slotId, "Scenario:", result.scenarioSelection?.scenarioId);
        }

        // Telegram'a gönder
        console.log("[Orchestrator] Stage 6: Sending to Telegram");
        status.currentStage = "telegram_approval";
        if (onProgress) await onProgress("telegram_approval", 6, TOTAL_STAGES);

        const telegramMessageId = await this.sendTelegramApproval(result);
        result.telegramMessageId = telegramMessageId;
        status.completedStages.push("telegram_approval");

        // Pipeline sonucunu kaydet
        await this.savePipelineResult(result);

        result.completedAt = Date.now();
        result.totalCost = totalCost;

        console.log(`[Orchestrator] ✅ Interior pipeline completed - Cost: $${totalCost.toFixed(4)}`);

        return result;
      }

      // ══════════════════════════════════════════════════════════════════════
      // NORMAL AKIŞ - Product Shot (AI üretimi)
      // ══════════════════════════════════════════════════════════════════════

      // ==========================================
      // NORMAL MOD: productType yoksa tema senaryosundan deterministik belirle
      // ==========================================
      if (!isAutoMode && !productType) {
        console.log("[Orchestrator] NORMAL MOD: productType tema senaryosundan belirlenecek");

        // Tema senaryolarından interior olmayanları filtrele
        const normalScenarios = themeFilteredScenarios.filter(s => !s.isInterior);

        if (normalScenarios.length > 0) {
          const themeScenario = normalScenarios[0];
          const scenarioData = themeScenario as FirestoreScenario;
          if (scenarioData.suggestedProducts && scenarioData.suggestedProducts.length > 0) {
            productType = scenarioData.suggestedProducts[0] as ProductType;
            console.log(`[Orchestrator] NORMAL MOD: productType from theme scenario "${themeScenario.name}": ${productType}`);
          }
        }

        // Hala belirlenemezse fallback
        if (!productType) {
          const activeSlugs = await categoryService.getSubTypeSlugs("products");
          productType = (activeSlugs[0] || "croissants") as ProductType;
          console.log(`[Orchestrator] NORMAL MOD: fallback productType: ${productType}`);
        }

        // Pipeline context güncelle
        this.gemini.setPipelineContext({
          pipelineId,
          slotId,
          productType,
        });
      }

      // ==========================================
      // RASTGELE MOD: productType yoksa rastgele senaryo seç, senaryodan belirle
      // ==========================================
      if (isAutoMode) {
        console.log("[Orchestrator] AUTO MODE: Senaryo seçimi önce yapılacak, productType senaryodan belirlenecek");

        // Senaryo filtreleme (tema zaten yüklendi)
        let autoScenarios = themeFilteredScenarios;

        // Interior senaryoları çıkar (normal akıştayız)
        autoScenarios = autoScenarios.filter(s => !s.isInterior);

        // Bloklanmış senaryoları çıkar
        autoScenarios = autoScenarios.filter(
          s => !effectiveRules.blockedScenarios.includes(s.id)
        );

        // Tüm senaryolar bloklanmışsa fallback
        if (autoScenarios.length === 0) {
          console.log("[Orchestrator] AUTO: All scenarios blocked, using theme-filtered list");
          autoScenarios = themeFilteredScenarios.filter(s => !s.isInterior);
          if (autoScenarios.length === 0) {
            autoScenarios = allScenarios.filter(s => !s.isInterior);
          }
        }

        // Rastgele bir senaryo seç
        const autoSelectedScenario = autoScenarios[Math.floor(Math.random() * autoScenarios.length)];
        console.log(`[Orchestrator] AUTO: Pre-selected scenario: ${autoSelectedScenario.name}`);

        // Senaryodan productType belirle
        const scenarioData = autoSelectedScenario as FirestoreScenario;
        if (scenarioData.suggestedProducts && scenarioData.suggestedProducts.length > 0) {
          // suggestedProducts'dan rastgele bir productType seç
          productType = scenarioData.suggestedProducts[
            Math.floor(Math.random() * scenarioData.suggestedProducts.length)
          ] as ProductType;
          console.log(`[Orchestrator] AUTO: productType from scenario suggestedProducts: ${productType}`);
        } else {
          // suggestedProducts boş → aktif ürün kategorilerinden rastgele seç
          const activeSlugs = await categoryService.getSubTypeSlugs("products");
          if (activeSlugs.length > 0) {
            productType = activeSlugs[Math.floor(Math.random() * activeSlugs.length)] as ProductType;
            console.log(`[Orchestrator] AUTO: productType from active categories: ${productType}`);
          } else {
            // Son fallback
            productType = "croissants" as ProductType;
            console.log(`[Orchestrator] AUTO: fallback productType: ${productType}`);
          }
        }

        // Pipeline context güncelle (artık productType belli)
        this.gemini.setPipelineContext({
          pipelineId,
          slotId,
          productType,
        });

        console.log(`[Orchestrator] AUTO MODE resolved: productType=${productType}`);
      }

      // Auto mod sonrası productType kesinlikle set edilmiş olmalı
      if (!productType) {
        throw new Error("productType belirlenemedi. Auto mod senaryodan productType çıkaramamış olabilir.");
      }
      // TypeScript narrowing: reassignment sonrası narrowing kaybolduğu için
      // yeni bir const değişkene atıyoruz
      const effectiveProductType: ProductType = productType;

      // ==========================================
      // STAGE 1: ASSET SELECTION
      // ==========================================
      await this.checkCancellation(slotId); // İptal kontrolü
      console.log("[Orchestrator] Stage 1: Asset Selection");
      status.currentStage = "asset_selection";
      if (onProgress) await onProgress("asset_selection", 1, TOTAL_STAGES);

      const assets = await this.loadAvailableAssets(productType);

      // Ürün kontrolü - Claude'a göndermeden önce
      // Kahve özel durum: ürün fotoğrafı yok, bardak asset'i yeterli, AI içeriği belirler
      if (assets.products.length === 0 && productType !== "coffees") {
        const productTypeLabels: Record<ProductType, string> = {
          croissants: "Kruvasan",
          pastas: "Pasta",
          chocolates: "Çikolata",
          coffees: "Kahve",
        };
        const label = productTypeLabels[productType] || productType;
        throw new Error(`"${label}" kategorisinde aktif ürün bulunamadı. Assets sayfasından "products" kategorisi ve "${productType}" alt tipinde ürün ekleyin ve "isActive" durumunun açık olduğundan emin olun.`);
      }

      const timeOfDay = getTimeOfDay();
      // Mood: Önce geminiPresetId kullan (varsa), yoksa zaman bazlı fallback
      // NOT: themeData?.mood Firestore doc ID, ama buildGeminiPrompt gemini-preset ID bekliyor
      // Bu yüzden mood doc'undaki geminiPresetId alanını kullanıyoruz
      const mood = moodDetails.geminiPresetId || getMoodFromTime();
      console.log(`[Orchestrator] 🎭 Mood resolved: "${mood}" (geminiPresetId: ${moodDetails.geminiPresetId || "YOK"}, fallback: ${!moodDetails.geminiPresetId})`);

      // Aksesuar kontrolü - tema izin vermiyorsa accessories'i gönderme
      const accessoryAllowed = themeData?.accessoryAllowed === true;

      if (accessoryAllowed && assets.accessories.length > 0) {
        console.log(`[Orchestrator] Accessory allowed - ${assets.accessories.length} accessories available`);
      } else if (!accessoryAllowed) {
        console.log(`[Orchestrator] Accessory not allowed for theme "${themeData?.name || "default"}"`);
      }

      // Asset seçim kurallarını yükle (manuel vs otomatik)
      // isManual parametresi yoksa, slotId'ye göre karar ver
      const actualIsManual = isManual !== undefined ? isManual : !slotId;
      const assetSelectionConfig = await getAssetSelectionConfig();
      const assetSelectionRules = actualIsManual
        ? assetSelectionConfig.manual
        : assetSelectionConfig.scheduled;

      console.log(`[Orchestrator] Asset selection mode: ${actualIsManual ? "MANUAL" : "SCHEDULED"}`);

      // ==========================================
      // PREFERRED TAGS: Diversity block muafiyeti
      // Tema'da tercih edilen tag'lere sahip asset'ler çeşitlilik bloğundan muaf
      // ==========================================
      if (themeData?.setting?.preferredTags) {
        const preferredTags = themeData.setting.preferredTags as { table?: string[]; plate?: string[]; cup?: string[] };

        const unblockPreferred = (
          assetList: any[],
          blockedIds: string[],
          tagList?: string[],
          label?: string
        ): string[] => {
          if (!tagList || tagList.length === 0 || blockedIds.length === 0) return blockedIds;

          return blockedIds.filter(id => {
            const asset = assetList.find((a: any) => a.id === id);
            if (!asset?.tags || !Array.isArray(asset.tags)) return true;

            const hasMatch = asset.tags.some((t: string) =>
              tagList.some(pt => t.toLowerCase().includes(pt.toLowerCase()))
            );

            if (hasMatch) {
              console.log(`[Orchestrator] PreferredTags muafiyet: ${label} "${id}" diversity block'tan çıkarıldı (eşleşen tag: ${asset.tags.join(", ")})`);
              return false; // bloktan çıkar
            }
            return true; // bloklu kalsın
          });
        };

        effectiveRules.blockedTables = unblockPreferred(assets.tables, effectiveRules.blockedTables, preferredTags.table, "masa");
        effectiveRules.blockedPlates = unblockPreferred(assets.plates, effectiveRules.blockedPlates, preferredTags.plate, "tabak");
        effectiveRules.blockedCups = unblockPreferred(assets.cups, effectiveRules.blockedCups, preferredTags.cup, "fincan");
      }

      // ==========================================
      // RULE ENGINE INTEGRATION (v3.0 deterministic)
      // ==========================================

      // 1. Rule Engine Config Hazırla
      const ruleEngineConfig: RuleEngineConfig = {
        scoringWeights: DEFAULT_SCORING_WEIGHTS_CONST,
        thresholds: DEFAULT_THRESHOLDS_CONST,
        strictBlocking: !actualIsManual, // Manuel modda strict blocking kapalı olabilir
        fallbackToRandom: true,
        fallbackToHighestScore: true,
        logWhenFallback: true,
        patronRules: effectiveRules.patronRules,
        enableScoring: true,
        enablePatronRules: true,
        enablePostValidation: true,
        enableAuditLog: true,
        version: "1.0.0",
        updatedAt: Date.now(),
      };

      const ruleEngine = new RuleEngine(ruleEngineConfig);

      // 2. Context Oluştur
      const selectionContext: SelectionContext = {
        productType,
        mood,
        timeOfDay,
        effectiveRules,
        assetSelectionRules,
        season: "winter", // TODO: Dynamic season
      };

      // 3. Pre-Filter (Blocked/Inactive eleme)
      const preFilterResult = await ruleEngine.preFilter(assets, selectionContext);
      console.log(`[RuleEngine] Pre-filter: ${preFilterResult.stats.totalInput} -> ${preFilterResult.stats.totalRemaining} candidates`);

      // 4. Scoring (Puanlama)
      const scoredAssets = ruleEngine.scoreAll(preFilterResult.candidates, selectionContext);

      // 5. Threshold (Eşik Altı Eleme)
      const qualifiedAssets = ruleEngine.applyThreshold(scoredAssets);

      // Log qualified counts
      Object.entries(qualifiedAssets).forEach(([cat, list]: [string, any]) => {
        if (list.length > 0) console.log(`[RuleEngine] Qualified ${cat}: ${list.length} items (Top: ${list[0].id} - ${list[0].score})`);
      });

      // 5.3. Tema Setting: preferredTags bonus
      // Spesifik tag'ler belirli masayı/tabağı/bardağı önceliklendirir (pinnedTable yerine)
      if (themeData?.setting) {
        const themeSetting = themeData.setting;

        // Preferred Tags: Eşleşen asset'lere bonus skor
        if (themeSetting.preferredTags) {
          const applyPreferredTagBonus = (assetList: any[], preferredTags?: string[]) => {
            if (!preferredTags || preferredTags.length === 0 || !assetList) return;
            assetList.forEach((asset: any) => {
              if (asset.tags && Array.isArray(asset.tags)) {
                const matchCount = asset.tags.filter((t: string) =>
                  preferredTags.some(pt => t.toLowerCase().includes(pt.toLowerCase()))
                ).length;
                if (matchCount > 0) {
                  asset.score = (asset.score || 0) + matchCount * 15;
                }
              }
            });
            // Bonus sonrası yeniden sırala
            assetList.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
          };

          applyPreferredTagBonus(qualifiedAssets.tables, themeSetting.preferredTags.table);
          applyPreferredTagBonus(qualifiedAssets.plates, themeSetting.preferredTags.plate);
          applyPreferredTagBonus(qualifiedAssets.cups, themeSetting.preferredTags.cup);

          console.log(`[Orchestrator] PreferredTags bonus uygulandı (tema: ${themeData.name})`);
        }
      }

      // 5.5. Tag-bazlı tabak filtreleme (Gemini'den önce)
      // Ürün etiketlerine göre uyumlu tabakları filtrele
      // Örn: "kruvasan" etiketli ürün → "kruvasan tabağı" etiketli tabaklar
      let effectiveAssetSelectionRules = { ...assetSelectionRules };
      if (qualifiedAssets.plates && qualifiedAssets.plates.length > 0 && qualifiedAssets.products) {
        // Ürünlerin tüm etiketlerini topla
        const productTags = new Set<string>();
        qualifiedAssets.products.forEach((p: any) => {
          if (p.tags && Array.isArray(p.tags)) {
            p.tags.forEach((tag: string) => productTags.add(tag.toLowerCase()));
          }
        });

        // Eşleşen tabakları bul (ürün etiketi + " tabağı" formatında)
        // preferredTags override: kullanıcının açık tercihi her zaman geçer
        const preferredPlateTags = (themeData?.setting?.preferredTags?.plate || []) as string[];

        const matchingPlates = qualifiedAssets.plates.filter((plate: any) => {
          if (!plate.tags || !Array.isArray(plate.tags)) return false;

          // preferredTags override: tercih edilen tabak filtreyi bypass eder
          if (preferredPlateTags.length > 0) {
            const isPreferred = plate.tags.some((t: string) =>
              preferredPlateTags.some((pt: string) => t.toLowerCase().includes(pt.toLowerCase()))
            );
            if (isPreferred) return true;
          }

          // Normal ürün-tag eşleştirmesi
          return plate.tags.some((plateTag: string) => {
            const normalizedPlateTag = plateTag.toLowerCase();
            for (const productTag of productTags) {
              if (normalizedPlateTag === `${productTag} tabağı`) {
                return true;
              }
            }
            return false;
          });
        });

        // Eşleşen tabak varsa, sadece onları kullan
        if (matchingPlates.length > 0) {
          console.log(`[Orchestrator] Tag-bazlı tabak filtreleme: ${qualifiedAssets.plates.length} -> ${matchingPlates.length} plates (matching product tags: ${Array.from(productTags).join(", ")})`);
          // usageCount'a göre sırala (düşükten yükseğe - çeşitlilik için)
          matchingPlates.sort((a: any, b: any) => (a.usageCount || 0) - (b.usageCount || 0));
          qualifiedAssets.plates = matchingPlates;
        } else {
          console.log(`[Orchestrator] Tag-bazlı tabak eşleşmesi bulunamadı (product tags: ${Array.from(productTags).join(", ")}), tüm tabaklar kullanılabilir`);
        }

        // plateRequired kontrolü: Tüm ürünlerde plateRequired: false ise tabak seçimini devre dışı bırak
        const allProductsNoPlate = qualifiedAssets.products.every((p: any) => p.plateRequired === false);
        if (allProductsNoPlate) {
          console.log(`[Orchestrator] Tüm ürünler tabaksız (plateRequired: false), tabak seçimi devre dışı`);
          qualifiedAssets.plates = []; // Boşalt ki Gemini tabak seçmesin
          effectiveAssetSelectionRules = {
            ...effectiveAssetSelectionRules,
            plate: { enabled: false },
          };
        }
      }

      // Aksesuar artık AI tarafından üretiliyor, asset seçimi gereksiz
      effectiveAssetSelectionRules = {
        ...effectiveAssetSelectionRules,
        accessory: { enabled: false },
      };

      // "Yok" tercihi: tema bu asset'i istemiyorsa devre dışı bırak
      const themePrefTags = themeData?.setting?.preferredTags as { table?: string[]; plate?: string[]; cup?: string[] } | undefined;
      if (themePrefTags?.table?.includes("__none__")) {
        qualifiedAssets.tables = [];
        effectiveAssetSelectionRules = { ...effectiveAssetSelectionRules, table: { enabled: false } };
        console.log(`[Orchestrator] Tema tercihi: masa YOK`);
      }
      if (themePrefTags?.plate?.includes("__none__")) {
        qualifiedAssets.plates = [];
        effectiveAssetSelectionRules = { ...effectiveAssetSelectionRules, plate: { enabled: false } };
        console.log(`[Orchestrator] Tema tercihi: tabak YOK`);
      }
      if (themePrefTags?.cup?.includes("__none__")) {
        qualifiedAssets.cups = [];
        effectiveAssetSelectionRules = { ...effectiveAssetSelectionRules, cup: { enabled: false } };
        console.log(`[Orchestrator] Tema tercihi: fincan YOK`);
      }

      // İçecek kurallarına göre bardak filtreleme
      // productType (croissants, pastas vb.) → beverageRules → tagMappings → uyumlu bardaklar
      let resolvedBeverageType: string | undefined; // Prompt'a aktarılacak
      if (qualifiedAssets.cups && qualifiedAssets.cups.length > 0) {
        try {
          const beverageConfig = await getBeverageRulesConfig();
          const beverageRule = beverageConfig.rules[productType];

          if (beverageRule && beverageRule.default !== "none") {
            const beverageType = beverageRule.default; // "tea", "coffee", vb.
            resolvedBeverageType = beverageType;
            const matchingTags = beverageConfig.tagMappings[beverageType] || [];

            if (matchingTags.length > 0) {
              // Bardaklardan bu etiketlerden birini içerenleri filtrele
              // preferredTags override: kullanıcının açık tercihi her zaman geçer
              const preferredCupTags = (themeData?.setting?.preferredTags?.cup || []) as string[];

              const matchingCups = qualifiedAssets.cups.filter((cup: any) => {
                if (!cup.tags || !Array.isArray(cup.tags)) return false;

                // preferredTags override: tercih edilen fincan filtreyi bypass eder
                if (preferredCupTags.length > 0) {
                  const isPreferred = cup.tags.some((t: string) =>
                    preferredCupTags.some((pt: string) => t.toLowerCase().includes(pt.toLowerCase()))
                  );
                  if (isPreferred) return true;
                }

                // Normal beverage tag eşleştirmesi
                return cup.tags.some((cupTag: string) => {
                  const normalizedCupTag = cupTag.toLowerCase();
                  return matchingTags.some(matchTag =>
                    normalizedCupTag.includes(matchTag.toLowerCase())
                  );
                });
              });

              if (matchingCups.length > 0) {
                console.log(`[Orchestrator] Bardak filtreleme: ${productType} → ${beverageType} → ${qualifiedAssets.cups.length} -> ${matchingCups.length} cups (matching tags: ${matchingTags.join(", ")})`);
                // usageCount'a göre sırala (düşükten yükseğe - çeşitlilik için)
                matchingCups.sort((a: any, b: any) => (a.usageCount || 0) - (b.usageCount || 0));
                qualifiedAssets.cups = matchingCups;
              } else {
                console.log(`[Orchestrator] Bardak eşleşmesi bulunamadı (${beverageType} tags: ${matchingTags.join(", ")}), tüm bardaklar kullanılabilir`);
              }
            }
          } else if (beverageRule?.default === "none") {
            console.log(`[Orchestrator] ${productType} için içecek yok (beverageRule: none), bardak seçimi devre dışı`);
            qualifiedAssets.cups = [];
            effectiveAssetSelectionRules = {
              ...effectiveAssetSelectionRules,
              cup: { enabled: false },
            };
          }
        } catch (err) {
          console.warn(`[Orchestrator] Bardak filtreleme hatası:`, err);
          // Hata durumunda tüm bardaklar kullanılabilir
        }
      }

      // 6. Gemini Selection (Optimization from qualified candidates)
      // Gemini'ye sadece qualified asset'leri gönderiyoruz
      // preferredTags bilgisini Gemini'ye aktar — kullanıcının açık tercihi
      const preferredTagsForGemini = themeData?.setting?.preferredTags as { table?: string[]; plate?: string[]; cup?: string[] } | undefined;

      const assetResponse = await this.gemini.selectAssets(
        productType,
        qualifiedAssets, // PRE-FILTERED & SCORED List
        timeOfDay,
        mood,
        effectiveRules,
        fixedAssets,
        effectiveAssetSelectionRules, // plateRequired kontrolü sonrası güncellenmiş kurallar
        preferredTagsForGemini
      );

      // 7. Post-Validation (Safety Check)
      let validationResult: any = { valid: true, violations: [], auditEntries: [] };
      if (assetResponse.success && assetResponse.data) {
        validationResult = ruleEngine.validateSelection(
          assetResponse.data,
          qualifiedAssets,
          selectionContext
        );

        if (!validationResult.valid) {
          console.warn("[RuleEngine] Validation violations:", validationResult.violations.map((v: any) => v.message));
          if (validationResult.correctedSelection) {
            console.log("[RuleEngine] Applying corrected selection");
            assetResponse.data = validationResult.correctedSelection;
          }
        }
      }

      // 8. Audit Logging
      await this.auditLogger.logSelectionDecision(pipelineId, {
        preFilter: preFilterResult,
        scoring: scoredAssets,
        qualified: qualifiedAssets,
        selection: assetResponse.data || {} as any,
        validation: validationResult,
      });

      // Önce maliyeti ekle (hata olsa bile API çağrısı yapıldı, maliyet oluştu)
      totalCost += assetResponse.cost || 0;

      if (!assetResponse.success || !assetResponse.data) {
        throw new Error(`Görsel seçimi başarısız: ${assetResponse.error || "Bilinmeyen hata"}`);
      }

      result.assetSelection = assetResponse.data;
      status.completedStages.push("asset_selection");

      // 8.5. Post-processing: plateRequired kontrolü
      // Seçilen ürün tabaksız ise (plateRequired: false), tabağı kaldır
      if (result.assetSelection?.product && result.assetSelection.product.plateRequired === false) {
        console.log(`[Orchestrator] Seçilen ürün tabaksız (plateRequired: false): ${result.assetSelection.product.id}, tabak kaldırıldı`);
        result.assetSelection.plate = null as any;
      }

      console.log(`[Orchestrator] Asset selection complete - Pet: ${result.assetSelection!.includesPet}, Accessory: ${result.assetSelection!.includesAccessory || false}, Plate: ${result.assetSelection!.plate?.id || "yok"}`);

      // YENİ: Asset selection decision log
      await AILogService.logDecision({
        stage: "asset-selection",
        pipelineId,
        slotId,
        productType,
        model: "gemini-2.0-flash-001",
        userPrompt: `Ürün: ${productType}, Zaman: ${timeOfDay}, Mood: ${mood}`,
        response: assetResponse.data?.selectionReasoning || "",
        status: "success",
        durationMs: 0, // Gemini service içinde hesaplanıyor
        decisionDetails: {
          selectedAssets: {
            product: {
              id: result.assetSelection!.product?.id || "",
              name: result.assetSelection!.product?.filename || "",
              filename: result.assetSelection!.product?.filename || "",
              type: "product",
              reason: assetResponse.data?.selectionReasoning,
            },
            ...(result.assetSelection!.plate && {
              plate: {
                id: result.assetSelection!.plate.id,
                name: result.assetSelection!.plate.filename,
                filename: result.assetSelection!.plate.filename,
                type: "plate",
              },
            }),
            ...(result.assetSelection!.cup && {
              cup: {
                id: result.assetSelection!.cup.id,
                name: result.assetSelection!.cup.filename,
                filename: result.assetSelection!.cup.filename,
                type: "cup",
              },
            }),
            ...(result.assetSelection!.table && {
              table: {
                id: result.assetSelection!.table.id,
                name: result.assetSelection!.table.filename,
                filename: result.assetSelection!.table.filename,
                type: "table",
              },
            }),
            ...(result.assetSelection!.napkin && {
              napkin: {
                id: result.assetSelection!.napkin.id,
                name: result.assetSelection!.napkin.filename,
                filename: result.assetSelection!.napkin.filename,
                type: "napkin",
              },
            }),
            ...(result.assetSelection!.cutlery && {
              cutlery: {
                id: result.assetSelection!.cutlery.id,
                name: result.assetSelection!.cutlery.filename,
                filename: result.assetSelection!.cutlery.filename,
                type: "cutlery",
              },
            }),
          },
        },
      });
      console.log(`[Orchestrator] 📋 Asset selection decision logged`);

      // ==========================================
      // STAGE 2: SCENARIO SELECTION
      // ==========================================
      await this.checkCancellation(slotId); // İptal kontrolü
      console.log("[Orchestrator] Stage 2: Scenario Selection");
      status.currentStage = "scenario_selection";
      if (onProgress) await onProgress("scenario_selection", 2, TOTAL_STAGES);

      // Senaryo filtreleme (tema zaten yüklendi, themeFilteredScenarios kullan)
      let filteredScenarios = themeFilteredScenarios;

      // KRİTİK: Ürün tipine göre filtrele (suggestedProducts alanı varsa)
      // Örn: Kruvasan senaryosu sadece croissants ürün tipiyle çalışmalı
      const productTypeFiltered = filteredScenarios.filter(s => {
        const scenario = s as FirestoreScenario;
        // suggestedProducts tanımlı değilse veya boşsa, tüm ürün tipleriyle uyumlu kabul et
        if (!scenario.suggestedProducts || scenario.suggestedProducts.length === 0) {
          return true;
        }
        // suggestedProducts tanımlıysa, mevcut ürün tipi listede olmalı
        return scenario.suggestedProducts.includes(effectiveProductType);
      });

      // Eğer ürün tipine göre filtreleme sonucu en az 1 senaryo varsa kullan
      if (productTypeFiltered.length > 0) {
        filteredScenarios = productTypeFiltered;
        console.log(`[Orchestrator] Product type filter applied: ${filteredScenarios.length} scenarios for ${productType}`);
      } else {
        console.log(`[Orchestrator] No scenarios specifically for ${productType}, using all theme-filtered`);
      }

      // Deprecated: scenarioPreference (tema yoksa ve eski kural varsa)
      if (!effectiveThemeId && timeSlotRule.scenarioPreference) {
        filteredScenarios = filteredScenarios.filter(s => timeSlotRule.scenarioPreference!.includes(s.id));
      }

      // Bloklanmış senaryoları çıkar (son N üretimde kullanılanlar)
      // KRİTİK: Tema seçiliyken senaryo diversity uygulanmaz — kullanıcının bilinçli tercihi
      if (effectiveThemeId) {
        console.log(`[Orchestrator] Tema seçili ("${themeData?.name}") — senaryo diversity devre dışı (kullanıcı tercihi)`);
      } else {
        filteredScenarios = filteredScenarios.filter(
          s => !effectiveRules.blockedScenarios.includes(s.id)
        );

        // Eğer tüm senaryolar bloklanmışsa, tema filtrelemesinden sonraki listeyi kullan
        if (filteredScenarios.length === 0) {
          console.log("[Orchestrator] All scenarios blocked, using theme-filtered list");
          filteredScenarios = themeFilteredScenarios.length > 0 ? themeFilteredScenarios : allScenarios;
        }
      }

      // Gemini için basitleştirilmiş senaryo listesi
      // compositionId artık senaryo tanımında sabit (Gemini seçmiyor, kullanıcı seçiyor)
      const scenariosForClaude = filteredScenarios.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        includesHands: s.includesHands,
        isInterior: s.isInterior,
        interiorType: s.interiorType,
        compositionId: s.compositionId,
      }));

      // Kullanıcı geri bildirimlerinden ipuçları al (prompt optimization'da da lazım)
      const feedbackHints = await FeedbackService.generatePromptHints();
      if (feedbackHints) {
        console.log("[Orchestrator] Feedback hints loaded for Claude");
      }

      // Kullanıcı tanımlı kuralları al (AI öğrenme sistemi)
      const aiRulesHints = await AIRulesService.generatePromptRules();
      if (aiRulesHints) {
        console.log("[Orchestrator] AI Rules loaded for Claude");
      }

      // Feedback ve kuralları birleştir
      const combinedHints = [feedbackHints, aiRulesHints].filter(Boolean).join("\n");

      // NORMAL MOD + TEK SENARYO: Gemini'ye sormadan tema senaryosunu direkt kullan
      // Token tasarrufu — seçim zaten deterministik
      let scenarioResponse: { success: boolean; data?: any; cost: number; error?: string };

      const nonInteriorFiltered = filteredScenarios.filter(s => !s.isInterior);
      if (!isAutoMode && nonInteriorFiltered.length === 1) {
        const directScenario = nonInteriorFiltered[0];
        console.log(`[Orchestrator] NORMAL MOD: Tek senaryo "${directScenario.name}" — Gemini senaryo seçimi ATLANDI (token tasarrufu)`);

        // El stili seçimi (senaryo el içeriyorsa)
        let handStyle: string | undefined;
        let handStyleDetails: any;
        if (directScenario.includesHands) {
          const selectedHandStyle = this.rulesService.selectHandStyle(
            effectiveRules.blockedHandStyles,
            effectiveRules.staticRules.handStyles
          );
          handStyle = selectedHandStyle.id;
          handStyleDetails = selectedHandStyle;
        }

        scenarioResponse = {
          success: true,
          cost: 0,
          data: {
            scenarioId: directScenario.id,
            scenarioName: directScenario.name,
            scenarioDescription: directScenario.description || "",
            compositionId: directScenario.compositionId || "default",
            includesHands: directScenario.includesHands,
            handStyle,
            handStyleDetails,
            reasoning: "Normal mod — tek senaryo, Gemini seçimi atlandı",
          },
        };
      } else {
        // Çoklu senaryo veya rastgele mod — Gemini seçsin
        scenarioResponse = await this.gemini.selectScenario(
          productType,
          timeOfDay,
          result.assetSelection!,
          scenariosForClaude,
          effectiveRules, // Çeşitlilik kurallarını da gönder
          combinedHints // Kullanıcı geri bildirimleri + AI kuralları
        );
      }

      // Önce maliyeti ekle (hata olsa bile API çağrısı yapıldı)
      totalCost += scenarioResponse.cost || 0;

      if (!scenarioResponse.success || !scenarioResponse.data) {
        throw new Error(`Senaryo seçimi başarısız: ${scenarioResponse.error || "Bilinmeyen hata"}`);
      }

      // Interior senaryosu mu kontrol et
      const selectedScenario = filteredScenarios.find(s => s.id === scenarioResponse.data?.scenarioId);
      const isInteriorScenario = selectedScenario?.isInterior || false;
      const interiorType = selectedScenario?.interiorType;

      // compositionId artık senaryo tanımından alınır (Gemini'nin seçimi değil, kullanıcının seçimi)
      const predefinedCompositionId = selectedScenario?.compositionId || "default";

      result.scenarioSelection = {
        ...scenarioResponse.data,
        // KRİTİK: scenarioDescription'ı Firestore'dan al (Gemini döndürmezse fallback)
        scenarioDescription: scenarioResponse.data.scenarioDescription || selectedScenario?.description || "",
        // compositionId: Senaryo tanımındaki sabit değer kullanılır
        compositionId: predefinedCompositionId,
        isInterior: isInteriorScenario,
        interiorType: interiorType,
        themeId: effectiveThemeId,
        themeName: themeData?.name,
      };

      console.log(`[Orchestrator] Using predefined compositionId: ${predefinedCompositionId}`);
      status.completedStages.push("scenario_selection");

      console.log(`[Orchestrator] Scenario selected: ${result.scenarioSelection!.scenarioName}, isInterior: ${isInteriorScenario}`);

      // NOT: Atmosfer bilgisi artık Senaryo içinde tutulmuyor
      // Mood collection tamamen kaldırıldı

      // YENİ: Scenario selection decision log
      await AILogService.logDecision({
        stage: "scenario-selection",
        pipelineId,
        slotId,
        productType,
        model: "gemini-2.0-flash-001",
        userPrompt: `Ürün: ${productType}, Zaman: ${timeOfDay}, Asset: ${result.assetSelection!.product?.filename || "bilinmiyor"}`,
        response: scenarioResponse.data?.reasoning || "",
        status: "success",
        durationMs: 0,
        decisionDetails: {
          selectedScenario: {
            id: result.scenarioSelection!.scenarioId,
            name: result.scenarioSelection!.scenarioName,
            description: result.scenarioSelection!.scenarioDescription,
            includesHands: result.scenarioSelection!.includesHands || false,
            handStyle: result.scenarioSelection!.handStyle,
            compositionId: result.scenarioSelection!.compositionId,
            compositionNotes: result.scenarioSelection!.composition,
            reason: scenarioResponse.data?.reasoning,
          },
        },
      });
      console.log(`[Orchestrator] 📋 Scenario selection decision logged`);

      // ══════════════════════════════════════════════════════════════════════
      // INTERIOR SENARYO AKIŞI - AI görsel üretimi ATLANIR
      // ══════════════════════════════════════════════════════════════════════
      if (isInteriorScenario) {
        console.log(`[Orchestrator] Interior scenario detected - skipping AI image generation`);
        console.log(`[Orchestrator] Interior type: ${interiorType}`);

        // Interior asset seç
        const selectedInterior = selectInteriorAsset(assets.interior, interiorType);

        if (!selectedInterior) {
          const typeLabel = interiorType || "herhangi";
          throw new Error(`İç mekan görseli bulunamadı (tip: ${typeLabel}). Assets sayfasından "interior" kategorisinde "${typeLabel}" alt tipinde görsel ekleyin.`);
        }

        console.log(`[Orchestrator] Selected interior asset: ${selectedInterior.filename}`);

        // Asset selection'a interior bilgisini ekle
        result.assetSelection = {
          ...result.assetSelection!,
          interior: selectedInterior,
          isInteriorScenario: true,
        } as AssetSelection;

        // Stage 3, 4, 5 atlanıyor - prompt ve görsel üretimi yok
        status.completedStages.push("prompt_optimization");
        status.completedStages.push("image_generation");
        status.completedStages.push("quality_control");

        // Interior görseli doğrudan kullan
        result.generatedImage = {
          imageBase64: "", // Interior için base64 gerekmiyor, storageUrl yeterli
          mimeType: "image/jpeg",
          model: "interior-asset", // AI modeli kullanılmadı
          cost: 0,
          generatedAt: Date.now(),
          attemptNumber: 0,
          storageUrl: selectedInterior.storageUrl,
        };

        result.qualityControl = {
          passed: true,
          score: 10,
          evaluation: {
            productAccuracy: 10,
            composition: 10,
            lighting: 10,
            realism: 10,
            instagramReadiness: 10,
          },
          feedback: "Interior asset - Real photo, no AI generation needed",
          shouldRegenerate: false,
        };

        result.optimizedPrompt = {
          mainPrompt: `Interior photo: ${selectedInterior.filename}`,
          negativePrompt: "",
          customizations: [],
          aspectRatio: overrideAspectRatio || "9:16",
          faithfulness: 1.0, // Gerçek fotoğraf olduğu için 1.0
        };

        if (onProgress) await onProgress("interior_asset_selected", 4, TOTAL_STAGES);
        console.log(`[Orchestrator] Interior asset selected, proceeding to content creation`);

        // Stage 6'ya atla (Content Creation)
      } else {
        // ══════════════════════════════════════════════════════════════════════
        // NORMAL AKIŞ - AI görsel üretimi
        // ══════════════════════════════════════════════════════════════════════

        // ==========================================
        // STAGE 3: PROMPT OPTIMIZATION (Gemini Terminolojisi)
        // ==========================================
        await this.checkCancellation(slotId); // İptal kontrolü
        console.log("[Orchestrator] Stage 3: Prompt Optimization");
        status.currentStage = "prompt_optimization";
        if (onProgress) await onProgress("prompt_optimization", 3, TOTAL_STAGES);

        // Senaryo Gemini ayarlarını al (varsa)
        // NOT: lightingPreset artık Senaryo'dan değil, Mood'dan geliyor
        const scenarioGeminiData = selectedScenario ? {
          handPose: selectedScenario.handPose,
          compositionEntry: selectedScenario.compositionEntry,
        } : undefined;

        // Gemini-native prompt oluştur
        // KRİTİK: scenarioDescription'ı Gemini'ye aktarıyoruz (ortam/mekan bilgisi)
        const basePromptResult = await this.getScenarioPrompt(
          result.scenarioSelection!.scenarioId,
          result.scenarioSelection!.compositionId,
          result.scenarioSelection!.handStyle,
          result.assetSelection!, // selectedCup yerine tüm selection
          mood, // Tema'dan gelen mood bilgisi
          productType,
          timeOfDay,
          scenarioGeminiData,
          result.scenarioSelection!.scenarioDescription, // KRİTİK: Ortam bilgisi
          {
            weather: moodDetails.weather,
            lightingPrompt: moodDetails.lightingPrompt,
            colorGradePrompt: moodDetails.colorGradePrompt,
            description: moodDetails.description,
            timeOfDay: moodDetails.timeOfDay,
            season: moodDetails.season,
          },
          themeData?.description,
          themeData,
          resolvedBeverageType, // İçecek tipi: "tea", "coffee" vb.
          accessoryAllowed, // Tema izni: AI dekoratif aksesuar üretsin mi?
          themeData?.accessoryOptions as string[] | undefined // Kullanıcının seçtiği aksesuar listesi
        );

        console.log(`[Orchestrator] Base prompt built with Gemini terminology`);

        // Ürünün yeme şeklini al (eatingMethod)
        const productEatingMethod = result.assetSelection!.product?.eatingMethod
          || result.assetSelection!.product?.holdingType
          || undefined;

        const promptResponse = await this.gemini.optimizePrompt(
          basePromptResult.mainPrompt,
          result.scenarioSelection!,
          result.assetSelection!,
          combinedHints, // Kullanıcı tanımlı kurallar + feedback'ler
          productEatingMethod,
          assetSelectionRules // Config'den gelen asset seçim kuralları
        );

        // Önce maliyeti ekle (hata olsa bile API çağrısı yapıldı)
        totalCost += promptResponse.cost || 0;

        if (!promptResponse.success || !promptResponse.data) {
          throw new Error(`Prompt oluşturma başarısız: ${promptResponse.error || "Bilinmeyen hata"}`);
        }

        // Gemini'den gelen negative prompt ile Claude'dan gelen negative prompt'u birleştir
        const combinedNegativePrompt = [
          basePromptResult.negativePrompt,
          promptResponse.data.negativePrompt,
        ].filter(Boolean).join(", ");

        result.optimizedPrompt = {
          mainPrompt: promptResponse.data.optimizedPrompt,
          negativePrompt: combinedNegativePrompt,
          customizations: promptResponse.data.customizations,
          aspectRatio: overrideAspectRatio || "9:16",
          faithfulness: 0.8,
        };
        status.completedStages.push("prompt_optimization");

        // Prompt building decision log — tüm karar zinciri
        await AILogService.logDecision({
          stage: "prompt-building",
          pipelineId,
          slotId,
          productType,
          model: "gemini-2.0-flash-001",
          userPrompt: `Base Prompt (${basePromptResult.promptBuildingSteps?.length || 0} karar adımı): ${basePromptResult.mainPrompt.substring(0, 200)}...`,
          response: JSON.stringify({ customizations: promptResponse.data.customizations }),
          status: "success",
          durationMs: 0,
          decisionDetails: {
            promptDetails: {
              mainPrompt: result.optimizedPrompt.mainPrompt,
              negativePrompt: result.optimizedPrompt.negativePrompt,
              customizations: result.optimizedPrompt.customizations,
            },
            promptBuildingSteps: basePromptResult.promptBuildingSteps,
          },
        });
        console.log(`[Orchestrator] 📋 Prompt building decision logged (${basePromptResult.promptBuildingSteps?.length || 0} steps)`);

        // ==========================================
        // STAGE 4: IMAGE GENERATION (with retry)
        // ==========================================
        await this.checkCancellation(slotId); // İptal kontrolü
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
            // Ürün görselini yükle (Cloudinary veya Firebase Storage)
            const productAsset = result.assetSelection!.product;
            console.log(`[Orchestrator] ASSET DEBUG: Selected product: ${productAsset.filename}`);
            console.log(`[Orchestrator] ASSET DEBUG: Product ID: ${productAsset.id}`);
            console.log(`[Orchestrator] ASSET DEBUG: Asset keys: ${Object.keys(productAsset).join(", ")}`);
            console.log(`[Orchestrator] ASSET DEBUG: Cloudinary URL: ${productAsset.cloudinaryUrl || "N/A"}`);
            console.log(`[Orchestrator] ASSET DEBUG: Storage URL: ${productAsset.storageUrl || "N/A"}`);

            const productImageBase64 = await loadImageAsBase64(productAsset, this.storage);
            console.log(`[Orchestrator] ASSET DEBUG: Loaded image size: ${productImageBase64.length} chars (base64)`);

            // Load reference images (plate, table, cup) if selected
            // Asset objelerini doğrudan gönderiyoruz - Cloudinary URL varsa otomatik kullanılacak
            const referenceImages: Array<{ base64: string; mimeType: string; label: string; description?: string }> = [];

            if (result.assetSelection!.plate) {
              const plateAsset = result.assetSelection!.plate;
              console.log(`[Orchestrator] Loading plate: ${plateAsset.filename}`);
              const plateBase64 = await loadImageAsBase64(plateAsset, this.storage);
              referenceImages.push({ base64: plateBase64, mimeType: "image/png", label: "plate" });
            }

            if (result.assetSelection!.table) {
              const tableAsset = result.assetSelection!.table;
              console.log(`[Orchestrator] Loading table: ${tableAsset.filename}`);
              const tableBase64 = await loadImageAsBase64(tableAsset, this.storage);
              referenceImages.push({ base64: tableBase64, mimeType: "image/png", label: "table" });
            }

            if (result.assetSelection!.cup) {
              const cupAsset = result.assetSelection!.cup;
              console.log(`[Orchestrator] Loading cup: ${cupAsset.filename}`);
              const cupBase64 = await loadImageAsBase64(cupAsset, this.storage);

              // Cup için kısa açıklama (RADİKAL SADELEŞTİRME v2.0)
              const cupColors = cupAsset.visualProperties?.dominantColors?.join(", ") || "";
              const cupMaterial = cupAsset.visualProperties?.material || "ceramic";
              const cupDescription = `${cupColors} ${cupMaterial}`.trim();

              referenceImages.push({
                base64: cupBase64,
                mimeType: "image/png",
                label: "cup",
                description: cupDescription || undefined
              });
            }

            // Napkin (peçete) referans görseli
            if (result.assetSelection!.napkin) {
              const napkinAsset = result.assetSelection!.napkin;
              console.log(`[Orchestrator] Loading napkin: ${napkinAsset.filename}`);
              const napkinBase64 = await loadImageAsBase64(napkinAsset, this.storage);

              const napkinColors = napkinAsset.visualProperties?.dominantColors?.join(", ") || "";
              const napkinMaterial = napkinAsset.visualProperties?.material || "fabric";
              const napkinDescription = `${napkinColors} ${napkinMaterial}`.trim();

              referenceImages.push({
                base64: napkinBase64,
                mimeType: "image/png",
                label: "napkin",
                description: napkinDescription || undefined
              });
            }

            // Cutlery (çatal-bıçak) referans görseli
            if (result.assetSelection!.cutlery) {
              const cutleryAsset = result.assetSelection!.cutlery;
              console.log(`[Orchestrator] Loading cutlery: ${cutleryAsset.filename}`);
              const cutleryBase64 = await loadImageAsBase64(cutleryAsset, this.storage);

              const cutleryMaterial = cutleryAsset.visualProperties?.material || "metal";
              const cutleryStyle = cutleryAsset.visualProperties?.style || "";
              const cutleryDescription = `${cutleryMaterial} ${cutleryStyle}`.trim();

              referenceImages.push({
                base64: cutleryBase64,
                mimeType: "image/png",
                label: "cutlery",
                description: cutleryDescription
              });
            }

            console.log(`[Orchestrator] Sending ${referenceImages.length} reference images to ${this.imageProvider.toUpperCase()}`);

            // Görsel üret (Reve veya Gemini)
            let imageResult: { imageBase64: string; mimeType: string; model: string; cost: number };

            if (this.imageProvider === "reve" && this.reve) {
              // REVE ile görsel üret
              // Reve edit endpoint sadece tek referans görsel alıyor
              // Diğer referansları prompt'a açıklama olarak ekliyoruz
              this.reve.setPipelineContext({
                pipelineId: status.startedAt.toString(),
                slotId: slotId,
                productType: result.assetSelection?.product?.subType,
              });

              const reveResult = await this.reve.transformImage(
                productImageBase64,
                "image/png",
                {
                  prompt: result.optimizedPrompt.mainPrompt,
                  negativePrompt: result.optimizedPrompt.negativePrompt,
                  aspectRatio: result.optimizedPrompt.aspectRatio as "1:1" | "9:16" | "16:9" | "4:3" | "3:4" | "3:2" | "2:3" | undefined,
                  referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
                }
              );

              imageResult = {
                imageBase64: reveResult.imageBase64,
                mimeType: reveResult.mimeType,
                model: reveResult.model,
                cost: reveResult.cost,
              };
            } else {
              // GEMINI ile görsel üret (varsayılan)
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

              imageResult = {
                imageBase64: geminiResult.imageBase64,
                mimeType: geminiResult.mimeType,
                model: geminiResult.model,
                cost: geminiResult.cost,
              };
            }

            generatedImage = {
              imageBase64: imageResult.imageBase64,
              mimeType: imageResult.mimeType,
              model: imageResult.model,
              cost: imageResult.cost,
              generatedAt: Date.now(),
              attemptNumber: generationAttempt,
            };

            totalCost += imageResult.cost;
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

          const qcResponse = await this.gemini.evaluateImage(
            generatedImage.imageBase64,
            generatedImage.mimeType,
            result.scenarioSelection!,
            result.assetSelection!.product
          );

          totalCost += qcResponse.cost;

          if (!qcResponse.success || !qcResponse.data) {
            console.warn(`[Orchestrator] QC failed: ${qcResponse.error}`);
            continue;
          }

          qualityResult = qcResponse.data;

          // Kalite kontrolü geçti mi?
          if (qualityResult!.passed) {
            console.log(`[Orchestrator] QC passed with score: ${qualityResult!.score}/10`);
            break;
          }

          // Yeniden üretim gerekli
          if (qualityResult!.shouldRegenerate && qualityResult!.regenerationHints) {
            console.log(`[Orchestrator] QC failed (${qualityResult!.score}/10), regenerating...`);
            // Prompt'u güncelle
            result.optimizedPrompt!.mainPrompt += `\n\nIMPROVEMENT: ${qualityResult!.regenerationHints}`;
          }
        }

        if (!generatedImage || !qualityResult) {
          throw new Error("Görsel üretimi tüm denemelerde başarısız oldu. Lütfen tekrar deneyin.");
        }

        result.generatedImage = generatedImage;
        result.qualityControl = qualityResult;
        status.completedStages.push("image_generation");
        status.completedStages.push("quality_control");

        // Görseli Storage'a kaydet
        const storageUrl = await saveImageToStorage(generatedImage.imageBase64, generatedImage.mimeType, this.storage);
        result.generatedImage.storageUrl = storageUrl;

        // YENİ: Image generation detaylı log
        const referenceImagesList: Array<{ type: string; filename: string }> = [];
        if (result.assetSelection!.product) {
          referenceImagesList.push({ type: "product", filename: result.assetSelection!.product.filename });
        }
        if (result.assetSelection!.plate) {
          referenceImagesList.push({ type: "plate", filename: result.assetSelection!.plate.filename });
        }
        if (result.assetSelection!.table) {
          referenceImagesList.push({ type: "table", filename: result.assetSelection!.table.filename });
        }
        if (result.assetSelection!.cup) {
          referenceImagesList.push({ type: "cup", filename: result.assetSelection!.cup.filename });
        }
        if (result.assetSelection!.napkin) {
          referenceImagesList.push({ type: "napkin", filename: result.assetSelection!.napkin.filename });
        }
        if (result.assetSelection!.cutlery) {
          referenceImagesList.push({ type: "cutlery", filename: result.assetSelection!.cutlery.filename });
        }

        await AILogService.logGeminiDetailed("image-generation", {
          model: generatedImage.model,
          userPrompt: result.optimizedPrompt!.mainPrompt,
          negativePrompt: result.optimizedPrompt!.negativePrompt,
          status: "success",
          cost: generatedImage.cost,
          durationMs: 0,
          inputImageCount: referenceImagesList.length,
          outputImageGenerated: true,
          pipelineId,
          slotId,
          productType,
          retryInfo: {
            attemptNumber: generatedImage.attemptNumber,
            maxAttempts: this.config.maxRetries,
          },
          decisionDetails: {
            promptDetails: {
              mainPrompt: result.optimizedPrompt!.mainPrompt,
              negativePrompt: result.optimizedPrompt!.negativePrompt,
              customizations: result.optimizedPrompt!.customizations,
              referenceImages: referenceImagesList,
            },
          },
        });
        console.log(`[Orchestrator] 📋 Image generation logged with ${referenceImagesList.length} reference images`);
      } // else bloğu sonu (normal akış - AI görsel üretimi)

      // ==========================================
      // STAGE 6: TELEGRAM APPROVAL (eski Stage 7)
      // NOT: Content Creation (caption/hashtag) kaldırıldı - Instagram API caption desteklemiyor
      // ==========================================
      console.log("[Orchestrator] Stage 6: Telegram Approval");
      status.currentStage = "telegram_approval";
      if (onProgress) await onProgress("telegram_approval", 6, TOTAL_STAGES);

      const telegramMessageId = await this.sendTelegramApproval(result);
      result.telegramMessageId = telegramMessageId;
      result.approvalStatus = "pending";

      status.completedStages.push("telegram_approval");

      // Final
      result.totalCost = totalCost;
      result.completedAt = Date.now();
      result.totalDuration = result.completedAt - startedAt;

      console.log(`[Orchestrator] Pipeline completed in ${result.totalDuration}ms, cost: $${totalCost.toFixed(4)}`);

      // Kullanılan asset'lerin usageCount'unu artır
      await this.incrementAssetUsageCounts(result.assetSelection);

      // ÇEŞİTLİLİK İÇİN: Üretim geçmişine kaydet
      // Bu kayıt blockedProducts, blockedScenarios vs. için kullanılır
      // Interior senaryolarda scenarioId "interior" olarak kaydedilir
      const isInterior = result.scenarioSelection?.isInterior === true;
      const historySuccess = await this.rulesService.addToHistory({
        timestamp: Date.now(),
        scenarioId: isInterior ? "interior" : (result.scenarioSelection?.scenarioId || "unknown"),
        compositionId: isInterior ? "interior-default" : (result.scenarioSelection?.compositionId || "default"),
        tableId: result.assetSelection?.table?.id || null,
        handStyleId: result.scenarioSelection?.handStyle || null,
        includesPet: !!result.assetSelection?.pet,
        productType: productType,
        productId: result.assetSelection?.product?.id || null,
        plateId: result.assetSelection?.plate?.id || null,
        cupId: result.assetSelection?.cup?.id || null,
      });

      if (!historySuccess) {
        console.warn("[Orchestrator] ⚠️ Production history save failed - diversity tracking may be affected");
      }
      console.log(`[Orchestrator] Production history updated - product: ${result.assetSelection?.product?.id}, scenario: ${isInterior ? "interior" : result.scenarioSelection?.scenarioId}`);

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
   *
   * v2: Dinamik kategori desteği
   * - productType parametresi slug veya ID olabilir
   * - Kategori validasyonu dinamik kategorilerden yapılır
   * - Graceful skip: Geçersiz kategoriler loglanır ama hata fırlatmaz
   *
   * @param productType - Ürün alt kategorisi (slug: "croissants" veya ID: "products_croissants")
   */
  private async loadAvailableAssets(productType: string): Promise<{
    products: Asset[];
    plates: Asset[];
    cups: Asset[];
    tables: Asset[];
    decor: Asset[];
    pets: Asset[];
    environments: Asset[];
    interior: Asset[];
    exterior: Asset[];
    accessories: Asset[];
    napkins: Asset[];
    cutlery: Asset[];
  }> {
    const assetsRef = this.db.collection("assets");

    // Dinamik kategori validasyonu
    // productType bir ID olabilir (products_croissants) veya slug (croissants)
    let resolvedSlug = productType;

    // ID formatında mı kontrol et (categoryType_slug formatı)
    if (productType.includes("_")) {
      const slug = await categoryService.getSlugBySubTypeId(productType);
      if (slug) {
        resolvedSlug = slug;
        console.log(`[Orchestrator] Resolved ID '${productType}' to slug '${resolvedSlug}'`);
      } else {
        // Graceful skip: ID bulunamadı, slug olarak dene
        console.warn(`[Orchestrator] ID '${productType}' not found, trying as slug`);
        resolvedSlug = productType.split("_").pop() || productType;
      }
    }

    // Slug validasyonu (graceful - sadece warning)
    const isValidSlug = await categoryService.validateSlug(resolvedSlug, "products");
    if (!isValidSlug) {
      console.warn(`[Orchestrator] Product type '${resolvedSlug}' not found in dynamic categories. Proceeding anyway (graceful skip).`);
    }

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
      interior,
      exterior,
      accessories,
      napkins,
      cutlery,
    ] = await Promise.all([
      // Ürünler - dinamik slug kullan
      assetsRef.where("category", "==", "products").where("subType", "==", resolvedSlug).where("isActive", "==", true).get(),
      // Tabaklar
      assetsRef.where("category", "==", "props").where("subType", "==", "plates").where("isActive", "==", true).get(),
      // Fincanlar
      assetsRef.where("category", "==", "props").where("subType", "==", "cups").where("isActive", "==", true).get(),
      // Masalar (İngilizce)
      assetsRef.where("category", "==", "furniture").where("subType", "==", "tables").where("isActive", "==", true).get(),
      // Masalar (Türkçe - legacy fallback)
      assetsRef.where("category", "==", "Mobilya").where("subType", "==", "Masa").where("isActive", "==", true).get(),
      // Dekorasyon (İngilizce)
      assetsRef.where("category", "==", "furniture").where("subType", "==", "decor").where("isActive", "==", true).get(),
      // Dekorasyon (Türkçe - legacy fallback)
      assetsRef.where("category", "==", "Aksesuar").where("isActive", "==", true).get(),
      // Evcil hayvanlar (köpek)
      assetsRef.where("category", "==", "pets").where("isActive", "==", true).get(),
      // Mekan/ortam görselleri
      assetsRef.where("category", "==", "environments").where("isActive", "==", true).get(),
      // Interior görselleri (pastane atmosferi - AI üretimi yapılmaz)
      assetsRef.where("category", "==", "interior").where("isActive", "==", true).get(),
      // Exterior görselleri (dış mekan - AI üretimi yapılmaz)
      assetsRef.where("category", "==", "exterior").where("isActive", "==", true).get(),
      // Aksesuarlar (telefon, çanta, anahtar, kitap vb.)
      assetsRef.where("category", "==", "accessories").where("isActive", "==", true).get(),
      // Peçeteler
      assetsRef.where("category", "==", "props").where("subType", "==", "napkins").where("isActive", "==", true).get(),
      // Çatal-Bıçak
      assetsRef.where("category", "==", "props").where("subType", "==", "cutlery").where("isActive", "==", true).get(),
    ]);

    let fallbackProps: FirebaseFirestore.QuerySnapshot | null = null;
    if (napkins.docs.length === 0 || cutlery.docs.length === 0) {
      fallbackProps = await assetsRef.where("category", "==", "props").where("isActive", "==", true).get();
    }

    const fallbackAssets = fallbackProps
      ? fallbackProps.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset))
      : [];

    const getSubType = (asset: Asset) => (asset.subType || "").toString().toLowerCase();
    const fallbackNapkins = napkins.docs.length === 0
      ? fallbackAssets.filter(asset => getSubType(asset).includes("napkin"))
      : [];
    const fallbackCutlery = cutlery.docs.length === 0
      ? fallbackAssets.filter(asset => getSubType(asset).includes("cutlery"))
      : [];

    const napkinMap = new Map<string, Asset>();
    for (const doc of napkins.docs) {
      napkinMap.set(doc.id, { id: doc.id, ...doc.data() } as Asset);
    }
    for (const asset of fallbackNapkins) {
      if (!napkinMap.has(asset.id)) {
        napkinMap.set(asset.id, asset);
      }
    }

    const cutleryMap = new Map<string, Asset>();
    for (const doc of cutlery.docs) {
      cutleryMap.set(doc.id, { id: doc.id, ...doc.data() } as Asset);
    }
    for (const asset of fallbackCutlery) {
      if (!cutleryMap.has(asset.id)) {
        cutleryMap.set(asset.id, asset);
      }
    }

    const napkinAssets = Array.from(napkinMap.values());
    const cutleryAssets = Array.from(cutleryMap.values());

    const allTables = [
      ...tables.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      ...tablesAlt.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
    ];

    const allDecor = [
      ...decor.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      ...decorAlt.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
    ];

    // Graceful skip pattern: Asset bulunamadığında warning ver ama devam et
    if (products.docs.length === 0) {
      console.warn(`[Orchestrator] No product assets found for '${resolvedSlug}'. Check if assets exist for this category.`);
    }
    if (fallbackProps && napkins.docs.length === 0 && napkinAssets.length === 0) {
      console.warn("[Orchestrator] No napkin assets found. Verify assets category/subType values in Firestore.");
    }
    if (fallbackProps && cutlery.docs.length === 0 && cutleryAssets.length === 0) {
      console.warn("[Orchestrator] No cutlery assets found. Verify assets category/subType values in Firestore.");
    }

    console.log(`[Orchestrator] Assets found - products: ${products.docs.length} (${resolvedSlug}), plates: ${plates.docs.length}, cups: ${cups.docs.length}, tables: ${allTables.length}, decor: ${allDecor.length}, pets: ${pets.docs.length}, environments: ${environments.docs.length}, interior: ${interior.docs.length}, exterior: ${exterior.docs.length}, accessories: ${accessories.docs.length}, napkins: ${napkinAssets.length}, cutlery: ${cutleryAssets.length}`);

    return {
      products: products.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      plates: plates.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      cups: cups.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      tables: allTables,
      decor: allDecor,
      pets: pets.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      environments: environments.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      interior: interior.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      exterior: exterior.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      accessories: accessories.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      napkins: napkinAssets,
      cutlery: cutleryAssets,
    };
  }

  // NOT: getTimeOfDay(), getMoodFromTime(), selectInteriorAsset() metodları
  // ./helpers ve ./stages modüllerine taşındı (Faz 2 refactoring)

  /**
   * Senaryo prompt'unu al (Firestore veya Gemini builder)
   * compositionId ve handStyle parametreleri ile detaylı prompt üretir
   * mood parametresi ile atmosfer bilgisi eklenir
   *
   * Yeni: Gemini terminolojisi ile zenginleştirilmiş prompt
   * KRİTİK: scenarioDescription parametresi ortam bilgisi için zorunlu
   * GÜNCELLEME: selectedCup yerine selectedAssets tüm assetler için
   */
  private async getScenarioPrompt(
    scenarioId: string,
    compositionId?: string,
    handStyle?: string,
    selectedAssets?: AssetSelection,
    mood?: string,
    productType?: string,
    timeOfDay?: string,
    scenarioData?: {
      // lightingPreset kaldırıldı - Işık artık Mood'dan geliyor
      handPose?: string;
      compositionEntry?: string;
    },
    scenarioDescription?: string, // KRİTİK: Senaryo açıklaması - ortam bilgisi için
    moodDetails?: {
      weather?: string;
      lightingPrompt?: string;
      colorGradePrompt?: string;
      description?: string;
      timeOfDay?: string;
      season?: string;
    },
    themeDescription?: string,
    themeData?: FirebaseFirestore.DocumentData,
    beverageType?: string, // İçecek tipi: "tea", "coffee" vb.
    accessoryAllowed?: boolean, // Tema izni: AI dekoratif aksesuar üretsin mi?
    accessoryOptions?: string[] // Kullanıcının seçtiği aksesuar listesi
  ): Promise<{ mainPrompt: string; negativePrompt?: string; promptBuildingSteps?: Array<{ step: string; input: string | null; matched: boolean; result: string | null; fallback: boolean; details?: Record<string, unknown> }> }> {
    // Firestore'dan prompt şablonunu çek
    const promptDoc = await this.db.collection("scenario-prompts").doc(scenarioId).get();

    if (promptDoc.exists) {
      // Firestore'dan gelen prompt'a kompozisyon ve el stili ekle
      let prompt = promptDoc.data()?.prompt || "";

      // Senaryo açıklamasını SCENE DIRECTION olarak ekle (referans görseller her zaman öncelikli)
      if (scenarioDescription) {
        prompt += `\n\nSCENE DIRECTION (creative guidance - reference images always take precedence):\n${scenarioDescription}\nNOTE: This describes the desired scene composition. Always prioritize visual evidence from reference images over this description.\n`;
        console.log(`[Orchestrator] getScenarioPrompt: scenarioDescription ACTIVE (${scenarioDescription.substring(0, 30)}...)`);
      }

      prompt += await this.getCompositionDetails(scenarioId, compositionId);
      prompt += this.getHandStyleDetails(handStyle);
      prompt += this.getCupReferenceDetails(selectedAssets?.cup);

      // Negative prompt'u da oluştur
      const negativePrompt = await buildNegativePrompt(handStyle ? ["always", "hands"] : ["always"]);

      return { mainPrompt: prompt, negativePrompt };
    }

    // Gemini builder ile dinamik prompt oluştur
    return this.buildDynamicPromptWithGemini(
      scenarioId,
      compositionId,
      handStyle,
      selectedAssets,
      mood,
      productType,
      timeOfDay,
      scenarioData,
      scenarioDescription, // KRİTİK: Senaryo açıklamasını aktar
      moodDetails,
      themeDescription,
      themeData?.setting,
      beverageType,
      accessoryAllowed,
      accessoryOptions
    );
  }

  /**
   * Kompozisyon detaylarını döndür (Firestore'dan dinamik, fallback hardcoded)
   */
  private async getCompositionDetails(scenarioId: string, compositionId?: string): Promise<string> {
    if (!compositionId || compositionId === "default") return "";

    // 1. Önce Firestore'dan dinamik kompozisyon şablonunu dene
    const dynamicComp = await getCompositionTemplate(compositionId);
    if (dynamicComp) {
      console.log(`[Orchestrator] Using dynamic composition: ${dynamicComp.id} - ${dynamicComp.name}`);
      return `

COMPOSITION - ${dynamicComp.nameEn.toUpperCase()}:
${dynamicComp.geminiPrompt}`;
    }

    // 2. Fallback: Hardcoded senaryo-spesifik kompozisyonlar
    const legacyCompositions: Record<string, Record<string, string>> = {
      "kahve-ani": {
        "product-front": `

COMPOSITION - PRODUCT FRONT:
- Product in FOREGROUND, occupying 55% of frame, SHARP FOCUS (f/2.8)
- Hands holding cup in BACKGROUND, SOFT BOKEH BLUR (f/1.8)
- Product positioned in lower-center of frame
- Cup and hands in upper-third, creating depth
- Distance between product and hands: 30-40cm visual depth
- Product is the HERO, hands are atmospheric backdrop`,

        "product-side": `

COMPOSITION - PRODUCT SIDE:
- Product on LEFT third of frame, SHARP FOCUS
- Hands holding cup on RIGHT third, MEDIUM FOCUS
- Both elements at SAME focal plane (f/4.0)
- Diagonal composition from bottom-left to top-right
- Product and cup at 45-degree angle to each other
- Arms entering frame from RIGHT side at hip height
- Creates conversational, intimate feeling`,

        "overhead": `

COMPOSITION - OVERHEAD (BIRD'S EYE):
- Camera angle: STRAIGHT DOWN, 90-degree top view
- Product in LOWER half of frame
- Cup with hands in UPPER half of frame
- Both elements EQUALLY SHARP (f/5.6)
- Table surface fills entire background
- Hands visible from ABOVE - palms partially showing
- Fingertips at 10 and 2 o'clock positions on cup
- Clean negative space between product and cup`,
      },

      "zarif-tutma": {
        "bottom-right": `

COMPOSITION - BOTTOM RIGHT ENTRY:
- Hand entering frame from BOTTOM-RIGHT corner
- Wrist at 45-degree angle, fingers pointing upper-left
- Product held in palm center, tilted 15-degrees toward camera
- Hand occupies lower-right 40% of frame
- Product centered in overall composition
- Background visible in upper-left quadrant`,

        "bottom-left": `

COMPOSITION - BOTTOM LEFT ENTRY:
- Hand entering frame from BOTTOM-LEFT corner
- Wrist at 45-degree angle, fingers pointing upper-right
- Product held delicately between thumb and fingers
- Hand occupies lower-left 40% of frame
- Product centered in overall composition
- Background visible in upper-right quadrant`,

        "top-corner": `

COMPOSITION - TOP CORNER ENTRY:
- Hand entering frame from TOP-RIGHT corner
- Arm visible from elbow down, descending into frame
- Product held between fingertips, presented downward
- Creates dramatic, editorial feel
- Product in center-lower portion of frame
- Unusual angle creates visual interest`,

        "center-hold": `

COMPOSITION - CENTER HOLD:
- Product perfectly centered in frame
- Both hands cupping product from below
- Hands form protective, presenting gesture
- Fingers spread naturally around product
- Thumbs visible on sides
- Product elevated slightly toward camera
- Symmetrical, balanced composition`,
      },
    };

    const legacyResult = legacyCompositions[scenarioId]?.[compositionId];
    if (legacyResult) {
      console.log(`[Orchestrator] Using legacy hardcoded composition for scenario: ${scenarioId}, composition: ${compositionId}`);
    }

    return legacyResult || "";
  }

  /**
   * El stili detaylarını döndür
   */
  private getHandStyleDetails(handStyle?: string): string {
    if (!handStyle) return "";

    const styles: Record<string, string> = {
      elegant: `

HAND STYLING - ELEGANT:
- Nails: Nude/soft pink gel polish, almond shape, medium length (8-10mm)
- Cuticles: Clean, well-groomed, pushed back
- Ring: Thin silver midi ring on RIGHT middle finger, delicate design
- Bracelet: Single delicate chain bracelet on LEFT wrist (2mm width)
- Tattoo: Tiny crescent moon on inner LEFT wrist (2cm size), fine line art
- Skin: Smooth, moisturized appearance, even tone
- Nail surface: Subtle glossy shine, no chips or imperfections`,

      bohemian: `

HAND STYLING - BOHEMIAN:
- Nails: Terracotta/earth-tone matte polish, natural rounded shape
- Cuticles: Natural, healthy appearance
- Rings: 3-4 stacked thin rings on RIGHT hand (mix of gold and silver, varied widths)
- Bracelet: Beaded bracelet with natural stones (turquoise, wood) on LEFT wrist
- Tattoo: Small wildflower bouquet on RIGHT inner forearm (4cm), botanical illustration style
- Skin: Natural, sun-kissed warm tone
- Additional: Thin braided leather wrap on RIGHT wrist`,

      minimal: `

HAND STYLING - MINIMAL:
- Nails: No polish OR clear coat only, natural pink nail beds visible
- Shape: Short, practical length (3-5mm), squared oval
- Cuticles: Clean and neat
- Ring: Single thin gold band on LEFT ring finger (1.5mm width)
- Bracelet: None
- Tattoo: None
- Skin: Clean, natural, healthy appearance
- Overall: Understated, professional, timeless`,

      trendy: `

HAND STYLING - TRENDY:
- Nails: French tip with thin white line, coffin/ballerina shape, longer length (12-15mm)
- Cuticles: Perfectly groomed
- Ring: Chunky gold signet ring on RIGHT pinky, statement piece
- Bracelet: Gold chain link bracelet on LEFT wrist (4mm links)
- Tattoo: Geometric fine-line triangle on RIGHT hand between thumb and index (3cm)
- Skin: Flawless, possibly with subtle highlighter on knuckles
- Additional: Matching gold ring on LEFT index finger`,

      sporty: `

HAND STYLING - SPORTY:
- Nails: No polish, very short and practical (2-3mm)
- Shape: Natural, trimmed for activity
- Cuticles: Healthy, natural
- Watch: Fitness tracker or simple sport watch on LEFT wrist
- Bracelet: Simple silicone band or fabric friendship bracelet
- Ring: None or simple rubber band ring
- Tattoo: None
- Skin: Healthy, active appearance, natural tone`,
    };

    return styles[handStyle] || "";
  }

  /**
   * Seçilen fincan için referans detayları
   */
  private getCupReferenceDetails(cup?: Asset): string {
    if (!cup) return "";

    // RADİKAL SADELEŞTİRME v2.0 - Kısa ve pozitif
    const colors = cup.visualProperties?.dominantColors?.join(", ") || "";
    const material = cup.visualProperties?.material || "ceramic";

    return `
Cup: ${colors} ${material} (from reference)`.trim();
  }

  /**
   * Dinamik prompt oluştur (Gemini terminolojisi ile)
   * Yeni sistem: Firestore'daki Gemini preset'lerini kullanır
   * Fallback: Hardcoded Gemini terminolojisi
   */
  private async buildDynamicPromptWithGemini(
    scenarioId: string,
    compositionId?: string,
    handStyle?: string,
    selectedAssets?: AssetSelection,
    mood?: string,
    productType?: string,
    timeOfDay?: string,
    scenarioData?: {
      // lightingPreset kaldırıldı - Işık artık Mood'dan geliyor
      handPose?: string;
      compositionEntry?: string;
    },
    scenarioDescription?: string, // KRİTİK: Senaryo açıklaması - ortam bilgisi için
    moodDetails?: {
      weather?: string;
      lightingPrompt?: string;
      colorGradePrompt?: string;
      description?: string;
      timeOfDay?: string;
      season?: string;
    },
    themeDescription?: string,
    themeSetting?: Record<string, unknown>,
    beverageType?: string, // İçecek tipi: "tea", "coffee" vb.
    accessoryAllowed?: boolean, // Tema izni: AI dekoratif aksesuar üretsin mi?
    accessoryOptions?: string[] // Kullanıcının seçtiği aksesuar listesi
  ): Promise<{ mainPrompt: string; negativePrompt: string; promptBuildingSteps?: Array<{ step: string; input: string | null; matched: boolean; result: string | null; fallback: boolean; details?: Record<string, unknown> }> }> {
    // Senaryo verilerinden Gemini parametrelerini çıkar
    // NOT: lightingPreset artık Senaryo'dan değil, Mood'dan geliyor
    const scenarioParams = scenarioData
      ? extractGeminiParamsFromScenario({
        mood,
        // lightingPreset kaldırıldı - Işık artık sadece Mood'dan
        handPose: scenarioData.handPose,
        compositionEntry: scenarioData.compositionEntry,
        includesHands: !!handStyle,
      })
      : { moodId: mood };

    try {
      // Asset etiketlerini topla (Gemini'ye constraint olarak gönderilecek)
      // preferredTags varsa → kullanıcı tercihi asset'in kendi tag'lerini override eder
      const themePrefTagsForPrompt = themeSetting?.preferredTags as { table?: string[]; plate?: string[]; cup?: string[] } | undefined;

      const assetTags: {
        product?: string[];
        plate?: string[];
        table?: string[];
        cup?: string[];
        accessory?: string[];
        napkin?: string[];
      } = {};

      if (selectedAssets?.product?.tags?.length) {
        assetTags.product = selectedAssets.product.tags;
      }
      if (selectedAssets?.plate?.tags?.length) {
        // preferredTags override: kullanıcı tercihi varsa onu kullan
        assetTags.plate = (themePrefTagsForPrompt?.plate?.length && !themePrefTagsForPrompt.plate.includes("__none__"))
          ? themePrefTagsForPrompt.plate
          : selectedAssets.plate.tags;
      }
      if (selectedAssets?.table?.tags?.length) {
        assetTags.table = (themePrefTagsForPrompt?.table?.length && !themePrefTagsForPrompt.table.includes("__none__"))
          ? themePrefTagsForPrompt.table
          : selectedAssets.table.tags;
      }
      if (selectedAssets?.cup?.tags?.length) {
        assetTags.cup = (themePrefTagsForPrompt?.cup?.length && !themePrefTagsForPrompt.cup.includes("__none__"))
          ? themePrefTagsForPrompt.cup
          : selectedAssets.cup.tags;
      }
      if (selectedAssets?.napkin?.tags?.length) {
        assetTags.napkin = selectedAssets.napkin.tags;
      }

      const hasAssetTags = Object.keys(assetTags).length > 0;
      if (hasAssetTags) {
        console.log(`[Orchestrator] 🏷️ Asset tags collected for Gemini prompt:`, assetTags);
      }

      // Gemini prompt builder kullan
      // lightingPresetId artık Senaryo'dan gelmiyor - Mood fallback kullanılacak
      const geminiResult = await buildGeminiPrompt({
        moodId: scenarioParams.moodId,
        // lightingPresetId: Mood'dan otomatik çekilecek (buildGeminiPrompt içinde)
        handPoseId: scenarioParams.handPoseId,
        compositionId: scenarioParams.compositionId || compositionId,
        productType,
        includesHands: !!handStyle,
        timeOfDay: timeOfDay || getTimeOfDay(),
        assetTags: hasAssetTags ? assetTags : undefined,
        scenarioDescription, // Senaryo açıklaması - creative direction olarak kullanılır
        themeSetting: themeSetting as any, // Tema sahne ayarları (hava, ışık, atmosfer)
        beverageType, // İçecek tipi: "tea", "coffee" vb. (beverageRules'dan)
        accessoryAllowed, // Tema izni: AI dekoratif aksesuar üretsin mi?
        accessoryOptions, // Kullanıcının seçtiği aksesuar listesi
      });

      // Prompt builder kararlarını al
      const allDecisions = [...geminiResult.decisions];

      let prompt = geminiResult.mainPrompt;
      let negativePrompt = geminiResult.negativePrompt;

      // scenarioDescription artık buildGeminiPrompt içinde handle ediliyor
      // "SCENE DIRECTION" bölümü olarak prompt'a ekleniyor (referans öncelikli disclaimer ile)
      if (scenarioDescription) {
        console.log(`[Orchestrator] ✅ Scenario description ACTIVE - buildGeminiPrompt'a gönderildi (${scenarioDescription.length} karakter)`);
      }

      // -----------------------------------------------------------------------
      // LOGIC OVERRIDES: KULLANICI GERİ BİLDİRİMİ İLE DÜZELTMELER
      // -----------------------------------------------------------------------

      // 1. Weather/Mood Enforcement
      // Mood document'ından structured weather bilgisi kullan, yoksa keyword fallback
      const moodWeather = moodDetails?.weather;
      const isNonSunny = moodWeather === "cloudy" || moodWeather === "rainy" || moodWeather === "snowy";

      // Fallback: Mood string veya senaryo açıklamasında keyword arama
      const moodLower = (mood || "").toLowerCase();
      const descLower = (scenarioDescription || "").toLowerCase();
      const isRainyByKeyword =
        moodLower.includes("rain") || moodLower.includes("overcast") || moodLower.includes("gloomy") || moodLower.includes("storm") ||
        moodLower.includes("kapalı") || moodLower.includes("yağmur") || moodLower.includes("bulut") ||
        descLower.includes("rain") || descLower.includes("overcast") ||
        descLower.includes("kapalı") || descLower.includes("yağmur");

      if (isNonSunny || isRainyByKeyword) {
        const weatherType = moodWeather || "cloudy";
        console.log(`[Orchestrator] 🌧️ Non-sunny weather detected (${weatherType}) - applying overrides`);

        if (weatherType === "rainy") {
          prompt += "\n\nWEATHER OVERRIDE: The scene MUST be rainy. Soft, diffused, flat lighting. Rain drops visible on glass surfaces/windows. Gloomy, moody atmosphere. NO DIRECT SUNLIGHT.";
        } else if (weatherType === "snowy") {
          prompt += "\n\nWEATHER OVERRIDE: The scene MUST have snowy winter atmosphere. Cool blue-white tones, soft diffused cold light. Snow visible outside windows. NO WARM GOLDEN LIGHT.";
        } else {
          // cloudy veya fallback
          prompt += "\n\nWEATHER OVERRIDE: The scene MUST be overcast/cloudy. Soft, diffused, flat lighting. No direct sunlight. Muted, moody atmosphere.";
        }
        negativePrompt += ", sun, sunlight, sunny, hard shadows, warm golden light, sunrise, sunset, bright rays, volumetric light";

        allDecisions.push({
          step: "weather-override",
          input: moodWeather || "keyword-fallback",
          matched: true,
          result: `${weatherType} override uygulandı`,
          fallback: !isNonSunny && isRainyByKeyword,
          details: {
            weatherType,
            source: isNonSunny ? "moodDetails.weather" : "keyword-fallback",
            keywordsMatched: isRainyByKeyword,
            addedToNegative: "sun, sunlight, sunny, hard shadows, warm golden light, sunrise, sunset, bright rays, volumetric light",
          },
        });
      } else if (moodWeather === "sunny") {
        // Güneşli hava için pozitif override
        console.log(`[Orchestrator] ☀️ Sunny weather detected - applying warm light override`);
        prompt += "\n\nWEATHER OVERRIDE: The scene MUST have warm, natural sunlight. Bright, inviting atmosphere with soft golden tones. Clear day feeling.";
        negativePrompt += ", rain, overcast, gloomy, dark clouds, grey sky, fog";

        allDecisions.push({
          step: "weather-override",
          input: moodWeather,
          matched: true,
          result: "sunny override uygulandı",
          fallback: false,
          details: {
            weatherType: "sunny",
            source: "moodDetails.weather",
            addedToNegative: "rain, overcast, gloomy, dark clouds, grey sky, fog",
          },
        });
      } else {
        allDecisions.push({
          step: "weather-override",
          input: moodWeather || null,
          matched: false,
          result: "Weather override uygulanmadı (any/belirtilmemiş)",
          fallback: false,
          details: { moodWeather: moodWeather || "yok", keywordsChecked: true, keywordsMatched: false },
        });
      }

      // Tema ve mood açıklamalarını enjekte et
      if (themeDescription) {
        prompt += `\n\nTHEME CONTEXT: ${themeDescription}`;
        console.log(`[Orchestrator] 📝 Theme description injected: ${themeDescription.substring(0, 60)}...`);
      }
      if (moodDetails?.description) {
        prompt += `\n\nMOOD CONTEXT: ${moodDetails.description}`;
        console.log(`[Orchestrator] 📝 Mood description injected: ${moodDetails.description.substring(0, 60)}...`);
      }

      // Mood'un timeOfDay ve season enjeksiyonu
      if (moodDetails?.timeOfDay && moodDetails.timeOfDay !== "any") {
        const timeOfDayMap: Record<string, string> = {
          morning: "Morning atmosphere - fresh, bright, early day light",
          afternoon: "Afternoon atmosphere - warm, full daylight, lively",
          evening: "Evening atmosphere - warm golden hour, cozy, dimming light",
          night: "Night atmosphere - dark, intimate, artificial warm lighting",
        };
        const timeDesc = timeOfDayMap[moodDetails.timeOfDay] || moodDetails.timeOfDay;
        prompt += `\n\nTIME OF DAY: ${timeDesc}`;
        console.log(`[Orchestrator] 🕒 Time of day injected: ${moodDetails.timeOfDay}`);
      }

      if (moodDetails?.season && moodDetails.season !== "any") {
        const seasonMap: Record<string, string> = {
          winter: "Winter season - cool tones, cozy indoor feeling, possible frost/snow elements visible through windows",
          spring: "Spring season - fresh green tones, bright natural light, flowers and renewal feeling",
          summer: "Summer season - warm vibrant colors, strong natural light, energetic atmosphere",
          autumn: "Autumn season - warm orange/brown tones, soft golden light, falling leaves feeling",
        };
        const seasonDesc = seasonMap[moodDetails.season] || moodDetails.season;
        prompt += `\n\nSEASON: ${seasonDesc}`;
        console.log(`[Orchestrator] 🍂 Season injected: ${moodDetails.season}`);
      }

      // Mood'un lightingPrompt ve colorGradePrompt enjeksiyonu
      if (moodDetails?.lightingPrompt) {
        prompt += `\n\nMOOD LIGHTING: ${moodDetails.lightingPrompt}`;
        console.log(`[Orchestrator] 💡 Mood lighting injected: ${moodDetails.lightingPrompt.substring(0, 60)}...`);
      }
      if (moodDetails?.colorGradePrompt) {
        prompt += `\n\nCOLOR GRADE: ${moodDetails.colorGradePrompt}`;
        console.log(`[Orchestrator] 🎨 Mood color grade injected: ${moodDetails.colorGradePrompt.substring(0, 60)}...`);
      }

      allDecisions.push({
        step: "mood-lighting-injection",
        input: moodDetails?.lightingPrompt || null,
        matched: !!(moodDetails?.lightingPrompt || moodDetails?.colorGradePrompt),
        result: moodDetails?.lightingPrompt
          ? `Lighting: ${moodDetails.lightingPrompt.substring(0, 80)}${moodDetails.colorGradePrompt ? " + ColorGrade" : ""}`
          : "Mood lighting/colorGrade yok",
        fallback: false,
        details: {
          lightingPrompt: moodDetails?.lightingPrompt || null,
          colorGradePrompt: moodDetails?.colorGradePrompt || null,
        },
      });

      // 2. Asset Fidelity (Napkin & Accessory Protection)
      // Eğer peçete (napkin) asset olarak seçildiyse, jenerik 'linen' stilini engelle.
      if (selectedAssets?.napkin) {
        console.log(`[Orchestrator] 🧶 NAPKIN ASSET detected: ${selectedAssets.napkin.filename} - enforcing fidelity`);
        const napkinDesc = selectedAssets.napkin.visualProperties?.dominantColors?.join(", ") || "specific";
        prompt += `\n\nASSET RULE: Use the provided NAPKIN reference image exactly. Do not apply generic 'linen' or 'rustic' texture if it contradicts the reference. Keep the ${napkinDesc} color/style of the reference napkin.`;
      }

      // 3. eatingMethod Constraint (Fiziksel Mantık)
      // Ürünün yeme şekline göre çatal/bıçak/kaşık kontrolü
      const eatingMethod = selectedAssets?.product?.eatingMethod || selectedAssets?.product?.holdingType;

      if (eatingMethod === "hand") {
        console.log(`[Orchestrator] 🍴 EATING METHOD: hand - blocking cutlery`);
        prompt += "\n\nPHYSICAL LOGIC: This product is eaten BY HAND. STRICTLY NO cutlery (fork, knife, spoon) in the scene.";
        negativePrompt += ", fork, knife, spoon, cutlery, utensil, silverware";
      } else if (eatingMethod === "fork" || eatingMethod === "fork-knife") {
        console.log(`[Orchestrator] 🍴 EATING METHOD: ${eatingMethod} - allowing fork`);
        prompt += "\n\nPHYSICAL LOGIC: This product is eaten with a fork. A fork may be visible near the product.";
      } else if (eatingMethod === "spoon") {
        console.log(`[Orchestrator] 🍴 EATING METHOD: spoon - allowing spoon`);
        prompt += "\n\nPHYSICAL LOGIC: This product is eaten with a spoon. A spoon may be visible near the product.";
      } else if (eatingMethod === "none") {
        console.log(`[Orchestrator] 🍴 EATING METHOD: none (beverage) - no cutlery needed`);
      }

      allDecisions.push({
        step: "eating-method-constraint",
        input: eatingMethod || null,
        matched: !!eatingMethod,
        result: eatingMethod
          ? `${eatingMethod} → ${eatingMethod === "hand" ? "çatal/bıçak/kaşık ENGELLENDİ" : eatingMethod === "fork" || eatingMethod === "fork-knife" ? "çatal İZİN VERİLDİ" : eatingMethod === "spoon" ? "kaşık İZİN VERİLDİ" : "yeme aracı gereksiz"}`
          : "eatingMethod tanımlı değil",
        fallback: false,
        details: {
          source: selectedAssets?.product?.eatingMethod ? "product.eatingMethod" : selectedAssets?.product?.holdingType ? "product.holdingType (fallback)" : "yok",
          addedToNegative: eatingMethod === "hand" ? "fork, knife, spoon, cutlery, utensil, silverware" : null,
        },
      });

      // Ek detaylar ekle (eski sistem ile uyumluluk)
      prompt += await this.getCompositionDetails(scenarioId, compositionId);
      prompt += this.getHandStyleDetails(handStyle);
      prompt += this.getCupReferenceDetails(selectedAssets?.cup);

      console.log(`[Orchestrator] Built Gemini prompt with mood: ${geminiResult.metadata.mood?.id}, lighting: ${geminiResult.metadata.lighting?.id}, total decisions: ${allDecisions.length}`);

      return {
        mainPrompt: prompt,
        negativePrompt: negativePrompt,
        promptBuildingSteps: allDecisions,
      };
    } catch (error) {
      console.warn("[Orchestrator] Gemini prompt builder failed, using fallback:", error);
      // Fallback to legacy prompt
      return {
        mainPrompt: await this.buildDynamicPromptLegacy(scenarioId, compositionId, handStyle, selectedAssets?.cup, mood, scenarioDescription),
        negativePrompt: await buildNegativePrompt(handStyle ? ["always", "hands"] : ["always"]),
        promptBuildingSteps: [{
          step: "fallback-legacy",
          input: String(error),
          matched: false,
          result: "Legacy prompt builder kullanıldı (Gemini builder hata verdi)",
          fallback: true,
          details: { error: String(error) },
        }],
      };
    }
  }

  /**
   * Legacy prompt builder (fallback)
   * Gemini preset'leri yüklenemezse bu kullanılır
   */
  private async buildDynamicPromptLegacy(
    scenarioId: string,
    compositionId?: string,
    handStyle?: string,
    selectedCup?: Asset,
    mood?: string,
    scenarioDescription?: string // KRİTİK: Senaryo açıklaması - ortam bilgisi için
  ): Promise<string> {
    // ═══════════════════════════════════════════════════════════════════════════
    // Gemini-native terminoloji ile mood bazlı atmosfer
    // ═══════════════════════════════════════════════════════════════════════════
    const moodAtmosphere: Record<string, { lighting: string; atmosphere: string; temperature: string; colorPalette: string }> = {
      "morning-ritual": {
        lighting: "Natural morning light through window, soft diffused shadows",
        atmosphere: "Bright and airy, fresh morning energy, clean minimal aesthetic",
        temperature: "5500K daylight",
        colorPalette: "white, cream, light wood, pastel tones",
      },
      "cozy-intimate": {
        lighting: "Warm tungsten accent lighting, soft diffused ambient",
        atmosphere: "Warm and inviting, intimate gathering, comfortable homey feeling",
        temperature: "3000K warm",
        colorPalette: "warm brown, cream, burnt orange, gold accents",
      },
      "rustic-heritage": {
        lighting: "Golden hour directional sunlight, warm side-lighting",
        atmosphere: "Rustic artisanal charm, traditional craftsmanship, authentic heritage",
        temperature: "3200K golden",
        colorPalette: "natural wood, linen, terracotta, olive green",
      },
      "gourmet-midnight": {
        lighting: "Dramatic side-lighting at 45 degrees, deep defined shadows",
        atmosphere: "Sophisticated midnight indulgence, moody dramatic luxury",
        temperature: "3500K amber",
        colorPalette: "dark wood, burgundy, gold, deep black",
      },
      "bright-airy": {
        lighting: "Soft diffused daylight, minimal shadows, even illumination",
        atmosphere: "Clean contemporary aesthetic, bright editorial style, minimalist elegance",
        temperature: "5000K neutral",
        colorPalette: "white, marble, light grey, sage green",
      },
      "festive-celebration": {
        lighting: "Warm ambient with specular highlights, celebratory glow",
        atmosphere: "Joyful celebration, special occasion warmth, festive abundance",
        temperature: "3200K festive",
        colorPalette: "gold, cream, burgundy, forest green",
      },
      // Legacy mood mappings for backward compatibility
      "energetic": {
        lighting: "Bright natural morning light, high contrast",
        atmosphere: "Fresh, dynamic energy, clean aesthetic",
        temperature: "5500K",
        colorPalette: "white, cream, bright accents",
      },
      "social": {
        lighting: "Warm inviting ambient light, soft shadows",
        atmosphere: "Welcoming café scene, ready to share",
        temperature: "4000K",
        colorPalette: "warm neutrals, wood tones",
      },
      "relaxed": {
        lighting: "Soft diffused window light",
        atmosphere: "Calm, peaceful, minimal",
        temperature: "5000K",
        colorPalette: "soft pastels, white, grey",
      },
      "warm": {
        lighting: "Golden hour warm light, amber tones",
        atmosphere: "Romantic, intimate warmth",
        temperature: "3200K",
        colorPalette: "amber, gold, warm brown",
      },
      "cozy": {
        lighting: "Intimate focused lighting, soft shadows",
        atmosphere: "Homey, comfortable, close-up feel",
        temperature: "3000K",
        colorPalette: "warm brown, cream, terracotta",
      },
      "balanced": {
        lighting: "Natural balanced light, neutral tones",
        atmosphere: "Clean, professional, modern aesthetic",
        temperature: "5000K",
        colorPalette: "neutral, white, grey",
      },
    };

    const currentMood = moodAtmosphere[mood || "balanced"] || moodAtmosphere.balanced;

    // El içermeyen senaryo (handStyle null/undefined) - masada servis
    const noHandPrompt = `Using uploaded image as reference for the product.

Professional lifestyle Instagram photo at Sade Patisserie.

ATMOSPHERE: ${currentMood.atmosphere}
Color palette: ${currentMood.colorPalette}

COMPOSITION:
- Product centered on plate
- One hand may hold/stabilize the plate (not lift)
- Other hand with utensil taking a bite (if cutlery asset provided)
- Cup positioned naturally beside

RULES:
- Use ONLY assets from reference images
- Product clearly recognizable from reference
- Single product, natural table setting
- NO steam, NO smoke

LIGHTING:
- ${currentMood.lighting}
- Color temperature: ${currentMood.temperature}
- Shallow depth of field (f/2.0)

9:16 vertical for Instagram Stories. 8K photorealistic.`;

    // El içeren senaryo (handStyle belirtilmiş)
    const handPrompt = `Using uploaded image as reference for the product.

Lifestyle Instagram photo of elegant feminine hand holding the product at Sade Patisserie.

ATMOSPHERE: ${currentMood.atmosphere}
Color palette: ${currentMood.colorPalette}

HANDS:
- Elegant feminine hands with warm olive skin tone
- Natural short nails, subtle nude polish
- Hand entering frame naturally

COMPOSITION:
- Hand holding product with natural grip
- Cup and plate on table as supporting elements

RULES:
- Use ONLY assets from reference images
- Product clearly recognizable from reference
- Single product, single hand
- NO steam, NO smoke

LIGHTING:
- ${currentMood.lighting}
- Color temperature: ${currentMood.temperature}
- Gentle highlights on nail surface
- Subsurface scattering on skin
- Soft blurred background (f/2.0)

9:16 vertical for Instagram Stories. 8K photorealistic.`;

    // Senaryo bazlı özel prompt'lar (override)
    const scenarioOverrides: Record<string, string> = {
      "kahve-ani": `Using uploaded image as reference for the pastry.

RULES:
- ONE pastry from reference
- ONE cup from reference (if provided)
- NO additional items

Lifestyle Instagram story with pastry as hero subject on table.

LIGHTING: Soft natural side light, ${currentMood.temperature}, warm tones.

9:16 vertical. 8K photorealistic.`,
    };

    // Öncelik: 1) Senaryo override, 2) handStyle'a göre seçim
    let prompt = scenarioOverrides[scenarioId] || (handStyle ? handPrompt : noHandPrompt);

    // Senaryo açıklamasını SCENE DIRECTION olarak ekle (referans görseller her zaman öncelikli)
    if (scenarioDescription) {
      prompt += `\n\nSCENE DIRECTION (creative guidance - reference images always take precedence):\n${scenarioDescription}\nNOTE: This describes the desired scene composition. Always prioritize visual evidence from reference images over this description.\n`;
      console.log(`[Orchestrator] buildDynamicPromptLegacy: scenarioDescription ACTIVE (${scenarioDescription.substring(0, 30)}...)`);
    }

    // Kompozisyon detayları ekle
    prompt += await this.getCompositionDetails(scenarioId, compositionId);

    // El stili detayları ekle
    prompt += this.getHandStyleDetails(handStyle);

    // Fincan referans detayları ekle
    prompt += this.getCupReferenceDetails(selectedCup);

    return prompt;
  }

  /**
   * Telegram onay mesajı gönder
   */
  public async sendTelegramApproval(result: PipelineResult): Promise<number> {
    // Kritik alan validasyonları
    if (!result.generatedImage || !result.generatedImage.storageUrl) {
      throw new Error("Onay gönderilemedi: Görsel URL'i bulunamadı. Görsel üretimi başarısız olmuş olabilir.");
    }

    if (!result.assetSelection) {
      console.warn("[Orchestrator] sendTelegramApproval: assetSelection undefined, using defaults");
    }

    if (!result.scenarioSelection) {
      console.warn("[Orchestrator] sendTelegramApproval: scenarioSelection undefined (interior scenario?)");
    }

    // Storage URL'i public URL'e veya signed URL'e çevir
    // Telegram'ın erişebilmesi için erişilebilir URL gerekli
    const storageUrl = result.generatedImage.storageUrl;
    console.log(`[Orchestrator] StorageURL: ${storageUrl}`);

    // Eğer storageUrl zaten HTTP/HTTPS URL ise doğrudan kullan
    // (Interior/mekan asset'leri public URL olarak kaydedilmiş olabilir)
    if (storageUrl.startsWith("http://") || storageUrl.startsWith("https://")) {
      console.log(`[Orchestrator] StorageURL already HTTP, using directly`);
      const imageUrl = storageUrl;

      // Doğrudan Telegram'a gönder
      const shortId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // PhotoItem oluştur (interior senaryolar için bazı alanlar boş olabilir)
      const photoItem = {
        id: shortId,
        filename: result.assetSelection?.product?.filename || "interior-image.png",
        originalUrl: storageUrl,
        enhancedUrl: imageUrl,
        uploadedAt: Date.now(),
        processed: true,
        status: "awaiting_approval",
        schedulingMode: "immediate",
        productName: result.assetSelection?.product?.filename || "Mekan Görseli",
        productCategory: result.assetSelection?.product?.category || "interior",
        captionTemplateName: result.scenarioSelection?.scenarioName || "Interior",
        caption: result.contentPackage?.caption || "",
        styleVariant: "interior",
        aiModel: "none", // AI üretimi yok, mevcut fotoğraf
        faithfulness: 1.0, // Orijinal fotoğraf
        pipelineResultId: shortId,
        generatedStorageUrl: storageUrl,
        slotId: result.slotId || null,
        orchestratorData: {
          scenarioId: result.scenarioSelection?.scenarioId || "interior",
          scenarioName: result.scenarioSelection?.scenarioName || "Interior",
          compositionId: null,
          handStyle: null,
          mainPrompt: null,
          negativePrompt: null,
          aspectRatio: null,
          assetIds: {
            productId: null,
            cupId: null,
            tableId: null,
            plateId: null,
            decorId: null,
            petId: null,
            interiorId: result.assetSelection?.interior?.id || null,
            exteriorId: null,
            accessoryId: null,
          },
        },
      };

      console.log(`[Orchestrator] 🔍 Interior photo queue - slotId check:`, {
        resultSlotId: result.slotId,
        photoItemSlotId: photoItem.slotId,
        slotIdType: typeof photoItem.slotId,
      });
      await this.db.collection("media-queue").doc(shortId).set(photoItem);
      console.log(`[Orchestrator] Saved interior photo to queue with ID: ${shortId}, slotId: ${photoItem.slotId}`);

      const messageId = await this.telegram.sendApprovalRequest(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { ...photoItem as any },
        imageUrl
      );

      return messageId;
    }

    // gs:// formatındaki URL'ler için normal akış
    const bucket = this.storage.bucket();
    console.log(`[Orchestrator] Bucket: ${bucket.name}, processing gs:// URL`);
    console.log(`[Orchestrator] Original storageUrl: ${storageUrl}`);

    // GS URL'den path'i çıkarırken dikkatli olalım
    let filePath = storageUrl;
    if (filePath.startsWith(`gs://${bucket.name}/`)) {
      filePath = filePath.replace(`gs://${bucket.name}/`, "");
    } else if (filePath.startsWith("gs://")) {
      // Farklı bir bucket veya format olabilir, manuel parse edelim
      const parts = filePath.split("gs://")[1].split("/");
      const extractedBucket = parts.shift(); // bucket ismini al
      filePath = parts.join("/");
      console.log(`[Orchestrator] Extracted bucket: ${extractedBucket}, expected: ${bucket.name}`);

      // Bucket uyuşmazlığı kontrolü
      if (extractedBucket !== bucket.name) {
        console.warn(`[Orchestrator] ⚠️ Bucket mismatch! URL bucket: ${extractedBucket}, default bucket: ${bucket.name}`);
      }
    }

    console.log(`[Orchestrator] Resolved filePath: ${filePath}`);
    const file = bucket.file(filePath);

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
      console.error("[Orchestrator] URL Generation failed for path:", filePath);
      console.error("[Orchestrator] URL Error details:", urlError);

      // Fallback: Try signed URL
      try {
        console.log("[Orchestrator] Attempting signed URL fallback...");
        const [signedUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 3600 * 1000,
        });
        imageUrl = signedUrl;
        console.log("[Orchestrator] Signed URL generated successfully");
      } catch (signError) {
        console.error("[Orchestrator] Signed URL also failed:", signError);
        console.error("[Orchestrator] Failed storage details:", {
          originalUrl: storageUrl,
          resolvedPath: filePath,
          bucketName: bucket.name,
        });
        throw new Error(`Görsel URL'i oluşturulamadı. Dosya bulunamadı veya erişim izni yok. Path: ${filePath}`);
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
      // Orchestrator slot referansı - Telegram callback'te scheduled-slots güncellemesi için
      slotId: result.slotId || null,

      // ORCHESTRATOR DATA - Yeniden oluşturmada kullanılacak
      // Firestore undefined kabul etmiyor, null kullan
      orchestratorData: {
        scenarioId: result.scenarioSelection?.scenarioId || null,
        scenarioName: result.scenarioSelection?.scenarioName || null,
        compositionId: result.scenarioSelection?.compositionId || null,
        handStyle: result.scenarioSelection?.handStyle || null,
        mainPrompt: result.optimizedPrompt?.mainPrompt || null,
        negativePrompt: result.optimizedPrompt?.negativePrompt || null,
        aspectRatio: result.optimizedPrompt?.aspectRatio || null,
        assetIds: {
          productId: result.assetSelection?.product?.id || null,
          cupId: result.assetSelection?.cup?.id || null,
          tableId: result.assetSelection?.table?.id || null,
          plateId: result.assetSelection?.plate?.id || null,
          decorId: result.assetSelection?.decor?.id || null,
          petId: result.assetSelection?.pet?.id || null,
          interiorId: result.assetSelection?.interior?.id || null,
          exteriorId: result.assetSelection?.exterior?.id || null,
          accessoryId: result.assetSelection?.accessory?.id || null,
        },
      },
    };

    // Save to photos collection with the short ID as document ID
    console.log(`[Orchestrator] 🔍 Saving to queue - slotId check:`, {
      resultSlotId: result.slotId,
      photoItemSlotId: photoItem.slotId,
      slotIdType: typeof photoItem.slotId,
    });
    await this.db.collection("media-queue").doc(shortId).set(photoItem);
    console.log(`[Orchestrator] Saved photo to queue with ID: ${shortId}, slotId: ${photoItem.slotId}`);

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

  /**
   * Kullanılan asset'lerin usageCount değerini artır
   * Pipeline başarıyla tamamlandığında çağrılır
   * Hata olsa bile pipeline'ı durdurmaz
   */
  private async incrementAssetUsageCounts(
    assetSelection: PipelineResult["assetSelection"]
  ): Promise<void> {
    if (!assetSelection) return;

    const assetsToUpdate: string[] = [];

    // Kullanılan tüm asset ID'lerini topla
    if (assetSelection.product?.id) assetsToUpdate.push(assetSelection.product.id);
    if (assetSelection.plate?.id) assetsToUpdate.push(assetSelection.plate.id);
    if (assetSelection.cup?.id) assetsToUpdate.push(assetSelection.cup.id);
    if (assetSelection.table?.id) assetsToUpdate.push(assetSelection.table.id);
    if (assetSelection.decor?.id) assetsToUpdate.push(assetSelection.decor.id);
    if (assetSelection.pet?.id) assetsToUpdate.push(assetSelection.pet.id);
    if (assetSelection.interior?.id) assetsToUpdate.push(assetSelection.interior.id);
    if (assetSelection.accessory?.id) assetsToUpdate.push(assetSelection.accessory.id);
    if (assetSelection.napkin?.id) assetsToUpdate.push(assetSelection.napkin.id);
    if (assetSelection.cutlery?.id) assetsToUpdate.push(assetSelection.cutlery.id);

    if (assetsToUpdate.length === 0) {
      console.log("[Orchestrator] No assets to update usage count");
      return;
    }

    console.log(`[Orchestrator] Incrementing usage count for ${assetsToUpdate.length} assets: ${assetsToUpdate.join(", ")}`);

    // Batch güncelleme - atomik ve hızlı
    const batch = this.db.batch();

    for (const assetId of assetsToUpdate) {
      const assetRef = this.db.collection("assets").doc(assetId);
      batch.update(assetRef, {
        usageCount: FieldValue.increment(1),
        lastUsedAt: Date.now(),
      });
    }

    try {
      await batch.commit();
      console.log(`[Orchestrator] Usage counts updated successfully for ${assetsToUpdate.length} assets`);
    } catch (error) {
      // Hata olsa bile pipeline'ı durdurmuyoruz - sadece logluyoruz
      console.error(`[Orchestrator] Failed to update usage counts:`, error);
    }
  }
}

// Export types
export * from "./types";

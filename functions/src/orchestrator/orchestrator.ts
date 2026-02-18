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
import { getFixedAssets, getAssetSelectionConfig, getProductSlotDefaults, getSlotDefinitions, getSystemSettings } from "../services/configService";
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
  CompositionConfig,
  SlotSelection,
  SlotDefinition,
  DEFAULT_PRODUCT_SLOT_DEFAULTS,
} from "./types";
// Helpers & Stages
import { getTimeOfDay, getMoodFromTime } from "./helpers";
import {
  selectInteriorAsset,
} from "./stages";
import {
  saveImageToStorage,
  loadImageAsBase64,
} from "./helpers";

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
  private config: OrchestratorConfig;
  private imageProvider: "gemini" | "reve";

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.db = getFirestore();
    this.storage = getStorage();

    // Image provider seçimi
    this.imageProvider = config.imageProvider || "gemini";

    // Gemini entegrasyonu — sadece görsel üretim (text model kaldırıldı)
    this.gemini = new GeminiService({
      apiKey: config.geminiApiKey,
      imageModel: "gemini-3-pro-image-preview",
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

    console.log(`[Orchestrator] Pipeline: sadece image model (text model kaldırıldı)`);

    this.telegram = new TelegramService({
      botToken: config.telegramBotToken,
      chatId: config.telegramChatId,
      approvalTimeout: config.approvalTimeout,
    });
    this.rulesService = new RulesService();
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
   * @param overrideScenarioId - Manuel senaryo seçimi (Dashboard'dan "Şimdi Üret" ile)
   * @param overrideAspectRatio - Manuel aspect ratio seçimi (Instagram formatı için)
   * @param isManual - Manuel üretim mi? (Şimdi Üret butonu = true, Scheduler = false)
   */
  async runPipeline(
    productType: ProductType | undefined,
    timeSlotRule: TimeSlotRule,
    onProgress?: (stage: string, stageIndex: number, totalStages: number) => Promise<void>,
    slotId?: string,
    scheduledHour?: number,
    overrideScenarioId?: string,
    overrideAspectRatio?: "1:1" | "3:4" | "9:16",
    isManual?: boolean,
    isRandomMode?: boolean,
    compositionConfig?: CompositionConfig
  ): Promise<PipelineResult> {
    const TOTAL_STAGES = 5; // asset, scenario (kural bazlı), prompt (template), image, telegram
    const startedAt = Date.now();
    let totalCost = 0;

    // Config'den image model seçimini oku (deploy gerektirmeden değiştirilebilir)
    const systemSettings = await getSystemSettings();
    const validImageModels = ["gemini-3-pro-image-preview"];
    const rawImageModel = systemSettings.imageModel || "gemini-3-pro-image-preview";
    const imageModel = (validImageModels.includes(rawImageModel) ? rawImageModel : "gemini-3-pro-image-preview") as import("../services/gemini").GeminiModel;
    this.gemini = new GeminiService({
      apiKey: this.config.geminiApiKey,
      imageModel,
    });
    console.log(`[Orchestrator] Image model from config: ${imageModel}`);

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
      // PRE-STAGE 2: SENARYO OVERRIDE KONTROLÜ
      // ==========================================
      // overrideScenarioId: Dashboard'dan seçilen senaryo ID'si
      // timeSlotRule.scenarioId: Zaman kuralında tanımlı senaryo ID'si (eski themeId'nin yerini aldı)
      const effectiveScenarioId = overrideScenarioId || timeSlotRule.scenarioId;
      let isInteriorOnlyTheme = false;
      let overrideScenarioData: FirestoreScenario | undefined;
      let themeFilteredScenarios = allScenarios;

      if (effectiveScenarioId) {
        // Doğrudan senaryo seçimi — tek senaryo ile çalış
        overrideScenarioData = allScenarios.find(s => s.id === effectiveScenarioId);
        if (overrideScenarioData) {
          themeFilteredScenarios = [overrideScenarioData];
          isInteriorOnlyTheme = overrideScenarioData.isInterior === true;
          console.log(`[Orchestrator] Scenario override: "${overrideScenarioData.name}" (interior: ${isInteriorOnlyTheme})`);
        } else {
          console.warn(`[Orchestrator] Override scenario "${effectiveScenarioId}" not found, using all scenarios`);
        }
      }

      // ==========================================
      // PRE-STAGE 3: CONFIG SNAPSHOT LOGGING
      // ==========================================
      const timeOfDayForConfig = getTimeOfDay();
      const moodForConfig = getMoodFromTime();

      // Not: mood, styleId, colors alanları Theme interface'den v3.0'da kaldırıldı.
      // Yeni temalarda bu alanlar yok → Firestore read gereksiz.
      // moodDetails boş obje olarak kalıyor, downstream kod graceful handle ediyor.
      let moodDetails: {
        name?: string;
        description?: string;
        weather?: string;
        lightingPrompt?: string;
        colorGradePrompt?: string;
        timeOfDay?: string;
        season?: string;
        geminiPresetId?: string;
      } = {};

      // Config snapshot logla
      await AILogService.logConfigSnapshot({
        pipelineId,
        slotId,
        productType,
        configSnapshot: {
          scenarioId: effectiveScenarioId,
          scenarioName: overrideScenarioData?.name,
          // Geriye uyumluluk (log yapısı)
          themeId: effectiveScenarioId,
          themeName: overrideScenarioData?.name,
          moodName: moodForConfig,
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
          slots: {}, // Interior senaryoda kompozisyon slotu yok
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
      // RASTGELE MOD: Akıllı senaryo seçim algoritması
      // Math.random() yerine puanlama bazlı seçim
      // ==========================================
      // AUTO modda seçilen senaryo — Stage 2'de Gemini yerine bu kullanılır
      let autoSelectedScenarioResult: FirestoreScenario | null = null;

      if (isAutoMode) {
        console.log("[Orchestrator] AUTO MODE: Akıllı senaryo seçimi başlatılıyor");

        // 1. Aday senaryoları hazırla
        let autoScenarios = themeFilteredScenarios.filter(s => !s.isInterior);

        // Bloklanmış senaryoları çıkar
        const unblockedScenarios = autoScenarios.filter(
          s => !effectiveRules.blockedScenarios.includes(s.id)
        );

        // Tüm senaryolar bloklanmışsa fallback
        if (unblockedScenarios.length > 0) {
          autoScenarios = unblockedScenarios;
        } else {
          console.log("[Orchestrator] AUTO: Tüm senaryolar bloklu, fallback kullanılıyor");
          if (autoScenarios.length === 0) {
            autoScenarios = allScenarios.filter(s => !s.isInterior);
          }
        }

        // 2. Aktif ürün stokunu al (senaryo puanlaması için)
        const activeSlugs = await categoryService.getSubTypeSlugs("products");
        const activeProductSet = new Set(activeSlugs);

        // 3. Zaman bilgisi (senaryo-zaman uyumu için)
        const currentTimeOfDay = getTimeOfDay();

        // 4. Üretim geçmişi (çeşitlilik puanlaması için)
        const recentHistory = effectiveRules.recentHistory?.entries || [];

        // Senaryo kullanım sayıları (son 15 üretimde)
        const scenarioUsageCounts = new Map<string, number>();
        recentHistory.forEach(entry => {
          scenarioUsageCounts.set(
            entry.scenarioId,
            (scenarioUsageCounts.get(entry.scenarioId) || 0) + 1
          );
        });

        // Son kullanım sırası (0 = en son, büyük = çok önce)
        const scenarioLastUsedIndex = new Map<string, number>();
        recentHistory.forEach((entry, index) => {
          if (!scenarioLastUsedIndex.has(entry.scenarioId)) {
            scenarioLastUsedIndex.set(entry.scenarioId, index);
          }
        });

        // 5. Her senaryoya puan ver
        const scoredScenarios = autoScenarios.map(scenario => {
          let score = 0;
          const reasons: string[] = [];
          const scenarioData = scenario as FirestoreScenario;

          // --- A. Ürün Stok Uyumu (0-30 puan) ---
          // Senaryonun suggestedProducts'ı aktif stokla ne kadar eşleşiyor?
          if (scenarioData.suggestedProducts && scenarioData.suggestedProducts.length > 0) {
            const matchingProducts = scenarioData.suggestedProducts.filter(p => activeProductSet.has(p));
            const stockRatio = matchingProducts.length / scenarioData.suggestedProducts.length;
            const stockScore = Math.round(stockRatio * 30);
            score += stockScore;
            if (stockScore > 0) reasons.push(`stok:+${stockScore} (${matchingProducts.length}/${scenarioData.suggestedProducts.length})`);
          } else {
            // suggestedProducts boş = her ürünle uyumlu → tam puan
            score += 30;
            reasons.push("stok:+30 (universal)");
          }

          // --- B. Zaman Uyumu (0-20 puan) ---
          // Senaryonun adı/açıklaması zamana uygun mu?
          const timeScoreMap: Record<string, Record<string, number>> = {
            morning: { "kahve": 20, "sabah": 20, "taze": 15, "kruvasan": 15 },
            noon: { "paylasim": 15, "paket": 15, "dilim": 15, "mermer": 10 },
            afternoon: { "cam": 15, "kenari": 15, "zarafet": 15, "hediye": 10 },
            evening: { "cam": 20, "kenari": 20, "samimi": 15, "kose": 15, "yarim": 10 },
            night: { "kose": 20, "yarim": 15, "samimi": 15 },
          };
          const timeKeywords = timeScoreMap[currentTimeOfDay] || {};
          const scenarioSearchText = `${scenario.name} ${scenario.description || ""}`.toLowerCase();
          let timeScore = 0;
          for (const [keyword, points] of Object.entries(timeKeywords)) {
            if (scenarioSearchText.includes(keyword)) {
              timeScore = Math.max(timeScore, points); // En yüksek eşleşmeyi al
            }
          }
          // Eşleşme yoksa nötr puan (cezalandırma yok)
          if (timeScore === 0) timeScore = 10;
          score += timeScore;
          reasons.push(`zaman(${currentTimeOfDay}):+${timeScore}`);

          // --- C. Çeşitlilik Puanı (0-30 puan) ---
          // Ne kadar uzun süredir kullanılmadıysa o kadar yüksek puan
          const lastUsedIdx = scenarioLastUsedIndex.get(scenario.id);
          if (lastUsedIdx === undefined) {
            // Hiç kullanılmamış → en yüksek çeşitlilik puanı
            score += 30;
            reasons.push("çeşitlilik:+30 (hiç kullanılmamış)");
          } else {
            // 0 = az önce kullanıldı, 14 = çok önce kullanıldı
            const diversityScore = Math.min(Math.round((lastUsedIdx / 14) * 30), 30);
            score += diversityScore;
            reasons.push(`çeşitlilik:+${diversityScore} (son:${lastUsedIdx})`);
          }

          // --- D. Kullanım Sıklığı Dengesi (0-20 puan) ---
          // Az kullanılmış senaryolara bonus
          const usageCount = scenarioUsageCounts.get(scenario.id) || 0;
          const maxUsage = Math.max(...Array.from(scenarioUsageCounts.values()), 1);
          const usageScore = Math.round((1 - usageCount / maxUsage) * 20);
          score += usageScore;
          reasons.push(`sıklık:+${usageScore} (${usageCount}x)`);

          return { scenario, score, reasons };
        });

        // 6. Skorlara göre sırala
        scoredScenarios.sort((a, b) => b.score - a.score);

        // Log: Tüm puanları göster
        console.log(`[Orchestrator] AUTO: Senaryo puanlaması (${scoredScenarios.length} aday):`);
        scoredScenarios.forEach((s, i) => {
          console.log(`  ${i + 1}. ${s.scenario.name}: ${s.score} puan [${s.reasons.join(", ")}]`);
        });

        // 7. En yüksek puanlı senaryoyu seç
        // Beraberlik varsa, ilk 2 arasından rastgele (minimal rastgelelik)
        let autoSelectedScenario: FirestoreScenario;
        if (scoredScenarios.length >= 2 && scoredScenarios[0].score === scoredScenarios[1].score) {
          const tieBreaker = Math.random() < 0.5 ? 0 : 1;
          autoSelectedScenario = scoredScenarios[tieBreaker].scenario as FirestoreScenario;
          console.log(`[Orchestrator] AUTO: Beraberlik → zar atıldı: ${autoSelectedScenario.name}`);
        } else {
          autoSelectedScenario = scoredScenarios[0].scenario as FirestoreScenario;
        }
        console.log(`[Orchestrator] AUTO: Seçilen senaryo: "${autoSelectedScenario.name}" (${scoredScenarios[0].score} puan)`);

        // Seçilen senaryoyu dış scope'a aktar (Stage 2'de Gemini yerine kullanılacak)
        autoSelectedScenarioResult = autoSelectedScenario;

        // 8. Senaryodan productType belirle (stokta olan ürünlerden)
        if (autoSelectedScenario.suggestedProducts && autoSelectedScenario.suggestedProducts.length > 0) {
          // Stokta olan ürünleri tercih et
          const inStockProducts = autoSelectedScenario.suggestedProducts.filter(p => activeProductSet.has(p));
          const productPool = inStockProducts.length > 0 ? inStockProducts : autoSelectedScenario.suggestedProducts;

          // Son üretimlerde az kullanılan ürün tipini seç
          const recentProductTypes = recentHistory.slice(0, 5).map(e => e.productType);
          const freshProduct = productPool.find(p => !recentProductTypes.includes(p as ProductType));
          productType = (freshProduct || productPool[0]) as ProductType;
          console.log(`[Orchestrator] AUTO: productType=${productType} (stok:${inStockProducts.length}, taze:${!!freshProduct})`);
        } else {
          // suggestedProducts boş → aktif kategorilerden en az kullanılanı seç
          if (activeSlugs.length > 0) {
            const recentProductTypes = recentHistory.slice(0, 5).map(e => e.productType);
            const freshSlug = activeSlugs.find(s => !recentProductTypes.includes(s as ProductType));
            productType = (freshSlug || activeSlugs[0]) as ProductType;
            console.log(`[Orchestrator] AUTO: productType=${productType} (aktif kategoriden, taze:${!!freshSlug})`);
          } else {
            productType = "croissants" as ProductType;
            console.log(`[Orchestrator] AUTO: fallback productType: ${productType}`);
          }
        }

        // Pipeline context güncelle
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

      // ── COMPOSITION MODE: Slot bazlı asset seçimi (TEK MOD) ──
      // Öncelik: 1) Dışarıdan gelen compositionConfig, 2) overrideScenario'daki compositionSlots, 3) auto-default
      // Not: selectedScenario'dan okuma senaryo seçiminden sonra yapılır (aşağıda)
      const overrideSlots = overrideScenarioData?.compositionSlots;
      if (!compositionConfig && overrideSlots && Object.keys(overrideSlots).length > 0) {
        const slotsFromScenario: Record<string, SlotSelection> = {};
        for (const [key, config] of Object.entries(overrideSlots)) {
          const sc = config as { state: string; filterTags?: string[] };
          if (sc.state !== "disabled") {
            slotsFromScenario[key] = {
              slotKey: key,
              state: sc.state as "random" | "manual" | "disabled",
              source: "template",
              ...(sc.filterTags && sc.filterTags.length > 0 && { filterTags: sc.filterTags }),
            };
          }
        }
        compositionConfig = { slots: slotsFromScenario };
        console.log(`[Orchestrator] Override senaryo'dan compositionSlots yüklendi (${Object.keys(slotsFromScenario).length} aktif slot)`);
      }

      // compositionConfig yoksa veya kısmi ise auto-default ile tamamla
      // Frontend sadece override edilen slot'ları gönderir — geri kalanları random ile doldur
      {
        let productSlotDefaults: Record<string, Record<string, boolean>>;
        try {
          const config = await getProductSlotDefaults();
          productSlotDefaults = config.defaults;
        } catch (err) {
          console.warn("[Orchestrator] Product slot defaults config okunamadı, fallback kullanılıyor:", err);
          productSlotDefaults = DEFAULT_PRODUCT_SLOT_DEFAULTS;
        }
        const defaults = productSlotDefaults[effectiveProductType] || productSlotDefaults._default || DEFAULT_PRODUCT_SLOT_DEFAULTS._default;

        if (!compositionConfig || Object.keys(compositionConfig.slots).length === 0) {
          // Hiç config yok — tamamen auto-default
          const autoSlots: Record<string, SlotSelection> = {};
          for (const [slotKey, enabled] of Object.entries(defaults)) {
            if (enabled) {
              autoSlots[slotKey] = { slotKey, state: "random", source: "manual" };
            }
          }
          console.log(`[Orchestrator] compositionConfig yok — auto-default oluşturuluyor (productType: ${effectiveProductType}, aktif slotlar: ${Object.keys(autoSlots).join(", ")})`);
          compositionConfig = { slots: autoSlots };
        } else {
          // Kısmi config var (ör: sadece override edilen slot'lar) — eksik slot'ları random ile tamamla
          const existingKeys = new Set(Object.keys(compositionConfig.slots));
          let merged = 0;
          for (const [slotKey, enabled] of Object.entries(defaults)) {
            if (enabled && !existingKeys.has(slotKey)) {
              compositionConfig.slots[slotKey] = { slotKey, state: "random", source: "manual" };
              merged++;
            }
          }
          if (merged > 0) {
            console.log(`[Orchestrator] Kısmi compositionConfig — ${merged} eksik slot random ile tamamlandı (toplam: ${Object.keys(compositionConfig.slots).length})`);
          }
        }
      }

      console.log(`[Orchestrator] COMPOSITION MODE: ${Object.keys(compositionConfig.slots).length} slot'tan asset çözümleniyor`);

      result.assetSelection = await this.resolveCompositionAssets(compositionConfig, effectiveProductType);

      // Slot field map — loglama için
      const slotDefsForLog = await getSlotDefinitions();
      const logSlotFieldMap: Record<string, string> = {};
      for (const def of slotDefsForLog.slots) {
        logSlotFieldMap[def.key] = def.assetFieldName;
      }

      // compositionConfig snapshot logla
      await AILogService.logDecision({
        stage: "asset-selection",
        pipelineId,
        slotId,
        productType,
        model: "composition-config",
        userPrompt: `Composition slots: ${Object.entries(compositionConfig.slots).map(([k, v]) => {
          const slot = v as SlotSelection;
          const filterTags = slot.filterTags || [];
          if (slot.state === "manual" && filterTags.length > 0) {
            // Skor hesapla: seçilen asset'in kaç etiketi eşleşiyor
            const assetField = logSlotFieldMap[k];
            const selectedAsset = assetField ? (result.assetSelection as any)[assetField] : null;
            if (selectedAsset?.tags) {
              const matchCount = filterTags.filter((ft: string) =>
                selectedAsset.tags.some((t: string) => t.toLowerCase().includes(ft.toLowerCase()))
              ).length;
              return `${k}:manual(${matchCount}/${filterTags.length})`;
            }
            return `${k}:manual(0/${filterTags.length})`;
          }
          return `${k}:${slot.state}`;
        }).join(", ")}`,
        response: result.assetSelection.selectionReasoning,
        status: "success",
        durationMs: 0,
        decisionDetails: {
          selectedAssets: {
            product: {
              id: result.assetSelection.product?.id || "",
              name: result.assetSelection.product?.filename || "",
              filename: result.assetSelection.product?.filename || "",
              type: "product",
              reason: "compositionConfig",
            },
          },
        },
      });

      status.completedStages.push("asset_selection");
      console.log(`[Orchestrator] COMPOSITION MODE asset selection complete`);

      // ── Ortak değişkenler (STAGE 2+ için) ──
      const timeOfDay = getTimeOfDay();
      const mood = moodDetails.geminiPresetId || getMoodFromTime();
      // accessoryAllowed: senaryodan oku (override varsa override, yoksa seçilen senaryodan)
      let accessoryAllowed = overrideScenarioData?.accessoryAllowed === true;
      let shallowDepthOfField = overrideScenarioData?.shallowDepthOfField === true;

      // Asset seçim kurallarını yükle (prompt optimization'da lazım)
      const actualIsManualShared = isManual !== undefined ? isManual : !slotId;
      const assetSelectionConfigShared = await getAssetSelectionConfig();
      const assetSelectionRules = actualIsManualShared
        ? assetSelectionConfigShared.manual
        : assetSelectionConfigShared.scheduled;

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

      // Bloklanmış senaryoları çıkar (son N üretimde kullanılanlar)
      // KRİTİK: Senaryo override seçiliyken diversity uygulanmaz — kullanıcının bilinçli tercihi
      if (effectiveScenarioId) {
        console.log(`[Orchestrator] Senaryo override seçili ("${overrideScenarioData?.name}") — senaryo diversity devre dışı (kullanıcı tercihi)`);
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

      // AUTO MOD: Puanlama algoritması zaten seçti — Gemini'ye sormadan kullan
      if (isAutoMode && autoSelectedScenarioResult) {
        const directScenario = autoSelectedScenarioResult;
        console.log(`[Orchestrator] AUTO MOD: Senaryo "${directScenario.name}" puanlama algoritmasından alındı — Gemini senaryo seçimi ATLANDI`);

        scenarioResponse = {
          success: true,
          cost: 0,
          data: {
            scenarioId: directScenario.id,
            scenarioName: directScenario.name,
            scenarioDescription: directScenario.description || "",
            compositionId: directScenario.compositionId || "default",
            includesHands: false,
            reasoning: `AUTO mod — puanlama algoritması seçti`,
          },
        };
      } else if (!isAutoMode && nonInteriorFiltered.length === 1) {
        const directScenario = nonInteriorFiltered[0];
        console.log(`[Orchestrator] NORMAL MOD: Tek senaryo "${directScenario.name}" — Gemini senaryo seçimi ATLANDI (token tasarrufu)`);

        scenarioResponse = {
          success: true,
          cost: 0,
          data: {
            scenarioId: directScenario.id,
            scenarioName: directScenario.name,
            scenarioDescription: directScenario.description || "",
            compositionId: directScenario.compositionId || "default",
            includesHands: false,
            reasoning: "Normal mod — tek senaryo, Gemini seçimi atlandı",
          },
        };
      } else {
        // Çoklu senaryo — kural bazlı rastgele seçim (AI çağrısı YOK)
        const randomIndex = Math.floor(Math.random() * nonInteriorFiltered.length);
        const randomScenario = nonInteriorFiltered[randomIndex];
        console.log(`[Orchestrator] Kural bazlı seçim: "${randomScenario.name}" (${nonInteriorFiltered.length} senaryo arasından rastgele)`);

        scenarioResponse = {
          success: true,
          cost: 0,
          data: {
            scenarioId: randomScenario.id,
            scenarioName: randomScenario.name,
            scenarioDescription: randomScenario.description || "",
            compositionId: randomScenario.compositionId || "default",
            includesHands: false,
            reasoning: `Kural bazlı rastgele seçim (${nonInteriorFiltered.length} senaryo)`,
          },
        };
      }

      // Önce maliyeti ekle (hata olsa bile API çağrısı yapıldı)
      totalCost += scenarioResponse.cost || 0;

      if (!scenarioResponse.success || !scenarioResponse.data) {
        throw new Error(`Senaryo seçimi başarısız: ${scenarioResponse.error || "Bilinmeyen hata"}`);
      }

      // Interior senaryosu mu kontrol et
      const selectedScenario = filteredScenarios.find(s => s.id === scenarioResponse.data?.scenarioId) as FirestoreScenario | undefined;
      const isInteriorScenario = selectedScenario?.isInterior || false;
      const interiorType = selectedScenario?.interiorType;

      // Seçilen senaryonun sahne ayarlarını oku (override yoksa seçilen senaryodan)
      if (!overrideScenarioData && selectedScenario) {
        accessoryAllowed = selectedScenario.accessoryAllowed === true;
        shallowDepthOfField = selectedScenario.shallowDepthOfField === true;
      }

      // selectedScenario'dan compositionSlots oku (override yoksa ve henüz compositionConfig ayarlanmadıysa)
      if (!compositionConfig && !overrideScenarioData && selectedScenario) {
        const scenarioSlots = (selectedScenario as any)?.compositionSlots;
        if (scenarioSlots && Object.keys(scenarioSlots).length > 0) {
          const slotsFromScenario: Record<string, SlotSelection> = {};
          for (const [key, config] of Object.entries(scenarioSlots)) {
            const sc = config as { state: string; filterTags?: string[] };
            if (sc.state !== "disabled") {
              slotsFromScenario[key] = {
                slotKey: key,
                state: sc.state as "random" | "manual" | "disabled",
                source: "template",
                ...(sc.filterTags && sc.filterTags.length > 0 && { filterTags: sc.filterTags }),
              };
            }
          }
          compositionConfig = { slots: slotsFromScenario };
          console.log(`[Orchestrator] Senaryo'dan compositionSlots yüklendi (${Object.keys(slotsFromScenario).length} aktif slot)`);
        }
      }

      // compositionId artık senaryo tanımından alınır (Gemini'nin seçimi değil, kullanıcının seçimi)
      let predefinedCompositionId = selectedScenario?.compositionId || "default";

      result.scenarioSelection = {
        ...scenarioResponse.data,
        // KRİTİK: scenarioDescription'ı Firestore'dan al (Gemini döndürmezse fallback)
        scenarioDescription: scenarioResponse.data.scenarioDescription || selectedScenario?.description || "",
        // compositionId: Senaryo tanımındaki sabit değer kullanılır
        compositionId: predefinedCompositionId,
        isInterior: isInteriorScenario,
        interiorType: interiorType,
        // Geriye uyumluluk: themeId alanı (eski loglar/dashboard için)
        themeId: effectiveScenarioId,
        themeName: overrideScenarioData?.name,
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
        model: "system",
        userPrompt: `Ürün: ${productType}, Zaman: ${timeOfDay}, Asset: ${result.assetSelection!.product?.filename || "bilinmiyor"}`,
        response: scenarioResponse.data?.reasoning || "",
        status: "success",
        durationMs: 0,
        decisionDetails: {
          selectedScenario: {
            id: result.scenarioSelection!.scenarioId,
            name: result.scenarioSelection!.scenarioName,
            description: result.scenarioSelection!.scenarioDescription,
            includesHands: false,
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

        // Interior asset seç (interior assets'i yükle)
        const interiorAssets = await this.loadAvailableAssets(productType);
        const selectedInterior = selectInteriorAsset(interiorAssets.interior, interiorType);

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
        // STAGE 3: PROMPT BUILDING (template bazlı — AI çağrısı YOK)
        // ==========================================
        await this.checkCancellation(slotId); // İptal kontrolü
        console.log("[Orchestrator] Stage 3: Prompt Building (template bazlı)");
        status.currentStage = "prompt_building";
        if (onProgress) await onProgress("prompt_building", 3, TOTAL_STAGES);

        // Senaryo Gemini ayarlarını al (varsa)
        const scenarioGeminiData = selectedScenario ? {
          compositionEntry: selectedScenario.compositionEntry,
        } : undefined;

        // Gemini-native prompt oluştur (template bazlı — AI çağrısı yok)
        const basePromptResult = await this.getScenarioPrompt(
          result.scenarioSelection!.scenarioId,
          result.scenarioSelection!.compositionId,
          result.assetSelection!,
          mood,
          productType,
          timeOfDay,
          scenarioGeminiData,
          result.scenarioSelection!.scenarioDescription,
          {
            weather: moodDetails.weather,
            lightingPrompt: moodDetails.lightingPrompt,
            colorGradePrompt: moodDetails.colorGradePrompt,
            description: moodDetails.description,
            timeOfDay: moodDetails.timeOfDay,
            season: moodDetails.season,
          },
          selectedScenario?.description,
          selectedScenario ? { setting: selectedScenario.setting, accessoryAllowed: selectedScenario.accessoryAllowed, accessoryOptions: selectedScenario.accessoryOptions } : undefined,
          accessoryAllowed,
          (selectedScenario?.accessoryOptions || overrideScenarioData?.accessoryOptions) as string[] | undefined,
          shallowDepthOfField
        );

        console.log(`[Orchestrator] Base prompt built with Gemini terminology`);

        result.optimizedPrompt = {
          mainPrompt: basePromptResult.mainPrompt,
          negativePrompt: basePromptResult.negativePrompt || "",
          customizations: [],
          aspectRatio: overrideAspectRatio || "9:16",
          faithfulness: 0.8,
        };
        status.completedStages.push("prompt_building");

        // Prompt building decision log
        await AILogService.logDecision({
          stage: "prompt-building",
          pipelineId,
          slotId,
          productType,
          model: "template",
          userPrompt: `Base Prompt (${basePromptResult.promptBuildingSteps?.length || 0} karar adımı): ${basePromptResult.mainPrompt.substring(0, 200)}...`,
          response: "Template bazlı — AI optimizasyonu yok",
          status: "success",
          durationMs: 0,
          decisionDetails: {
            promptDetails: {
              mainPrompt: result.optimizedPrompt.mainPrompt,
              negativePrompt: result.optimizedPrompt.negativePrompt,
            },
            promptBuildingSteps: basePromptResult.promptBuildingSteps,
          },
        });
        console.log(`[Orchestrator] Prompt built (${basePromptResult.promptBuildingSteps?.length || 0} steps) — AI optimizasyonu kaldırıldı`);

        // ==========================================
        // STAGE 4: IMAGE GENERATION (TEK AI çağrısı — with retry on block)
        // ==========================================
        await this.checkCancellation(slotId); // İptal kontrolü
        console.log("[Orchestrator] Stage 4: Image Generation (tek AI çağrısı)");
        status.currentStage = "image_generation";
        if (onProgress) await onProgress("image_generation", 4, TOTAL_STAGES);

        let generationAttempt = 0;
        let generatedImage: GeneratedImage | null = null;

        while (generationAttempt < this.config.maxRetries) {
          generationAttempt++;
          console.log(`[Orchestrator] Generation attempt ${generationAttempt}/${this.config.maxRetries}`);

          try {
            // Ürün görselini yükle (Cloudinary veya Firebase Storage)
            const productAsset = result.assetSelection!.product;
            const productImageBase64 = await loadImageAsBase64(productAsset, this.storage);
            console.log(`[Orchestrator] Product loaded: ${productAsset.filename} (${productImageBase64.length} chars)`);

            // Load reference images (plate, table, cup) if selected
            // Asset objelerini doğrudan gönderiyoruz - Cloudinary URL varsa otomatik kullanılacak
            const referenceImages: Array<{ base64: string; mimeType: string; label: string; description?: string }> = [];

            // Basit referans asset'leri yükle (plate, table, napkin, cutlery)
            const simpleRefs: Array<{ asset: Asset | undefined; label: string }> = [
              { asset: result.assetSelection!.plate, label: "plate" },
              { asset: result.assetSelection!.table, label: "table" },
              { asset: result.assetSelection!.napkin, label: "napkin" },
              { asset: result.assetSelection!.cutlery, label: "cutlery" },
            ];
            for (const { asset, label } of simpleRefs) {
              if (asset) {
                referenceImages.push(await this.loadReferenceAsset(asset, label));
              }
            }

            // Cup: beverage logic ayrı (etiket bazlı içecek tespiti)
            if (result.assetSelection!.cup) {
              const cupAsset = result.assetSelection!.cup;
              const cupColors = cupAsset.visualProperties?.dominantColors?.join(", ") || "";
              const cupMaterial = cupAsset.visualProperties?.material || "ceramic";
              let cupDescription = `${cupColors} ${cupMaterial}`.trim();

              // Etiketlerden içecek ipucu çıkar
              const drinkwareSlot = compositionConfig?.slots["drinkware"] as SlotSelection | undefined;
              const preferredCupTags = drinkwareSlot?.filterTags || [];
              const cupTags = cupAsset.tags || [];
              const beverageKeywords: Record<string, string> = {
                "portakal suyu": "fresh orange juice",
                "portakal": "fresh orange juice",
                "limonata": "lemonade",
                "meyve suyu": "fruit juice",
                "çay": "tea",
                "kahve": "coffee",
                "iced coffee": "iced coffee",
                "iced americano": "iced americano",
                "iced coffee latte": "iced coffee latte",
                "latte": "latte",
                "cappuccino": "cappuccino",
                "sıcak çikolata": "hot chocolate",
              };
              const sortedKeywords = Object.keys(beverageKeywords).sort((a, b) => b.length - a.length);
              let tagBeverage: string | null = null;

              // 1. Preferred tags (kullanıcının senaryoda seçtiği etiketler) — EN ÖNCELİKLİ
              if (preferredCupTags.length > 0) {
                for (const kw of sortedKeywords) {
                  if (preferredCupTags.some(t => t.toLowerCase().includes(kw) || kw.includes(t.toLowerCase()))) {
                    tagBeverage = beverageKeywords[kw];
                    break;
                  }
                }
              }

              // 2. Preferred'da yoksa asset tag'lerinden ara
              if (!tagBeverage) {
                for (const kw of sortedKeywords) {
                  if (cupTags.some(t => t.toLowerCase().includes(kw) || kw.includes(t.toLowerCase()))) {
                    tagBeverage = beverageKeywords[kw];
                    break;
                  }
                }
              }

              if (tagBeverage) {
                cupDescription += `, contains ${tagBeverage}`;
                console.log(`[Orchestrator] Cup beverage: ${tagBeverage}`);
              }

              const cupBase64 = await loadImageAsBase64(cupAsset, this.storage);
              referenceImages.push({ base64: cupBase64, mimeType: "image/png", label: "cup", description: cupDescription || undefined });
            }

            console.log(`[Orchestrator] ${referenceImages.length} reference images loaded for ${this.imageProvider.toUpperCase()}`);

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

            // Başarılı üretim — döngüden çık (QC kaldırıldı)
            console.log(`[Orchestrator] Image generated successfully on attempt ${generationAttempt}`);
            break;
          } catch (genError) {
            console.error(`[Orchestrator] Generation attempt ${generationAttempt} failed:`, genError);

            // Bir sonraki denemeye geç
            continue;
          }
        }

        if (!generatedImage) {
          throw new Error("Görsel üretimi tüm denemelerde başarısız oldu. Lütfen tekrar deneyin.");
        }

        result.generatedImage = generatedImage;
        result.qualityControl = {
          passed: true,
          score: 10,
          evaluation: { productAccuracy: 10, composition: 10, lighting: 10, realism: 10, instagramReadiness: 10 },
          feedback: "QC kaldırıldı — direkt onay",
          shouldRegenerate: false,
        };
        status.completedStages.push("image_generation");

        // Görseli Storage'a kaydet
        const storageUrl = await saveImageToStorage(generatedImage.imageBase64, generatedImage.mimeType, this.storage);
        result.generatedImage.storageUrl = storageUrl;

        const refCount = [result.assetSelection!.product, result.assetSelection!.plate, result.assetSelection!.table, result.assetSelection!.cup, result.assetSelection!.napkin, result.assetSelection!.cutlery].filter(Boolean).length;
        console.log(`[Orchestrator] Image generated with ${refCount} reference assets`);
      } // else bloğu sonu (normal akış - AI görsel üretimi)

      // ==========================================
      // STAGE 5: TELEGRAM APPROVAL
      // ==========================================
      console.log("[Orchestrator] Stage 5: Telegram Approval");
      status.currentStage = "telegram_approval";
      if (onProgress) await onProgress("telegram_approval", 5, TOTAL_STAGES);

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
        handStyleId: null,
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
    slotAssets: Record<string, Asset[]>;
    pets: Asset[];
    environments: Asset[];
    interior: Asset[];
    exterior: Asset[];
    accessories: Asset[];
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

    // Slot tanımlarını yükle
    const slotDefsConfig = await getSlotDefinitions();
    const activeSlots = slotDefsConfig.slots.filter(s => s.isActive);

    // 1. Ürün query'si (slot dışı — productType bazlı)
    const productsPromise = assetsRef
      .where("category", "==", "products")
      .where("subType", "==", resolvedSlug)
      .where("isActive", "==", true)
      .get();

    // 2. Slot asset'leri — Kademeli arama: kategori+subType → sadece kategori → fallback
    const slotPromises = activeSlots.map(async (slot) => {
      let snap: FirebaseFirestore.QuerySnapshot;

      // 1. Adım: Kategori + SubType (en spesifik)
      if (slot.assetSubType) {
        snap = await assetsRef
          .where("isActive", "==", true)
          .where("category", "==", slot.assetCategory)
          .where("subType", "==", slot.assetSubType)
          .limit(100)
          .get();

        // SubType eşleşmezse sadece kategori ile dene
        if (snap.empty) {
          snap = await assetsRef
            .where("isActive", "==", true)
            .where("category", "==", slot.assetCategory)
            .limit(100)
            .get();
        }
      } else {
        snap = await assetsRef
          .where("isActive", "==", true)
          .where("category", "==", slot.assetCategory)
          .limit(100)
          .get();
      }

      // 2. Adım: Hâlâ boşsa dinamik kategorilerden ara (linkedSlotKey + isim eşleştirme)
      if (snap.empty && slot.label) {
        try {
          const catConfig = await categoryService.getCategories();
          const categories = catConfig.categories.filter(c => !c.isDeleted);

          // linkedSlotKey ile bağlı kategoriyi bul
          const linkedCat = categories.find(c => c.linkedSlotKey === slot.key);
          if (linkedCat) {
            snap = await assetsRef
              .where("category", "==", linkedCat.type)
              .where("isActive", "==", true)
              .limit(100)
              .get();
            if (!snap.empty) {
              console.log(`[Orchestrator] Slot "${slot.key}" fallback (linkedSlotKey): kategori "${linkedCat.type}" → ${snap.size} asset`);
            }
          }

          // Hâlâ boşsa isim eşleştirme
          if (snap.empty) {
            const keywords = slot.label.toLowerCase().split(/[\s\/\-]+/).filter(w => w.length > 2);
            for (const cat of categories) {
              const catName = cat.displayName.toLowerCase();
              if (keywords.some(kw => catName.includes(kw))) {
                const fallbackSnap = await assetsRef
                  .where("category", "==", cat.type)
                  .where("isActive", "==", true)
                  .limit(100)
                  .get();
                if (!fallbackSnap.empty) {
                  snap = fallbackSnap;
                  console.log(`[Orchestrator] Slot "${slot.key}" fallback (isim): kategori "${cat.type}" → ${snap.size} asset`);
                  break;
                }
              }
            }
          }
        } catch (err) {
          console.warn(`[Orchestrator] Slot "${slot.key}" fallback hatası:`, err);
        }
      }

      return {
        key: slot.key,
        assets: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      };
    });

    // 3. Özel asset'ler (slot dışı — pets, environments, interior, exterior, accessories)
    const specialPromises = [
      assetsRef.where("category", "==", "pets").where("isActive", "==", true).get(),
      assetsRef.where("category", "==", "environments").where("isActive", "==", true).get(),
      assetsRef.where("category", "==", "interior").where("isActive", "==", true).get(),
      assetsRef.where("category", "==", "exterior").where("isActive", "==", true).get(),
      assetsRef.where("category", "==", "accessories").where("isActive", "==", true).get(),
    ];

    // Paralel yükleme
    const [productsSnap, slotResults, specialSnaps] = await Promise.all([
      productsPromise,
      Promise.all(slotPromises),
      Promise.all(specialPromises),
    ]);

    // slotAssets map oluştur
    const slotAssets: Record<string, Asset[]> = {};
    for (const result of slotResults) {
      slotAssets[result.key] = result.assets;
    }

    // Graceful skip pattern: Asset bulunamadığında warning ver ama devam et
    if (productsSnap.docs.length === 0) {
      console.warn(`[Orchestrator] No product assets found for '${resolvedSlug}'. Check if assets exist for this category.`);
    }
    for (const slot of activeSlots) {
      if ((slotAssets[slot.key] || []).length === 0) {
        console.warn(`[Orchestrator] No assets found for slot '${slot.key}' (${slot.assetCategory}/${slot.assetSubType || "*"})`);
      }
    }

    const [petsSnap, environmentsSnap, interiorSnap, exteriorSnap, accessoriesSnap] = specialSnaps;

    const slotLog = activeSlots.map(s => `${s.key}: ${(slotAssets[s.key] || []).length}`).join(", ");
    console.log(`[Orchestrator] Assets found - products: ${productsSnap.docs.length} (${resolvedSlug}), ${slotLog}, pets: ${petsSnap.docs.length}, environments: ${environmentsSnap.docs.length}, interior: ${interiorSnap.docs.length}, exterior: ${exteriorSnap.docs.length}, accessories: ${accessoriesSnap.docs.length}`);

    return {
      products: productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      slotAssets,
      pets: petsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      environments: environmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      interior: interiorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      exterior: exteriorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
      accessories: accessoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)),
    };
  }

  /**
   * Senaryo prompt'unu al (Firestore veya Gemini builder)
   * compositionId parametresi ile detaylı prompt üretir
   * mood parametresi ile atmosfer bilgisi eklenir
   *
   * Yeni: Gemini terminolojisi ile zenginleştirilmiş prompt
   * KRİTİK: scenarioDescription parametresi ortam bilgisi için zorunlu
   * GÜNCELLEME: selectedCup yerine selectedAssets tüm assetler için
   */
  private async getScenarioPrompt(
    scenarioId: string,
    compositionId?: string,
    selectedAssets?: AssetSelection,
    mood?: string,
    productType?: string,
    timeOfDay?: string,
    scenarioData?: {
      compositionEntry?: string;
    },
    scenarioDescription?: string,
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
    accessoryAllowed?: boolean,
    accessoryOptions?: string[],
    shallowDepthOfField?: boolean
  ): Promise<{ mainPrompt: string; negativePrompt?: string; promptBuildingSteps?: Array<{ step: string; input: string | null; matched: boolean; result: string | null; fallback: boolean; details?: Record<string, unknown> }> }> {
    // Firestore'dan prompt şablonunu çek
    const promptDoc = await this.db.collection("scenario-prompts").doc(scenarioId).get();

    if (promptDoc.exists) {
      // Firestore'dan gelen prompt'a kompozisyon ekle + el referanslarını temizle
      let prompt = this.stripHandReferences(promptDoc.data()?.prompt || "");

      // Senaryo açıklamasını SCENE DIRECTION olarak ekle (referans görseller her zaman öncelikli)
      if (scenarioDescription) {
        const cleanDescription = this.stripHandReferences(scenarioDescription);
        prompt += `\n\nSCENE DIRECTION (creative guidance - reference images always take precedence):\n${cleanDescription}\nNOTE: This describes the desired scene composition. Always prioritize visual evidence from reference images over this description.\n`;
        console.log(`[Orchestrator] getScenarioPrompt: scenarioDescription ACTIVE (${cleanDescription.substring(0, 30)}...)`);
      }

      prompt += await this.getCompositionDetails(scenarioId, compositionId);
      prompt += this.getCupReferenceDetails(selectedAssets?.cup);

      const negativePrompt = await buildNegativePrompt(["always"]);

      return { mainPrompt: prompt, negativePrompt };
    }

    // Gemini builder ile dinamik prompt oluştur
    return this.buildDynamicPromptWithGemini(
      scenarioId,
      compositionId,
      undefined,
      selectedAssets,
      mood,
      productType,
      timeOfDay,
      scenarioData,
      scenarioDescription, // KRİTİK: Senaryo açıklamasını aktar
      moodDetails,
      themeDescription,
      themeData?.setting,
      accessoryAllowed,
      accessoryOptions,
      shallowDepthOfField
    );
  }

  /**
   * Kompozisyon detaylarını döndür (Firestore'dan dinamik, fallback hardcoded)
   */
  private async getCompositionDetails(scenarioId: string, compositionId?: string): Promise<string> {
    if (!compositionId || compositionId === "default") return "";

    const dynamicComp = await getCompositionTemplate(compositionId);
    if (dynamicComp) {
      console.log(`[Orchestrator] Using dynamic composition: ${dynamicComp.id} - ${dynamicComp.name}`);
      return `

COMPOSITION - ${dynamicComp.nameEn.toUpperCase()}:
${dynamicComp.geminiPrompt}`;
    }

    console.warn(`[Orchestrator] Composition "${compositionId}" Firestore'da bulunamadı (senaryo: ${scenarioId})`);
    return "";
  }

  /**
   * Senaryo açıklamasından el referanslarını temizle
   * Firestore'daki eski senaryolarda hâlâ el içeriği olabilir
   */
  private stripHandReferences(description: string): string {
    // El ile ilgili cümleleri/ifadeleri kaldır
    const handPatterns = [
      /\b(being\s+)?held\s+(elegantly\s+)?by\s+(a\s+)?(slender\s+|elegant\s+)?hand[^.]*\./gi,
      /\b(a\s+)?(slender\s+|elegant\s+)?hand\s+(with\s+|gently\s+|cradles?\s+|supports?\s+)[^.]*\./gi,
      /\bThe\s+hand\s+[^.]*\./gi,
      /\bwith\s+(natural\s+)?terracotta\s+matte\s+nails[^.]*\./gi,
      /\bwell-manicured\s+nails[^.,]*/gi,
      /\ba\s+single\s+thin\s+gold\s+ring[^.,]*/gi,
      /\bdelicate\s+gold\s+ring[^.,]*/gi,
      /\bshowcasing\s+[^.]*nails[^.]*\./gi,
      /,?\s*by\s+(a\s+)?(slender\s+|elegant\s+)?hand\s+with[^,.]*/gi,
    ];

    let clean = description;
    for (const pattern of handPatterns) {
      clean = clean.replace(pattern, "");
    }
    // Çift boşlukları temizle
    clean = clean.replace(/\s{2,}/g, " ").trim();

    if (clean !== description) {
      console.log(`[Orchestrator] El referansları scenarioDescription'dan temizlendi`);
    }
    return clean;
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
   * Referans asset'i yükle ve ReferenceImage formatında döndür
   */
  private async loadReferenceAsset(
    asset: Asset,
    label: string,
    descriptionOverride?: string
  ): Promise<{ base64: string; mimeType: string; label: string; description?: string }> {
    const base64 = await loadImageAsBase64(asset, this.storage);
    const colors = asset.visualProperties?.dominantColors?.join(", ") || "";
    const material = asset.visualProperties?.material || "";
    const style = asset.visualProperties?.style || "";
    const description = descriptionOverride || `${colors} ${material} ${style}`.trim() || undefined;
    return { base64, mimeType: "image/png", label, description };
  }

  /**
   * Dinamik prompt oluştur (Gemini terminolojisi ile)
   * Yeni sistem: Firestore'daki Gemini preset'lerini kullanır
   * Fallback: Hardcoded Gemini terminolojisi
   */
  private async buildDynamicPromptWithGemini(
    scenarioId: string,
    compositionId?: string,
    _unused?: string, // eski parametre sırası korunuyor (çağıran kodlar için)
    selectedAssets?: AssetSelection,
    mood?: string,
    productType?: string,
    timeOfDay?: string,
    scenarioData?: {
      compositionEntry?: string;
    },
    scenarioDescription?: string,
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
    accessoryAllowed?: boolean,
    accessoryOptions?: string[],
    shallowDepthOfField?: boolean
  ): Promise<{ mainPrompt: string; negativePrompt: string; promptBuildingSteps?: Array<{ step: string; input: string | null; matched: boolean; result: string | null; fallback: boolean; details?: Record<string, unknown> }> }> {
    // Senaryo verilerinden Gemini parametrelerini çıkar
    // NOT: lightingPreset artık Senaryo'dan değil, Mood'dan geliyor
    const scenarioParams = scenarioData
      ? extractGeminiParamsFromScenario({
        mood,
        compositionEntry: scenarioData.compositionEntry,
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
        compositionId: scenarioParams.compositionId || compositionId,
        productType,
        timeOfDay: timeOfDay || getTimeOfDay(),
        assetTags: hasAssetTags ? assetTags : undefined,
        scenarioDescription: scenarioDescription ? this.stripHandReferences(scenarioDescription) : undefined, // El referansları temizlenmiş
        themeSetting: themeSetting as any, // Tema sahne ayarları (hava, ışık, atmosfer)
        accessoryAllowed, // Tema izni: AI dekoratif aksesuar üretsin mi?
        accessoryOptions, // Kullanıcının seçtiği aksesuar listesi
        shallowDepthOfField, // Ürün net, arka plan blur
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
        if (selectedAssets?.cutlery) {
          // Decor slot aktif → cutlery referans görseli gönderildi → çelişki yaratma
          console.log(`[Orchestrator] 🍴 EATING METHOD: hand BUT decor/cutlery slot active - composition override`);
          prompt += "\n\nPHYSICAL LOGIC: This product is eaten BY HAND. Decorative cutlery is placed as a styling element per composition choice, NOT for eating the product.";
        } else {
          console.log(`[Orchestrator] 🍴 EATING METHOD: hand - blocking cutlery`);
          prompt += "\n\nPHYSICAL LOGIC: This product is eaten BY HAND. STRICTLY NO cutlery (fork, knife, spoon) in the scene.";
          negativePrompt += ", fork, knife, spoon, cutlery, utensil, silverware";
        }
      } else if (eatingMethod === "fork" || eatingMethod === "fork-knife") {
        console.log(`[Orchestrator] 🍴 EATING METHOD: ${eatingMethod} - allowing fork`);
        prompt += "\n\nPHYSICAL LOGIC: This product is eaten with a fork. A fork may be visible near the product.";
      } else if (eatingMethod === "spoon") {
        console.log(`[Orchestrator] 🍴 EATING METHOD: spoon - allowing spoon`);
        prompt += "\n\nPHYSICAL LOGIC: This product is eaten with a spoon. A spoon may be visible near the product.";
      } else if (eatingMethod === "none") {
        console.log(`[Orchestrator] 🍴 EATING METHOD: none (beverage) - no cutlery needed`);
      }

      const cutleryOverride = eatingMethod === "hand" && !!selectedAssets?.cutlery;
      allDecisions.push({
        step: "eating-method-constraint",
        input: eatingMethod || null,
        matched: !!eatingMethod,
        result: eatingMethod
          ? `${eatingMethod} → ${cutleryOverride ? "decor slot aktif → cutlery OVERRIDE (dekoratif)" : eatingMethod === "hand" ? "çatal/bıçak/kaşık ENGELLENDİ" : eatingMethod === "fork" || eatingMethod === "fork-knife" ? "çatal İZİN VERİLDİ" : eatingMethod === "spoon" ? "kaşık İZİN VERİLDİ" : "yeme aracı gereksiz"}`
          : "eatingMethod tanımlı değil",
        fallback: false,
        details: {
          source: selectedAssets?.product?.eatingMethod ? "product.eatingMethod" : selectedAssets?.product?.holdingType ? "product.holdingType (fallback)" : "yok",
          cutleryOverride,
          addedToNegative: eatingMethod === "hand" && !cutleryOverride ? "fork, knife, spoon, cutlery, utensil, silverware" : null,
        },
      });

      prompt += await this.getCompositionDetails(scenarioId, compositionId);
      prompt += this.getCupReferenceDetails(selectedAssets?.cup);

      console.log(`[Orchestrator] Built Gemini prompt with mood: ${geminiResult.metadata.mood?.id}, lighting: ${geminiResult.metadata.lighting?.id}, total decisions: ${allDecisions.length}`);

      return {
        mainPrompt: prompt,
        negativePrompt: negativePrompt,
        promptBuildingSteps: allDecisions,
      };
    } catch (error) {
      console.error("[Orchestrator] Gemini prompt builder failed:", error);
      throw new Error(`Gemini prompt builder hatası: ${error instanceof Error ? error.message : String(error)}`);
    }
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

      await this.db.collection("media-queue").doc(shortId).set(photoItem);
      console.log(`[Orchestrator] Saved interior photo to queue: ${shortId}`);

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
        handStyle: null,
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

    await this.db.collection("media-queue").doc(shortId).set(photoItem);
    console.log(`[Orchestrator] Saved photo to queue: ${shortId}`);

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
    // Undefined değerleri temizle + imageBase64 strip (zaten Storage'da, Firestore 1MB limitini aşar)
    const cleanedResult = removeUndefined(result);
    if (cleanedResult.generatedImage) {
      cleanedResult.generatedImage = { ...cleanedResult.generatedImage, imageBase64: "" };
    }
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

    // Product (her zaman var)
    if (assetSelection.product?.id) assetsToUpdate.push(assetSelection.product.id);

    // Slot asset'leri — dinamik
    if (assetSelection.slots) {
      for (const asset of Object.values(assetSelection.slots)) {
        if (asset?.id) assetsToUpdate.push(asset.id);
      }
    } else {
      // Fallback: eski named fields (slots yoksa)
      if (assetSelection.plate?.id) assetsToUpdate.push(assetSelection.plate.id);
      if (assetSelection.cup?.id) assetsToUpdate.push(assetSelection.cup.id);
      if (assetSelection.table?.id) assetsToUpdate.push(assetSelection.table.id);
      if (assetSelection.decor?.id) assetsToUpdate.push(assetSelection.decor.id);
      if (assetSelection.napkin?.id) assetsToUpdate.push(assetSelection.napkin.id);
      if (assetSelection.cutlery?.id) assetsToUpdate.push(assetSelection.cutlery.id);
    }

    // Slot dışı asset'ler
    if (assetSelection.pet?.id) assetsToUpdate.push(assetSelection.pet.id);
    if (assetSelection.interior?.id) assetsToUpdate.push(assetSelection.interior.id);
    if (assetSelection.accessory?.id) assetsToUpdate.push(assetSelection.accessory.id);

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

  // ==========================================
  // COMPOSITION CONFIG → ASSET SELECTION
  // ==========================================
  // compositionConfig varsa, RuleEngine/Gemini yerine slot bazlı asset çözümleme
  // disabled → atla, manual → ID ile yükle, random → havuzdan rastgele seç

  /**
   * Tek bir asset'i Firestore'dan ID ile yükle
   */
  private async loadAssetById(assetId: string): Promise<Asset | null> {
    try {
      const doc = await this.db.collection("assets").doc(assetId).get();
      if (!doc.exists) {
        console.warn(`[Composition] Asset bulunamadı: ${assetId}`);
        return null;
      }
      return { id: doc.id, ...doc.data() } as Asset;
    } catch (error) {
      console.error(`[Composition] Asset yükleme hatası (${assetId}):`, error);
      return null;
    }
  }

  /**
   * Bir slot için "random" modda asset havuzundan rastgele seç
   * filterTags varsa tag bazlı filtrele, yoksa tümünden seç
   */
  private selectRandomFromPool(
    pool: Asset[],
    filterTags?: string[]
  ): Asset | null {
    if (pool.length === 0) return null;

    let candidates = pool;

    // Tag filtresi uygula (çift yönlü eşleşme)
    if (filterTags && filterTags.length > 0) {
      const filtered = pool.filter(asset =>
        asset.tags && Array.isArray(asset.tags) &&
        filterTags.some(ft =>
          asset.tags.some(t => {
            const a = t.toLowerCase();
            const f = ft.toLowerCase();
            return a.includes(f) || f.includes(a);
          })
        )
      );
      // Filtre sonucu boşsa tüm havuzu kullan (graceful fallback)
      if (filtered.length > 0) {
        candidates = filtered;
      } else {
        console.warn(`[Composition] Tag filtresi eşleşme bulamadı (${filterTags.join(", ")}), tüm havuz kullanılıyor`);
      }
    }

    // usageCount'a göre ağırlıklı rastgele seçim (az kullanılan öncelikli)
    candidates.sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0));
    // İlk %50'den rastgele seç (çeşitlilik + az kullanılan dengesi)
    const topHalf = candidates.slice(0, Math.max(1, Math.ceil(candidates.length / 2)));
    return topHalf[Math.floor(Math.random() * topHalf.length)];
  }

  /**
   * CompositionConfig'den AssetSelection oluştur
   * Pipeline'ın mevcut asset selection mantığının yerine geçer
   *
   * @param compositionConfig - Kullanıcının slot seçimleri
   * @param productType - Ürün tipi (products slot'u için)
   * @returns AssetSelection objesi
   */
  async resolveCompositionAssets(
    compositionConfig: CompositionConfig,
    productType: ProductType
  ): Promise<AssetSelection> {
    console.log(`[Composition] Slot bazlı asset çözümleme başlatılıyor (${Object.keys(compositionConfig.slots).length} slot)`);

    // Asset havuzlarını yükle (random modlar için gerekli)
    const assets = await this.loadAvailableAssets(productType);

    // Slot tanımlarını yükle — assetFieldName config'den
    const slotDefsConfig = await getSlotDefinitions();
    const slotFieldMap: Record<string, string> = {};
    for (const def of slotDefsConfig.slots) {
      slotFieldMap[def.key] = def.assetFieldName;
    }

    // Slot key → asset havuzu eşleşmesi (dinamik — slotAssets'ten)
    const slotAssetPool: Record<string, Asset[]> = {};
    for (const def of slotDefsConfig.slots.filter(s => s.isActive)) {
      slotAssetPool[def.key] = assets.slotAssets[def.key] || [];
    }

    // Sonuç objesi — slots başlat
    const selection: Partial<AssetSelection> = {
      includesPet: false,
      selectionReasoning: "Kompozisyon template'inden slot bazlı seçim",
      slots: {},
    };

    // Ürün seçimi (compositionConfig'de yok, productType'tan gelir)
    if (assets.products.length > 0) {
      // En az kullanılan ürünü seç
      const sortedProducts = [...assets.products].sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0));
      selection.product = sortedProducts[0];
    } else if (productType !== "coffees") {
      throw new Error(`"${productType}" kategorisinde aktif ürün bulunamadı.`);
    }

    // Her slot'u çözümle
    for (const [slotKey, slotSelection] of Object.entries(compositionConfig.slots)) {
      const { state, assetId, filterTags } = slotSelection as SlotSelection;

      if (state === "disabled") {
        console.log(`[Composition] Slot "${slotKey}" → disabled (atlandı)`);
        continue;
      }

      const assetField = slotFieldMap[slotKey];
      if (!assetField) {
        console.warn(`[Composition] Bilinmeyen slot key: "${slotKey}", atlanıyor`);
        continue;
      }

      if (state === "manual" && assetId) {
        // Manuel seçim — ID ile yükle
        const asset = await this.loadAssetById(assetId);
        if (asset) {
          (selection as any)[assetField] = asset; // Geriye uyumluluk
          selection.slots![slotKey] = asset; // Dinamik erişim
          console.log(`[Composition] Slot "${slotKey}" → manual(id): ${asset.filename}`);
        } else {
          console.warn(`[Composition] Slot "${slotKey}" manual asset bulunamadı (${assetId})`);
        }
      } else if (state === "manual" && filterTags && filterTags.length > 0) {
        // Tag-bazlı seçim — kullanıcının etiket tercihi
        // Çift yönlü eşleşme: "portakal" ↔ "portakal suyu" her iki yönde eşleşir
        const tagMatches = (assetTag: string, filterTag: string): boolean => {
          const a = assetTag.toLowerCase();
          const f = filterTag.toLowerCase();
          return a.includes(f) || f.includes(a);
        };

        const pool = slotAssetPool[slotKey] || [];
        const scored = pool
          .filter(asset => asset.tags && Array.isArray(asset.tags))
          .map(asset => {
            // Asset tag'leri + subType slug'ı implicit tag olarak ekle
            const allTags: string[] = [...asset.tags];
            if ((asset as any).subType) {
              allTags.push((asset as any).subType.replace(/-/g, " "));
            }
            const matchCount = filterTags.filter(ft =>
              allTags.some((t: string) => tagMatches(t, ft))
            ).length;
            return { asset, matchCount };
          })
          .filter(item => item.matchCount > 0)
          .sort((a, b) => {
            // En çok etiket eşleşen önce — usageCount SADECE beraberlikte tiebreaker
            if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
            return (a.asset.usageCount || 0) - (b.asset.usageCount || 0);
          });
        if (scored.length > 0) {
          const best = scored[0];
          (selection as any)[assetField] = best.asset; // Geriye uyumluluk
          selection.slots![slotKey] = best.asset; // Dinamik erişim
          const bestAllTags: string[] = [...best.asset.tags];
          if ((best.asset as any).subType) {
            bestAllTags.push((best.asset as any).subType.replace(/-/g, " "));
          }
          const matchedTags = filterTags.filter(ft =>
            bestAllTags.some((t: string) => tagMatches(t, ft))
          );
          const missedTags = filterTags.filter(ft =>
            !bestAllTags.some((t: string) => tagMatches(t, ft))
          );
          console.log(`[Composition] Slot "${slotKey}" → manual(tag): ${best.asset.filename} (skor: ${best.matchCount}/${filterTags.length}, eşleşen: [${matchedTags.join(", ")}]${missedTags.length > 0 ? `, eksik: [${missedTags.join(", ")}]` : ""})`);
        } else {
          console.warn(`[Composition] Slot "${slotKey}" hiçbir asset etiketlerle eşleşmedi (${filterTags.join(", ")}), havuzdan rastgele seçiliyor`);
          const asset = this.selectRandomFromPool(pool);
          if (asset) {
            (selection as any)[assetField] = asset; // Geriye uyumluluk
            selection.slots![slotKey] = asset; // Dinamik erişim
          }
        }
      } else if (state === "random") {
        // Rastgele seçim — havuzdan tag filtreli seç
        const pool = slotAssetPool[slotKey] || [];
        const asset = this.selectRandomFromPool(pool, filterTags);
        if (asset) {
          (selection as any)[assetField] = asset; // Geriye uyumluluk
          selection.slots![slotKey] = asset; // Dinamik erişim
          console.log(`[Composition] Slot "${slotKey}" → random: ${asset.filename} (havuz: ${pool.length}, filtre: ${filterTags?.join(", ") || "yok"})`);
        } else {
          console.warn(`[Composition] Slot "${slotKey}" random seçim yapılamadı (havuz boş)`);
        }
      }
    }

    // compositionConfig snapshot logla
    const slotSummary = Object.entries(selection.slots || {}).map(([k, v]) => `${k}: ${v.filename}`).join(", ");
    console.log(`[Composition] Asset çözümleme tamamlandı — ürün: ${selection.product?.filename || "yok"}, slots: {${slotSummary || "boş"}}`);

    return selection as AssetSelection;
  }
}

// Export types
export * from "./types";

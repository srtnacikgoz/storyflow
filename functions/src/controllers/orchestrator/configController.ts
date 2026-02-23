/**
 * Config Controller
 * Çeşitlilik kuralları ve config yönetimi
 *
 * ÖNEMLİ: Bu controller artık doğru collection'a yazıyor:
 * - global/config/settings/diversity-rules (pipeline'ın okuduğu yer)
 * - Her güncelleme sonrası cache temizleniyor
 */

import { functions, db, getCors, REGION, errorResponse } from "./shared";
import {
  seedFirestoreConfig,
  isConfigInitialized,
  clearConfigCache,
  getDiversityRules,
  getWeeklyThemes,
  getTimeouts,
  updateTimeouts,
  getSystemSettings,
  updateSystemSettings,
  getFixedAssets,
  updateFixedAssets,
  getBusinessContext,
  updateBusinessContext,
  getAssetSelectionConfig,
  updateAssetSelectionConfig,
  getPromptStudioConfig as fetchPromptStudioConfig,
  getPromptTemplate as fetchPromptTemplate,
  updatePromptTemplate as updatePromptTemplateService,
  revertPromptTemplate as revertPromptTemplateService,
  clearPromptStudioCache,
  getProductSlotDefaults,
  updateProductSlotDefaults,
} from "../../services/configService";
import { DEFAULT_DIVERSITY_RULES, DEFAULT_WEEKLY_THEMES_CONFIG } from "../../orchestrator/seed/defaultData";

import { getGeminiTerminologySeedData } from "../../orchestrator/seed/geminiTerminologyData";
import { FirestoreDiversityRules, PromptStageId } from "../../orchestrator/types";

// Firestore path sabitleri
const CONFIG_COLLECTION = "global";
const CONFIG_DOC = "config";
const SETTINGS_SUBCOLLECTION = "settings";
const DIVERSITY_RULES_DOC = "diversity-rules";
const WEEKLY_THEMES_DOC = "weekly-themes";

/**
 * Diversity rules dokümanına referans al
 */
function getDiversityRulesRef() {
  return db
    .collection(CONFIG_COLLECTION)
    .doc(CONFIG_DOC)
    .collection(SETTINGS_SUBCOLLECTION)
    .doc(DIVERSITY_RULES_DOC);
}

/**
 * Weekly themes dokümanına referans al
 */
function getWeeklyThemesRef() {
  return db
    .collection(CONFIG_COLLECTION)
    .doc(CONFIG_DOC)
    .collection(SETTINGS_SUBCOLLECTION)
    .doc(WEEKLY_THEMES_DOC);
}

/**
 * Orchestrator config'i getir (çeşitlilik kuralları)
 * GET /getVariationConfig
 */
export const getVariationConfig = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        // ConfigService üzerinden oku (cache'li)
        const diversityRules = await getDiversityRules();
        const weeklyThemes = await getWeeklyThemes();

        response.json({
          success: true,
          data: {
            variationRules: diversityRules,
            weeklyThemes: weeklyThemes.themes || {},
          },
        });
      } catch (error) {
        errorResponse(response, error, "getVariationConfig");
      }
    });
  });

/**
 * Orchestrator config'i güncelle
 * PUT/POST /updateVariationConfig
 *
 * Body: { variationRules?: Partial<VariationRules>, weeklyThemes?: object }
 */
export const updateVariationConfig = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST" && request.method !== "PUT") {
          response.status(405).json({ success: false, error: "Use POST or PUT" });
          return;
        }

        const { variationRules, weeklyThemes } = request.body;
        const timestamp = Date.now();
        let updated = false;

        // Diversity rules güncelle
        if (variationRules) {
          const docRef = getDiversityRulesRef();
          const doc = await docRef.get();
          const currentData = doc.exists ? (doc.data() as FirestoreDiversityRules) : DEFAULT_DIVERSITY_RULES;

          const updateData: FirestoreDiversityRules = {
            // Mevcut değerler (fallback: default)
            scenarioGap: currentData.scenarioGap ?? DEFAULT_DIVERSITY_RULES.scenarioGap,
            tableGap: currentData.tableGap ?? DEFAULT_DIVERSITY_RULES.tableGap,
            handStyleGap: currentData.handStyleGap ?? DEFAULT_DIVERSITY_RULES.handStyleGap,
            compositionGap: currentData.compositionGap ?? DEFAULT_DIVERSITY_RULES.compositionGap,
            productGap: currentData.productGap ?? DEFAULT_DIVERSITY_RULES.productGap,
            plateGap: currentData.plateGap ?? DEFAULT_DIVERSITY_RULES.plateGap,
            cupGap: currentData.cupGap ?? DEFAULT_DIVERSITY_RULES.cupGap,
            petFrequency: currentData.petFrequency ?? DEFAULT_DIVERSITY_RULES.petFrequency,
            outdoorFrequency: currentData.outdoorFrequency ?? DEFAULT_DIVERSITY_RULES.outdoorFrequency,
            wabiSabiFrequency: currentData.wabiSabiFrequency ?? DEFAULT_DIVERSITY_RULES.wabiSabiFrequency,
            similarityThreshold: currentData.similarityThreshold ?? DEFAULT_DIVERSITY_RULES.similarityThreshold,
            // Yeni değerlerle override
            ...variationRules,
            // Meta
            updatedAt: timestamp,
          };

          await docRef.set(updateData);
          updated = true;
          console.log("[updateVariationConfig] Diversity rules updated:", updateData);
        }

        // Weekly themes güncelle
        if (weeklyThemes) {
          const docRef = getWeeklyThemesRef();
          const doc = await docRef.get();
          const currentThemes = doc.exists ? doc.data()?.themes : DEFAULT_WEEKLY_THEMES_CONFIG.themes;

          await docRef.set({
            themes: {
              ...currentThemes,
              ...weeklyThemes,
            },
            updatedAt: timestamp,
          });
          updated = true;
          console.log("[updateVariationConfig] Weekly themes updated");
        }

        // Cache'i temizle - yeni değerler hemen pipeline'da kullanılsın
        if (updated) {
          clearConfigCache();
          console.log("[updateVariationConfig] Config cache cleared");
        }

        response.json({
          success: true,
          message: "Configuration updated",
        });
      } catch (error) {
        errorResponse(response, error, "updateVariationConfig");
      }
    });
  });

/**
 * Üretim geçmişini getir (çeşitlilik takibi için)
 * GET /getProductionHistory?limit=15
 */
export const getProductionHistory = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const limit = parseInt(request.query.limit as string) || 15;

        const snapshot = await db
          .collection("production-history")
          .orderBy("timestamp", "desc")
          .limit(limit)
          .get();

        const history = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        response.json({
          success: true,
          data: history,
        });
      } catch (error) {
        errorResponse(response, error, "getProductionHistory");
      }
    });
  });

/**
 * Köpek kullanım istatistiğini getir
 * GET /getPetUsageStats
 */
export const getPetUsageStats = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const snapshot = await db
          .collection("production-history")
          .orderBy("timestamp", "desc")
          .limit(15)
          .get();

        const history = snapshot.docs.map(doc => doc.data());

        const lastPetEntry = history.find(entry => entry.includesPet === true);
        const lastPetUsage = lastPetEntry?.timestamp || null;

        let productionsSincePet = 0;
        for (const entry of history) {
          if (entry.includesPet) break;
          productionsSincePet++;
        }

        // ConfigService üzerinden oku (doğru collection + cache)
        const diversityRules = await getDiversityRules();
        const petFrequency = diversityRules.petFrequency || 15;

        response.json({
          success: true,
          data: {
            lastPetUsage,
            productionsSincePet,
            nextPetDue: productionsSincePet >= petFrequency - 1,
          },
        });
      } catch (error) {
        errorResponse(response, error, "getPetUsageStats");
      }
    });
  });

/**
 * Orchestrator config'lerini Firestore'a seed et
 * POST /seedOrchestratorConfig
 */
export const seedOrchestratorConfig = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        // Basit güvenlik kontrolü (secret key)
        const secretKey = request.body?.secretKey || request.query?.secretKey;
        if (secretKey !== "maestro-seed-2026") {
          response.status(403).json({
            success: false,
            error: "Unauthorized",
          });
          return;
        }

        // Config zaten var mı kontrol et
        const initialized = await isConfigInitialized();
        if (initialized) {
          if (!request.body?.force) {
            response.status(400).json({
              success: false,
              error: "Config already initialized. Use force: true to overwrite.",
            });
            return;
          }
        }

        console.log("[seedOrchestratorConfig] Starting seed...");
        await seedFirestoreConfig();

        // Seed sonrası cache temizle
        clearConfigCache();

        response.json({
          success: true,
          message: "Orchestrator config seeded successfully",
        });
      } catch (error) {
        errorResponse(response, error, "seedOrchestratorConfig");
      }
    });
  });

/**
 * Timeout ayarlarını getir
 * GET /getTimeoutsConfig
 */
export const getTimeoutsConfig = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        // ConfigService üzerinden oku (cache'li)
        const timeouts = await getTimeouts();

        response.json({
          success: true,
          data: timeouts,
        });
      } catch (error) {
        errorResponse(response, error, "getTimeoutsConfig");
      }
    });
  });

/**
 * Timeout ayarlarını güncelle
 * PUT/POST /updateTimeoutsConfig
 *
 * Body: { telegramApprovalMinutes?: number, processingTimeoutMinutes?: number, ... }
 */
export const updateTimeoutsConfig = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST" && request.method !== "PUT") {
          response.status(405).json({ success: false, error: "Use POST or PUT" });
          return;
        }

        const updates = request.body;

        // Validasyon
        if (updates.telegramApprovalMinutes !== undefined) {
          const value = Number(updates.telegramApprovalMinutes);
          if (isNaN(value) || value < 5 || value > 1440) {
            response.status(400).json({
              success: false,
              error: "telegramApprovalMinutes must be between 5 and 1440 minutes",
            });
            return;
          }
          updates.telegramApprovalMinutes = value;
        }

        if (updates.processingTimeoutMinutes !== undefined) {
          const value = Number(updates.processingTimeoutMinutes);
          if (isNaN(value) || value < 30 || value > 480) {
            response.status(400).json({
              success: false,
              error: "processingTimeoutMinutes must be between 30 and 480 minutes",
            });
            return;
          }
          updates.processingTimeoutMinutes = value;
        }

        if (updates.fetchTimeoutSeconds !== undefined) {
          const value = Number(updates.fetchTimeoutSeconds);
          if (isNaN(value) || value < 10 || value > 120) {
            response.status(400).json({
              success: false,
              error: "fetchTimeoutSeconds must be between 10 and 120 seconds",
            });
            return;
          }
          updates.fetchTimeoutSeconds = value;
        }

        if (updates.retryDelayMs !== undefined) {
          const value = Number(updates.retryDelayMs);
          if (isNaN(value) || value < 1000 || value > 30000) {
            response.status(400).json({
              success: false,
              error: "retryDelayMs must be between 1000 and 30000 ms",
            });
            return;
          }
          updates.retryDelayMs = value;
        }

        // Güncelle
        await updateTimeouts(updates);

        // Cache temizle
        clearConfigCache();

        console.log("[updateTimeoutsConfig] Timeouts updated:", updates);

        response.json({
          success: true,
          message: "Timeout configuration updated",
        });
      } catch (error) {
        errorResponse(response, error, "updateTimeoutsConfig");
      }
    });
  });

/**
 * Sistem ayarlarını getir
 * GET /getSystemSettingsConfig
 *
 * Hardcoded değerlerin config'e taşınmış hali:
 * - Gemini faithfulness
 * - Max feedback for prompt
 * - Stuck warning timeout
 * - Max logs per query
 * - Cache TTL
 */
export const getSystemSettingsConfig = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        // fresh=1 query param gelirse cache'i bypass et
        if (request.query.fresh === "1") {
          clearConfigCache();
        }
        const systemSettings = await getSystemSettings();

        // API key'leri maskele — frontend'e tam key gönderilmez
        const safeSettings = { ...systemSettings } as Record<string, unknown>;
        if (safeSettings.anthropicApiKey && typeof safeSettings.anthropicApiKey === "string") {
          safeSettings.anthropicApiKey = "●●●●" + (safeSettings.anthropicApiKey as string).slice(-4);
        }
        if (safeSettings.openaiApiKey && typeof safeSettings.openaiApiKey === "string") {
          safeSettings.openaiApiKey = "●●●●" + (safeSettings.openaiApiKey as string).slice(-4);
        }

        response.json({
          success: true,
          data: safeSettings,
        });
      } catch (error) {
        errorResponse(response, error, "getSystemSettingsConfig");
      }
    });
  });

/**
 * Sistem ayarlarını güncelle
 * PUT/POST /updateSystemSettingsConfig
 *
 * Body: {
 *   geminiDefaultFaithfulness?: number, // 0.0 - 1.0
 *   maxFeedbackForPrompt?: number,      // 1 - 50
 *   stuckWarningMinutes?: number,       // 5 - 60
 *   maxLogsPerQuery?: number,           // 10 - 500
 *   cacheTTLMinutes?: number,           // 1 - 60
 * }
 */
export const updateSystemSettingsConfig = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST" && request.method !== "PUT") {
          response.status(405).json({ success: false, error: "Use POST or PUT" });
          return;
        }

        const updates = request.body;

        // Validasyon: schedulerEnabled (boolean)
        if (updates.schedulerEnabled !== undefined) {
          if (typeof updates.schedulerEnabled !== "boolean") {
            response.status(400).json({
              success: false,
              error: "schedulerEnabled must be a boolean",
            });
            return;
          }
        }


        // Validasyon: geminiDefaultFaithfulness (0.0 - 1.0)
        if (updates.geminiDefaultFaithfulness !== undefined) {
          const value = Number(updates.geminiDefaultFaithfulness);
          if (isNaN(value) || value < 0.0 || value > 1.0) {
            response.status(400).json({
              success: false,
              error: "geminiDefaultFaithfulness must be between 0.0 and 1.0",
            });
            return;
          }
          updates.geminiDefaultFaithfulness = value;
        }

        // Validasyon: maxFeedbackForPrompt (1 - 50)
        if (updates.maxFeedbackForPrompt !== undefined) {
          const value = Number(updates.maxFeedbackForPrompt);
          if (isNaN(value) || value < 1 || value > 50) {
            response.status(400).json({
              success: false,
              error: "maxFeedbackForPrompt must be between 1 and 50",
            });
            return;
          }
          updates.maxFeedbackForPrompt = value;
        }

        // Validasyon: stuckWarningMinutes (5 - 60)
        if (updates.stuckWarningMinutes !== undefined) {
          const value = Number(updates.stuckWarningMinutes);
          if (isNaN(value) || value < 5 || value > 60) {
            response.status(400).json({
              success: false,
              error: "stuckWarningMinutes must be between 5 and 60",
            });
            return;
          }
          updates.stuckWarningMinutes = value;
        }

        // Validasyon: maxLogsPerQuery (10 - 500)
        if (updates.maxLogsPerQuery !== undefined) {
          const value = Number(updates.maxLogsPerQuery);
          if (isNaN(value) || value < 10 || value > 500) {
            response.status(400).json({
              success: false,
              error: "maxLogsPerQuery must be between 10 and 500",
            });
            return;
          }
          updates.maxLogsPerQuery = value;
        }

        // Validasyon: cacheTTLMinutes (1 - 60)
        if (updates.cacheTTLMinutes !== undefined) {
          const value = Number(updates.cacheTTLMinutes);
          if (isNaN(value) || value < 1 || value > 60) {
            response.status(400).json({
              success: false,
              error: "cacheTTLMinutes must be between 1 and 60",
            });
            return;
          }
          updates.cacheTTLMinutes = value;
        }

        // textModel kaldırıldı — pipeline'da sadece image model var
        if (updates.textModel !== undefined) {
          delete updates.textModel; // Eski admin panel'den gelebilir, sessizce ignore et
        }

        // Validasyon: promptOptimizerModel
        if (updates.promptOptimizerModel !== undefined) {
          const allowedOptimizerModels = [
            "none",
            "gemini-2.0-flash",
            "gemini-2.5-flash-preview-05-20",
            "claude-haiku-4-5-20251001",
            "claude-sonnet-4-6",
            "gpt-4o-mini",
            "deepseek-chat",
          ];
          if (!allowedOptimizerModels.includes(updates.promptOptimizerModel)) {
            response.status(400).json({
              success: false,
              error: `Geçersiz optimizer model: ${updates.promptOptimizerModel}`,
            });
            return;
          }
        }

        // Validasyon: API key'ler — boş string veya min 10 karakter
        if (updates.anthropicApiKey !== undefined && updates.anthropicApiKey !== "" && updates.anthropicApiKey.length < 10) {
          response.status(400).json({ success: false, error: "Geçersiz Anthropic API key" });
          return;
        }
        if (updates.openaiApiKey !== undefined && updates.openaiApiKey !== "" && updates.openaiApiKey.length < 10) {
          response.status(400).json({ success: false, error: "Geçersiz OpenAI API key" });
          return;
        }

        // Validasyon: imageModel (izin verilen modeller)
        if (updates.imageModel !== undefined) {
          const allowedImageModels = [
            "gemini-3-pro-image-preview",
          ];
          if (typeof updates.imageModel !== "string" || !allowedImageModels.includes(updates.imageModel)) {
            response.status(400).json({
              success: false,
              error: `imageModel must be one of: ${allowedImageModels.join(", ")}`,
            });
            return;
          }
        }

        // Güncelle
        await updateSystemSettings(updates);

        // Cache temizle
        clearConfigCache();

        console.log("[updateSystemSettingsConfig] System settings updated:", updates);

        response.json({
          success: true,
          message: "System settings updated",
        });
      } catch (error) {
        errorResponse(response, error, "updateSystemSettingsConfig");
      }
    });
  });

/**
 * Gemini terminoloji preset'lerini Firestore'a seed et
 * POST /seedGeminiTerminology
 *
 * Bu endpoint aşağıdaki verileri yükler:
 * - Işıklandırma preset'leri (lighting-presets)
 * - El pozları (hand-poses)
 * - Kompozisyon şablonları (composition-templates)
 * - Mood tanımları (mood-definitions)
 * - Ürün doku profilleri (product-textures)
 * - Negative prompt setleri (negative-prompts)
 */
export const seedGeminiTerminology = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        // Basit güvenlik kontrolü (secret key)
        const secretKey = request.body?.secretKey || request.query?.secretKey;
        if (secretKey !== "maestro-seed-2026") {
          response.status(403).json({
            success: false,
            error: "Unauthorized",
          });
          return;
        }

        console.log("[seedGeminiTerminology] Starting Gemini terminology seed...");

        const geminiData = getGeminiTerminologySeedData();
        const batch = db.batch();

        const presetsRef = db.collection("global").doc("config").collection("gemini-presets");

        // Işıklandırma preset'leri
        console.log(`[seedGeminiTerminology] Seeding ${geminiData.lightingPresets.length} lighting presets...`);
        for (const preset of geminiData.lightingPresets) {
          batch.set(presetsRef.doc("lighting-presets").collection("items").doc(preset.id), preset);
        }

        // Kompozisyon şablonları
        console.log(`[seedGeminiTerminology] Seeding ${geminiData.compositionTemplates.length} composition templates...`);
        for (const template of geminiData.compositionTemplates) {
          batch.set(presetsRef.doc("composition-templates").collection("items").doc(template.id), template);
        }

        // Mood tanımları
        console.log(`[seedGeminiTerminology] Seeding ${geminiData.moodDefinitions.length} mood definitions...`);
        for (const mood of geminiData.moodDefinitions) {
          batch.set(presetsRef.doc("mood-definitions").collection("items").doc(mood.id), mood);
        }

        // Ürün doku profilleri
        console.log(`[seedGeminiTerminology] Seeding ${geminiData.productTextureProfiles.length} product texture profiles...`);
        for (const profile of geminiData.productTextureProfiles) {
          batch.set(presetsRef.doc("product-textures").collection("items").doc(profile.id), profile);
        }

        // Negative prompt setleri
        console.log(`[seedGeminiTerminology] Seeding ${geminiData.negativePromptSets.length} negative prompt sets...`);
        for (const npSet of geminiData.negativePromptSets) {
          batch.set(presetsRef.doc("negative-prompts").collection("items").doc(npSet.id), npSet);
        }

        await batch.commit();

        // === EL TEMİZLİĞİ: Eski hand-poses ve lifestyle-hand verilerini sil ===
        const cleanupResults: string[] = [];

        // 1. Eski hand-poses koleksiyonunu sil
        const handPosesSnap = await presetsRef.doc("hand-poses").collection("items").get();
        if (!handPosesSnap.empty) {
          const cleanupBatch = db.batch();
          handPosesSnap.docs.forEach(doc => cleanupBatch.delete(doc.ref));
          await cleanupBatch.commit();
          cleanupResults.push(`${handPosesSnap.size} eski el pozu silindi`);
        }

        // 2. Eski lifestyle-hand kompozisyon şablonunu sil
        const oldLifestyleHand = await presetsRef.doc("composition-templates").collection("items").doc("lifestyle-hand").get();
        if (oldLifestyleHand.exists) {
          await oldLifestyleHand.ref.delete();
          cleanupResults.push("lifestyle-hand kompozisyon şablonu silindi");
        }

        // 3. Eski hand-anatomy negatif prompt setini sil
        const oldHandAnatomy = await presetsRef.doc("negative-prompts").collection("items").doc("hand-anatomy").get();
        if (oldHandAnatomy.exists) {
          await oldHandAnatomy.ref.delete();
          cleanupResults.push("hand-anatomy negatif prompt seti silindi");
        }

        // 4. Senaryolarda compositionId: "lifestyle-hand" → "lifestyle" güncelle
        const scenariosSnap = await db.collection("global").doc("config").collection("scenarios").get();
        let updatedScenarios = 0;
        for (const doc of scenariosSnap.docs) {
          const data = doc.data();
          if (data.compositionId === "lifestyle-hand") {
            await doc.ref.update({ compositionId: "lifestyle" });
            updatedScenarios++;
          }
        }
        if (updatedScenarios > 0) {
          cleanupResults.push(`${updatedScenarios} senaryoda compositionId: lifestyle-hand → lifestyle güncellendi`);
        }

        // 5. Firestore'daki model ayarlarını güncelle (textModel kaldırıldı, sadece imageModel)
        const settingsRef = db.collection("global").doc("config").collection("system-settings").doc("models");
        const settingsDoc = await settingsRef.get();
        if (settingsDoc.exists) {
          const modelData = settingsDoc.data() || {};
          const modelUpdates: Record<string, any> = {};
          const validImageModels = [
            "gemini-3-pro-image-preview",
          ];
          // textModel varsa kaldır
          if (modelData.textModel) {
            const { FieldValue: FV } = await import("firebase-admin/firestore");
            modelUpdates.textModel = FV.delete();
          }
          if (modelData.imageModel && !validImageModels.includes(modelData.imageModel)) {
            modelUpdates.imageModel = "gemini-3-pro-image-preview";
          }
          if (Object.keys(modelUpdates).length > 0) {
            await settingsRef.update(modelUpdates);
            cleanupResults.push(`Model ayarları güncellendi: ${JSON.stringify(modelUpdates)}`);
          }
        }

        // 6. Senaryoların description'larından el referanslarını temizle
        for (const doc of scenariosSnap.docs) {
          const data = doc.data();
          const desc = data.description || "";
          if (/\b(hand|hands|finger|nails|ring.*hand|hand.*ring|held.*hand|cradle|slender\s+hand)\b/i.test(desc)) {
            const cleanDesc = desc
              .replace(/\b(being\s+)?held\s+(elegantly\s+)?by\s+(a\s+)?(slender\s+|elegant\s+)?hand[^.]*\./gi, "")
              .replace(/\b(a\s+)?(slender\s+|elegant\s+)?hand\s+(with\s+|gently\s+|cradles?\s+|supports?\s+)[^.]*\./gi, "")
              .replace(/\bThe\s+hand\s+[^.]*\./gi, "")
              .replace(/,?\s*by\s+(a\s+)?(slender\s+|elegant\s+)?hand\s+with[^,.]*/gi, "")
              .replace(/\s{2,}/g, " ")
              .trim();
            if (cleanDesc !== desc) {
              await doc.ref.update({ description: cleanDesc, includesHands: false });
              cleanupResults.push(`Senaryo "${data.name || doc.id}" description'ından el referansları temizlendi`);
            }
          }
        }

        if (cleanupResults.length > 0) {
          console.log("[seedGeminiTerminology] Temizlik tamamlandı:", cleanupResults);
        }

        // Cache temizle
        clearConfigCache();

        const summary = {
          lightingPresets: geminiData.lightingPresets.length,
          compositionTemplates: geminiData.compositionTemplates.length,
          moodDefinitions: geminiData.moodDefinitions.length,
          productTextureProfiles: geminiData.productTextureProfiles.length,
          negativePromptSets: geminiData.negativePromptSets.length,
          cleanup: cleanupResults,
        };

        console.log("[seedGeminiTerminology] Seed completed:", summary);

        response.json({
          success: true,
          message: "Gemini terminology seeded successfully",
          data: summary,
        });
      } catch (error) {
        errorResponse(response, error, "seedGeminiTerminology");
      }
    });
  });

/**
 * Gemini preset'lerini getir (Admin panel için)
 * GET /getGeminiPresets
 *
 * Döndürülen veri:
 * - lightingPresets: Işıklandırma preset'leri
 * - compositions: Kompozisyon şablonları
 * - moods: Mood tanımları
 * - productTextures: Ürün doku profilleri
 * - negativePrompts: Negative prompt setleri
 */
export const getGeminiPresets = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const presetsRef = db.collection("global").doc("config").collection("gemini-presets");

        // Tüm preset koleksiyonlarını paralel olarak yükle
        const [
          lightingSnap,
          compositionsSnap,
          moodsSnap,
          texturesSnap,
          negativeSnap,
        ] = await Promise.all([
          presetsRef.doc("lighting-presets").collection("items").where("isActive", "==", true).get(),
          presetsRef.doc("composition-templates").collection("items").where("isActive", "==", true).get(),
          presetsRef.doc("mood-definitions").collection("items").where("isActive", "==", true).get(),
          presetsRef.doc("product-textures").collection("items").get(),
          presetsRef.doc("negative-prompts").collection("items").get(),
        ]);

        // Sonuçları dönüştür - sortOrder'a göre sırala
        type PresetDoc = { id: string; sortOrder?: number;[key: string]: unknown };
        const sortByOrder = (a: PresetDoc, b: PresetDoc) => (a.sortOrder || 0) - (b.sortOrder || 0);

        const lightingPresets: PresetDoc[] = lightingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const compositions: PresetDoc[] = compositionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const moods: PresetDoc[] = moodsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const productTextures = texturesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const negativePrompts = negativeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        response.json({
          success: true,
          data: {
            lightingPresets: lightingPresets.sort(sortByOrder),
            compositions: compositions.sort(sortByOrder),
            moods: moods.sort(sortByOrder),
            productTextures,
            negativePrompts,
          },
        });
      } catch (error) {
        errorResponse(response, error, "getGeminiPresets");
      }
    });
  });

/**
 * Sabit asset ayarlarını getir
 * GET /getFixedAssetsConfig
 *
 * "Mermer masa sabit, üzerindekiler serbest" kullanım senaryosu için.
 *
 * Döndürülen veri:
 * - fixedTableId: Sabit masa ID'si (null ise normal diversity)
 * - fixedPlateId: Sabit tabak ID'si (opsiyonel)
 * - fixedCupId: Sabit fincan ID'si (opsiyonel)
 * - isEnabled: Aktif mi?
 */
export const getFixedAssetsConfig = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        // ConfigService üzerinden oku
        const fixedAssets = await getFixedAssets();

        response.json({
          success: true,
          data: fixedAssets,
        });
      } catch (error) {
        errorResponse(response, error, "getFixedAssetsConfig");
      }
    });
  });

/**
 * Sabit asset ayarlarını güncelle
 * PUT/POST /updateFixedAssetsConfig
 *
 * Body: {
 *   isEnabled?: boolean,           // Özelliği aktif/deaktif et
 *   fixedTableId?: string | null,  // Sabit masa ID'si (null: devre dışı)
 *   fixedPlateId?: string | null,  // Sabit tabak ID'si (null: devre dışı)
 *   fixedCupId?: string | null,    // Sabit fincan ID'si (null: devre dışı)
 * }
 *
 * Validasyon:
 * - ID değerleri string veya null olmalı
 * - isEnabled boolean olmalı
 */
export const updateFixedAssetsConfig = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST" && request.method !== "PUT") {
          response.status(405).json({ success: false, error: "Use POST or PUT" });
          return;
        }

        const updates = request.body;
        const validatedUpdates: Record<string, unknown> = {};

        // Validasyon: isEnabled (boolean)
        if (updates.isEnabled !== undefined) {
          if (typeof updates.isEnabled !== "boolean") {
            response.status(400).json({
              success: false,
              error: "isEnabled must be a boolean",
            });
            return;
          }
          validatedUpdates.isEnabled = updates.isEnabled;
        }

        // Validasyon: fixedTableId (string | null)
        if (updates.fixedTableId !== undefined) {
          if (updates.fixedTableId !== null && typeof updates.fixedTableId !== "string") {
            response.status(400).json({
              success: false,
              error: "fixedTableId must be a string or null",
            });
            return;
          }
          validatedUpdates.fixedTableId = updates.fixedTableId;
        }

        // Validasyon: fixedPlateId (string | null)
        if (updates.fixedPlateId !== undefined) {
          if (updates.fixedPlateId !== null && typeof updates.fixedPlateId !== "string") {
            response.status(400).json({
              success: false,
              error: "fixedPlateId must be a string or null",
            });
            return;
          }
          validatedUpdates.fixedPlateId = updates.fixedPlateId;
        }

        // Validasyon: fixedCupId (string | null)
        if (updates.fixedCupId !== undefined) {
          if (updates.fixedCupId !== null && typeof updates.fixedCupId !== "string") {
            response.status(400).json({
              success: false,
              error: "fixedCupId must be a string or null",
            });
            return;
          }
          validatedUpdates.fixedCupId = updates.fixedCupId;
        }

        // Güncelle
        await updateFixedAssets(validatedUpdates);

        // Cache temizle
        clearConfigCache();

        console.log("[updateFixedAssetsConfig] Fixed assets updated:", validatedUpdates);

        response.json({
          success: true,
          message: "Fixed assets configuration updated",
        });
      } catch (error) {
        errorResponse(response, error, "updateFixedAssetsConfig");
      }
    });
  });

// ==========================================
// BUSINESS CONTEXT ENDPOINTS (SaaS Uyumlu)
// ==========================================

/**
 * İşletme bağlamını getir
 * GET /getBusinessContextConfig
 *
 * SaaS uyumlu: Her tenant kendi işletme bağlamını tanımlayabilir.
 * Bu bilgiler prompt'a eklenerek AI'ın doğru mekan/ortam üretmesini sağlar.
 *
 * Örnek: "high-rise window view" gibi hatalı üretimleri önler.
 */
export const getBusinessContextConfig = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const businessContext = await getBusinessContext();

        response.json({
          success: true,
          data: businessContext,
        });
      } catch (error) {
        errorResponse(response, error, "getBusinessContextConfig");
      }
    });
  });

/**
 * İşletme bağlamını güncelle
 * PUT/POST /updateBusinessContextConfig
 *
 * Body: {
 *   businessName?: string,           // İşletme adı
 *   businessType?: string,           // pastane, kafe, restoran
 *   locationDescription?: string,    // Mekan açıklaması
 *   floorLevel?: "ground" | "upper" | "basement" | "outdoor",
 *   hasStreetView?: boolean,
 *   hasWindowView?: boolean,
 *   windowViewDescription?: string,
 *   decorStyle?: string,
 *   dominantMaterials?: string[],
 *   colorScheme?: string,
 *   promptContext?: string,          // AI prompt için özet (EN ÖNEMLİ)
 *   isEnabled?: boolean,
 * }
 */
export const updateBusinessContextConfig = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST" && request.method !== "PUT") {
          response.status(405).json({ success: false, error: "Use POST or PUT" });
          return;
        }

        const updates = request.body;
        const validatedUpdates: Record<string, unknown> = {};

        // String alanları validasyonu
        const stringFields = [
          "businessName",
          "businessType",
          "locationDescription",
          "windowViewDescription",
          "decorStyle",
          "colorScheme",
          "promptContext",
        ];

        for (const field of stringFields) {
          if (updates[field] !== undefined) {
            if (typeof updates[field] !== "string") {
              response.status(400).json({
                success: false,
                error: `${field} must be a string`,
              });
              return;
            }
            validatedUpdates[field] = updates[field];
          }
        }

        // floorLevel validasyonu
        if (updates.floorLevel !== undefined) {
          const validLevels = ["ground", "upper", "basement", "outdoor"];
          if (!validLevels.includes(updates.floorLevel)) {
            response.status(400).json({
              success: false,
              error: `floorLevel must be one of: ${validLevels.join(", ")}`,
            });
            return;
          }
          validatedUpdates.floorLevel = updates.floorLevel;
        }

        // Boolean alanları validasyonu
        const booleanFields = ["hasStreetView", "hasWindowView", "isEnabled"];
        for (const field of booleanFields) {
          if (updates[field] !== undefined) {
            if (typeof updates[field] !== "boolean") {
              response.status(400).json({
                success: false,
                error: `${field} must be a boolean`,
              });
              return;
            }
            validatedUpdates[field] = updates[field];
          }
        }

        // dominantMaterials array validasyonu
        if (updates.dominantMaterials !== undefined) {
          if (!Array.isArray(updates.dominantMaterials)) {
            response.status(400).json({
              success: false,
              error: "dominantMaterials must be an array of strings",
            });
            return;
          }
          validatedUpdates.dominantMaterials = updates.dominantMaterials;
        }

        if (Object.keys(validatedUpdates).length === 0) {
          response.status(400).json({
            success: false,
            error: "No valid fields to update",
          });
          return;
        }

        await updateBusinessContext(validatedUpdates);
        console.log("[updateBusinessContextConfig] Business context updated:", Object.keys(validatedUpdates));

        response.json({
          success: true,
          message: "Business context configuration updated",
        });
      } catch (error) {
        errorResponse(response, error, "updateBusinessContextConfig");
      }
    });
  });

// ==========================================
// ==========================================
// PROMPT STUDIO ENDPOINTS (Temporarily Disabled - Missing Service Refs)
// ==========================================

// Geçerli stage ID'leri
const VALID_STAGE_IDS: PromptStageId[] = [
  "asset-selection",
  "scenario-selection",
  "prompt-optimization",
  "quality-control",
  "content-generation",
];

/**
 * Tüm prompt template'leri getir
 * GET /getPromptStudioConfig
 *
 * Döndürülen veri:
 * - prompts: 5 prompt template (id, name, systemPrompt, version, history, variables)
 * - updatedAt: Son güncelleme zamanı
 */
export const getPromptStudioConfig = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const config = await fetchPromptStudioConfig();

        response.json({
          success: true,
          data: config,
        });
      } catch (error) {
        errorResponse(response, error, "getPromptStudioConfig");
      }
    });
  });

/**
 * Tek bir prompt template'i getir
 * GET /getPromptTemplateById?stageId=asset-selection
 */
export const getPromptTemplateById = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const stageId = request.query.stageId as string;

        if (!stageId || !VALID_STAGE_IDS.includes(stageId as PromptStageId)) {
          response.status(400).json({
            success: false,
            error: `Invalid stageId. Valid values: ${VALID_STAGE_IDS.join(", ")}`,
          });
          return;
        }

        const template = await fetchPromptTemplate(stageId as PromptStageId);

        response.json({
          success: true,
          data: template,
        });
      } catch (error) {
        errorResponse(response, error, "getPromptTemplateById");
      }
    });
  });

/**
 * Prompt template'i güncelle
 * PUT/POST /updatePromptTemplate
 *
 * Body: {
 *   stageId: PromptStageId,            // Zorunlu
 *   systemPrompt: string,              // Zorunlu - yeni system prompt
 *   updatedBy?: string,                // Opsiyonel - güncelleyen kişi
 *   changeNote?: string,               // Opsiyonel - değişiklik notu
 * }
 *
 * Otomatik olarak:
 * - version++ artırır
 * - Eski prompt'u history'ye ekler (son 10)
 * - Cache'i temizler
 */
export const updatePromptTemplateEndpoint = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST" && request.method !== "PUT") {
          response.status(405).json({ success: false, error: "Use POST or PUT" });
          return;
        }

        const { stageId, systemPrompt, updatedBy, changeNote } = request.body;

        // Validasyon: stageId
        if (!stageId || !VALID_STAGE_IDS.includes(stageId as PromptStageId)) {
          response.status(400).json({
            success: false,
            error: `Invalid stageId. Valid values: ${VALID_STAGE_IDS.join(", ")}`,
          });
          return;
        }

        // Validasyon: systemPrompt
        if (!systemPrompt || typeof systemPrompt !== "string") {
          response.status(400).json({
            success: false,
            error: "systemPrompt is required and must be a string",
          });
          return;
        }

        // Minimum uzunluk kontrolü (çok kısa prompt geçersiz)
        if (systemPrompt.trim().length < 50) {
          response.status(400).json({
            success: false,
            error: "systemPrompt must be at least 50 characters",
          });
          return;
        }

        // Güncelle
        const updatedTemplate = await updatePromptTemplateService(
          stageId as PromptStageId,
          systemPrompt,
          updatedBy,
          changeNote
        );

        response.json({
          success: true,
          message: `Prompt template "${stageId}" updated to v${updatedTemplate.version}`,
          data: updatedTemplate,
        });
      } catch (error) {
        errorResponse(response, error, "updatePromptTemplate");
      }
    });
  });

/**
 * Prompt template'i eski versiyona geri döndür
 * POST /revertPromptTemplate
 *
 * Body: {
 *   stageId: PromptStageId,     // Zorunlu
 *   targetVersion: number,       // Zorunlu - geri dönülecek versiyon
 *   updatedBy?: string,          // Opsiyonel
 * }
 */
export const revertPromptTemplateEndpoint = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const { stageId, targetVersion, updatedBy } = request.body;

        // Validasyon: stageId
        if (!stageId || !VALID_STAGE_IDS.includes(stageId as PromptStageId)) {
          response.status(400).json({
            success: false,
            error: `Invalid stageId. Valid values: ${VALID_STAGE_IDS.join(", ")}`,
          });
          return;
        }

        // Validasyon: targetVersion
        if (targetVersion === undefined || typeof targetVersion !== "number" || targetVersion < 1) {
          response.status(400).json({
            success: false,
            error: "targetVersion is required and must be a positive number",
          });
          return;
        }

        // Geri döndür
        const revertedTemplate = await revertPromptTemplateService(
          stageId as PromptStageId,
          targetVersion,
          updatedBy
        );

        response.json({
          success: true,
          message: `Prompt template "${stageId}" reverted to v${targetVersion} (now v${revertedTemplate.version})`,
          data: revertedTemplate,
        });
      } catch (error) {
        errorResponse(response, error, "revertPromptTemplate");
      }
    });
  });

/**
 * Prompt Studio cache'ini temizle
 * POST /clearPromptStudioCache
 *
 * Admin panelden "Cache Temizle" butonu için.
 * Prompt güncellemesi sonrası 5dk beklemeden anlık etki.
 */
export const clearPromptStudioCacheEndpoint = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        clearPromptStudioCache();
        clearConfigCache();

        response.json({
          success: true,
          message: "Prompt studio cache cleared",
        });
      } catch (error) {
        errorResponse(response, error, "clearPromptStudioCache");
      }
    });
  });

// ==========================================
// ASSET SELECTION CONFIG ENDPOINTS
// ==========================================

/**
 * Asset seçim kurallarını getir
 * GET /getAssetSelectionConfig
 *
 * İki farklı mod için ayrı kurallar:
 * - manual: "Şimdi Üret" butonu
 * - scheduled: Otomatik pipeline
 *
 * Her kategori için enabled/disabled durumu.
 * enabled=true → ZORUNLU, enabled=false → HARİÇ
 */
export const getAssetSelectionConfigEndpoint = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const config = await getAssetSelectionConfig();

        response.json({
          success: true,
          data: config,
        });
      } catch (error) {
        errorResponse(response, error, "getAssetSelectionConfig");
      }
    });
  });

/**
 * Asset seçim kurallarını güncelle
 * PUT/POST /updateAssetSelectionConfig
 *
 * Body: {
 *   manual?: {
 *     plate?: { enabled: boolean },
 *     table?: { enabled: boolean },
 *     cup?: { enabled: boolean },
 *     accessory?: { enabled: boolean },
 *     napkin?: { enabled: boolean },
 *     cutlery?: { enabled: boolean },
 *   },
 *   scheduled?: {
 *     plate?: { enabled: boolean },
 *     table?: { enabled: boolean },
 *     cup?: { enabled: boolean },
 *     accessory?: { enabled: boolean },
 *     napkin?: { enabled: boolean },
 *     cutlery?: { enabled: boolean },
 *   }
 * }
 */
export const updateAssetSelectionConfigEndpoint = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST" && request.method !== "PUT") {
          response.status(405).json({ success: false, error: "Use POST or PUT" });
          return;
        }

        const { manual, scheduled } = request.body;

        // Validasyon helper
        const validateCategoryRules = (rules: Record<string, { enabled?: boolean }> | undefined, modeName: string): string | null => {
          if (!rules) return null;

          const validCategories = ["plate", "table", "cup", "accessory", "napkin", "cutlery"];

          for (const [key, value] of Object.entries(rules)) {
            if (!validCategories.includes(key)) {
              return `Invalid category "${key}" in ${modeName}. Valid: ${validCategories.join(", ")}`;
            }
            if (value && typeof value.enabled !== "boolean") {
              return `${modeName}.${key}.enabled must be a boolean`;
            }
          }

          return null;
        };

        // Manual mode validasyonu
        const manualError = validateCategoryRules(manual, "manual");
        if (manualError) {
          response.status(400).json({ success: false, error: manualError });
          return;
        }

        // Scheduled mode validasyonu
        const scheduledError = validateCategoryRules(scheduled, "scheduled");
        if (scheduledError) {
          response.status(400).json({ success: false, error: scheduledError });
          return;
        }

        // Mevcut config'i oku
        const currentConfig = await getAssetSelectionConfig();

        // Deep merge ile güncelle
        const updatedConfig = {
          manual: {
            ...currentConfig.manual,
            ...(manual ? Object.fromEntries(
              Object.entries(manual).map(([k, v]) => [k, { ...currentConfig.manual[k as keyof typeof currentConfig.manual], ...(v as object) }])
            ) : {}),
          },
          scheduled: {
            ...currentConfig.scheduled,
            ...(scheduled ? Object.fromEntries(
              Object.entries(scheduled).map(([k, v]) => [k, { ...currentConfig.scheduled[k as keyof typeof currentConfig.scheduled], ...(v as object) }])
            ) : {}),
          },
        };

        // Güncelle
        await updateAssetSelectionConfig(updatedConfig);

        // Cache temizle
        clearConfigCache();

        console.log("[updateAssetSelectionConfig] Asset selection config updated:", { manual: !!manual, scheduled: !!scheduled });

        response.json({
          success: true,
          message: "Asset selection configuration updated",
        });
      } catch (error) {
        errorResponse(response, error, "updateAssetSelectionConfig");
      }
    });
  });

// ==========================================
// PRODUCT SLOT DEFAULTS
// ==========================================

/**
 * Ürün tipine göre slot varsayılanlarını getir
 * GET /getProductSlotDefaults
 */
export const getProductSlotDefaultsEndpoint = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const config = await getProductSlotDefaults();
        response.json({ success: true, data: config });
      } catch (error) {
        errorResponse(response, error, "getProductSlotDefaults");
      }
    });
  });

/**
 * Ürün tipine göre slot varsayılanlarını güncelle
 * POST /updateProductSlotDefaults
 * Body: { defaults: Record<string, Record<string, boolean>> }
 */
export const updateProductSlotDefaultsEndpoint = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST" && request.method !== "PUT") {
          response.status(405).json({ success: false, error: "Use POST or PUT" });
          return;
        }

        const { defaults } = request.body;

        if (!defaults || typeof defaults !== "object") {
          response.status(400).json({ success: false, error: "defaults alanı gerekli" });
          return;
        }

        // _default key zorunlu
        if (!defaults._default) {
          response.status(400).json({ success: false, error: "_default key zorunlu" });
          return;
        }

        await updateProductSlotDefaults(defaults);

        response.json({
          success: true,
          message: "Product slot defaults updated",
        });
      } catch (error) {
        errorResponse(response, error, "updateProductSlotDefaults");
      }
    });
  });

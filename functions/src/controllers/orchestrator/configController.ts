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
} from "../../services/configService";
import { DEFAULT_DIVERSITY_RULES, DEFAULT_WEEKLY_THEMES_CONFIG } from "../../orchestrator/seed/defaultData";
import { getGeminiTerminologySeedData } from "../../orchestrator/seed/geminiTerminologyData";
import { FirestoreDiversityRules } from "../../orchestrator/types";

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
 * - AI maliyetleri (Claude input/output)
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
        // ConfigService üzerinden oku (cache'li)
        const systemSettings = await getSystemSettings();

        response.json({
          success: true,
          data: systemSettings,
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
 *   claudeInputCostPer1K?: number,      // 0.001 - 0.1
 *   claudeOutputCostPer1K?: number,     // 0.001 - 0.5
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

        // Validasyon: claudeInputCostPer1K (0.001 - 0.1)
        if (updates.claudeInputCostPer1K !== undefined) {
          const value = Number(updates.claudeInputCostPer1K);
          if (isNaN(value) || value < 0.001 || value > 0.1) {
            response.status(400).json({
              success: false,
              error: "claudeInputCostPer1K must be between 0.001 and 0.1",
            });
            return;
          }
          updates.claudeInputCostPer1K = value;
        }

        // Validasyon: claudeOutputCostPer1K (0.001 - 0.5)
        if (updates.claudeOutputCostPer1K !== undefined) {
          const value = Number(updates.claudeOutputCostPer1K);
          if (isNaN(value) || value < 0.001 || value > 0.5) {
            response.status(400).json({
              success: false,
              error: "claudeOutputCostPer1K must be between 0.001 and 0.5",
            });
            return;
          }
          updates.claudeOutputCostPer1K = value;
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

        // El pozları
        console.log(`[seedGeminiTerminology] Seeding ${geminiData.handPoses.length} hand poses...`);
        for (const pose of geminiData.handPoses) {
          batch.set(presetsRef.doc("hand-poses").collection("items").doc(pose.id), pose);
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

        // Cache temizle
        clearConfigCache();

        const summary = {
          lightingPresets: geminiData.lightingPresets.length,
          handPoses: geminiData.handPoses.length,
          compositionTemplates: geminiData.compositionTemplates.length,
          moodDefinitions: geminiData.moodDefinitions.length,
          productTextureProfiles: geminiData.productTextureProfiles.length,
          negativePromptSets: geminiData.negativePromptSets.length,
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
 * - handPoses: El pozları
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
          handPosesSnap,
          compositionsSnap,
          moodsSnap,
          texturesSnap,
          negativeSnap,
        ] = await Promise.all([
          presetsRef.doc("lighting-presets").collection("items").where("isActive", "==", true).get(),
          presetsRef.doc("hand-poses").collection("items").where("isActive", "==", true).get(),
          presetsRef.doc("composition-templates").collection("items").where("isActive", "==", true).get(),
          presetsRef.doc("mood-definitions").collection("items").where("isActive", "==", true).get(),
          presetsRef.doc("product-textures").collection("items").get(),
          presetsRef.doc("negative-prompts").collection("items").get(),
        ]);

        // Sonuçları dönüştür - sortOrder'a göre sırala
        type PresetDoc = { id: string; sortOrder?: number; [key: string]: unknown };
        const sortByOrder = (a: PresetDoc, b: PresetDoc) => (a.sortOrder || 0) - (b.sortOrder || 0);

        const lightingPresets: PresetDoc[] = lightingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const handPoses: PresetDoc[] = handPosesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const compositions: PresetDoc[] = compositionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const moods: PresetDoc[] = moodsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const productTextures = texturesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const negativePrompts = negativeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        response.json({
          success: true,
          data: {
            lightingPresets: lightingPresets.sort(sortByOrder),
            handPoses: handPoses.sort(sortByOrder),
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

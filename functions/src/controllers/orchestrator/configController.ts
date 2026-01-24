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
} from "../../services/configService";
import { DEFAULT_DIVERSITY_RULES, DEFAULT_WEEKLY_THEMES_CONFIG } from "../../orchestrator/seed/defaultData";
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

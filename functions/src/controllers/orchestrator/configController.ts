/**
 * Config Controller
 * Çeşitlilik kuralları ve config yönetimi
 */

import { functions, db, getCors, REGION, errorResponse } from "./shared";
import { seedFirestoreConfig, isConfigInitialized } from "../../services/configService";

// Varsayılan config değerleri
const DEFAULT_VARIATION_RULES = {
  scenarioGap: 3,
  tableGap: 2,
  handStyleGap: 4,
  compositionGap: 2,
  petFrequency: 15,
  similarityThreshold: 50,
};

const DEFAULT_WEEKLY_THEMES = {
  monday: { mood: "energetic", scenarios: ["zarif-tutma", "kahve-ani"], petAllowed: false },
  tuesday: { mood: "cozy", scenarios: ["cam-kenari", "paylasim"], petAllowed: false },
  wednesday: { mood: "energetic", scenarios: ["kahve-ani", "zarif-tutma"], petAllowed: false },
  thursday: { mood: "relaxed", scenarios: ["kahve-kosesi", "yarim-kaldi"], petAllowed: false },
  friday: { mood: "relaxed", scenarios: ["yarim-kaldi", "kahve-kosesi"], petAllowed: false },
  saturday: { mood: "cozy", scenarios: ["cam-kenari", "paylasim"], petAllowed: true },
  sunday: { mood: "slow", scenarios: ["yarim-kaldi", "cam-kenari"], petAllowed: true },
};

const DEFAULT_ASSET_PRIORITIES = {
  underusedBoost: 1.5,
  lastUsedPenalty: 0.5,
};

/**
 * Orchestrator config'i getir (çeşitlilik kuralları)
 */
export const getVariationConfig = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const docRef = db.collection("orchestrator-config").doc("variation-rules");
        const doc = await docRef.get();

        if (!doc.exists) {
          response.json({
            success: true,
            data: {
              variationRules: DEFAULT_VARIATION_RULES,
              weeklyThemes: DEFAULT_WEEKLY_THEMES,
              assetPriorities: DEFAULT_ASSET_PRIORITIES,
            },
          });
          return;
        }

        const data = doc.data();
        response.json({
          success: true,
          data: {
            variationRules: data?.variationRules || DEFAULT_VARIATION_RULES,
            weeklyThemes: data?.weeklyThemes || DEFAULT_WEEKLY_THEMES,
            assetPriorities: data?.assetPriorities || DEFAULT_ASSET_PRIORITIES,
          },
        });
      } catch (error) {
        errorResponse(response, error, "getVariationConfig");
      }
    });
  });

/**
 * Orchestrator config'i güncelle
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

        const { variationRules, weeklyThemes, assetPriorities } = request.body;

        const docRef = db.collection("orchestrator-config").doc("variation-rules");

        const doc = await docRef.get();
        const currentData = doc.exists ? doc.data() : {};

        const updateData: Record<string, unknown> = {
          updatedAt: Date.now(),
        };

        if (variationRules) {
          updateData.variationRules = {
            ...DEFAULT_VARIATION_RULES,
            ...currentData?.variationRules,
            ...variationRules,
          };
        }

        if (weeklyThemes) {
          updateData.weeklyThemes = {
            ...DEFAULT_WEEKLY_THEMES,
            ...currentData?.weeklyThemes,
            ...weeklyThemes,
          };
        }

        if (assetPriorities) {
          updateData.assetPriorities = {
            ...DEFAULT_ASSET_PRIORITIES,
            ...currentData?.assetPriorities,
            ...assetPriorities,
          };
        }

        await docRef.set(updateData, { merge: true });

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

        const configDoc = await db.collection("orchestrator-config").doc("variation-rules").get();
        const petFrequency = configDoc.exists
          ? (configDoc.data()?.variationRules?.petFrequency || 15)
          : 15;

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

        response.json({
          success: true,
          message: "Orchestrator config seeded successfully",
        });
      } catch (error) {
        errorResponse(response, error, "seedOrchestratorConfig");
      }
    });
  });

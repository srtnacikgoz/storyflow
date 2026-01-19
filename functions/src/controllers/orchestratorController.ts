/**
 * Orchestrator Controller
 * Full Orchestrator API endpoints (Cloud Functions)
 */

import * as functions from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { getFirestore } from "firebase-admin/firestore";
import { getCors, getConfig } from "../lib/serviceFactory";
import { OrchestratorScheduler } from "../orchestrator/scheduler";
import { Asset, TimeSlotRule, ProductType, OrchestratorConfig } from "../orchestrator/types";

const REGION = "europe-west1";
const db = getFirestore();

// Firebase Secret tanımı
const claudeApiKey = defineSecret("CLAUDE_API_KEY");

/**
 * Orchestrator config'i oluştur
 */
async function getOrchestratorConfig(claudeKey?: string): Promise<OrchestratorConfig> {
  const config = await getConfig();

  return {
    claudeApiKey: claudeKey || claudeApiKey.value() || "",
    claudeModel: "claude-sonnet-4-20250514",
    geminiApiKey: config.gemini.apiKey,
    geminiModel: "gemini-3-pro-image-preview",
    qualityThreshold: 7,
    maxRetries: 3,
    telegramBotToken: config.telegram?.botToken || "",
    telegramChatId: config.telegram?.chatId || "",
    approvalTimeout: config.telegram?.approvalTimeout || 60,
    timezone: "Europe/Istanbul",
    scheduleBuffer: 30,
  };
}

// ==========================================
// ASSET MANAGEMENT
// ==========================================

/**
 * Tüm asset'leri listele
 */
export const listAssets = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const { category, subType, isActive } = request.query;

        let query: FirebaseFirestore.Query = db.collection("assets");

        if (category) {
          query = query.where("category", "==", category);
        }
        if (subType) {
          query = query.where("subType", "==", subType);
        }
        if (isActive !== undefined) {
          query = query.where("isActive", "==", isActive === "true");
        }

        const snapshot = await query.orderBy("createdAt", "desc").get();
        const assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        response.json({
          success: true,
          data: assets,
          count: assets.length,
        });
      } catch (error) {
        console.error("[listAssets] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Yeni asset ekle
 */
export const createAsset = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const assetData: Omit<Asset, "id"> = {
          ...request.body,
          usageCount: 0,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const docRef = await db.collection("assets").add(assetData);

        response.status(201).json({
          success: true,
          data: { id: docRef.id, ...assetData },
        });
      } catch (error) {
        console.error("[createAsset] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Asset güncelle
 */
export const updateAsset = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "PUT" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use PUT or POST" });
          return;
        }

        const id = request.query.id as string || request.body?.id;

        if (!id) {
          response.status(400).json({
            success: false,
            error: "Missing required parameter: id",
          });
          return;
        }

        const updates = {
          ...request.body,
          id: undefined, // id'yi güncelleme verisinden çıkar
          updatedAt: Date.now(),
        };
        delete updates.id;

        await db.collection("assets").doc(id).update(updates);

        response.json({
          success: true,
          message: "Asset updated",
        });
      } catch (error) {
        console.error("[updateAsset] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Asset sil (soft delete)
 */
export const deleteAsset = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "DELETE" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use DELETE or POST" });
          return;
        }

        const id = request.query.id as string || request.body?.id;

        if (!id) {
          response.status(400).json({
            success: false,
            error: "Missing required parameter: id",
          });
          return;
        }

        await db.collection("assets").doc(id).update({
          isActive: false,
          updatedAt: Date.now(),
        });

        response.json({
          success: true,
          message: "Asset deactivated",
        });
      } catch (error) {
        console.error("[deleteAsset] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// ==========================================
// TIME SLOT RULES
// ==========================================

/**
 * Zaman kurallarını listele
 */
export const listTimeSlotRules = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const snapshot = await db
          .collection("time-slot-rules")
          .orderBy("priority", "asc")
          .get();

        const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        response.json({
          success: true,
          data: rules,
          count: rules.length,
        });
      } catch (error) {
        console.error("[listTimeSlotRules] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Yeni zaman kuralı ekle
 */
export const createTimeSlotRule = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const ruleData: Omit<TimeSlotRule, "id"> = {
          ...request.body,
          isActive: true,
        };

        const docRef = await db.collection("time-slot-rules").add(ruleData);

        response.status(201).json({
          success: true,
          data: { id: docRef.id, ...ruleData },
        });
      } catch (error) {
        console.error("[createTimeSlotRule] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Zaman kuralı güncelle
 */
export const updateTimeSlotRule = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "PUT" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use PUT or POST" });
          return;
        }

        const id = request.query.id as string || request.body?.id;

        if (!id) {
          response.status(400).json({
            success: false,
            error: "Missing required parameter: id",
          });
          return;
        }

        const updates = { ...request.body };
        delete updates.id;

        await db.collection("time-slot-rules").doc(id).update(updates);

        response.json({
          success: true,
          message: "Time slot rule updated",
        });
      } catch (error) {
        console.error("[updateTimeSlotRule] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Zaman kuralı sil
 */
export const deleteTimeSlotRule = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "DELETE" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use DELETE or POST" });
          return;
        }

        const id = request.query.id as string || request.body?.id;

        if (!id) {
          response.status(400).json({
            success: false,
            error: "Missing required parameter: id",
          });
          return;
        }

        await db.collection("time-slot-rules").doc(id).delete();

        response.json({
          success: true,
          message: "Time slot rule deleted",
        });
      } catch (error) {
        console.error("[deleteTimeSlotRule] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// ==========================================
// PIPELINE TRIGGERS
// ==========================================

/**
 * Scheduler'ı manuel tetikle (test için)
 */
export const triggerOrchestratorScheduler = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 300, memory: "512MB", secrets: [claudeApiKey] })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const config = await getOrchestratorConfig();
        const scheduler = new OrchestratorScheduler(config);

        const result = await scheduler.checkAndTrigger();

        response.json({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error("[triggerOrchestratorScheduler] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Belirli bir kural için pipeline başlat
 */
export const triggerOrchestratorPipeline = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 540, memory: "1GB", secrets: [claudeApiKey] })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const ruleId = request.query.ruleId as string || request.body?.ruleId;

        if (!ruleId) {
          response.status(400).json({
            success: false,
            error: "Missing required parameter: ruleId",
          });
          return;
        }

        const config = await getOrchestratorConfig();
        const scheduler = new OrchestratorScheduler(config);

        const slotId = await scheduler.triggerManually(ruleId);

        response.json({
          success: true,
          message: "Pipeline triggered",
          slotId,
        });
      } catch (error) {
        console.error("[triggerOrchestratorPipeline] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Belirli bir ürün tipi için hemen içerik üret
 */
export const orchestratorGenerateNow = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 540, memory: "1GB", secrets: [claudeApiKey] })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const { productType } = request.body as { productType: ProductType };

        if (!productType) {
          response.status(400).json({
            success: false,
            error: "productType is required",
          });
          return;
        }

        const config = await getOrchestratorConfig();
        const scheduler = new OrchestratorScheduler(config);

        // Pipeline tamamlanana kadar bekle
        const result = await scheduler.generateNow(productType);

        if (result.success) {
          response.json({
            success: true,
            message: "Generation completed",
            slotId: result.slotId,
            duration: result.duration,
          });
        } else {
          response.status(500).json({
            success: false,
            error: result.error || "Pipeline failed",
            slotId: result.slotId,
            duration: result.duration,
          });
        }
        // ... (previous)
      } catch (error) {
        console.error("[orchestratorGenerateNow] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Telegram bildirimini tekrar gönder (manuel tetikleme)
 */
export const orchestratorResendTelegram = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 60, secrets: [claudeApiKey] })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const { slotId } = request.body as { slotId: string };

        if (!slotId) {
          response.status(400).json({
            success: false,
            error: "slotId is required",
          });
          return;
        }

        // Slot'u getir
        const slotDoc = await db.collection("scheduled-slots").doc(slotId).get();
        if (!slotDoc.exists) {
          response.status(404).json({ success: false, error: "Slot not found" });
          return;
        }

        const slot = slotDoc.data();
        if (!slot?.pipelineResult) {
          response.status(400).json({ success: false, error: "Slot does not have pipeline result" });
          return;
        }

        // Config ve Orchestrator başlat
        const config = await getOrchestratorConfig();
        // Orchestrator'ı doğrudan import edip kullanmamız lazım (Wrapper'sız)
        // Imports kısmına eklememiz gerekebilir veya dinamik import
        // Type sorunu yaşamamak için any cast veya import düzeltmesi

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Orchestrator } = require("../orchestrator/orchestrator");
        const orchestrator = new Orchestrator(config);

        const messageId = await orchestrator.sendTelegramApproval(slot.pipelineResult);

        // Slot'u güncelle
        await db.collection("scheduled-slots").doc(slotId).update({
          telegramMessageId: messageId,
          updatedAt: Date.now(),
        });

        response.json({
          success: true,
          message: "Telegram notification resent",
          messageId,
        });

      } catch (error) {
        console.error("[orchestratorResendTelegram] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// ==========================================
// PIPELINE STATUS
// ==========================================

/**
 * Scheduled slot'ları listele
 */
export const listScheduledSlots = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const { status, limit = "20" } = request.query;

        let query: FirebaseFirestore.Query = db.collection("scheduled-slots");

        if (status) {
          query = query.where("status", "==", status);
        }

        const snapshot = await query
          .orderBy("createdAt", "desc")
          .limit(parseInt(limit as string))
          .get();

        const slots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        response.json({
          success: true,
          data: slots,
          count: slots.length,
        });
      } catch (error) {
        console.error("[listScheduledSlots] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Tek bir slot'un detaylarını getir (progress polling için)
 */
export const getScheduledSlot = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const { slotId } = request.query;

        if (!slotId || typeof slotId !== "string") {
          response.status(400).json({
            success: false,
            error: "slotId is required",
          });
          return;
        }

        const doc = await db.collection("scheduled-slots").doc(slotId).get();

        if (!doc.exists) {
          response.json({
            success: true,
            slot: null,
          });
          return;
        }

        const data = doc.data();
        response.json({
          success: true,
          slot: {
            id: doc.id,
            status: data?.status,
            currentStage: data?.currentStage,
            stageIndex: data?.stageIndex,
            totalStages: data?.totalStages,
            error: data?.error,
          },
        });
      } catch (error) {
        console.error("[getScheduledSlot] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Pipeline sonuçlarını listele
 */
export const listPipelineResults = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const { limit = "20" } = request.query;

        const snapshot = await db
          .collection("pipeline-results")
          .orderBy("startedAt", "desc")
          .limit(parseInt(limit as string))
          .get();

        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        response.json({
          success: true,
          data: results,
          count: results.length,
        });
      } catch (error) {
        console.error("[listPipelineResults] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// ==========================================
// DASHBOARD STATS
// ==========================================

/**
 * Orchestrator dashboard istatistikleri
 */
export const getOrchestratorDashboardStats = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const [assetsSnap, rulesSnap, slotsSnap, resultsSnap] = await Promise.all([
          db.collection("assets").where("isActive", "==", true).get(),
          db.collection("time-slot-rules").where("isActive", "==", true).get(),
          db.collection("scheduled-slots").orderBy("createdAt", "desc").limit(100).get(),
          db.collection("pipeline-results").orderBy("startedAt", "desc").limit(100).get(),
        ]);

        // Asset kategorilerine göre grupla
        const assetsByCategory: Record<string, number> = {};
        assetsSnap.docs.forEach(doc => {
          const category = doc.data().category;
          assetsByCategory[category] = (assetsByCategory[category] || 0) + 1;
        });

        // Slot durumlarına göre grupla
        const slotsByStatus: Record<string, number> = {};
        slotsSnap.docs.forEach(doc => {
          const status = doc.data().status;
          slotsByStatus[status] = (slotsByStatus[status] || 0) + 1;
        });

        // Toplam maliyet hesapla
        let totalCost = 0;
        resultsSnap.docs.forEach(doc => {
          totalCost += doc.data().totalCost || 0;
        });

        response.json({
          success: true,
          data: {
            assets: {
              total: assetsSnap.size,
              byCategory: assetsByCategory,
            },
            rules: {
              total: rulesSnap.size,
            },
            slots: {
              total: slotsSnap.size,
              byStatus: slotsByStatus,
            },
            pipeline: {
              totalRuns: resultsSnap.size,
              totalCost: totalCost.toFixed(4),
            },
          },
        });
      } catch (error) {
        console.error("[getOrchestratorDashboardStats] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Orchestrator Controller
 * Full Orchestrator API endpoints (Cloud Functions)
 */

import * as functions from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { getFirestore } from "firebase-admin/firestore";
import { getCors, getConfig, getInstagramService } from "../lib/serviceFactory";
import { OrchestratorScheduler } from "../orchestrator/scheduler";
import { Asset, TimeSlotRule, ProductType, OrchestratorConfig, Theme, DEFAULT_THEMES, IssueCategoryId, IssueFeedback, AIRuleCategoryId, AIRule } from "../orchestrator/types";
import { FeedbackService } from "../services/feedbackService";
import { AIRulesService } from "../services/aiRulesService";

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

        const { productType, themeId } = request.body as { productType: ProductType; themeId?: string };

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
        // themeId varsa override olarak gönder
        const result = await scheduler.generateNow(productType, themeId);

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

// ==========================================
// SLOT CRUD OPERATIONS
// ==========================================

/**
 * Slot'un tam detaylarını getir (pipelineResult dahil)
 */
export const getSlotDetail = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const slotId = request.query.slotId as string;

        if (!slotId) {
          response.status(400).json({
            success: false,
            error: "slotId is required",
          });
          return;
        }

        const doc = await db.collection("scheduled-slots").doc(slotId).get();

        if (!doc.exists) {
          response.status(404).json({
            success: false,
            error: "Slot not found",
          });
          return;
        }

        response.json({
          success: true,
          data: { id: doc.id, ...doc.data() },
        });
      } catch (error) {
        console.error("[getSlotDetail] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Slot sil (hard delete)
 */
export const deleteScheduledSlot = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "DELETE" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use DELETE or POST" });
          return;
        }

        const slotId = request.query.slotId as string || request.body?.slotId;

        if (!slotId) {
          response.status(400).json({
            success: false,
            error: "slotId is required",
          });
          return;
        }

        await db.collection("scheduled-slots").doc(slotId).delete();

        response.json({
          success: true,
          message: "Slot deleted",
        });
      } catch (error) {
        console.error("[deleteScheduledSlot] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Başarısız slot'u yeniden dene
 */
export const retrySlot = functions
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

        const slotId = request.body?.slotId;

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
        if (slot?.status !== "failed") {
          response.status(400).json({
            success: false,
            error: "Only failed slots can be retried",
          });
          return;
        }

        // Slot'un timeSlotRuleId'sinden kural bilgisi al
        const ruleId = slot.timeSlotRuleId;
        if (!ruleId) {
          response.status(400).json({
            success: false,
            error: "Slot has no associated rule",
          });
          return;
        }

        // Slot'u sıfırla
        await db.collection("scheduled-slots").doc(slotId).update({
          status: "pending",
          error: null,
          pipelineResult: null,
          currentStage: null,
          stageIndex: null,
          totalStages: null,
          updatedAt: Date.now(),
        });

        // Pipeline'ı yeniden başlat
        const config = await getOrchestratorConfig();
        const scheduler = new OrchestratorScheduler(config);
        await scheduler.triggerManually(ruleId);

        response.json({
          success: true,
          message: "Slot retry initiated",
        });
      } catch (error) {
        console.error("[retrySlot] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Slot'u dashboard'dan onayla
 */
export const approveSlot = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 120, secrets: [claudeApiKey] })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const slotId = request.body?.slotId;

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
        if (slot?.status !== "awaiting_approval") {
          response.status(400).json({
            success: false,
            error: "Only slots awaiting approval can be approved",
          });
          return;
        }

        // Onay işlemi - Instagram'a yayınla
        const config = await getConfig();
        const InstagramService = await getInstagramService();
        const instagram = new InstagramService(
          config.instagram.accountId,
          config.instagram.accessToken
        );

        // pipelineResult'tan görsel URL ve caption al
        const pipelineResult = slot.pipelineResult;
        let imageUrl = pipelineResult?.generatedImage?.storageUrl;
        const caption = pipelineResult?.caption?.text || pipelineResult?.generatedImage?.caption || "Sade Patisserie";

        if (!imageUrl) {
          response.status(400).json({
            success: false,
            error: "No image URL found in pipeline result",
          });
          return;
        }

        // gs:// URL'ini public HTTP URL'e çevir (Instagram sadece HTTP kabul eder)
        if (imageUrl.startsWith("gs://")) {
          // gs://bucket-name/path/to/file.png -> https://storage.googleapis.com/bucket-name/path/to/file.png
          const gsPath = imageUrl.replace("gs://", "");
          imageUrl = `https://storage.googleapis.com/${gsPath}`;
          console.log(`[approveSlot] Converted gs:// to public URL: ${imageUrl}`);
        }

        // Instagram'a yayınla
        const publishResult = await instagram.createStory(imageUrl, caption);

        // Slot'u güncelle
        await db.collection("scheduled-slots").doc(slotId).update({
          status: "published",
          "pipelineResult.approvalStatus": "approved",
          "pipelineResult.approvalRespondedAt": Date.now(),
          "pipelineResult.publishedAt": Date.now(),
          "pipelineResult.instagramPostId": publishResult?.id,
          updatedAt: Date.now(),
        });

        response.json({
          success: true,
          message: "Slot approved and published",
        });
      } catch (error) {
        console.error("[approveSlot] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Slot'u dashboard'dan reddet
 */
export const rejectSlot = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const slotId = request.body?.slotId;

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
        if (slot?.status !== "awaiting_approval") {
          response.status(400).json({
            success: false,
            error: "Only slots awaiting approval can be rejected",
          });
          return;
        }

        // Slot'u güncelle
        await db.collection("scheduled-slots").doc(slotId).update({
          status: "failed",
          "pipelineResult.approvalStatus": "rejected",
          "pipelineResult.approvalRespondedAt": Date.now(),
          error: "Rejected from dashboard",
          updatedAt: Date.now(),
        });

        response.json({
          success: true,
          message: "Slot rejected",
        });
      } catch (error) {
        console.error("[rejectSlot] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Slot status'ünü güncelle (admin manual override)
 * Eski işlemleri "published" veya diğer status'lere manuel olarak güncellemek için
 */
export const updateSlotStatus = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST" && request.method !== "PUT") {
          response.status(405).json({ success: false, error: "Use POST or PUT" });
          return;
        }

        const { slotId, status, note } = request.body;

        if (!slotId) {
          response.status(400).json({
            success: false,
            error: "slotId is required",
          });
          return;
        }

        // İzin verilen status değerleri
        const allowedStatuses = ["pending", "generating", "awaiting_approval", "approved", "published", "failed"];
        if (!allowedStatuses.includes(status)) {
          response.status(400).json({
            success: false,
            error: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
          });
          return;
        }

        // Slot'un var olduğunu kontrol et
        const slotDoc = await db.collection("scheduled-slots").doc(slotId).get();
        if (!slotDoc.exists) {
          response.status(404).json({ success: false, error: "Slot not found" });
          return;
        }

        // Slot'u güncelle
        const updateData: Record<string, unknown> = {
          status,
          updatedAt: Date.now(),
          manualOverride: true,
          manualOverrideNote: note || "Manuel olarak güncellendi",
          manualOverrideAt: Date.now(),
        };

        // Status'e göre ek alanlar
        if (status === "published") {
          updateData.completedAt = Date.now();
          updateData["pipelineResult.approvalStatus"] = "approved";
        } else if (status === "failed") {
          updateData.failedAt = Date.now();
        }

        await db.collection("scheduled-slots").doc(slotId).update(updateData);

        console.log(`[updateSlotStatus] Slot ${slotId} status updated to ${status}`);

        response.json({
          success: true,
          message: `Slot status updated to ${status}`,
        });
      } catch (error) {
        console.error("[updateSlotStatus] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Birden fazla slot'un status'ünü toplu güncelle
 * Eski işlemleri topluca "published" yapmak için
 */
export const batchUpdateSlotStatus = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const { slotIds, status, note } = request.body;

        if (!slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
          response.status(400).json({
            success: false,
            error: "slotIds array is required",
          });
          return;
        }

        // İzin verilen status değerleri
        const allowedStatuses = ["pending", "generating", "awaiting_approval", "approved", "published", "failed"];
        if (!allowedStatuses.includes(status)) {
          response.status(400).json({
            success: false,
            error: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
          });
          return;
        }

        // Batch işlem
        const batch = db.batch();
        const updateData: Record<string, unknown> = {
          status,
          updatedAt: Date.now(),
          manualOverride: true,
          manualOverrideNote: note || "Toplu güncelleme ile güncellendi",
          manualOverrideAt: Date.now(),
        };

        if (status === "published") {
          updateData.completedAt = Date.now();
          updateData["pipelineResult.approvalStatus"] = "approved";
        }

        for (const slotId of slotIds) {
          const ref = db.collection("scheduled-slots").doc(slotId);
          batch.update(ref, updateData);
        }

        await batch.commit();

        console.log(`[batchUpdateSlotStatus] ${slotIds.length} slots updated to ${status}`);

        response.json({
          success: true,
          message: `${slotIds.length} slots updated to ${status}`,
          updatedCount: slotIds.length,
        });
      } catch (error) {
        console.error("[batchUpdateSlotStatus] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Slot caption'ını güncelle
 */
export const updateSlotCaption = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST" && request.method !== "PUT") {
          response.status(405).json({ success: false, error: "Use POST or PUT" });
          return;
        }

        const { slotId, caption, hashtags } = request.body;

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

        // Sadece caption ve hashtag'i güncelle
        const updates: Record<string, unknown> = {
          updatedAt: Date.now(),
        };

        if (caption !== undefined) {
          updates["pipelineResult.contentPackage.caption"] = caption;
        }
        if (hashtags !== undefined) {
          updates["pipelineResult.contentPackage.hashtags"] = hashtags;
        }

        await db.collection("scheduled-slots").doc(slotId).update(updates);

        response.json({
          success: true,
          message: "Caption updated",
        });
      } catch (error) {
        console.error("[updateSlotCaption] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// ==========================================
// SCHEDULED FUNCTIONS (Otomatik Tetikleme)
// ==========================================

const TIMEZONE = "Europe/Istanbul";

/**
 * Orchestrator Scheduler - Otomatik Zaman Kuralı İşleyici
 * Her 15 dakikada bir çalışır ve time-slot-rules'daki aktif kuralları kontrol eder.
 * Zamanı gelen kurallar için otomatik olarak içerik üretim pipeline'ı başlatır.
 */
export const orchestratorScheduledTrigger = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 300, memory: "512MB", secrets: [claudeApiKey] })
  .pubsub.schedule("*/15 * * * *")
  .timeZone(TIMEZONE)
  .onRun(async () => {
    console.log("[OrchestratorScheduler] Running automatic check...");

    try {
      const config = await getOrchestratorConfig();
      const scheduler = new OrchestratorScheduler(config);

      const result = await scheduler.checkAndTrigger();

      console.log("[OrchestratorScheduler] Result:", JSON.stringify(result));

      if (result.errors.length > 0) {
        console.error("[OrchestratorScheduler] Errors:", result.errors);
      }

      return null;
    } catch (error) {
      console.error("[OrchestratorScheduler] Fatal error:", error);
      throw error;
    }
  });

// ==========================================
// THEME MANAGEMENT
// ==========================================

/**
 * Tüm temaları listele
 * Firestore'daki temalar + varsayılan temalar birleştirilir
 */
export const listThemes = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        // Firestore'daki temaları al
        const snapshot = await db.collection("themes").orderBy("name").get();
        const firestoreThemes: Theme[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Theme[];

        // Varsayılan temaları kontrol et ve eksik olanları ekle
        const existingIds = firestoreThemes.map((t) => t.id);
        const missingDefaults = DEFAULT_THEMES.filter((dt) => !existingIds.includes(dt.id));

        // Eksik varsayılan temaları Firestore'a ekle
        const batch = db.batch();
        const now = Date.now();
        for (const theme of missingDefaults) {
          const ref = db.collection("themes").doc(theme.id);
          batch.set(ref, {
            ...theme,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (missingDefaults.length > 0) {
          await batch.commit();
          console.log(`[listThemes] Added ${missingDefaults.length} default themes`);
        }

        // Tüm temaları birleştir ve döndür
        const allThemes = [
          ...firestoreThemes,
          ...missingDefaults.map((t) => ({ ...t, createdAt: now, updatedAt: now })),
        ].sort((a, b) => a.name.localeCompare(b.name, "tr"));

        response.json({ success: true, data: allThemes });
      } catch (error) {
        console.error("[listThemes] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Yeni tema oluştur
 */
export const createTheme = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const { id, name, description, scenarios, mood, petAllowed } = request.body;

        if (!id || !name || !scenarios || scenarios.length === 0) {
          response.status(400).json({
            success: false,
            error: "id, name, and scenarios are required",
          });
          return;
        }

        // ID benzersiz mi kontrol et
        const existingDoc = await db.collection("themes").doc(id).get();
        if (existingDoc.exists) {
          response.status(400).json({
            success: false,
            error: "Bu ID zaten kullanılıyor",
          });
          return;
        }

        const now = Date.now();
        const theme: Theme = {
          id,
          name,
          description: description || "",
          scenarios,
          mood: mood || "balanced",
          petAllowed: petAllowed || false,
          createdAt: now,
          updatedAt: now,
          isDefault: false,
        };

        await db.collection("themes").doc(id).set(theme);

        console.log(`[createTheme] Created theme: ${id}`);
        response.json({ success: true, data: theme });
      } catch (error) {
        console.error("[createTheme] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Tema güncelle
 */
export const updateTheme = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "PUT" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use PUT or POST" });
          return;
        }

        const { id, name, description, scenarios, mood, petAllowed } = request.body;

        if (!id) {
          response.status(400).json({ success: false, error: "id is required" });
          return;
        }

        const docRef = db.collection("themes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          response.status(404).json({ success: false, error: "Theme not found" });
          return;
        }

        const updateData: Partial<Theme> = {
          updatedAt: Date.now(),
        };

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (scenarios !== undefined) updateData.scenarios = scenarios;
        if (mood !== undefined) updateData.mood = mood;
        if (petAllowed !== undefined) updateData.petAllowed = petAllowed;

        await docRef.update(updateData);

        const updated = await docRef.get();
        console.log(`[updateTheme] Updated theme: ${id}`);
        response.json({ success: true, data: { id, ...updated.data() } });
      } catch (error) {
        console.error("[updateTheme] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Tema sil
 * Not: Varsayılan temalar silinemez
 */
export const deleteTheme = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "DELETE" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use DELETE or POST" });
          return;
        }

        const id = request.body.id || request.query.id;

        if (!id) {
          response.status(400).json({ success: false, error: "id is required" });
          return;
        }

        const docRef = db.collection("themes").doc(id as string);
        const doc = await docRef.get();

        if (!doc.exists) {
          response.status(404).json({ success: false, error: "Theme not found" });
          return;
        }

        const theme = doc.data() as Theme;
        if (theme.isDefault) {
          response.status(400).json({
            success: false,
            error: "Varsayılan temalar silinemez",
          });
          return;
        }

        await docRef.delete();

        console.log(`[deleteTheme] Deleted theme: ${id}`);
        response.json({ success: true, message: "Theme deleted" });
      } catch (error) {
        console.error("[deleteTheme] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// ==========================================
// VARIATION RULES CONFIG
// ==========================================

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
          // Varsayılan değerleri döndür
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
        console.error("[getVariationConfig] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
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

        // Mevcut veriyi al
        const doc = await docRef.get();
        const currentData = doc.exists ? doc.data() : {};

        // Güncelleme verisi oluştur
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
        console.error("[updateVariationConfig] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
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
        console.error("[getProductionHistory] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
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
        // Son 15 üretimi al
        const snapshot = await db
          .collection("production-history")
          .orderBy("timestamp", "desc")
          .limit(15)
          .get();

        const history = snapshot.docs.map(doc => doc.data());

        // Son köpek kullanımını bul
        const lastPetEntry = history.find(entry => entry.includesPet === true);
        const lastPetUsage = lastPetEntry?.timestamp || null;

        // Köpeksiz üretim sayısı
        let productionsSincePet = 0;
        for (const entry of history) {
          if (entry.includesPet) break;
          productionsSincePet++;
        }

        // Config'den petFrequency al
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
        console.error("[getPetUsageStats] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// ==========================================
// FEEDBACK ENDPOINTS
// ==========================================

/**
 * Yeni feedback oluştur
 * POST /createFeedback
 * Body: { slotId, category, customNote?, pipelineId?, scenarioId?, productType?, productId?, handStyleId?, compositionId? }
 */
export const createFeedback = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const {
          slotId,
          category,
          customNote,
          pipelineId,
          scenarioId,
          productType,
          productId,
          handStyleId,
          compositionId,
        } = request.body;

        // Validasyon
        if (!slotId || !category) {
          response.status(400).json({
            success: false,
            error: "slotId ve category zorunludur",
          });
          return;
        }

        // Undefined değerleri Firestore'a göndermemek için filtrele
        const feedbackData: Record<string, unknown> = {
          slotId,
          category: category as IssueCategoryId,
        };

        // Sadece tanımlı değerleri ekle
        if (customNote) feedbackData.customNote = customNote;
        if (pipelineId) feedbackData.pipelineId = pipelineId;
        if (scenarioId) feedbackData.scenarioId = scenarioId;
        if (productType) feedbackData.productType = productType;
        if (productId) feedbackData.productId = productId;
        if (handStyleId) feedbackData.handStyleId = handStyleId;
        if (compositionId) feedbackData.compositionId = compositionId;

        const feedbackId = await FeedbackService.createFeedback(
          feedbackData as Omit<IssueFeedback, "id" | "createdAt" | "resolved">
        );

        response.json({
          success: true,
          data: { id: feedbackId },
        });
      } catch (error) {
        console.error("[createFeedback] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Slot'a ait feedback'leri getir
 * GET /getFeedbackBySlot?slotId=xxx
 */
export const getFeedbackBySlot = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const slotId = request.query.slotId as string;

        if (!slotId) {
          response.status(400).json({
            success: false,
            error: "slotId parametresi zorunludur",
          });
          return;
        }

        const feedbacks = await FeedbackService.getFeedbackBySlot(slotId);

        response.json({
          success: true,
          data: feedbacks,
        });
      } catch (error) {
        console.error("[getFeedbackBySlot] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Feedback istatistiklerini getir
 * GET /getFeedbackStats
 */
export const getFeedbackStats = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const stats = await FeedbackService.getStats();

        response.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        console.error("[getFeedbackStats] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// ==========================================
// AI RULES ENDPOINTS
// ==========================================

/**
 * Tüm AI kurallarını listele
 * GET /listAIRules?activeOnly=true
 */
export const listAIRules = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const activeOnly = request.query.activeOnly === "true";
        const rules = await AIRulesService.listRules(activeOnly);

        response.json({
          success: true,
          data: rules,
        });
      } catch (error) {
        console.error("[listAIRules] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Yeni AI kuralı oluştur
 * POST /createAIRule
 * Body: { type, category, title, description, exampleImageUrl?, isActive }
 */
export const createAIRule = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const { type, category, title, description, exampleImageUrl, isActive } = request.body;

        // Validasyon
        if (!type || !category || !title) {
          response.status(400).json({
            success: false,
            error: "type, category ve title zorunludur",
          });
          return;
        }

        if (type !== "do" && type !== "dont") {
          response.status(400).json({
            success: false,
            error: "type 'do' veya 'dont' olmalı",
          });
          return;
        }

        // Undefined değerleri filtrele
        const ruleData: Record<string, unknown> = {
          type,
          category: category as AIRuleCategoryId,
          title,
          description: description || "",
          isActive: isActive !== false, // default true
        };

        if (exampleImageUrl) {
          ruleData.exampleImageUrl = exampleImageUrl;
        }

        const ruleId = await AIRulesService.createRule(
          ruleData as Omit<AIRule, "id" | "createdAt" | "updatedAt">
        );

        response.json({
          success: true,
          data: { id: ruleId },
        });
      } catch (error) {
        console.error("[createAIRule] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * AI kuralı güncelle
 * PUT /updateAIRule
 * Body: { id, ...updates }
 */
export const updateAIRule = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "PUT" && request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const { id, ...updates } = request.body;

        if (!id) {
          response.status(400).json({
            success: false,
            error: "id zorunludur",
          });
          return;
        }

        // Undefined değerleri filtrele
        const filteredUpdates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updates)) {
          if (value !== undefined) {
            filteredUpdates[key] = value;
          }
        }

        await AIRulesService.updateRule(id, filteredUpdates);

        response.json({
          success: true,
        });
      } catch (error) {
        console.error("[updateAIRule] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * AI kuralı sil
 * DELETE /deleteAIRule?id=xxx
 */
export const deleteAIRule = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const id = (request.query.id as string) || request.body?.id;

        if (!id) {
          response.status(400).json({
            success: false,
            error: "id zorunludur",
          });
          return;
        }

        await AIRulesService.deleteRule(id);

        response.json({
          success: true,
        });
      } catch (error) {
        console.error("[deleteAIRule] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * AI kural istatistiklerini getir
 * GET /getAIRulesStats
 */
export const getAIRulesStats = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const stats = await AIRulesService.getStats();

        response.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        console.error("[getAIRulesStats] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

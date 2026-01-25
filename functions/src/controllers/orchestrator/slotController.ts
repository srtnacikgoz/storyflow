/**
 * Slot Controller
 * Scheduled slot CRUD ve durum işlemleri
 */

import { functions, db, getCors, getConfig, REGION, claudeApiKey, getOrchestratorConfig, errorResponse } from "./shared";
import { getInstagramService } from "../../lib/serviceFactory";
import { OrchestratorScheduler } from "../../orchestrator/scheduler";

/**
 * Scheduled slot'ları listele
 * Memory optimize: pipelineResult hariç tutulur (çok büyük olabilir)
 */
export const listScheduledSlots = functions
  .region(REGION)
  .runWith({ memory: "512MB" }) // Memory artırıldı
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const { status, limit = "20", includePipelineResult = "false" } = request.query;

        let query: FirebaseFirestore.Query = db.collection("scheduled-slots");

        if (status) {
          query = query.where("status", "==", status);
        }

        const snapshot = await query
          .orderBy("createdAt", "desc")
          .limit(parseInt(limit as string))
          .get();

        // pipelineResult çok büyük olabilir, opsiyonel olarak dahil et
        const includeFullResult = includePipelineResult === "true";

        const slots = snapshot.docs.map(doc => {
          const data = doc.data();

          if (includeFullResult) {
            return { id: doc.id, ...data };
          }

          // pipelineResult'tan sadece özet bilgileri al
          const { pipelineResult, ...rest } = data;
          return {
            id: doc.id,
            ...rest,
            // Sadece önemli alanları dahil et
            hasPipelineResult: !!pipelineResult,
            imageUrl: pipelineResult?.generatedImage?.storageUrl || pipelineResult?.selectedPhoto?.url,
            caption: pipelineResult?.caption?.text || pipelineResult?.contentPackage?.caption,
          };
        });

        response.json({
          success: true,
          data: slots,
          count: slots.length,
        });
      } catch (error) {
        errorResponse(response, error, "listScheduledSlots");
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
        errorResponse(response, error, "getScheduledSlot");
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
        errorResponse(response, error, "listPipelineResults");
      }
    });
  });

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
        errorResponse(response, error, "getSlotDetail");
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
        errorResponse(response, error, "deleteScheduledSlot");
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
        errorResponse(response, error, "retrySlot");
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

        // gs:// URL'ini public HTTP URL'e çevir
        if (imageUrl.startsWith("gs://")) {
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
        errorResponse(response, error, "approveSlot");
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
        errorResponse(response, error, "rejectSlot");
      }
    });
  });

/**
 * Slot status'ünü güncelle (admin manual override)
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

        const allowedStatuses = ["pending", "generating", "awaiting_approval", "approved", "published", "failed"];
        if (!allowedStatuses.includes(status)) {
          response.status(400).json({
            success: false,
            error: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
          });
          return;
        }

        const slotDoc = await db.collection("scheduled-slots").doc(slotId).get();
        if (!slotDoc.exists) {
          response.status(404).json({ success: false, error: "Slot not found" });
          return;
        }

        const updateData: Record<string, unknown> = {
          status,
          updatedAt: Date.now(),
          manualOverride: true,
          manualOverrideNote: note || "Manuel olarak güncellendi",
          manualOverrideAt: Date.now(),
        };

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
        errorResponse(response, error, "updateSlotStatus");
      }
    });
  });

/**
 * Birden fazla slot'un status'ünü toplu güncelle
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

        const allowedStatuses = ["pending", "generating", "awaiting_approval", "approved", "published", "failed"];
        if (!allowedStatuses.includes(status)) {
          response.status(400).json({
            success: false,
            error: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
          });
          return;
        }

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
        errorResponse(response, error, "batchUpdateSlotStatus");
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

        const slotDoc = await db.collection("scheduled-slots").doc(slotId).get();
        if (!slotDoc.exists) {
          response.status(404).json({ success: false, error: "Slot not found" });
          return;
        }

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
        errorResponse(response, error, "updateSlotCaption");
      }
    });
  });

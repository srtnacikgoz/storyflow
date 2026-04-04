/**
 * Slot Controller
 * Scheduled slot CRUD ve durum işlemleri
 */

import { createHttpFunction, db, getConfig, getOrchestratorConfig, errorResponse } from "./shared";
import { getInstagramService } from "../../lib/serviceFactory";
import { OrchestratorScheduler } from "../../orchestrator/scheduler";

/**
 * Scheduled slot'ları listele
 * Memory optimize: pipelineResult hariç tutulur (çok büyük olabilir)
 */
export const listScheduledSlots = createHttpFunction(async (req, res) => {
  const { status, limit = "20", includePipelineResult = "false" } = req.query;

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

  res.json({
    success: true,
    data: slots,
    count: slots.length,
  });
}, { memory: "512MiB" });

/**
 * Tek bir slot'un detaylarını getir (progress polling için)
 */
export const getScheduledSlot = createHttpFunction(async (req, res) => {
  const { slotId } = req.query;

  if (!slotId || typeof slotId !== "string") {
    res.status(400).json({
      success: false,
      error: "slotId is required",
    });
    return;
  }

  const doc = await db.collection("scheduled-slots").doc(slotId).get();

  if (!doc.exists) {
    res.json({
      success: true,
      slot: null,
    });
    return;
  }

  const data = doc.data();
  res.json({
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
});

/**
 * Pipeline sonuçlarını listele
 */
export const listPipelineResults = createHttpFunction(async (req, res) => {
  const { limit = "20" } = req.query;

  const snapshot = await db
    .collection("pipeline-results")
    .orderBy("startedAt", "desc")
    .limit(parseInt(limit as string))
    .get();

  const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  res.json({
    success: true,
    data: results,
    count: results.length,
  });
});

/**
 * Slot'un tam detaylarını getir (pipelineResult dahil)
 */
export const getSlotDetail = createHttpFunction(async (req, res) => {
  const slotId = req.query.slotId as string;

  if (!slotId) {
    res.status(400).json({
      success: false,
      error: "slotId is required",
    });
    return;
  }

  const doc = await db.collection("scheduled-slots").doc(slotId).get();

  if (!doc.exists) {
    res.status(404).json({
      success: false,
      error: "Slot not found",
    });
    return;
  }

  res.json({
    success: true,
    data: { id: doc.id, ...doc.data() },
  });
});

/**
 * Slot sil (hard delete)
 */
export const deleteScheduledSlot = createHttpFunction(async (req, res) => {
  if (req.method !== "DELETE" && req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use DELETE or POST" });
    return;
  }

  const slotId = req.query.slotId as string || req.body?.slotId;

  if (!slotId) {
    res.status(400).json({
      success: false,
      error: "slotId is required",
    });
    return;
  }

  await db.collection("scheduled-slots").doc(slotId).delete();

  res.json({
    success: true,
    message: "Slot deleted",
  });
});

/**
 * Başarısız slot'u yeniden dene
 */
export const retrySlot = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const slotId = req.body?.slotId;

  if (!slotId) {
    res.status(400).json({
      success: false,
      error: "slotId is required",
    });
    return;
  }

  // Slot'u getir
  const slotDoc = await db.collection("scheduled-slots").doc(slotId).get();
  if (!slotDoc.exists) {
    res.status(404).json({ success: false, error: "Slot not found" });
    return;
  }

  const slot = slotDoc.data();
  if (slot?.status !== "failed") {
    res.status(400).json({
      success: false,
      error: "Only failed slots can be retried",
    });
    return;
  }

  const ruleId = slot.timeSlotRuleId;
  if (!ruleId) {
    res.status(400).json({
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

  res.json({
    success: true,
    message: "Slot retry initiated",
  });
}, { timeoutSeconds: 540, memory: "1GiB" });

/**
 * Slot'u dashboard'dan onayla
 */
export const approveSlot = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const slotId = req.body?.slotId;

  if (!slotId) {
    res.status(400).json({
      success: false,
      error: "slotId is required",
    });
    return;
  }

  // Slot'u getir
  const slotDoc = await db.collection("scheduled-slots").doc(slotId).get();
  if (!slotDoc.exists) {
    res.status(404).json({ success: false, error: "Slot not found" });
    return;
  }

  const slot = slotDoc.data();
  if (slot?.status !== "awaiting_approval") {
    res.status(400).json({
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
    res.status(400).json({
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
    "status": "published",
    "pipelineResult.approvalStatus": "approved",
    "pipelineResult.approvalRespondedAt": Date.now(),
    "pipelineResult.publishedAt": Date.now(),
    "pipelineResult.instagramPostId": publishResult?.id,
    "updatedAt": Date.now(),
  });

  res.json({
    success: true,
    message: "Slot approved and published",
  });
}, { timeoutSeconds: 120 });

/**
 * Slot'u dashboard'dan reddet
 */
export const rejectSlot = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const slotId = req.body?.slotId;

  if (!slotId) {
    res.status(400).json({
      success: false,
      error: "slotId is required",
    });
    return;
  }

  // Slot'u getir
  const slotDoc = await db.collection("scheduled-slots").doc(slotId).get();
  if (!slotDoc.exists) {
    res.status(404).json({ success: false, error: "Slot not found" });
    return;
  }

  const slot = slotDoc.data();
  if (slot?.status !== "awaiting_approval") {
    res.status(400).json({
      success: false,
      error: "Only slots awaiting approval can be rejected",
    });
    return;
  }

  // Slot'u güncelle
  await db.collection("scheduled-slots").doc(slotId).update({
    "status": "failed",
    "pipelineResult.approvalStatus": "rejected",
    "pipelineResult.approvalRespondedAt": Date.now(),
    "error": "Rejected from dashboard",
    "updatedAt": Date.now(),
  });

  res.json({
    success: true,
    message: "Slot rejected",
  });
});

/**
 * Slot status'ünü güncelle (admin manual override)
 */
export const updateSlotStatus = createHttpFunction(async (req, res) => {
  if (req.method !== "POST" && req.method !== "PUT") {
    res.status(405).json({ success: false, error: "Use POST or PUT" });
    return;
  }

  const { slotId, status, note } = req.body;

  if (!slotId) {
    res.status(400).json({
      success: false,
      error: "slotId is required",
    });
    return;
  }

  const allowedStatuses = ["pending", "generating", "awaiting_approval", "approved", "published", "failed"];
  if (!allowedStatuses.includes(status)) {
    res.status(400).json({
      success: false,
      error: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
    });
    return;
  }

  const slotDoc = await db.collection("scheduled-slots").doc(slotId).get();
  if (!slotDoc.exists) {
    res.status(404).json({ success: false, error: "Slot not found" });
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

  res.json({
    success: true,
    message: `Slot status updated to ${status}`,
  });
});

/**
 * Birden fazla slot'un status'ünü toplu güncelle
 */
export const batchUpdateSlotStatus = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { slotIds, status, note } = req.body;

  if (!slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
    res.status(400).json({
      success: false,
      error: "slotIds array is required",
    });
    return;
  }

  const allowedStatuses = ["pending", "generating", "awaiting_approval", "approved", "published", "failed"];
  if (!allowedStatuses.includes(status)) {
    res.status(400).json({
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

  res.json({
    success: true,
    message: `${slotIds.length} slots updated to ${status}`,
    updatedCount: slotIds.length,
  });
});

/**
 * Slot caption'ını güncelle
 */
export const updateSlotCaption = createHttpFunction(async (req, res) => {
  if (req.method !== "POST" && req.method !== "PUT") {
    res.status(405).json({ success: false, error: "Use POST or PUT" });
    return;
  }

  const { slotId, caption, hashtags } = req.body;

  if (!slotId) {
    res.status(400).json({
      success: false,
      error: "slotId is required",
    });
    return;
  }

  const slotDoc = await db.collection("scheduled-slots").doc(slotId).get();
  if (!slotDoc.exists) {
    res.status(404).json({ success: false, error: "Slot not found" });
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

  res.json({
    success: true,
    message: "Caption updated",
  });
});

/**
 * Pipeline'ı iptal et
 * Sadece "generating" durumundaki slot'lar iptal edilebilir
 */
export const cancelSlotPipeline = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { slotId } = req.body as { slotId: string };

  if (!slotId) {
    res.status(400).json({
      success: false,
      error: "slotId is required",
    });
    return;
  }

  const slotDoc = await db.collection("scheduled-slots").doc(slotId).get();
  if (!slotDoc.exists) {
    res.status(404).json({ success: false, error: "Slot not found" });
    return;
  }

  const slot = slotDoc.data();

  // Sadece generating durumundaki slot'lar iptal edilebilir
  if (slot?.status !== "generating") {
    res.status(400).json({
      success: false,
      error: `Slot is not generating (current status: ${slot?.status}). Only generating slots can be cancelled.`,
    });
    return;
  }

  // Status'ü cancelled yap
  await db.collection("scheduled-slots").doc(slotId).update({
    status: "cancelled",
    cancelledAt: Date.now(),
    updatedAt: Date.now(),
  });

  console.log(`[SlotController] Pipeline cancelled for slot ${slotId}`);

  res.json({
    success: true,
    message: "Pipeline cancelled",
    slotId,
  });
});

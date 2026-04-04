/**
 * Feedback Controller
 * AI geri bildirim işlemleri
 */

import { createHttpFunction, db } from "./shared";
import { FeedbackService } from "../../services/feedbackService";
import { AIRulesService } from "../../services/aiRulesService";
import { IssueCategoryId, IssueFeedback } from "../../orchestrator/types";

/**
 * Yeni feedback oluştur
 * POST /createFeedback
 */
export const createFeedback = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

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
  } = req.body;

  if (!slotId || !category) {
    res.status(400).json({
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

  res.json({
    success: true,
    data: { id: feedbackId },
  });
});

/**
 * Slot'a ait feedback'leri getir
 * GET /getFeedbackBySlot?slotId=xxx
 */
export const getFeedbackBySlot = createHttpFunction(async (req, res) => {
  const slotId = req.query.slotId as string;

  if (!slotId) {
    res.status(400).json({
      success: false,
      error: "slotId parametresi zorunludur",
    });
    return;
  }

  const feedbacks = await FeedbackService.getFeedbackBySlot(slotId);

  res.json({
    success: true,
    data: feedbacks,
  });
});

/**
 * Feedback istatistiklerini getir
 * GET /getFeedbackStats
 */
export const getFeedbackStats = createHttpFunction(async (req, res) => {
  const stats = await FeedbackService.getStats();

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * DEBUG: Feedback hints'in ne döndürdüğünü göster
 * GET /debugFeedbackHints
 */
export const debugFeedbackHints = createHttpFunction(async (req, res) => {
  // Direkt collection'dan tüm dokümanları say
  const allFeedbackSnapshot = await db.collection("ai-feedback").get();
  const allFeedbackCount = allFeedbackSnapshot.size;
  const allFeedbackDocs = allFeedbackSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // AI Rules collection'ı da kontrol et
  const allRulesSnapshot = await db.collection("ai-rules").get();
  const allRulesCount = allRulesSnapshot.size;
  const allRulesDocs = allRulesSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Direkt query dene
  let directQueryResult = null;
  let directQueryError = null;
  try {
    const feedbackQuery = await db
      .collection("ai-feedback")
      .where("resolved", "==", false)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();
    directQueryResult = {
      count: feedbackQuery.size,
      docs: feedbackQuery.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.id),
    };
  } catch (err) {
    directQueryError = err instanceof Error ? err.message : String(err);
  }

  // Ham feedback verileri
  let recentFeedback = null;
  let feedbackQueryError = null;
  try {
    recentFeedback = await FeedbackService.getRecentUnresolvedFeedback();
  } catch (err) {
    feedbackQueryError = err instanceof Error ? err.message : "Unknown error";
  }

  // generatePromptHints'in döndürdüğü string
  const promptHints = await FeedbackService.generatePromptHints();

  // AI Rules'dan gelen kurallar
  const aiRulesHints = await AIRulesService.generatePromptRules();

  res.json({
    success: true,
    data: {
      directCheck: {
        aiFeedbackCount: allFeedbackCount,
        aiFeedbackDocs: allFeedbackDocs.slice(0, 10),
        aiRulesCount: allRulesCount,
        aiRulesDocs: allRulesDocs.slice(0, 10),
      },
      directQuery: {
        result: directQueryResult,
        error: directQueryError,
      },
      recentFeedback,
      feedbackQueryError,
      promptHints: promptHints || "(boş)",
      aiRulesHints: aiRulesHints || "(boş)",
    },
  });
});

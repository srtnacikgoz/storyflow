/**
 * Feedback Controller
 * AI geri bildirim işlemleri
 */

import { functions, db, getCors, REGION, errorResponse } from "./shared";
import { FeedbackService } from "../../services/feedbackService";
import { AIRulesService } from "../../services/aiRulesService";
import { IssueCategoryId, IssueFeedback } from "../../orchestrator/types";

/**
 * Yeni feedback oluştur
 * POST /createFeedback
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
        errorResponse(response, error, "createFeedback");
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
        errorResponse(response, error, "getFeedbackBySlot");
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
        errorResponse(response, error, "getFeedbackStats");
      }
    });
  });

/**
 * DEBUG: Feedback hints'in ne döndürdüğünü göster
 * GET /debugFeedbackHints
 */
export const debugFeedbackHints = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
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

        response.json({
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
      } catch (error) {
        errorResponse(response, error, "debugFeedbackHints");
      }
    });
  });

/**
 * AI Log Controller
 * AI Monitor sayfası için API endpoint'leri
 */

import * as functions from "firebase-functions";
import { getCors } from "../lib/serviceFactory";
import { AILogService } from "../services/aiLogService";
import { AIProvider, AILogStage, AILogStatus } from "../types";

const REGION = "europe-west1";

/**
 * AI loglarını listele
 * GET /aiLogs
 * Query params: provider, stage, status, pipelineId, limit
 */
export const getAILogs = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        // Query parametrelerini al
        const {
          provider,
          stage,
          status,
          pipelineId,
          limit,
        } = request.query;

        const logs = await AILogService.getLogs({
          provider: provider as AIProvider | undefined,
          stage: stage as AILogStage | undefined,
          status: status as AILogStatus | undefined,
          pipelineId: pipelineId as string | undefined,
          limit: limit ? parseInt(limit as string, 10) : 50,
        });

        response.json({
          success: true,
          data: logs,
          count: logs.length,
        });
      } catch (error) {
        console.error("[AILogController] Error fetching logs:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * AI istatistiklerini getir
 * GET /aiStats
 * Query params: hours (son kaç saatin istatistikleri)
 */
export const getAIStats = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const hours = request.query.hours
          ? parseInt(request.query.hours as string, 10)
          : 24;

        const stats = await AILogService.getStats(hours);

        response.json({
          success: true,
          data: stats,
          period: `last ${hours} hours`,
        });
      } catch (error) {
        console.error("[AILogController] Error fetching stats:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Tek bir log detayını getir
 * GET /aiLog/:id
 */
export const getAILogById = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        // Path'ten ID al
        const pathParts = request.path.split("/");
        const logId = pathParts[pathParts.length - 1];

        if (!logId) {
          response.status(400).json({
            success: false,
            error: "Log ID required",
          });
          return;
        }

        // Firestore'dan tek log getir
        const admin = await import("firebase-admin");
        const db = admin.firestore();
        const doc = await db.collection("ai-logs").doc(logId).get();

        if (!doc.exists) {
          response.status(404).json({
            success: false,
            error: "Log not found",
          });
          return;
        }

        response.json({
          success: true,
          data: doc.data(),
        });
      } catch (error) {
        console.error("[AILogController] Error fetching log:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Pipeline'a ait logları getir
 * GET /aiLogsByPipeline/:pipelineId
 */
export const getAILogsByPipeline = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        // Path'ten pipeline ID al
        const pathParts = request.path.split("/");
        const pipelineId = pathParts[pathParts.length - 1];

        if (!pipelineId) {
          response.status(400).json({
            success: false,
            error: "Pipeline ID required",
          });
          return;
        }

        const logs = await AILogService.getLogsByPipeline(pipelineId);

        response.json({
          success: true,
          data: logs,
          count: logs.length,
          pipelineId,
        });
      } catch (error) {
        console.error("[AILogController] Error fetching pipeline logs:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Eski logları temizle (manual trigger)
 * DELETE /aiLogsCleanup
 * Query params: daysOld (kaç günlük loglar silinsin, default: 30)
 */
export const cleanupAILogs = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "DELETE" && request.method !== "POST") {
        response.status(405).json({
          success: false,
          error: "Method not allowed",
        });
        return;
      }

      try {
        const daysOld = request.query.daysOld
          ? parseInt(request.query.daysOld as string, 10)
          : 30;

        const deletedCount = await AILogService.cleanupOldLogs(daysOld);

        response.json({
          success: true,
          message: `Deleted ${deletedCount} logs older than ${daysOld} days`,
          deletedCount,
        });
      } catch (error) {
        console.error("[AILogController] Error cleaning up logs:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

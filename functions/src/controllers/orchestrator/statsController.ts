/**
 * Stats Controller
 * Queue ve Usage istatistik endpoint'leri
 */

import { functions, getCors, REGION, errorResponse, successResponse } from "./shared";
import { QueueService } from "../../services/queue";
import { UsageService } from "../../services/usage";

/**
 * Kuyruk istatistikleri
 * GET /getQueueStats
 */
export const getQueueStats = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const queueService = new QueueService();
        const stats = await queueService.getStats();
        successResponse(response, { stats });
      } catch (error) {
        errorResponse(response, error, "getQueueStats");
      }
    });
  });

/**
 * AI kullanım istatistikleri
 * GET /getUsageStats
 */
export const getUsageStats = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const usageService = new UsageService();
        const stats = await usageService.getStats();
        const recent = await usageService.getRecentUsage(10);
        successResponse(response, { stats, recent });
      } catch (error) {
        errorResponse(response, error, "getUsageStats");
      }
    });
  });

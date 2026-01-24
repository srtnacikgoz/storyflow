/**
 * Pipeline Controller
 * Pipeline tetikleme ve scheduler işlemleri
 */

import { functions, db, getCors, REGION, claudeApiKey, getOrchestratorConfig, errorResponse } from "./shared";
import { OrchestratorScheduler } from "../../orchestrator/scheduler";
import { ProductType } from "../../orchestrator/types";

const TIMEZONE = "Europe/Istanbul";

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
        errorResponse(response, error, "triggerOrchestratorScheduler");
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
        errorResponse(response, error, "triggerOrchestratorPipeline");
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
      } catch (error) {
        errorResponse(response, error, "orchestratorGenerateNow");
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
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Orchestrator } = require("../../orchestrator/orchestrator");
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
        errorResponse(response, error, "orchestratorResendTelegram");
      }
    });
  });

/**
 * Orchestrator Scheduler - Otomatik Zaman Kuralı İşleyici
 * Her 15 dakikada bir çalışır ve time-slot-rules'daki aktif kuralları kontrol eder.
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

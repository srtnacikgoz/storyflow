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
 * Hemen içerik üret (productType opsiyonel — yoksa senaryodan otomatik belirlenir)
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

        const { productType, themeId, aspectRatio, isRandomMode } = request.body as {
          productType?: ProductType;
          themeId?: string;
          aspectRatio?: "1:1" | "3:4" | "9:16";
          isRandomMode?: boolean;
        };

        const config = await getOrchestratorConfig();
        const scheduler = new OrchestratorScheduler(config);

        // Pipeline tamamlanana kadar bekle (productType opsiyonel — auto mod)
        const result = await scheduler.generateNow(themeId, aspectRatio, productType, isRandomMode);

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
 * Pre-flight validation — pipeline çalıştırmadan önce kontrolleri yap
 * Hafif endpoint: tema + senaryo + ürün uyumluluğu kontrol eder
 */
export const validateBeforeGenerate = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const { themeId } = request.query as { themeId?: string };

        const warnings: Array<{ type: "info" | "warning" | "error"; message: string }> = [];

        if (!themeId) {
          warnings.push({ type: "info", message: "Tema seçilmedi — rastgele tema/senaryo kullanılacak" });
          response.json({ success: true, warnings, canProceed: true });
          return;
        }

        // 1. Tema yükle
        const themeDoc = await db.collection("themes").doc(themeId).get();
        if (!themeDoc.exists) {
          warnings.push({ type: "error", message: `Tema bulunamadı: ${themeId}` });
          response.json({ success: true, warnings, canProceed: false });
          return;
        }

        const themeData = themeDoc.data()!;
        warnings.push({ type: "info", message: `Tema: ${themeData.name}` });

        // 2. Senaryoyu bul
        const scenarioIds: string[] = themeData.scenarios || [];
        if (scenarioIds.length === 0) {
          warnings.push({ type: "error", message: "Tema'da senaryo tanımlı değil" });
          response.json({ success: true, warnings, canProceed: false });
          return;
        }

        // Global config'den senaryoları al
        const { getGlobalConfig, ensureConfigInitialized } = await import("../../services/configService");
        await ensureConfigInitialized();
        const globalConfig = await getGlobalConfig();
        const allScenarios = globalConfig.scenarios || [];

        // Tema senaryolarını filtrele (interior olmayanlar)
        const themeScenarios = allScenarios.filter(
          (s: any) => scenarioIds.includes(s.id) && !s.isInterior
        );

        if (themeScenarios.length === 0) {
          // Belki sadece interior senaryoları var
          const interiorScenarios = allScenarios.filter(
            (s: any) => scenarioIds.includes(s.id) && s.isInterior
          );
          if (interiorScenarios.length > 0) {
            warnings.push({ type: "info", message: `İç mekan teması (${interiorScenarios.length} interior senaryo)` });
            response.json({ success: true, warnings, canProceed: true });
            return;
          }
          warnings.push({ type: "error", message: "Tema'daki senaryolar sistemde bulunamadı" });
          response.json({ success: true, warnings, canProceed: false });
          return;
        }

        const primaryScenario = themeScenarios[0] as any;
        warnings.push({ type: "info", message: `Senaryo: ${primaryScenario.name}` });

        // 3. suggestedProducts kontrolü → productType belirlenebilir mi?
        let determinedProductType: string | null = null;
        if (primaryScenario.suggestedProducts && primaryScenario.suggestedProducts.length > 0) {
          determinedProductType = primaryScenario.suggestedProducts[0];
          warnings.push({ type: "info", message: `Ürün tipi: ${determinedProductType}` });
        } else {
          warnings.push({ type: "warning", message: "Senaryo'da önerilen ürün tipi tanımlı değil — ilk aktif kategoriden seçilecek" });
        }

        // 4. O productType için ürün asset'i var mı?
        if (determinedProductType) {
          const productAssets = await db.collection("assets")
            .where("category", "==", "products")
            .where("subType", "==", determinedProductType)
            .where("isActive", "==", true)
            .limit(1)
            .get();

          if (productAssets.empty) {
            warnings.push({ type: "error", message: `"${determinedProductType}" için aktif ürün görseli yok — Assets sayfasından ekleyin` });
          }
        }

        // 5. preferredTags kontrolü (masa, tabak, fincan)
        // Gerçek Firestore yapısı: masalar = furniture/tables, tabaklar = props/plates, fincanlar = props/cups
        const preferredTags = themeData.setting?.preferredTags as { table?: string[]; plate?: string[]; cup?: string[] } | undefined;
        if (preferredTags) {
          const checkPreferred = async (
            tagList: string[] | undefined,
            category: string,
            subType: string,
            label: string
          ) => {
            if (!tagList || tagList.length === 0 || tagList.includes("__none__")) return;
            const assetsQuery = await db.collection("assets")
              .where("category", "==", category)
              .where("subType", "==", subType)
              .where("isActive", "==", true)
              .limit(50)
              .get();
            const matchingAssets = assetsQuery.docs.filter(doc => {
              const tags: string[] = doc.data().tags || [];
              return tags.some(t => tagList.some(pt => t.toLowerCase().includes(pt.toLowerCase())));
            });
            if (matchingAssets.length === 0) {
              warnings.push({ type: "warning", message: `Tema'da ${label} tercihi "${tagList.join(", ")}" ama eşleşen asset yok` });
            }
          };
          await checkPreferred(preferredTags.table, "furniture", "tables", "masa");
          await checkPreferred(preferredTags.plate, "props", "plates", "tabak");
          await checkPreferred(preferredTags.cup, "props", "cups", "fincan");
        }

        const hasError = warnings.some(w => w.type === "error");
        response.json({
          success: true,
          warnings,
          canProceed: !hasError,
        });
      } catch (error) {
        errorResponse(response, error, "validateBeforeGenerate");
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

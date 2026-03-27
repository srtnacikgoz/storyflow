/**
 * Enhancement Controller
 * Fotoğraf iyileştirme preset CRUD + job yönetimi + AI analiz endpoint'leri
 */

import { functions, getCors, REGION, errorResponse, successResponse, getConfig } from "./shared";
import { getSystemSettings } from "../../services/configService";
import { EnhancementService } from "../../services/enhancementService";

const enhancementService = new EnhancementService();

// ==========================================
// Preset Endpoints
// ==========================================

export const listEnhancementPresets = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 10, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const activeOnly = request.query.activeOnly === "true";
        const presets = await enhancementService.listPresets(activeOnly);
        successResponse(response, { presets, count: presets.length });
      } catch (error) {
        errorResponse(response, error, "listEnhancementPresets");
      }
    });
  });

export const createEnhancementPreset = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 10, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }
        const data = request.body;
        if (!data.id || !data.displayName) {
          response.status(400).json({ success: false, error: "id ve displayName zorunlu" });
          return;
        }
        const preset = await enhancementService.createPreset(data);
        successResponse(response, { preset }, 201);
      } catch (error) {
        errorResponse(response, error, "createEnhancementPreset");
      }
    });
  });

export const updateEnhancementPreset = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 10, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "PUT" && request.method !== "PATCH") {
          response.status(405).json({ success: false, error: "Use PUT or PATCH" });
          return;
        }
        const id = request.query.id as string;
        if (!id) {
          response.status(400).json({ success: false, error: "id query param zorunlu" });
          return;
        }
        await enhancementService.updatePreset(id, request.body);
        successResponse(response, { message: "Güncellendi" });
      } catch (error) {
        errorResponse(response, error, "updateEnhancementPreset");
      }
    });
  });

export const deleteEnhancementPreset = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 10, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "DELETE") {
          response.status(405).json({ success: false, error: "Use DELETE" });
          return;
        }
        const id = request.query.id as string;
        if (!id) {
          response.status(400).json({ success: false, error: "id query param zorunlu" });
          return;
        }
        await enhancementService.deletePreset(id);
        successResponse(response, { message: "Silindi" });
      } catch (error) {
        errorResponse(response, error, "deleteEnhancementPreset");
      }
    });
  });

export const seedEnhancementPresets = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 30, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }
        const result = await enhancementService.seedPresets();
        successResponse(response, result);
      } catch (error) {
        errorResponse(response, error, "seedEnhancementPresets");
      }
    });
  });

// ==========================================
// Style Endpoints (Faz 3)
// ==========================================

export const listEnhancementStyles = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 10, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const activeOnly = request.query.activeOnly === "true";
        const styles = await enhancementService.listStyles(activeOnly);
        successResponse(response, { styles, count: styles.length });
      } catch (error) {
        errorResponse(response, error, "listEnhancementStyles");
      }
    });
  });

export const seedEnhancementStyles = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 30, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }
        const result = await enhancementService.seedStyles();
        successResponse(response, result);
      } catch (error) {
        errorResponse(response, error, "seedEnhancementStyles");
      }
    });
  });

// ==========================================
// Job Endpoints
// ==========================================

export const listEnhancementJobs = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 10, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const limit = parseInt(request.query.limit as string) || 50;
        const jobs = await enhancementService.listJobs(limit);
        successResponse(response, { jobs, count: jobs.length });
      } catch (error) {
        errorResponse(response, error, "listEnhancementJobs");
      }
    });
  });

export const createEnhancementJob = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 10, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }
        const { originalImageUrl, originalStoragePath } = request.body;
        if (!originalImageUrl || !originalStoragePath) {
          response.status(400).json({ success: false, error: "originalImageUrl ve originalStoragePath zorunlu" });
          return;
        }
        const job = await enhancementService.createJob({ originalImageUrl, originalStoragePath });
        successResponse(response, { job }, 201);
      } catch (error) {
        errorResponse(response, error, "createEnhancementJob");
      }
    });
  });

export const getEnhancementJob = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 10, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const id = request.query.id as string;
        if (!id) {
          response.status(400).json({ success: false, error: "id query param zorunlu" });
          return;
        }
        const job = await enhancementService.getJob(id);
        if (!job) {
          response.status(404).json({ success: false, error: "Job bulunamadı" });
          return;
        }
        successResponse(response, { job });
      } catch (error) {
        errorResponse(response, error, "getEnhancementJob");
      }
    });
  });

/**
 * AI Fotoğraf Analizi endpoint
 * Gemini ile yüklenen fotoğrafı analiz et (Semantic Anchoring)
 */
export const analyzePhoto = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 60, memory: "512MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const { jobId, imageBase64, mimeType } = request.body;
        if (!jobId || !imageBase64) {
          response.status(400).json({ success: false, error: "jobId ve imageBase64 zorunlu" });
          return;
        }

        // Base64 boyut kontrolü (~8MB limit)
        const base64SizeBytes = (imageBase64.length * 3) / 4;
        if (base64SizeBytes > 8 * 1024 * 1024) {
          response.status(400).json({ success: false, error: "Görsel 8MB'dan büyük olamaz" });
          return;
        }

        // Job'u analyzing durumuna geçir
        await enhancementService.updateJob(jobId, { status: "analyzing" });

        // Gemini model'ini system settings'ten oku
        const config = await getConfig();
        const systemSettings = await getSystemSettings();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const analysisModel = (systemSettings as any)?.analysisModel || "gemini-2.0-flash";

        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
        const model = genAI.getGenerativeModel({ model: analysisModel });

        // Aktif preset ID'lerini al (prompt'a dinamik olarak ekle)
        const activePresets = await enhancementService.listPresets(true);
        const presetIds = activePresets.map(p => p.id);

        const result = await model.generateContent([
          {
            inlineData: {
              mimeType: mimeType || "image/jpeg",
              data: imageBase64,
            },
          },
          { text: enhancementService.buildAnalysisPrompt(presetIds) },
        ]);

        const text = result.response.text();
        const analysis = enhancementService.parseAnalysisResult(text);

        if (!analysis) {
          await enhancementService.updateJob(jobId, {
            status: "failed",
            error: "AI analiz sonucu parse edilemedi",
          });
          response.status(500).json({ success: false, error: "Analiz başarısız" });
          return;
        }

        // Job'u güncelle
        await enhancementService.updateJob(jobId, {
          status: "pending",
          analysis,
        });

        successResponse(response, { analysis });
      } catch (error) {
        errorResponse(response, error, "analyzePhoto");
      }
    });
  });

/**
 * Fotoğraf İyileştirme endpoint (Faz 2)
 * Arka plan kaldırma + yeni arka plan + gölge + ışık düzeltme — tek Gemini çağrısı
 */
export const enhancePhoto = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 120, memory: "1GB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const { jobId, presetId, styleId, mode } = request.body as {
          jobId: string;
          presetId?: string;
          styleId?: string;
          mode?: "full" | "enhance-only";
        };
        const enhanceMode = mode || "full";

        if (!jobId) {
          response.status(400).json({ success: false, error: "jobId zorunlu" });
          return;
        }
        if (enhanceMode === "full" && !presetId) {
          response.status(400).json({ success: false, error: "full modda presetId zorunlu" });
          return;
        }

        // Job, preset ve stil'i al
        const job = await enhancementService.getJob(jobId);
        if (!job) {
          response.status(404).json({ success: false, error: "Job bulunamadı" });
          return;
        }

        const preset = presetId ? await enhancementService.getPreset(presetId) : null;
        if (enhanceMode === "full" && !preset) {
          response.status(404).json({ success: false, error: "Preset bulunamadı" });
          return;
        }

        const style = styleId ? await enhancementService.getStyle(styleId) : null;

        // Job'u processing durumuna geçir
        await enhancementService.updateJob(jobId, {
          status: "processing",
          selectedPresetId: presetId || undefined,
          selectedStyleId: styleId || undefined,
          enhancementMode: enhanceMode,
        });

        // Orijinal görseli indir ve base64'e çevir
        const imageResponse = await fetch(job.originalImageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Görsel indirilemedi: ${imageResponse.status}`);
        }
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const imageBase64 = imageBuffer.toString("base64");
        const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

        // Enhancement prompt oluştur
        const prompt = enhancementService.buildEnhancementPrompt(preset, style, job.analysis, enhanceMode);

        // Gemini ile enhancement
        const config = await getConfig();
        const systemSettings = await getSystemSettings();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const imageModel = (systemSettings as any)?.imageModel || "gemini-3.1-flash-image-preview";

        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
        const model = genAI.getGenerativeModel({
          model: imageModel,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          } as any,
        });

        console.log(`[enhancePhoto] Generating with model: ${imageModel}, preset: ${presetId}`);

        const result = await model.generateContent([
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          { text: prompt },
        ]);

        // Sonuçtan görseli çıkar
        const parts = result.response.candidates?.[0]?.content?.parts;
        if (!parts) {
          await enhancementService.updateJob(jobId, {
            status: "failed",
            error: "Gemini yanıt vermedi veya bloklandı",
          });
          response.status(500).json({ success: false, error: "Enhancement başarısız — yanıt yok" });
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
        if (!imagePart || !imagePart.inlineData) {
          // Blok nedeni kontrol et
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const textPart = parts.find((p: any) => p.text);
          const blockReason = textPart?.text || "Görsel üretilemedi";
          await enhancementService.updateJob(jobId, {
            status: "failed",
            error: `Enhancement bloklandı: ${blockReason.substring(0, 200)}`,
          });
          response.status(500).json({ success: false, error: blockReason.substring(0, 200) });
          return;
        }

        // Enhanced görseli Storage'a kaydet
        const { getStorage } = await import("firebase-admin/storage");
        const bucket = getStorage().bucket();
        const enhancedPath = `enhanced-photos/${jobId}_${presetId}.png`;
        const file = bucket.file(enhancedPath);

        const enhancedBuffer = Buffer.from(imagePart.inlineData.data, "base64");
        await file.save(enhancedBuffer, {
          metadata: { contentType: imagePart.inlineData.mimeType || "image/png" },
        });

        // Public URL oluştur
        await file.makePublic();
        const enhancedUrl = `https://storage.googleapis.com/${bucket.name}/${enhancedPath}`;

        // Job'u tamamla
        await enhancementService.updateJob(jobId, {
          status: "completed",
          enhancedImageUrl: enhancedUrl,
        });

        console.log(`[enhancePhoto] Completed: ${jobId}, preset: ${presetId}`);

        successResponse(response, {
          enhancedImageUrl: enhancedUrl,
          jobId,
          presetId,
        });
      } catch (error) {
        // Job'u failed yap
        const { jobId } = request.body || {};
        if (jobId) {
          await enhancementService.updateJob(jobId, {
            status: "failed",
            error: error instanceof Error ? error.message : "Bilinmeyen hata",
          }).catch(() => {}); // Sessizce geç
        }
        errorResponse(response, error, "enhancePhoto");
      }
    });
  });

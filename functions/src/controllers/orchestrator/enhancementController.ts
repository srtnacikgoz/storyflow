/**
 * Enhancement Controller
 * Fotoğraf iyileştirme preset CRUD + job yönetimi + AI analiz endpoint'leri
 */

import { createHttpFunction, errorResponse, successResponse, getConfig } from "./shared";
import { getSystemSettings } from "../../services/configService";
import { EnhancementService } from "../../services/enhancementService";

const enhancementService = new EnhancementService();

// ==========================================
// Preset Endpoints
// ==========================================

export const listEnhancementPresets = createHttpFunction(async (req, res) => {
  const activeOnly = req.query.activeOnly === "true";
  const presets = await enhancementService.listPresets(activeOnly);
  successResponse(res, { presets, count: presets.length });
}, { timeoutSeconds: 10 });

export const createEnhancementPreset = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }
  const data = req.body;
  if (!data.id || !data.displayName) {
    res.status(400).json({ success: false, error: "id ve displayName zorunlu" });
    return;
  }
  const preset = await enhancementService.createPreset(data);
  successResponse(res, { preset }, 201);
}, { timeoutSeconds: 10 });

export const updateEnhancementPreset = createHttpFunction(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({ success: false, error: "Use PUT or PATCH" });
    return;
  }
  const id = req.query.id as string;
  if (!id) {
    res.status(400).json({ success: false, error: "id query param zorunlu" });
    return;
  }
  await enhancementService.updatePreset(id, req.body);
  successResponse(res, { message: "Güncellendi" });
}, { timeoutSeconds: 10 });

export const deleteEnhancementPreset = createHttpFunction(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({ success: false, error: "Use DELETE" });
    return;
  }
  const id = req.query.id as string;
  if (!id) {
    res.status(400).json({ success: false, error: "id query param zorunlu" });
    return;
  }
  await enhancementService.deletePreset(id);
  successResponse(res, { message: "Silindi" });
}, { timeoutSeconds: 10 });

export const seedEnhancementPresets = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }
  const result = await enhancementService.seedPresets();
  successResponse(res, result);
}, { timeoutSeconds: 30 });

// ==========================================
// Style Endpoints (Faz 3)
// ==========================================

export const listEnhancementStyles = createHttpFunction(async (req, res) => {
  const activeOnly = req.query.activeOnly === "true";
  const styles = await enhancementService.listStyles(activeOnly);
  successResponse(res, { styles, count: styles.length });
}, { timeoutSeconds: 10 });

export const seedEnhancementStyles = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }
  const result = await enhancementService.seedStyles();
  successResponse(res, result);
}, { timeoutSeconds: 30 });

// ==========================================
// Job Endpoints
// ==========================================

export const listEnhancementJobs = createHttpFunction(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const jobs = await enhancementService.listJobs(limit);
  successResponse(res, { jobs, count: jobs.length });
}, { timeoutSeconds: 10 });

export const createEnhancementJob = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }
  const { originalImageUrl, originalStoragePath } = req.body;
  if (!originalImageUrl || !originalStoragePath) {
    res.status(400).json({ success: false, error: "originalImageUrl ve originalStoragePath zorunlu" });
    return;
  }
  const job = await enhancementService.createJob({ originalImageUrl, originalStoragePath });
  successResponse(res, { job }, 201);
}, { timeoutSeconds: 10 });

export const getEnhancementJob = createHttpFunction(async (req, res) => {
  const id = req.query.id as string;
  if (!id) {
    res.status(400).json({ success: false, error: "id query param zorunlu" });
    return;
  }
  const job = await enhancementService.getJob(id);
  if (!job) {
    res.status(404).json({ success: false, error: "Job bulunamadı" });
    return;
  }
  successResponse(res, { job });
}, { timeoutSeconds: 10 });

/**
 * AI Fotoğraf Analizi endpoint
 * Gemini ile yüklenen fotoğrafı analiz et (Semantic Anchoring)
 */
export const analyzePhoto = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { jobId, imageBase64, mimeType } = req.body;
  if (!jobId || !imageBase64) {
    res.status(400).json({ success: false, error: "jobId ve imageBase64 zorunlu" });
    return;
  }

  // Base64 boyut kontrolü (~8MB limit)
  const base64SizeBytes = (imageBase64.length * 3) / 4;
  if (base64SizeBytes > 8 * 1024 * 1024) {
    res.status(400).json({ success: false, error: "Görsel 8MB'dan büyük olamaz" });
    return;
  }

  // Job'u analyzing durumuna geçir
  await enhancementService.updateJob(jobId, { status: "analyzing" });

  // Gemini model'ini system settings'ten oku
  const config = await getConfig();
  const systemSettings = await getSystemSettings();
  const analysisModel = systemSettings?.analysisModel;
  if (!analysisModel) {
    res.status(400).json({ success: false, error: "Enhancement analiz modeli tanımlı değil (Ayarlar > AI Model Seçimi)" });
    return;
  }

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
    res.status(500).json({ success: false, error: "Analiz başarısız" });
    return;
  }

  // Job'u güncelle
  await enhancementService.updateJob(jobId, {
    status: "pending",
    analysis,
  });

  successResponse(res, { analysis });
}, { timeoutSeconds: 60, memory: "512MiB" });

/**
 * Fotoğraf İyileştirme endpoint (Faz 2)
 * Arka plan kaldırma + yeni arka plan + gölge + ışık düzeltme — tek Gemini çağrısı
 */
export const enhancePhoto = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { jobId, presetId, styleId, mode } = req.body as {
    jobId: string;
    presetId?: string;
    styleId?: string;
    mode?: "full" | "enhance-only";
  };
  const enhanceMode = mode || "full";

  if (!jobId) {
    res.status(400).json({ success: false, error: "jobId zorunlu" });
    return;
  }
  if (enhanceMode === "full" && !presetId) {
    res.status(400).json({ success: false, error: "full modda presetId zorunlu" });
    return;
  }

  // Job, preset ve stil'i al
  const job = await enhancementService.getJob(jobId);
  if (!job) {
    res.status(404).json({ success: false, error: "Job bulunamadı" });
    return;
  }

  const preset = presetId ? await enhancementService.getPreset(presetId) : null;
  if (enhanceMode === "full" && !preset) {
    res.status(404).json({ success: false, error: "Preset bulunamadı" });
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

  // Referans görseli varsa indir
  let referenceBase64: string | null = null;
  let referenceMimeType = "image/jpeg";
  if (preset?.referenceImageUrl) {
    try {
      const refResponse = await fetch(preset.referenceImageUrl);
      if (refResponse.ok) {
        const refBuffer = Buffer.from(await refResponse.arrayBuffer());
        referenceBase64 = refBuffer.toString("base64");
        referenceMimeType = refResponse.headers.get("content-type") || "image/jpeg";
        console.log(`[enhancePhoto] Referans görseli yüklendi: ${preset.id}`);
      }
    } catch (refErr) {
      console.warn(`[enhancePhoto] Referans görseli indirilemedi, prompt-only devam ediyor:`, refErr);
    }
  }

  // Gemini ile enhancement
  const config = await getConfig();
  const enhanceSettings = await getSystemSettings();
  const imageModel = enhanceSettings?.imageModel;
  if (!imageModel) {
    res.status(400).json({ success: false, error: "Görsel üretim modeli tanımlı değil (Ayarlar > AI Model Seçimi)" });
    return;
  }

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  const model = genAI.getGenerativeModel({
    model: imageModel,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    } as any,
  });

  console.log(`[enhancePhoto] Generating with model: ${imageModel}, preset: ${presetId}, hasRef: ${!!referenceBase64}`);

  // Content array: orijinal görsel + (opsiyonel) referans görsel + prompt
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentParts: any[] = [
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ];

  if (referenceBase64) {
    contentParts.push({
      inlineData: {
        mimeType: referenceMimeType,
        data: referenceBase64,
      },
    });
  }

  contentParts.push({ text: prompt });

  const result = await model.generateContent(contentParts);

  // Sonuçtan görseli çıkar
  const parts = result.response.candidates?.[0]?.content?.parts;
  if (!parts) {
    await enhancementService.updateJob(jobId, {
      status: "failed",
      error: "Gemini yanıt vermedi veya bloklandı",
    });
    res.status(500).json({ success: false, error: "Enhancement başarısız — yanıt yok" });
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
    res.status(500).json({ success: false, error: blockReason.substring(0, 200) });
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

  successResponse(res, {
    enhancedImageUrl: enhancedUrl,
    jobId,
    presetId,
  });
}, { timeoutSeconds: 120, memory: "1GiB" });

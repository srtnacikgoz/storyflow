/**
 * Upscale Controller
 * Sharp.js ile görsel boyutlandırma, format dönüşümü ve kalite artırma
 */

import { createHttpFunction, successResponse } from "./shared";
import { EnhancementService } from "../../services/enhancementService";

const enhancementService = new EnhancementService();

/**
 * Mevcut upscale seçeneklerini listele
 */
export const listUpscaleOptions = createHttpFunction(async (request, response) => {
  successResponse(response, {
    options: EnhancementService.UPSCALE_OPTIONS,
    count: EnhancementService.UPSCALE_OPTIONS.length,
  });
}, { timeoutSeconds: 10 });

/**
 * Görseli upscale et
 * Input: jobId + optionId (veya imageUrl + optionId)
 * Output: upscale edilmiş görsel URL
 */
export const upscaleImage = createHttpFunction(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { jobId, imageUrl, optionId } = request.body as {
    jobId?: string;
    imageUrl?: string;
    optionId: string;
  };

  if (!optionId) {
    response.status(400).json({ success: false, error: "optionId zorunlu" });
    return;
  }

  // Upscale option'ı bul
  const option = EnhancementService.UPSCALE_OPTIONS.find(o => o.id === optionId);
  if (!option) {
    response.status(404).json({
      success: false,
      error: `Geçersiz optionId: ${optionId}. Seçenekler: ${EnhancementService.UPSCALE_OPTIONS.map(o => o.id).join(", ")}`,
    });
    return;
  }

  // Kaynak görseli belirle
  let sourceUrl: string;
  if (jobId) {
    const job = await enhancementService.getJob(jobId);
    if (!job) {
      response.status(404).json({ success: false, error: "Job bulunamadı" });
      return;
    }
    // Önce enhanced, yoksa orijinal
    sourceUrl = job.enhancedImageUrl || job.originalImageUrl;
  } else if (imageUrl) {
    sourceUrl = imageUrl;
  } else {
    response.status(400).json({ success: false, error: "jobId veya imageUrl zorunlu" });
    return;
  }

  console.log(`[upscaleImage] Source: ${sourceUrl.substring(0, 80)}..., option: ${optionId}`);

  // Görseli indir
  const imageResponse = await fetch(sourceUrl);
  if (!imageResponse.ok) {
    throw new Error(`Görsel indirilemedi: ${imageResponse.status}`);
  }
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  // Upscale
  const result = await enhancementService.upscaleImage(imageBuffer, option);

  // Storage'a kaydet
  const { getStorage } = await import("firebase-admin/storage");
  const bucket = getStorage().bucket();
  const fileName = jobId
    ? `upscaled/${jobId}_${optionId}.${result.format}`
    : `upscaled/${Date.now()}_${optionId}.${result.format}`;
  const file = bucket.file(fileName);

  await file.save(result.buffer, {
    metadata: { contentType: `image/${result.format}` },
  });

  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

  console.log(`[upscaleImage] Done: ${result.width}x${result.height}, ${(result.buffer.length / 1024).toFixed(0)}KB`);

  successResponse(response, {
    url: publicUrl,
    storagePath: fileName,
    width: result.width,
    height: result.height,
    format: result.format,
    sizeBytes: result.buffer.length,
  });
}, { timeoutSeconds: 120, memory: "1GiB" });

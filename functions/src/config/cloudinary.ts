/**
 * Cloudinary Configuration
 * Firebase Secrets Manager entegrasyonu ile güvenli credential yönetimi
 *
 * Kullanım:
 * 1. Secrets'ları ayarla:
 *    firebase functions:secrets:set CLOUDINARY_CLOUD_NAME
 *    firebase functions:secrets:set CLOUDINARY_API_KEY
 *    firebase functions:secrets:set CLOUDINARY_API_SECRET
 *
 * 2. Fonksiyonlarda kullan:
 *    import { initCloudinary, cloudinarySecrets } from "./config/cloudinary";
 *    export const myFunction = onRequest({ secrets: cloudinarySecrets }, ...);
 */

import { defineSecret } from "firebase-functions/params";
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

// Firebase Secrets tanımları
export const cloudinaryCloudName = defineSecret("CLOUDINARY_CLOUD_NAME");
export const cloudinaryApiKey = defineSecret("CLOUDINARY_API_KEY");
export const cloudinaryApiSecret = defineSecret("CLOUDINARY_API_SECRET");

// Tüm Cloudinary secrets'larını export et (fonksiyonlarda { secrets: cloudinarySecrets } için)
export const cloudinarySecrets = [
  cloudinaryCloudName,
  cloudinaryApiKey,
  cloudinaryApiSecret,
];

/**
 * Cloudinary SDK'yı başlat
 * Runtime'da secrets'ların value()'larına erişir
 *
 * @returns Configured Cloudinary instance
 */
export function initCloudinary(): typeof cloudinary {
  cloudinary.config({
    cloud_name: cloudinaryCloudName.value(),
    api_key: cloudinaryApiKey.value(),
    api_secret: cloudinaryApiSecret.value(),
    secure: true,
  });
  return cloudinary;
}

/**
 * Asset kategorisine göre Cloudinary folder path oluştur
 * Format: storyflow/assets/{category}/{timestamp}_{sanitizedFilename}
 */
export function generateCloudinaryPublicId(
  category: string,
  subType: string,
  filename: string
): string {
  const sanitized = sanitizeFilename(filename);
  const timestamp = Date.now();
  return `storyflow/assets/${category}/${subType}/${timestamp}_${sanitized}`;
}

/**
 * Dosya adını Cloudinary için sanitize et
 * Türkçe karakterleri ve özel karakterleri kaldırır
 */
export function sanitizeFilename(filename: string): string {
  // Uzantıyı ayır
  const lastDot = filename.lastIndexOf(".");
  const name = lastDot > 0 ? filename.substring(0, lastDot) : filename;

  // Türkçe karakterleri dönüştür
  const turkishChars: Record<string, string> = {
    ç: "c", Ç: "C",
    ğ: "g", Ğ: "G",
    ı: "i", İ: "I",
    ö: "o", Ö: "O",
    ş: "s", Ş: "S",
    ü: "u", Ü: "U",
  };

  let sanitized = name;
  for (const [turkish, latin] of Object.entries(turkishChars)) {
    sanitized = sanitized.replace(new RegExp(turkish, "g"), latin);
  }

  // Alfanumerik olmayan karakterleri tire ile değiştir
  sanitized = sanitized
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return sanitized || "unnamed";
}

/**
 * Cloudinary upload sonucu tipi
 */
export interface CloudinaryUploadResult {
  success: boolean;
  publicId?: string;
  url?: string;
  version?: number;
  error?: string;
}

/**
 * Base64 görsel verisini Cloudinary'ye yükle
 *
 * @param base64Data - Base64 encoded görsel (data:image/... prefix'i olmadan)
 * @param publicId - Cloudinary public ID
 * @param mimeType - MIME type (default: image/jpeg)
 */
export async function uploadBase64ToCloudinary(
  base64Data: string,
  publicId: string,
  mimeType: string = "image/jpeg"
): Promise<CloudinaryUploadResult> {
  const cld = initCloudinary();

  try {
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    const result = await cld.uploader.upload(dataUri, {
      public_id: publicId,
      resource_type: "image",
      overwrite: true,
      // On-the-fly transformation için eager kullanmıyoruz
      // İlk erişimde CDN cache'leyecek
    });

    return {
      success: true,
      publicId: result.public_id,
      url: result.secure_url,
      version: result.version,
    };
  } catch (error) {
    const uploadError = error as UploadApiErrorResponse;
    console.error("[Cloudinary] Upload error:", uploadError);
    return {
      success: false,
      error: uploadError.message || "Upload failed",
    };
  }
}

/**
 * URL'den Cloudinary'ye yükle (Migration için)
 * Base64 dönüşümü YAPMIYOR - direkt URL transfer
 *
 * @param sourceUrl - Kaynak URL (Firebase Storage download URL)
 * @param publicId - Cloudinary public ID
 */
export async function uploadUrlToCloudinary(
  sourceUrl: string,
  publicId: string
): Promise<CloudinaryUploadResult> {
  const cld = initCloudinary();

  try {
    const result = await cld.uploader.upload(sourceUrl, {
      public_id: publicId,
      resource_type: "image",
      overwrite: true,
      // On-the-fly transformation - eager değil
    });

    return {
      success: true,
      publicId: result.public_id,
      url: result.secure_url,
      version: result.version,
    };
  } catch (error) {
    const uploadError = error as UploadApiErrorResponse;
    console.error("[Cloudinary] URL upload error:", uploadError);
    return {
      success: false,
      error: uploadError.message || "URL upload failed",
    };
  }
}

/**
 * Retry wrapper with exponential backoff
 * 429 (Rate Limit) hatalarında otomatik yeniden dener
 *
 * @param fn - Yürütülecek async fonksiyon
 * @param maxRetries - Maksimum deneme sayısı (default: 3)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const httpCode = (error as { http_code?: number }).http_code;

      // Rate limit (429) veya geçici hata (5xx) için retry
      if (httpCode === 429 || (httpCode && httpCode >= 500)) {
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`[Cloudinary] Rate limited, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
          await sleep(delay);
          continue;
        }
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cloudinary URL'den optimized variant oluştur
 * On-the-fly transformation kullanır
 *
 * @param publicId - Cloudinary public ID
 * @param width - İstenilen genişlik
 * @param quality - Kalite (auto, auto:good, auto:best, 1-100)
 */
export function getOptimizedUrl(
  publicId: string,
  width?: number,
  quality: string = "auto:good"
): string {
  const cloudName = cloudinaryCloudName.value();
  const transformations: string[] = [];

  if (width) {
    transformations.push(`w_${width}`);
  }
  transformations.push(`q_${quality}`);
  transformations.push("f_auto"); // Format auto-negotiation

  const transformStr = transformations.join(",");

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}/${publicId}`;
}

/**
 * Cloudinary URL'i public ID'ye dönüştür
 */
export function extractPublicIdFromUrl(url: string): string | null {
  // Format: https://res.cloudinary.com/{cloud}/image/upload/{transformations}/{public_id}
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i);
  return match ? match[1] : null;
}

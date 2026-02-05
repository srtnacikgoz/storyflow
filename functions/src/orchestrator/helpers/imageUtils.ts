/**
 * Image Utilities
 * Görsel yükleme ve kaydetme işlemleri
 */

import { getStorage } from "firebase-admin/storage";
import { isCloudinaryEnabled } from "../../services/configService";
import { Asset } from "../types";

type StorageInstance = ReturnType<typeof getStorage>;

/**
 * URL'den görsel indir ve base64'e çevir
 * HTTP/HTTPS URL'leri için fetch, gs:// için Admin SDK kullanır
 */
export async function loadImageFromUrl(
  url: string,
  storage: StorageInstance
): Promise<string> {
  console.log(`[ImageUtils] Loading image from URL: ${url.substring(0, 80)}...`);

  try {
    // HTTP/HTTPS URL ise doğrudan fetch ile indir
    // (Firebase download URL ve Cloudinary URL'leri dahil)
    if (url.startsWith("http://") || url.startsWith("https://")) {
      console.log(`[ImageUtils] Using fetch to download from URL`);

      // 30 saniye timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let buffer: Buffer;
      try {
        console.log(`[ImageUtils] Starting fetch request...`);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        console.log(`[ImageUtils] Fetch response received: ${response.status}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log(`[ImageUtils] Reading response body...`);
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        console.log(`[ImageUtils] Image downloaded successfully, size: ${buffer.length} bytes`);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          throw new Error("Fetch timeout after 30 seconds");
        }
        throw fetchError;
      }

      const base64 = buffer.toString("base64");
      console.log(`[ImageUtils] Image converted to base64, length: ${base64.length}`);
      return base64;
    }

    // gs:// formatı için Admin SDK kullan
    const bucket = storage.bucket();
    let filePath: string;

    if (url.startsWith("gs://")) {
      filePath = url.replace(`gs://${bucket.name}/`, "");
    } else {
      filePath = url;
    }

    console.log(`[ImageUtils] Using Admin SDK for path: ${filePath}`);
    const file = bucket.file(filePath);
    const [buffer] = await file.download();
    console.log(`[ImageUtils] Image downloaded successfully, size: ${buffer.length} bytes`);

    const base64 = buffer.toString("base64");
    return base64;
  } catch (downloadError) {
    console.error(`[ImageUtils] Image download failed:`, downloadError);
    throw new Error(`Failed to download image: ${downloadError instanceof Error ? downloadError.message : "Unknown error"}`);
  }
}

/**
 * Base64 görseli Storage'a kaydet
 * @returns gs:// formatında storage URL
 */
export async function saveImageToStorage(
  imageBase64: string,
  mimeType: string,
  storage: StorageInstance
): Promise<string> {
  const bucket = storage.bucket();
  // Doğru extension belirle
  const ext = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/gif" ? "gif" : "png";
  const filename = `generated/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  const file = bucket.file(filename);

  const buffer = Buffer.from(imageBase64, "base64");
  await file.save(buffer, {
    metadata: { contentType: mimeType },
    public: true, // Dosyayı public yap (frontend erişimi için)
  });

  console.log(`[ImageUtils] Image saved to storage: ${filename}`);
  // gs:// formatında döndür (Telegram akışı bunu bekliyor)
  return `gs://${bucket.name}/${filename}`;
}

/**
 * Asset veya URL'den görsel yükle ve base64'e çevir
 *
 * Cloudinary URL önceliği:
 * 1. Cloudinary URL varsa ve feature flag aktifse → Cloudinary kullan
 * 2. Firebase Storage URL varsa → Firebase'den indir (fallback)
 *
 * Rule Engine ScoredAsset formatını da destekler (originalData içindeki URL'lere bakabilir)
 */
export async function loadImageAsBase64(
  urlOrAsset: string | Asset,
  storage: StorageInstance
): Promise<string> {
  // Asset objesi ise Cloudinary'yi kontrol et
  if (typeof urlOrAsset !== "string") {
    const asset = urlOrAsset as any; // Rule Engine ScoredAsset formatı için any

    // Rule Engine ScoredAsset formatında URL'ler originalData içinde olabilir
    // Önce üst seviyeye bak, yoksa originalData'ya bak
    const cloudinaryUrl = asset.cloudinaryUrl || asset.originalData?.cloudinaryUrl;
    const storageUrl = asset.storageUrl || asset.originalData?.storageUrl;
    const publicId = asset.cloudinaryPublicId || asset.originalData?.cloudinaryPublicId;

    // Feature flag kontrolü - Cloudinary aktif mi?
    const cloudinaryEnabled = await isCloudinaryEnabled();

    // Cloudinary URL varsa ve feature flag aktifse Cloudinary'den yükle
    if (cloudinaryEnabled && cloudinaryUrl) {
      console.log(`[ImageUtils] Loading from Cloudinary (enabled): ${publicId}`);
      return loadImageFromUrl(cloudinaryUrl, storage);
    }

    // Cloudinary devre dışı veya URL yok - Firebase Storage kullan
    if (storageUrl) {
      const reason = !cloudinaryEnabled ? "feature flag disabled" : "no Cloudinary URL";
      console.log(`[ImageUtils] Loading from Firebase Storage (${reason}): ${asset.filename}`);
      return loadImageFromUrl(storageUrl, storage);
    }

    throw new Error(`Asset has no valid URL: ${asset.id}`);
  }

  // String URL ise doğrudan yükle (geriye uyumluluk)
  return loadImageFromUrl(urlOrAsset, storage);
}

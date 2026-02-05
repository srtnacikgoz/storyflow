/**
 * Reference Image Builder
 * Referans görsel hazırlama işlemleri
 */

import { Asset, AssetSelection } from "../types";
import { loadImageFromUrl } from "./imageUtils";
import { getStorage } from "firebase-admin/storage";
import { isCloudinaryEnabled } from "../../services/configService";

type StorageInstance = ReturnType<typeof getStorage>;

export interface ReferenceImage {
  base64: string;
  mimeType: string;
  label: string;
  description?: string;
}

/**
 * Asset'ten görsel URL'ini al
 * Cloudinary öncelikli, yoksa Firebase Storage
 */
async function getAssetImageUrl(asset: Asset): Promise<string | null> {
  const cloudinaryEnabled = await isCloudinaryEnabled();

  if (cloudinaryEnabled && asset.cloudinaryUrl) {
    return asset.cloudinaryUrl;
  }

  // storageUrl varsa kullan
  if (asset.storageUrl) {
    return asset.storageUrl;
  }

  return null;
}

/**
 * Tek bir asset'i base64'e çevir
 */
export async function loadAssetAsBase64(
  asset: Asset,
  storage: StorageInstance
): Promise<string> {
  const url = await getAssetImageUrl(asset);

  if (!url) {
    throw new Error(`Asset için URL bulunamadı: ${asset.id} (${asset.filename})`);
  }

  return loadImageFromUrl(url, storage);
}

/**
 * Asset'ten referans görsel bilgisi oluştur
 */
function buildAssetDescription(asset: Asset, type: string): string | undefined {
  const visualProps = asset.visualProperties;

  if (!visualProps) return undefined;

  const parts: string[] = [];

  if (visualProps.dominantColors?.length) {
    parts.push(visualProps.dominantColors.join(", "));
  }

  if (visualProps.material) {
    parts.push(visualProps.material);
  }

  if (visualProps.style) {
    parts.push(visualProps.style);
  }

  return parts.length > 0 ? parts.join(" ").trim() : undefined;
}

/**
 * AssetSelection'dan tüm referans görselleri yükle
 * Tekrarlanan 5 kod bloğunun tek noktadan yönetimi
 */
export async function buildReferenceImages(
  assetSelection: AssetSelection,
  storage: StorageInstance
): Promise<ReferenceImage[]> {
  const referenceImages: ReferenceImage[] = [];

  // Plate
  if (assetSelection.plate) {
    try {
      console.log(`[ReferenceBuilder] Loading plate: ${assetSelection.plate.filename}`);
      const base64 = await loadAssetAsBase64(assetSelection.plate, storage);
      referenceImages.push({
        base64,
        mimeType: "image/png",
        label: "plate",
        description: buildAssetDescription(assetSelection.plate, "plate"),
      });
    } catch (error) {
      console.error(`[ReferenceBuilder] Failed to load plate:`, error);
    }
  }

  // Table
  if (assetSelection.table) {
    try {
      console.log(`[ReferenceBuilder] Loading table: ${assetSelection.table.filename}`);
      const base64 = await loadAssetAsBase64(assetSelection.table, storage);
      referenceImages.push({
        base64,
        mimeType: "image/png",
        label: "table",
        description: buildAssetDescription(assetSelection.table, "table"),
      });
    } catch (error) {
      console.error(`[ReferenceBuilder] Failed to load table:`, error);
    }
  }

  // Cup
  if (assetSelection.cup) {
    try {
      console.log(`[ReferenceBuilder] Loading cup: ${assetSelection.cup.filename}`);
      const base64 = await loadAssetAsBase64(assetSelection.cup, storage);
      referenceImages.push({
        base64,
        mimeType: "image/png",
        label: "cup",
        description: buildAssetDescription(assetSelection.cup, "cup"),
      });
    } catch (error) {
      console.error(`[ReferenceBuilder] Failed to load cup:`, error);
    }
  }

  // Napkin
  if (assetSelection.napkin) {
    try {
      console.log(`[ReferenceBuilder] Loading napkin: ${assetSelection.napkin.filename}`);
      const base64 = await loadAssetAsBase64(assetSelection.napkin, storage);
      referenceImages.push({
        base64,
        mimeType: "image/png",
        label: "napkin",
        description: buildAssetDescription(assetSelection.napkin, "napkin"),
      });
    } catch (error) {
      console.error(`[ReferenceBuilder] Failed to load napkin:`, error);
    }
  }

  // Cutlery
  if (assetSelection.cutlery) {
    try {
      console.log(`[ReferenceBuilder] Loading cutlery: ${assetSelection.cutlery.filename}`);
      const base64 = await loadAssetAsBase64(assetSelection.cutlery, storage);
      referenceImages.push({
        base64,
        mimeType: "image/png",
        label: "cutlery",
        description: buildAssetDescription(assetSelection.cutlery, "cutlery"),
      });
    } catch (error) {
      console.error(`[ReferenceBuilder] Failed to load cutlery:`, error);
    }
  }

  console.log(`[ReferenceBuilder] Built ${referenceImages.length} reference images`);
  return referenceImages;
}

/**
 * Log için referans görsel listesi oluştur
 */
export function buildReferenceImagesList(
  assetSelection: AssetSelection
): Array<{ type: string; filename: string }> {
  const list: Array<{ type: string; filename: string }> = [];

  if (assetSelection.product) {
    list.push({ type: "product", filename: assetSelection.product.filename });
  }
  if (assetSelection.plate) {
    list.push({ type: "plate", filename: assetSelection.plate.filename });
  }
  if (assetSelection.table) {
    list.push({ type: "table", filename: assetSelection.table.filename });
  }
  if (assetSelection.cup) {
    list.push({ type: "cup", filename: assetSelection.cup.filename });
  }
  if (assetSelection.napkin) {
    list.push({ type: "napkin", filename: assetSelection.napkin.filename });
  }
  if (assetSelection.cutlery) {
    list.push({ type: "cutlery", filename: assetSelection.cutlery.filename });
  }

  return list;
}

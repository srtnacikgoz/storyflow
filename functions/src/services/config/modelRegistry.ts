/**
 * Model Registry — Firestore'dan model listesi okuma + cache
 */

import { ModelRegistryEntry } from "../../types/modelRegistry";
import { CACHE_TTL, getDb, registerCacheClear } from "./configCache";

let modelsCache: ModelRegistryEntry[] | null = null;
let modelsCacheTimestamp = 0;

registerCacheClear(() => {
  modelsCache = null;
  modelsCacheTimestamp = 0;
});

const REGISTRY_PATH = "global/model-registry/items";

/**
 * Aktif modelleri getir
 */
export async function getModelRegistry(): Promise<ModelRegistryEntry[]> {
  const now = Date.now();
  if (modelsCache && now - modelsCacheTimestamp < CACHE_TTL) {
    return modelsCache;
  }

  const snapshot = await getDb()
    .collection(REGISTRY_PATH)
    .where("isActive", "==", true)
    .orderBy("sortOrder")
    .get();

  if (snapshot.empty) {
    return [];
  }

  modelsCache = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ModelRegistryEntry[];
  modelsCacheTimestamp = now;

  return modelsCache;
}

/**
 * Text modelleri getir (prompt yazma, analiz)
 */
export async function getTextModels(): Promise<ModelRegistryEntry[]> {
  const all = await getModelRegistry();
  return all.filter(m => m.type === "text" || m.type === "both");
}

/**
 * Image modelleri getir (görsel üretim)
 */
export async function getImageModels(): Promise<ModelRegistryEntry[]> {
  const all = await getModelRegistry();
  return all.filter(m => m.type === "image" || m.type === "both");
}

/**
 * Model ID ile getir
 */
export async function getModelById(modelId: string): Promise<ModelRegistryEntry | null> {
  const all = await getModelRegistry();
  return all.find(m => m.id === modelId) || null;
}

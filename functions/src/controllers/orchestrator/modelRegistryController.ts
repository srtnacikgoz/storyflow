/**
 * Model Registry Controller (v2)
 * Seed + listeleme endpoint'leri
 */

import { createHttpFunction, errorResponse, db } from "./shared";
import { getTextModels, getImageModels } from "../../services/config/modelRegistry";
import { clearConfigCache } from "../../services/config/configCache";

const getRegistrySeed = () => import("../../orchestrator/seed/modelRegistryData");

const REGISTRY_PATH = "global/model-registry/items";

/**
 * Model registry seed — POST /seedModelRegistry
 */
export const seedModelRegistry = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const secret = req.body?.secretKey || req.query?.secretKey;
  if (secret !== "maestro-seed-2026") {
    res.status(403).json({ success: false, error: "Unauthorized" });
    return;
  }

  const { getModelRegistrySeedData } = await getRegistrySeed();
  const models = getModelRegistrySeedData();

  // Önce tüm eski dokümanları sil
  const existing = await db.collection(REGISTRY_PATH).get();
  const deleteBatch = db.batch();
  existing.docs.forEach(doc => deleteBatch.delete(doc.ref));
  await deleteBatch.commit();

  // Yeni modelleri yaz
  const batch = db.batch();
  for (const model of models) {
    const docId = model.id.replace(/\//g, "__").replace(/[.:]/g, "_");
    batch.set(db.collection(REGISTRY_PATH).doc(docId), { ...model, docId });
  }

  await batch.commit();
  clearConfigCache();

  res.json({ success: true, message: "Model registry seeded", data: { count: models.length } });
});

/**
 * Text modellerini listele — GET /listTextModels
 */
export const listTextModels = createHttpFunction(async (req, res) => {
  const models = await getTextModels();
  res.json({ success: true, data: models });
});

/**
 * Image modellerini listele — GET /listImageModels
 */
export const listImageModels = createHttpFunction(async (req, res) => {
  const models = await getImageModels();
  res.json({ success: true, data: models });
});

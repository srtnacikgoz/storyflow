/**
 * Style Studio Controller v2
 * CRUD, AI sahne/ürün analizi, prompt birleştirme, seed
 * Tüm AI mantığı styleStudioAiService'te — controller sadece HTTP, doğrulama, Firestore
 */

import { createHttpFunction, db } from "./shared";
import { clearConfigCache } from "../../services/config/configCache";
import { buildDefaultSceneStandards, SceneStandardSeed } from "./styleStudioSeedData";
import { analyzeScene, analyzeProduct, composePrompt } from "../../services/styleStudioAiService";

const VISUAL_STANDARDS_PATH = "global/config/style-studio/standards/items";

// ─── CRUD ───────────────────────────────────────────────────────────────────

/**
 * Tüm görsel standartları listele
 * GET /listVisualStandards
 */
export const listVisualStandards = createHttpFunction(async (req, res) => {
  const snapshot = await db.collection(VISUAL_STANDARDS_PATH)
    .orderBy("createdAt", "desc")
    .get();

  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  res.json({ success: true, data });
});

/**
 * Yeni görsel standart oluştur
 * POST /createVisualStandard
 * Body: { name, ...fields }
 */
export const createVisualStandard = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { name, ...rest } = req.body || {};
  if (!name) {
    res.status(400).json({ success: false, error: "name gerekli" });
    return;
  }

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "").replace(/^-+/, "");

  // Aynı ID zaten varsa çakışma hatası
  const existing = await db.collection(VISUAL_STANDARDS_PATH).doc(id).get();
  if (existing.exists) {
    res.status(409).json({ success: false, error: "Bu ID zaten mevcut" });
    return;
  }

  const standard = {
    ...rest,
    id,
    name,
    isActive: rest.isActive ?? true,
    isDefault: rest.isDefault ?? false,
    createdAt: Date.now(),
  };

  await db.collection(VISUAL_STANDARDS_PATH).doc(id).set(standard);
  clearConfigCache();

  res.json({ success: true, data: { id }, message: "Görsel standart oluşturuldu" });
});

/**
 * Görsel standart güncelle
 * POST /updateVisualStandard
 * Body: { id, ...fields }
 */
export const updateVisualStandard = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { id, ...updates } = req.body || {};
  if (!id) {
    res.status(400).json({ success: false, error: "id gerekli" });
    return;
  }

  await db.collection(VISUAL_STANDARDS_PATH).doc(id).update({
    ...updates,
    updatedAt: Date.now(),
  });
  clearConfigCache();

  res.json({ success: true, message: "Görsel standart güncellendi" });
});

/**
 * Görsel standart sil
 * POST /deleteVisualStandard
 * Body: { id } veya ?id=...
 */
export const deleteVisualStandard = createHttpFunction(async (req, res) => {
  const id = req.body?.id || req.query.id;
  if (!id) {
    res.status(400).json({ success: false, error: "id gerekli" });
    return;
  }

  await db.collection(VISUAL_STANDARDS_PATH).doc(id as string).delete();
  clearConfigCache();

  res.json({ success: true, message: "Görsel standart silindi" });
});

// ─── AI Analiz ──────────────────────────────────────────────────────────────

/**
 * Sahne fotoğrafını analiz et
 * POST /analyzeVisualStyle
 * Body: { imageBase64, imageMimeType? }
 */
export const analyzeVisualStyle = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { imageBase64, imageMimeType } = req.body || {};
  if (!imageBase64) {
    res.status(400).json({ success: false, error: "imageBase64 gerekli" });
    return;
  }

  try {
    const analysis = await analyzeScene(imageBase64, imageMimeType || "image/jpeg");
    res.json({ success: true, data: analysis });
  } catch (err: any) {
    console.error("[analyzeScene]", err?.message);
    res.status(500).json({ success: false, error: err?.message || "Sahne analizi başarısız" });
  }
}, { timeoutSeconds: 90, memory: "512MiB" });

/**
 * Ürün fotoğrafını analiz et (YENİ)
 * POST /analyzeProductImage
 * Body: { imageBase64, imageMimeType? }
 */
export const analyzeProductImage = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { imageBase64, imageMimeType } = req.body || {};
  if (!imageBase64) {
    res.status(400).json({ success: false, error: "imageBase64 gerekli" });
    return;
  }

  try {
    const analysis = await analyzeProduct(imageBase64, imageMimeType || "image/jpeg");
    res.json({ success: true, data: analysis });
  } catch (err: any) {
    console.error("[analyzeProduct]", err?.message);
    res.status(500).json({ success: false, error: err?.message || "Ürün analizi başarısız" });
  }
}, { timeoutSeconds: 90, memory: "512MiB" });

// ─── Prompt Üretimi ─────────────────────────────────────────────────────────

/**
 * Sahne + ürün analizinden final prompt üret (generateStandardPrompt'un yerini alır)
 * POST /generateStudioPrompt
 * Body: { standardId, productAnalysis, targetModel?, productName? }
 */
export const generateStudioPrompt = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { standardId, productAnalysis, targetModel, productName } = req.body || {};
  if (!standardId || !productAnalysis) {
    res.status(400).json({ success: false, error: "standardId ve productAnalysis gerekli" });
    return;
  }

  // Standartı Firestore'dan oku
  const doc = await db.collection(VISUAL_STANDARDS_PATH).doc(standardId).get();
  if (!doc.exists) {
    res.status(404).json({ success: false, error: `Görsel standart bulunamadı: ${standardId}` });
    return;
  }

  const standard = doc.data() as any;
  const scenePrompt: string = standard.scenePrompt || standard.promptTemplate || "";

  if (!scenePrompt) {
    res.status(400).json({ success: false, error: "Bu standartta scenePrompt tanımlı değil" });
    return;
  }

  // productAnalysis hem string hem object olabilir
  const productPrompt: string = typeof productAnalysis === "string"
    ? productAnalysis
    : (productAnalysis.productPrompt as string) || JSON.stringify(productAnalysis);

  const resolvedProductName: string = productName
    || (typeof productAnalysis === "object" && productAnalysis.name)
    || "product";

  const resolvedTargetModel: string = targetModel || "gemini";

  try {
    const finalPrompt = await composePrompt(
      scenePrompt,
      productPrompt,
      resolvedTargetModel,
      resolvedProductName,
      standard.name
    );

    res.json({
      success: true,
      data: {
        finalPrompt,
        scenePrompt,
        productPrompt,
        targetModel: resolvedTargetModel,
        sceneName: standard.name,
        productName: resolvedProductName,
      },
    });
  } catch (err: any) {
    console.error("[generateStudioPrompt]", err?.message);
    res.status(500).json({ success: false, error: err?.message || "Prompt üretimi başarısız" });
  }
}, { timeoutSeconds: 90, memory: "512MiB" });

// ─── Seed ───────────────────────────────────────────────────────────────────

/**
 * Varsayılan sahne standartlarını Firestore'a yükle
 * POST /seedVisualStandards
 */
export const seedVisualStandards = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const now = Date.now();
  const defaults = buildDefaultSceneStandards(now);

  const batch = db.batch();
  for (const standard of defaults) {
    const ref = db.collection(VISUAL_STANDARDS_PATH).doc(standard.id);
    batch.set(ref, standard, { merge: true });
  }
  await batch.commit();
  clearConfigCache();

  res.json({
    success: true,
    data: { seeded: defaults.length, ids: defaults.map((s: SceneStandardSeed) => s.id) },
    message: `${defaults.length} görsel standart yüklendi`,
  });
});

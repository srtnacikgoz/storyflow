/**
 * Poster Config Controller
 * Poster stilleri, mood'lar, aspect ratio'lar — seed + listeleme endpoint'leri
 */

import { createHttpFunction, errorResponse, db } from "./shared";
import { getPosterStyles, getPosterMoods, getPosterAspectRatios, getPosterTypographies, getPosterLayouts, getPosterCameraAngles, getPosterLightingTypes, getPosterBackgrounds } from "../../services/config/posterConfig";
import { clearConfigCache } from "../../services/config/configCache";
import { learnFromFeedback, getGlobalRules, updateGlobalRules } from "../../services/posterLearningService";

// Lazy import — deploy timeout önleme
const getPosterSeed = () => import("../../orchestrator/seed/posterData");

const POSTER_CONFIG_PATH = "global/config/poster-config";
const SEED_SECRET = "maestro-seed-2026";

/**
 * Poster config seed
 * POST /seedPosterConfig
 */
export const seedPosterConfig = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  // Secret key kontrolü
  const secret = req.body?.secretKey || req.query?.secretKey;
  if (secret !== SEED_SECRET) {
    res.status(403).json({ success: false, error: "Unauthorized" });
    return;
  }

  console.log("[seedPosterConfig] Starting poster config seed...");

  const { getPosterSeedData } = await getPosterSeed();
  const seedData = getPosterSeedData();
  const batch = db.batch();

  const configRef = db.collection(POSTER_CONFIG_PATH);

  // Stiller
  for (const style of seedData.styles) {
    batch.set(
      configRef.doc("styles").collection("items").doc(style.id),
      style
    );
  }
  console.log(`[seedPosterConfig] ${seedData.styles.length} stil seed ediliyor...`);

  // Mood'lar
  for (const mood of seedData.moods) {
    batch.set(
      configRef.doc("moods").collection("items").doc(mood.id),
      mood
    );
  }
  console.log(`[seedPosterConfig] ${seedData.moods.length} mood seed ediliyor...`);

  // Aspect ratio'lar
  for (const ratio of seedData.aspectRatios) {
    batch.set(
      configRef.doc("aspect-ratios").collection("items").doc(ratio.id),
      ratio
    );
  }
  console.log(`[seedPosterConfig] ${seedData.aspectRatios.length} aspect ratio seed ediliyor...`);

  // Tipografiler
  for (const typo of seedData.typographies) {
    batch.set(
      configRef.doc("typographies").collection("items").doc(typo.id),
      typo
    );
  }
  console.log(`[seedPosterConfig] ${seedData.typographies.length} tipografi seed ediliyor...`);

  // Layout preset'leri
  for (const layout of seedData.layouts) {
    batch.set(
      configRef.doc("layouts").collection("items").doc(layout.id),
      layout
    );
  }
  console.log(`[seedPosterConfig] ${seedData.layouts.length} layout seed ediliyor...`);

  // Kamera açıları
  for (const angle of seedData.cameraAngles) {
    batch.set(
      configRef.doc("camera-angles").collection("items").doc(angle.id),
      angle
    );
  }
  console.log(`[seedPosterConfig] ${seedData.cameraAngles.length} kamera açısı seed ediliyor...`);

  // Işık tipleri
  for (const light of seedData.lightingTypes) {
    batch.set(
      configRef.doc("lighting-types").collection("items").doc(light.id),
      light
    );
  }
  console.log(`[seedPosterConfig] ${seedData.lightingTypes.length} ışık tipi seed ediliyor...`);

  // Arka planlar
  for (const bg of seedData.backgrounds) {
    batch.set(
      configRef.doc("backgrounds").collection("items").doc(bg.id),
      bg
    );
  }
  console.log(`[seedPosterConfig] ${seedData.backgrounds.length} arka plan seed ediliyor...`);

  await batch.commit();
  clearConfigCache();

  const summary = {
    styles: seedData.styles.length,
    moods: seedData.moods.length,
    aspectRatios: seedData.aspectRatios.length,
    typographies: seedData.typographies.length,
    layouts: seedData.layouts.length,
    cameraAngles: seedData.cameraAngles.length,
    lightingTypes: seedData.lightingTypes.length,
    backgrounds: seedData.backgrounds.length,
  };

  console.log("[seedPosterConfig] Seed completed:", summary);

  res.json({
    success: true,
    message: "Poster config seeded successfully",
    data: summary,
  });
});

/**
 * Poster stillerini listele
 * GET /listPosterStyles
 */
export const listPosterStyles = createHttpFunction(async (req, res) => {
  const styles = await getPosterStyles();
  res.json({ success: true, data: styles });
});

/**
 * Poster mood'larını listele
 * GET /listPosterMoods
 */
export const listPosterMoods = createHttpFunction(async (req, res) => {
  const moods = await getPosterMoods();
  res.json({ success: true, data: moods });
});

/**
 * Poster aspect ratio'larını listele
 * GET /listPosterAspectRatios
 */
export const listPosterAspectRatios = createHttpFunction(async (req, res) => {
  const ratios = await getPosterAspectRatios();
  res.json({ success: true, data: ratios });
});

/**
 * Poster tipografilerini listele
 * GET /listPosterTypographies
 */
export const listPosterTypographies = createHttpFunction(async (req, res) => {
  const data = await getPosterTypographies();
  res.json({ success: true, data });
});

/**
 * Poster layout'larını listele
 * GET /listPosterLayouts
 */
export const listPosterLayouts = createHttpFunction(async (req, res) => {
  const data = await getPosterLayouts();
  res.json({ success: true, data });
});

/**
 * Kamera açılarını listele
 * GET /listCameraAngles
 */
export const listCameraAngles = createHttpFunction(async (req, res) => {
  const data = await getPosterCameraAngles();
  res.json({ success: true, data });
});

/**
 * Işık tiplerini listele
 * GET /listLightingTypes
 */
export const listLightingTypes = createHttpFunction(async (req, res) => {
  const data = await getPosterLightingTypes();
  res.json({ success: true, data });
});

/**
 * Arka planları listele
 * GET /listBackgrounds
 */
export const listBackgrounds = createHttpFunction(async (req, res) => {
  const data = await getPosterBackgrounds();
  res.json({ success: true, data });
});

/**
 * Poster galerisi — üretilen posterler
 * GET /listPosterGallery
 */
export const listPosterGallery = createHttpFunction(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  let query = db.collection("global/posters/items")
    .orderBy("createdAt", "desc")
    .limit(limit);

  if (offset > 0) {
    query = query.offset(offset);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  res.json({ success: true, data: items, count: items.length });
});

/**
 * Poster galeri öğesi sil
 * DELETE /deletePosterGalleryItem?id=xxx
 */
export const deletePosterGalleryItem = createHttpFunction(async (req, res) => {
  const id = req.query.id as string || req.body?.id;
  if (!id) {
    res.status(400).json({ success: false, error: "id gerekli" });
    return;
  }

  await db.collection("global/posters/items").doc(id).delete();
  res.json({ success: true, message: "Poster silindi" });
});

/**
 * Poster feedback gönder
 * POST /submitPosterFeedback
 * Body: { posterId, rating, feedbackCategories?, feedbackNote? }
 */
export const submitPosterFeedback = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { posterId, rating, feedbackCategories, feedbackNote } = req.body;

  if (!posterId || !rating) {
    res.status(400).json({ success: false, error: "posterId ve rating gerekli" });
    return;
  }

  // Galeri item'ı güncelle
  const ratingNum = Math.min(5, Math.max(1, Number(rating)));
  await db.collection("global/posters/items").doc(posterId).update({
    rating: ratingNum,
    feedbackCategories: feedbackCategories || [],
    feedbackNote: feedbackNote || "",
    feedbackAt: Date.now(),
  });

  // Otomatik öğrenme: düşük puan verdiyse, aynı stilde 3+ düşük puan var mı kontrol et
  let autoLearnResult = null;
  if (ratingNum <= 2) {
    try {
      // Bu poster'ın stilini al
      const posterDoc = await db.collection("global/posters/items").doc(posterId).get();
      const styleId = posterDoc.data()?.styleId;

      if (styleId) {
        // Aynı stilde kaç tane 1-2 yıldız var?
        const lowRatedSnap = await db.collection("global/posters/items")
          .where("styleId", "==", styleId)
          .where("rating", "<=", 2)
          .where("rating", ">", 0)
          .limit(3)
          .get();

        if (lowRatedSnap.size >= 3) {
          // Otomatik öğrenme tetikle
          const result = await learnFromFeedback(styleId);
          clearConfigCache();
          autoLearnResult = { styleId, ...result };
          console.log(`[AutoLearn] ${styleId}: ${result.feedbackCount} feedback → ${Object.keys(result.corrections).length} düzeltme`);
        }
      }
    } catch (err) {
      console.error("[AutoLearn] Hata:", err);
    }
  }

  res.json({
    success: true,
    message: autoLearnResult
      ? `Feedback kaydedildi + otomatik öğrenme tetiklendi (${autoLearnResult.styleId})`
      : "Feedback kaydedildi",
    autoLearn: autoLearnResult,
  });
});

/**
 * Global poster kurallarını getir
 * GET /getPosterGlobalRules
 */
export const getPosterGlobalRules = createHttpFunction(async (req, res) => {
  const rules = await getGlobalRules();
  res.json({ success: true, data: rules });
});

/**
 * Global poster kurallarını güncelle
 * POST /updatePosterGlobalRules
 * Body: { rules: string[] }
 */
export const updatePosterGlobalRules = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { rules } = req.body;
  if (!Array.isArray(rules)) {
    res.status(400).json({ success: false, error: "rules array gerekli" });
    return;
  }

  await updateGlobalRules(rules);
  res.json({ success: true, message: "Kurallar güncellendi" });
});

/**
 * Stil için feedback'lerden öğren
 * POST /triggerPosterLearning
 * Body: { styleId }
 */
export const triggerPosterLearning = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { styleId } = req.body;
  if (!styleId) {
    res.status(400).json({ success: false, error: "styleId gerekli" });
    return;
  }

  const result = await learnFromFeedback(styleId);
  clearConfigCache();

  res.json({
    success: true,
    data: result,
    message: `${result.feedbackCount} feedback'ten ${Object.keys(result.corrections).length} düzeltme öğrenildi`,
  });
}, { timeoutSeconds: 60, memory: "512MiB" });

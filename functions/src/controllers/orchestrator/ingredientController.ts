/**
 * Malzeme Görsel Prompt Üretici — Controller
 *
 * Endpoints:
 *   POST /generateIngredientPrompt  — Stil profili + malzeme → DALL-E prompt üret
 *   POST /seedIngredientData        — Varsayılan verileri Firestore'a yükle
 *   GET  /listIngredientProfiles    — Stil profillerini listele
 *   GET  /listIngredientItems       — Malzemeleri listele
 *   POST /createIngredientProfile   — Yeni stil profili oluştur
 *   POST /updateIngredientProfile   — Stil profili güncelle
 *   POST /deleteIngredientProfile   — Stil profili sil
 *   POST /createIngredientItem      — Yeni malzeme ekle
 *   POST /updateIngredientItem      — Malzeme güncelle
 *   POST /deleteIngredientItem      — Malzeme sil
 *   GET  /listIngredientPromptHistory — Prompt geçmişini listele
 */

import { createHttpFunction, db } from "./shared";
import { getConfig } from "../../config/environment";
import { getSystemSettings } from "../../services/configService";
import { getModelById } from "../../services/config/modelRegistry";
import type {
  IngredientStyleProfile,
  IngredientItem,
  IngredientPromptHistory,
} from "../../types/ingredient";

// Firestore yolları (collection path = tek sayıda segment)
const CONFIG_BASE = "global/config/ingredient-config";
const PROFILES_PATH = `${CONFIG_BASE}/profiles/items`;
const ITEMS_PATH = `${CONFIG_BASE}/ingredients/items`;
const HISTORY_PATH = "global/ingredient-prompt-history/items";

// Gemini system prompt — sahne detayı yazıcı
const SCENE_WRITER_SYSTEM = `Sen bir food photography sahne yönetmenisin. Sana bir malzeme bilgisi ve stil profili vereceğim.
Görevin: Bu malzemenin üretim veya hazırlık sürecini gösteren bir sahne detayı yazmak.

KURALLAR:
- Sadece SCENE bölümünü yaz, STYLE ve QUALITY bölümlerini YAZMA
- Sahne gerçekçi olmalı — gerçek bir mutfakta çekilmiş gibi
- Malzemenin dokusunu, rengini ve formunu detaylı tarif et
- Sahnede en fazla 3-4 obje olsun (sadelik)
- Malzemenin kullanıldığı ürünlerden biri arka planda tamamlanmış halde görünsün
- İnsan eli veya vücut GÖSTERME — sadece malzeme ve araçlar
- İngilizce yaz (DALL-E için)
- 2-3 cümle yeterli, uzatma

REFERANS GÖRSEL VARSA:
- Bu görseldeki kompozisyon, ışık yönü ve obje yerleşimini takip et
- Aynı hissiyatı koru ama malzemeye göre adapte et`;

/**
 * DALL-E prompt'u üret
 */
export const generateIngredientPrompt = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const {
    ingredientId,
    styleProfileId,
    referenceImageBase64,
    referenceImageMimeType,
  } = req.body;

  if (!ingredientId || !styleProfileId) {
    res.status(400).json({ success: false, error: "ingredientId ve styleProfileId zorunlu." });
    return;
  }

  // Firestore'dan veri oku
  const [profileDoc, itemDoc] = await Promise.all([
    db.collection(PROFILES_PATH).doc(styleProfileId).get(),
    db.collection(ITEMS_PATH).doc(ingredientId).get(),
  ]);

  if (!profileDoc.exists) {
    res.status(404).json({ success: false, error: `Stil profili bulunamadı: ${styleProfileId}` });
    return;
  }
  if (!itemDoc.exists) {
    res.status(404).json({ success: false, error: `Malzeme bulunamadı: ${ingredientId}` });
    return;
  }

  const profile = { id: profileDoc.id, ...profileDoc.data() } as IngredientStyleProfile;
  const item = { id: itemDoc.id, ...itemDoc.data() } as IngredientItem;

  // Gemini API key
  let geminiApiKey: string;
  try {
    const config = getConfig();
    geminiApiKey = config.gemini.apiKey;
  } catch {
    res.status(500).json({ success: false, error: "Gemini API key konfigüre edilmemiş." });
    return;
  }

  const systemSettings = await getSystemSettings();
  const configuredModel = (systemSettings.promptOptimizerModel || "gemini-2.0-flash") as string;

  // Bu endpoint sadece Gemini SDK kullanıyor — Claude/OpenAI model gelirse fallback yap
  const GEMINI_FALLBACK = "gemini-2.0-flash";
  let textModel = GEMINI_FALLBACK;
  const modelEntry = await getModelById(configuredModel);
  if (modelEntry && modelEntry.provider === "google") {
    textModel = configuredModel;
  } else {
    console.log(`[IngredientPrompt] ${configuredModel} Gemini modeli değil (provider: ${modelEntry?.provider || "bilinmiyor"}), fallback: ${GEMINI_FALLBACK}`);
  }

  // Gemini SDK
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const client = new GoogleGenerativeAI(geminiApiKey);
  const genModel = client.getGenerativeModel({
    model: textModel,
    systemInstruction: SCENE_WRITER_SYSTEM,
  });

  // Kullanıcı prompt'u
  const userPrompt = `MALZEME:
- Ad: ${item.name}
- Açıklama: ${item.description}
- Mesaj: ${item.message}
- Kullanıldığı ürünler: ${item.usedInProducts.join(", ")}

STİL PROFİLİ:
- Kamera açısı: ${profile.cameraAngle}
- Işık: ${profile.lighting}
- Zemin: ${profile.surface}
- Renk paleti: ${profile.colorPalette}
- Atmosfer: ${profile.atmosphere}
- Çerçeveleme: ${profile.framing}

Sahne detayını yaz.`;

  // Content parts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentParts: any[] = [];

  if (referenceImageBase64) {
    contentParts.push({
      inlineData: {
        mimeType: referenceImageMimeType || "image/jpeg",
        data: referenceImageBase64,
      },
    });
  }
  contentParts.push({ text: userPrompt });

  const startTime = Date.now();
  console.log(`[IngredientPrompt] Sahne detayı üretiliyor: malzeme=${item.name}, model=${textModel}`);

  try {
    const result = await genModel.generateContent(contentParts);
    const response = result.response;
    const sceneDetail = response.text().trim();

    if (!sceneDetail) {
      throw new Error("Gemini sahne detayı üretmedi — boş yanıt.");
    }

    // Şablon birleştirme
    const fullPrompt = `${profile.cameraAngle}, ${profile.lighting}, ${profile.surface}. ${profile.colorPalette}, ${profile.atmosphere}. ${profile.framing}.

${sceneDetail}

Professional food photography, high detail, shallow depth of field, 8K resolution.`;

    const duration = Date.now() - startTime;

    // Maliyet hesabı (Flash çok düşük)
    const cost = textModel.includes("flash") ? 0.001 : 0.01;

    // Geçmişe kaydet
    const historyData: Omit<IngredientPromptHistory, "id"> = {
      ingredientId: item.id,
      ingredientName: item.name,
      styleProfileId: profile.id,
      styleProfileName: profile.name,
      generatedPrompt: fullPrompt,
      sceneDetail,
      referenceImageUrl: profile.referenceImageUrl || null,
      cost,
      model: textModel,
      createdAt: Date.now(),
    };

    const historyRef = await db.collection(HISTORY_PATH).add(historyData);

    console.log(`[IngredientPrompt] Tamamlandı: ${duration}ms, historyId=${historyRef.id}`);

    res.json({
      success: true,
      data: {
        prompt: fullPrompt,
        sceneDetail,
        ingredientName: item.name,
        styleProfileName: profile.name,
        cost,
        model: textModel,
        historyId: historyRef.id,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Prompt üretimi başarısız.";
    console.error("[IngredientPrompt] Hata:", message);
    res.status(500).json({ success: false, error: message });
  }
}, { timeoutSeconds: 60 });

/**
 * Seed — varsayılan verileri Firestore'a yükle
 */
export const seedIngredientData = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { defaultStyleProfiles, defaultIngredientItems } = await import(
    "../../orchestrator/seed/ingredientData"
  );

  // Önce mevcut verileri temizle
  const [existingProfiles, existingItems] = await Promise.all([
    db.collection(PROFILES_PATH).get(),
    db.collection(ITEMS_PATH).get(),
  ]);

  const deleteBatch = db.batch();
  existingProfiles.docs.forEach(doc => deleteBatch.delete(doc.ref));
  existingItems.docs.forEach(doc => deleteBatch.delete(doc.ref));
  await deleteBatch.commit();

  // Yeni verileri ekle
  const batch = db.batch();
  let profileCount = 0;
  let itemCount = 0;

  // Stil profilleri
  for (const profile of defaultStyleProfiles) {
    const id = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    batch.set(db.collection(PROFILES_PATH).doc(id), { ...profile, id });
    profileCount++;
  }

  // Malzemeler
  for (const item of defaultIngredientItems) {
    const id = item.name.toLowerCase().replace(/[^a-z0-9çğıöşü]+/g, "-");
    batch.set(db.collection(ITEMS_PATH).doc(id), { ...item, id });
    itemCount++;
  }

  await batch.commit();

  console.log(`[IngredientSeed] ${profileCount} profil, ${itemCount} malzeme yüklendi.`);

  res.json({
    success: true,
    message: `Seed tamamlandı: ${profileCount} profil, ${itemCount} malzeme`,
    data: { profileCount, itemCount },
  });
});

/**
 * Stil profillerini listele
 */
export const listIngredientProfiles = createHttpFunction(async (_req, res) => {
  const snapshot = await db.collection(PROFILES_PATH).get();

  if (snapshot.empty) {
    res.status(404).json({
      success: false,
      error: "Firestore'da stil profili bulunamadı. Önce /seedIngredientData çağırın.",
    });
    return;
  }

  const profiles = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter((p: any) => p.isActive !== false)
    .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
  res.json({ success: true, data: profiles });
});

/**
 * Malzemeleri listele
 */
export const listIngredientItems = createHttpFunction(async (_req, res) => {
  const snapshot = await db.collection(ITEMS_PATH)
    .where("isActive", "==", true)
    .orderBy("sortOrder", "asc")
    .get();

  if (snapshot.empty) {
    res.status(404).json({
      success: false,
      error: "Firestore'da malzeme bulunamadı. Önce /seedIngredientData çağırın.",
    });
    return;
  }

  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json({ success: true, data: items });
});

/**
 * Yeni stil profili oluştur
 */
export const createIngredientProfile = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const data = req.body;
  if (!data.name) {
    res.status(400).json({ success: false, error: "name zorunlu." });
    return;
  }

  const id = data.id || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const now = Date.now();

  const docData: IngredientStyleProfile = {
    id,
    name: data.name,
    cameraAngle: data.cameraAngle || "",
    lighting: data.lighting || "",
    surface: data.surface || "",
    colorPalette: data.colorPalette || "",
    atmosphere: data.atmosphere || "",
    framing: data.framing || "",
    referenceImageUrl: data.referenceImageUrl || null,
    isActive: data.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection(PROFILES_PATH).doc(id).set(docData);
  res.json({ success: true, data: { id }, message: "Stil profili oluşturuldu." });
});

/**
 * Stil profili güncelle
 */
export const updateIngredientProfile = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { id, ...updates } = req.body;
  if (!id) {
    res.status(400).json({ success: false, error: "id zorunlu." });
    return;
  }

  await db.collection(PROFILES_PATH).doc(id).update({
    ...updates,
    updatedAt: Date.now(),
  });

  res.json({ success: true, message: "Stil profili güncellendi." });
});

/**
 * Stil profili sil
 */
export const deleteIngredientProfile = createHttpFunction(async (req, res) => {
  const id = req.body?.id || req.query.id;
  if (!id) {
    res.status(400).json({ success: false, error: "id zorunlu." });
    return;
  }

  await db.collection(PROFILES_PATH).doc(id as string).delete();
  res.json({ success: true, message: "Stil profili silindi." });
});

/**
 * Yeni malzeme ekle
 */
export const createIngredientItem = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const data = req.body;
  if (!data.name) {
    res.status(400).json({ success: false, error: "name zorunlu." });
    return;
  }

  const id = data.id || data.name.toLowerCase().replace(/[^a-z0-9çğıöşü]+/g, "-");
  const now = Date.now();

  const docData: IngredientItem = {
    id,
    name: data.name,
    description: data.description || "",
    message: data.message || "",
    usedInProducts: data.usedInProducts || [],
    isActive: data.isActive ?? true,
    sortOrder: data.sortOrder ?? 99,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection(ITEMS_PATH).doc(id).set(docData);
  res.json({ success: true, data: { id }, message: "Malzeme oluşturuldu." });
});

/**
 * Malzeme güncelle
 */
export const updateIngredientItem = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { id, ...updates } = req.body;
  if (!id) {
    res.status(400).json({ success: false, error: "id zorunlu." });
    return;
  }

  await db.collection(ITEMS_PATH).doc(id).update({
    ...updates,
    updatedAt: Date.now(),
  });

  res.json({ success: true, message: "Malzeme güncellendi." });
});

/**
 * Malzeme sil
 */
export const deleteIngredientItem = createHttpFunction(async (req, res) => {
  const id = req.body?.id || req.query.id;
  if (!id) {
    res.status(400).json({ success: false, error: "id zorunlu." });
    return;
  }

  await db.collection(ITEMS_PATH).doc(id as string).delete();
  res.json({ success: true, message: "Malzeme silindi." });
});

/**
 * Prompt geçmişini listele
 */
export const listIngredientPromptHistory = createHttpFunction(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;

  const snapshot = await db.collection(HISTORY_PATH)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json({ success: true, data: items, count: items.length });
});

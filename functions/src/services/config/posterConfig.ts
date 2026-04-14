/**
 * Poster Config — Firestore'dan poster stilleri, mood'lar ve aspect ratio'lar
 * Pattern: orchestratorConfig.ts ile aynı — cache + Firestore okuma + fallback YOK
 */

import { PosterStyle, PosterMood, PosterAspectRatio, PosterTypography, PosterLayout, PosterCameraAngle, PosterLightingType, PosterBackground } from "../../types/poster";
import { CACHE_TTL, getDb, registerCacheClear } from "./configCache";

// Cache
let stylesCache: PosterStyle[] | null = null;
let stylesCacheTimestamp = 0;

let moodsCache: PosterMood[] | null = null;
let moodsCacheTimestamp = 0;

let ratiosCache: PosterAspectRatio[] | null = null;
let ratiosCacheTimestamp = 0;

let typographiesCache: PosterTypography[] | null = null;
let typographiesCacheTimestamp = 0;

let layoutsCache: PosterLayout[] | null = null;
let layoutsCacheTimestamp = 0;

let cameraAnglesCache: PosterCameraAngle[] | null = null;
let cameraAnglesCacheTimestamp = 0;

let lightingTypesCache: PosterLightingType[] | null = null;
let lightingTypesCacheTimestamp = 0;

let backgroundsCache: PosterBackground[] | null = null;
let backgroundsCacheTimestamp = 0;

// Cache temizleme kaydı
registerCacheClear(() => {
  stylesCache = null;
  stylesCacheTimestamp = 0;
  moodsCache = null;
  moodsCacheTimestamp = 0;
  ratiosCache = null;
  ratiosCacheTimestamp = 0;
  typographiesCache = null;
  typographiesCacheTimestamp = 0;
  layoutsCache = null;
  layoutsCacheTimestamp = 0;
  cameraAnglesCache = null;
  cameraAnglesCacheTimestamp = 0;
  lightingTypesCache = null;
  lightingTypesCacheTimestamp = 0;
  backgroundsCache = null;
  backgroundsCacheTimestamp = 0;
});

const POSTER_CONFIG_PATH = "global/config/poster-config";

// 6 karakterli hex yakalama — promptDirections.background metninden ilk geçen hex
const HEX_EXTRACT_PATTERN = /#([0-9A-Fa-f]{6})\b/;

/**
 * Stilin defaultBackgroundHex alanı yoksa, background metninden ilk hex'i çıkarıp döner.
 * Çıkaramıyorsa null döner.
 */
function extractHexFromBackgroundText(background: string | undefined): string | null {
  if (!background) return null;
  const match = background.match(HEX_EXTRACT_PATTERN);
  if (!match) return null;
  return `#${match[1].toUpperCase()}`;
}

/**
 * Aktif poster stillerini getir.
 * @param skipCache — true ise in-memory cache'i atlar (listeleme endpoint'i için)
 *
 * Self-healing: defaultBackgroundHex eksikse promptDirections.background metninden
 * ilk hex'i çıkarır, bellekteki kopyayı günceller ve Firestore'a fire-and-forget yazar.
 * Bu tek seferlik migration davranışıdır — bir kez set edildikten sonra tekrar tetiklenmez.
 */
export async function getPosterStyles(skipCache = false): Promise<PosterStyle[]> {
  const now = Date.now();
  if (!skipCache && stylesCache && now - stylesCacheTimestamp < CACHE_TTL) {
    return stylesCache;
  }

  const snapshot = await getDb()
    .collection(`${POSTER_CONFIG_PATH}/styles/items`)
    .where("isActive", "==", true)
    .orderBy("sortOrder")
    .get();

  if (snapshot.empty) {
    throw new Error(
      "[PosterConfig] Firestore'da poster stilleri bulunamadı. " +
      "/seedPosterConfig endpoint'ini çağırarak veri yükleyin."
    );
  }

  const styles = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as PosterStyle[];

  // Self-healing backfill — defaultBackgroundHex eksik stilleri tamamla
  for (const style of styles) {
    if (style.defaultBackgroundHex && style.defaultBackgroundHex.trim()) continue;
    const extracted = extractHexFromBackgroundText(
      style.promptDirections?.styleDirective
      || style.promptDirections?.colorPalette
      || style.promptDirections?.background
    );
    if (!extracted) continue;

    // Bellekteki kopyayı hemen güncelle — bu isteğin sonucu anchor kullanır
    style.defaultBackgroundHex = extracted;

    // Firestore'a fire-and-forget yaz — cache sonraki okumada persist halde bulur
    const ref = getDb().collection(`${POSTER_CONFIG_PATH}/styles/items`).doc(style.id);
    ref.update({ defaultBackgroundHex: extracted, updatedAt: Date.now() })
      .then(() => {
        console.log(`[PosterConfig] Backfilled defaultBackgroundHex=${extracted} for style "${style.id}"`);
      })
      .catch(err => {
        console.error(`[PosterConfig] Backfill failed for style "${style.id}":`, err);
      });
  }

  stylesCache = styles;
  stylesCacheTimestamp = now;

  return stylesCache;
}

/**
 * Aktif poster mood'larını getir
 */
export async function getPosterMoods(): Promise<PosterMood[]> {
  const now = Date.now();
  if (moodsCache && now - moodsCacheTimestamp < CACHE_TTL) {
    return moodsCache;
  }

  const snapshot = await getDb()
    .collection(`${POSTER_CONFIG_PATH}/moods/items`)
    .where("isActive", "==", true)
    .orderBy("sortOrder")
    .get();

  if (snapshot.empty) {
    throw new Error(
      "[PosterConfig] Firestore'da poster mood'ları bulunamadı. " +
      "/seedPosterConfig endpoint'ini çağırarak veri yükleyin."
    );
  }

  moodsCache = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as PosterMood[];
  moodsCacheTimestamp = now;

  return moodsCache;
}

/**
 * Aktif poster aspect ratio'larını getir
 */
export async function getPosterAspectRatios(): Promise<PosterAspectRatio[]> {
  const now = Date.now();
  if (ratiosCache && now - ratiosCacheTimestamp < CACHE_TTL) {
    return ratiosCache;
  }

  const snapshot = await getDb()
    .collection(`${POSTER_CONFIG_PATH}/aspect-ratios/items`)
    .where("isActive", "==", true)
    .orderBy("sortOrder")
    .get();

  if (snapshot.empty) {
    throw new Error(
      "[PosterConfig] Firestore'da poster aspect ratio'ları bulunamadı. " +
      "/seedPosterConfig endpoint'ini çağırarak veri yükleyin."
    );
  }

  ratiosCache = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as PosterAspectRatio[];
  ratiosCacheTimestamp = now;

  return ratiosCache;
}

/**
 * Tek bir stil getir (ID ile)
 */
export async function getPosterStyleById(styleId: string): Promise<PosterStyle> {
  const styles = await getPosterStyles();
  const style = styles.find(s => s.id === styleId);
  if (!style) {
    throw new Error(`[PosterConfig] Stil bulunamadı: ${styleId}`);
  }
  return style;
}

/**
 * Tek bir mood getir (ID ile)
 */
export async function getPosterMoodById(moodId: string): Promise<PosterMood> {
  const moods = await getPosterMoods();
  const mood = moods.find(m => m.id === moodId);
  if (!mood) {
    throw new Error(`[PosterConfig] Mood bulunamadı: ${moodId}`);
  }
  return mood;
}

/**
 * Tek bir aspect ratio getir (ID ile)
 */
export async function getPosterAspectRatioById(ratioId: string): Promise<PosterAspectRatio> {
  const ratios = await getPosterAspectRatios();
  const ratio = ratios.find(r => r.id === ratioId);
  if (!ratio) {
    throw new Error(`[PosterConfig] Aspect ratio bulunamadı: ${ratioId}`);
  }
  return ratio;
}

/**
 * Aktif tipografi stillerini getir
 */
export async function getPosterTypographies(): Promise<PosterTypography[]> {
  const now = Date.now();
  if (typographiesCache && now - typographiesCacheTimestamp < CACHE_TTL) {
    return typographiesCache;
  }

  const snapshot = await getDb()
    .collection(`${POSTER_CONFIG_PATH}/typographies/items`)
    .where("isActive", "==", true)
    .orderBy("sortOrder")
    .get();

  if (snapshot.empty) {
    return []; // Tipografi opsiyonel — yoksa stil'in kendi tipografi talimatı kullanılır
  }

  typographiesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PosterTypography[];
  typographiesCacheTimestamp = now;
  return typographiesCache;
}

/**
 * Aktif layout preset'lerini getir
 */
export async function getPosterLayouts(): Promise<PosterLayout[]> {
  const now = Date.now();
  if (layoutsCache && now - layoutsCacheTimestamp < CACHE_TTL) {
    return layoutsCache;
  }

  const snapshot = await getDb()
    .collection(`${POSTER_CONFIG_PATH}/layouts/items`)
    .where("isActive", "==", true)
    .orderBy("sortOrder")
    .get();

  if (snapshot.empty) {
    return []; // Layout opsiyonel — yoksa stil'in kendi layout talimatı kullanılır
  }

  layoutsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PosterLayout[];
  layoutsCacheTimestamp = now;
  return layoutsCache;
}

export async function getPosterTypographyById(id: string): Promise<PosterTypography | null> {
  const items = await getPosterTypographies();
  return items.find(t => t.id === id) || null;
}

export async function getPosterLayoutById(id: string): Promise<PosterLayout | null> {
  const items = await getPosterLayouts();
  return items.find(l => l.id === id) || null;
}

/**
 * Aktif kamera açılarını getir
 */
export async function getPosterCameraAngles(): Promise<PosterCameraAngle[]> {
  const now = Date.now();
  if (cameraAnglesCache && now - cameraAnglesCacheTimestamp < CACHE_TTL) {
    return cameraAnglesCache;
  }

  const snapshot = await getDb()
    .collection(`${POSTER_CONFIG_PATH}/camera-angles/items`)
    .where("isActive", "==", true)
    .orderBy("sortOrder")
    .get();

  if (snapshot.empty) {
    return []; // Opsiyonel — yoksa stil'in kendi kamera talimatı kullanılır
  }

  cameraAnglesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PosterCameraAngle[];
  cameraAnglesCacheTimestamp = now;
  return cameraAnglesCache;
}

export async function getPosterCameraAngleById(id: string): Promise<PosterCameraAngle | null> {
  const items = await getPosterCameraAngles();
  return items.find(c => c.id === id) || null;
}

/**
 * Aktif ışık tiplerini getir
 */
export async function getPosterLightingTypes(): Promise<PosterLightingType[]> {
  const now = Date.now();
  if (lightingTypesCache && now - lightingTypesCacheTimestamp < CACHE_TTL) {
    return lightingTypesCache;
  }

  const snapshot = await getDb()
    .collection(`${POSTER_CONFIG_PATH}/lighting-types/items`)
    .where("isActive", "==", true)
    .orderBy("sortOrder")
    .get();

  if (snapshot.empty) {
    return []; // Opsiyonel
  }

  lightingTypesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PosterLightingType[];
  lightingTypesCacheTimestamp = now;
  return lightingTypesCache;
}

export async function getPosterLightingTypeById(id: string): Promise<PosterLightingType | null> {
  const items = await getPosterLightingTypes();
  return items.find(l => l.id === id) || null;
}

/**
 * Aktif arka planları getir
 */
export async function getPosterBackgrounds(): Promise<PosterBackground[]> {
  const now = Date.now();
  if (backgroundsCache && now - backgroundsCacheTimestamp < CACHE_TTL) {
    return backgroundsCache;
  }

  const snapshot = await getDb()
    .collection(`${POSTER_CONFIG_PATH}/backgrounds/items`)
    .where("isActive", "==", true)
    .orderBy("sortOrder")
    .get();

  if (snapshot.empty) {
    return []; // Opsiyonel
  }

  backgroundsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PosterBackground[];
  backgroundsCacheTimestamp = now;
  return backgroundsCache;
}

export async function getPosterBackgroundById(id: string): Promise<PosterBackground | null> {
  const items = await getPosterBackgrounds();
  return items.find(b => b.id === id) || null;
}

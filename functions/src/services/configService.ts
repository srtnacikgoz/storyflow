/**
 * Config Service
 * Firestore'dan orchestrator config'lerini okur ve yönetir.
 *
 * Collection yapısı:
 * - global/scenarios/{scenarioId}
 * - global/hand-styles/{styleId}
 * - global/asset-personalities/{assetId}
 * - global/config/diversity-rules
 * - global/config/time-mood
 * - global/config/weekly-themes
 * - global/config/absolute-rules
 * - global/config/orchestrator-instructions
 */

import * as admin from "firebase-admin";
import {
  FirestoreScenario,
  FirestoreHandStyle,
  FirestoreAssetPersonality,
  FirestoreDiversityRules,
  FirestoreTimeMoodConfig,
  FirestoreWeeklyThemesConfig,
  FirestoreAbsoluteRulesConfig,
  FirestoreOrchestratorInstructions,
  FirestoreTimeoutsConfig,
  FirestoreSystemSettingsConfig,
  FirestoreFixedAssetsConfig,
  GlobalOrchestratorConfig,
} from "../orchestrator/types";
import { getCategories as getCategoriesFromService } from "./categoryService";
import {
  getAllSeedData,
  DEFAULT_TIMEOUTS_CONFIG,
  DEFAULT_SYSTEM_SETTINGS_CONFIG,
  DEFAULT_FIXED_ASSETS_CONFIG,
} from "../orchestrator/seed/defaultData";

// Cache süresi (5 dakika)
const CACHE_TTL = 5 * 60 * 1000;

// Cache
let configCache: GlobalOrchestratorConfig | null = null;
let cacheTimestamp = 0;

// System Settings Cache (ayrı cache - daha sık kullanılıyor)
let systemSettingsCache: FirestoreSystemSettingsConfig | null = null;
let systemSettingsCacheTimestamp = 0;

/**
 * Firestore referansı
 */
function getDb() {
  return admin.firestore();
}

// ==========================================
// OKUMA FONKSİYONLARI
// ==========================================

/**
 * Tüm senaryoları getirir
 */
export async function getScenarios(): Promise<FirestoreScenario[]> {
  const snapshot = await getDb()
    .collection("global")
    .doc("scenarios")
    .collection("items")
    .where("isActive", "==", true)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FirestoreScenario[];
}

/**
 * Tüm el stillerini getirir
 */
export async function getHandStyles(): Promise<FirestoreHandStyle[]> {
  const snapshot = await getDb()
    .collection("global")
    .doc("hand-styles")
    .collection("items")
    .where("isActive", "==", true)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FirestoreHandStyle[];
}

/**
 * Tüm asset kişiliklerini getirir
 */
export async function getAssetPersonalities(): Promise<FirestoreAssetPersonality[]> {
  const snapshot = await getDb()
    .collection("global")
    .doc("asset-personalities")
    .collection("items")
    .where("isActive", "==", true)
    .get();

  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    assetId: doc.id,
  })) as FirestoreAssetPersonality[];
}

/**
 * Çeşitlilik kurallarını getirir
 */
export async function getDiversityRules(): Promise<FirestoreDiversityRules> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("diversity-rules")
    .get();

  if (!doc.exists) {
    // Varsayılan değerleri döndür
    const seedData = getAllSeedData();
    return seedData.diversityRules;
  }

  return doc.data() as FirestoreDiversityRules;
}

/**
 * Zaman-mood eşleştirmesini getirir
 */
export async function getTimeMoodConfig(): Promise<FirestoreTimeMoodConfig> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("time-mood")
    .get();

  if (!doc.exists) {
    const seedData = getAllSeedData();
    return seedData.timeMoodConfig;
  }

  return doc.data() as FirestoreTimeMoodConfig;
}

/**
 * Haftalık temaları getirir
 */
export async function getWeeklyThemes(): Promise<FirestoreWeeklyThemesConfig> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("weekly-themes")
    .get();

  if (!doc.exists) {
    const seedData = getAllSeedData();
    return seedData.weeklyThemesConfig;
  }

  return doc.data() as FirestoreWeeklyThemesConfig;
}

/**
 * Mutlak kuralları getirir
 */
export async function getAbsoluteRules(): Promise<FirestoreAbsoluteRulesConfig> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("absolute-rules")
    .get();

  if (!doc.exists) {
    const seedData = getAllSeedData();
    return seedData.absoluteRulesConfig;
  }

  return doc.data() as FirestoreAbsoluteRulesConfig;
}

/**
 * Orchestrator talimatlarını getirir
 */
export async function getOrchestratorInstructions(): Promise<FirestoreOrchestratorInstructions> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("orchestrator-instructions")
    .get();

  if (!doc.exists) {
    const seedData = getAllSeedData();
    return seedData.orchestratorInstructions;
  }

  return doc.data() as FirestoreOrchestratorInstructions;
}

/**
 * Timeout ayarlarını getirir
 * Document: global/config/settings/timeouts
 */
export async function getTimeouts(): Promise<FirestoreTimeoutsConfig> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("timeouts")
    .get();

  if (!doc.exists) {
    // Varsayılan değerleri döndür
    return {
      ...DEFAULT_TIMEOUTS_CONFIG,
      updatedAt: Date.now(),
    };
  }

  return doc.data() as FirestoreTimeoutsConfig;
}

/**
 * Sistem ayarlarını getirir (CACHE'Lİ)
 * Document: global/config/settings/system-settings
 *
 * Bu ayarlar runtime'da değiştirilebilir (deploy gerektirmez)
 * Hardcoded değerlerin config'e taşınmış hali
 *
 * NOT: Bu fonksiyon sık çağrıldığı için ayrı cache kullanır
 */
export async function getSystemSettings(): Promise<FirestoreSystemSettingsConfig> {
  const now = Date.now();

  // Cache geçerliyse döndür
  if (systemSettingsCache && now - systemSettingsCacheTimestamp < CACHE_TTL) {
    return systemSettingsCache;
  }

  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("system-settings")
    .get();

  if (!doc.exists) {
    // Varsayılan değerleri döndür ve cache'le
    systemSettingsCache = {
      ...DEFAULT_SYSTEM_SETTINGS_CONFIG,
      updatedAt: Date.now(),
    };
    systemSettingsCacheTimestamp = now;
    return systemSettingsCache;
  }

  // Cache'e kaydet
  systemSettingsCache = doc.data() as FirestoreSystemSettingsConfig;
  systemSettingsCacheTimestamp = now;

  return systemSettingsCache;
}

/**
 * Sabit asset ayarlarını getirir
 * Document: global/config/settings/fixed-assets
 *
 * "Mermer masa sabit, üzerindekiler serbest" kullanım senaryosu için.
 */
export async function getFixedAssets(): Promise<FirestoreFixedAssetsConfig> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("fixed-assets")
    .get();

  if (!doc.exists) {
    // Varsayılan değerleri döndür
    return {
      ...DEFAULT_FIXED_ASSETS_CONFIG,
      updatedAt: Date.now(),
    };
  }

  return doc.data() as FirestoreFixedAssetsConfig;
}

/**
 * Tüm config'leri tek seferde getirir (cache ile)
 */
export async function getGlobalConfig(forceRefresh = false): Promise<GlobalOrchestratorConfig> {
  const now = Date.now();

  // Cache geçerliyse döndür
  if (!forceRefresh && configCache && now - cacheTimestamp < CACHE_TTL) {
    return configCache;
  }

  console.log("[ConfigService] Loading global config from Firestore...");

  // Paralel olarak tüm config'leri yükle
  const [
    scenarios,
    handStyles,
    assetPersonalities,
    diversityRules,
    timeMoodConfig,
    weeklyThemes,
    absoluteRules,
    instructions,
    timeouts,
    systemSettings,
    fixedAssets,
    categories,
  ] = await Promise.all([
    getScenarios(),
    getHandStyles(),
    getAssetPersonalities(),
    getDiversityRules(),
    getTimeMoodConfig(),
    getWeeklyThemes(),
    getAbsoluteRules(),
    getOrchestratorInstructions(),
    getTimeouts(),
    getSystemSettings(),
    getFixedAssets(),
    getCategoriesFromService(),
  ]);

  // Config oluştur
  const config: GlobalOrchestratorConfig = {
    scenarios,
    handStyles,
    assetPersonalities,
    diversityRules,
    timeMoodConfig,
    weeklyThemes,
    absoluteRules,
    instructions,
    timeouts,
    systemSettings,
    fixedAssets,
    categories,
    loadedAt: now,
    version: "1.0.0",
  };

  // Cache'e kaydet
  configCache = config;
  cacheTimestamp = now;

  console.log(`[ConfigService] Loaded: ${scenarios.length} scenarios, ${handStyles.length} hand styles`);

  return config;
}

/**
 * Cache'i temizler
 */
export function clearConfigCache(): void {
  configCache = null;
  cacheTimestamp = 0;
  systemSettingsCache = null;
  systemSettingsCacheTimestamp = 0;
  console.log("[ConfigService] Cache cleared (including system settings)");
}

// ==========================================
// YAZMA FONKSİYONLARI
// ==========================================

/**
 * Seed data'yı Firestore'a yükler
 * İlk kurulumda veya reset için kullanılır
 */
export async function seedFirestoreConfig(): Promise<void> {
  console.log("[ConfigService] Seeding Firestore with default config...");

  const seedData = getAllSeedData();
  const batch = getDb().batch();

  // Senaryoları yükle
  for (const scenario of seedData.scenarios) {
    const ref = getDb()
      .collection("global")
      .doc("scenarios")
      .collection("items")
      .doc(scenario.id);
    batch.set(ref, scenario);
  }

  // El stillerini yükle
  for (const handStyle of seedData.handStyles) {
    const ref = getDb()
      .collection("global")
      .doc("hand-styles")
      .collection("items")
      .doc(handStyle.id);
    batch.set(ref, handStyle);
  }

  // Asset kişiliklerini yükle
  for (const personality of seedData.assetPersonalities) {
    const ref = getDb()
      .collection("global")
      .doc("asset-personalities")
      .collection("items")
      .doc(personality.assetId);
    batch.set(ref, personality);
  }

  // Config'leri yükle
  const configRef = getDb().collection("global").doc("config").collection("settings");

  batch.set(configRef.doc("diversity-rules"), seedData.diversityRules);
  batch.set(configRef.doc("time-mood"), seedData.timeMoodConfig);
  batch.set(configRef.doc("weekly-themes"), seedData.weeklyThemesConfig);
  batch.set(configRef.doc("absolute-rules"), seedData.absoluteRulesConfig);
  batch.set(configRef.doc("orchestrator-instructions"), seedData.orchestratorInstructions);
  batch.set(configRef.doc("timeouts"), seedData.timeoutsConfig);
  batch.set(configRef.doc("system-settings"), seedData.systemSettingsConfig);
  batch.set(configRef.doc("fixed-assets"), seedData.fixedAssetsConfig);

  await batch.commit();

  // Cache'i temizle
  clearConfigCache();

  console.log("[ConfigService] Seed completed successfully");
}

/**
 * Tek bir senaryoyu günceller
 */
export async function updateScenario(
  scenarioId: string,
  updates: Partial<FirestoreScenario>
): Promise<void> {
  await getDb()
    .collection("global")
    .doc("scenarios")
    .collection("items")
    .doc(scenarioId)
    .update({
      ...updates,
      updatedAt: Date.now(),
    });

  clearConfigCache();
}

/**
 * Yeni senaryo ekler
 */
export async function addScenario(scenario: Omit<FirestoreScenario, "createdAt" | "updatedAt">): Promise<void> {
  const now = Date.now();
  await getDb()
    .collection("global")
    .doc("scenarios")
    .collection("items")
    .doc(scenario.id)
    .set({
      ...scenario,
      createdAt: now,
      updatedAt: now,
    });

  clearConfigCache();
}

/**
 * Senaryo siler (hard delete)
 */
export async function deleteScenario(scenarioId: string): Promise<void> {
  await getDb()
    .collection("global")
    .doc("scenarios")
    .collection("items")
    .doc(scenarioId)
    .delete();

  clearConfigCache();
}

/**
 * Çeşitlilik kurallarını günceller
 */
export async function updateDiversityRules(
  updates: Partial<FirestoreDiversityRules>
): Promise<void> {
  await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("diversity-rules")
    .update({
      ...updates,
      updatedAt: Date.now(),
    });

  clearConfigCache();
}

/**
 * Mutlak kuralları günceller
 */
export async function updateAbsoluteRules(
  updates: Partial<FirestoreAbsoluteRulesConfig>
): Promise<void> {
  await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("absolute-rules")
    .update({
      ...updates,
      updatedAt: Date.now(),
    });

  clearConfigCache();
}

/**
 * Orchestrator talimatlarını günceller
 */
export async function updateOrchestratorInstructions(
  updates: Partial<FirestoreOrchestratorInstructions>
): Promise<void> {
  await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("orchestrator-instructions")
    .update({
      ...updates,
      updatedAt: Date.now(),
    });

  clearConfigCache();
}

/**
 * Timeout ayarlarını günceller
 * Document: global/config/settings/timeouts
 */
export async function updateTimeouts(
  updates: Partial<FirestoreTimeoutsConfig>
): Promise<void> {
  const docRef = getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("timeouts");

  const doc = await docRef.get();

  if (!doc.exists) {
    // Doküman yoksa oluştur
    await docRef.set({
      ...DEFAULT_TIMEOUTS_CONFIG,
      ...updates,
      updatedAt: Date.now(),
    });
  } else {
    // Güncelle
    await docRef.update({
      ...updates,
      updatedAt: Date.now(),
    });
  }

  clearConfigCache();
}

/**
 * Sistem ayarlarını günceller
 * Document: global/config/settings/system-settings
 *
 * Validasyon kuralları:
 * - claudeInputCostPer1K: 0.001 - 0.1
 * - claudeOutputCostPer1K: 0.001 - 0.5
 * - geminiDefaultFaithfulness: 0.0 - 1.0
 * - maxFeedbackForPrompt: 1 - 50
 * - stuckWarningMinutes: 5 - 60
 * - maxLogsPerQuery: 10 - 500
 * - cacheTTLMinutes: 1 - 60
 */
export async function updateSystemSettings(
  updates: Partial<FirestoreSystemSettingsConfig>
): Promise<void> {
  const docRef = getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("system-settings");

  const doc = await docRef.get();

  if (!doc.exists) {
    // Doküman yoksa oluştur
    await docRef.set({
      ...DEFAULT_SYSTEM_SETTINGS_CONFIG,
      ...updates,
      updatedAt: Date.now(),
    });
  } else {
    // Güncelle
    await docRef.update({
      ...updates,
      updatedAt: Date.now(),
    });
  }

  clearConfigCache();
  console.log("[ConfigService] System settings updated:", Object.keys(updates));
}

/**
 * Sabit asset ayarlarını günceller
 * Document: global/config/settings/fixed-assets
 *
 * "Mermer masa sabit, üzerindekiler serbest" kullanım senaryosu için.
 * Admin panelden aktifleştirilir/deaktifleştirilir.
 */
export async function updateFixedAssets(
  updates: Partial<FirestoreFixedAssetsConfig>
): Promise<void> {
  const docRef = getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("fixed-assets");

  const doc = await docRef.get();

  if (!doc.exists) {
    // Doküman yoksa oluştur
    await docRef.set({
      ...DEFAULT_FIXED_ASSETS_CONFIG,
      ...updates,
      updatedAt: Date.now(),
    });
  } else {
    // Güncelle
    await docRef.update({
      ...updates,
      updatedAt: Date.now(),
    });
  }

  clearConfigCache();
  console.log("[ConfigService] Fixed assets updated:", Object.keys(updates));
}

// ==========================================
// YARDIMCI FONKSİYONLAR
// ==========================================

/**
 * Config'in Firestore'da mevcut olup olmadığını kontrol eder
 */
export async function isConfigInitialized(): Promise<boolean> {
  const scenariosSnapshot = await getDb()
    .collection("global")
    .doc("scenarios")
    .collection("items")
    .limit(1)
    .get();

  return !scenariosSnapshot.empty;
}

/**
 * Config yoksa otomatik seed yapar
 */
export async function ensureConfigInitialized(): Promise<void> {
  const initialized = await isConfigInitialized();

  if (!initialized) {
    console.log("[ConfigService] Config not found, initializing with seed data...");
    await seedFirestoreConfig();
  }
}

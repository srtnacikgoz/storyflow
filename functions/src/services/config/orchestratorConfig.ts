/**
 * Orchestrator Config — Tüm okuma (get) fonksiyonları + getGlobalConfig
 * Firestore'dan config okur, cache'ler, global config oluşturur.
 */

import {
  FirestoreScenario,
  FirestoreAssetPersonality,
  FirestoreDiversityRules,
  FirestoreTimeMoodConfig,
  FirestoreWeeklyThemesConfig,
  FirestoreAbsoluteRulesConfig,
  FirestoreOrchestratorInstructions,
  FirestoreTimeoutsConfig,
  FirestoreSystemSettingsConfig,
  FirestoreFixedAssetsConfig,
  FirestoreBusinessContextConfig,
  FirestoreAssetSelectionConfig,
  FirestoreRuleEngineConfig,
  GlobalOrchestratorConfig,
} from "../../orchestrator/types";
import { getCategories as getCategoriesFromService } from "../categoryService";
import {
  getAllSeedData,
  DEFAULT_TIMEOUTS_CONFIG,
  DEFAULT_SYSTEM_SETTINGS_CONFIG,
  DEFAULT_FIXED_ASSETS_CONFIG,
  DEFAULT_BUSINESS_CONTEXT_CONFIG,
  DEFAULT_ASSET_SELECTION_CONFIG,
  DEFAULT_RULE_ENGINE_CONFIG,
} from "../../orchestrator/seed/defaultData";
import { CACHE_TTL, getDb, registerCacheClear } from "./configCache";
import { getPromptStudioConfig } from "./promptStudio";

// Global Config Cache
let configCache: GlobalOrchestratorConfig | null = null;
let configCacheTimestamp = 0;

// System Settings Cache (ayrı — daha sık kullanılıyor)
let systemSettingsCache: FirestoreSystemSettingsConfig | null = null;
let systemSettingsCacheTimestamp = 0;

// Cache temizleme kaydı
registerCacheClear(() => {
  configCache = null;
  configCacheTimestamp = 0;
  systemSettingsCache = null;
  systemSettingsCacheTimestamp = 0;
});

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
 */
export async function getTimeouts(): Promise<FirestoreTimeoutsConfig> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("timeouts")
    .get();

  if (!doc.exists) {
    return {
      ...DEFAULT_TIMEOUTS_CONFIG,
      updatedAt: Date.now(),
    };
  }

  return doc.data() as FirestoreTimeoutsConfig;
}

/**
 * Sistem ayarlarını getirir (CACHE'Lİ)
 */
export async function getSystemSettings(): Promise<FirestoreSystemSettingsConfig> {
  const now = Date.now();

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
    systemSettingsCache = {
      ...DEFAULT_SYSTEM_SETTINGS_CONFIG,
      updatedAt: Date.now(),
    };
    systemSettingsCacheTimestamp = now;
    return systemSettingsCache;
  }

  systemSettingsCache = doc.data() as FirestoreSystemSettingsConfig;
  systemSettingsCacheTimestamp = now;
  return systemSettingsCache;
}

/**
 * Cloudinary feature flag'ini kontrol eder
 */
export async function isCloudinaryEnabled(): Promise<boolean> {
  try {
    const settings = await getSystemSettings();
    return settings.useCloudinary !== false;
  } catch (error) {
    console.warn("[ConfigService] Failed to read useCloudinary flag, defaulting to true:", error);
    return true;
  }
}

/**
 * Sabit asset ayarlarını getirir
 */
export async function getFixedAssets(): Promise<FirestoreFixedAssetsConfig> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("fixed-assets")
    .get();

  if (!doc.exists) {
    return {
      ...DEFAULT_FIXED_ASSETS_CONFIG,
      updatedAt: Date.now(),
    };
  }

  return doc.data() as FirestoreFixedAssetsConfig;
}

/**
 * İşletme bağlamını getirir
 */
export async function getBusinessContext(): Promise<FirestoreBusinessContextConfig> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("business-context")
    .get();

  if (!doc.exists) {
    return {
      ...DEFAULT_BUSINESS_CONTEXT_CONFIG,
      updatedAt: Date.now(),
    };
  }

  return doc.data() as FirestoreBusinessContextConfig;
}

/**
 * Asset seçim kurallarını getirir
 */
export async function getAssetSelectionConfig(): Promise<FirestoreAssetSelectionConfig> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("asset-selection")
    .get();

  if (!doc.exists) {
    return {
      ...DEFAULT_ASSET_SELECTION_CONFIG,
      updatedAt: Date.now(),
    };
  }

  return doc.data() as FirestoreAssetSelectionConfig;
}

/**
 * Rule Engine config'ini getirir
 */
export async function getRuleEngineConfig(): Promise<FirestoreRuleEngineConfig> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("rule-engine")
    .get();

  if (!doc.exists) {
    return {
      ...DEFAULT_RULE_ENGINE_CONFIG,
      updatedAt: Date.now(),
    };
  }

  return doc.data() as FirestoreRuleEngineConfig;
}

/**
 * Tüm config'leri tek seferde getirir (cache ile)
 */
export async function getGlobalConfig(forceRefresh = false): Promise<GlobalOrchestratorConfig> {
  const now = Date.now();

  if (!forceRefresh && configCache && now - configCacheTimestamp < CACHE_TTL) {
    return configCache;
  }

  console.log("[ConfigService] Loading global config from Firestore...");

  const [
    scenarios,
    assetPersonalities,
    diversityRules,
    timeMoodConfig,
    weeklyThemes,
    absoluteRules,
    instructions,
    timeouts,
    systemSettings,
    fixedAssets,
    businessContext,
    assetSelectionConfig,
    promptStudio,
    categories,
    ruleEngine,
  ] = await Promise.all([
    getScenarios(),
    getAssetPersonalities(),
    getDiversityRules(),
    getTimeMoodConfig(),
    getWeeklyThemes(),
    getAbsoluteRules(),
    getOrchestratorInstructions(),
    getTimeouts(),
    getSystemSettings(),
    getFixedAssets(),
    getBusinessContext(),
    getAssetSelectionConfig(),
    getPromptStudioConfig(),
    getCategoriesFromService(),
    getRuleEngineConfig(),
  ]);

  const config: GlobalOrchestratorConfig = {
    scenarios,
    handStyles: [],
    assetPersonalities,
    diversityRules,
    timeMoodConfig,
    weeklyThemes,
    absoluteRules,
    instructions,
    timeouts,
    systemSettings,
    fixedAssets,
    businessContext,
    assetSelectionConfig,
    promptStudio,
    categories,
    ruleEngine,
    loadedAt: now,
    version: "1.0.0",
  };

  configCache = config;
  configCacheTimestamp = now;

  console.log(`[ConfigService] Loaded: ${scenarios.length} scenarios`);

  return config;
}

// ==========================================
// LANDING HERO CONFIG
// ==========================================

const LANDING_HERO_DOC = "landing-hero";

/**
 * Landing page hero görsel config'ini getirir
 */
export async function getLandingHeroConfig(): Promise<Record<string, unknown>> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc(LANDING_HERO_DOC)
    .get();

  if (!doc.exists) {
    return { collageSlots: {}, resultImage: null, updatedAt: 0 };
  }

  return doc.data() as Record<string, unknown>;
}

/**
 * Landing page hero görsel config'ini günceller
 */
export async function updateLandingHeroConfig(updates: Record<string, unknown>): Promise<void> {
  const docRef = getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc(LANDING_HERO_DOC);

  const doc = await docRef.get();
  const currentData = doc.exists ? doc.data() || {} : {};

  await docRef.set({
    ...currentData,
    ...updates,
    updatedAt: Date.now(),
  });
}

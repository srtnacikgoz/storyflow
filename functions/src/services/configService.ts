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
  FirestoreBusinessContextConfig,
  FirestorePromptStudioConfig,
  PromptTemplate,
  PromptVersion,
  PromptStageId,
  GlobalOrchestratorConfig,
  FirestoreAssetSelectionConfig,
  FirestoreRuleEngineConfig,
} from "../orchestrator/types";
import { getCategories as getCategoriesFromService } from "./categoryService";
import {
  getAllSeedData,
  DEFAULT_TIMEOUTS_CONFIG,
  DEFAULT_SYSTEM_SETTINGS_CONFIG,
  DEFAULT_FIXED_ASSETS_CONFIG,
  DEFAULT_BUSINESS_CONTEXT_CONFIG,
  DEFAULT_ASSET_SELECTION_CONFIG,
  DEFAULT_PROMPT_STUDIO_CONFIG,
  DEFAULT_PROMPT_TEMPLATES,
  DEFAULT_RULE_ENGINE_CONFIG,
} from "../orchestrator/seed/defaultData";

// PROMPT STUDIO FONKSIYONLARI
/**
 * Belirli bir prompt template'i getirir
 * Firestore'dan okur, yoksa DEFAULT_PROMPT_TEMPLATES'den döner
 */
export async function getPromptTemplate(id: PromptStageId): Promise<PromptTemplate> {
  const config = await getPromptStudioConfig();
  const template = config.prompts[id];

  if (!template) {
    // Fallback: Default template'den oluştur
    const defaultTemplate = DEFAULT_PROMPT_TEMPLATES[id];
    if (defaultTemplate) {
      return {
        ...defaultTemplate,
        updatedAt: Date.now(),
      } as PromptTemplate;
    }
    throw new Error(`Prompt template not found: ${id}`);
  }

  return template;
}

/**
 * Prompt template'i günceller
 * Eski versiyonu history'ye ekler
 */
export async function updatePromptTemplate(
  id: PromptStageId,
  prompt: string,
  updatedBy?: string,
  note?: string
): Promise<PromptTemplate> {
  const db = admin.firestore();
  const docRef = db.collection("global").doc("config").collection("settings").doc("prompt-studio");

  const config = await getPromptStudioConfig();
  const existingTemplate = config.prompts[id];

  if (!existingTemplate) {
    throw new Error(`Prompt template not found: ${id}`);
  }

  // Yeni versiyon oluştur
  const newVersion = existingTemplate.version + 1;
  const now = Date.now();

  // Eski versiyonu history'ye ekle (max 10 versiyon tut)
  const historyEntry: PromptVersion = {
    version: existingTemplate.version,
    systemPrompt: existingTemplate.systemPrompt,
    updatedAt: existingTemplate.updatedAt,
    updatedBy: existingTemplate.updatedBy,
  };

  const updatedHistory = [historyEntry, ...(existingTemplate.history || [])].slice(0, 10);

  // Güncel template
  const updatedTemplate: PromptTemplate = {
    ...existingTemplate,
    systemPrompt: prompt,
    version: newVersion,
    history: updatedHistory,
    updatedAt: now,
    updatedBy,
  };

  // Firestore'a kaydet
  await docRef.update({
    [`prompts.${id}`]: updatedTemplate,
    updatedAt: now,
    updatedBy,
  });

  // Cache'i temizle
  clearPromptStudioCache();

  console.log(`[ConfigService] Prompt template updated: ${id} v${newVersion}`);
  return updatedTemplate;
}

/**
 * Prompt template'i eski bir versiyona geri döndürür
 */
export async function revertPromptTemplate(
  id: PromptStageId,
  version: number,
  updatedBy?: string
): Promise<PromptTemplate> {
  const config = await getPromptStudioConfig();
  const existingTemplate = config.prompts[id];

  if (!existingTemplate) {
    throw new Error(`Prompt template not found: ${id}`);
  }

  // History'den ilgili versiyonu bul
  const targetVersion = existingTemplate.history?.find((h) => h.version === version);
  if (!targetVersion) {
    throw new Error(`Version ${version} not found in history for ${id}`);
  }

  // Eski prompt'u geri yükle
  return updatePromptTemplate(id, targetVersion.systemPrompt, updatedBy, `Reverted to v${version}`);
}
export function clearPromptStudioCache(): void {
  promptStudioCache = null;
  promptStudioCacheTimestamp = 0;
  console.log("[ConfigService] Prompt Studio cache cleared");
}

export function interpolatePrompt(template: string, variables: Record<string, any>): string {
  // Template değişkenlerini ({{variable}}) gerçek değerlerle değiştir
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(value ?? "");
  }
  return result;
}

// Cache süresi (5 dakika)
const CACHE_TTL = 5 * 60 * 1000;

// Cache
let configCache: GlobalOrchestratorConfig | null = null;
let cacheTimestamp = 0;

// System Settings Cache (ayrı cache - daha sık kullanılıyor)
let systemSettingsCache: FirestoreSystemSettingsConfig | null = null;
let systemSettingsCacheTimestamp = 0;

// Prompt Studio Cache (ayrı cache - pipeline'da sık kullanılıyor)
let promptStudioCache: FirestorePromptStudioConfig | null = null;
let promptStudioCacheTimestamp = 0;

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
 * Cloudinary feature flag'ini kontrol eder
 * true: Cloudinary URL varsa Cloudinary'den yükle (tercih)
 * false: Her zaman Firebase Storage kullan (rollback)
 *
 * @returns boolean - Cloudinary kullanılıp kullanılmayacağı
 */
export async function isCloudinaryEnabled(): Promise<boolean> {
  try {
    const settings = await getSystemSettings();
    // undefined ise varsayılan olarak true (Cloudinary aktif)
    return settings.useCloudinary !== false;
  } catch (error) {
    console.warn("[ConfigService] Failed to read useCloudinary flag, defaulting to true:", error);
    return true;
  }
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
 * İşletme bağlamını getirir
 * Document: global/config/settings/business-context
 *
 * SaaS uyumlu: Her tenant kendi işletme bağlamını tanımlayabilir.
 * Bu bilgiler prompt'a eklenerek AI'ın doğru mekan/ortam üretmesini sağlar.
 */
export async function getBusinessContext(): Promise<FirestoreBusinessContextConfig> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("business-context")
    .get();

  if (!doc.exists) {
    // Varsayılan değerleri döndür
    return {
      ...DEFAULT_BUSINESS_CONTEXT_CONFIG,
      updatedAt: Date.now(),
    };
  }

  return doc.data() as FirestoreBusinessContextConfig;
}

/**
 * Prompt Studio config'ini getirir (CACHE'Lİ)
 * Document: global/config/settings/prompt-studio
 *
 * 5 system prompt'u tek bir dokümanda saklar.
 * Fallback: Firestore okunamazsa hardcoded default'lar kullanılır.
 */
export async function getPromptStudioConfig(): Promise<FirestorePromptStudioConfig> {
  const now = Date.now();

  // Cache geçerliyse döndür
  if (promptStudioCache && now - promptStudioCacheTimestamp < CACHE_TTL) {
    return promptStudioCache;
  }

  try {
    const doc = await getDb()
      .collection("global")
      .doc("config")
      .collection("settings")
      .doc("prompt-studio")
      .get();

    if (!doc.exists) {
      // Varsayılan değerleri döndür ve cache'le
      const defaultConfig: FirestorePromptStudioConfig = {
        ...DEFAULT_PROMPT_STUDIO_CONFIG,
        prompts: Object.fromEntries(
          Object.entries(DEFAULT_PROMPT_TEMPLATES).map(([key, template]) => [
            key,
            { ...template, updatedAt: now },
          ])
        ) as FirestorePromptStudioConfig["prompts"],
        updatedAt: now,
      };
      promptStudioCache = defaultConfig;
      promptStudioCacheTimestamp = now;
      return defaultConfig;
    }

    // Cache'e kaydet
    promptStudioCache = doc.data() as FirestorePromptStudioConfig;
    promptStudioCacheTimestamp = now;

    return promptStudioCache;
  } catch (error) {
    console.error("[ConfigService] Error loading prompt studio, using defaults:", error);
    // Hata durumunda fallback: hardcoded default'lar
    const fallbackConfig: FirestorePromptStudioConfig = {
      ...DEFAULT_PROMPT_STUDIO_CONFIG,
      prompts: Object.fromEntries(
        Object.entries(DEFAULT_PROMPT_TEMPLATES).map(([key, template]) => [
          key,
          { ...template, updatedAt: now },
        ])
      ) as FirestorePromptStudioConfig["prompts"],
      updatedAt: now,
    };
    return fallbackConfig;
  }
}

/**
 * Rule Engine config'ini getirir
 * Document: global/config/settings/rule-engine
 */
export async function getRuleEngineConfig(): Promise<FirestoreRuleEngineConfig> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("rule-engine")
    .get();

  if (!doc.exists) {
    // Return defaults if not exists
    return {
      ...DEFAULT_RULE_ENGINE_CONFIG,
      updatedAt: Date.now(),
    };
  }

  return doc.data() as FirestoreRuleEngineConfig;
}

/**
 * Rule Engine config'ini günceller
 * Doküman yoksa oluşturur (set + merge)
 */
export async function updateRuleEngineConfig(
  updates: Partial<FirestoreRuleEngineConfig>
): Promise<void> {
  await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("rule-engine")
    .set({
      ...updates,
      updatedAt: Date.now(),
    }, { merge: true });

  clearConfigCache();
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
    businessContext,
    assetSelectionConfig,
    promptStudio,
    categories,
    ruleEngine,
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
    getBusinessContext(),
    getAssetSelectionConfig(),
    getPromptStudioConfig(),
    getCategoriesFromService(),
    getRuleEngineConfig(),
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
    businessContext,
    assetSelectionConfig,
    promptStudio,
    categories,
    ruleEngine,
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
  promptStudioCache = null;
  promptStudioCacheTimestamp = 0;
  console.log("[ConfigService] Cache cleared (including system settings + prompt studio)");
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
  batch.set(configRef.doc("business-context"), seedData.businessContextConfig);
  batch.set(configRef.doc("asset-selection"), seedData.assetSelectionConfig);
  batch.set(configRef.doc("prompt-studio"), seedData.promptStudioConfig);
  batch.set(configRef.doc("rule-engine"), seedData.ruleEngineConfig);

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

/**
 * İşletme bağlamını günceller
 * Document: global/config/settings/business-context
 *
 * SaaS uyumlu: Her tenant kendi işletme bağlamını tanımlayabilir.
 * Bu bilgiler prompt'a eklenerek AI'ın doğru mekan/ortam üretmesini sağlar.
 *
 * ÖNEMLİ: promptContext alanı AI prompt'una doğrudan eklenir.
 * "NO high-rise views" gibi negatif direktifler burada belirtilmeli.
 */
export async function updateBusinessContext(
  updates: Partial<FirestoreBusinessContextConfig>
): Promise<void> {
  const docRef = getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("business-context");

  const doc = await docRef.get();

  if (!doc.exists) {
    // Doküman yoksa oluştur
    await docRef.set({
      ...DEFAULT_BUSINESS_CONTEXT_CONFIG,
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
  console.log("[ConfigService] Business context updated:", Object.keys(updates));
}

/**
 * Asset seçim kurallarını getirir
 * Document: global/config/settings/asset-selection
 *
 * İki farklı mod için ayrı kurallar:
 * - manual: "Şimdi Üret" butonu
 * - scheduled: Otomatik pipeline
 */
export async function getAssetSelectionConfig(): Promise<FirestoreAssetSelectionConfig> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("asset-selection")
    .get();

  if (!doc.exists) {
    // Varsayılan değerleri döndür
    return {
      ...DEFAULT_ASSET_SELECTION_CONFIG,
      updatedAt: Date.now(),
    };
  }

  return doc.data() as FirestoreAssetSelectionConfig;
}

/**
 * Asset seçim kurallarını günceller
 * Document: global/config/settings/asset-selection
 *
 * Her kategori için enabled/disabled durumu günceller.
 */
export async function updateAssetSelectionConfig(
  updates: Partial<FirestoreAssetSelectionConfig>
): Promise<void> {
  const docRef = getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("asset-selection");

  const doc = await docRef.get();

  if (!doc.exists) {
    // Doküman yoksa oluştur
    await docRef.set({
      ...DEFAULT_ASSET_SELECTION_CONFIG,
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
  console.log("[ConfigService] Asset selection config updated:", Object.keys(updates));
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

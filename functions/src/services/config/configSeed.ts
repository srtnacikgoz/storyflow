/**
 * Config Seed — Seed ve init fonksiyonları
 * İlk kurulumda veya reset için Firestore'a varsayılan veriler yükler.
 */

import { getDb, clearConfigCache } from "./configCache";
import { getAllSeedData } from "../../orchestrator/seed/defaultData";

/**
 * Seed data'yı Firestore'a yükler
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

  clearConfigCache();

  console.log("[ConfigService] Seed completed successfully");
}

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

/**
 * Config Updaters — Tüm update fonksiyonları
 * Firestore config dokümanlarını günceller.
 */

import {
  FirestoreDiversityRules,
  FirestoreAbsoluteRulesConfig,
  FirestoreOrchestratorInstructions,
  FirestoreTimeoutsConfig,
  FirestoreSystemSettingsConfig,
  FirestoreFixedAssetsConfig,
  FirestoreBusinessContextConfig,
  FirestoreAssetSelectionConfig,
  FirestoreRuleEngineConfig,
} from "../../orchestrator/types";
import {
  DEFAULT_TIMEOUTS_CONFIG,
  DEFAULT_SYSTEM_SETTINGS_CONFIG,
  DEFAULT_FIXED_ASSETS_CONFIG,
  DEFAULT_BUSINESS_CONTEXT_CONFIG,
  DEFAULT_ASSET_SELECTION_CONFIG,
  DEFAULT_RULE_ENGINE_CONFIG,
} from "../../orchestrator/seed/defaultData";
import { getDb, clearConfigCache } from "./configCache";

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
    await docRef.set({
      ...DEFAULT_TIMEOUTS_CONFIG,
      ...updates,
      updatedAt: Date.now(),
    });
  } else {
    await docRef.update({
      ...updates,
      updatedAt: Date.now(),
    });
  }

  clearConfigCache();
}

/**
 * Sistem ayarlarını günceller
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
    await docRef.set({
      ...DEFAULT_SYSTEM_SETTINGS_CONFIG,
      ...updates,
      updatedAt: Date.now(),
    });
  } else {
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
    await docRef.set({
      ...DEFAULT_FIXED_ASSETS_CONFIG,
      ...updates,
      updatedAt: Date.now(),
    });
  } else {
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
    await docRef.set({
      ...DEFAULT_BUSINESS_CONTEXT_CONFIG,
      ...updates,
      updatedAt: Date.now(),
    });
  } else {
    await docRef.update({
      ...updates,
      updatedAt: Date.now(),
    });
  }

  clearConfigCache();
  console.log("[ConfigService] Business context updated:", Object.keys(updates));
}

/**
 * Asset seçim kurallarını günceller
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
    await docRef.set({
      ...DEFAULT_ASSET_SELECTION_CONFIG,
      ...updates,
      updatedAt: Date.now(),
    });
  } else {
    await docRef.update({
      ...updates,
      updatedAt: Date.now(),
    });
  }

  clearConfigCache();
  console.log("[ConfigService] Asset selection config updated:", Object.keys(updates));
}

/**
 * Rule Engine config'ini günceller
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

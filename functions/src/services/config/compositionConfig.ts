/**
 * Composition Config — Slot tanımları ve kompozisyon template CRUD
 */

import {
  FirestoreSlotDefinitionsConfig,
  SlotDefinition,
  CompositionTemplate,
  DEFAULT_SLOT_DEFINITIONS,
  ProductSlotDefaults,
  DEFAULT_PRODUCT_SLOT_DEFAULTS,
} from "../../orchestrator/types";
import { CACHE_TTL, getDb, registerCacheClear, clearConfigCache } from "./configCache";

// Slot Definitions Cache
let slotDefinitionsCache: FirestoreSlotDefinitionsConfig | null = null;
let slotDefinitionsCacheTimestamp = 0;

// Cache temizleme kaydı
registerCacheClear(() => {
  slotDefinitionsCache = null;
  slotDefinitionsCacheTimestamp = 0;
});

// ==========================================
// SLOT DEFINITIONS
// ==========================================

/**
 * Slot tanımlarını getirir (CACHE'Lİ)
 * Document: global/config/settings/slot-definitions
 */
export async function getSlotDefinitions(): Promise<FirestoreSlotDefinitionsConfig> {
  const now = Date.now();

  if (slotDefinitionsCache && now - slotDefinitionsCacheTimestamp < CACHE_TTL) {
    return slotDefinitionsCache;
  }

  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("slot-definitions")
    .get();

  if (!doc.exists) {
    const defaultConfig: FirestoreSlotDefinitionsConfig = {
      slots: DEFAULT_SLOT_DEFINITIONS,
      updatedAt: Date.now(),
    };
    slotDefinitionsCache = defaultConfig;
    slotDefinitionsCacheTimestamp = now;
    return defaultConfig;
  }

  slotDefinitionsCache = doc.data() as FirestoreSlotDefinitionsConfig;
  slotDefinitionsCacheTimestamp = now;
  return slotDefinitionsCache;
}

/**
 * Slot tanımlarını günceller
 */
export async function updateSlotDefinitions(
  slots: SlotDefinition[],
  updatedBy?: string
): Promise<FirestoreSlotDefinitionsConfig> {
  const config: FirestoreSlotDefinitionsConfig = {
    slots,
    updatedAt: Date.now(),
    updatedBy,
  };

  await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("slot-definitions")
    .set(config);

  slotDefinitionsCache = null;
  slotDefinitionsCacheTimestamp = 0;

  console.log(`[ConfigService] Slot definitions updated: ${slots.length} slots`);
  return config;
}

// ==========================================
// PRODUCT SLOT DEFAULTS
// ==========================================

/**
 * Ürün tipine göre slot varsayılanlarını getirir
 * Document: global/config/settings/product-slot-defaults
 */
export async function getProductSlotDefaults(): Promise<ProductSlotDefaults> {
  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("product-slot-defaults")
    .get();

  if (!doc.exists) {
    return {
      defaults: DEFAULT_PRODUCT_SLOT_DEFAULTS,
      updatedAt: Date.now(),
    };
  }

  return doc.data() as ProductSlotDefaults;
}

/**
 * Ürün tipine göre slot varsayılanlarını günceller
 */
export async function updateProductSlotDefaults(
  defaults: Record<string, Record<string, boolean>>,
  updatedBy?: string
): Promise<void> {
  const docRef = getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("product-slot-defaults");

  const data: Record<string, unknown> = {
    defaults,
    updatedAt: Date.now(),
  };
  if (updatedBy) data.updatedBy = updatedBy;

  await docRef.set(data);

  clearConfigCache();
  console.log(`[ConfigService] Product slot defaults updated: ${Object.keys(defaults).length} product types`);
}

// ==========================================
// COMPOSITION TEMPLATE CRUD
// ==========================================

/**
 * System template'lerini getirir
 */
export async function getSystemTemplates(): Promise<CompositionTemplate[]> {
  const snapshot = await getDb()
    .collection("global")
    .doc("compositionTemplates")
    .collection("items")
    .orderBy("updatedAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as CompositionTemplate[];
}

/**
 * Tenant preset'lerini getirir
 */
export async function getTenantPresets(tenantId: string): Promise<CompositionTemplate[]> {
  const snapshot = await getDb()
    .collection("tenants")
    .doc(tenantId)
    .collection("presets")
    .orderBy("updatedAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as CompositionTemplate[];
}

/**
 * Tek bir template/preset getirir
 */
export async function getCompositionTemplate(
  id: string,
  type: "system" | "tenant",
  tenantId?: string
): Promise<CompositionTemplate | null> {
  let doc;

  if (type === "system") {
    doc = await getDb()
      .collection("global")
      .doc("compositionTemplates")
      .collection("items")
      .doc(id)
      .get();
  } else {
    if (!tenantId) throw new Error("tenantId gerekli (tenant preset için)");
    doc = await getDb()
      .collection("tenants")
      .doc(tenantId)
      .collection("presets")
      .doc(id)
      .get();
  }

  if (!doc.exists) return null;

  return { ...doc.data(), id: doc.id } as CompositionTemplate;
}

/**
 * Yeni composition template oluşturur
 */
export async function createCompositionTemplate(
  data: Omit<CompositionTemplate, "id" | "createdAt" | "updatedAt">
): Promise<CompositionTemplate> {
  const now = Date.now();
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) cleanData[key] = value;
  }
  const templateData = {
    ...cleanData,
    createdAt: now,
    updatedAt: now,
  };

  let docRef;

  if (data.type === "system") {
    docRef = await getDb()
      .collection("global")
      .doc("compositionTemplates")
      .collection("items")
      .add(templateData);
  } else {
    if (!data.tenantId) throw new Error("tenantId gerekli (tenant preset için)");
    docRef = await getDb()
      .collection("tenants")
      .doc(data.tenantId)
      .collection("presets")
      .add(templateData);
  }

  console.log(`[ConfigService] Composition template created: ${docRef.id} (${data.type})`);
  return { ...templateData, id: docRef.id } as CompositionTemplate;
}

/**
 * Composition template günceller
 */
export async function updateCompositionTemplate(
  id: string,
  type: "system" | "tenant",
  updates: Partial<Omit<CompositionTemplate, "id" | "type" | "createdAt">>,
  tenantId?: string
): Promise<void> {
  const cleanUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) cleanUpdates[key] = value;
  }
  const updateData = {
    ...cleanUpdates,
    updatedAt: Date.now(),
  };

  if (type === "system") {
    await getDb()
      .collection("global")
      .doc("compositionTemplates")
      .collection("items")
      .doc(id)
      .update(updateData);
  } else {
    if (!tenantId) throw new Error("tenantId gerekli (tenant preset için)");
    await getDb()
      .collection("tenants")
      .doc(tenantId)
      .collection("presets")
      .doc(id)
      .update(updateData);
  }

  console.log(`[ConfigService] Composition template updated: ${id} (${type})`);
}

/**
 * Composition template siler
 */
export async function deleteCompositionTemplate(
  id: string,
  type: "system" | "tenant",
  tenantId?: string
): Promise<void> {
  if (type === "system") {
    await getDb()
      .collection("global")
      .doc("compositionTemplates")
      .collection("items")
      .doc(id)
      .delete();
  } else {
    if (!tenantId) throw new Error("tenantId gerekli (tenant preset için)");
    await getDb()
      .collection("tenants")
      .doc(tenantId)
      .collection("presets")
      .doc(id)
      .delete();
  }

  console.log(`[ConfigService] Composition template deleted: ${id} (${type})`);
}

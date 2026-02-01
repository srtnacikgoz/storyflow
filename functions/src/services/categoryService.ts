/**
 * Category Service - Dinamik Kategori Yönetimi (v2 - ID-Based)
 *
 * Bu servis Firestore'da saklanan dinamik kategorileri yönetir.
 *
 * ID-Based Architecture:
 * - Her subType'ın unique bir ID'si vardır
 * - Referanslar (Asset.subTypeId, TimeSlotRule.productTypeIds) ID kullanır
 * - Slug'lar sadece UI/display için tutulur, immutable
 *
 * Document: global/config/settings/categories
 */

import { db } from "../config/firebase";
import {
  DynamicCategory,
  CategorySubType,
  FirestoreCategoriesConfig,
  DEFAULT_CATEGORIES,
  DynamicCategoryType,
  isValidCategorySlug,
  KNOWN_PRODUCT_TYPES,
  generateSubTypeId,
  generateUniqueSubTypeId,
} from "../orchestrator/types";

// Cache
let categoriesCache: FirestoreCategoriesConfig | null = null;
let cacheTimestamp = 0;

// Collection path
const CATEGORIES_DOC_PATH = "global/config/settings/categories";

/**
 * Cache'i temizle
 */
export function clearCategoriesCache(): void {
  categoriesCache = null;
  cacheTimestamp = 0;
  console.log("[CategoryService] Cache temizlendi");
}

/**
 * Cache geçerli mi kontrol et
 */
function isCacheValid(cacheTTLMinutes?: number): boolean {
  if (!categoriesCache) return false;

  const ttlMs = (cacheTTLMinutes || 5) * 60 * 1000;
  const now = Date.now();
  return now - cacheTimestamp < ttlMs;
}

/**
 * Tüm kategorileri getir
 * Cache varsa cache'den, yoksa Firestore'dan okur
 */
export async function getCategories(): Promise<FirestoreCategoriesConfig> {
  // Cache kontrolü
  if (isCacheValid(categoriesCache?.cacheTTLMinutes)) {
    return categoriesCache!;
  }

  try {
    const doc = await db.doc(CATEGORIES_DOC_PATH).get();

    if (!doc.exists) {
      // Döküman yoksa varsayılan kategorileri seed et
      console.log("[CategoryService] Kategoriler bulunamadı, seed ediliyor...");
      return await seedDefaultCategories();
    }

    const data = doc.data() as FirestoreCategoriesConfig;

    // Cache'e kaydet
    categoriesCache = data;
    cacheTimestamp = Date.now();

    console.log(`[CategoryService] ${data.categories.length} kategori yüklendi`);
    return data;
  } catch (error) {
    console.error("[CategoryService] Kategoriler yüklenemedi:", error);
    throw error;
  }
}

/**
 * Belirli bir kategori türünü getir
 */
export async function getCategoryByType(type: DynamicCategoryType): Promise<DynamicCategory | null> {
  const config = await getCategories();
  return config.categories.find((c) => c.type === type && !c.isDeleted) || null;
}

/**
 * Belirli bir kategori türünün alt kategorilerini getir
 * Sadece aktif olanları döner
 */
export async function getSubTypesByCategory(type: DynamicCategoryType): Promise<CategorySubType[]> {
  const category = await getCategoryByType(type);
  if (!category) return [];

  return category.subTypes
    .filter((st) => st.isActive)
    .sort((a, b) => a.order - b.order);
}

/**
 * Belirli bir kategori türünün slug listesini getir
 * TimeSlotRule.productTypes için kullanılır
 */
export async function getSubTypeSlugs(type: DynamicCategoryType): Promise<string[]> {
  const subTypes = await getSubTypesByCategory(type);
  return subTypes.map((st) => st.slug);
}

/**
 * Tüm ürün kategorisi slug'larını getir (products kategorisi)
 * KNOWN_PRODUCT_TYPES + dinamik eklenenler
 */
export async function getAllProductSlugs(): Promise<string[]> {
  const subTypes = await getSubTypesByCategory("products");
  const dynamicSlugs = subTypes.map((st) => st.slug);

  // Bilinen kategorilerle birleştir (unique)
  const allSlugs = new Set([...KNOWN_PRODUCT_TYPES, ...dynamicSlugs]);
  return Array.from(allSlugs);
}

/**
 * Slug validation - verilen slug geçerli mi?
 */
export async function validateSlug(slug: string, categoryType: DynamicCategoryType): Promise<boolean> {
  const validSlugs = await getSubTypeSlugs(categoryType);
  return isValidCategorySlug(slug, validSlugs);
}

/**
 * Yeni alt kategori ekle
 * ID otomatik üretilir, Slug immutable
 */
export async function addSubType(
  categoryType: DynamicCategoryType,
  subType: Omit<CategorySubType, "order" | "id">
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const config = await getCategories();
    const categoryIndex = config.categories.findIndex((c) => c.type === categoryType);

    if (categoryIndex === -1) {
      return { success: false, error: `Kategori bulunamadı: ${categoryType}` };
    }

    const category = config.categories[categoryIndex];

    // Slug benzersizlik kontrolü
    const existingSlug = category.subTypes.find(
      (st) => st.slug.toLowerCase() === subType.slug.toLowerCase()
    );
    if (existingSlug) {
      return { success: false, error: `Bu slug zaten mevcut: ${subType.slug}` };
    }

    // Slug format kontrolü (sadece küçük harf, rakam ve tire)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(subType.slug)) {
      return {
        success: false,
        error: "Slug sadece küçük harf, rakam ve tire içerebilir",
      };
    }

    // Yeni order hesapla
    const maxOrder = Math.max(...category.subTypes.map((st) => st.order), 0);

    // ID üret - yeni kategoriler için unique ID
    const subTypeId = generateUniqueSubTypeId(categoryType, subType.slug);

    // Yeni alt kategoriyi ekle (undefined değerleri filtrele - Firestore kabul etmez)
    const newSubType: CategorySubType = {
      id: subTypeId,
      slug: subType.slug,
      displayName: subType.displayName,
      order: maxOrder + 1,
      isActive: subType.isActive ?? true,
      ...(subType.icon !== undefined && { icon: subType.icon }),
      ...(subType.description !== undefined && { description: subType.description }),
      ...(subType.eatingMethodDefault !== undefined && { eatingMethodDefault: subType.eatingMethodDefault }),
      ...(subType.canBeHeldDefault !== undefined && { canBeHeldDefault: subType.canBeHeldDefault }),
    };

    category.subTypes.push(newSubType);
    category.updatedAt = Date.now();

    config.updatedAt = Date.now();

    // Firestore'a kaydet
    await db.doc(CATEGORIES_DOC_PATH).set(config);

    // Cache'i temizle
    clearCategoriesCache();

    console.log(`[CategoryService] Yeni alt kategori eklendi: ${categoryType}/${subType.slug} (ID: ${subTypeId})`);
    return { success: true, id: subTypeId };
  } catch (error) {
    console.error("[CategoryService] Alt kategori eklenemedi:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Alt kategori güncelle
 * NOT: ID ve Slug değiştirilemez, sadece displayName, icon, description, isActive değişebilir
 */
export async function updateSubType(
  categoryType: DynamicCategoryType,
  slug: string,
  updates: Partial<Omit<CategorySubType, "slug" | "id">>
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getCategories();
    const categoryIndex = config.categories.findIndex((c) => c.type === categoryType);

    if (categoryIndex === -1) {
      return { success: false, error: `Kategori bulunamadı: ${categoryType}` };
    }

    const category = config.categories[categoryIndex];
    const subTypeIndex = category.subTypes.findIndex((st) => st.slug === slug);

    if (subTypeIndex === -1) {
      return { success: false, error: `Alt kategori bulunamadı: ${slug}` };
    }

    const existingSubType = category.subTypes[subTypeIndex];

    // Güncelle (undefined değerleri filtrele - Firestore kabul etmez)
    const filteredUpdates: Partial<CategorySubType> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        (filteredUpdates as Record<string, unknown>)[key] = value;
      }
    });

    category.subTypes[subTypeIndex] = {
      ...existingSubType,
      ...filteredUpdates,
      id: existingSubType.id, // ID değiştirilmesini engelle
      slug: existingSubType.slug, // Slug değiştirilmesini engelle
    };

    category.updatedAt = Date.now();
    config.updatedAt = Date.now();

    // Firestore'a kaydet
    await db.doc(CATEGORIES_DOC_PATH).set(config);

    // Cache'i temizle
    clearCategoriesCache();

    console.log(`[CategoryService] Alt kategori güncellendi: ${categoryType}/${slug}`);
    return { success: true };
  } catch (error) {
    console.error("[CategoryService] Alt kategori güncellenemedi:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Alt kategoriyi deaktif et (soft delete)
 * Mevcut referanslar korunur ama yeni seçimlerde görünmez
 */
export async function deactivateSubType(
  categoryType: DynamicCategoryType,
  slug: string
): Promise<{ success: boolean; error?: string }> {
  return updateSubType(categoryType, slug, { isActive: false });
}

/**
 * Alt kategoriyi aktif et
 */
export async function activateSubType(
  categoryType: DynamicCategoryType,
  slug: string
): Promise<{ success: boolean; error?: string }> {
  return updateSubType(categoryType, slug, { isActive: true });
}

/**
 * Alt kategorilerin sırasını güncelle
 */
export async function reorderSubTypes(
  categoryType: DynamicCategoryType,
  slugOrder: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getCategories();
    const categoryIndex = config.categories.findIndex((c) => c.type === categoryType);

    if (categoryIndex === -1) {
      return { success: false, error: `Kategori bulunamadı: ${categoryType}` };
    }

    const category = config.categories[categoryIndex];

    // Sırayı güncelle
    slugOrder.forEach((slug, index) => {
      const subType = category.subTypes.find((st) => st.slug === slug);
      if (subType) {
        subType.order = index + 1;
      }
    });

    // Sırala
    category.subTypes.sort((a, b) => a.order - b.order);

    category.updatedAt = Date.now();
    config.updatedAt = Date.now();

    // Firestore'a kaydet
    await db.doc(CATEGORIES_DOC_PATH).set(config);

    // Cache'i temizle
    clearCategoriesCache();

    console.log(`[CategoryService] Alt kategoriler yeniden sıralandı: ${categoryType}`);
    return { success: true };
  } catch (error) {
    console.error("[CategoryService] Alt kategoriler sıralanamadı:", error);
    return { success: false, error: String(error) };
  }
}

// ==========================================
// MAIN CATEGORY MANAGEMENT
// ==========================================

/**
 * Yeni ana kategori ekle
 * NOT: Bu fonksiyon yeni bir ana kategori tipi oluşturur.
 * Örn: "beverages" gibi yeni bir kategori tipi.
 *
 * ÖNEMLİ: Yeni ana kategoriler orchestrator'da loadAvailableAssets()
 * güncellemesi gerektirebilir. Alt kategoriler (subTypes) için bu gerekli değil.
 */
export async function addMainCategory(
  category: Omit<DynamicCategory, "createdAt" | "updatedAt" | "subTypes"> & { subTypes?: CategorySubType[] }
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getCategories();

    // Type benzersizlik kontrolü
    const existingCategory = config.categories.find(
      (c) => c.type.toLowerCase() === category.type.toLowerCase()
    );
    if (existingCategory) {
      return { success: false, error: `Bu kategori tipi zaten mevcut: ${category.type}` };
    }

    // Type format kontrolü (sadece küçük harf ve tire)
    const typeRegex = /^[a-z-]+$/;
    if (!typeRegex.test(category.type)) {
      return {
        success: false,
        error: "Kategori tipi sadece küçük harf ve tire içerebilir",
      };
    }

    const now = Date.now();

    // Yeni order hesapla
    const maxOrder = Math.max(...config.categories.map((c) => c.order), 0);

    // Yeni kategoriyi oluştur
    const newCategory: DynamicCategory = {
      type: category.type as DynamicCategoryType,
      displayName: category.displayName,
      icon: category.icon,
      description: category.description,
      order: maxOrder + 1,
      isSystem: false, // Kullanıcı ekledi, silinebilir
      isDeleted: false,
      subTypes: category.subTypes || [],
      createdAt: now,
      updatedAt: now,
    };

    config.categories.push(newCategory);
    config.updatedAt = now;

    // Firestore'a kaydet
    await db.doc(CATEGORIES_DOC_PATH).set(config);

    // Cache'i temizle
    clearCategoriesCache();

    console.log(`[CategoryService] Yeni ana kategori eklendi: ${category.type}`);
    return { success: true };
  } catch (error) {
    console.error("[CategoryService] Ana kategori eklenemedi:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Ana kategoriyi güncelle (type değiştirilemez)
 */
export async function updateMainCategory(
  type: string,
  updates: Partial<Omit<DynamicCategory, "type" | "createdAt" | "subTypes">>
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getCategories();
    const categoryIndex = config.categories.findIndex((c) => c.type === type);

    if (categoryIndex === -1) {
      return { success: false, error: `Kategori bulunamadı: ${type}` };
    }

    const existingCategory = config.categories[categoryIndex];

    // Sistem kategorileri için bazı kısıtlamalar
    if (existingCategory.isSystem && updates.isDeleted === true) {
      return { success: false, error: "Sistem kategorileri silinemez" };
    }

    // Güncelle (undefined değerleri filtrele)
    const filteredUpdates: Partial<DynamicCategory> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        (filteredUpdates as Record<string, unknown>)[key] = value;
      }
    });

    config.categories[categoryIndex] = {
      ...existingCategory,
      ...filteredUpdates,
      type: existingCategory.type, // Type değiştirilmesini engelle
      updatedAt: Date.now(),
    };

    config.updatedAt = Date.now();

    // Firestore'a kaydet
    await db.doc(CATEGORIES_DOC_PATH).set(config);

    // Cache'i temizle
    clearCategoriesCache();

    console.log(`[CategoryService] Ana kategori güncellendi: ${type}`);
    return { success: true };
  } catch (error) {
    console.error("[CategoryService] Ana kategori güncellenemedi:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Ana kategoriyi sil (soft delete)
 * NOT: Sistem kategorileri silinemez
 */
export async function deleteMainCategory(type: string): Promise<{ success: boolean; error?: string }> {
  return updateMainCategory(type, { isDeleted: true });
}

/**
 * Varsayılan kategorileri seed et (v2 - ID-Based)
 */
export async function seedDefaultCategories(): Promise<FirestoreCategoriesConfig> {
  const now = Date.now();

  const categories: DynamicCategory[] = DEFAULT_CATEGORIES.map((cat) => ({
    ...cat,
    createdAt: now,
    updatedAt: now,
  }));

  const config: FirestoreCategoriesConfig = {
    categories,
    cacheTTLMinutes: 5,
    version: "2.0.0", // ID-based version
    updatedAt: now,
  };

  await db.doc(CATEGORIES_DOC_PATH).set(config);

  // Cache'e kaydet
  categoriesCache = config;
  cacheTimestamp = now;

  console.log(`[CategoryService] ${categories.length} varsayılan kategori seed edildi (v2 ID-based)`);
  return config;
}

/**
 * Kategori slug'ını displayName'e çevir
 * UI'da gösterim için kullanılır
 */
export async function getDisplayName(
  categoryType: DynamicCategoryType,
  slug: string
): Promise<string> {
  const subTypes = await getSubTypesByCategory(categoryType);
  const subType = subTypes.find((st) => st.slug === slug);
  return subType?.displayName || slug;
}

/**
 * Tüm kategorilerin özet bilgisini getir
 * Dashboard için kullanılır
 */
export async function getCategorySummary(): Promise<
  Array<{
    type: DynamicCategoryType;
    displayName: string;
    icon: string;
    activeCount: number;
    totalCount: number;
  }>
> {
  const config = await getCategories();

  return config.categories
    .filter((c) => !c.isDeleted)
    .map((c) => ({
      type: c.type,
      displayName: c.displayName,
      icon: c.icon,
      activeCount: c.subTypes.filter((st) => st.isActive).length,
      totalCount: c.subTypes.length,
    }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

// ==========================================
// ID-BASED LOOKUP FUNCTIONS (v2)
// ==========================================

/**
 * ID ile alt kategori getir
 * Tüm kategorilerde arar
 */
export async function getSubTypeById(subTypeId: string): Promise<{
  subType: CategorySubType | null;
  categoryType: DynamicCategoryType | null;
}> {
  const config = await getCategories();

  for (const category of config.categories) {
    const subType = category.subTypes.find((st) => st.id === subTypeId);
    if (subType) {
      return { subType, categoryType: category.type };
    }
  }

  return { subType: null, categoryType: null };
}

/**
 * Belirli bir kategori içinde ID ile alt kategori getir
 */
export async function getSubTypeByIdInCategory(
  categoryType: DynamicCategoryType,
  subTypeId: string
): Promise<CategorySubType | null> {
  const subTypes = await getSubTypesByCategory(categoryType);
  return subTypes.find((st) => st.id === subTypeId) || null;
}

/**
 * Slug'dan ID'ye çevir
 * Backward compatibility için
 */
export async function getSubTypeIdBySlug(
  categoryType: DynamicCategoryType,
  slug: string
): Promise<string | null> {
  const subTypes = await getSubTypesByCategory(categoryType);
  const subType = subTypes.find((st) => st.slug === slug);
  return subType?.id || null;
}

/**
 * ID'den Slug'a çevir
 */
export async function getSlugBySubTypeId(subTypeId: string): Promise<string | null> {
  const { subType } = await getSubTypeById(subTypeId);
  return subType?.slug || null;
}

/**
 * Belirli bir kategori türünün ID listesini getir
 * Yeni sistem için - TimeSlotRule.productTypeIds
 */
export async function getSubTypeIds(type: DynamicCategoryType): Promise<string[]> {
  const subTypes = await getSubTypesByCategory(type);
  return subTypes.map((st) => st.id);
}

/**
 * Birden fazla ID'yi slug'lara çevir (batch)
 * Pipeline'da display için kullanılır
 */
export async function getSlugsFromIds(subTypeIds: string[]): Promise<Map<string, string>> {
  const config = await getCategories();
  const result = new Map<string, string>();

  for (const category of config.categories) {
    for (const subType of category.subTypes) {
      if (subTypeIds.includes(subType.id)) {
        result.set(subType.id, subType.slug);
      }
    }
  }

  return result;
}

/**
 * Birden fazla slug'ı ID'lere çevir (batch)
 * Migration için kullanılır
 */
export async function getIdsFromSlugs(
  categoryType: DynamicCategoryType,
  slugs: string[]
): Promise<Map<string, string>> {
  const subTypes = await getSubTypesByCategory(categoryType);
  const result = new Map<string, string>();

  for (const slug of slugs) {
    const subType = subTypes.find((st) => st.slug === slug);
    if (subType) {
      result.set(slug, subType.id);
    }
  }

  return result;
}

/**
 * ID validation - verilen ID geçerli mi?
 * Graceful skip pattern için: geçersiz ID'ler loglanır ama hata fırlatmaz
 */
export async function validateSubTypeId(
  subTypeId: string,
  categoryType?: DynamicCategoryType
): Promise<{ valid: boolean; reason?: string }> {
  if (!subTypeId) {
    return { valid: false, reason: "SubType ID boş" };
  }

  if (categoryType) {
    const subType = await getSubTypeByIdInCategory(categoryType, subTypeId);
    if (!subType) {
      return { valid: false, reason: `ID '${subTypeId}' kategori '${categoryType}' içinde bulunamadı` };
    }
    if (!subType.isActive) {
      return { valid: false, reason: `ID '${subTypeId}' pasif durumda` };
    }
  } else {
    const { subType } = await getSubTypeById(subTypeId);
    if (!subType) {
      return { valid: false, reason: `ID '${subTypeId}' hiçbir kategoride bulunamadı` };
    }
    if (!subType.isActive) {
      return { valid: false, reason: `ID '${subTypeId}' pasif durumda` };
    }
  }

  return { valid: true };
}

// ==========================================
// MIGRATION HELPERS
// ==========================================

/**
 * Mevcut Firestore verilerini ID-based sisteme migrate et
 * Bu fonksiyon bir kere çalıştırılır
 *
 * İşlem:
 * 1. Tüm kategorilerdeki ID'siz subType'lara ID ekle
 * 2. Format: {categoryType}_{slug}
 */
export async function migrateCategoriesToIdBased(): Promise<{
  success: boolean;
  migratedCount: number;
  error?: string;
}> {
  try {
    const config = await getCategories();
    let migratedCount = 0;

    for (const category of config.categories) {
      for (const subType of category.subTypes) {
        // ID yoksa ekle
        if (!subType.id) {
          subType.id = generateSubTypeId(category.type, subType.slug);
          migratedCount++;
          console.log(`[Migration] ID eklendi: ${category.type}/${subType.slug} → ${subType.id}`);
        }
      }
      category.updatedAt = Date.now();
    }

    if (migratedCount > 0) {
      config.updatedAt = Date.now();
      config.version = "2.0.0"; // ID-based version

      await db.doc(CATEGORIES_DOC_PATH).set(config);
      clearCategoriesCache();

      console.log(`[Migration] Toplam ${migratedCount} subType'a ID eklendi`);
    } else {
      console.log("[Migration] Tüm subType'lar zaten ID'ye sahip");
    }

    return { success: true, migratedCount };
  } catch (error) {
    console.error("[Migration] Kategori migration hatası:", error);
    return { success: false, migratedCount: 0, error: String(error) };
  }
}

/**
 * Asset'lerdeki subType (slug) alanlarını subTypeId'ye migrate et
 * Bu fonksiyon mevcut asset'leri günceller
 */
export async function migrateAssetsToIdBased(): Promise<{
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  error?: string;
}> {
  try {
    const assetsRef = db.collection("assets");
    const snapshot = await assetsRef.get();

    let migratedCount = 0;
    let skippedCount = 0;
    const batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      const asset = doc.data();

      // Zaten subTypeId varsa atla
      if (asset.subTypeId) {
        skippedCount++;
        continue;
      }

      // subType (slug) varsa ID'ye çevir
      if (asset.subType && asset.category) {
        const subTypeId = await getSubTypeIdBySlug(asset.category, asset.subType);

        if (subTypeId) {
          batch.update(doc.ref, {
            subTypeId: subTypeId,
            // subType alanını koru (backward compatibility)
            updatedAt: Date.now(),
          });
          migratedCount++;
          batchCount++;

          // Batch limit (500)
          if (batchCount >= 450) {
            await batch.commit();
            batchCount = 0;
          }
        } else {
          console.warn(`[Migration] Asset ${doc.id}: slug '${asset.subType}' için ID bulunamadı`);
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    // Kalan batch'i commit et
    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`[Migration] ${migratedCount} asset migrate edildi, ${skippedCount} atlandı`);
    return { success: true, migratedCount, skippedCount };
  } catch (error) {
    console.error("[Migration] Asset migration hatası:", error);
    return { success: false, migratedCount: 0, skippedCount: 0, error: String(error) };
  }
}

/**
 * TimeSlotRule'lardaki productTypes (slug array) alanlarını productTypeIds'ye migrate et
 */
export async function migrateTimeSlotRulesToIdBased(): Promise<{
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  error?: string;
}> {
  try {
    const rulesRef = db.collection("time-slot-rules");
    const snapshot = await rulesRef.get();

    let migratedCount = 0;
    let skippedCount = 0;
    const batch = db.batch();

    for (const doc of snapshot.docs) {
      const rule = doc.data();

      // Zaten productTypeIds varsa atla
      if (rule.productTypeIds && rule.productTypeIds.length > 0) {
        skippedCount++;
        continue;
      }

      // productTypes (slug array) varsa ID'lere çevir
      if (rule.productTypes && rule.productTypes.length > 0) {
        const slugToIdMap = await getIdsFromSlugs("products", rule.productTypes);
        const productTypeIds: string[] = [];

        for (const slug of rule.productTypes) {
          const id = slugToIdMap.get(slug);
          if (id) {
            productTypeIds.push(id);
          } else {
            console.warn(`[Migration] TimeSlotRule ${doc.id}: slug '${slug}' için ID bulunamadı`);
          }
        }

        if (productTypeIds.length > 0) {
          batch.update(doc.ref, {
            productTypeIds: productTypeIds,
            // productTypes alanını koru (backward compatibility)
            updatedAt: Date.now(),
          });
          migratedCount++;
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    await batch.commit();

    console.log(`[Migration] ${migratedCount} time-slot-rule migrate edildi, ${skippedCount} atlandı`);
    return { success: true, migratedCount, skippedCount };
  } catch (error) {
    console.error("[Migration] TimeSlotRule migration hatası:", error);
    return { success: false, migratedCount: 0, skippedCount: 0, error: String(error) };
  }
}

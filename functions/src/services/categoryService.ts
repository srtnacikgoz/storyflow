/**
 * Category Service - Dinamik Kategori Yönetimi
 *
 * Bu servis Firestore'da saklanan dinamik kategorileri yönetir.
 * Slug'lar immutable (değiştirilemez) - sadece displayName değişebilir.
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
 * Slug immutable - bir kere eklendikten sonra değiştirilemez
 */
export async function addSubType(
  categoryType: DynamicCategoryType,
  subType: Omit<CategorySubType, "order">
): Promise<{ success: boolean; error?: string }> {
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

    // Yeni alt kategoriyi ekle
    const newSubType: CategorySubType = {
      ...subType,
      order: maxOrder + 1,
    };

    category.subTypes.push(newSubType);
    category.updatedAt = Date.now();

    config.updatedAt = Date.now();

    // Firestore'a kaydet
    await db.doc(CATEGORIES_DOC_PATH).set(config);

    // Cache'i temizle
    clearCategoriesCache();

    console.log(`[CategoryService] Yeni alt kategori eklendi: ${categoryType}/${subType.slug}`);
    return { success: true };
  } catch (error) {
    console.error("[CategoryService] Alt kategori eklenemedi:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Alt kategori güncelle
 * NOT: Slug değiştirilemez, sadece displayName, icon, description, isActive değişebilir
 */
export async function updateSubType(
  categoryType: DynamicCategoryType,
  slug: string,
  updates: Partial<Omit<CategorySubType, "slug">>
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

    // Güncelle
    category.subTypes[subTypeIndex] = {
      ...category.subTypes[subTypeIndex],
      ...updates,
      slug, // Slug değiştirilmesini engelle
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

/**
 * Varsayılan kategorileri seed et
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
    version: "1.0.0",
    updatedAt: now,
  };

  await db.doc(CATEGORIES_DOC_PATH).set(config);

  // Cache'e kaydet
  categoriesCache = config;
  cacheTimestamp = now;

  console.log(`[CategoryService] ${categories.length} varsayılan kategori seed edildi`);
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

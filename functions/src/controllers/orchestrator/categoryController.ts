/**
 * Category Controller - Dinamik Kategori API Endpoint'leri
 *
 * Bu controller kategori yönetimi için HTTP endpoint'leri sağlar.
 * Admin panel bu endpoint'leri kullanarak kategorileri yönetir.
 */

import { functions, getCors, REGION, errorResponse } from "./shared";
import * as categoryService from "../../services/categoryService";
import { DynamicCategoryType, CategorySubType } from "../../orchestrator/types";

/**
 * Tüm kategorileri getir
 * GET /getCategories?skipCache=true (opsiyonel - cache'i bypass eder)
 */
export const getCategories = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        // skipCache parametresi varsa backend cache'i temizle
        const skipCache = request.query.skipCache === "true";
        if (skipCache) {
          categoryService.clearCategoriesCache();
        }

        const config = await categoryService.getCategories();
        response.json({
          success: true,
          data: config,
        });
      } catch (error) {
        errorResponse(response, error, "getCategories");
      }
    });
  });

/**
 * Belirli bir kategori türünü getir
 * GET /getCategoryByType?type=products
 */
export const getCategoryByType = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const type = request.query.type as string;

        if (!type) {
          response.status(400).json({
            success: false,
            error: "type parametresi zorunludur",
          });
          return;
        }

        const category = await categoryService.getCategoryByType(type as DynamicCategoryType);

        if (!category) {
          response.status(404).json({
            success: false,
            error: `Kategori bulunamadı: ${type}`,
          });
          return;
        }

        response.json({
          success: true,
          data: category,
        });
      } catch (error) {
        errorResponse(response, error, "getCategoryByType");
      }
    });
  });

/**
 * Belirli bir kategori türünün slug listesini getir
 * GET /getSubTypeSlugs?type=products
 */
export const getSubTypeSlugs = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const type = request.query.type as string;

        if (!type) {
          response.status(400).json({
            success: false,
            error: "type parametresi zorunludur",
          });
          return;
        }

        const slugs = await categoryService.getSubTypeSlugs(type as DynamicCategoryType);

        response.json({
          success: true,
          data: slugs,
        });
      } catch (error) {
        errorResponse(response, error, "getSubTypeSlugs");
      }
    });
  });

/**
 * Tüm ürün kategorisi slug'larını getir (TimeSlotRule için)
 * GET /getAllProductSlugs
 */
export const getAllProductSlugs = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const slugs = await categoryService.getAllProductSlugs();

        response.json({
          success: true,
          data: slugs,
        });
      } catch (error) {
        errorResponse(response, error, "getAllProductSlugs");
      }
    });
  });

/**
 * Tüm kategorilerin özet bilgisini getir
 * GET /getCategorySummary
 */
export const getCategorySummary = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const summary = await categoryService.getCategorySummary();

        response.json({
          success: true,
          data: summary,
        });
      } catch (error) {
        errorResponse(response, error, "getCategorySummary");
      }
    });
  });

/**
 * Yeni alt kategori ekle
 * POST /addSubType
 * Body: { type, slug, displayName, icon?, description?, isActive?, eatingMethodDefault?, canBeHeldDefault? }
 */
export const addSubType = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const {
          type,
          slug,
          displayName,
          icon,
          description,
          isActive,
          eatingMethodDefault,
          canBeHeldDefault,
        } = request.body as {
          type: string;
          slug: string;
          displayName: string;
          icon?: string;
          description?: string;
          isActive?: boolean;
          eatingMethodDefault?: CategorySubType["eatingMethodDefault"];
          canBeHeldDefault?: boolean;
        };

        // Zorunlu alan kontrolü
        if (!type || !slug || !displayName) {
          response.status(400).json({
            success: false,
            error: "type, slug ve displayName zorunludur",
          });
          return;
        }

        const result = await categoryService.addSubType(type as DynamicCategoryType, {
          slug: slug.toLowerCase().trim(),
          displayName: displayName.trim(),
          icon,
          description,
          isActive: isActive ?? true,
          eatingMethodDefault,
          canBeHeldDefault,
        });

        if (!result.success) {
          response.status(400).json(result);
          return;
        }

        response.json(result);
      } catch (error) {
        errorResponse(response, error, "addSubType");
      }
    });
  });

/**
 * Alt kategori güncelle (slug değiştirilemez)
 * PUT /updateSubType
 * Body: { type, slug, displayName?, icon?, description?, isActive?, order?, eatingMethodDefault?, canBeHeldDefault? }
 */
export const updateSubType = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "PUT" && request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const {
          type,
          slug,
          displayName,
          icon,
          description,
          isActive,
          order,
          eatingMethodDefault,
          canBeHeldDefault,
        } = request.body as {
          type: string;
          slug: string;
          displayName?: string;
          icon?: string;
          description?: string;
          isActive?: boolean;
          order?: number;
          eatingMethodDefault?: CategorySubType["eatingMethodDefault"];
          canBeHeldDefault?: boolean;
        };

        if (!type || !slug) {
          response.status(400).json({
            success: false,
            error: "type ve slug zorunludur",
          });
          return;
        }

        const result = await categoryService.updateSubType(type as DynamicCategoryType, slug, {
          ...(displayName && { displayName: displayName.trim() }),
          ...(icon !== undefined && { icon }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive }),
          ...(order !== undefined && { order }),
          ...(eatingMethodDefault !== undefined && { eatingMethodDefault }),
          ...(canBeHeldDefault !== undefined && { canBeHeldDefault }),
        });

        if (!result.success) {
          response.status(400).json(result);
          return;
        }

        response.json(result);
      } catch (error) {
        errorResponse(response, error, "updateSubType");
      }
    });
  });

/**
 * Alt kategoriyi deaktif et (soft delete)
 * POST /deactivateSubType
 * Body: { type, slug }
 */
export const deactivateSubType = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const { type, slug } = request.body as { type: string; slug: string };

        if (!type || !slug) {
          response.status(400).json({
            success: false,
            error: "type ve slug zorunludur",
          });
          return;
        }

        const result = await categoryService.deactivateSubType(type as DynamicCategoryType, slug);

        if (!result.success) {
          response.status(400).json(result);
          return;
        }

        response.json(result);
      } catch (error) {
        errorResponse(response, error, "deactivateSubType");
      }
    });
  });

/**
 * Alt kategoriyi aktif et
 * POST /activateSubType
 * Body: { type, slug }
 */
export const activateSubType = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const { type, slug } = request.body as { type: string; slug: string };

        if (!type || !slug) {
          response.status(400).json({
            success: false,
            error: "type ve slug zorunludur",
          });
          return;
        }

        const result = await categoryService.activateSubType(type as DynamicCategoryType, slug);

        if (!result.success) {
          response.status(400).json(result);
          return;
        }

        response.json(result);
      } catch (error) {
        errorResponse(response, error, "activateSubType");
      }
    });
  });

/**
 * Alt kategoriyi kalıcı olarak sil (hard delete)
 * DELETE /deleteSubType
 * Body: { type, slug }
 */
export const deleteSubType = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      // DELETE veya POST kabul et (bazı client'lar DELETE body gönderemez)
      if (request.method !== "DELETE" && request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const { type, slug } = request.body as { type: string; slug: string };

        if (!type || !slug) {
          response.status(400).json({
            success: false,
            error: "type ve slug zorunludur",
          });
          return;
        }

        const result = await categoryService.deleteSubType(type as DynamicCategoryType, slug);

        if (!result.success) {
          response.status(400).json(result);
          return;
        }

        response.json(result);
      } catch (error) {
        errorResponse(response, error, "deleteSubType");
      }
    });
  });

/**
 * Alt kategorilerin sırasını güncelle
 * POST /reorderSubTypes
 * Body: { type, slugOrder: string[] }
 */
export const reorderSubTypes = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const { type, slugOrder } = request.body as { type: string; slugOrder: string[] };

        if (!type || !slugOrder || !Array.isArray(slugOrder)) {
          response.status(400).json({
            success: false,
            error: "type ve slugOrder (array) zorunludur",
          });
          return;
        }

        const result = await categoryService.reorderSubTypes(type as DynamicCategoryType, slugOrder);

        if (!result.success) {
          response.status(400).json(result);
          return;
        }

        response.json(result);
      } catch (error) {
        errorResponse(response, error, "reorderSubTypes");
      }
    });
  });

/**
 * Varsayılan kategorileri seed et
 * POST /seedCategories
 */
export const seedCategories = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const config = await categoryService.seedDefaultCategories();

        response.json({
          success: true,
          data: config,
          message: `${config.categories.length} kategori seed edildi`,
        });
      } catch (error) {
        errorResponse(response, error, "seedCategories");
      }
    });
  });

/**
 * Cache'i temizle
 * POST /clearCategoriesCache
 */
export const clearCache = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        categoryService.clearCategoriesCache();

        response.json({
          success: true,
          message: "Cache temizlendi",
        });
      } catch (error) {
        errorResponse(response, error, "clearCategoriesCache");
      }
    });
  });

/**
 * Slug'ı displayName'e çevir
 * GET /getCategoryDisplayName?type=products&slug=croissants
 */
export const getDisplayName = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const type = request.query.type as string;
        const slug = request.query.slug as string;

        if (!type || !slug) {
          response.status(400).json({
            success: false,
            error: "type ve slug parametreleri zorunludur",
          });
          return;
        }

        const displayName = await categoryService.getDisplayName(type as DynamicCategoryType, slug);

        response.json({
          success: true,
          data: {
            slug,
            displayName,
          },
        });
      } catch (error) {
        errorResponse(response, error, "getCategoryDisplayName");
      }
    });
  });

// ==========================================
// MAIN CATEGORY ENDPOINTS
// ==========================================

/**
 * Yeni ana kategori ekle
 * POST /addMainCategory
 * Body: { type, displayName, icon, description?, subTypes?: [] }
 *
 * NOT: Yeni ana kategoriler orchestrator'da loadAvailableAssets()
 * güncellemesi gerektirebilir. Alt kategoriler için bu gerekli değil.
 */
export const addMainCategory = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const {
          type,
          displayName,
          icon,
          description,
          subTypes,
          linkedSlotKey,
        } = request.body as {
          type: string;
          displayName: string;
          icon: string;
          description?: string;
          subTypes?: CategorySubType[];
          linkedSlotKey?: string;
        };

        // Zorunlu alan kontrolü
        if (!type || !displayName) {
          response.status(400).json({
            success: false,
            error: "type ve displayName zorunludur",
          });
          return;
        }

        const result = await categoryService.addMainCategory({
          type: type.toLowerCase().trim() as DynamicCategoryType,
          displayName: displayName.trim(),
          icon: icon || "",
          description,
          linkedSlotKey: linkedSlotKey || undefined,
          order: 0, // Service'de otomatik hesaplanacak
          isSystem: false,
          isDeleted: false,
          subTypes,
        });

        if (!result.success) {
          response.status(400).json(result);
          return;
        }

        response.json({
          ...result,
          warning: "Yeni ana kategoriler orchestrator'da loadAvailableAssets() güncellemesi gerektirebilir.",
        });
      } catch (error) {
        errorResponse(response, error, "addMainCategory");
      }
    });
  });

/**
 * Ana kategori güncelle (type değiştirilemez)
 * PUT /updateMainCategory
 * Body: { type, displayName?, icon?, description?, order?, isDeleted? }
 */
export const updateMainCategory = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "PUT" && request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const {
          type,
          displayName,
          icon,
          description,
          order,
          isDeleted,
          linkedSlotKey,
        } = request.body as {
          type: string;
          displayName?: string;
          icon?: string;
          description?: string;
          order?: number;
          isDeleted?: boolean;
          linkedSlotKey?: string | null;
        };

        if (!type) {
          response.status(400).json({
            success: false,
            error: "type zorunludur",
          });
          return;
        }

        const result = await categoryService.updateMainCategory(type, {
          ...(displayName && { displayName: displayName.trim() }),
          ...(icon !== undefined && { icon }),
          ...(description !== undefined && { description }),
          ...(order !== undefined && { order }),
          ...(isDeleted !== undefined && { isDeleted }),
          ...(linkedSlotKey !== undefined && { linkedSlotKey: linkedSlotKey || undefined }),
        });

        if (!result.success) {
          response.status(400).json(result);
          return;
        }

        response.json(result);
      } catch (error) {
        errorResponse(response, error, "updateMainCategory");
      }
    });
  });

/**
 * Ana kategori sil (soft delete)
 * POST /deleteMainCategory
 * Body: { type }
 */
export const deleteMainCategory = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST" && request.method !== "DELETE") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const { type } = request.body as { type: string };

        if (!type) {
          response.status(400).json({
            success: false,
            error: "type zorunludur",
          });
          return;
        }

        const result = await categoryService.deleteMainCategory(type);

        if (!result.success) {
          response.status(400).json(result);
          return;
        }

        response.json(result);
      } catch (error) {
        errorResponse(response, error, "deleteMainCategory");
      }
    });
  });

// ==========================================
// ID-BASED ENDPOINTS (v2)
// ==========================================

/**
 * ID ile alt kategori getir
 * GET /getSubTypeById?id=products_croissants
 */
export const getSubTypeById = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const id = request.query.id as string;

        if (!id) {
          response.status(400).json({
            success: false,
            error: "id parametresi zorunludur",
          });
          return;
        }

        const result = await categoryService.getSubTypeById(id);

        if (!result.subType) {
          response.status(404).json({
            success: false,
            error: `SubType bulunamadı: ${id}`,
          });
          return;
        }

        response.json({
          success: true,
          data: {
            subType: result.subType,
            categoryType: result.categoryType,
          },
        });
      } catch (error) {
        errorResponse(response, error, "getSubTypeById");
      }
    });
  });

/**
 * Belirli bir kategori türünün ID listesini getir
 * GET /getSubTypeIds?type=products
 */
export const getSubTypeIds = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const type = request.query.type as string;

        if (!type) {
          response.status(400).json({
            success: false,
            error: "type parametresi zorunludur",
          });
          return;
        }

        const ids = await categoryService.getSubTypeIds(type as DynamicCategoryType);

        response.json({
          success: true,
          data: ids,
        });
      } catch (error) {
        errorResponse(response, error, "getSubTypeIds");
      }
    });
  });

/**
 * Slug'dan ID'ye çevir
 * GET /getSubTypeIdBySlug?type=products&slug=croissants
 */
export const getSubTypeIdBySlug = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const type = request.query.type as string;
        const slug = request.query.slug as string;

        if (!type || !slug) {
          response.status(400).json({
            success: false,
            error: "type ve slug parametreleri zorunludur",
          });
          return;
        }

        const id = await categoryService.getSubTypeIdBySlug(type as DynamicCategoryType, slug);

        if (!id) {
          response.status(404).json({
            success: false,
            error: `Slug için ID bulunamadı: ${type}/${slug}`,
          });
          return;
        }

        response.json({
          success: true,
          data: { slug, id },
        });
      } catch (error) {
        errorResponse(response, error, "getSubTypeIdBySlug");
      }
    });
  });

/**
 * SubType ID validation
 * GET /validateSubTypeId?id=products_croissants&type=products (type optional)
 */
export const validateSubTypeId = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const id = request.query.id as string;
        const type = request.query.type as string | undefined;

        if (!id) {
          response.status(400).json({
            success: false,
            error: "id parametresi zorunludur",
          });
          return;
        }

        const result = await categoryService.validateSubTypeId(
          id,
          type as DynamicCategoryType | undefined
        );

        response.json({
          success: true,
          data: result,
        });
      } catch (error) {
        errorResponse(response, error, "validateSubTypeId");
      }
    });
  });

// ==========================================
// MIGRATION ENDPOINTS
// ==========================================

/**
 * Mevcut kategorilere ID ekle (migration)
 * POST /migrateCategoriesToIdBased
 */
export const migrateCategoriesToIdBased = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const result = await categoryService.migrateCategoriesToIdBased();
        response.json({
          success: result.success,
          data: {
            migratedCount: result.migratedCount,
          },
          error: result.error,
        });
      } catch (error) {
        errorResponse(response, error, "migrateCategoriesToIdBased");
      }
    });
  });

/**
 * Asset'leri ID-based sisteme migrate et
 * POST /migrateAssetsToIdBased
 */
export const migrateAssetsToIdBased = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const result = await categoryService.migrateAssetsToIdBased();
        response.json({
          success: result.success,
          data: {
            migratedCount: result.migratedCount,
            skippedCount: result.skippedCount,
          },
          error: result.error,
        });
      } catch (error) {
        errorResponse(response, error, "migrateAssetsToIdBased");
      }
    });
  });

/**
 * TimeSlotRule'ları ID-based sisteme migrate et
 * POST /migrateTimeSlotRulesToIdBased
 */
export const migrateTimeSlotRulesToIdBased = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const result = await categoryService.migrateTimeSlotRulesToIdBased();
        response.json({
          success: result.success,
          data: {
            migratedCount: result.migratedCount,
            skippedCount: result.skippedCount,
          },
          error: result.error,
        });
      } catch (error) {
        errorResponse(response, error, "migrateTimeSlotRulesToIdBased");
      }
    });
  });

/**
 * Tüm migration'ları sırayla çalıştır
 * POST /runFullMigration
 */
export const runFullMigration = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        console.log("[Migration] Full migration başlıyor...");

        // 1. Kategorilere ID ekle
        console.log("[Migration] Step 1: Kategorilere ID ekleniyor...");
        const categoriesResult = await categoryService.migrateCategoriesToIdBased();
        if (!categoriesResult.success) {
          throw new Error(`Kategori migration başarısız: ${categoriesResult.error}`);
        }

        // 2. Asset'leri migrate et
        console.log("[Migration] Step 2: Asset'ler migrate ediliyor...");
        const assetsResult = await categoryService.migrateAssetsToIdBased();
        if (!assetsResult.success) {
          throw new Error(`Asset migration başarısız: ${assetsResult.error}`);
        }

        // 3. TimeSlotRule'ları migrate et
        console.log("[Migration] Step 3: TimeSlotRule'lar migrate ediliyor...");
        const rulesResult = await categoryService.migrateTimeSlotRulesToIdBased();
        if (!rulesResult.success) {
          throw new Error(`TimeSlotRule migration başarısız: ${rulesResult.error}`);
        }

        console.log("[Migration] Full migration tamamlandı!");

        response.json({
          success: true,
          data: {
            categories: {
              migratedCount: categoriesResult.migratedCount,
            },
            assets: {
              migratedCount: assetsResult.migratedCount,
              skippedCount: assetsResult.skippedCount,
            },
            timeSlotRules: {
              migratedCount: rulesResult.migratedCount,
              skippedCount: rulesResult.skippedCount,
            },
          },
          message: "Full migration tamamlandı!",
        });
      } catch (error) {
        errorResponse(response, error, "runFullMigration");
      }
    });
  });

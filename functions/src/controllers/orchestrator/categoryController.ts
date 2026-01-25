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
 * GET /getCategories
 */
export const getCategories = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
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

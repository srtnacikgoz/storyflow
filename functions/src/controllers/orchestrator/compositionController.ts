/**
 * Composition Controller
 * Dinamik Slot Sistemi — Slot tanımları + Template/Preset CRUD
 *
 * Collection yapısı:
 * - global/config/settings/slot-definitions      → Slot tanımları
 * - global/compositionTemplates/items/{id}        → System template'leri
 * - tenants/{tenantId}/presets/{id}               → Tenant preset'leri
 */

import { functions, getCors, REGION, errorResponse, successResponse } from "./shared";
import {
  getSlotDefinitions,
  updateSlotDefinitions,
  getSystemTemplates,
  getTenantPresets,
  getCompositionTemplate,
  createCompositionTemplate,
  updateCompositionTemplate,
  deleteCompositionTemplate,
} from "../../services/configService";

// ==========================================
// SLOT TANIMLARI
// ==========================================

/**
 * GET /getSlotDefinitions
 * Dinamik slot tanımlarını getirir
 */
export const getSlotDefinitionsEndpoint = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const config = await getSlotDefinitions();
        successResponse(response, { data: config });
      } catch (error) {
        errorResponse(response, error, "getSlotDefinitions");
      }
    });
  });

/**
 * PUT/POST /updateSlotDefinitions
 * Slot tanımlarını günceller (yeni slot ekleme dahil)
 */
export const updateSlotDefinitionsEndpoint = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "PUT" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use PUT or POST" });
          return;
        }

        const { slots, updatedBy } = request.body;

        if (!slots || !Array.isArray(slots)) {
          response.status(400).json({ success: false, error: "slots array gerekli" });
          return;
        }

        const config = await updateSlotDefinitions(slots, updatedBy);
        successResponse(response, { data: config });
      } catch (error) {
        errorResponse(response, error, "updateSlotDefinitions");
      }
    });
  });

// ==========================================
// COMPOSITION TEMPLATE / PRESET CRUD
// ==========================================

/**
 * GET /listCompositionTemplates
 * Template'leri listeler
 * Query params: type=system|tenant, tenantId (tenant için)
 */
export const listCompositionTemplates = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const type = (request.query.type as string) || "system";
        const tenantId = request.query.tenantId as string;

        let templates;
        if (type === "tenant") {
          if (!tenantId) {
            response.status(400).json({ success: false, error: "tenantId gerekli" });
            return;
          }
          templates = await getTenantPresets(tenantId);
        } else {
          templates = await getSystemTemplates();
        }

        successResponse(response, { data: templates, count: templates.length });
      } catch (error) {
        errorResponse(response, error, "listCompositionTemplates");
      }
    });
  });

/**
 * GET /getCompositionTemplateById
 * Tek bir template getirir
 * Query params: id, type=system|tenant, tenantId (tenant için)
 */
export const getCompositionTemplateById = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const id = request.query.id as string;
        const type = (request.query.type as string) as "system" | "tenant";
        const tenantId = request.query.tenantId as string;

        if (!id || !type) {
          response.status(400).json({ success: false, error: "id ve type gerekli" });
          return;
        }

        const template = await getCompositionTemplate(id, type, tenantId);

        if (!template) {
          response.status(404).json({ success: false, error: "Template bulunamadı" });
          return;
        }

        successResponse(response, { data: template });
      } catch (error) {
        errorResponse(response, error, "getCompositionTemplateById");
      }
    });
  });

/**
 * POST /createCompositionTemplate
 * Yeni template/preset oluşturur
 */
export const createCompositionTemplateEndpoint = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const { name, description, themeId, scenarioId, slots, type, tenantId } = request.body;

        if (!name || !slots || !type) {
          response.status(400).json({ success: false, error: "name, slots ve type gerekli" });
          return;
        }

        if (type === "tenant" && !tenantId) {
          response.status(400).json({ success: false, error: "tenant type için tenantId gerekli" });
          return;
        }

        // undefined alanları Firestore'a gönderme
        const data: Record<string, unknown> = { name, slots, type };
        if (description) data.description = description;
        if (themeId) data.themeId = themeId;
        if (scenarioId) data.scenarioId = scenarioId;
        if (tenantId) data.tenantId = tenantId;

        const template = await createCompositionTemplate(data as any);

        successResponse(response, { data: template }, 201);
      } catch (error) {
        errorResponse(response, error, "createCompositionTemplate");
      }
    });
  });

/**
 * PUT /updateCompositionTemplate
 * Template/preset günceller
 */
export const updateCompositionTemplateEndpoint = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "PUT" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use PUT or POST" });
          return;
        }

        const { id, type, tenantId, ...updates } = request.body;

        if (!id || !type) {
          response.status(400).json({ success: false, error: "id ve type gerekli" });
          return;
        }

        await updateCompositionTemplate(id, type, updates, tenantId);

        // Güncellenmiş template'i döndür
        const template = await getCompositionTemplate(id, type, tenantId);
        successResponse(response, { data: template });
      } catch (error) {
        errorResponse(response, error, "updateCompositionTemplate");
      }
    });
  });

/**
 * DELETE /deleteCompositionTemplate
 * Template/preset siler
 * Query params: id, type=system|tenant, tenantId (tenant için)
 */
export const deleteCompositionTemplateEndpoint = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "DELETE" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use DELETE or POST" });
          return;
        }

        // DELETE'te body olmayabilir, query params'tan da okunabilir
        const id = (request.body?.id || request.query.id) as string;
        const type = (request.body?.type || request.query.type) as "system" | "tenant";
        const tenantId = (request.body?.tenantId || request.query.tenantId) as string;

        if (!id || !type) {
          response.status(400).json({ success: false, error: "id ve type gerekli" });
          return;
        }

        await deleteCompositionTemplate(id, type, tenantId);
        successResponse(response, { deleted: true });
      } catch (error) {
        errorResponse(response, error, "deleteCompositionTemplate");
      }
    });
  });

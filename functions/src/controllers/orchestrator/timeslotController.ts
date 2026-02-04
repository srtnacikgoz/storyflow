/**
 * Time Slot Controller
 * Zaman kuralları CRUD işlemleri
 */

import { functions, db, getCors, REGION, errorResponse } from "./shared";
import { TimeSlotRule, KNOWN_PRODUCT_TYPES } from "../../orchestrator/types";
import { getSubTypeSlugs as getSubTypeSlugsFromService } from "../../services/categoryService";

/**
 * ProductTypes validasyonu - dinamik kategorilerden kontrol eder
 * Bilinen kategoriler (KNOWN_PRODUCT_TYPES) her zaman geçerlidir
 */
async function validateProductTypes(productTypes: string[]): Promise<{ valid: boolean; invalid: string[] }> {
  if (!productTypes || productTypes.length === 0) {
    return { valid: false, invalid: [] };
  }

  // Dinamik kategorileri çek
  const dynamicSlugs = await getSubTypeSlugsFromService("products").catch(() => []);

  // Geçerli slug'ları birleştir
  const allValidSlugs = new Set([...KNOWN_PRODUCT_TYPES, ...dynamicSlugs]);

  // Geçersiz olanları bul
  const invalidTypes = productTypes.filter((pt) => !allValidSlugs.has(pt));

  return {
    valid: invalidTypes.length === 0,
    invalid: invalidTypes,
  };
}

/**
 * Zaman kurallarını listele
 */
export const listTimeSlotRules = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const snapshot = await db
          .collection("time-slot-rules")
          .orderBy("priority", "asc")
          .get();

        const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        response.json({
          success: true,
          data: rules,
          count: rules.length,
        });
      } catch (error) {
        errorResponse(response, error, "listTimeSlotRules");
      }
    });
  });

/**
 * Yeni zaman kuralı ekle
 */
export const createTimeSlotRule = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const body = request.body;

        // Zorunlu alanları kontrol et
        if (!body.startHour && body.startHour !== 0) {
          response.status(400).json({ success: false, error: "startHour gerekli" });
          return;
        }
        if (!body.endHour) {
          response.status(400).json({ success: false, error: "endHour gerekli" });
          return;
        }
        if (!body.daysOfWeek || body.daysOfWeek.length === 0) {
          response.status(400).json({ success: false, error: "En az bir gün seçilmeli" });
          return;
        }
        if (!body.productTypes || body.productTypes.length === 0) {
          response.status(400).json({ success: false, error: "En az bir ürün tipi seçilmeli" });
          return;
        }

        // ProductTypes validasyonu - dinamik kategorilerden kontrol
        const validation = await validateProductTypes(body.productTypes);
        if (!validation.valid) {
          response.status(400).json({
            success: false,
            error: `Geçersiz ürün tipi: ${validation.invalid.join(", ")}`,
          });
          return;
        }

        // Mevcut kuralların sayısını al (priority için)
        const existingRules = await db.collection("time-slot-rules").get();
        const nextPriority = existingRules.size + 1;

        const ruleData: Omit<TimeSlotRule, "id"> = {
          ...body,
          isActive: true,
          priority: body.priority ?? nextPriority, // priority yoksa otomatik ata
        };

        const docRef = await db.collection("time-slot-rules").add(ruleData);

        response.status(201).json({
          success: true,
          data: { id: docRef.id, ...ruleData },
        });
      } catch (error) {
        errorResponse(response, error, "createTimeSlotRule");
      }
    });
  });

/**
 * Zaman kuralı güncelle
 */
export const updateTimeSlotRule = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "PUT" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use PUT or POST" });
          return;
        }

        const id = request.query.id as string || request.body?.id;

        if (!id) {
          response.status(400).json({
            success: false,
            error: "Missing required parameter: id",
          });
          return;
        }

        const updates = { ...request.body };
        delete updates.id;

        // Eğer productTypes güncelleniyorsa validasyon yap
        if (updates.productTypes && updates.productTypes.length > 0) {
          const validation = await validateProductTypes(updates.productTypes);
          if (!validation.valid) {
            response.status(400).json({
              success: false,
              error: `Geçersiz ürün tipi: ${validation.invalid.join(", ")}`,
            });
            return;
          }
        }

        await db.collection("time-slot-rules").doc(id).update(updates);

        response.json({
          success: true,
          message: "Time slot rule updated",
        });
      } catch (error) {
        errorResponse(response, error, "updateTimeSlotRule");
      }
    });
  });

/**
 * Zaman kuralı sil
 */
export const deleteTimeSlotRule = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "DELETE" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use DELETE or POST" });
          return;
        }

        const id = request.query.id as string || request.body?.id;

        if (!id) {
          response.status(400).json({
            success: false,
            error: "Missing required parameter: id",
          });
          return;
        }

        await db.collection("time-slot-rules").doc(id).delete();

        response.json({
          success: true,
          message: "Time slot rule deleted",
        });
      } catch (error) {
        errorResponse(response, error, "deleteTimeSlotRule");
      }
    });
  });

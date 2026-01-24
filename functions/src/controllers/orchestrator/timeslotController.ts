/**
 * Time Slot Controller
 * Zaman kuralları CRUD işlemleri
 */

import { functions, db, getCors, REGION, errorResponse } from "./shared";
import { TimeSlotRule } from "../../orchestrator/types";

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

        const ruleData: Omit<TimeSlotRule, "id"> = {
          ...request.body,
          isActive: true,
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

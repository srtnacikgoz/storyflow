/**
 * Scenario Controller
 * Senaryo CRUD işlemleri
 */

import { functions, db, getCors, REGION, errorResponse } from "./shared";
import { getScenarios, addScenario, updateScenario, getHandStyles } from "../../services/configService";
import { FirestoreScenario } from "../../orchestrator/types";

/**
 * Tüm senaryoları listele
 * GET /listScenarios?includeInactive=true
 */
export const listScenarios = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        // includeInactive=true ise pasif senaryoları da getir
        const includeInactive = request.query?.includeInactive === "true";

        let scenarios: FirestoreScenario[];
        if (includeInactive) {
          // Tüm senaryoları getir (aktif + pasif)
          const snapshot = await db
            .collection("global")
            .doc("scenarios")
            .collection("items")
            .get();
          scenarios = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as FirestoreScenario[];
        } else {
          scenarios = await getScenarios();
        }

        // Kategorilere ayır
        const handScenarios = scenarios.filter((s) => s.includesHands && !s.isInterior);
        const noHandScenarios = scenarios.filter((s) => !s.includesHands && !s.isInterior);
        const interiorScenarios = scenarios.filter((s) => s.isInterior);

        response.json({
          success: true,
          data: {
            all: scenarios,
            byCategory: {
              withHands: handScenarios,
              withoutHands: noHandScenarios,
              interior: interiorScenarios,
            },
            total: scenarios.length,
          },
        });
      } catch (error) {
        errorResponse(response, error, "listScenarios");
      }
    });
  });

/**
 * Tek senaryo getir
 * GET /getScenario?id=xxx
 */
export const getScenario = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const scenarioId = request.query?.id as string;

        if (!scenarioId) {
          response.status(400).json({
            success: false,
            error: "id is required",
          });
          return;
        }

        const doc = await db
          .collection("global")
          .doc("scenarios")
          .collection("items")
          .doc(scenarioId)
          .get();

        if (!doc.exists) {
          response.status(404).json({
            success: false,
            error: "Scenario not found",
          });
          return;
        }

        response.json({
          success: true,
          data: { id: doc.id, ...doc.data() },
        });
      } catch (error) {
        errorResponse(response, error, "getScenario");
      }
    });
  });

/**
 * Yeni senaryo oluştur
 * POST /createScenario
 */
export const createScenario = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const {
          id,
          name,
          description,
          includesHands,
          compositions,
          isInterior,
          interiorType,
          suggestedProducts,
          suggestedTimeSlots,
          mood,
        } = request.body;

        // Validasyon
        if (!id || !name || !description) {
          response.status(400).json({
            success: false,
            error: "id, name, and description are required",
          });
          return;
        }

        if (!compositions || !Array.isArray(compositions) || compositions.length === 0) {
          response.status(400).json({
            success: false,
            error: "At least one composition is required",
          });
          return;
        }

        // ID zaten var mı kontrol et
        const existing = await db
          .collection("global")
          .doc("scenarios")
          .collection("items")
          .doc(id)
          .get();

        if (existing.exists) {
          response.status(400).json({
            success: false,
            error: "Scenario with this ID already exists",
          });
          return;
        }

        // Senaryo oluştur
        const scenario: Omit<FirestoreScenario, "createdAt" | "updatedAt"> = {
          id,
          name,
          description,
          includesHands: includesHands ?? false,
          compositions: compositions.map((c: { id: string; description?: string }) => ({
            id: c.id,
            description: c.description || c.id,
          })),
          isActive: true,
          isInterior: isInterior ?? false,
          interiorType: interiorType,
          suggestedProducts: suggestedProducts,
          suggestedTimeSlots: suggestedTimeSlots,
          mood: mood,
        };

        await addScenario(scenario);

        response.json({
          success: true,
          message: "Scenario created successfully",
          data: scenario,
        });
      } catch (error) {
        errorResponse(response, error, "createScenario");
      }
    });
  });

/**
 * Senaryo güncelle
 * PUT /updateScenario
 */
export const updateScenarioEndpoint = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "PUT" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use PUT or POST" });
          return;
        }

        const { id, ...updates } = request.body;

        if (!id) {
          response.status(400).json({
            success: false,
            error: "id is required",
          });
          return;
        }

        // Senaryo var mı kontrol et
        const existing = await db
          .collection("global")
          .doc("scenarios")
          .collection("items")
          .doc(id)
          .get();

        if (!existing.exists) {
          response.status(404).json({
            success: false,
            error: "Scenario not found",
          });
          return;
        }

        // Compositions formatını düzelt
        if (updates.compositions) {
          updates.compositions = updates.compositions.map((c: { id: string; description?: string }) => ({
            id: c.id,
            description: c.description || c.id,
          }));
        }

        await updateScenario(id, updates);

        response.json({
          success: true,
          message: "Scenario updated successfully",
        });
      } catch (error) {
        errorResponse(response, error, "updateScenario");
      }
    });
  });

/**
 * Senaryo sil (soft delete)
 * DELETE /deleteScenario?id=xxx
 */
export const deleteScenarioEndpoint = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const scenarioId = (request.query?.id || request.body?.id) as string;
        const hardDelete = request.query?.hardDelete === "true" || request.body?.hardDelete === true;

        if (!scenarioId) {
          response.status(400).json({
            success: false,
            error: "id is required",
          });
          return;
        }

        // Senaryo var mı kontrol et
        const existing = await db
          .collection("global")
          .doc("scenarios")
          .collection("items")
          .doc(scenarioId)
          .get();

        if (!existing.exists) {
          response.status(404).json({
            success: false,
            error: "Scenario not found",
          });
          return;
        }

        if (hardDelete) {
          // Kalıcı silme
          await db
            .collection("global")
            .doc("scenarios")
            .collection("items")
            .doc(scenarioId)
            .delete();
        } else {
          // Soft delete - isActive: false
          await updateScenario(scenarioId, { isActive: false });
        }

        response.json({
          success: true,
          message: hardDelete ? "Scenario permanently deleted" : "Scenario deactivated",
        });
      } catch (error) {
        errorResponse(response, error, "deleteScenario");
      }
    });
  });

/**
 * Tüm el stillerini listele
 * GET /listHandStyles
 */
export const listHandStyles = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const handStyles = await getHandStyles();

        response.json({
          success: true,
          data: handStyles,
          total: handStyles.length,
        });
      } catch (error) {
        errorResponse(response, error, "listHandStyles");
      }
    });
  });

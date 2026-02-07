/**
 * Scenario Controller
 * Senaryo CRUD işlemleri
 */

import { functions, db, getCors, REGION, errorResponse, getConfig } from "./shared";
import { getScenarios, addScenario, updateScenario, getHandStyles } from "../../services/configService";
import { FirestoreScenario } from "../../orchestrator/types";
import { GeminiService } from "../../services/gemini";

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
          compositionId,
          compositionEntry,
          handPose,
          isInterior,
          interiorType,
          suggestedProducts,
          mood, // Deprecated: v3.0'da senaryo kendi atmosfer bilgisini taşıyor

          // v3.0: Atmosfer alanları (Mood + Scenario birleşik)
          timeOfDay,
          season,
          weather,
          lightingPrompt,
          colorGradePrompt,
          geminiPresetId,
        } = request.body;

        // Validasyon
        if (!id || !name || !description) {
          response.status(400).json({
            success: false,
            error: "id, name, and description are required",
          });
          return;
        }

        if (!compositionId) {
          response.status(400).json({
            success: false,
            error: "compositionId is required",
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

        // Senaryo oluştur - undefined değerleri Firestore'a gönderme
        const scenario: Omit<FirestoreScenario, "createdAt" | "updatedAt"> = {
          id,
          name,
          description,
          includesHands: includesHands ?? false,
          compositionId,
          isActive: true,
          isInterior: isInterior ?? false,
          // Opsiyonel alanları sadece tanımlı ise ekle
          ...(compositionEntry !== undefined && { compositionEntry }),
          ...(handPose !== undefined && { handPose }),
          ...(interiorType !== undefined && { interiorType }),
          ...(suggestedProducts !== undefined && { suggestedProducts }),
          ...(mood !== undefined && { mood }),

          // v3.0: Atmosfer alanları (Mood + Scenario birleşik)
          ...(timeOfDay !== undefined && { timeOfDay }),
          ...(season !== undefined && { season }),
          ...(weather !== undefined && { weather }),
          ...(lightingPrompt !== undefined && { lightingPrompt }),
          ...(colorGradePrompt !== undefined && { colorGradePrompt }),
          ...(geminiPresetId !== undefined && { geminiPresetId }),
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
 * Not: Temalarda kullanılan senaryolar kalıcı silinemez (cascade kontrolü)
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

        // CASCADE KONTROLÜ: Kalıcı silme için tema bağımlılığını kontrol et
        if (hardDelete) {
          // Bu senaryoyu kullanan temaları bul
          // Temalarda scenarios array'i senaryo ID'lerini tutuyor
          const themesSnapshot = await db.collection("themes").get();
          const affectedThemes: Array<{ id: string; name: string }> = [];

          themesSnapshot.docs.forEach((doc) => {
            const themeData = doc.data();
            // scenarios array'i string[] veya {id: string}[] olabilir
            const scenarios = themeData.scenarios || [];
            const hasScenario = scenarios.some((s: string | { id: string }) =>
              typeof s === "string" ? s === scenarioId : s.id === scenarioId
            );

            if (hasScenario) {
              affectedThemes.push({
                id: doc.id,
                name: themeData.name || doc.id,
              });
            }
          });

          if (affectedThemes.length > 0) {
            console.log(`[deleteScenario] Scenario ${scenarioId} is used by ${affectedThemes.length} themes`);

            response.status(400).json({
              success: false,
              error: `Bu senaryo ${affectedThemes.length} temada kullanılıyor. Kalıcı silmek için önce bu temalardan senaryoyu kaldırın.`,
              affectedThemes,
              code: "SCENARIO_IN_USE",
              hint: "Soft delete (devre dışı bırakma) yapabilirsiniz: hardDelete=false",
            });
            return;
          }

          // Kalıcı silme
          await db
            .collection("global")
            .doc("scenarios")
            .collection("items")
            .doc(scenarioId)
            .delete();
        } else {
          // Soft delete - isActive: false (bu her zaman çalışır)
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

/**
 * AI ile senaryo açıklaması üret (Gemini)
 * POST /generateScenarioDescription
 * Body: { scenarioName, includesHands, handPose?, compositions, compositionEntry? }
 */
export const generateScenarioDescription = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 60 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const {
          scenarioName,
          includesHands,
          handPose,
          compositions,
          compositionEntry,
        } = request.body;

        // Validasyon
        if (!scenarioName) {
          response.status(400).json({
            success: false,
            error: "scenarioName is required",
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

        // Gemini Service ile açıklama üret
        const config = await getConfig();
        const geminiService = new GeminiService({ apiKey: config.gemini.apiKey });
        const result = await geminiService.generateScenarioDescription({
          scenarioName,
          includesHands: includesHands ?? false,
          handPose,
          compositions,
          compositionEntry,
        });

        response.json({
          success: true,
          data: {
            description: result.text,
            cost: result.cost,
          },
        });
      } catch (error) {
        errorResponse(response, error, "generateScenarioDescription");
      }
    });
  });

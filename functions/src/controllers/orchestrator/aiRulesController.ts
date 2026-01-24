/**
 * AI Rules Controller
 * AI öğrenme kuralları CRUD işlemleri
 */

import { functions, getCors, REGION, errorResponse } from "./shared";
import { AIRulesService } from "../../services/aiRulesService";
import { AIRuleCategoryId, AIRule } from "../../orchestrator/types";

/**
 * Tüm AI kurallarını listele
 * GET /listAIRules?activeOnly=true
 */
export const listAIRules = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const activeOnly = request.query.activeOnly === "true";
        const rules = await AIRulesService.listRules(activeOnly);

        response.json({
          success: true,
          data: rules,
        });
      } catch (error) {
        errorResponse(response, error, "listAIRules");
      }
    });
  });

/**
 * Yeni AI kuralı oluştur
 * POST /createAIRule
 */
export const createAIRule = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const { type, category, title, description, exampleImageUrl, isActive } = request.body;

        if (!type || !category || !title) {
          response.status(400).json({
            success: false,
            error: "type, category ve title zorunludur",
          });
          return;
        }

        if (type !== "do" && type !== "dont") {
          response.status(400).json({
            success: false,
            error: "type 'do' veya 'dont' olmalı",
          });
          return;
        }

        const ruleData: Record<string, unknown> = {
          type,
          category: category as AIRuleCategoryId,
          title,
          description: description || "",
          isActive: isActive !== false,
        };

        if (exampleImageUrl) {
          ruleData.exampleImageUrl = exampleImageUrl;
        }

        const ruleId = await AIRulesService.createRule(
          ruleData as Omit<AIRule, "id" | "createdAt" | "updatedAt">
        );

        response.json({
          success: true,
          data: { id: ruleId },
        });
      } catch (error) {
        errorResponse(response, error, "createAIRule");
      }
    });
  });

/**
 * AI kuralı güncelle
 * PUT /updateAIRule
 */
export const updateAIRule = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "PUT" && request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const { id, ...updates } = request.body;

        if (!id) {
          response.status(400).json({
            success: false,
            error: "id zorunludur",
          });
          return;
        }

        const filteredUpdates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updates)) {
          if (value !== undefined) {
            filteredUpdates[key] = value;
          }
        }

        await AIRulesService.updateRule(id, filteredUpdates);

        response.json({
          success: true,
        });
      } catch (error) {
        errorResponse(response, error, "updateAIRule");
      }
    });
  });

/**
 * AI kuralı sil
 * DELETE /deleteAIRule?id=xxx
 */
export const deleteAIRule = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const id = (request.query.id as string) || request.body?.id;

        if (!id) {
          response.status(400).json({
            success: false,
            error: "id zorunludur",
          });
          return;
        }

        await AIRulesService.deleteRule(id);

        response.json({
          success: true,
        });
      } catch (error) {
        errorResponse(response, error, "deleteAIRule");
      }
    });
  });

/**
 * AI kural istatistiklerini getir
 * GET /getAIRulesStats
 */
export const getAIRulesStats = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const stats = await AIRulesService.getStats();

        response.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        errorResponse(response, error, "getAIRulesStats");
      }
    });
  });

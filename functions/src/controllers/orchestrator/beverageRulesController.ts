/**
 * Beverage Rules Controller
 * İçecek kuralları config endpoint'leri
 *
 * Ürün kategorisine göre hangi içeceğin sunulacağını belirler:
 * - croissants → tea (her 3'te 1 fruit-juice)
 * - pastas → coffee
 * - chocolates → coffee (her 5'te 1 tea)
 */

import { functions, getCors, REGION, errorResponse } from "./shared";
import {
  getBeverageRulesConfig,
  updateBeverageRulesConfig,
} from "../../services/configService";

/**
 * GET /getBeverageRulesConfig
 * İçecek kurallarını getirir
 */
export const getBeverageRulesConfigEndpoint = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const config = await getBeverageRulesConfig();
        response.json({ success: true, data: config });
      } catch (error) {
        errorResponse(response, error, "getBeverageRulesConfig");
      }
    });
  });

/**
 * PUT/POST /updateBeverageRulesConfig
 * İçecek kurallarını günceller
 */
export const updateBeverageRulesConfigEndpoint = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "PUT" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use PUT or POST" });
          return;
        }

        const updates = request.body;
        await updateBeverageRulesConfig(updates);

        // Güncellenmiş config'i döndür
        const config = await getBeverageRulesConfig();
        response.json({ success: true, data: config });
      } catch (error) {
        errorResponse(response, error, "updateBeverageRulesConfig");
      }
    });
  });

/**
 * Dashboard Controller
 * Orchestrator dashboard istatistikleri
 */

import { functions, db, getCors, REGION, errorResponse } from "./shared";

/**
 * Orchestrator dashboard istatistikleri
 */
export const getOrchestratorDashboardStats = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const [assetsSnap, rulesSnap, slotsSnap, resultsSnap] = await Promise.all([
          db.collection("assets").where("isActive", "==", true).get(),
          db.collection("time-slot-rules").where("isActive", "==", true).get(),
          db.collection("scheduled-slots").orderBy("createdAt", "desc").limit(100).get(),
          db.collection("pipeline-results").orderBy("startedAt", "desc").limit(100).get(),
        ]);

        // Asset kategorilerine göre grupla
        const assetsByCategory: Record<string, number> = {};
        assetsSnap.docs.forEach(doc => {
          const category = doc.data().category;
          assetsByCategory[category] = (assetsByCategory[category] || 0) + 1;
        });

        // Slot durumlarına göre grupla
        const slotsByStatus: Record<string, number> = {};
        slotsSnap.docs.forEach(doc => {
          const status = doc.data().status;
          slotsByStatus[status] = (slotsByStatus[status] || 0) + 1;
        });

        // Toplam maliyet hesapla
        let totalCost = 0;
        resultsSnap.docs.forEach(doc => {
          totalCost += doc.data().totalCost || 0;
        });

        response.json({
          success: true,
          data: {
            assets: {
              total: assetsSnap.size,
              byCategory: assetsByCategory,
            },
            rules: {
              total: rulesSnap.size,
            },
            slots: {
              total: slotsSnap.size,
              byStatus: slotsByStatus,
            },
            pipeline: {
              totalRuns: resultsSnap.size,
              totalCost: totalCost.toFixed(4),
            },
          },
        });
      } catch (error) {
        errorResponse(response, error, "getOrchestratorDashboardStats");
      }
    });
  });

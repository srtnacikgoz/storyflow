/**
 * Dashboard Controller
 * Orchestrator dashboard istatistikleri
 */

import { functions, db, getCors, REGION, errorResponse } from "./shared";
import { onRequest } from "firebase-functions/v2/https";
import cors from "cors";

// CORS handler (cache'li - her seferinde import yapmıyoruz)
const corsHandler = cors({ origin: true });

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

/**
 * Dashboard için tüm verileri tek seferde yükle (2nd Gen - Hızlı Cold Start)
 *
 * Bu endpoint 3 ayrı API çağrısını birleştiriyor:
 * - getOrchestratorDashboardStats (stats)
 * - listScheduledSlots (slots)
 * - listThemes (themes)
 *
 * Tek cold start ile tüm veriler döner → Sayfa açılış süresi %60-70 azalır
 */
export const loadDashboardData = onRequest(
  {
    region: REGION,
    memory: "512MiB",
    timeoutSeconds: 60,
    // minInstances kaldırıldı - maliyet tasarrufu (cold start olabilir ama 3 endpoint yerine 1 tane)
  },
  async (request, response) => {
    corsHandler(request, response, async () => {
      const startTime = Date.now();

      try {
        // Query parametreleri
        const slotsLimit = parseInt(request.query.slotsLimit as string) || 50;

        // Tüm verileri paralel olarak çek
        const [
          assetsSnap,
          rulesSnap,
          slotsSnap,
          resultsSnap,
          themesSnap,
        ] = await Promise.all([
          db.collection("assets").where("isActive", "==", true).get(),
          db.collection("time-slot-rules").where("isActive", "==", true).get(),
          db.collection("scheduled-slots").orderBy("createdAt", "desc").limit(slotsLimit).get(),
          db.collection("pipeline-results").orderBy("startedAt", "desc").limit(50).get(),
          db.collection("themes").orderBy("name").get(),
        ]);

        // Stats hesapla
        const assetsByCategory: Record<string, number> = {};
        assetsSnap.docs.forEach(doc => {
          const category = doc.data().category;
          assetsByCategory[category] = (assetsByCategory[category] || 0) + 1;
        });

        const slotsByStatus: Record<string, number> = {};
        slotsSnap.docs.forEach(doc => {
          const status = doc.data().status;
          slotsByStatus[status] = (slotsByStatus[status] || 0) + 1;
        });

        let totalCost = 0;
        resultsSnap.docs.forEach(doc => {
          totalCost += doc.data().totalCost || 0;
        });

        // Slots listesi
        const slots = slotsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Themes listesi
        const themes = themesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const loadTime = Date.now() - startTime;
        console.log(`[loadDashboardData] Loaded in ${loadTime}ms`);

        response.json({
          success: true,
          stats: {
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
          slots,
          themes,
          loadTimeMs: loadTime,
        });
      } catch (error) {
        console.error("[loadDashboardData] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  }
);

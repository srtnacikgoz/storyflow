/**
 * Dashboard Controller
 * Orchestrator dashboard istatistikleri
 */

import { createHttpFunction, db } from "./shared";
import { AILogService } from "../../services/aiLogService";

// Setup durumu tipi
interface SetupItem {
  id: string;
  label: string;
  status: "complete" | "incomplete" | "warning";
  count: number;
  message?: string;
  action?: { label: string; route: string };
}

/**
 * Orchestrator dashboard istatistikleri
 */
export const getOrchestratorDashboardStats = createHttpFunction(async (request, response) => {
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
export const loadDashboardData = createHttpFunction(async (request, response) => {
  const startTime = Date.now();

  // Query parametreleri
  const slotsLimit = parseInt(request.query.slotsLimit as string) || 50;

  // Tüm verileri paralel olarak çek
  const [
    assetsSnap,
    rulesSnap,
    slotsSnap,
    resultsSnap,
    themesSnap,
    aiStatsToday,
    aiStatsMonthly,
  ] = await Promise.all([
    db.collection("assets").where("isActive", "==", true).get(),
    db.collection("time-slot-rules").where("isActive", "==", true).get(),
    db.collection("scheduled-slots").orderBy("createdAt", "desc").limit(slotsLimit).get(),
    db.collection("pipeline-results").orderBy("startedAt", "desc").limit(500).get(), // limit artırıldı
    db.collection("themes").orderBy("name").get(),
    AILogService.getStats(24), // Son 24 saat
    AILogService.getStats(720), // Son 30 gün (720 saat)
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

  // Slots listesi - pipelineResult hariç (çok büyük olabilir)
  const slots = slotsSnap.docs.map(doc => {
    const data = doc.data();
    const { pipelineResult, ...rest } = data;

    return {
      id: doc.id,
      ...rest,
      // Sadece önemli alanları dahil et
      hasPipelineResult: !!pipelineResult,
      imageUrl: pipelineResult?.generatedImage?.storageUrl || pipelineResult?.selectedPhoto?.url,
      caption: pipelineResult?.caption?.text || pipelineResult?.contentPackage?.caption,
    };
  });

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
        totalCostFromLogs: aiStatsMonthly.totalCost, // AI logs'tan gerçek maliyet
      },
    },
    // AI Harcama İstatistikleri
    aiStats: aiStatsToday,
    aiStatsMonthly: {
      totalCost: aiStatsMonthly.totalCost,
      totalCalls: aiStatsMonthly.totalCalls,
      geminiCalls: aiStatsMonthly.geminiCalls,
    },
    slots,
    themes,
    loadTimeMs: loadTime,
  });
}, { memory: "512MiB", timeoutSeconds: 60 });

/**
 * Sistem kurulum durumunu kontrol et
 * GET /getSetupStatus
 *
 * Onboarding ve sistem sağlığı için kurulum durumunu döner
 */
export const getSetupStatus = createHttpFunction(async (request, response) => {
  // Tüm verileri paralel çek
  const [
    productAssetsSnap,
    assetsSnap,
    scenariosSnap,
    themesSnap,
    timeSlotsSnap,
  ] = await Promise.all([
    // Ürün görselleri: assets koleksiyonunda category="products" olanlar
    db.collection("assets").where("isActive", "==", true).where("category", "==", "products").limit(1).get(),
    db.collection("assets").where("isActive", "==", true).get(),
    db.collection("global").doc("scenarios").collection("items").where("isActive", "==", true).get(),
    db.collection("themes").get(),
    db.collection("time-slot-rules").where("isActive", "==", true).get(),
  ]);

  // TimeSlot'ların kaçında tema var?
  const timeSlotsWithTheme = timeSlotsSnap.docs.filter(
    (doc) => doc.data().themeId
  );
  const timeSlotsWithoutTheme = timeSlotsSnap.docs.filter(
    (doc) => !doc.data().themeId
  );

  // Setup items oluştur
  const items: SetupItem[] = [
    {
      id: "products",
      label: "Ürün Görselleri",
      status: productAssetsSnap.empty ? "incomplete" : "complete",
      count: productAssetsSnap.size,
      message: productAssetsSnap.empty ? "Henüz ürün görseli eklenmedi" : undefined,
      action: productAssetsSnap.empty
        ? { label: "Görsel Ekle", route: "/assets" }
        : undefined,
    },
    {
      id: "assets",
      label: "Asset'ler (Görseller)",
      status: assetsSnap.empty ? "incomplete" : "complete",
      count: assetsSnap.size,
      message: assetsSnap.empty
        ? "Görsel asset'ler yüklenmedi"
        : undefined,
      action: assetsSnap.empty
        ? { label: "Asset Yükle", route: "/assets" }
        : undefined,
    },
    {
      id: "scenarios",
      label: "Senaryolar",
      status: scenariosSnap.empty ? "incomplete" : "complete",
      count: scenariosSnap.size,
      message: scenariosSnap.empty
        ? "Henüz senaryo oluşturulmadı"
        : undefined,
      action: scenariosSnap.empty
        ? { label: "Senaryo Oluştur", route: "/scenarios" }
        : undefined,
    },
    {
      id: "themes",
      label: "Temalar",
      status: themesSnap.empty ? "incomplete" : "complete",
      count: themesSnap.size,
      message: themesSnap.empty ? "Henüz tema oluşturulmadı" : undefined,
      action: themesSnap.empty
        ? { label: "Tema Oluştur", route: "/themes" }
        : undefined,
    },
    {
      id: "timeslots",
      label: "Zaman Dilimleri",
      status: timeSlotsSnap.empty
        ? "incomplete"
        : timeSlotsWithoutTheme.length > 0
          ? "warning"
          : "complete",
      count: timeSlotsSnap.size,
      message: timeSlotsSnap.empty
        ? "Otomatik paylaşım zamanı ayarlanmadı"
        : timeSlotsWithoutTheme.length > 0
          ? `${timeSlotsWithoutTheme.length} zaman diliminde tema seçilmedi`
          : undefined,
      action: timeSlotsSnap.empty
        ? { label: "Zaman Dilimi Ekle", route: "/timeslots" }
        : timeSlotsWithoutTheme.length > 0
          ? { label: "Tema Ata", route: "/timeslots" }
          : undefined,
    },
  ];

  // Genel durum hesapla
  const completedCount = items.filter((i) => i.status === "complete").length;
  const warningCount = items.filter((i) => i.status === "warning").length;
  const incompleteCount = items.filter((i) => i.status === "incomplete").length;

  const overallStatus: "complete" | "warning" | "incomplete" =
    incompleteCount > 0
      ? "incomplete"
      : warningCount > 0
        ? "warning"
        : "complete";

  response.json({
    success: true,
    data: {
      items,
      summary: {
        total: items.length,
        completed: completedCount,
        warnings: warningCount,
        incomplete: incompleteCount,
        overallStatus,
        progress: Math.round((completedCount / items.length) * 100),
      },
      // Detaylı bilgiler
      details: {
        timeSlotsWithTheme: timeSlotsWithTheme.length,
        timeSlotsWithoutTheme: timeSlotsWithoutTheme.length,
        timeSlotsWithoutThemeList: timeSlotsWithoutTheme.map((doc) => ({
          id: doc.id,
          name: doc.data().name || `${doc.data().startHour}:00 - ${doc.data().endHour}:00`,
        })),
      },
    },
  });
});

import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import { useLoading } from "../contexts/LoadingContext";
import type {
  OrchestratorDashboardStats,
  ScheduledSlot,
  ScheduledSlotStatus,
  Theme,
  IssueCategoryId,
  PreFlightData,
} from "../types";
import { ISSUE_CATEGORIES } from "../types";
import VisualCriticModal from "../components/VisualCriticModal";

// Instagram aspect ratio seçenekleri
// Gemini desteklediği formatlar: 1:1, 3:4, 9:16
type InstagramAspectRatio = "1:1" | "3:4" | "9:16";
const ASPECT_RATIO_OPTIONS: Record<InstagramAspectRatio, { label: string; dimensions: string; usage: string }> = {
  "1:1": { label: "Kare", dimensions: "1080×1080", usage: "Feed Post" },
  "3:4": { label: "Portre", dimensions: "1080×1440", usage: "Feed Post" },
  "9:16": { label: "Dikey", dimensions: "1080×1920", usage: "Story / Reel" },
};

// Slot durumu renkleri ve etiketleri
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  pending: { bg: "bg-gray-100", text: "text-gray-700", label: "Bekliyor", icon: "⏳" },
  generating: { bg: "bg-blue-100", text: "text-blue-700", label: "Üretiliyor", icon: "⚙️" },
  awaiting_approval: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Onay Bekliyor", icon: "👀" },
  approved: { bg: "bg-green-100", text: "text-green-700", label: "Onaylandı", icon: "✅" },
  published: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Yayınlandı", icon: "📤" },
  failed: { bg: "bg-red-100", text: "text-red-700", label: "Başarısız", icon: "❌" },
  cancelled: { bg: "bg-orange-100", text: "text-orange-700", label: "İptal Edildi", icon: "🛑" },
};

// Pipeline aşama isimleri
const STAGE_LABELS: Record<string, string> = {
  asset_selection: "Görsel Seçimi",
  metadata_analysis: "Metadata Analizi",
  prompt_optimization: "Prompt Optimizasyonu",
  image_generation: "Görsel Üretimi",
  quality_control: "Kalite Kontrol",
  content_packaging: "İçerik Paketleme",
  telegram_notification: "Telegram Bildirimi",
  completed: "Tamamlandı",
};

// gs:// URL'yi public URL'ye çevir
function convertStorageUrl(url: string | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("https://")) return url;
  if (url.startsWith("gs://")) {
    const match = url.match(/gs:\/\/([^/]+)\/(.+)/);
    if (match) {
      const [, bucket, path] = match;
      return `https://storage.googleapis.com/${bucket}/${path}`;
    }
  }
  return null;
}

// Grid boyut seçenekleri
type GridSize = "compact" | "normal" | "large";
const GRID_CONFIG: Record<GridSize, { cols: string; aspectRatio: string; label: string }> = {
  compact: { cols: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5", aspectRatio: "aspect-square", label: "Kompakt" },
  normal: { cols: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3", aspectRatio: "aspect-[4/5]", label: "Normal" },
  large: { cols: "grid-cols-1 md:grid-cols-2", aspectRatio: "aspect-[4/5]", label: "Büyük" },
};

export default function OrchestratorDashboard() {
  // Global loading context
  const { startLoading, stopLoading } = useLoading();

  const [stats, setStats] = useState<OrchestratorDashboardStats | null>(null);
  const [slots, setSlots] = useState<ScheduledSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtreler
  const [statusFilter, setStatusFilter] = useState<ScheduledSlotStatus | "all">("all");

  // Grid boyutu
  const [gridSize, _setGridSize] = useState<GridSize>("normal");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  // Üretim
  const [generating, setGenerating] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<InstagramAspectRatio>("1:1");
  const [isRandomMode, setIsRandomMode] = useState(false);

  // Pre-flight Validation
  const [validationWarnings, setValidationWarnings] = useState<Array<{ type: "info" | "warning" | "error"; message: string }>>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [preFlightData, setPreFlightData] = useState<PreFlightData | null>(null);

  // Tema seçimi
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string>("");

  // Progress Modal
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);
  const [progressInfo, setProgressInfo] = useState<{
    stage: string;
    stageIndex: number;
    totalStages: number;
    status: string;
    error?: string;
  } | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Detay Modal
  const [selectedSlot, setSelectedSlot] = useState<ScheduledSlot | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Sorun Bildir Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState<IssueCategoryId>("holding-mismatch");
  const [reportNote, setReportNote] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // Visual Critic (Analiz)
  const [showCriticModal, setShowCriticModal] = useState(false);
  const [criticContext, setCriticContext] = useState<{
    imagePath: string;
    prompt: string;
    mood?: string;
    product?: string;
    pipelineId?: string
  } | null>(null);

  // İşlem durumları
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async (showGlobalLoading = false) => {
    setLoading(true);
    setError(null);
    if (showGlobalLoading) {
      startLoading("load-data", "Veriler yükleniyor...");
    }
    try {
      const { stats: statsData, slots: slotsData, themes: themesData, aiStats, aiStatsMonthly, loadTimeMs } =
        await api.loadDashboardData(10);

      console.log(`[Dashboard] Veriler ${loadTimeMs}ms'de yüklendi`);

      setStats({
        ...statsData,
        aiStats,
        aiStatsMonthly,
      });
      setSlots(slotsData);
      setThemes(themesData);
    } catch (err) {
      console.warn("[Dashboard] loadDashboardData başarısız, fallback deneniyor...", err);
      try {
        const [statsData, slotsData, themesData] = await Promise.all([
          api.getOrchestratorDashboardStats(),
          api.listScheduledSlots({ limit: 10 }),
          api.listThemes().catch(() => []),
        ]);
        setStats(statsData);
        setSlots(slotsData);
        setThemes(themesData);
      } catch (fallbackErr) {
        setError(fallbackErr instanceof Error ? fallbackErr.message : "Veri yüklenemedi");
      }
    } finally {
      setLoading(false);
      if (showGlobalLoading) {
        stopLoading("load-data");
      }
    }
  }, [startLoading, stopLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Progress polling
  useEffect(() => {
    if (!currentSlotId || !showProgressModal) return;

    const pollInterval = setInterval(async () => {
      try {
        const slot = await api.getScheduledSlot(currentSlotId);
        if (slot) {
          setProgressInfo({
            stage: slot.currentStage || "pending",
            stageIndex: slot.stageIndex || 0,
            totalStages: slot.totalStages || 7,
            status: slot.status,
            error: slot.error,
          });

          if (slot.status === "awaiting_approval" || slot.status === "failed") {
            clearInterval(pollInterval);
            setGenerating(false);
            loadData();
          }
        }
      } catch (err) {
        console.error("Progress poll error:", err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentSlotId, showProgressModal, loadData]);

  // Elapsed time counter
  useEffect(() => {
    if (!generating) return;
    const timer = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [generating]);

  // Filtrelenmiş slotlar
  const filteredSlots = slots.filter((slot) => {
    if (statusFilter !== "all" && slot.status !== statusFilter) return false;
    return true;
  });

  // Pre-flight validation çalıştır ve sonra üret
  const runGenerateAfterValidation = async () => {
    setGenerating(true);
    setElapsedTime(0);
    setProgressInfo(null);
    setShowProgressModal(true);
    setShowValidationModal(false);

    try {
      const result = await api.orchestratorGenerateNow(
        selectedThemeId || undefined,
        selectedAspectRatio,
        isRandomMode || undefined
      );
      setCurrentSlotId(result.slotId);

      if (result.success) {
        setProgressInfo({
          stage: "asset-selection",
          stageIndex: 1,
          totalStages: 7,
          status: "generating",
        });
      } else {
        setProgressInfo({
          stage: "failed",
          stageIndex: 0,
          totalStages: 7,
          status: "failed",
          error: result.error,
        });
      }
    } catch (err) {
      setProgressInfo({
        stage: "failed",
        stageIndex: 0,
        totalStages: 7,
        status: "failed",
        error: err instanceof Error ? err.message : "Bilinmeyen hata",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Hemen üret (pre-flight validation ile)
  const handleGenerateNow = async () => {
    if (isRandomMode || !selectedThemeId) {
      runGenerateAfterValidation();
      return;
    }

    setValidationLoading(true);
    try {
      const validation = await api.validateBeforeGenerate(selectedThemeId);
      setValidationWarnings(validation.warnings);
      setPreFlightData(validation.preFlightData || null);
      setShowValidationModal(true);
    } catch {
      runGenerateAfterValidation();
    } finally {
      setValidationLoading(false);
    }
  };

  // Pipeline'ı iptal et
  const handleCancelPipeline = async () => {
    if (!currentSlotId) return;
    if (!confirm("Pipeline iptal edilecek. Emin misiniz?")) return;

    try {
      await api.cancelSlotPipeline(currentSlotId);
      setProgressInfo({
        stage: "cancelled",
        stageIndex: 0,
        totalStages: 7,
        status: "cancelled" as ScheduledSlot["status"],
      });
      setGenerating(false);
      loadData();
    } catch (err) {
      alert("İptal hatası: " + (err instanceof Error ? err.message : "Bilinmeyen"));
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Bu slot silinecek. Emin misiniz?")) return;
    setActionLoading(slotId);
    startLoading(`delete-${slotId}`, "Slot siliniyor...");
    try {
      await api.deleteScheduledSlot(slotId);
      loadData();
    } catch (err) {
      alert("Hata: " + (err instanceof Error ? err.message : "Bilinmeyen"));
    } finally {
      setActionLoading(null);
      stopLoading(`delete-${slotId}`);
    }
  };

  const handleRetrySlot = async (slotId: string) => {
    if (!confirm("Slot yeniden denenecek. Emin misiniz?")) return;
    setActionLoading(slotId);
    startLoading(`retry-${slotId}`, "Yeniden deneniyor...");
    try {
      await api.retrySlot(slotId);
      alert("Yeniden deneme başlatıldı!");
      loadData();
    } catch (err) {
      alert("Hata: " + (err instanceof Error ? err.message : "Bilinmeyen"));
    } finally {
      setActionLoading(null);
      stopLoading(`retry-${slotId}`);
    }
  };

  const handleApproveSlot = async (slotId: string) => {
    if (!confirm("Slot onaylanıp Instagram'a yayınlanacak. Emin misiniz?")) return;
    setActionLoading(slotId);
    startLoading(`approve-${slotId}`, "Instagram'a yayınlanıyor...");
    try {
      await api.approveSlot(slotId);
      alert("Yayınlandı!");
      loadData();
      setShowDetailModal(false);
    } catch (err) {
      alert("Hata: " + (err instanceof Error ? err.message : "Bilinmeyen"));
    } finally {
      setActionLoading(null);
      stopLoading(`approve-${slotId}`);
    }
  };

  const handleRejectSlot = async (slotId: string) => {
    if (!confirm("Slot reddedilecek. Emin misiniz?")) return;
    setActionLoading(slotId);
    startLoading(`reject-${slotId}`, "Slot reddediliyor...");
    try {
      await api.rejectSlot(slotId);
      loadData();
      setShowDetailModal(false);
    } catch (err) {
      alert("Hata: " + (err instanceof Error ? err.message : "Bilinmeyen"));
    } finally {
      setActionLoading(null);
      stopLoading(`reject-${slotId}`);
    }
  };

  const handleResendTelegram = async (slotId: string) => {
    setActionLoading(slotId);
    startLoading(`telegram-${slotId}`, "Telegram bildirimi gönderiliyor...");
    try {
      await api.orchestratorResendTelegram(slotId);
      alert("Telegram bildirimi gönderildi!");
    } catch (err) {
      alert("Hata: " + (err instanceof Error ? err.message : "Bilinmeyen"));
    } finally {
      setActionLoading(null);
      stopLoading(`telegram-${slotId}`);
    }
  };

  const openDetailModal = async (slot: ScheduledSlot) => {
    try {
      const fullSlot = await api.getSlotDetail(slot.id);
      setSelectedSlot(fullSlot);
      setShowDetailModal(true);
    } catch (err) {
      alert("Detay yüklenemedi: " + (err instanceof Error ? err.message : "Bilinmeyen"));
    }
  };

  const handleReportIssue = async () => {
    if (!selectedSlot) return;

    setReportLoading(true);
    startLoading("report-issue", "Geri bildirim gönderiliyor...");
    try {
      const pipelineResult = selectedSlot.pipelineResult;

      await api.createFeedback({
        slotId: selectedSlot.id,
        category: reportCategory,
        customNote: reportNote || undefined,
        pipelineId: pipelineResult?.id,
        scenarioId: pipelineResult?.scenarioSelection?.scenarioId,
        productType: pipelineResult?.assetSelection?.product?.subType,
        productId: pipelineResult?.assetSelection?.product?.id,
        handStyleId: pipelineResult?.scenarioSelection?.handStyle || undefined,
        compositionId: pipelineResult?.scenarioSelection?.composition,
      });

      alert("Geri bildirim kaydedildi! AI bir sonraki üretimde bu hatayı dikkate alacak.");
      setShowReportModal(false);
      setReportNote("");
      setReportCategory("holding-mismatch");
    } catch (err) {
      alert("Hata: " + (err instanceof Error ? err.message : "Bilinmeyen"));
    } finally {
      setReportLoading(false);
      stopLoading("report-issue");
    }
  };

  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border-red-200">
        <p className="text-red-600">{error}</p>
        <button onClick={() => loadData(true)} className="btn-secondary mt-4">Tekrar Dene</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ==================== MODALS ==================== */}

      {/* Pre-flight Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Üretim Kontrolü</h3>

            {preFlightData ? (
              <div className="space-y-4 mb-6">
                {/* Tema & Senaryo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-purple-600 mb-1">Tema</div>
                    <div className="font-semibold text-gray-800">{preFlightData.theme.name}</div>
                    <div className="flex gap-1 mt-1">
                      {preFlightData.theme.petAllowed && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Pet</span>}
                      {preFlightData.theme.accessoryAllowed && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Aksesuar</span>}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-blue-600 mb-1">
                      Senaryo {preFlightData.scenarioCount > 1 && <span className="text-blue-400">({preFlightData.scenarioCount} aday)</span>}
                    </div>
                    <div className="font-semibold text-gray-800">{preFlightData.scenario.name}</div>
                    {preFlightData.scenario.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{preFlightData.scenario.description}</div>
                    )}
                  </div>
                </div>

                {/* Pipeline Özeti */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-500 mb-2">Pipeline Özeti</div>
                  <div className="flex flex-wrap gap-2">
                    {preFlightData.scenario.suggestedProducts.length > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                        {preFlightData.scenario.suggestedProducts.join(", ")}
                      </span>
                    )}
                    {preFlightData.scenario.compositionId && (
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                        {preFlightData.scenario.compositionId}
                      </span>
                    )}
                    {preFlightData.scenario.includesHands && preFlightData.scenario.handPose && (
                      <span className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded-full">
                        {preFlightData.scenario.handPose}
                      </span>
                    )}
                    {!preFlightData.scenario.includesHands && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">El yok</span>
                    )}
                    {preFlightData.beverage && !(preFlightData.theme.preferredTags?.cup?.includes("__none__")) && (
                      <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full">
                        {preFlightData.beverage.defaultBeverage}
                        {preFlightData.beverage.alternateBeverage && ` / ${preFlightData.beverage.alternateBeverage}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Asset Havuzu */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-500 mb-2">Asset Havuzu <span className="font-normal text-gray-400">— AI bu adaylardan seçecek</span></div>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { label: "Ürün", total: preFlightData.assets.products.total, preferred: undefined, tags: preFlightData.scenario.suggestedProducts.length > 0 ? preFlightData.scenario.suggestedProducts : undefined, preview: preFlightData.assets.products.preview },
                      { label: "Masa", total: preFlightData.assets.tables.total, preferred: preFlightData.assets.tables.preferred, tags: preFlightData.theme.preferredTags?.table, preview: preFlightData.assets.tables.preview },
                      { label: "Tabak", total: preFlightData.assets.plates.total, preferred: preFlightData.assets.plates.preferred, tags: preFlightData.theme.preferredTags?.plate, preview: preFlightData.assets.plates.preview },
                      { label: "Fincan", total: preFlightData.assets.cups.total, preferred: preFlightData.assets.cups.preferred, tags: preFlightData.theme.preferredTags?.cup, preview: preFlightData.assets.cups.preview },
                    ] as Array<{ label: string; total: number; preferred: number | undefined; tags: string[] | undefined; preview: { id: string; filename: string; url: string; tags: string[] } | undefined }>).map((item) => {
                      const isNone = item.tags?.includes("__none__");
                      const activeTags = item.tags?.filter(t => t !== "__none__") || [];
                      return (
                        <div key={item.label} className={`bg-white rounded-lg p-2 border ${isNone ? "opacity-50 bg-gray-50" : ""}`}>
                          <div className="text-xs font-medium text-gray-500 mb-1">{item.label}</div>
                          {isNone ? (
                            <div className="flex flex-col items-center py-2">
                              <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 text-lg">—</div>
                              <div className="text-xs text-gray-400 mt-1">Yok</div>
                            </div>
                          ) : item.preview?.url ? (
                            <div className="flex flex-col items-center">
                              <img
                                src={item.preview.url}
                                alt={item.preview.filename}
                                className="w-14 h-14 rounded-lg object-cover border border-gray-200"
                              />
                              <div className="text-[10px] text-gray-600 mt-1 truncate w-full text-center" title={item.preview.filename}>
                                {item.preview.filename.length > 12 ? item.preview.filename.slice(0, 12) + "…" : item.preview.filename}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {item.preferred !== undefined && activeTags.length > 0
                                  ? `${item.preferred}/${item.total} tercihli`
                                  : `${item.total} aday`
                                }
                              </div>
                              {activeTags.length > 0 && (
                                <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                                  {activeTags.slice(0, 2).map(t => (
                                    <span key={t} className="text-[9px] bg-gray-100 text-gray-500 px-1 py-px rounded">{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className={`text-lg font-bold ${item.total === 0 ? "text-red-500" : "text-gray-800"}`}>
                                {item.total}
                              </div>
                              {item.preferred !== undefined && activeTags.length > 0 && (
                                <div className={`text-xs ${item.preferred > 0 ? "text-green-600" : "text-amber-600"}`}>
                                  {item.preferred} tercih
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Atmosfer Preset'leri */}
                {(preFlightData.theme.presets.weather || preFlightData.theme.presets.lighting || preFlightData.theme.presets.atmosphere) && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-gray-500 mb-2">Atmosfer</div>
                    <div className="flex flex-wrap gap-2">
                      {preFlightData.theme.presets.weather && (
                        <span className="text-xs bg-sky-100 text-sky-800 px-2 py-1 rounded-full">
                          {preFlightData.theme.presets.weather}
                        </span>
                      )}
                      {preFlightData.theme.presets.lighting && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          {preFlightData.theme.presets.lighting}
                        </span>
                      )}
                      {preFlightData.theme.presets.atmosphere && (
                        <span className="text-xs bg-violet-100 text-violet-800 px-2 py-1 rounded-full">
                          {preFlightData.theme.presets.atmosphere}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Uyarılar */}
                {validationWarnings.filter(w => w.type !== "info").length > 0 && (
                  <div className="space-y-2">
                    {validationWarnings.filter(w => w.type !== "info").map((w, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg text-sm ${
                          w.type === "error" ? "bg-red-50 text-red-700 border border-red-200" :
                          "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {w.type === "error" ? "❌" : "⚠️"} {w.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                {validationWarnings.map((w, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg text-sm ${
                      w.type === "error" ? "bg-red-50 text-red-700 border border-red-200" :
                      w.type === "warning" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {w.type === "error" ? "❌" : w.type === "warning" ? "⚠️" : "ℹ️"} {w.message}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              {!validationWarnings.some(w => w.type === "error") && (
                <button
                  onClick={() => { setShowValidationModal(false); runGenerateAfterValidation(); }}
                  className="flex-1 btn-primary"
                >
                  Devam Et
                </button>
              )}
              <button
                onClick={() => setShowValidationModal(false)}
                className="flex-1 btn-secondary"
              >
                {validationWarnings.some(w => w.type === "error") ? "Kapat" : "İptal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Üretim Durumu</h3>

            {progressInfo ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-mono font-bold text-gray-700">{formatElapsedTime(elapsedTime)}</p>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-brand-blue h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${((progressInfo.stageIndex) / progressInfo.totalStages) * 100}%` }}
                  />
                </div>

                <p className="text-center text-sm text-gray-600">
                  {STAGE_LABELS[progressInfo.stage] || progressInfo.stage}
                  <span className="text-gray-400 ml-2">({progressInfo.stageIndex}/{progressInfo.totalStages})</span>
                </p>

                {progressInfo.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {progressInfo.error}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-mono font-bold text-gray-700">{formatElapsedTime(elapsedTime)}</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-brand-blue h-2.5 rounded-full w-1/3 animate-[indeterminate_1.5s_ease-in-out_infinite]" />
                </div>
                <p className="text-center text-sm text-gray-500">Pipeline başlatılıyor...</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {progressInfo?.status === "awaiting_approval" || progressInfo?.status === "failed" ? (
                <button
                  onClick={() => { setShowProgressModal(false); setCurrentSlotId(null); }}
                  className="flex-1 btn-primary"
                >
                  Tamam
                </button>
              ) : (
                <button
                  onClick={handleCancelPipeline}
                  className="flex-1 btn-secondary text-red-600"
                >
                  İptal Et
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl w-full max-w-4xl mx-4 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Üretim Detayı</h2>
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(selectedSlot.createdAt)}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Sol: Görsel */}
              <div className="bg-gray-50 flex items-center justify-center p-6 min-h-[300px]">
                {(() => {
                  const storageUrl = convertStorageUrl(selectedSlot.pipelineResult?.generatedImage?.storageUrl);
                  const base64Url = selectedSlot.pipelineResult?.generatedImage?.imageBase64
                    ? `data:${selectedSlot.pipelineResult.generatedImage.mimeType};base64,${selectedSlot.pipelineResult.generatedImage.imageBase64}`
                    : null;
                  const imageUrl = storageUrl || base64Url;
                  return imageUrl ? (
                    <img src={imageUrl} alt="Üretilen Görsel" className="max-h-[500px] w-auto rounded-xl shadow-lg object-contain" />
                  ) : (
                    <div className="text-gray-400 text-center">
                      <div className="text-4xl mb-2">🎬</div>
                      <p className="text-sm">Görsel henüz üretilmedi</p>
                    </div>
                  );
                })()}
              </div>

              {/* Sağ: Detaylar */}
              <div className="p-5 space-y-4 overflow-y-auto max-h-[600px]">
                {/* Durum */}
                {(() => {
                  const config = STATUS_CONFIG[selectedSlot.status] || STATUS_CONFIG.pending;
                  return (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
                      {config.icon} {config.label}
                    </div>
                  );
                })()}

                {/* Kalite Skoru */}
                {selectedSlot.pipelineResult?.qualityControl && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Kalite Skoru</span>
                      <span className={`text-xl font-bold ${
                        (selectedSlot.pipelineResult.qualityControl.score || 0) >= 7 ? "text-green-600" :
                        (selectedSlot.pipelineResult.qualityControl.score || 0) >= 5 ? "text-amber-600" : "text-red-600"
                      }`}>
                        {selectedSlot.pipelineResult.qualityControl.score}/10
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {Object.entries(selectedSlot.pipelineResult.qualityControl.evaluation || {}).map(([key, val]) => (
                        <div key={key} className="text-center">
                          <div className="text-xs text-gray-500 truncate">{key}</div>
                          <div className="text-sm font-semibold">{val as number}/10</div>
                        </div>
                      ))}
                    </div>
                    {selectedSlot.pipelineResult.qualityControl.feedback && (
                      <p className="text-xs text-gray-600 mt-3 bg-white p-2 rounded-lg">{selectedSlot.pipelineResult.qualityControl.feedback}</p>
                    )}
                  </div>
                )}

                {/* Senaryo */}
                {selectedSlot.pipelineResult?.scenarioSelection && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Senaryo</h4>
                    <p className="font-semibold text-gray-900">{selectedSlot.pipelineResult.scenarioSelection.scenarioName}</p>
                    {selectedSlot.pipelineResult.scenarioSelection.themeName && (
                      <p className="text-xs text-purple-600 mt-1">Tema: {selectedSlot.pipelineResult.scenarioSelection.themeName}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-xs bg-white px-2 py-0.5 rounded border">{selectedSlot.pipelineResult.scenarioSelection.composition}</span>
                      {selectedSlot.pipelineResult.scenarioSelection.includesHands && (
                        <span className="text-xs bg-pink-50 text-pink-700 px-2 py-0.5 rounded border border-pink-200">
                          {selectedSlot.pipelineResult.scenarioSelection.handStyleDetails?.name || selectedSlot.pipelineResult.scenarioSelection.handStyle || "El var"}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Asset Seçimi */}
                {selectedSlot.pipelineResult?.assetSelection && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Seçilen Görseller</h4>
                    <div className="space-y-2">
                      {/* Ürün */}
                      <div className="flex items-center gap-3">
                        {selectedSlot.pipelineResult.assetSelection.product.storageUrl && (
                          <img src={convertStorageUrl(selectedSlot.pipelineResult.assetSelection.product.storageUrl) || ""} alt="Ürün" className="w-10 h-10 object-cover rounded-lg" />
                        )}
                        <div>
                          <p className="text-xs font-medium">Ürün</p>
                          <p className="text-xs text-gray-500">{selectedSlot.pipelineResult.assetSelection.product.subType} - {selectedSlot.pipelineResult.assetSelection.product.filename}</p>
                        </div>
                      </div>
                      {/* Masa */}
                      {selectedSlot.pipelineResult.assetSelection.table && (
                        <div className="flex items-center gap-3">
                          {selectedSlot.pipelineResult.assetSelection.table.storageUrl && (
                            <img src={convertStorageUrl(selectedSlot.pipelineResult.assetSelection.table.storageUrl) || ""} alt="Masa" className="w-10 h-10 object-cover rounded-lg" />
                          )}
                          <div>
                            <p className="text-xs font-medium">Masa</p>
                            <p className="text-xs text-gray-500">{selectedSlot.pipelineResult.assetSelection.table.filename}</p>
                          </div>
                        </div>
                      )}
                      {/* Tabak */}
                      {selectedSlot.pipelineResult.assetSelection.plate && (
                        <div className="flex items-center gap-3">
                          {selectedSlot.pipelineResult.assetSelection.plate.storageUrl && (
                            <img src={convertStorageUrl(selectedSlot.pipelineResult.assetSelection.plate.storageUrl) || ""} alt="Tabak" className="w-10 h-10 object-cover rounded-lg" />
                          )}
                          <div>
                            <p className="text-xs font-medium">Tabak</p>
                            <p className="text-xs text-gray-500">{selectedSlot.pipelineResult.assetSelection.plate.filename}</p>
                          </div>
                        </div>
                      )}
                      {/* Fincan */}
                      {selectedSlot.pipelineResult.assetSelection.cup && (
                        <div className="flex items-center gap-3">
                          {selectedSlot.pipelineResult.assetSelection.cup.storageUrl && (
                            <img src={convertStorageUrl(selectedSlot.pipelineResult.assetSelection.cup.storageUrl) || ""} alt="Fincan" className="w-10 h-10 object-cover rounded-lg" />
                          )}
                          <div>
                            <p className="text-xs font-medium">Fincan</p>
                            <p className="text-xs text-gray-500">{selectedSlot.pipelineResult.assetSelection.cup.filename}</p>
                          </div>
                        </div>
                      )}
                      {/* Pet */}
                      {selectedSlot.pipelineResult.assetSelection.pet && (
                        <div className="flex items-center gap-3">
                          {selectedSlot.pipelineResult.assetSelection.pet.storageUrl && (
                            <img src={convertStorageUrl(selectedSlot.pipelineResult.assetSelection.pet.storageUrl) || ""} alt="Pet" className="w-10 h-10 object-cover rounded-lg" />
                          )}
                          <div>
                            <p className="text-xs font-medium">Evcil Hayvan</p>
                            <p className="text-xs text-gray-500">{selectedSlot.pipelineResult.assetSelection.pet.filename}</p>
                          </div>
                        </div>
                      )}
                      {/* Aksesuar */}
                      {selectedSlot.pipelineResult.assetSelection.accessory && (
                        <div className="flex items-center gap-3">
                          {selectedSlot.pipelineResult.assetSelection.accessory.storageUrl && (
                            <img src={convertStorageUrl(selectedSlot.pipelineResult.assetSelection.accessory.storageUrl) || ""} alt="Aksesuar" className="w-10 h-10 object-cover rounded-lg" />
                          )}
                          <div>
                            <p className="text-xs font-medium">Aksesuar</p>
                            <p className="text-xs text-gray-500">{selectedSlot.pipelineResult.assetSelection.accessory.subType} - {selectedSlot.pipelineResult.assetSelection.accessory.filename}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Maliyet */}
                {selectedSlot.pipelineResult?.totalCost !== undefined && (
                  <div className="p-3 bg-amber-50 rounded-xl flex items-center justify-between">
                    <span className="text-sm text-amber-800">Üretim Maliyeti</span>
                    <span className="font-bold text-amber-900">${selectedSlot.pipelineResult.totalCost.toFixed(4)}</span>
                  </div>
                )}

                {/* Hata */}
                {selectedSlot.status === "failed" && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <h4 className="font-medium text-red-700 mb-1">Hata</h4>
                    <p className="text-sm text-red-600">
                      {selectedSlot.pipelineResult?.status?.error || "Bilinmeyen hata"}
                    </p>
                  </div>
                )}

                {/* Aksiyonlar */}
                <div className="pt-4 border-t space-y-2">
                  {selectedSlot.status === "awaiting_approval" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveSlot(selectedSlot.id)}
                        disabled={actionLoading === selectedSlot.id}
                        className="flex-1 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50"
                      >
                        {actionLoading === selectedSlot.id ? "..." : "Onayla ve Yayınla"}
                      </button>
                      <button
                        onClick={() => handleRejectSlot(selectedSlot.id)}
                        disabled={actionLoading === selectedSlot.id}
                        className="flex-1 py-2 text-sm font-medium border border-red-200 text-red-600 rounded-xl hover:bg-red-50 disabled:opacity-50"
                      >
                        Reddet
                      </button>
                    </div>
                  )}

                  {selectedSlot.status === "awaiting_approval" && (
                    <button
                      onClick={() => handleResendTelegram(selectedSlot.id)}
                      disabled={actionLoading === selectedSlot.id}
                      className="w-full py-2 text-sm font-medium border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50"
                    >
                      Telegram'a Tekrar Gönder
                    </button>
                  )}

                  {selectedSlot.status === "failed" && (
                    <button
                      onClick={() => handleRetrySlot(selectedSlot.id)}
                      disabled={actionLoading === selectedSlot.id}
                      className="w-full py-2 text-sm font-medium bg-brand-blue text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                    >
                      Yeniden Dene
                    </button>
                  )}

                  {selectedSlot.pipelineResult?.generatedImage && (
                    <button
                      onClick={() => {
                        setCriticContext({
                          imagePath: selectedSlot.pipelineResult?.generatedImage?.storageUrl || "",
                          prompt: selectedSlot.pipelineResult?.optimizedPrompt?.mainPrompt || "",
                          mood: selectedSlot.pipelineResult?.scenarioSelection?.themeName,
                          product: selectedSlot.pipelineResult?.assetSelection?.product?.subType,
                          pipelineId: selectedSlot.pipelineResult?.id
                        });
                        setShowCriticModal(true);
                      }}
                      className="w-full py-2 text-sm font-medium border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50"
                    >
                      Analiz Et (Visual Critic)
                    </button>
                  )}

                  {selectedSlot.pipelineResult?.generatedImage && (
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="w-full py-2 text-sm font-medium border border-amber-200 text-amber-600 rounded-xl hover:bg-amber-50"
                    >
                      Sorun Bildir
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteSlot(selectedSlot.id)}
                    disabled={actionLoading === selectedSlot.id}
                    className="w-full py-2 text-sm font-medium border border-red-200 text-red-600 rounded-xl hover:bg-red-50 disabled:opacity-50"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sorun Bildir Modal */}
      {showReportModal && selectedSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Sorun Bildir</h2>
            <p className="text-sm text-gray-600 mb-4">
              Bu geri bildirim, AI'ın bir sonraki üretimde daha iyi sonuçlar vermesine yardımcı olacak.
            </p>

            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700">Sorun Türü</label>
              <select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value as IssueCategoryId)}
                className="w-full p-3 border border-gray-200 rounded-lg text-sm"
              >
                {Object.entries(ISSUE_CATEGORIES).map(([id, cat]) => (
                  <option key={id} value={id}>
                    {cat.label} - {cat.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 mb-6">
              <label className="block text-sm font-medium text-gray-700">Ek Açıklama (opsiyonel)</label>
              <textarea
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                placeholder="Sorunu daha detaylı açıklamak isterseniz..."
                className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-y"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReportIssue}
                disabled={reportLoading}
                className="flex-1 btn-primary bg-amber-600 hover:bg-amber-700"
              >
                {reportLoading ? "Gönderiliyor..." : "Gönder"}
              </button>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportNote("");
                }}
                className="flex-1 btn-secondary"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Critic Modal */}
      {showCriticModal && criticContext && (
        <VisualCriticModal
          isOpen={showCriticModal}
          onClose={() => setShowCriticModal(false)}
          {...criticContext}
        />
      )}

      {/* ==================== MAIN CONTENT ==================== */}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Maestro AI</h1>
          <p className="text-sm text-gray-400 mt-0.5">Otomatik içerik üretim pipeline'ı</p>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                {stats.assets.total} asset
              </span>
              <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                {stats.pipeline.totalRuns} üretim
              </span>
              <span className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full">
                ${stats.pipeline.totalCost || "0.00"}
              </span>
            </div>
          )}
          <button
            onClick={() => loadData(true)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Yenile"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Asset Uyarısı */}
      {stats?.assets.total === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800">Henüz Görsel Yok!</p>
              <p className="text-amber-700 text-sm mt-1">
                İçerik üretmek için önce ürün görselleri yüklemeniz gerekiyor.
              </p>
              <a href="/assets" className="inline-block mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">
                Görseller Sayfasına Git
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TWO COLUMN LAYOUT ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT PANEL - Kontroller */}
        <div className="lg:col-span-4 space-y-5">

          {/* Tema + Üretim Kartı */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden lg:sticky lg:top-4">
            {/* Tema başlık */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Tema Seçimi</h2>
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRandomMode}
                  onChange={(e) => setIsRandomMode(e.target.checked)}
                  className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue h-3.5 w-3.5"
                />
                Rastgele
              </label>
            </div>

            {/* Tema kartları */}
            {themes.length > 0 && (
              <div className="p-2 space-y-1.5 max-h-[380px] overflow-y-auto">
                {/* Tema Yok */}
                <button
                  onClick={() => setSelectedThemeId("")}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                    selectedThemeId === ""
                      ? "border-gray-400 bg-gray-50 shadow-sm"
                      : "border-transparent hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">🎲</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700">Rastgele</p>
                      <p className="text-[11px] text-gray-400 truncate">Sistem otomatik seçsin</p>
                    </div>
                  </div>
                </button>

                {/* Tema Kartları */}
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedThemeId(theme.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                      selectedThemeId === theme.id
                        ? "border-brand-blue bg-brand-blue/5 shadow-sm"
                        : "border-transparent hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-gray-800 truncate">{theme.name}</span>
                      <div className="flex gap-0.5 flex-shrink-0 ml-2">
                        {theme.petAllowed && <span className="text-[10px]">🐕</span>}
                        {theme.accessoryAllowed && <span className="text-[10px]">✨</span>}
                      </div>
                    </div>
                    {theme.description && (
                      <p className="text-[11px] text-gray-500 line-clamp-1 mb-1">{theme.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {theme.scenarios.slice(0, 2).map((scenario) => (
                        <span key={scenario} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                          {scenario}
                        </span>
                      ))}
                      {theme.scenarios.length > 2 && (
                        <span className="text-[10px] text-gray-400">+{theme.scenarios.length - 2}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Üret bölümü */}
            <div className="p-3 border-t border-gray-100 bg-gray-50/50 space-y-2.5">
              <select
                value={selectedAspectRatio}
                onChange={(e) => setSelectedAspectRatio(e.target.value as InstagramAspectRatio)}
                className="w-full text-sm p-2 border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-brand-blue focus:border-brand-blue"
              >
                {Object.entries(ASPECT_RATIO_OPTIONS).map(([value, option]) => (
                  <option key={value} value={value}>
                    {option.label} ({value}) - {option.usage}
                  </option>
                ))}
              </select>
              <button
                onClick={handleGenerateNow}
                disabled={generating || validationLoading}
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validationLoading ? "Kontrol ediliyor..." : generating ? "Üretiliyor..." : "Şimdi Üret"}
              </button>
            </div>
          </div>

          {/* AI Harcamaları */}
          {(stats?.aiStats || stats?.aiStatsMonthly) && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">AI Harcamaları</h3>

              {stats?.aiStatsMonthly && (
                <div className="mb-3">
                  <p className="text-2xl font-bold text-gray-900">${stats.aiStatsMonthly.totalCost?.toFixed(2) || "0.00"}</p>
                  <p className="text-xs text-gray-500">Son 30 gün · {stats.aiStatsMonthly.geminiCalls || 0} çağrı</p>
                </div>
              )}

              {stats?.aiStats && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-sm font-semibold text-gray-800">${stats.aiStats.totalCost?.toFixed(4) || "0"}</p>
                    <p className="text-[10px] text-gray-500">Bugün</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-sm font-semibold text-gray-800">{stats.aiStats.successRate?.toFixed(0) || 0}%</p>
                    <p className="text-[10px] text-gray-500">Başarı</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-sm font-semibold text-gray-800">{stats.aiStats.geminiCalls || 0}</p>
                    <p className="text-[10px] text-gray-500">Çağrı</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-sm font-semibold text-gray-800">{((stats.aiStats.avgDurationMs || 0) / 1000).toFixed(1)}s</p>
                    <p className="text-[10px] text-gray-500">Ort. Süre</p>
                  </div>
                </div>
              )}

              {stats?.pipeline?.totalCostFromLogs !== undefined &&
                Math.abs(parseFloat(stats.pipeline.totalCost || "0") - stats.pipeline.totalCostFromLogs) > 0.1 && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-700">
                    Pipeline (${stats.pipeline.totalCost}) ile AI logları
                    (${stats.pipeline.totalCostFromLogs?.toFixed(2)}) arasında fark var.
                  </div>
                )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Sonuçlar */}
        <div className="lg:col-span-8 space-y-4">

          {/* Filtre Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {stats?.slots.byStatus && Object.keys(stats.slots.byStatus).length > 0 && (
                <>
                  {Object.entries(stats.slots.byStatus).map(([status, count]) => {
                    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
                    return (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status as ScheduledSlotStatus)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === status ? "ring-2 ring-brand-blue ring-offset-1" : ""
                        } ${config.bg} ${config.text}`}
                      >
                        {config.icon} {config.label}: {count}
                      </button>
                    );
                  })}
                  {statusFilter !== "all" && (
                    <button
                      onClick={() => setStatusFilter("all")}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      Temizle
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{filteredSlots.length} sonuç</span>
              <div className="flex bg-gray-100 p-0.5 rounded-lg">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
                  title="Grid"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
                  title="Liste"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Slot İçeriği */}
          {filteredSlots.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <div className="text-gray-300 text-5xl mb-3">🎬</div>
              <p className="text-gray-500 text-sm">Henüz üretim yok</p>
              <p className="text-gray-400 text-xs mt-1">Soldan bir tema seçip "Şimdi Üret" butonuna basın</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className={`grid ${GRID_CONFIG[gridSize].cols} gap-3`}>
              {filteredSlots.map((slot) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  aspectRatio={GRID_CONFIG[gridSize].aspectRatio}
                  compact={gridSize === "compact"}
                  onView={() => openDetailModal(slot)}
                  onDelete={() => handleDeleteSlot(slot.id)}
                  onRetry={() => handleRetrySlot(slot.id)}
                  onApprove={() => handleApproveSlot(slot.id)}
                  onReject={() => handleRejectSlot(slot.id)}
                  loading={actionLoading === slot.id}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50/80">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Görsel</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tarih</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Ürün</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSlots.map((slot) => {
                      const statusConfig = STATUS_CONFIG[slot.status] || STATUS_CONFIG.pending;
                      return (
                        <tr key={slot.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            {(() => {
                              const storageUrl = convertStorageUrl(slot.pipelineResult?.generatedImage?.storageUrl);
                              const imageUrl = storageUrl || (slot.pipelineResult?.generatedImage?.imageBase64 ? `data:image/jpeg;base64,${slot.pipelineResult?.generatedImage?.imageBase64}` : null);
                              return imageUrl ? (
                                <img src={imageUrl} alt="Slot" className="h-10 w-10 rounded-lg bg-gray-100 object-cover cursor-pointer" onClick={() => openDetailModal(slot)} />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">Yok</div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(slot.createdAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-medium rounded-lg ${statusConfig.bg} ${statusConfig.text}`}>
                              {statusConfig.icon} {statusConfig.label}
                            </span>
                            {slot.currentStage && slot.status !== "published" && slot.status !== "failed" && slot.status !== "awaiting_approval" && (
                              <div className="text-[10px] text-gray-400 mt-0.5">{STAGE_LABELS[slot.currentStage] || slot.currentStage}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {slot.pipelineResult?.assetSelection?.product?.subType || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                            <button onClick={() => openDetailModal(slot)} className="text-brand-blue hover:text-blue-800 mr-2 font-medium">Detay</button>
                            {slot.status === "awaiting_approval" && (
                              <button onClick={() => handleApproveSlot(slot.id)} className="text-green-600 hover:text-green-800 mr-2 font-medium">Onayla</button>
                            )}
                            <button onClick={() => handleDeleteSlot(slot.id)} className="text-red-500 hover:text-red-700 font-medium">Sil</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Slot Card
function SlotCard({ slot, aspectRatio, compact, onView, onDelete, onRetry, onApprove, onReject, loading }: {
  slot: ScheduledSlot;
  aspectRatio: string;
  compact: boolean;
  onView: () => void;
  onDelete: () => void;
  onRetry: () => void;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  const config = STATUS_CONFIG[slot.status] || STATUS_CONFIG.pending;

  const storageUrl = convertStorageUrl(slot.pipelineResult?.generatedImage?.storageUrl);
  const base64Url = slot.pipelineResult?.generatedImage?.imageBase64
    ? `data:${slot.pipelineResult.generatedImage.mimeType};base64,${slot.pipelineResult.generatedImage.imageBase64}`
    : null;
  const imageUrl = storageUrl || base64Url;

  return (
    <div className="group border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-all bg-white">
      {/* Görsel */}
      <div onClick={onView} className={`${aspectRatio} bg-gray-50 relative cursor-pointer`}>
        {imageUrl ? (
          <img src={imageUrl} alt="Üretilen" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            {slot.status === "generating" ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-blue mx-auto mb-1"></div>
                {!compact && <span className="text-[10px] text-gray-400">{STAGE_LABELS[slot.currentStage || ""] || "Üretiliyor..."}</span>}
              </div>
            ) : (
              <span className="text-xs text-gray-400">Görsel yok</span>
            )}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs font-medium bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">Detay</span>
        </div>

        {/* Status badge */}
        <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-lg text-[10px] font-medium backdrop-blur-sm ${config.bg} ${config.text}`}>
          {config.icon} {!compact && config.label}
        </div>
      </div>

      {/* Bilgi */}
      {!compact && (
        <div className="p-2.5">
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
            <span>{new Date(slot.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            {slot.pipelineResult?.qualityControl?.score && (
              <span className="font-medium text-brand-blue">Skor: {slot.pipelineResult.qualityControl.score}/10</span>
            )}
          </div>

          <div className="flex gap-1.5">
            {slot.status === "awaiting_approval" && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onApprove(); }}
                  disabled={loading}
                  className="flex-1 py-1.5 text-[11px] font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50"
                >
                  Onayla
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onReject(); }}
                  disabled={loading}
                  className="flex-1 py-1.5 text-[11px] font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50"
                >
                  Reddet
                </button>
              </>
            )}

            {slot.status === "failed" && (
              <button
                onClick={(e) => { e.stopPropagation(); onRetry(); }}
                disabled={loading}
                className="flex-1 py-1.5 text-[11px] font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              >
                Tekrar Dene
              </button>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              disabled={loading}
              className="py-1.5 px-2 text-[11px] font-medium bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              title="Sil"
            >
              🗑️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

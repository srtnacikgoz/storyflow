import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../services/api";
import { useLoading } from "../contexts/LoadingContext";
import type {
  OrchestratorDashboardStats,
  ScheduledSlot,
  ScheduledSlotStatus,
  IssueCategoryId,
  PreFlightData,
  OrchestratorAsset,
} from "../types";
import { ISSUE_CATEGORIES } from "../types";
import VisualCriticModal from "../components/VisualCriticModal";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
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

  // Senaryo seçimi
  const [scenarios, setScenarios] = useState<Array<{ id: string; name: string; description?: string; isInterior?: boolean; petAllowed?: boolean; accessoryAllowed?: boolean }>>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [scenarioSearch, setScenarioSearch] = useState<string>("");

  // Template seçimi kaldırıldı — slot konfigürasyonu artık Senaryo'da

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

  // Asset Override (Pre-flight modal'da slot tıklayarak asset değiştirme)
  const [assetOverrides, setAssetOverrides] = useState<Record<string, { id: string; filename: string; url: string }>>({});
  const [assetPickerSlot, setAssetPickerSlot] = useState<{ key: string; label: string; category: string } | null>(null);
  // Slot checkbox — hangi slot'lar görselden çıkarılacak (ürün hariç)
  const [disabledSlots, setDisabledSlots] = useState<Set<string>>(new Set());
  const [pickerAssets, setPickerAssets] = useState<OrchestratorAsset[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  // Sahne Önizleme (Pre-flight modal içinde)
  const [previewImages, setPreviewImages] = useState<Array<{ imageBase64: string; mimeType: string } | null>>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number | null>(null);
  const [previewProductUsed, setPreviewProductUsed] = useState<{ id: string; filename: string } | null>(null);
  const [previewCount, setPreviewCount] = useState<1 | 2 | 4>(4);

  const previewAbortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (showGlobalLoading = false) => {
    setLoading(true);
    setError(null);
    if (showGlobalLoading) {
      startLoading("load-data", "Veriler yükleniyor...");
    }
    try {
      const [dashboardResult, scenariosResult] = await Promise.all([
        api.loadDashboardData(10),
        api.listScenarios().catch(() => ({ all: [], byCategory: { withHands: [], withoutHands: [], interior: [] }, total: 0 })),
      ]);

      const { stats: statsData, slots: slotsData, aiStats, aiStatsMonthly, loadTimeMs } = dashboardResult;

      console.log(`[Dashboard] Veriler ${loadTimeMs}ms'de yüklendi`);

      setStats({
        ...statsData,
        aiStats,
        aiStatsMonthly,
      });
      setSlots(slotsData);
      setScenarios(scenariosResult.all);

      // Kompozisyon slot konfigürasyonu artık Senaryo'da
    } catch (err) {
      console.warn("[Dashboard] loadDashboardData başarısız, fallback deneniyor...", err);
      try {
        const [statsData, slotsData, scenariosData] = await Promise.all([
          api.getOrchestratorDashboardStats(),
          api.listScheduledSlots({ limit: 10 }),
          api.listScenarios().catch(() => ({ all: [], byCategory: { withHands: [], withoutHands: [], interior: [] }, total: 0 })),
        ]);
        setStats(statsData);
        setSlots(slotsData);
        setScenarios(scenariosData.all);
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
    setAssetPickerSlot(null);

    try {
      const overrides = Object.keys(assetOverrides).length > 0 ? assetOverrides : undefined;
      const disabled = disabledSlots.size > 0 ? Array.from(disabledSlots) : undefined;
      // Seçili preview varsa base64'ünü gönder
      const selectedBase64 = selectedPreviewIndex !== null && previewImages[selectedPreviewIndex]
        ? previewImages[selectedPreviewIndex]!.imageBase64
        : undefined;
      const result = await api.orchestratorGenerateNow(
        selectedScenarioId || undefined,
        selectedAspectRatio,
        isRandomMode || undefined,
        overrides,
        disabled,
        selectedBase64
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
    if (isRandomMode || !selectedScenarioId) {
      runGenerateAfterValidation();
      return;
    }

    setValidationLoading(true);
    try {
      const validation = await api.validateBeforeGenerate(selectedScenarioId);
      setValidationWarnings(validation.warnings);
      setPreFlightData(validation.preFlightData || null);
      setAssetOverrides({});
      // Varsayılan: ürün hariç tüm slot'lar kapalı başlar
      // Senaryo'daki compositionSlots'tan sadece "random" (aktif) olanlar açık kalır
      const scenarioSlots = (validation.preFlightData?.scenario as any)?.compositionSlots as Record<string, { state: string }> | undefined;
      const allSlotKeys = validation.preFlightData?.assets?.slots
        ? Object.keys(validation.preFlightData.assets.slots)
        : ["surface", "dish", "drinkware"];
      if (scenarioSlots) {
        // Senaryo'da tanımlı slot'lardan sadece "disabled" olanları kapa
        const initialDisabled = new Set(
          Object.entries(scenarioSlots)
            .filter(([, config]) => config.state === "disabled")
            .map(([key]) => key)
        );
        // Senaryoda tanımlı olmayan slot'ları da kapa
        for (const key of allSlotKeys) {
          if (!scenarioSlots[key]) initialDisabled.add(key);
        }
        setDisabledSlots(initialDisabled);
      } else {
        // compositionSlots tanımlı değilse tüm slot'lar kapalı (ürün hariç)
        setDisabledSlots(new Set(allSlotKeys));
      }
      setPreviewImages([]);
      setPreviewError(null);
      setSelectedPreviewIndex(null);
      setPreviewProductUsed(null);
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

  // Asset picker drawer'ı aç — backend'den gelen resolvedCategory ile ara
  // resolvedCategory zaten doğru dar kategoriyi içerir (ör: "tabaklar", "bardaklar")
  // subType eklemeye gerek yok — Firestore composite index sorunu yaratır
  const openAssetPicker = async (slotKey: string, label: string, category?: string) => {
    setAssetPickerSlot({ key: slotKey, label, category: category || slotKey });
    setPickerLoading(true);
    try {
      let assets: OrchestratorAsset[] = [];
      if (category) {
        assets = await api.listAssets({ category, isActive: true });
      }
      setPickerAssets(assets);
    } catch {
      setPickerAssets([]);
    } finally {
      setPickerLoading(false);
    }
  };

  // Asset seçimi handler
  const handleAssetSelect = (slotKey: string, asset: OrchestratorAsset) => {
    const url = asset.thumbnailUrl || asset.cloudinaryUrl || asset.storageUrl;
    setAssetOverrides(prev => ({ ...prev, [slotKey]: { id: asset.id, filename: asset.filename, url } }));
    setAssetPickerSlot(null);
  };

  // Asset override'ını sıfırla
  const clearAssetOverride = (slotKey: string) => {
    setAssetOverrides(prev => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  };

  // Slot checkbox toggle (ürün hariç — ürün her zaman dahil)
  const toggleSlot = (slotKey: string) => {
    setDisabledSlots(prev => {
      const next = new Set(prev);
      if (next.has(slotKey)) next.delete(slotKey);
      else next.add(slotKey);
      return next;
    });
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
                {/* Senaryo Bilgisi */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-medium text-blue-600">Senaryo</div>
                    <div className="flex gap-1">
                      {preFlightData.scenario.petAllowed && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Pet</span>}
                      {preFlightData.scenario.accessoryAllowed && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Aksesuar</span>}
                    </div>
                  </div>
                  <div className="font-semibold text-gray-800">{preFlightData.scenario.name}</div>
                  {preFlightData.scenario.description && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">{preFlightData.scenario.description}</div>
                  )}
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
                    {preFlightData.beverage && !(preFlightData.scenario.preferredTags?.cup?.includes("__none__")) && (
                      <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full">
                        {preFlightData.beverage.defaultBeverage}
                        {preFlightData.beverage.alternateBeverage && ` / ${preFlightData.beverage.alternateBeverage}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Asset Havuzu */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-500 mb-2">
                    Referans Görseller <span className="font-normal text-gray-400">— tüm görseller Gemini'ye gider</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3 pt-2 overflow-visible">
                    {([
                      // Ürün kartı (tıklanabilir — ürün değiştirilebilir)
                      { slotKey: "product", label: "Ürün", total: preFlightData.assets.products.total, preferred: undefined, tags: preFlightData.scenario.suggestedProducts.length > 0 ? preFlightData.scenario.suggestedProducts : undefined, preview: preFlightData.assets.products.preview, matchDetails: undefined, category: "products", subType: preFlightData.scenario.suggestedProducts?.[0] },
                      // Slot kartları (dinamik — slots varsa oradan, yoksa eski alanlardan)
                      ...(preFlightData.assets.slots
                        ? Object.entries(preFlightData.assets.slots)
                            .filter(([, s]) => !s.disabled)
                            .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0))
                            .map(([key, slot]) => ({
                              slotKey: key,
                              label: slot.label,
                              total: slot.total,
                              preferred: slot.preferred,
                              tags: slot.matchDetails?.matchedTags?.length ? [...slot.matchDetails.matchedTags, ...(slot.matchDetails.missedTags || [])] : undefined,
                              preview: slot.preview,
                              matchDetails: slot.matchDetails,
                              category: slot.category,
                              subType: slot.subType,
                            }))
                        : [
                            // Eski format fallback
                            { slotKey: "surface", label: "Masa", total: preFlightData.assets.tables?.total || 0, preferred: preFlightData.assets.tables?.preferred, tags: preFlightData.scenario.preferredTags?.table, preview: preFlightData.assets.tables?.preview, matchDetails: preFlightData.assets.tables?.matchDetails, category: "furniture" as string | undefined, subType: "tables" as string | undefined },
                            { slotKey: "dish", label: "Tabak", total: preFlightData.assets.plates?.total || 0, preferred: preFlightData.assets.plates?.preferred, tags: preFlightData.scenario.preferredTags?.plate, preview: preFlightData.assets.plates?.preview, matchDetails: preFlightData.assets.plates?.matchDetails, category: "props" as string | undefined, subType: "plates" as string | undefined },
                            { slotKey: "drinkware", label: "Fincan", total: preFlightData.assets.cups?.total || 0, preferred: preFlightData.assets.cups?.preferred, tags: preFlightData.scenario.preferredTags?.cup, preview: preFlightData.assets.cups?.preview, matchDetails: preFlightData.assets.cups?.matchDetails, category: "props" as string | undefined, subType: "cups" as string | undefined },
                          ]
                      ),
                    ] as Array<{ slotKey: string; label: string; total: number; preferred: number | undefined; tags: string[] | undefined; preview: { id: string; filename: string; url: string; tags: string[] } | undefined; matchDetails: { bestScore: string; matchedTags: string[]; missedTags: string[]; bestAsset?: { id: string; filename: string; url: string; tags: string[] } } | undefined; category: string | undefined; subType: string | undefined }>)
                    // Referans görsel olarak gönderilen slot'lar önce, sadece metin olanlar sonra
                    .sort((a, b) => {
                      const refSlots = new Set(["product", "surface", "dish", "drinkware"]);
                      const aIsRef = refSlots.has(a.slotKey);
                      const bIsRef = refSlots.has(b.slotKey);
                      if (aIsRef && !bIsRef) return -1;
                      if (!aIsRef && bIsRef) return 1;
                      return 0;
                    })
                    .map((item) => {
                      const isNone = item.tags?.includes("__none__");
                      const activeTags = item.tags?.filter(t => t !== "__none__") || [];
                      const override = item.slotKey ? assetOverrides[item.slotKey] : undefined;
                      const isOverridden = !!override;
                      const isSlotDisabled = item.slotKey !== "product" && disabledSlots.has(item.slotKey);
                      const isClickable = !!item.slotKey && !isNone && !isSlotDisabled;
                      // Tüm slot'lar referans görsel olarak Gemini'ye gönderiliyor
                      const isTextOnly = false;
                      // Eşleşme durumu renk sınıfı
                      const matchBorderClass = isOverridden
                        ? "border-blue-400 ring-1 ring-blue-200"
                        : item.matchDetails
                          ? item.matchDetails.missedTags.length === 0 && item.matchDetails.matchedTags.length > 0
                            ? "border-green-300"
                            : item.matchDetails.matchedTags.length === 0
                              ? "border-red-300"
                              : "border-amber-300"
                          : "";
                      // Override varsa thumbnail ve filename'i override'dan al
                      const displayUrl = isOverridden ? override.url : item.preview?.url;
                      const displayFilename = isOverridden ? override.filename : item.preview?.filename;
                      return (
                        <div
                          key={item.label}
                          className={`bg-white rounded-lg p-2 border ${isSlotDisabled ? "opacity-40 grayscale" : isNone ? "opacity-50 bg-gray-50" : isTextOnly ? "opacity-60 border-dashed border-gray-300" : matchBorderClass} ${isClickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""} relative`}
                          onClick={isClickable ? () => openAssetPicker(item.slotKey, item.label, item.category) : undefined}
                        >
                          {/* Slot checkbox — ürün hariç, kartın dışında sol üstte */}
                          {item.slotKey !== "product" && !isNone && (
                            <label className="absolute -top-2 -left-2 z-20 bg-white rounded-full shadow-sm border border-gray-200 p-0.5 cursor-pointer hover:shadow-md transition-shadow" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox"
                                checked={!disabledSlots.has(item.slotKey)}
                                onChange={() => toggleSlot(item.slotKey)}
                                className="w-4 h-4 rounded text-emerald-600 cursor-pointer" />
                            </label>
                          )}
                          {/* Text-only badge */}
                          {isTextOnly && !isNone && (
                            <div className="absolute -top-1.5 -right-1.5 z-10">
                              <span className="text-[9px] bg-gray-400 text-white px-1.5 py-0.5 rounded-full font-medium shadow-sm">
                                Metin
                              </span>
                            </div>
                          )}
                          {/* Override badge */}
                          {isOverridden && !isTextOnly && (
                            <div className="absolute -top-1.5 -right-1.5 z-10">
                              <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-medium shadow-sm">
                                Degistirildi
                              </span>
                            </div>
                          )}
                          <div className="text-xs font-medium text-gray-500 mb-1 flex items-center justify-between">
                            <span>{item.label}</span>
                            {isOverridden && (
                              <button
                                onClick={(e) => { e.stopPropagation(); clearAssetOverride(item.slotKey!); }}
                                className="text-[9px] text-blue-500 hover:text-blue-700 underline"
                              >
                                Sifirla
                              </button>
                            )}
                          </div>
                          {isNone ? (
                            <div className="flex flex-col items-center py-2">
                              <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 text-lg">—</div>
                              <div className="text-xs text-gray-400 mt-1">Yok</div>
                            </div>
                          ) : displayUrl ? (
                            <div className="flex flex-col items-center">
                              <img
                                src={displayUrl}
                                alt={displayFilename || ""}
                                className={`w-14 h-14 rounded-lg object-cover border ${isOverridden ? "border-blue-300" : "border-gray-200"}`}
                              />
                              <div className="text-[10px] text-gray-600 mt-1 truncate w-full text-center" title={displayFilename}>
                                {(displayFilename || "").length > 12 ? (displayFilename || "").slice(0, 12) + "..." : displayFilename}
                              </div>
                              {isOverridden ? (
                                <div className="text-[10px] font-medium text-blue-600 mt-0.5">Manuel</div>
                              ) : item.matchDetails ? (
                                <div className={`text-[10px] font-medium mt-0.5 ${
                                  item.matchDetails.matchedTags.length === 0
                                    ? "text-red-600"
                                    : item.matchDetails.missedTags.length === 0
                                      ? "text-green-600"
                                      : "text-amber-600"
                                }`}>
                                  {item.matchDetails.bestScore} etiket
                                </div>
                              ) : (
                                <div className="text-[10px] text-gray-400">
                                  {item.preferred !== undefined && activeTags.length > 0
                                    ? `${item.preferred}/${item.total} tercihli`
                                    : `${item.total} aday`
                                  }
                                </div>
                              )}
                              {/* Etiket detayları (override yoksa göster) */}
                              {!isOverridden && item.matchDetails && item.matchDetails.missedTags.length > 0 && (
                                <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                                  {item.matchDetails.missedTags.slice(0, 2).map(t => (
                                    <span key={t} className="text-[9px] bg-red-50 text-red-500 px-1 py-px rounded line-through">{t}</span>
                                  ))}
                                </div>
                              )}
                              {!isOverridden && item.matchDetails && item.matchDetails.matchedTags.length > 0 && (
                                <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                                  {item.matchDetails.matchedTags.slice(0, 2).map(t => (
                                    <span key={t} className="text-[9px] bg-green-50 text-green-600 px-1 py-px rounded">{t}</span>
                                  ))}
                                </div>
                              )}
                              {!isOverridden && !item.matchDetails && activeTags.length > 0 && (
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
                              {item.matchDetails ? (
                                <div className={`text-xs font-medium ${
                                  item.matchDetails.matchedTags.length === 0 ? "text-red-600" : "text-amber-600"
                                }`}>
                                  {item.matchDetails.bestScore} etiket
                                </div>
                              ) : item.preferred !== undefined && activeTags.length > 0 ? (
                                <div className={`text-xs ${item.preferred > 0 ? "text-green-600" : "text-amber-600"}`}>
                                  {item.preferred} tercih
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Atmosfer Preset'leri */}
                {(preFlightData.scenario.presets?.weather || preFlightData.scenario.presets?.lighting || preFlightData.scenario.presets?.atmosphere) && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-gray-500 mb-2">Atmosfer</div>
                    <div className="flex flex-wrap gap-2">
                      {preFlightData.scenario.presets?.weather && (
                        <span className="text-xs bg-sky-100 text-sky-800 px-2 py-1 rounded-full">
                          {preFlightData.scenario.presets.weather}
                        </span>
                      )}
                      {preFlightData.scenario.presets?.lighting && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          {preFlightData.scenario.presets.lighting}
                        </span>
                      )}
                      {preFlightData.scenario.presets?.atmosphere && (
                        <span className="text-xs bg-violet-100 text-violet-800 px-2 py-1 rounded-full">
                          {preFlightData.scenario.presets.atmosphere}
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

            {/* Sahne Önizleme */}
            {preFlightData && !validationWarnings.some(w => w.type === "error") && (
              <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50/30 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-indigo-700">Sahne Önizleme</h4>
                    <p className="text-xs text-gray-500">Referans asset'lerle varyasyon üret</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Önizleme sayısı seçimi */}
                    <div className="flex rounded-lg border border-indigo-200 overflow-hidden">
                      {([1, 2, 4] as const).map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setPreviewCount(count)}
                          disabled={previewLoading}
                          className={`px-2.5 py-1.5 text-xs font-medium transition ${
                            previewCount === count
                              ? "bg-indigo-600 text-white"
                              : "bg-white text-indigo-600 hover:bg-indigo-50"
                          } disabled:opacity-40`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        // Önceki isteği iptal et
                        previewAbortRef.current?.abort();
                        const controller = new AbortController();
                        previewAbortRef.current = controller;

                        setPreviewLoading(true);
                        setPreviewError(null);
                        setPreviewImages([]);
                        setPreviewProductUsed(null);
                        setSelectedPreviewIndex(null);
                        try {
                          // compositionConfig oluştur (assetOverrides + disabledSlots)
                          const slots: Record<string, { state: string; assetId: string; source: string }> = {};
                          for (const [key, override] of Object.entries(assetOverrides)) {
                            if (key === "product") continue;
                            slots[key] = { state: "manual", assetId: override.id, source: "override" };
                          }
                          for (const slotKey of disabledSlots) {
                            slots[slotKey] = { state: "disabled", assetId: "", source: "override" };
                          }

                          const result = await api.generateScenePreview({
                            scenarioId: selectedScenarioId,
                            compositionConfig: Object.keys(slots).length > 0 ? { slots } : undefined,
                            productOverrideId: assetOverrides["product"]?.id,
                            aspectRatio: selectedAspectRatio,
                            previewCount,
                          }, controller.signal);
                          setPreviewImages(result.previews);
                          setPreviewProductUsed(result.productUsed);
                        } catch (err) {
                          // AbortError ise sessizce ignore et (yeni istek zaten başladı)
                          if (err instanceof DOMException && err.name === "AbortError") return;
                          setPreviewError(err instanceof Error ? err.message : "Önizleme üretimi başarısız");
                          console.error("[ScenePreview]", err);
                        } finally {
                          setPreviewLoading(false);
                        }
                      }}
                      disabled={previewLoading}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition"
                    >
                      {previewLoading ? (
                        <>
                          <span className="animate-spin">&#9696;</span>
                          Üretiliyor...
                        </>
                      ) : (
                        <>Önizle</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Skeleton loading */}
                {previewLoading && (
                  <div className={`grid gap-3 ${previewCount === 1 ? "grid-cols-1 max-w-sm" : "grid-cols-2"}`}>
                    {Array.from({ length: previewCount }).map((_, i) => (
                      <div key={i} className="aspect-square bg-indigo-100 rounded-lg animate-pulse flex items-center justify-center">
                        <span className="text-indigo-300 text-sm">Varyasyon {i + 1}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hata */}
                {previewError && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                    {previewError}
                  </div>
                )}

                {/* Sonuçlar: 2x2 grid */}
                {!previewLoading && previewImages.length > 0 && (
                  <>
                    <p className="text-xs text-gray-500 mb-2">
                      Bir varyasyon seçerek pipeline'da kullanabilirsiniz:
                      {previewProductUsed && (
                        <span className="ml-2 text-indigo-600 font-medium">Ürün: {previewProductUsed.filename}</span>
                      )}
                    </p>
                    <div className={`grid gap-3 ${previewImages.length === 1 ? "grid-cols-1 max-w-sm" : "grid-cols-2"}`}>
                      {previewImages.map((img, i) => (
                        <div
                          key={i}
                          className={`aspect-square rounded-lg overflow-hidden border-2 bg-gray-50 relative cursor-pointer transition ${
                            selectedPreviewIndex === i
                              ? "border-indigo-500 ring-2 ring-indigo-300"
                              : "border-gray-200 hover:border-indigo-300"
                          }`}
                          onClick={() => {
                            if (!img) return;
                            setSelectedPreviewIndex(selectedPreviewIndex === i ? null : i);
                          }}
                        >
                          {img ? (
                            <>
                              <img
                                src={`data:${img.mimeType};base64,${img.imageBase64}`}
                                alt={`Varyasyon ${i + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {selectedPreviewIndex === i && (
                                <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-red-50">
                              <div className="text-center">
                                <span className="text-red-400 text-2xl block mb-1">&#10006;</span>
                                <span className="text-xs text-red-500">Engellenmiş</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {!validationWarnings.some(w => w.type === "error") && (
                <>
                  <button
                    onClick={() => { setShowValidationModal(false); runGenerateAfterValidation(); }}
                    className="flex-1 btn-primary"
                  >
                    {selectedPreviewIndex !== null ? "Seçili Görselle Devam Et" : "Devam Et"}
                  </button>
                  <button
                    onClick={() => navigate("/admin/poster")}
                    className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-xl text-sm font-medium hover:shadow-lg transition"
                  >
                    🎨 Poster
                  </button>
                </>
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
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-xs bg-white px-2 py-0.5 rounded border">{selectedSlot.pipelineResult.scenarioSelection.composition}</span>
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
                      {/* Slot asset'leri — dinamik */}
                      {selectedSlot.pipelineResult.assetSelection.slots
                        ? Object.entries(selectedSlot.pipelineResult.assetSelection.slots).map(([key, asset]) => (
                            <div key={key} className="flex items-center gap-3">
                              {asset.storageUrl && (
                                <img src={convertStorageUrl(asset.storageUrl) || ""} alt={key} className="w-10 h-10 object-cover rounded-lg" />
                              )}
                              <div>
                                <p className="text-xs font-medium">{key}</p>
                                <p className="text-xs text-gray-500">{asset.filename}</p>
                              </div>
                            </div>
                          ))
                        : (
                          <>
                            {/* Fallback: eski named fields */}
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
                          </>
                        )
                      }
                      {/* Pet (slot dışı) */}
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
                      {/* Aksesuar (slot dışı) */}
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

                {/* Pipeline Adımları */}
                {selectedSlot.pipelineResult?.status?.completedStages && selectedSlot.pipelineResult.status.completedStages.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Pipeline Adımları</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSlot.pipelineResult.status.completedStages.map((stage: string) => (
                        <span key={stage} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded border border-green-200">
                          {STAGE_LABELS[stage] || stage}
                        </span>
                      ))}
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
                          mood: selectedSlot.pipelineResult?.scenarioSelection?.scenarioName,
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

      {/* Asset Picker Drawer */}
      {assetPickerSlot && (
        <div className="fixed inset-0 z-[55] flex">
          {/* Overlay */}
          <div className="flex-1 bg-black/30" onClick={() => setAssetPickerSlot(null)} />
          {/* Drawer */}
          <div className="w-full max-w-sm bg-white shadow-2xl flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">{assetPickerSlot.label} Sec</h3>
                <p className="text-[11px] text-gray-400">{assetPickerSlot.category}</p>
              </div>
              <button onClick={() => setAssetPickerSlot(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3">
              {pickerLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-blue"></div>
                </div>
              ) : pickerAssets.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">Asset bulunamadi</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {pickerAssets.map((asset) => {
                    const thumbUrl = asset.thumbnailUrl || asset.cloudinaryUrl || asset.storageUrl;
                    const isSelected = assetOverrides[assetPickerSlot.key]?.id === asset.id;
                    return (
                      <button
                        key={asset.id}
                        onClick={() => handleAssetSelect(assetPickerSlot.key, asset)}
                        className={`rounded-lg border-2 overflow-hidden transition-all hover:shadow-md ${
                          isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="aspect-square bg-gray-100">
                          <img src={thumbUrl} alt={asset.filename} className="w-full h-full object-cover" />
                        </div>
                        <div className="px-1.5 py-1 bg-white">
                          <div className="text-[10px] text-gray-700 truncate font-medium" title={asset.filename}>
                            {asset.filename}
                          </div>
                          {asset.tags.length > 0 && (
                            <div className="flex flex-wrap gap-0.5 mt-0.5">
                              {asset.tags.slice(0, 2).map(t => (
                                <span key={t} className="text-[8px] bg-gray-100 text-gray-500 px-1 rounded">{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
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

          {/* Senaryo + Üretim Kartı */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden lg:sticky lg:top-4">
            {/* Senaryo başlık */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Senaryo Seçimi</h2>
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

            {/* Senaryo arama + kartları */}
            {scenarios.length > 0 && (
              <div>
                {/* Arama */}
                {scenarios.length > 5 && (
                  <div className="px-2 pt-2">
                    <input
                      type="text"
                      placeholder="Senaryo ara..."
                      value={scenarioSearch}
                      onChange={(e) => setScenarioSearch(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-1 focus:ring-brand-blue focus:border-brand-blue"
                    />
                  </div>
                )}

                <div className="p-2 space-y-1.5 max-h-[380px] overflow-y-auto">
                {/* Senaryo Yok */}
                {!scenarioSearch && (
                <button
                  onClick={() => setSelectedScenarioId("")}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                    selectedScenarioId === ""
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
                )}

                {/* Senaryo Kartları */}
                {scenarios.filter((s) => !scenarioSearch || s.name.toLowerCase().includes(scenarioSearch.toLowerCase()) || s.description?.toLowerCase().includes(scenarioSearch.toLowerCase())).map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => setSelectedScenarioId(scenario.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                      selectedScenarioId === scenario.id
                        ? "border-brand-blue bg-brand-blue/5 shadow-sm"
                        : "border-transparent hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-gray-800 truncate">{scenario.name}</span>
                      <div className="flex gap-0.5 flex-shrink-0 ml-2">
                        {scenario.petAllowed && <span className="text-[10px]">🐕</span>}
                        {scenario.accessoryAllowed && <span className="text-[10px]">✨</span>}
                        {scenario.isInterior && <span className="text-[10px]">🏠</span>}
                      </div>
                    </div>
                    {scenario.description && (
                      <p className="text-[11px] text-gray-500 line-clamp-1">{scenario.description}</p>
                    )}
                  </button>
                ))}
                </div>
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
                  {/* Token bilgisi (30 gün) */}
                  {(stats.aiStatsMonthly.totalInputTokens || stats.aiStatsMonthly.totalOutputTokens) ? (
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-gray-400">
                      <span>{((stats.aiStatsMonthly.totalInputTokens || 0) / 1000).toFixed(0)}K in</span>
                      <span>·</span>
                      <span>{((stats.aiStatsMonthly.totalOutputTokens || 0) / 1000).toFixed(0)}K out</span>
                      {(stats.aiStatsMonthly.imageGenerationCount || 0) > 0 && (
                        <>
                          <span>·</span>
                          <span>${((stats.aiStatsMonthly.totalCost || 0) / (stats.aiStatsMonthly.imageGenerationCount || 1)).toFixed(3)}/görsel</span>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {stats?.aiStats && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-sm font-semibold text-gray-800">${stats.aiStats.totalCost?.toFixed(4) || "0"}</p>
                    <p className="text-[10px] text-gray-500">Bugün</p>
                    {(stats.aiStats.totalInputTokens || stats.aiStats.totalOutputTokens) ? (
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        {((stats.aiStats.totalInputTokens || 0) / 1000).toFixed(0)}K/{((stats.aiStats.totalOutputTokens || 0) / 1000).toFixed(0)}K tok
                      </p>
                    ) : null}
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
              <p className="text-gray-400 text-xs mt-1">Soldan bir senaryo seçip "Şimdi Üret" butonuna basın</p>
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

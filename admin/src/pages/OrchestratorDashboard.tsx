import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import { useLoading } from "../contexts/LoadingContext";
import type {
  OrchestratorDashboardStats,
  ScheduledSlot,
  OrchestratorProductType,
  ScheduledSlotStatus,
  Theme,
  IssueCategoryId,
} from "../types";
import { ISSUE_CATEGORIES } from "../types";

// Ürün tipi etiketleri
const PRODUCT_LABELS: Record<OrchestratorProductType, string> = {
  croissants: "Kruvasan",
  pastas: "Pasta",
  chocolates: "Çikolata",
  coffees: "Kahve",
};

// Slot durumu renkleri ve etiketleri
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  pending: { bg: "bg-gray-100", text: "text-gray-700", label: "Bekliyor", icon: "⏳" },
  generating: { bg: "bg-blue-100", text: "text-blue-700", label: "Üretiliyor", icon: "⚙️" },
  awaiting_approval: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Onay Bekliyor", icon: "👀" },
  approved: { bg: "bg-green-100", text: "text-green-700", label: "Onaylandı", icon: "✅" },
  published: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Yayınlandı", icon: "📤" },
  failed: { bg: "bg-red-100", text: "text-red-700", label: "Başarısız", icon: "❌" },
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

  // Zaten public URL ise olduğu gibi döndür
  if (url.startsWith("https://")) return url;

  // gs:// formatını public URL'ye çevir
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
  const [selectedProductType, setSelectedProductType] = useState<OrchestratorProductType>("croissants");

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

  // İşlem durumları
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async (showGlobalLoading = false) => {
    setLoading(true);
    setError(null);
    if (showGlobalLoading) {
      startLoading("load-data", "Veriler yükleniyor...");
    }
    try {
      // Tek API çağrısı ile tüm verileri yükle (3 ayrı çağrı yerine)
      // Bu, cold start süresini %60-70 azaltır
      const { stats: statsData, slots: slotsData, themes: themesData, loadTimeMs } =
        await api.loadDashboardData(50);

      console.log(`[Dashboard] Veriler ${loadTimeMs}ms'de yüklendi`);

      setStats(statsData);
      setSlots(slotsData);
      setThemes(themesData);
    } catch (err) {
      // Fallback: Yeni endpoint çalışmazsa eski yönteme dön
      console.warn("[Dashboard] loadDashboardData başarısız, fallback deneniyor...", err);
      try {
        const [statsData, slotsData, themesData] = await Promise.all([
          api.getOrchestratorDashboardStats(),
          api.listScheduledSlots({ limit: 50 }),
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

  // Hemen üret
  const handleGenerateNow = async () => {
    setGenerating(true);
    setElapsedTime(0);
    setProgressInfo(null);
    setShowProgressModal(true);

    try {
      // themeId varsa gönder, yoksa undefined
      const result = await api.orchestratorGenerateNow(
        selectedProductType,
        selectedThemeId || undefined
      );
      setCurrentSlotId(result.slotId);

      if (result.success) {
        setProgressInfo({
          stage: "completed",
          stageIndex: 7,
          totalStages: 7,
          status: "awaiting_approval",
        });
        loadData();
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

  // Slot işlemleri
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

  // Detay modal'ını aç
  const openDetailModal = async (slot: ScheduledSlot) => {
    try {
      const fullSlot = await api.getSlotDetail(slot.id);
      setSelectedSlot(fullSlot);
      setShowDetailModal(true);
    } catch (err) {
      alert("Detay yüklenemedi: " + (err instanceof Error ? err.message : "Bilinmeyen"));
    }
  };

  // Sorun bildir
  const handleReportIssue = async () => {
    if (!selectedSlot) return;

    setReportLoading(true);
    startLoading("report-issue", "Geri bildirim gönderiliyor...");
    try {
      // Bağlam bilgilerini topla
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
      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              {progressInfo?.status === "failed" ? "❌ Üretim Başarısız" :
                progressInfo?.status === "awaiting_approval" ? "✅ Üretim Tamamlandı!" :
                  "⚙️ İçerik Üretiliyor..."}
            </h3>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{progressInfo ? STAGE_LABELS[progressInfo.stage] || progressInfo.stage : "Başlatılıyor..."}</span>
                <span>{progressInfo ? `${progressInfo.stageIndex}/${progressInfo.totalStages}` : "0/7"}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${progressInfo?.status === "failed" ? "bg-red-500" :
                    progressInfo?.status === "awaiting_approval" ? "bg-green-500" :
                      "bg-brand-blue"
                    }`}
                  style={{ width: `${progressInfo ? (progressInfo.stageIndex / progressInfo.totalStages) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Time Info */}
            <div className="text-sm text-gray-500 border-t pt-3">
              Geçen süre: {formatElapsedTime(elapsedTime)}
            </div>

            {/* Error */}
            {progressInfo?.error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{progressInfo.error}</p>
              </div>
            )}

            {/* Close Button */}
            {(!generating || progressInfo?.status === "failed" || progressInfo?.status === "awaiting_approval") && (
              <button
                onClick={() => { setShowProgressModal(false); setCurrentSlotId(null); }}
                className="mt-4 w-full btn-primary"
              >
                Kapat
              </button>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Slot Detayları</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sol: Görsel */}
              <div>
                {(() => {
                  const modalStorageUrl = convertStorageUrl(selectedSlot.pipelineResult?.generatedImage?.storageUrl);
                  const modalBase64Url = selectedSlot.pipelineResult?.generatedImage?.imageBase64
                    ? `data:${selectedSlot.pipelineResult.generatedImage.mimeType};base64,${selectedSlot.pipelineResult.generatedImage.imageBase64}`
                    : null;
                  const modalImageUrl = modalStorageUrl || modalBase64Url;

                  if (modalImageUrl) {
                    return (
                      <img
                        src={modalImageUrl}
                        alt="Üretilen görsel"
                        className="w-full rounded-xl shadow-lg"
                      />
                    );
                  }
                  return (
                    <div className="w-full aspect-[4/5] bg-gray-100 rounded-xl flex items-center justify-center">
                      <span className="text-gray-400">Görsel yok</span>
                    </div>
                  );
                })()}

                {/* Kalite Skoru */}
                {selectedSlot.pipelineResult?.qualityControl && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium mb-2">Kalite Skoru</h4>
                    <div className="text-3xl font-bold text-brand-blue">
                      {selectedSlot.pipelineResult.qualityControl.score}/10
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      {Object.entries(selectedSlot.pipelineResult.qualityControl.evaluation || {}).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-medium">{val}/10</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sağ: Detaylar */}
              <div className="space-y-4">
                {/* Durum */}
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[selectedSlot.status]?.bg} ${STATUS_CONFIG[selectedSlot.status]?.text}`}>
                    {STATUS_CONFIG[selectedSlot.status]?.icon} {STATUS_CONFIG[selectedSlot.status]?.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDate(selectedSlot.createdAt)}
                  </span>
                </div>

                {/* Senaryo & Kompozisyon */}
                {selectedSlot.pipelineResult?.scenarioSelection && (
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <h4 className="font-medium mb-2 text-purple-800">🎬 Senaryo & Kompozisyon</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Senaryo:</span>
                        <p className="font-medium">{selectedSlot.pipelineResult.scenarioSelection.scenarioName || selectedSlot.pipelineResult.scenarioSelection.scenarioId}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Kompozisyon:</span>
                        <p className="font-medium">{selectedSlot.pipelineResult.scenarioSelection.composition || selectedSlot.pipelineResult.scenarioSelection.compositionId}</p>
                      </div>
                      {selectedSlot.pipelineResult.scenarioSelection.handStyle && (
                        <div>
                          <span className="text-gray-500">El Stili:</span>
                          <p className="font-medium">{selectedSlot.pipelineResult.scenarioSelection.handStyleDetails?.name || selectedSlot.pipelineResult.scenarioSelection.handStyle}</p>
                        </div>
                      )}
                      {selectedSlot.pipelineResult.scenarioSelection.includesHands !== undefined && (
                        <div>
                          <span className="text-gray-500">El İçeriyor:</span>
                          <p className="font-medium">{selectedSlot.pipelineResult.scenarioSelection.includesHands ? "✅ Evet" : "❌ Hayır"}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Kullanılan Asset'ler */}
                {selectedSlot.pipelineResult?.assetSelection && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium mb-3">🖼️ Kullanılan Asset'ler</h4>
                    <div className="space-y-3">
                      {/* Ürün */}
                      {selectedSlot.pipelineResult.assetSelection.product && (
                        <div className="flex items-center gap-3">
                          {selectedSlot.pipelineResult.assetSelection.product.storageUrl && (
                            <img
                              src={selectedSlot.pipelineResult.assetSelection.product.storageUrl}
                              alt="Ürün"
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium">🥐 Ürün</p>
                            <p className="text-xs text-gray-500">{selectedSlot.pipelineResult.assetSelection.product.filename}</p>
                          </div>
                        </div>
                      )}
                      {/* Tabak */}
                      {selectedSlot.pipelineResult.assetSelection.plate && (
                        <div className="flex items-center gap-3">
                          {selectedSlot.pipelineResult.assetSelection.plate.storageUrl && (
                            <img
                              src={selectedSlot.pipelineResult.assetSelection.plate.storageUrl}
                              alt="Tabak"
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium">🍽️ Tabak</p>
                            <p className="text-xs text-gray-500">{selectedSlot.pipelineResult.assetSelection.plate.filename}</p>
                          </div>
                        </div>
                      )}
                      {/* Fincan */}
                      {selectedSlot.pipelineResult.assetSelection.cup && (
                        <div className="flex items-center gap-3">
                          {selectedSlot.pipelineResult.assetSelection.cup.storageUrl && (
                            <img
                              src={selectedSlot.pipelineResult.assetSelection.cup.storageUrl}
                              alt="Fincan"
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium">☕ Fincan</p>
                            <p className="text-xs text-gray-500">{selectedSlot.pipelineResult.assetSelection.cup.filename}</p>
                          </div>
                        </div>
                      )}
                      {/* Pet */}
                      {selectedSlot.pipelineResult.assetSelection.pet && (
                        <div className="flex items-center gap-3">
                          {selectedSlot.pipelineResult.assetSelection.pet.storageUrl && (
                            <img
                              src={selectedSlot.pipelineResult.assetSelection.pet.storageUrl}
                              alt="Pet"
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium">🐕 Evcil Hayvan</p>
                            <p className="text-xs text-gray-500">{selectedSlot.pipelineResult.assetSelection.pet.filename}</p>
                          </div>
                        </div>
                      )}
                      {/* Accessory */}
                      {selectedSlot.pipelineResult.assetSelection.accessory && (
                        <div className="flex items-center gap-3">
                          {selectedSlot.pipelineResult.assetSelection.accessory.storageUrl && (
                            <img
                              src={selectedSlot.pipelineResult.assetSelection.accessory.storageUrl}
                              alt="Aksesuar"
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium">✨ Aksesuar</p>
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
                    <span className="text-sm text-amber-800">💰 Üretim Maliyeti</span>
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
                <div className="pt-4 border-t space-y-3">
                  {selectedSlot.status === "awaiting_approval" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApproveSlot(selectedSlot.id)}
                        disabled={actionLoading === selectedSlot.id}
                        className="flex-1 btn-primary bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading === selectedSlot.id ? "..." : "✅ Onayla ve Yayınla"}
                      </button>
                      <button
                        onClick={() => handleRejectSlot(selectedSlot.id)}
                        disabled={actionLoading === selectedSlot.id}
                        className="flex-1 btn-secondary text-red-600 border-red-200 hover:bg-red-50"
                      >
                        ❌ Reddet
                      </button>
                    </div>
                  )}

                  {selectedSlot.status === "awaiting_approval" && (
                    <button
                      onClick={() => handleResendTelegram(selectedSlot.id)}
                      disabled={actionLoading === selectedSlot.id}
                      className="w-full btn-secondary"
                    >
                      📤 Telegram'a Tekrar Gönder
                    </button>
                  )}

                  {selectedSlot.status === "failed" && (
                    <button
                      onClick={() => handleRetrySlot(selectedSlot.id)}
                      disabled={actionLoading === selectedSlot.id}
                      className="w-full btn-primary"
                    >
                      🔄 Yeniden Dene
                    </button>
                  )}

                  {/* Sorun Bildir butonu - sadece görsel üretilmişse göster */}
                  {selectedSlot.pipelineResult?.generatedImage && (
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="w-full btn-secondary text-amber-600 border-amber-200 hover:bg-amber-50"
                    >
                      ⚠️ Sorun Bildir
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteSlot(selectedSlot.id)}
                    disabled={actionLoading === selectedSlot.id}
                    className="w-full btn-secondary text-red-600 border-red-200 hover:bg-red-50"
                  >
                    🗑️ Sil
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

            {/* Kategori Seçimi */}
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Sorun Türü
              </label>
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

            {/* Özel Not */}
            <div className="space-y-2 mb-6">
              <label className="block text-sm font-medium text-gray-700">
                Ek Açıklama (opsiyonel)
              </label>
              <textarea
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                placeholder="Sorunu daha detaylı açıklamak isterseniz..."
                className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-y"
                rows={3}
              />
            </div>

            {/* Butonlar */}
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

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orchestrator Dashboard</h1>
          <p className="text-gray-500 mt-1">AI destekli otomatik içerik üretimi</p>
        </div>
        <button onClick={() => loadData(true)} className="btn-secondary">
          Yenile
        </button>
      </div>

      {/* Asset Uyarısı */}
      {stats?.assets.total === 0 && (
        <div className="card bg-yellow-50 border-2 border-yellow-300">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-800">Henüz Görsel Yok!</p>
              <p className="text-yellow-700 text-sm mt-1">
                İçerik üretmek için önce ürün görselleri yüklemeniz gerekiyor.
              </p>
              <a href="/assets" className="inline-block mt-2 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700">
                Görseller Sayfasına Git →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Hızlı Üretim */}
      <div className="card bg-gradient-to-br from-brand-blue/10 to-brand-blue/5">
        <h2 className="text-lg font-semibold mb-4">Hemen İçerik Üret</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Ürün Tipi</label>
            <select
              value={selectedProductType}
              onChange={(e) => setSelectedProductType(e.target.value as OrchestratorProductType)}
              className="input w-48"
            >
              {Object.entries(PRODUCT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerateNow}
            disabled={generating}
            className="btn-primary disabled:opacity-50"
          >
            {generating ? "Üretiliyor..." : "🚀 Şimdi Üret"}
          </button>
        </div>

        {/* Tema Seçici - Kartlı Görünüm */}
        {themes.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tema Seçimi (Opsiyonel)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Tema Yok Seçeneği */}
              <button
                onClick={() => setSelectedThemeId("")}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  selectedThemeId === ""
                    ? "border-gray-400 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎲</span>
                  <span className="font-medium text-gray-700">Rastgele</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Tema belirtme, sistem otomatik seçsin
                </p>
              </button>

              {/* Tema Kartları */}
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedThemeId(theme.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedThemeId === theme.id
                      ? "border-purple-500 bg-purple-50 shadow-md"
                      : "border-gray-200 hover:border-purple-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">{theme.name}</span>
                    {theme.petAllowed && <span className="text-xs">🐕</span>}
                  </div>
                  {theme.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {theme.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {theme.scenarios.slice(0, 3).map((scenario) => (
                      <span
                        key={scenario}
                        className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded"
                      >
                        {scenario}
                      </span>
                    ))}
                    {theme.scenarios.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{theme.scenarios.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Toplam Görsel" value={stats?.assets.total || 0} icon="🖼️" color="bg-blue-50" />
        <StatCard label="Aktif Kurallar" value={stats?.rules.total || 0} icon="⏰" color="bg-green-50" />
        <StatCard label="Pipeline Çalışmaları" value={stats?.pipeline.totalRuns || 0} icon="⚙️" color="bg-amber-50" />
        <StatCard label="Toplam Maliyet" value={`$${stats?.pipeline.totalCost || "0.00"}`} icon="💰" color="bg-orange-50" isText />
      </div>

      {/* Slot Durumları (Quick Stats) */}
      {stats?.slots.byStatus && Object.keys(stats.slots.byStatus).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.slots.byStatus).map(([status, count]) => {
            const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status as ScheduledSlotStatus)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${statusFilter === status ? "ring-2 ring-offset-2 ring-brand-blue" : ""
                  } ${config.bg} ${config.text}`}
              >
                {config.icon} {config.label}: {count}
              </button>
            );
          })}
          {statusFilter !== "all" && (
            <button
              onClick={() => setStatusFilter("all")}
              className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-200 text-gray-700"
            >
              ✕ Filtreyi Temizle
            </button>
          )}
        </div>
      )}

      {/* Slot Listesi */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            İşlemler {filteredSlots.length > 0 && `(${filteredSlots.length})`}
          </h2>

          {/* View Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow text-brand-blue" : "text-gray-500 hover:text-gray-700"}`}
              title="Grid Görünüm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow text-brand-blue" : "text-gray-500 hover:text-gray-700"}`}
              title="Liste Görünüm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {filteredSlots.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Henüz işlem yok</p>
        ) : viewMode === "grid" ? (
          <div className={`grid ${GRID_CONFIG[gridSize].cols} gap-4`}>
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
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Görsel</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum/Aşama</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSlots.map((slot) => {
                    const statusConfig = STATUS_CONFIG[slot.status] || STATUS_CONFIG.pending;
                    return (
                      <tr key={slot.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const storageUrl = convertStorageUrl(slot.pipelineResult?.generatedImage?.storageUrl);
                            const imageUrl = storageUrl || (slot.pipelineResult?.generatedImage?.imageBase64 ? `data:image/jpeg;base64,${slot.pipelineResult?.generatedImage?.imageBase64}` : null);
                            return imageUrl ? (
                              <img src={imageUrl} alt="Slot" className="h-12 w-12 rounded bg-gray-100 object-cover cursor-pointer" onClick={() => openDetailModal(slot)} />
                            ) : (
                              <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">Yok</div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(slot.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.icon} {statusConfig.label}
                          </span>
                          {slot.currentStage && slot.status !== "published" && slot.status !== "failed" && slot.status !== "awaiting_approval" && (
                            <div className="text-xs text-gray-400 mt-1">{STAGE_LABELS[slot.currentStage] || slot.currentStage}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {slot.pipelineResult?.assetSelection?.product?.subType || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => openDetailModal(slot)} className="text-brand-blue hover:text-blue-900 mr-3">Detay</button>
                          {slot.status === "awaiting_approval" && (
                            <button onClick={() => handleApproveSlot(slot.id)} className="text-green-600 hover:text-green-900 mr-3">Onayla</button>
                          )}
                          <button onClick={() => handleDeleteSlot(slot.id)} className="text-red-600 hover:text-red-900">Sil</button>
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
  );
}

// Stat Card
function StatCard({ label, value, icon, color, isText = false }: {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  isText?: boolean;
}) {
  return (
    <div className={`card ${color}`}>
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <p className={`${isText ? "text-xl" : "text-2xl"} font-bold text-gray-900`}>{value}</p>
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

  // URL'yi çevir - önce storageUrl, yoksa base64
  const storageUrl = convertStorageUrl(slot.pipelineResult?.generatedImage?.storageUrl);
  const base64Url = slot.pipelineResult?.generatedImage?.imageBase64
    ? `data:${slot.pipelineResult.generatedImage.mimeType};base64,${slot.pipelineResult.generatedImage.imageBase64}`
    : null;
  const imageUrl = storageUrl || base64Url;

  return (
    <div className="border rounded-xl overflow-hidden hover:shadow-lg transition-shadow bg-white">
      {/* Görsel */}
      <div
        onClick={onView}
        className={`${aspectRatio} bg-gray-100 relative cursor-pointer group`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Üretilen" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            {slot.status === "generating" ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-blue mx-auto mb-1"></div>
                {!compact && <span className="text-xs">{STAGE_LABELS[slot.currentStage || ""] || "Üretiliyor..."}</span>}
              </div>
            ) : (
              <span className="text-xs">Görsel yok</span>
            )}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white font-medium text-sm">Detayları Gör</span>
        </div>

        {/* Status badge */}
        <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.text}`}>
          {config.icon} {!compact && config.label}
        </div>
      </div>

      {/* Info - Compact modda gizle */}
      {!compact && (
        <div className="p-3">
          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span>{new Date(slot.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            {slot.pipelineResult?.qualityControl?.score && (
              <span className="font-medium text-brand-blue">Skor: {slot.pipelineResult.qualityControl.score}/10</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {slot.status === "awaiting_approval" && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onApprove(); }}
                  disabled={loading}
                  className="flex-1 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                >
                  ✅ Onayla
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onReject(); }}
                  disabled={loading}
                  className="flex-1 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                >
                  ❌ Reddet
                </button>
              </>
            )}

            {slot.status === "failed" && (
              <button
                onClick={(e) => { e.stopPropagation(); onRetry(); }}
                disabled={loading}
                className="flex-1 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
              >
                🔄 Tekrar Dene
              </button>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              disabled={loading}
              className="py-1.5 px-2 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
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

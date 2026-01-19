import { useEffect, useState } from "react";
import { api } from "../services/api";
import type {
  OrchestratorDashboardStats,
  ScheduledSlot,
  OrchestratorProductType,
} from "../types";

// Ürün tipi etiketleri
const PRODUCT_LABELS: Record<OrchestratorProductType, string> = {
  croissants: "Kruvasan",
  pastas: "Pasta",
  chocolates: "Çikolata",
  macarons: "Makaron",
  coffees: "Kahve",
};

// Slot durumu renkleri
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-gray-100", text: "text-gray-700" },
  generating: { bg: "bg-blue-100", text: "text-blue-700" },
  awaiting_approval: { bg: "bg-yellow-100", text: "text-yellow-700" },
  approved: { bg: "bg-green-100", text: "text-green-700" },
  published: { bg: "bg-brand-green/20", text: "text-green-800" },
  failed: { bg: "bg-red-100", text: "text-red-700" },
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

// Tahmini süre (saniye)
const STAGE_DURATIONS: Record<string, number> = {
  asset_selection: 5,
  metadata_analysis: 15,
  prompt_optimization: 20,
  image_generation: 60,
  quality_control: 15,
  content_packaging: 5,
  telegram_notification: 5,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  generating: "Üretiliyor",
  awaiting_approval: "Onay Bekliyor",
  approved: "Onaylandı",
  published: "Yayınlandı",
  failed: "Başarısız",
};

export default function OrchestratorDashboard() {
  const [stats, setStats] = useState<OrchestratorDashboardStats | null>(null);
  const [recentSlots, setRecentSlots] = useState<ScheduledSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<OrchestratorProductType>("croissants");

  // Progress tracking
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

  useEffect(() => {
    loadData();
  }, []);

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

          // Tamamlandı veya hata varsa polling'i durdur
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
  }, [currentSlotId, showProgressModal]);

  // Elapsed time counter
  useEffect(() => {
    if (!generating) return;

    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [generating]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, slotsData] = await Promise.all([
        api.getOrchestratorDashboardStats(),
        api.listScheduledSlots({ limit: 10 }),
      ]);
      setStats(statsData);
      setRecentSlots(slotsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNow = async () => {
    setGenerating(true);
    setElapsedTime(0);
    setProgressInfo(null);
    setShowProgressModal(true);

    try {
      const result = await api.orchestratorGenerateNow(selectedProductType);
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

  const closeProgressModal = () => {
    setShowProgressModal(false);
    setCurrentSlotId(null);
    setProgressInfo(null);
    loadData();
  };

  // Tahmini kalan süreyi hesapla
  const getEstimatedTimeRemaining = (): string => {
    if (!progressInfo) return "Hesaplanıyor...";

    const stages = Object.keys(STAGE_DURATIONS);
    let remainingSeconds = 0;

    for (let i = progressInfo.stageIndex; i < stages.length; i++) {
      remainingSeconds += STAGE_DURATIONS[stages[i]] || 10;
    }

    if (remainingSeconds < 60) {
      return `~${remainingSeconds} saniye`;
    }
    const minutes = Math.ceil(remainingSeconds / 60);
    return `~${minutes} dakika`;
  };

  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTriggerScheduler = async () => {
    try {
      const result = await api.triggerOrchestratorScheduler();

      // Hiçbir kural tetiklenmediyse açıklayıcı mesaj göster
      if (result.triggered === 0 && result.skipped === 0 && result.errors.length === 0) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"][now.getDay()];

        alert(
          `⚠️ Hiçbir kural tetiklenmedi!\n\n` +
          `Şu an: ${currentDay}, saat ${currentHour}:00\n\n` +
          `Olası sebepler:\n` +
          `• Aktif kuralların zaman aralığı şu ana uymuyor\n` +
          `• Kurallar bugünü (${currentDay}) kapsamıyor\n\n` +
          `💡 İpucu: Test için "Üret" butonunu veya Zaman Kuralları sayfasındaki "Tetikle" butonunu kullanın.`
        );
      } else {
        alert(`Scheduler çalıştırıldı!\n\nTetiklenen: ${result.triggered}\nAtlanan: ${result.skipped}\nHatalar: ${result.errors.length}`);
      }
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Hata oluştu");
    }
  };

  if (loading) {
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
        <button onClick={loadData} className="btn-secondary mt-4">
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              {progressInfo?.status === "failed" ? "Üretim Başarısız" :
                progressInfo?.status === "awaiting_approval" ? "Üretim Tamamlandı!" :
                  "İçerik Üretiliyor..."}
            </h3>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>
                  {progressInfo ? STAGE_LABELS[progressInfo.stage] || progressInfo.stage : "Başlatılıyor..."}
                </span>
                <span>{progressInfo ? `${progressInfo.stageIndex}/${progressInfo.totalStages}` : "0/7"}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${progressInfo?.status === "failed" ? "bg-red-500" :
                      progressInfo?.status === "awaiting_approval" ? "bg-green-500" :
                        "bg-brand-blue"
                    }`}
                  style={{
                    width: `${progressInfo ? (progressInfo.stageIndex / progressInfo.totalStages) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Stages List */}
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {Object.entries(STAGE_LABELS).filter(([key]) => key !== "completed").map(([key, label], index) => {
                const currentIndex = progressInfo?.stageIndex || 0;
                const isDone = index < currentIndex;
                const isCurrent = index === currentIndex - 1;
                const isFailed = progressInfo?.status === "failed" && isCurrent;

                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 text-sm ${isDone ? "text-green-600" :
                        isFailed ? "text-red-600" :
                          isCurrent ? "text-brand-blue font-medium" :
                            "text-gray-400"
                      }`}
                  >
                    {isDone ? (
                      <span className="w-5 h-5 flex items-center justify-center bg-green-100 rounded-full text-xs">✓</span>
                    ) : isFailed ? (
                      <span className="w-5 h-5 flex items-center justify-center bg-red-100 rounded-full text-xs">✕</span>
                    ) : isCurrent ? (
                      <span className="w-5 h-5 flex items-center justify-center bg-brand-blue/20 rounded-full">
                        <span className="w-2 h-2 bg-brand-blue rounded-full animate-pulse" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded-full text-xs text-gray-400">
                        {index + 1}
                      </span>
                    )}
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>

            {/* Time Info */}
            <div className="flex justify-between text-sm text-gray-500 border-t pt-3">
              <span>Geçen süre: {formatElapsedTime(elapsedTime)}</span>
              {generating && <span>Kalan: {getEstimatedTimeRemaining()}</span>}
            </div>

            {/* Error Message */}
            {progressInfo?.error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{progressInfo.error}</p>
              </div>
            )}

            {/* Close Button */}
            {(!generating || progressInfo?.status === "failed" || progressInfo?.status === "awaiting_approval") && (
              <button
                onClick={closeProgressModal}
                className="mt-4 w-full btn-primary"
              >
                {progressInfo?.status === "awaiting_approval" ? "Harika! Kapat" : "Kapat"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orchestrator</h1>
          <p className="text-gray-500 mt-1">AI destekli otomatik içerik üretimi</p>
        </div>
        <button onClick={loadData} className="btn-secondary">
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
                Görsel olmadan üretim başarısız olur.
              </p>
              <a
                href="/assets"
                className="inline-block mt-2 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
              >
                Görseller Sayfasına Git →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Hızlı Üretim */}
      <div className="card bg-gradient-to-br from-brand-blue/10 to-brand-blue/5">
        <h2 className="text-lg font-semibold mb-4">Hemen İçerik Üret</h2>
        <div className="flex flex-wrap gap-6 items-start">
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

          {/* Şimdi Üret Butonu */}
          <div className="text-center">
            <button
              onClick={handleGenerateNow}
              disabled={generating}
              className="btn-primary disabled:opacity-50 min-w-[120px]"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Üretiliyor...
                </span>
              ) : (
                "Şimdi Üret"
              )}
            </button>
            <p className="text-xs text-gray-500 mt-1.5 max-w-[150px]">
              Seçili ürün tipiyle hemen içerik üretir
            </p>
          </div>

          {/* Zamanlanmış Üretim Butonu */}
          <div className="text-center">
            <button
              onClick={handleTriggerScheduler}
              className="btn-secondary min-w-[120px]"
            >
              Zamanlı Kontrol
            </button>
            <p className="text-xs text-gray-500 mt-1.5 max-w-[150px]">
              Zaman kurallarına göre uygun olanları üretir
            </p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-white/50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Süreç:</strong> Claude AI görsel seçer → Gemini görsel üretir → Claude kalite kontrol yapar → Telegram'a onay gönderir → Instagram'a paylaşır
          </p>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Görsel"
          value={stats?.assets.total || 0}
          color="bg-brand-blue/20"
          textColor="text-blue-800"
        />
        <StatCard
          label="Aktif Kurallar"
          value={stats?.rules.total || 0}
          color="bg-brand-green/20"
          textColor="text-green-800"
        />
        <StatCard
          label="Pipeline Çalışmaları"
          value={stats?.pipeline.totalRuns || 0}
          color="bg-brand-mustard/20"
          textColor="text-amber-800"
        />
        <StatCard
          label="Toplam Maliyet"
          value={`$${stats?.pipeline.totalCost || "0.00"}`}
          color="bg-brand-peach/20"
          textColor="text-orange-800"
          isText
        />
      </div>

      {/* Asset Dağılımı */}
      {stats?.assets.byCategory && Object.keys(stats.assets.byCategory).length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Asset Dağılımı</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.assets.byCategory).map(([category, count]) => (
              <div key={category} className="p-3 bg-gray-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-500 capitalize">{category}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slot Durumu */}
      {stats?.slots.byStatus && Object.keys(stats.slots.byStatus).length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Slot Durumları</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(stats.slots.byStatus).map(([status, count]) => {
              const colors = STATUS_COLORS[status] || STATUS_COLORS.pending;
              return (
                <div key={status} className={`p-3 rounded-xl ${colors.bg}`}>
                  <p className={`text-xl font-bold ${colors.text}`}>{count}</p>
                  <p className="text-xs text-gray-600">{STATUS_LABELS[status] || status}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Son Slotlar */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Son İşlemler</h2>
        {recentSlots.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Henüz işlem yok</p>
        ) : (
          <div className="space-y-3">
            {recentSlots.map((slot) => {
              const colors = STATUS_COLORS[slot.status] || STATUS_COLORS.pending;
              return (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      Slot {slot.id.slice(0, 8)}...
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(slot.scheduledTime).toLocaleString("tr-TR")}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Resend Notification Button */}
                    {slot.status === "awaiting_approval" && (
                      <button
                        onClick={async () => {
                          if (!confirm("Telegram bildirimi tekrar gönderilsin mi?")) return;
                          try {
                            setLoading(true);
                            await api.orchestratorResendTelegram(slot.id);
                            alert("Bildirim gönderildi!");
                          } catch (err) {
                            alert("Hata: " + (err instanceof Error ? err.message : "Bilinmeyen hata"));
                          } finally {
                            setLoading(false);
                            loadData();
                          }
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Telegram Bildirimini Tekrar Gönder"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    )}

                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
                      {STATUS_LABELS[slot.status] || slot.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Stat kartı komponenti
function StatCard({
  label,
  value,
  color,
  textColor,
  isText = false,
}: {
  label: string;
  value: number | string;
  color: string;
  textColor: string;
  isText?: boolean;
}) {
  return (
    <div className={`card ${color}`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`${isText ? "text-2xl" : "text-3xl"} font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import { useLoading } from "../contexts/LoadingContext";
import { hasSeenTour, resetTour } from "../components/PageTour";

// Toggle Switch bileşeni
function ToggleSwitch({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`
        relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2
        ${enabled ? "bg-green-500" : "bg-gray-300"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-lg ring-0
          transition duration-200 ease-in-out
          ${enabled ? "translate-x-5" : "translate-x-0"}
        `}
      />
    </button>
  );
}

// Tanıtım turları listesi
const TOURS = [
  { id: "assets-page", name: "Görseller Sayfası", description: "Ürün görselleri yönetimi" },
  { id: "scenarios-page", name: "Senaryolar Sayfası", description: "Senaryo seçimi ve yönetimi" },
  { id: "themes-page", name: "Temalar Sayfası", description: "Tema oluşturma ve düzenleme" },
  { id: "timeslots-page", name: "Zaman Dilimleri Sayfası", description: "Paylaşım zamanlaması" },
];

export default function Settings() {
  const { startLoading, stopLoading } = useLoading();
  const [tokenStatus, setTokenStatus] = useState<{
    valid: boolean;
    accountName?: string;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Scheduler toggle
  const [schedulerEnabled, setSchedulerEnabled] = useState<boolean | null>(null);
  const [schedulerToggling, setSchedulerToggling] = useState(false);

  // Tour durumları
  const [tourStatuses, setTourStatuses] = useState<Record<string, boolean>>({});

  // Tour durumlarını kontrol et
  const checkTourStatuses = useCallback(() => {
    const statuses: Record<string, boolean> = {};
    TOURS.forEach(tour => {
      statuses[tour.id] = hasSeenTour(tour.id);
    });
    setTourStatuses(statuses);
  }, []);

  // Tek bir turu sıfırla
  const handleResetTour = (tourId: string) => {
    resetTour(tourId);
    checkTourStatuses();
  };

  // Tüm turları sıfırla
  const handleResetAllTours = () => {
    TOURS.forEach(tour => {
      resetTour(tour.id);
    });
    checkTourStatuses();
  };

  // Scheduler durumunu yükle
  const loadSchedulerStatus = useCallback(async () => {
    try {
      const settings = await api.getSystemSettings();
      setSchedulerEnabled(settings.schedulerEnabled);
    } catch (err) {
      console.error("[Settings] Scheduler durumu yüklenemedi:", err);
    }
  }, []);

  // Scheduler toggle
  const handleSchedulerToggle = async (enabled: boolean) => {
    setSchedulerToggling(true);
    try {
      await api.updateSystemSettings({ schedulerEnabled: enabled });
      setSchedulerEnabled(enabled);
    } catch (err) {
      console.error("[Settings] Scheduler toggle hatası:", err);
      // Hata durumunda eski değere geri dön
      setSchedulerEnabled(!enabled);
    } finally {
      setSchedulerToggling(false);
    }
  };

  const checkToken = async () => {
    setLoading(true);
    startLoading("settings", "Ayarlar yükleniyor...");
    try {
      const result = await api.validateInstagramToken();
      setTokenStatus({
        valid: true,
        accountName: result.account.name,
      });
    } catch (err) {
      setTokenStatus({
        valid: false,
        error: err instanceof Error ? err.message : "Token geçersiz",
      });
    } finally {
      setLoading(false);
      stopLoading("settings");
    }
  };

  useEffect(() => {
    checkToken();
    checkTourStatuses();
    loadSchedulerStatus();
  }, [checkTourStatuses, loadSchedulerStatus]);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
        <p className="text-gray-500 mt-1">Sistem yapılandırması</p>
      </div>

      {/* Instagram Token */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Instagram Bağlantısı</h2>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="font-medium text-gray-900">Access Token</p>
            {loading ? (
              <p className="text-sm text-gray-500">Kontrol ediliyor...</p>
            ) : tokenStatus?.valid ? (
              <p className="text-sm text-green-600">
                Bağlı: {tokenStatus.accountName}
              </p>
            ) : (
              <p className="text-sm text-red-600">
                {tokenStatus?.error || "Bağlantı yok"}
              </p>
            )}
          </div>
          <button
            onClick={checkToken}
            disabled={loading}
            className="btn-secondary text-sm"
          >
            {loading ? "..." : "Kontrol Et"}
          </button>
        </div>

        <div className="mt-4 p-4 bg-brand-yellow/10 rounded-xl">
          <p className="text-sm text-gray-600">
            <strong>Not:</strong> Token'ı yenilemek için Firebase Console'dan{" "}
            <code className="bg-gray-100 px-1 rounded">functions:config:set</code>{" "}
            komutunu kullanın.
          </p>
        </div>
      </div>

      {/* Scheduler Info */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Zamanlanmış Paylaşım</h2>

        <div className="space-y-3">
          {/* Otomatik Paylaşım Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Otomatik Paylaşım</p>
              <p className="text-sm text-gray-500">
                {schedulerEnabled === null
                  ? "Yükleniyor..."
                  : schedulerEnabled
                    ? "Scheduler aktif - içerikler otomatik üretiliyor"
                    : "Scheduler duraklatıldı - otomatik üretim yapılmıyor"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {schedulerEnabled !== null && (
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                    schedulerEnabled
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {schedulerEnabled ? "Aktif" : "Duraklatıldı"}
                </span>
              )}
              <ToggleSwitch
                enabled={schedulerEnabled ?? false}
                onChange={handleSchedulerToggle}
                disabled={schedulerEnabled === null || schedulerToggling}
              />
            </div>
          </div>

          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Kontrol Sıklığı</span>
            <span className="font-medium">Her 15 dakika</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Timezone</span>
            <span className="font-medium">Europe/Istanbul</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Varsayılan Onay</span>
            <span className="font-medium">Telegram ile</span>
          </div>
        </div>
      </div>

      {/* API Info */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">API Bilgileri</h2>

        <div className="space-y-3">
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Region</span>
            <span className="font-medium font-mono text-sm">europe-west1</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Project ID</span>
            <span className="font-medium font-mono text-sm">instagram-automation-ad77b</span>
          </div>
        </div>
      </div>

      {/* Tanıtım Turları */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Tanıtım Turları</h2>
            <p className="text-sm text-gray-500 mt-1">
              Sayfa tanıtım turlarını yönetin
            </p>
          </div>
          <button
            onClick={handleResetAllTours}
            className="btn-secondary text-sm"
          >
            Tümünü Sıfırla
          </button>
        </div>

        <div className="space-y-3">
          {TOURS.map(tour => {
            const isCompleted = tourStatuses[tour.id];
            return (
              <div
                key={tour.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isCompleted ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{tour.name}</p>
                    <p className="text-xs text-gray-500">{tour.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      isCompleted
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {isCompleted ? "Tamamlandı" : "Görülmedi"}
                  </span>
                  {isCompleted && (
                    <button
                      onClick={() => handleResetTour(tour.id)}
                      className="text-xs text-brand-blue hover:underline"
                    >
                      Sıfırla
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-xl">
          <p className="text-sm text-gray-600">
            <strong>İpucu:</strong> Bir turu sıfırladığınızda, ilgili sayfaya
            gittiğinizde tanıtım turu tekrar başlayacaktır.
          </p>
        </div>
      </div>

      {/* Version */}
      <div className="text-sm text-gray-400">
        Admin Panel v1.0.0 | Storyflow v1.0.0
      </div>
    </div>
  );
}

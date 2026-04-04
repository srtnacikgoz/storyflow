import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api";
import ToggleSwitch from "../../components/ToggleSwitch";

export default function SchedulerSection() {
  const [schedulerEnabled, setSchedulerEnabled] = useState<boolean | null>(null);
  const [schedulerToggling, setSchedulerToggling] = useState(false);

  const loadSchedulerStatus = useCallback(async () => {
    try {
      const settings = await api.getSystemSettings();
      setSchedulerEnabled(settings.schedulerEnabled);
    } catch (err) {
      console.error("[Settings] Scheduler durumu yüklenemedi:", err);
    }
  }, []);

  useEffect(() => {
    loadSchedulerStatus();
  }, [loadSchedulerStatus]);

  const handleSchedulerToggle = async (enabled: boolean) => {
    setSchedulerToggling(true);
    try {
      await api.updateSystemSettings({ schedulerEnabled: enabled });
      setSchedulerEnabled(enabled);
    } catch (err) {
      console.error("[Settings] Scheduler toggle hatası:", err);
      setSchedulerEnabled(!enabled);
    } finally {
      setSchedulerToggling(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">Zamanlanmış Paylaşım</h2>

      <div className="space-y-3">
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
                className={`text-xs px-2 py-0.5 rounded font-medium ${schedulerEnabled
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
  );
}

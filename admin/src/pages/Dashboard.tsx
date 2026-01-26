import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useLoading } from "../contexts/LoadingContext";
import type { QueueStats, HealthCheckResponse, UsageStats, UsageRecord, SetupStatusResponse } from "../types";

export default function Dashboard() {
  const navigate = useNavigate();
  const { startLoading, stopLoading } = useLoading();
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [recentUsage, setRecentUsage] = useState<UsageRecord[]>([]);
  const [setupStatus, setSetupStatus] = useState<SetupStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    startLoading("dashboard", "Dashboard verileri yükleniyor...");
    try {
      const [statsData, healthData, usageData, setupData] = await Promise.all([
        api.getQueueStats(),
        api.getHealthCheck(),
        api.getUsageStats().catch(() => ({ stats: null, recent: [] })),
        api.getSetupStatus().catch(() => null),
      ]);
      setStats(statsData);
      setHealth(healthData);
      setUsageStats(usageData.stats);
      setRecentUsage(usageData.recent);
      setSetupStatus(setupData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veri yüklenemedi");
    } finally {
      setLoading(false);
      stopLoading("dashboard");
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

  // Gemini kullanım tipi renkleri
  const getUsageTypeColor = (type: string) => {
    switch (type) {
      case "gemini-flash":
        return "bg-blue-500";
      case "gemini-pro":
        return "bg-amber-500";
      default:
        return "bg-gray-400";
    }
  };

  // Gemini kullanım tipi label
  const getUsageTypeLabel = (type: string) => {
    switch (type) {
      case "gemini-flash":
        return "Gemini Flash";
      case "gemini-pro":
        return "Gemini Pro";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Sistem durumu ve istatistikler</p>
      </div>

      {/* Setup Progress - Sadece eksik veya uyarı varsa göster */}
      {setupStatus && setupStatus.summary.overallStatus !== "complete" && (
        <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-xl">📋</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Sistem Kurulum Durumu</h2>
                <p className="text-sm text-gray-600">
                  {setupStatus.summary.overallStatus === "incomplete"
                    ? "Bazı ayarlar eksik"
                    : "İyileştirme önerileri var"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-600">
                {setupStatus.summary.progress}%
              </div>
              <div className="text-xs text-gray-500">
                {setupStatus.summary.completed}/{setupStatus.summary.total} tamamlandı
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-amber-100 rounded-full h-2 mb-4">
            <div
              className={`h-2 rounded-full transition-all ${
                setupStatus.summary.overallStatus === "warning"
                  ? "bg-amber-500"
                  : "bg-amber-400"
              }`}
              style={{ width: `${setupStatus.summary.progress}%` }}
            />
          </div>

          {/* Setup Items */}
          <div className="space-y-2">
            {setupStatus.items
              .filter((item) => item.status !== "complete")
              .map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    item.status === "incomplete"
                      ? "bg-red-50 border border-red-100"
                      : "bg-amber-100/50 border border-amber-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {item.status === "incomplete" ? "❌" : "⚠️"}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      {item.message && (
                        <p className="text-sm text-gray-600">{item.message}</p>
                      )}
                    </div>
                  </div>
                  {item.action && (
                    <button
                      onClick={() => navigate(item.action!.route)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        item.status === "incomplete"
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : "bg-amber-500 text-white hover:bg-amber-600"
                      }`}
                    >
                      {item.action.label}
                    </button>
                  )}
                </div>
              ))}
          </div>

          {/* Tamamlanan maddeler (collapsed) */}
          {setupStatus.summary.completed > 0 && (
            <div className="mt-4 pt-4 border-t border-amber-200">
              <p className="text-sm text-gray-600 mb-2">
                ✅ Tamamlanan: {setupStatus.items
                  .filter((item) => item.status === "complete")
                  .map((item) => item.label)
                  .join(", ")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sistem Sağlığı - Gelişmiş */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xl">🏥</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Sistem Sağlığı</h2>
              <p className="text-xs text-gray-500">Bileşen durumları ve bağlantılar</p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              health?.status === "healthy"
                ? "bg-green-100 text-green-800"
                : "bg-orange-100 text-orange-800"
            }`}
          >
            {health?.status === "healthy" ? "Sağlıklı" : "Sorunlu"}
          </span>
        </div>

        {/* Bağlantı Durumları */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className={`p-3 rounded-xl border ${
            health?.checks.instagram.status === "ok"
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span>{health?.checks.instagram.status === "ok" ? "✅" : "❌"}</span>
              <p className="text-sm font-medium text-gray-700">Instagram API</p>
            </div>
            <p className={`text-xs ${
              health?.checks.instagram.status === "ok" ? "text-green-600" : "text-red-600"
            }`}>
              {health?.checks.instagram.status === "ok" ? "Bağlantı aktif" : "Bağlantı hatası"}
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${
            health?.checks.queue.status === "ok"
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span>{health?.checks.queue.status === "ok" ? "✅" : "❌"}</span>
              <p className="text-sm font-medium text-gray-700">Kuyruk Sistemi</p>
            </div>
            <p className={`text-xs ${
              health?.checks.queue.status === "ok" ? "text-green-600" : "text-red-600"
            }`}>
              {health?.checks.queue.status === "ok" ? "Çalışıyor" : "Durduruldu"}
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${
            health?.checks.gemini?.status === "ok"
              ? "bg-green-50 border-green-200"
              : "bg-gray-50 border-gray-200"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span>{health?.checks.gemini?.status === "ok" ? "✅" : "⚪"}</span>
              <p className="text-sm font-medium text-gray-700">Gemini AI</p>
            </div>
            <p className="text-xs text-gray-500">
              {health?.checks.gemini?.status === "ok" ? "Hazır" : "Beklemede"}
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${
            health?.checks.storage?.status === "ok"
              ? "bg-green-50 border-green-200"
              : "bg-gray-50 border-gray-200"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span>{health?.checks.storage?.status === "ok" ? "✅" : "⚪"}</span>
              <p className="text-sm font-medium text-gray-700">Depolama</p>
            </div>
            <p className="text-xs text-gray-500">
              {health?.checks.storage?.status === "ok" ? "Erişilebilir" : "Beklemede"}
            </p>
          </div>
        </div>

        {/* İçerik Durumları - setupStatus'tan */}
        {setupStatus && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-600 mb-3">İçerik Durumu</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {setupStatus.items.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${
                    item.status === "complete"
                      ? "bg-green-50 border-green-200"
                      : item.status === "warning"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-red-50 border-red-200"
                  }`}
                  onClick={() => item.action && navigate(item.action.route)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>
                      {item.status === "complete" ? "✅" : item.status === "warning" ? "⚠️" : "❌"}
                    </span>
                    <p className="text-sm font-medium text-gray-700">{item.label}</p>
                  </div>
                  {item.message && (
                    <p className={`text-xs ${
                      item.status === "complete"
                        ? "text-green-600"
                        : item.status === "warning"
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}>
                      {item.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Bekleyen"
          value={stats?.pending || 0}
          color="bg-brand-yellow/20"
          textColor="text-yellow-800"
        />
        <StatCard
          label="İşleniyor"
          value={stats?.processing || 0}
          color="bg-brand-blue/20"
          textColor="text-blue-800"
        />
        <StatCard
          label="Tamamlanan"
          value={stats?.completed || 0}
          color="bg-brand-green/20"
          textColor="text-green-800"
        />
        <StatCard
          label="Başarısız"
          value={stats?.failed || 0}
          color="bg-brand-peach/20"
          textColor="text-red-800"
        />
      </div>

      {/* AI Kullanım İstatistikleri */}
      {usageStats && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Gemini AI Kullanım & Maliyet</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Bugün */}
            <div className="p-4 bg-gradient-to-br from-brand-blue/10 to-brand-blue/5 rounded-xl">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Bugün</h3>
              <p className="text-2xl font-bold text-gray-900">${usageStats.today.total.toFixed(2)}</p>
              <div className="mt-2 space-y-1 text-sm text-gray-500">
                <p>Gemini: {usageStats.today.gemini.count} görsel</p>
                <p className="text-xs text-gray-400">(${usageStats.today.gemini.cost.toFixed(2)})</p>
              </div>
            </div>

            {/* Bu Ay */}
            <div className="p-4 bg-gradient-to-br from-brand-green/10 to-brand-green/5 rounded-xl">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Bu Ay</h3>
              <p className="text-2xl font-bold text-gray-900">${usageStats.thisMonth.total.toFixed(2)}</p>
              <div className="mt-2 space-y-1 text-sm text-gray-500">
                <p>Gemini: {usageStats.thisMonth.gemini.count} görsel</p>
                <p className="text-xs text-gray-400">(${usageStats.thisMonth.gemini.cost.toFixed(2)})</p>
              </div>
            </div>

            {/* Toplam */}
            <div className="p-4 bg-gradient-to-br from-brand-mustard/10 to-brand-mustard/5 rounded-xl">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Toplam</h3>
              <p className="text-2xl font-bold text-gray-900">${usageStats.allTime.total.toFixed(2)}</p>
              <div className="mt-2 space-y-1 text-sm text-gray-500">
                <p>Gemini: {usageStats.allTime.gemini.count} görsel</p>
                <p className="text-xs text-gray-400">(${usageStats.allTime.gemini.cost.toFixed(2)})</p>
              </div>
            </div>
          </div>

          {/* Son Kullanımlar */}
          {recentUsage.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Son İşlemler</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recentUsage.slice(0, 5).map((usage, index) => (
                  <div
                    key={usage.id || index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getUsageTypeColor(usage.type)}`} />
                      <span className="text-gray-500 text-xs">{getUsageTypeLabel(usage.type)}</span>
                      <span className="text-gray-700">{usage.description}</span>
                    </div>
                    <span className="text-gray-500">${usage.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maliyet Bilgisi */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Birim maliyetler: Gemini Flash $0.01/görsel, Gemini Pro $0.04/görsel
            </p>
          </div>
        </div>
      )}

      {/* Hızlı Aksiyonlar */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Hızlı Aksiyonlar</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => api.processQueueItem({ skipEnhancement: true })}
            className="btn-primary"
          >
            Story Paylaş (Orijinal)
          </button>
          <button
            onClick={() => api.processQueueItem({ skipEnhancement: false })}
            className="btn-secondary"
          >
            Story Paylaş (Gemini AI)
          </button>
          <button onClick={loadData} className="btn-secondary">
            Yenile
          </button>
        </div>
      </div>

      {/* Versiyon Bilgisi */}
      <div className="text-sm text-gray-400">
        Versiyon: {health?.version || "1.0.0"} | Son güncelleme: {health?.timestamp ? new Date(health.timestamp).toLocaleString("tr-TR") : "-"}
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
}: {
  label: string;
  value: number;
  color: string;
  textColor: string;
}) {
  return (
    <div className={`card ${color}`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

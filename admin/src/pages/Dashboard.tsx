import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { QueueStats, HealthCheckResponse, UsageStats, UsageRecord } from "../types";

export default function Dashboard() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [recentUsage, setRecentUsage] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, healthData, usageData] = await Promise.all([
        api.getQueueStats(),
        api.getHealthCheck(),
        api.getUsageStats().catch(() => ({ stats: null, recent: [] })),
      ]);
      setStats(statsData);
      setHealth(healthData);
      setUsageStats(usageData.stats);
      setRecentUsage(usageData.recent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veri yüklenemedi");
    } finally {
      setLoading(false);
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Sistem durumu ve istatistikler</p>
      </div>

      {/* Sistem Durumu */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Sistem Durumu</h2>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              health?.status === "healthy"
                ? "bg-brand-green/20 text-green-800"
                : "bg-brand-orange/20 text-orange-800"
            }`}
          >
            {health?.status === "healthy" ? "Sağlıklı" : "Sorunlu"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500">Instagram API</p>
            <p className={`font-medium ${
              health?.checks.instagram.status === "ok" ? "text-green-600" : "text-red-600"
            }`}>
              {health?.checks.instagram.status === "ok" ? "Bağlı" : "Hata"}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500">Kuyruk Sistemi</p>
            <p className={`font-medium ${
              health?.checks.queue.status === "ok" ? "text-green-600" : "text-red-600"
            }`}>
              {health?.checks.queue.status === "ok" ? "Aktif" : "Hata"}
            </p>
          </div>
        </div>
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
          <h2 className="text-lg font-semibold mb-4">AI Kullanım & Maliyet</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Bugün */}
            <div className="p-4 bg-gradient-to-br from-brand-blue/10 to-brand-blue/5 rounded-xl">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Bugün</h3>
              <p className="text-2xl font-bold text-gray-900">${usageStats.today.total.toFixed(2)}</p>
              <div className="mt-2 space-y-1 text-sm text-gray-500">
                <p>Vision: {usageStats.today.vision.count} istek</p>
                <p>DALL-E: {usageStats.today.dalle.count} görsel</p>
              </div>
            </div>

            {/* Bu Ay */}
            <div className="p-4 bg-gradient-to-br from-brand-green/10 to-brand-green/5 rounded-xl">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Bu Ay</h3>
              <p className="text-2xl font-bold text-gray-900">${usageStats.thisMonth.total.toFixed(2)}</p>
              <div className="mt-2 space-y-1 text-sm text-gray-500">
                <p>Vision: {usageStats.thisMonth.vision.count} istek</p>
                <p>DALL-E: {usageStats.thisMonth.dalle.count} görsel</p>
              </div>
            </div>

            {/* Toplam */}
            <div className="p-4 bg-gradient-to-br from-brand-mustard/10 to-brand-mustard/5 rounded-xl">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Toplam</h3>
              <p className="text-2xl font-bold text-gray-900">${usageStats.allTime.total.toFixed(2)}</p>
              <div className="mt-2 space-y-1 text-sm text-gray-500">
                <p>Vision: {usageStats.allTime.vision.count} istek</p>
                <p>DALL-E: {usageStats.allTime.dalle.count} görsel</p>
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
                      <span className={`w-2 h-2 rounded-full ${
                        usage.type === "vision" ? "bg-purple-500" : "bg-pink-500"
                      }`} />
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
              Birim maliyetler: Vision API $0.01/istek, DALL-E 3 HD $0.08/görsel
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
            Story Paylaş (AI Enhanced)
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

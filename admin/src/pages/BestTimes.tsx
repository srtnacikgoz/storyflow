import { useEffect, useState } from "react";
import { api } from "../services/api";
import type {
  BestTimesResponse,
  PostAnalyticsStats,
  ConfidenceLevel,
} from "../types";

// Gün isimleri
const DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

// Güven seviyesi badge renkleri
const confidenceColors: Record<ConfidenceLevel, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-green-100 text-green-700",
};

const confidenceLabels: Record<ConfidenceLevel, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
};

// Skor rengi hesapla (0-100 -> kırmızı-yeşil)
function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 65) return "bg-green-400";
  if (score >= 50) return "bg-yellow-400";
  if (score >= 35) return "bg-orange-400";
  return "bg-red-400";
}

// Heatmap hücre rengi
function getHeatmapColor(score: number | undefined): string {
  if (score === undefined) return "bg-gray-100";
  if (score >= 80) return "bg-green-500 text-white";
  if (score >= 65) return "bg-green-300";
  if (score >= 50) return "bg-yellow-300";
  if (score >= 35) return "bg-orange-300";
  return "bg-red-300";
}

export default function BestTimes() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bestTimes, setBestTimes] = useState<BestTimesResponse | null>(null);
  const [stats, setStats] = useState<PostAnalyticsStats | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [timesData, statsData] = await Promise.all([
        api.getBestTimes(5),
        api.getPostAnalyticsStats(),
      ]);
      setBestTimes(timesData);
      setStats(statsData);
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

  // Saatler (06:00 - 22:00)
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">En İyi Paylaşım Zamanları</h1>
          <p className="text-gray-500 mt-1">
            Geçmiş paylaşımlarınıza göre optimal zamanlar
          </p>
        </div>
        <button onClick={loadData} className="btn-secondary">
          Yenile
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Veri Durumu */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-500">Toplam Paylaşım</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalPosts}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Engagement Verisi</p>
            <p className="text-2xl font-bold text-gray-900">{stats.postsWithEngagement}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Ort. Engagement</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.avgEngagementRate > 0 ? `%${stats.avgEngagementRate.toFixed(1)}` : "-"}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Veri Kalitesi</p>
            <span
              className={`inline-block px-2 py-1 rounded-lg text-sm font-medium ${
                confidenceColors[bestTimes?.dataQuality || "low"]
              }`}
            >
              {confidenceLabels[bestTimes?.dataQuality || "low"]}
            </span>
          </div>
        </div>
      )}

      {/* En İyi Zamanlar */}
      {bestTimes && bestTimes.recommendations.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            En İyi 5 Zaman
          </h2>
          <div className="space-y-3">
            {bestTimes.recommendations.map((rec, index) => (
              <div
                key={`${rec.dayIndex}-${rec.hour}`}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl"
              >
                {/* Sıra */}
                <div className="w-8 h-8 flex items-center justify-center bg-brand-mustard/20 rounded-full">
                  <span className="text-sm font-bold text-brand-mustard">
                    {index + 1}
                  </span>
                </div>

                {/* Gün ve Saat */}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {rec.dayTr} {rec.hourFormatted}
                  </p>
                  <p className="text-sm text-gray-500">
                    {rec.basedOnPosts} paylaşım verisi
                    {rec.avgEngagement !== undefined && rec.avgEngagement > 0 && (
                      <span> • %{rec.avgEngagement.toFixed(1)} ort. engagement</span>
                    )}
                  </p>
                </div>

                {/* Skor */}
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getScoreColor(rec.score)}`}
                        style={{ width: `${rec.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-10">
                      {rec.score}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      confidenceColors[rec.confidence]
                    }`}
                  >
                    {confidenceLabels[rec.confidence]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Heatmap */}
      {bestTimes && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Haftalık Heatmap
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left text-gray-500 font-medium w-12"></th>
                  {hours.map((hour) => (
                    <th
                      key={hour}
                      className="p-1 text-center text-gray-500 font-medium text-xs"
                    >
                      {hour.toString().padStart(2, "0")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <tr key={day}>
                    <td className="p-2 text-gray-700 font-medium">
                      {DAY_NAMES[day]}
                    </td>
                    {hours.map((hour) => {
                      const score = bestTimes.heatmap[day]?.[hour];
                      return (
                        <td key={hour} className="p-1">
                          <div
                            className={`w-full h-8 rounded flex items-center justify-center text-xs font-medium ${getHeatmapColor(
                              score
                            )}`}
                            title={`${DAY_NAMES[day]} ${hour}:00 - Skor: ${score || "-"}`}
                          >
                            {score !== undefined ? score : ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Renk açıklaması */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-300 rounded"></div>
              <span>Düşük</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-orange-300 rounded"></div>
              <span>Orta-Düşük</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-yellow-300 rounded"></div>
              <span>Orta</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-300 rounded"></div>
              <span>İyi</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>En İyi</span>
            </div>
          </div>
        </div>
      )}

      {/* Bilgi Notu */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <div className="text-blue-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-blue-800 font-medium">Skorlar Nasıl Hesaplanıyor?</p>
            <p className="text-sm text-blue-700 mt-1">
              Skorlar, sektör araştırma verisi (Sprout Social, Buffer, Later) ve senin geçmiş
              paylaşımlarının engagement oranlarının ağırlıklı ortalamasıdır. Daha fazla paylaşım
              yaptıkça öneriler kişiselleşir.
            </p>
          </div>
        </div>
      </div>

      {/* En Aktif Gün/Saat */}
      {stats && stats.totalPosts > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Paylaşım Alışkanlıkların
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">En Çok Paylaştığın Gün</p>
              <p className="text-xl font-bold text-gray-900">{stats.mostActiveDay}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">En Çok Paylaştığın Saat</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.mostActiveHour >= 0
                  ? `${stats.mostActiveHour.toString().padStart(2, "0")}:00`
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Veri Yok */}
      {(!bestTimes || bestTimes.totalPosts === 0) && !loading && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-gray-500">Henüz paylaşım verisi yok</p>
          <p className="text-sm text-gray-400 mt-2">
            Paylaşımlar onaylandıkça veriler burada görünecek
          </p>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "../services/api";
import type {
  AnalyticsDashboard,
  DateRange,
  DailyTrend,
} from "../types";

// Renk paleti
const CHART_COLORS = [
  "#C4A661", // brand-mustard
  "#87CEEB", // brand-blue
  "#90EE90", // brand-green
  "#DEB887", // brand-cream
  "#FFD700", // brand-yellow
  "#E6BE8A", // warm gold
  "#98D8C8", // mint
  "#F7DC6F", // light yellow
];

export default function Analytics() {
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("all");

  useEffect(() => {
    loadDashboard();
  }, [dateRange]);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAnalyticsDashboard(dateRange);
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  // Son paylaşım zamanı formatla
  const formatLastPost = (timestamp?: number) => {
    if (!timestamp) return "Henüz yok";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Az önce";
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };

  // Basit bar chart
  const BarChart = ({
    data,
    labelKey,
    valueKey,
    maxHeight = 120,
  }: {
    data: { [key: string]: unknown }[];
    labelKey: string;
    valueKey: string;
    maxHeight?: number;
  }) => {
    const maxValue = Math.max(...data.map((d) => d[valueKey] as number), 1);

    return (
      <div className="flex items-end gap-1 h-full">
        {data.map((item, i) => {
          const value = item[valueKey] as number;
          const height = (value / maxValue) * maxHeight;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-xs text-gray-500">{value}</span>
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${height}px`,
                  backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  minHeight: value > 0 ? "4px" : "0",
                }}
              />
              <span className="text-xs text-gray-600 truncate w-full text-center">
                {item[labelKey] as string}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Pie chart legend
  const PieLegend = ({
    data,
    labelKey,
    valueKey,
    percentKey,
  }: {
    data: { [key: string]: unknown }[];
    labelKey: string;
    valueKey: string;
    percentKey: string;
  }) => {
    return (
      <div className="space-y-2">
        {data.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-sm text-gray-700 flex-1 truncate">
              {item[labelKey] as string}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {item[valueKey] as number}
            </span>
            <span className="text-xs text-gray-500">
              ({item[percentKey] as number}%)
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Mini sparkline for daily trend
  const Sparkline = ({ data }: { data: DailyTrend[] }) => {
    const maxValue = Math.max(...data.map((d) => d.count), 1);
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - (d.count / maxValue) * 100;
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg viewBox="0 0 100 100" className="w-full h-16" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="#C4A661"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
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
        <button onClick={loadDashboard} className="btn-secondary mt-4">
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!dashboard) return null;

  const { summary } = dashboard;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Paylaşım istatistikleri ve trendler</p>
        </div>

        {/* Tarih aralığı filtresi */}
        <div className="flex gap-2">
          {(["today", "week", "month", "all"] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                dateRange === range
                  ? "bg-brand-mustard text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {range === "today" && "Bugün"}
              {range === "week" && "Hafta"}
              {range === "month" && "Ay"}
              {range === "all" && "Tümü"}
            </button>
          ))}
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Toplam Paylaşım</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{summary.totalPosts}</p>
          <p className="text-xs text-gray-400 mt-1">Son: {formatLastPost(summary.lastPostAt)}</p>
        </div>

        <div className="card">
          <p className="text-sm text-gray-500">Bu Hafta</p>
          <p className="text-3xl font-bold text-brand-mustard mt-1">{summary.postsThisWeek}</p>
          <p className="text-xs text-gray-400 mt-1">Ort: {summary.avgPostsPerDay}/gün</p>
        </div>

        <div className="card">
          <p className="text-sm text-gray-500">Onay Oranı</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{summary.approvalRate}%</p>
          <p className="text-xs text-gray-400 mt-1">
            {summary.approvedCount} onay / {summary.rejectedCount} red
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-gray-500">Kuyrukta</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{summary.pendingCount}</p>
          <p className="text-xs text-gray-400 mt-1">
            + {summary.scheduledCount} zamanlanmış
          </p>
        </div>
      </div>

      {/* Günlük Trend */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Günlük Paylaşım Trendi</h2>
        {dashboard.dailyTrend.length > 0 ? (
          <div>
            <Sparkline data={dashboard.dailyTrend} />
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>{dashboard.dailyTrend[0]?.dateLabel}</span>
              <span>{dashboard.dailyTrend[dashboard.dailyTrend.length - 1]?.dateLabel}</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Henüz veri yok</p>
        )}
      </div>

      {/* Dağılımlar Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Kategori Dağılımı */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Kategori Dağılımı</h2>
          {dashboard.categoryBreakdown.length > 0 ? (
            <PieLegend
              data={dashboard.categoryBreakdown as unknown as { [key: string]: unknown }[]}
              labelKey="categoryLabel"
              valueKey="count"
              percentKey="percentage"
            />
          ) : (
            <p className="text-gray-500 text-center py-8">Henüz veri yok</p>
          )}
        </div>

        {/* AI Model Dağılımı */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Model Kullanımı</h2>
          {dashboard.aiModelBreakdown.length > 0 ? (
            <PieLegend
              data={dashboard.aiModelBreakdown as unknown as { [key: string]: unknown }[]}
              labelKey="modelLabel"
              valueKey="count"
              percentKey="percentage"
            />
          ) : (
            <p className="text-gray-500 text-center py-8">Henüz veri yok</p>
          )}
        </div>

        {/* Stil Dağılımı */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Stil Tercihleri</h2>
          {dashboard.styleBreakdown.length > 0 ? (
            <PieLegend
              data={dashboard.styleBreakdown as unknown as { [key: string]: unknown }[]}
              labelKey="styleLabel"
              valueKey="count"
              percentKey="percentage"
            />
          ) : (
            <p className="text-gray-500 text-center py-8">Henüz veri yok</p>
          )}
        </div>

        {/* Şablon Kullanımı */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Şablon Kullanımı</h2>
          {dashboard.templateBreakdown.length > 0 ? (
            <PieLegend
              data={dashboard.templateBreakdown as unknown as { [key: string]: unknown }[]}
              labelKey="templateName"
              valueKey="count"
              percentKey="percentage"
            />
          ) : (
            <p className="text-gray-500 text-center py-8">Henüz veri yok</p>
          )}
        </div>
      </div>

      {/* Gün Dağılımı */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Haftalık Gün Dağılımı</h2>
        {dashboard.dayDistribution.some((d) => d.count > 0) ? (
          <div className="h-40">
            <BarChart
              data={dashboard.dayDistribution as unknown as { [key: string]: unknown }[]}
              labelKey="dayLabel"
              valueKey="count"
              maxHeight={120}
            />
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Henüz veri yok</p>
        )}
      </div>

      {/* Saatlik Dağılım */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Saatlik Dağılım</h2>
        {dashboard.hourlyDistribution.some((h) => h.count > 0) ? (
          <div className="h-40 overflow-x-auto">
            <div className="min-w-[600px]">
              <BarChart
                data={dashboard.hourlyDistribution as unknown as { [key: string]: unknown }[]}
                labelKey="hourLabel"
                valueKey="count"
                maxHeight={120}
              />
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Henüz veri yok</p>
        )}
      </div>
    </div>
  );
}

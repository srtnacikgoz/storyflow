import { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import type { AILog, AIStats, AIProvider, AILogStage, AILogStatus } from "../types";

// Stage renkleri
const STAGE_COLORS: Record<AILogStage, string> = {
  "asset-selection": "bg-blue-100 text-blue-800",
  "scenario-selection": "bg-purple-100 text-purple-800",
  "prompt-optimization": "bg-indigo-100 text-indigo-800",
  "image-generation": "bg-green-100 text-green-800",
  "quality-control": "bg-yellow-100 text-yellow-800",
  "content-generation": "bg-pink-100 text-pink-800",
};

// Stage Türkçe isimleri
const STAGE_LABELS: Record<AILogStage, string> = {
  "asset-selection": "Asset Seçimi",
  "scenario-selection": "Senaryo Seçimi",
  "prompt-optimization": "Prompt Optimizasyonu",
  "image-generation": "Görsel Üretimi",
  "quality-control": "Kalite Kontrolü",
  "content-generation": "İçerik Üretimi",
};

// Stage sırası (pipeline akışına göre)
const STAGE_ORDER: AILogStage[] = [
  "asset-selection",
  "scenario-selection",
  "prompt-optimization",
  "image-generation",
  "quality-control",
  "content-generation",
];

// Status renkleri
const STATUS_COLORS: Record<AILogStatus, string> = {
  success: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
  blocked: "bg-orange-100 text-orange-800",
};

// Pipeline renkleri - her pipeline için farklı renk
const PIPELINE_COLORS = [
  "border-l-blue-400",
  "border-l-amber-400",
  "border-l-emerald-400",
  "border-l-rose-400",
  "border-l-violet-400",
  "border-l-cyan-400",
  "border-l-orange-400",
  "border-l-teal-400",
];

// Pipeline ID'den renk al
const getPipelineColor = (pipelineId: string | undefined, pipelineColorMap: Map<string, number>): string => {
  if (!pipelineId) return "border-l-gray-300";
  if (!pipelineColorMap.has(pipelineId)) {
    pipelineColorMap.set(pipelineId, pipelineColorMap.size % PIPELINE_COLORS.length);
  }
  return PIPELINE_COLORS[pipelineColorMap.get(pipelineId)!];
};

// Gruplandırılmış pipeline tipi
interface PipelineGroup {
  pipelineId: string;
  logs: AILog[];
  totalDuration: number;
  totalCost: number;
  totalTokens: number;
  startTime: number;
  endTime: number;
  hasError: boolean;
  productType?: string;
  slotId?: string;
}

export default function AIMonitor() {
  // State
  const [logs, setLogs] = useState<AILog[]>([]);
  const [stats, setStats] = useState<AIStats | null>(null);
  const [selectedLog, setSelectedLog] = useState<AILog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Görünüm modu: "list" veya "grouped"
  const [viewMode, setViewMode] = useState<"list" | "grouped">("grouped");

  // Açık pipeline'lar (grouped view için)
  const [expandedPipelines, setExpandedPipelines] = useState<Set<string>>(new Set());

  // Filtreler
  const [filterProvider, setFilterProvider] = useState<AIProvider | "">("");
  const [filterStage, setFilterStage] = useState<AILogStage | "">("");
  const [filterStatus, setFilterStatus] = useState<AILogStatus | "">("");
  const [filterPipelineId, setFilterPipelineId] = useState("");
  const [statsPeriod, setStatsPeriod] = useState(24);

  // Pipeline renk haritası (her pipeline için tutarlı renk)
  const [pipelineColorMap] = useState(() => new Map<string, number>());

  // Logları pipelineId'ye göre grupla
  const groupedPipelines = useMemo(() => {
    const groups = new Map<string, PipelineGroup>();

    logs.forEach(log => {
      const pipelineId = log.pipelineId || "ungrouped";

      if (!groups.has(pipelineId)) {
        groups.set(pipelineId, {
          pipelineId,
          logs: [],
          totalDuration: 0,
          totalCost: 0,
          totalTokens: 0,
          startTime: log.createdAt,
          endTime: log.createdAt,
          hasError: false,
          productType: log.productType,
          slotId: log.slotId,
        });
      }

      const group = groups.get(pipelineId)!;
      group.logs.push(log);
      group.totalDuration += log.durationMs || 0;
      group.totalCost += log.cost || 0;
      group.totalTokens += log.tokensUsed || 0;
      group.startTime = Math.min(group.startTime, log.createdAt);
      group.endTime = Math.max(group.endTime, log.createdAt);
      if (log.status === "error") group.hasError = true;
      if (!group.productType && log.productType) group.productType = log.productType;
      if (!group.slotId && log.slotId) group.slotId = log.slotId;
    });

    // Her grup içindeki logları stage sırasına göre sırala
    groups.forEach(group => {
      group.logs.sort((a, b) => {
        const orderA = STAGE_ORDER.indexOf(a.stage);
        const orderB = STAGE_ORDER.indexOf(b.stage);
        if (orderA !== orderB) return orderA - orderB;
        return a.createdAt - b.createdAt;
      });
    });

    // Grupları başlangıç zamanına göre sırala (en yeni önce)
    return Array.from(groups.values()).sort((a, b) => b.startTime - a.startTime);
  }, [logs]);

  // Pipeline aç/kapat toggle
  const togglePipeline = (pipelineId: string) => {
    setExpandedPipelines(prev => {
      const next = new Set(prev);
      if (next.has(pipelineId)) {
        next.delete(pipelineId);
      } else {
        next.add(pipelineId);
      }
      return next;
    });
  };

  // Verileri yükle
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Log'ları ve istatistikleri paralel yükle
      const [logsData, statsData] = await Promise.all([
        api.getAILogs({
          provider: filterProvider || undefined,
          stage: filterStage || undefined,
          status: filterStatus || undefined,
          pipelineId: filterPipelineId || undefined,
          limit: 100,
        }),
        api.getAIStats(statsPeriod),
      ]);

      setLogs(logsData);
      setStats(statsData);
    } catch (err) {
      console.error("Error loading AI logs:", err);
      setError(err instanceof Error ? err.message : "Veriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  // İlk yükleme
  useEffect(() => {
    loadData();
  }, [filterProvider, filterStage, filterStatus, filterPipelineId, statsPeriod]);

  // Tarih formatla
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Kısa tarih formatla
  const formatShortDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Süre formatla
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // Maliyet formatla
  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  // Modal kapat
  const closeModal = () => setSelectedLog(null);

  // Gruplandırılmış görünüm render
  const renderGroupedView = () => (
    <div className="space-y-4">
      {groupedPipelines.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">
          {loading ? "Yükleniyor..." : "Henüz AI log kaydı yok"}
        </div>
      ) : (
        groupedPipelines.map(group => {
          const isExpanded = expandedPipelines.has(group.pipelineId);
          const isUngrouped = group.pipelineId === "ungrouped";
          const pipelineColor = getPipelineColor(
            isUngrouped ? undefined : group.pipelineId,
            pipelineColorMap
          );

          return (
            <div
              key={group.pipelineId}
              className={`bg-white rounded-xl border border-gray-100 overflow-hidden border-l-4 ${pipelineColor}`}
            >
              {/* Pipeline Header */}
              <button
                onClick={() => togglePipeline(group.pipelineId)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Expand/Collapse ikonu */}
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>

                  {/* Pipeline ID */}
                  <div className="text-left">
                    {isUngrouped ? (
                      <span className="text-gray-400 text-sm">Pipeline ID yok</span>
                    ) : (
                      <span className="font-mono text-sm text-gray-700">
                        {group.pipelineId.length > 30
                          ? `${group.pipelineId.substring(0, 30)}...`
                          : group.pipelineId}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{formatShortDate(group.startTime)}</span>
                      {group.productType && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {group.productType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pipeline özeti */}
                <div className="flex items-center gap-6">
                  {/* Adım sayısı */}
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-700">{group.logs.length}</span>
                    <span className="text-xs text-gray-500 ml-1">adım</span>
                  </div>

                  {/* Süre */}
                  <div className="text-right min-w-[60px]">
                    <span className="text-sm font-medium text-gray-700">{formatDuration(group.totalDuration)}</span>
                  </div>

                  {/* Token */}
                  <div className="text-right min-w-[60px]">
                    <span className="text-sm text-gray-600">{group.totalTokens.toLocaleString()}</span>
                    <span className="text-xs text-gray-400 ml-1">tok</span>
                  </div>

                  {/* Maliyet */}
                  <div className="text-right min-w-[70px]">
                    <span className="text-sm font-medium text-gray-700">{formatCost(group.totalCost)}</span>
                  </div>

                  {/* Durum */}
                  {group.hasError ? (
                    <span className="w-2 h-2 rounded-full bg-red-500" title="Hata var" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-green-500" title="Başarılı" />
                  )}
                </div>
              </button>

              {/* Pipeline İçeriği (Expanded) */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  {/* Adımlar - Timeline görünümü */}
                  <div className="p-4">
                    <div className="relative">
                      {/* Timeline çizgisi */}
                      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />

                      {/* Adımlar */}
                      <div className="space-y-3">
                        {group.logs.map((log, idx) => (
                          <div key={log.id} className="relative flex items-start gap-4 pl-8">
                            {/* Timeline nokta */}
                            <div
                              className={`absolute left-1.5 w-3 h-3 rounded-full border-2 border-white ${
                                log.status === "success"
                                  ? "bg-green-500"
                                  : log.status === "error"
                                  ? "bg-red-500"
                                  : "bg-orange-500"
                              }`}
                              style={{ top: "4px" }}
                            />

                            {/* Adım içeriği */}
                            <div className="flex-1 flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
                              <div className="flex items-center gap-3">
                                {/* Sıra numarası */}
                                <span className="text-xs text-gray-400 w-4">{idx + 1}</span>

                                {/* Stage */}
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STAGE_COLORS[log.stage]}`}>
                                  {STAGE_LABELS[log.stage]}
                                </span>

                                {/* Provider */}
                                <span
                                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                    log.provider === "claude"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {log.provider === "claude" ? "Claude" : "Gemini"}
                                </span>
                              </div>

                              <div className="flex items-center gap-4">
                                {/* Süre */}
                                <span className="text-xs text-gray-600">{formatDuration(log.durationMs)}</span>

                                {/* Token */}
                                <span className="text-xs text-gray-500">{log.tokensUsed || "-"} tok</span>

                                {/* Maliyet */}
                                <span className="text-xs text-gray-600">{log.cost ? formatCost(log.cost) : "-"}</span>

                                {/* Detay butonu */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLog(log);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                >
                                  Detay
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  // Liste görünümü render
  const renderListView = () => (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pipeline
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Zaman
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Provider
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aşama
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Durum
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Süre
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Token
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Maliyet
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlem
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  {loading ? "Yükleniyor..." : "Henüz AI log kaydı yok"}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className={`hover:bg-gray-50 transition-colors border-l-4 ${getPipelineColor(log.pipelineId, pipelineColorMap)}`}
                >
                  <td className="px-4 py-3">
                    {log.pipelineId ? (
                      <button
                        onClick={() => setFilterPipelineId(log.pipelineId || "")}
                        className="font-mono text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded truncate max-w-[80px] block"
                        title={log.pipelineId}
                      >
                        {log.pipelineId.substring(0, 8)}...
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        log.provider === "claude"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {log.provider === "claude" ? "Claude" : "Gemini"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        STAGE_COLORS[log.stage]
                      }`}
                    >
                      {STAGE_LABELS[log.stage]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        STATUS_COLORS[log.status]
                      }`}
                    >
                      {log.status === "success"
                        ? "Başarılı"
                        : log.status === "error"
                        ? "Hata"
                        : "Engellendi"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDuration(log.durationMs)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {log.tokensUsed || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {log.cost ? formatCost(log.cost) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Detay
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Monitor</h1>
          <p className="text-gray-600 mt-1">
            Claude ve Gemini çağrılarını izle ve debug et
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Yükleniyor..." : "Yenile"}
        </button>
      </div>

      {/* Hata mesajı */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* İstatistikler */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Toplam Çağrı</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalCalls}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Claude</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{stats.claudeCalls}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Gemini</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.geminiCalls}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Başarı Oranı</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              %{stats.successRate.toFixed(1)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Toplam Maliyet</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              ${stats.totalCost.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Ort. Süre</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatDuration(stats.avgDurationMs)}
            </p>
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Görünüm modu */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Görünüm</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode("grouped")}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === "grouped"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Gruplu
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Liste
              </button>
            </div>
          </div>

          {/* Periyot seçimi */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Periyot</label>
            <select
              value={statsPeriod}
              onChange={(e) => setStatsPeriod(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value={1}>Son 1 saat</option>
              <option value={6}>Son 6 saat</option>
              <option value={24}>Son 24 saat</option>
              <option value={72}>Son 3 gün</option>
              <option value={168}>Son 7 gün</option>
            </select>
          </div>

          {/* Provider filtresi */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Provider</label>
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value as AIProvider | "")}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">Tümü</option>
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>

          {/* Stage filtresi */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Aşama</label>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value as AILogStage | "")}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">Tümü</option>
              {Object.entries(STAGE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Status filtresi */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Durum</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as AILogStatus | "")}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">Tümü</option>
              <option value="success">Başarılı</option>
              <option value="error">Hata</option>
              <option value="blocked">Engellendi</option>
            </select>
          </div>

          {/* Pipeline ID filtresi */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Pipeline ID</label>
            <input
              type="text"
              value={filterPipelineId}
              onChange={(e) => setFilterPipelineId(e.target.value)}
              placeholder="Pipeline ID..."
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-40"
            />
          </div>

          {/* Pipeline filtresi temizle */}
          {filterPipelineId && (
            <button
              onClick={() => setFilterPipelineId("")}
              className="px-3 py-2 text-sm text-red-600 hover:text-red-800"
            >
              Filtreyi Temizle
            </button>
          )}
        </div>
      </div>

      {/* Log Listesi / Gruplandırılmış Görünüm */}
      {viewMode === "grouped" ? renderGroupedView() : renderListView()}

      {/* Detay Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Başlık */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  AI Log Detayı
                </h2>
                <p className="text-sm text-gray-500">
                  {formatDate(selectedLog.createdAt)}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal İçerik */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Meta Bilgiler */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Provider</p>
                  <p className="font-medium">{selectedLog.provider}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Aşama</p>
                  <p className="font-medium">{STAGE_LABELS[selectedLog.stage]}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Model</p>
                  <p className="font-medium">{selectedLog.model}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Durum</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[selectedLog.status]}`}>
                    {selectedLog.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Süre</p>
                  <p className="font-medium">{formatDuration(selectedLog.durationMs)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Token</p>
                  <p className="font-medium">{selectedLog.tokensUsed || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Maliyet</p>
                  <p className="font-medium">{selectedLog.cost ? formatCost(selectedLog.cost) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Ürün Tipi</p>
                  <p className="font-medium">{selectedLog.productType || "-"}</p>
                </div>
              </div>

              {/* Pipeline/Slot ID */}
              {(selectedLog.pipelineId || selectedLog.slotId) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedLog.pipelineId && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Pipeline ID</p>
                      <p className="font-mono text-sm bg-gray-50 px-2 py-1 rounded">{selectedLog.pipelineId}</p>
                    </div>
                  )}
                  {selectedLog.slotId && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Slot ID</p>
                      <p className="font-mono text-sm bg-gray-50 px-2 py-1 rounded">{selectedLog.slotId}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Hata Mesajı */}
              {selectedLog.error && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Hata Mesajı</p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 font-mono text-sm">{selectedLog.error}</p>
                  </div>
                </div>
              )}

              {/* System Prompt */}
              {selectedLog.systemPrompt && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">System Prompt</p>
                  <div
                    className="bg-gray-50 rounded-lg p-4 overflow-y-auto resize-y min-h-[100px]"
                    style={{ height: "150px" }}
                  >
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                      {selectedLog.systemPrompt}
                    </pre>
                  </div>
                </div>
              )}

              {/* User Prompt */}
              {selectedLog.userPrompt && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">User Prompt</p>
                  <div
                    className="bg-blue-50 rounded-lg p-4 overflow-y-auto resize-y min-h-[100px]"
                    style={{ height: "200px" }}
                  >
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                      {selectedLog.userPrompt}
                    </pre>
                  </div>
                </div>
              )}

              {/* Negative Prompt */}
              {selectedLog.negativePrompt && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Negative Prompt</p>
                  <div
                    className="bg-orange-50 rounded-lg p-4 overflow-y-auto resize-y min-h-[60px]"
                    style={{ height: "100px" }}
                  >
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                      {selectedLog.negativePrompt}
                    </pre>
                  </div>
                </div>
              )}

              {/* Response */}
              {selectedLog.response && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">AI Yanıtı</p>
                  <div
                    className="bg-green-50 rounded-lg p-4 overflow-y-auto resize-y min-h-[100px]"
                    style={{ height: "200px" }}
                  >
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                      {selectedLog.response}
                    </pre>
                  </div>
                </div>
              )}

              {/* Parsed Response Data */}
              {selectedLog.responseData && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Parse Edilmiş Yanıt</p>
                  <div
                    className="bg-purple-50 rounded-lg p-4 overflow-y-auto resize-y min-h-[100px]"
                    style={{ height: "200px" }}
                  >
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                      {JSON.stringify(selectedLog.responseData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Gemini Specific */}
              {selectedLog.provider === "gemini" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Input Görsel Sayısı</p>
                    <p className="font-medium">{selectedLog.inputImageCount || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Görsel Üretildi</p>
                    <p className="font-medium">
                      {selectedLog.outputImageGenerated ? "Evet" : "Hayır"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

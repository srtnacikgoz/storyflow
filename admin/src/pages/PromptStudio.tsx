import { useState, useEffect } from "react";
import { api } from "../services/api";
import { useLoading } from "../contexts/LoadingContext";
import type { PromptTemplate, PromptStageId, PromptVersion } from "../types";

// Aşama bilgileri (UI için)
const STAGE_INFO: Record<PromptStageId, { label: string; icon: string; color: string }> = {
  "asset-selection": { label: "Asset Secimi", icon: "🎯", color: "bg-blue-100 text-blue-800" },
  "scenario-selection": { label: "Senaryo Secimi", icon: "🎬", color: "bg-purple-100 text-purple-800" },
  "prompt-optimization": { label: "Prompt Optimizasyonu", icon: "✨", color: "bg-amber-100 text-amber-800" },
  "quality-control": { label: "Kalite Kontrol", icon: "🔍", color: "bg-green-100 text-green-800" },
  "content-generation": { label: "Icerik Uretimi", icon: "📝", color: "bg-pink-100 text-pink-800" },
};

// Degisken aciklamalari - her degiskenin kaynagi ve hangi sayfadan yonetildigi
const VARIABLE_INFO: Record<string, { description: string; source: string; page?: string }> = {
  moodUpper: {
    description: "Temanin mood degeri (buyuk harf). Ornek: ROMANTIC, ENERGETIC",
    source: "Temalar > secili temanin mood alani",
    page: "/themes",
  },
  moodRule: {
    description: "Mood'a ozel gorsel yonergeleri. Ornek: romantic icin sicak tonlar ve yumusak isik",
    source: "claudeService.ts icerisinde hardcoded MOOD_RULES sozlugu",
  },
  blockedAssetsSection: {
    description: "Son uretimde kullanilan asset'leri engelleyen yonerge (tekrar onleme)",
    source: "Diversity Rules tarafindan otomatik olusturulur",
  },
  petInstruction: {
    description: "Evcil hayvan dahil etme/etmeme yonergesi",
    source: "Diversity Rules > petFrequency ayarina gore otomatik",
  },
  holdingInstruction: {
    description: "Urunun elde tutulup tutulamayacagi bilgisi",
    source: "Gorseller > urun duzenle > 'Elde tutulabilir' alani",
    page: "/assets",
  },
  blockedHandStylesRule: {
    description: "Son uretimde kullanilan el stillerini engelleyen yonerge",
    source: "Diversity Rules > handStyleGap ayarina gore otomatik",
  },
  blockedCompositionsRule: {
    description: "Son uretimde kullanilan kompozisyonlari engelleyen yonerge",
    source: "Diversity Rules > compositionGap ayarina gore otomatik",
  },
  feedbackHints: {
    description: "Onceki uretimlere verilen geri bildirimlerden olusturulan ipuclari",
    source: "FeedbackService tarafindan otomatik olusturulur",
  },
  trainingContext: {
    description: "Prompt iyilestirme icin egitim baglamlari ve ornekler",
    source: "promptTrainingService.ts icerisinde hardcoded",
  },
  userRulesSection: {
    description: "Kullanicinin tanimladigi ozel AI kurallari (ornek: 'logo her zaman gorunsun')",
    source: "AI Kurallari sayfasindan yonetilir",
    page: "/ai-rules",
  },
};

// Asama sirasi
const STAGE_ORDER: PromptStageId[] = [
  "asset-selection",
  "scenario-selection",
  "prompt-optimization",
  "quality-control",
  "content-generation",
];

export default function PromptStudio() {
  const { startLoading, stopLoading } = useLoading();

  // State
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Secili template
  const [selectedId, setSelectedId] = useState<PromptStageId | null>(null);

  // Duzenleme modu
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Versiyon gecmisi paneli
  const [showHistory, setShowHistory] = useState(false);

  // Verileri yukle
  const loadData = async () => {
    try {
      setLoading(true);
      startLoading("prompt-studio", "Prompt Studio yukleniyor...");
      const config = await api.getPromptStudioConfig();

      // Sırala
      const sorted = STAGE_ORDER
        .map((id) => config.prompts[id])
        .filter(Boolean);

      setTemplates(sorted);
      if (!selectedId && sorted.length > 0) {
        setSelectedId(sorted[0].id);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prompt Studio yuklenemedi");
    } finally {
      setLoading(false);
      stopLoading("prompt-studio");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Secili template
  const selectedTemplate = templates.find((t) => t.id === selectedId) || null;

  // Duzenlemeye basla
  const startEditing = () => {
    if (!selectedTemplate) return;
    setEditText(selectedTemplate.systemPrompt);
    setChangeNote("");
    setIsEditing(true);
  };

  // Duzenlemeyi iptal et
  const cancelEditing = () => {
    setIsEditing(false);
    setEditText("");
    setChangeNote("");
  };

  // Kaydet
  const handleSave = async () => {
    if (!selectedId || !editText.trim()) return;
    if (editText === selectedTemplate?.systemPrompt) {
      cancelEditing();
      return;
    }

    try {
      setSaving(true);
      startLoading("prompt-save", "Prompt kaydediliyor...");
      await api.updatePromptTemplate(selectedId, editText, changeNote || undefined);
      await loadData();
      setIsEditing(false);
      setChangeNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydetme hatasi");
    } finally {
      setSaving(false);
      stopLoading("prompt-save");
    }
  };

  // Geri al
  const handleRevert = async (version: PromptVersion) => {
    if (!selectedId) return;
    const confirmed = window.confirm(
      `v${version.version} versiyonuna geri donmek istediginize emin misiniz?`
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      startLoading("prompt-revert", "Prompt geri aliniyor...");
      await api.revertPromptTemplate(selectedId, version.version);
      await loadData();
      setShowHistory(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Geri alma hatasi");
    } finally {
      setSaving(false);
      stopLoading("prompt-revert");
    }
  };

  // Cache temizle
  const handleClearCache = async () => {
    try {
      startLoading("prompt-cache", "Cache temizleniyor...");
      await api.clearPromptStudioCache();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cache temizleme hatasi");
    } finally {
      stopLoading("prompt-cache");
    }
  };

  // Tarih formati
  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Yukleniyor
  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Prompt Studio yukleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Baslik */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prompt Studio</h1>
          <p className="text-gray-500 text-sm mt-1">
            AI pipeline sistem prompt'larini duzenle ve yonet
          </p>
        </div>
        <button
          onClick={handleClearCache}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Cache Temizle
        </button>
      </div>

      {/* Hata mesaji */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Kapat</button>
        </div>
      )}

      {/* Ana icerik: Sol panel (liste) + Sag panel (detay) */}
      <div className="flex gap-6">
        {/* Sol Panel - Template listesi */}
        <div className="w-72 flex-shrink-0 space-y-2">
          {templates.map((template) => {
            const info = STAGE_INFO[template.id];
            const isSelected = selectedId === template.id;

            return (
              <button
                key={template.id}
                onClick={() => {
                  setSelectedId(template.id);
                  setIsEditing(false);
                  setShowHistory(false);
                }}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? "border-brand-mustard bg-brand-mustard/10 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{info.icon}</span>
                  <div className="min-w-0">
                    <p className={`font-medium text-sm ${isSelected ? "text-gray-900" : "text-gray-700"}`}>
                      {template.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{template.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>
                    {template.stage}
                  </span>
                  <span className="text-xs text-gray-400">
                    v{template.version}
                  </span>
                  {template.variables.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {template.variables.length} degisken
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Sag Panel - Detay */}
        <div className="flex-1 min-w-0">
          {selectedTemplate ? (
            <div className="card">
              {/* Baslik ve aksiyonlar */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {STAGE_INFO[selectedTemplate.id].icon}
                    {selectedTemplate.name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedTemplate.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>Versiyon: <strong className="text-gray-600">v{selectedTemplate.version}</strong></span>
                    <span>Son guncelleme: {formatDate(selectedTemplate.updatedAt)}</span>
                    {selectedTemplate.updatedBy && (
                      <span>Guncelleyen: {selectedTemplate.updatedBy}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isEditing && (
                    <>
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                          showHistory
                            ? "bg-gray-100 border-gray-300 text-gray-700"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        Gecmis ({selectedTemplate.history.length})
                      </button>
                      <button
                        onClick={startEditing}
                        className="btn-primary text-sm"
                      >
                        Duzenle
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Degiskenler */}
              {selectedTemplate.variables.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-medium text-amber-800 mb-2">
                    Template Degiskenleri (runtime'da doldurulur)
                  </p>
                  <div className="space-y-2">
                    {selectedTemplate.variables.map((v) => {
                      const info = VARIABLE_INFO[v];
                      return (
                        <div key={v} className="flex items-start gap-2">
                          <code className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono flex-shrink-0 mt-0.5">
                            {`{{${v}}}`}
                          </code>
                          {info ? (
                            <div className="min-w-0">
                              <p className="text-xs text-amber-900">{info.description}</p>
                              <p className="text-xs text-amber-700/70 mt-0.5">
                                {info.page ? (
                                  <a
                                    href={info.page}
                                    className="underline hover:text-amber-900"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      window.location.href = info.page!;
                                    }}
                                  >
                                    {info.source}
                                  </a>
                                ) : (
                                  <span>{info.source}</span>
                                )}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-amber-700/70 mt-0.5">Aciklama bulunamadi</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Prompt icerik */}
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm
                      focus:outline-none focus:ring-2 focus:ring-brand-mustard/50 focus:border-brand-mustard
                      resize-y"
                    placeholder="Sistem prompt'u..."
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={changeNote}
                      onChange={(e) => setChangeNote(e.target.value)}
                      className="input flex-1"
                      placeholder="Degisiklik notu (opsiyonel)"
                    />
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {editText.length} karakter
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Kaydedildiginde versiyon v{selectedTemplate.version} &rarr; v{selectedTemplate.version + 1} olacak
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={cancelEditing}
                        className="btn-secondary text-sm"
                        disabled={saving}
                      >
                        Iptal
                      </button>
                      <button
                        onClick={handleSave}
                        className="btn-primary text-sm"
                        disabled={saving || editText.length < 50}
                      >
                        {saving ? "Kaydediliyor..." : "Kaydet"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800
                  whitespace-pre-wrap break-words font-mono overflow-auto max-h-[500px]">
                  {selectedTemplate.systemPrompt}
                </pre>
              )}

              {/* Versiyon gecmisi */}
              {showHistory && !isEditing && (
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Versiyon Gecmisi
                  </h3>
                  {selectedTemplate.history.length === 0 ? (
                    <p className="text-sm text-gray-500">Henuz versiyon gecmisi yok.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedTemplate.history
                        .slice()
                        .sort((a, b) => b.version - a.version)
                        .map((version) => (
                          <VersionItem
                            key={version.version}
                            version={version}
                            onRevert={handleRevert}
                            saving={saving}
                            formatDate={formatDate}
                          />
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card flex items-center justify-center h-64 text-gray-400">
              Bir prompt secin
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Versiyon gecmisi item'i
function VersionItem({
  version,
  onRevert,
  saving,
  formatDate,
}: {
  version: PromptVersion;
  onRevert: (v: PromptVersion) => void;
  saving: boolean;
  formatDate: (ts: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">v{version.version}</span>
          <span className="text-xs text-gray-500">{formatDate(version.updatedAt)}</span>
          {version.updatedBy && (
            <span className="text-xs text-gray-400">{version.updatedBy}</span>
          )}
          {version.changeNote && (
            <span className="text-xs text-gray-500 italic">"{version.changeNote}"</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded border border-gray-200 hover:bg-white"
          >
            {expanded ? "Gizle" : "Gor"}
          </button>
          <button
            onClick={() => onRevert(version)}
            disabled={saving}
            className="text-xs text-amber-700 hover:text-amber-900 px-2 py-1 rounded border border-amber-200 hover:bg-amber-50"
          >
            Geri Al
          </button>
        </div>
      </div>
      {expanded && (
        <pre className="p-3 text-xs text-gray-700 whitespace-pre-wrap break-words font-mono bg-white max-h-60 overflow-auto">
          {version.systemPrompt}
        </pre>
      )}
    </div>
  );
}

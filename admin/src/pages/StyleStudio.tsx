import { useState, useEffect } from "react";
import { api } from "../services/api";
import type { VisualStandard, VisualStyleAnalysisResult } from "../types";
import StyleAnalyzer from "../components/style-studio/StyleAnalyzer";
import StandardPromptGenerator from "../components/style-studio/StandardPromptGenerator";

export default function StyleStudio() {
  const [standards, setStandards] = useState<VisualStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "create">("list");
  const [seeding, setSeeding] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<VisualStyleAnalysisResult | null>(null);
  const [analysisImage, setAnalysisImage] = useState<string | null>(null);
  const [standardName, setStandardName] = useState("");
  const [saving, setSaving] = useState(false);
  const [promptTarget, setPromptTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadStandards = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listVisualStandards();
      setStandards(data as VisualStandard[]);
    } catch (err: any) {
      setError(err.message ?? "Standartlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStandards(); }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await api.seedVisualStandards();
      await loadStandards();
    } finally {
      setSeeding(false);
    }
  };

  const handleAnalysisComplete = (result: VisualStyleAnalysisResult, preview: string) => {
    setAnalysisResult(result);
    setAnalysisImage(preview);
  };

  const handleSaveStandard = async () => {
    if (!analysisResult || !standardName.trim()) return;
    setSaving(true);
    try {
      await api.createVisualStandard({
        name: standardName.trim(),
        description: analysisResult.overallDescription,
        thumbnail: analysisImage ?? "",
        background: analysisResult.background,
        lighting: analysisResult.lighting,
        colorPalette: analysisResult.colorPalette,
        surface: analysisResult.surface,
        ambiance: analysisResult.ambiance,
        cameraAngle: analysisResult.cameraAngle,
        promptTemplate: analysisResult.promptTemplate,
        isActive: true,
        isDefault: false,
      });
      setAnalysisResult(null);
      setAnalysisImage(null);
      setStandardName("");
      setViewMode("list");
      await loadStandards();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu standardı silmek istediğinize emin misiniz?")) return;
    setDeleting(id);
    try {
      await api.deleteVisualStandard(id);
      setStandards((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (standard: VisualStandard) => {
    try {
      await api.updateVisualStandard(standard.id, { isActive: !standard.isActive });
      setStandards((prev) =>
        prev.map((s) => s.id === standard.id ? { ...s, isActive: !s.isActive } : s)
      );
    } catch {
      // hata sessiz geçmesin ama UI'yı bloklamasın
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stil Stüdyosu</h1>
          <p className="text-sm text-gray-500 mt-1">Görsel standartları analiz et ve yönet</p>
        </div>
        <div className="flex items-center gap-3">
          {standards.length === 0 && viewMode === "list" && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {seeding ? "Yükleniyor…" : "Varsayılanları Yükle"}
            </button>
          )}
          {viewMode === "list" ? (
            <button
              onClick={() => setViewMode("create")}
              className="px-4 py-2 text-sm bg-brand-blue text-white rounded-xl hover:opacity-90"
            >
              + Yeni Standart
            </button>
          ) : (
            <button
              onClick={() => { setViewMode("list"); setAnalysisResult(null); setAnalysisImage(null); setStandardName(""); }}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
            >
              Listeye Dön
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Oluşturma Görünümü */}
      {viewMode === "create" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
          <StyleAnalyzer onAnalysisComplete={handleAnalysisComplete} />

          {analysisResult && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              {/* Renk Paleti */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Renk Paleti</p>
                <div className="flex gap-2">
                  {analysisResult.colorPalette.map((hex) => (
                    <div key={hex} className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-lg border border-gray-200" style={{ backgroundColor: hex }} />
                      <span className="text-[10px] text-gray-500 font-mono">{hex}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2x2 Özellik Izgarası */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-xs font-semibold text-gray-700">Arkaplan</span>
                  </div>
                  <p className="text-xs text-gray-600">{analysisResult.background.type} · {analysisResult.background.color}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{analysisResult.background.description}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    <span className="text-xs font-semibold text-gray-700">Işık</span>
                  </div>
                  <p className="text-xs text-gray-600">{analysisResult.lighting.direction} · {analysisResult.lighting.quality}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{analysisResult.lighting.description}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-stone-400" />
                    <span className="text-xs font-semibold text-gray-700">Yüzey</span>
                  </div>
                  <p className="text-xs text-gray-600">{analysisResult.surface.material} · {analysisResult.surface.texture}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{analysisResult.surface.description}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-violet-400" />
                    <span className="text-xs font-semibold text-gray-700">Ambians</span>
                  </div>
                  <p className="text-xs text-gray-600">{analysisResult.ambiance.mood}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{analysisResult.ambiance.adjectives.join(", ")}</p>
                </div>
              </div>

              {/* Kamera Açısı */}
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-xs font-medium text-gray-700">Kamera Açısı:</span>
                <span className="text-xs text-gray-600">{analysisResult.cameraAngle}</span>
              </div>

              {/* Genel Açıklama */}
              <div className="bg-blue-50 rounded-xl px-4 py-3">
                <p className="text-xs text-blue-800">{analysisResult.overallDescription}</p>
              </div>

              {/* Prompt Şablonu */}
              <div className="bg-gray-900 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{analysisResult.promptTemplate}</p>
              </div>

              {/* Ad Girişi + Kaydet */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={standardName}
                  onChange={(e) => setStandardName(e.target.value)}
                  placeholder="Standart adı…"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                />
                <button
                  onClick={handleSaveStandard}
                  disabled={saving || !standardName.trim()}
                  className="px-5 py-2 text-sm bg-brand-blue text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Kaydediliyor…" : "Standart Olarak Kaydet"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Liste Görünümü */}
      {viewMode === "list" && (
        standards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
            <div className="text-5xl mb-4">🎨</div>
            <p className="text-base font-medium text-gray-600">Henüz görsel standart yok</p>
            <p className="text-sm mt-1">Yeni standart ekle veya varsayılanları yükle</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {standards.map((standard) => (
              <div key={standard.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
                {/* Küçük resim */}
                <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                  {standard.thumbnail ? (
                    <img src={standard.thumbnail} alt={standard.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-wrap gap-1 p-2">
                      {(standard.colorPalette ?? []).slice(0, 4).map((hex) => (
                        <div key={hex} className="w-6 h-6 rounded" style={{ backgroundColor: hex }} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Bilgiler */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{standard.name}</p>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{standard.description}</p>
                  </div>

                  {/* Etiketler */}
                  <div className="flex flex-wrap gap-1">
                    {standard.background?.type && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{standard.background.type}</span>
                    )}
                    {standard.lighting?.quality && (
                      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{standard.lighting.quality}</span>
                    )}
                    {standard.ambiance?.mood && (
                      <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{standard.ambiance.mood}</span>
                    )}
                    {standard.cameraAngle && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{standard.cameraAngle}</span>
                    )}
                  </div>

                  {/* Aksiyonlar */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPromptTarget({ id: standard.id, name: standard.name })}
                      className="text-xs text-brand-blue hover:underline"
                    >
                      Prompt Oluştur
                    </button>
                    <span className="text-gray-200">|</span>
                    <button
                      onClick={() => handleToggleActive(standard)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      {standard.isActive ? "Pasif Yap" : "Aktif Yap"}
                    </button>
                    <span className="text-gray-200">|</span>
                    <button
                      onClick={() => handleDelete(standard.id)}
                      disabled={deleting === standard.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      {deleting === standard.id ? "Siliniyor…" : "Sil"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Prompt Modal */}
      {promptTarget && (
        <StandardPromptGenerator
          standardId={promptTarget.id}
          standardName={promptTarget.name}
          onClose={() => setPromptTarget(null)}
        />
      )}
    </div>
  );
}

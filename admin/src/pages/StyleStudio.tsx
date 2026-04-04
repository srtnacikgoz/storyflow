import { useState, useEffect } from "react";
import { api } from "../services/api";
import type { SceneStandard, SceneAnalysisResult, ProductAnalysisResult } from "../types";
import StyleAnalyzer from "../components/style-studio/StyleAnalyzer";
import ProductAnalyzer from "../components/style-studio/ProductAnalyzer";
import AnalysisResultPanel from "../components/style-studio/AnalysisResultPanel";
import PromptComposer from "../components/style-studio/PromptComposer";

export default function StyleStudio() {
  const [standards, setStandards] = useState<SceneStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"studio" | "create-scene">("studio");
  const [seeding, setSeeding] = useState(false);

  // Sahne olusturma
  const [sceneAnalysis, setSceneAnalysis] = useState<SceneAnalysisResult | null>(null);
  const [sceneImage, setSceneImage] = useState<string | null>(null);
  const [sceneName, setSceneName] = useState("");
  const [savingScene, setSavingScene] = useState(false);

  // Studio akisi
  const [selectedStandard, setSelectedStandard] = useState<SceneStandard | null>(null);
  const [productAnalysis, setProductAnalysis] = useState<ProductAnalysisResult | null>(null);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  // Silme
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadStandards = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listVisualStandards();
      setStandards(data as SceneStandard[]);
    } catch (err: any) {
      setError(err.message ?? "Sahneler yuklenemedi");
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

  const handleSceneAnalysisComplete = (result: SceneAnalysisResult, preview: string) => {
    setSceneAnalysis(result);
    setSceneImage(preview);
  };

  const handleSaveScene = async () => {
    if (!sceneAnalysis || !sceneName.trim()) return;
    setSavingScene(true);
    try {
      await api.createVisualStandard({
        name: sceneName.trim(),
        description: sceneAnalysis.overallDescription,
        referenceImage: sceneImage ?? "",
        background: sceneAnalysis.background,
        lighting: sceneAnalysis.lighting,
        colorPalette: sceneAnalysis.colorPalette,
        surface: sceneAnalysis.surface,
        ambiance: sceneAnalysis.ambiance,
        servingBase: sceneAnalysis.servingBase,
        propRules: sceneAnalysis.propRules,
        depthOfField: sceneAnalysis.depthOfField,
        cameraAngle: sceneAnalysis.cameraAngle,
        productFrameRatio: sceneAnalysis.productFrameRatio,
        scenePrompt: sceneAnalysis.scenePrompt,
        isActive: true,
        isDefault: false,
      });
      setSceneAnalysis(null);
      setSceneImage(null);
      setSceneName("");
      setViewMode("studio");
      await loadStandards();
    } finally {
      setSavingScene(false);
    }
  };

  const handleSelectStandard = (s: SceneStandard) => {
    setSelectedStandard(s);
    setProductAnalysis(null);
    setProductImage(null);
    setShowComposer(false);
  };

  const handleProductAnalysisComplete = (result: ProductAnalysisResult, preview: string) => {
    setProductAnalysis(result);
    setProductImage(preview);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu sahneyi silmek istediginize emin misiniz?")) return;
    setDeleting(id);
    try {
      await api.deleteVisualStandard(id);
      setStandards((prev) => prev.filter((s) => s.id !== id));
      if (selectedStandard?.id === id) {
        setSelectedStandard(null);
        setProductAnalysis(null);
        setProductImage(null);
      }
    } finally {
      setDeleting(null);
    }
  };

  // Secili sahne verisini SceneAnalysisResult'a donustur
  const reconstructSceneAnalysis = (s: SceneStandard): SceneAnalysisResult => ({
    background: s.background,
    lighting: s.lighting,
    colorPalette: s.colorPalette,
    surface: s.surface,
    ambiance: s.ambiance,
    servingBase: s.servingBase,
    propRules: s.propRules,
    depthOfField: s.depthOfField,
    cameraAngle: s.cameraAngle,
    productFrameRatio: s.productFrameRatio,
    scenePrompt: s.scenePrompt,
    overallDescription: s.description,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Baslik */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stil Studyosu v2</h1>
          <p className="text-sm text-gray-500 mt-1">Sahne sec, urun analiz et, prompt uret</p>
        </div>
        <div className="flex items-center gap-3">
          {standards.length === 0 && viewMode === "studio" && (
            <button onClick={handleSeed} disabled={seeding}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              {seeding ? "Yukleniyor..." : "Varsayilanlari Yukle"}
            </button>
          )}
          {viewMode === "studio" ? (
            <button onClick={() => setViewMode("create-scene")}
              className="px-4 py-2 text-sm bg-brand-blue text-white rounded-xl hover:opacity-90">
              + Yeni Sahne
            </button>
          ) : (
            <button onClick={() => { setViewMode("studio"); setSceneAnalysis(null); setSceneImage(null); setSceneName(""); }}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
              Studyoya Don
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Sahne Olusturma */}
      {viewMode === "create-scene" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
          <StyleAnalyzer onAnalysisComplete={handleSceneAnalysisComplete} />
          {sceneAnalysis && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <AnalysisResultPanel type="scene" result={sceneAnalysis} />
              <div className="flex gap-3">
                <input type="text" value={sceneName} onChange={(e) => setSceneName(e.target.value)}
                  placeholder="Sahne adi..."
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
                <button onClick={handleSaveScene} disabled={savingScene || !sceneName.trim()}
                  className="px-5 py-2 text-sm bg-brand-blue text-white rounded-xl hover:opacity-90 disabled:opacity-50">
                  {savingScene ? "Kaydediliyor..." : "Sahne Olarak Kaydet"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Studio Gorunumu: 2 sutunlu */}
      {viewMode === "studio" && (
        <div className="flex gap-6" style={{ minHeight: "calc(100vh - 220px)" }}>
          {/* Sol Panel — Sahne listesi */}
          <div className="w-72 flex-shrink-0 space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
            {standards.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p className="text-sm font-medium text-gray-600">Henuz sahne yok</p>
                <p className="text-xs mt-1">Yeni sahne olustur veya varsayilanlari yukle</p>
              </div>
            ) : (
              standards.map((s) => (
                <div key={s.id} onClick={() => handleSelectStandard(s)}
                  className={`group bg-white rounded-xl border p-3 cursor-pointer transition-colors hover:border-brand-blue/40 ${
                    selectedStandard?.id === s.id ? "border-brand-blue bg-brand-blue/5" : "border-gray-100"
                  }`}>
                  <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{s.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.background?.type && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{s.background.type}</span>
                    )}
                    {s.lighting?.quality && (
                      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">{s.lighting.quality}</span>
                    )}
                    {s.ambiance?.mood && (
                      <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">{s.ambiance.mood}</span>
                    )}
                    {s.cameraAngle && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{s.cameraAngle}</span>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                    disabled={deleting === s.id}
                    className="mt-2 text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">
                    {deleting === s.id ? "Siliniyor..." : "Sil"}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Sag Panel — Detay + urun analiz + prompt */}
          <div className="flex-1 space-y-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
            {!selectedStandard ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <p className="text-base font-medium text-gray-500">Soldaki listeden bir sahne sec</p>
                <p className="text-sm mt-1">veya yeni sahne olustur</p>
              </div>
            ) : (
              <>
                {/* Sahne detaylari */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    {selectedStandard.referenceImage && (
                      <img src={selectedStandard.referenceImage} alt={selectedStandard.name}
                        className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{selectedStandard.name}</h2>
                      <p className="text-sm text-gray-500 mt-0.5">{selectedStandard.description}</p>
                    </div>
                  </div>
                  <AnalysisResultPanel type="scene" result={reconstructSceneAnalysis(selectedStandard)} />
                </div>

                {/* Urun Analizi */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <ProductAnalyzer onAnalysisComplete={handleProductAnalysisComplete} />
                </div>

                {/* Urun Analiz Sonuclari */}
                {productAnalysis && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <AnalysisResultPanel type="product" result={productAnalysis} />
                  </div>
                )}

                {/* Prompt Olustur Butonu */}
                {productAnalysis && (
                  <button onClick={() => setShowComposer(true)}
                    className="w-full px-5 py-3 text-sm font-medium bg-brand-blue text-white rounded-xl hover:opacity-90 transition-opacity">
                    Prompt Olustur
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* PromptComposer Modal */}
      {showComposer && selectedStandard && productAnalysis && productImage && (
        <PromptComposer
          standardId={selectedStandard.id}
          standardName={selectedStandard.name}
          productAnalysis={productAnalysis}
          productImage={productImage}
          sceneImage={selectedStandard.referenceImage ?? ""}
          onClose={() => setShowComposer(false)}
        />
      )}
    </div>
  );
}

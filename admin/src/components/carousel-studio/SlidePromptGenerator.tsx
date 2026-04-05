import { useState, useEffect } from "react";
import { api } from "../../services/api";
import type { SceneStandard, ComposedPromptResult } from "../../types";

type TargetModel = "gemini" | "dall-e" | "midjourney" | "flux";

const TARGET_MODELS: { id: TargetModel; label: string }[] = [
  { id: "gemini", label: "Gemini" },
  { id: "dall-e", label: "DALL·E" },
  { id: "midjourney", label: "Midjourney" },
  { id: "flux", label: "Flux" },
];

interface SlidePromptGeneratorProps {
  slideRole: string;
  slideVisualDirection: string;
  onClose: () => void;
}

export default function SlidePromptGenerator({ slideRole, slideVisualDirection, onClose }: SlidePromptGeneratorProps) {
  const [standards, setStandards] = useState<SceneStandard[]>([]);
  const [loadingStandards, setLoadingStandards] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [targetModel, setTargetModel] = useState<TargetModel>("gemini");
  const [productBase64, setProductBase64] = useState<string | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ComposedPromptResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.listVisualStandards()
      .then((data) => setStandards(data.filter((s: SceneStandard) => s.isActive)))
      .catch(() => setError("Sahne standartları yüklenemedi. Stil Stüdyosu'nda aktif standart olduğundan emin ol."))
      .finally(() => setLoadingStandards(false));
  }, []);

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const MAX = 1536;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setProductBase64(dataUrl.split(",")[1]);
      setProductPreview(dataUrl);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleGenerate = async () => {
    if (!selectedId) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.generateStudioPrompt({
        standardId: selectedId,
        targetModel,
        productBase64: productBase64 || undefined,
        productMimeType: productBase64 ? "image/jpeg" : undefined,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Prompt üretilemedi. Lütfen tekrar dene.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedStandard = standards.find((s) => s.id === selectedId);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Stil Stüdyosu'ndan Prompt Üret</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Slide {slideRole} — sahne standardını seç, görsel prompt oluştur
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Slide visual direction özeti */}
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wide mb-1">Slide Görsel Yönlendirme</p>
            <p className="text-xs text-violet-700 leading-relaxed line-clamp-3">{slideVisualDirection}</p>
          </div>

          {/* Sahne standardı seçimi */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Sahne Standardı</p>
            {loadingStandards ? (
              <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sahne standartları yükleniyor...
              </div>
            ) : standards.length === 0 ? (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
                Aktif sahne standardı bulunamadı. Stil Stüdyosu'nda en az bir standart oluştur.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {standards.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      selectedId === s.id
                        ? "border-amber-400 bg-amber-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {s.isDefault && (
                        <span className="text-[9px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Varsayılan</span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-800">{s.name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{s.description}</p>
                    {/* Renk paleti */}
                    {s.colorPalette?.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {s.colorPalette.slice(0, 5).map((hex, i) => (
                          <div
                            key={i}
                            className="w-3 h-3 rounded-full border border-white shadow-sm"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ürün görseli — opsiyonel */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700">Ürün Görseli <span className="text-gray-400 font-normal">(opsiyonel)</span></p>
              {productPreview && (
                <button
                  onClick={() => { setProductBase64(null); setProductPreview(null); }}
                  className="text-[10px] text-red-500 hover:text-red-700"
                >
                  Kaldır
                </button>
              )}
            </div>
            {productPreview ? (
              <img src={productPreview} alt="Ürün" className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
            ) : (
              <label className="flex items-center gap-2 border border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs text-gray-400">Ürün fotoğrafı ekle — daha spesifik prompt için</span>
                <input type="file" accept="image/*" onChange={handleProductUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Hedef model */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Hedef Model</p>
            <div className="flex gap-2">
              {TARGET_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setTargetModel(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    targetModel === m.id
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hata */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700">{error}</div>
          )}

          {/* Üret butonu */}
          <button
            onClick={handleGenerate}
            disabled={!selectedId || generating}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {generating ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Prompt üretiliyor...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {selectedId ? `"${selectedStandard?.name}" ile Prompt Üret` : "Sahne Seç"}
              </>
            )}
          </button>

          {/* Sonuç */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">
                  Üretilen Prompt <span className="text-gray-400 font-normal">— {result.targetModel}</span>
                </p>
                <button
                  onClick={handleCopy}
                  className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                    copied
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {copied ? "Kopyalandı!" : "Kopyala"}
                </button>
              </div>
              <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                {result.finalPrompt}
              </pre>
              <p className="text-[10px] text-gray-400">
                Sahne: <span className="font-medium">{result.sceneName}</span>
                {result.productName && <> · Ürün: <span className="font-medium">{result.productName}</span></>}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

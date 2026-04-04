import { useState } from "react";
import { api } from "../../services/api";
import type { ProductAnalysisResult, ComposedPromptResult } from "../../types";

interface PromptComposerProps {
  standardId: string;
  standardName: string;
  productAnalysis: ProductAnalysisResult;
  productImage: string;
  sceneImage: string;
  onClose: () => void;
}

const TARGET_MODELS = [
  { id: "gemini", label: "Gemini" },
  { id: "dall-e", label: "DALL-E / GPT" },
  { id: "midjourney", label: "Midjourney" },
  { id: "flux", label: "Flux" },
];

export default function PromptComposer({
  standardId,
  standardName,
  productAnalysis,
  productImage,
  sceneImage,
  onClose,
}: PromptComposerProps) {
  const [productName, setProductName] = useState(productAnalysis.name);
  const [targetModel, setTargetModel] = useState("gemini");
  const [composing, setComposing] = useState(false);
  const [result, setResult] = useState<ComposedPromptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCompose = async () => {
    setComposing(true);
    setError(null);
    setResult(null);

    try {
      const data = await api.generateStudioPrompt({
        standardId,
        productAnalysis,
        targetModel,
        productName: productName.trim(),
      });
      setResult(data as ComposedPromptResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prompt birleştirilemedi.");
    } finally {
      setComposing(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.finalPrompt) return;
    await navigator.clipboard.writeText(result.finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Prompt Birleştir</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {standardName} · {productAnalysis.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label="Kapat"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Referans görseller */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide block mb-1">
                Sahne
              </span>
              <img
                src={sceneImage}
                alt="Sahne referansı"
                className="h-24 w-full object-cover rounded-lg border border-gray-200"
              />
            </div>
            <div className="flex-shrink-0 self-end pb-2">
              <span className="text-xl text-gray-400">+</span>
            </div>
            <div className="flex-1">
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide block mb-1">
                Ürün
              </span>
              <img
                src={productImage}
                alt="Ürün referansı"
                className="h-24 w-full object-cover rounded-lg border border-gray-200"
              />
            </div>
          </div>

          {/* Ürün adı */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ürün Adı
            </label>
            <input
              type="text"
              className="input"
              placeholder="örn. Frambuazlı Tart"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>

          {/* Hedef model seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hedef Model
            </label>
            <div className="flex gap-2">
              {TARGET_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setTargetModel(model.id)}
                  className={`flex-1 py-2 px-3 rounded-xl border-2 text-xs font-semibold transition-colors ${
                    targetModel === model.id
                      ? "border-brand-blue bg-brand-blue/10 text-gray-900"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {model.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hata mesajı */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Üretilen prompt */}
          {result && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Final Prompt · {result.targetModel}
                </span>
                <button
                  onClick={handleCopy}
                  className="text-xs font-medium text-brand-blue hover:text-brand-blue/80 transition-colors"
                >
                  {copied ? "Kopyalandı!" : "Kopyala"}
                </button>
              </div>
              <pre className="bg-gray-900 rounded-xl px-4 py-3 text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                {result.finalPrompt}
              </pre>
            </div>
          )}

          {/* Prompt Oluştur butonu */}
          <button
            onClick={handleCompose}
            disabled={composing || !productName.trim()}
            className="btn-primary w-full disabled:opacity-50"
          >
            {composing ? "Birleştiriliyor..." : "Prompt Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}

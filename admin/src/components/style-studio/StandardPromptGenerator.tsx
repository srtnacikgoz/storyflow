import { useState } from "react";
import { api } from "../../services/api";

interface StandardPromptGeneratorProps {
  standardId: string;
  standardName: string;
  onClose: () => void;
}

const TARGET_MODELS = [
  { id: "gemini", label: "Gemini", desc: "Narrative paragraph" },
  { id: "dall-e", label: "DALL-E / GPT", desc: "Structured description" },
  { id: "midjourney", label: "Midjourney", desc: "Tag-based" },
  { id: "flux", label: "Flux", desc: "Natural language" },
];

export default function StandardPromptGenerator({
  standardId,
  standardName,
  onClose,
}: StandardPromptGeneratorProps) {
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [targetModel, setTargetModel] = useState("gemini");
  const [loading, setLoading] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!productName.trim()) return;

    setLoading(true);
    setError(null);
    setGeneratedPrompt(null);

    try {
      const result = await api.generateStandardPrompt({
        standardId,
        productName: productName.trim(),
        productDescription: productDescription.trim() || undefined,
        targetModel,
      });
      setGeneratedPrompt(result.prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prompt üretilemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedPrompt) return;
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Prompt Uret</h2>
            <p className="text-sm text-gray-500 mt-0.5">{standardName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Kapat"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Urun adi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Urun Adi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="orn. Frambuazli Tart"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>

          {/* Urun aciklamasi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Urun Aciklamasi <span className="text-gray-400 font-normal">(opsiyonel)</span>
            </label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="orn. Taze frambuaz ile suslenmis klasik Fransiz tart"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
            />
          </div>

          {/* Hedef model secimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hedef Model
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TARGET_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setTargetModel(model.id)}
                  className={`flex flex-col items-center p-2 rounded-xl border-2 text-center transition-colors ${
                    targetModel === model.id
                      ? "border-brand-blue bg-brand-blue/10 text-gray-900"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xs font-semibold">{model.label}</span>
                  <span className="text-[10px] mt-0.5 leading-tight opacity-70">{model.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Hata mesaji */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Uretilen prompt */}
          {generatedPrompt && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Uretilen Prompt
                </span>
                <button
                  onClick={handleCopy}
                  className="text-xs font-medium text-brand-blue hover:text-brand-blue/80 transition-colors"
                >
                  {copied ? "Kopyalandi!" : "Kopyala"}
                </button>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                {generatedPrompt}
              </p>
            </div>
          )}

          {/* Uret butonu */}
          <button
            onClick={handleGenerate}
            disabled={loading || !productName.trim()}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Uretiliyor..." : "Prompt Uret"}
          </button>
        </div>
      </div>
    </div>
  );
}

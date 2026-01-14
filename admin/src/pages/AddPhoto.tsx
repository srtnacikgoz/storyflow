import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import ImageUpload from "../components/ImageUpload";
import type { ProductCategory, AIModel, StyleVariant } from "../types";

// Kategori seçenekleri
const categories: { value: ProductCategory; label: string }[] = [
  { value: "chocolate", label: "Çikolata" },
  { value: "viennoiserie", label: "Viennoiserie" },
  { value: "coffee", label: "Kahve" },
  { value: "small-desserts", label: "Küçük Tatlılar" },
  { value: "slice-cakes", label: "Dilim Pastalar" },
  { value: "big-cakes", label: "Büyük Pastalar" },
  { value: "profiterole", label: "Profiterol" },
  { value: "special-orders", label: "Özel Siparişler" },
];

// Stil seçenekleri
const styleOptions: { value: StyleVariant; label: string; desc: string }[] = [
  { value: "pure-minimal", label: "Pure Minimal", desc: "Maksimum negatif alan" },
  { value: "lifestyle-moments", label: "Lifestyle", desc: "Sıcak, insan dokunuşu" },
  { value: "rustic-warmth", label: "Rustic", desc: "Ahşap, doğal dokular" },
  { value: "french-elegance", label: "French", desc: "Şık, zarif sunum" },
];

export default function AddPhoto() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [imageUrl, setImageUrl] = useState("");
  const [productCategory, setProductCategory] = useState<ProductCategory>("chocolate");
  const [productName, setProductName] = useState("");
  const [caption, setCaption] = useState("");

  // AI Enhancement state
  const [aiModel, setAiModel] = useState<AIModel>("gemini-flash");
  const [styleVariant, setStyleVariant] = useState<StyleVariant>("lifestyle-moments");
  const [faithfulness, setFaithfulness] = useState(0.7);

  const handleUploadComplete = (url: string) => {
    setImageUrl(url);
    setError(null);
  };

  const handleUploadError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageUrl) {
      setError("Lütfen bir fotoğraf yükleyin");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.addToQueue({
        originalUrl: imageUrl,
        productCategory,
        productName: productName || undefined,
        caption: caption || undefined,
        aiModel,
        styleVariant,
        faithfulness,
      });
      setSuccess(true);

      // 2 saniye sonra kuyruğa yönlendir
      setTimeout(() => {
        navigate("/queue");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ekleme başarısız");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Fotoğraf Eklendi!</h2>
        <p className="text-gray-500 mt-2">Kuyruğa yönlendiriliyorsunuz...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fotoğraf Ekle</h1>
        <p className="text-gray-500 mt-1">Kuyruğa yeni fotoğraf ekleyin</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fotoğraf <span className="text-red-500">*</span>
          </label>
          <ImageUpload
            onUploadComplete={handleUploadComplete}
            onError={handleUploadError}
          />
          {imageUrl && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Fotoğraf yüklendi
            </p>
          )}
        </div>

        {/* Kategori */}
        <div>
          <label htmlFor="productCategory" className="block text-sm font-medium text-gray-700 mb-2">
            Kategori <span className="text-red-500">*</span>
          </label>
          <select
            id="productCategory"
            value={productCategory}
            onChange={(e) => setProductCategory(e.target.value as ProductCategory)}
            className="input"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Ürün Adı */}
        <div>
          <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-2">
            Ürün Adı
          </label>
          <input
            type="text"
            id="productName"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Bitter Çikolata"
            className="input"
          />
        </div>

        {/* Caption */}
        <div>
          <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-2">
            Caption
          </label>
          <textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Story için açıklama..."
            rows={3}
            className="input resize-none"
          />
        </div>

        {/* AI Enhancement Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-500">AI Görsel İyileştirme</span>
          </div>
        </div>

        {/* AI Model Seçimi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            AI Model
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setAiModel("gemini-flash")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                aiModel === "gemini-flash"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900">Gemini Flash</div>
              <div className="text-sm text-gray-500">Hızlı • $0.01</div>
              <div className="text-xs text-gray-400 mt-1">Test/günlük için</div>
            </button>

            <button
              type="button"
              onClick={() => setAiModel("gemini-pro")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                aiModel === "gemini-pro"
                  ? "border-amber-500 bg-amber-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900">Gemini Pro</div>
              <div className="text-sm text-gray-500">Kalite • $0.04</div>
              <div className="text-xs text-gray-400 mt-1">Final paylaşımlar</div>
            </button>

            <button
              type="button"
              onClick={() => setAiModel("none")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                aiModel === "none"
                  ? "border-gray-500 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900">AI Kapalı</div>
              <div className="text-sm text-gray-500">Orijinal</div>
              <div className="text-xs text-gray-400 mt-1">İşleme yok</div>
            </button>
          </div>
        </div>

        {/* Stil Seçimi - Sadece AI açıksa göster */}
        {aiModel !== "none" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Görsel Stili
              </label>
              <div className="grid grid-cols-2 gap-3">
                {styleOptions.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => setStyleVariant(style.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      styleVariant === style.value
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900">{style.label}</div>
                    <div className="text-xs text-gray-500">{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Faithfulness Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Orijinale Sadakat: <span className="text-blue-600">{Math.round(faithfulness * 100)}%</span>
              </label>
              <input
                type="range"
                min="0.3"
                max="0.9"
                step="0.1"
                value={faithfulness}
                onChange={(e) => setFaithfulness(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Yaratıcı</span>
                <span>Orijinale Sadık</span>
              </div>
            </div>
          </>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !imageUrl}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {loading ? "Ekleniyor..." : "Kuyruğa Ekle"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/queue")}
            className="btn-secondary"
          >
            İptal
          </button>
        </div>
      </form>
    </div>
  );
}

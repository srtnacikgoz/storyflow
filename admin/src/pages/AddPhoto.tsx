import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import ImageUpload from "../components/ImageUpload";
import type { ProductCategory } from "../types";

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

import { useState } from "react";
import { api } from "../../services/api";
import type { ProductAnalysisResult } from "../../types";

interface ProductAnalyzerProps {
  onAnalysisComplete: (result: ProductAnalysisResult, imagePreview: string) => void;
}

/**
 * Ürün görseli yükleme ve analiz bileşeni
 */
export default function ProductAnalyzer({ onAnalysisComplete }: ProductAnalyzerProps) {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setImageMimeType("image/jpeg");

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
      setImageBase64(dataUrl.split(",")[1]);
      setImagePreview(dataUrl);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleReset = () => {
    setImageBase64(null);
    setImagePreview(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!imageBase64 || !imagePreview) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await api.analyzeProduct(imageBase64, imageMimeType);
      onAnalysisComplete(result, imagePreview);
    } catch (err: any) {
      setError(err.message || "Analiz başarısız. Lütfen tekrar deneyin.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Adım başlığı */}
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
        <span className="text-sm font-semibold text-gray-700">Ürün Görseli</span>
      </div>

      {/* Görsel yükleme alanı */}
      {!imagePreview ? (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-orange-400/60 hover:bg-orange-50/50 transition-all group">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
              {/* Pasta/cupcake SVG ikonu */}
              <svg className="w-6 h-6 text-gray-400 group-hover:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15a2 2 0 01-2 2H5a2 2 0 01-2-2v-1h18v1z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 14V9a2 2 0 012-2h14a2 2 0 012 2v5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V5c0-1.1.9-2 2-2h4a2 2 0 012 2v2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2M9.5 5.5c0 0 .5-1 1.5-.5M13 5c1-.5 1.5.5 1.5.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 group-hover:text-orange-600 transition-colors">
              Ürün fotoğrafı yükle
            </p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP — tıkla veya sürükle</p>
          </div>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
      ) : (
        <div className="flex items-start gap-4">
          {/* Görsel önizleme */}
          <div className="relative flex-shrink-0">
            <img
              src={imagePreview}
              alt="Ürün görseli"
              className="w-24 h-24 object-cover rounded-xl border border-gray-200"
            />
            {/* Sıfırlama butonu */}
            <button
              onClick={handleReset}
              className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 hover:border-red-200 transition-colors"
              title="Görseli değiştir"
            >
              <svg className="w-3 h-3 text-gray-500 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Analiz butonu */}
          <div className="flex-1 flex flex-col justify-center gap-2">
            <p className="text-xs text-gray-500">Görsel hazır. Ürünü analiz etmek için butona tıkla.</p>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
            >
              {analyzing ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ürün analiz ediliyor...
                </>
              ) : (
                "Ürünü Analiz Et"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Hata mesajı */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import BeforeAfterSlider from "../components/BeforeAfterSlider";
import type { EnhancementPreset, EnhancementStyle, EnhancementJob, EnhancementMode, PhotoAnalysis, UpscaleOption, UpscaleResult } from "../types";

// Işık kalitesi badge renkleri
const LIGHTING_COLORS: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  poor: "bg-red-100 text-red-800",
};

export default function Enhance() {
  // State
  const [presets, setPresets] = useState<EnhancementPreset[]>([]);
  const [styles, setStyles] = useState<EnhancementStyle[]>([]);
  const [jobs, setJobs] = useState<EnhancementJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentJob, setCurrentJob] = useState<EnhancementJob | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [enhanceMode, setEnhanceMode] = useState<EnhancementMode>("full");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seedingPresets, setSeedingPresets] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [upscaleOptions, setUpscaleOptions] = useState<UpscaleOption[]>([]);
  const [upscaling, setUpscaling] = useState(false);
  const [upscaleResult, setUpscaleResult] = useState<UpscaleResult | null>(null);

  // İlk yükleme
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [presetsData, stylesData, jobsData, upscaleData] = await Promise.all([
        api.getEnhancementPresets(),
        api.getEnhancementStyles(),
        api.getEnhancementJobs(20),
        api.getUpscaleOptions().catch(() => []),
      ]);
      setPresets(presetsData);
      setStyles(stylesData);
      setJobs(jobsData);
      setUpscaleOptions(upscaleData);
    } catch (err) {
      setError("Veri yüklenirken hata oluştu");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Preset seed
  const handleSeedPresets = async () => {
    setSeedingPresets(true);
    try {
      const [presetResult, styleResult] = await Promise.all([
        api.seedEnhancementPresets(),
        api.seedEnhancementStyles(),
      ]);
      alert(`Preset: ${presetResult.added} eklendi. Stil: ${styleResult.added} eklendi.`);
      await loadData();
    } catch (err) {
      alert("Seed hatası: " + (err instanceof Error ? err.message : "Bilinmeyen hata"));
    } finally {
      setSeedingPresets(false);
    }
  };

  // Fotoğraf yükleme
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Boyut kontrolü (8MB)
    if (file.size > 8 * 1024 * 1024) {
      setError("Dosya 8MB'dan büyük olamaz");
      return;
    }

    // Tip kontrolü
    if (!file.type.startsWith("image/")) {
      setError("Sadece görsel dosyaları yüklenebilir");
      return;
    }

    setUploading(true);
    setError(null);
    setAnalysis(null);
    setSelectedPreset(null);

    try {
      // Önizleme oluştur
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);

      // Firebase Storage'a yükle
      const storage = getStorage();
      const storagePath = `enhancement-originals/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // Job oluştur
      const job = await api.createEnhancementJob({
        originalImageUrl: downloadUrl,
        originalStoragePath: storagePath,
      });
      setCurrentJob(job);
    } catch (err) {
      setError("Yükleme hatası: " + (err instanceof Error ? err.message : "Bilinmeyen hata"));
    } finally {
      setUploading(false);
    }
  }, []);

  // AI Analiz
  const handleAnalyze = async () => {
    if (!currentJob || !previewUrl) return;

    setAnalyzing(true);
    setError(null);

    try {
      // Görseli base64'e çevir
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // data:image/...;base64, kısmını kaldır
        };
        reader.readAsDataURL(blob);
      });

      const result = await api.analyzePhoto(currentJob.id, base64, blob.type);
      setAnalysis(result);

      // Önerilen preset'i otomatik seç
      if (result.suggestedPreset) {
        setSelectedPreset(result.suggestedPreset);
      }
    } catch (err) {
      setError("Analiz hatası: " + (err instanceof Error ? err.message : "Bilinmeyen hata"));
    } finally {
      setAnalyzing(false);
    }
  };

  // Drop zone
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      // Sentetik input event oluştur
      const input = document.createElement("input");
      input.type = "file";
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      handleFileSelect({ target: input } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  }, [handleFileSelect]);

  // İyileştir
  const handleEnhance = async () => {
    if (!currentJob) return;
    if (enhanceMode === "full" && !selectedPreset) return;

    setEnhancing(true);
    setError(null);
    setEnhancedUrl(null);

    try {
      const result = await api.enhancePhoto({
        jobId: currentJob.id,
        presetId: selectedPreset || undefined,
        styleId: selectedStyle || undefined,
        mode: enhanceMode,
      });
      setEnhancedUrl(result.enhancedImageUrl);
      // Job listesini güncelle
      await loadData();
    } catch (err) {
      setError("İyileştirme hatası: " + (err instanceof Error ? err.message : "Bilinmeyen hata"));
    } finally {
      setEnhancing(false);
    }
  };

  // Yeni fotoğraf
  const handleReset = () => {
    setCurrentJob(null);
    setPreviewUrl(null);
    setAnalysis(null);
    setSelectedPreset(null);
    setSelectedStyle(null);
    setEnhanceMode("full");
    setEnhancedUrl(null);
    setUpscaleResult(null);
    setError(null);
  };

  // Upscale
  const handleUpscale = async (optionId: string) => {
    if (!currentJob && !enhancedUrl) return;

    setUpscaling(true);
    setUpscaleResult(null);
    setError(null);

    try {
      const result = await api.upscaleImage({
        jobId: currentJob?.id,
        imageUrl: !currentJob ? enhancedUrl || undefined : undefined,
        optionId,
      });
      setUpscaleResult(result);
    } catch (err) {
      setError("Upscale hatası: " + (err instanceof Error ? err.message : "Bilinmeyen hata"));
    } finally {
      setUpscaling(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fotoğraf İyileştir</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerçek ürün fotoğrafını yükle, AI ile analiz et, preset seç
          </p>
        </div>
        {(presets.length === 0 || styles.length === 0) && (
          <button
            onClick={handleSeedPresets}
            disabled={seedingPresets}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 text-sm"
          >
            {seedingPresets ? "Yükleniyor..." : "Varsayılan Preset'leri Yükle"}
          </button>
        )}
      </div>

      {/* Hata */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Kapat</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SOL PANEL: Fotoğraf Yükleme + Analiz */}
        <div className="space-y-4">
          {/* Yükleme alanı */}
          {!previewUrl ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-amber-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById("enhance-file-input")?.click()}
            >
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-600 font-medium">Fotoğraf sürükle veya tıkla</p>
              <p className="text-gray-400 text-sm mt-1">JPEG, PNG — Maks 8MB</p>
              <input
                id="enhance-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="relative">
              {/* Önizleme */}
              <img
                src={previewUrl}
                alt="Yüklenen fotoğraf"
                className="w-full rounded-xl shadow-sm object-contain max-h-96 bg-gray-100"
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
                    <p className="text-sm">Yükleniyor...</p>
                  </div>
                </div>
              )}
              {/* Aksiyonlar */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAnalyze}
                  disabled={!currentJob || analyzing || uploading}
                  className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium text-sm"
                >
                  {analyzing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Analiz ediliyor...
                    </span>
                  ) : "AI ile Analiz Et"}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Yeni Fotoğraf
                </button>
              </div>
            </div>
          )}

          {/* Analiz Sonucu */}
          {analysis && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Analiz Sonucu
              </h3>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Ürün Tipi:</span>
                  <p className="font-medium text-gray-900 capitalize">{analysis.productType}</p>
                </div>
                <div>
                  <span className="text-gray-500">Yüzey:</span>
                  <p className="font-medium text-gray-900">{analysis.surfaceProperties}</p>
                </div>
                <div>
                  <span className="text-gray-500">Işık Kalitesi:</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${LIGHTING_COLORS[analysis.currentLighting] || "bg-gray-100 text-gray-700"}`}>
                    {analysis.currentLighting}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Mevcut Arka Plan:</span>
                  <p className="font-medium text-gray-900">{analysis.currentBackground}</p>
                </div>
              </div>

              {/* Kompozisyon skoru */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Kompozisyon Skoru</span>
                  <span className="font-bold text-gray-900">{analysis.compositionScore}/10</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      analysis.compositionScore >= 7 ? "bg-emerald-500" :
                      analysis.compositionScore >= 4 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${analysis.compositionScore * 10}%` }}
                  />
                </div>
              </div>

              {analysis.notes && (
                <p className="text-xs text-gray-500 italic border-t pt-2">{analysis.notes}</p>
              )}
            </div>
          )}
        </div>

        {/* SAĞ PANEL: Preset Seçimi */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">
            Arka Plan Preset'leri
            <span className="text-sm font-normal text-gray-400 ml-2">({presets.length})</span>
          </h3>

          {presets.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-500 text-sm">Henüz preset yok.</p>
              <button
                onClick={handleSeedPresets}
                disabled={seedingPresets}
                className="mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50"
              >
                Varsayılanları Yükle
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {presets.filter(p => p.isActive).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedPreset === preset.id
                      ? "border-amber-500 bg-amber-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  } ${analysis?.suggestedPreset === preset.id && selectedPreset !== preset.id ? "ring-2 ring-amber-200" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{preset.displayName}</span>
                    <div className="flex items-center gap-2">
                      {analysis?.suggestedPreset === preset.id && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          Önerilen
                        </span>
                      )}
                      {selectedPreset === preset.id && (
                        <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  {preset.description && (
                    <p className="text-sm text-gray-500 mt-1">{preset.description}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {preset.shadowType}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {preset.colorTemperature}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {preset.lightingDirection}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* İyileştir butonu */}
          <button
            onClick={handleEnhance}
            disabled={!currentJob || enhancing || !analysis || (enhanceMode === "full" && !selectedPreset)}
            className={`w-full py-3 rounded-xl font-medium transition-all ${
              !currentJob || !analysis || (enhanceMode === "full" && !selectedPreset)
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : enhancing
                  ? "bg-amber-400 text-white cursor-wait"
                  : "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
            }`}
          >
            {enhancing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                İyileştiriliyor...
              </span>
            ) : !analysis ? "Önce Analiz Et" : (enhanceMode === "full" && !selectedPreset) ? "Preset Seç" : "İyileştir"}
          </button>

          {/* Stil Seçimi (Faz 3) */}
          {styles.filter(s => s.isActive).length > 0 && (
            <div className="mt-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Enhancement Stili (opsiyonel)</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedStyle(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    !selectedStyle
                      ? "bg-gray-800 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Yok
                </button>
                {styles.filter(s => s.isActive).map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedStyle === style.id
                        ? "bg-amber-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title={style.description}
                  >
                    {style.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mod Seçimi */}
          {analysis && (
            <div className="mt-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">İyileştirme Modu</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setEnhanceMode("full")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    enhanceMode === "full"
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Tam (Arka Plan + Stil)
                </button>
                <button
                  onClick={() => setEnhanceMode("enhance-only")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    enhanceMode === "enhance-only"
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Sadece İyileştir
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {enhanceMode === "full"
                  ? "Arka plan değiştirilir + stil uygulanır"
                  : "Arka plan korunur, sadece ışık/renk/detay iyileştirilir"}
              </p>
            </div>
          )}

          {/* Before/After karşılaştırma (Faz 3) */}
          {enhancedUrl && previewUrl && (
            <div className="mt-4 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Sonuç — Karşılaştır
              </h3>
              <BeforeAfterSlider
                beforeUrl={previewUrl}
                afterUrl={enhancedUrl}
              />
              {/* Upscale seçenekleri */}
              {upscaleOptions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">İndir — Boyut Seç</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {upscaleOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleUpscale(opt.id)}
                        disabled={upscaling}
                        className="text-left p-2.5 rounded-lg border border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all disabled:opacity-50 text-xs"
                      >
                        <span className="font-medium text-gray-800 block">{opt.displayName}</span>
                        <span className="text-gray-400">{opt.width}x{opt.height || "auto"} · {opt.format.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                  {upscaling && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-amber-600">
                      <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-500" />
                      Boyutlandırılıyor...
                    </div>
                  )}
                </div>
              )}

              {/* Upscale sonucu */}
              {upscaleResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-emerald-800">
                      {upscaleResult.width}x{upscaleResult.height} · {(upscaleResult.sizeBytes / 1024).toFixed(0)}KB
                    </span>
                  </div>
                  <a
                    href={upscaleResult.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm font-medium"
                  >
                    İndir
                  </a>
                </div>
              )}

              <button
                onClick={handleReset}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                Yeni Fotoğraf
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Son İşler */}
      {jobs.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold text-gray-900 mb-3">Son İşler</h3>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Tarih</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Durum</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Ürün Tipi</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Skor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.slice(0, 10).map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(job.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        job.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                        job.status === "failed" ? "bg-red-100 text-red-700" :
                        job.status === "analyzing" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600 capitalize">
                      {job.analysis?.productType || "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {job.analysis?.compositionScore ? `${job.analysis.compositionScore}/10` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

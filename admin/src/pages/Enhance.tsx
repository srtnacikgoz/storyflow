import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";
import BeforeAfterSlider from "../components/BeforeAfterSlider";
import EnhancementGallery from "../components/EnhancementGallery";
import type { EnhancementPreset, EnhancementStyle, EnhancementJob, EnhancementMode, PhotoAnalysis, UpscaleOption, UpscaleResult } from "../types";

// Işık kalitesi badge renkleri
const LIGHTING_COLORS: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  poor: "bg-red-100 text-red-800",
};

type WizardStep = 1 | 2 | 3;

const STEP_LABELS: Record<WizardStep, string> = {
  1: "Fotoğraf Yükle",
  2: "Ayarları Seç",
  3: "Sonuç",
};

export default function Enhance() {
  // Wizard state
  const [step, setStep] = useState<WizardStep>(1);

  // Data state
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

    if (file.size > 8 * 1024 * 1024) {
      setError("Dosya 8MB'dan büyük olamaz");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Sadece görsel dosyaları yüklenebilir");
      return;
    }

    setUploading(true);
    setError(null);
    setAnalysis(null);
    setSelectedPreset(null);

    try {
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);

      const storagePath = `enhancement-originals/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

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
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(blob);
      });

      const result = await api.analyzePhoto(currentJob.id, base64, blob.type);
      setAnalysis(result);

      if (result.suggestedPreset) {
        setSelectedPreset(result.suggestedPreset);
      }

      // Analiz tamamlandı, otomatik adım 2'ye geç
      setStep(2);
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
      await loadData();
      // Sonuç geldi, adım 3'e geç
      setStep(3);
    } catch (err) {
      setError("İyileştirme hatası: " + (err instanceof Error ? err.message : "Bilinmeyen hata"));
    } finally {
      setEnhancing(false);
    }
  };

  // Yeni fotoğraf — baştan başla
  const handleReset = () => {
    setStep(1);
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

  // Preset'e referans görsel yükle
  const handlePresetRefUpload = async (presetId: string, file: File) => {
    try {
      const storagePath = `enhancement-references/${presetId}_${Date.now()}.${file.name.split(".").pop()}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      await api.updateEnhancementPreset(presetId, {
        referenceImageUrl: downloadUrl,
        referenceStoragePath: storagePath,
      });

      // Preset listesini güncelle
      setPresets(prev => prev.map(p =>
        p.id === presetId ? { ...p, referenceImageUrl: downloadUrl, referenceStoragePath: storagePath } : p
      ));
    } catch (err) {
      setError("Referans görsel yüklenemedi: " + (err instanceof Error ? err.message : "Bilinmeyen hata"));
    }
  };

  const activePresets = presets.filter(p => p.isActive);
  const activeStyles = styles.filter(s => s.isActive);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fotoğraf İyileştir</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ürün fotoğrafını yükle, ayarları seç, AI ile iyileştir
          </p>
        </div>
        {(presets.length === 0 || styles.length === 0) && (
          <button
            onClick={handleSeedPresets}
            disabled={seedingPresets}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 text-sm"
          >
            {seedingPresets ? "Yükleniyor..." : "Preset'leri Yükle"}
          </button>
        )}
      </div>

      {/* Adım göstergesi */}
      <div className="flex items-center gap-0">
        {([1, 2, 3] as WizardStep[]).map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            {/* Adım dairesi + label */}
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                  step === s
                    ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                    : step > s
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-200 text-gray-400"
                }`}
              >
                {step > s ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : s}
              </div>
              <span className={`text-sm font-medium whitespace-nowrap ${
                step === s ? "text-amber-700" : step > s ? "text-emerald-600" : "text-gray-400"
              }`}>
                {STEP_LABELS[s]}
              </span>
            </div>
            {/* Bağlantı çizgisi */}
            {i < 2 && (
              <div className={`flex-1 h-0.5 mx-3 rounded ${
                step > s ? "bg-emerald-300" : "bg-gray-200"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Hata */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Kapat</button>
        </div>
      )}

      {/* ============================================ */}
      {/* ADIM 1: Fotoğraf Yükle + Analiz              */}
      {/* ============================================ */}
      {step === 1 && (
        <div className="space-y-4">
          {!previewUrl ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-16 text-center hover:border-amber-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById("enhance-file-input")?.click()}
            >
              <svg className="w-14 h-14 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-600 font-medium text-lg">Fotoğraf sürükle veya tıkla</p>
              <p className="text-gray-400 text-sm mt-2">JPEG, PNG — Maks 8MB</p>
              <input
                id="enhance-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Önizleme */}
              <div className="relative rounded-xl overflow-hidden bg-gray-100">
                <img
                  src={previewUrl}
                  alt="Yüklenen fotoğraf"
                  className="w-full object-contain max-h-[420px]"
                />
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
                      <p className="text-sm">Yükleniyor...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Analiz sonucu (varsa) */}
              {analysis && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                  <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    AI Analiz Tamamlandı
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
                      <span className="text-gray-500">Işık:</span>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${LIGHTING_COLORS[analysis.currentLighting] || "bg-gray-100 text-gray-700"}`}>
                        {analysis.currentLighting}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Arka Plan:</span>
                      <p className="font-medium text-gray-900">{analysis.currentBackground}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-500">Kompozisyon</span>
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

              {/* Aksiyonlar */}
              <div className="flex gap-3">
                {!analysis ? (
                  <button
                    onClick={handleAnalyze}
                    disabled={!currentJob || analyzing || uploading}
                    className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 font-medium text-sm transition-all"
                  >
                    {analyzing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Analiz ediliyor...
                      </span>
                    ) : "AI ile Analiz Et"}
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-medium text-sm transition-all"
                  >
                    Devam Et — Ayarları Seç
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm transition-all"
                >
                  Değiştir
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* ADIM 2: Mod + Preset + Stil Seçimi            */}
      {/* ============================================ */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Küçük önizleme */}
          {previewUrl && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <img src={previewUrl} alt="Yüklenen" className="w-16 h-16 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {analysis?.productType ? `${analysis.productType}` : "Yüklenen fotoğraf"}
                </p>
                {analysis && (
                  <p className="text-xs text-gray-500">
                    Işık: {analysis.currentLighting} · Skor: {analysis.compositionScore}/10
                  </p>
                )}
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium shrink-0"
              >
                Geri
              </button>
            </div>
          )}

          {/* Mod seçimi */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">İyileştirme Modu</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setEnhanceMode("full")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  enhanceMode === "full"
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span className={`text-sm font-medium ${enhanceMode === "full" ? "text-amber-800" : "text-gray-900"}`}>
                  Tam İyileştirme
                </span>
                <p className="text-xs text-gray-500 mt-1">Arka plan değiştirilir + stil uygulanır</p>
              </button>
              <button
                onClick={() => setEnhanceMode("enhance-only")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  enhanceMode === "enhance-only"
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span className={`text-sm font-medium ${enhanceMode === "enhance-only" ? "text-amber-800" : "text-gray-900"}`}>
                  Sadece İyileştir
                </span>
                <p className="text-xs text-gray-500 mt-1">Arka plan korunur, ışık/renk düzeltilir</p>
              </button>
            </div>
          </div>

          {/* Preset seçimi — sadece "full" modda */}
          {enhanceMode === "full" && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Arka Plan Preset'i
                {analysis?.suggestedPreset && (
                  <span className="text-xs font-normal text-amber-600 ml-2">AI önerisi işaretli</span>
                )}
              </h3>
              {activePresets.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
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
                <div className="grid grid-cols-2 gap-2">
                  {activePresets.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedPreset(preset.id)}
                      className={`text-left rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                        selectedPreset === preset.id
                          ? "border-amber-500 bg-amber-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      } ${analysis?.suggestedPreset === preset.id && selectedPreset !== preset.id ? "ring-2 ring-amber-200" : ""}`}
                    >
                      {/* Referans görsel thumbnail */}
                      {preset.referenceImageUrl ? (
                        <div className="relative h-24 bg-gray-100">
                          <img
                            src={preset.referenceImageUrl}
                            alt={preset.displayName}
                            className="w-full h-full object-cover"
                          />
                          {/* Görsel değiştir butonu */}
                          <label
                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                            </svg>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePresetRefUpload(preset.id, file);
                              }}
                            />
                          </label>
                        </div>
                      ) : (
                        <label
                          className="block h-24 bg-gray-50 border-b border-dashed border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer flex items-center justify-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-center">
                            <svg className="w-5 h-5 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[10px] text-gray-400 mt-0.5 block">Referans ekle</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePresetRefUpload(preset.id, file);
                            }}
                          />
                        </label>
                      )}

                      {/* Preset bilgileri */}
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-gray-900">{preset.displayName}</span>
                          {analysis?.suggestedPreset === preset.id && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                              Önerilen
                            </span>
                          )}
                        </div>
                        {preset.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{preset.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stil seçimi (opsiyonel) */}
          {activeStyles.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Stil <span className="text-xs font-normal text-gray-400">(opsiyonel)</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedStyle(null)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    !selectedStyle
                      ? "bg-gray-800 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Yok
                </button>
                {activeStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
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

          {/* Aksiyonlar */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm transition-all"
            >
              Geri
            </button>
            <button
              onClick={handleEnhance}
              disabled={enhancing || (enhanceMode === "full" && !selectedPreset)}
              className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                enhancing
                  ? "bg-amber-400 text-white cursor-wait"
                  : (enhanceMode === "full" && !selectedPreset)
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
              }`}
            >
              {enhancing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  İyileştiriliyor...
                </span>
              ) : (enhanceMode === "full" && !selectedPreset) ? "Önce Preset Seç" : "İyileştir"}
            </button>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* ADIM 3: Sonuç + Karşılaştırma + İndirme       */}
      {/* ============================================ */}
      {step === 3 && enhancedUrl && previewUrl && (
        <div className="space-y-5">
          {/* Before/After Slider */}
          <BeforeAfterSlider
            beforeUrl={previewUrl}
            afterUrl={enhancedUrl}
          />

          {/* Upscale seçenekleri */}
          {upscaleOptions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">İndir — Boyut Seç</h3>
              <div className="grid grid-cols-2 gap-2">
                {upscaleOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleUpscale(opt.id)}
                    disabled={upscaling}
                    className="text-left p-3 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all disabled:opacity-50 text-sm"
                  >
                    <span className="font-medium text-gray-800 block">{opt.displayName}</span>
                    <span className="text-xs text-gray-400">{opt.width}x{opt.height || "auto"} · {opt.format.toUpperCase()}</span>
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
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-emerald-800">
                  {upscaleResult.width}x{upscaleResult.height} · {(upscaleResult.sizeBytes / 1024).toFixed(0)}KB
                </span>
              </div>
              <a
                href={upscaleResult.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm font-medium"
              >
                İndir
              </a>
            </div>
          )}

          {/* Aksiyonlar */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm transition-all"
            >
              Farklı Ayarla Dene
            </button>
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-medium text-sm transition-all"
            >
              Yeni Fotoğraf
            </button>
          </div>
        </div>
      )}

      {/* Sonuç Galerisi */}
      <EnhancementGallery jobs={jobs} />
    </div>
  );
}

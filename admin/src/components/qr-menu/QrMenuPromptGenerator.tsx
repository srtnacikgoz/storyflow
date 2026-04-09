import { useState } from "react";
import { api } from "../../services/api";

interface PosterStyle {
  id: string;
  name: string;
  nameTr: string;
  description?: string;
  promptDirections?: {
    background?: string;
    lighting?: string;
    colorPalette?: string;
    layout?: string;
    productPlacement?: string;
    overallFeel?: string;
    [key: string]: string | undefined;
  };
  examplePromptFragment?: string;
}

interface QrMenuPromptGeneratorProps {
  styles: PosterStyle[];
}

/** Seçilen stilden + ürün adından Gemini prompt'u oluştur */
function buildPrompt(style: PosterStyle, productName: string, productDesc: string): string {
  const dirs = style.promptDirections || {};

  const sections = [
    dirs.background,
    dirs.lighting,
    dirs.colorPalette,
    dirs.layout,
    dirs.productPlacement,
    dirs.overallFeel,
  ].filter(Boolean);

  const envBlock = sections.join("\n\n");
  const productLine = productDesc
    ? `PRODUCT: "${productName}" — ${productDesc}`
    : `PRODUCT: "${productName}"`;

  return `${envBlock}

${productLine}

Generate a professional product photograph of "${productName}" placed in the exact environment described above. The product must be the sole visual focus, presented on the plate as described. Maintain absolute consistency with the specified background surface, lighting setup, camera angle, and atmosphere. No text, no watermark, no branding elements in the image.`;
}

export default function QrMenuPromptGenerator({ styles }: QrMenuPromptGeneratorProps) {
  // Stil seçimi
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");

  // Ürün bilgileri
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");

  // Referans ürün fotoğrafı (opsiyonel)
  const [refBase64, setRefBase64] = useState<string | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [refMimeType, setRefMimeType] = useState("image/jpeg");

  // Prompt
  const [prompt, setPrompt] = useState("");
  const [promptReady, setPromptReady] = useState(false);

  // Üretim
  const [generating, setGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultMime, setResultMime] = useState<string>("image/png");
  const [genInfo, setGenInfo] = useState<{ model: string; cost: number; durationMs: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedStyle = styles.find(s => s.id === selectedStyleId);

  const handleBuildPrompt = () => {
    if (!selectedStyle || !productName.trim()) return;
    const p = buildPrompt(selectedStyle, productName.trim(), productDesc.trim());
    setPrompt(p);
    setPromptReady(true);
    setResultImage(null);
    setGenInfo(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    setResultImage(null);
    setGenInfo(null);
    try {
      const res = await api.generatePosterImage({
        prompt,
        ...(refBase64 ? { productImageBase64: refBase64, productMimeType: refMimeType } : {}),
      });
      setResultImage(`data:${res.mimeType};base64,${res.imageBase64}`);
      setResultMime(res.mimeType);
      setGenInfo({ model: res.model, cost: res.cost, durationMs: res.durationMs });
    } catch (err: any) {
      setError(err.message || "Görsel üretimi başarısız");
    } finally {
      setGenerating(false);
    }
  };

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setRefBase64((reader.result as string).split(",")[1]);
      setRefPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const ext = resultMime.includes("png") ? "png" : "jpg";
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = `qr-menu-${productName.trim().toLowerCase().replace(/\s+/g, "-")}.${ext}`;
    a.click();
  };

  const handleReset = () => {
    setPrompt("");
    setPromptReady(false);
    setResultImage(null);
    setGenInfo(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h2 className="text-sm font-semibold text-gray-800">Ürün Görseli Üret</h2>
        <p className="text-xs text-gray-400 mt-0.5">Seçilen stille standart ürün fotoğrafı oluştur</p>
      </div>

      <div className="p-5 space-y-5">
        {/* ── Stil + Ürün Bilgileri ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stil seçimi */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Tasarım Stili</label>
            <select
              value={selectedStyleId}
              onChange={e => { setSelectedStyleId(e.target.value); setPromptReady(false); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white"
            >
              <option value="">Stil seç...</option>
              {styles.map(s => (
                <option key={s.id} value={s.id}>{s.nameTr || s.name}</option>
              ))}
            </select>
            {selectedStyle?.description && (
              <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{selectedStyle.description}</p>
            )}
          </div>

          {/* Ürün adı + açıklama */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Ürün Adı</label>
              <input
                type="text"
                value={productName}
                onChange={e => { setProductName(e.target.value); setPromptReady(false); }}
                placeholder="ör: Brownie, Havuçlu Pasta, Eclair..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Açıklama <span className="text-gray-400 font-normal">(opsiyonel)</span>
              </label>
              <input
                type="text"
                value={productDesc}
                onChange={e => { setProductDesc(e.target.value); setPromptReady(false); }}
                placeholder="ör: Fıstıklı, çikolata ganajlı, frambuaz soslu..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
            </div>
          </div>
        </div>

        {/* ── Referans Fotoğraf (opsiyonel) ── */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Referans Ürün Fotoğrafı <span className="text-gray-400 font-normal">(opsiyonel — ürünün nasıl göründüğünü Gemini'ye gösterir)</span>
          </label>
          {!refPreview ? (
            <label className="flex items-center gap-3 border border-dashed border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition">
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-gray-400">Ürün fotoğrafı yükle (sürükle veya tıkla)</span>
              <input type="file" accept="image/*" onChange={handleRefUpload} className="hidden" />
            </label>
          ) : (
            <div className="flex items-center gap-3">
              <img src={refPreview} alt="Referans" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
              <span className="text-xs text-gray-500">Referans yüklendi</span>
              <button
                onClick={() => { setRefBase64(null); setRefPreview(null); }}
                className="text-xs text-red-500 hover:text-red-700 ml-auto"
              >
                Kaldır
              </button>
            </div>
          )}
        </div>

        {/* ── Prompt Oluştur Butonu ── */}
        {!promptReady && (
          <button
            onClick={handleBuildPrompt}
            disabled={!selectedStyleId || !productName.trim()}
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prompt Oluştur
          </button>
        )}

        {/* ── Prompt Önizleme + Düzenleme ── */}
        {promptReady && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-600">Üretilecek Prompt</label>
                <button
                  onClick={handleReset}
                  className="text-[10px] text-gray-400 hover:text-gray-600"
                >
                  Sıfırla
                </button>
              </div>
              <textarea
                rows={6}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-400 resize-none leading-relaxed"
              />
            </div>

            {/* Üret butonu */}
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Gemini üretiyor...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Gemini ile Üret
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Hata ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl">{error}</div>
        )}

        {/* ── Sonuç ── */}
        {resultImage && (
          <div className="space-y-3">
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <img src={resultImage} alt={productName} className="w-full" />
            </div>

            <div className="flex items-center justify-between">
              {genInfo && (
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <span>{genInfo.model}</span>
                  <span>${genInfo.cost.toFixed(3)}</span>
                  <span>{(genInfo.durationMs / 1000).toFixed(1)}s</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="text-xs text-teal-600 hover:text-teal-800 font-medium disabled:opacity-50"
                >
                  Yeniden Üret
                </button>
                <button
                  onClick={handleDownload}
                  className="text-xs bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg font-medium transition"
                >
                  Indir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

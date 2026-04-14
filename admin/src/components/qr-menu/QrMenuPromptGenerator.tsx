import { useState } from "react";
import { api } from "../../services/api";

interface PosterStyle {
  id: string;
  name: string;
  nameTr: string;
  description?: string;
  defaultBackgroundHex?: string; // Stilin doğal rengi — DNA'dan gelir, standart olarak yaşar
  backgroundHex?: string;        // Kullanıcının opsiyonel override'ı
  promptDirections?: {
    styleDirective?: string;
    background?: string;
    lighting?: string;
    colorPalette?: string;
    layout?: string;
    productPlacement?: string;
    overallFeel?: string;
    [key: string]: string | undefined;
  };
  customSections?: Array<{ id: string; label: string; value: string }>;
  examplePromptFragment?: string;
}

interface QrMenuPromptGeneratorProps {
  styles: PosterStyle[];
}

/** Seçilen stilden + ürün adından Gemini prompt'u oluştur */
function buildPrompt(
  style: PosterStyle,
  productName: string,
  visualNotes: string,
  servingOnPlate: boolean,
): string {
  const dirs = style.promptDirections || {};

  // Renk anchor'ı — override > default sıralamasıyla etkin renk belirlenir
  const effectiveHex = (style.backgroundHex && style.backgroundHex.trim())
    || (style.defaultBackgroundHex && style.defaultBackgroundHex.trim())
    || null;
  const colorAnchor = effectiveHex
    ? `BACKGROUND COLOR (MANDATORY): Exactly ${effectiveHex} — this hex is the authoritative background tone for the entire scene. Override any other color or tonal description mentioned below if there is any conflict.`
    : null;

  // Servis anchor'ı — kullanıcı "tabakta sun" seçtiyse stilin "NO plate" kuralını override eder
  const servingAnchor = servingOnPlate
    ? `SERVING OVERRIDE (MANDATORY): Present this product on an appropriate plate or dish that suits its form, size and eating method (a round ceramic plate for a slice, a shallow bowl for a dessert with sauce, a wooden board for a sandwich, etc.). A plate or dish IS required for this specific generation. Any instructions below that forbid plates, dishes, trays or props DO NOT apply to this product — plating is mandatory here and part of the composition. The plate's color and material must harmonize with the background tone described above, never compete with the product.`
    : null;

  // styleDirective varsa tek blok, yoksa eski 6 alan (backward compat)
  const standardSections = dirs.styleDirective
    ? [dirs.styleDirective]
    : [
        dirs.background,
        dirs.lighting,
        dirs.colorPalette,
        dirs.layout,
        dirs.productPlacement,
        dirs.overallFeel,
      ].filter(Boolean);

  // Kullanıcı-tanımlı ekstra bölümler (CRUD'dan gelen)
  const customSections = (style.customSections || [])
    .filter(s => s && s.value && s.value.trim())
    .map(s => s.label ? `${s.label.toUpperCase()}: ${s.value}` : s.value);

  const sections = [
    colorAnchor,
    servingAnchor,
    ...standardSections,
    ...customSections,
  ].filter(Boolean);

  const envBlock = sections.join("\n\n");

  // Ürün bloğu: ad zorunlu, notlar direktif olarak ayrı satırda
  const productBlock = visualNotes
    ? `PRODUCT: "${productName}"
VISIBLE DETAILS / ACCENTS: ${visualNotes} These elements must physically appear in the scene — scattered around the base, on the surface, or as visible textures on the product itself. They are not background context; they are compositional elements.`
    : `PRODUCT: "${productName}"`;

  return `${envBlock}

${productBlock}

Generate a professional product photograph of "${productName}" placed in the exact environment described above. The product must be the sole visual focus. Maintain absolute consistency with the specified background surface, lighting setup, camera angle, and atmosphere. No text, no watermark, no branding elements in the image.`;
}

export default function QrMenuPromptGenerator({ styles }: QrMenuPromptGeneratorProps) {
  // Stil seçimi
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");

  // Ürün bilgileri
  const [productName, setProductName] = useState("");
  const [visualNotes, setVisualNotes] = useState("");
  const [servingOnPlate, setServingOnPlate] = useState(false);

  // Referans ürün fotoğrafı (opsiyonel)
  const [refBase64, setRefBase64] = useState<string | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [refMimeType, setRefMimeType] = useState("image/jpeg");

  // Prompt
  const [prompt, setPrompt] = useState("");
  const [promptReady, setPromptReady] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  // Üretim
  const [generating, setGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultMime, setResultMime] = useState<string>("image/png");
  const [genInfo, setGenInfo] = useState<{ model: string; cost: number; durationMs: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedStyle = styles.find(s => s.id === selectedStyleId);

  const handleBuildPrompt = () => {
    if (!selectedStyle || !productName.trim()) return;
    const p = buildPrompt(selectedStyle, productName.trim(), visualNotes.trim(), servingOnPlate);
    setPrompt(p);
    setPromptReady(true);
    setResultImage(null);
    setGenInfo(null);
    setError(null);
  };

  const handleCopyPrompt = async () => {
    if (!prompt.trim()) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 1500);
    } catch {
      // sessiz — clipboard reddederse kullanıcı textarea'dan manuel kopyalayabilir
    }
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
                placeholder="ör: Klasik Dilim Çikolatalı Pasta (~8cm), Havuçlu Pasta Dilimi, Çıtır Eclair..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                Ürün formunu ve boyutunu belirt. Sadece "Pasta" yazarsan model bunu petit four veya küçük bar kek olarak yorumlayabilir — "Klasik Dilim Pasta (~8cm yükseklik)" gibi form/ölçü ekle.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Görsel İpuçları <span className="text-gray-400 font-normal">(opsiyonel — sahnede görünmesini istediğin detaylar)</span>
              </label>
              <textarea
                rows={2}
                value={visualNotes}
                onChange={e => { setVisualNotes(e.target.value); setPromptReady(false); }}
                placeholder={"ör: İçeride fındık ve Antep fıstığı var ama dışarıdan görünmüyor — yanına fındık parçaları ve fıstık kırıntıları serp. Üste pudra şekeri dökülsün.\n\nVeya: Katmanlar arasında açık kahve-bej tonda (~#C4A57B) sütlü çikolata kreması görünsün."}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400 resize-none leading-relaxed"
              />
              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                Modelin göremediği iç malzemeleri dışa yansıtmak için kullan — serpilen kırıntılar, görünür tabakalar, kesilmiş dilim, sos damlası.
              </p>
              <p className="text-[10px] text-amber-600 mt-1 leading-relaxed">
                Belirsiz pastane terimleri için renk/ton belirt — "sütlü çikolata cremeux" yerine "açık kahve-bej tonda (~#C4A57B) sütlü çikolata kreması" gibi. Cremeux, ganaj, mousse, praline gibi teknik terimleri model görsel olarak yanlış yorumlayabiliyor; renk kodu ve doku açıklaması ekle.
              </p>
            </div>
          </div>
        </div>

        {/* ── Servis Şekli ── */}
        <div>
          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-teal-50/30 hover:border-teal-200 transition">
            <input
              type="checkbox"
              checked={servingOnPlate}
              onChange={e => { setServingOnPlate(e.target.checked); setPromptReady(false); }}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">Tabakta sun</span>
                {servingOnPlate && (
                  <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">aktif</span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                Bu üretimde ürün, formuna uygun bir tabak/kase/tahtada sunulur. Stilin "tabaksız" kuralı sadece bu paylaşım için geçersiz kılınır.
              </p>
            </div>
          </label>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyPrompt}
                    title="Prompt'u kopyala"
                    className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md transition ${
                      promptCopied
                        ? "bg-emerald-50 text-emerald-600"
                        : "text-gray-500 hover:text-teal-600 hover:bg-teal-50"
                    }`}
                  >
                    {promptCopied ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Kopyalandı
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Kopyala
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleReset}
                    className="text-[10px] text-gray-400 hover:text-gray-600"
                  >
                    Sıfırla
                  </button>
                </div>
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

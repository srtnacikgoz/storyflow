import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "../services/api";
import SlidePromptGenerator from "../components/carousel-studio/SlidePromptGenerator";

// ── Carousel Framework — Firestore'dan dinamik yüklenir ──

type Energy = "HIGH" | "MEDIUM" | "LOW";

interface SlideTemplate {
  number: number;
  role: string;
  energy: Energy;
  purpose: string;
  visualDirection: string;
}

interface CarouselFramework {
  id: string;
  label: string;
  description: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  slides: SlideTemplate[];
}

const ENERGY_COLORS: Record<Energy, string> = {
  HIGH: "bg-red-100 text-red-700 border-red-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW: "bg-blue-100 text-blue-700 border-blue-200",
};

const RULES = [
  { num: 1, title: "Once yapi", desc: "Icerigi yazmadan once hangi slide rolune ait oldugunu bil." },
  { num: 2, title: "Slide basina tek fikir", desc: "Ikinci cumle gerekiyorsa fazla karmasik. Bol veya kes." },
  { num: 3, title: "Gerilim sonuctan once", desc: "Slide 5 sorgulamali, slide 6 cozumlemeli." },
  { num: 4, title: "Slide 1 tek basina yargilanir", desc: "Explore'da baglamsiz gorunce kaydirmayı hak ediyor mu?" },
  { num: 5, title: "Max 6 kelime baslik", desc: "Kısalık tembellik degil — disiplindir." },
  { num: 6, title: "Max 3 satir govde", desc: "3 satira sigmıyorsa caption'a veya ayrı posta ait." },
  { num: 7, title: "Urun gercek kalir", desc: "Sade kendi fotografini kullanir. Urun degistirilmez." },
  { num: 8, title: "Her zaman etiketle", desc: "@sade.patisserie — slide'da veya caption'da. Istisnasiz." },
];

// ── Instagram format tanimlari ──
type InstaFormat = "post" | "portrait" | "story" | "reel" | "landscape";

interface FormatInfo {
  label: string;
  size: string;
  ratio: string;
  width: number;
  height: number;
  description: string;
}

const FORMATS: Record<InstaFormat, FormatInfo> = {
  post:      { label: "Gonderi",       size: "1080x1080", ratio: "1:1",    width: 1080, height: 1080, description: "Klasik carousel, feed'de kalici" },
  portrait:  { label: "Portre",        size: "1080x1350", ratio: "4:5",    width: 1080, height: 1350, description: "Feed'de daha cok alan kaplar — onerilen" },
  story:     { label: "Story",         size: "1080x1920", ratio: "9:16",   width: 1080, height: 1920, description: "Dikey tam ekran, 24 saat" },
  reel:      { label: "Reels",         size: "1080x1920", ratio: "9:16",   width: 1080, height: 1920, description: "Dikey, video/statik cover" },
  landscape: { label: "Yatay (Reklam)", size: "1080x566",  ratio: "1.91:1", width: 1080, height: 566,  description: "Instagram/Facebook reklam cross-post" },
};

// ── Slide editor state ──
interface SlideContent {
  headline: string;
  body: string;
  imagePreview: string | null;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function CarouselStudio() {
  const [frameworks, setFrameworks] = useState<CarouselFramework[]>([]);
  const [frameworksLoading, setFrameworksLoading] = useState(true);
  const [frameworksError, setFrameworksError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<InstaFormat | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPromptGenerator, setShowPromptGenerator] = useState(false);

  // Frameworks Firestore'dan yükle
  useEffect(() => {
    api.listCarouselFrameworks()
      .then(setFrameworks)
      .catch(() => setFrameworksError("Carousel tipleri yüklenemedi. /seedCarouselFrameworks endpoint'ini çağır."))
      .finally(() => setFrameworksLoading(false));
  }, []);

  const handleSelectType = (fw: CarouselFramework) => {
    setSelectedType(fw.id);
    setSlides(fw.slides.map(() => ({ headline: "", body: "", imagePreview: null })));
    setActiveSlide(0);
  };

  const updateSlide = (index: number, field: keyof SlideContent, value: string) => {
    setSlides(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSlides(prev => prev.map((s, i) => i === index ? { ...s, imagePreview: reader.result as string } : s));
    reader.readAsDataURL(file);
  };

  const typeInfo = selectedType ? frameworks.find((f) => f.id === selectedType) ?? null : null;
  const currentTemplate = typeInfo?.slides[activeSlide];
  const currentContent = slides[activeSlide];

  const [downloading, setDownloading] = useState(false);

  // ── Brand Colors (Firestore) ──
  const brandColors = useRef<{ accent: string; bg: string; text: string }>({
    accent: "#D4A945",
    bg: "#FFFFFF",
    text: "#000000",
  });
  useEffect(() => {
    api.getCarouselBrandConfig().then((config) => {
      const find = (keyword: string) =>
        config.colors.find((c) => c.name.toLowerCase().includes(keyword))?.hex;
      brandColors.current = {
        accent: find("mustard") ?? "#D4A945",
        bg: find("beyaz") ?? "#FFFFFF",
        text: find("siyah") ?? "#000000",
      };
    }).catch(() => { /* fallback değerler kullanılır */ });
  }, []);

  // ── AI ile Doldur ──
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiProductName, setAiProductName] = useState("");
  const [aiProductDesc, setAiProductDesc] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiFill = useCallback(async () => {
    if (!selectedType || !aiProductName.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await api.generateCarouselContent({
        brandId: "sade-patisserie",
        carouselType: selectedType,
        productName: aiProductName.trim(),
        productDescription: aiProductDesc.trim() || undefined,
      });
      // Slide'ları AI yanıtıyla doldur, mevcut görselleri koru
      setSlides(prev => prev.map((s, i) => {
        const aiSlide = result.find(r => r.slideNumber === i + 1);
        if (!aiSlide) return s;
        return {
          ...s,
          headline: aiSlide.headline || s.headline,
          body: aiSlide.body || s.body,
        };
      }));
      setShowAiModal(false);
      setAiProductName("");
      setAiProductDesc("");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setAiLoading(false);
    }
  }, [selectedType, aiProductName, aiProductDesc]);
  const formatInfo = selectedFormat ? FORMATS[selectedFormat] : null;

  // Canvas ile slide'i PNG olarak render et
  const renderSlide = useCallback(async (index: number): Promise<string> => {
    if (!formatInfo || !typeInfo) throw new Error("Format/tip secilmedi");
    const W = formatInfo.width;
    const H = formatInfo.height;
    const slide = slides[index];
    const tmpl = typeInfo.slides[index];
    const isTextOnly = tmpl.role === "CONTEXT";
    const isCTA = tmpl.role === "CTA";
    const { accent, bg, text } = brandColors.current;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    if (isCTA) {
      // CTA: brand arka plan, accent baslik, brand metin
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Ust cizgi — brand accent
      ctx.fillStyle = accent;
      ctx.fillRect(W * 0.35, H * 0.25, W * 0.3, 3);

      // Baslik
      if (slide.headline) {
        ctx.fillStyle = accent;
        ctx.font = `bold ${Math.round(W * 0.065)}px Georgia, serif`;
        ctx.textAlign = "center";
        ctx.fillText(slide.headline, W / 2, H * 0.42);
      }
      // Govde
      if (slide.body) {
        ctx.fillStyle = "#333333";
        ctx.font = `${Math.round(W * 0.032)}px Georgia, serif`;
        ctx.textAlign = "center";
        wrapText(ctx, slide.body, W / 2, H * 0.52, W * 0.75, Math.round(W * 0.05));
      }
      // Alt yazi
      ctx.fillStyle = "#999999";
      ctx.font = `${Math.round(W * 0.022)}px Helvetica, Arial, sans-serif`;
      ctx.fillText("patisserie l'artisan", W / 2, H * 0.88);

    } else if (isTextOnly) {
      // CONTEXT: brand arka plan, brand tipografi
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      if (slide.headline) {
        ctx.fillStyle = text;
        ctx.font = `bold ${Math.round(W * 0.055)}px Georgia, serif`;
        ctx.textAlign = "center";
        ctx.fillText(slide.headline, W / 2, H * 0.38);
      }
      if (slide.body) {
        ctx.fillStyle = "#555555";
        ctx.font = `${Math.round(W * 0.032)}px Georgia, serif`;
        ctx.textAlign = "center";
        wrapText(ctx, slide.body, W / 2, H * 0.48, W * 0.75, Math.round(W * 0.05));
      }

    } else {
      // Gorsel slide: fotograf arkaplan + metin overlay
      if (slide.imagePreview) {
        const img = await loadImage(slide.imagePreview);
        // Cover fit
        const imgRatio = img.width / img.height;
        const canvasRatio = W / H;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgRatio > canvasRatio) {
          sw = img.height * canvasRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / canvasRatio;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      } else {
        ctx.fillStyle = "#F5F0EB";
        ctx.fillRect(0, 0, W, H);
      }

      // Alt gradient overlay
      const grad = ctx.createLinearGradient(0, H * 0.55, 0, H);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, H * 0.55, W, H * 0.45);

      // Baslik
      if (slide.headline) {
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `bold ${Math.round(W * 0.06)}px Georgia, serif`;
        ctx.textAlign = "left";
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 8;
        ctx.fillText(slide.headline, W * 0.06, H * 0.85);
        ctx.shadowBlur = 0;
      }
      // Govde (ince, basligin altinda)
      if (slide.body) {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = `${Math.round(W * 0.028)}px Helvetica, Arial, sans-serif`;
        ctx.textAlign = "left";
        wrapText(ctx, slide.body, W * 0.06, H * 0.91, W * 0.88, Math.round(W * 0.04));
      }
    }

    return canvas.toDataURL("image/png");
  }, [slides, formatInfo, typeInfo]);

  // Tum slide'lari PNG olarak indir
  const handleDownloadAll = useCallback(async () => {
    if (!typeInfo || !formatInfo) return;
    setDownloading(true);
    try {
      for (let i = 0; i < slides.length; i++) {
        const dataUrl = await renderSlide(i);
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `sade-carousel-${i + 1}-${typeInfo.slides[i].role.toLowerCase()}.png`;
        a.click();
        // Browser'in coklu indirmeyi islemesi icin kisa bekleme
        await new Promise(r => setTimeout(r, 300));
      }
    } finally {
      setDownloading(false);
    }
  }, [slides, renderSlide, typeInfo, formatInfo]);

  // ── Adim 1: Format secim ekrani ──
  if (!selectedFormat) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Carousel Studio</h1>
          <p className="text-gray-500 text-sm mt-1">7-slide Instagram carousel framework'u ile icerik olustur</p>
        </div>

        <p className="text-sm font-medium text-gray-700 mb-3">1. Gorsel Formati Sec</p>
        <div className="grid grid-cols-5 gap-3">
          {(Object.entries(FORMATS) as [InstaFormat, FormatInfo][]).map(([key, f]) => {
            // Oran gorseli icin aspect ratio
            const previewH = key === "landscape" ? 28 : key === "post" ? 48 : key === "portrait" ? 56 : 64;
            return (
              <button key={key} onClick={() => setSelectedFormat(key)}
                className="group text-center p-4 bg-white border border-gray-200 rounded-2xl hover:border-amber-400 hover:shadow-md transition-all">
                {/* Oran onizleme kutusu */}
                <div className="flex justify-center mb-3">
                  <div className={`w-10 bg-gray-200 group-hover:bg-amber-200 rounded transition-colors`}
                    style={{ height: previewH }} />
                </div>
                <p className="text-sm font-bold text-gray-900">{f.label}</p>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{f.size}</p>
                <p className="text-[10px] text-gray-500 mt-1">{f.description}</p>
                {key === "portrait" && (
                  <span className="inline-block mt-1.5 text-[9px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Onerilen</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Adim 2: Tip secim ekrani ──
  if (!selectedType) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedFormat(null)} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Carousel Studio</h1>
            <p className="text-gray-500 text-sm mt-1">
              Format: <span className="font-medium text-gray-700">{formatInfo!.label}</span>
              <span className="text-gray-400 ml-1">({formatInfo!.size})</span>
            </p>
          </div>
        </div>

        {/* Kural ozeti */}
        <button onClick={() => setShowRules(!showRules)}
          className="w-full mb-4 text-left bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-600">8 Altin Kural</span>
          <svg className={`w-4 h-4 text-stone-400 transition-transform ${showRules ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showRules && (
          <div className="mb-6 grid grid-cols-2 gap-2">
            {RULES.map(r => (
              <div key={r.num} className="bg-white border border-gray-100 rounded-lg p-3 flex gap-2.5">
                <span className="text-amber-600 font-bold text-sm flex-shrink-0">{r.num}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800">{r.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Carousel tipi secimi */}
        <p className="text-sm font-medium text-gray-700 mb-3">2. Carousel Tipi Sec</p>
        {frameworksLoading ? (
          <div className="flex items-center gap-2 text-xs text-gray-400 py-4">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Carousel tipleri yükleniyor...
          </div>
        ) : frameworksError ? (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-700">{frameworksError}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {frameworks.map((fw) => (
              <button key={fw.id} onClick={() => handleSelectType(fw)}
                className="group text-left p-5 bg-white border border-gray-200 rounded-2xl hover:border-amber-400 hover:shadow-md transition-all">
                <span className="text-2xl font-bold text-amber-500 group-hover:text-amber-600">{fw.icon}</span>
                <h3 className="text-base font-bold text-gray-900 mt-2">{fw.label}</h3>
                <p className="text-xs text-gray-500 mt-1">{fw.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Editor ekrani ──
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedType(null); setSlides([]); }}
            className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{typeInfo!.label} Carousel</h1>
            <p className="text-xs text-gray-500">
              {typeInfo!.description}
              <span className="ml-2 text-gray-400">|</span>
              <span className="ml-2 font-mono text-gray-400">{formatInfo!.label} {formatInfo!.size}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI ile Doldur
          </button>
          <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-3 py-1 rounded-full">
            {activeSlide + 1} / 7
          </span>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Sol: Slide navigasyonu */}
        <div className="w-20 flex-shrink-0 space-y-1.5">
          {typeInfo!.slides.map((s, i) => (
            <button key={i} onClick={() => setActiveSlide(i)}
              className={`w-full p-2 rounded-xl text-center transition-all ${
                activeSlide === i
                  ? "bg-amber-50 border-2 border-amber-400 shadow-sm"
                  : "bg-white border border-gray-200 hover:border-gray-300"
              }`}>
              <span className="text-xs font-bold text-gray-800 block">{i + 1}</span>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${ENERGY_COLORS[s.energy]}`}>
                {s.role === "BUILD2" ? "BUILD" : s.role}
              </span>
              {/* Icerik doluluk gostergesi */}
              {slides[i] && (slides[i].headline || slides[i].imagePreview) && (
                <span className="block w-1.5 h-1.5 bg-emerald-400 rounded-full mx-auto mt-1" />
              )}
            </button>
          ))}
        </div>

        {/* Orta: Aktif slide editor */}
        {currentTemplate && currentContent && (
          <div className="flex-1 space-y-4">
            {/* Slide bilgi karti */}
            <div className={`rounded-xl p-4 border ${ENERGY_COLORS[currentTemplate.energy]}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold">Slide {currentTemplate.number} — {currentTemplate.role === "BUILD2" ? "BUILD" : currentTemplate.role}</span>
                <span className="text-[10px] font-medium opacity-70">{currentTemplate.energy} ENERGY</span>
              </div>
              <p className="text-xs leading-relaxed">{currentTemplate.purpose}</p>
            </div>

            {/* Gorsel yonlendirme */}
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide mb-1">Gorsel Yonlendirme</p>
              <p className="text-xs text-violet-700 leading-relaxed">{currentTemplate.visualDirection}</p>
            </div>

            {/* Baslik */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">Baslik</label>
                <span className={`text-[10px] font-mono ${countWords(currentContent.headline) > 6 ? "text-red-500 font-bold" : "text-gray-400"}`}>
                  {countWords(currentContent.headline)}/6 kelime
                </span>
              </div>
              <input
                type="text"
                value={currentContent.headline}
                onChange={e => updateSlide(activeSlide, "headline", e.target.value)}
                placeholder="Max 6 kelime — kisa, cesur, merak uyandiran"
                className={`w-full border rounded-xl px-4 py-3 text-sm font-semibold ${
                  countWords(currentContent.headline) > 6 ? "border-red-300 bg-red-50" : "border-gray-200"
                }`}
              />
            </div>

            {/* Govde metin */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">Govde Metin</label>
                <span className={`text-[10px] font-mono ${currentContent.body.split("\n").length > 3 ? "text-red-500 font-bold" : "text-gray-400"}`}>
                  {currentContent.body.split("\n").filter(Boolean).length}/3 satir
                </span>
              </div>
              <textarea
                value={currentContent.body}
                onChange={e => updateSlide(activeSlide, "body", e.target.value)}
                placeholder="Max 3 satir — sigmiyorsa caption'a ait"
                rows={3}
                className={`w-full border rounded-xl px-4 py-3 text-sm resize-none ${
                  currentContent.body.split("\n").length > 3 ? "border-red-300 bg-red-50" : "border-gray-200"
                }`}
              />
            </div>

            {/* Gorsel yukleme */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">Slide Gorseli</label>
                {currentTemplate.role !== "CONTEXT" && currentTemplate.role !== "CTA" && (
                  <button
                    onClick={() => setShowPromptGenerator(true)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Stil Stüdyosu'ndan Prompt Üret
                  </button>
                )}
              </div>
              {currentContent.imagePreview ? (
                <div className="relative">
                  <img src={currentContent.imagePreview} alt={`Slide ${activeSlide + 1}`}
                    className="w-full h-48 object-cover rounded-xl border border-gray-200" />
                  <button onClick={() => updateSlide(activeSlide, "imagePreview" as any, null as any)}
                    className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 shadow">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Gorsel yukle</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, WebP</p>
                  </div>
                  <input type="file" accept="image/*" onChange={e => handleImageUpload(activeSlide, e)} className="hidden" />
                </label>
              )}
            </div>

            {/* Slide gezinme */}
            <div className="flex justify-between pt-2">
              <button onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
                disabled={activeSlide === 0}
                className="px-4 py-2 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30">
                Onceki
              </button>
              {activeSlide < 6 ? (
                <button onClick={() => setActiveSlide(activeSlide + 1)}
                  className="px-4 py-2 rounded-xl text-sm bg-amber-600 text-white hover:bg-amber-700">
                  Sonraki
                </button>
              ) : (
                <button onClick={() => setShowPreview(true)}
                  className="px-5 py-2.5 rounded-xl text-sm bg-emerald-600 text-white hover:bg-emerald-700 font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Onizle
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sag: Mini onizleme */}
        <div className="w-48 flex-shrink-0">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Onizleme</p>
          <div className="space-y-1.5">
            {typeInfo!.slides.map((s, i) => (
              <div key={i} onClick={() => setActiveSlide(i)}
                className={`rounded-lg overflow-hidden cursor-pointer border transition-all ${
                  activeSlide === i ? "border-amber-400 ring-1 ring-amber-400" : "border-gray-200"
                }`}>
                {slides[i]?.imagePreview ? (
                  <div className="relative">
                    <img src={slides[i].imagePreview!} alt="" className="w-full h-16 object-cover" />
                    {slides[i].headline && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5">
                        <p className="text-[8px] text-white font-semibold truncate">{slides[i].headline}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-16 bg-gray-50 flex items-center justify-center">
                    {slides[i]?.headline ? (
                      <p className="text-[9px] text-gray-600 font-medium px-2 text-center truncate">{slides[i].headline}</p>
                    ) : (
                      <span className="text-[9px] text-gray-300">{s.role === "BUILD2" ? "BUILD" : s.role}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI İLE DOLDUR MODAL ── */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-gray-900">AI ile Doldur</h2>
              </div>
              <button onClick={() => { setShowAiModal(false); setAiError(null); }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Ürün adını gir — Claude, Sade'nin ses tonunda 7 slide metnini yazacak.
              Görseller korunur, sadece başlık ve gövde metinleri dolar.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Ürün Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={aiProductName}
                  onChange={e => setAiProductName(e.target.value)}
                  placeholder="örn. Fıstıklı Cruffin"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Ek Bilgi <span className="text-gray-400">(opsiyonel)</span>
                </label>
                <textarea
                  value={aiProductDesc}
                  onChange={e => setAiProductDesc(e.target.value)}
                  placeholder="örn. Belçika çikolatalı, İtalyan fıstık kremalı. Sadece hafta sonları."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-violet-400"
                />
              </div>
            </div>

            {aiError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs text-red-600">{aiError}</p>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowAiModal(false); setAiError(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
                İptal
              </button>
              <button
                onClick={handleAiFill}
                disabled={!aiProductName.trim() || aiLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 font-semibold flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Yazıyor...
                  </>
                ) : "Üret"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STİL STÜDYOSU PROMPT GENERATOR MODAL ── */}
      {showPromptGenerator && currentTemplate && (
        <SlidePromptGenerator
          slideRole={currentTemplate.role === "BUILD2" ? "BUILD" : currentTemplate.role}
          slideVisualDirection={currentTemplate.visualDirection}
          onClose={() => setShowPromptGenerator(false)}
        />
      )}

      {/* ── TAM EKRAN ONIZLEME MODAL ── */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-6">
          {/* Header */}
          <div className="w-full max-w-5xl flex items-center justify-between mb-4">
            <h2 className="text-white text-lg font-bold">{typeInfo!.label} Carousel — Onizleme</h2>
            <button onClick={() => setShowPreview(false)}
              className="text-white/60 hover:text-white text-2xl">&times;</button>
          </div>

          {/* Slide'lar yan yana — Instagram carousel sim */}
          <div className="flex gap-3 overflow-x-auto pb-4 max-w-5xl w-full">
            {slides.map((s, i) => {
              const tmpl = typeInfo!.slides[i];
              const isTextOnly = tmpl.role === "CONTEXT" || tmpl.role === "CTA";
              return (
                <div key={i} className="flex-shrink-0 w-64 rounded-2xl overflow-hidden border border-white/10 bg-white shadow-2xl">
                  {/* Gorsel veya metin arkaplan */}
                  {s.imagePreview && !isTextOnly ? (
                    <div className="relative h-64">
                      <img src={s.imagePreview} alt="" className="w-full h-full object-cover" />
                      {s.headline && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                          <p className="text-white font-bold text-sm leading-tight">{s.headline}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center p-5 text-center bg-white">
                      {s.headline && (
                        <p className={`font-bold text-base mb-2 ${
                          tmpl.role === "CTA" ? "text-[#D4A945]" : "text-gray-900"
                        }`} style={{ fontFamily: "Georgia, serif" }}>
                          {s.headline}
                        </p>
                      )}
                      {s.body && (
                        <p className="text-xs leading-relaxed text-gray-800" style={{ fontFamily: "Georgia, serif" }}>
                          {s.body}
                        </p>
                      )}
                      {tmpl.role === "CTA" && (
                        <p className="text-[10px] text-gray-400 mt-3">patisserie l'artisan</p>
                      )}
                    </div>
                  )}
                  {/* Alt bilgi */}
                  <div className="bg-white px-3 py-2 border-t border-gray-100">
                    {s.imagePreview && !isTextOnly && s.body && (
                      <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2 mb-1">{s.body}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${ENERGY_COLORS[tmpl.energy]}`}>
                        {i + 1}. {tmpl.role === "BUILD2" ? "BUILD" : tmpl.role}
                      </span>
                      {!s.headline && !s.imagePreview && (
                        <span className="text-[9px] text-red-400">Bos</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Alt butonlar */}
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowPreview(false)}
              className="px-5 py-2.5 rounded-xl text-sm border border-white/20 text-white hover:bg-white/10">
              Duzenle
            </button>
            <button onClick={handleDownloadAll} disabled={downloading}
              className="px-5 py-2.5 rounded-xl text-sm bg-white text-gray-900 hover:bg-gray-100 font-semibold flex items-center gap-2 disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloading ? "Indiriliyor..." : `7 Slide PNG Indir (${formatInfo!.size})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Yardimci: img yukle
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Yardimci: canvas text wrap
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const testLine = line + (line ? " " : "") + word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, currentY);
}

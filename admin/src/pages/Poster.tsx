import { useState, useEffect } from "react";
import { api } from "../services/api";
import PosterAnalyzer from "../components/poster/PosterAnalyzer";
import PromptGenerator from "../components/poster/PromptGenerator";

interface PosterStyle {
  id: string; name: string; nameTr: string; description: string;
  isActive: boolean; sortOrder: number;
}
interface PosterMood {
  id: string; name: string; nameTr: string;
  compatibleStyles: string[]; isActive: boolean; sortOrder: number;
}
interface PosterAspectRatio {
  id: string; label: string; width: number; height: number;
  useCase: string; isActive: boolean;
}
interface PosterTypography {
  id: string; name: string; nameTr: string; description: string;
  isActive: boolean; sortOrder: number;
}
interface PosterLayout {
  id: string; name: string; nameTr: string; description: string;
  isActive: boolean; sortOrder: number;
}

const RATIO_ICONS: Record<string, string> = {
  "2-3": "▯", "4-5": "▯", "1-1": "▢", "9-16": "▏",
};

export default function Poster() {
  // Firestore verileri
  const [styles, setStyles] = useState<PosterStyle[]>([]);
  const [moods, setMoods] = useState<PosterMood[]>([]);
  const [ratios, setRatios] = useState<PosterAspectRatio[]>([]);
  const [typographies, setTypographies] = useState<PosterTypography[]>([]);
  const [layouts, setLayouts] = useState<PosterLayout[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  // Seçimler
  const [selectedStyle, setSelectedStyle] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [selectedRatio, setSelectedRatio] = useState("2-3");
  const [selectedTypography, setSelectedTypography] = useState("");
  const [selectedLayout, setSelectedLayout] = useState("");

  // Form
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [price, setPrice] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [explodedLayers, setExplodedLayers] = useState("");

  // Görsel
  const [productImageBase64, setProductImageBase64] = useState<string | null>(null);
  const [productMimeType, setProductMimeType] = useState("image/jpeg");
  const [productPreview, setProductPreview] = useState<string | null>(null);

  // Config yükle
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setConfigLoading(true);
    setConfigError(null);
    try {
      const [stylesData, moodsData, ratiosData, typoData, layoutData] = await Promise.all([
        api.listPosterStyles(),
        api.listPosterMoods(),
        api.listPosterAspectRatios(),
        api.listPosterTypographies(),
        api.listPosterLayouts(),
      ]);
      setStyles(stylesData);
      setMoods(moodsData);
      setRatios(ratiosData);
      setTypographies(typoData);
      setLayouts(layoutData);
      if (stylesData.length > 0) setSelectedStyle(stylesData[0].id);
      if (moodsData.length > 0) setSelectedMood(moodsData[0].id);
    } catch (err: any) {
      setConfigError(err.message || "Config yüklenemedi");
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      await api.seedPosterConfig();
      await loadConfig();
    } catch (err: any) {
      alert("Seed hatası: " + err.message);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setProductImageBase64(base64);
      setProductPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Mood uyumluluk kontrolü
  const isCompatible = (moodId: string) => {
    const mood = moods.find(m => m.id === moodId);
    if (!mood?.compatibleStyles?.length) return true;
    return mood.compatibleStyles.includes(selectedStyle);
  };

  // Prompt Generator'a gönderilecek birleşik notlar
  const combinedAdditionalNotes = [
    additionalNotes,
    explodedLayers ? `EXPLODED VIEW LAYER ORDER (bottom to top):\n${explodedLayers}` : "",
  ].filter(Boolean).join("\n\n");

  // Config yüklenirken
  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  // Config bulunamadı — seed gerekiyor
  if (configError || styles.length === 0) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Poster Konfigürasyonu Bulunamadı</h1>
        <p className="text-sm text-gray-500 mb-6">
          {configError || "Firestore'da poster stilleri yok. Seed çalıştırarak yükleyin."}
        </p>
        <button onClick={handleSeed} className="btn-primary px-6 py-2">
          Poster Config Seed Et
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Poster Prompt Üret</h1>
          <p className="text-sm text-gray-500 mt-1">ChatGPT, Midjourney veya DALL-E için optimize edilmiş prompt</p>
        </div>
        <PosterAnalyzer onApplyStyle={(sId, mId, tId) => {
          if (sId) setSelectedStyle(sId);
          if (mId) setSelectedMood(mId);
          if (tId) setSelectedTypography(tId);
        }} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        {/* Ürün Görseli */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Ürün Görseli *</label>
          {productPreview ? (
            <div className="flex items-center gap-3">
              <img src={productPreview} alt="Ürün" className="w-20 h-20 object-cover rounded-lg border" />
              <button onClick={() => { setProductPreview(null); setProductImageBase64(null); }} className="text-xs text-red-500 hover:text-red-700">Değiştir</button>
            </div>
          ) : (
            <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-amber-400 transition">
              <div className="text-center">
                <p className="text-sm text-gray-500">Ürün fotoğrafı yükle</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP</p>
              </div>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Stil Seçimi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tasarım Stili</label>
          <div className="grid grid-cols-2 gap-2">
            {styles.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStyle(s.id)}
                className={`p-3 border rounded-xl text-left transition ${
                  selectedStyle === s.id
                    ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="font-medium text-sm">{s.nameTr}</span>
                <span className="text-xs text-gray-500 block mt-0.5 line-clamp-2">{s.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mood Seçimi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mood</label>
          <div className="grid grid-cols-3 gap-2">
            {moods.map(m => {
              const compatible = isCompatible(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMood(m.id)}
                  className={`p-2.5 border rounded-xl text-left transition ${
                    selectedMood === m.id
                      ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500"
                      : compatible
                        ? "border-gray-200 hover:border-gray-300"
                        : "border-gray-100 opacity-50"
                  }`}
                >
                  <span className="font-medium text-xs">{m.nameTr}</span>
                  {!compatible && <span className="text-[10px] text-gray-400 block">farklı uyum</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Aspect Ratio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Boyut</label>
          <div className="flex gap-2">
            {ratios.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRatio(r.id)}
                className={`flex-1 py-2.5 px-3 border rounded-xl text-center transition ${
                  selectedRatio === r.id
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-lg block">{RATIO_ICONS[r.id] || "▯"}</span>
                <span className="text-xs font-medium">{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tipografi */}
        {typographies.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipografi <span className="text-xs text-gray-400">(opsiyonel)</span></label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTypography("")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  !selectedTypography
                    ? "bg-gray-900 text-white"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300"
                }`}
              >
                Otomatik
              </button>
              {typographies.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTypography(t.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    selectedTypography === t.id
                      ? "bg-violet-600 text-white"
                      : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {t.nameTr}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Layout / Yerleşim */}
        {layouts.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Yerleşim <span className="text-xs text-gray-400">(opsiyonel)</span></label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedLayout("")}
                className={`p-2 border rounded-xl text-center transition ${
                  !selectedLayout
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-xs font-medium">Otomatik</span>
              </button>
              {layouts.map(l => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLayout(l.id)}
                  className={`p-2 border rounded-xl text-center transition ${
                    selectedLayout === l.id
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xs font-medium">{l.nameTr}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Katman Sıralaması — sadece Exploded View stili seçilince */}
        {selectedStyle.includes("exploded") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Katman Sıralaması <span className="text-xs text-gray-400">(alttan üste, her satır bir katman)</span>
            </label>
            <textarea
              value={explodedLayers}
              onChange={e => setExplodedLayers(e.target.value)}
              placeholder={"Kroasan kase (alt)\nKaşar peynir\nOmlet\nFüme et\nMaydanoz (üst)"}
              rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">Her satır bir katman. En alttaki malzeme ilk satır, en üstteki son satır.</p>
          </div>
        )}

        {/* Metin Alanları */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Başlık <span className="text-gray-400">(boşsa AI önerir)</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Taze Kruvasan" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Alt Başlık <span className="text-gray-400">(boşsa AI önerir)</span></label>
            <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="El yapımı, tereyağlı" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fiyat <span className="text-gray-400">(opsiyonel)</span></label>
            <input type="text" value={price} onChange={e => setPrice(e.target.value)} placeholder="₺85" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ek Notlar <span className="text-gray-400">(opsiyonel)</span></label>
            <input type="text" value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} placeholder="Bahar temalı..." className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Prompt Üret */}
        <PromptGenerator
          productImageBase64={productImageBase64}
          productMimeType={productMimeType}
          styleId={selectedStyle}
          moodId={selectedMood}
          aspectRatioId={selectedRatio}
          typographyId={selectedTypography || undefined}
          layoutId={selectedLayout || undefined}
          title={title}
          subtitle={subtitle}
          price={price}
          additionalNotes={combinedAdditionalNotes}
        />
      </div>
    </div>
  );
}

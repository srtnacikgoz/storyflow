import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "../services/api";
import PosterAnalyzer from "../components/poster/PosterAnalyzer";
import PromptGenerator from "../components/poster/PromptGenerator";
import ProductImageUpload from "../components/ProductImageUpload";
import InputWithRecent from "../components/InputWithRecent";

interface PosterStyle {
  id: string; name: string; nameTr: string; description: string;
  thumbnailUrl?: string; isActive: boolean; sortOrder: number;
  examplePromptFragment?: string;
  dallEPrompt?: string;
  defaultBackgroundHex?: string;
  backgroundHex?: string;
  promptDirections?: {
    styleDirective?: string;
    dallEPrompt?: string;
    background?: string;
    typography?: string;
    layout?: string;
    colorPalette?: string;
    productPlacement?: string;
    lighting?: string;
    overallFeel?: string;
  };
}

/** Eski format (6 alan) → tek styleDirective birleştirme fallback */
function toStyleDirective(dirs: PosterStyle["promptDirections"]): string {
  if (dirs?.styleDirective) return dirs.styleDirective;
  return [
    dirs?.background && `Background: ${dirs.background}`,
    dirs?.typography && `Typography: ${dirs.typography}`,
    dirs?.layout && `Layout: ${dirs.layout}`,
    dirs?.colorPalette && `Color Palette: ${dirs.colorPalette}`,
    dirs?.productPlacement && `Product: ${dirs.productPlacement}`,
    dirs?.lighting && `Lighting: ${dirs.lighting}`,
    dirs?.overallFeel && `Overall Feel: ${dirs.overallFeel}`,
  ].filter(Boolean).join("\n");
}
interface PosterMood {
  id: string; name: string; nameTr: string;
  isActive: boolean; sortOrder: number;
}
interface PosterAspectRatio {
  id: string; label: string; width: number; height: number;
  useCase: string; isActive: boolean;
}
interface PosterTypography {
  id: string; name: string; nameTr: string; description: string;
  isActive: boolean; sortOrder: number;
}


export default function Poster() {
  // Firestore verileri
  const [styles, setStyles] = useState<PosterStyle[]>([]);
  const [moods, setMoods] = useState<PosterMood[]>([]);
  const [ratios, setRatios] = useState<PosterAspectRatio[]>([]);
  const [typographies, setTypographies] = useState<PosterTypography[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  // Seçimler
  const [selectedStyle, setSelectedStyle] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [selectedRatio, setSelectedRatio] = useState("2-3");
  const [selectedTitleTypography, setSelectedTitleTypography] = useState("");
  const [selectedSubtitleTypography, setSelectedSubtitleTypography] = useState("");

  const [styleView, setStyleView] = useState<"grid" | "list">("list");
  // Stil açıklama detayı (hover/click ile full açıklama)
  const [expandedStyleDesc, setExpandedStyleDesc] = useState<string | null>(null);
  // Thumbnail düzenleme
  const [editingThumbnail, setEditingThumbnail] = useState<string | null>(null);
  const [thumbnailInput, setThumbnailInput] = useState("");
  const [hoveredThumb, setHoveredThumb] = useState<{ id: string; rect: DOMRect } | null>(null);

  // Stil düzenleme / oluşturma modalı
  const [editingStyle, setEditingStyle] = useState<PosterStyle | null>(null);
  const [isCreatingStyle, setIsCreatingStyle] = useState(false);
  const [pasteInput, setPasteInput] = useState("");
  const [styleEditForm, setStyleEditForm] = useState<{
    name: string; nameTr: string; description: string;
    styleDirective: string; dallEPrompt: string; backgroundHex: string;
  }>({ name: "", nameTr: "", description: "", styleDirective: "", dallEPrompt: "", backgroundHex: "" });
  const [styleEditSaving, setStyleEditSaving] = useState(false);
  const [styleEditError, setStyleEditError] = useState<string | null>(null);

  /** Claude analiz çıktısını parse edip form alanlarına doldurur */
  const handlePasteAnalysis = (text: string) => {
    setPasteInput(text);
    if (!text.trim()) return;

    let description = "";
    let styleDirective = "";
    let dallEPrompt = "";

    // Açıklama: satırları --- ayracına kadar tara
    const lines = text.split("\n");
    const descLine = lines.find(l => l.startsWith("Açıklama:"));
    if (descLine) description = descLine.replace("Açıklama:", "").trim();

    // --- Stil Tarifi --- ve --- DALL-E Prompt --- ayraclarıyla böl
    const stilIdx = text.indexOf("--- Stil Tarifi ---");
    const dalleIdx = text.indexOf("--- DALL-E Prompt ---");

    if (stilIdx !== -1 && dalleIdx !== -1) {
      styleDirective = text.slice(stilIdx + "--- Stil Tarifi ---".length, dalleIdx).trim();
      dallEPrompt = text.slice(dalleIdx + "--- DALL-E Prompt ---".length).trim();
    } else if (stilIdx !== -1) {
      styleDirective = text.slice(stilIdx + "--- Stil Tarifi ---".length).trim();
    } else {
      // Ayraç yoksa tüm metni styleDirective olarak kullan
      styleDirective = text.trim();
    }

    setStyleEditForm(f => ({
      ...f,
      description: description || f.description,
      styleDirective: styleDirective || f.styleDirective,
      dallEPrompt: dallEPrompt || f.dallEPrompt,
    }));
  };
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

  const loadConfig = async (fresh = false) => {
    setConfigLoading(true);
    setConfigError(null);
    try {
      const [stylesData, moodsData, ratiosData, typoData] = await Promise.all([
        api.listPosterStyles(fresh),
        api.listPosterMoods(),
        api.listPosterAspectRatios(),
        api.listPosterTypographies(),
      ]);
      setStyles(stylesData);
      setMoods(moodsData);
      setRatios(ratiosData);
      setTypographies(typoData);

      if (stylesData.length > 0) setSelectedStyle(stylesData[0].id);
      if (moodsData.length > 0) setSelectedMood(moodsData[0].id);
    } catch (err: any) {
      setConfigError(err.message || "Config yüklenemedi");
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSaveThumbnail = async (styleId: string) => {
    const url = thumbnailInput.trim();
    try {
      await api.updatePosterStyle(styleId, { thumbnailUrl: url || null });
      setStyles(prev => prev.map(s => s.id === styleId ? { ...s, thumbnailUrl: url || undefined } : s));
    } catch (err: any) {
      alert("Thumbnail kaydedilemedi: " + err.message);
    } finally {
      setEditingThumbnail(null);
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

  const handleSaveStyleEdit = async () => {
    if (!editingStyle && !isCreatingStyle) return;
    if (!styleEditForm.name.trim() || !styleEditForm.nameTr.trim()) {
      setStyleEditError("İsim (EN) ve İsim (TR) zorunlu");
      return;
    }
    setStyleEditSaving(true);
    setStyleEditError(null);
    try {
      if (isCreatingStyle) {
        // Yeni stil oluştur
        await api.createPosterStyle({
          name: styleEditForm.name,
          nameTr: styleEditForm.nameTr,
          description: styleEditForm.description,
          dallEPrompt: styleEditForm.dallEPrompt,
          backgroundHex: styleEditForm.backgroundHex || undefined,
          promptDirections: {
            styleDirective: styleEditForm.styleDirective,
            dallEPrompt: styleEditForm.dallEPrompt,
          },
        });
        setIsCreatingStyle(false);
        setPasteInput("");
        loadConfig(true);
      } else if (editingStyle) {
        // Mevcut stili güncelle
        await api.updatePosterStyle(editingStyle.id, {
          name: styleEditForm.name,
          nameTr: styleEditForm.nameTr,
          description: styleEditForm.description,
          dallEPrompt: styleEditForm.dallEPrompt,
          backgroundHex: styleEditForm.backgroundHex || null,
          promptDirections: {
            styleDirective: styleEditForm.styleDirective,
            dallEPrompt: styleEditForm.dallEPrompt,
          },
        });
        setStyles(prev => prev.map(s =>
          s.id === editingStyle.id
            ? {
                ...s,
                name: styleEditForm.name,
                nameTr: styleEditForm.nameTr,
                description: styleEditForm.description,
                dallEPrompt: styleEditForm.dallEPrompt,
                backgroundHex: styleEditForm.backgroundHex || undefined,
                promptDirections: {
                  styleDirective: styleEditForm.styleDirective,
                  dallEPrompt: styleEditForm.dallEPrompt,
                },
              }
            : s
        ));
        setEditingStyle(null);
      }
    } catch (err: any) {
      setStyleEditError(err.message || "Kaydedilemedi");
    } finally {
      setStyleEditSaving(false);
    }
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Poster Prompt Üret</h1>
        <p className="text-sm text-gray-500 mt-1">ChatGPT, Midjourney veya DALL-E için optimize edilmiş prompt</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        {/* Ürün Görseli + Referans Poster Analiz — yan yana */}
        <div className="grid grid-cols-2 gap-3">
          <ProductImageUpload
            label="Ürün Görseli *"
            previewUrl={productPreview}
            onImageReady={(base64, mimeType, prevUrl) => {
              setProductImageBase64(base64);
              setProductMimeType(mimeType);
              setProductPreview(prevUrl);
            }}
            onClear={() => {
              setProductImageBase64(null);
              setProductMimeType("image/jpeg");
              setProductPreview(null);
            }}
          />
          <PosterAnalyzer onStyleSaved={() => loadConfig(true)} />
        </div>

        {/* Stil Seçimi */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Tasarım Stili</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsCreatingStyle(true);
                  setPasteInput("");
                  setStyleEditForm({ name: "", nameTr: "", description: "", styleDirective: "", dallEPrompt: "", backgroundHex: "" });
                  setStyleEditError(null);
                }}
                className="text-xs text-violet-600 hover:text-violet-800 font-medium"
              >
                + Yeni Stil
              </button>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setStyleView("grid")}
                className={`px-2 py-1 transition ${styleView === "grid" ? "bg-gray-900 text-white" : "bg-white text-gray-400 hover:text-gray-600"}`}
                title="Grid"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setStyleView("list")}
                className={`px-2 py-1 transition ${styleView === "list" ? "bg-gray-900 text-white" : "bg-white text-gray-400 hover:text-gray-600"}`}
                title="Liste"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {styles.map(s => styleView === "list" ? (
              /* Liste görünümü — kompakt, hover önizleme destekli */
              <button
                key={s.id}
                onClick={() => setSelectedStyle(s.id)}
                onMouseEnter={e => s.thumbnailUrl && setHoveredThumb({ id: s.id, rect: e.currentTarget.getBoundingClientRect() })}
                onMouseLeave={() => setHoveredThumb(null)}
                className={`flex items-center gap-2.5 px-3 py-2 border rounded-xl text-left transition ${
                  selectedStyle === s.id
                    ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {s.thumbnailUrl && (
                  <img src={s.thumbnailUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-sm block truncate">{s.nameTr}</span>
                  {s.description && <span className="text-[10px] text-gray-400 block truncate">{s.description}</span>}
                </div>
              </button>
            ) : (
              <div
                key={s.id}
                className={`relative group border rounded-xl transition overflow-hidden ${
                  selectedStyle === s.id
                    ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {/* Thumbnail alanı */}
                {editingThumbnail === s.id ? (
                  <div className="p-2 bg-gray-50 border-b border-gray-200">
                    <input
                      type="text"
                      value={thumbnailInput}
                      onChange={e => setThumbnailInput(e.target.value)}
                      placeholder="https://... görsel URL yapıştır"
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mb-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === "Enter") handleSaveThumbnail(s.id);
                        if (e.key === "Escape") setEditingThumbnail(null);
                      }}
                    />
                    <div className="flex gap-1">
                      <button onClick={() => handleSaveThumbnail(s.id)} className="flex-1 text-xs bg-violet-600 text-white rounded-lg py-1 font-medium hover:bg-violet-700 transition">Kaydet</button>
                      <button onClick={() => setEditingThumbnail(null)} className="flex-1 text-xs bg-gray-100 text-gray-600 rounded-lg py-1 hover:bg-gray-200 transition">İptal</button>
                    </div>
                  </div>
                ) : s.thumbnailUrl ? (
                  <div
                    className="relative cursor-pointer"
                    onClick={() => setSelectedStyle(s.id)}
                    onMouseEnter={e => setHoveredThumb({ id: s.id, rect: e.currentTarget.getBoundingClientRect() })}
                    onMouseLeave={() => setHoveredThumb(null)}
                  >
                    <img src={s.thumbnailUrl} alt={s.nameTr} className="w-full h-24 object-cover" />
                    <button
                      onClick={e => { e.stopPropagation(); setEditingThumbnail(s.id); setThumbnailInput(s.thumbnailUrl || ""); }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/40 hover:bg-black/70 text-white rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Görseli değiştir"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); setEditingThumbnail(s.id); setThumbnailInput(""); }}
                    className="w-full h-10 flex items-center justify-center gap-1.5 text-gray-300 hover:text-violet-400 hover:bg-violet-50 border-b border-dashed border-gray-200 transition text-xs"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    örnek görsel ekle
                  </button>
                )}

                {/* Üst satır: isim + aksiyon butonları */}
                <div className="flex items-start justify-between gap-1 p-3 pb-1">
                  <button
                    onClick={() => setSelectedStyle(s.id)}
                    className="flex-1 text-left"
                  >
                    <span className="font-medium text-sm">{s.nameTr}</span>
                  </button>
                  <div className="flex gap-1 flex-shrink-0">
                    {/* Açıklama detayı */}
                    {s.description && (
                      <button
                        onClick={e => { e.stopPropagation(); setExpandedStyleDesc(expandedStyleDesc === s.id ? null : s.id); }}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                          expandedStyleDesc === s.id
                            ? "bg-violet-100 border-violet-300 text-violet-600"
                            : "bg-gray-50 border-gray-200 text-gray-400 hover:text-violet-600 hover:border-violet-300"
                        }`}
                        title="Açıklamayı gör"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}
                    {/* Düzenle */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setEditingStyle(s);
                        setStyleEditForm({
                          name: s.name,
                          nameTr: s.nameTr,
                          description: s.description,
                          styleDirective: toStyleDirective(s.promptDirections),
                          dallEPrompt: s.dallEPrompt || s.promptDirections?.dallEPrompt || s.examplePromptFragment || "",
                          backgroundHex: s.backgroundHex || s.defaultBackgroundHex || "",
                        });
                        setStyleEditError(null);
                      }}
                      className="w-6 h-6 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-violet-600 hover:border-violet-300 transition-colors"
                      title="Düzenle"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {/* Sil */}
                    <button
                      onClick={async e => {
                        e.stopPropagation();
                        const backup = [...styles];
                        setStyles(prev => prev.filter(x => x.id !== s.id));
                        if (selectedStyle === s.id) setSelectedStyle("");
                        if (expandedStyleDesc === s.id) setExpandedStyleDesc(null);
                        if (editingThumbnail === s.id) setEditingThumbnail(null);
                        try {
                          await api.deletePosterStyle(s.id);
                        } catch {
                          setStyles(backup);
                          alert("Silinemedi");
                        }
                      }}
                      className="w-6 h-6 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors"
                      title="Sil"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Kısa açıklama satırı */}
                {s.description && (
                  <button onClick={() => setSelectedStyle(s.id)} className="w-full px-3 pb-2 text-left">
                    <span className="text-xs text-gray-500 truncate block">{s.description}</span>
                  </button>
                )}

                {/* Açıklama detay paneli — inline expand */}
                {expandedStyleDesc === s.id && (
                  <div className="px-3 pb-3 -mt-1">
                    <p className="text-xs text-gray-600 bg-white border border-violet-100 rounded-lg p-2.5 leading-relaxed">{s.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mood Seçimi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mood</label>
          <select
            value={selectedMood}
            onChange={e => setSelectedMood(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
          >
            {moods.map(m => (
              <option key={m.id} value={m.id}>{m.nameTr}</option>
            ))}
          </select>
        </div>

        {/* Aspect Ratio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Boyut</label>
          <select
            value={selectedRatio}
            onChange={e => setSelectedRatio(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
          >
            {ratios.map(r => (
              <option key={r.id} value={r.id}>{r.label} — {r.useCase}</option>
            ))}
          </select>
        </div>

        {/* Tipografi — Başlık */}
        {typographies.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Başlık Tipografisi</label>
            <select
              value={selectedTitleTypography}
              onChange={e => setSelectedTitleTypography(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400"
            >
              <option value="">Otomatik</option>
              {typographies.map(t => (
                <option key={t.id} value={t.id}>{t.nameTr}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tipografi — Alt Başlık */}
        {typographies.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Alt Başlık Tipografisi</label>
            <select
              value={selectedSubtitleTypography}
              onChange={e => setSelectedSubtitleTypography(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
            >
              <option value="">Otomatik</option>
              {typographies.map(t => (
                <option key={t.id} value={t.id}>{t.nameTr}</option>
              ))}
            </select>
          </div>
        )}

        {/* Katman Sıralaması — sadece Exploded View stili seçilince */}
        {selectedStyle.includes("exploded") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Katman Sıralaması <span className="text-xs text-gray-400">(alttan üste, her satır bir katman)</span>
            </label>
            <InputWithRecent
              storageKey="poster_exploded_layers"
              value={explodedLayers}
              onChange={setExplodedLayers}
              placeholder={"Kroasan kase (alt)\nKaşar peynir\nOmlet\nFüme et\nMaydanoz (üst)"}
              multiline
              rows={4}
            />
            <p className="text-[10px] text-gray-400 mt-1">Her satır bir katman. En alttaki malzeme ilk satır, en üstteki son satır.</p>
          </div>
        )}

        {/* Metin Alanları */}
        <div className="grid grid-cols-2 gap-3">
          <InputWithRecent storageKey="poster_title" value={title} onChange={setTitle} placeholder="Taze Kruvasan" label="Başlık (boşsa AI önerir)" />
          <InputWithRecent storageKey="poster_subtitle" value={subtitle} onChange={setSubtitle} placeholder="El yapımı, tereyağlı" label="Alt Başlık (boşsa AI önerir)" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InputWithRecent storageKey="poster_price" value={price} onChange={setPrice} placeholder="₺85" label="Fiyat (opsiyonel)" />
          <InputWithRecent storageKey="poster_notes" value={additionalNotes} onChange={setAdditionalNotes} placeholder="Bahar temalı..." label="Ek Notlar (opsiyonel)" />
        </div>

        {/* Prompt Üret */}
        <PromptGenerator
          productImageBase64={productImageBase64}
          productMimeType={productMimeType}
          styleId={selectedStyle}
          moodId={selectedMood}
          aspectRatioId={selectedRatio}
          typographyId={selectedTitleTypography || undefined}
          subtitleTypographyId={selectedSubtitleTypography || undefined}
          title={title}
          subtitle={subtitle}
          price={price}
          additionalNotes={combinedAdditionalNotes}
        />
      </div>

      {/* Stil kartı görsel hover önizleme */}
      {hoveredThumb && (() => {
        const style = styles.find(s => s.id === hoveredThumb.id);
        if (!style?.thumbnailUrl) return null;
        const popupW = 320;
        const popupH = 360; // 320 görsel + ~40 metin
        const gap = 12;
        const spaceAbove = hoveredThumb.rect.top;
        const showAbove = spaceAbove > popupH + gap;
        const top = showAbove
          ? hoveredThumb.rect.top - popupH - gap
          : hoveredThumb.rect.bottom + gap;
        const centerX = hoveredThumb.rect.left + hoveredThumb.rect.width / 2 - popupW / 2;
        const left = Math.max(8, Math.min(window.innerWidth - popupW - 8, centerX));
        return createPortal(
          <div
            className="fixed z-[60] pointer-events-none bg-white rounded-xl shadow-2xl border border-gray-200 p-3"
            style={{ top, left, width: popupW }}
          >
            <img
              src={style.thumbnailUrl}
              alt={style.nameTr}
              className="w-full h-80 object-contain rounded-lg bg-gray-50"
            />
            <p className="text-xs text-gray-600 text-center mt-2 font-medium">{style.nameTr}</p>
          </div>,
          document.body
        );
      })()}

      {/* Stil Düzenleme / Oluşturma Modalı */}
      {(editingStyle || isCreatingStyle) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            {/* Başlık */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{isCreatingStyle ? "Yeni Stil Ekle" : "Stil Düzenle"}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{isCreatingStyle ? "Analiz çıktısını yapıştır veya elle doldur" : editingStyle?.nameTr}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const lines = [
                      `İsim (EN): ${styleEditForm.name}`,
                      `İsim (TR): ${styleEditForm.nameTr}`,
                      `Açıklama: ${styleEditForm.description}`,
                      ``,
                      `--- Stil Tarifi ---`,
                      styleEditForm.styleDirective,
                      ``,
                      `--- DALL-E Prompt ---`,
                      styleEditForm.dallEPrompt,
                    ].filter(l => l === "" || l.startsWith("---") || l.trim()).join("\n");
                    navigator.clipboard.writeText(lines);
                  }}
                  title="Tümünü kopyala"
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-violet-600 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => { setEditingStyle(null); setIsCreatingStyle(false); setPasteInput(""); }}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Analiz Yapıştır — sadece yeni stil oluştururken */}
              {isCreatingStyle && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Claude Analiz Çıktısını Yapıştır</label>
                  <textarea
                    rows={5}
                    value={pasteInput}
                    onChange={e => handlePasteAnalysis(e.target.value)}
                    placeholder={"Açıklama: ...\n\n--- Stil Tarifi ---\nBackground: ...\nTypography: ...\n\n--- DALL-E Prompt ---\nA professional product poster featuring {PRODUCT}..."}
                    className="w-full border-2 border-dashed border-violet-200 hover:border-violet-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400 resize-none font-mono bg-violet-50/30"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Yapıştırınca alanlar otomatik dolacak. İsim (EN/TR) elle yazılır.</p>
                </div>
              )}

              {/* Temel bilgiler */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">İsim (EN)</label>
                  <input
                    type="text"
                    value={styleEditForm.name}
                    onChange={e => setStyleEditForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">İsim (TR)</label>
                  <input
                    type="text"
                    value={styleEditForm.nameTr}
                    onChange={e => setStyleEditForm(f => ({ ...f, nameTr: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Açıklama</label>
                <textarea
                  rows={2}
                  value={styleEditForm.description}
                  onChange={e => setStyleEditForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">DALL-E Prompt Şablonu <span className="text-gray-400">({"{PRODUCT}"} placeholder)</span></label>
                <textarea
                  rows={4}
                  value={styleEditForm.dallEPrompt}
                  onChange={e => setStyleEditForm(f => ({ ...f, dallEPrompt: e.target.value }))}
                  placeholder="A professional product poster featuring {PRODUCT}..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none font-mono"
                />
              </div>

              {/* Arka Plan Rengi */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Arka Plan Rengi (opsiyonel)</label>
                <p className="text-[11px] text-gray-400 mb-2">Seçersen poster bu rengi arka plan olarak kullanır. Boş bırakırsan AI kendi seçer.</p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={styleEditForm.backgroundHex || "#ffffff"}
                    onChange={e => setStyleEditForm(f => ({ ...f, backgroundHex: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={styleEditForm.backgroundHex}
                    onChange={e => setStyleEditForm(f => ({ ...f, backgroundHex: e.target.value }))}
                    placeholder="#RRGGBB"
                    className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                  {styleEditForm.backgroundHex && (
                    <button
                      onClick={() => setStyleEditForm(f => ({ ...f, backgroundHex: "" }))}
                      className="text-xs text-gray-400 hover:text-red-500 transition"
                      title="Rengi kaldır"
                    >
                      Temizle
                    </button>
                  )}
                  {styleEditForm.backgroundHex && (
                    <div
                      className="w-10 h-10 rounded-lg border border-gray-200 shadow-inner"
                      style={{ backgroundColor: styleEditForm.backgroundHex }}
                    />
                  )}
                </div>
              </div>

              {/* Stil Tarifi */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Stil Tarifi (renk, ışık, tipografi, layout, atmosfer — hepsi burada)</label>
                <textarea
                  rows={10}
                  value={styleEditForm.styleDirective}
                  onChange={e => setStyleEditForm(f => ({ ...f, styleDirective: e.target.value }))}
                  placeholder={"Background: ...\nTypography: ...\nLayout: ...\nColor Palette: ...\nLighting: ...\nOverall Feel: ..."}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none font-mono"
                />
              </div>

              {/* Hata */}
              {styleEditError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{styleEditError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-6 pb-5">
              <button
                onClick={() => { setEditingStyle(null); setIsCreatingStyle(false); setPasteInput(""); }}
                disabled={styleEditSaving}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={handleSaveStyleEdit}
                disabled={styleEditSaving}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {styleEditSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Kaydediliyor...
                  </>
                ) : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

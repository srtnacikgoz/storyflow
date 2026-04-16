import { useState, useRef, useCallback } from "react";
import { toPng } from "html-to-image";

// --- Tipler ---

interface ChocolateItem {
  id: string;
  name: string;
  descriptionTr: string;
  descriptionEn: string;
  imageBase64: string;
}

// --- Stil Şablonları ---

const STYLE_TEMPLATES = [
  {
    key: "klasik-koyu",
    label: "Klasik Koyu",
    bg: "#2C1810",
    text: "#F5E6D0",
    accent: "#8B6914",
    fontFamily: "Georgia, 'Times New Roman', serif",
    description: "Lüks, geleneksel",
  },
  {
    key: "minimal-beyaz",
    label: "Minimal Beyaz",
    bg: "#FAFAF8",
    text: "#3D2B1F",
    accent: "#8B7355",
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
    description: "Modern, temiz",
  },
  {
    key: "altin-zarif",
    label: "Altın Zarif",
    bg: "#4A0E0E",
    text: "#D4AF37",
    accent: "#F5E6D0",
    fontFamily: "'Playfair Display', Georgia, serif",
    description: "Premium, hediye kutusu",
  },
] as const;

type StyleKey = (typeof STYLE_TEMPLATES)[number]["key"];

// --- Grid Şablonları ---

const GRID_TEMPLATES = [
  { key: "2x1", label: "2×1", cols: 2, rows: 1, count: 2, desc: "Öne çıkan ikili" },
  { key: "2x2", label: "2×2", cols: 2, rows: 2, count: 4, desc: "Küçük koleksiyon" },
  { key: "3x2", label: "3×2", cols: 3, rows: 2, count: 6, desc: "Orta koleksiyon" },
  { key: "4x2", label: "4×2", cols: 4, rows: 2, count: 8, desc: "Tam katalog sayfası" },
] as const;

type GridKey = (typeof GRID_TEMPLATES)[number]["key"];

// --- Export Formatları ---

const SINGLE_FORMATS = [
  { key: "insta-post", label: "Instagram Post", width: 1080, height: 1080 },
  { key: "insta-story", label: "Instagram Story", width: 1080, height: 1920 },
  { key: "a5", label: "A5 Baskı", width: 1748, height: 2480 },
] as const;

const GRID_FORMATS = [
  { key: "a4-landscape", label: "A4 Yatay", width: 4961, height: 3508 },
  { key: "a4-portrait", label: "A4 Dikey", width: 3508, height: 4961 },
  { key: "insta-post", label: "Instagram Post", width: 1080, height: 1080 },
  { key: "insta-carousel", label: "Instagram Carousel", width: 1080, height: 1350 },
] as const;

// --- Yardımcılar ---

const nextId = () => crypto.randomUUID();

function emptyItem(): ChocolateItem {
  return { id: nextId(), name: "", descriptionTr: "", descriptionEn: "", imageBase64: "" };
}

function handleImageUpload(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
}

// --- Bileşen ---

export default function CikolataPoster() {
  // Mod
  const [mode, setMode] = useState<"single" | "grid">("single");

  // Tek ürün
  const [singleItem, setSingleItem] = useState<ChocolateItem>(emptyItem());

  // Grid
  const [gridTemplate, setGridTemplate] = useState<GridKey>("2x2");
  const [gridItems, setGridItems] = useState<ChocolateItem[]>(() =>
    Array.from({ length: 4 }, emptyItem)
  );
  const [gridTitle, setGridTitle] = useState("Individual Chocolates");
  const [gridSubtitle, setGridSubtitle] = useState("Chocolats Individuelle");

  // Ortak
  const [styleKey, setStyleKey] = useState<StyleKey>("klasik-koyu");
  const [singleFormat, setSingleFormat] = useState("insta-post");
  const [gridFormat, setGridFormat] = useState("a4-landscape");
  const [downloading, setDownloading] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  const style = STYLE_TEMPLATES.find((s) => s.key === styleKey)!;
  const grid = GRID_TEMPLATES.find((g) => g.key === gridTemplate)!;

  // Grid şablonu değiştiğinde item sayısını güncelle
  const handleGridTemplateChange = useCallback((key: GridKey) => {
    setGridTemplate(key);
    const newGrid = GRID_TEMPLATES.find((g) => g.key === key)!;
    setGridItems((prev) => {
      if (prev.length >= newGrid.count) return prev.slice(0, newGrid.count);
      return [...prev, ...Array.from({ length: newGrid.count - prev.length }, emptyItem)];
    });
  }, []);

  // Fotoğraf yükle
  const handleSingleImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await handleImageUpload(file);
    setSingleItem((prev) => ({ ...prev, imageBase64: base64 }));
  }, []);

  const handleGridImage = useCallback(async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await handleImageUpload(file);
    setGridItems((prev) => prev.map((item, i) => (i === index ? { ...item, imageBase64: base64 } : item)));
  }, []);

  // Export
  const handleDownload = useCallback(async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    const formats = mode === "single" ? SINGLE_FORMATS : GRID_FORMATS;
    const formatKey = mode === "single" ? singleFormat : gridFormat;
    const fmt = formats.find((f) => f.key === formatKey)!;
    try {
      const dataUrl = await toPng(previewRef.current, {
        width: fmt.width,
        height: fmt.height,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `cikolata-${mode}-${formatKey}.png`;
      link.click();
    } finally {
      setDownloading(false);
    }
  }, [mode, singleFormat, gridFormat]);

  // Format boyutları (önizleme oranı için)
  const currentFormat = mode === "single"
    ? SINGLE_FORMATS.find((f) => f.key === singleFormat)!
    : GRID_FORMATS.find((f) => f.key === gridFormat)!;
  const aspectRatio = currentFormat.width / currentFormat.height;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Başlık */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Çikolata Katalog</h1>
        <p className="text-gray-500 text-sm mt-1">
          Çikolata ürünleri için tek kart ve katalog sayfaları oluştur
        </p>
      </div>

      {/* Mod seçimi */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 max-w-xs">
        {([
          { key: "single", label: "Tek Ürün" },
          { key: "grid", label: "Katalog Grid" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── SOL PANEL: Girdiler ─── */}
        <div className="space-y-4">
          {/* Stil seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stil Şablonu</label>
            <div className="grid grid-cols-3 gap-2">
              {STYLE_TEMPLATES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStyleKey(s.key)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    styleKey === s.key ? "border-amber-500" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded-full border" style={{ background: s.bg }} />
                    <div className="w-4 h-4 rounded-full border" style={{ background: s.text }} />
                  </div>
                  <p className="text-xs font-medium text-gray-800">{s.label}</p>
                  <p className="text-xs text-gray-400">{s.description}</p>
                </button>
              ))}
            </div>
          </div>

          {mode === "single" ? (
            <>
              {/* Tek ürün girdileri */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fotoğraf</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-amber-400 transition-colors">
                  {singleItem.imageBase64 ? (
                    <div className="relative">
                      <img src={singleItem.imageBase64} alt="" className="max-h-40 mx-auto rounded-lg" />
                      <button
                        onClick={() => setSingleItem((p) => ({ ...p, imageBase64: "" }))}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <p className="text-sm text-gray-500">Fotoğraf yükle</p>
                      <input type="file" accept="image/*" onChange={handleSingleImage} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı</label>
                <input
                  type="text"
                  value={singleItem.name}
                  onChange={(e) => setSingleItem((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Palet Or"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama (TR)</label>
                <input
                  type="text"
                  value={singleItem.descriptionTr}
                  onChange={(e) => setSingleItem((p) => ({ ...p, descriptionTr: e.target.value }))}
                  placeholder="Kahve infüzyonlu ganaj, bitter çikolata kaplama"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (EN)</label>
                <input
                  type="text"
                  value={singleItem.descriptionEn}
                  onChange={(e) => setSingleItem((p) => ({ ...p, descriptionEn: e.target.value }))}
                  placeholder="Coffee ganache with dark chocolate coating"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Çıktı Formatı</label>
                <select
                  value={singleFormat}
                  onChange={(e) => setSingleFormat(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {SINGLE_FORMATS.map((f) => (
                    <option key={f.key} value={f.key}>{f.label} ({f.width}×{f.height})</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Grid girdileri */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grid Düzeni</label>
                <div className="grid grid-cols-4 gap-2">
                  {GRID_TEMPLATES.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => handleGridTemplateChange(g.key)}
                      className={`p-2 rounded-lg border-2 text-center transition-colors ${
                        gridTemplate === g.key ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="text-sm font-medium">{g.label}</p>
                      <p className="text-xs text-gray-400">{g.count} ürün</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                  <input
                    type="text"
                    value={gridTitle}
                    onChange={(e) => setGridTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alt Başlık</label>
                  <input
                    type="text"
                    value={gridSubtitle}
                    onChange={(e) => setGridSubtitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {/* Ürün listesi */}
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {gridItems.map((item, idx) => (
                  <div key={item.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <p className="text-xs font-medium text-gray-500 mb-2">Ürün {idx + 1}</p>
                    <div className="flex gap-3">
                      {/* Mini fotoğraf */}
                      <div className="w-16 h-16 flex-shrink-0 border border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
                        {item.imageBase64 ? (
                          <img src={item.imageBase64} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <label className="cursor-pointer flex items-center justify-center w-full h-full text-gray-400 text-xs">
                            +
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleGridImage(idx, e)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                      {/* Metin alanları */}
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => setGridItems((prev) => prev.map((it, i) => i === idx ? { ...it, name: e.target.value } : it))}
                          placeholder="Ürün adı"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                        />
                        <input
                          type="text"
                          value={item.descriptionTr}
                          onChange={(e) => setGridItems((prev) => prev.map((it, i) => i === idx ? { ...it, descriptionTr: e.target.value } : it))}
                          placeholder="Açıklama (TR)"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                        />
                        <input
                          type="text"
                          value={item.descriptionEn}
                          onChange={(e) => setGridItems((prev) => prev.map((it, i) => i === idx ? { ...it, descriptionEn: e.target.value } : it))}
                          placeholder="Description (EN)"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      {/* Fotoğraf değiştir/sil */}
                      {item.imageBase64 && (
                        <button
                          onClick={() => setGridItems((prev) => prev.map((it, i) => i === idx ? { ...it, imageBase64: "" } : it))}
                          className="text-red-400 hover:text-red-600 text-xs self-start"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Çıktı Formatı</label>
                <select
                  value={gridFormat}
                  onChange={(e) => setGridFormat(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {GRID_FORMATS.map((f) => (
                    <option key={f.key} value={f.key}>{f.label} ({f.width}×{f.height})</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* İndir butonu */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {downloading ? "İndiriliyor..." : "PNG İndir"}
          </button>
        </div>

        {/* ─── SAĞ PANEL: Canlı Önizleme ─── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Canlı Önizleme</label>
          <div
            className="border border-gray-200 rounded-xl overflow-hidden"
            style={{ aspectRatio: aspectRatio }}
          >
            <div
              ref={previewRef}
              style={{
                width: "100%",
                height: "100%",
                background: style.bg,
                color: style.text,
                fontFamily: style.fontFamily,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {mode === "single" ? (
                /* ─── Tek Ürün Önizleme ─── */
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", padding: "8%" }}>
                  {/* Fotoğraf */}
                  {singleItem.imageBase64 ? (
                    <img
                      src={singleItem.imageBase64}
                      alt=""
                      style={{
                        maxWidth: "60%",
                        maxHeight: "50%",
                        objectFit: "contain",
                        borderRadius: "4px",
                        marginBottom: "5%",
                      }}
                    />
                  ) : (
                    <div style={{
                      width: "50%",
                      height: "40%",
                      border: `2px dashed ${style.text}33`,
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "5%",
                      fontSize: "0.7em",
                      opacity: 0.4,
                    }}>
                      Fotoğraf
                    </div>
                  )}

                  {/* Dekoratif çizgi */}
                  <div style={{ width: "30%", height: "1px", background: style.accent, marginBottom: "3%", opacity: 0.6 }} />

                  {/* Ürün adı */}
                  <p style={{
                    fontSize: "1.2em",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    marginBottom: "2%",
                    textAlign: "center",
                  }}>
                    {singleItem.name || "Ürün Adı"}
                  </p>

                  {/* Açıklama TR */}
                  <p style={{ fontSize: "0.65em", opacity: 0.8, textAlign: "center", maxWidth: "70%", lineHeight: 1.5 }}>
                    {singleItem.descriptionTr || "Açıklama"}
                  </p>

                  {/* Açıklama EN */}
                  {singleItem.descriptionEn && (
                    <p style={{ fontSize: "0.55em", opacity: 0.5, textAlign: "center", maxWidth: "70%", lineHeight: 1.5, fontStyle: "italic", marginTop: "1%" }}>
                      {singleItem.descriptionEn}
                    </p>
                  )}

                  {/* Marka */}
                  <p style={{
                    position: "absolute",
                    bottom: "4%",
                    fontSize: "0.5em",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    opacity: 0.4,
                  }}>
                    Sade Patisserie
                  </p>
                </div>
              ) : (
                /* ─── Katalog Grid Önizleme ─── */
                <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "4%" }}>
                  {/* Başlık */}
                  <div style={{ textAlign: "center", marginBottom: "3%" }}>
                    <p style={{
                      fontSize: "1em",
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                    }}>
                      {gridTitle}
                    </p>
                    {gridSubtitle && (
                      <p style={{ fontSize: "0.55em", opacity: 0.5, fontStyle: "italic", marginTop: "0.5%", letterSpacing: "0.1em" }}>
                        {gridSubtitle}
                      </p>
                    )}
                    <div style={{ width: "15%", height: "1px", background: style.accent, margin: "2% auto 0", opacity: 0.4 }} />
                  </div>

                  {/* Grid */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
                    gap: "3%",
                    flex: 1,
                    alignContent: "center",
                  }}>
                    {gridItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textAlign: "center",
                          gap: "4%",
                        }}
                      >
                        {/* Fotoğraf */}
                        {item.imageBase64 ? (
                          <img
                            src={item.imageBase64}
                            alt=""
                            style={{
                              width: "65%",
                              aspectRatio: "1",
                              objectFit: "contain",
                              borderRadius: "3px",
                            }}
                          />
                        ) : (
                          <div style={{
                            width: "55%",
                            aspectRatio: "1",
                            border: `1px dashed ${style.text}22`,
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.4em",
                            opacity: 0.3,
                          }}>
                            +
                          </div>
                        )}
                        {/* Ad */}
                        <p style={{
                          fontSize: "0.5em",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          lineHeight: 1.2,
                        }}>
                          {item.name || "Ürün"}
                        </p>
                        {/* Açıklama */}
                        {item.descriptionTr && (
                          <p style={{ fontSize: "0.35em", opacity: 0.6, lineHeight: 1.4, maxWidth: "90%" }}>
                            {item.descriptionTr}
                          </p>
                        )}
                        {item.descriptionEn && (
                          <p style={{ fontSize: "0.3em", opacity: 0.4, lineHeight: 1.4, fontStyle: "italic", maxWidth: "90%" }}>
                            {item.descriptionEn}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div style={{ textAlign: "center", marginTop: "2%" }}>
                    <p style={{ fontSize: "0.4em", letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.3 }}>
                      Sade Patisserie
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

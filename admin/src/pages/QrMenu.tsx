import { useState, useEffect } from "react";
import { api } from "../services/api";
import QrMenuPromptGenerator from "../components/qr-menu/QrMenuPromptGenerator";

/* ────────────────────────────────────────────────────
   Görsel-odaklı stil formu (tipografi yok)
   ──────────────────────────────────────────────────── */
interface VisualStyleForm {
  name: string;
  nameTr: string;
  description: string;
  examplePromptFragment: string;
  background: string;
  lighting: string;
  colorPalette: string;
  layout: string;
  productPlacement: string;
  overallFeel: string;
}

const EMPTY_FORM: VisualStyleForm = {
  name: "", nameTr: "", description: "", examplePromptFragment: "",
  background: "", lighting: "", colorPalette: "", layout: "",
  productPlacement: "", overallFeel: "",
};

const VISUAL_FIELDS: { key: keyof VisualStyleForm; label: string; rows: number }[] = [
  { key: "name", label: "Stil Adı (EN)", rows: 1 },
  { key: "nameTr", label: "Stil Adı (TR)", rows: 1 },
  { key: "description", label: "Açıklama / Teknik Notlar", rows: 2 },
  { key: "colorPalette", label: "Renk Paleti", rows: 2 },
  { key: "background", label: "Arka Plan & Yüzey", rows: 2 },
  { key: "lighting", label: "Işık", rows: 2 },
  { key: "layout", label: "Kompozisyon & Açı", rows: 2 },
  { key: "productPlacement", label: "Ürün Yerleşimi & Ölçek", rows: 2 },
  { key: "overallFeel", label: "Genel Atmosfer", rows: 2 },
  { key: "examplePromptFragment", label: "Görsel Prompt Parçası", rows: 3 },
];

/** Backend DNA → görsel stil formu (tipografi atlanıyor) */
function dnaToVisualForm(dna: any): VisualStyleForm {
  const color = dna.colorDNA || {};
  const comp = dna.compositionDNA || {};
  const light = dna.lightingDNA || {};
  const atm = dna.atmosphereDNA || {};
  const gen = dna.generationPrompt || {};

  const colorPalette = (() => {
    const colors = (color.dominantColors || [])
      .map((c: any) => `${c.role}: ${c.hex} (${c.percentage || "?"}%)`)
      .join(", ");
    const extras = [
      color.harmonyType && `harmony: ${color.harmonyType}`,
      color.overallTemperature && `temperature: ${color.overallTemperature}`,
      color.saturationLevel && `saturation: ${color.saturationLevel}`,
      color.colorGrade && `grade: ${color.colorGrade}`,
    ].filter(Boolean).join("; ");
    return [colors, extras].filter(Boolean).join(" — ");
  })();

  const background = (() => {
    const bgColor = (color.dominantColors || []).find((c: any) =>
      c.role?.toLowerCase().includes("background") || c.role?.toLowerCase().includes("bg")
    );
    return [
      bgColor && `background color ${bgColor.hex}`,
      atm.textureOverlay && atm.textureOverlay !== "none" && `${atm.textureOverlay} texture`,
      atm.vignetteStrength && atm.vignetteStrength !== "none" && `${atm.vignetteStrength} vignette`,
      color.colorGrade,
    ].filter(Boolean).join(", ");
  })();

  const layout = comp.promptDescription || [
    comp.gridType, comp.balance,
    comp.negativeSpaceRatio && `${comp.negativeSpaceRatio} negative space`,
    comp.visualFlow && `${comp.visualFlow} visual flow`,
  ].filter(Boolean).join(", ");

  const productPlacement = [
    comp.productPlacement, comp.productScale,
  ].filter(Boolean).join(", ");

  const lighting = light.promptDescription || [
    light.pattern && `${light.pattern} lighting`,
    light.quality, light.direction, light.colorTemperature,
    light.keyToFillRatio && `${light.keyToFillRatio} key-to-fill`,
    light.shadowDescription,
  ].filter(Boolean).join(", ");

  const overallFeel = atm.promptDescription || [
    (atm.moodAdjectives || []).join(", "),
    atm.grainLevel && atm.grainLevel !== "none" && atm.grainLevel,
    atm.depthEffect, atm.styleEra,
  ].filter(Boolean).join(", ");

  return {
    name: dna.styleName || "",
    nameTr: dna.styleName || "",
    description: dna.technicalNotes || "",
    examplePromptFragment: gen.lowLevel || gen.highLevel || "",
    background, lighting, colorPalette, layout, productPlacement, overallFeel,
  };
}

/* ────────────────────────────────────────────────────
   QR Menü Sayfası
   ──────────────────────────────────────────────────── */
export default function QrMenu() {
  // Görsel analiz state'leri
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  const [dna, setDna] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Stil formu (adım 2)
  const [step, setStep] = useState<1 | 2>(1);
  const [styleForm, setStyleForm] = useState<VisualStyleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Mevcut stiller
  const [styles, setStyles] = useState<any[]>([]);
  const [stylesLoading, setStylesLoading] = useState(true);

  useEffect(() => {
    loadStyles();
  }, []);

  const loadStyles = async () => {
    setStylesLoading(true);
    try {
      const res = await api.listPosterStyles();
      setStyles(res);
    } catch {
      // sessiz — stiller yüklenemezse sayfa çalışmaya devam etsin
    } finally {
      setStylesLoading(false);
    }
  };

  const loadFile = (file: File) => {
    setImageMimeType(file.type);
    setDna(null);
    setError(null);
    setStep(1);
    setSaved(false);
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64((reader.result as string).split(",")[1]);
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) loadFile(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setAnalyzing(true);
    setError(null);
    setDna(null);
    try {
      const res = await api.analyzePosterDesign(imageBase64, imageMimeType);
      setDna(res);
    } catch (err: any) {
      setError(err.message || "Analiz başarısız");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleToStep2 = () => {
    setStyleForm(dnaToVisualForm(dna));
    setSaveError(null);
    setSaved(false);
    setStep(2);
  };

  const handleSave = async () => {
    if (!styleForm.name.trim()) {
      setSaveError("Stil adı boş olamaz");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await api.createPosterStyle({
        name: styleForm.name,
        nameTr: styleForm.nameTr || styleForm.name,
        description: styleForm.description,
        examplePromptFragment: styleForm.examplePromptFragment,
        promptDirections: {
          background: styleForm.background,
          typography: "", // QR menüde tipografi yok
          layout: styleForm.layout,
          colorPalette: styleForm.colorPalette,
          productPlacement: styleForm.productPlacement,
          lighting: styleForm.lighting,
          overallFeel: styleForm.overallFeel,
        },
      });
      setSaved(true);
      loadStyles();
    } catch (err: any) {
      setSaveError(err.message || "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setImageBase64(null);
    setImagePreview(null);
    setDna(null);
    setError(null);
    setStep(1);
    setSaved(false);
    setSaveError(null);
    setStyleForm(EMPTY_FORM);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QR Menü</h1>
        <p className="text-gray-500 text-sm mt-1">
          Standart görsel stili belirle — tüm ürünler aynı arka plan, açı, ışık ve kompozisyonla üretilecek
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ─── SOL: Görsel Analiz ─── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">Görsel Analiz</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {step === 1 ? "Referans görselden görsel DNA çıkar" : "Görsel stil olarak kaydet"}
                  </p>
                </div>
                {dna && (
                  <div className="flex items-center gap-1.5">
                    <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium ${step === 1 ? "bg-teal-600 text-white" : "bg-teal-100 text-teal-600"}`}>1</span>
                    <div className="w-4 h-px bg-gray-300" />
                    <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium ${step === 2 ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-400"}`}>2</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* ── ADIM 1: Görsel Yükle & Analiz ── */}
              {step === 1 && (
                <>
                  {!imagePreview ? (
                    <label
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition ${
                        dragging ? "border-teal-500 bg-teal-50 scale-[1.01]" : "border-gray-200 hover:border-teal-400 hover:bg-teal-50/30"
                      }`}
                      onDrop={handleDrop}
                      onDragOver={e => { e.preventDefault(); setDragging(true); }}
                      onDragEnter={() => setDragging(true)}
                      onDragLeave={() => setDragging(false)}
                    >
                      <svg className={`w-10 h-10 mb-3 transition ${dragging ? "text-teal-400" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-500 font-medium">{dragging ? "Bırak!" : "Referans görsel yükle"}</p>
                      <p className="text-xs text-gray-400 mt-1">İstediğin görsel stili yakalamak için bir örnek sürükle veya tıkla</p>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  ) : (
                    <div className="flex gap-4">
                      <div className="relative flex-shrink-0">
                        <img src={imagePreview} alt="Referans" className="w-32 h-32 object-cover rounded-xl border border-gray-200" />
                        <label className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/40 hover:bg-black/70 text-white rounded-md flex items-center justify-center cursor-pointer transition">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        {!dna && !analyzing && (
                          <div>
                            <p className="text-xs text-gray-500 mb-3">Görsel yüklendi. Görsel DNA analizi başlatılabilir.</p>
                            <ul className="text-xs text-gray-400 space-y-1 mb-4">
                              <li>· Renk paleti (hex, sıcaklık, kontrast)</li>
                              <li>· Arka plan & yüzey dokusu</li>
                              <li>· Işık tipi, yönü, kalitesi</li>
                              <li>· Kompozisyon & ürün yerleşimi</li>
                              <li>· Atmosfer & genel hava</li>
                            </ul>
                            <button
                              onClick={handleAnalyze}
                              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-sm font-medium transition"
                            >
                              Görsel DNA Analizi Başlat
                            </button>
                          </div>
                        )}
                        {analyzing && (
                          <div className="flex flex-col items-center justify-center h-full gap-3">
                            <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                            <p className="text-xs text-gray-500 text-center">Renk, ışık, arka plan ve kompozisyon analiz ediliyor...</p>
                          </div>
                        )}
                        {dna && !dna.error && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-700">Analiz tamamlandı</p>
                            <div className="space-y-1">
                              {dna.styleName && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">Stil</span>
                                  <span className="font-medium text-gray-800">{dna.styleName}</span>
                                </div>
                              )}
                              {dna.moodName && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">Mood</span>
                                  <span className="font-medium text-gray-800">{dna.moodName}</span>
                                </div>
                              )}
                              {dna.reproducibility?.score && (
                                <div className="flex justify-between text-xs items-center">
                                  <span className="text-gray-500">Yeniden üretilebilirlik</span>
                                  <span className={`font-semibold ${
                                    dna.reproducibility.score >= 80 ? "text-emerald-600" :
                                    dna.reproducibility.score >= 60 ? "text-amber-600" : "text-red-500"
                                  }`}>{dna.reproducibility.score}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl">{error}</div>
                  )}

                  {/* Analiz sonuç kartları — sadece görsel DNA */}
                  {dna && !dna.error && (
                    <div className="space-y-3">
                      {/* Renk DNA */}
                      {dna.colorDNA?.dominantColors?.length > 0 && (
                        <div className="border border-gray-100 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Renk Paleti</p>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {dna.colorDNA.dominantColors.map((c: any, i: number) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded border border-gray-200 flex-shrink-0" style={{ backgroundColor: c.hex }} />
                                <span className="text-xs text-gray-600 font-mono">{c.hex}</span>
                                <span className="text-xs text-gray-400">{c.role}</span>
                              </div>
                            ))}
                          </div>
                          {dna.colorDNA.colorGrade && (
                            <p className="text-xs text-gray-500 italic">{dna.colorDNA.colorGrade}</p>
                          )}
                        </div>
                      )}

                      {/* Işık DNA */}
                      {dna.lightingDNA?.promptDescription && (
                        <div className="border border-gray-100 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Işık</p>
                          <p className="text-xs text-gray-600 font-mono leading-relaxed">{dna.lightingDNA.promptDescription}</p>
                        </div>
                      )}

                      {/* Kompozisyon DNA */}
                      {dna.compositionDNA?.promptDescription && (
                        <div className="border border-gray-100 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Kompozisyon & Açı</p>
                          <p className="text-xs text-gray-600 font-mono leading-relaxed">{dna.compositionDNA.promptDescription}</p>
                        </div>
                      )}

                      {/* Atmosfer DNA */}
                      {dna.atmosphereDNA?.promptDescription && (
                        <div className="border border-gray-100 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Atmosfer</p>
                          <p className="text-xs text-gray-600 font-mono leading-relaxed">{dna.atmosphereDNA.promptDescription}</p>
                        </div>
                      )}

                      {/* Teknik notlar */}
                      {dna.technicalNotes && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                          <p className="text-xs font-semibold text-amber-700 mb-1">Teknik Notlar</p>
                          <p className="text-xs text-amber-800 leading-relaxed">{dna.technicalNotes}</p>
                        </div>
                      )}

                      {dna.reproducibility?.comment && (
                        <p className="text-xs text-gray-400 leading-relaxed">{dna.reproducibility.comment}</p>
                      )}
                    </div>
                  )}

                  {dna?.error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-xs text-red-700 font-medium">Analiz JSON'u parse edilemedi</p>
                      <p className="text-xs text-red-500 mt-1 font-mono break-all">{dna.raw?.slice(0, 200)}</p>
                    </div>
                  )}

                  {/* Aksiyon butonları */}
                  {dna && !dna.error && (
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleReset}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
                      >
                        Farklı Görsel
                      </button>
                      <button
                        onClick={handleToStep2}
                        className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition"
                      >
                        Görsel Stil Oluştur →
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ── ADIM 2: Görsel Stil Formu ── */}
              {step === 2 && (
                <div className="space-y-3">
                  {saved ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">"{styleForm.nameTr}" kaydedildi</p>
                      <p className="text-xs text-gray-500 mt-1">Bu stil tüm QR menü ürün görselleri için kullanılabilir</p>
                      <button onClick={handleReset} className="mt-4 text-xs text-teal-600 hover:underline">Yeni Analiz Yap</button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500">Görsel DNA'dan otomatik dolduruldu. Kaydetmeden önce düzenleyebilirsin.</p>
                      {VISUAL_FIELDS.map(({ key, label, rows }) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                          {rows === 1 ? (
                            <input
                              type="text"
                              value={styleForm[key]}
                              onChange={e => setStyleForm(f => ({ ...f, [key]: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
                            />
                          ) : (
                            <textarea
                              rows={rows}
                              value={styleForm[key]}
                              onChange={e => setStyleForm(f => ({ ...f, [key]: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-teal-400 resize-none"
                            />
                          )}
                        </div>
                      ))}
                      {saveError && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
                      )}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setStep(1)}
                          disabled={saving}
                          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                        >
                          ← Geri
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {saving ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Kaydediliyor...
                            </>
                          ) : "Stili Kaydet"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Prompt Üretici */}
          <QrMenuPromptGenerator styles={styles} />
        </div>

        {/* ─── SAĞ: Tasarım Stilleri ─── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-800">Tasarım Stilleri</h2>
              <p className="text-xs text-gray-400 mt-0.5">Kaydedilen görsel standartlar</p>
            </div>

            <div className="p-4">
              {stylesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
                </div>
              ) : styles.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-400">Henüz kayıtlı stil yok</p>
                  <p className="text-xs text-gray-300 mt-0.5">Bir referans görsel analiz ederek ilk stilini oluştur</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {styles.map((s: any) => (
                    <StyleCard key={s.id} style={s} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──── Stil Kartı ──── */
function StyleCard({ style }: { style: any }) {
  const [expanded, setExpanded] = useState(false);
  const dirs = style.promptDirections || {};

  // promptDirections'tan görsel alanları göster (typography hariç)
  const visualEntries = [
    { label: "Arka Plan", value: dirs.background },
    { label: "Işık", value: dirs.lighting },
    { label: "Renk", value: dirs.colorPalette },
    { label: "Kompozisyon", value: dirs.layout },
    { label: "Ürün Yerleşimi", value: dirs.productPlacement },
    { label: "Atmosfer", value: dirs.overallFeel },
  ].filter(e => e.value);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {style.thumbnailUrl ? (
            <img src={style.thumbnailUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{style.nameTr || style.name}</p>
            {style.description && (
              <p className="text-xs text-gray-400 truncate">{style.description}</p>
            )}
          </div>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && visualEntries.length > 0 && (
        <div className="px-4 pb-3 space-y-2 border-t border-gray-50">
          {visualEntries.map(({ label, value }) => (
            <div key={label} className="pt-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
              <p className="text-xs text-gray-600 font-mono leading-relaxed mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
import { api } from "../../services/api";

interface PosterAnalyzerProps {
  onStyleSaved?: () => void;
}

interface StyleForm {
  name: string;
  nameTr: string;
  description: string;
  examplePromptFragment: string;
  background: string;
  typography: string;
  layout: string;
  colorPalette: string;
  productPlacement: string;
  lighting: string;
  overallFeel: string;
}

/**
 * DNA → promptDirections dönüşümü (frontend)
 * Backend'den gelen zengin analiz verisini stil formatına çevirir
 */
function dnaToStyleForm(dna: any): StyleForm {
  const color = dna.colorDNA || {};
  const typo = dna.typographyDNA || {};
  const comp = dna.compositionDNA || {};
  const light = dna.lightingDNA || {};
  const atm = dna.atmosphereDNA || {};
  const gen = dna.generationPrompt || {};

  // colorPalette: dominant renkleri hex + rol + ton bilgisiyle yaz
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

  // background: arka plan rengi + doku + vignette
  const background = (() => {
    const bgColor = (color.dominantColors || []).find((c: any) =>
      c.role?.toLowerCase().includes("background") || c.role?.toLowerCase().includes("bg")
    );
    const parts = [
      bgColor && `background color ${bgColor.hex}`,
      atm.textureOverlay && atm.textureOverlay !== "none" && `${atm.textureOverlay} texture`,
      atm.vignetteStrength && atm.vignetteStrength !== "none" && `${atm.vignetteStrength} vignette`,
      color.colorGrade,
    ].filter(Boolean);
    return parts.join(", ");
  })();

  // typography: birincil font DNA'sı
  const typography = typo.primaryFont?.promptDescription || (() => {
    const pf = typo.primaryFont || {};
    return [
      pf.classification,
      pf.weight,
      pf.capitalization,
      pf.letterSpacing && `letter-spacing ${pf.letterSpacing}`,
      pf.textColor && `color ${pf.textColor}`,
    ].filter(Boolean).join(", ");
  })();

  // layout: kompozisyon promptu
  const layout = comp.promptDescription || [
    comp.gridType,
    comp.balance,
    comp.negativeSpaceRatio && `${comp.negativeSpaceRatio} negative space`,
    comp.visualFlow && `${comp.visualFlow} visual flow`,
  ].filter(Boolean).join(", ");

  // productPlacement: ürün yerleşimi + ölçek
  const productPlacement = [
    comp.productPlacement,
    comp.productScale,
    comp.textZone && `text ${comp.textZone}`,
  ].filter(Boolean).join(", ");

  // lighting: ışık promptu
  const lighting = light.promptDescription || [
    light.pattern && `${light.pattern} lighting`,
    light.quality,
    light.direction,
    light.colorTemperature,
    light.keyToFillRatio && `${light.keyToFillRatio} key-to-fill`,
    light.shadowDescription,
  ].filter(Boolean).join(", ");

  // overallFeel: atmosfer promptu
  const overallFeel = atm.promptDescription || [
    (atm.moodAdjectives || []).join(", "),
    atm.grainLevel && atm.grainLevel !== "none" && atm.grainLevel,
    atm.depthEffect,
    atm.styleEra,
  ].filter(Boolean).join(", ");

  // examplePromptFragment: lowLevel teknik paragraf (direkt Gemini'ye yazılabilir)
  const examplePromptFragment = gen.lowLevel || gen.highLevel || "";

  return {
    name: dna.styleName || "",
    nameTr: dna.styleName || "",
    description: dna.technicalNotes || "",
    examplePromptFragment,
    background,
    typography,
    layout,
    colorPalette,
    productPlacement,
    lighting,
    overallFeel,
  };
}

const FORM_FIELDS: { key: keyof StyleForm; label: string; rows: number; mono?: boolean }[] = [
  { key: "name", label: "Stil Adı (EN)", rows: 1 },
  { key: "nameTr", label: "Stil Adı (TR)", rows: 1 },
  { key: "description", label: "Açıklama / Teknik Notlar", rows: 2 },
  { key: "colorPalette", label: "Renk Paleti", rows: 2, mono: true },
  { key: "background", label: "Arka Plan", rows: 2, mono: true },
  { key: "typography", label: "Tipografi", rows: 2, mono: true },
  { key: "layout", label: "Kompozisyon (layout)", rows: 2, mono: true },
  { key: "productPlacement", label: "Ürün Yerleşimi", rows: 2, mono: true },
  { key: "lighting", label: "Işık", rows: 2, mono: true },
  { key: "overallFeel", label: "Genel Hava", rows: 2, mono: true },
  { key: "examplePromptFragment", label: "Örnek Prompt Parçası (lowLevel)", rows: 3, mono: true },
];

export default function PosterAnalyzer({ onStyleSaved }: PosterAnalyzerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  const [dna, setDna] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Adım 2: stil formu
  const [step, setStep] = useState<1 | 2>(1);
  const [styleForm, setStyleForm] = useState<StyleForm>({
    name: "", nameTr: "", description: "", examplePromptFragment: "",
    background: "", typography: "", layout: "", colorPalette: "",
    productPlacement: "", lighting: "", overallFeel: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
    setImageBase64(null);
    setImagePreview(null);
    setDna(null);
    setError(null);
    setStep(1);
    setSaved(false);
    setSaveError(null);
  };

  const loadFile = (file: File) => {
    setImageMimeType(file.type);
    setDna(null);
    setError(null);
    setStep(1);
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
    const form = dnaToStyleForm(dna);
    setStyleForm(form);
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
          typography: styleForm.typography,
          layout: styleForm.layout,
          colorPalette: styleForm.colorPalette,
          productPlacement: styleForm.productPlacement,
          lighting: styleForm.lighting,
          overallFeel: styleForm.overallFeel,
        },
      });
      setSaved(true);
      onStyleSaved?.();
    } catch (err: any) {
      setSaveError(err.message || "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs text-violet-600 hover:text-violet-800 font-medium"
      >
        Referans poster analiz et
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">

        {/* Başlık */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Poster Analizi</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 1 ? "Referans posterden stil DNA'sı çıkar" : "Stil olarak kaydet"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Adım göstergesi */}
            {dna && (
              <div className="flex items-center gap-1.5">
                <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium ${step === 1 ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-600"}`}>1</span>
                <div className="w-4 h-px bg-gray-300" />
                <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium ${step === 2 ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-400"}`}>2</span>
              </div>
            )}
            <button onClick={handleClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* İçerik */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* ── ADIM 1: Görsel + Analiz Özeti ── */}
          {step === 1 && (
            <>
              {/* Görsel yükleme */}
              {!imagePreview ? (
                <label
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition ${
                    dragging
                      ? "border-violet-500 bg-violet-50 scale-[1.01]"
                      : "border-gray-200 hover:border-violet-400 hover:bg-violet-50/30"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragEnter={() => setDragging(true)}
                  onDragLeave={() => setDragging(false)}
                >
                  <svg className={`w-8 h-8 mb-2 transition ${dragging ? "text-violet-400" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">{dragging ? "Bırak!" : "Sürükle bırak veya tıkla"}</p>
                  <p className="text-xs text-gray-400 mt-0.5">PNG · JPG · WebP</p>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              ) : (
                <div className="flex gap-4">
                  <div className="relative flex-shrink-0">
                    <img src={imagePreview} alt="Referans" className="w-28 h-40 object-cover rounded-xl border border-gray-200" />
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
                        <p className="text-xs text-gray-500 mb-3">Görsel yüklendi. Forensik analiz başlatılabilir.</p>
                        <ul className="text-xs text-gray-400 space-y-1 mb-4">
                          <li>· Renk DNA'sı (hex, sıcaklık, kontrast)</li>
                          <li>· Tipografi sınıfı ve özellikleri</li>
                          <li>· Kompozisyon ve ürün yerleşimi</li>
                          <li>· Işık tipi, yönü, Kelvin değeri</li>
                          <li>· Atmosfer ve doku</li>
                        </ul>
                        <button
                          onClick={handleAnalyze}
                          className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-medium transition"
                        >
                          Forensik Analiz Başlat
                        </button>
                      </div>
                    )}
                    {analyzing && (
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                        <p className="text-xs text-gray-500 text-center">Renk, tipografi, ışık ve kompozisyon analiz ediliyor...</p>
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
                          {dna.typographyName && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Tipografi</span>
                              <span className="font-medium text-gray-800">{dna.typographyName}</span>
                            </div>
                          )}
                          {dna._analysisModel && (
                            <div className="flex justify-between text-xs items-center">
                              <span className="text-gray-500">Model</span>
                              <span className="font-mono text-gray-600">{dna._analysisModel.replace("google/", "")}</span>
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

              {/* Analiz sonuç kartları */}
              {dna && !dna.error && (
                <div className="space-y-3">

                  {/* Renk DNA */}
                  {dna.colorDNA?.dominantColors?.length > 0 && (
                    <div className="border border-gray-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Renk DNA'sı</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {dna.colorDNA.dominantColors.map((c: any, i: number) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-sm border border-gray-200 flex-shrink-0" style={{ backgroundColor: c.hex }} />
                            <span className="text-xs text-gray-500 font-mono">{c.hex}</span>
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
                      <p className="text-xs font-semibold text-gray-600 mb-1">Kompozisyon</p>
                      <p className="text-xs text-gray-600 font-mono leading-relaxed">{dna.compositionDNA.promptDescription}</p>
                    </div>
                  )}

                  {/* Tipografi */}
                  {dna.typographyDNA?.primaryFont?.promptDescription && (
                    <div className="border border-gray-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Tipografi</p>
                      <p className="text-xs text-gray-600 font-mono leading-relaxed">{dna.typographyDNA.primaryFont.promptDescription}</p>
                    </div>
                  )}

                  {/* Teknik notlar */}
                  {dna.technicalNotes && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-1">Teknik Notlar</p>
                      <p className="text-xs text-amber-800 leading-relaxed">{dna.technicalNotes}</p>
                    </div>
                  )}

                </div>
              )}

              {/* Parse hatası */}
              {dna?.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs text-red-700 font-medium">Analiz JSON'u parse edilemedi</p>
                  <p className="text-xs text-red-500 mt-1 font-mono break-all">{dna.raw?.slice(0, 200)}</p>
                </div>
              )}
            </>
          )}

          {/* ── ADIM 2: Stil Formu ── */}
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
                  <p className="text-xs text-gray-500 mt-1">Poster Üret'te Tasarım Stili seçiminde görünecek</p>
                  <button onClick={handleClose} className="mt-4 text-xs text-violet-600 hover:underline">Kapat</button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500">DNA'dan otomatik dolduruldu. Kaydetmeden önce düzenleyebilirsin.</p>
                  {FORM_FIELDS.map(({ key, label, rows, mono }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      {rows === 1 ? (
                        <input
                          type="text"
                          value={styleForm[key]}
                          onChange={e => setStyleForm(f => ({ ...f, [key]: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
                        />
                      ) : (
                        <textarea
                          rows={rows}
                          value={styleForm[key]}
                          onChange={e => setStyleForm(f => ({ ...f, [key]: e.target.value }))}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none ${mono ? "font-mono" : ""}`}
                        />
                      )}
                    </div>
                  ))}
                  {saveError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer — Adıma göre değişir */}
        {!saved && (
          <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex-shrink-0 space-y-2">
            {step === 1 && dna && !dna.error && (
              <button
                onClick={handleToStep2}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition"
              >
                Yeni Stil Oluştur →
              </button>
            )}
            {step === 2 && !saved && (
              <div className="flex gap-2">
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
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : "Stili Kaydet"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

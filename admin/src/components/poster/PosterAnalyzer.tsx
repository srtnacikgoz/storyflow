import { useState } from "react";
import { api } from "../../services/api";

interface PosterAnalyzerProps {
  onApplyStyle?: (styleId: string, moodId: string, typographyId: string) => void;
  onStyleSaved?: () => void; // Yeni stil kaydedilince listeyi yenile
}

/**
 * Poster analiz bileşeni — görsel yükle, stil/mood/tipografi çıkar
 */
export default function PosterAnalyzer({ onApplyStyle, onStyleSaved }: PosterAnalyzerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [styleName, setStyleName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageMimeType(file.type);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64((reader.result as string).split(",")[1]);
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await api.analyzePosterDesign(imageBase64, imageMimeType);
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Analiz başarısız");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (result && onApplyStyle) {
      onApplyStyle(result.styleId || "", result.moodId || "", result.typographyId || "");
      setApplied(true);
      setTimeout(() => setIsOpen(false), 1200);
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Poster Analizi</h3>
            <p className="text-xs text-gray-500">Beğendiğin bir posteri yükle, stilini çıkaralım</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Görsel yükle */}
          {!imagePreview ? (
            <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-violet-400 transition">
              <div className="text-center">
                <p className="text-sm text-gray-500">Referans poster yükle</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP</p>
              </div>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          ) : (
            <div className="flex gap-3">
              <img src={imagePreview} alt="Referans" className="w-24 h-36 object-cover rounded-lg border" />
              <div className="flex-1">
                <button onClick={() => { setImagePreview(null); setImageBase64(null); setResult(null); }} className="text-xs text-red-500 mb-2">Değiştir</button>
                {!result && (
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="w-full bg-violet-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
                  >
                    {analyzing ? "Analiz ediliyor..." : "Analiz Et"}
                  </button>
                )}
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

          {/* Sonuç */}
          {result && (
            <div className="space-y-3">
              <div className="bg-violet-50 border border-violet-100 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-violet-700">Tespit Edilen Stil</span>
                  <span className="text-sm font-bold text-violet-900">{result.styleName || result.styleId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-violet-700">Mood</span>
                  <span className="text-sm font-bold text-violet-900">{result.moodName || result.moodId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-violet-700">Tipografi</span>
                  <span className="text-sm font-bold text-violet-900">{result.typographyName || result.typographyId}</span>
                </div>
              </div>

              {result.analysis && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Detaylı Analiz</summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-1 text-gray-600">
                    {Object.entries(result.analysis).map(([key, val]) => (
                      <p key={key}><span className="font-medium">{key}:</span> {val as string}</p>
                    ))}
                  </div>
                </details>
              )}

              {result.suggestions && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 mb-1">Neden etkili?</p>
                  <p className="text-sm text-amber-900">{result.suggestions}</p>
                </div>
              )}

              {onApplyStyle && (
                <div>
                  {applied ? (
                    <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 py-2.5 rounded-lg text-sm font-medium text-center">
                      ✓ Stil uygulandı — modal kapanıyor
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleApply}
                        className="w-full bg-violet-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700"
                      >
                        Bu Stili Uygula
                      </button>
                      <p className="text-[10px] text-gray-400 text-center mt-1">
                        Mevcut stillerden en yakın eşleşmeyi ({result.styleName || result.styleId}) otomatik seçer
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Yeni Stil Olarak Kaydet */}
              {result.analysis && !saved && (
                <div className="border-t pt-3 mt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-600">Bu estetiği yeni stil olarak kaydet</p>
                  <input
                    type="text"
                    value={styleName}
                    onChange={e => setStyleName(e.target.value)}
                    placeholder="Stil adı (örn: Kinfolk Inspired)"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    onClick={async () => {
                      if (!styleName.trim() || !result.analysis) return;
                      setSaving(true);
                      try {
                        await api.createPosterStyle({
                          name: styleName,
                          nameTr: styleName,
                          description: result.suggestions || "Referans posterden türetilmiş stil",
                          promptDirections: {
                            background: result.analysis.background || "",
                            typography: result.analysis.typography || "",
                            layout: result.analysis.layout || "",
                            colorPalette: result.analysis.colorPalette || "",
                            productPlacement: "Follow the reference image composition",
                            lighting: result.analysis.lighting || "",
                            overallFeel: result.analysis.overallFeel || "",
                          },
                          examplePromptFragment: result.suggestions || "",
                        });
                        setSaved(true);
                        onStyleSaved?.(); // Poster.tsx'de loadConfig() tetikle
                      } catch (err: any) {
                        alert("Kayıt hatası: " + (err?.message || JSON.stringify(err)));
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving || !styleName.trim()}
                    className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Kaydediliyor..." : "Yeni Stil Olarak Kaydet"}
                  </button>
                </div>
              )}
              {saved && (
                <div className="text-center py-2">
                  <p className="text-sm text-emerald-600 font-medium">Stil kaydedildi — Poster Üret'te kullanabilirsin</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

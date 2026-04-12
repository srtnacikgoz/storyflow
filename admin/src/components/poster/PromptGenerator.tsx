import { useState, useRef, useCallback } from "react";
import { api } from "../../services/api";

interface PromptGeneratorProps {
  productImageBase64: string | null;
  productMimeType: string;
  styleId: string;
  moodId: string;
  aspectRatioId: string;
  typographyId?: string;
  subtitleTypographyId?: string;
  layoutId?: string;
  title: string;
  subtitle: string;
  price: string;
  additionalNotes: string;
  referenceImageBase64?: string | null;
  referenceImageMimeType?: string;
  cameraAngleId?: string;
  lightingTypeId?: string;
  backgroundId?: string;
  negativePrompt?: string;
}

const TARGET_MODELS = [
  { id: "dall-e", label: "DALL-E / GPT Image", description: "OpenAI — detaylı açıklama, metin dahil" },
  { id: "midjourney", label: "Midjourney", description: "Kısa, etkili — parametreli" },
  { id: "gemini", label: "Gemini", description: "Anlatımsal paragraf, kamera detayı" },
  { id: "flux", label: "Flux", description: "Doğal dil, stil odaklı" },
];

export default function PromptGenerator(props: PromptGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetModel, setTargetModel] = useState("dall-e");
  const [includeText, setIncludeText] = useState(true);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [keepObjects, setKeepObjects] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ prompt: string; analysis: string; targetModel: string; cost: number; logs?: any[]; negativePrompt?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{ base64: string; mimeType: string; cost: number; durationMs: number } | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logsCopied, setLogsCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Sürükleme
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: position.x, origY: position.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPosition({
        x: dragRef.current.origX + (ev.clientX - dragRef.current.startX),
        y: dragRef.current.origY + (ev.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [position]);

  const handleGenerate = async () => {
    if (!props.productImageBase64) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const res = await api.generatePosterPrompt({
        productImageBase64: props.productImageBase64,
        productMimeType: props.productMimeType,
        styleId: props.styleId,
        moodId: props.moodId,
        aspectRatioId: props.aspectRatioId,
        typographyId: props.typographyId || undefined,
        subtitleTypographyId: props.subtitleTypographyId || undefined,
        layoutId: props.layoutId || undefined,
        title: props.title || undefined,
        subtitle: props.subtitle || undefined,
        price: props.price || undefined,
        targetModel,
        includeText,
        additionalNotes: props.additionalNotes || undefined,
        referenceImageBase64: props.referenceImageBase64 || undefined,
        referenceImageMimeType: props.referenceImageMimeType || undefined,
        cameraAngleId: props.cameraAngleId || undefined,
        lightingTypeId: props.lightingTypeId || undefined,
        backgroundId: props.backgroundId || undefined,
        negativePrompt: props.negativePrompt || undefined,
        removeBackground: removeBackground || undefined,
        keepObjects: removeBackground && keepObjects.trim() ? keepObjects.trim() : undefined,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Prompt üretimi başarısız");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!result || !props.productImageBase64) return;
    setGeneratingImage(true);
    setGeneratedImage(null);
    setError(null);
    try {
      const img = await api.generatePosterImage({
        prompt: result.prompt,
        productImageBase64: props.productImageBase64,
        productMimeType: props.productMimeType,
        referenceImageBase64: props.referenceImageBase64 || undefined,
        referenceImageMimeType: props.referenceImageMimeType || undefined,
      });
      setGeneratedImage({ base64: img.imageBase64, mimeType: img.mimeType, cost: img.cost, durationMs: img.durationMs });
    } catch (err: any) {
      setError(err.message || "Görsel üretimi başarısız");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!generatedImage) return;
    setDownloadingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const img = new Image();
      img.src = `data:${generatedImage.mimeType};base64,${generatedImage.base64}`;
      await new Promise(resolve => { img.onload = resolve; });
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      // Görseli tam sayfa olarak yerleştir (mm cinsinden)
      const pdfW = 210;
      const pdfH = (h / w) * pdfW;
      const doc = new jsPDF({
        orientation: pdfH > pdfW ? "portrait" : "landscape",
        unit: "mm",
        format: [pdfW, pdfH],
      });
      doc.addImage(img.src, "PNG", 0, 0, pdfW, pdfH);
      doc.save("poster.pdf");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadSvg = () => {
    if (!generatedImage) return;
    const img = new Image();
    img.src = `data:${generatedImage.mimeType};base64,${generatedImage.base64}`;
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image width="${w}" height="${h}" href="data:${generatedImage.mimeType};base64,${generatedImage.base64}"/>
</svg>`;
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "poster.svg";
      a.click();
      URL.revokeObjectURL(url);
    };
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        disabled={!props.productImageBase64}
        className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-50"
      >
        Prompt Üret
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/20"
      onClick={e => {
        if (e.target === e.currentTarget) {
          setIsOpen(false);
          setPosition({ x: 0, y: 0 });
        }
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto absolute"
        style={{ left: `calc(50% + ${position.x}px - 336px)`, top: `calc(50% + ${position.y}px - 300px)` }}
      >
        <div
          className="p-5 border-b flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
          onMouseDown={onDragStart}
        >
          <div>
            <h3 className="text-lg font-bold">Prompt Üret</h3>
            <p className="text-xs text-gray-500">Hedef model için optimize edilmiş prompt — kopyala, yapıştır</p>
          </div>
          <button onClick={() => { setIsOpen(false); setPosition({ x: 0, y: 0 }); }} className="text-gray-400 hover:text-gray-600 text-2xl" onMouseDown={e => e.stopPropagation()}>&times;</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Hedef Model Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hedef Model</label>
            <div className="grid grid-cols-2 gap-2">
              {TARGET_MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setTargetModel(m.id); setResult(null); }}
                  className={`p-3 border rounded-xl text-left transition ${
                    targetModel === m.id
                      ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="font-medium text-sm">{m.label}</span>
                  <span className="text-xs text-gray-500 block mt-0.5">{m.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Metin dahil et toggle */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Metni prompt'a dahil et</p>
              <p className="text-xs text-gray-400">Başlık, fiyat, marka bilgisi prompt'ta yer alsın mı?</p>
            </div>
            <button
              onClick={() => setIncludeText(!includeText)}
              className={`w-12 h-6 rounded-full transition ${includeText ? "bg-violet-600" : "bg-gray-300"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition transform ${includeText ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Arka plan kaldır toggle */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Arka planı kaldır</p>
                <p className="text-xs text-gray-400">Ürünü saydam arka plan ile izole et</p>
              </div>
              <button
                onClick={() => setRemoveBackground(!removeBackground)}
                className={`w-12 h-6 rounded-full transition ${removeBackground ? "bg-violet-600" : "bg-gray-300"}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition transform ${removeBackground ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
            {removeBackground && (
              <input
                type="text"
                value={keepObjects}
                onChange={(e) => setKeepObjects(e.target.value)}
                placeholder="Ürünle kalacak objeler (ör: bardak, peçete, çatal)"
                className="w-full text-sm bg-white rounded-lg px-3 py-2 border border-gray-200 focus:border-violet-400 focus:outline-none"
              />
            )}
          </div>

          {/* Referans poster indicator */}
          {props.referenceImageBase64 && (
            <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg p-3">
              <span className="text-violet-600 text-lg">🎨</span>
              <div>
                <p className="text-sm font-medium text-violet-800">Referans poster aktif</p>
                <p className="text-xs text-violet-500">Prompt, referans posterin stiline göre yazılacak</p>
              </div>
            </div>
          )}

          {/* Aktif parametreler özeti */}
          {(props.cameraAngleId || props.lightingTypeId || props.backgroundId || props.negativePrompt || removeBackground) && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-600 mb-1">Aktif Parametreler</p>
              {removeBackground && <p>✂️ Arka plan kaldırma aktif{keepObjects.trim() ? ` (+ ${keepObjects.trim()})` : ""}</p>}
              {props.cameraAngleId && <p>📷 Çekim açısı seçildi</p>}
              {props.lightingTypeId && <p>💡 Aydınlatma seçildi</p>}
              {props.backgroundId && !removeBackground && <p>🖼 Arka plan seçildi</p>}
              {props.negativePrompt && (
                <p>🚫 Negatif: {props.negativePrompt.length > 40 ? props.negativePrompt.substring(0, 40) + "..." : props.negativePrompt}</p>
              )}
            </div>
          )}

          {/* Üret butonu */}
          {!result && (
            <button
              onClick={handleGenerate}
              disabled={generating || !props.productImageBase64}
              className="w-full bg-gradient-to-r from-gray-800 to-gray-900 text-white py-3 rounded-xl font-medium hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Prompt üretiliyor...</>
              ) : (
                `${targetModel.toUpperCase()} Prompt'u Üret`
              )}
            </button>
          )}

          {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

          {/* Sonuç */}
          {result && (
            <div className="space-y-3">
              {result.analysis && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-700 mb-1">Ürün Analizi</p>
                  <p className="text-sm text-blue-900">{result.analysis}</p>
                </div>
              )}

              <div className="relative">
                <div className="bg-gray-900 rounded-xl p-4 max-h-60 overflow-y-auto">
                  <pre className="text-sm text-gray-100 whitespace-pre-wrap font-mono leading-relaxed">{result.prompt}</pre>
                </div>
                <button
                  onClick={handleCopy}
                  className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-xs font-medium transition"
                >
                  {copied ? "Kopyalandı ✓" : "Kopyala"}
                </button>
              </div>

              {result.negativePrompt && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-600 mb-1">Negatif Prompt (ayrı alana yapıştır)</p>
                  <div className="flex items-start justify-between gap-2">
                    <pre className="text-sm text-red-800 font-mono whitespace-pre-wrap flex-1">{result.negativePrompt}</pre>
                    <button
                      onClick={() => navigator.clipboard.writeText(result.negativePrompt!)}
                      className="shrink-0 text-xs bg-red-100 hover:bg-red-200 text-red-600 px-2 py-0.5 rounded"
                    >
                      Kopyala
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 bg-violet-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-violet-700"
                >
                  {copied ? "Kopyalandı ✓" : "Prompt'u Kopyala"}
                </button>
                <button
                  onClick={() => { setResult(null); }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-200"
                >
                  Tekrar Üret
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Maliyet: ${result.cost.toFixed(4)} — {result.targetModel.toUpperCase()} formatında
              </p>

              {/* Gemini ile doğrudan görsel üret — sadece gemini modelinde */}
              {result.targetModel === "gemini" && (
                <div className="border-t border-gray-100 pt-3 space-y-3">
                  <button
                    onClick={handleGenerateImage}
                    disabled={generatingImage}
                    className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white py-2.5 rounded-xl font-medium text-sm hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {generatingImage ? (
                      <><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Gemini üretiyor...</>
                    ) : (
                      "Gemini ile Direkt Üret"
                    )}
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Prompt + ürün görseli{props.referenceImageBase64 ? " + referans poster" : ""} Gemini'ye gönderilir
                  </p>

                  {generatedImage && (
                    <div className="space-y-2">
                      <img
                        src={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`}
                        alt="Gemini poster"
                        className="w-full rounded-xl border border-gray-200 shadow"
                      />
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <a
                            href={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`}
                            download="poster.png"
                            className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium text-center hover:bg-gray-800"
                          >
                            PNG
                          </a>
                          <button
                            onClick={handleDownloadPdf}
                            disabled={downloadingPdf}
                            className="flex-1 bg-red-700 text-white py-2 rounded-lg text-sm font-medium text-center hover:bg-red-600 disabled:opacity-50"
                          >
                            {downloadingPdf ? "..." : "PDF"}
                          </button>
                          <button
                            onClick={handleDownloadSvg}
                            className="flex-1 bg-violet-700 text-white py-2 rounded-lg text-sm font-medium text-center hover:bg-violet-600"
                          >
                            SVG
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 text-center">
                          ~${generatedImage.cost.toFixed(3)} · {(generatedImage.durationMs / 1000).toFixed(1)}sn
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Log Paneli */}
              {result.logs && result.logs.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowLogs(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition text-xs"
                  >
                    <span className="font-medium text-gray-600">
                      Detaylı Loglar <span className="text-gray-400">({result.logs.length})</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const formatted = (result.logs || []).map((l: any) => {
                            const icon = l.level === "error" ? "❌" : "✓";
                            const time = `+${(l.ts / 1000).toFixed(1)}s`;
                            const dataStr = l.data ? "\n    " + Object.entries(l.data).map(([k, v]) => {
                              if (typeof v === "object" && v !== null) return `${k}: ${JSON.stringify(v, null, 2)}`;
                              return `${k}: ${v}`;
                            }).join("\n    ") : "";
                            return `[${time}] ${icon} ${l.phase} — ${l.message}${dataStr}`;
                          }).join("\n\n");
                          navigator.clipboard.writeText(formatted);
                          setLogsCopied(true);
                          setTimeout(() => setLogsCopied(false), 2000);
                        }}
                        className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[10px] text-gray-500 hover:bg-gray-50"
                      >
                        {logsCopied ? "Kopyalandı ✓" : "Tümünü Kopyala"}
                      </button>
                      <span className="text-gray-400">{showLogs ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {showLogs && (
                    <div className="bg-gray-950 max-h-[400px] overflow-y-auto">
                      {[...new Set((result.logs || []).map((l: any) => l.phase))].map((phase: string) => (
                        <div key={phase} className="border-b border-gray-800 last:border-b-0">
                          <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-gray-900/50 sticky top-0 ${
                            phase === "INIT" ? "text-blue-400" : phase === "CONFIG" ? "text-cyan-400" :
                            phase === "PROMPT-BUILD" ? "text-violet-400" : phase === "CLAUDE" ? "text-amber-400" :
                            phase === "SONUÇ" ? "text-emerald-400" : phase === "ÖZET" ? "text-yellow-300" : "text-gray-400"
                          }`}>
                            {phase === "INIT" ? "Başlangıç" : phase === "CONFIG" ? "Konfigürasyon" :
                             phase === "PROMPT-BUILD" ? "Prompt Hazırlığı" : phase === "CLAUDE" ? "Claude Haiku" :
                             phase === "POST-PROCESS" ? "Son İşlem" : phase === "SONUÇ" ? "Sonuç" : phase === "ÖZET" ? "Özet" : phase}
                          </div>
                          {(result.logs || []).filter((l: any) => l.phase === phase).map((l: any, i: number) => (
                            <div key={i} className={`px-3 py-1 text-[11px] font-mono border-t border-gray-800/50 ${l.level === "error" ? "bg-red-950/30" : ""}`}>
                              <div className="flex items-start gap-2">
                                <span className="text-gray-600 shrink-0 w-10 text-right">+{(l.ts / 1000).toFixed(1)}s</span>
                                <span className="shrink-0">{l.level === "error" ? "❌" : "✓"}</span>
                                <span className={l.level === "error" ? "text-red-400" : "text-gray-300"}>{l.message}</span>
                              </div>
                              {l.data && (
                                <div className="ml-14 mt-0.5 space-y-0.5">
                                  {Object.entries(l.data).map(([k, v]) => (
                                    <div key={k} className="flex gap-1.5">
                                      <span className="text-gray-500 shrink-0">{k}:</span>
                                      {typeof v === "object" && v !== null ? (
                                        <pre className="text-gray-400 whitespace-pre-wrap break-all text-[10px]">{JSON.stringify(v, null, 2)}</pre>
                                      ) : (
                                        <span className={`break-all ${k === "prompt" || k === "analiz" || k === "systemPrompt" ? "text-green-400/80" : "text-gray-400"}`}>
                                          {String(v).length > 500 ? String(v).substring(0, 500) + "..." : String(v)}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

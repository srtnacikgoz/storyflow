import { useEffect, useRef, useState, useCallback } from "react";
import QRCodeStyling from "qr-code-styling";

const MENU_URL = "https://sade-patisserie-menu.web.app/menu";

const SADE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="100" fill="#FFFDF9"/>
  <text x="100" y="118" font-family="Georgia, serif" font-size="88" font-weight="bold"
    fill="#3D2314" text-anchor="middle" letter-spacing="-2">S</text>
  <text x="100" y="150" font-family="Georgia, serif" font-size="17" font-weight="normal"
    fill="#7B4F2E" text-anchor="middle" letter-spacing="6">ADE</text>
</svg>`;

const SADE_LOGO_URL = `data:image/svg+xml;base64,${btoa(SADE_LOGO_SVG)}`;

const QR_CONFIG: ConstructorParameters<typeof QRCodeStyling>[0] = {
  width: 400,
  height: 400,
  data: MENU_URL,
  image: SADE_LOGO_URL,
  dotsOptions: { color: "#3D2314", type: "rounded" },
  cornersSquareOptions: { color: "#3D2314", type: "extra-rounded" },
  cornersDotOptions: { color: "#7B4F2E", type: "dot" },
  backgroundOptions: { color: "#FFFDF9" },
  imageOptions: { crossOrigin: "anonymous", margin: 6, imageSize: 0.28 },
  qrOptions: { errorCorrectionLevel: "H" },
};

type DownloadFormat = "png" | "svg" | "jpeg";

export default function QRCodePage() {
  // QR onizleme
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [qrSize, setQrSize] = useState(400);
  const [copied, setCopied] = useState(false);

  // Poster overlay
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [qrBlobUrl, setQrBlobUrl] = useState<string | null>(null);
  const [qrX, setQrX] = useState(75); // % cinsinden sol konum
  const [qrY, setQrY] = useState(75); // % cinsinden ust konum
  const [guides, setGuides] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });
  const [qrScale, setQrScale] = useState(22); // poster genisliginin %'si
  const [bgColor, setBgColor] = useState("#FFFDF9");
  const [bgOpacity, setBgOpacity] = useState(92); // 0-100
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [compositing, setCompositing] = useState(false);

  // Surukleme state
  const posterContainerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ dragging: boolean; resizing: boolean; startX: number; startY: number; startQrX: number; startQrY: number; startScale: number } | null>(null);

  useEffect(() => {
    qrRef.current = new QRCodeStyling({ ...QR_CONFIG, width: qrSize, height: qrSize });
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      qrRef.current.append(containerRef.current);
    }
  }, [qrSize]);

  // QR blob URL olustur (overlay onizleme icin)
  useEffect(() => {
    if (!qrRef.current) return;
    (qrRef.current as any).getRawData("png").then((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      setQrBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
    });
  }, [qrSize]);

  const getQRBlob = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!qrRef.current) return reject(new Error("QR yok"));
      (qrRef.current as any).getRawData("png").then(resolve).catch(reject);
    });
  }, []);

  // Surukleme baslat
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragState.current = { dragging: true, resizing: false, startX: clientX, startY: clientY, startQrX: qrX, startQrY: qrY, startScale: qrScale };
  }, [qrX, qrY, qrScale]);

  // Boyutlandirma baslat
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragState.current = { dragging: false, resizing: true, startX: clientX, startY: clientY, startQrX: qrX, startQrY: qrY, startScale: qrScale };
  }, [qrX, qrY, qrScale]);

  // Mouse/touch hareket ve birakma
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragState.current || !posterContainerRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const rect = posterContainerRef.current.getBoundingClientRect();

      if (dragState.current.dragging) {
        const dx = ((clientX - dragState.current.startX) / rect.width) * 100;
        const dy = ((clientY - dragState.current.startY) / rect.height) * 100;
        let newX = Math.max(0, Math.min(100 - dragState.current.startScale, dragState.current.startQrX + dx));
        let newY = Math.max(0, Math.min(100 - dragState.current.startScale, dragState.current.startQrY + dy));
        // Snap to center guides (QR merkezini poster merkezine hizala)
        const SNAP = 1.5; // % tolerans
        const qrCenterX = newX + dragState.current.startScale / 2;
        const qrCenterY = newY + dragState.current.startScale / 2;
        const snapX = Math.abs(qrCenterX - 50) < SNAP;
        const snapY = Math.abs(qrCenterY - 50) < SNAP;
        if (snapX) newX = 50 - dragState.current.startScale / 2;
        if (snapY) newY = 50 - dragState.current.startScale / 2;
        setGuides({ x: snapX, y: snapY });
        setQrX(newX);
        setQrY(newY);
      }

      if (dragState.current.resizing) {
        const dx = ((clientX - dragState.current.startX) / rect.width) * 100;
        const newScale = Math.max(8, Math.min(50, dragState.current.startScale + dx));
        setQrScale(newScale);
      }
    };

    const handleEnd = () => { dragState.current = null; setGuides({ x: false, y: false }); };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, []);

  // Composite olustur (indirme icin)
  const buildComposite = useCallback(async () => {
    if (!posterImage) return;
    setCompositing(true);
    try {
      const qrBlob = await getQRBlob();
      const qrUrl = URL.createObjectURL(qrBlob);
      const [posterImg, qrImg] = await Promise.all([loadImage(posterImage), loadImage(qrUrl)]);
      URL.revokeObjectURL(qrUrl);

      const canvas = document.createElement("canvas");
      canvas.width = posterImg.width;
      canvas.height = posterImg.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(posterImg, 0, 0);

      const qrPx = Math.round(posterImg.width * (qrScale / 100));
      const x = Math.round(posterImg.width * (qrX / 100));
      const y = Math.round(posterImg.height * (qrY / 100));

      // Arka plan
      const pad = Math.round(qrPx * 0.04);
      const r = parseInt(bgColor.slice(1, 3), 16);
      const g = parseInt(bgColor.slice(3, 5), 16);
      const b = parseInt(bgColor.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r},${g},${b},${bgOpacity / 100})`;
      roundRect(ctx, x - pad, y - pad, qrPx + pad * 2, qrPx + pad * 2, Math.round(qrPx * 0.08));
      ctx.fill();

      ctx.drawImage(qrImg, x, y, qrPx, qrPx);
      setCompositeUrl(canvas.toDataURL("image/png"));
    } finally {
      setCompositing(false);
    }
  }, [posterImage, qrX, qrY, qrScale, bgColor, bgOpacity, getQRBlob]);

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPosterImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDownloadQR = async (format: DownloadFormat) => {
    if (!qrRef.current) return;
    setDownloading(true);
    try { await qrRef.current.download({ name: "sade-qr-menu", extension: format }); }
    finally { setDownloading(false); }
  };

  const handleDownloadComposite = async () => {
    await buildComposite();
  };

  // Composite hazir olunca indir
  useEffect(() => {
    if (!compositeUrl || compositing) return;
    const a = document.createElement("a");
    a.href = compositeUrl;
    a.download = "sade-poster-qr.png";
    a.click();
    setCompositeUrl(null);
  }, [compositeUrl, compositing]);

  const handleCopyURL = () => {
    navigator.clipboard.writeText(MENU_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Hex + opacity -> rgba string
  const bgRgba = (() => {
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${bgOpacity / 100})`;
  })();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Menu QR Kodu</h1>
        <p className="text-gray-500 text-sm mt-1">QR kodu indir ya da posterinin uzerine surukleyerek ekle</p>
      </div>

      {/* BOLUM 1: QR Onizleme + Indir */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center gap-5">
        <div ref={containerRef} className="rounded-2xl overflow-hidden shadow-md" style={{ width: 260, height: 260 }} />

        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 w-full">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="text-sm text-amber-900 font-mono flex-1 truncate">{MENU_URL}</span>
          <button onClick={handleCopyURL} className="text-xs text-amber-700 hover:text-amber-900 font-medium">
            {copied ? "Kopyalandi" : "Kopyala"}
          </button>
        </div>

        <div className="w-full">
          <label className="text-xs font-medium text-gray-500 mb-2 block">Indirme boyutu</label>
          <div className="flex gap-2 flex-wrap">
            {[400, 600, 800, 1200].map(s => (
              <button key={s} onClick={() => setQrSize(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${qrSize === s ? "bg-amber-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {s}px
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 w-full">
          {(["png", "svg", "jpeg"] as DownloadFormat[]).map(fmt => (
            <button key={fmt} onClick={() => handleDownloadQR(fmt)} disabled={downloading}
              className="flex-1 bg-stone-700 hover:bg-stone-800 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
              {fmt.toUpperCase()} Indir
            </button>
          ))}
        </div>
      </div>

      {/* BOLUM 2: Postere QR Ekle (Surukle-Birak) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <h2 className="text-base font-bold text-gray-900">Postere QR Ekle</h2>
          <p className="text-xs text-gray-500 mt-0.5">Posteri yukle, QR kodunu surekleyerek konumlandir, koseden boyutlandir</p>
        </div>

        {!posterImage ? (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-10 cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition">
            <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500 font-medium">Posteri buraya yukle</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP</p>
            <input type="file" accept="image/*" onChange={handlePosterUpload} className="hidden" />
          </label>
        ) : (
          <div className="space-y-4">
            {/* Poster + sureklenebilir QR onizleme */}
            <div
              ref={posterContainerRef}
              className="relative w-full rounded-xl border border-gray-100 shadow-sm overflow-hidden select-none"
              style={{ cursor: "default" }}
            >
              <img src={posterImage} alt="Poster" className="w-full block" draggable={false} />

              {/* Snap guide cizgileri */}
              {guides.x && <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(59,130,246,0.7)", pointerEvents: "none", zIndex: 20 }} />}
              {guides.y && <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(59,130,246,0.7)", pointerEvents: "none", zIndex: 20 }} />}

              {/* QR overlay — sureklenebilir */}
              {qrBlobUrl && (
                <div
                  onMouseDown={handleDragStart}
                  onTouchStart={handleDragStart}
                  style={{
                    position: "absolute",
                    left: `${qrX}%`,
                    top: `${qrY}%`,
                    width: `${qrScale}%`,
                    cursor: "grab",
                    borderRadius: "8%",
                    padding: "3%",
                    backgroundColor: bgRgba,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                    touchAction: "none",
                  }}
                >
                  <img src={qrBlobUrl} alt="QR" className="w-full block rounded" draggable={false} />

                  {/* Boyutlandirma tutamaci — sag alt kose */}
                  <div
                    onMouseDown={handleResizeStart}
                    onTouchStart={handleResizeStart}
                    style={{
                      position: "absolute",
                      right: -4,
                      bottom: -4,
                      width: 16,
                      height: 16,
                      cursor: "nwse-resize",
                      background: "rgba(180,83,9,0.85)",
                      borderRadius: 4,
                      border: "2px solid white",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Arka plan renk + saydamlik ayarlari */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">QR Arka Plan Rengi</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={e => setBgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <div className="flex gap-1.5">
                    {["#FFFDF9", "#FFFFFF", "#000000", "#1a1a1a"].map(c => (
                      <button key={c} onClick={() => setBgColor(c)}
                        className={`w-7 h-7 rounded-lg border-2 transition-colors ${bgColor === c ? "border-amber-600" : "border-gray-200"}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 flex justify-between">
                  <span>Saydamlik</span>
                  <span className="text-amber-700 font-bold">%{bgOpacity}</span>
                </label>
                <input type="range" min={0} max={100} value={bgOpacity}
                  onChange={e => setBgOpacity(Number(e.target.value))}
                  className="w-full accent-amber-700" />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>Saydam</span>
                  <span>Opak</span>
                </div>
              </div>
            </div>

            {/* Ipucu */}
            <p className="text-[11px] text-gray-400 text-center">
              QR kodunu surekleyerek tasindir, sag alt kosesinden boyutlandir
            </p>

            {/* Aksiyon butonlari */}
            <div className="flex gap-3">
              <button onClick={handleDownloadComposite} disabled={compositing}
                className="flex-1 bg-amber-700 hover:bg-amber-800 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {compositing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                PNG Indir
              </button>
              <button onClick={() => { setPosterImage(null); setCompositeUrl(null); }}
                className="px-5 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Baska Poster
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

import { useState, useCallback, useRef, useEffect } from "react";
import imageCompression from "browser-image-compression";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 10;
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1536,
  useWebWorker: true,
  initialQuality: 0.85,
};

interface ProductImageUploadProps {
  onImageReady: (base64: string, mimeType: string, previewUrl: string) => void;
  onClear: () => void;
  previewUrl: string | null;
  label: string;
  hint?: string;
  accentColor?: "gray" | "violet";
}

export default function ProductImageUpload({
  onImageReady,
  onClear,
  previewUrl,
  label,
  hint,
  accentColor = "gray",
}: ProductImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(
          `Bu format desteklenmiyor: ${file.type || "bilinmiyor"}. Lütfen JPG, PNG veya WebP yükle.`
        );
        return;
      }

      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(
          `Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(1)}MB). Max ${MAX_SIZE_MB}MB.`
        );
        return;
      }

      isProcessingRef.current = true;
      setIsProcessing(true);
      try {
        const options = { ...COMPRESSION_OPTIONS, fileType: file.type };
        const compressed = await imageCompression(file, options);

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Dosya okunamadı"));
          reader.readAsDataURL(compressed);
        });
        const base64 = dataUrl.split(",")[1];
        onImageReady(base64, compressed.type, dataUrl);
      } catch (err: any) {
        setError("Görsel işlenemedi: " + (err.message || "bilinmeyen hata"));
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [onImageReady]
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (previewUrl || isProcessingRef.current) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            processFile(file);
            break;
          }
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [processFile, previewUrl]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const borderClass = isDragging
    ? "border-amber-400 bg-amber-50"
    : accentColor === "violet"
    ? "border-violet-200 bg-violet-50/30 hover:border-violet-400"
    : "border-gray-300 hover:border-amber-400";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}

      {previewUrl ? (
        <div className="flex items-center gap-3">
          <img
            src={previewUrl}
            alt="Görsel önizleme"
            className={`w-20 h-20 object-cover rounded-lg border ${
              accentColor === "violet" ? "border-violet-300" : "border-gray-200"
            }`}
          />
          <div>
            {accentColor === "violet" && (
              <p className="text-xs text-violet-600 font-medium mb-1">Referans poster yüklendi</p>
            )}
            <button type="button" onClick={onClear} className="text-xs text-red-500 hover:text-red-700">
              Değiştir
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          tabIndex={0}
          role="button"
          aria-label="Görsel yükle — sürükle bırak veya tıkla"
          onKeyDown={(e) => {
            if (!isProcessing && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${borderClass} ${
            isProcessing ? "pointer-events-none opacity-70" : ""
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {isProcessing ? (
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500">Görsel işleniyor...</p>
            </div>
          ) : isDragging ? (
            <p className="text-sm font-medium text-amber-600">Bırak!</p>
          ) : (
            <div className="text-center">
              <p
                className={`text-sm ${
                  accentColor === "violet" ? "text-violet-500" : "text-gray-500"
                }`}
              >
                Sürükle bırak veya tıkla
              </p>
              <p className="text-xs text-gray-400 mt-1">
                JPG · PNG · WebP &nbsp;·&nbsp; Ctrl+V ile yapıştır
              </p>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}

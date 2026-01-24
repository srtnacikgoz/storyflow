import { useState, useCallback, useRef, type ReactNode } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";

type AssetType = "image" | "audio";

interface AssetUploadProps {
  type: AssetType;
  onUploadComplete: (url: string, filename: string) => void;
  onError?: (error: string) => void;
  folder?: string;
}

// Dosya tipi konfigürasyonları
const CONFIG: Record<AssetType, {
  accept: string;
  mimeTypes: string[];
  maxSize: number;
  label: string;
  icon: ReactNode;
}> = {
  image: {
    accept: "image/*",
    mimeTypes: ["image/"],
    maxSize: 10 * 1024 * 1024, // 10MB
    label: "Görsel",
    icon: (
      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  audio: {
    accept: "audio/*",
    mimeTypes: ["audio/"],
    maxSize: 50 * 1024 * 1024, // 50MB
    label: "Müzik",
    icon: (
      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
  },
};

export default function AssetUpload({
  type,
  onUploadComplete,
  onError,
  folder = "orchestrator-assets"
}: AssetUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Callback ref'leri - stale closure problemini önler
  // Upload sırasında parent re-render olsa bile doğru callback çağrılır
  const onUploadCompleteRef = useRef(onUploadComplete);
  const onErrorRef = useRef(onError);

  // Her render'da ref'leri güncelle
  onUploadCompleteRef.current = onUploadComplete;
  onErrorRef.current = onError;

  const config = CONFIG[type];

  const validateFile = (file: File): boolean => {
    // Dosya tipi kontrolü
    const isValidType = config.mimeTypes.some(mime => file.type.startsWith(mime));
    if (!isValidType) {
      onErrorRef.current?.(`Sadece ${config.label.toLowerCase()} dosyaları yüklenebilir`);
      return false;
    }

    // Dosya boyutu kontrolü
    if (file.size > config.maxSize) {
      const maxMB = config.maxSize / (1024 * 1024);
      onErrorRef.current?.(`Dosya boyutu ${maxMB}MB'dan küçük olmalı`);
      return false;
    }

    return true;
  };

  const handleFile = useCallback(async (file: File) => {
    if (!validateFile(file)) return;

    // Preview oluştur
    if (type === "image") {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      // Audio için dosya adını göster
      setPreview("audio");
    }

    setUploadedFilename(file.name);

    // Firebase Storage'a yükle
    setIsUploading(true);
    setProgress(0);

    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${folder}/${type}s/${timestamp}-${safeFilename}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(Math.round(pct));
      },
      (error) => {
        console.error("Upload error:", error);
        setIsUploading(false);
        setPreview(null);
        setUploadedFilename(null);
        onErrorRef.current?.("Yükleme başarısız: " + error.message);
      },
      async () => {
        // Upload tamamlandı - URL al ve parent'a bildir
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("[AssetUpload] Upload complete, calling callback with URL");
          // Ref üzerinden güncel callback'i çağır (stale closure önlenir)
          onUploadCompleteRef.current(downloadURL, file.name);
          setIsUploading(false);
        } catch (error) {
          console.error("Error getting download URL:", error);
          setIsUploading(false);
          setPreview(null);
          setUploadedFilename(null);
          onErrorRef.current?.("URL alınamadı: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
        }
      }
    );
    // Ref'ler kullanıldığı için callback'ler dependency'den çıkarıldı
  }, [type, folder]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    e.target.value = "";
  };

  const clearPreview = () => {
    setPreview(null);
    setUploadedFilename(null);
    setProgress(0);
  };

  return (
    <div className="space-y-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={config.accept}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drop Zone */}
      <div
        onClick={!isUploading && !preview ? handleClick : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-4 text-center transition-colors duration-200
          ${isDragging
            ? "border-brand-blue bg-brand-blue/10"
            : preview
              ? "border-brand-green bg-brand-green/5"
              : "border-gray-300 hover:border-brand-blue hover:bg-gray-50 cursor-pointer"
          }
          ${isUploading ? "pointer-events-none" : ""}
        `}
      >
        {preview ? (
          // Preview göster
          <div className="space-y-3">
            {type === "image" && preview !== "audio" ? (
              <img
                src={preview}
                alt="Preview"
                className="max-h-32 mx-auto rounded-lg object-contain"
              />
            ) : (
              <div className="flex items-center justify-center gap-3 py-2">
                <div className="w-12 h-12 bg-brand-mustard/20 rounded-full flex items-center justify-center">
                  {config.icon}
                </div>
                <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                  {uploadedFilename}
                </span>
              </div>
            )}

            {isUploading ? (
              <div className="space-y-1">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-blue transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">Yükleniyor... {progress}%</p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-green-600">✓ Yüklendi</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearPreview();
                  }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Kaldır
                </button>
              </div>
            )}
          </div>
        ) : (
          // Upload prompt
          <div className="space-y-2 py-2">
            <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              {config.icon}
            </div>
            <div>
              <p className="text-sm text-gray-700 font-medium">
                {config.label} yükle
              </p>
              <p className="text-xs text-gray-500">
                Sürükle bırak veya tıkla
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

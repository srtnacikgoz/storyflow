import { useState, useCallback, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  onError?: (error: string) => void;
}

export default function ImageUpload({ onUploadComplete, onError }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    // Dosya tipi kontrolü
    if (!file.type.startsWith("image/")) {
      onError?.("Sadece resim dosyaları yüklenebilir");
      return;
    }

    // Dosya boyutu kontrolü (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      onError?.("Dosya boyutu 10MB'dan küçük olmalı");
      return;
    }

    // Preview oluştur
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Firebase Storage'a yükle
    setIsUploading(true);
    setProgress(0);

    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const storageRef = ref(storage, `media-queue/${fileName}`);

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
        onError?.("Yükleme başarısız: " + error.message);
      },
      async () => {
        // Upload tamamlandı
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setIsUploading(false);
        onUploadComplete(downloadURL);
      }
    );
  }, [onUploadComplete, onError]);

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
    // Input'u sıfırla ki aynı dosya tekrar seçilebilsin
    e.target.value = "";
  };

  const clearPreview = () => {
    setPreview(null);
    setProgress(0);
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
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
          relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors duration-200
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
          <div className="space-y-4">
            <img
              src={preview}
              alt="Preview"
              className="max-h-64 mx-auto rounded-xl object-contain"
            />
            {isUploading ? (
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-blue transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500">Yükleniyor... {progress}%</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearPreview();
                }}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Kaldır
              </button>
            )}
          </div>
        ) : (
          // Upload prompt
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-700 font-medium">
                Fotoğrafı sürükle bırak
              </p>
              <p className="text-sm text-gray-500">
                veya tıklayarak seç
              </p>
            </div>
            <p className="text-xs text-gray-400">
              PNG, JPG, WEBP (max 10MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

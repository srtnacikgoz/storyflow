import { useState, useEffect, useCallback, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../config/firebase";
import { api } from "../../services/api";

interface SlotData {
  imageUrl: string;
  label?: string;
}

type CollageSlots = Record<string, SlotData>;

const SLOT_KEYS = ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6", "slot7"] as const;

/**
 * Görseli Canvas ile optimize et (max 2000px, %90 JPEG)
 */
function optimizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_SIZE = 2000;
      let { width, height } = img;

      if (width > MAX_SIZE || height > MAX_SIZE) {
        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context oluşturulamadı"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Blob oluşturulamadı"));
        },
        "image/jpeg",
        0.9
      );
    };
    img.onerror = () => reject(new Error("Görsel yüklenemedi"));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Tek bir slot kartı: thumbnail + yükle/değiştir/kaldır
 */
function SlotCard({
  slotKey,
  label,
  data,
  isLarge,
  onUpload,
  onRemove,
}: {
  slotKey: string;
  label: string;
  data?: SlotData | null;
  isLarge?: boolean;
  onUpload: (slotKey: string, file: File) => void;
  onRemove: (slotKey: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // uploading state'ini parent'tan kontrol etmek yerine burada tutuyoruz
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    setProgress(0);
    onUpload(slotKey, file);
  };

  // Upload tamamlandığında reset
  useEffect(() => {
    if (data?.imageUrl) {
      setUploading(false);
      setProgress(0);
    }
  }, [data?.imageUrl]);

  return (
    <div
      className={`relative border border-gray-200 rounded-xl overflow-hidden bg-gray-50 group ${
        isLarge ? "col-span-2 row-span-2" : ""
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {data?.imageUrl ? (
        // Görsel var
        <div className="relative w-full h-full">
          <img
            src={data.imageUrl}
            alt={label}
            className={`w-full object-cover ${isLarge ? "h-48" : "h-32"}`}
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 bg-white text-gray-700 text-xs rounded-lg font-medium hover:bg-gray-100"
            >
              Degistir
            </button>
            <button
              onClick={() => onRemove(slotKey)}
              className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg font-medium hover:bg-red-600"
            >
              Kaldir
            </button>
          </div>
          {/* Label */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
            <span className="text-white text-xs font-medium">{label}</span>
          </div>
        </div>
      ) : (
        // Bos slot
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`w-full flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ${
            isLarge ? "h-48" : "h-32"
          }`}
        >
          {uploading ? (
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
              <span className="text-xs">{progress}%</span>
            </div>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs font-medium">{label}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function HeroImagesSection() {
  const [collageSlots, setCollageSlots] = useState<CollageSlots>({});
  const [resultImage, setResultImage] = useState<SlotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Orijinal verileri tutarak change detection
  const [originalData, setOriginalData] = useState<string>("");

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const config = await api.getLandingHeroConfig();
      setCollageSlots(config.collageSlots || {});
      setResultImage(config.resultImage || null);
      setOriginalData(JSON.stringify({ collageSlots: config.collageSlots || {}, resultImage: config.resultImage || null }));
    } catch (err) {
      console.error("[HeroImages] Config yuklenemedi:", err);
      setError("Hero gorsel config'i yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Change detection
  useEffect(() => {
    const current = JSON.stringify({ collageSlots, resultImage });
    setHasChanges(current !== originalData);
  }, [collageSlots, resultImage, originalData]);

  /**
   * Gorseli Firebase Storage'a yukle
   */
  const uploadToStorage = useCallback(async (file: File, slotKey: string): Promise<string> => {
    const optimized = await optimizeImage(file);
    const timestamp = Date.now();
    const ext = "jpg";
    const storagePath = `landing/hero/${slotKey}_${timestamp}.${ext}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, optimized, {
        contentType: "image/jpeg",
      });

      uploadTask.on(
        "state_changed",
        () => {
          // Progress burada izlenebilir ama SlotCard kendi spinner'ini gosteriyor
        },
        (err) => reject(err),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  }, []);

  const handleSlotUpload = useCallback(async (slotKey: string, file: File) => {
    try {
      setError(null);
      const url = await uploadToStorage(file, slotKey);

      if (slotKey === "result") {
        setResultImage({ imageUrl: url });
      } else {
        setCollageSlots((prev) => ({
          ...prev,
          [slotKey]: { imageUrl: url },
        }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[HeroImages] Upload hatasi:", err);
      setError(`Gorsel yuklenirken hata: ${message}`);
    }
  }, [uploadToStorage]);

  const handleSlotRemove = useCallback((slotKey: string) => {
    if (slotKey === "result") {
      setResultImage(null);
    } else {
      setCollageSlots((prev) => {
        const next = { ...prev };
        delete next[slotKey];
        return next;
      });
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.updateLandingHeroConfig({
        collageSlots,
        resultImage,
      });
      setOriginalData(JSON.stringify({ collageSlots, resultImage }));
      setHasChanges(false);
      setSuccessMsg("Hero gorselleri kaydedildi");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("[HeroImages] Kaydetme hatasi:", err);
      setError("Kaydetme sirasinda hata olustu");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Hero Gorselleri</h2>
        <div className="flex items-center justify-center py-12 text-gray-400">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mr-2" />
          Yukleniyor...
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Hero Gorselleri</h2>
          <p className="text-sm text-gray-500 mt-1">
            Landing page'deki kolaj gorunumu icin 7 gorsel + 1 AI sonuc gorseli
          </p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        )}
      </div>

      {/* Hata / Basari mesajlari */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
          {successMsg}
        </div>
      )}

      {/* Kolaj Slotlari (7 adet) */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Kolaj Gorselleri (7 adet)</h3>
        <div className="grid grid-cols-4 gap-3">
          {SLOT_KEYS.map((key, i) => (
            <SlotCard
              key={key}
              slotKey={key}
              label={`${i + 1}`}
              data={collageSlots[key]}
              onUpload={handleSlotUpload}
              onRemove={handleSlotRemove}
            />
          ))}
        </div>
      </div>

      {/* Sonuc Gorseli */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">AI Sonuc Gorseli</h3>
        <div className="grid grid-cols-4 gap-3">
          <SlotCard
            slotKey="result"
            label="Sonuc"
            data={resultImage}
            isLarge
            onUpload={handleSlotUpload}
            onRemove={handleSlotRemove}
          />
        </div>
      </div>
    </div>
  );
}

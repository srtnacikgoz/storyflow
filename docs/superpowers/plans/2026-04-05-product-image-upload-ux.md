# Product Image Upload UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poster.tsx'teki ürün görseli yükleme alanını drag-drop, client-side compression, clipboard paste ve format validation ile geliştirilmiş ayrı bir component'e taşımak.

**Architecture:** `ProductImageUpload.tsx` adında tek sorumluluğu olan yeni bir component oluşturulacak. Native HTML5 drag-drop API (ekstra dependency yok), `browser-image-compression` ile client-side compression, `paste` event ile clipboard desteği, MIME type bazlı format validation içerecek. Poster.tsx'teki mevcut iki upload alanı (ürün + referans) bu component ile değiştirilecek.

**Tech Stack:** React (mevcut), browser-image-compression (yeni npm paketi), Native HTML5 Drag-Drop API, Clipboard API

---

## Dosya Haritası

- **Oluştur:** `admin/src/components/ProductImageUpload.tsx` — yeni reusable upload component
- **Değiştir:** `admin/src/pages/Poster.tsx` — eski inline upload alanlarını component ile değiştir, ilgili state/handler'ları temizle
- **Değiştir:** `admin/package.json` — browser-image-compression bağımlılığı ekle

---

### Task 1: browser-image-compression paketini yükle

**Files:**
- Modify: `admin/package.json`
- Modify: `admin/package-lock.json` (otomatik)

- [ ] **Step 1: Paketi yükle**

```bash
cd admin && npm install browser-image-compression
```

Expected output: `added X packages` — hata olmadan tamamlanmalı.

- [ ] **Step 2: TypeScript tip desteğini kontrol et**

```bash
cd admin && node -e "require('browser-image-compression')" 2>&1 || true
```

`browser-image-compression` paketi kendi içinde TypeScript tipleri barındırır, ayrıca `@types` paketi gerekmez.

- [ ] **Step 3: Commit**

```bash
cd admin && git add package.json package-lock.json
git commit -m "chore(deps): browser-image-compression eklendi"
```

---

### Task 2: ProductImageUpload component'ini oluştur

**Files:**
- Create: `admin/src/components/ProductImageUpload.tsx`

Bu component şunları yapacak:
- Drag-drop (native HTML5)
- Click-to-upload
- Clipboard paste (Ctrl+V / Cmd+V)
- Format validation (jpeg, png, webp — HEIC hariç)
- client-side compression (max 1536px, %85 kalite)
- Compression sonrası base64 + mimeType callback ile üst component'e iletme
- Hata mesajı gösterimi (format hatası, compression hatası)

- [ ] **Step 1: Component dosyasını oluştur**

`admin/src/components/ProductImageUpload.tsx` dosyasını oluştur:

```tsx
import { useState, useCallback, useRef, useEffect } from "react";
import imageCompression from "browser-image-compression";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 10;
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1536,
  useWebWorker: true,
  fileType: undefined as string | undefined, // input formatını koru
  initialQuality: 0.85,
};

interface ProductImageUploadProps {
  /** Yükleme tamamlandığında çağrılır */
  onImageReady: (base64: string, mimeType: string, previewUrl: string) => void;
  /** Görsel kaldırıldığında çağrılır */
  onClear: () => void;
  /** Mevcut preview URL (dışarıdan kontrol için) */
  previewUrl: string | null;
  /** Alan etiketi */
  label: string;
  /** Opsiyonel açıklama satırı */
  hint?: string;
  /** Drag-drop alanı arka plan rengi (opsiyonel, default: gray) */
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

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      // Format validasyonu
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`Bu format desteklenmiyor: ${file.type || "bilinmiyor"}. Lütfen JPG, PNG veya WebP yükle.`);
        return;
      }

      // Boyut kontrolü (compress öncesi ham limit)
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(1)}MB). Max ${MAX_SIZE_MB}MB.`);
        return;
      }

      setIsProcessing(true);
      try {
        const options = { ...COMPRESSION_OPTIONS, fileType: file.type };
        const compressed = await imageCompression(file, options);

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(",")[1];
          onImageReady(base64, compressed.type, dataUrl);
        };
        reader.readAsDataURL(compressed);
      } catch (err: any) {
        setError("Görsel işlenemedi: " + (err.message || "bilinmeyen hata"));
      } finally {
        setIsProcessing(false);
      }
    },
    [onImageReady]
  );

  // Clipboard paste (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Sadece drop zone focus'ta veya sayfada aktifken çalışsın
      if (previewUrl) return; // Zaten görsel var
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
    // Sadece drop zone dışına çıkınca tetiklensin (child elementler hariç)
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
    e.target.value = ""; // Aynı dosya tekrar seçilebilsin
  };

  const borderColor =
    isDragging
      ? "border-amber-400 bg-amber-50"
      : accentColor === "violet"
      ? "border-violet-200 bg-violet-50/30 hover:border-violet-400"
      : "border-gray-300 hover:border-amber-400";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}

      {previewUrl ? (
        // Preview durumu
        <div className="flex items-center gap-3">
          <img
            src={previewUrl}
            alt="Ürün"
            className={`w-20 h-20 object-cover rounded-lg border ${
              accentColor === "violet" ? "border-violet-300" : "border-gray-200"
            }`}
          />
          <div>
            {accentColor === "violet" && (
              <p className="text-xs text-violet-600 font-medium">Referans poster yüklendi</p>
            )}
            <button
              onClick={onClear}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Değiştir
            </button>
          </div>
        </div>
      ) : (
        // Upload durumu
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${borderColor} ${
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
              <p className={`text-sm ${accentColor === "violet" ? "text-violet-500" : "text-gray-500"}`}>
                Sürükle bırak veya tıkla
              </p>
              <p className="text-xs text-gray-400 mt-1">JPG · PNG · WebP &nbsp;·&nbsp; Ctrl+V ile yapıştır</p>
            </div>
          )}
        </div>
      )}

      {/* Hata mesajı */}
      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build kontrolü**

```bash
cd admin && npm run build 2>&1 | tail -20
```

Expected: `✓ built in` — hata olmamalı.

- [ ] **Step 3: Commit**

```bash
git add admin/src/components/ProductImageUpload.tsx
git commit -m "feat(upload): ProductImageUpload component — drag-drop, compression, paste, validation"
```

---

### Task 3: Poster.tsx'te upload alanlarını yeni component ile değiştir

**Files:**
- Modify: `admin/src/pages/Poster.tsx`

Poster.tsx'te şu değişiklikler yapılacak:
1. `handleImageUpload` ve `handleReferenceUpload` fonksiyonlarını sil
2. `ProductImageUpload` import et
3. "Ürün Görseli" ve "Referans Poster" alanlarını component ile değiştir
4. `onImageReady` callback: `setProductImageBase64` + `setProductMimeType` + `setProductPreview` birlikte set et
5. `onClear` callback: üç state'i de null/default'a sıfırla

- [ ] **Step 1: Poster.tsx'i oku (import'lar ve ilk birkaç satır)**

Dosyanın başını oku, mevcut import listesini gör:

```bash
head -20 admin/src/pages/Poster.tsx
```

- [ ] **Step 2: ProductImageUpload'u import et**

Poster.tsx'in import bölümüne şunu ekle (diğer component import'larının yanına):

```tsx
import ProductImageUpload from "../components/ProductImageUpload";
```

- [ ] **Step 3: handleImageUpload ve handleReferenceUpload fonksiyonlarını sil**

[Poster.tsx:473-498](admin/src/pages/Poster.tsx#L473-L498) aralığındaki iki fonksiyonu tamamen sil:

```tsx
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    ...
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    ...
  };
```

- [ ] **Step 4: "Ürün Görseli" JSX alanını değiştir**

[Poster.tsx:547-564](admin/src/pages/Poster.tsx#L547-L564) aralığındaki mevcut `<div>` bloğunu:

```tsx
        {/* Ürün Görseli */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Ürün Görseli *</label>
          {productPreview ? (
            <div className="flex items-center gap-3">
              <img src={productPreview} alt="Ürün" className="w-20 h-20 object-cover rounded-lg border" />
              <button onClick={() => { setProductPreview(null); setProductImageBase64(null); }} className="text-xs text-red-500 hover:text-red-700">Değiştir</button>
            </div>
          ) : (
            <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-amber-400 transition">
              <div className="text-center">
                <p className="text-sm text-gray-500">Ürün fotoğrafı yükle</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP</p>
              </div>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </div>
```

Şununla değiştir:

```tsx
        {/* Ürün Görseli */}
        <ProductImageUpload
          label="Ürün Görseli *"
          previewUrl={productPreview}
          onImageReady={(base64, mimeType, previewUrl) => {
            setProductImageBase64(base64);
            setProductMimeType(mimeType);
            setProductPreview(previewUrl);
          }}
          onClear={() => {
            setProductImageBase64(null);
            setProductMimeType("image/jpeg");
            setProductPreview(null);
          }}
        />
```

- [ ] **Step 5: "Referans Poster" JSX alanını değiştir**

[Poster.tsx:566-589](admin/src/pages/Poster.tsx#L566-L589) aralığındaki mevcut referans poster bloğunu:

```tsx
        {/* Referans Poster (opsiyonel) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Referans Poster <span className="text-xs text-gray-400">(opsiyonel — "bu tarzda üret")</span>
          </label>
          {referencePreview ? (
            <div className="flex items-center gap-3">
              <img src={referencePreview} alt="Referans" className="w-20 h-28 object-cover rounded-lg border border-violet-300" />
              <div>
                <p className="text-xs text-violet-600 font-medium">Referans poster yüklendi</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Stil, layout ve renk paleti bu posterden alınacak</p>
                <button onClick={() => { setReferencePreview(null); setReferenceImageBase64(null); }} className="text-xs text-red-500 hover:text-red-700 mt-1">Kaldır</button>
              </div>
            </div>
          ) : (
            <label className="flex items-center justify-center border-2 border-dashed border-violet-200 rounded-lg p-4 cursor-pointer hover:border-violet-400 transition bg-violet-50/30">
              <div className="text-center">
                <p className="text-sm text-violet-500">Beğendiğin bir poster yükle</p>
                <p className="text-[10px] text-gray-400 mt-1">Claude bu posterin stilini analiz edip prompt'a yansıtacak</p>
              </div>
              <input type="file" accept="image/*" onChange={handleReferenceUpload} className="hidden" />
            </label>
          )}
        </div>
```

Şununla değiştir:

```tsx
        {/* Referans Poster (opsiyonel) */}
        <ProductImageUpload
          label="Referans Poster"
          hint='Opsiyonel — "bu tarzda üret". Claude stilini analiz edip prompt\'a yansıtacak.'
          accentColor="violet"
          previewUrl={referencePreview}
          onImageReady={(base64, mimeType, previewUrl) => {
            setReferenceImageBase64(base64);
            setReferenceImageMimeType(mimeType);
            setReferencePreview(previewUrl);
          }}
          onClear={() => {
            setReferenceImageBase64(null);
            setReferenceImageMimeType("image/jpeg");
            setReferencePreview(null);
          }}
        />
```

- [ ] **Step 6: Build kontrolü**

```bash
cd admin && npm run build 2>&1 | tail -20
```

Expected: `✓ built in` — TypeScript hataları olmamalı.

- [ ] **Step 7: Commit**

```bash
git add admin/src/pages/Poster.tsx
git commit -m "feat(poster): ürün görsel upload alanı — drag-drop, compression, Ctrl+V paste, format validation"
```

---

## Smoke Test (Manuel)

Build başarılı olduktan sonra dev server'da şunları test et:

1. **Drag-drop**: Bir JPG'yi tarayıcıya sürükle, upload alanına bırak → görsel belirsin
2. **Click-to-upload**: Alana tıkla, dosya seç → görsel belirsin
3. **Clipboard paste**: Ekran görüntüsü al, Ctrl+V/Cmd+V → görsel belirsin
4. **Format validation**: `.gif` veya `.bmp` dosyası sürükle → "Bu format desteklenmiyor" hatası görünsün
5. **Compression**: 5MB+ bir JPG yükle → işleniyor spinner görünsün, tamamlanınca preview gelsin
6. **Referans poster**: Violet renkli alana da aynı 5 testi uygula
7. **Prompt üret**: Her iki görseli yükleyip "Üret" butonuna bas → API isteği gitmeli (mevcut fonksiyon bozulmamalı)

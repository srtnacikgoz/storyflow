# Poster Gemini Direct Generate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poster sistemine "Gemini ile Üret" butonu ekle — Claude'un yazdığı prompt + ürün görseli + referans poster birlikte Gemini'ye gönderilsin, kullanıcı üretilen görseli direkt görsün.

**Architecture:** Yeni `posterImageController.ts` Cloud Function (posterSmartController.ts 776 satır, yeni özellik oraya eklenemez). Mevcut `GeminiService` yerine doğrudan `@google/generative-ai` çağrısı — çünkü GeminiService'in Instagram pipeline'a özgü SECTION 1/SECTION 2 prompt prefix yapısı poster için uygun değil. Frontend'de PromptGenerator.tsx'e "Gemini ile Üret" butonu eklenir; önce `/generatePosterPrompt` ile text prompt üretilir, sonra `/generatePosterImage` ile görsel üretilir.

**Tech Stack:** TypeScript, Firebase Cloud Functions, `@google/generative-ai`, React + Vite

---

### Task 1: posterImageController.ts oluştur

**Files:**
- Create: `functions/src/controllers/orchestrator/posterImageController.ts`

Context: Gemini API `inline_data` ile görsel alıyor. Poster için yapı:
- `parts[0]` → ürün görseli (zorunlu)
- `parts[1]` → referans poster (opsiyonel)
- `parts[2]` → text prompt

Gemini API key: `systemSettings.geminiApiKey` (mevcut GeminiService'in kullandığı alan)

- [ ] **Step 1: posterImageController.ts dosyasını oluştur**

```typescript
import { createHttpFunction } from "../shared/httpHelper";
import { getSystemSettings } from "../../services/configService";

/**
 * Poster için doğrudan Gemini görsel üretimi
 * POST /generatePosterImage
 * Body: {
 *   prompt: string,
 *   productImageBase64: string,
 *   productMimeType: string,
 *   referenceImageBase64?: string,
 *   referenceImageMimeType?: string,
 * }
 */
export const generatePosterImage = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const {
    prompt,
    productImageBase64,
    productMimeType,
    referenceImageBase64,
    referenceImageMimeType,
  } = req.body;

  if (!prompt) {
    res.status(400).json({ success: false, error: "prompt zorunlu." });
    return;
  }
  if (!productImageBase64) {
    res.status(400).json({ success: false, error: "productImageBase64 zorunlu." });
    return;
  }

  const systemSettings = await getSystemSettings();
  const geminiApiKey = (systemSettings as any)?.geminiApiKey;
  const imageModel = (systemSettings as any)?.imageModel || "gemini-3-pro-image-preview";

  if (!geminiApiKey) {
    res.status(400).json({ success: false, error: "Gemini API key tanımlı değil (Ayarlar > API Ayarları)." });
    return;
  }

  // Gemini SDK lazy import
  const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = await import("@google/generative-ai");
  const client = new GoogleGenerativeAI(geminiApiKey);

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];

  const genModel = client.getGenerativeModel({ model: imageModel, safetySettings });

  // Content parts: [ürün görseli, (opsiyonel) referans poster, text prompt]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentParts: any[] = [
    {
      inlineData: {
        mimeType: productMimeType || "image/jpeg",
        data: productImageBase64,
      },
    },
  ];

  if (referenceImageBase64) {
    contentParts.push({
      inlineData: {
        mimeType: referenceImageMimeType || "image/jpeg",
        data: referenceImageBase64,
      },
    });
  }

  // Poster-specific prompt prefix
  const posterPrompt = referenceImageBase64
    ? `IMAGE 1: The product to feature in the poster.
IMAGE 2: A reference poster — follow its composition, color palette, lighting style, and visual hierarchy exactly. Do NOT copy the product from it; use only its design DNA.

${prompt}

Return ONLY the final poster image.`
    : `${prompt}\n\nReturn ONLY the final poster image.`;

  contentParts.push({ text: posterPrompt });

  const startTime = Date.now();

  try {
    const result = await genModel.generateContent(contentParts);
    const response = result.response;

    if (!response.candidates || response.candidates.length === 0) {
      const blockReason = (response as any).promptFeedback?.blockReason;
      throw new Error(`Gemini yanıt vermedi${blockReason ? `: ${blockReason}` : "."}`);
    }

    const candidate = response.candidates[0];
    if (candidate.finishReason && candidate.finishReason !== "STOP") {
      throw new Error(`Gemini finishReason: ${candidate.finishReason}`);
    }

    // Görsel part'ı bul
    const imagePart = candidate.content?.parts?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.inlineData?.mimeType?.startsWith("image/")
    ) as any;

    if (!imagePart) {
      throw new Error("Gemini görsel üretmedi — sadece metin döndü.");
    }

    const duration = Date.now() - startTime;

    // Basit maliyet tahmini (usageMetadata yoksa fallback)
    const usageMetadata = (response as any).usageMetadata;
    const costs: Record<string, number> = {
      "gemini-3-pro-image-preview": 0.134,
      "gemini-3.1-flash-image-preview": 0.10,
    };
    const cost = costs[imageModel] || 0.10;

    console.log(`[PosterImage] Görsel üretildi: ${duration}ms, model: ${imageModel}, input_tokens: ${usageMetadata?.promptTokenCount || "?"}`);

    res.json({
      success: true,
      data: {
        imageBase64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
        model: imageModel,
        cost,
        durationMs: duration,
      },
    });
  } catch (err: any) {
    console.error("[PosterImage] Hata:", err.message);
    res.status(500).json({ success: false, error: err.message || "Görsel üretimi başarısız." });
  }
}, { timeoutSeconds: 120, memory: "512MiB" });
```

- [ ] **Step 2: createHttpFunction helper'ının import path'ini doğrula**

```bash
grep -r "createHttpFunction" /Users/sertanacikgoz/Desktop/InstagramPaylaşımOtomosyonu/functions/src/controllers/orchestrator/posterSmartController.ts | head -3
```

Beklenen: `from "../shared/httpHelper"` veya benzer bir path. Eğer farklıysa yukarıdaki import'u güncelle.

---

### Task 2: Export chain güncelle

**Files:**
- Modify: `functions/src/controllers/orchestrator/index.ts`
- Modify: `functions/src/controllers/orchestratorController.ts`

- [ ] **Step 1: orchestrator/index.ts'e export ekle**

`posterSmartController` export bloğundan sonrasına ekle:

```typescript
// Poster Image Controller (Gemini doğrudan görsel üretimi)
export { generatePosterImage } from "./posterImageController";
```

- [ ] **Step 2: orchestratorController.ts'e export ekle**

`generatePosterPrompt,` satırından sonrasına ekle:

```typescript
  generatePosterImage,
```

---

### Task 3: api.ts'e generatePosterImage ekle

**Files:**
- Modify: `admin/src/services/api.ts`

- [ ] **Step 1: Mevcut `generatePosterPrompt` fonksiyonunu bul ve hemen altına `generatePosterImage` ekle**

`api.ts`'deki `generatePosterPrompt` fonksiyonunu bul (satır ~2971) ve hemen altına:

```typescript
async generatePosterImage(params: {
  prompt: string;
  productImageBase64: string;
  productMimeType: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
}): Promise<{ imageBase64: string; mimeType: string; model: string; cost: number; durationMs: number }> {
  const res = await this.post<{ success: boolean; data: { imageBase64: string; mimeType: string; model: string; cost: number; durationMs: number } }>(
    "generatePosterImage",
    params
  );
  if (!res.data?.success) throw new Error((res.data as any)?.error || "Görsel üretimi başarısız");
  return res.data.data;
},
```

**Not:** `this.post<>()` yerine mevcut api.ts'deki HTTP çağrı pattern'ine uy. `generatePosterPrompt`'un nasıl çağrı yaptığına bak ve aynısını kullan.

---

### Task 4: PromptGenerator.tsx güncelle

**Files:**
- Modify: `admin/src/components/poster/PromptGenerator.tsx`

Bu dosya 356 satır — 400 limitinin altında, değişiklik burada yapılabilir.

- [ ] **Step 1: State ekle**

Mevcut state'lerin yanına (satır ~36-41 civarı):

```typescript
const [generatingImage, setGeneratingImage] = useState(false);
const [generatedImage, setGeneratedImage] = useState<{ base64: string; mimeType: string; cost: number } | null>(null);
```

- [ ] **Step 2: handleGenerateImage fonksiyonu ekle**

`handleCopy` fonksiyonundan önce:

```typescript
const handleGenerateImage = async () => {
  if (!result || !props.productImageBase64) return;
  setGeneratingImage(true);
  setGeneratedImage(null);
  try {
    const img = await api.generatePosterImage({
      prompt: result.prompt,
      productImageBase64: props.productImageBase64,
      productMimeType: props.productMimeType,
      referenceImageBase64: props.referenceImageBase64 || undefined,
      referenceImageMimeType: props.referenceImageMimeType || undefined,
    });
    setGeneratedImage({ base64: img.imageBase64, mimeType: img.mimeType, cost: img.cost });
  } catch (err: any) {
    setError(err.message || "Görsel üretimi başarısız");
  } finally {
    setGeneratingImage(false);
  }
};
```

- [ ] **Step 3: UI — "Gemini ile Üret" butonu ekle**

Sadece `targetModel === "gemini"` olduğunda göster. Mevcut buton bloğundan (`<div className="flex gap-2">`) sonrasına:

```tsx
{/* Gemini ile doğrudan görsel üret — sadece gemini modelinde */}
{targetModel === "gemini" && (
  <div className="border-t border-gray-100 pt-3 mt-1 space-y-3">
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
      Prompt + ürün görseli{props.referenceImageBase64 ? " + referans poster" : ""} → Gemini'ye gönderilir
    </p>

    {/* Üretilen görsel */}
    {generatedImage && (
      <div className="space-y-2">
        <img
          src={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`}
          alt="Gemini poster"
          className="w-full rounded-xl border border-gray-200 shadow"
        />
        <div className="flex gap-2">
          <a
            href={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`}
            download="poster.png"
            className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium text-center hover:bg-gray-800"
          >
            İndir
          </a>
          <p className="flex-1 text-xs text-gray-400 flex items-center justify-center">
            ~${generatedImage.cost.toFixed(3)} maliyet
          </p>
        </div>
      </div>
    )}
  </div>
)}
```

---

### Task 5: Build kontrol

- [ ] **Step 1: functions build**

```bash
cd /Users/sertanacikgoz/Desktop/InstagramPaylaşımOtomosyonu/functions && npm run build 2>&1 | tail -30
```

Beklenen: `Build succeeded` veya benzer başarı mesajı. Hata varsa düzelt.

- [ ] **Step 2: admin build**

```bash
cd /Users/sertanacikgoz/Desktop/InstagramPaylaşımOtomosyonu/admin && npm run build 2>&1 | tail -20
```

Beklenen: Hatasız build.

---

## Notlar

- `createHttpFunction` import path'i doğrulanmalı (Task 1, Step 2)
- `api.ts`'deki HTTP çağrı pattern'i mevcut `generatePosterPrompt` implementasyonundan alınmalı
- `geminiApiKey` Firestore `system-settings`'den geliyor — `getSystemSettings()` servisini kullan
- `imageModel` ayarı da `system-settings`'den geliyor (`posterPromptModel` değil, `imageModel` alanı)

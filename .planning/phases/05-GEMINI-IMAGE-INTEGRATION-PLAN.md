# Phase 5: Gemini Image Integration Plan

**Tarih:** 2026-01-14
**Status:** Planlandı - Uygulama Bekliyor
**Öncelik:** Yüksek

---

## Özet

DALL-E 3 text-to-image yaklaşımını **Gemini img2img** ile değiştiriyoruz. Bu sayede:
- Orijinal ürün fotoğrafı korunacak
- Marka stili tutarlı uygulanacak
- Profesyonel Story görselleri üretilecek

---

## Problem

**Mevcut Sistem (DALL-E 3):**
```
Orijinal Fotoğraf → Vision API Analiz → Metin Açıklama → DALL-E → YENİ Görsel
```
- DALL-E orijinal görseli hiç görmüyor
- Sadece metin açıklamasından üretiyor
- Sonuç: Ürünün tanınmaz hale gelmesi (animasyon kruvasanı)

**Yeni Sistem (Gemini img2img):**
```
Orijinal Fotoğraf → Gemini + Prompt → AYNI Ürün + Yeni Stil
```
- Gemini orijinal görseli görüyor
- imageFaithfulness ile kontrol
- Sonuç: Aynı ürün, marka stilinde

---

## Teknik Detaylar

### API Bilgileri

| Model | API ID | Fiyat | Kullanım |
|-------|--------|-------|----------|
| Gemini 3 Pro Image | `gemini-3-pro-image` | $0.04/görsel | Final kalite |
| Gemini 2.5 Flash Image | `gemini-2.5-flash-image` | $0.01/görsel | Test/günlük |

**Authentication:**
- Development: Google AI Studio API Key
- Production: Google Cloud Service Account

**Endpoint (AI Studio):**
```
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

**SDK:**
```bash
npm install @google-ai/generativelanguage
# veya
npm install @google-cloud/vertexai
```

### img2img Request Format

```typescript
const request = {
  contents: [
    {
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Image
          }
        },
        {
          text: "Editorial-style artisan café photography..."
        }
      ]
    }
  ],
  generationConfig: {
    imageFaithfulness: 0.7,  // 0.0 (yaratıcı) - 1.0 (sadık)
    aspectRatio: "9:16",      // Instagram Story
    outputMimeType: "image/png"
  }
};
```

### Parametreler

| Parametre | Değer | Açıklama |
|-----------|-------|----------|
| `imageFaithfulness` | 0.0 - 1.0 | Orijinale sadakat (önerilen: 0.6-0.7) |
| `aspectRatio` | "9:16" | Instagram Story formatı |
| `outputMimeType` | "image/png" | Çıktı formatı |
| `negativePrompt` | string | İstenmeyen öğeler |
| `quality` | "hd" | Yüksek kalite çıktı (2026 güncellemesi) |

---

## Production-Grade Eklemeler

### 1. Safety Settings (Güvenlik Ayarları)

Gemini modelleri sıkı güvenlik filtrelerine sahip. Masum yemek fotoğrafları bile bazen
yanlışlıkla filtreye takılabilir. Bunu önlemek için:

```typescript
import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
  },
];
```

### 2. Text-in-Image (Görsel Üzerine Metin)

Gemini 3 Pro görselin üzerine hatasız metin yazabilir. Story'lerde kullanılabilir:

```typescript
// Prompt'a eklenecek (opsiyonel)
const textOverlay = productName
  ? `Subtly render the text "${productName}" in a modern, elegant serif font
     in the lower third of the image, with subtle shadow for readability.`
  : '';

const fullPrompt = `${basePrompt}\n\n${textOverlay}`;
```

**Kullanım Alanları:**
- Ürün ismi ("Bitter Çikolata")
- Kampanya sloganı ("Freshly Baked")
- Fiyat bilgisi
- Marka logosu metni

### 3. Pre-processing (Görsel Optimizasyonu)

10MB'lık ham fotoğraf göndermek:
- Latency artırır
- Hata riski yükseltir
- Maliyet artırabilir

**Çözüm:** `sharp` ile görseli optimize et:

```typescript
import sharp from 'sharp';

async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(2048, 2048, {
      fit: 'inside',           // En-boy oranını koru
      withoutEnlargement: true // Küçük görselleri büyütme
    })
    .png({ quality: 90 })
    .toBuffer();
}
```

**Gerekli Paket:**
```bash
cd functions && npm install sharp
```

### 4. Enhanced Flag (isEnhanced)

AI başarısız olursa orijinal kullanılır. Bunu takip için:

```typescript
interface Photo {
  // ... mevcut alanlar

  // YENİ: AI durumu takibi
  isEnhanced: boolean;        // AI ile mi üretildi?
  enhancementError?: string;  // Hata varsa nedeni
  enhancementModel?: string;  // Hangi model kullanıldı?
}
```

**Dashboard'da gösterim:**
- ✅ AI Enhanced (Gemini 3 Pro)
- ⚠️ Original (AI failed: rate limit)
- 📷 Original (AI skipped)

---

## Dosya Yapısı

### Yeni Dosyalar

```
functions/src/
├── services/
│   ├── gemini.ts          # YENİ - GeminiService
│   └── index.ts           # Export güncelle
├── prompts/
│   ├── index.ts           # Prompt yönetimi
│   ├── cafe-patisserie.ts # CAFE-PATISSERIE promptu
│   └── styles.ts          # Stil varyasyonları
└── types/
    └── index.ts           # Yeni tipler ekle

admin/src/
├── pages/
│   └── AddPhoto.tsx       # Model + Stil seçimi ekle
└── types/
    └── index.ts           # Yeni tipler ekle
```

### Güncellenecek Dosyalar

```
functions/src/
├── schedulers/
│   └── processQueue.ts    # Gemini kullanacak şekilde güncelle
├── services/
│   └── usage.ts           # Gemini maliyet takibi ekle
└── index.ts               # Config'e gemini.api_key ekle

admin/src/
├── services/
│   └── api.ts             # Yeni endpoint'ler
└── pages/
    └── Dashboard.tsx      # Gemini kullanım gösterimi
```

---

## GeminiService Implementasyonu (Production-Grade)

```typescript
// functions/src/services/gemini.ts

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold
} from '@google/generative-ai';
import sharp from 'sharp';

// Güvenlik ayarları - yemek fotoğraflarının filtreye takılmasını önler
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
  },
];

export interface GeminiConfig {
  apiKey: string;
  model: 'gemini-3-pro-image' | 'gemini-2.5-flash-image';
}

export interface ImageTransformOptions {
  prompt: string;
  negativePrompt?: string;
  faithfulness: number;      // 0.0 - 1.0
  aspectRatio: '1:1' | '9:16' | '16:9' | '4:3' | '3:4';
  textOverlay?: string;      // Görsel üzerine yazılacak metin (opsiyonel)
}

export interface TransformResult {
  imageBase64: string;
  mimeType: string;
  model: string;
  cost: number;
}

export class GeminiService {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(config: GeminiConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model;
  }

  /**
   * Görseli optimize et (max 2048px, kalite korunur)
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    return sharp(imageBuffer)
      .resize(2048, 2048, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .png({ quality: 90 })
      .toBuffer();
  }

  /**
   * Image-to-Image transformation
   * Orijinal görseli koruyarak stil uygular
   */
  async transformImage(
    imageBase64: string,
    mimeType: string,
    options: ImageTransformOptions
  ): Promise<TransformResult> {
    // Pre-processing: Görseli optimize et
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const optimizedBuffer = await this.preprocessImage(imageBuffer);
    const optimizedBase64 = optimizedBuffer.toString('base64');

    // Model oluştur (güvenlik ayarları ile)
    const genModel = this.client.getGenerativeModel({
      model: this.model,
      safetySettings
    });

    // Text overlay varsa prompt'a ekle
    let fullPrompt = options.prompt;
    if (options.textOverlay) {
      fullPrompt += `\n\nSubtly render the text "${options.textOverlay}" in a modern, elegant serif font in the lower third of the image, with subtle shadow for readability.`;
    }

    const request = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: optimizedBase64
              }
            },
            { text: fullPrompt }
          ]
        }
      ],
      generationConfig: {
        imageFaithfulness: options.faithfulness,
        aspectRatio: options.aspectRatio,
        outputMimeType: 'image/png',
        quality: 'hd',
        ...(options.negativePrompt && {
          negativePrompt: options.negativePrompt
        })
      }
    };

    try {
      const response = await genModel.generateContent(request);

      // Güvenlik kontrolü: Boş yanıt kontrolü
      if (!response.response.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
        throw new GeminiBlockedError(
          'AI blocked the content or failed to generate.',
          'CONTENT_BLOCKED'
        );
      }

      const generatedImage = response.response.candidates[0]
        .content.parts[0].inlineData;

      // Maliyet hesapla
      const cost = GeminiService.COSTS[this.model] || 0.04;

      return {
        imageBase64: generatedImage.data,
        mimeType: generatedImage.mimeType || 'image/png',
        model: this.model,
        cost
      };
    } catch (error) {
      console.error(`[GeminiService] Error with ${this.model}:`, error);

      // Hata tipini kontrol et ve yeniden fırlat
      if (error instanceof GeminiBlockedError) {
        throw error;
      }

      // Genel hata
      throw new GeminiApiError(
        error instanceof Error ? error.message : 'Unknown Gemini API error',
        'API_ERROR'
      );
    }
  }

  /**
   * Maliyet sabitleri
   */
  static readonly COSTS: Record<string, number> = {
    'gemini-3-pro-image': 0.04,
    'gemini-2.5-flash-image': 0.01,
  };
}

/**
 * Gemini API Hata Sınıfları
 */
export class GeminiApiError extends Error {
  constructor(
    message: string,
    public readonly errorType: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

export class GeminiBlockedError extends GeminiApiError {
  constructor(message: string, errorType: string) {
    super(message, errorType);
    this.name = 'GeminiBlockedError';
  }
}
```

---

## Prompt Sistemi

### Prompt Yapısı

```typescript
// functions/src/prompts/cafe-patisserie.ts

export const CAFE_PATISSERIE_PROMPT = {
  base: `Editorial-style artisan café and patisserie photography.
Minimal, warm, European bakery aesthetic with a refined natural feel.

SCENE & COMPOSITION:
Flat lay or 45-degree angle tabletop composition, or intimate eye-level café moments.
Subject centered or gently off-center following rule of thirds.
Clean but lived-in surfaces: marble, light wood, ceramic plates, linen napkins.

LIGHTING:
Soft natural daylight streaming from large window, slightly diffused.
Warm color temperature evoking late morning feel.
No harsh highlights, no studio flash.

COLOR PALETTE:
Warm neutrals: cream, beige, soft brown, muted caramel tones.
Subtle earthy accents: sage green, terracotta, dusty rose.
Overall desaturated, cohesive tone.

TECHNICAL:
Ultra high resolution, shallow depth of field.
Film-like softness with subtle grain texture.
Kodak Portra-like tones, analog film aesthetic.`,

  negative: `bright artificial colors, neon tones, oversaturated,
over-styled food, glossy artificial finish, plastic appearance,
stock photo look, hard shadows, dramatic lighting, harsh spotlight,
cartoon style, 3D CGI, HDR processing, digital render look,
watermark, low resolution, blurry, amateur photography`,

  styles: {
    'pure-minimal': `Maximum negative space. Single product focus.
Monochrome neutral palette. Very soft lighting.`,

    'lifestyle-moments': `Human interaction priority. Story-driven.
Warmer tones. Natural moments with hands.`,

    'rustic-warmth': `Wooden surfaces. Terracotta accents.
More prominent texture. Homemade feeling.`,

    'french-elegance': `White porcelain. Linen napkins.
Elegant presentation. Chic minimalism.`
  }
};
```

### Prompt Builder

```typescript
// functions/src/prompts/index.ts

import { CAFE_PATISSERIE_PROMPT } from './cafe-patisserie';

export type StyleVariant =
  | 'pure-minimal'
  | 'lifestyle-moments'
  | 'rustic-warmth'
  | 'french-elegance';

export function buildPrompt(
  category: string,
  style: StyleVariant,
  productName?: string
): { prompt: string; negativePrompt: string } {

  // Şimdilik sadece cafe-patisserie
  const base = CAFE_PATISSERIE_PROMPT;

  let prompt = base.base;

  // Stil ekle
  if (base.styles[style]) {
    prompt += `\n\nSTYLE VARIATION:\n${base.styles[style]}`;
  }

  // Ürün adı varsa ekle
  if (productName) {
    prompt += `\n\nPRODUCT: ${productName} - maintain exact product appearance.`;
  }

  return {
    prompt,
    negativePrompt: base.negative
  };
}
```

---

## Firestore Schema Güncellemesi

### Queue Item (Güncellenmiş)

```typescript
interface Photo {
  id: string;

  // Mevcut alanlar
  originalUrl: string;
  enhancedUrl?: string;
  productCategory: ProductCategory;
  productName?: string;
  caption: string;
  status: QueueStatus;
  uploadedAt: number;
  processedAt?: number;
  publishedAt?: number;
  storyId?: string;
  error?: string;

  // YENİ ALANLAR
  aiModel: 'gemini-pro' | 'gemini-flash' | 'none';
  styleVariant: StyleVariant;
  faithfulness: number;  // 0.0 - 1.0
}
```

---

## Admin Panel UI Değişiklikleri

### AddPhoto.tsx Güncellemesi

```tsx
// Yeni state'ler
const [aiModel, setAiModel] = useState<'gemini-pro' | 'gemini-flash'>('gemini-flash');
const [styleVariant, setStyleVariant] = useState<StyleVariant>('lifestyle-moments');
const [faithfulness, setFaithfulness] = useState(0.7);

// UI Eklentileri
<div className="space-y-6">

  {/* AI Model Seçimi */}
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-3">
      AI Model
    </label>
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => setAiModel('gemini-flash')}
        className={`p-4 rounded-xl border-2 text-left ${
          aiModel === 'gemini-flash'
            ? 'border-brand-blue bg-brand-blue/10'
            : 'border-gray-200'
        }`}
      >
        <div className="font-medium">Gemini 2.5 Flash</div>
        <div className="text-sm text-gray-500">Hızlı • $0.01</div>
        <div className="text-xs text-gray-400 mt-1">Test ve denemeler için</div>
      </button>

      <button
        type="button"
        onClick={() => setAiModel('gemini-pro')}
        className={`p-4 rounded-xl border-2 text-left ${
          aiModel === 'gemini-pro'
            ? 'border-brand-mustard bg-brand-mustard/10'
            : 'border-gray-200'
        }`}
      >
        <div className="font-medium">Gemini 3 Pro</div>
        <div className="text-sm text-gray-500">Kalite • $0.04</div>
        <div className="text-xs text-gray-400 mt-1">Final paylaşımlar için</div>
      </button>
    </div>
  </div>

  {/* Stil Seçimi */}
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-3">
      Görsel Stili
    </label>
    <div className="grid grid-cols-2 gap-3">
      {[
        { id: 'pure-minimal', name: 'Pure Minimal', desc: 'Maksimum negatif alan' },
        { id: 'lifestyle-moments', name: 'Lifestyle', desc: 'Sıcak, insan dokunuşu' },
        { id: 'rustic-warmth', name: 'Rustic', desc: 'Ahşap, doğal dokular' },
        { id: 'french-elegance', name: 'French', desc: 'Şık, zarif sunum' },
      ].map((style) => (
        <button
          key={style.id}
          type="button"
          onClick={() => setStyleVariant(style.id as StyleVariant)}
          className={`p-3 rounded-xl border-2 text-left ${
            styleVariant === style.id
              ? 'border-brand-green bg-brand-green/10'
              : 'border-gray-200'
          }`}
        >
          <div className="font-medium text-sm">{style.name}</div>
          <div className="text-xs text-gray-500">{style.desc}</div>
        </button>
      ))}
    </div>
  </div>

  {/* Sadakat Slider */}
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Orijinale Sadakat: {(faithfulness * 100).toFixed(0)}%
    </label>
    <input
      type="range"
      min="0.3"
      max="0.9"
      step="0.1"
      value={faithfulness}
      onChange={(e) => setFaithfulness(parseFloat(e.target.value))}
      className="w-full"
    />
    <div className="flex justify-between text-xs text-gray-400 mt-1">
      <span>Yaratıcı</span>
      <span>Orijinale Sadık</span>
    </div>
  </div>

</div>
```

---

## processQueue Güncellemesi

```typescript
// functions/src/schedulers/processQueue.ts

import { GeminiService } from '../services/gemini';
import { buildPrompt } from '../prompts';

export async function processNextItem(options: ProcessOptions): Promise<ProcessResult> {
  // ... mevcut kod ...

  // Step 3: AI Enhancement (Gemini)
  if (item.aiModel !== 'none') {
    try {
      console.log(`[Orchestrator] Starting Gemini enhancement (${item.aiModel})...`);

      const gemini = new GeminiService({
        apiKey: config.gemini.apiKey,
        model: item.aiModel === 'gemini-pro'
          ? 'gemini-3-pro-image'
          : 'gemini-2.5-flash-image'
      });

      // Orijinal görseli indir ve base64'e çevir
      const imageBuffer = await downloadImage(item.originalUrl);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = getMimeType(item.originalUrl);

      // Prompt oluştur
      const { prompt, negativePrompt } = buildPrompt(
        item.productCategory,
        item.styleVariant,
        item.productName
      );

      // img2img dönüşümü
      const result = await gemini.transformImage(base64Image, mimeType, {
        prompt,
        negativePrompt,
        faithfulness: item.faithfulness,
        aspectRatio: '9:16'
      });

      // Enhanced görseli Storage'a yükle
      const enhancedUrl = await uploadToStorage(
        result.imageBase64,
        `enhanced/${item.id}.png`
      );

      finalImageUrl = enhancedUrl;

      // Maliyet logla
      await usage.logGeminiUsage(item.id, item.aiModel, result.cost);

      console.log('[Orchestrator] Gemini enhancement complete');
    } catch (enhanceError) {
      console.error('[Orchestrator] Gemini enhancement failed:', enhanceError);
      console.log('[Orchestrator] Falling back to original image');
    }
  }

  // ... devam ...
}
```

---

## Maliyet Takibi Güncellemesi

```typescript
// functions/src/services/usage.ts

export const COSTS = {
  VISION_API: 0.01,
  DALLE_3_HD: 0.08,
  DALLE_3_STANDARD: 0.04,
  // YENİ
  GEMINI_3_PRO_IMAGE: 0.04,
  GEMINI_2_5_FLASH_IMAGE: 0.01,
};

export type UsageType =
  | 'vision'
  | 'dalle'
  | 'instagram_post'
  | 'gemini-pro'      // YENİ
  | 'gemini-flash';   // YENİ

/**
 * Gemini kullanımı logla
 */
async logGeminiUsage(
  itemId: string | undefined,
  model: 'gemini-pro' | 'gemini-flash',
  cost: number
): Promise<string> {
  return this.logUsage({
    type: model,
    cost,
    description: model === 'gemini-pro'
      ? 'Gemini 3 Pro Image görsel dönüşümü'
      : 'Gemini 2.5 Flash Image görsel dönüşümü',
    itemId,
  });
}
```

---

## Firebase Config

```bash
# Gemini API Key ekle
firebase functions:config:set gemini.api_key="YOUR_GOOGLE_AI_STUDIO_KEY"

# Tüm config'i kontrol et
firebase functions:config:get
```

---

## Uygulama Sırası

### Aşama 1: Temel Altyapı
- [ ] Gerekli paketleri kur:
  ```bash
  cd functions
  npm install @google/generative-ai sharp
  npm install -D @types/sharp
  ```
- [ ] `GeminiService` oluştur (safety settings dahil)
- [ ] `GeminiApiError` ve `GeminiBlockedError` sınıfları
- [ ] Firebase config'e `gemini.api_key` ekle
- [ ] Basit test endpoint'i yaz (`testGeminiTransform`)

### Aşama 2: Prompt Sistemi
- [ ] `prompts/` klasörü oluştur
- [ ] CAFE-PATISSERIE promptunu taşı
- [ ] `buildPrompt()` fonksiyonunu yaz
- [ ] Stil varyasyonlarını ekle (4 stil)
- [ ] Negative prompt entegrasyonu

### Aşama 3: Admin Panel
- [ ] `AddPhoto.tsx`'e model seçimi ekle (Flash/Pro)
- [ ] Stil seçici ekle (4 seçenek)
- [ ] Faithfulness slider ekle (0.3-0.9)
- [ ] Text overlay input ekle (opsiyonel)
- [ ] API'ye yeni alanları gönder
- [ ] Types güncellemesi

### Aşama 4: İşleme Pipeline
- [ ] `processQueue.ts`'i Gemini ile güncelle
- [ ] Pre-processing (sharp ile resize)
- [ ] Image download/upload yardımcıları
- [ ] Hata yönetimi ve fallback (isEnhanced flag)
- [ ] Maliyet takibi entegrasyonu (gemini-pro/gemini-flash)

### Aşama 5: Test & İyileştirme
- [ ] Flash model ile test (düşük maliyet)
- [ ] Pro model ile test (kalite karşılaştırma)
- [ ] Farklı faithfulness değerleri dene (0.5, 0.7, 0.9)
- [ ] Prompt fine-tuning
- [ ] Text overlay testi
- [ ] Edge case testleri (büyük dosya, farklı formatlar)

---

## Gereksinimler

**Başlamadan önce:**
1. Google AI Studio API Key
2. Firebase config güncelleme yetkisi

**API Key alma:**
https://aistudio.google.com/apikey

**Kurulacak Paketler:**
```bash
# Functions klasöründe
cd functions
npm install @google/generative-ai sharp
npm install -D @types/sharp
```

**Firebase Config:**
```bash
firebase functions:config:set gemini.api_key="YOUR_GOOGLE_AI_STUDIO_KEY"
```

---

## Notlar

- Vision API artık kullanılmıyor (gereksiz maliyet)
- DALL-E kodu kaldırılabilir veya fallback olarak tutulabilir
- Günde 50 ücretsiz görsel (AI Studio)
- Rate limit: 60 RPM (standart), 2000 RPM (pro hesap)

---

**Son Güncelleme:** 2026-01-14
**Durum:** Uygulama Bekliyor

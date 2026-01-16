# Photo Prompt Studio + Instagram Otomasyon Orchestration Planı

**Tarih:** 2026-01-16
**Versiyon:** 1.0
**Durum:** Planlama Tamamlandı, Uygulama Bekliyor

---

## 1. VİZYON

İki projeyi birleştirerek uçtan uca otomatik görsel içerik üretim sistemi kurmak:

```
Ürün Fotoğrafı → AI Prompt Üretimi → Görsel İşleme → Telegram Onay → Instagram Paylaşım
     │                  │                   │              │              │
Photo Prompt      Claude Code +        Gemini         Mevcut Bot      Mevcut API
  Studio           KURALLAR.md         img2img
```

---

## 2. MEVCUT SİSTEMLER

### 2.1 Photo Prompt Studio (playground/)

**Konum:** `/Users/sertanacikgoz/Desktop/playground/`

**Yetenekler:**
- Nörogastronomi prensipleri (KURALLAR.md V2.1)
- Platform-spesifik prompt formatları (Midjourney, DALL-E, Gemini, Ideogram)
- Işık stratejileri (SIDE_LIGHT, BACK_LIGHT, vb.)
- Aksiyon anları ([POUR], [CUT], [BREAK], [DUST])
- Wabi-sabi estetiği
- Renk psikolojisi

**Eksikler:**
- Görsel işleme yok (sadece prompt üretir)
- Instagram entegrasyonu yok
- Otomasyon yok

### 2.2 Instagram Paylaşım Otomasyonu

**Konum:** `/Users/sertanacikgoz/Desktop/InstagramPaylaşımOtomosyonu/`

**Yetenekler:**
- Gemini img2img transformation
- Telegram Human-in-the-Loop (onay sistemi)
- Instagram Graph API entegrasyonu
- Best Time to Post algoritması
- Content Calendar
- Caption Templates (8 şablon)
- Analytics Dashboard
- Admin Panel (React + Vite)

**Eksikler:**
- Prompt üretimi basit (kategori bazlı)
- Nörogastronomi bilgisi yok
- Photo Prompt Studio'nun gelişmiş kuralları yok

---

## 3. ORCHESTRATION MİMARİSİ

### 3.1 Köprü Yaklaşımı

İki projeyi ayrı tutup API üzerinden bağlıyoruz:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHOTO PROMPT STUDIO                          │
│                   (Claude Code Skills)                          │
│                                                                 │
│  /instagram komutu                                              │
│        │                                                        │
│        ▼                                                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   VISUAL    │───▶│   PROMPT    │───▶│  INSTAGRAM  │        │
│  │  ANALYZER   │    │   WRITER    │    │   BRIDGE    │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│        │                  │                   │                 │
│   Görsel Meta        Prompt JSON         API Call               │
│                                              │                  │
└──────────────────────────────────────────────┼──────────────────┘
                                               │
                                         HTTP POST
                                               │
┌──────────────────────────────────────────────┼──────────────────┐
│                                              ▼                  │
│              INSTAGRAM OTOMASYON BACKEND                        │
│               (Firebase Cloud Functions)                        │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │  RECEIVE    │───▶│   GEMINI    │───▶│  TELEGRAM   │        │
│  │   PROMPT    │    │   img2img   │    │   ONAY      │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                              │                  │
│                                         ┌────┴────┐             │
│                                         ▼         ▼             │
│                                    ✅ Onayla  ❌ Reddet         │
│                                         │         │             │
│                                         ▼         ▼             │
│                                    Instagram   Kuyruğa          │
│                                      Post      Geri Al          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Veri Akışı

```json
{
  "source": "photo-prompt-studio",
  "version": "1.0",
  "timestamp": "2026-01-16T12:00:00Z",

  "image": {
    "url": "https://firebasestorage.googleapis.com/...",
    "localPath": "/path/to/image.jpg"
  },

  "analysis": {
    "productType": "tiramisu",
    "container": "glass",
    "dominantColors": ["#5D4037", "#F5F5DC", "#3E2723"],
    "hasTypography": false,
    "suggestedStyle": "lifestyle"
  },

  "prompt": {
    "main": "Using uploaded image as reference...",
    "negative": "steam, smoke, vapor, human hands...",
    "platform": "gemini",
    "format": "4:5"
  },

  "settings": {
    "category": "small-desserts",
    "styleVariant": "lifestyle-moments",
    "faithfulness": 0.8,
    "captionTemplateId": "minimal-001",
    "schedulingMode": "optimal"
  }
}
```

---

## 4. INSTAGRAM OTOMASYON TARAFINDA YAPILACAKLAR

### 4.1 Yeni API Endpoint: receivePromptFromStudio

**Dosya:** `functions/src/api/promptStudio.ts`

```typescript
/**
 * Photo Prompt Studio'dan prompt alır ve kuyruğa ekler
 *
 * Endpoint: POST /receivePromptFromStudio
 * Auth: API Key (header: x-api-key)
 */

import {onRequest} from "firebase-functions/v2/https";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {corsHandler} from "../utils/cors";

// Request tipi
interface PromptStudioRequest {
  // Görsel bilgisi
  imageUrl: string;

  // Analiz sonuçları
  analysis: {
    productType: string;
    dominantColors: string[];
    hasTypography: boolean;
    suggestedStyle: string;
  };

  // Prompt bilgileri
  prompt: {
    main: string;
    negative: string;
    platform: "gemini" | "dalle" | "midjourney";
    format: "1:1" | "4:5" | "9:16";
  };

  // Ayarlar
  settings: {
    category: string;
    styleVariant: string;
    faithfulness: number;
    captionTemplateId?: string;
    schedulingMode: "immediate" | "optimal" | "scheduled";
    scheduledTime?: string; // ISO date string
  };

  // Meta
  productName?: string;
  notes?: string;
}

// API Key doğrulama
const VALID_API_KEY = process.env.PROMPT_STUDIO_API_KEY || "your-secret-key";

export const receivePromptFromStudio = onRequest(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // CORS
    await corsHandler(req, res);
    if (req.method === "OPTIONS") return;

    // Sadece POST
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    // API Key kontrolü
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== VALID_API_KEY) {
      res.status(401).json({error: "Unauthorized"});
      return;
    }

    try {
      const data = req.body as PromptStudioRequest;

      // Validasyon
      if (!data.imageUrl || !data.prompt?.main) {
        res.status(400).json({error: "Missing required fields: imageUrl, prompt.main"});
        return;
      }

      const db = getFirestore();

      // Firestore'a ekle
      const docRef = await db.collection("media-queue").add({
        // Temel bilgiler
        originalUrl: data.imageUrl,
        productName: data.productName || data.analysis?.productType || "Belirtilmemiş",
        productCategory: data.settings?.category || "small-desserts",

        // Prompt bilgileri (Photo Prompt Studio'dan)
        geminiPrompt: data.prompt.main,
        negativePrompt: data.prompt.negative,
        promptPlatform: data.prompt.platform,
        promptFormat: data.prompt.format,

        // AI ayarları
        aiModel: "gemini-2.5-flash-image",
        styleVariant: data.settings?.styleVariant || "pure-minimal",
        faithfulness: data.settings?.faithfulness || 0.7,

        // Caption şablonu
        captionTemplateId: data.settings?.captionTemplateId || null,

        // Zamanlama
        schedulingMode: data.settings?.schedulingMode || "optimal",
        scheduledTime: data.settings?.scheduledTime
          ? new Date(data.settings.scheduledTime)
          : null,

        // Analiz verileri (referans için sakla)
        studioAnalysis: data.analysis || null,

        // Durum
        status: "pending",
        processed: false,

        // Meta
        source: "photo-prompt-studio",
        notes: data.notes || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log(`[PromptStudio] New item added: ${docRef.id}`);

      res.status(201).json({
        success: true,
        message: "Prompt received and queued",
        itemId: docRef.id,
        status: "pending",
      });

    } catch (error) {
      console.error("[PromptStudio] Error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);
```

### 4.2 Index.ts'e Export Ekle

**Dosya:** `functions/src/index.ts`

```typescript
// ... mevcut exportlar ...

// Photo Prompt Studio API
export {receivePromptFromStudio} from "./api/promptStudio";
```

### 4.3 Gemini Service Güncellemesi

`geminiPrompt` alanı zaten var, ancak Photo Prompt Studio'nun detaylı prompt'unu kullanmak için `processQueue` fonksiyonunu güncelle:

**Dosya:** `functions/src/schedulers/processQueue.ts` (ilgili kısım)

```typescript
// Prompt seçimi: Photo Prompt Studio varsa onu kullan, yoksa varsayılan
const prompt = item.geminiPrompt || generateDefaultPrompt(item);
const negativePrompt = item.negativePrompt || DEFAULT_NEGATIVE_PROMPT;

// Gemini'ye gönder
const result = await geminiService.transformImage(
  imageBase64,
  mimeType,
  {
    prompt,
    negativePrompt,
    faithfulness: item.faithfulness || 0.7,
    aspectRatio: item.promptFormat || "9:16",
  }
);
```

### 4.4 Environment Variable Ekle

**Firebase config:**
```bash
firebase functions:config:set promptstudio.api_key="your-secure-api-key-here"
```

**Veya .env (local):**
```
PROMPT_STUDIO_API_KEY=your-secure-api-key-here
```

---

## 5. CLAUDE CODE TARAFINDA YAPILACAKLAR

### 5.1 Skill Yapısı

```
playground/.claude/skills/
├── photo-orchestrator/
│   └── SKILL.md
├── visual-analyzer/
│   └── SKILL.md
├── prompt-writer/
│   └── SKILL.md
└── instagram-bridge/
    └── SKILL.md
```

### 5.2 Photo Orchestrator Skill

**Dosya:** `.claude/skills/photo-orchestrator/SKILL.md`

```markdown
---
name: photo-orchestrator
version: 1.0.0
description: Görsel içerik üretimi için ana orkestratör
triggers:
  - /instagram
  - /story
  - /post
  - /generate
author: Sade Patisserie
---

# Photo Orchestrator

Ürün fotoğrafından Instagram paylaşımına kadar tüm süreci yönetir.

## Kullanım

```
/instagram [görsel_yolu] [ürün_adı] [kategori]
```

**Örnek:**
```
/instagram /path/to/tiramisu.jpg "Klasik Tiramisu" small-desserts
```

## Workflow

### Adım 1: Görsel Analiz
`visual-analyzer` skill'ini çağır:
- Ürün tipi tespit
- Dominant renkler çıkar
- Typography var mı kontrol et
- Stil önerisi al

### Adım 2: Prompt Yazımı
`prompt-writer` skill'ini çağır:
- KURALLAR.md'yi oku
- Platform seç (Gemini önerilir)
- Nörogastronomi prensiplerini uygula
- Işık stratejisi belirle
- Aksiyon anı ekle (opsiyonel)
- Wabi-sabi elementi ekle (opsiyonel)

### Adım 3: Instagram'a Gönder
`instagram-bridge` skill'ini çağır:
- API endpoint'e POST at
- Yanıtı kontrol et
- Kullanıcıya bilgi ver

## Kategoriler

| Kategori | Açıklama |
|----------|----------|
| viennoiserie | Kruvasan, pain au chocolat, brioche |
| coffee | Kahve menüsü |
| chocolate | Çikolata ürünleri |
| small-desserts | Macaron, éclair, mini tart |
| slice-cakes | Dilim pastalar |
| big-cakes | Büyük pastalar |
| profiterole | Profiterol |
| special-orders | Özel siparişler |

## Stil Varyantları

| Stil | Açıklama |
|------|----------|
| pure-minimal | Sade, temiz, minimalist |
| lifestyle-moments | Yaşam anı, ortam |
| rustic-warmth | Rustik, sıcak |
| french-elegance | Fransız zarafeti |

## Output

İşlem tamamlandığında:
1. Item ID gösterilir
2. Telegram'da onay bekleniyor mesajı
3. Tahmini paylaşım zamanı (optimal mode'da)
```

### 5.3 Visual Analyzer Skill

**Dosya:** `.claude/skills/visual-analyzer/SKILL.md`

```markdown
---
name: visual-analyzer
version: 1.0.0
description: Görsel analiz ve metadata çıkarma
triggers:
  - /analyze
author: Sade Patisserie
---

# Visual Analyzer

Ürün görselini analiz eder ve metadata çıkarır.

## Yetenekler

1. **Ürün Tipi Tespiti**
   - Pasta, tatlı, içecek, çikolata, vb.
   - Alt kategori (tiramisu, cheesecake, macaron, vb.)

2. **Renk Analizi**
   - Dominant renkler (HEX)
   - Renk paleti önerisi
   - Sıcak/soğuk ton tespiti

3. **Sunum Analizi**
   - Kap/tabak tipi
   - Dekorasyon elementleri
   - Props (çatal, kaşık, peçete, vb.)

4. **Typography Kontrolü**
   - Görsel üzerinde yazı var mı?
   - Marka adı görünüyor mu?
   - Okunabilirlik durumu

5. **Stil Önerisi**
   - Ürün tipine göre en uygun stil
   - Işık stratejisi önerisi
   - Arka plan önerisi

## Output Format

```json
{
  "productType": "tiramisu",
  "productCategory": "small-desserts",
  "container": {
    "type": "glass",
    "shape": "rectangular",
    "material": "transparent"
  },
  "colors": {
    "dominant": "#5D4037",
    "secondary": "#F5F5DC",
    "accent": "#3E2723",
    "palette": "warm-earth"
  },
  "presentation": {
    "style": "layered",
    "topping": "cocoa-powder",
    "decoration": "none"
  },
  "typography": {
    "hasText": false,
    "brandVisible": false
  },
  "suggestions": {
    "styleVariant": "lifestyle-moments",
    "lightStrategy": "SIDE_LIGHT",
    "actionMoment": "DIP",
    "wabiSabi": true
  }
}
```

## Kullanım

```
/analyze [görsel_yolu]
```

Görsel yolu verilmezse, kullanıcıdan ister.
```

### 5.4 Prompt Writer Skill

**Dosya:** `.claude/skills/prompt-writer/SKILL.md`

```markdown
---
name: prompt-writer
version: 1.0.0
description: KURALLAR.md'ye uygun prompt üretimi
triggers:
  - /write-prompt
author: Sade Patisserie
---

# Prompt Writer

Nörogastronomi prensipleri ve KURALLAR.md'ye uygun prompt yazar.

## Zorunlu Okuma

Her çalıştırıldığında şu dosyayı oku:
```
/Users/sertanacikgoz/Desktop/playground/prompts/KURALLAR.md
```

## Prompt Yapısı

### Gemini Format (Varsayılan)

```
Using uploaded image as reference for [ürün].

[SAHNE TANIMI]
Lifestyle product photography of [ürün] from reference image,
[ortam ve kompozisyon detayları].

[IŞIK STRATEJİSİ]
LIGHTING: [Side/Back/Soft/Hard] light from [yön],
[ışık etkileri ve gölge detayları].

[AKSİYON ANI - Opsiyonel]
ACTION MOMENT: [Aksiyon açıklaması]

[WABİ-SABİ - Opsiyonel]
WABI-SABI: [Kusursuz kusurluluk detayları]

[ATMOSFER]
ATMOSPHERE: [Mood, renk paleti, his]

[TEKNİK]
TECHNICAL: [Format], shallow DOF (f/2.8), 8K photorealistic.

CRITICAL: [Korunması gereken detaylar - varsa]

--no [negative prompt]
```

### Negative Prompt Template

```
steam, smoke, vapor, mist, fog,
human hands, fingers, human elements, people,
dark background, black backdrop, moody lighting,
harsh shadows, flash photography,
CGI look, artificial, plastic appearance, 3D render,
text deformation, blurry typography,
different product than reference
```

## Input

Visual Analyzer'dan gelen JSON:
```json
{
  "productType": "...",
  "colors": {...},
  "suggestions": {...}
}
```

## Output

```json
{
  "main": "Using uploaded image...",
  "negative": "steam, smoke...",
  "platform": "gemini",
  "format": "4:5"
}
```

## Işık Stratejisi Seçimi

| Ürün Tipi | Önerilen Işık |
|-----------|---------------|
| Katmanlı (pasta, tiramisu) | SIDE_LIGHT |
| Parlak (glaze, sos) | BACK_LIGHT |
| Doku (ekmek, kruvasan) | SIDE_LIGHT |
| İçecek | BACK_LIGHT |
| Genel | 45_LIGHT |

## Aksiyon Anı Seçimi

| Ürün Tipi | Önerilen Aksiyon |
|-----------|------------------|
| Kremalı tatlı | DIP (kaşık batırma) |
| Katmanlı | CUT (kesim) |
| Soslu | POUR (dökme) |
| Tozlu | DUST (eleme) |
| Çıtır kabuklu | BREAK (kırma) |
```

### 5.5 Instagram Bridge Skill

**Dosya:** `.claude/skills/instagram-bridge/SKILL.md`

```markdown
---
name: instagram-bridge
version: 1.0.0
description: Instagram Otomasyon API köprüsü
triggers:
  - /send-to-instagram
author: Sade Patisserie
---

# Instagram Bridge

Photo Prompt Studio çıktısını Instagram Otomasyon sistemine gönderir.

## Konfigürasyon

```
API_ENDPOINT: https://europe-west1-instagram-automation-ad77b.cloudfunctions.net/receivePromptFromStudio
API_KEY: [.env'den veya config'den al]
```

## Request Format

```bash
curl -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -d '{
    "imageUrl": "https://...",
    "analysis": {
      "productType": "tiramisu",
      "dominantColors": ["#5D4037", "#F5F5DC"],
      "hasTypography": false,
      "suggestedStyle": "lifestyle-moments"
    },
    "prompt": {
      "main": "Using uploaded image as reference...",
      "negative": "steam, smoke...",
      "platform": "gemini",
      "format": "4:5"
    },
    "settings": {
      "category": "small-desserts",
      "styleVariant": "lifestyle-moments",
      "faithfulness": 0.8,
      "captionTemplateId": "minimal-001",
      "schedulingMode": "optimal"
    },
    "productName": "Klasik Tiramisu"
  }'
```

## Response Handling

### Başarılı (201)
```json
{
  "success": true,
  "message": "Prompt received and queued",
  "itemId": "abc123",
  "status": "pending"
}
```
→ Kullanıcıya: "Görsel kuyruğa eklendi (ID: abc123). Telegram'dan onay bekliyor."

### Hata (4xx/5xx)
```json
{
  "error": "Error message",
  "message": "Details"
}
```
→ Kullanıcıya hatayı göster, çözüm öner.

## Bash ile Gönderim

Skill içinde Bash tool kullanarak:

```bash
curl -s -X POST "https://europe-west1-instagram-automation-ad77b.cloudfunctions.net/receivePromptFromStudio" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d @/tmp/prompt-studio-payload.json
```

## Görsel URL Seçenekleri

1. **Firebase Storage (Önerilen)**
   - Görseli önce Storage'a yükle
   - Public URL al
   - API'ye gönder

2. **Geçici URL**
   - Base64 encode
   - Data URL olarak gönder (büyük dosyalarda sorun)

3. **Lokal Dosya**
   - Admin panel'e yükle
   - Oradan URL al
```

---

## 6. UYGULAMA ADIMLARI

### Faz 1: Backend API (Instagram Otomasyon)

- [ ] `functions/src/api/promptStudio.ts` dosyasını oluştur
- [ ] `functions/src/index.ts`'e export ekle
- [ ] Environment variable ekle (API key)
- [ ] Deploy et: `firebase deploy --only functions`
- [ ] Test et: `curl -X POST ...`

### Faz 2: Claude Code Skills (Photo Prompt Studio)

- [ ] `.claude/skills/` klasör yapısını oluştur
- [ ] `photo-orchestrator/SKILL.md` yaz
- [ ] `visual-analyzer/SKILL.md` yaz
- [ ] `prompt-writer/SKILL.md` yaz
- [ ] `instagram-bridge/SKILL.md` yaz

### Faz 3: Entegrasyon Testi

- [ ] Örnek görsel seç (tiramisu, kruvasan, vb.)
- [ ] `/instagram` komutu ile test et
- [ ] API yanıtını kontrol et
- [ ] Firestore'da item'ı gör
- [ ] Telegram'da onay mesajını al
- [ ] Onayla ve Instagram'da kontrol et

### Faz 4: İyileştirmeler

- [ ] Hata yönetimi geliştir
- [ ] Retry mekanizması ekle
- [ ] Batch işlem desteği
- [ ] Raporlama ekle

---

## 7. GÜVENLİK

### API Key Yönetimi

```bash
# Firebase'de
firebase functions:config:set promptstudio.api_key="$(openssl rand -hex 32)"

# Görüntüle
firebase functions:config:get
```

### CORS Ayarları

`promptStudio.ts`'de sadece izinli origin'lere izin ver:

```typescript
const allowedOrigins = [
  "http://localhost:5173",      // Admin panel (dev)
  "https://admin.sade.com.tr",  // Admin panel (prod)
];
```

### Rate Limiting (Opsiyonel)

```typescript
// Basit rate limiting
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT = 10; // 10 request per minute

if (rateLimitMap.get(apiKey) >= RATE_LIMIT) {
  res.status(429).json({error: "Rate limit exceeded"});
  return;
}
```

---

## 8. MALİYET ANALİZİ

### Mevcut (Instagram Otomasyon)

| Servis | Birim | Aylık Tahmini |
|--------|-------|---------------|
| Firebase Functions | Invocation | ~$0.40 |
| Firestore | R/W | ~$0.20 |
| Storage | GB | ~$0.50 |
| Gemini 2.0 Flash | Per image | ~$0.30 (30 görsel) |
| **Toplam** | | **~$1.40/ay** |

### Orchestration Eklentisi

| Ek Servis | Birim | Aylık Tahmini |
|-----------|-------|---------------|
| Ek Function çağrısı | Invocation | ~$0.10 |
| **Toplam Ek** | | **~$0.10/ay** |

### Toplam Tahmini Maliyet: **~$1.50/ay**

---

## 9. GELİŞTİRME FIRSATLARI

### Kısa Vade
- [ ] A/B testing for captions
- [ ] Multi-style generation (aynı görsel, 4 stil)
- [ ] Batch upload desteği

### Orta Vade
- [ ] Reels/Video desteği
- [ ] Story highlight otomasyonu
- [ ] Engagement prediction

### Uzun Vade
- [ ] Multi-platform (TikTok, Pinterest)
- [ ] AI-driven content calendar
- [ ] Sentiment analysis

---

## 10. KAYNAKLAR

### Dosyalar
- Photo Prompt Studio: `/Users/sertanacikgoz/Desktop/playground/`
- Instagram Otomasyon: `/Users/sertanacikgoz/Desktop/InstagramPaylaşımOtomosyonu/`
- KURALLAR.md: `/Users/sertanacikgoz/Desktop/playground/prompts/KURALLAR.md`

### Dokümantasyon
- [Firebase Functions](https://firebase.google.com/docs/functions)
- [Gemini API](https://ai.google.dev/gemini-api/docs)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api/)

---

**Hazırlayan:** Claude Code + Sertan
**Tarih:** 2026-01-16
**Sonraki Adım:** Bu dosyayı InstagramPaylaşımOtomosyonu projesine kopyala ve Faz 1'den başla.

# Poster Üretim Modu — Uygulama Planı

> **Tarih:** 2026-03-22
> **Amaç:** Dashboard'dan poster üretimi — poster-maker skill'i Claude API üzerinden kullanılarak

## Mimari

```
Dashboard "Poster Üret"
    ↓
Cloud Function: generatePoster
    ↓
Faz 1: poster-maker SKILL.md okunur (dosyadan)
    ↓
Faz 2: Claude API (Haiku) çağrılır
  - system prompt = SKILL.md içeriği (araştırma adımları çıkarılmış, sadece prompt üretim kuralları)
  - user message = { ürün görseli base64, posterType, title, subtitle, price, mood }
  - Claude çıktısı = optimize edilmiş Gemini prompt'u
    ↓
Faz 3: Gemini API çağrılır
  - model: gemini-3-pro-image-preview (metin doğruluğu en iyi)
  - referans görsel: ürün fotoğrafı (base64)
  - prompt: Claude'un ürettiği poster prompt'u
  - config: { aspectRatio: "2:3", imageSize: "4K" }
    ↓
Faz 4: Sonuç Storage'a kaydedilir → Dashboard'a döner
```

## Adımlar

### Adım 1: Backend — Cloud Function `generatePoster`

**Dosya:** `functions/src/controllers/orchestrator/posterController.ts`

**Endpoint parametreleri:**
```typescript
interface PosterRequest {
  // Ürün görseli (base64 veya Storage URL)
  productImageUrl?: string;
  productImageBase64?: string;

  // Poster ayarları
  posterType: "product-hero" | "seasonal" | "launch" | "menu" | "brand";
  title?: string;        // Kullanıcı vermezse Claude önerir
  subtitle?: string;     // Kullanıcı vermezse Claude önerir
  price?: string;        // Opsiyonel
  mood?: string;         // "premium" | "warm" | "energetic" | "minimal"

  // Teknik
  aspectRatio?: string;  // Varsayılan "2:3"
  imageSize?: string;    // Varsayılan "4K"
}
```

**Akış:**
1. Validasyon (görsel zorunlu)
2. SKILL.md dosyasını oku → system prompt olarak hazırla
3. Anthropic API çağrısı (Haiku) → Gemini prompt'u al
4. Gemini API çağrısı (referans görsel + prompt) → poster görseli al
5. Storage'a kaydet
6. Response: { posterUrl, prompt, cost }

**Gerekli paketler:**
- `@anthropic-ai/sdk` (zaten `package.json`'da var mı kontrol et)
- `@google/genai` veya mevcut `@google/generative-ai` (imageConfig desteği kontrol et)

### Adım 2: Skill İçeriğini API'ye Uyarla

SKILL.md'nin tamamını system prompt olarak göndermek çok uzun ve gereksiz.
Claude API için **kısaltılmış versiyon** oluştur:

**Dosya:** `functions/src/orchestrator/posterSkillPrompt.ts`

İçerik: SKILL.md'den sadece şunlar:
- Marka bloğu kuralı
- Metin içeriği belirleme kuralları
- Prompt yapısı template'i
- Metin yazma kuralları (Gemini için)
- Kritik kurallar

Çıkarılacaklar (Claude Code'a özel, API'de gereksiz):
- Tasarım araştırması adımı (web search yapamaz)
- Upscale talimatları (kullanıcıya sonra verilir)
- Baskı hazırlığı (kullanıcıya sonra verilir)

### Adım 3: Gemini imageConfig Desteği

Mevcut `gemini.ts` servisi `imageConfig` (aspectRatio, imageSize) destekliyor mu kontrol et.
Desteklemiyorsa ekle:

```typescript
// generateContent çağrısına imageConfig ekle
config: {
  responseModalities: ["TEXT", "IMAGE"],
  imageConfig: {
    aspectRatio: "2:3",
    imageSize: "4K"
  }
}
```

**Not:** Mevcut SDK `@google/generative-ai` bu parametreleri desteklemeyebilir.
`@google/genai` (yeni SDK) gerekebilir. Araştır.

### Adım 4: Frontend — Dashboard UI

**Dosya:** `admin/src/pages/OrchestratorDashboard.tsx`

Üretim Kontrolü modalına **"Poster Modu" toggle'ı** ekle:

```
[Poster Modu] toggle
    ↓ açıkken:
- Aspect ratio otomatik "2:3 Poster" olur (disabled, değiştirilemez)
- Metin alanları belirir:
  - Başlık (opsiyonel — boşsa AI önerir)
  - Alt başlık (opsiyonel — boşsa AI önerir)
  - Fiyat (opsiyonel)
- Poster tipi dropdown (Ürün Hero varsayılan)
- Mood seçimi (Premium Minimal varsayılan)
```

"Devam Et" butonu → `generatePoster` endpoint'ini çağırır (normal pipeline yerine).

### Adım 5: Sonuç Gösterimi

Poster üretildikten sonra:
- Görseli modal'da göster (büyük, 2:3 oranında)
- "İndir" butonu (PNG, yüksek çözünürlük)
- "Upscale Talimatları" butonu (Real-ESRGAN komutu göster)
- "Tekrar Üret" butonu (aynı parametrelerle yeniden)

## Dosya Değişiklikleri

| Dosya | İşlem | Açıklama |
|-------|-------|----------|
| `functions/src/controllers/orchestrator/posterController.ts` | YENİ | Cloud Function endpoint |
| `functions/src/controllers/orchestrator/index.ts` | DÜZENLE | posterController export |
| `functions/src/orchestrator/posterSkillPrompt.ts` | YENİ | Skill → API system prompt |
| `functions/src/services/gemini.ts` | DÜZENLE | imageConfig desteği (gerekirse) |
| `admin/src/pages/OrchestratorDashboard.tsx` | DÜZENLE | Poster modu UI |
| `admin/src/services/api.ts` | DÜZENLE | generatePoster API metodu |

## Maliyet Tahmini (poster başına)

| Katman | Model | Tahmini Maliyet |
|--------|-------|-----------------|
| Prompt üretimi | Claude Haiku | ~$0.002 |
| Görsel üretimi | Gemini 3 Pro (4K) | ~$0.24 |
| **Toplam** | | **~$0.25/poster** |

$4.43 bakiye ile ~17 poster üretilebilir (sadece Claude maliyeti, Gemini ücretsiz tier'da ise daha fazla).

## Riskler

1. **Gemini SDK uyumsuzluğu** — mevcut `@google/generative-ai` imageConfig desteklemeyebilir → yeni SDK gerekebilir
2. **Metin doğruluğu** — Türkçe karakterler (ş, ç, ğ, ı) Gemini'de sorun çıkarabilir → test et
3. **Dosya boyutu** — 4K görsel base64 olarak çok büyük olabilir → Storage URL ile çöz
4. **Timeout** — Claude + Gemini çağrısı toplam 30+ saniye sürebilir → Cloud Function timeout artır

## Öncelik Sırası

1. ~~Adım 2~~ → posterSkillPrompt.ts (skill içeriğini API formatına dönüştür)
2. ~~Adım 3~~ → Gemini imageConfig desteği kontrol/ekle
3. ~~Adım 1~~ → posterController.ts (backend endpoint)
4. ~~Adım 4~~ → Dashboard UI (poster modu toggle + metin alanları)
5. ~~Adım 5~~ → Sonuç gösterimi

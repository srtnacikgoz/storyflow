# Croissant Prompts - Gemini Pro

> **Model:** Gemini Pro (imagen-4.0-generate-001)
> **Marka:** Sade Patisserie
> **Platform:** Instagram (Stories 9:16, Feed 4:5, Grid 1:1)

---

## Temel Kurallar

1. **Image-to-image zorunlu** - Her prompt referans görsel ile çalışır
2. **Ürün tarifi yasak** - AI referanstan öğrenir
3. **İnsan eli yok** - Varsayılan olarak yasak
4. **Steam/smoke yok** - Yapay görünüm yaratır
5. **Off-white backdrop** - RGB(250,248,245) varsayılan

---

## Prompt Yapısı (Gemini Pro)

```
A delicious, high-end professional photo of [ÜRÜN]. [SAHNE/KOMPOZİSYON]. [STİL PROMPT]
```

---

## Stil Şablonları

### 1. MODERN (Stüdyo - Feed için ideal)

```
Using uploaded image as reference for the croissant.

A delicious, high-end professional photo of artisan croissant from reference image.
Single product hero shot on soft off-white backdrop (RGB 250,248,245).

Professional food photography, bright white background, soft studio lighting,
clean minimalist lines, elegant presentation, high key, warm golden tones,
shallow depth of field (f/2.8), 4k resolution.

Aspect ratio: 4:5 vertical for Instagram feed.

--no dark background, harsh shadows, steam, smoke, human hands, CGI look
```

### 2. RUSTIC (Ahşap Zemin - Lifestyle)

```
Using uploaded image as reference for the croissant.

A delicious, high-end professional photo of freshly baked croissant from reference.
Placed on rustic dark wood table with natural morning light from window.

Professional food photography, rustic dark wood surface, dramatic side lighting,
warm moody atmosphere, rich textures, artisanal styling, visible flaky layers,
shallow depth of field, 4k resolution, highly detailed.

Aspect ratio: 4:5 vertical for Instagram feed.

--no black background, artificial lighting, steam, human elements, plastic look
```

### 3. SOCIAL (Flat Lay - Stories/Grid için)

```
Using uploaded image as reference for the croissant.

A delicious, high-end professional photo of croissant arrangement from reference.
Flat lay composition, top-down view, arranged on marble surface.

Professional food photography, flat lay, top-down view, trendy instagram aesthetic,
high contrast, warm pop colors, hard natural lighting, sharp focus throughout,
clean composition, 4k resolution.

Aspect ratio: 9:16 vertical for Instagram Stories.

--no tilted angle, dark shadows, steam, smoke, cluttered background
```

---

## ⭐ Test Edilmiş & Optimize Edilmiş Promptlar

> Bu promptlar gerçek testlerle doğrulanmış ve en iyi sonuçları veren versiyonlardır.

### Flat Lay Grid - Stories (v2 Optimized) ⭐

**Test:** 2026-01-18 | **Sonuç:** 8.5/10 | **Format:** Stories 9:16

```
Using uploaded image as reference for the croissants.

A delicious, high-end professional photo of artisan croissants from reference.
Flat lay composition, strict top-down view (90 degrees), 6 croissants arranged in organized 2x3 grid pattern on soft off-white marble surface.

Professional food photography, flat lay, top-down view, trendy instagram aesthetic.

CRITICAL - Maintain from reference:
- Glossy buttery sheen on surface (not matte)
- Rich golden-amber caramelized color (not dull brown)
- Classic crescent moon shape with pointed tips
- Sharp visible lamination layers and flaky texture
- Fresh-from-oven appetizing appearance

Even soft overhead lighting creating subtle highlights on glossy surface,
warm golden tones, sharp focus throughout, 8k photorealistic quality.

Aspect ratio: 9:16 vertical for Instagram Stories.

--no matte dull surface, dark brown color, square shaped croissants, flat appearance, tilted angle, dark background, steam, smoke, human hands, random placement, dry stale look
```

**Neden çalışıyor:**
- `CRITICAL` bölümü referans özelliklerini korur
- `glossy buttery sheen` parlaklık sağlar
- `golden-amber caramelized` doğru renk tonu
- `crescent moon shape with pointed tips` doğru şekil
- Detaylı negative prompt mat/kare görünümü engeller

---

## Kompozisyon Varyasyonları

### A. Tekli Kahraman (Hero Shot)

```
Using uploaded image as reference.

Commercial product photography of single croissant from reference,
centered with generous negative space.

45-degree angle, soft side lighting from left (9 o'clock),
golden-brown tones emphasized, flaky layers visible,
off-white seamless backdrop, shallow DOF (f/2.8).

4:5 aspect ratio. 8K photorealistic.

--no multiple products, busy background, harsh shadows
```

### B. İç Yapı Gösterimi (Cross-Section)

```
Using uploaded image as reference for the croissant.

Professional food photography showing croissant cut in half,
revealing honeycomb interior structure and buttery layers.

Side angle view, soft diffused lighting to show texture depth,
warm color temperature, clean white surface beneath,
macro detail on lamination layers.

4:5 aspect ratio. Commercial quality.

--no steam, smoke, melted appearance, dark background
```

### C. Tekrarlayan Desen (Pattern/Grid)

```
Using uploaded images as reference.

Overhead flat lay of multiple croissants arranged in repeating pattern,
filling the frame edge to edge.

Top-down view, even soft lighting, consistent golden color,
satisfying symmetrical arrangement, minimal shadows,
off-white background visible between items.

1:1 square for Instagram grid. Sharp focus throughout.

--no random placement, harsh shadows, different colored items
```

### D. Kahve Eşliği (Lifestyle Pairing)

```
Using uploaded images: Image 1 for croissant, Image 2 for coffee cup.

Lifestyle food photography of croissant and coffee composition.
Croissant as hero (60% frame), coffee cup as supporting element.

Morning light atmosphere, warm color palette,
marble or light wood surface, shallow depth of field,
coffee slightly soft in background.

4:5 vertical. Cozy café aesthetic.

--no human hands, steam from coffee, cluttered props, cold tones
```

---

## Mevsimsel/Tematik Promptlar

### Sabah/Kahvaltı Teması

```
Using uploaded image as reference.

Morning breakfast scene with croissant from reference.
Soft golden hour lighting streaming from side,
fresh and inviting atmosphere, dewdrop freshness feel.

Light linen napkin as accent, warm wood surface,
shallow DOF, croissant as focal point.

9:16 Stories format. Warm, inviting mood.

--no harsh midday light, cold colors, artificial look
```

### Sonbahar Teması

```
Using uploaded image as reference.

Autumn-themed product shot of croissant from reference.
Warm amber and golden tones, cozy atmosphere,
subtle cinnamon stick or dried orange slice as prop.

Soft diffused natural light, rustic wood surface,
warm color grading, nostalgic feel.

4:5 feed format.

--no summer colors, green elements, cold lighting
```

---

## Teknik Parametreler

### Gemini Pro API Config

```json
{
  "model": "imagen-4.0-generate-001",
  "config": {
    "numberOfImages": 1,
    "outputMimeType": "image/jpeg",
    "aspectRatio": "4:5"
  }
}
```

### Aspect Ratio Rehberi

| Platform | Ratio | Pixels | Kullanım |
|----------|-------|--------|----------|
| Feed | 4:5 | 1080x1350 | Ana paylaşımlar |
| Stories | 9:16 | 1080x1920 | Hikayeler |
| Grid | 1:1 | 1080x1080 | Profil grid'i |
| Reels Cover | 9:16 | 1080x1920 | Video kapağı |

### Işık Pozisyonları

| Işık | Saat | Etki | Kullanım |
|------|------|------|----------|
| Side Light | 9:00 veya 3:00 | Doku/katman vurgusu | Kruvasan kabuğu |
| Back Light | 12:00 | Parlaklık/tazelik | Glazed ürünler |
| 45° Light | 10:00 veya 2:00 | Dengeli | Genel hero shot |
| Soft Diffused | - | Gölgesiz | Flat lay |

---

## Negatif Prompt Kütüphanesi

### Universal (Her promptta kullan)

```
--no dark background, black backdrop, moody lighting, grey background,
steam, smoke, vapor, mist, fog,
human hands, fingers, human elements, people,
harsh shadows, flash photography,
CGI look, artificial, plastic appearance, 3D render,
oversaturated colors, cold blue tones,
busy background, cluttered composition,
watermark, logo overlay, text on image,
different product than reference
```

### Kruvasan Spesifik

```
--no burnt edges, undercooked dough, flat appearance,
broken/crushed croissant, stale look,
wrong color (too pale or too dark),
visible fingerprints, grease stains on surface
```

---

## Kalite Kontrol Checklist

Prompt yazmadan önce kontrol et:

- [ ] `Using uploaded image as reference` ile başlıyor mu?
- [ ] Ürün tarif edilmemiş, referansa yönlendirilmiş mi?
- [ ] Aspect ratio belirtilmiş mi?
- [ ] Işık yönü/tipi belirtilmiş mi?
- [ ] Arka plan tanımlanmış mı?
- [ ] Negative prompt eklenmiş mi?
- [ ] Steam/smoke yasaklanmış mı?
- [ ] Human elements yasaklanmış mı?

---

## Örnek Kullanım Senaryoları

### Senaryo 1: Günlük Story Paylaşımı

**Girdi:** Taze kruvasan fotoğrafı (iPhone ile çekilmiş)

**Prompt:** SOCIAL şablonu + 9:16 ratio

**Beklenen:** Instagram Stories için optimize edilmiş flat lay görsel

### Senaryo 2: Feed Hero Post

**Girdi:** Stüdyo kalitesi kruvasan fotoğrafı

**Prompt:** MODERN şablonu + 4:5 ratio

**Beklenen:** Premium görünümlü tek ürün hero shot

### Senaryo 3: İç Yapı Showcase

**Girdi:** Kesilmiş kruvasan fotoğrafı

**Prompt:** Cross-Section varyasyonu

**Beklenen:** Katmanlı iç yapıyı gösteren profesyonel fotoğraf

---

## Versiyon Bilgisi

- **Versiyon:** 1.0
- **Oluşturma:** 2026-01-18
- **Kaynak:** GitHub araştırması + Instagram analizi
- **Referanslar:**
  - pauhu/gemini-image-prompting-handbook
  - skaiy/GourmetLens-AI
  - @sade.patisserie Instagram
  - @tattebakery Instagram (karşılaştırma)

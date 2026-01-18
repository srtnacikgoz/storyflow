# Chocolate Prompts - Gemini Pro

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
6. **Typography koruması** - Kutu/ambalajda marka adı korunmalı

---

## Çikolata Kategorileri

| Kategori | Özellik | Işık Stratejisi |
|----------|---------|-----------------|
| **Bonbon/Pralin** | Parlak kaplama | Back light (yansıma) |
| **Çikolata Kutusu** | Marka/typography | Even soft light |
| **Bar Çikolata** | Doku/kırılma | Side light |
| **Truffle** | Mat/pudralı | Soft diffused |
| **Koleksiyon** | Grid dizilim | Even overhead |

---

## Stil Şablonları

### 1. MODERN (Stüdyo - Premium Bonbon)

```
Using uploaded image as reference for the chocolate.

A delicious, high-end professional photo of artisan chocolate bonbon from reference.
Single piece or small arrangement on soft off-white backdrop (RGB 250,248,245).

Professional food photography, bright clean background, soft studio lighting,
luxurious presentation, glossy finish emphasized, high key lighting,
rich chocolate tones, shallow depth of field (f/2.8), 4k resolution.

Aspect ratio: 4:5 vertical for Instagram feed.

--no dark background, harsh shadows, fingerprints, smudges, melted appearance
```

### 2. RUSTIC (Lifestyle - Artisanal Feel)

```
Using uploaded image as reference for the chocolate.

A delicious, high-end professional photo of artisan chocolate from reference.
Placed on dark slate or marble surface with cocoa powder accent.

Professional food photography, moody elegant atmosphere, dramatic side lighting,
rich textures, craft chocolate aesthetic, cocoa beans as props,
shallow depth of field, 4k resolution, highly detailed.

Aspect ratio: 4:5 vertical for Instagram feed.

--no pure black background, harsh shadows, human elements, cheap plastic look
```

### 3. SOCIAL (Flat Lay Grid - Instagram Signature)

```
Using uploaded images as reference for the chocolates.

A delicious, high-end professional photo of chocolate collection from reference.
Flat lay grid arrangement, organized rows and columns.

Professional food photography, top-down view, trendy instagram aesthetic,
each piece clearly visible, consistent lighting across all pieces,
off-white or light grey backdrop, sharp focus throughout, 4k resolution.

Aspect ratio: 1:1 square for Instagram grid.

--no random placement, overlapping pieces, inconsistent shadows, tilted angle
```

---

## Kompozisyon Varyasyonları

### A. Tekli Bonbon (Single Hero)

```
Using uploaded image as reference.

Macro product photography of single chocolate bonbon from reference,
centered with generous negative space.

45-degree angle, back lighting for glossy surface reflection,
chocolate sheen visible, decoration detail sharp,
off-white seamless backdrop, very shallow DOF.

4:5 aspect ratio. 8K photorealistic.

--no fingerprints, dust, melted edges, matte where should be glossy
```

### B. Koleksiyon Grid (Signature Flat Lay)

```
Using uploaded images as reference.

Professional flat lay of chocolate collection from reference,
arranged in perfect grid pattern - 4x4 or 5x5 arrangement.

Strict top-down view (90°), perfectly even soft lighting,
each piece equally lit with no harsh shadows,
off-white backdrop, razor sharp focus on all pieces.

1:1 square aspect ratio.

CRITICAL: Maintain exact appearance of each chocolate type from reference.

--no random arrangement, uneven spacing, tilted pieces, shadow variations
```

### C. Kutu Sunumu (Box Presentation)

```
Using uploaded image as reference for the chocolate box.

Commercial product photography of chocolate gift box from reference,
box open showing assortment inside, lid angled beside.

45-degree angle, soft even lighting to avoid reflections,
gold/brand elements visible, luxurious presentation,
clean backdrop, gift-ready aesthetic.

CRITICAL: "[SadeChocolate]" or brand text must remain razor-sharp,
perfectly legible, zero deformation.

4:5 aspect ratio.

--no text deformation, blurry typography, lid blocking view, harsh reflections
```

### D. Kırık Çikolata (Break/Snap Shot)

```
Using uploaded image as reference.

Professional food photography of broken chocolate bar from reference,
showing clean snap and interior texture.

Side angle, dramatic side lighting,
chocolate shards arranged artistically,
cocoa powder dust subtle accent, dark surface.

4:5 aspect ratio.

--no messy crumbs, melted edges, fingerprints visible
```

### E. Çikolata + Malzeme (Ingredient Story)

```
Using uploaded images: Image 1 for chocolate, Image 2 for ingredients.

Lifestyle food photography showing chocolate with raw ingredients -
cocoa beans, nuts, dried fruit as per reference.

Story-telling composition, chocolate as hero,
ingredients scattered artistically around,
rustic wood or marble surface, warm lighting.

4:5 vertical.

--no cluttered look, ingredients overpowering chocolate, artificial arrangement
```

---

## Çikolata Türüne Göre Özel Promptlar

### Glossy Bonbon/Pralin

```
Using uploaded image as reference.

Professional food photography of glossy chocolate bonbon from reference.
Mirror-like surface reflection is key focus.

Back light at 12 o'clock position for maximum sheen,
catch light visible on curved surface,
rich color depth, luxurious appearance.

4:5 aspect ratio.

--no matte finish, fingerprints, bloom (white spots), dull surface
```

### Mat Truffle (Cocoa Dusted)

```
Using uploaded image as reference.

Professional food photography of cocoa-dusted truffle from reference.
Velvety matte texture emphasized.

Soft diffused lighting, no harsh reflections,
cocoa powder texture visible, round perfect shape,
subtle shadow for depth.

4:5 aspect ratio.

--no glossy appearance, clumpy cocoa, misshapen form
```

### Beyaz Çikolata

```
Using uploaded image as reference.

Professional food photography of white chocolate from reference.
Creamy ivory color accurately represented.

Soft warm lighting, avoiding pure white backdrop clash,
subtle cream/ivory tones, elegant presentation,
light grey or warm off-white surface.

4:5 aspect ratio.

--no yellow tint, grey appearance, harsh white background
```

### Bitter/Dark Çikolata

```
Using uploaded image as reference.

Professional food photography of dark chocolate from reference.
Rich, deep brown color emphasized.

Dramatic side lighting, subtle sheen on surface,
intensity of dark chocolate conveyed,
elegant dark presentation without being black.

4:5 aspect ratio.

--no pure black appearance, ashy color, lack of depth
```

### Dolgulu Çikolata (Filled/Cut)

```
Using uploaded image as reference.

Professional food photography of cut chocolate showing filling from reference.
Interior ganache/filling visible.

Side angle, soft lighting on cut surface,
glossy exterior contrasting with interior texture,
filling color accurate to reference.

4:5 aspect ratio.

--no air bubbles in filling, messy cut, melted interior
```

---

## Özel Durumlar

### Hediye Kutusu (Gift Box with Typography)

```
Using uploaded image as reference for the gift box.

Commercial product photography of chocolate gift box from reference,
closed or partially open, ribbon/packaging visible.

Even soft lighting to show all details without glare,
brand elements and text clearly visible,
luxurious gift-worthy presentation.

CRITICAL TYPOGRAPHY PROTECTION:
- "SadeChocolate" text: razor-sharp, perfectly legible, zero deformation
- Logo/graphics: undistorted, color-accurate
- Any text on packaging must be readable

4:5 aspect ratio.

--no text deformation, blurry brand name, distorted letters,
ribbon obscuring text, harsh reflections on packaging
```

### Mevsimsel Koleksiyon

```
Using uploaded images as reference.

Seasonal chocolate collection photography from reference.
Festive yet elegant presentation.

Theme-appropriate props (minimal),
cohesive color story, premium feel maintained,
soft celebratory lighting.

4:5 or 1:1 aspect ratio.

--no cheap holiday decorations, cluttered props, theme overpowering product
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
    "aspectRatio": "1:1"
  }
}
```

### Çikolata İçin Işık Rehberi

| Çikolata Türü | Işık | Pozisyon | Neden |
|---------------|------|----------|-------|
| Glossy Bonbon | Back light | 12:00 | Yansıma/sheen |
| Mat Truffle | Soft diffused | - | Texture |
| Broken Bar | Side light | 3:00/9:00 | Kırılma detayı |
| Box/Package | Even soft | Front | Typography netliği |
| Collection Grid | Overhead soft | Top | Eşit aydınlatma |

### Yüzey Önerileri

| Yüzey | Çikolata Türü | Etki |
|-------|---------------|------|
| Off-white | Tüm türler | Clean, modern |
| Dark slate | Bitter çikolata | Kontrast |
| Marble | Premium bonbon | Luxury |
| Wood | Artisanal | Craft feel |
| Light grey | Beyaz çikolata | Soft contrast |

---

## Negatif Prompt Kütüphanesi

### Universal

```
--no dark background, black backdrop, grey background,
steam, smoke, vapor, mist,
human hands, fingers, human elements,
harsh shadows, flash photography,
CGI look, artificial, plastic appearance,
oversaturated colors, cold blue tones,
busy background, cluttered composition,
watermark, logo overlay,
different product than reference
```

### Çikolata Spesifik

```
--no chocolate bloom (white spots), melted appearance,
fingerprints, smudges, dust particles,
uneven tempering, dull matte where should be glossy,
cracked surface (unless intended), air bubbles,
cheap plastic look, artificial shine
```

### Typography (Kutu/Ambalaj için)

```
--no text deformation, blurry typography, misspelled brand name,
illegible logo, distorted letters, cut-off text,
wrong font rendering, overlapping text elements
```

---

## Kalite Kontrol Checklist

- [ ] `Using uploaded image as reference` ile başlıyor mu?
- [ ] Çikolata türüne uygun ışık (glossy vs matte)?
- [ ] Aspect ratio belirtilmiş mi?
- [ ] Grid düzeni için eşit aydınlatma?
- [ ] Kutu/ambalaj için CRITICAL typography koruması var mı?
- [ ] Yüzey seçimi uygun mu?
- [ ] Negative prompt'ta bloom, fingerprint var mı?
- [ ] Sheen/reflection doğru yönetilmiş mi?

---

## Örnek Kullanım Senaryoları

### Senaryo 1: Yeni Koleksiyon Tanıtımı

**Girdi:** 9 farklı bonbon fotoğrafı

**Prompt:** SOCIAL Grid şablonu + 1:1 ratio

**Beklenen:** 3x3 düzenli grid, Instagram feed için

### Senaryo 2: Hediye Kutusu Tanıtımı

**Girdi:** Açık kutu fotoğrafı

**Prompt:** Box Presentation + Typography CRITICAL

**Beklenen:** Marka adı net, lüks sunum

### Senaryo 3: Story İçin Tekli Bonbon

**Girdi:** Tek bonbon macro çekimi

**Prompt:** Single Hero + 9:16 ratio

**Beklenen:** Glossy finish vurgulu, premium görünüm

---

## Versiyon Bilgisi

- **Versiyon:** 1.0
- **Oluşturma:** 2026-01-18
- **Bağlantılı:** croissant-prompts.md, pasta-prompts.md
- **Özel Not:** Çikolata grid flat lay, Sade Patisserie'nin imza içeriği

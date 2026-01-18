# Macaron Prompts - Gemini Pro

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
6. **Renk doğruluğu kritik** - Macaron renkleri referanstan korunmalı

---

## Macaron Özellikleri

| Özellik | Prompt'ta Vurgu | Işık |
|---------|-----------------|------|
| **Pürüzsüz kabuk** | Smooth shell, no cracks | Soft diffused |
| **Feet (ayak)** | Ruffled feet visible | Side light |
| **Dolgu** | Filling visible between shells | 45° angle |
| **Renk** | Vibrant pastel colors | Even, color-accurate |
| **Mat yüzey** | Matte finish, not glossy | Soft, no harsh reflections |

---

## Stil Şablonları

### 1. MODERN (Stüdyo - Pastel Elegance)

```
Using uploaded image as reference for the macaron.

A delicious, high-end professional photo of French macaron from reference.
Single or paired macarons on soft off-white backdrop (RGB 250,248,245).

Professional food photography, bright clean background, soft diffused lighting,
elegant pastel presentation, smooth shell texture visible,
delicate ruffled feet detail, shallow depth of field (f/2.8), 4k resolution.

Aspect ratio: 4:5 vertical for Instagram feed.

--no cracks on shell, lopsided shape, glossy surface, dark background, hollow appearance
```

### 2. RUSTIC (Lifestyle - Patisserie Feel)

```
Using uploaded image as reference for the macaron.

A delicious, high-end professional photo of artisan macaron from reference.
Placed on vintage plate or marble surface with elegant minimal props.

Professional food photography, French patisserie atmosphere, soft natural light,
romantic aesthetic, pastel colors pop against neutral surface,
shallow depth of field, 4k resolution.

Aspect ratio: 4:5 vertical for Instagram feed.

--no harsh shadows, dark moody lighting, cluttered props, cracked shells
```

### 3. SOCIAL (Flat Lay - Rainbow/Grid)

```
Using uploaded images as reference for the macarons.

A delicious, high-end professional photo of macaron collection from reference.
Flat lay arrangement - rainbow gradient or organized grid pattern.

Professional food photography, top-down view, instagram aesthetic,
colors organized beautifully (rainbow order or color families),
even soft lighting, each macaron perfect, sharp focus throughout.

Aspect ratio: 1:1 square for Instagram grid.

--no random color arrangement, uneven spacing, tilted angle, inconsistent sizes
```

---

## Kompozisyon Varyasyonları

### A. Tekli Macaron (Single Hero)

```
Using uploaded image as reference.

Macro product photography of single macaron from reference,
centered with generous negative space.

45-degree angle showing both shell and feet,
soft side lighting to reveal texture,
pastel color accurately represented,
off-white seamless backdrop, shallow DOF.

4:5 aspect ratio. 8K photorealistic.

--no cracks, uneven feet, lopsided shells, color distortion
```

### B. İkili/Üçlü Stack (Stacked Macarons)

```
Using uploaded images as reference.

Professional food photography of stacked macarons from reference,
2-3 macarons stacked vertically, complementary colors.

Side angle (30°), soft even lighting,
each macaron clearly visible, balanced stack,
colors harmonious, clean backdrop.

4:5 aspect ratio.

--no toppling stack, misaligned macarons, clashing colors
```

### C. Rainbow Gradient (Signature Flat Lay)

```
Using uploaded images as reference.

Professional flat lay of macaron rainbow from reference,
arranged in color gradient - ROY G BIV order or pastel spectrum.

Strict top-down view (90°), perfectly even soft lighting,
smooth color transition, equal spacing between each,
off-white or light marble backdrop.

1:1 square or 4:5 vertical.

--no random colors, broken gradient, uneven spacing, shadows between
```

### D. Kutu/Hediye Sunumu (Box Presentation)

```
Using uploaded image as reference for the macaron box.

Commercial product photography of macaron gift box from reference,
box open showing colorful assortment inside.

45-degree angle, soft even lighting,
macarons nestled in packaging, gift-worthy presentation,
brand elements visible if present.

4:5 aspect ratio.

--no macarons falling out, messy arrangement, harsh shadows on box
```

### E. Dolgu Gösterimi (Filling Reveal)

```
Using uploaded image as reference.

Professional food photography of macaron with bite taken from reference,
showing ganache/buttercream filling between shells.

Side angle, soft lighting,
filling texture visible, shell smoothness contrasted,
single macaron focus.

4:5 aspect ratio.

--no messy bite, crumbled shell, filling oozing out messily
```

### F. Scattered Artistic (Düşmüş Efekti)

```
Using uploaded images as reference.

Artistic food photography of macarons scattered on surface from reference,
casual elegant arrangement, some whole, some showing filling.

Slight overhead angle (60-70°), soft natural light,
intentional but natural-looking placement,
pastel colors creating visual harmony.

4:5 or 1:1 aspect ratio.

--no chaotic mess, broken pieces, unappetizing arrangement
```

---

## Renk Temalarına Göre Promptlar

### Pastel Palette (Soft & Dreamy)

```
Using uploaded images as reference.

Professional food photography of pastel macaron collection from reference.
Soft dreamy aesthetic, baby pink, mint, lavender, butter yellow.

Soft diffused lighting, airy feel,
colors accurate to reference - no oversaturation,
light and delicate mood.

4:5 aspect ratio.

--no bold saturated colors, harsh contrast, dark tones
```

### Vibrant Colors (Bold & Pop)

```
Using uploaded images as reference.

Professional food photography of vibrant macaron collection from reference.
Bold jewel tones - ruby red, emerald, sapphire, gold.

Clean bright lighting, colors pop against white backdrop,
high-end confectionery aesthetic,
each color true to reference.

4:5 aspect ratio.

--no washed out colors, dull appearance, muddy tones
```

### Monochrome (Single Color Family)

```
Using uploaded images as reference.

Professional food photography of monochrome macaron set from reference.
Single color in varying shades - ombre effect.

Soft even lighting, subtle shade variations visible,
sophisticated minimalist presentation,
gradient from light to dark of same hue.

1:1 square aspect ratio.

--no clashing colors, inconsistent shades, mixed color families
```

---

## Mevsimsel/Tematik Promptlar

### Bahar (Spring Pastels)

```
Using uploaded images as reference.

Spring-themed macaron photography from reference.
Fresh pastel colors - pink, mint green, lavender, lemon.

Bright airy lighting, fresh flower petal as minimal prop,
light and hopeful mood, seasonal freshness.

9:16 Stories format.

--no dark colors, autumn tones, heavy moody lighting
```

### Yaz (Summer Brights)

```
Using uploaded images as reference.

Summer-themed macaron photography from reference.
Tropical vibrant colors - mango, raspberry, lime, blueberry.

Bright natural light, fresh energetic mood,
colors popping with summer vitality.

4:5 feed format.

--no muted colors, cold tones, winter aesthetic
```

### Sonbahar (Autumn Warmth)

```
Using uploaded images as reference.

Autumn-themed macaron photography from reference.
Warm spice colors - pumpkin, cinnamon, caramel, chocolate.

Warm golden lighting, cozy atmosphere,
rustic wood surface, seasonal mood.

4:5 feed format.

--no cold colors, spring pastels, harsh lighting
```

### Kış/Noel (Holiday Elegance)

```
Using uploaded images as reference.

Holiday-themed macaron photography from reference.
Festive colors - red, green, gold, white.

Soft glamorous lighting, subtle sparkle acceptable,
elegant gift-worthy presentation.

4:5 aspect ratio.

--no cheap holiday decorations, overwhelming props, garish colors
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

### Macaron İçin Işık Rehberi

| Sunum | Işık | Neden |
|-------|------|-------|
| Single hero | Side light 45° | Feet/shell texture |
| Flat lay grid | Overhead soft | Even color |
| Stack | Front-side soft | Depth without shadow |
| Box | Even diffused | No reflections |
| Rainbow | Very even overhead | Color accuracy |

### Renk Doğruluğu İpuçları

- **Soft lighting** - Harsh light renkleri soldurur
- **White balance** - Warm/cool shift renkleri bozar
- **Even illumination** - Gölgeler renk algısını değiştirir
- **Reference matching** - AI'dan renk koruması iste

---

## Negatif Prompt Kütüphanesi

### Universal

```
--no dark background, black backdrop, grey background,
steam, smoke, vapor, mist,
human hands, fingers, human elements,
harsh shadows, flash photography,
CGI look, artificial, plastic appearance,
busy background, cluttered composition,
watermark, logo overlay,
different product than reference
```

### Macaron Spesifik

```
--no cracked shells, hollow macarons, lopsided shape,
uneven feet, no feet visible, glossy wet appearance,
air bubbles on surface, sunken tops,
filling oozing out, mismatched shell sizes,
color bleeding between layers, faded colors,
broken pieces, stale dry appearance
```

### Renk Koruması

```
--no color distortion, oversaturated colors, washed out pastels,
wrong color temperature, muddy tones, grey cast,
colors different from reference
```

---

## Kalite Kontrol Checklist

- [ ] `Using uploaded image as reference` ile başlıyor mu?
- [ ] Renk doğruluğu vurgulanmış mı?
- [ ] Macaron feet (ayak) görünür olacak mı - açı uygun mu?
- [ ] Aspect ratio belirtilmiş mi?
- [ ] Grid/rainbow için eşit aydınlatma?
- [ ] Shell pürüzsüzlüğü için soft light?
- [ ] Negative prompt'ta crack, lopsided var mı?
- [ ] Renk teması tutarlı mı?

---

## Örnek Kullanım Senaryoları

### Senaryo 1: Rainbow Grid Post

**Girdi:** 9 farklı renk macaron fotoğrafı

**Prompt:** Rainbow Gradient + 1:1 ratio

**Beklenen:** Renk sırasına göre dizilmiş, Instagram grid

### Senaryo 2: Yeni Lezzet Tanıtımı

**Girdi:** Tek macaron close-up

**Prompt:** Single Hero + 4:5 ratio

**Beklenen:** Yeni lezzeti vurgulayan, feet görünür

### Senaryo 3: Hediye Kutusu

**Girdi:** Açık macaron kutusu

**Prompt:** Box Presentation + 4:5 ratio

**Beklenen:** Hediye için ideal, premium sunum

---

## Versiyon Bilgisi

- **Versiyon:** 1.0
- **Oluşturma:** 2026-01-18
- **Bağlantılı:** croissant-prompts.md, pasta-prompts.md, chocolate-prompts.md
- **Özel Not:** Macaron renk doğruluğu kritik - her zaman referans renklerini koru

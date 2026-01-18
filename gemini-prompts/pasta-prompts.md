# Pasta Prompts - Gemini Pro

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

## Pasta Kategorileri

| Kategori | Özellik | Işık Stratejisi |
|----------|---------|-----------------|
| **Dilimli Pasta** | İç katmanlar görünür | Side light (doku) |
| **Bütün Pasta** | Dekorasyon vurgusu | 45° light (dengeli) |
| **Mini Pasta** | Tekli/çoklu sunum | Soft diffused |
| **Cheesecake** | Kreması yüzey | Back light (parlaklık) |
| **Tart** | Meyve/topping | Top-down veya 45° |

---

## Stil Şablonları

### 1. MODERN (Stüdyo - Premium Sunum)

```
Using uploaded image as reference for the cake.

A delicious, high-end professional photo of artisan cake from reference image.
Single product hero shot on soft off-white backdrop (RGB 250,248,245).

Professional food photography, bright clean background, soft studio lighting,
elegant presentation, creamy textures emphasized, high key lighting,
warm inviting tones, shallow depth of field (f/2.8), 4k resolution.

Aspect ratio: 4:5 vertical for Instagram feed.

--no dark background, harsh shadows, steam, smoke, human hands, CGI look, melted appearance
```

### 2. RUSTIC (Lifestyle - Kafe Ortamı)

```
Using uploaded image as reference for the cake.

A delicious, high-end professional photo of homestyle cake from reference.
Placed on vintage cake stand with rustic wood table setting.

Professional food photography, rustic warm atmosphere, natural window light,
cozy café aesthetic, rich textures, artisanal feel, visible layers,
shallow depth of field, 4k resolution, highly detailed.

Aspect ratio: 4:5 vertical for Instagram feed.

--no black background, artificial lighting, steam, human elements, cold tones
```

### 3. SOCIAL (Flat Lay - Stories/Grid)

```
Using uploaded image as reference for the cake.

A delicious, high-end professional photo of cake slice from reference.
Flat lay composition with elegant props - fork, small plate, napkin.

Professional food photography, top-down view, trendy instagram aesthetic,
high contrast, warm tones, hard natural lighting, sharp focus,
clean minimalist composition, marble or light surface, 4k resolution.

Aspect ratio: 9:16 vertical for Instagram Stories.

--no tilted angle, dark shadows, cluttered props, busy background
```

---

## Kompozisyon Varyasyonları

### A. Bütün Pasta (Whole Cake Hero)

```
Using uploaded image as reference.

Commercial product photography of whole decorated cake from reference,
presented on elegant cake stand, centered composition.

45-degree angle, soft diffused lighting from front-left,
decoration details sharp and visible, creamy frosting texture,
off-white seamless backdrop, medium DOF to show full cake.

4:5 aspect ratio. 8K photorealistic.

--no cut slice, messy frosting, tilted stand, harsh shadows
```

### B. Dilim Gösterimi (Slice Reveal)

```
Using uploaded image as reference for the cake.

Professional food photography showing cake slice on plate,
revealing beautiful interior layers and filling.

Side angle view (30-45°), soft side lighting to show layer depth,
whole cake slightly blurred in background,
fork beside slice suggesting first bite moment.

4:5 aspect ratio. Commercial quality.

--no steam, collapsed layers, dry appearance, dark background
```

### C. İç Katman Detay (Cross-Section)

```
Using uploaded image as reference.

Macro food photography of cake cross-section,
showing distinct layers - sponge, cream, filling, frosting.

Close-up side view, soft even lighting,
each layer texture visible, moist appearance,
clean cut edge, crumb detail visible.

1:1 square for detail showcase.

--no blurry layers, messy cut, dry crumbs falling
```

### D. Mini Pasta Grid (Multiple Display)

```
Using uploaded images as reference.

Overhead flat lay of assorted mini cakes/pastries arranged in grid,
variety of colors and decorations visible.

Top-down view, even soft lighting, consistent color temperature,
organized arrangement on marble surface,
each item clearly distinguishable.

1:1 square for Instagram grid.

--no overlapping items, inconsistent lighting, random placement
```

### E. Pasta + İçecek (Lifestyle Pairing)

```
Using uploaded images: Image 1 for cake, Image 2 for beverage.

Lifestyle food photography of cake slice and tea/coffee composition.
Cake slice as hero (60% frame), beverage as supporting element.

Afternoon tea atmosphere, warm golden light,
elegant table setting, shallow depth of field,
beverage slightly soft in background.

4:5 vertical. Sophisticated café aesthetic.

--no human hands, steam rising, cluttered table, cold lighting
```

---

## Pasta Türüne Göre Özel Promptlar

### Cheesecake

```
Using uploaded image as reference.

Professional food photography of creamy cheesecake from reference.
Focus on smooth, velvety top surface with slight sheen.

Back lighting to create subtle glow on surface,
golden crust edge visible, crack-free top,
minimal styling, let texture speak.

4:5 aspect ratio.

--no cracks on surface, burnt top, dry appearance, heavy shadows
```

### Meyveli Tart

```
Using uploaded image as reference.

Professional food photography of fruit tart from reference.
Fresh fruit arrangement as focal point, glazed finish.

45° angle, soft natural lighting,
fruit colors vibrant and fresh, glaze reflecting light,
pastry crust golden and crisp looking.

4:5 aspect ratio.

--no wilted fruit, dull colors, soggy crust appearance
```

### Katmanlı Pasta (Layer Cake)

```
Using uploaded image as reference.

Professional food photography of layered cake slice from reference.
Distinct visible layers emphasized.

Side angle, side lighting from left,
each layer clearly defined, frosting smooth,
cake appears moist, not dry.

4:5 aspect ratio.

--no collapsed layers, uneven frosting, dry sponge appearance
```

### Mousse/Entremet

```
Using uploaded image as reference.

Professional food photography of mousse cake from reference.
Mirror glaze or smooth finish emphasized.

45° angle with subtle back light for sheen,
reflection on glaze surface, sharp edges,
modern geometric presentation.

4:5 aspect ratio.

--no fingerprints on glaze, air bubbles, matte finish where should be shiny
```

---

## Mevsimsel/Tematik Promptlar

### Bahar/Yaz (Fresh & Light)

```
Using uploaded image as reference.

Spring-themed cake photography from reference.
Fresh, airy, light atmosphere with pastel accents.

Bright natural light, white/cream backdrop,
fresh flowers or fruit as minimal props,
light and inviting mood.

9:16 Stories format.

--no dark colors, heavy autumn tones, moody lighting
```

### Sonbahar/Kış (Cozy & Warm)

```
Using uploaded image as reference.

Autumn-themed cake photography from reference.
Warm, cozy atmosphere with rich tones.

Golden warm lighting, rustic wood elements,
cinnamon sticks or autumn leaves as props,
comfort food aesthetic.

4:5 feed format.

--no cold colors, summer vibes, harsh lighting
```

### Özel Gün (Celebration)

```
Using uploaded image as reference.

Celebration cake photography from reference.
Festive, elegant atmosphere.

Soft glamorous lighting, subtle sparkle,
luxurious presentation, gift-worthy appearance,
clean sophisticated backdrop.

4:5 aspect ratio.

--no casual styling, everyday look, cluttered props
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

### Pasta İçin Işık Rehberi

| Pasta Türü | Işık | Neden |
|------------|------|-------|
| Glazed/Mousse | Back light | Parlaklık vurgusu |
| Layer Cake | Side light | Katman derinliği |
| Fruit Tart | 45° natural | Renk canlılığı |
| Cheesecake | Soft diffused | Pürüzsüz yüzey |
| Chocolate Cake | Warm side | Zengin doku |

### Kamera Açıları

| Açı | Derece | Kullanım |
|-----|--------|----------|
| Flat Lay | 90° (top) | Grid, Stories |
| Hero | 45° | Genel sunum |
| Side | 0-15° | Katman gösterimi |
| 3/4 View | 30° | Dekorasyon + katman |

---

## Negatif Prompt Kütüphanesi

### Universal

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

### Pasta Spesifik

```
--no melted frosting, collapsed layers, dry cracked surface,
lopsided cake, messy presentation, crumbs everywhere,
artificial food coloring visible, plastic decorations looking fake,
sunken middle, overflowed filling, soggy bottom
```

---

## Kalite Kontrol Checklist

- [ ] `Using uploaded image as reference` ile başlıyor mu?
- [ ] Pasta türüne uygun ışık stratejisi seçildi mi?
- [ ] Aspect ratio belirtilmiş mi?
- [ ] Katman/doku vurgusu düşünülmüş mü?
- [ ] Arka plan tanımlanmış mı?
- [ ] Negative prompt eklenmiş mi?
- [ ] Frosting/glaze parlaklığı için ışık doğru mu?

---

## Versiyon Bilgisi

- **Versiyon:** 1.0
- **Oluşturma:** 2026-01-18
- **Bağlantılı:** croissant-prompts.md, chocolate-prompts.md

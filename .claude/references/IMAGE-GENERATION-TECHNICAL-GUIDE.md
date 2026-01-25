# Hesaplamalı Görüntüleme ve Üretken AI: Teknik Rehber

> **Tarih:** 2026-01-24
> **Kaynak:** Gemini ile kapsamlı araştırma (15.000 kelimelik teknik dokümantasyon)
> **Kapsam:** Gemini 3 Pro, DALL-E 3, Stable Diffusion - Image-to-Image İş Akışları

---

## Özet: Kritik Çıkarımlar

### 1. Teknik Terminoloji = Çapa (Anchor) Etkisi
- "Etkileyici portre" vs "85mm lens, f/1.8, rim light, sinematik renk derecelendirmesi"
- Teknik terimler → Latent uzayda hedeflenen vektörler
- **Belirsizliği azaltır, deterministik sonuç üretir**

### 2. İdeal Prompt Yapısı
- **Subject (Özne):** Ne/Kim?
- **Atmosphere (Atmosfer):** Işık, mood
- **Technical (Teknik):** Lens, diyafram, kalite
- **Constraint (Kısıtlama):** Negatif prompt

### 3. Fiziksel Tutarlılık
- Işık yönü ve kaynağı tutarlı olmalı
- Gölgeler fizik kurallarına uymalı
- Perspektif ve derinlik mantıklı olmalı

---

## 1. Model Mimarileri

### Gemini 3 Pro (Google)
| Özellik | Değer |
|---------|-------|
| Giriş Token | 64,000 |
| Çıkış Token | 32,000 |
| Referans Görsel | 14 adede kadar |
| Çözünürlük | 4K native |
| Özel Yetenek | Düşünce İmzaları (Thought Signatures) |

**Güçlü Yönler:**
- Çok turlu (multi-turn) düzenleme tutarlılığı
- Mantıksal muhakeme
- Metin koruma
- Google Search ile temellendirme (grounding)

### DALL-E 3 (OpenAI)
**Güçlü Yönler:**
- Doğal dil işleme
- Prompt genişletme (otomatik zenginleştirme)
- Mekansal yönlendirme (spatial awareness)
- `gen_id` ile karakter tutarlılığı

### Stable Diffusion (SDXL/SD3.5)
**Güçlü Yönler:**
- Piksel düzeyinde kontrol
- ControlNet mimarisi
- Denoising Strength ayarı
- Yerel çalıştırma imkanı

---

## 2. Denoising Strength (Sadece Stable Diffusion)

| Değer | Etki | Kullanım |
|-------|------|----------|
| 0.00 - 0.25 | Çok sadık, minimal değişim | Renk düzeltme |
| 0.35 - 0.50 | Kompozisyon korunur, detay artar | **Upscaling, yüz düzeltme** |
| 0.60 - 0.75 | Kompozisyon korunur, stil değişir | **Fotoğraftan yağlıboyaya** |
| 0.80 - 1.00 | Orijinal silik referans, yeni kompozisyon | Tam yeniden üretim |

---

## 3. Işıklandırma Teorisi

### 3.1 Işık Yönü ve Kaynağı

| Terim | Açıklama | Prompt Örneği |
|-------|----------|---------------|
| **Key Light** | Ana aydınlatma kaynağı | "Main light from left" |
| **Rim Light** | Arkadan gelen, siluet oluşturan | "Strong rim light outlining silhouette" |
| **Top Light** | Tepe ışığı, gizemli | "Godfather style lighting" |
| **Practical Light** | Sahne içi görünür kaynak | "Neon signs, candles visible" |

### 3.2 Işık Kalitesi

| Terim | Açıklama | Prompt Örneği |
|-------|----------|---------------|
| **Hard Light** | Keskin gölge, yüksek kontrast | "Harsh midday sun shadows" |
| **Soft Light** | Yumuşak geçiş, belirsiz gölge | "Diffused light, softbox" |
| **Volumetric** | Hacimsel, toz/sis içinden | "Volumetric lighting, god rays" |
| **Chiaroscuro** | Aşırı kontrast, Film Noir | "High contrast chiaroscuro, noir" |

### 3.3 Renk Sıcaklığı

| Terim | Kelvin | Karakter | Prompt |
|-------|--------|----------|--------|
| **Golden Hour** | 2700-3200K | Sıcak, altın, romantik | "Golden hour warm tones" |
| **Blue Hour** | 6000-10000K | Soğuk, mavi, melankolik | "Blue hour twilight" |
| **Tungsten** | ~3200K | İç mekan, turuncu | "Warm tungsten interior" |
| **Fluorescent** | ~4000K | Yeşilimsi, steril | "Office fluorescent cold" |

---

## 4. Lens Optiği

### 4.1 Odak Uzaklığı (Focal Length)

| Lens Tipi | mm | Psikolojik Etki | Kullanım |
|-----------|-----|-----------------|----------|
| Ultra Geniş | 14-20mm | Devasa, abartılı perspektif | Mimari, Manzara |
| Geniş | 24-35mm | Çevreyle bütünleşik | Sokak, Belgesel |
| **Standart** | 50mm | Doğal, insan gözü | Lifestyle, Portre |
| **Portre** | 85-100mm | İzole özne, estetik bokeh | **Ürün, Food, Moda** |
| Telefoto | 200mm+ | Sıkıştırma, uzak özne | Vahşi yaşam, Spor |
| Macro | 100mm macro | Mikro detay | Doku, Böcek |

### 4.2 Diyafram (Aperture) ve Bokeh

| f-stop | Alan Derinliği | Prompt Örneği |
|--------|----------------|---------------|
| f/1.2 - f/2.8 | **Sığ (Shallow)** | "f/1.8 aperture, creamy bokeh, blurred background" |
| f/4 - f/5.6 | Orta | "Balanced depth of field" |
| f/8 - f/16 | Derin | "f/11, deep focus, everything sharp" |

**Bokeh Tipleri:**
- `creamy bokeh` - Yumuşak, pürüzsüz
- `swirly bokeh` - Vintage Rus lens efekti
- `hexagonal bokeh` - 6 kanatlı diyafram

---

## 5. Fotogerçekçilik İçin Sihirli Kelimeler

### 5.1 Kamera Donanımı Referansları

| Referans | Görünüm |
|----------|---------|
| "Shot on Nikon Z9" | Modern dijital, keskin |
| "Shot on Sony A7R IV" | Yüksek çözünürlük |
| "Hasselblad H6D-100c" | Orta format, inanılmaz detay |
| "Leica M11" | Sokak fotoğrafçılığı, doğal renkler |
| "Arri Alexa LF" | Sinema filmi kalitesi |

### 5.2 Film Stokları (Analog Görünüm)

| Film | Karakter |
|------|----------|
| "Kodachrome 64" | Canlı kırmızı/sarı, vintage |
| "CineStill 800T" | Gece, kırmızı haleler (halation) |
| "Ilford HP5 Plus" | Grenli siyah-beyaz |
| "Fujicolor Pro 400H" | Pastel, yumuşak, düğün |

### 5.3 Doku ve Kusurlar (Gerçekçilik İçin)

```
Skin texture, visible pores, skin porosity
Micro-details, subsurface scattering
Film grain, chromatic aberration (hafif)
Lens flares, dust particles
```

---

## 6. Evrensel Negatif Prompt Standardı (2025-2026)

### Temel Negatif Liste
```
deformed, bad anatomy, disfigured, poorly drawn face,
mutation, mutated, extra limb, ugly, disgusting,
poorly drawn hands, missing limb, floating limbs,
disconnected limbs, malformed hands, blurry,
mutated hands, fingers, long neck, long body,
dull, low quality, lowres, watermark, text, signature,
username, artist name, plastic skin, cgi, 3d render,
doll-like, oversaturated, airbrushed, smooth skin,
cartoon, illustration, drawing, anime
```

### Senaryo Bazlı Eklemeler

**Mimari:**
```
warped walls, crooked lines, impossible geometry, blurry textures
```

**Manzara:**
```
power lines, cars, trash, people, tourists, modern buildings
```

**Food Photography:**
```
--no paper cups, plastic, stacked plates, extra decorations,
harsh shadows, artificial look
```

---

## 7. Kompozisyon Kuralları

### 7.1 Temel Kurallar

| Kural | Açıklama | Prompt |
|-------|----------|--------|
| **Rule of Thirds** | 9 kareye böl, kesişimlere yerleştir | "Composed using rule of thirds" |
| **Golden Ratio** | Fibonacci spirali | "Golden ratio composition" |
| **Symmetry** | Tam simetri, Wes Anderson | "Perfectly symmetrical, centered" |
| **Negative Space** | Etrafta boşluk | "Minimalist, lots of negative space" |

### 7.2 Derinlik ve Yönlendirme

| Teknik | Açıklama | Prompt |
|--------|----------|--------|
| **Leading Lines** | Göz yönlendiren çizgiler | "Strong leading lines to center" |
| **Framing** | Doğal çerçeve (kapı, pencere) | "Framed by archway" |
| **Foreground Interest** | Ön plan detayı | "Foreground elements, depth" |

### 7.3 Kamera Açıları

| Açı | Psikolojik Etki | Prompt |
|-----|-----------------|--------|
| **Low Angle** | Güçlü, dominant | "Low angle shot, powerful" |
| **High Angle** | Küçük, savunmasız | "High angle, vulnerable" |
| **Dutch Angle** | Gerilim, kaos | "Dutch angle, tilted, tension" |
| **Bird's Eye** | Tanrı bakışı, plan | "Bird's eye view, overhead" |
| **Eye Level** | Nötr, doğal | "Eye level, natural perspective" |

---

## 8. Model Karşılaştırması

| Özellik | Gemini 3 Pro | DALL-E 3 | Stable Diffusion |
|---------|--------------|----------|------------------|
| **Giriş** | Metin + 14 görsel | Metin + Chat | Metin + Görsel + Params |
| **Düzenleme** | Thought Signatures | Inpainting + Chat | ControlNet + Img2Img |
| **Kontrol** | Yüksek (Anlamsal) | Orta (Dil) | Çok Yüksek (Piksel) |
| **Gereksinim** | API/Cloud | ChatGPT Plus | GPU (Yerel) |
| **En İyi** | Çoklu birleştirme | Hızlı konsept | Hassas kompozisyon |

---

## 9. Food Photography Altın Standart

### Örnek Prompt Yapısı

```
Subject: A close-up shot of a freshly baked, flaky golden croissant
on a minimalist ceramic plate.

Atmosphere: Natural morning sunlight from a side window,
soft shadows, warm tones.

Technical: Macro photography, 85mm f/2.8 lens,
shallow depth of field, sharp focus on the pastry layers.

Details: Micro-crumbs on the plate, steam rising gently,
hyper-realistic 8K textures.

--no plastic, artificial, harsh shadows, flat lighting
```

### Sade Patisserie Uyarlaması

```
Context: Professional lifestyle Instagram photo (9:16).

Composition: Compose scene using [1] as main product on [2] plate.
Include [3] cup naturally positioned beside.

Atmosphere: Warm morning sunlight, f/2.0 shallow depth of field,
soft side-lighting, photorealistic 8K quality.

Constraint: Maintain 100% material and color fidelity for all
references. Use only provided assets.

--no paper cups, stacked plates, extra decorations, harsh shadows
```

---

## 10. Hibrit İş Akışı Önerisi

### Endüstri Standardı Pipeline

```
1. DALL-E 3 → Yaratıcı kompozisyon, konsept geliştirme
      ↓
2. Stable Diffusion + ControlNet → Fotogerçekçi doku, yapısal kontrol
      ↓
3. Gemini 3 Pro → Son rötuş, çoklu referans birleştirme
```

### Sade Patisserie Pipeline (Mevcut)

```
1. Claude → Senaryo seçimi, prompt optimization
      ↓
2. Gemini → Image-to-image görsel üretimi
      ↓
3. Claude → Kalite kontrolü
```

---

## 11. Gelecek Trendleri (2025-2026)

### Fiziksel AI
- Yerçekimi, sürtünme, ışık yansıması simülasyonu
- Materyal bilgisi (kumaş türü, yüzey dokusu)
- Rüzgar hızı, sıvı dinamiği

### Image-to-Video
- Image-to-Image → Video'nun ilk karesi (keyframe)
- Gemini 3 Pro çok modlu yapısı bu geçişi destekler

---

## Versiyon Geçmişi

| Versiyon | Tarih | Değişiklik |
|----------|-------|------------|
| 1.0 | 2026-01-24 | İlk versiyon - Kapsamlı teknik araştırma |

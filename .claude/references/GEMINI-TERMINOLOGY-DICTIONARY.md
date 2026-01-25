# Gemini Terminology Dictionary

> **Amaç:** Gemini (Imagen) için optimize edilmiş food photography terminolojisi
> **Kaynak:** Gemini ile yapılan 6 soruluk derinlemesine araştırma
> **Oluşturulma:** 2026-01-25
> **Felsefe:** "Biz arka plan, Gemini başrol oyuncusu"

---

## İçindekiler

1. [Temel Felsefe](#1-temel-felsefe)
2. [Ürün Bazlı Terminoloji](#2-ürün-bazlı-terminoloji)
3. [El ve Etkileşim Terminolojisi](#3-el-ve-etkileşim-terminolojisi)
4. [Atmosfer ve Mood Terminolojisi](#4-atmosfer-ve-mood-terminolojisi)
5. [Işıklandırma Terminolojisi](#5-ışıklandırma-terminolojisi)
6. [Negative Prompt Kütüphanesi](#6-negative-prompt-kütüphanesi)
7. [Master Prompt Formülü](#7-master-prompt-formülü)
8. [Mevcut Promptların İyileştirilmesi](#8-mevcut-promptların-iyileştirilmesi)

---

## 1. Temel Felsefe

### Gemini Nasıl Çalışır?

Gemini, Midjourney gibi "anahtar kelime yığını" ile değil, **betimsel hikaye ve fizik kuralları** ile çalışır:

- Nesnelerin birbiriyle olan **ilişkisini** önemser
- Işığın madde üzerindeki **fiziksel yayılımını** (subsurface scattering) anlar
- **Malzeme yansımalarını** (material properties) çok iyi işler
- Cümlelerin **gramatikal ağırlığını** dikkate alır

### 3 Altın Kural

| Kural | Açıklama |
|-------|----------|
| **İlişkisel Tanımlama** | Objeleri fiziksel olarak bağla: "Elin ekmeğe dokunduğu yerdeki hafif baskı ve gölge" |
| **"Avoid" Komutu** | `--no` yerine cümle içinde `Avoid any...` kullan |
| **Lens/Diyafram** | Perspektif ve bokeh kontrolü için teknik değerler ver |

### Kritik İçgörü: Pembe Fil Problemi

> "Pembe fil olmasın" dersen AI "pembe fil"e odaklanır

**Çözüm:** Negatif yerine pozitifi dışlayıcı yaz:
- ❌ `--no blue colors`
- ✅ `warm earth tones, brown and gold color palette`

---

## 2. Ürün Bazlı Terminoloji

### Ürün Kritik Terimleri (Hero Features)

| Ürün | Hero Feature | Gemini Terimleri |
|------|--------------|------------------|
| **Croissant** | Lamination (Katmanlaşma) | `honeycomb structure`, `shattered flakes`, `golden-brown crust`, `flaky pastry layers` |
| **Pasta** | Cross-section (Kesit) | `neat layers`, `velvety frosting`, `moist sponge texture`, `offset spatula strokes`, `porous airy texture` |
| **Çikolata** | Yansıma (Reflection) | `high gloss finish`, `sharp snap`, `cocoa dust`, `mirror-like tempered finish`, `softbox reflection` |
| **Kahve** | Mikro-köpük (Microfoam) | `golden crema`, `silky microfoam`, `tiger mottling`, `crisp latte art edges` |

### Doku Terimleri (Texture)

| Türkçe | Gemini Terimi | Kullanım |
|--------|---------------|----------|
| Çıtır katmanlar | `shattered flakes`, `flaky layers` | Kruvasan, börek |
| Nemli pandispanya | `moist sponge texture`, `porous airy texture` | Kek, pasta |
| Parlak şekerleme | `high-gloss mirror finish` | Çikolata, glaze |
| İpeksi krema | `velvety smoothness`, `silky texture` | Mousse, krema |
| Karamelize yüzey | `caramelized golden crust` | Crème brûlée |

### Çikolata İçin Zorunlu Terimler

| Kategori | Terim | Neden? |
|----------|-------|--------|
| **Yüzey** | `mirror-like tempered finish` | Mat plastik değil, parlak yüzey |
| **Akışkanlık** | `viscous, flowing` | Tazelik ve arzu hissi |
| **Işık** | `specular highlight` | O meşhur beyaz parlama çizgisi |
| **Form** | `sharp edges`, `structural integrity` | Formsuz çikolata = felaket |

> ⚠️ **Kritik Uyarı:** "AI, çikolata ve dışkı arasındaki görsel benzerliği bazen ayırt edemez. Form belirten kelimeler şart!"

---

## 3. El ve Etkileşim Terminolojisi

### Elin 3 Fonksiyonel Rolü

| Rol | İngilizce | Kullanım | Örnek Eylem |
|-----|-----------|----------|-------------|
| **Aktif Eylem** | The Action | Dinamizm | Dökme, serpme, kesme, batırma |
| **Sunum** | The Presentation | Sahiplenme | Uzatmak, korumacı tutmak |
| **Ölçek** | The Scale | Boyut referansı | Ürünün boyutunu göstermek |

### Kritik El Terimleri (Zorunlu)

| Kategori | Gemini Terimleri |
|----------|------------------|
| **Anatomik** | `elegant fingers`, `natural skin texture`, `visible pores`, `slender fingers` |
| **Tutuş Şekli** | `pinch`, `grip`, `cupping`, `cradling`, `fingertips gently gripping` |
| **Işık/Deri** | `subsurface scattering on fingertips`, `translucent skin` |
| **Gölge** | `contact shadow`, `realistic contact shadows` |
| **Baskı** | `gentle pressure`, `slight indentation` |

### AI El Hatalarını Önleme

| Hata | Çözüm Terimi |
|------|--------------|
| Belirsiz tutuş | `fingertips gently gripping the crispy crust` |
| Yanlış parmak sayısı | `anatomically correct hand`, `five distinct fingers` |
| Montaj görünümü | `contact shadow`, `side profile of a hand` |
| Plastik deri | `natural skin texture with visible pores` |
| Yapıştırılmış görünüm | `gentle pressure creating slight indentation` |

### Karakter Bazlı El Profilleri

#### Sanatçı Eli (Artist's Touch)
```
slender fingers, natural nails, expressive gestures
faint traces of charcoal on knuckles
subtle dried oil paint on fingertips
paint-stained denim sleeve
minimalist silver ring, leather wristband
```

#### Bakımlı Feminen El
```
elegant feminine hand
manicured nails, clean natural nails
soft skin texture
delicate grip
```

### Etkileşim Kurguları

| Kurgu | Aksiyon | Anahtar Terimler |
|-------|---------|------------------|
| **Kruvasan** | Breaking | `charcoal-stained fingertips`, `crumbs falling`, `motion blur on falling crumbs` |
| **Kahve** | Cupping | `both hands cupping`, `translucent skin (subsurface scattering)`, `warm ceramic mug` |
| **Çikolata** | Precision | `holding like a precious gemstone`, `mirror-like reflection on chocolate surface` |

---

## 4. Atmosfer ve Mood Terminolojisi

### Kritik Atmosfer Bileşenleri

| Kategori | Kritiklik | Gemini Terimleri |
|----------|-----------|------------------|
| **Işık Kalitesi** | Hayati | `hard light`, `soft light`, `contrast ratio` |
| **Gölge Stili** | Hayati | `Chiaroscuro`, `Low-Key`, `High-Key` |
| **Renk Sıcaklığı** | Yüksek | `3000K (warm)`, `5500K (daylight)`, `7000K (cool)` |
| **Arka Plan** | Yüksek | `weathered oak`, `dark slate`, `white linen`, `white marble` |

### 3 Temel Mood Kurgusu

#### Morning Ritual (Sabah Rutini)
```
Anahtar: side-lit from window, hazy morning light, bright and airy
Renk Paleti: Beyaz, pastel, açık ahşap
Kelvin: 5500K (daylight)
Kullanım: Tazelik, yeni başlangıç
```

#### Rustic Heritage (Geleneksel Miras)
```
Anahtar: golden hour, warm color temperature, textured wood
Renk Paleti: Toprak tonları, bakır, koyu kahve
Kelvin: 3000-3500K (warm)
Kullanım: Nostalji, el yapımı, doğallık
```

#### Gourmet Midnight (Gece Yarısı Gurmesi)
```
Anahtar: low-key lighting, high contrast, specular highlights
Renk Paleti: Siyah, koyu gri, altın yansımalar
Kelvin: Neutral with accent
Kullanım: Lüks, tutku, yoğun lezzet
```

### Hacimsel Işık Terimleri (Volumetric)

```
volumetric sunlight streaming through dusty window
long dramatic shadows
back-lit with warm 3000K color temperature
hazy morning light
fine dust particles in light beam
```

### Doku ve Malzeme Terimleri

| Terim | Türkçe | Kullanım |
|-------|--------|----------|
| `tactile linen` | Dokunsal keten | Yumuşaklık, ev sıcaklığı |
| `weathered wood` | Eskimiş ahşap | Yaşanmışlık, zaman |
| `white marble` | Beyaz mermer | Lüks, temizlik |
| `dark slate` | Koyu arduvaz | Dramatik, modern |
| `fine-grained film aesthetic` | İnce grenli film | Dijital keskinliği kırar |

### Kritik Uyarılar

| Risk | Çözüm |
|------|-------|
| Dark = sadece brightness kısmak | `dark atmosphere` + `bright highlights on product` |
| Kahverengi boğulması | Kontrast renk noktası ekle (berry, lavender) |
| Kelvin eksik = gri tonlar | Her zaman Kelvin değeri belirt |
| Stok fotoğraf hissi | `volumetric lighting`, `hand-shaped`, `weathered` |

---

## 5. Işıklandırma Terminolojisi

### 4 Kritik Işık Bileşeni

| Değişken | Kritiklik | Gemini Terimleri |
|----------|-----------|------------------|
| **Yön** | Hayati | `backlighting`, `side-lighting (90°)`, `rim lighting`, `45-degree angle` |
| **Kalite** | Hayati | `diffused softbox`, `hard light`, `harsh shadows` |
| **Sıcaklık** | Yüksek | `3000K (warm)`, `3200K`, `5500K (daylight)` |
| **Yoğunluk** | Orta | `high specular highlights`, `subtle glow` |

### Işık Yönü Terimleri

| Terim | Kullanım | Ne Zaman? |
|-------|----------|-----------|
| `Backlighting` | Sıvı parlaması, buhar görünürlüğü | Kahve, sos, şurup |
| `Side-lighting (90°)` | Doku vurgulama | Ekmek, kruvasan, kek |
| `Rembrandt Lighting (45°)` | Hacim + yumuşak gölge | Pasta, çikolata |
| `Rim Lighting / Kicker` | Arka plandan ayırma | Koyu renkli ürünler |

### Işık Kalitesi Terimleri

| Terim | Sonuç |
|-------|-------|
| `Diffused Softbox Light` | Yumuşak geçişli gölgeler, ipeksi parlaklık |
| `Hard Light / Harsh Shadows` | Dramatik, yüksek kontrast |
| `Specular Highlights` | Yağ/şeker/nem yansımaları |
| `Crisp light bars` | Kontrollü stüdyo yansıması (ayna soslu pastalar için) |

### Fizik Terimleri (Gemini İçin Kritik)

| Terim | Fonksiyon |
|-------|-----------|
| `Subsurface Scattering` | Işığın krema/sos/deri içine nüfuz etmesi |
| `Contact shadows` | Ürünün tabağa/masaya oturduğunu gösterir |
| `Ray-traced lighting effects` | Gerçekçi yansıma fiziği |
| `Vignetting` | Kenarlarda karartma, odak yönlendirme |

### Kamera Teknik Ayarları

| Ayar | Önerilen Değer | Neden? |
|------|----------------|--------|
| Lens | `85mm prime`, `100mm macro` | Yemek detayı için ideal perspektif |
| Aperture | `f/2.2 - f/4.0` | Yeterli netlik + güzel bokeh |
| White Balance | `neutral white balance` | Renk sapmasını önler |

### Kritik Işık Hataları

| Hata | Sonuç | Çözüm |
|------|-------|-------|
| Frontal flash | Düz, ucuz menü fotoğrafı | Asla kullanma |
| Işık yönü yok | Fake görünüm | Her zaman yön belirt |
| Sadece "shiny" | Kontrolsüz beyaz lekeler | `specular highlights`, `crisp light bars` |
| f/1.8 çok açık | Yarısı bulanık | `f/2.2` veya `f/4.0` kullan |

---

## 6. Negative Prompt Kütüphanesi

### Gemini Format

Gemini için `--no` yerine doğal dil kullan:
```
"Avoid any plastic textures and make sure the plate is perfectly clean with no crumbs or smudges."
```

### Kategori Bazlı Negative Terimler

#### Teknik Kusurlar
```
blur, grain, low resolution, watermark, text, signature, distorted, motion blur
```

#### Food Styling Hataları
```
plastic texture, wax, oily, greasy, moldy, burnt, messy plate, hair, debris, raw dough
```

#### El/Anatomi Kusurları
```
deformed hands, extra fingers, fused fingers, missing limbs, bad anatomy, claw-like hands
```

#### Kompozisyon Hataları
```
cluttered background, distracting elements, messy kitchen, plastic wrap, neon colors, bright artificial lighting
```

### Plasebo Terimler (KULLANMA)

| Terim | Neden Gereksiz? | Alternatif |
|-------|-----------------|------------|
| `ugly, bad` | Göreceli, AI anlamaz | `distorted, deformed` |
| `8K photorealistic` (negative'de) | Ters etki yapar | Pozitife `professional` yaz |
| `normal quality` | Anlamsız | `amateur, phone camera` |

### Ürün Bazlı Negatifler

#### Çikolata
```
Avoid: plastic texture, wax, blue lighting, distorted cream, formless chocolate
```

#### Pasta/Kek
```
Avoid: collapsed layers, runny frosting, cracked surface, artificial colors
```

#### El Etkileşimi
```
Avoid: deformed hands, extra fingers, floating hand, no contact shadow
```

---

## 7. Master Prompt Formülü

### Gemini İçin Optimize Edilmiş Şablon

```
[SUBJECT & MATERIALITY]:
[Ürün adı] featuring [mikro doku detayı: çıtırlık, parlaklık, nem].
Focus on the [specific texture description].

[INTERACTION (HAND)] (varsa):
[Karakter tipi] hand with [deri detayı] is [eylem],
focusing on the [temas noktası].
Ensure realistic contact shadows where fingertips meet [object].

[LIGHTING & PHYSICS]:
[Işık yönü] [ışık kalitesi] with color temperature of [Kelvin].
Highlight the [yansıma türü] and ensure realistic [fizik efekti].

[ATMOSPHERE & COMPOSITION]:
[Mood adı] setting at [mekan].
[Arka plan detayları] with [props].
Shallow depth of field ([lens], [aperture]).

[STRICT RULES / AVOID]:
* Avoid any [negatif 1], [negatif 2], [negatif 3].
* [Kritik kural 1]
* [Kritik kural 2]
* [Aspect ratio] for [platform].
```

### Örnek: Katmanlı Pasta Kesiti

```
SUBJECT & MATERIALITY:
A professional lifestyle shot of a moist, multi-layered chocolate mousse cake slice.
Focus on the porous, airy texture of the sponge and the velvety smoothness of the cream layers.
The top glaze must have a high-gloss mirror finish reflecting the sky.

INTERACTION (HAND):
An elegant feminine hand with natural skin texture and clean nails is gently holding the white ceramic plate.
Ensure realistic contact shadows where the fingertips meet the plate.
The hand is positioned naturally, framing the cake slice without obstructing its layers.

LIGHTING & PHYSICS (ANTALYA TERRACE VIBE):
Intense, direct Mediterranean morning sunlight (5500K) from a 45-degree angle.
This must create crisp, high-contrast shadows on the table.
Use Subsurface Scattering on the cream edges to make them look fresh and soft.
Highlight the specular reflections on the moist parts of the cake.

ATMOSPHERE & COMPOSITION:
Sade Patisserie terrace setting.
A blurred white marble table top with a designer coffee cup in the background.
Shallow depth of field (85mm lens, f/2.2) to create a creamy bokeh background of the sun-lit terrace.

STRICT RULES:
* Avoid any steam, smoke, plastic-like textures, or wax on chocolate/cream.
* The product must be clearly recognizable and identical to the reference image assets.
* No extra hands, no distorted fingers.
* 9:16 vertical aspect ratio for Instagram Stories.
```

---

## 8. Mevcut Promptların İyileştirilmesi

### Eksikler ve Çözümler

| Mevcut | Sorun | İyileştirilmiş |
|--------|-------|----------------|
| `8K photorealistic` | Plasebo terim | `85mm lens, f/2.0` |
| `Sun-lit table` | Muğlak | `Directional light with specular highlights` |
| `Elegant hand` | Plastik görünüm riski | `Subsurface scattering on skin` |
| `Holding naturally` | Belirsiz | `Fingertips gently pressing with contact shadow` |
| `Product` | Boş kutu | Spesifik doku: `flaky golden crust` |

### Gereksiz Terimler (Kaldır)

| Terim | Neden? |
|-------|--------|
| `8K photorealistic` | AI 8K üretmez, stok fotoğraf estetiğine iter |
| `Lifestyle Instagram photo` | Platform adı yerine estetik tarif et |
| `Clearly recognizable from reference` | Temenni, kapasite artırmaz |
| `Use ONLY assets from reference` | AI %100 uygulalamaz |

### Kritik Eklemeler

1. **Materyal Betimlemesi:** Yüzeyin mat/parlak/gözenekli/nemli olduğunu belirt
2. **Işık-Madde Etkileşimi:** `Subsurface Scattering`, `Specular Highlights`
3. **Mikro Dokular:** Ürüne özel doku detayları
4. **El Anatomisi:** Baskı, temas gölgesi, parmak pozisyonu
5. **Kelvin Değeri:** Her zaman renk sıcaklığı belirt

---

## Hızlı Referans Tablosu

### Mood → Işık → Kelvin

| Mood | Işık Stili | Kelvin | Gölge |
|------|-----------|--------|-------|
| Energetic | Hard directional, high contrast | 5500K | Crisp, defined |
| Social | Warm ambient, soft shadows | 3500K | Soft, inviting |
| Relaxed | Diffused window, pastel | 5000K | Minimal |
| Warm | Golden hour, amber tones | 3000K | Long, dramatic |
| Cozy | Intimate focused, deep shadows | 3200K | Soft but present |
| Balanced | Studio-like, neutral | 5500K | Clean, professional |

### Ürün → Kritik Terimler

| Ürün | Zorunlu Terimler |
|------|------------------|
| Croissant | `honeycomb structure`, `shattered flakes`, `side-lighting 90°` |
| Pasta | `moist sponge`, `neat layers`, `velvety frosting`, `f/2.2-4.0` |
| Çikolata | `mirror-like tempered`, `specular highlight`, `rim lighting` |
| Kahve | `golden crema`, `silky microfoam`, `backlighting`, `steam` (dikkatli) |

---

## Notlar

- Bu sözlük Gemini (Imagen) için optimize edilmiştir
- Midjourney için `--no` formatı kullanılabilir
- DALL-E için benzer doğal dil yapısı geçerlidir
- Düzenli olarak test edip güncellenmelidir

---

> **Son Güncelleme:** 2026-01-25
> **Kaynak:** Gemini ile 6 soruluk derinlemesine araştırma

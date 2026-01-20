# Görsel Üretme Kuralları

**Tüm AI görsel üretimi için geçerli temel kurallar**

Bu kurallar CLAUDE.md'deki proje kurallarının detaylı açıklamasıdır ve tüm prompt dosyalarında uygulanmalıdır.

---

## 1. IMAGE-TO-IMAGE ZORUNLULUĞU

### Kural
**ASLA** text-to-image (sıfırdan üretim) kullanma. **HER ZAMAN** gerçek ürün fotoğrafı referans olarak yükle.

### Uygulama
- Her prompt `Using uploaded image(s) as reference...` ile başlamalı
- AI, yüklenen referans fotoğraftan ürünü öğrenmeli
- Prompt sadece **kompozisyon, ışık, atmosfer** tarif etmeli

### YASAK
```
❌ "white chocolate bonbon with pistachio pieces"
❌ "golden croissant with flaky layers"
❌ "dark chocolate pyramid shaped truffle"
```

### DOĞRU
```
✅ "Replicate exact product appearance from uploaded reference"
✅ "Maintain exact colors, shapes, and decorations from uploaded images"
✅ "Product as shown in reference photo"
```

### Neden?
- Kendi ürünlerimizin görselini oluşturuyoruz, hayal ürünü değil
- AI'ın yorumu istenmiyor, sadece stilize etmesi isteniyor
- Tutarlılık: Her seferinde aynı ürün, farklı kompozisyon

---

## 2. ÜRÜN TARİFİ YASAĞI

### Kural
Ürünün **ne olduğunu** tarif etme. AI referans fotoğraftan görecek.

### YASAK Örnekler
```
❌ "croissant with visible lamination layers and golden-brown caramelized exterior"
❌ "assorted bonbons - white chocolate, milk chocolate, fruit-filled, pistachio-topped"
❌ "chocolate box with embossed gold lettering"
```

### DOĞRU Örnekler
```
✅ "Product from reference image, positioned in center"
✅ "Bonbons as shown in uploaded photos"
✅ "Box exactly as uploaded, maintaining all details"
```

### Ne Tarif Edilebilir?
- Kompozisyon (açı, pozisyon, framing)
- Işık (yön, sertlik, renk sıcaklığı)
- Atmosfer (mood, stil)
- Teknik (DOF, bokeh, resolution)
- Arka plan
- Props (varsa)

---

## 3. STANDART BACKDROP

### Varsayılan
```
soft off-white backdrop (RGB 250,248,245) with 3% subtle texture
```

### Uygulama
- Promptlarda belirtmeye **gerek yok** - varsayılan olarak geçerli
- Farklı arkaplan istenirse açıkça belirtilmeli
- Koyu/siyah arkaplan **YASAK** (marka estetiğine aykırı)

### Neden Bu Renk?
- Sıcak, davetkar his
- Ürün ön planda kalır
- E-commerce standardı
- Marka tutarlılığı

---

## 4. İNSAN FAKTÖRLERİ

### Varsayılan: YOK
- İnsan eli, parmak, kol **YASAK** (varsayılan)
- Ayak, bacak, gövde **YASAK**
- Yüz, siluet **YASAK**

### İstisna
Kullanıcı açıkça isterse eklenebilir:
- `[HANDS]` etiketi ile işaretlenmeli
- Prompt'ta "özel istek üzerine" notu olmalı

### Negative Prompt'a Ekle
```
human hands, fingers, human elements, people, body parts
```

---

## 5. TEXT/TYPOGRAPHY

### Varsayılan: YOK
- Görsel üzerinde text overlay **YASAK**
- Watermark **YASAK**
- Logo ekleme **YASAK** (ürün üzerindeki hariç)

### İstisna: Ürün Üzerindeki Typography
Kutu, ambalaj gibi ürünlerde mevcut yazılar **KORUNMALI**:

```
CRITICAL: "[Marka adı]" text must remain razor-sharp, perfectly legible, zero deformation
```

### Typography Koruması Gereken Ürünler
- Çikolata kutuları (SadeChocolate, Antalya)
- Ambalajlar (logo, marka adı)
- Etiketler

### Negative Prompt'a Ekle
```
text deformation, blurry typography, misspelled brand name, illegible logo, distorted letters
```

---

## 6. DUMAN/STEAM YASAĞI

### Kural
**ASLA** duman, buhar, sis efekti kullanma.

### YASAK
```
❌ steam rising from coffee
❌ smoke effect
❌ misty atmosphere
❌ vapor
❌ fog
```

### Negative Prompt'a Ekle
```
steam, smoke, vapor, mist, fog, hot steam rising
```

### Neden?
- Yapay görünüm yaratır
- Ürün netliğini bozar
- Marka estetiğine aykırı

---

## 7. FORMAT KURALLARI

### analyses/ klasörü (Instagram)
- 4:5 portrait (feed)
- 9:16 vertical (stories)
- 1:1 square (grid)

### prompts/ klasörü (Web/Genel)
- Oran belirtilmez (varsayılan)
- Veya kullanım amacına göre belirtilir

### Her Zaman Belirt
```
9:16 vertical aspect ratio (1080x1920px) for Instagram Stories
4:5 vertical aspect ratio for Instagram feed
```

---

## 8. RENK UYUMU

### Kural
Tüm elementler (toz, prop, gölge) ürün tonlarına uyumlu olmalı.

### İstisnalar (Doğal renk korunur)
- İnsan eli (istenirse)
- Meyve/sebze
- Ham malzeme (fıstık, badem, vb.)

### Uygulama
- Pudra şekeri: Ürün tonuna uygun
- Arka plan: Sıcak/nötr
- Props: Nötr renkler (beyaz, krem, ahşap)

---

## 9. PROMPT YAPISI

### Önerilen Sıra
1. **Referans bildirimi** - "Using uploaded image(s) as reference..."
2. **Genel tanım** - Ne tür fotoğraf (product photography, flat lay, etc.)
3. **Kompozisyon** - Açı, pozisyon, framing
4. **Arka plan** - Backdrop, yüzey
5. **Işık** - Yön, tip, sertlik
6. **CRITICAL** - Typography koruması (varsa)
7. **Atmosfer** - Mood, stil
8. **Teknik** - Resolution, DOF
9. **Negative prompt** - `--no` ile yasaklar

### Örnek Yapı
```
Using uploaded image(s) as reference for [ürün].

[Fotoğraf tipi] of [ürün/sahne], [format]. [Kompozisyon detayları].

[Arka plan]. [Işık detayları].

CRITICAL: [Typography koruması - varsa].

[Atmosfer]. [Teknik]. 8k photorealistic.

--no [yasaklar listesi]
```

---

## 10. UNIVERSAL NEGATIVE PROMPT

Tüm promptlara eklenebilecek standart yasaklar:

```
dark background, black backdrop, moody lighting, grey background,
text deformation, blurry typography, misspelled text, illegible logo,
steam, smoke, vapor, mist, fog,
human hands, fingers, human elements, people,
harsh shadows, flash photography,
CGI look, artificial, plastic appearance, 3D render,
oversaturated colors, cold blue tones,
busy background, cluttered composition,
watermark, logo overlay, text on image,
landscape orientation (for vertical formats),
different product than reference
```

---

## ÖZET CHECKLIST

Prompt yazmadan önce kontrol et:

- [ ] `Using uploaded image(s) as reference...` ile başlıyor mu?
- [ ] Ürün **tarif edilmemiş**, sadece referansa yönlendirilmiş mi?
- [ ] Format belirtilmiş mi? (9:16, 4:5, vb.)
- [ ] Backdrop belirtilmiş mi? (off-white varsayılan)
- [ ] İnsan elementi **yok** mu? (varsayılan)
- [ ] Typography koruması **CRITICAL** ile vurgulanmış mı? (kutu/ambalaj için)
- [ ] Steam/smoke negative prompt'ta mı?
- [ ] İki kutu/ürün sorunu için "SINGLE", "ONE only" var mı?

---

## 11. NÖROGASTRONOMİ PRENSİPLERİ

> **"İlk ısırık her zaman gözlerle alınır"**

Görsel nörogastronomi, beynin gıda görsellerini nasıl işlediğini ve iştah tepkisini nasıl tetiklediğini inceler. Bu bilgiler prompt yazımında kullanılmalıdır.

### Beyin Mekanizması

| Beyin Bölgesi | Görevi | Prompt Stratejisi |
|---------------|--------|-------------------|
| **Orbitofrontal Korteks** | Kalori/ödül değeri hesaplar | Zengin, katmanlı görüntüler |
| **Insula** | Geçmiş tat anılarını çağırır | Tanıdık sunumlar (dilim, ısırık izi) |
| **Ayna Nöronlar** | "Sanki ben yapıyorum" hissi | Aksiyon anları, insan eli |

### Evrimsel Tetikleyiciler
- **Parlaklık** = Hidrasyon/yağ sinyali (taze)
- **Renk doygunluğu** = Besin yoğunluğu sinyali
- **Mat görünüm** = Bayatlık algısı

---

## 12. IŞIK STRATEJİLERİ (Gelişmiş)

### Işık Pozisyon Rehberi

| Işık Tipi | Konum (Saat) | Kullanım Alanı | Psikolojik Etki |
|-----------|--------------|----------------|-----------------|
| **SIDE_LIGHT** | 9:00 veya 3:00 | Ekmek, pasta, katmanlı ürünler | Doku ortaya çıkar, "sabah tazeliği" |
| **BACK_LIGHT** | 12:00 | İçecek, sos, şurup, glaze | Yarı saydamlık, "mücevher etkisi" |
| **45_LIGHT** | 10:00 veya 2:00 | Genel kahraman çekimi | Denge: hem doku hem parıltı |
| **HARD_LIGHT** | Doğrudan güneş | Dondurma, canlı renkler | Heyecan, yaz enerjisi |
| **SOFT_LIGHT** | Difüzörlü | Konfor yemekleri | Güven, ev sıcaklığı |

### Prompt'ta Işık Belirtme
```
LIGHTING: Side light from left (9 o'clock position), soft diffused, creating gentle shadows to reveal texture layers
```

### Speküler Yansıma (Parıltı)
- Parlak = Taze, sulu, iştah açıcı
- Mat = Bayat, kuru algısı
- **Strateji:** Glaze, sos, meyve yüzeyleri için ışık açısını yansıma noktasına ayarla

---

## 13. RENK PSİKOLOJİSİ

### Sıcak Tonlar (İştah Açıcı)
| Renk | Çağrışım | Kullanım |
|------|----------|----------|
| **Kırmızı** | Tatlılık, olgunluk | Çilek, kiraz, kırmızı meyve |
| **Sarı** | Mutluluk, konfor | Ekmek, kruvasan, karamel |
| **Turuncu** | Karamelizasyon, sıcaklık | Fırınlanmış ürünler |

### Pastel Paradoksu (Tatlılar İçin)
```
Pastel pembe > Koyu kırmızı
(daha "şekerli" ve "hassas" algılanır)
```
- **%18 daha yüksek satış dönüşümü**
- Gen Z için "soft living" estetiği
- Premium tatlı kategorisinde tercih edilmeli

### Kontrast Stratejisi
```
Sıcak ürün + Soğuk zemin = Algısal parlaklık artışı

Örnek: Altın kruvasan + Lacivert zemin = %20-30 artış
```

### Ürün Kategorisine Göre Palet

| Ürün | Önerilen Palet |
|------|----------------|
| **Çikolata** | Koyu kahveler, altınlar, sıcak gölgeler |
| **Meyveli Pastalar** | Parlak kırmızılar/turuncular, beyaz ışıklar |
| **Makaron/Krema** | Pasteller (pembe, nane, bebek mavisi) |
| **Tuzlu Ekmekler** | Sıcak toprak tonları, ahşap dokular |

---

## 14. AKSİYON ANI (Motion Shots)

> **%40 daha fazla etkileşim** - Hareket > Durağan

### Aksiyon Türleri

| Aksiyon | Etiket | Ne İletir | Beyin Tepkisi |
|---------|--------|-----------|---------------|
| Sos/şurup dökme | `[POUR]` | Viskozite = zenginlik | Ağız sulanması |
| Pudra eleme | `[DUST]` | Hafiflik, havadarlık | Tazelik hissi |
| Kabuk/çikolata kırma | `[BREAK]` | Çıtırlık | İşitsel simülasyon |
| Kesim/dilim | `[CUT]` | İç yapı, katmanlar | Merak tatmini |
| Isırık izi | `[BITE]` | Doku, gerçeklik | Sahiplenme |
| Kaşık batırma | `[DIP]` | Kremasılık | Dokunsal simülasyon |

### Prompt'ta Aksiyon Belirtme
```
ACTION MOMENT: Fork piercing through layers, revealing creamy interior, frozen at the moment of entry
```

### Video/Reels Kancaları (İlk 1.5 saniye)
- Kesim anı (içi gösterme) → Merak boşluğu
- Dökme anı → Viskozite simülasyonu
- Kabuk kırma → Şok/şaşkınlık
- ASMR sesi → Sinestezi

---

## 15. WABİ-SABİ ESTETİĞİ (2025 Trendi)

> **"Kusurlu güzellik = Otantiklik kanıtı"**

### Felsefe
```
Mükemmel pasta = Fabrikasyon, yapay
Bir dilimi eksik + kırıntılar = Gerçek, ev yapımı, güvenilir
```

### Wabi-Sabi Elementleri
- [ ] Bir dilim eksik
- [ ] Masada kırıntılar
- [ ] Hafif asimetri
- [ ] Doğal ışık gölgeleri
- [ ] Kullanılmış görünümlü prop'lar

### Prompt'ta Wabi-Sabi
```
WABI-SABI AESTHETIC: One slice already taken, natural crumbs scattered on plate, imperfect but authentic presentation
```

### Neden Önemli?
- AI üretimi görsellerin arttığı çağda kusurluluk = gerçeklik
- "Bu gerçek bir yemek, insan tarafından yapıldı" mesajı
- Güven inşa eder

---

## 16. KOMPOZİSYON PSİKOLOJİSİ

### Minimalizm vs Maksimalizm

| Stil | Platform | Etkileşim | Kullanım |
|------|----------|-----------|----------|
| **Minimalist** | Instagram Feed | %67 daha yüksek | Tek ürün, net mesaj |
| **Maksimalist** | Blog, E-ticaret | Daha yüksek dönüşüm | Hikaye anlatımı |

### Derinlik Katmanları (3 Düzlem)
1. **Ön Plan** - Bulanık props/malzeme (gözü yönlendirir)
2. **Orta Plan** - Keskin odakta kahraman ürün
3. **Arka Plan** - Bulanık ortam (bağlam sağlar)

### Kırıntı Faktörü
```
Masadaki kırıntılar = Gevreklik kanıtı
Tertemiz sunum = Plastik/yapay algısı
```

---

## 17. MEKAN + ÜRÜN KOMPOZİSYONU

Mağaza/kafe ortamında ürün çekimi için özel kurallar.

### Referans Kullanımı
```
Image 1: Ürün referansı
Image 2: Mekan referansı

→ Ürün, mekan ortamına yerleştirilir
```

### Işık Uyumu
- Mekan görselindeki ışık yönünü analiz et
- Ürün üzerindeki ışık aynı yönden gelmeli
- Gölge tutarlılığı kritik

### Derinlik Yönetimi
```
Ürün: Keskin odak (f/2.8)
Mekan: Yumuşak bokeh (arka plan)
Pencere: Hafif overexposed (doğal his)
```

### Prompt Yapısı (Mekan + Ürün)
```
Using uploaded images as reference: Image 1 for product, Image 2 for café environment.

Lifestyle product photography of [ürün] from Image 1, placed in the café setting from Image 2.

[Pozisyon ve kompozisyon]
[Işık - mekanla uyumlu]
[Atmosfer]
[Teknik detaylar]

--no [yasaklar]
```

---

## ÖZET CHECKLIST (Güncellenmiş)

Prompt yazmadan önce kontrol et:

### Temel
- [ ] `Using uploaded image(s) as reference...` ile başlıyor mu?
- [ ] Ürün **tarif edilmemiş**, sadece referansa yönlendirilmiş mi?
- [ ] Format belirtilmiş mi? (9:16, 4:5, vb.)

### Nörogastronomi
- [ ] Işık stratejisi belirlenmiş mi? (SIDE/BACK/SOFT/HARD)
- [ ] Speküler yansıma (parıltı) düşünülmüş mü?
- [ ] Renk kontrastı uygulanmış mı?

### Etkileşim Artırıcı
- [ ] Aksiyon anı var mı? (POUR/CUT/BREAK/DUST)
- [ ] Wabi-sabi elementleri eklenmiş mi?
- [ ] Derinlik katmanları tanımlanmış mı?

### Yasaklar
- [ ] Steam/smoke negative prompt'ta mı?
- [ ] İnsan elementi kontrol edilmiş mi?
- [ ] Typography koruması (varsa) CRITICAL ile mi?

---

## 18. PLATFORM-SPESİFİK PROMPT FORMATLARI

> **"Prompting artık model-spesifik"** - Her platform farklı dil konuşuyor

### Platform Karşılaştırma Tablosu

| Platform | Prompt Stili | Güçlü Yön | Zayıf Yön |
|----------|--------------|-----------|-----------|
| **Midjourney V7** | Kısa, yüksek-sinyal | Estetik, atmosfer | Typography |
| **DALL-E 3 / GPT-4o** | Paragraf, detaylı | Typography, tutarlılık | Bazen "temiz" |
| **Stable Diffusion 3.5** | Ağırlıklı keyword | Kontrol, fine-tune | Kurulum gerekli |
| **Ideogram 2.0** | Doğal dil | Typography, logo | Sınırlı stil |
| **Flux** | Hibrit | Gerçekçilik | Yeni, dokümantasyon az |

### Midjourney V7 Format

```
[Fotoğraf tipi], [konu], [ışık], [açı], [mood] --ar [oran] --style raw --v 7

Örnek:
food photography, artisan tiramisu in glass container,
soft side lighting from window, 45-degree angle,
warm café morning mood, shallow depth of field --ar 4:5 --style raw --v 7
```

**Midjourney Özel Parametreler:**
- `--ar 4:5` → Instagram feed
- `--ar 9:16` → Stories
- `--style raw` → Daha az stilize, gerçekçi
- `--s 50-200` → Stilizasyon seviyesi
- `--c 0-100` → Chaos (varyasyon)
- `--no [item]` → Negative prompt

### DALL-E 3 / GPT-4o Format

```
Using uploaded image(s) as reference for [ürün].

[Paragraf 1: Sahne tanımı]
Detailed lifestyle product photography of [ürün] from reference image,
placed in [ortam]. [Kompozisyon detayları].

[Paragraf 2: Teknik detaylar]
LIGHTING: [Işık açıklaması]
CAMERA: [Açı, DOF, lens]
ATMOSPHERE: [Mood, renk paleti]

[Paragraf 3: Kritik korumalar]
CRITICAL: [Typography/ürün koruma]

[Paragraf 4: Format]
Aspect ratio: [oran]. 8K photorealistic quality.

Avoid: [yasaklar listesi]
```

**DALL-E Avantajları:**
- Typography korumasında en başarılı
- Iteratif düzeltme (multi-turn)
- Referans görsel ile tutarlılık

### Stable Diffusion Format (Ağırlıklı)

```
(food photography:1.3), (tiramisu:1.2), glass container,
(soft natural lighting:1.1), café interior, wooden table,
(shallow depth of field:1.2), warm tones, morning atmosphere,
8k, photorealistic, commercial quality

Negative prompt:
(blurry:1.3), out of focus, low quality, watermark,
(harsh shadows:1.2), overexposed, underexposed,
plastic appearance, CGI, 3D render, cartoon
```

**Ağırlık Sistemi:**
- `(keyword:1.0-1.5)` → Vurgu artır
- `(keyword:0.5-0.9)` → Vurgu azalt
- `[keyword]` → Alternatif azaltma

### Ideogram 2.0 Format (Typography İçin)

```
Product photography of chocolate box with text "SadeChocolate" clearly visible.
The brand name must be sharp, legible, and properly spelled.
[Ortam ve ışık detayları]
Photorealistic, commercial quality.
```

**Ideogram Kullanım Durumu:**
- Kutu/ambalaj görselleri
- Logo içeren ürünler
- Marka adı kritik olduğunda

---

## 19. UNIVERSAL NEGATIVE PROMPT (Genişletilmiş)

### Temel Yasaklar (Tüm Platformlar)

```
blurry, out of focus, low resolution, pixelated, watermark,
poor lighting, harsh shadows, overexposed, underexposed,
CGI look, artificial, plastic appearance, 3D render,
cartoon, illustration, painting, sketch, drawing
```

### Ürün Fotoğrafçılığı Spesifik

```
fake materials, incorrect texture, plastic-looking metal,
wrong proportions, distorted shape, melted appearance,
different product than reference, duplicate products
```

### Food Photography Spesifik

```
unappetizing, spoiled food, moldy, burnt, raw (unless intended),
artificial colors, food coloring visible, plastic food,
stock photo look, generic presentation
```

### Typography Koruması

```
text deformation, blurry typography, misspelled text,
illegible text, wrong font, distorted letters,
cut-off text, overlapping letters, gibberish text
```

### Marka Spesifik (Sade)

```
dark background, black backdrop, moody lighting, grey background,
steam, smoke, vapor, mist, fog,
human hands, fingers, human elements, people,
cold blue tones, desaturated colors
```

---

## 20. PROMPT ŞABLONLARI (Kopyala-Yapıştır)

### Şablon A: Tek Ürün (Stüdyo)

```
Using uploaded image as reference.

Commercial product photography of [ürün] from reference,
centered on soft off-white backdrop (RGB 250,248,245).

LIGHTING: [SIDE_LIGHT/SOFT_LIGHT] from [yön],
creating gentle shadows to reveal texture.

COMPOSITION: [Açı] angle, product fills 60% of frame,
negative space for breathing room.

8K photorealistic, shallow DOF (f/2.8).

--no dark background, harsh shadows, steam, smoke, human elements
```

### Şablon B: Lifestyle (Mekan + Ürün)

```
Using uploaded images: Image 1 for product, Image 2 for environment.

Lifestyle product photography of [ürün] from Image 1,
placed in the café setting from Image 2.

SCENE: [Pozisyon], [prop'lar], [atmosfer]
LIGHTING: Natural [SIDE/BACK] light matching environment
DEPTH: Product sharp (f/2.8), background in soft bokeh
ACTION: [Opsiyonel - POUR/CUT/DIP/DUST]
WABI-SABI: [Opsiyonel - one portion taken, crumbs scattered]

4:5 vertical for Instagram feed. Warm, inviting mood.

--no artificial lighting, sterile look, human hands, steam
```

### Şablon C: Aksiyon Anı

```
Using uploaded image as reference.

Dynamic food photography capturing [AKSİYON] moment.

ACTION: [Detaylı aksiyon açıklaması - sos dökülüyor, pudra eleniyor, vb.]
Frozen at peak moment, [madde] suspended mid-air.

LIGHTING: [BACK_LIGHT] to catch particles/liquid in air
TECHNICAL: High shutter speed freeze, f/4 for action depth

4:5 vertical, commercial quality.

--no motion blur (unless artistic), static appearance, flat lighting
```

### Şablon D: Typography Koruma (Kutu/Ambalaj)

```
Using uploaded image as reference for the packaging.

Product photography of [kutu/ambalaj] from reference,
maintaining all branding elements exactly as shown.

CRITICAL TYPOGRAPHY PROTECTION:
- "[Marka Adı]" text: razor-sharp, perfectly legible, zero deformation
- "[Alt yazı]" text: complete and readable
- Logo/graphics: undistorted, color-accurate

LIGHTING: Even, soft illumination to avoid reflections on text
ANGLE: [Açı] to show text clearly without perspective distortion

Platform: DALL-E 3 or Ideogram (recommended for typography)

--no text deformation, blurry typography, misspelled brand name,
illegible logo, distorted letters, cut-off text
```

---

## ÖZET CHECKLIST (Final V2.1)

### Platform Seçimi
- [ ] Typography kritik mi? → **DALL-E 3** veya **Ideogram**
- [ ] Estetik/atmosfer öncelikli mi? → **Midjourney**
- [ ] Maksimum kontrol gerekli mi? → **Stable Diffusion**

### Prompt Yapısı
- [ ] Platform-uygun format kullanıldı mı?
- [ ] Referans bildirimi var mı?
- [ ] Işık stratejisi belirtildi mi?
- [ ] Negative prompt eklendi mi?

### Kalite Kontrol
- [ ] Ürün tarif edilmemiş, referansa yönlendirilmiş mi?
- [ ] Aspect ratio belirtildi mi?
- [ ] CRITICAL etiketleri eklendi mi? (typography varsa)

---

**Versiyon:** V2.1
**Güncelleme:** 2026-01-16
**Yeni:** Platform-Spesifik Formatlar, Universal Negative Prompts, Kopyala-Yapıştır Şablonlar
**Geçerlilik:** Tüm prompt dosyaları

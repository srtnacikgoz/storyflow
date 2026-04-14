# Poster Stil Analiz Şablonu

> Bu şablon, referans poster görseli analiz edilirken kullanılır.
> Claude Code bu formata göre analiz yapar, çıktı doğrudan admin panele yapıştırılır.
> Backend'deki forensik analiz prompt'uyla (posterSmartController.ts) aynı derinlikte çalışır.

---

## Çıktı Formatı (Admin Panele Yapıştırılacak)

Analiz tamamlandığında çıktı TAM OLARAK bu formatta verilir:

```
Açıklama: [1-2 cümle — bu stili benzersiz kılan şey, neyi değiştirirsen bozulur]

--- Stil Tarifi ---
[styleDirective içeriği — aşağıdaki kurallara göre]

--- DALL-E Prompt ---
[dallEPrompt içeriği — aşağıdaki kurallara göre]
```

Kullanıcı bu çıktıyı admin panelde "Yeni Stil Ekle" → "Analiz Yapıştır" alanına yapıştırır.
Parse sistemi `---` ayraclarını kullanarak alanları otomatik doldurur.
Sadece İsim (EN) ve İsim (TR) elle yazılır.

---

## styleDirective İçeriği — Zorunlu Bölümler

styleDirective TEK bir metin alanıdır. İçinde şu bölümler SATIRLAR HALİNDE yazılır.
Her bölüm etiketiyle başlar. Hiçbir bölüm atlanmaz.

### COLOR PALETTE (Renk Paleti)

**Format:** Her renk `rol: #HEX (N%)` — sonunda harmoni, sıcaklık, doygunluk, color grade.

**Kurallar:**
- Minimum 3, maksimum 6 renk
- Her rengin rolü spesifik olmalı: "dark café interior background" (sadece "background" değil)
- Yüzde toplamı 100'e yakın olmalı
- Sıcaklık: kesin Kelvin aralığı (2800-3200K, 5500K gibi)
- Color grade: film terminolojisi ile ("lifted blacks, warm amber push, slight orange cast in highlights")

**YASAK:** "warm colors", "nice palette", "earth tones" gibi belirsiz ifadeler. Her şey hex + yüzde + Kelvin.

**Örnek:**
```
Color Palette: dark green background: #3D5A3E (55%), white text: #FFFFFF (15%), product warm tones: #C8956A (12%), dark accent: #1A2E1A (10%), highlight cream: #F5F0E6 (8%) — harmoni: analogous green-earth; sıcaklık: 4500K neutral-cool; doygunluk: muted with selective warmth on product; grade: lifted shadows to #3D5A3E, warm midtones on food, cool undertone in background
```

### BACKGROUND (Arka Plan)

**Format:** Doku/yüzey tipi, gradient, grain, vignette, ton açıklaması.

**Kurallar:**
- Hex kodu YAZMAZ (Color Palette'e ait)
- Sadece yüzey/doku/efekt tarif eder
- Gradient varsa: yönü, geçiş tipi
- Texture overlay: none, subtle paper, linen, concrete, marble, halftone dots
- Vignette: none, very subtle, moderate, strong

**Örnek:**
```
Background: solid matte surface, no visible texture, no grain, no vignette, even flat tone across entire frame with subtle darkening at edges
```

### TYPOGRAPHY (Tipografi)

**Format:** Her metin seviyesi ayrı tarif edilir — sınıf, weight, case, spacing, renk, boyut (frame yüzdesi).

**Kurallar:**
- Font sınıfı: geometric sans-serif | humanist sans | grotesque | didone serif | slab serif | script | display | monospace
- Weight: thin(100) | light(300) | regular(400) | medium(500) | semibold(600) | bold(700) | black(900)
- Case: ALL-CAPS | Title Case | Sentence case | lowercase
- Spacing: very tight(-0.05em) | tight(-0.02em) | normal(0) | wide(0.08em) | very wide(0.2em+)
- Renk: kesin #HEX
- Boyut: frame yüzdesine göre ("%12 frame height")
- Stroke contrast: none(1:1) | low(1:2) | medium(1:3) | high(1:5) | extreme(1:8+ Didone)
- Hiyerarşi seviye sayısı

**Örnek:**
```
Typography: Headline: geometric sans-serif black(900) ALL-CAPS very tight(-0.05em) #FFFFFF, ~15% frame height, no stroke contrast. Subtitle: same family medium(500) Title Case normal(0) #FFFFFF, ~5% frame height. Body/price: same family regular(400) #FFFFFF, ~3% frame height. Hierarchy: 3 levels. Secondary text color matches background tone at 60% opacity.
```

### LAYOUT (Yerleşim — Element Bazlı)

**Bu bölüm en kritik bölümdür.** Posterdeki HER görsel elemanı tek tek tarif eder.

**Format:**
```
Canvas: [aspect ratio]. 
[eleman-id]: [zone] (x:[start]-[end]% y:[start]-[end]%), [ne olduğu], [boyut], [stil detayı]. → [ilişki]
...
Layers: [arkadan öne sıralama]
```

**Kurallar:**
- Canvas aspect ratio zorunlu (2:3 portrait, 1:1 square, 4:5 portrait, 3:2 landscape)
- HER eleman ayrı satır — hiçbiri atlanmaz
- Eleman tipleri: text | product | decorative | logo | human-element | prop | accent
- Konum: zone adı + x/y yüzde bounds (0-100)
- Boyut: frame yüzdesine göre ("%45 frame height", "%80 width")
- İlişkiler: `→` ile hangi elemanın yanında/üstünde/altında
- zIndex: katman sırası (1=en arka)
- Yazılar için: tam metin içeriği, font stili, renk, hizalama
- Layer sırası zorunlu

**Eleman listesi tamamlanma kontrolü:**
- [ ] Ana başlık (headline) var mı?
- [ ] Alt başlık (subtitle) varsa yazıldı mı?
- [ ] Ürün (hero-product) tarif edildi mi?
- [ ] Fiyat yazısı varsa eklendi mi?
- [ ] Logo/marka işareti varsa eklendi mi?
- [ ] Dekoratif elemanlar (el, aksesuar, prop) varsa eklendi mi?
- [ ] İkincil ürünler/tabaklar varsa eklendi mi?

**Örnek (Pot'Soup posteri):**
```
Layout: Canvas: 2:3 portrait.
headline: top-center (x:5-95% y:2-15%), "POT'SOUP" bold geometric sans-serif ALL-CAPS white, ~15% frame height, centered, dominant text element.
subtitle: top-center (x:20-80% y:15-20%), "SOUP BY ITSU" same font medium weight white, ~40% of headline size. → headline: directly below, same center axis.
product-name: left (x:5-35% y:35-50%), "THAI COCONUT VEGGIE" stacked 3 lines, left-aligned, white, ~4% frame height each line.
price: left (x:5-25% y:50-55%), "£4.49" white bold, ~3% frame height. → product-name: directly below.
calories: left (x:5-20% y:55-58%), "458CAL" white small, ~2% frame height. → price: directly below.
hero-product: center-right (x:25-90% y:35-80%), large bowl of soup with tofu, vegetables, herbs, fills ~45% frame height, shot from 30° above.
human-hand: top-right (x:45-75% y:0-40%), female hand with red nails entering from top edge, sprinkling seeds/spices downward, zIndex:3 (topmost). → hero-product: hand directly above bowl, sprinkling into it.
chopsticks: bottom-left (x:3-15% y:82-98%), pair of dark chopsticks at ~30° diagonal angle, subtle prop.
small-dish: bottom-center (x:40-55% y:88-98%), small dish with scattered seeds, secondary accent.
brand-logo: bottom-left (x:3-12% y:92-98%), "itsu" script logo, white, small.
japanese-text: bottom-right (x:70-95% y:90-97%), Japanese characters, white, small decorative text.
Layers: background color → hero-product → chopsticks + small-dish → text overlays (headline, subtitle, product-name, price) → human-hand (topmost)
```

### LIGHTING (Işık)

**Format:** pattern + quality, yön + derece, Kelvin, key-to-fill ratio, gölge tarifi, rim light.

**Kurallar:**
- Pattern: rembrandt | butterfly | split | loop | broad | flat | rim | backlit | natural-window | overhead | under-lit
- Quality: hard (sharp shadows) | soft (graduated) | diffused (shadowless) | specular (hot spots)
- Yön: kesin derece (top-left 45°, side-left 90°, overhead 0°)
- Kelvin: kesin değer veya aralık (2800-3200K, 5500K)
- Key-to-fill ratio: flat(1:1) | low-contrast(2:1) | medium(4:1) | dramatic(6:1) | chiaroscuro(8:1+)
- Gölge: yönü, sertliği, rengi
- Rim light: varsa renk ve yoğunluk

**YASAK:** "good lighting", "nice shadows", "well-lit" — her şey derece + Kelvin + ratio.

**Örnek:**
```
Lighting: natural-window soft diffused, top-left 45°, 5500K daylight neutral, 4:1 key-to-fill, soft graduated shadows falling to lower-right with slight warm cast, subtle cool rim light on bowl edge from ambient bounce, no harsh specular highlights
```

### OVERALL FEEL (Genel Atmosfer)

**Format:** 3-4 spesifik mood sıfatı, grain, depth, era, texture overlay.

**Kurallar:**
- Mood sıfatları: spesifik ve evocative (generic "beautiful" "nice" YASAK)
- Grain: none | subtle film grain | moderate | heavy analog grain
- Depth: flat (all in focus) | shallow DOF (background blur) | deep focus | tilt-shift
- Era: contemporary | retro (decade belirt) | vintage | timeless | futuristic
- Texture overlay: none | subtle paper | linen | concrete | marble | aged paper

**Örnek:**
```
Overall Feel: fresh energetic inviting urban-casual, no grain, flat depth (all elements in focus), contemporary style, no texture overlay, no vignette
```

---

## dallEPrompt — DALL-E Şablon Promptu

**Ayrı bölüm** — `--- DALL-E Prompt ---` ayracından sonra.

**Kurallar:**
- 150-250 kelime
- `{PRODUCT}` placeholder kullan (kullanıcı gerçek ürün adıyla değiştirecek)
- Ürünün görünüşünü tarif ETME (fotoğraf zaten yüklenecek)
- Sahne, ışık, tipografi, renk, layout — HER ŞEYİ tarif et
- "A professional product poster featuring {PRODUCT}" ile başla
- Metin içeriklerini çift tırnak içinde yaz: "CROISSANT", "£4.49"
- Font stili, rengi, konumu, boyutu belirt
- Tüm elemanların konumunu belirt
- Teknik: aspect ratio, lens, f-stop belirt

**Örnek:**
```
A professional product poster featuring {PRODUCT} placed in center-right position, filling approximately 45% of the 2:3 portrait frame. Background is solid matte dark green (#3D5A3E). A large bold geometric sans-serif headline "POT'SOUP" in ALL-CAPS white spans the top 15% of the frame, centered. Directly below, "SOUP BY ITSU" in medium weight white at 40% of headline size. Left side at 35-50% height: product name in white, left-aligned, stacked in 3 lines. Below that, price "£4.49" in white bold, then "458CAL" in smaller white text. A female hand with red nails enters from the top-right edge, sprinkling seeds downward onto the product bowl. Bottom-left: a pair of dark chopsticks at diagonal angle. Bottom-center: small dish with scattered seeds. Bottom-left corner: small "itsu" script logo in white. Bottom-right: small Japanese characters in white. Lighting is soft natural from top-left at 45 degrees, 5500K daylight, 4:1 key-to-fill ratio. Overall mood is fresh, energetic, and inviting. Contemporary flat style, no grain, no vignette.
```

---

## Analiz Süreci

1. Kullanıcı poster görseli paylaşır
2. Claude Code görseli analiz eder — HER elemanı tek tek saptar
3. Yukarıdaki kurallara göre styleDirective + dallEPrompt üretir
4. Çıktıyı `Açıklama: ... --- Stil Tarifi --- ... --- DALL-E Prompt --- ...` formatında verir
5. Kullanıcı admin panelde "Yeni Stil Ekle" → "Analiz Yapıştır" → yapıştırır → kaydet
6. API masrafı: sıfır

## YASAK Kelimeler (Analiz Çıktısında Asla Kullanılmaz)

- "warm colors", "nice lighting", "clean look", "modern font", "minimal design"
- "beautiful", "stunning", "elegant" (ölçü olmadan)
- "good composition", "well-balanced"
- Hex kodu olmadan renk tarifi
- Kelvin değeri olmadan ışık tarifi
- Yüzde olmadan boyut tarifi
- Derece olmadan yön tarifi

**Kural:** Her değer bir ölçü, oran, hex kodu veya Kelvin içermelidir.

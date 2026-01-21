# Prompt Yazarı Eğitim Dokümanı

> **Son Güncelleme:** 2026-01-21
> **Amaç:** Claude'un Gemini'ye yazdığı prompt'ların kalitesini artırmak
> **Felsefe:** "Gemini'ye ne yapmamasını değil, ne yapacağını o kadar net anlat ki başka seçenek kalmasın."

---

## İÇİNDEKİLER

**SİSTEM KURALLARI (Claude okur, uygular)**
- [Bölüm 1: Temel Felsefe](#bölüm-1-temel-felsefe)
- [Bölüm 2: Referans Sadakati](#bölüm-2-referans-sadakati)
- [Bölüm 3: Obje Limitasyonu](#bölüm-3-obje-limitasyonu)
- [Bölüm 4: Fiziksel Mantık Kuralları](#bölüm-4-fiziksel-mantık-kuralları)
- [Bölüm 5: Çeşitlilik Zorunluluğu](#bölüm-5-çeşitlilik-zorunluluğu)
- [Bölüm 6: Prompt Şablonu](#bölüm-6-prompt-şablonu)
- [Bölüm 7: Kalite Kontrol Soruları](#bölüm-7-kalite-kontrol-soruları)
- [Bölüm 8: Kötü vs İyi Prompt Karşılaştırması](#bölüm-8-kötü-vs-iyi-prompt-karşılaştırması)

**KULLANICI KATKI ALANLARI (Sen eklersin, Claude okur)**
- [Bölüm 9: Gözlem Günlüğü](#bölüm-9-gözlem-günlüğü)
- [Bölüm 10: İyi Prompt Örnekleri](#bölüm-10-iyi-prompt-örnekleri)
- [Bölüm 11: Kötü Prompt Örnekleri](#bölüm-11-kötü-prompt-örnekleri)
- [Bölüm 12: Kişisel Kurallarım](#bölüm-12-kişisel-kurallarım)

---

# SİSTEM KURALLARI

## Bölüm 1: Temel Felsefe

### Negatif Değil, Pozitif Yönlendirme

```
❌ Yanlış Yaklaşım:
"Do NOT add books, lamps, vases, or any decorative items"

✅ Doğru Yaklaşım:
"The scene contains EXACTLY these elements and nothing else:
1. One tiramisu on the grey ceramic plate from reference
2. One green ceramic cup with coffee
3. The wooden table surface from reference
4. Natural window light from the left
That's it. The frame is complete."
```

### Neden Bu Önemli?

- "Pembe fil düşünme" dediğinde insan pembe fil düşünür
- AI'lara "yapma" demek, o şeyi akıllarına getirir
- Bunun yerine: tam ve eksiksiz bir sahne tarifi yap, AI'ın ekleyeceği bir şey kalmasın

---

## Bölüm 2: Referans Sadakati

### Orijinal Fotoğraftaki Her Detay Korunmalı

| Element | Kural | Örnek Açıklama |
|---------|-------|----------------|
| **Arka plan** | Orijinal fotoğrafta ne varsa O | "The background shows the cafe interior with the glass window exactly as in reference image 2" |
| **Zemin/Masa** | Referanstaki malzeme ve renk | "Wooden table with natural grain pattern matching reference" |
| **Işık yönü** | Orijinaldeki gölge yönü | "Soft daylight entering from the left side, casting gentle shadows to the right" |
| **Perspektif** | Aynı açı | "45-degree overhead angle consistent with reference" |

### Prompt'a Eklenecek Blok

```
SCENE FIDELITY REQUIREMENT:
This image must look like it was taken at the SAME location as reference image 2.
- Same flooring visible in background (wooden parquet / marble / etc.)
- Same window position and light direction
- Same ambient lighting color temperature
- Same depth of field characteristics
```

### Kritik Kural: Cam Önü = Cam Görünmeli

Eğer orijinal fotoğraf cam önünde çekildiyse:
- Arka planda CAM ve DIŞ MANZARA görünmeli
- Parke zemin arka planda GÖRÜNMEMELI
- Bu tutarsızlık KABUL EDİLEMEZ

---

## Bölüm 3: Obje Limitasyonu

### Sahnede SADECE Belirtilenler Bulunabilir

```
COMPLETE OBJECT LIST (nothing else exists in this scene):
1. [PRODUCT] - One tiramisu portion in glass container
2. [PLATE] - One grey ceramic plate (from reference)
3. [CUP] - One ceramic coffee cup (specify color: beige/white/blue - NOT green)
4. [SURFACE] - Wooden table
5. [BACKGROUND] - Cafe interior with window

THERE ARE NO OTHER OBJECTS IN THIS SCENE.
No books. No plants. No candles. No decorations. No magazines.
The table is intentionally minimal - this is the Sade aesthetic.
```

### Atmosfer Nasıl Sağlanır?

```
ATMOSPHERE (achieved through LIGHT AND COLOR, not objects):

Warm, cozy feeling is created by:
✅ Golden hour light temperature (3200K warm)
✅ Soft diffused shadows
✅ Slightly overexposed window (natural bloom effect)
✅ Warm color grading

NOT created by:
❌ Adding candles
❌ Adding books or magazines
❌ Adding plants or flowers
❌ Adding decorative items
```

---

## Bölüm 4: Fiziksel Mantık Kuralları

### Gerçek Dünyada İmkansız = Görselde de İmkansız

| İmkansız Durum | Neden | Doğru Alternatif |
|----------------|-------|------------------|
| Pasta tabağı üstünde fincan | Yerçekimi, denge yok | Fincan masada, tabağın YANINDA |
| Üst üste dizilmiş tabaklar | Müşteri masasında olmaz | Tek tabak, üzerinde ürün |
| Havada asılı objeler | Fizik kuralları | Masaya temas eden objeler |
| İç içe geçmiş objeler | Katı cisim kuralı | Net ayrılmış pozisyonlar |

### Prompt'a Eklenecek Blok

```
PHYSICAL REALITY CHECK:
- Cup sits ON the table surface, not on the plate
- All objects obey gravity and rest on stable surfaces
- Objects do not overlap or intersect unnaturally
- Shadows fall consistently with the single light source direction
- This should look like a real photograph, not a 3D render
```

---

## Bölüm 5: Çeşitlilik Zorunluluğu

### Her Paylaşım Farklı Hissetmeli

```
VARIATION REQUIREMENTS FOR THIS SHOT:

Today's unique elements (MUST be different from last 5 posts):
- Cup: Use [SPECIFIC COLOR] ceramic cup
  (NOT green - green was used in last 3 posts)
- Plate: Use [SPECIFIC TYPE]
  (NOT grey ceramic - was in yesterday's post)
- Angle: [SPECIFIC ANGLE]
  (previous was 45°, use overhead or eye-level)
- Composition: [SPECIFIC LAYOUT]
  (previous had product on right, place on left)

BANNED FOR THIS SHOT (recently overused):
- Green mug (used 4 times this week)
- Grey ceramic plate (used yesterday)
- Tiramisu (featured 2 days ago - if possible use different product)
```

### Fincan Çeşitliliği Kuralı

- Aynı fincan 2 günden fazla arka arkaya kullanılmamalı
- Her hafta en az 3 farklı fincan kullanılmalı
- Fincan rengi ve malzemesi MUTLAKA prompt'ta belirtilmeli

---

## Bölüm 6: Prompt Şablonu

### Standart Yapı

```
=== SCENE CONSTRUCTION GUIDE ===

REFERENCE IMAGES:
- Image 1: Product ([ürün açıklaması])
- Image 2: Environment ([mekan açıklaması])

EXACT RECREATION TARGET:
Create a photograph that looks like it was taken at the SAME location
as reference image 2, featuring the product from Image 1.

MANDATORY ELEMENTS (in order of visual importance):
1. PRODUCT: [Ürün] from Image 1, [pozisyon], sharp focus
2. CONTAINER/PLATE: [Kap/tabak] exactly as shown in reference
3. CUP (if applicable): [Renk + malzeme] ceramic cup with [içecek]
4. SURFACE: [Yüzey tipi] matching Image 2
5. BACKGROUND: [Arka plan detayı], slightly blurred (f/2.8)
6. LIGHTING: [Işık kaynağı ve yönü]

COMPLETE OBJECT INVENTORY:
☐ [Obje 1]
☐ [Obje 2]
☐ [Obje 3]
[END OF LIST - NO OTHER OBJECTS EXIST IN THIS SCENE]

PHYSICAL CONSTRAINTS:
- All objects rest on stable surfaces
- Light source is [yön], shadows fall [yön]
- Background is [mesafe] away, naturally blurred

ATMOSPHERE (through light, not objects):
[Mood açıklaması] achieved through:
- [Işık özelliği 1]
- [Işık özelliği 2]
- [Renk sıcaklığı]

WHAT SUCCESS LOOKS LIKE:
A real photograph someone took at Sade Patisserie,
simple and elegant, featuring only the listed objects,
with the authentic cafe atmosphere visible in the soft background.
```

---

## Bölüm 7: Kalite Kontrol Soruları

### Prompt Göndermeden Önce Kontrol Listesi

1. **Referans sadakati:** Arka plan orijinalle aynı mı tarif edilmiş?
2. **Obje sayımı:** Sahnede kaç obje var? Her biri gerekli mi? Fazlası var mı?
3. **Obje spesifikliği:** Her objenin rengi, malzemesi belirtilmiş mi?
4. **Fiziksel mantık:** Objeler gerçekçi pozisyonlarda mı?
5. **Çeşitlilik:** Son 5 paylaşımdan farklı mı?
6. **Minimal estetik:** Sade markası gibi görünecek mi?
7. **Atmosfer kaynağı:** Mood objelerle mi yoksa ışıkla mı sağlanıyor?

---

## Bölüm 8: Kötü vs İyi Prompt Karşılaştırması

### ❌ KÖTÜ PROMPT

```
Create a cozy cafe scene with tiramisu. Add warm lighting,
some books, a plant, and a nice coffee cup.
Make it feel inviting and homey.
```

**Sorunlar:**
- "some books, a plant" → istenmeyen objeler eklenecek
- "a nice coffee cup" → hangi fincan? renk? malzeme? belirsiz
- "cozy" → AI bunu kitap, mum, bitki ekleyerek çözmeye çalışır
- Obje listesi yok → AI kendi karar verir
- Referans yok → AI hayal eder

### ✅ İYİ PROMPT

```
SCENE RECREATION from reference images.

Image 1 contains: Tiramisu in glass container
Image 2 contains: Cafe interior (wooden table, window with daylight,
                  parquet floor visible in background)

RECREATE this exact scene:
- The tiramisu from Image 1 sits centered on the wooden table from Image 2
- Daylight enters from the window on the left side
- The parquet floor is visible in the soft background
- A beige ceramic cup with latte sits to the right of the tiramisu

COMPLETE OBJECT LIST:
1. Tiramisu in glass container ✓
2. Wooden table surface ✓
3. Beige ceramic cup with latte ✓
4. Background: window + parquet floor ✓
[SCENE COMPLETE - these are the ONLY objects]

PHYSICAL REALITY:
- Cup and tiramisu both rest on table surface
- Light from left, shadows fall to right
- Cup is BESIDE the tiramisu, not on top of anything

Warm cafe atmosphere achieved through:
- Warm daylight color temperature (golden hour feel)
- Soft diffused shadows from window light
- Slight overexposure on window (natural bloom)
NOT through candles, books, plants, or decorations.
```

---

# KULLANICI KATKI ALANLARI

> **Not:** Aşağıdaki bölümler senin deneyimlerini ve gözlemlerini yazman için.
> Claude her oturumda bu bölümleri okuyacak ve dikkate alacak.

---

## Bölüm 9: Gözlem Günlüğü

Kendi gözlemlerini, öğrendiklerini ve notlarını buraya ekle.

---

### [2026-01-21] Yeşil Fincan Tekrarı
**Gözlem:** Gemini sürekli aynı yeşil fincanı kullanıyor (son 4 paylaşımda)
**Neden oldu:** Prompt'ta spesifik fincan rengi/malzemesi belirtilmedi
**Çözüm:** Her prompt'ta fincan rengini ve malzemesini AÇIKÇA belirt
**Örnek:** "beige ceramic cup" veya "white porcelain cup" gibi

---

### [2026-01-21] Arka Plan Tutarsızlığı
**Gözlem:** Cam önü masa olması gereken sahnede arka planda parke zemin görünüyor
**Neden oldu:** Referans fotoğraftaki arka plan detayları prompt'a aktarılmadı
**Çözüm:** "Background shows glass window with outdoor view" gibi spesifik ifadeler kullan
**Örnek:** Referans Image 2'deki arka planı detaylı tarif et

---

### [2026-01-21] İstenmeyen Objeler (Kitap)
**Gözlem:** Sahnede olmayan kitap eklendi
**Neden oldu:** "cozy atmosphere" istendi ama nasıl sağlanacağı belirtilmedi
**Çözüm:** Atmosferin IŞIKLA sağlanacağını açıkça belirt, obje listesini kapat
**Örnek:** "Atmosphere through warm lighting ONLY, no decorative objects"

---

### [YYYY-MM-DD] Başlık
**Gözlem:** ...
**Neden oldu:** ...
**Çözüm:** ...
**Örnek:** ...

---

## Bölüm 10: İyi Prompt Örnekleri

Başarılı sonuç veren prompt'ları buraya ekle. Referans olarak kullanılacak.

---

### Örnek #1: [Başlık]
**Tarih:** YYYY-MM-DD
**Senaryo:** ...
**Sonuç:** ✅ Başarılı

**Prompt:**
```
[Çalışan prompt'u buraya yapıştır]
```

**Neden Çalıştı:**
- ...
- ...

---

## Bölüm 11: Kötü Prompt Örnekleri

Kötü sonuç veren prompt'ları buraya ekle. Aynı hataları tekrarlamamak için.

---

### Örnek #1: Kitaplı Sahne
**Tarih:** 2026-01-21
**Senaryo:** Kahve Köşesi
**Sonuç:** ❌ Kitap ve istenmeyen dekorasyon ekledi

**Prompt:**
```
[Sorunlu prompt varsa buraya]
```

**Neden Başarısız:**
- "cozy atmosphere" dendi ama nasıl sağlanacağı belirtilmedi
- Gemini "cozy" için kitap ekledi
- Obje listesi kapalı değildi

---

### Örnek #2: [Başlık]
**Tarih:** YYYY-MM-DD
**Senaryo:** ...
**Sonuç:** ❌ ...

**Prompt:**
```
[Sorunlu prompt]
```

**Neden Başarısız:**
- ...

---

## Bölüm 12: Kişisel Kurallarım

Deneyimlerinle öğrendiğin, Claude'un bilmesini istediğin kurallar.

---

### Kural: Cam Önü Masa Tutarlılığı
Cam önünde çekilmiş ürün fotoğrafında arka planda CAM ve DIŞ MANZARA görünmeli.
Parke zemin arka planda görünmemeli. Bu tutarsızlık kabul edilemez.

---

### Kural: Fincan Rotasyonu
Aynı fincan 2 günden fazla arka arkaya kullanılmamalı.
Her hafta en az 3 farklı fincan kullanılmalı.
Fincan rengi prompt'ta MUTLAKA belirtilmeli.

---

### Kural: Pasta Tabağı Üstünde Fincan YASAK
Hiçbir durumda pasta/tatlı tabağının üstüne fincan konmaz.
Fincan her zaman masada, ürünün YANINDA olmalı.

---

### Kural: [Başlık]
[Açıklama]

---

## Versiyon Geçmişi

| Versiyon | Tarih | Değişiklik |
|----------|-------|------------|
| 1.0 | 2026-01-21 | İlk versiyon oluşturuldu |

# Gemini Prompt Engineering Insights

> **Tarih:** 2026-01-24
> **Kaynak:** Gemini ile yapılan kapsamlı soru-cevap oturumu
> **Amaç:** Prompt overengineering sorununu çözmek için referans döküman

---

## Özet: Kritik Çıkarımlar

### 1. Tekrar Etkisi
- Talimat tekrarı doğruluğu %21'den %97'ye çıkarabilir
- **AMA** sadece stratejik konumlarda (başta ve sonda)
- Ortaya "gömülen" tekrarlar etkisiz

### 2. Büyük Harf Kullanımı
- "MUST", "EXACT" gibi vurgular öncelik yükseltme sinyali
- Modelin sistem yönergeleri ile çakışmada sizin komutunuza öncelik tanımasını sağlar

### 3. Pozitif vs Negatif Dil
- **"Bıçak ekleme" DEĞİL → "Sadece çatal ekle"**
- AI olumsuzlama kavramını işlemekte zorlanır
- Negatif kısıtlamalar ayrı `--no` parametresinde olmalı

### 4. İdeal Prompt Uzunluğu
- **Tatlı nokta: 75-150 kelime**
- 600 kelime = dikkat dağılması
- Her kelime işlevsel olmalı (nesne, renk, ışık bilgisi)

### 5. Prompt Yerleşimi (Serial Position Effect)
- **BAŞLANGIÇ:** Temel komut, ne üretileceği
- **ORTA:** Detaylar (en az önemli)
- **SON:** En kritik kısıtlamalar (`--no` parametresi)

---

## Grup 1: Prompt Yapısı ve Etkinlik

### Talimat Tekrarı
- Basit tekrar doğruluğu %21 → %97 çıkarabilir
- Stratejik konumlandırma: Başta VE sonda
- Ortaya gömülen talimatlar etkisiz (Lost in the Middle)

### Büyük Harfli Vurgular
- "MUST", "NEVER" = öncelik yükseltme sinyali
- Hiyerarşi belirleme: Sizin komutunuz > sistem yönergeleri
- "Basit tercih" → "tartışılamaz kural" seviyesine taşır

### Pozitif vs Korku Dili
- AI "olumsuzlama" (negation) kavramını işlemekte zorlanır
- **"Bıçak ekleme" yerine → "Sadece çatal ekle"**
- Negatif prompt ayrı alan, ana prompt olumlu tanımlamalar
- Çok sert kısıtlamalar yaratıcılığı düşürür

---

## Grup 2: Referans Görsel Kullanımı

### Multi-Image Interpretation
- Gemini görselleri "birleşik asset havuzu" olarak yorumlar
- Rol atanmazsa "attention drift" yaşanır
- **Asset Tagging KRİTİK:** `[1]`, `[2]` notasyonu kullan
- Örnek: "Use the product from [1] on the plate from [2]"

### Minimum Etkili Talimat (Renk/Malzeme Koruma)
```
1. Reference ID: "Using [1] as the core subject."
2. No Modification: "Keep the original [material/color] intact."
3. Numerical Precision: "Maintain 100% resemblance."
```

### Referansta Olmayan Obje Ekleme (Köpek Sorunu)
- "Anchor + Add" stratejisi:
  1. **Anchor:** "Compose a scene using [1], [2], and [3]."
  2. **Add:** "Place a blurred dog in the background."
  3. **Priority:** "Maintain character consistency for [1]..."

---

## Grup 3: Negative Prompt Stratejisi

### Liste Uzunluğu
- 25+ item = dikkat dağılması (attention dilution)
- Her ögeye ayrılan dikkat ağırlığı azalır
- **Ters etki riski:** Uzun listeler tetikleme yapabilir
- **İdeal sayı: 5-10 kritik öge**

### "Sadece Referans" Varken Listeleme
- Hala güvenlik katmanı sağlar
- Halüsinasyon kontrolü için gerekli
- AMA 20 yerine **3-4 en kritik öge** yeterli

### En Etkili Format
- **EN ETKİLİ:** `--no item1, item2, item3`
- Daha az etkili: `AVOID: ...` veya `Do not include: ...`
- `--no` doğrudan "çıkarma" sinyali gönderir
- Prompt'un EN SONUNA eklenmeli

---

## Grup 4: Token Ekonomisi

### Uzunluk vs Kalite
- **"Daha uzun = daha iyi" DEĞİL**
- 600 kelime → dikkat dağılması, çelişkili çıktılar
- 80 kelime net prompt > 600 kelime tekrarlı prompt
- Uzunluk sadece **spesifik teknik detaylar** için değerli

### En Etkili Bölge
- **BAŞLANGIÇ (Primacy):** Sahne kurulumu, temel stil
- **SON (Recency):** Kritik kısıtlamalar, teknik format
- **ORTA:** Detaylar (model gözden kaçırabilir)

### İdeal Uzunluk
- **Tatlı nokta: 75-150 kelime**
- Yapısal dağılım:
  - Subject (Özne): 10-20 kelime
  - Environment (Ortam): 20-30 kelime
  - Style & Camera: 15-20 kelime
  - Final Constraints: 10-20 kelime

---

## Grup 5: Kompozisyon ve Yaratıcılık

### Food Photography Altın Standart
```
Subject: A close-up shot of a freshly baked, flaky golden croissant
on a minimalist ceramic plate.
Atmosphere: Natural morning sunlight from a side window, soft shadows,
warm tones.
Technical: Macro photography, 85mm f/2.8 lens, shallow depth of field,
sharp focus on the pastry layers.
Details: Micro-crumbs on the plate, steam rising gently, hyper-realistic
8K textures.
```

### Kontrol vs Esneklik
- Her detayı kontrol = yapay, donuk görsel
- **Hibrit yaklaşım:**
  - Ürün: %100 kontrol (EXACT subject)
  - Çevre/dekor: %20-30 esneklik
- AI'nın estetik uyum bilgisini kullanmasına izin ver

### Direktif vs Atmosfer
- **Atmosfer tanımı daha etkili:** "Cozy morning scene with coffee"
- Direktif ("X'i sağa koy") sadece gerektiğinde
- **En iyi: Bağlamsal Direktif**
  - Kötü: "Kupa masanın solunda olsun."
  - İyi: "The coffee mug sits naturally to the left of the plate,
    partially out of focus, enhancing the breakfast mood."

---

## Grup 6: Spesifik Sorunlarımız

### Çatal vs Bıçak Karışıklığı
- AI "sofra takımı"nı bütün olarak öğrenir
- **İzolasyon stratejisi:** "A single metal fork, no other utensils"
- **Görsel çapa:** "The fork from reference [1]"
- **Negatif:** `--no knife, spoon, multiple utensils`

### Hayvan/Yüz Sadakati
- **Fidelity komutu:** "Maintain 100% subject likeness and anatomical
  features of the dog from [Reference Image]"
- **Ayırt edici özellikler:** "The specific white patch on the left eye..."
- **Terim:** "photorealistic character consistency"

### Üst Üste Tabak Sorunu
- **Tekillik vurgusu:** "A single, isolated plate on the table"
- Çoğul kelimelerden kaçın ("plates" değil "plate")
- **Negatif:** `--no stacked plates, piled dishes, multiple plates`
- **Boşluk tanımlama:** "Empty table surface around the single plate"

---

## Grup 7: Yeni Prompt Şablonu

### Karşılaştırma Sonucu

| Kriter | Mevcut | Önerilen |
|--------|--------|----------|
| Odak | %70 negatif/korku | %100 hedefe odaklı |
| Kelime | 600+ | 80-100 |
| Dikkat | Dağınık | Yoğun |
| Sonuç | Yapay, donuk | Doğal, canlı |

### Sade Patisserie İdeal Şablonu

```
PROMPT:
Context: A professional lifestyle Instagram photo (9:16).
Composition: Compose a scene using [REFERENCE 1] as the main product.
Place it naturally on [REFERENCE 2] (table/plate). Include [REFERENCE 3]
(cup/napkin) in the frame.
Atmosphere: Warm morning sunlight, soft side-lighting, f/2.0 shallow
depth of field, photorealistic 8K quality.
Constraint: Maintain 100% material and color fidelity for all references.
No extra props.

NEGATIVE PROMPT:
--no paper cups, plastic, extra decorations, text, multiple utensils,
harsh shadows.
```

### Şablon Açıklaması
1. **Tagging:** `[REFERENCE X]` → Model hangi görseli nerede kullanacağını bilir
2. **Context:** 9:16 + Instagram → Kadraj doğru kurulur
3. **Teknik:** `f/2.0`, `shallow depth of field` → Profesyonel food photo
4. **Temiz filtreleme:** `--no` en sonda, teknik formatta

---

## Uygulama Rehberi

### Yapılması Gerekenler (DO)
- [x] Referansları numaralandır: `[1]`, `[2]`, `[3]`
- [x] 75-150 kelime arasında tut
- [x] Kritik komutu başta VE sonda tekrarla
- [x] Pozitif dil kullan: "Sadece X" not "Y ekleme"
- [x] `--no` formatını en sonda kullan
- [x] Teknik terimler: f/2.0, 85mm, 8K, photorealistic

### Yapılmaması Gerekenler (DON'T)
- [ ] 25+ item negatif liste
- [ ] Aynı şeyi 4 farklı yerde söylemek
- [ ] "High Fidelity Mode (80%)" gibi uydurma parametreler
- [ ] Ortaya kritik talimat gömmek
- [ ] Korku dili: "ASLA", "KESİNLİKLE YAPMA" (aşırı kullanım)

---

## Versiyon Geçmişi

| Versiyon | Tarih | Değişiklik |
|----------|-------|------------|
| 1.0 | 2026-01-24 | İlk versiyon - Gemini Q&A oturumundan |

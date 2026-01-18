# Gemini Prompts Index

> **Sade Patisserie - Instagram Görsel Üretim Kılavuzu**
> **Model:** Gemini Pro
> **Varsayılan Format:** 9:16 Stories

---

## Prompt Kategorileri

### Ürün Bazlı Promptlar (Stüdyo Stili)

| Ürün | Dosya | Kullanım |
|------|-------|----------|
| Kruvasan | [croissant-prompts.md](./croissant-prompts.md) | Sabah paylaşımları, kahvaltı teması |
| Pasta | [pasta-prompts.md](./pasta-prompts.md) | Özel günler, yeni ürün tanıtımı |
| Çikolata | [chocolate-prompts.md](./chocolate-prompts.md) | Grid flat lay, hediye kutusu |
| Macaron | [macaron-prompts.md](./macaron-prompts.md) | Renk temalı, rainbow grid |
| Kahve | [coffee-prompts.md](./coffee-prompts.md) | Latte art, lifestyle pairing |

### Lifestyle Senaryolar (Gerçekçi Stili)

| Kategori | Dosya | Senaryo Sayısı |
|----------|-------|----------------|
| Tüm Senaryolar | [lifestyle-scenarios/](./lifestyle-scenarios/index.md) | 10+ senaryo |

**Lifestyle Senaryolar:** Gerçek dünya hissi veren, yaşam tarzı odaklı içerikler. Zarif kadın elleri, mekan atmosferi, otantik anlar.

---

## Temel Kurallar (v2)

```
1. Image-to-image zorunlu - "Using uploaded image as reference..."
2. Ürün tarifi yasak - AI referanstan öğrenir
3. İnsan eli İZİNLİ - Güzel kadın eli, bakımlı tırnaklar, aksesuarlar
4. Steam/smoke yok - Yapay görünüm yaratır
5. Varsayılan format: 9:16 Stories (aksini belirtmezsen bu geçerli)
6. Off-white backdrop - RGB(250,248,245) stüdyo çekimleri için
```

---

## Dosya Detayları

### croissant-prompts.md
**Kruvasan & Viennoiserie**

| İçerik | Açıklama |
|--------|----------|
| 3 Stil | Modern, Rustic, Social |
| 4 Kompozisyon | Hero, Cross-Section, Pattern, Lifestyle |
| Özel | İç yapı gösterimi, tekrarlayan desen |
| Format | Feed 4:5, Stories 9:16, Grid 1:1 |

**En çok kullanılan:**
- Sabah story → SOCIAL + 9:16
- İç yapı showcase → Cross-Section + 4:5

---

### pasta-prompts.md
**Pasta, Tart, Cheesecake, Mousse**

| İçerik | Açıklama |
|--------|----------|
| 3 Stil | Modern, Rustic, Social |
| 5 Kompozisyon | Whole Cake, Slice, Cross-Section, Mini Grid, Pairing |
| Türler | Cheesecake, Meyveli Tart, Layer Cake, Mousse/Entremet |
| Özel | Katman vurgusu, türe göre ışık stratejisi |

**En çok kullanılan:**
- Yeni ürün → Slice Reveal + 4:5
- Mini pasta grid → Flat lay + 1:1

---

### chocolate-prompts.md
**Bonbon, Pralin, Truffle, Kutu**

| İçerik | Açıklama |
|--------|----------|
| 3 Stil | Modern, Rustic, Social |
| 5 Kompozisyon | Single Hero, Grid, Box, Break, Ingredient Story |
| Türler | Glossy, Mat Truffle, Beyaz, Bitter, Dolgulu |
| Özel | Typography koruması (kutu), grid flat lay |

**En çok kullanılan:**
- Koleksiyon tanıtım → Grid Flat Lay + 1:1 ⭐ (Sade imza içerik)
- Hediye kutusu → Box Presentation + Typography CRITICAL

---

### macaron-prompts.md
**French Macaron**

| İçerik | Açıklama |
|--------|----------|
| 3 Stil | Modern, Rustic, Social |
| 6 Kompozisyon | Single, Stack, Rainbow, Box, Filling, Scattered |
| Renk Temaları | Pastel, Vibrant, Monochrome |
| Özel | Renk doğruluğu kritik, feet görünümü |

**En çok kullanılan:**
- Rainbow grid → Gradient + 1:1
- Yeni lezzet → Single Hero + 4:5

---

### coffee-prompts.md
**Latte, Espresso, Cappuccino, Iced**

| İçerik | Açıklama |
|--------|----------|
| 3 Stil | Modern, Rustic, Social |
| 6 Kompozisyon | Latte Art, Espresso, Iced, Pairing, Pour Over, Flight |
| Türler | Latte, Cappuccino, Espresso, Cold Brew, Turkish |
| Özel | **STEAM YASAK**, Latte art koruması, POV istisna |

**En çok kullanılan:**
- Latte art showcase → Overhead + 1:1
- Kahve + pastry → Pairing + 4:5

⚠️ **KRİTİK:** Kahve promptlarında steam/smoke kesinlikle yasak!

---

## Platform Format Rehberi

| Platform | Ratio | Pixels | Kullanım |
|----------|-------|--------|----------|
| Feed | 4:5 | 1080x1350 | Ana paylaşımlar |
| Stories | 9:16 | 1080x1920 | Günlük hikayeler |
| Grid | 1:1 | 1080x1080 | Profil düzeni |
| Reels Cover | 9:16 | 1080x1920 | Video kapağı |

---

## Stil Seçim Rehberi (Genişletilmiş)

### Stüdyo Stilleri (Ürün Bazlı)

| Stil | Açıklama | Ne Zaman? |
|------|----------|-----------|
| **Modern/Clean** | Beyaz/off-white arka plan, minimal | Yeni ürün tanıtımı |
| **Rustic/Artisanal** | Ahşap, taş, doğal dokular | Craft/el yapımı vurgusu |
| **Flat Lay/Grid** | Üstten çekim, düzenli dizilim | Koleksiyon, çeşitlilik |
| **Dramatic/Moody** | Koyu tonlar, kontrast | Premium/bitter çikolata |
| **Minimal Luxury** | Mermer, altın detaylar | High-end sunum |

### Lifestyle Stilleri (Senaryo Bazlı)

| Stil | Açıklama | Ne Zaman? |
|------|----------|-----------|
| **Hands-on** | Zarif kadın elleri ile | Kişisel bağ kurma |
| **Window Light** | Pencere önü, doğal ışık | Atmosferik, sabah |
| **Café Scene** | Kafe ortamı, paylaşım | Sosyal, davetkar |
| **On-the-go** | Takeaway, urban | Hareketli yaşam |
| **Cozy Corner** | Rahat köşe, kitap/kahve | Huzur, self-care |
| **Wabi-Sabi** | Yarım yenmiş, kırıntılar | Otantik, gerçek |

### Mevsimsel Stiller

| Mevsim | Tonlar | Mood |
|--------|--------|------|
| **Bahar** | Pastel, taze yeşil | Tazelik, yenilenme |
| **Yaz** | Canlı, parlak | Enerji, serinlik |
| **Sonbahar** | Turuncu, kahve, altın | Sıcaklık, konfor |
| **Kış** | Kırmızı, yeşil, gold | Şenlik, kutlama |

---

## Mevsimsel Tema Rehberi

| Mevsim | Renkler | Mood | Props |
|--------|---------|------|-------|
| **Bahar** | Pastel pembe, mint, lavanta | Fresh, light | Çiçek yaprakları |
| **Yaz** | Canlı meyve renkleri | Energetic, cool | Buz, limon |
| **Sonbahar** | Turuncu, kahve, altın | Cozy, warm | Tarçın, yaprak |
| **Kış** | Kırmızı, yeşil, gold | Festive, elegant | Minimal sparkle |

---

## Hızlı Prompt Şablonu

```
Using uploaded image as reference for [ÜRÜN].

A delicious, high-end professional photo of [ÜRÜN] from reference.
[KOMPOZİSYON DETAYI].

Professional food photography, [STİL ANAHTAR KELİMELER],
[IŞIK], [ATMOSFER], 4k resolution.

Aspect ratio: [ORAN].

--no [NEGATİF LİSTE]
```

---

## Checklist (Her Prompt İçin)

- [ ] `Using uploaded image as reference` ile başlıyor mu?
- [ ] Ürün tarif edilmemiş, referansa yönlendirilmiş mi?
- [ ] Aspect ratio belirtilmiş mi?
- [ ] Işık stratejisi uygun mu?
- [ ] Steam/smoke yasaklanmış mı?
- [ ] Human elements yasaklanmış mı?
- [ ] Ürüne özel negative prompt var mı?

---

## Format Rehberi

| Format | Oran | Kullanım | Varsayılan? |
|--------|------|----------|-------------|
| **Stories** | 9:16 | Günlük hikayeler, anlık içerik | ✅ EVET |
| Feed | 4:5 | Ana paylaşımlar | İstenirse |
| Grid | 1:1 | Profil düzeni | İstenirse |
| Reels Cover | 9:16 | Video kapağı | Stories ile aynı |

**Not:** Format belirtilmezse 9:16 Stories varsayılan olarak uygulanır.

---

## Dosya Yapısı

```
gemini-prompts/
├── index.md                      ← Bu dosya (ana rehber)
│
├── [Ürün Bazlı Promptlar]
│   ├── croissant-prompts.md      ← Kruvasan
│   ├── pasta-prompts.md          ← Pasta türleri
│   ├── chocolate-prompts.md      ← Çikolata
│   ├── macaron-prompts.md        ← Macaron
│   └── coffee-prompts.md         ← Kahve
│
└── lifestyle-scenarios/          ← Gerçekçi senaryolar
    └── index.md                  ← 10+ senaryo (el, mekan, anlar)
```

---

## Versiyon Bilgisi

| Bilgi | Değer |
|-------|-------|
| Versiyon | 2.0 |
| Oluşturma | 2026-01-18 |
| Güncelleme | 2026-01-18 (v2 kuralları) |
| Toplam Dosya | 7 (index + 5 ürün + lifestyle klasörü) |
| Model | Gemini Pro |
| Marka | Sade Patisserie |

### v2 Değişiklikler
- ✅ Varsayılan format: 9:16 Stories
- ✅ İnsan eli: İZİNLİ (güzel kadın eli, aksesuarlar)
- ✅ Stiller: Genişletilmiş (3'ten 10+ stile)
- ✅ Yeni kategori: lifestyle-scenarios/
- ✅ Imagen referansları kaldırıldı

---

## Araştırma Kaynakları

Bu promptlar aşağıdaki kaynaklardan derlenen bilgilerle oluşturuldu:

- **GitHub:** pauhu/gemini-image-prompting-handbook
- **GitHub:** skaiy/GourmetLens-AI
- **Instagram:** @sade.patisserie (marka analizi)
- **Instagram:** @tattebakery (karşılaştırma referansı)
- **Dahili:** KURALLAR.md (proje standartları)

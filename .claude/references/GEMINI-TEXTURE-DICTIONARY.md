# Gemini 3 Pro Image - Doku ve Kalite Terimleri Sözlüğü

> **Kaynak:** Gemini 3 Pro Image (Nano Banana Pro) model yanıtları
> **Tarih:** 2026-02-03
> **Amaç:** Prompt kalitesini artırmak için doğrulanmış terimler

---

## Temel Prensipler

### 1. Gemini 3 = Muhakeme Modeli

Gemini 3 Pro Image, diffusion modellerinden farklı olarak bir **muhakeme (reasoning) modelidir**. Bu demektir ki:

- Etiket listesi değil, **mantıklı cümleler** bekler
- Fizik ve optik terimlerini **harfiyen işler**
- "Nasıl parlak?" sorusuna cevap vermek gerekir

### 2. Işık Olmadan Doku Olmaz

> **Kritik:** Dünyanın en iyi doku terimlerini de yazsan, ışığı doğru tarif etmezsen model o dokuyu gösteremez. Doku, ışığın yüzeyle dansıdır.

---

## İşe Yaramayan Terimler (Prompt Pollution)

| Terim | Neden İşe Yaramaz |
|-------|-------------------|
| `8K`, `4K`, `ultra HD` | Fiziksel çözünürlüğü değiştirmez, sadece "estetik işaretçi" |
| `hyper-realistic` | Ters tepebilir, over-processing yapabilir |
| `photorealistic` | Model zaten "a photo of" deyince gerçekçi üretir |
| `extremely detailed` | Çok genel, model ne detayı bilmiyor |
| `best quality` | Anlamsız, her zaman en iyisini yapmaya çalışıyor |
| `cinematic lighting` | Çok belirsiz, hangi sinema? |

---

## İşe Yarayan Terimler

### Genel Kalite Terimleri

| Kategori | Etkili Terimler |
|----------|-----------------|
| **Fotoğraf Stili** | `Professional lifestyle photography`, `Editorial food photography` |
| **Optik** | `macro lens`, `shallow depth of field (f/1.8)`, `sharp focus on the foreground` |
| **Doku Genel** | `intricate textures`, `glistening surfaces`, `crispy edges` |
| **Işık Genel** | `rim lighting`, `soft diffused window light`, `golden hour`, `side lighting` |

---

## Çikolata Terimleri

### Parlaklık ve Temper

| Doku Tipi | ❌ Zayıf | ✅ Gemini Terimi | Açıklama |
|-----------|---------|------------------|----------|
| Parlak yüzey | `shiny chocolate` | `tempered chocolate sheen` | Profesyonelce temperlenmiş, kuru ve keskin parlaklık |
| Glazür | `chocolate glaze` | `mirror glaze surface reflecting soft window light` | Kusursuz yansımalı kaplama |
| Kıvrım parlaması | `shiny` | `specular highlights on curved chocolate` | Kıvrımlardaki keskin beyaz ışık noktaları |
| Kırık doku | `broken chocolate` | `snap texture` | Kırılma noktasındaki mat ve sert doku |
| Toz kaplama | `cocoa powder` | `velvety matte cocoa dusting` | Trüflerin üzerindeki tozlu yumuşak doku |

### Işık Eşleştirmesi
- **Parlaklık için:** `Side lighting to create specular highlights`
- **Mat dokular için:** `Soft diffused light`

---

## Krema Terimleri

### Havalılık ve Pürüzsüzlük

| Doku Tipi | ❌ Zayıf | ✅ Gemini Terimi | Açıklama |
|-----------|---------|------------------|----------|
| Pürüzsüz | `creamy` | `silky smooth buttercream finish` | Spatula ile düzeltilmiş gözeneksiz yüzey |
| Mus | `fluffy` | `aerated mousse texture` | Minik hava kabarcıklı hafif yapı |
| Beze | `meringue` | `piped meringue peaks with lightly toasted edges` | Form + doku (kızarmış şeker) |
| Ganaj | `chocolate cream` | `luscious, thick ganache` | Akışkan ama yoğun ağır his |

### Işık Eşleştirmesi
- **Krema konturları için:** `Soft diffused light to show contours`

---

## Hamur Terimleri

### Gözenekler ve Katmanlar

| Doku Tipi | ❌ Zayıf | ✅ Gemini Terimi | Açıklama |
|-----------|---------|------------------|----------|
| Katmanlı | `flaky` | `visible flaky laminated layers` | Kruvasan/milföy katman ayrışması |
| Gözenekli | `sponge cake` | `moist, open crumb structure` | Süngerimsi delikli ama ıslak olmayan |
| Kabuk | `crust` | `golden-brown baked crust` | Maillard reaksiyonu karamelize doku |
| Tart kenarı | `tart edge` | `buttery tart shell edge` | Kumlu kıtır shortcrust doku |

### Işık Eşleştirmesi
- **Gözenekler için:** `Backlighting to show translucency of the crumb`
- **Kabuk için:** `Side lighting`

---

## Tam Örnek Prompt

### Kötü Prompt (Prompt Pollution)
```
Burger, 8k, ultra hd, hyper realistic, photorealistic,
cinematic lighting, extremely detailed, best quality.
```

### İyi Prompt (Fizik + Optik + Doku)
```
A professional macro photo of a juicy burger.
Glistening melted cheddar, steam rising,
sharp focus on the texture of the toasted brioche bun.
Soft window lighting, shallow depth of field.
```

### Sade Patisserie Örneği
```
A close-up photograph of a signature Sade Patisserie chocolate entremet.
Mirror glaze surface reflecting soft window light,
decorated with a single tempered chocolate shard showing specular highlights.
The cut section reveals an aerated chocolate mousse texture
and a base of moist sponge with open crumb structure.
Natural side lighting.
```

---

## Işık-Doku Eşleştirme Tablosu

| Malzeme | Önerilen Işık | Neden |
|---------|---------------|-------|
| Çikolata parlaklığı | Side lighting | Specular highlights için |
| Krema dokusu | Soft diffused | Konturları göstermek için |
| Hamur gözenekleri | Backlighting | Translucency için |
| Karamelize kabuk | Side lighting | Texture depth için |
| Mat kakao tozu | Diffused | Yumuşak geçişler için |

---

## Sade Patisserie Kuralları

### Yapılması Gerekenler
- `Professional lifestyle photography` kullan
- Ürün tipine göre doku terimi seç
- Doku + ışık eşleştirmesi yap
- Optik terimler ekle (`f/2.0`, `macro`, `sharp focus on...`)

### Yapılmaması Gerekenler
- `8K`, `4K`, `ultra HD` yazma (işe yaramaz)
- `hyper-realistic` yazma (over-processing riski)
- `NO steam, NO smoke` (Sade kuralı - pastalar için uygun değil)
- Genel terimler kullanma (`shiny`, `creamy`, `fluffy`)

---

## Versiyon Geçmişi

| Tarih | Değişiklik |
|-------|------------|
| 2026-02-03 | İlk versiyon - Gemini yanıtlarından derlendi |

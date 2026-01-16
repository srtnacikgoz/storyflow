---
name: photo-orchestrator
version: 1.0.0
description: Gorsel icerik uretimi icin ana orkestrator - Urun fotografindan Instagram paylasimina
triggers:
  - /instagram
  - /story
  - /post
author: Sade Patisserie
---

# Photo Orchestrator

Urun fotografindan Instagram paylasimina kadar tum sureci yonetir.

## Kullanim

```
/instagram [gorsel_yolu] [urun_adi] [kategori]
```

**Ornekler:**
```
/instagram /path/to/tiramisu.jpg "Klasik Tiramisu" small-desserts
/instagram /Desktop/croissant.png "Tereyagli Kruvasan" viennoiserie
/story /photos/macaron.jpg "Frambuazli Macaron"
```

## Workflow

Bu skill calistirildiginda asagidaki adimlari sirayla uygula:

### Adim 1: Parametreleri Al
- Gorsel yolu (zorunlu)
- Urun adi (opsiyonel)
- Kategori (opsiyonel, varsayilan: small-desserts)

Eger parametreler verilmediyse kullanicidan iste.

### Adim 2: Gorsel Analiz
Gorseli analiz et ve su bilgileri cikar:
- Urun tipi (tiramisu, croissant, macaron, vb.)
- Dominant renkler (HEX formatinda)
- Typography var mi? (marka adi, etiket)
- Onerilen stil (lifestyle-moments, pure-minimal, vb.)
- Onerilen isik stratejisi (SIDE_LIGHT, BACK_LIGHT, vb.)
- Onerilen aksiyon ani (DIP, CUT, POUR, vb.)

### Adim 3: Prompt Yaz
`.claude/rules/KURALLAR.md` dosyasini oku ve su kurallara uy:
- IMAGE-TO-IMAGE zorunlulugu
- Urun tarifi yasagi
- Standart backdrop (off-white)
- Insan faktorleri yasagi
- Typography koruma
- Duman/steam yasagi

Prompt formatini Gemini icin hazirla.

### Adim 4: Instagram'a Gonder
`instagram-bridge` ile API'ye POST at:

```json
{
  "imageUrl": "https://...",
  "analysis": {...},
  "prompt": {
    "main": "Using uploaded image as reference...",
    "negative": "steam, smoke, vapor...",
    "platform": "gemini",
    "format": "4:5"
  },
  "settings": {
    "category": "small-desserts",
    "styleVariant": "lifestyle-moments",
    "faithfulness": 0.8,
    "schedulingMode": "optimal"
  },
  "productName": "Klasik Tiramisu"
}
```

### Adim 5: Sonuc Bildir
- Basarili: Item ID ve Telegram onay bekleniyor mesaji
- Basarisiz: Hata mesaji ve cozum onerisi

## Kategoriler

| Kategori | Aciklama | Ornek Urunler |
|----------|----------|---------------|
| viennoiserie | Hamur isleri | Kruvasan, pain au chocolat, brioche |
| coffee | Kahve menusu | Espresso, latte, filtre kahve |
| chocolate | Cikolata | Bonbon, tablet, truffle |
| small-desserts | Kucuk tatlilar | Macaron, eclair, mini tart |
| slice-cakes | Dilim pasta | Cheesecake, tiramisu, opera |
| big-cakes | Buyuk pasta | Dogum gunu, dugun |
| profiterole | Profiterol | 3, 6, 10 toplu |
| special-orders | Ozel siparis | Custom tasarimlar |

## Stil Varyantlari

| Stil | Aciklama | Ne Zaman Kullan |
|------|----------|-----------------|
| pure-minimal | Sade, temiz | Urun detayi on planda |
| lifestyle-moments | Yasam ani | Hikaye anlatimi |
| rustic-warmth | Rustik, sicak | Artisanal urunler |
| french-elegance | Fransiz zarafeti | Lux sunumlar |

## Isik Stratejileri

| Isik | Kullanim | Urun Tipi |
|------|----------|-----------|
| SIDE_LIGHT | Doku vurgusu | Ekmek, pasta, katmanli |
| BACK_LIGHT | Seffaflik | Icecek, sos, glaze |
| 45_LIGHT | Genel | Hero shot |
| SOFT_LIGHT | Konfor | Sicak urunler |

## Aksiyon Anlari

| Aksiyon | Etiket | Urun |
|---------|--------|------|
| Kasik batirma | DIP | Kremali tatlilar |
| Kesim | CUT | Katmanli pastalar |
| Dokme | POUR | Soslu urunler |
| Eleme | DUST | Tozlu sunumlar |
| Kirma | BREAK | Citir kabuklu |

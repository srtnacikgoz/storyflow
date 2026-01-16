---
name: visual-analyzer
version: 1.0.0
description: Gorsel analiz ve metadata cikarma
triggers:
  - /analyze
author: Sade Patisserie
---

# Visual Analyzer

Urun gorselini analiz eder ve prompt yazimi icin metadata cikarir.

## Kullanim

```
/analyze [gorsel_yolu]
```

Gorsel yolu verilmezse kullanicidan iste.

## Analiz Adimlari

### 1. Urun Tipi Tespiti
Gorseldeki urunu tani:
- Ana kategori: pasta, tatli, icecek, cikolata, hamur isi
- Alt kategori: tiramisu, cheesecake, macaron, croissant, vb.
- Portion: tek, dilim, tam, set

### 2. Renk Analizi
Gorselden renk bilgisi cikar:
- Dominant renk (HEX)
- Ikincil renk (HEX)
- Aksan renk (HEX)
- Palet tipi: warm-earth, cool-neutral, vibrant, pastel
- Sicak/soguk ton degerlendirmesi

### 3. Sunum Analizi
Sunumu degerlendir:
- Kap tipi: tabak, bardak, kutu, cam
- Kap sekli: yuvarlak, dikdortgen, kare
- Materyal: porselen, cam, kagit, ahsap
- Dekorasyon: meyve, cikolata, cicek, sos
- Props: catal, kasik, pecete, cicek

### 4. Typography Kontrolu
Gorselde metin var mi kontrol et:
- Marka adi gorunuyor mu?
- Etiket/label var mi?
- Okunabilirlik durumu
- CRITICAL olarak isaretlenmeli mi?

### 5. Stil Onerisi
Urune gore en uygun stil oner:
- styleVariant: pure-minimal, lifestyle-moments, rustic-warmth, french-elegance
- lightStrategy: SIDE_LIGHT, BACK_LIGHT, 45_LIGHT, SOFT_LIGHT
- actionMoment: DIP, CUT, POUR, DUST, BREAK (opsiyonel)
- wabiSabi: true/false (kusursuz kusurluluk elementi)

## Output Format

```json
{
  "productType": "tiramisu",
  "productCategory": "small-desserts",
  "container": {
    "type": "glass",
    "shape": "rectangular",
    "material": "transparent"
  },
  "colors": {
    "dominant": "#5D4037",
    "secondary": "#F5F5DC",
    "accent": "#3E2723",
    "palette": "warm-earth",
    "temperature": "warm"
  },
  "presentation": {
    "style": "layered",
    "topping": "cocoa-powder",
    "decoration": "none",
    "props": []
  },
  "typography": {
    "hasText": false,
    "brandVisible": false,
    "critical": false
  },
  "suggestions": {
    "styleVariant": "lifestyle-moments",
    "lightStrategy": "SIDE_LIGHT",
    "actionMoment": "DIP",
    "wabiSabi": true,
    "faithfulness": 0.8
  }
}
```

## Stil Secim Rehberi

| Urun Tipi | Onerilen Stil | Onerilen Isik |
|-----------|---------------|---------------|
| Katmanli tatli | lifestyle-moments | SIDE_LIGHT |
| Tek parca | pure-minimal | 45_LIGHT |
| Sicak icecek | rustic-warmth | BACK_LIGHT |
| Lux sunum | french-elegance | SOFT_LIGHT |
| Artisanal | rustic-warmth | SIDE_LIGHT |

## Faithfulness Secimi

| Durum | Faithfulness | Aciklama |
|-------|--------------|----------|
| Typography var | 0.9+ | Metinleri koru |
| Marka logosu | 0.9+ | Logoyu koru |
| Basit urun | 0.6-0.7 | Yaratici ozgurluk |
| Detayli sunum | 0.8 | Dengelii |

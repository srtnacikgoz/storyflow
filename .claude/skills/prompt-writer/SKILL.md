---
name: prompt-writer
version: 1.0.0
description: KURALLAR.md'ye uygun profesyonel prompt uretimi
triggers:
  - /write-prompt
  - /prompt
author: Sade Patisserie
---

# Prompt Writer

Norogastronomi prensipleri ve KURALLAR.md'ye uygun prompt yazar.

## Zorunlu Okuma

Her calistirildiginda su dosyayi oku:
```
.claude/rules/KURALLAR.md
```

## Kullanim

```
/write-prompt [analiz_json]
```

veya visual-analyzer ciktisini otomatik al.

## Temel Kurallar (KURALLAR.md Ozeti)

### 1. IMAGE-TO-IMAGE ZORUNLULUGU
- ASLA text-to-image degil
- Her prompt "Using uploaded image as reference..." ile baslamali

### 2. URUN TARIFI YASAGI
- Urunun "ne oldugunu" tarif ETME
- AI referans fotoraftan gorur
- Sadece: Kompozisyon, Isik, Atmosfer, Teknik tarifle

### 3. STANDART BACKDROP
- Varsayilan: soft off-white (RGB 250,248,245)
- %3 subtle texture
- Koyu/siyah arkaplan YASAK

### 4. INSAN FAKTORLERI
- Varsayilan: YOK
- El, parmak, vucutt YASAK
- Istisna: [HANDS] etiketi ile

### 5. TYPOGRAPHY KORUMA
- Marka adi, logo, etiket = CRITICAL
- `CRITICAL:` etiketi ile vurgula

### 6. DUMAN/STEAM YASAGI
- ASLA steam, smoke, vapor, fog
- Yapay gorunum verir

## Prompt Yapisi (Gemini Format)

```
Using uploaded image as reference for [urun].

[SAHNE TANIMI]
Lifestyle product photography of [urun] from reference image,
[ortam ve kompozisyon detaylari].

[ISIK STRATEJISI]
LIGHTING: [Side/Back/Soft/Hard] light from [yon],
[isik etkileri ve golge detaylari].

[AKSIYON ANI - Opsiyonel]
ACTION MOMENT: [Aksiyon aciklamasi]

[WABI-SABI - Opsiyonel]
WABI-SABI: [Kusursuz kusurluluk detaylari]

[ATMOSFER]
ATMOSPHERE: [Mood, renk paleti, his]

[TEKNIK]
TECHNICAL: [Format], shallow DOF (f/2.8), 8K photorealistic.

CRITICAL: [Korunmasi gereken detaylar - varsa]

--no [negative prompt]
```

## Negative Prompt Template

```
steam, smoke, vapor, mist, fog,
human hands, fingers, human elements, people,
dark background, black backdrop, moody lighting,
harsh shadows, flash photography,
CGI look, artificial, plastic appearance, 3D render,
text deformation, blurry typography,
different product than reference
```

## Isik Stratejisi Secimi

| Urun Tipi | Isik | Aciklama |
|-----------|------|----------|
| Katmanli (pasta, tiramisu) | SIDE_LIGHT | Katmanlari vurgular |
| Parlak (glaze, sos) | BACK_LIGHT | Seffaflik verir |
| Doku (ekmek, kruvasan) | SIDE_LIGHT | Dokuyu gosterir |
| Icecek | BACK_LIGHT | Mucevher etkisi |
| Genel | 45_LIGHT | Dengeli |

## Aksiyon Ani Secimi

| Urun Tipi | Aksiyon | Etiket |
|-----------|---------|--------|
| Kremali tatli | Kasik batirma | [DIP] |
| Katmanli | Kesim | [CUT] |
| Soslu | Dokme | [POUR] |
| Tozlu | Eleme | [DUST] |
| Citir kabuklu | Kirma | [BREAK] |

## Output Format

```json
{
  "main": "Using uploaded image as reference for tiramisu...",
  "negative": "steam, smoke, vapor, mist, fog...",
  "platform": "gemini",
  "format": "4:5"
}
```

## Format Secimi

| Platform | Format | Kullanim |
|----------|--------|----------|
| Instagram Feed | 4:5 | Ana gorsel |
| Instagram Story | 9:16 | Hikaye |
| Instagram Grid | 1:1 | Kare gorsel |

## Ornek Prompt

```
Using uploaded image as reference for tiramisu in glass container.

Lifestyle product photography of layered tiramisu from reference image,
captured in a bright cafe setting with morning light streaming through
a window. The glass container reveals the beautiful mascarpone and
espresso-soaked ladyfinger layers.

LIGHTING: Side light from left (9 o'clock position), creating gentle
shadows that emphasize the layers. Soft fill light from right to
prevent harsh shadows.

ACTION MOMENT: A small spoon just beginning to break through the
cocoa powder surface, revealing the creamy layer beneath.

WABI-SABI: A few cocoa powder particles scattered naturally on the
marble surface beside the glass.

ATMOSPHERE: Warm, inviting morning cafe mood. Soft earth tones with
cream and brown palette. Cozy and appetizing feeling.

TECHNICAL: 4:5 aspect ratio, shallow depth of field (f/2.8),
8K photorealistic quality, natural color grading.

--no steam, smoke, vapor, mist, fog, human hands, fingers, dark background, CGI look, artificial appearance
```

# Poster Mood Sistemi Yeniden Tasarımı

## Amaç

Mevcut 6 mood birbirine çok benziyor — hepsi renk/atmosfer ekseninde farklılaşıyor, yapısal fark yok. Kullanıcı hangisini seçeceğini bilemiyor.

Yeni sistem: 5 mood, her biri **farklı bir eksende** ayrışır (ürün netliği, çevre, renk, kompozisyon). İsminden bile ne çıkacağı belli olacak.

## Kararlar

- **5 mood** (az ama sağlam)
- **Yeni modifier yapısı** (6 alan, mevcut 4 kalkıyor)
- **compatibleStyles kaldırılıyor** (her mood her stille çalışabilecek)

## Yeni PosterMoodModifiers Interface

```typescript
export interface PosterMoodModifiers {
  productClarity: string;    // Ürün ne kadar net/stilize olacak
  background: string;        // Arka plan nasıl olacak
  surroundings: string;      // Çevrede ne olacak (veya olmayacak)
  lighting: string;          // Işık tipi ve yönü
  colorPalette: string;      // Renk paleti talimatı
  compositionStyle: string;  // Kompozisyon/yerleşim yaklaşımı
}
```

## Yeni PosterMood Interface

```typescript
export interface PosterMood {
  id: string;
  name: string;
  nameTr: string;
  promptModifiers: PosterMoodModifiers;
  // compatibleStyles KALDIRILDI
  isActive: boolean;
  sortOrder: number;
}
```

## 5 Mood Tanımı

### 1. Studio Shot (Stüdyo Çekim)

| Alan | Değer |
|------|-------|
| **productClarity** | Maximum sharpness. The product is the absolute hero — every detail visible, every texture rendered in high resolution. Tack-sharp focus across the entire product. |
| **background** | Clean, simple, solid color or very soft gradient. No patterns, no textures, no distractions. The background exists only to make the product stand out. |
| **surroundings** | Nothing. Zero props, zero accessories, zero decorative elements. Only the product exists in this frame. |
| **lighting** | Professional studio lighting. Even, shadowless or with minimal controlled shadows. High-key lighting that reveals every detail without harsh contrast. |
| **colorPalette** | Neutral and clean — whites, light grays, soft creams. The product's own colors are the only color story. Background never competes with the product. |
| **compositionStyle** | Product centered or slightly off-center with generous negative space. Clean, e-commerce quality. The product occupies 50-70% of the frame. |

### 2. Lively Scene (Canlı Sahne)

| Alan | Değer |
|------|-------|
| **productClarity** | Sharp and clear, but the product lives within a scene — it's part of a story, not isolated. Focus is on the product but the environment is also in focus. |
| **background** | Natural, lived-in environment — wooden table, marble counter, café setting, kitchen surface. Real-world context that feels authentic and inviting. |
| **surroundings** | Rich with complementary props — coffee cup, scattered crumbs, fresh flowers, linen napkin, wooden cutting board, seasonal fruits. The scene tells a story around the product. |
| **lighting** | Natural daylight, golden hour warmth. Soft window light with gentle shadows. Feels like a real moment captured, not staged. 3500-4500K color temperature. |
| **colorPalette** | Warm, inviting tones — amber, cream, natural wood, terracotta. The overall palette feels like a cozy café or a Sunday morning kitchen. |
| **compositionStyle** | Lifestyle flat-lay or 45-degree angle. Product is clearly the star but surrounded by context. Rule of thirds, natural arrangement that feels effortless. |

### 3. Minimal Art (Minimal Sanat)

| Alan | Değer |
|------|-------|
| **productClarity** | Stylized, almost art-directed. The product may be shot from an unusual angle (overhead, extreme close-up). Artistic interpretation over documentary accuracy. |
| **background** | Pastel gradient or solid pastel tone — lavender, blush pink, mint, soft peach, powder blue. Gallery-like, clean, modern. |
| **surroundings** | Abstract geometric shapes, clean lines, minimal sculptural elements. If props exist, they're geometric — spheres, cubes, arches in matching pastel tones. |
| **lighting** | Soft, even, almost shadowless. Flat lighting that emphasizes color over depth. Diffused and gentle — no harsh shadows, no dramatic contrast. |
| **colorPalette** | Pastel-dominant — soft, desaturated, harmonious. 2-3 pastel tones maximum. The palette feels like a curated art exhibition or a design magazine spread. |
| **compositionStyle** | Highly designed, intentional placement. Asymmetric balance, negative space as a design element. The composition itself is the artwork — product is part of a visual arrangement. |

### 4. Dark Luxe (Karanlık Lüks)

| Alan | Değer |
|------|-------|
| **productClarity** | The product glows against darkness. Highlighted with precision — rim light separates it from the background. Every detail is visible but dramatically lit. |
| **background** | Dark — black, charcoal, deep navy, dark marble. The background absorbs light and pushes the product forward. Rich, deep, luxurious darkness. |
| **surroundings** | Minimal and premium — a gold accent, silk fabric, a single dark flower, metallic utensil. Less is more. Every element whispers luxury. |
| **lighting** | Dramatic spot lighting, chiaroscuro, rim light. Single strong light source creating deep shadows and bright highlights. Cinematic, theatrical. 2800-3200K warm accent. |
| **colorPalette** | Dark base with luxurious accents — gold, champagne, deep burgundy, copper against black/charcoal. High contrast between dark and light. Premium feel. |
| **compositionStyle** | Product elevated or spotlit, often centered with dramatic negative space in dark tones. Feels like a luxury brand campaign or a Michelin-star menu photograph. |

### 5. Pop Color (Pop Renkli)

| Alan | Değer |
|------|-------|
| **productClarity** | Product is crisp and clear, often framed or contained within a shape (circle, rounded rectangle) against the colorful background. High contrast separation. |
| **background** | Bold, vivid gradient or color blocks — electric coral, hot pink, bright orange, lime green, vivid purple. Eye-catching, scroll-stopping colors. |
| **surroundings** | Graphic elements — bold typography, badges, stickers, price tags, "NEW" labels, confetti, geometric shapes. The poster is designed to grab attention and communicate a message. |
| **lighting** | Bright, even, uniform — no shadows, no drama. Flat, high-key lighting that keeps everything vivid and readable. The colors are the star, not the light. |
| **colorPalette** | Maximum saturation, maximum energy. 2-3 bold complementary colors. Think: fast food campaigns, sale posters, social media ads. Nothing muted, nothing pastel. |
| **compositionStyle** | Graphic poster layout — product framed in center, text/badges around it. Designed for immediate impact, clear hierarchy. Feels like a campaign poster or a promotional flyer. |

## Prompt Enjeksiyon Formatı (posterSmartController.ts)

Mevcut format:
```
MOOD: ${mood.name}
Color Shift: ${mood.promptModifiers.colorShift}
Lighting: ${mood.promptModifiers.lightingAdjust}
Texture: ${mood.promptModifiers.textureNote}
Atmosphere: ${mood.promptModifiers.atmosphereNote}
```

Yeni format:
```
MOOD: ${mood.name}
Product Clarity: ${mood.promptModifiers.productClarity}
Background: ${mood.promptModifiers.background}
Surroundings: ${mood.promptModifiers.surroundings}
Lighting: ${mood.promptModifiers.lighting}
Color Palette: ${mood.promptModifiers.colorPalette}
Composition: ${mood.promptModifiers.compositionStyle}
```

## Değişecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `functions/src/types/poster.ts:20-25` | `PosterMoodModifiers` — 4 alan → 6 yeni alan |
| `functions/src/types/poster.ts:49-57` | `PosterMood` — `compatibleStyles` kaldır |
| `functions/src/orchestrator/seed/posterData.ts:108-187` | 6 eski mood → 5 yeni mood seed verisi |
| `functions/src/controllers/orchestrator/posterSmartController.ts:733-737` | Prompt enjeksiyon — eski 4 satır → yeni 6 satır |

## Değişmeyecekler

- Admin UI dropdown (`Poster.tsx:520-532`) — id/nameTr göstermeye devam eder
- CRUD endpoint'leri (`posterConfigController.ts`) — aynı Firestore yapısı
- Firestore path (`global/config/poster-config/moods/items/`)
- Config okuma fonksiyonları (`posterConfig.ts`) — `getPosterMoodById`, `getPosterMoods` aynı kalır

## Migration

Firestore'daki mevcut 6 mood dokümanı **seed endpoint'i çalıştırılarak** yeni 5 mood ile değiştirilecek. Eski mood'lar silinecek.

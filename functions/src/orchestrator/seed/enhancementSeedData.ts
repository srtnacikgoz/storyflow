/**
 * Enhancement Preset Seed Data
 * Varsayılan arka plan ve iyileştirme preset'leri
 */

import { EnhancementPreset, EnhancementStyle } from "../types";

export const DEFAULT_ENHANCEMENT_PRESETS: Omit<EnhancementPreset, "createdAt" | "updatedAt">[] = [
  {
    id: "studio-white",
    displayName: "Stüdyo Beyaz",
    description: "Saf beyaz arka plan, yumuşak gölge. E-ticaret ve katalog için ideal.",
    backgroundStyle: "pure-white",
    backgroundPrompt: "Place the product on a pure white seamless background. Clean, bright, professional product photography style.",
    shadowType: "soft-drop",
    shadowPrompt: "Add a subtle soft drop shadow beneath the product, slightly diffused, natural looking.",
    lightingDirection: "top-left",
    colorTemperature: "neutral",
    isActive: true,
    order: 1,
  },
  {
    id: "warm-wood",
    displayName: "Sıcak Ahşap",
    description: "Ahşap masa üzerinde, sıcak ışıklı. Kafe/pastane atmosferi.",
    backgroundStyle: "warm-wood",
    backgroundPrompt: "Place the product on a warm-toned rustic wooden table surface. Soft natural daylight from a window. Cozy bakery atmosphere.",
    shadowType: "contact",
    shadowPrompt: "Natural contact shadow on the wood surface with subtle warm light reflection.",
    lightingDirection: "top-right",
    colorTemperature: "warm",
    isActive: true,
    order: 2,
  },
  {
    id: "minimal-marble",
    displayName: "Minimal Mermer",
    description: "Açık mermer yüzey, temiz ve modern estetik.",
    backgroundStyle: "minimal-marble",
    backgroundPrompt: "Place the product on a light white marble surface with subtle gray veining. Clean, minimal, modern aesthetic. Soft even lighting.",
    shadowType: "contact",
    shadowPrompt: "Gentle contact shadow on the marble, very subtle reflection on the polished surface.",
    lightingDirection: "front",
    colorTemperature: "neutral",
    isActive: true,
    order: 3,
  },
  {
    id: "dark-dramatic",
    displayName: "Koyu Dramatik",
    description: "Koyu slate/beton arka plan, güçlü yönlü ışık. Premium ürünler için.",
    backgroundStyle: "dark-slate",
    backgroundPrompt: "Place the product on a dark charcoal slate surface. Dramatic directional lighting from one side, deep shadows on the opposite. Moody, premium feel.",
    shadowType: "directional",
    shadowPrompt: "Strong directional shadow extending to one side, dramatic contrast between lit and shadow areas.",
    lightingDirection: "top-left",
    colorTemperature: "warm",
    isActive: true,
    order: 4,
  },
  {
    id: "pastel-soft",
    displayName: "Pastel Yumuşak",
    description: "Yumuşak pastel tonlu arka plan, Instagram için optimum.",
    backgroundStyle: "pastel-soft",
    backgroundPrompt: "Place the product on a soft pastel-toned surface (light pink or cream). Dreamy, soft diffused lighting. Instagram-friendly aesthetic.",
    shadowType: "soft-drop",
    shadowPrompt: "Very soft, barely visible shadow. Light and airy feel.",
    lightingDirection: "front",
    colorTemperature: "warm",
    isActive: true,
    order: 5,
  },
];

/**
 * Varsayılan Enhancement Stilleri (ışık/renk/mood)
 * Matthew Vaughn DNA kuralları entegre
 */
export const DEFAULT_ENHANCEMENT_STYLES: Omit<EnhancementStyle, "createdAt" | "updatedAt">[] = [
  {
    id: "natural",
    displayName: "Doğal",
    description: "Minimal müdahale — sadece ışık ve renk düzeltme",
    promptInstructions: "Minimal enhancement: correct white balance, slightly brighten dark areas, gentle sharpening. Keep the natural look — do NOT over-saturate or over-process. The photo should look like a well-lit version of itself.",
    isActive: true,
    order: 1,
  },
  {
    id: "vivid",
    displayName: "Canlı",
    description: "Doygun renkler, yüksek kontrast — sosyal medya için optimum",
    promptInstructions: "Vivid enhancement: boost color saturation by 20-30%, increase contrast, make textures POP. Golden crusts should GLOW, chocolate should look deep and rich. Colors should be vibrant but still realistic — not neon. High contrast between light and shadow areas.",
    isActive: true,
    order: 2,
  },
  {
    id: "cinematic",
    displayName: "Sinematik",
    description: "Sıcak tonlar, shallow DoF hissi, filmsel kalite",
    promptInstructions: "Cinematic enhancement: apply warm color grading (slight orange/amber shift in highlights, cool blues in shadows). Shallow depth of field feel with soft bokeh in background. Subtle film grain texture. Gentle highlight bloom on reflective surfaces. The image should feel like a still from a premium food commercial.",
    isActive: true,
    order: 3,
  },
  {
    id: "clean",
    displayName: "Temiz",
    description: "Beyaz dengesi düzeltme, minimal işleme — e-ticaret için",
    promptInstructions: "Clean enhancement: perfect white balance correction, remove any color cast, even lighting across the product. Crisp and sharp details. No mood or atmosphere — pure product representation. Suitable for e-commerce and catalog use.",
    isActive: true,
    order: 4,
  },
];

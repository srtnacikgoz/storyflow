/**
 * Enhancement Preset Seed Data
 * Varsayılan arka plan ve iyileştirme preset'leri
 */

import { EnhancementPreset } from "../types";

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

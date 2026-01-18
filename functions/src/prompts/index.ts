/**
 * Prompt Builder
 * Kategori ve stil bazlı prompt oluşturma
 */

import { PromptStyle } from "./types";
import { CROISSANT_PROMPT } from "./templates/croissant";
import { PASTA_PROMPT } from "./templates/pasta";
import { CHOCOLATE_PROMPT } from "./templates/chocolate";
import { MACARON_PROMPT } from "./templates/macaron";
import { COFFEE_PROMPT } from "./templates/coffee";

export * from "./types";

/**
 * Prompt oluşturma sonucu
 */
export interface PromptResult {
  prompt: string;
  negativePrompt: string;
}

/**
 * Prompt oluştur
 * @param category - Ürün kategorisi
 * @param style - Stil varyantı
 * @param productName - Ürün adı (opsiyonel)
 * @return Prompt ve negative prompt
 */
export function buildPrompt(
  category: string,
  style: string,
  productName?: string
): PromptResult {
  // Şablon seç
  let template;
  switch (category) {
    case "croissant":
      template = CROISSANT_PROMPT;
      break;
    case "pasta":
      template = PASTA_PROMPT;
      break;
    case "chocolate":
      template = CHOCOLATE_PROMPT;
      break;
    case "macaron":
      template = MACARON_PROMPT;
      break;
    case "coffee":
      template = COFFEE_PROMPT;
      break;
    default:
      template = PASTA_PROMPT; // Varsayılan fallback
  }

  // Stil seç (varsayılan: modern)
  const selectedStyle = (style in template.styles ? style : "modern") as PromptStyle;
  const stylePrompt = template.styles[selectedStyle];

  // Ana prompt ile stili birleştir
  // Base prompt'taki [STİL PROMPT] placeholder'ı varsa değiştir, yoksa sona ekle
  let prompt = template.base;

  // Base prompt genellikle generic bir giriş içerir, stili ekleyelim
  prompt += `\n\n${stylePrompt}`;

  // Ürün adı varsa ekle
  if (productName) {
    prompt += `\n\nPRODUCT NAME: "${productName}" - This is the exact product in the image. Maintain its appearance exactly.`;
  }

  return {
    prompt,
    negativePrompt: template.negative,
  };
}

/**
 * Tüm stil varyantlarını döndür
 * Kategoriden bağımsız genel stiller veya kategoriye özel stiller eklenebilir
 */
export function getStyleVariants(): Array<{
  id: PromptStyle;
  name: string;
  description: string;
}> {
  return [
    {
      id: "modern",
      name: "Modern Studio",
      description: "Clean, bright, minimalist",
    },
    {
      id: "rustic",
      name: "Rustic Lifestyle",
      description: "Warm, wood, artisanal",
    },
    {
      id: "social",
      name: "Social Flat Lay",
      description: "Trendy, pop colors, grid",
    },
    {
      id: "luxury",
      name: "Luxury Premium",
      description: "Elegant, high-end, dark/gold",
    },
    {
      id: "lifestyle",
      name: "Lifestyle Moment",
      description: "Cozy, human touch, pairing",
    },
  ];
}

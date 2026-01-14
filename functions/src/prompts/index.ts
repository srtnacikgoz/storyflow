/**
 * Prompt Builder
 * Kategori ve stil bazlı prompt oluşturma
 */

import { CAFE_PATISSERIE_PROMPT, StyleVariant } from "./cafe-patisserie";

export { StyleVariant } from "./cafe-patisserie";

/**
 * Prompt oluşturma sonucu
 */
export interface PromptResult {
  prompt: string;
  negativePrompt: string;
}

/**
 * Prompt oluştur
 * @param category - Ürün kategorisi (şimdilik sadece cafe-patisserie)
 * @param style - Stil varyantı
 * @param productName - Ürün adı (opsiyonel)
 * @returns Prompt ve negative prompt
 */
export function buildPrompt(
  category: string,
  style: StyleVariant,
  productName?: string
): PromptResult {
  // Şimdilik sadece cafe-patisserie kategorisi var
  const base = CAFE_PATISSERIE_PROMPT;

  let prompt = base.base;

  // Stil ekle
  if (base.styles[style]) {
    prompt += `\n\n${base.styles[style]}`;
  }

  // Ürün adı varsa ekle
  if (productName) {
    prompt += `\n\nPRODUCT NAME: "${productName}" - This is the exact product in the image. Maintain its appearance exactly.`;
  }

  return {
    prompt,
    negativePrompt: base.negative,
  };
}

/**
 * Tüm stil varyantlarını döndür
 */
export function getStyleVariants(): Array<{
  id: StyleVariant;
  name: string;
  description: string;
}> {
  return [
    {
      id: "pure-minimal",
      name: "Pure Minimal",
      description: "Maksimum negatif alan, sade",
    },
    {
      id: "lifestyle-moments",
      name: "Lifestyle",
      description: "Sıcak, insan dokunuşu",
    },
    {
      id: "rustic-warmth",
      name: "Rustic",
      description: "Ahşap, doğal dokular",
    },
    {
      id: "french-elegance",
      name: "French",
      description: "Şık, zarif sunum",
    },
  ];
}

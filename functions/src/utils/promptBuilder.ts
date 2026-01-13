/**
 * DALL-E Prompt Builder Utility
 * Instagram Automation - Sade Patisserie
 *
 * Builds optimized prompts for DALL-E 3 image enhancement
 */

import {ProductCategory} from "../types";
import {DALLE_ENHANCEMENT_PROMPTS} from "../config/constants";

/**
 * Build enhancement prompt for DALL-E 3
 * Combines base template with category-specific instructions
 *
 * @param {ProductCategory} category - Product category
 * @param {string} analysis - Vision API analysis of the original photo
 * @param {string} productName - Optional specific product name
 * @return {string} Complete DALL-E prompt
 */
export function buildEnhancementPrompt(
  category: ProductCategory,
  analysis: string,
  productName?: string
): string {
  // Get base and category-specific prompts
  const basePrompt = DALLE_ENHANCEMENT_PROMPTS.base;
  const categoryPrompt = DALLE_ENHANCEMENT_PROMPTS[category] ||
    DALLE_ENHANCEMENT_PROMPTS["small-desserts"]; // fallback

  // Build the complete prompt
  const parts: string[] = [];

  // Header with product info
  if (productName) {
    parts.push(
      `Create a professional food photography image of "${productName}" ` +
      `(${getCategoryDisplayName(category)}) from Sade Patisserie.`
    );
  } else {
    parts.push(
      "Create a professional food photography image of a " +
      `${getCategoryDisplayName(category)} from Sade Patisserie.`
    );
  }

  // Original photo analysis context
  parts.push("");
  parts.push("Original photo analysis:");
  parts.push(truncateAnalysis(analysis, 300));

  // Base enhancement requirements
  parts.push("");
  parts.push(basePrompt);

  // Category-specific requirements
  parts.push("");
  parts.push(`Specific to ${getCategoryDisplayName(category)}:`);
  parts.push(categoryPrompt);

  // Quality guidelines
  parts.push("");
  parts.push("Important guidelines:");
  parts.push("- Make it look real and appetizing, NOT artificial or cartoon");
  parts.push("- Professional food styling, NOT stock photo generic");
  parts.push("- Instagram-worthy, modern aesthetic");
  parts.push("- Focus on the product, minimal distractions");

  return parts.join("\n");
}

/**
 * Get display name for product category
 * @param {ProductCategory} category - Product category
 * @return {string} Human-readable category name
 */
function getCategoryDisplayName(category: ProductCategory): string {
  const displayNames: Record<ProductCategory, string> = {
    "viennoiserie": "viennoiserie pastry (croissant, pain au chocolat)",
    "coffee": "artisan coffee",
    "chocolate": "luxury chocolate",
    "small-desserts": "petit four dessert",
    "slice-cakes": "slice of cake",
    "big-cakes": "celebration cake",
    "profiterole": "profiterole dessert",
    "special-orders": "custom artisan creation",
  };

  return displayNames[category] || category;
}

/**
 * Truncate analysis text to fit within prompt limits
 * @param {string} analysis - Full analysis text
 * @param {number} maxLength - Maximum character length
 * @return {string} Truncated analysis
 */
function truncateAnalysis(analysis: string, maxLength: number): string {
  if (analysis.length <= maxLength) {
    return analysis;
  }

  // Find a good break point (end of sentence or word)
  let truncated = analysis.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(".");
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastPeriod > maxLength * 0.7) {
    truncated = truncated.substring(0, lastPeriod + 1);
  } else if (lastSpace > maxLength * 0.7) {
    truncated = truncated.substring(0, lastSpace) + "...";
  } else {
    truncated = truncated + "...";
  }

  return truncated;
}

/**
 * Build a simple enhancement prompt without analysis
 * For cases where Vision analysis is not available
 *
 * @param {ProductCategory} category - Product category
 * @param {string} productName - Optional specific product name
 * @return {string} Simple DALL-E prompt
 */
export function buildSimpleEnhancementPrompt(
  category: ProductCategory,
  productName?: string
): string {
  const basePrompt = DALLE_ENHANCEMENT_PROMPTS.base;
  const categoryPrompt = DALLE_ENHANCEMENT_PROMPTS[category] ||
    DALLE_ENHANCEMENT_PROMPTS["small-desserts"];

  const parts: string[] = [];

  if (productName) {
    parts.push(
      `Create a professional food photography image of "${productName}" ` +
      "from Sade Patisserie."
    );
  } else {
    parts.push(
      "Create a professional food photography image of a " +
      `${getCategoryDisplayName(category)} from Sade Patisserie.`
    );
  }

  parts.push("");
  parts.push(basePrompt);
  parts.push("");
  parts.push("Category-specific style:");
  parts.push(categoryPrompt);

  return parts.join("\n");
}

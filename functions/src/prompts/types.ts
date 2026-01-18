/**
 * Prompt System Types
 */

export type ProductCategory =
    | "croissant"
    | "pasta"
    | "chocolate"
    | "macaron"
    | "coffee"
    | "general"; // Fallback

export type PromptStyle =
    | "modern" // Clean, Studio, Minimal
    | "rustic" // Wood, Artisanal, Warm
    | "social" // Flatlay, Trendy, Pop
    | "luxury" // Dark, Gold, Premium
    | "lifestyle"; // Human elements, Cozy

export interface PromptTemplate {
    base: string; // Ana prompt metni
    negative: string; // Negatif promptlar
    styles: Record<PromptStyle, string>; // Stil varyasyonları
    compositions?: Record<string, string>; // Opsiyonel kompozisyonlar (Hero, Grid vs.)
}

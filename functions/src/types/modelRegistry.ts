/**
 * Model Registry — OpenRouter ve direkt API modelleri
 * Tüm kullanılabilir AI modelleri Firestore'da yaşar
 */

export interface ModelRegistryEntry {
  id: string;                    // "anthropic/claude-sonnet-4.6"
  name: string;                  // "Claude Sonnet 4.6"
  provider: string;              // "anthropic", "openai", "google", "black-forest-labs"
  type: "text" | "image" | "both";
  tier: "premium" | "balanced" | "economy" | "free";
  pricing: {
    inputPerM?: number;          // $/M input token (text modeller)
    outputPerM?: number;         // $/M output token (text modeller)
    perImage?: number;           // $/görsel (image modeller)
  };
  description: string;
  descriptionTr: string;
  capabilities: string[];       // ["prompt-writing", "analysis", "image-generation", "text-rendering"]
  isActive: boolean;
  sortOrder: number;
}

// Kullanım alanları — hangi dropdown'da gösterilecek
export type ModelUsage =
  | "poster-prompt"      // Poster prompt yazıcı
  | "scenario-writer"    // Senaryo açıklaması
  | "analysis"           // Poster analizi, öğrenme
  | "poster-image"       // Poster görsel üretimi
  | "content-image";     // Pipeline görsel üretimi

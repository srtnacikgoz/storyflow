/**
 * Model Registry Seed Data
 * OpenRouter üzerinden erişilebilir tüm modeller
 * Kaynak: OpenRouter docs, Mart 2026
 */

import { ModelRegistryEntry } from "../../types/modelRegistry";

export const MODEL_REGISTRY: Omit<ModelRegistryEntry, "isActive" | "sortOrder">[] = [
  // ═══════════════════════════════════════════════════════════════
  // TEXT MODELLER — Prompt yazma, analiz, senaryo
  // ═══════════════════════════════════════════════════════════════

  // Premium
  {
    id: "anthropic/claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    type: "text",
    tier: "premium",
    pricing: { inputPerM: 3, outputPerM: 15 },
    description: "Best for creative prompt writing and visual analysis",
    descriptionTr: "Yaratıcı prompt yazımı ve görsel analiz için en iyi",
    capabilities: ["prompt-writing", "analysis"],
  },
  {
    id: "openai/gpt-5.4",
    name: "GPT-5.4",
    provider: "openai",
    type: "text",
    tier: "premium",
    pricing: { inputPerM: 2.5, outputPerM: 15 },
    description: "Strong instruction following with 1M context",
    descriptionTr: "Güçlü talimat takibi, 1M bağlam",
    capabilities: ["prompt-writing", "analysis"],
  },
  {
    id: "google/gemini-3.1-pro",
    name: "Gemini 3.1 Pro",
    provider: "google",
    type: "text",
    tier: "premium",
    pricing: { inputPerM: 2, outputPerM: 12 },
    description: "Google's most capable model with multimodal reasoning",
    descriptionTr: "Google'ın en güçlü modeli, çok modlu akıl yürütme",
    capabilities: ["prompt-writing", "analysis"],
  },

  // Uygun Fiyatlı
  {
    id: "anthropic/claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    type: "text",
    tier: "balanced",
    pricing: { inputPerM: 1, outputPerM: 5 },
    description: "Fast and cost-effective, good for routine tasks",
    descriptionTr: "Hızlı ve uygun fiyatlı, rutin işler için ideal",
    capabilities: ["prompt-writing", "analysis"],
  },
  {
    id: "google/gemini-3.1-flash-lite-preview",
    name: "Gemini 3.1 Flash Lite",
    provider: "google",
    type: "text",
    tier: "economy",
    pricing: { inputPerM: 0.25, outputPerM: 1.5 },
    description: "Google's fastest and cheapest model",
    descriptionTr: "Google'ın en hızlı ve en ucuz modeli",
    capabilities: ["prompt-writing"],
  },
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "deepseek",
    type: "text",
    tier: "economy",
    pricing: { inputPerM: 0.14, outputPerM: 0.28 },
    description: "90% of GPT-5.4 performance at 1/50th cost",
    descriptionTr: "GPT-5.4 performansının %90'ı, 50x daha ucuz",
    capabilities: ["prompt-writing", "analysis"],
  },

  // Ücretsiz
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    provider: "meta",
    type: "text",
    tier: "free",
    pricing: { inputPerM: 0, outputPerM: 0 },
    description: "Free, GPT-4 level, 200 req/day limit",
    descriptionTr: "Ücretsiz, GPT-4 seviyesi, günlük 200 istek",
    capabilities: ["prompt-writing"],
  },
  {
    id: "google/gemma-3-27b-it:free",
    name: "Gemma 3 27B",
    provider: "google",
    type: "text",
    tier: "free",
    pricing: { inputPerM: 0, outputPerM: 0 },
    description: "Free, Google's open-weight model, 200 req/day",
    descriptionTr: "Ücretsiz, Google açık kaynak, günlük 200 istek",
    capabilities: ["prompt-writing"],
  },
  {
    id: "openai/gpt-oss-120b:free",
    name: "GPT-OSS 120B",
    provider: "openai",
    type: "text",
    tier: "free",
    pricing: { inputPerM: 0, outputPerM: 0 },
    description: "Free, OpenAI's first open-weight model",
    descriptionTr: "Ücretsiz, OpenAI'ın ilk açık kaynak modeli",
    capabilities: ["prompt-writing"],
  },
  {
    id: "xiaomi/mimo-v2-pro",
    name: "MiMo V2 Pro",
    provider: "xiaomi",
    type: "text",
    tier: "economy",
    pricing: { inputPerM: 0.1, outputPerM: 0.3 },
    description: "Advanced reasoning model, strong math/code capabilities",
    descriptionTr: "Gelişmiş akıl yürütme, güçlü matematik/kod yetenekleri",
    capabilities: ["prompt-writing", "analysis"],
  },

  // ═══════════════════════════════════════════════════════════════
  // IMAGE MODELLER — OpenRouter'da aktif, input+output image
  // Kaynak: openrouter.ai/api/v1/models (Nisan 2026)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "openai/gpt-5-image",
    name: "GPT-5 Image",
    provider: "openai",
    type: "image",
    tier: "premium",
    pricing: { perImage: 0.01 },
    description: "OpenAI's most capable image model, best text rendering",
    descriptionTr: "OpenAI'ın en güçlü görsel modeli, en iyi metin render",
    capabilities: ["image-generation", "text-rendering"],
  },
  {
    id: "google/gemini-3-pro-image-preview",
    name: "Gemini 3 Pro Image",
    provider: "google",
    type: "image",
    tier: "premium",
    pricing: { perImage: 0.002 },
    description: "Best reference fidelity, advanced reasoning",
    descriptionTr: "En iyi referans sadakati, gelişmiş akıl yürütme",
    capabilities: ["image-generation"],
  },
  {
    id: "google/gemini-3.1-flash-image-preview",
    name: "Gemini 3.1 Flash Image",
    provider: "google",
    type: "image",
    tier: "balanced",
    pricing: { perImage: 0.0005 },
    description: "Pro-level quality at Flash speed",
    descriptionTr: "Pro seviye kalite, Flash hızında",
    capabilities: ["image-generation"],
  },
  {
    id: "openai/gpt-5-image-mini",
    name: "GPT-5 Image Mini",
    provider: "openai",
    type: "image",
    tier: "balanced",
    pricing: { perImage: 0.0025 },
    description: "Fast and affordable GPT-5 image generation",
    descriptionTr: "Hızlı ve uygun fiyatlı GPT-5 görsel üretimi",
    capabilities: ["image-generation", "text-rendering"],
  },
  {
    id: "google/gemini-2.5-flash-image",
    name: "Gemini 2.5 Flash Image",
    provider: "google",
    type: "image",
    tier: "economy",
    pricing: { perImage: 0.0003 },
    description: "Cheapest option, good balance of quality and cost",
    descriptionTr: "En ucuz seçenek, kalite ve maliyet dengesi",
    capabilities: ["image-generation"],
  },
];

/**
 * Seed data'yı döndür
 */
export function getModelRegistrySeedData() {
  return MODEL_REGISTRY.map((m, i) => ({
    ...m,
    isActive: true,
    sortOrder: i + 1,
  }));
}

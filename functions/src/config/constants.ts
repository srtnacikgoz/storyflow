/**
 * Application Constants
 * Instagram Automation - Sade Patisserie
 */

import {ScheduleRule} from "../types";

export const REGION = "europe-west1";
export const TIMEZONE = "Europe/Istanbul";

// OpenAI Models
export const OPENAI_MODEL_VISION = "gpt-4o";
export const OPENAI_MODEL_DALLE = "dall-e-3";

// DALL-E Configuration (Story format: 9:16 aspect ratio)
export const DALLE_SIZE = "1024x1792"; // Closest to 1080x1920 (9:16)
export const DALLE_QUALITY = "hd";

/**
 * Product Schedule Rules
 * Akıllı zamanlama: Hangi ürün hangi saatte paylaşılmalı?
 */
export const PRODUCT_SCHEDULE_RULES: Record<string, ScheduleRule> = {
  // 🥐 VIENNOISERIE - Sabah Ürünleri
  "viennoiserie": {
    weekday: ["07:30", "08:00", "08:30"],
    weekend: ["09:00", "09:30", "10:00"],
    message: "Güne tatlı başlayın ☕🥐",
    targetAudience: "morning-commuters",
  },

  // ☕ KAHVE MENÜSÜ
  "coffee": {
    weekday: ["08:00", "10:30", "14:00"],
    weekend: ["09:30", "11:00", "15:00"],
    message: "Kahve keyfi ☕✨",
    targetAudience: "office-workers",
  },

  // 🍫 ÇİKOLATA ÜRÜNLERİ
  "chocolate": {
    weekday: ["15:00", "16:00", "20:00"],
    weekend: ["16:00", "17:00", "19:00"],
    message: "Çikolata sevginiz için 🍫",
    targetAudience: "afternoon-tea",
  },

  // 🧁 KÜÇÜK TATLILAR (Macaron, Éclair, Mini Tart)
  "small-desserts": {
    weekday: ["14:30", "15:00", "15:30"],
    weekend: ["15:00", "15:30", "16:00"],
    message: "Çay saatinin vazgeçilmezi 🧁✨",
    targetAudience: "afternoon-tea",
  },

  // 🍰 DİLİM PASTALAR - ALTIN SAAT
  "slice-cakes": {
    weekday: ["15:00", "15:30", "16:00"], // En yüksek etkileşim
    weekend: ["14:00", "15:00", "17:00"],
    message: "Tatlı bir mola hak ediyorsunuz 🍰",
    targetAudience: "afternoon-tea",
  },

  // 🎂 BÜYÜK PASTALAR
  "big-cakes": {
    weekday: ["19:00", "20:00", "20:30"],
    weekend: ["17:00", "18:00", "19:00"],
    message: "Özel anlarınız için 🎂",
    targetAudience: "special-occasions",
  },

  // 🍮 PROFİTEROL (Genel)
  "profiterole": {
    weekday: ["15:00", "15:30", "19:00"],
    weekend: ["15:00", "16:00", "18:00"],
    message: "Profiterol keyfi 🍮✨",
    targetAudience: "afternoon-tea",
  },

  // 💫 ÖZEL SİPARİŞLER
  "special-orders": {
    weekday: ["20:00", "20:30", "21:00"],
    weekend: ["19:00", "19:30", "20:00"],
    message: "Hayalinizdeki pasta 💫",
    targetAudience: "special-occasions",
  },
};

/**
 * Profiterol Sub-Type Specific Rules
 * Profiterol için özel kurallar (3 top, 6 top, 10 top, büyük tabak)
 */
export const PROFITEROLE_RULES: Record<string, ScheduleRule> = {
  // 3 Top - Tek kişilik, hemen yeme
  "3-ball": {
    weekday: ["14:30", "15:00", "15:30"],
    weekend: ["15:00", "15:30", "16:00"],
    message: "Hızlı bir tatlı molası için 3 top profiterol 🍮",
    targetAudience: "afternoon-tea",
  },

  // 6 Top - Paylaşımlık
  "6-ball": {
    weekday: ["15:30", "16:00", "19:00"],
    weekend: ["16:00", "17:00", "18:00"],
    message: "Paylaşmak için ideal: 6 top profiterol ✨",
    targetAudience: "afternoon-tea",
  },

  // 10 Top - Aile boyu
  "10-ball": {
    weekday: ["19:00", "19:30", "20:00"],
    weekend: ["17:00", "18:00", "19:00"],
    message: "Aile boyu keyif: 10 top profiterol 🎉",
    targetAudience: "weekend-families",
  },

  // Büyük Tabak - Eve götürmelik
  "large-tray": {
    weekday: ["19:30", "20:00", "20:30"],
    weekend: ["18:00", "18:30", "19:00"],
    message: "Eve özel, büyük tabak profiterol 🏠",
    targetAudience: "evening-planners",
  },
};

/**
 * Instagram Peak Activity Hours
 * Instagram'da en yüksek etkileşim saatleri (genel araştırma)
 */
export const PEAK_HOURS = {
  highest: ["15:00", "15:30", "16:00", "19:00", "20:00"],
  high: ["08:00", "12:00", "14:00", "17:00", "21:00"],
  medium: ["09:00", "10:00", "11:00", "13:00", "18:00"],
  low: ["06:00", "07:00", "22:00", "23:00"],
};

/**
 * Message Templates by Type
 * Mesaj stratejileri
 */
export const MESSAGE_TEMPLATES = {
  "start-your-day": [
    "Güne tatlı başlayın ☀️",
    "Sabahınız güzel olsun ☕",
    "Günaydın! Tatlı bir başlangıç ✨",
  ],
  "take-a-break": [
    "Tatlı bir mola hak ediyorsunuz ☕",
    "Mola zamanı! 🍰",
    "Kendinize bir iyilik yapın ✨",
  ],
  "treat-yourself": [
    "Kendinizi şımartın 💝",
    "Bugün kendinize ödül verin 🎁",
    "Siz buna layıksınız ✨",
  ],
  "celebrate": [
    "Özel anlarınız için 🎉",
    "Kutlamanın tam zamanı 🎂",
    "Her an özeldir 💫",
  ],
  "share-joy": [
    "Sevdiklerinizle paylaşın 💕",
    "Mutluluğu paylaşın ✨",
    "Birlikte daha güzel 🤝",
  ],
};

/**
 * DALL-E 3 Enhancement Prompts
 * Kategori-spesifik görsel iyileştirme prompt'ları
 */
export const DALLE_ENHANCEMENT_PROMPTS = {
  // Base template for all products
  "base": `Create a professional, high-quality food photography image.
Enhancement requirements:
- Premium, luxurious atmosphere
- Professional studio lighting (soft, warm tones)
- Rich, vibrant colors that look appetizing
- Instagram-optimized composition (square format)
- Editorial food photography style
- Clean, elegant background
Style: Gourmet food photography, editorial quality, hedonistic appeal`,

  // Category-specific enhancements
  "viennoiserie": `Golden, flaky texture clearly visible
Steam effect suggesting freshly baked warmth
Morning light ambiance, cozy breakfast setting
Buttery, crispy layers highlighted
Rustic wooden surface or marble background`,

  "coffee": `Steam rising from the cup
Rich crema texture visible on espresso
Cozy, warm atmosphere
Soft morning or afternoon light
Ceramic cup on natural surface`,

  "chocolate": `Glossy, mirror-like finish on chocolates
Rich, deep cocoa color tones
Luxury presentation on dark surface
Subtle reflections showing premium quality
Elegant arrangement suggesting artisan craft`,

  "small-desserts": `Delicate details and intricate decorations visible
Vibrant, jewel-like colors
Elegant plating on white porcelain
Soft, diffused lighting
Miniature perfection emphasized`,

  "slice-cakes": `Cross-section clearly showing all layers
Texture detail of each component visible
Beautiful plating with sauce drizzle
Fork nearby suggesting ready to enjoy
Side angle showing height and layers`,

  "big-cakes": `Impressive full cake presentation
Decorative details highlighted
Celebration mood with soft bokeh background
Dramatic lighting emphasizing grandeur
Space for viewer imagination`,

  "profiterole": `Cream texture peeking through pastry
Chocolate sauce drizzle in motion or pooled
Elegant tower or pyramid arrangement
Dark chocolate contrast with cream
Indulgent, rich presentation`,

  "special-orders": `Unique artistic design showcased
Custom elements highlighted
Premium quality evident
Creative composition
Artistic, one-of-a-kind presentation`,
};

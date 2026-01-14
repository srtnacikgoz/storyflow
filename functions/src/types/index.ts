/**
 * TypeScript Type Definitions
 * Instagram Automation - Sade Patisserie
 */

/**
 * AI Model Types for Image Enhancement
 * - gemini-flash: Gemini 2.5 Flash Image (hızlı, $0.01/görsel)
 * - gemini-pro: Gemini 3 Pro Image Preview (kaliteli, $0.04/görsel)
 * - none: AI işleme yok
 */
export type AIModel = "gemini-flash" | "gemini-pro" | "none";

/**
 * Style Variants for Image Transformation
 */
export type StyleVariant =
  | "pure-minimal"
  | "lifestyle-moments"
  | "rustic-warmth"
  | "french-elegance";

/**
 * Product Categories
 */
export type ProductCategory =
  | "viennoiserie" // Croissant, brioche, pain au chocolat
  | "coffee" // Kahve menüsü, espresso, filtre kahve
  | "chocolate" // Bonbon, tablet, truffle, çikolata setleri
  | "small-desserts" // Macaron, éclair, mini tart, muffin, cupcake
  | "slice-cakes" // Cheesecake, tiramisù, opera, mousse
  | "big-cakes" // Doğum günü, düğün, özel günler
  | "profiterole" // Profiterol (3, 6, 10 top, büyük tabak)
  | "special-orders"; // Özel siparişler, custom tasarımlar

/**
 * Target Audience Segments
 */
export type TargetAudience =
  | "morning-commuters" // Sabah işe gidenler (07:00-09:00)
  | "office-workers" // Ofiste çalışanlar (10:00-17:00)
  | "afternoon-tea" // İkindi çay saati (14:30-16:00)
  | "evening-planners" // Akşam planlayanlar (18:00-20:00)
  | "special-occasions" // Özel gün arayanlar (20:00-22:00)
  | "weekend-families"; // Hafta sonu aileler

/**
 * Message Type Strategy
 */
export type MessageType =
  | "start-your-day" // Güne başlarken
  | "take-a-break" // Mola ver, dinlen
  | "treat-yourself" // Kendine iyilik yap
  | "celebrate" // Kutla, özel an
  | "share-joy"; // Sevdiklerinle paylaş

/**
 * Day Preference
 */
export type DayPreference =
  | "weekday" // Hafta içi (Pazartesi-Cuma)
  | "weekend" // Hafta sonu (Cumartesi-Pazar)
  | "any"; // Her gün uygun

/**
 * Photo/Post Data
 */
export interface Photo {
  id: string;
  filename: string;
  originalUrl: string;
  enhancedUrl?: string;
  caption: string;
  uploadedAt: number;
  scheduledTime?: number;
  processed: boolean;
  status: "pending" | "processing" | "completed" | "failed";
  igPostId?: string;
  error?: string;

  // PRODUCT INFORMATION
  productCategory: ProductCategory;
  productSubType?: string; // "3-ball", "10-ball", "wedding-cake", etc.
  productName?: string; // "Antep Fıstıklı Çikolata", "Frambuazlı Macaron"

  // AI ENHANCEMENT SETTINGS
  aiModel: AIModel; // "gemini-flash" | "none"
  styleVariant: StyleVariant; // "pure-minimal" | "lifestyle-moments" | etc.
  faithfulness: number; // 0.0 - 1.0 (orijinale sadakat)
  isEnhanced?: boolean; // AI ile işlendi mi?
  enhancementError?: string; // AI hata mesajı (varsa)

  // SMART SCHEDULING
  targetAudience?: TargetAudience;
  optimalTime?: string; // Manuel override (HH:MM format)
  dayPreference?: DayPreference;
  messageType?: MessageType;

  // ANALYTICS (Post sonrası dolacak)
  analytics?: PostAnalytics;
}

/**
 * Instagram Post
 */
export interface InstagramPost {
  id: string;
  imageUrl: string;
  caption: string;
  timestamp: number;
}

/**
 * Post Analytics (Instagram'dan çekilecek)
 */
export interface PostAnalytics {
  postId: string;
  postedAt: string;
  dayOfWeek: string; // "Monday", "Tuesday", etc.
  likes: number;
  comments: number;
  saves: number;
  reach: number;
  impressions: number;
  engagement: number; // (likes + comments + saves) / reach
  performanceScore: number; // 0-100 calculated score
}

/**
 * Application Configuration
 */
export interface Config {
  instagram: {
    accountId: string;
    accessToken: string;
  };
  gemini: {
    apiKey: string;
  };
}

/**
 * Schedule Rule
 */
export interface ScheduleRule {
  weekday: string[]; // ["07:30", "08:00"]
  weekend: string[]; // ["09:00", "09:30"]
  message: string; // Default message template
  targetAudience?: TargetAudience;
}

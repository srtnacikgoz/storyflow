// Kuyruk item durumu
export type QueueStatus = "pending" | "processing" | "completed" | "failed";

// Ürün kategorileri
export type ProductCategory =
  | "viennoiserie"
  | "coffee"
  | "chocolate"
  | "small-desserts"
  | "slice-cakes"
  | "big-cakes"
  | "profiterole"
  | "special-orders";

// AI Model seçenekleri
// - gemini-flash: Gemini 2.5 Flash Image (hızlı, $0.01/görsel)
// - gemini-pro: Gemini 3 Pro Image Preview (kaliteli, $0.04/görsel)
// - none: AI işleme yok
export type AIModel = "gemini-flash" | "gemini-pro" | "none";

// Stil varyantları
export type StyleVariant =
  | "pure-minimal"
  | "lifestyle-moments"
  | "rustic-warmth"
  | "french-elegance";

// Kuyruk item'ı
export interface QueueItem {
  id: string;
  originalUrl: string;
  enhancedUrl?: string;
  productCategory: ProductCategory;
  productName?: string;
  caption: string;
  status: QueueStatus;
  uploadedAt: number;
  processedAt?: number;
  publishedAt?: number;
  storyId?: string;
  error?: string;
  // AI Enhancement alanları
  aiModel: AIModel;
  styleVariant: StyleVariant;
  faithfulness: number;
  isEnhanced?: boolean;
  enhancementError?: string;
}

// Kuyruk istatistikleri
export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

// API yanıt tipleri
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Health check yanıtı
export interface HealthCheckResponse {
  status: "healthy" | "degraded";
  timestamp: string;
  duration: string;
  checks: {
    instagram: { status: string; message?: string };
    queue: { status: string; message?: string };
  };
  version: string;
}

// AI kullanım istatistikleri
export interface UsageStats {
  today: {
    vision: { count: number; cost: number };
    dalle: { count: number; cost: number };
    gemini: { count: number; cost: number };
    total: number;
  };
  thisMonth: {
    vision: { count: number; cost: number };
    dalle: { count: number; cost: number };
    gemini: { count: number; cost: number };
    total: number;
  };
  allTime: {
    vision: { count: number; cost: number };
    dalle: { count: number; cost: number };
    gemini: { count: number; cost: number };
    total: number;
  };
}

// Kullanım kaydı
export interface UsageRecord {
  id?: string;
  type: "vision" | "dalle" | "instagram_post" | "gemini-flash" | "gemini-pro";
  cost: number;
  description: string;
  itemId?: string;
  timestamp: number;
  date: string;
}

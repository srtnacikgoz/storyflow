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
    total: number;
  };
  thisMonth: {
    vision: { count: number; cost: number };
    dalle: { count: number; cost: number };
    total: number;
  };
  allTime: {
    vision: { count: number; cost: number };
    dalle: { count: number; cost: number };
    total: number;
  };
}

// Kullanım kaydı
export interface UsageRecord {
  id?: string;
  type: "vision" | "dalle" | "instagram_post";
  cost: number;
  description: string;
  itemId?: string;
  timestamp: number;
  date: string;
}

// Kuyruk item durumu
export type QueueStatus = "pending" | "processing" | "scheduled" | "completed" | "failed";

// Zamanlama modu
export type SchedulingMode = "immediate" | "scheduled" | "optimal";

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
  // Caption template alanları
  captionTemplateId?: string;
  captionTemplateName?: string;
  captionVariables?: Record<string, string>;
  // Scheduling alanları
  schedulingMode: SchedulingMode;
  scheduledFor?: number; // Timestamp
  scheduledDayHour?: string; // "2_15" formatı
}

// Kuyruk istatistikleri
export interface QueueStats {
  pending: number;
  processing: number;
  scheduled: number;
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

// ==========================================
// Caption Template Types
// ==========================================

// Değişken tipleri
export type TemplateVariableType = "auto" | "text" | "select";

// Şablon değişkeni
export interface TemplateVariable {
  key: string;
  label: string;
  type: TemplateVariableType;
  required: boolean;
  defaultValue?: string;
  options?: string[]; // type: "select" için
  autoSource?: string; // type: "auto" için (Photo field adı)
}

// Caption şablonu
export interface CaptionTemplate {
  id: string;
  name: string;
  description: string;
  categories: (ProductCategory | "all")[];
  tags: string[];
  template: string; // "Sade'den {productName}"
  variables: TemplateVariable[];
  isActive: boolean;
  isDefault: boolean;
  priority: number;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
}

// Şablon oluşturma/güncelleme input'u
export type CaptionTemplateInput = Omit<
  CaptionTemplate,
  "id" | "createdAt" | "updatedAt" | "usageCount"
>;

// Render edilmiş caption
export interface RenderedCaption {
  templateId: string;
  templateName: string;
  caption: string;
  variables: Record<string, string>;
}

// ==========================================
// Best Time to Post Types (Phase 8)
// ==========================================

// Güven seviyesi
export type ConfidenceLevel = "low" | "medium" | "high";

// Zaman slot önerisi
export interface TimeSlotRecommendation {
  day: string; // "tuesday"
  dayTr: string; // "Salı"
  dayIndex: number; // 0-6
  hour: number; // 14
  hourFormatted: string; // "14:00"
  score: number; // 87
  confidence: ConfidenceLevel;
  basedOnPosts: number;
  avgEngagement?: number;
}

// Heatmap verisi
export interface TimeHeatmap {
  [dayIndex: number]: {
    [hour: number]: number;
  };
}

// Best Times API yanıtı
export interface BestTimesResponse {
  recommendations: TimeSlotRecommendation[];
  heatmap: TimeHeatmap;
  totalPosts: number;
  dataQuality: ConfidenceLevel;
  lastUpdated: number;
}

// Post analytics istatistikleri
export interface PostAnalyticsStats {
  totalPosts: number;
  postsWithEngagement: number;
  avgEngagementRate: number;
  mostActiveDay: string;
  mostActiveHour: number;
}

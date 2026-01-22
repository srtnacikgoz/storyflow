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
  caption?: string; // Artık kullanılmıyor - Instagram API caption desteklemiyor
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
  // Onay ayarları
  skipApproval?: boolean; // true ise Telegram onayı atlanır
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

// ==========================================
// Analytics Dashboard Types (Phase 9)
// ==========================================

// Tarih aralığı filtresi
export type DateRange = "today" | "week" | "month" | "all";

// Genel özet istatistikler
export interface AnalyticsSummary {
  totalPosts: number;
  postsToday: number;
  postsThisWeek: number;
  postsThisMonth: number;
  avgPostsPerDay: number;
  avgPostsPerWeek: number;
  pendingCount: number;
  scheduledCount: number;
  failedCount: number;
  approvedCount: number;
  rejectedCount: number;
  timeoutCount: number;
  approvalRate: number;
  lastPostAt?: number;
  calculatedAt: number;
}

// Kategori istatistiği
export interface CategoryStats {
  category: ProductCategory;
  categoryLabel: string;
  count: number;
  percentage: number;
}

// AI Model istatistiği
export interface AIModelStats {
  model: AIModel;
  modelLabel: string;
  count: number;
  percentage: number;
}

// Stil istatistiği
export interface StyleStats {
  style: StyleVariant;
  styleLabel: string;
  count: number;
  percentage: number;
}

// Şablon istatistiği
export interface TemplateStats {
  templateId: string;
  templateName: string;
  count: number;
  percentage: number;
}

// Günlük trend
export interface DailyTrend {
  date: string;
  dateLabel: string;
  count: number;
}

// Saatlik dağılım
export interface HourlyDistribution {
  hour: number;
  hourLabel: string;
  count: number;
}

// Gün dağılımı
export interface DayDistribution {
  dayIndex: number;
  dayLabel: string;
  count: number;
}

// Tam dashboard yanıtı
export interface AnalyticsDashboard {
  summary: AnalyticsSummary;
  categoryBreakdown: CategoryStats[];
  aiModelBreakdown: AIModelStats[];
  styleBreakdown: StyleStats[];
  templateBreakdown: TemplateStats[];
  dailyTrend: DailyTrend[];
  hourlyDistribution: HourlyDistribution[];
  dayDistribution: DayDistribution[];
}

// ==========================================
// Content Calendar Types (Phase 10)
// ==========================================

// Takvim görünüm modu
export type CalendarView = "week" | "month";

// Takvim item'ı (basitleştirilmiş QueueItem)
export interface CalendarItem {
  id: string;
  originalUrl: string;
  productName?: string;
  productCategory: ProductCategory;
  caption?: string; // Artık kullanılmıyor
  scheduledFor?: number;
  schedulingMode: SchedulingMode;
  status: QueueStatus;
}

// Heatmap verisi (gün ve saat bazlı skorlar)
export interface CalendarHeatmap {
  [dayIndex: number]: {
    [hour: number]: number;
  };
}

// Calendar API yanıtı
export interface CalendarData {
  items: CalendarItem[];
  pendingItems: CalendarItem[];
  heatmap: CalendarHeatmap;
}

// ==========================================
// Orchestrator Types (Phase 12)
// ==========================================

// Asset kategorileri
export type AssetCategory = "products" | "props" | "furniture" | "environments" | "pets" | "interior";

// Interior tipleri (mekan atmosferi - AI üretimi yapılmaz)
export type InteriorType = "vitrin" | "tezgah" | "oturma-alani" | "dekorasyon" | "genel-mekan";

// Ürün tipleri (orchestrator için)
export type OrchestratorProductType =
  | "croissants"
  | "pastas"
  | "chocolates"
  | "coffees";

// Prop tipleri
export type PropType = "plates" | "cups" | "cutlery" | "napkins";

// Mobilya tipleri
export type FurnitureType = "tables" | "chairs" | "decor";

// Ortam tipleri (iç mekan, dış mekan, pencere)
export type EnvironmentType = "indoor" | "outdoor" | "window" | "cafe" | "home";

// Evcil hayvan tipleri
export type PetType = "dogs" | "cats";

// Yeme şekli - ürün nasıl yenir
export type EatingMethod = "hand" | "fork" | "spoon" | "none";

// @deprecated - geriye uyumluluk için, yeni kodda EatingMethod kullanın
export type HoldingType = EatingMethod;

// Asset
export interface OrchestratorAsset {
  id: string;
  category: AssetCategory;
  subType: string;
  filename: string;
  storageUrl: string;
  thumbnailUrl?: string;
  visualProperties?: {
    dominantColors: string[];
    style: string;
    material?: string;
    shape?: string;
  };
  // Yeme şekli (sadece products için)
  eatingMethod?: EatingMethod;
  // Elle tutulabilir mi? (sadece products için - el senaryoları için)
  canBeHeldByHand?: boolean;
  // @deprecated - geriye uyumluluk için
  holdingType?: HoldingType;
  usageCount: number;
  lastUsedAt?: number;
  tags: string[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// Zaman dilimi kuralı
export interface TimeSlotRule {
  id: string;
  startHour: number;
  endHour: number;
  daysOfWeek: number[];
  productTypes: OrchestratorProductType[];
  allowPairing?: boolean;
  pairingWith?: OrchestratorProductType[];
  // Tema tercihi (yeni sistem)
  themeId?: string;
  // Senaryo tercihi (eski sistem, geriye dönük uyumluluk)
  scenarioPreference?: string[];
  isActive: boolean;
  priority: number;
}

// Tema tanımı
export interface Theme {
  id: string;
  name: string;
  description?: string;
  scenarios: string[];
  mood: string;
  petAllowed: boolean;
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
}

// Planlanmış slot durumu
export type ScheduledSlotStatus =
  | "pending"
  | "generating"
  | "awaiting_approval"
  | "approved"
  | "published"
  | "failed";

// Planlanmış slot
export interface ScheduledSlot {
  id: string;
  scheduledTime: number;
  timeSlotRuleId: string;
  status: ScheduledSlotStatus;
  pipelineResult?: PipelineResult;
  // Progress tracking alanları
  currentStage?: string;
  stageIndex?: number;
  totalStages?: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

// Pipeline aşaması
export type PipelineStage =
  | "asset_selection"
  | "scenario_selection"
  | "prompt_optimization"
  | "image_generation"
  | "quality_control"
  | "content_creation"
  | "telegram_approval"
  | "publishing";

// Pipeline durumu
export interface PipelineStatus {
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  failedStage?: PipelineStage;
  error?: string;
  startedAt: number;
  updatedAt: number;
}

// Pipeline sonucu
export interface PipelineResult {
  id?: string;
  status: PipelineStatus;
  assetSelection?: {
    product: OrchestratorAsset;
    plate?: OrchestratorAsset;
    cup?: OrchestratorAsset;
    table?: OrchestratorAsset;
    selectionReasoning: string;
  };
  scenarioSelection?: {
    scenarioId: string;
    scenarioName: string;
    reasoning: string;
    includesHands: boolean;
    handStyle?: string;
    composition: string;
  };
  optimizedPrompt?: {
    mainPrompt: string;
    negativePrompt: string;
    customizations: string[];
    aspectRatio: string;
    faithfulness: number;
  };
  generatedImage?: {
    imageBase64: string;
    mimeType: string;
    storageUrl?: string;
    model: string;
    cost: number;
    generatedAt: number;
    attemptNumber: number;
  };
  qualityControl?: {
    passed: boolean;
    score: number;
    evaluation: {
      productAccuracy: number;
      composition: number;
      lighting: number;
      realism: number;
      instagramReadiness: number;
    };
    feedback: string;
    improvementSuggestions?: string[];
    shouldRegenerate: boolean;
    regenerationHints?: string;
  };
  contentPackage?: {
    caption?: string; // Artık kullanılmıyor
    captionAlternatives?: string[];
    hashtags?: string[]; // Artık kullanılmıyor
    generatedAt?: number;
  };
  telegramMessageId?: number;
  approvalStatus?: "pending" | "approved" | "rejected" | "regenerate";
  approvalRespondedAt?: number;
  publishedAt?: number;
  instagramPostId?: string;
  totalCost: number;
  startedAt: number;
  completedAt?: number;
  totalDuration?: number;
}

// Orchestrator dashboard istatistikleri
export interface OrchestratorDashboardStats {
  assets: {
    total: number;
    byCategory: Record<string, number>;
  };
  rules: {
    total: number;
  };
  slots: {
    total: number;
    byStatus: Record<string, number>;
  };
  pipeline: {
    totalRuns: number;
    totalCost: string;
  };
}

// ==========================================
// AI Monitor Types
// ==========================================

// AI Provider tipi
export type AIProvider = "claude" | "gemini";

// AI Log aşaması (orchestrator pipeline aşamaları)
export type AILogStage =
  | "asset-selection"      // Claude: Asset seçimi
  | "scenario-selection"   // Claude: Senaryo seçimi
  | "prompt-optimization"  // Claude: Prompt optimizasyonu
  | "image-generation"     // Gemini: Görsel üretimi
  | "quality-control"      // Claude: Kalite kontrolü
  | "content-generation";  // Claude: Caption üretimi

// AI Log durumu
export type AILogStatus = "success" | "error" | "blocked";

// AI Log kaydı
export interface AILog {
  id: string;

  // Provider ve aşama bilgileri
  provider: AIProvider;
  stage: AILogStage;
  model: string;

  // Pipeline bilgileri
  pipelineId?: string;      // Orchestrator run ID
  slotId?: string;          // Time slot ID
  productType?: string;     // Ürün tipi

  // Prompt bilgileri
  systemPrompt?: string;    // Claude için system prompt
  userPrompt: string;       // Ana prompt
  negativePrompt?: string;  // Gemini negative prompt

  // Yanıt bilgileri
  response?: string;        // AI yanıtı (JSON veya text)
  responseData?: Record<string, unknown>; // Parse edilmiş yanıt

  // Durum
  status: AILogStatus;
  error?: string;           // Hata mesajı

  // Metrikler
  tokensUsed?: number;      // Token kullanımı (Claude)
  cost?: number;            // Maliyet (USD)
  durationMs: number;       // İşlem süresi (ms)

  // Görsel bilgileri (Gemini için)
  inputImageCount?: number;   // Input görsel sayısı
  outputImageGenerated?: boolean;

  // Meta
  createdAt: number;        // Timestamp
}

// AI Stats (istatistikler)
export interface AIStats {
  totalCalls: number;
  claudeCalls: number;
  geminiCalls: number;
  successRate: number;
  totalCost: number;
  avgDurationMs: number;
  byStage: Record<string, number>;
  errorCount: number;
}

// ==========================================
// AI Feedback System Types
// ==========================================

// Sorun kategorileri
export type IssueCategoryId =
  | "holding-mismatch"    // Tutma şekli uyumsuz
  | "product-unrecognized" // Ürün tanınmıyor
  | "composition-bad"      // Kompozisyon kötü
  | "lighting-bad"         // Işık sorunu
  | "realism-low"          // Gerçekçilik düşük
  | "background-issue"     // Arka plan sorunu
  | "hand-anatomy"         // El anatomisi bozuk
  | "color-mismatch"       // Renk uyumsuzluğu
  | "other";               // Diğer

// Sorun kategori açıklamaları
export const ISSUE_CATEGORIES: Record<IssueCategoryId, { label: string; description: string }> = {
  "holding-mismatch": {
    label: "Tutma Şekli Uyumsuz",
    description: "Ürün elle tutulmaması gereken şekilde tutulmuş",
  },
  "product-unrecognized": {
    label: "Ürün Tanınmıyor",
    description: "Ürün bozuk görünüyor veya tanınmıyor",
  },
  "composition-bad": {
    label: "Kompozisyon Kötü",
    description: "Görsel düzeni ve yerleşim sorunlu",
  },
  "lighting-bad": {
    label: "Işık Sorunu",
    description: "Aydınlatma yapay veya uygunsuz",
  },
  "realism-low": {
    label: "Gerçekçilik Düşük",
    description: "Görsel yapay belli oluyor",
  },
  "background-issue": {
    label: "Arka Plan Sorunu",
    description: "Arka plan uygunsuz veya dikkat dağıtıcı",
  },
  "hand-anatomy": {
    label: "El Anatomisi Bozuk",
    description: "Parmak sayısı veya pozisyon hatası",
  },
  "color-mismatch": {
    label: "Renk Uyumsuzluğu",
    description: "Renkler referans görselle uyuşmuyor",
  },
  "other": {
    label: "Diğer",
    description: "Yukarıdakilerden farklı bir sorun",
  },
};

// Kullanıcı geri bildirimi
export interface IssueFeedback {
  id: string;
  slotId: string;
  pipelineId?: string;
  category: IssueCategoryId;
  customNote?: string;
  scenarioId?: string;
  productType?: string;
  productId?: string;
  handStyleId?: string;
  compositionId?: string;
  createdAt: number;
  resolved: boolean;
  resolvedAt?: number;
}

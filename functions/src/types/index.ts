/**
 * TypeScript Type Definitions
 * Instagram Automation - Sade Patisserie
 */

// ==========================================
// AI MONITOR TYPES
// ==========================================

/**
 * AI Service Provider
 */
export type AIProvider = "claude" | "gemini";

/**
 * AI Log Stage - Orchestrator pipeline aşamaları
 */
export type AILogStage =
  | "asset-selection"    // Claude: Asset seçimi
  | "scenario-selection" // Claude: Senaryo seçimi
  | "prompt-optimization"// Claude: Prompt optimizasyonu
  | "image-generation"   // Gemini: Görsel üretimi
  | "quality-control"    // Claude: Kalite kontrolü
  | "content-generation";// Claude: Caption üretimi

/**
 * AI Log Status
 */
export type AILogStatus = "success" | "error" | "blocked";

/**
 * AI Log Entry - Her AI çağrısının kaydı
 */
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
 * Approval Status for Human-in-the-Loop
 */
export type ApprovalStatus =
  | "none" // Henüz onay istenmedi
  | "awaiting" // Telegram'da onay bekliyor
  | "approved" // Kullanıcı onayladı
  | "rejected" // Kullanıcı reddetti
  | "timeout"; // Zaman aşımı (otomatik iptal)

/**
 * Scheduling Mode
 * - immediate: Telegram onayından sonra hemen paylaş
 * - scheduled: Belirli bir tarih/saatte paylaş
 * - optimal: Sistem en iyi zamanı seçsin
 */
export type SchedulingMode = "immediate" | "scheduled" | "optimal";

/**
 * Photo/Post Data
 */
export interface Photo {
  id: string;
  filename: string;
  originalUrl: string;
  enhancedUrl?: string;
  caption?: string; // Artık kullanılmıyor - Instagram API caption desteklemiyor
  uploadedAt: number;
  processed: boolean;
  status: "pending" | "processing" | "awaiting_approval" | "scheduled" | "completed" | "failed" | "rejected";

  // SCHEDULING (Phase 8)
  schedulingMode: SchedulingMode; // "immediate" | "scheduled" | "optimal"
  scheduledFor?: number; // Timestamp - scheduled/optimal modunda paylaşım zamanı
  scheduledDayHour?: string; // "2_15" formatı (Salı 15:00) - optimal mod için
  igPostId?: string;
  error?: string;

  // ORCHESTRATOR INTEGRATION
  slotId?: string; // scheduled-slots koleksiyonundaki referans ID

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

  // TELEGRAM APPROVAL (Human-in-the-Loop)
  approvalStatus?: ApprovalStatus;
  approvalRequestedAt?: number; // Timestamp
  approvalRespondedAt?: number; // Timestamp
  telegramMessageId?: number; // Telegram mesaj ID (düzenleme için)
  rejectionReason?: string; // Kullanıcı red sebebi yazdıysa
  skipApproval?: boolean; // true ise Telegram onayı atlanır, direkt paylaşılır

  // CAPTION TEMPLATE (Phase 7)
  captionTemplateId?: string; // Seçilen şablon ID
  captionTemplateName?: string; // Şablon adı (log için)
  captionVariables?: Record<string, string>; // Değişken değerleri

  // PHOTO PROMPT STUDIO INTEGRATION (Phase 11)
  source?: "admin-panel" | "photo-prompt-studio"; // Kaynak sistem
  customPrompt?: string; // Studio'dan gelen ana prompt
  customNegativePrompt?: string; // Studio'dan gelen negative prompt
  promptPlatform?: "gemini" | "dalle" | "midjourney"; // Prompt platformu
  promptFormat?: "1:1" | "4:5" | "9:16"; // Görsel formatı
  studioAnalysis?: StudioAnalysis; // Görsel analiz verileri
}

/**
 * Instagram Post
 */
export interface InstagramPost {
  id: string;
  imageUrl: string;
  caption?: string; // Artık kullanılmıyor
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
  telegram?: {
    botToken: string;
    chatId: string;
    approvalTimeout: number; // Dakika cinsinden (default: 15)
  };
}

/**
 * Telegram Config (ayrı export)
 */
export interface TelegramConfig {
  botToken: string;
  chatId: string;
  approvalTimeout: number;
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

// ==========================================
// PHOTO PROMPT STUDIO INTEGRATION (Phase 11)
// ==========================================

/**
 * Studio Analysis Data
 * Photo Prompt Studio'dan gelen görsel analiz verileri
 */
export interface StudioAnalysis {
  productType: string; // "tiramisu", "croissant", "macaron"
  dominantColors: string[]; // ["#5D4037", "#F5F5DC", "#3E2723"]
  hasTypography: boolean; // Görsel üzerinde metin var mı?
  suggestedStyle: string; // "lifestyle-moments", "pure-minimal"
  suggestedLight?: string; // "SIDE_LIGHT", "BACK_LIGHT"
  suggestedAction?: string; // "DIP", "CUT", "POUR"
  container?: {
    type: string; // "glass", "plate", "box"
    shape?: string; // "rectangular", "round"
    material?: string; // "transparent", "ceramic"
  };
}

/**
 * Prompt Studio Request (API endpoint için)
 */
export interface PromptStudioRequest {
  // Görsel bilgisi
  imageUrl: string;

  // Analiz sonuçları
  analysis?: StudioAnalysis;

  // Prompt bilgileri
  prompt: {
    main: string;
    negative?: string;
    platform?: "gemini" | "dalle" | "midjourney";
    format?: "1:1" | "4:5" | "9:16";
  };

  // Ayarlar
  settings?: {
    category?: ProductCategory;
    styleVariant?: StyleVariant;
    faithfulness?: number;
    captionTemplateId?: string;
    schedulingMode?: SchedulingMode;
    scheduledTime?: string; // ISO date string
  };

  // Meta
  productName?: string;
  notes?: string;
}

/**
 * Prompt Studio Response
 */
export interface PromptStudioResponse {
  success: boolean;
  message: string;
  itemId?: string;
  status?: string;
  error?: string;
}

// ==========================================
// CAPTION TEMPLATE SYSTEM (Phase 7)
// ==========================================

/**
 * Template Variable Types
 * - auto: Otomatik doldurulur (Photo field'dan)
 * - text: Kullanıcı manuel girer
 * - select: Önceden tanımlı listeden seçer
 */
export type TemplateVariableType = "auto" | "text" | "select";

/**
 * Template Variable Definition
 * Şablondaki {variable} placeholder'larını tanımlar
 */
export interface TemplateVariable {
  key: string; // "productName", "season", "customNote"
  label: string; // UI'da gösterilecek etiket
  type: TemplateVariableType;
  required: boolean;
  defaultValue?: string;
  options?: string[]; // type: "select" için seçenekler
  autoSource?: string; // type: "auto" için kaynak field (Photo interface'den)
}

/**
 * Caption Template
 * Firestore: caption-templates koleksiyonu
 */
export interface CaptionTemplate {
  id: string;

  // Temel Bilgiler
  name: string; // "Minimal", "Mevsimsel", "Hikaye"
  description: string; // Admin için açıklama

  // Kategori & Etiketler
  categories: (ProductCategory | "all")[]; // Hangi kategorilerde kullanılabilir
  tags: string[]; // ["seasonal", "launch", "classic"]

  // Template İçeriği
  template: string; // "Sade'den {productName}\n{seasonalNote}"
  variables: TemplateVariable[];

  // Ayarlar
  isActive: boolean; // Aktif/Pasif
  isDefault: boolean; // Kategori için varsayılan mı?
  priority: number; // Sıralama (düşük = önce gösterilir)

  // Meta
  createdAt: number;
  updatedAt: number;
  usageCount: number; // Kaç kez kullanıldı (analytics)
}

/**
 * Rendered Caption Result
 * Template + variables birleştirilmiş sonuç
 */
export interface RenderedCaption {
  templateId: string;
  templateName: string;
  caption: string; // Final rendered caption
  variables: Record<string, string>; // Kullanılan değişkenler
}

/**
 * Caption Template Input (Create/Update)
 * id ve meta fieldlar hariç
 */
export type CaptionTemplateInput = Omit<
  CaptionTemplate,
  "id" | "createdAt" | "updatedAt" | "usageCount"
>;

// ==========================================
// BEST TIME TO POST SYSTEM (Phase 8)
// ==========================================

/**
 * Day of Week (0 = Pazar, 6 = Cumartesi)
 */
export type DayOfWeekIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Day names in Turkish
 */
export const DAY_NAMES: Record<DayOfWeekIndex, string> = {
  0: "Pazar",
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
};

/**
 * Day names in English (for API)
 */
export const DAY_NAMES_EN: Record<DayOfWeekIndex, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

/**
 * Confidence Level for Recommendations
 */
export type ConfidenceLevel = "low" | "medium" | "high";

/**
 * Post Analytics Record (Firestore: post-analytics)
 * Her paylaşım için analitik verisi
 */
export interface PostAnalyticsRecord {
  id: string;
  photoId: string;
  storyId?: string;

  // Zaman bilgileri
  postedAt: number; // Timestamp
  dayOfWeek: DayOfWeekIndex;
  hourOfDay: number; // 0-23

  // Engagement metrikleri (opsiyonel, sonradan güncellenebilir)
  impressions?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  saves?: number;
  shares?: number;

  // Hesaplanan metrik
  engagementRate?: number; // (likes + comments + saves) / reach * 100

  // Meta
  createdAt: number;
  updatedAt?: number;
}

/**
 * Time Score (Cache: time-scores)
 * Her gün/saat kombinasyonu için skor
 */
export interface TimeScore {
  id: string; // "day_hour" formatı (örn: "1_14")
  dayOfWeek: DayOfWeekIndex;
  hourOfDay: number;

  // Skorlar (0-100)
  defaultScore: number; // Araştırma verisinden
  historicalScore: number; // Geçmiş veriden
  combinedScore: number; // Ağırlıklı ortalama

  // Meta
  postCount: number; // Bu slot'taki toplam paylaşım
  avgEngagement: number; // Ortalama engagement rate
  confidence: ConfidenceLevel;
  lastCalculated: number; // Timestamp
}

/**
 * Time Slot Recommendation
 * En iyi paylaşım zamanı önerisi
 */
export interface TimeSlotRecommendation {
  day: string; // "tuesday"
  dayTr: string; // "Salı"
  dayIndex: DayOfWeekIndex;
  hour: number; // 14
  hourFormatted: string; // "14:00"
  score: number; // 87
  confidence: ConfidenceLevel;
  basedOnPosts: number; // Bu slot'taki veri sayısı
  avgEngagement?: number;
}

/**
 * Heatmap Data
 * Haftalık saat bazlı skor matrisi
 */
export interface TimeHeatmap {
  // day index -> hour -> score
  [dayIndex: number]: {
    [hour: number]: number;
  };
}

/**
 * Best Times Response
 */
export interface BestTimesResponse {
  recommendations: TimeSlotRecommendation[];
  heatmap: TimeHeatmap;
  totalPosts: number;
  dataQuality: ConfidenceLevel;
  lastUpdated: number;
}

// ==========================================
// ANALYTICS DASHBOARD (Phase 9)
// ==========================================

/**
 * Tarih aralığı filtresi
 */
export type DateRange = "today" | "week" | "month" | "all";

/**
 * Genel özet istatistikler
 */
export interface AnalyticsSummary {
  // Paylaşım sayıları
  totalPosts: number;
  postsToday: number;
  postsThisWeek: number;
  postsThisMonth: number;

  // Ortalamalar
  avgPostsPerDay: number;
  avgPostsPerWeek: number;

  // Kuyruk durumu
  pendingCount: number;
  scheduledCount: number;
  failedCount: number;

  // Onay oranları
  approvedCount: number;
  rejectedCount: number;
  timeoutCount: number;
  approvalRate: number; // 0-100%

  // Son güncelleme
  lastPostAt?: number;
  calculatedAt: number;
}

/**
 * Kategori bazlı istatistik
 */
export interface CategoryStats {
  category: ProductCategory;
  categoryLabel: string;
  count: number;
  percentage: number;
}

/**
 * AI Model kullanım istatistiği
 */
export interface AIModelStats {
  model: AIModel;
  modelLabel: string;
  count: number;
  percentage: number;
}

/**
 * Stil kullanım istatistiği
 */
export interface StyleStats {
  style: StyleVariant;
  styleLabel: string;
  count: number;
  percentage: number;
}

/**
 * Şablon kullanım istatistiği
 */
export interface TemplateStats {
  templateId: string;
  templateName: string;
  count: number;
  percentage: number;
}

/**
 * Günlük paylaşım trendi
 */
export interface DailyTrend {
  date: string; // "2026-01-15"
  dateLabel: string; // "15 Oca"
  count: number;
}

/**
 * Saatlik dağılım
 */
export interface HourlyDistribution {
  hour: number; // 0-23
  hourLabel: string; // "09:00"
  count: number;
}

/**
 * Haftalık gün dağılımı
 */
export interface DayDistribution {
  dayIndex: DayOfWeekIndex;
  dayLabel: string; // "Pazartesi"
  count: number;
}

/**
 * Tam Analytics Response
 */
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

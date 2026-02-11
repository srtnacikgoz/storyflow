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
  | "config-snapshot" // YENİ: Pipeline başındaki config durumu
  | "rules-applied" // YENİ: Uygulanan kurallar ve bloklamalar
  | "asset-selection" // Asset seçimi (Claude/Gemini)
  | "scenario-selection" // Senaryo seçimi (Claude/Gemini)
  | "prompt-optimization" // Prompt optimizasyonu (Claude/Gemini)
  | "prompt-building" // YENİ: Prompt oluşturma (Gemini)
  | "image-generation" // Görsel üretimi (Gemini)
  | "quality-control" // Kalite kontrolü (Claude)
  | "visual-critic" // YENİ: Visual Critic analizi
  | "content-generation"; // Caption üretimi (Claude)

/**
 * AI Log Status
 */
export type AILogStatus = "success" | "error" | "blocked";

/**
 * Config Snapshot (config-snapshot stage için)
 */
export interface ConfigSnapshot {
  themeId?: string;
  themeName?: string;
  moodName?: string;
  timeOfDay?: string;
  aspectRatio?: string;
  scheduledHour?: number;
}

/**
 * Applied Rules (rules-applied stage için)
 */
export interface AppliedRules {
  userRules?: Array<{
    id: string;
    category: string;
    content: string;
    ruleType: "do" | "dont";
    applied: boolean;
  }>;
  blockedAssets?: Array<{
    id: string;
    name: string;
    type: string;
    reason: string;
  }>;
  feedbackRules?: Array<{
    type: string;
    count: number;
    note?: string;
  }>;
}

/**
 * Prompt Building adımlarının karar kaydı
 * Her adımda ne geldi, eşleşti mi, sonuç ne oldu
 */
export interface PromptBuildingStep {
  step: string; // "mood-selection", "lighting-selection", "weather-override", vb.
  input: string | null; // Gelen girdi (ID, parametre)
  matched: boolean; // Preset/veri eşleşti mi?
  result: string | null; // Seçilen/uygulanan sonuç
  fallback: boolean; // Fallback mekanizma kullanıldı mı?
  details?: Record<string, unknown>; // Ek bilgi (atmosphere, prompt, temperature vb.)
}

/**
 * Decision Details (asset/scenario/prompt stages için)
 */
export interface DecisionDetails {
  selectedAssets?: Record<string, {
    id: string;
    name: string;
    filename: string;
    type: string;
    reason?: string;
  }>;
  selectedScenario?: {
    id: string;
    name: string;
    description?: string;
    includesHands: boolean;
    handStyle?: string;
    compositionId?: string;
    compositionNotes?: string;
    reason?: string;
  };
  promptDetails?: {
    mainPrompt: string;
    negativePrompt?: string;
    customizations?: string[];
    referenceImages?: Array<{
      type: string;
      filename: string;
    }>;
  };
  // Prompt building karar zinciri (tüm adımlar)
  promptBuildingSteps?: PromptBuildingStep[];
}

/**
 * Retry Info (image-generation için)
 */
export interface RetryInfo {
  attemptNumber: number;
  maxAttempts: number;
  previousErrors?: string[];
}

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
  pipelineId?: string; // Orchestrator run ID
  slotId?: string; // Time slot ID
  productType?: string; // Ürün tipi

  // Prompt bilgileri
  systemPrompt?: string; // Claude için system prompt
  userPrompt: string; // Ana prompt
  negativePrompt?: string; // Gemini negative prompt

  // Yanıt bilgileri
  response?: string; // AI yanıtı (JSON veya text)
  responseData?: Record<string, unknown>; // Parse edilmiş yanıt

  // Durum
  status: AILogStatus;
  error?: string; // Hata mesajı

  // Metrikler
  tokensUsed?: number; // Token kullanımı (Claude)
  cost?: number; // Maliyet (USD)
  durationMs: number; // İşlem süresi (ms)

  // Görsel bilgileri (Gemini için)
  inputImageCount?: number; // Input görsel sayısı
  outputImageGenerated?: boolean;

  // YENİ: Config Context
  configSnapshot?: ConfigSnapshot;

  // YENİ: Applied Rules
  appliedRules?: AppliedRules;

  // YENİ: Decision Details
  decisionDetails?: DecisionDetails;

  // YENİ: Retry bilgisi
  retryInfo?: RetryInfo;

  // Meta
  createdAt: number; // Timestamp
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
 * Granüler Doku Kategorileri
 * GEMINI-TEXTURE-DICTIONARY.md'den türetilen alt kategoriler
 * ProductCategory'den ayrı çünkü bunlar ürün değil, doku profilleri
 */
export type TextureCategory =
  | ProductCategory // Ana ürün kategorileri de kullanılabilir
  | "chocolate-tempered" // Temperli çikolata parlaklığı
  | "chocolate-glaze" // Ayna glazür
  | "chocolate-snap" // Kırık doku
  | "chocolate-cocoa-dust" // Kakao tozu kaplama
  | "cream-buttercream" // Buttercream
  | "cream-mousse" // Mus
  | "cream-meringue" // Beze
  | "cream-ganache" // Ganaj
  | "pastry-laminated" // Katmanlı hamur
  | "pastry-crumb" // Gözenekli iç
  | "pastry-crust" // Kabuk
  | "pastry-tart-edge"; // Tart kenarı

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

// ==========================================
// GEMINI TERMINOLOGY SYSTEM
// Gemini-native prompt oluşturma için type tanımları
// Kaynak: GEMINI-TERMINOLOGY-DICTIONARY.md
// ==========================================

/**
 * Işık Yönü (Light Direction)
 * Gemini'nin en iyi anladığı ışık yönü terimleri
 */
export type LightDirection =
  | "backlighting" // Arkadan aydınlatma - sıvı parlaması, buhar
  | "side-lighting-90" // Yan ışık 90° - doku vurgulama
  | "side-lighting-45" // Yan ışık 45° (Rembrandt) - hacim + yumuşak gölge
  | "rim-lighting" // Kenar ışığı - arka plandan ayırma
  | "diffused-window"; // Pencere ışığı - yumuşak, doğal

/**
 * Işık Kalitesi (Light Quality)
 */
export type LightQuality =
  | "diffused-softbox" // Yumuşak geçişli gölgeler
  | "hard-light" // Dramatik, yüksek kontrast
  | "natural-window" // Doğal pencere ışığı
  | "golden-hour"; // Altın saat - sıcak tonlar

/**
 * Renk Sıcaklığı (Color Temperature)
 * Kelvin değerleri
 */
export type ColorTemperature =
  | "3000K" // Çok sıcak (mum ışığı)
  | "3200K" // Sıcak (cozy evening)
  | "3500K" // Sıcak (golden hour)
  | "5000K" // Gün ışığı (nötr)
  | "5500K" // Parlak gün ışığı
  | "6500K"; // Soğuk (bulutlu gün)

/**
 * Işıklandırma Preset'i
 * Admin panelde dropdown olarak gösterilecek
 */
export interface LightingPreset {
  id: string;
  name: string; // "Altın Saat" (TR - UI için)
  nameEn: string; // "Golden Hour" (EN - log için)
  direction: LightDirection;
  quality: LightQuality;
  temperature: ColorTemperature;
  geminiTerms: string[]; // ["golden hour warm sunlight", "45-degree angle", "long shadows"]
  geminiPrompt: string; // Tam Gemini-ready açıklama
  bestFor: string[]; // ["warm", "romantic", "cozy", "rustic"]
  technicalDetails: string; // "f/2.8, ISO 100, soft diffusion"
  isActive: boolean;
  sortOrder: number;
}

/**
 * El Tutuş Tipi (Grip Type)
 */
export type GripType =
  | "cupping" // Avuç içinde kavrama (kahve fincanı)
  | "pinching" // Parmak uçlarıyla tutma (çikolata, makaron)
  | "cradling" // Nazikçe taşıma (pasta tabağı)
  | "presenting" // Sunma pozu (ürünü gösterme)
  | "breaking" // Kırma/bölme (kruvasan)
  | "dipping"; // Batırma (çikolata, sos)

/**
 * Kompozisyon Giriş Noktası
 */
export type EntryPoint =
  | "bottom-right" // Sağ alt köşe (45° açı)
  | "bottom-left" // Sol alt köşe (45° açı)
  | "top-right" // Sağ üst köşe
  | "top-left" // Sol üst köşe
  | "side-right" // Sağ kenar
  | "side-left" // Sol kenar
  | "right-side" // Sağ kenar (alias)
  | "top-down" // Yukarıdan aşağı
  | "center"; // Merkez (sadece sunum)

/**
 * El Poz Şablonu
 * Admin panelde seçilebilir el stilleri
 */
export interface HandPose {
  id: string;
  name: string; // "Zarif Kavrama" (TR)
  nameEn: string; // "Elegant Grip" (EN)
  gripType: GripType;
  entryPoint: EntryPoint;
  fingerPosition: string; // "fingers slightly curved, thumb supporting"
  wristAngle: string; // "slight 15-degree tilt"
  geminiTerms: string[]; // ["elegant feminine hand", "gentle grip", "natural skin texture"]
  geminiPrompt: string; // Tam Gemini-ready açıklama
  skinDetails: string[]; // ["subsurface scattering", "visible pores", "natural nails"]
  avoidTerms: string[]; // ["deformed hands", "extra fingers"]
  bestFor: ProductCategory[]; // Hangi ürün kategorileri için uygun
  isActive: boolean;
  sortOrder: number;
}

/**
 * Mood Atmosfer Stili
 */
export type MoodStyle =
  | "morning-ritual" // Sabah rutini - tazelik, yeni başlangıç
  | "rustic-heritage" // Geleneksel miras - nostalji, el yapımı
  | "gourmet-midnight" // Gece yarısı gurmesi - lüks, tutku
  | "bright-airy" // Parlak ve hafif - enerji, canlılık
  | "cozy-intimate"; // Sıcak ve samimi - ev sıcaklığı

/**
 * Mood Tanımı
 * Tema ve atmosfer ayarları
 */
export interface MoodDefinition {
  id: string;
  name: string; // "Sabah Enerjisi" (TR)
  nameEn: string; // "Morning Energy" (EN)
  style: MoodStyle;
  lightingPresetId: string; // İlişkili ışık preset'i
  colorPalette: string[]; // ["warm earth tones", "golden", "cream"]
  temperature: ColorTemperature;
  depthOfField: string; // "shallow f/2.0" | "medium f/4.0"
  backgroundStyle: string; // "blurred cafe terrace", "dark slate"
  geminiAtmosphere: string; // Tam atmosfer açıklaması
  geminiTerms: string[]; // ["bright and airy", "natural morning light", "fresh energy"]
  avoidTerms: string[]; // ["dark", "moody", "dramatic"]
  bestTimeOfDay: string[]; // ["morning", "brunch"]
  isActive: boolean;
  sortOrder: number;
}

/**
 * Ürün Doku Profili
 * Her ürün kategorisi veya doku alt kategorisi için kritik doku terimleri
 */
export interface ProductTextureProfile {
  id: string;
  category: TextureCategory; // Ana kategori veya granüler doku kategorisi
  heroFeature: string; // "lamination" | "cross-section" | "reflection"
  criticalTerms: string[]; // ["honeycomb structure", "shattered flakes"]
  surfaceType: string; // "matte" | "glossy" | "porous" | "moist"
  geminiPrompt: string; // Ürün-spesifik doku açıklaması
  lightingNotes: string; // "requires rim lighting for gloss"
  avoidTerms: string[]; // ["plastic texture", "wax"]
}

/**
 * Negative Prompt Kategorisi
 */
export type NegativeCategory =
  | "technical" // blur, grain, watermark
  | "food-styling" // plastic, wax, burnt
  | "anatomy" // deformed hands, extra fingers
  | "composition"; // cluttered background

/**
 * Negative Prompt Koleksiyonu
 */
export interface NegativePromptSet {
  id: string;
  name: string;
  category: NegativeCategory;
  terms: string[]; // ["blur", "grain", "low resolution"]
  geminiFormat: string; // "Avoid any blur, grain, or low resolution"
  isDefault: boolean; // Varsayılan olarak eklensin mi?
  applicableTo: ProductCategory[] | "all";
}

/**
 * Gemini Prompt Yapılandırması
 * Orchestrator'da kullanılacak tam yapılandırma
 */
export interface GeminiPromptConfig {
  // Seçilen preset'ler
  lightingPresetId: string;
  handPoseId?: string; // El varsa
  compositionTemplateId: string;
  moodDefinitionId: string;
  productTextureId: string;

  // Negative prompt setleri
  negativePromptSetIds: string[];

  // Ek özelleştirmeler
  customTerms?: string[]; // Ek Gemini terimleri
  customAvoidTerms?: string[]; // Ek kaçınılacak terimler

  // Teknik ayarlar
  aspectRatio: "9:16" | "4:5" | "1:1";
  lens: string; // "85mm prime"
  aperture: string; // "f/2.2"
}

/**
 * Oluşturulmuş Gemini Prompt
 * buildGeminiPrompt() fonksiyonunun çıktısı
 */
export interface GeneratedGeminiPrompt {
  // Ana prompt bölümleri
  subjectMateriality: string;
  interaction?: string; // El varsa
  lightingPhysics: string;
  atmosphereComposition: string;
  technicalSpecs: string;
  avoidSection: string;

  // Birleştirilmiş final prompt
  fullPrompt: string;

  // Meta bilgiler
  usedPresets: {
    lighting: string;
    handPose?: string;
    composition: string;
    mood: string;
  };
  generatedAt: number;
}

// ==========================================
// TEXTURE-LIGHTING EŞLEŞTİRME (GEMINI-TEXTURE-DICTIONARY)
// ==========================================

/**
 * Doku Tipi
 * surfaceType değerleri için tip güvenliği
 */
export type SurfaceType =
  | "glossy"       // Parlak (temperli çikolata, glaze)
  | "moist"        // Nemli (kremalar, yaş kek)
  | "porous"       // Gözenekli (ekmek içi, sünger kek)
  | "matte"        // Mat (kakao tozu kaplama)
  | "caramelized"  // Karamelize (kabuk, beze uçları)
  | "liquid"       // Sıvı (kahve, bal, sos)
  | "mixed"        // Karışık
  // === YENİ TİPLER (Gemini Review 2026-02-03) ===
  | "flaky"        // Katmanlı/pullu (kruvasan, milföy)
  | "powdery"      // Unlu/pudra şekerli (alman pastası)
  | "velvety";     // Kadifemsi (velvet sprey çikolata)

/**
 * Işık-Doku Eşleştirmesi
 * GEMINI-TEXTURE-DICTIONARY.md'den derlenen kurallar
 * "Işık Olmadan Doku Olmaz" prensibi
 */
/**
 * Işık Yönlendirme Tipleri
 * Optik fizik ve gastronomi fotoğrafçılığı terminolojisi
 */
export type LightingDirection =
  | "side-lighting"        // Yan ışık (45-90°)
  | "soft-diffused"        // Yumuşak yayılmış
  | "backlighting"         // Arka ışık
  | "rim-lighting"         // Kenar ışığı
  // === YENİ TİPLER (Gemini Review 2026-02-03) ===
  | "high-angle-specular"  // Yüksek açılı specular (glossy için)
  | "raking-light"         // Yüzeyi yalayan ışık (porous için)
  | "high-contrast-side"   // Yüksek kontrastlı yan (flaky için)
  | "flat-frontal"         // Düz ön ışık (powdery için)
  | "top-down-ambient";    // Yukarıdan ambient (velvety için)

export interface TextureLightingMapping {
  surfaceType: SurfaceType;
  recommendedLighting: LightingDirection;
  reason: string; // Neden bu ışık öneriliyor
  geminiTerms: string[]; // Işık için Gemini terimleri
  bestLightingPresetIds: string[]; // Önerilen preset ID'leri
}

/**
 * Prompt Pollution Terimi
 * İşe yaramayan, kaçınılması gereken terimler
 */
export interface PromptPollutionTerm {
  term: string;
  reason: string; // Neden işe yaramıyor
  severity: "warning" | "block"; // Uyar mı yoksa engelle mi
  alternative?: string; // Varsa alternatif terim
}

// ==========================================
// ATMOSPHERIC INTEGRATION (Renk Sıcaklığı Uyumu)
// Mood.temperature + Product.colorExpectation çelişki çözümü
// ==========================================

/**
 * Renk Sıcaklığı Aralığı (Kelvin)
 */
export interface TemperatureRange {
  min: number; // Minimum Kelvin (örn: 2700)
  max: number; // Maximum Kelvin (örn: 3500)
  label: string; // "warm amber" | "neutral daylight" | "cool blue"
}

/**
 * Ürün Kategorisi Renk Beklentisi
 * Her ürün kategorisinin doğal görünmesi için tercih ettiği sıcaklık aralığı
 */
export interface ProductColorExpectation {
  category: ProductCategory;
  preferredRange: TemperatureRange; // İdeal sıcaklık aralığı
  tolerableRange: TemperatureRange; // Kabul edilebilir aralık
  forbiddenRange?: TemperatureRange; // Kesinlikle yasak (örn: çikolata için mavi)
  dominantHue: string; // "warm brown" | "golden" | "cream" | "dark"
  colorGradingHint: string; // Renk düzeltme önerisi
}

/**
 * Atmosferik Çelişki Sonucu
 */
export type AtmosphericConflictSeverity = "none" | "minor" | "moderate" | "severe";

export interface AtmosphericConflictResult {
  hasConflict: boolean;
  severity: AtmosphericConflictSeverity;
  moodTemperature: number; // Kelvin
  productPreferredRange: TemperatureRange;
  delta: number; // Fark (Kelvin)
  recommendation: {
    adjustedTemperature?: number; // Önerilen düzeltilmiş sıcaklık
    colorGradingHint: string; // Prompt'a eklenecek renk ipucu
    warnings: string[]; // Kullanıcıya gösterilecek uyarılar
  };
}

/**
 * Renk Harmonisi Profili
 * Ürün ve mood arasındaki renk uyumu
 */
export interface ColorHarmonyProfile {
  productCategory: ProductCategory;
  moodStyle: string; // "morning-ritual" | "rustic-heritage" | "gourmet-midnight"
  harmonyScore: number; // 0-100 arası uyum skoru
  paletteOverlap: string[]; // Ortak renkler
  conflictingColors: string[]; // Çakışan renkler
  suggestedAdjustment: string; // "warm up slightly" | "cool down" | "none"
}

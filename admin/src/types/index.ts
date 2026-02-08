// Kuyruk item durumu (Updated)
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
    gemini?: { status: string; message?: string };
    storage?: { status: string; message?: string };
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
// Asset kategorileri
export type AssetCategory = "products" | "props" | "furniture" | "environments" | "pets" | "interior" | "accessories" | "tables" | "plates" | "cups" | "cutlery" | "napkins" | "decor";

// Interior tipleri (mekan atmosferi - AI üretimi yapılmaz)
export type InteriorType = "vitrin" | "tezgah" | "oturma-alani" | "dekorasyon" | "genel-mekan";

// Aksesuar alt kategorileri (gerçekçi pastane deneyimi için masaya konulan objeler)
export type AccessoryType =
  // Props (Dekorlar - Set Designer Skill)
  | "textile"      // Peçete, örtü, runner
  | "cutlery"      // Çatal, bıçak, kaşık
  | "decoration"   // Vazo, çiçek, dergi, gözlük
  | "ingredient"   // Un, pudra şekeri, çikolata parçaları
  // Legacy (Eski Tipler - Geriye uyumluluk için korunuyor)
  | "phone"
  | "bag"
  | "keys"
  | "book"
  | "toy"
  | "tablet"
  | "glasses"
  | "watch"
  | "notebook"
  | "wallet";

// Aksesuar kategorileri için label ve icon
export const ACCESSORY_TYPES: Record<AccessoryType, { label: string; icon: string; description: string }> = {
  // Yeni Tipler
  textile: { label: "Tekstil", icon: "🧣", description: "Peçete, örtü, runner vb." },
  cutlery: { label: "Çatal-Bıçak", icon: "🍴", description: "Çatal, kaşık, bıçak, maşa" },
  decoration: { label: "Dekorasyon", icon: "💐", description: "Vazo, çiçek, dergi, gözlük vb." },
  ingredient: { label: "Malzeme", icon: "🧂", description: "Un, pudra şekeri, kakao, kahve çekirdeği" },

  // Legacy Tipler
  phone: { label: "Telefon", icon: "📱", description: "Akıllı telefon (jenerik, logosuz)" },
  bag: { label: "Çanta", icon: "👜", description: "El çantası, clutch" },
  keys: { label: "Anahtar", icon: "🔑", description: "Araba veya ev anahtarı" },
  book: { label: "Kitap", icon: "📚", description: "Kitap veya dergi" },
  toy: { label: "Oyuncak", icon: "🧸", description: "Çocuk oyuncağı" },
  tablet: { label: "Tablet", icon: "📲", description: "Tablet (jenerik, logosuz)" },
  glasses: { label: "Gözlük", icon: "🕶️", description: "Güneş gözlüğü" },
  watch: { label: "Saat", icon: "⌚", description: "Kol saati" },
  notebook: { label: "Defter", icon: "📓", description: "Defter veya ajanda" },
  wallet: { label: "Cüzdan", icon: "👛", description: "Cüzdan" },
};

// Ürün tipleri (orchestrator için)
export type OrchestratorProductType =
  | "croissants"
  | "pastas"
  | "chocolates"
  | "coffees";

// Prop tipleri
export type PropType = "plates" | "cups" | "cutlery" | "napkins" | "boxes" | "bags";

// Mobilya tipleri
export type FurnitureType = "tables" | "chairs" | "decor";

// Ortam tipleri (iç mekan, dış mekan, pencere)
export type EnvironmentType = "indoor" | "outdoor" | "window" | "cafe" | "home";

// Evcil hayvan tipleri
export type PetType = "dogs" | "cats";

// ==========================================
// OBJECT IDENTITY ENUMS
// ==========================================
// Gemini'nin nesneleri doğru yorumlaması için standart enum değerleri

// Masa üst tabla şekli
export type TableTopShape = "circular" | "square" | "rectangular" | "oval";

// Masa ayak yapısı
export type TableBaseType = "pedestal" | "four-legged" | "tripod" | "trestle";

// Fincan/bardak tipi
export type CupType =
  | "latte-mug"
  | "espresso-cup"
  | "traditional-tea-glass"
  | "ceramic-teacup"
  | "tulip-glass"
  | "cappuccino-cup"
  | "glass-mug";

// Çatal-bıçak tipi
export type CutleryType =
  | "dessert-fork"
  | "dinner-fork"
  | "teaspoon"
  | "dessert-spoon"
  | "pastry-knife"
  | "butter-knife"
  | "cake-server";

// Tabak tipi
export type PlateType =
  | "dessert-plate"
  | "dinner-plate"
  | "side-plate"
  | "serving-plate"
  | "cake-stand";

// Object Identity label'ları (Admin UI dropdown'ları için)
export const TABLE_TOP_SHAPES: Record<TableTopShape, string> = {
  circular: "Yuvarlak",
  square: "Kare",
  rectangular: "Dikdörtgen",
  oval: "Oval",
};

export const TABLE_BASE_TYPES: Record<TableBaseType, string> = {
  pedestal: "Tek Ayak (Merkezi)",
  "four-legged": "Dört Ayak",
  tripod: "Üç Ayak",
  trestle: "Köprü Ayak",
};

export const CUP_TYPES: Record<CupType, string> = {
  "latte-mug": "Latte Kupası (geniş ağızlı)",
  "espresso-cup": "Espresso Fincanı (küçük)",
  "traditional-tea-glass": "Çay Bardağı (ince belli)",
  "ceramic-teacup": "Porselen Çay Fincanı (kulplu)",
  "tulip-glass": "Lale Bardak (çay)",
  "cappuccino-cup": "Cappuccino Fincanı (orta)",
  "glass-mug": "Cam Kupa (latte/americano)",
};

export const CUTLERY_TYPES: Record<CutleryType, string> = {
  "dessert-fork": "Tatlı Çatalı (küçük)",
  "dinner-fork": "Yemek Çatalı (standart)",
  teaspoon: "Çay Kaşığı",
  "dessert-spoon": "Tatlı Kaşığı",
  "pastry-knife": "Pasta Bıçağı",
  "butter-knife": "Tereyağı Bıçağı",
  "cake-server": "Pasta Spatulası",
};

export const PLATE_TYPES: Record<PlateType, string> = {
  "dessert-plate": "Tatlı Tabağı (küçük)",
  "dinner-plate": "Yemek Tabağı (büyük)",
  "side-plate": "Yan Tabak",
  "serving-plate": "Servis Tabağı",
  "cake-stand": "Kek Standı (ayaklı)",
};

// Yeme şekli - ürün nasıl yenir
export type EatingMethod = "hand" | "fork" | "fork-knife" | "spoon" | "none";

// @deprecated - geriye uyumluluk için, yeni kodda EatingMethod kullanın
export type HoldingType = EatingMethod;

// İçecek tipi - ürünle birlikte sunulacak içecek
export type BeverageType = "coffee" | "tea" | "fruit-juice" | "lemonade" | "none";

// İçecek kuralı - ürün kategorisine göre içecek eşleşmesi
export interface BeverageRule {
  default: BeverageType;
  alternate?: BeverageType;
  alternateFrequency?: number; // Kaç paylaşımda bir alternatif kullanılır
}

// Asset
export interface OrchestratorAsset {
  id: string;
  category: AssetCategory;
  subType: string;
  filename: string;
  storageUrl: string;
  thumbnailUrl?: string;

  // Cloudinary (yeni - migration sonrası ana depolama)
  cloudinaryPublicId?: string;    // "storyflow/assets/products/croissants/1706123456_croissant"
  cloudinaryUrl?: string;         // "https://res.cloudinary.com/xxx/image/upload/..."
  cloudinaryVersion?: number;     // Cache invalidation için

  // Migration metadata
  migrationStatus?: "pending" | "migrated" | "failed";
  migratedAt?: number;
  visualProperties?: {
    dominantColors: string[];
    style: string;
    material?: string;
    shape?: string;

    // Object Identity alanları - Gemini'ye net geometrik/fonksiyonel bilgi verir
    tableTopShape?: TableTopShape;
    tableBaseType?: TableBaseType;
    cupType?: CupType;
    cutleryType?: CutleryType;
    plateType?: PlateType;
  };
  // Yeme şekli (sadece products için)
  eatingMethod?: EatingMethod;
  // Elle tutulabilir mi? (sadece products için - el senaryoları için)
  canBeHeldByHand?: boolean;
  // Tabak gerekli mi? (sadece products için)
  // false = "Tabaksız" - elde tutulur, tabak seçilmez
  // true (varsayılan) = Ürün etiketine göre uygun tabak seçilir
  plateRequired?: boolean;
  // İçecek eşleşmesi (sadece products için)
  defaultBeverage?: BeverageType;
  // Alternatif içecek - her 3 paylaşımda bir kullanılır
  alternateBeverage?: BeverageType;
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
  productTypes: string[];  // Dinamik kategori slug'ları - örn: "croissants", "pastas"
  allowPairing?: boolean;
  pairingWith?: string[];  // Dinamik kategori slug'ları
  // Tema tercihi (yeni sistem)
  themeId?: string;
  // Senaryo tercihi (eski sistem, geriye dönük uyumluluk)
  scenarioPreference?: string[];
  isActive: boolean;
  priority: number;
}

// Hava durumu preset'leri (Tema sahne ayarları için)
export const WEATHER_PRESETS = [
  { id: "bright-sunny", labelTr: "Parlak Güneşli" },
  { id: "soft-overcast", labelTr: "Yumuşak Bulutlu" },
  { id: "rainy", labelTr: "Yağmurlu" },
  { id: "golden-hour", labelTr: "Altın Saat" },
  { id: "cloudy-neutral", labelTr: "Bulutlu Nötr" },
] as const;

export type WeatherPresetId = typeof WEATHER_PRESETS[number]["id"];

// Işık preset'leri
export const LIGHTING_PRESETS = [
  { id: "window-warm", labelTr: "Pencereden Sıcak Işık" },
  { id: "soft-diffused", labelTr: "Yumuşak Doğal Işık" },
  { id: "dramatic-side", labelTr: "Dramatik Yan Işık" },
  { id: "backlit-glow", labelTr: "Arkadan Aydınlatma" },
  { id: "morning-bright", labelTr: "Sabah Aydınlığı" },
  { id: "candle-warm", labelTr: "Mum Işığı Sıcaklığı" },
] as const;

export type LightingPresetId = typeof LIGHTING_PRESETS[number]["id"];

// Atmosfer preset'leri
export const ATMOSPHERE_PRESETS = [
  { id: "peaceful-morning", labelTr: "Huzurlu Sabah" },
  { id: "energetic-brunch", labelTr: "Enerjik Brunch" },
  { id: "cozy-evening", labelTr: "Samimi Akşam" },
  { id: "elegant-minimal", labelTr: "Zarif Minimal" },
  { id: "casual-relaxed", labelTr: "Rahat Günlük" },
  { id: "romantic-dreamy", labelTr: "Romantik Rüya" },
  { id: "festive-celebration", labelTr: "Kutlama Havası" },
] as const;

export type AtmospherePresetId = typeof ATMOSPHERE_PRESETS[number]["id"];

// Tema sahne ayarları
export interface ThemeSetting {
  preferredTags?: {
    table?: string[];
    plate?: string[];
    cup?: string[];
  };
  weatherPreset?: WeatherPresetId;
  lightingPreset?: LightingPresetId;
  atmospherePreset?: AtmospherePresetId;
}

// Tema tanımı
export interface Theme {
  id: string;
  name: string;
  description?: string;
  scenarios: string[];
  // v3.0: mood alanı kaldırıldı - atmosfer bilgisi artık Scenario içinde
  petAllowed: boolean;
  accessoryAllowed: boolean; // Aksesuar dahil edilebilir mi?
  accessoryOptions?: string[]; // Kullanıcının seçtiği aksesuar listesi (ör: ["kitap", "telefon"])
  setting?: ThemeSetting; // v3.1: Sahne ayarları
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

/**
 * @deprecated v3.0 - Mood ve Scenario birleştirildi.
 * Atmosfer bilgileri artık Scenario içinde.
 * Bu interface geriye uyumluluk için korunuyor.
 */
export interface Mood {
  id: string;
  name: string;
  description: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night" | "any";
  season: "winter" | "spring" | "summer" | "autumn" | "any";
  weather: "sunny" | "cloudy" | "rainy" | "snowy" | "any";
  lightingPrompt: string;
  colorGradePrompt: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

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
    pet?: OrchestratorAsset;
    accessory?: OrchestratorAsset;
    selectionReasoning: string;
  };
  scenarioSelection?: {
    scenarioId: string;
    scenarioName: string;
    reasoning: string;
    includesHands: boolean;
    handStyle?: string;
    handStyleDetails?: { name: string; description: string };
    compositionId?: string;
    composition: string;
    themeId?: string;
    themeName?: string;
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
    totalCostFromLogs?: number; // ai-logs'tan gelen gerçek maliyet
  };
  // AI Harcama İstatistikleri (YENİ)
  aiStats?: AIStats;           // Son 24 saat
  aiStatsMonthly?: {           // Son 30 gün
    totalCost: number;
    totalCalls: number;
    geminiCalls: number;
    claudeCalls: number;
  };
}

// ==========================================
// Pre-flight Validation Types
// ==========================================

export interface PreFlightData {
  theme: {
    name: string;
    preferredTags?: { table?: string[]; plate?: string[]; cup?: string[] };
    presets: { weather?: string; lighting?: string; atmosphere?: string };
    petAllowed: boolean;
    accessoryAllowed: boolean;
  };
  scenario: {
    name: string;
    description: string;
    suggestedProducts: string[];
    compositionId?: string;
    includesHands: boolean;
    handPose?: string;
  };
  scenarioCount: number;
  assets: {
    products: { total: number };
    tables: { total: number; preferred: number };
    plates: { total: number; preferred: number };
    cups: { total: number; preferred: number };
  };
  beverage?: {
    productType: string;
    defaultBeverage: string;
    alternateBeverage?: string;
  };
}

// ==========================================
// AI Monitor Types
// ==========================================

// AI Provider tipi
export type AIProvider = "claude" | "gemini";

// AI Log aşaması (orchestrator pipeline aşamaları)
export type AILogStage =
  | "config-snapshot"        // Pipeline konfigürasyon snapshot'ı
  | "rules-applied"          // Uygulanan kurallar
  | "asset-selection"        // Asset seçimi
  | "scenario-selection"     // Senaryo seçimi
  | "prompt-building"        // Prompt hazırlama
  | "prompt-optimization"    // Prompt optimizasyonu (eski)
  | "image-generation"       // Görsel üretimi
  | "quality-control"        // Kalite kontrolü
  | "content-generation"     // Caption üretimi
  | "visual-critic";         // Visual Critic analizi

// AI Log durumu
export type AILogStatus = "success" | "error" | "blocked";

// Config Snapshot tipi
export interface ConfigSnapshot {
  themeId?: string;
  themeName?: string;
  themeColors?: string[];
  moodId?: string;
  moodName?: string;
  styleId?: string;
  styleName?: string;
  styleDefinition?: string;
  timeOfDay?: string;
  aspectRatio?: string;
  scheduledHour?: number;
}

// Applied Rules tipi
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

// Decision Details tipi
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
    includesHands?: boolean;
    handStyle?: string;
    compositionId?: string;
    reason?: string;
  };
  promptDetails?: {
    referenceImages?: Array<{
      type: string;
      filename: string;
    }>;
    customizations?: string[];
  };
}

// ==========================================
// Rule Engine Types
// ==========================================

export type RuleType = "exclude" | "prefer" | "avoid";
export type RuleTargetType = "tag" | "category";

export interface RuleTarget {
  type: RuleTargetType;
  tag?: string;
  category?: AssetCategory;
}

export interface RuleCondition {
  field: string;
  operator: "equals" | "contains" | "greater_than" | "less_than";
  value: any;
}

export interface PatronRule {
  id: string;
  name: string;
  type: RuleType;
  target: RuleTarget;
  conditions: RuleCondition[];
  priority: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FilterThresholds {
  default: number;
  products: number;
  tables: number;
  plates: number;
  cups: number;
  accessories: number;
  napkins: number;
  cutlery: number;
  [key: string]: number;
}
export type CategoryThresholds = FilterThresholds;

export interface ScoringWeights {
  tags: number;
  usage: number;
  mood: number;
  productCompat: number;
}

export interface ProductCompatibilityConfig {
  weight: number;
  matrix: Record<string, {
    preferredTags: string[];
    avoidedTags: string[];
  }>;
}

export interface FirestoreRuleEngineConfig {
  thresholds: FilterThresholds;
  weights: {
    scoring: ScoringWeights;
    productCompat: ProductCompatibilityConfig;
  };
  patronRules?: PatronRule[];
  version?: string;
  updatedAt: number;
}

// Retry Info tipi
export interface RetryInfo {
  attemptNumber: number;
  maxAttempts: number;
  previousErrors?: string[];
}

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

  // YENİ: Pipeline Şeffaflık alanları
  configSnapshot?: ConfigSnapshot;
  appliedRules?: AppliedRules;
  decisionDetails?: DecisionDetails;
  retryInfo?: RetryInfo;

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

// ==========================================
// AI Rules System Types (Öğrenme Kuralları)
// ==========================================

// AI Kural kategorileri
export type AIRuleCategoryId =
  | "beverage"      // İçecek kuralları
  | "composition"   // Kompozisyon kuralları
  | "lighting"      // Işık kuralları
  | "product"       // Ürün kuralları
  | "background"    // Arka plan kuralları
  | "hand"          // El kuralları
  | "general";      // Genel kurallar

// AI Kural kategorisi açıklamaları
export const AI_RULE_CATEGORIES: Record<AIRuleCategoryId, { label: string; icon: string }> = {
  beverage: { label: "İçecek", icon: "☕" },
  composition: { label: "Kompozisyon", icon: "🎨" },
  lighting: { label: "Işık", icon: "💡" },
  product: { label: "Ürün", icon: "🥐" },
  background: { label: "Arka Plan", icon: "🖼️" },
  hand: { label: "El", icon: "✋" },
  general: { label: "Genel", icon: "📋" },
};

// AI Öğrenme Kuralı
export interface AIRule {
  id: string;
  type: "do" | "dont";            // Yapılacak / Yapılmayacak
  category: AIRuleCategoryId;
  title: string;                   // Kısa başlık
  description: string;             // Detaylı açıklama
  exampleImageUrl?: string;        // Görsel örnek (opsiyonel)
  isActive: boolean;               // Aktif/Pasif
  createdAt: number;
  updatedAt: number;
}

// AI Kural istatistikleri
export interface AIRulesStats {
  totalRules: number;
  activeRules: number;
  doRules: number;
  dontRules: number;
  byCategory: Record<string, number>;
}

// ==========================================
// Dynamic Category System
// ==========================================

/**
 * Bilinen ürün kategorileri (IDE autocomplete için)
 * Yeni kategoriler Firestore'dan dinamik olarak gelir
 */
export const KNOWN_PRODUCT_TYPES = [
  "croissants",
  "pastas",
  "chocolates",
  "coffees",
] as const;

export type KnownProductType = typeof KNOWN_PRODUCT_TYPES[number];

/**
 * Ana kategori türleri
 */
export type DynamicCategoryType =
  | "products"
  | "props"
  | "furniture"
  | "accessories"
  | "pets"
  | "environments"
  | "interior";

/**
 * Alt kategori tanımı
 */
export interface CategorySubType {
  id: string;                // Otomatik oluşturulan unique ID (format: categoryType_slug)
  slug: string;              // "croissants" - immutable, human-readable
  displayName: string;       // "Kruvasanlar"
  icon?: string;             // "🥐"
  description?: string;
  order: number;
  isActive: boolean;

  // Ürün kategorileri için özel alanlar
  eatingMethodDefault?: EatingMethod;
  canBeHeldDefault?: boolean;
}

/**
 * Dinamik kategori tanımı
 */
export interface DynamicCategory {
  type: DynamicCategoryType;
  displayName: string;
  icon: string;
  description?: string;
  order: number;
  subTypes: CategorySubType[];
  isSystem: boolean;
  isDeleted: boolean;
  createdAt: number;
  updatedAt: number;
  updatedBy?: string;
}

/**
 * Kategori konfigürasyonu
 */
export interface CategoriesConfig {
  categories: DynamicCategory[];
  cacheTTLMinutes: number;
  version: string;
  updatedAt: number;
  updatedBy?: string;
}

/**
 * Kategori servisi yanıt tipleri
 */
export interface CategoryResponse {
  success: boolean;
  data?: CategoriesConfig;
  error?: string;
}

export interface SubTypeSlugsResponse {
  success: boolean;
  data?: string[];
  error?: string;
}

// ==========================================
// Prompt Studio Types
// ==========================================

// Prompt aşama ID'leri
export type PromptStageId =
  | "asset-selection"
  | "scenario-selection"
  | "prompt-optimization"
  | "quality-control"
  | "content-generation";

// Prompt versiyon geçmişi
export interface PromptVersion {
  version: number;
  systemPrompt: string;
  updatedAt: number;
  updatedBy?: string;
  changeNote?: string;
}

// Prompt template
export interface PromptTemplate {
  id: PromptStageId;
  name: string;
  description: string;
  stage: string;
  systemPrompt: string;
  variables: string[];
  version: number;
  history: PromptVersion[];
  updatedAt: number;
  updatedBy?: string;
}

// Prompt Studio config
export interface PromptStudioConfig {
  prompts: Record<PromptStageId, PromptTemplate>;
  updatedAt: number;
  updatedBy?: string;
}

// ==========================================
// Setup Status (Onboarding)
// ==========================================

export type SetupItemStatus = "complete" | "incomplete" | "warning";

export interface SetupItem {
  id: string;
  label: string;
  status: SetupItemStatus;
  count: number;
  message?: string;
  action?: {
    label: string;
    route: string;
  };
}

export interface SetupStatusSummary {
  total: number;
  completed: number;
  warnings: number;
  incomplete: number;
  overallStatus: SetupItemStatus;
  progress: number;
}

export interface SetupStatusDetails {
  timeSlotsWithTheme: number;
  timeSlotsWithoutTheme: number;
  timeSlotsWithoutThemeList: Array<{ id: string; name: string }>;
}

export interface SetupStatusResponse {
  items: SetupItem[];
  summary: SetupStatusSummary;
  details: SetupStatusDetails;
}

// ==========================================
// TAG SCHEMA SYSTEM (Dinamik Tag Yönetimi)
// ==========================================

// ==========================================
// STYLE TYPES
// ==========================================

export interface Style {
  id: string;          // slug (örn: "modern", "rustic")
  displayName: string; // Görünen ad (örn: "Modern", "Rustik")
  description?: string;// Açıklama
  isActive: boolean;
  order: number;       // Sıralama
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// Visual Interpreter (Visual Critic)
// ==========================================

export interface VisualCriticRequest {
  imagePath: string; // storageUrl
  prompt: string;
  mood?: string;
  product?: string;
  pipelineId?: string;
}

export interface VisualCriticResponse {
  score: number;
  critique: string;
  issues: string[];
  suggestions: string[];
  refined_prompt?: string;
}



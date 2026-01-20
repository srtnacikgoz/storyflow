/**
 * Claude Full Orchestrator - Type Definitions
 * Asset-based content automation system
 */

// ==========================================
// ASSET TYPES
// ==========================================

/**
 * Asset kategorileri
 */
export type AssetCategory =
  | "products"    // Ürün fotoğrafları
  | "props"       // Tabak, çatal, peçete
  | "furniture"   // Masa, sandalye, dekor
  | "music";      // Müzik dosyaları

/**
 * Ürün alt kategorileri
 */
export type ProductType =
  | "croissants"
  | "pastas"
  | "chocolates"
  | "macarons"
  | "coffees";

/**
 * Prop alt kategorileri
 */
export type PropType =
  | "plates"      // Tabaklar
  | "cups"        // Fincanlar, bardaklar
  | "cutlery"     // Çatal, kaşık, bıçak
  | "napkins";    // Peçeteler, örtüler

/**
 * Mobilya alt kategorileri
 */
export type FurnitureType =
  | "tables"      // Masalar
  | "chairs"      // Sandalyeler
  | "decor";      // Vazolar, bitkiler

/**
 * Özel asset tipleri
 */
export type SpecialAssetType =
  | "pets"        // Köpek, kedi
  | "environments" // Mekan, pencere, dış alan
  | "books"       // Kitaplar
  | "plants";     // Bitkiler

/**
 * Müzik kategorileri
 */
export type MusicMood =
  | "morning-vibes"   // Sabah
  | "cozy-cafe"       // Kafe
  | "upbeat"          // Enerjik
  | "afternoon-chill" // Öğleden sonra
  | "golden-hour";    // Altın saat

/**
 * Asset metadata
 */
export interface Asset {
  id: string;
  category: AssetCategory;
  subType: string;                // ProductType | PropType | FurnitureType | MusicMood

  // Dosya bilgileri
  filename: string;
  storageUrl: string;
  thumbnailUrl?: string;

  // Görsel özellikleri (ürün/prop/furniture için)
  visualProperties?: {
    dominantColors: string[];     // ["#D4A574", "#FFFFFF"]
    style: string;                // "modern", "rustic", "minimal"
    material?: string;            // "ceramic", "wood", "marble"
    shape?: string;               // "round", "square", "rectangular"
  };

  // Müzik özellikleri
  musicProperties?: {
    duration: number;             // Saniye
    bpm?: number;
    mood: MusicMood;
  };

  // Kullanım istatistikleri
  usageCount: number;
  lastUsedAt?: number;

  // Meta
  tags: string[];                 // ["gold-rim", "white", "elegant"]
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// SCHEDULE TYPES
// ==========================================

/**
 * Zaman dilimi kuralı
 */
export interface TimeSlotRule {
  id: string;

  // Zaman aralığı
  startHour: number;              // 7 (07:00)
  endHour: number;                // 11 (11:00)

  // Hangi günler
  daysOfWeek: number[];           // [1,2,3,4,5] = Hafta içi

  // Kategori
  productTypes: ProductType[];    // ["croissants"]
  allowPairing?: boolean;         // Kahve + pasta gibi kombinasyon
  pairingWith?: ProductType[];    // ["coffees"]

  // Senaryo tercihi
  scenarioPreference?: string[];  // ["zarif-tutma", "kahve-ani"]

  // Aktiflik
  isActive: boolean;
  priority: number;               // Düşük = öncelikli
}

/**
 * Günlük içerik takvimi
 */
export interface DailySchedule {
  date: string;                   // "2026-01-18"
  slots: ScheduledSlot[];
}

/**
 * Planlanmış slot
 */
export interface ScheduledSlot {
  id: string;
  scheduledTime: number;          // Timestamp

  // Rule referansı
  timeSlotRuleId: string;

  // Durum
  status: "pending" | "generating" | "awaiting_approval" | "approved" | "published" | "failed";

  // Pipeline sonuçları (doldurulacak)
  pipelineResult?: PipelineResult;

  // İlerleme durumu
  currentStage?: string;
  stageIndex?: number;
  totalStages?: number;
  error?: string;

  // Meta
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// PIPELINE TYPES
// ==========================================

/**
 * Pipeline aşamaları
 */
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
 * Pipeline durumu
 */
export interface PipelineStatus {
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  failedStage?: PipelineStage;
  error?: string;
  startedAt: number;
  updatedAt: number;
}

/**
 * Asset seçim sonucu
 */
export interface AssetSelection {
  product: Asset;
  plate?: Asset;
  cup?: Asset;
  table?: Asset;
  music?: Asset;

  // Genişletilmiş asset'ler
  decor?: Asset;          // Dekorasyon (bitki, kitap, vb.)
  pet?: Asset;            // Köpek, kedi
  environment?: Asset;    // Mekan referansı

  // Claude'un seçim gerekçesi
  selectionReasoning: string;

  // Çeşitlilik bilgisi
  includesPet: boolean;
  petReason?: string;     // Neden köpek dahil/hariç
}

/**
 * El stilleri
 */
export type HandStyleId = "elegant" | "bohemian" | "minimal" | "trendy" | "sporty";

/**
 * El stili tanımı
 */
export interface HandStyle {
  id: HandStyleId;
  name: string;
  description: string;
  nailPolish: string;
  accessories: string;
  tattoo: string;
}

/**
 * Kompozisyon varyantı
 */
export interface CompositionVariant {
  id: string;
  description: string;
}

/**
 * Senaryo tanımı
 */
export interface Scenario {
  id: string;
  name: string;
  description: string;
  includesHands: boolean;
  compositions: CompositionVariant[];
}

/**
 * Senaryo seçimi
 */
export interface ScenarioSelection {
  scenarioId: string;
  scenarioName: string;

  // Neden bu senaryo seçildi
  reasoning: string;

  // Senaryo parametreleri
  includesHands: boolean;
  handStyle?: HandStyleId;
  handStyleDetails?: HandStyle;
  compositionId: string;
  composition: string;
}

/**
 * Optimize edilmiş prompt
 */
export interface OptimizedPrompt {
  mainPrompt: string;
  negativePrompt: string;

  // Prompt'a eklenen özelleştirmeler
  customizations: string[];

  // Teknik ayarlar (Gemini destekli formatlar)
  aspectRatio: "9:16" | "3:4" | "1:1";
  faithfulness: number;
}

/**
 * Üretilen görsel
 */
export interface GeneratedImage {
  imageBase64: string;
  mimeType: string;
  storageUrl?: string;

  // Üretim bilgileri
  model: string;
  cost: number;
  generatedAt: number;

  // Retry bilgisi
  attemptNumber: number;
}

/**
 * Kalite kontrol sonucu
 */
export interface QualityControlResult {
  passed: boolean;
  score: number;                  // 1-10

  // Değerlendirme detayları
  evaluation: {
    productAccuracy: number;      // Ürün doğruluğu (1-10)
    composition: number;          // Kompozisyon (1-10)
    lighting: number;             // Işık (1-10)
    realism: number;              // Gerçekçilik (1-10)
    instagramReadiness: number;   // Instagram uygunluğu (1-10)
  };

  // Geri bildirim
  feedback: string;
  improvementSuggestions?: string[];

  // Yeniden üretim gerekli mi?
  shouldRegenerate: boolean;
  regenerationHints?: string;
}

/**
 * İçerik paketi
 */
export interface ContentPackage {
  // Caption
  caption: string;
  captionAlternatives?: string[];

  // Hashtags
  hashtags: string[];

  // Müzik
  musicAsset?: Asset;
  musicSuggestion?: string;

  // Meta
  generatedAt: number;
}

/**
 * Pipeline sonucu
 */
export interface PipelineResult {
  // Durum
  status: PipelineStatus;

  // Her aşamanın sonuçları
  assetSelection?: AssetSelection;
  scenarioSelection?: ScenarioSelection;
  optimizedPrompt?: OptimizedPrompt;
  generatedImage?: GeneratedImage;
  qualityControl?: QualityControlResult;
  contentPackage?: ContentPackage;

  // Telegram
  telegramMessageId?: number;
  approvalStatus?: "pending" | "approved" | "rejected" | "regenerate";
  approvalRespondedAt?: number;

  // Final
  publishedAt?: number;
  instagramPostId?: string;

  // Maliyet
  totalCost: number;

  // Timing
  startedAt: number;
  completedAt?: number;
  totalDuration?: number;
}

// ==========================================
// CLAUDE AI TYPES
// ==========================================

/**
 * Claude analiz isteği
 */
export interface ClaudeAnalysisRequest {
  type: "asset_selection" | "scenario" | "quality_control" | "caption";
  context: Record<string, unknown>;
  assets?: Asset[];
  image?: string;                 // Base64
}

/**
 * Claude yanıtı
 */
export interface ClaudeResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  tokensUsed: number;
  cost: number;
}

// ==========================================
// CONFIG TYPES
// ==========================================

/**
 * Orchestrator konfigürasyonu
 */
export interface OrchestratorConfig {
  // Claude API
  claudeApiKey: string;
  claudeModel: string;            // "claude-sonnet-4-20250514"

  // Gemini API
  geminiApiKey: string;
  geminiModel: string;            // "gemini-3-pro-image-preview"

  // Kalite kontrol
  qualityThreshold: number;       // Minimum skor (default: 7)
  maxRetries: number;             // Maximum yeniden üretim (default: 3)

  // Telegram
  telegramBotToken: string;
  telegramChatId: string;
  approvalTimeout: number;        // Dakika (default: 60)

  // Zamanlama
  timezone: string;               // "Europe/Istanbul"
  scheduleBuffer: number;         // Dakika önce hazırla (default: 30)
}

// ==========================================
// VARIATION & RULES TYPES
// ==========================================

/**
 * Çeşitlilik kuralları
 */
export interface VariationRules {
  scenarioGap: number;          // Aynı senaryo min kaç üretim sonra (default: 3)
  tableGap: number;             // Aynı masa min kaç üretim sonra (default: 2)
  handStyleGap: number;         // Aynı el stili min kaç üretim sonra (default: 4)
  compositionGap: number;       // Aynı kompozisyon min kaç üretim sonra (default: 5)
  petFrequency: number;         // Köpek her kaç üretimde bir (default: 15)
  outdoorFrequency: number;     // Dış mekan her kaç üretimde bir (default: 10)
  wabiSabiFrequency: number;    // Wabi-sabi her kaç üretimde bir (default: 5)
  similarityThreshold: number;  // Max benzerlik % (default: 50)
}

/**
 * Haftalık tema
 */
export interface WeeklyTheme {
  mood: string;
  scenarios: string[];
  petAllowed: boolean;
}

/**
 * Zaman-mood eşleştirmesi
 */
export interface TimeMoodMapping {
  startHour: number;
  endHour: number;
  mood: string;
  lightPreference: string;
  suggestedScenarios: string[];
  notes: string;
}

/**
 * Asset kişiliği
 */
export interface AssetPersonality {
  assetId: string;
  assetName: string;
  personality: string;
  mood: string;
  compatibleScenarios: string[];
}

/**
 * Üretim geçmişi kaydı
 */
export interface ProductionHistoryEntry {
  timestamp: number;
  scenarioId: string;
  compositionId: string;
  tableId?: string;
  handStyleId?: string;
  includesPet: boolean;
  productType: ProductType;
}

/**
 * Son üretim geçmişi (çeşitlilik kontrolü için)
 */
export interface RecentHistory {
  entries: ProductionHistoryEntry[];
  petUsageCount: number;        // Son N üretimde köpek kaç kez kullanıldı
  lastPetUsage?: number;        // Son köpek kullanım timestamp'i
}

/**
 * Dinamik konfigürasyon (Firestore'dan)
 */
export interface DynamicConfig {
  variationRules: VariationRules;
  weeklyThemes: Record<string, WeeklyTheme>;
  timeMoodMappings: TimeMoodMapping[];
  assetPriorities: {
    underusedBoost: number;     // Az kullanılan asset'e çarpan
    lastUsedPenalty: number;    // Son kullanılan asset'e ceza
  };
  updatedAt: number;
}

/**
 * Orchestrator kuralları (ORCHESTRATOR.md'den parse edilir)
 */
export interface OrchestratorRules {
  scenarios: Scenario[];
  handStyles: HandStyle[];
  assetPersonalities: AssetPersonality[];
  absoluteRules: string[];      // Mutlak kurallar listesi
  version: string;
  parsedAt: number;
}

/**
 * Birleştirilmiş etkili kurallar
 */
export interface EffectiveRules {
  staticRules: OrchestratorRules;
  dynamicConfig: DynamicConfig;
  recentHistory: RecentHistory;

  // Hesaplanmış değerler
  shouldIncludePet: boolean;
  blockedScenarios: string[];   // Son N üretimde kullanılan
  blockedTables: string[];
  blockedHandStyles: string[];
  blockedCompositions: string[];
}

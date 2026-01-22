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
  | "music"       // Müzik dosyaları
  | "environments" // Mekan, pencere, dış alan
  | "pets"        // Köpek, kedi
  | "interior";   // İç mekan fotoğrafları (vitrin, tezgah, oturma alanı)

/**
 * Ürün alt kategorileri
 */
export type ProductType =
  | "croissants"
  | "pastas"
  | "chocolates"
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
 * Ortam alt kategorileri
 */
export type EnvironmentType =
  | "indoor"      // İç mekan
  | "outdoor"     // Dış mekan
  | "window"      // Pencere önü
  | "cafe"        // Kafe ortamı
  | "home";       // Ev ortamı

/**
 * Evcil hayvan alt kategorileri
 */
export type PetType =
  | "dogs"        // Köpekler
  | "cats";       // Kediler

/**
 * İç mekan alt kategorileri
 * Bu fotoğraflar AI görsel üretimi ATLANARAK doğrudan kullanılır
 */
export type InteriorType =
  | "vitrin"          // Vitrin görünümü
  | "tezgah"          // Ürün tezgahları
  | "oturma-alani"    // Oturma köşeleri
  | "dekorasyon"      // Çiçekler, bitkiler, detaylar
  | "genel-mekan";    // Pastane genel görünümü

/**
 * Özel asset tipleri (legacy - geriye uyumluluk için)
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
 * Ürün tutma şekli
 * Claude'un senaryo seçiminde kullanılır
 */
export type HoldingType =
  | "hand"   // Elle tutulabilir (kurabiye, kruvasan, sandviç)
  | "fork"   // Çatalla yenir (tiramisu, cheesecake, pasta dilimi)
  | "spoon"  // Kaşıkla yenir (puding, sufle)
  | "none";  // Dokunulmaz/tabakta sunulur (bütün kek, tart)

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

  // Ürün tutma şekli (sadece products kategorisi için)
  // Claude senaryo seçerken bunu kullanır
  holdingType?: HoldingType;

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

  // Tema tercihi (yeni sistem)
  themeId?: string;               // "morning-energy" - Temalar sayfasından seçilir

  // Senaryo tercihi (eski sistem, geriye dönük uyumluluk)
  // @deprecated - themeId kullanın
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
  interior?: Asset;       // İç mekan fotoğrafı (AI atlanır, doğrudan kullanılır)

  // Claude'un seçim gerekçesi
  selectionReasoning: string;

  // Çeşitlilik bilgisi
  includesPet: boolean;
  petReason?: string;     // Neden köpek dahil/hariç

  // Interior senaryo bilgisi
  isInteriorScenario?: boolean;  // true ise AI görsel üretimi atlanır
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

  // Interior senaryolar için (AI görsel üretimi atlanır)
  isInterior?: boolean;           // true ise AI görsel üretimi ATLANIR
  interiorType?: InteriorType;    // Hangi interior kategorisinden asset seçilecek
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

  // Interior senaryolar için
  isInterior?: boolean;           // true ise AI görsel üretimi ATLANIR
  interiorType?: InteriorType;    // Kullanılacak interior asset tipi
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
 * NOT: Caption ve hashtag desteği kaldırıldı (Instagram API limitleri)
 */
export interface ContentPackage {
  // Caption (artık kullanılmıyor)
  caption?: string;
  captionAlternatives?: string[];

  // Hashtags (artık kullanılmıyor)
  hashtags?: string[];

  // Müzik
  musicAsset?: Asset;
  musicSuggestion?: string;

  // Meta
  generatedAt?: number;
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

  // Orchestrator scheduled-slots referansı
  slotId?: string;

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
  productGap: number;           // Aynı ürün min kaç üretim sonra (default: 3)
  plateGap: number;             // Aynı tabak min kaç üretim sonra (default: 2)
  cupGap: number;               // Aynı fincan min kaç üretim sonra (default: 2)
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
 * Çeşitlilik algoritması için son üretimleri takip eder
 */
export interface ProductionHistoryEntry {
  timestamp: number;
  scenarioId: string;
  compositionId: string;
  tableId?: string | null;
  handStyleId?: string | null;
  includesPet: boolean;
  productType: ProductType;
  // Ek rotasyon alanları (ürün/tabak/fincan çeşitliliği için)
  productId?: string | null;
  plateId?: string | null;
  cupId?: string | null;
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
  blockedProducts: string[];    // Son N üretimde kullanılan ürünler
  blockedPlates: string[];      // Son N üretimde kullanılan tabaklar
  blockedCups: string[];        // Son N üretimde kullanılan fincanlar
}

// ==========================================
// THEME SYSTEM
// ==========================================

/**
 * Tema tanımı
 * Senaryoları, mood'u ve diğer ayarları gruplar
 * TimeSlotRule'dan referans edilir
 */
export interface Theme {
  id: string;              // "morning-energy"
  name: string;            // "Sabah Enerjisi"
  description?: string;    // "Enerjik sabah paylaşımları için"
  scenarios: string[];     // ["cam-kenari", "zarif-tutma", "ilk-dilim"]
  mood: string;            // "energetic"
  petAllowed: boolean;     // Köpek dahil edilebilir mi?

  // Metadata
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;     // Varsayılan tema mı (silinemeyen)
}

/**
 * Varsayılan temalar (sistem tarafından oluşturulan)
 */
export const DEFAULT_THEMES: Omit<Theme, "createdAt" | "updatedAt">[] = [
  {
    id: "morning-energy",
    name: "Sabah Enerjisi",
    description: "Güne enerjik başlangıç için aydınlık, taze senaryolar",
    scenarios: ["cam-kenari", "zarif-tutma", "ilk-dilim"],
    mood: "energetic",
    petAllowed: false,
    isDefault: true,
  },
  {
    id: "brunch-social",
    name: "Brunch Keyfi",
    description: "Sosyal, paylaşım odaklı brunch atmosferi",
    scenarios: ["kahve-ani", "paylasim"],
    mood: "social",
    petAllowed: false,
    isDefault: true,
  },
  {
    id: "afternoon-chill",
    name: "Öğleden Sonra Rahatlığı",
    description: "Rahat, dinlendirici öğleden sonra anları",
    scenarios: ["kahve-kosesi", "yarim-kaldi"],
    mood: "relaxed",
    petAllowed: true,
    isDefault: true,
  },
  {
    id: "golden-hour",
    name: "Altın Saat",
    description: "Sıcak, romantik akşam ışığı",
    scenarios: ["cam-kenari", "hediye-acilisi"],
    mood: "warm",
    petAllowed: false,
    isDefault: true,
  },
  {
    id: "cozy-night",
    name: "Gece Samimiyeti",
    description: "Samimi, rahat gece atmosferi",
    scenarios: ["kahve-kosesi", "yarim-kaldi"],
    mood: "cozy",
    petAllowed: true,
    isDefault: true,
  },
  {
    id: "mekan-tanitimi",
    name: "Mekan Tanıtımı",
    description: "Pastane atmosferini yansıtan gerçek fotoğraflar (AI görsel üretimi atlanır)",
    scenarios: [
      "vitrin-sergisi",
      "kruvasan-tezgahi",
      "pastane-ici",
      "oturma-kosesi",
      "cicek-detay",
      "kahve-hazirligi",
      "sabah-acilis",
      "pencere-isigi",
      "raf-zenginligi",
      "detay-cekimi",
    ],
    mood: "warm",
    petAllowed: false,
    isDefault: true,
  },
];

// ==========================================
// AI FEEDBACK SYSTEM
// ==========================================

/**
 * Sorun kategorileri
 * Kullanıcı üretilen görselde sorun bildirirken seçer
 */
export type IssueCategoryId =
  | "holding-mismatch"    // Tutma şekli uyumsuz (elle tiramisu tutma gibi)
  | "product-unrecognized" // Ürün tanınmıyor/bozuk
  | "composition-bad"      // Kompozisyon kötü
  | "lighting-bad"         // Işık sorunu
  | "realism-low"          // Gerçekçilik düşük
  | "background-issue"     // Arka plan sorunu
  | "hand-anatomy"         // El anatomisi bozuk
  | "color-mismatch"       // Renk uyumsuzluğu
  | "other";               // Diğer

/**
 * Sorun kategorisi açıklamaları
 */
export const ISSUE_CATEGORIES: Record<IssueCategoryId, { label: string; description: string; aiHint: string }> = {
  "holding-mismatch": {
    label: "Tutma Şekli Uyumsuz",
    description: "Ürün elle tutulmaması gereken bir şekilde tutulmuş (ör: tiramisu elle)",
    aiHint: "Bu ürün elle tutulmamalı, çatal/kaşık ile servis edilmeli veya tabakta gösterilmeli",
  },
  "product-unrecognized": {
    label: "Ürün Tanınmıyor",
    description: "Ürün bozuk görünüyor veya tanınmıyor",
    aiHint: "Ürünün görünümü korunmalı, referans görsele daha sadık kalınmalı",
  },
  "composition-bad": {
    label: "Kompozisyon Kötü",
    description: "Görsel düzeni ve yerleşim sorunlu",
    aiHint: "Daha dengeli bir kompozisyon kullan, öğeleri daha iyi yerleştir",
  },
  "lighting-bad": {
    label: "Işık Sorunu",
    description: "Aydınlatma yapay veya uygunsuz",
    aiHint: "Daha doğal ışık kullan, gölgeleri kontrol et",
  },
  "realism-low": {
    label: "Gerçekçilik Düşük",
    description: "Görsel yapay veya AI yapımı belli oluyor",
    aiHint: "Daha gerçekçi dokular ve detaylar kullan",
  },
  "background-issue": {
    label: "Arka Plan Sorunu",
    description: "Arka plan uygunsuz veya dikkat dağıtıcı",
    aiHint: "Daha sade ve ürünü ön plana çıkaran arka plan kullan",
  },
  "hand-anatomy": {
    label: "El Anatomisi Bozuk",
    description: "Parmak sayısı, pozisyon veya orantı hatası",
    aiHint: "El anatomisine dikkat et, doğal pozisyon ve orantı kullan",
  },
  "color-mismatch": {
    label: "Renk Uyumsuzluğu",
    description: "Renkler referans görselle uyuşmuyor",
    aiHint: "Ürünün orijinal renklerini koru, referansa sadık kal",
  },
  "other": {
    label: "Diğer",
    description: "Yukarıdakilerden farklı bir sorun",
    aiHint: "Belirtilen özel sorunu dikkate al",
  },
};

/**
 * Kullanıcı geri bildirimi
 */
export interface IssueFeedback {
  id: string;

  // Hangi içerikle ilgili
  slotId: string;           // scheduled-slots ID
  pipelineId?: string;      // Pipeline run ID

  // Sorun detayları
  category: IssueCategoryId;
  customNote?: string;      // Kullanıcının ek açıklaması

  // Bağlam (otomatik doldurulur)
  scenarioId?: string;
  productType?: string;
  productId?: string;
  handStyleId?: string;
  compositionId?: string;

  // Meta
  createdAt: number;
  resolved: boolean;        // Sorun çözüldü mü?
  resolvedAt?: number;
}

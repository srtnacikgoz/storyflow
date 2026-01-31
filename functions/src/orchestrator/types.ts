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
  | "interior"    // İç mekan fotoğrafları (vitrin, tezgah, oturma alanı)
  | "accessories"; // Aksesuar (telefon, çanta, anahtar, kitap)

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
  | "napkins"     // Peçeteler, örtüler
  | "boxes"       // Pasta kutuları, çikolata kutuları
  | "bags";       // Kağıt çantalar, paket çantaları

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
 * Aksesuar alt kategorileri
 * Gerçekçi pastane deneyimi için masaya konulan objeler
 */
export type AccessoryType =
  | "phone"           // Akıllı telefon (jenerik, logosuz)
  | "bag"             // El çantası, clutch
  | "keys"            // Araba/ev anahtarı
  | "book"            // Kitap, dergi
  | "toy"             // Çocuk oyuncağı
  | "tablet"          // Tablet (jenerik, logosuz)
  | "glasses"         // Güneş gözlüğü
  | "watch"           // Kol saati
  | "notebook"        // Defter, ajanda
  | "wallet";         // Cüzdan

/**
 * Aksesuar kategorileri için label ve icon
 */
export const ACCESSORY_TYPES: Record<AccessoryType, { label: string; icon: string; description: string }> = {
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

// ==========================================
// MOOD TYPES
// ==========================================

/**
 * Dinamik Mood Tanımı
 * Gemini'ye gönderilecek görsel atmosfer detayları
 */
export interface Mood {
  id: string;
  name: string;            // "Kış Sabahı", "Yağmurlu Cafe"
  description: string;     // UI açıklaması

  // Koşullar
  timeOfDay: "morning" | "afternoon" | "evening" | "night" | "any";
  season: "winter" | "spring" | "summer" | "autumn" | "any";
  weather: "sunny" | "cloudy" | "rainy" | "snowy" | "any";

  // Prompt Enjeksiyonları
  lightingPrompt: string;  // "soft window light, overcast shadows"
  colorGradePrompt: string; // "cool blue tones, desaturated, high contrast"

  // Durum
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// OBJECT IDENTITY ENUMS
// ==========================================
// Gemini'nin nesneleri doğru yorumlaması için standart enum değerleri.
// Serbest metin yerine enum kullanılır → tutarsızlık ve belirsizlik önlenir.

/**
 * Masa üst tabla şekli
 * Gemini'ye geometrik bilgi vermek için (hibrit masa sorununun çözümü)
 */
export type TableTopShape = "circular" | "square" | "rectangular" | "oval";

/**
 * Masa ayak yapısı
 * Üst tabla + ayak yapısı birlikte tanımlanarak geometrik çatışma önlenir
 */
export type TableBaseType = "pedestal" | "four-legged" | "tripod" | "trestle";

/**
 * Fincan/bardak tipi
 * "white ceramic" yerine "espresso cup" gibi net tanım (çay bardağı-kahve fincanı karışıklığının çözümü)
 */
export type CupType =
  | "latte-mug"             // Geniş ağızlı kahve kupası
  | "espresso-cup"          // Küçük espresso fincanı
  | "traditional-tea-glass" // İnce belli çay bardağı
  | "ceramic-teacup"        // Kulplu porselen çay fincanı
  | "tulip-glass"           // Lale bardak (çay)
  | "cappuccino-cup"        // Orta boy cappuccino fincanı
  | "glass-mug";            // Cam kupa (latte, americano)

/**
 * Çatal-bıçak tipi
 * "metal trendy" yerine "dessert fork" gibi fonksiyonel tanım
 */
export type CutleryType =
  | "dessert-fork"     // Küçük tatlı çatalı
  | "dinner-fork"      // Standart yemek çatalı
  | "teaspoon"         // Çay kaşığı
  | "dessert-spoon"    // Tatlı kaşığı
  | "pastry-knife"     // Pasta bıçağı
  | "butter-knife"     // Tereyağı bıçağı
  | "cake-server";     // Pasta servis spatulası

/**
 * Tabak tipi
 * Tabak boyutu ve kullanım amacı
 */
export type PlateType =
  | "dessert-plate"    // Küçük tatlı tabağı
  | "dinner-plate"     // Büyük yemek tabağı
  | "side-plate"       // Yan tabak
  | "serving-plate"    // Servis tabağı
  | "cake-stand";      // Kek standı / ayaklı tabak

/**
 * Object Identity enum label'ları
 * Admin panel dropdown'ları için Türkçe etiketler
 */
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

// ==========================================
// EATING & HOLDING TYPES
// ==========================================

/**
 * Yeme şekli - ürün nasıl yenir
 * Bu alan ürünün servis şeklini belirler
 */
export type EatingMethod =
  | "hand"       // Elle yenir (kurabiye, sandviç)
  | "fork"       // Çatalla yenir (tiramisu, cheesecake, pasta dilimi)
  | "fork-knife" // Çatal-bıçakla yenir (domatesli kruvasan, börek)
  | "spoon"      // Kaşıkla yenir (puding, sufle)
  | "none";      // Yenmez/servis edilir (bütün kek, tart, dekor)

/**
 * @deprecated - geriye uyumluluk için tutulur, yeni kodda EatingMethod kullanın
 * HoldingType artık EatingMethod ile aynı
 */
export type HoldingType = EatingMethod;

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

    // Object Identity alanları - Gemini'ye net geometrik/fonksiyonel bilgi verir
    tableTopShape?: TableTopShape;   // Masa üst tabla şekli (furniture kategorisi)
    tableBaseType?: TableBaseType;   // Masa ayak yapısı (furniture kategorisi)
    cupType?: CupType;               // Fincan/bardak tipi (props kategorisi)
    cutleryType?: CutleryType;       // Çatal-bıçak tipi (props kategorisi)
    plateType?: PlateType;           // Tabak tipi (props kategorisi)
  };

  // Yeme şekli (sadece products kategorisi için)
  // Ürün nasıl yenir: elle, çatalla, kaşıkla, veya servis edilir
  eatingMethod?: EatingMethod;

  // Elle tutulabilir mi? (sadece products kategorisi için)
  // Bu alan senaryo seçiminde "el tutma" sahneleri için kullanılır
  // Örn: Tiramisu kaşıkla yenir ama bardakta servis ediliyorsa elle tutulabilir
  canBeHeldByHand?: boolean;

  // @deprecated - geriye uyumluluk için, yeni kodda eatingMethod kullanın
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
  status: "pending" | "generating" | "awaiting_approval" | "approved" | "published" | "failed" | "cancelled";

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
  exterior?: Asset;       // Dış mekan fotoğrafı (AI atlanır, doğrudan kullanılır)
  accessory?: Asset;      // Aksesuar (telefon, çanta, anahtar, kitap vb.)
  napkin?: Asset;         // Peçete (sofra düzeni için)
  cutlery?: Asset;        // Çatal-bıçak (servis için)

  // Claude'un seçim gerekçesi
  selectionReasoning: string;

  // Çeşitlilik bilgisi
  includesPet: boolean;
  petReason?: string;     // Neden köpek dahil/hariç

  // Aksesuar bilgisi
  includesAccessory?: boolean;  // Aksesuar dahil mi
  accessoryReason?: string;     // Neden aksesuar dahil/hariç

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
 * Kompozisyon varyantı (geriye uyumluluk için)
 * @deprecated Yeni senaryolarda compositionId kullanılır
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

  // Kompozisyon ayarları (tekli seçim - v2.0)
  compositionId?: string;         // Seçilen kompozisyon ID (Firestore'dan)
  compositionEntry?: string;      // Composition entry point (bottom-right, overhead, etc.)

  // Interior senaryolar için (AI görsel üretimi atlanır)
  isInterior?: boolean;           // true ise AI görsel üretimi ATLANIR
  interiorType?: InteriorType;    // Hangi interior kategorisinden asset seçilecek

  // Gemini Terminoloji Ayarları (Admin panelden seçilen)
  mood?: string;                  // Mood ID (deprecated - Tema'dan devralınıyor)
  handPose?: string;              // Hand pose ID (cupping, pinching, breaking, etc.)

  // DEPRECATED: Eski çoklu kompozisyon array'i (geriye uyumluluk için)
  // Yeni senaryolarda compositionId kullanılır
  compositions?: Array<{ id: string; description: string }>;
}

/**
 * Senaryo seçimi
 */
export interface ScenarioSelection {
  scenarioId: string;
  scenarioName: string;
  scenarioDescription: string;  // KRİTİK: Senaryo açıklaması - Gemini'ye ortam bilgisi için

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

  // Tema bilgisi
  themeId?: string;               // Kullanılan tema ID'si
  themeName?: string;             // Tema adı (görüntüleme için)
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

  // Gemini API (text işlemleri için - asset selection, scenario selection, prompt optimization)
  geminiApiKey: string;
  geminiModel: string;            // "gemini-3-pro-image-preview"

  // Reve API (görsel üretimi için - image-to-image transformation)
  reveApiKey?: string;            // Opsiyonel: Reve kullanılacaksa gerekli
  reveVersion?: "latest" | "latest-fast" | "reve-edit@20250915" | "reve-edit-fast@20251030";

  // Görsel üretim provider'ı
  imageProvider?: "gemini" | "reve";  // Default: "gemini"

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

export type RuleType = "include" | "exclude" | "prefer" | "avoid";



export interface PatronRule {
  id: string;
  name: string;
  description?: string;
  type: RuleType;
  target: RuleTarget;
  conditions: RuleCondition[];
  priority: number;           // 1-100, yüksek = öncelikli
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export type RuleTarget =
  | { type: "asset"; assetId: string }
  | { type: "category"; category: AssetCategory }
  | { type: "tag"; tag: string }
  | { type: "tags"; tags: string[]; matchMode: "all" | "any" };

export interface RuleCondition {
  field: "productType" | "mood" | "timeOfDay" | "scenario" | "season";
  operator: "eq" | "neq" | "in" | "notIn" | "contains";
  value: string | string[];
}

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
  patronRules: PatronRule[];
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
  mood: string;            // Firestore Mood document ID referansı (moods collection)
  petAllowed: boolean;     // Köpek dahil edilebilir mi?
  accessoryAllowed: boolean; // Aksesuar dahil edilebilir mi? (telefon, çanta, kitap vb.)

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
    accessoryAllowed: false, // Ürün odaklı, aksesuar yok
    isDefault: true,
  },
  {
    id: "brunch-social",
    name: "Brunch Keyfi",
    description: "Sosyal, paylaşım odaklı brunch atmosferi",
    scenarios: ["kahve-ani", "paylasim"],
    mood: "social",
    petAllowed: false,
    accessoryAllowed: true, // Sosyal ortam, aksesuar uygun
    isDefault: true,
  },
  {
    id: "afternoon-chill",
    name: "Öğleden Sonra Rahatlığı",
    description: "Rahat, dinlendirici öğleden sonra anları",
    scenarios: ["kahve-kosesi", "yarim-kaldi"],
    mood: "relaxed",
    petAllowed: true,
    accessoryAllowed: true, // Rahat ortam, aksesuar uygun
    isDefault: true,
  },
  {
    id: "golden-hour",
    name: "Altın Saat",
    description: "Sıcak, romantik akşam ışığı",
    scenarios: ["cam-kenari", "hediye-acilisi"],
    mood: "warm",
    petAllowed: false,
    accessoryAllowed: false, // Romantik, minimal
    isDefault: true,
  },
  {
    id: "cozy-night",
    name: "Gece Samimiyeti",
    description: "Samimi, rahat gece atmosferi",
    scenarios: ["kahve-kosesi", "yarim-kaldi"],
    mood: "cozy",
    petAllowed: true,
    accessoryAllowed: true, // Samimi ortam, aksesuar uygun
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
    accessoryAllowed: false, // Mekan odaklı, aksesuar yok
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

// ==========================================
// FIRESTORE CONFIG TYPES
// ==========================================

/**
 * Firestore'da saklanan senaryo
 * Collection: global/scenarios/{scenarioId}
 */
export interface FirestoreScenario extends Scenario {
  // Firestore meta
  createdAt: number;
  updatedAt: number;
  isActive: boolean;

  // Ek detaylar (ORCHESTRATOR.md'den)
  suggestedProducts?: ProductType[];    // Bu senaryo için önerilen ürün tipleri
  suggestedTimeSlots?: string[];        // Uygun zaman dilimleri (morning, afternoon, vb.)
  mood?: string;                        // Senaryo mood'u
}

/**
 * Firestore'da saklanan el stili
 * Collection: global/hand-styles/{styleId}
 */
export interface FirestoreHandStyle extends HandStyle {
  // Firestore meta
  createdAt: number;
  updatedAt: number;
  isActive: boolean;

  // Ek detaylar
  compatibleScenarios?: string[];       // Uyumlu senaryo ID'leri
  targetDemographic?: string;           // Hedef kitle
}

/**
 * Firestore'da saklanan asset kişiliği
 * Collection: global/asset-personalities/{assetId}
 */
export interface FirestoreAssetPersonality extends AssetPersonality {
  // Firestore meta
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

/**
 * Firestore'da saklanan çeşitlilik kuralları
 * Document: global/config/diversity-rules
 */
export interface FirestoreDiversityRules extends VariationRules {
  // Firestore meta
  updatedAt: number;
  updatedBy?: string;                   // Son güncelleyen
}

/**
 * Firestore'da saklanan zaman-mood eşleştirmeleri
 * Document: global/config/time-mood
 */
export interface FirestoreTimeMoodConfig {
  mappings: TimeMoodMapping[];
  updatedAt: number;
  updatedBy?: string;
}

/**
 * Firestore'da saklanan haftalık temalar
 * Document: global/config/weekly-themes
 */
export interface FirestoreWeeklyThemesConfig {
  // Gün bazlı temalar (0: Pazar, 1: Pazartesi, ...)
  themes: Record<string, WeeklyTheme>;
  updatedAt: number;
  updatedBy?: string;
}

/**
 * Firestore'da saklanan mutlak kurallar
 * Document: global/config/absolute-rules
 */
export interface FirestoreAbsoluteRulesConfig {
  // Kategori bazlı kurallar
  productRules: string[];               // Ürün kuralları
  prohibitedElements: string[];         // Yasak elementler
  qualityRules: string[];               // Kalite kuralları

  // Düz liste (tümü)
  allRules: string[];

  // Meta
  updatedAt: number;
  updatedBy?: string;
}

/**
 * Orchestrator talimatları
 * Document: global/config/orchestrator-instructions
 *
 * Claude'un nasıl davranacağını belirleyen talimatlar
 */
export interface FirestoreOrchestratorInstructions {
  // Seçim yaparken
  selectionInstructions: string[];

  // Prompt oluştururken
  promptInstructions: string[];

  // Kalite kontrolde
  qualityControlInstructions: string[];

  // Ek notlar
  generalNotes?: string;

  // Meta
  updatedAt: number;
  updatedBy?: string;
}

/**
 * Firestore'da saklanan timeout ayarları
 * Document: global/config/settings/timeouts
 *
 * Bu ayarlar runtime'da değiştirilebilir (deploy gerektirmez)
 */
export interface FirestoreTimeoutsConfig {
  // Telegram onay timeout (dakika)
  // Kullanıcı bu süre içinde onaylamazsa işlem zaman aşımına uğrar
  telegramApprovalMinutes: number;        // Default: 60

  // İşlem timeout (dakika)
  // Bir slot bu süre içinde tamamlanmazsa "stuck" olarak işaretlenir
  processingTimeoutMinutes: number;       // Default: 120 (2 saat)

  // Fetch timeout (saniye)
  // Harici API çağrıları için maksimum bekleme süresi
  fetchTimeoutSeconds: number;            // Default: 30

  // Retry bekleme (milisaniye)
  // Başarısız işlemler arasında bekleme süresi
  retryDelayMs: number;                   // Default: 5000

  // Meta
  updatedAt: number;
  updatedBy?: string;
}

// ==========================================
// RULE ENGINE CONFIG TYPES
// ==========================================



export interface FilterThresholds {
  default: number;           // Varsayılan: 70
  products: number;
  tables: number;
  plates: number;
  cups: number;
  accessories: number;
  napkins: number;
  cutlery: number;
}

export interface FirestoreRuleEngineConfig {
  thresholds: FilterThresholds;
  updatedAt: number;
  updatedBy?: string;
}

export interface ScoringWeights {
  tagMatch: {
    weight: number;          // Varsayılan: 40
    exactMatchBonus: number; // Varsayılan: 10
    partialMatchBonus: number; // Varsayılan: 5
  };
  usageBonus: {
    weight: number;          // Varsayılan: 20
    formula: "linear" | "logarithmic" | "inverse";
    maxBonus: number;
  };
  moodMatch: {
    weight: number;          // Varsayılan: 20
    moodTags: Record<string, string[]>;
  };
  productCompat: {
    weight: number;          // Varsayılan: 20
    matrix: CompatibilityMatrix;
  };
}

export interface CompatibilityMatrix {
  [productType: string]: {
    preferredTables: string[];   // Tag'ler: ["wooden", "marble"]
    avoidTables: string[];
    preferredPlates: string[];
    avoidPlates: string[];
    preferredCups: string[];
    avoidCups: string[];
  };
}

/**
 * Tüm global config'leri birleştiren tip
 * Orchestrator başlatılırken bu tip kullanılır
 */
export interface GlobalOrchestratorConfig {
  scenarios: Scenario[];
  handStyles: HandStyle[];
  assetPersonalities: AssetPersonality[];
  diversityRules: FirestoreDiversityRules;
  timeMoodConfig: FirestoreTimeMoodConfig;
  weeklyThemes: FirestoreWeeklyThemesConfig;
  absoluteRules: FirestoreAbsoluteRulesConfig;
  instructions: FirestoreOrchestratorInstructions;
  timeouts: FirestoreTimeoutsConfig;
  systemSettings: FirestoreSystemSettingsConfig;
  fixedAssets: FirestoreFixedAssetsConfig;
  businessContext: FirestoreBusinessContextConfig;
  assetSelectionConfig: FirestoreAssetSelectionConfig;
  promptStudio: FirestorePromptStudioConfig;
  // NEW: Rule Engine
  ruleEngine: FirestoreRuleEngineConfig;

  categories: FirestoreCategoriesConfig;  // Dinamik kategoriler
  loadedAt: number;
  version: string;
}

// ==========================================
// DYNAMIC CATEGORY SYSTEM
// ==========================================

/**
 * Bilinen ürün kategorileri (IDE autocomplete için)
 * Yeni kategoriler Firestore'dan dinamik olarak gelir
 * Slug'lar immutable - sadece displayName değişebilir
 */
export const KNOWN_PRODUCT_TYPES = [
  "croissants",
  "pastas",
  "chocolates",
  "coffees",
] as const;

export type KnownProductType = typeof KNOWN_PRODUCT_TYPES[number];

/**
 * Validation helper - slug'ın bilinen kategorilerden biri olup olmadığını kontrol eder
 */
export function isKnownProductType(value: string): value is KnownProductType {
  return KNOWN_PRODUCT_TYPES.includes(value as KnownProductType);
}

/**
 * Runtime validation - dinamik kategoriler dahil tüm geçerli slug'ları kontrol eder
 * @param slug - Kontrol edilecek slug
 * @param dynamicSlugs - Firestore'dan gelen dinamik kategori slug'ları
 */
export function isValidCategorySlug(slug: string, dynamicSlugs: string[] = []): boolean {
  const allValidSlugs = [...KNOWN_PRODUCT_TYPES, ...dynamicSlugs];
  return allValidSlugs.includes(slug.toLowerCase());
}

/**
 * Ana kategori türleri (Asset kategorileri)
 * Bu türler sabittir - alt kategoriler dinamiktir
 */
export type DynamicCategoryType =
  | "products"     // Ürünler (kruvasan, pasta, çikolata, kahve)
  | "props"        // Aksesuarlar (tabak, fincan, çatal)
  | "furniture"    // Mobilya (masa, sandalye, dekor)
  | "accessories"  // Kişisel aksesuarlar (telefon, çanta, kitap)
  | "pets"         // Evcil hayvanlar (köpek, kedi)
  | "environments" // Ortamlar (iç mekan, dış mekan)
  | "interior";    // İç mekan fotoğrafları (vitrin, tezgah)

/**
 * Alt kategori tanımı
 * Örn: products altında "croissants", "pastas" gibi alt kategoriler
 *
 * ID-Based Architecture (SaaS-Ready):
 * - `id`: Otomatik üretilen unique ID (referanslar için kullanılır)
 * - `slug`: İnsan-okunabilir, URL-friendly identifier (display için)
 *
 * Referanslar (Asset.subTypeId, TimeSlotRule.productTypeIds) ID kullanır.
 * Slug'lar sadece UI gösterimi ve backward-compatibility için tutulur.
 */
export interface CategorySubType {
  id: string;                // Auto-generated unique ID (referanslar bu ID'yi kullanır)
  slug: string;              // "croissants" - human-readable, URL-friendly
  displayName: string;       // "Kruvasanlar" - değiştirilebilir
  icon?: string;             // "🥐"
  description?: string;      // "Taze kruvasanlar ve viennoiseriler"
  order: number;             // Sıralama (1, 2, 3...)
  isActive: boolean;         // Aktif/Pasif

  // Ürün kategorileri için özel alanlar (products için)
  eatingMethodDefault?: EatingMethod;  // Varsayılan yeme şekli
  canBeHeldDefault?: boolean;          // Varsayılan elle tutulabilirlik
}

/**
 * Dinamik kategori tanımı
 * Document: global/config/settings/categories
 */
export interface DynamicCategory {
  type: DynamicCategoryType;   // "products", "props", "furniture"
  displayName: string;         // "Ürünler"
  icon: string;                // "📦"
  description?: string;        // "Satışa sunulan ürün görselleri"
  order: number;               // Kategori sıralaması

  // Alt kategoriler
  subTypes: CategorySubType[];

  // Sistem kategorisi mi? (true ise silinemez)
  isSystem: boolean;

  // Soft delete - silinmiş kategoriler görünmez ama referanslar korunur
  isDeleted: boolean;

  // Meta
  createdAt: number;
  updatedAt: number;
  updatedBy?: string;
}

/**
 * Firestore'da saklanan kategori konfigürasyonu
 * Document: global/config/settings/categories
 *
 * Bu yapı tüm kategorileri tek bir döküman içinde tutar
 * Böylece tek bir okuma ile tüm kategoriler yüklenir
 */
export interface FirestoreCategoriesConfig {
  // Kategori listesi (type'a göre indexed)
  categories: DynamicCategory[];

  // Cache TTL (dakika)
  cacheTTLMinutes: number;

  // Meta
  version: string;           // "1.0.0" - şema versiyonu
  updatedAt: number;
  updatedBy?: string;
}

/**
 * Varsayılan kategoriler - seed data için
 *
 * ID Format: {categoryType}_{slug}
 * Bu format hem okunabilir hem de unique. Migration için deterministik.
 */
export const DEFAULT_CATEGORIES: Omit<DynamicCategory, "createdAt" | "updatedAt">[] = [
  {
    type: "products",
    displayName: "Ürünler",
    icon: "🥐",
    description: "Satışa sunulan ürün görselleri",
    order: 1,
    isSystem: true,
    isDeleted: false,
    subTypes: [
      { id: "products_croissants", slug: "croissants", displayName: "Kruvasanlar", icon: "🥐", order: 1, isActive: true, eatingMethodDefault: "hand", canBeHeldDefault: true },
      { id: "products_pastas", slug: "pastas", displayName: "Pastalar", icon: "🎂", order: 2, isActive: true, eatingMethodDefault: "fork", canBeHeldDefault: false },
      { id: "products_chocolates", slug: "chocolates", displayName: "Çikolatalar", icon: "🍫", order: 3, isActive: true, eatingMethodDefault: "hand", canBeHeldDefault: true },
      { id: "products_coffees", slug: "coffees", displayName: "Kahveler", icon: "☕", order: 4, isActive: true, eatingMethodDefault: "none", canBeHeldDefault: true },
    ],
  },
  {
    type: "props",
    displayName: "Aksesuarlar",
    icon: "🍽️",
    description: "Tabak, fincan, çatal-bıçak gibi servis ekipmanları",
    order: 2,
    isSystem: true,
    isDeleted: false,
    subTypes: [
      { id: "props_plates", slug: "plates", displayName: "Tabaklar", icon: "🍽️", order: 1, isActive: true },
      { id: "props_cups", slug: "cups", displayName: "Fincanlar", icon: "☕", order: 2, isActive: true },
      { id: "props_cutlery", slug: "cutlery", displayName: "Çatal-Bıçak", icon: "🍴", order: 3, isActive: true },
      { id: "props_napkins", slug: "napkins", displayName: "Peçeteler", icon: "🧻", order: 4, isActive: true },
      { id: "props_boxes", slug: "boxes", displayName: "Kutular", icon: "📦", order: 5, isActive: true },
      { id: "props_bags", slug: "bags", displayName: "Çantalar", icon: "🛍️", order: 6, isActive: true },
    ],
  },
  {
    type: "furniture",
    displayName: "Mobilya",
    icon: "🪑",
    description: "Masa, sandalye ve dekorasyon öğeleri",
    order: 3,
    isSystem: true,
    isDeleted: false,
    subTypes: [
      { id: "furniture_tables", slug: "tables", displayName: "Masalar", icon: "🪵", order: 1, isActive: true },
      { id: "furniture_chairs", slug: "chairs", displayName: "Sandalyeler", icon: "🪑", order: 2, isActive: true },
      { id: "furniture_decor", slug: "decor", displayName: "Dekorasyon", icon: "🌸", order: 3, isActive: true },
    ],
  },
  {
    type: "accessories",
    displayName: "Kişisel Aksesuarlar",
    icon: "📱",
    description: "Telefon, çanta, kitap gibi masa üstü objeler",
    order: 4,
    isSystem: true,
    isDeleted: false,
    subTypes: [
      { id: "accessories_phone", slug: "phone", displayName: "Telefon", icon: "📱", order: 1, isActive: true },
      { id: "accessories_bag", slug: "bag", displayName: "Çanta", icon: "👜", order: 2, isActive: true },
      { id: "accessories_keys", slug: "keys", displayName: "Anahtar", icon: "🔑", order: 3, isActive: true },
      { id: "accessories_book", slug: "book", displayName: "Kitap", icon: "📚", order: 4, isActive: true },
      { id: "accessories_glasses", slug: "glasses", displayName: "Gözlük", icon: "🕶️", order: 5, isActive: true },
      { id: "accessories_watch", slug: "watch", displayName: "Saat", icon: "⌚", order: 6, isActive: true },
      { id: "accessories_notebook", slug: "notebook", displayName: "Defter", icon: "📓", order: 7, isActive: true },
      { id: "accessories_wallet", slug: "wallet", displayName: "Cüzdan", icon: "👛", order: 8, isActive: true },
    ],
  },
  {
    type: "pets",
    displayName: "Evcil Hayvanlar",
    icon: "🐕",
    description: "Köpek ve kedi görselleri",
    order: 5,
    isSystem: true,
    isDeleted: false,
    subTypes: [
      { id: "pets_dogs", slug: "dogs", displayName: "Köpekler", icon: "🐕", order: 1, isActive: true },
      { id: "pets_cats", slug: "cats", displayName: "Kediler", icon: "🐈", order: 2, isActive: true },
    ],
  },
  {
    type: "environments",
    displayName: "Ortamlar",
    icon: "🏠",
    description: "İç ve dış mekan görselleri",
    order: 6,
    isSystem: true,
    isDeleted: false,
    subTypes: [
      { id: "environments_indoor", slug: "indoor", displayName: "İç Mekan", icon: "🏠", order: 1, isActive: true },
      { id: "environments_outdoor", slug: "outdoor", displayName: "Dış Mekan", icon: "🌳", order: 2, isActive: true },
      { id: "environments_window", slug: "window", displayName: "Pencere Önü", icon: "🪟", order: 3, isActive: true },
      { id: "environments_cafe", slug: "cafe", displayName: "Kafe", icon: "☕", order: 4, isActive: true },
      { id: "environments_home", slug: "home", displayName: "Ev", icon: "🏡", order: 5, isActive: true },
    ],
  },
  {
    type: "interior",
    displayName: "İç Mekan Fotoğrafları",
    icon: "🏪",
    description: "Pastane atmosferini yansıtan gerçek fotoğraflar (AI üretimi yapılmaz)",
    order: 7,
    isSystem: true,
    isDeleted: false,
    subTypes: [
      { id: "interior_vitrin", slug: "vitrin", displayName: "Vitrin", icon: "🪟", order: 1, isActive: true },
      { id: "interior_tezgah", slug: "tezgah", displayName: "Tezgah", icon: "🍰", order: 2, isActive: true },
      { id: "interior_oturma-alani", slug: "oturma-alani", displayName: "Oturma Alanı", icon: "🛋️", order: 3, isActive: true },
      { id: "interior_dekorasyon", slug: "dekorasyon", displayName: "Dekorasyon", icon: "🌺", order: 4, isActive: true },
      { id: "interior_genel-mekan", slug: "genel-mekan", displayName: "Genel Mekan", icon: "🏪", order: 5, isActive: true },
    ],
  },
];

/**
 * SubType ID üretme helper fonksiyonu
 * Format: {categoryType}_{slug}_{timestamp}
 * Yeni alt kategoriler için kullanılır
 */
export function generateSubTypeId(categoryType: DynamicCategoryType, slug: string): string {
  // Deterministic ID for existing slugs (migration için)
  return `${categoryType}_${slug}`;
}

/**
 * Yeni/custom alt kategoriler için unique ID üretir
 * Format: {categoryType}_{slug}_{timestamp}
 */
export function generateUniqueSubTypeId(categoryType: DynamicCategoryType, slug: string): string {
  const timestamp = Date.now().toString(36); // Base36 for shorter IDs
  return `${categoryType}_${slug}_${timestamp}`;
}

// ==========================================
// AI RULES SYSTEM (Öğrenme Kuralları)
// ==========================================

/**
 * AI Kural kategorileri
 * Kullanıcı Claude'a öğretirken seçer
 */
export type AIRuleCategoryId =
  | "beverage"      // İçecek kuralları (bardak dolu olmalı vb.)
  | "composition"   // Kompozisyon kuralları (aksesuar ekle vb.)
  | "lighting"      // Işık kuralları
  | "product"       // Ürün kuralları
  | "background"    // Arka plan kuralları
  | "hand"          // El kuralları
  | "general";      // Genel kurallar

/**
 * AI Kural kategorisi açıklamaları
 */
export const AI_RULE_CATEGORIES: Record<AIRuleCategoryId, { label: string; icon: string }> = {
  beverage: { label: "İçecek", icon: "☕" },
  composition: { label: "Kompozisyon", icon: "🎨" },
  lighting: { label: "Işık", icon: "💡" },
  product: { label: "Ürün", icon: "🥐" },
  background: { label: "Arka Plan", icon: "🖼️" },
  hand: { label: "El", icon: "✋" },
  general: { label: "Genel", icon: "📋" },
};

/**
 * AI Öğrenme Kuralı
 * Kullanıcının Claude'a öğrettiği yapılacak/yapılmayacak kurallar
 */
export interface AIRule {
  id: string;

  // Kural tipi
  type: "do" | "dont";            // Yapılacak / Yapılmayacak

  // Kategori
  category: AIRuleCategoryId;

  // İçerik
  title: string;                   // Kısa başlık (ör: "Bardak boş olmamalı")
  description: string;             // Detaylı açıklama

  // Görsel örnek (opsiyonel)
  exampleImageUrl?: string;        // Kural için örnek görsel

  // Durum
  isActive: boolean;               // Aktif/Pasif

  // Meta
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// PROMPT STUDIO (Config-Driven Prompts)
// ==========================================

/**
 * Prompt Studio - Pipeline stage ID'leri
 * Her stage'in system prompt'u Firestore'da saklanır ve runtime'da düzenlenebilir
 */
export type PromptStageId =
  | "asset-selection"
  | "scenario-selection"
  | "prompt-optimization"
  | "quality-control"
  | "content-generation";

/**
 * Prompt versiyon kaydı
 * Her güncelleme otomatik olarak history'ye eklenir
 */
export interface PromptVersion {
  version: number;
  systemPrompt: string;
  updatedAt: number;
  updatedBy?: string;
  changeNote?: string;
}

/**
 * Prompt şablonu
 * Bir pipeline stage'inin system prompt'u ve metadata'sı
 *
 * Template değişkenler: {{variable}} formatında
 * Runtime'da interpolatePrompt() ile çözümlenir
 */
export interface PromptTemplate {
  id: PromptStageId;
  name: string;                    // "Asset Seçimi"
  description: string;             // "Ürün, tabak, masa vb. asset kombinasyonunu seçer"
  stage: string;                   // Pipeline stage adı
  systemPrompt: string;            // Template değişkenli system prompt
  variables: string[];             // Kullanılabilir template değişkenler (bilgi amaçlı)
  version: number;                 // Otomatik artan versiyon numarası
  history: PromptVersion[];        // Son 10 versiyon (revert için)
  updatedAt: number;
  updatedBy?: string;
}

/**
 * Firestore'da saklanan Prompt Studio konfigürasyonu
 * Document: global/config/settings/prompt-studio
 *
 * 5 system prompt'u tek bir dokümanda saklar.
 * Fallback: Firestore okunamazsa hardcoded default'lar kullanılır.
 */
export interface FirestorePromptStudioConfig {
  prompts: Record<PromptStageId, PromptTemplate>;
  updatedAt: number;
  updatedBy?: string;
}

// ==========================================
// SYSTEM SETTINGS (Hardcoded → Config)
// ==========================================

/**
 * Firestore'da saklanan sistem ayarları
 * Document: global/config/settings/system-settings
 *
 * Bu ayarlar runtime'da değiştirilebilir (deploy gerektirmez)
 * Hardcoded değerlerin config'e taşınmış hali
 */
export interface FirestoreSystemSettingsConfig {
  // Otomatik Paylaşım (Scheduler)
  schedulerEnabled: boolean;          // Default: true - Tüm otomatik üretimleri açar/kapar

  // AI Maliyetleri (USD per 1K token)
  claudeInputCostPer1K: number;       // Default: 0.003
  claudeOutputCostPer1K: number;      // Default: 0.015

  // AI Ayarları
  geminiDefaultFaithfulness: number;  // Default: 0.7 (0.0-1.0 arası)

  // Feedback
  maxFeedbackForPrompt: number;       // Default: 10

  // Sistem
  stuckWarningMinutes: number;        // Default: 15
  maxLogsPerQuery: number;            // Default: 100
  cacheTTLMinutes: number;            // Default: 5

  // Meta
  updatedAt: number;
  updatedBy?: string;
}

/**
 * Sabit Asset Konfigürasyonu
 * Document: global/config/settings/fixed-assets
 *
 * Belirli asset'lerin her zaman seçilmesini sağlar.
 * "Mermer masa sabit, üzerindekiler serbest" kullanım senaryosu için.
 *
 * Sabit asset'ler diversity algoritmasından muaf tutulur:
 * - blockedTables kontrolünden geçmez
 * - Her üretimde otomatik seçilir
 * - Diğer asset'ler (tabak, fincan vb.) normal rotation'a devam eder
 */
export interface FirestoreFixedAssetsConfig {
  // Sabit masa (her zaman bu masa seçilir)
  // null ise normal diversity algoritması çalışır
  fixedTableId: string | null;

  // Sabit tabak (opsiyonel)
  fixedPlateId: string | null;

  // Sabit fincan (opsiyonel)
  fixedCupId: string | null;

  // Aktif mi? (false ise tüm sabit seçimler devre dışı)
  isEnabled: boolean;

  // Meta
  updatedAt: number;
  updatedBy?: string;
}

/**
 * İşletme Bağlamı Konfigürasyonu
 * Document: global/config/settings/business-context
 *
 * SaaS uyumlu: Her tenant kendi işletme bağlamını tanımlayabilir.
 * Bu bilgiler prompt'a eklenerek AI'ın doğru mekan/ortam üretmesini sağlar.
 *
 * Örnek kullanım:
 * - Zemin kat pastane → "high-rise window view" üretilmez
 * - Ahşap dekorlu mekan → uygun arka plan üretilir
 */
export interface FirestoreBusinessContextConfig {
  // İşletme Bilgileri
  businessName: string;           // "Sade Patisserie"
  businessType: string;           // "pastane", "kafe", "restoran"

  // Mekan Bilgileri (AI'ın doğru ortam üretmesi için kritik)
  locationDescription: string;    // "Zemin kattaki butik pastane, sokak seviyesinde vitrini var"
  floorLevel: "ground" | "upper" | "basement" | "outdoor";  // Kat bilgisi
  hasStreetView: boolean;         // Sokak manzarası var mı?
  hasWindowView: boolean;         // Pencere manzarası var mı?
  windowViewDescription?: string; // Varsa: "Sokak manzarası", "Bahçe manzarası"

  // Dekorasyon Stili
  decorStyle: string;             // "Minimal modern", "Rustik ahşap", "Industrial"
  dominantMaterials: string[];    // ["ahşap", "mermer", "seramik"]
  colorScheme: string;            // "Sıcak krem ve kahve tonları"

  // AI Prompt için oluşturulmuş özet (otomatik veya manuel)
  promptContext: string;          // "Ground floor artisan patisserie with warm cream tones, wooden accents, no high-rise views"

  // Meta
  isEnabled: boolean;             // false ise prompt'a eklenmez
  updatedAt: number;
  updatedBy?: string;
}

// ==========================================
// ASSET SELECTION CONFIG
// ==========================================

/**
 * Tek bir asset kategorisi için seçim kuralı
 */
export interface AssetCategoryRule {
  // Bu asset kategorisi dahil edilsin mi?
  // true = ZORUNLU (Gemini mutlaka seçmeli)
  // false = HARİÇ (Gemini hiç seçmemeli, listeye bile gönderilmez)
  enabled: boolean;
}

/**
 * Asset Seçim Kuralları Konfigürasyonu
 * Document: global/config/settings/asset-selection
 *
 * İki farklı mod için ayrı kurallar:
 * - manual: "Şimdi Üret" butonu ile manuel tetikleme
 * - scheduled: Otomatik pipeline (scheduler)
 *
 * Her asset kategorisi için enabled/disabled durumu saklar.
 * enabled=true → ZORUNLU, enabled=false → HARİÇ
 */
export interface FirestoreAssetSelectionConfig {
  // Manuel üretim kuralları ("Şimdi Üret" butonu)
  manual: {
    plate: AssetCategoryRule;      // Tabak
    table: AssetCategoryRule;      // Masa
    cup: AssetCategoryRule;        // Fincan
    accessory: AssetCategoryRule;  // Aksesuar (çiçek, mum vb.)
    napkin: AssetCategoryRule;     // Peçete
    cutlery: AssetCategoryRule;    // Çatal-bıçak
  };

  // Otomatik pipeline kuralları (Scheduler)
  scheduled: {
    plate: AssetCategoryRule;
    table: AssetCategoryRule;
    cup: AssetCategoryRule;
    accessory: AssetCategoryRule;
    napkin: AssetCategoryRule;
    cutlery: AssetCategoryRule;
  };

  // Meta
  updatedAt: number;
  updatedBy?: string;
}

// ==========================================
// STYLE TYPES
// ==========================================

/**
 * Asset Stili
 * Dinamik stil tanımları (Modern, Rustic, Minimal vb.)
 */
export interface Style {
  id: string;          // slug (örn: "modern", "rustic")
  displayName: string; // Görünen ad (örn: "Modern", "Rustik")
  description?: string;// Açıklama
  isActive: boolean;
  order: number;       // Sıralama
  createdAt: number;
  updatedAt: number;
}



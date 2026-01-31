/**
 * Default Seed Data for Firestore
 * ORCHESTRATOR.md'den taşınan tüm veriler
 *
 * Bu dosya Firestore'a ilk yükleme için kullanılır.
 * Global collection yapısı:
 * - global/scenarios/{scenarioId}
 * - global/hand-styles/{styleId}
 * - global/asset-personalities/{assetId}
 * - global/config/diversity-rules
 * - global/config/time-mood
 * - global/config/weekly-themes
 * - global/config/absolute-rules
 * - global/config/orchestrator-instructions
 */

import {
  FirestoreScenario,
  FirestoreHandStyle,
  FirestoreAssetPersonality,
  FirestoreDiversityRules,
  FirestoreTimeMoodConfig,
  FirestoreWeeklyThemesConfig,
  FirestoreAbsoluteRulesConfig,
  FirestoreOrchestratorInstructions,
  FirestoreTimeoutsConfig,
  FirestoreSystemSettingsConfig,
  FirestoreFixedAssetsConfig,
  FirestoreBusinessContextConfig,
  FirestoreAssetSelectionConfig, // Restored
  FirestorePromptStudioConfig,
  PromptTemplate,
  CompositionVariant,
  FirestoreRuleEngineConfig,
} from "../types";

// ==========================================
// RULE ENGINE CONFIG (YENİ)
// ==========================================

export const DEFAULT_RULE_ENGINE_CONFIG: Omit<FirestoreRuleEngineConfig, "updatedAt"> = {
  thresholds: {
    default: 50,
    products: 50,
    tables: 50,
    plates: 50,
    cups: 50,
    accessories: 50,
    napkins: 50,
    cutlery: 50,
  },
};

// ==========================================
// SENARYOLAR
// ==========================================

/**
 * Kompozisyon varyantları helper
 */
const createCompositions = (variants: string[]): CompositionVariant[] =>
  variants.map((v) => ({ id: v, description: v }));

/**
 * Varsayılan senaryolar
 * ORCHESTRATOR.md'den taşındı + ambalaj senaryoları eklendi
 */
export const DEFAULT_SCENARIOS: Omit<FirestoreScenario, "createdAt" | "updatedAt">[] = [
  // =====================
  // EL İÇEREN SENARYOLAR
  // =====================
  {
    id: "zarif-tutma",
    name: "Zarif Tutma",
    description: "Bakımlı el ürün tutuyor. Premium, şık görünüm.",
    includesHands: true,
    compositions: createCompositions([
      "bottom-right",   // El sağ alt köşeden giriyor, ürün sol üstte
      "bottom-left",    // El sol alt köşeden giriyor, ürün sağ üstte
      "top-corner",     // El üst köşeden giriyor, ürün alt kısımda
      "center-hold",    // Ürün ortada, el alttan tutuyor
    ]),
    isActive: true,
    suggestedProducts: ["croissants", "chocolates"],
    suggestedTimeSlots: ["morning", "afternoon"],
    mood: "elegant",
  },
  {
    id: "kahve-ani",
    name: "Kahve Anı",
    description: "Eller fincan tutuyor, ürün ön planda. Sosyal, paylaşım odaklı.",
    includesHands: true,
    compositions: createCompositions([
      "product-front",  // Ürün ön planda keskin, eller arkada bulanık
      "product-side",   // Ürün yanda, eller diagonal pozisyonda
      "overhead",       // Kuş bakışı, ürün ve fincan yan yana
    ]),
    isActive: true,
    suggestedProducts: ["croissants", "pastas"],
    suggestedTimeSlots: ["morning", "brunch"],
    mood: "social",
  },
  {
    id: "hediye-acilisi",
    name: "Hediye Açılışı",
    description: "El kutu açıyor. Sürpriz, heyecan anı.",
    includesHands: true,
    compositions: createCompositions([
      "box-center",     // Kutu ortada, eller açarken
      "box-angled",     // Kutu açılı, kapak görünür
      "unwrapping",     // Ambalaj açılma anı
    ]),
    isActive: true,
    suggestedProducts: ["chocolates", "pastas"],
    suggestedTimeSlots: ["afternoon", "evening"],
    mood: "exciting",
  },
  {
    id: "ilk-dilim",
    name: "İlk Dilim",
    description: "El çatalla pasta alıyor. İştah açıcı, davetkar.",
    includesHands: true,
    compositions: createCompositions([
      "fork-entering",  // Çatal pastaya giriyor
      "slice-lifted",   // Dilim kaldırılmış
      "mid-bite",       // Yarım alınmış dilim
    ]),
    isActive: true,
    suggestedProducts: ["pastas"],
    suggestedTimeSlots: ["afternoon", "evening"],
    mood: "inviting",
  },

  // =====================
  // EL İÇERMEYEN SENARYOLAR
  // =====================
  {
    id: "cam-kenari",
    name: "Cam Kenarı",
    description: "Pencere önü, doğal ışık. Aydınlık, ferah atmosfer.",
    includesHands: false,
    compositions: createCompositions([
      "window-left",    // Pencere solda
      "window-right",   // Pencere sağda
      "window-center",  // Ürün pencere ortasında
    ]),
    isActive: true,
    suggestedProducts: ["croissants", "pastas", "coffees"],
    suggestedTimeSlots: ["morning", "afternoon", "golden-hour"],
    mood: "fresh",
  },
  {
    id: "mermer-zarafet",
    name: "Mermer Zarafet",
    description: "Mermer yüzey, premium sunum. Lüks, sofistike.",
    includesHands: false,
    compositions: createCompositions([
      "centered",             // Ürün merkeze
      "diagonal",             // Çapraz yerleşim
      "corner-composition",   // Köşe kompozisyonu
    ]),
    isActive: true,
    suggestedProducts: ["chocolates", "pastas"],
    suggestedTimeSlots: ["afternoon", "evening"],
    mood: "luxurious",
  },
  {
    id: "kahve-kosesi",
    name: "Kahve Köşesi",
    description: "Rahat köşe, cozy atmosfer. Samimi, ev sıcaklığı.",
    includesHands: false,
    compositions: createCompositions([
      "cozy-corner",    // Rahat köşe düzeni
      "reading-nook",   // Kitap/dergi ile
      "pet-friendly",   // Köpek dahil edilebilir
    ]),
    isActive: true,
    suggestedProducts: ["croissants", "pastas", "coffees"],
    suggestedTimeSlots: ["afternoon", "evening"],
    mood: "cozy",
  },
  {
    id: "yarim-kaldi",
    name: "Yarım Kaldı",
    description: "Isırık alınmış, yarı dolu fincan. Wabi-sabi, yaşanmışlık.",
    includesHands: false,
    compositions: createCompositions([
      "bitten-product",   // Isırık izi görünür
      "half-eaten",       // Yarı yenmiş
      "crumbs-scattered", // Kırıntılar dağılmış
    ]),
    isActive: true,
    suggestedProducts: ["croissants", "chocolates"],
    suggestedTimeSlots: ["afternoon", "evening"],
    mood: "authentic",
  },
  {
    id: "paylasim",
    name: "Paylaşım",
    description: "İki tabak, sosyal an. Birliktelik, paylaşım.",
    includesHands: false,
    compositions: createCompositions([
      "two-plates",         // İki tabak yan yana
      "sharing-moment",     // Paylaşım anı
      "conversation",       // Sohbet ortamı
    ]),
    isActive: true,
    suggestedProducts: ["pastas", "croissants"],
    suggestedTimeSlots: ["brunch", "afternoon"],
    mood: "social",
  },
  {
    id: "paket-servis",
    name: "Paket Servis",
    description: "Kraft torba, takeaway. Pratik, hareket halinde.",
    includesHands: false,
    compositions: createCompositions([
      "package-hero",     // Paket ana kahraman
      "unboxing",         // Açılış anı
      "takeaway-ready",   // Alıp gitmeye hazır
    ]),
    isActive: true,
    suggestedProducts: ["croissants", "chocolates"],
    suggestedTimeSlots: ["morning", "afternoon"],
    mood: "practical",
  },

  // =====================
  // AMBALAJ SENARYOLARI (YENİ)
  // =====================
  {
    id: "hediye-hazirligi",
    name: "Hediye Hazırlığı",
    description: "Şık kutuda ürünler. Özel günler, hediye konsepti.",
    includesHands: false,
    compositions: createCompositions([
      "box-open",           // Kutu açık, içi görünür
      "ribbon-detail",      // Kurdele detayı
      "gift-arrangement",   // Hediye düzeni
    ]),
    isActive: true,
    suggestedProducts: ["chocolates", "pastas"],
    suggestedTimeSlots: ["afternoon", "evening"],
    mood: "festive",
  },
  {
    id: "yolda-atistirma",
    name: "Yolda Atıştırma",
    description: "Kraft çanta, hareket halinde tüketim. Gündelik, pratik.",
    includesHands: true,
    compositions: createCompositions([
      "bag-held",           // Çanta elde tutuluyor
      "peek-inside",        // İçerisi görünüyor
      "on-the-go",          // Hareket halinde
    ]),
    isActive: true,
    suggestedProducts: ["croissants", "chocolates"],
    suggestedTimeSlots: ["morning", "afternoon"],
    mood: "casual",
  },
  {
    id: "kutu-acilis",
    name: "Kutu Açılışı",
    description: "Çikolata/pasta kutusu açılış anı. Sürpriz, keşif.",
    includesHands: true,
    compositions: createCompositions([
      "lid-lifting",        // Kapak kaldırılıyor
      "first-peek",         // İlk bakış
      "reveal-moment",      // Açılış anı
    ]),
    isActive: true,
    suggestedProducts: ["chocolates", "pastas"],
    suggestedTimeSlots: ["afternoon", "evening"],
    mood: "exciting",
  },

  // =====================
  // İÇ MEKAN SENARYOLARI (INTERIOR)
  // =====================
  {
    id: "vitrin-sergisi",
    name: "Vitrin Sergisi",
    description: "Pastane vitrini görünümü. AI görsel üretimi ATLANIR.",
    includesHands: false,
    compositions: createCompositions(["showcase"]),
    isActive: true,
    isInterior: true,
    interiorType: "vitrin",
    mood: "professional",
  },
  {
    id: "kruvasan-tezgahi",
    name: "Kruvasan Tezgahı",
    description: "Taze çıkmış ürünler tezgahta. AI görsel üretimi ATLANIR.",
    includesHands: false,
    compositions: createCompositions(["counter-display"]),
    isActive: true,
    isInterior: true,
    interiorType: "tezgah",
    mood: "fresh",
  },
  {
    id: "pastane-ici",
    name: "Pastane İçi",
    description: "Genel mekan görünümü. AI görsel üretimi ATLANIR.",
    includesHands: false,
    compositions: createCompositions(["wide-shot"]),
    isActive: true,
    isInterior: true,
    interiorType: "genel-mekan",
    mood: "inviting",
  },
  {
    id: "oturma-kosesi",
    name: "Oturma Köşesi",
    description: "Müşteri oturma alanı. AI görsel üretimi ATLANIR.",
    includesHands: false,
    compositions: createCompositions(["seating-area"]),
    isActive: true,
    isInterior: true,
    interiorType: "oturma-alani",
    mood: "cozy",
  },
  {
    id: "cicek-detay",
    name: "Çiçek Detay",
    description: "Dekorasyon detayları. AI görsel üretimi ATLANIR.",
    includesHands: false,
    compositions: createCompositions(["decor-focus"]),
    isActive: true,
    isInterior: true,
    interiorType: "dekorasyon",
    mood: "aesthetic",
  },
];

// ==========================================
// EL STİLLERİ
// ==========================================

export const DEFAULT_HAND_STYLES: Omit<FirestoreHandStyle, "createdAt" | "updatedAt">[] = [
  {
    id: "elegant",
    name: "Elegant",
    description: "Şık, minimal. Premium görünüm.",
    nailPolish: "Nude/soft pink",
    accessories: "Silver midi ring, thin bracelet",
    tattoo: "Minimalist (ay, yıldız)",
    isActive: true,
    compatibleScenarios: ["zarif-tutma", "hediye-acilisi", "ilk-dilim"],
    targetDemographic: "25-45 yaş, profesyonel kadın",
  },
  {
    id: "bohemian",
    name: "Bohemian",
    description: "Bohem, doğal. Sanatsal ruh.",
    nailPolish: "Earth-tone/terracotta",
    accessories: "Stacked rings, beaded bracelet",
    tattoo: "Çiçek, yaprak motifleri",
    isActive: true,
    compatibleScenarios: ["kahve-ani", "kahve-kosesi", "yarim-kaldi"],
    targetDemographic: "20-35 yaş, yaratıcı",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Sade, temiz. Herkes için uygun.",
    nailPolish: "Yok veya şeffaf",
    accessories: "Single thin gold ring",
    tattoo: "Yok",
    isActive: true,
    compatibleScenarios: ["zarif-tutma", "ilk-dilim", "kutu-acilis"],
    targetDemographic: "Tüm yaşlar",
  },
  {
    id: "trendy",
    name: "Trendy",
    description: "Trend, modern. Genç, dinamik.",
    nailPolish: "French tip",
    accessories: "Chunky gold ring, chain bracelet",
    tattoo: "Geometric, fine line",
    isActive: true,
    compatibleScenarios: ["kahve-ani", "yolda-atistirma"],
    targetDemographic: "18-30 yaş, trend takipçisi",
  },
  {
    id: "sporty",
    name: "Sporty",
    description: "Sportif, aktif. Dinamik yaşam.",
    nailPolish: "Yok",
    accessories: "Fitness watch, simple band",
    tattoo: "Yok",
    isActive: true,
    compatibleScenarios: ["yolda-atistirma", "paket-servis"],
    targetDemographic: "25-40 yaş, aktif yaşam",
  },
];

// ==========================================
// ASSET KİŞİLİKLERİ
// ==========================================

export const DEFAULT_ASSET_PERSONALITIES: Omit<FirestoreAssetPersonality, "createdAt" | "updatedAt">[] = [
  // Masalar
  {
    assetId: "mermer-masa",
    assetName: "Mermer Masa",
    personality: "Lüks, şık, premium",
    mood: "Elegant, sophisticated",
    compatibleScenarios: ["mermer-zarafet", "zarif-tutma", "hediye-acilisi"],
    isActive: true,
  },
  {
    assetId: "ahsap-masa-koyu",
    assetName: "Ahşap Masa (Koyu)",
    personality: "Sıcak, rustik, artisanal",
    mood: "Cozy, warm",
    compatibleScenarios: ["kahve-ani", "cam-kenari", "kahve-kosesi"],
    isActive: true,
  },
  {
    assetId: "ahsap-masa-acik",
    assetName: "Ahşap Masa (Açık)",
    personality: "Ferah, modern, Scandinavian",
    mood: "Fresh, light",
    compatibleScenarios: ["ilk-dilim", "paylasim", "yarim-kaldi"],
    isActive: true,
  },

  // Özel Asset'ler
  {
    assetId: "kopek",
    assetName: "Köpek",
    personality: "Rahat, samimi, ev sıcaklığı",
    mood: "Cozy, friendly",
    compatibleScenarios: ["kahve-kosesi", "yarim-kaldi", "cam-kenari"],
    isActive: true,
  },
  {
    assetId: "bitki",
    assetName: "Dekorasyon (Bitki)",
    personality: "Canlı, taze, doğal",
    mood: "Fresh, natural",
    compatibleScenarios: ["cam-kenari", "kahve-kosesi"],
    isActive: true,
  },
  {
    assetId: "kitap",
    assetName: "Dekorasyon (Kitap)",
    personality: "Entelektüel, rahat",
    mood: "Intellectual, cozy",
    compatibleScenarios: ["kahve-kosesi", "yarim-kaldi"],
    isActive: true,
  },
];

// ==========================================
// ÇEŞİTLİLİK KURALLARI
// ==========================================

export const DEFAULT_DIVERSITY_RULES: Omit<FirestoreDiversityRules, "updatedAt"> = {
  // Minimum aralıklar
  scenarioGap: 3,        // Aynı senaryo min 3 üretim sonra
  tableGap: 2,           // Aynı masa min 2 üretim sonra
  handStyleGap: 4,       // Aynı el stili min 4 üretim sonra
  compositionGap: 5,     // Aynı kompozisyon min 5 üretim sonra
  productGap: 3,         // Aynı ürün min 3 üretim sonra
  plateGap: 2,           // Aynı tabak min 2 üretim sonra
  cupGap: 2,             // Aynı fincan min 2 üretim sonra

  // Özel frekanslar
  petFrequency: 15,      // Köpek her 15 üretimde bir
  outdoorFrequency: 10,  // Dış mekan her 10 üretimde bir
  wabiSabiFrequency: 5,  // Wabi-sabi her 5 üretimde bir

  // Benzerlik eşiği
  similarityThreshold: 50, // Max %50 benzerlik
};

// ==========================================
// TIMEOUT AYARLARI
// ==========================================

export const DEFAULT_TIMEOUTS_CONFIG: Omit<FirestoreTimeoutsConfig, "updatedAt"> = {
  // Telegram onay timeout (dakika)
  // Kullanıcı bu süre içinde onaylamazsa işlem zaman aşımına uğrar
  telegramApprovalMinutes: 60,

  // İşlem timeout (dakika)
  // Bir slot bu süre içinde tamamlanmazsa "stuck" olarak işaretlenir
  processingTimeoutMinutes: 120, // 2 saat

  // Fetch timeout (saniye)
  // Harici API çağrıları için maksimum bekleme süresi
  fetchTimeoutSeconds: 30,

  // Retry bekleme (milisaniye)
  // Başarısız işlemler arasında bekleme süresi
  retryDelayMs: 5000,
};

// ==========================================
// SİSTEM AYARLARI (Hardcoded → Config)
// ==========================================

export const DEFAULT_SYSTEM_SETTINGS_CONFIG: Omit<FirestoreSystemSettingsConfig, "updatedAt"> = {
  // Otomatik Paylaşım
  // true = scheduler her 15 dk çalışır, false = tüm otomatik üretimler durur
  schedulerEnabled: true,

  // AI Maliyetleri (USD per 1K token)
  // Claude Sonnet 4 fiyatlandırması (yaklaşık)
  claudeInputCostPer1K: 0.003,
  claudeOutputCostPer1K: 0.015,

  // AI Ayarları
  // Gemini img2img için varsayılan faithfulness değeri (0.0-1.0)
  geminiDefaultFaithfulness: 0.7,

  // Feedback
  // Claude prompt'una dahil edilecek maksimum geri bildirim sayısı
  maxFeedbackForPrompt: 10,

  // Sistem
  // Bir işlemin "stuck" olarak işaretlenmesi için dakika
  stuckWarningMinutes: 15,
  // AI log sorgusunda maksimum kayıt sayısı
  maxLogsPerQuery: 100,
  // Config cache'in yaşama süresi (dakika)
  cacheTTLMinutes: 5,
};

// ==========================================
// SABİT ASSET AYARLARI
// ==========================================

/**
 * Varsayılan sabit asset konfigürasyonu
 *
 * "Mermer masa sabit, üzerindekiler serbest" kullanım senaryosu için.
 * Varsayılan olarak devre dışı - kullanıcı admin panelden aktifleştirir.
 */
export const DEFAULT_FIXED_ASSETS_CONFIG: Omit<FirestoreFixedAssetsConfig, "updatedAt"> = {
  // Sabit masa - null ise normal diversity çalışır
  fixedTableId: null,

  // Sabit tabak (opsiyonel)
  fixedPlateId: null,

  // Sabit fincan (opsiyonel)
  fixedCupId: null,

  // Varsayılan olarak devre dışı
  isEnabled: false,
};

// ==========================================
// BUSINESS CONTEXT (SaaS Uyumlu İşletme Bağlamı)
// ==========================================

/**
 * İşletme Bağlamı varsayılan konfigürasyonu
 *
 * Bu değerler Sade Patisserie için özelleştirilmiştir.
 * SaaS modunda her tenant kendi değerlerini girecektir.
 *
 * ÖNEMLİ: promptContext alanı AI'ın doğru ortam üretmesi için kritik.
 * "high-rise window view" gibi hatalı üretimleri önler.
 */
export const DEFAULT_BUSINESS_CONTEXT_CONFIG: Omit<FirestoreBusinessContextConfig, "updatedAt"> = {
  // İşletme Bilgileri
  businessName: "Sade Patisserie",
  businessType: "pastane",

  // Mekan Bilgileri (AI için kritik)
  locationDescription: "Zemin kattaki butik pastane, sokak seviyesinde vitrini var. Samimi ve sıcak atmosfer.",
  floorLevel: "ground",
  hasStreetView: true,
  hasWindowView: true,
  windowViewDescription: "Sokak manzarası, yaya trafiği görülebilir",

  // Dekorasyon Stili
  decorStyle: "Minimal modern, sıcak tonlar",
  dominantMaterials: ["ahşap", "mermer", "seramik"],
  colorScheme: "Sıcak krem, bej ve kahve tonları",

  // AI Prompt için özet (EN ÖNEMLİ ALAN)
  promptContext: "Ground floor artisan patisserie with street-level storefront. Warm cream and beige tones, wooden and marble accents. NO high-rise views, NO skyscraper backgrounds, NO aerial city views. Interior shots should show cozy cafe atmosphere at street level.",

  // Varsayılan olarak aktif
  isEnabled: true,
};

// ==========================================
// ASSET SEÇİM KURALLARI
// ==========================================

/**
 * Varsayılan asset seçim kuralları
 *
 * İki farklı mod için ayrı kurallar:
 * - manual: "Şimdi Üret" butonu (daha zengin sahne)
 * - scheduled: Otomatik pipeline (daha minimal)
 *
 * enabled=true → Bu asset ZORUNLU seçilecek
 * enabled=false → Bu asset HARİÇ tutulacak
 */
export const DEFAULT_ASSET_SELECTION_CONFIG: Omit<FirestoreAssetSelectionConfig, "updatedAt"> = {
  // Manuel üretim - daha zengin sahne varsayılan
  manual: {
    plate: { enabled: true },      // Tabak zorunlu
    table: { enabled: true },      // Masa zorunlu
    cup: { enabled: false },       // Fincan opsiyonel (hariç)
    accessory: { enabled: true },  // Aksesuar zorunlu
    napkin: { enabled: true },     // Peçete zorunlu
    cutlery: { enabled: false },   // Çatal-bıçak hariç
  },

  // Otomatik pipeline - daha minimal varsayılan
  scheduled: {
    plate: { enabled: true },      // Tabak zorunlu
    table: { enabled: true },      // Masa zorunlu
    cup: { enabled: false },       // Fincan hariç
    accessory: { enabled: false }, // Aksesuar hariç
    napkin: { enabled: false },    // Peçete hariç
    cutlery: { enabled: false },   // Çatal-bıçak hariç
  },
};

// ==========================================
// PROMPT STUDIO (Config-Driven System Prompts)
// ==========================================

/**
 * Prompt Studio varsayılan konfigürasyonu
 *
 * 5 system prompt'u Firestore'a taşır.
 * Template değişkenler: {{variable}} formatında
 * Runtime'da interpolatePrompt() ile çözümlenir.
 *
 * FALLBACK: Firestore okunamazsa bu default'lar kullanılır.
 */

// Helper: PromptTemplate oluştur (seed data için)
function createPromptTemplate(
  data: Omit<PromptTemplate, "version" | "history" | "updatedAt">
): Omit<PromptTemplate, "updatedAt"> {
  return {
    ...data,
    version: 1,
    history: [],
  };
}

export const DEFAULT_PROMPT_TEMPLATES: Record<string, Omit<PromptTemplate, "updatedAt">> = {
  "asset-selection": createPromptTemplate({
    id: "asset-selection",
    name: "Asset Seçimi",
    description: "Ürün, tabak, masa, fincan vb. asset kombinasyonunu seçer",
    stage: "selectAssets",
    variables: ["moodUpper", "moodRule", "blockedAssetsSection", "petInstruction"],
    systemPrompt: `Sen bir görsel içerik direktörüsün. Sade Patisserie için Instagram içerikleri hazırlıyorsun.

Görevin: Verilen asset listelerinden en uyumlu kombinasyonu seç.

🎨 MOOD KURALI ({{moodUpper}}):
{{moodRule}}

📐 GÖRSEL HİYERARŞİ:
Seçtiğin ürün "Hero Asset" (baş aktör) olmalı. Diğer tüm seçimler (tabak, masa, fincan, dekorasyon) bu ürünü vurgulamak ve desteklemek için seçilmeli. Hero asset ile yarışan veya dikkat çeken destekleyici asset seçme.

Seçim kriterleri:
1. RENK UYUMU: Ürün, tabak ve masa renkleri uyumlu olmalı
2. STİL TUTARLILIĞI: Modern/rustic/minimal tarzlar karışmamalı
3. MOOD UYUMU: Yukarıdaki mood kuralına göre asset seç
4. KULLANIM ROTASYONU: Az kullanılmış asset'lere öncelik ver
5. KÖPEK: {{petInstruction}}
6. DEKORASYON: Listede varsa uygun dekorasyon seçilebilir
7. AKSESUAR: Listede varsa uygun aksesuar seçilebilir (opsiyonel)
8. FİNCAN: Seramik/cam tercih et, karton bardak seçme
9. PEÇETE: Listede varsa seçilebilir (opsiyonel)
10. ÇATAL-BIÇAK: Listede varsa seçilebilir, ürün yeme şekline uygun olmalı

{{blockedAssetsSection}}

⚠️ SADECE LİSTEDE OLAN ASSET'LERİ SEÇ - hayal etme, uydurma!

JSON formatında yanıt ver.`,
  }),

  "scenario-selection": createPromptTemplate({
    id: "scenario-selection",
    name: "Senaryo Seçimi",
    description: "En uygun görsel senaryosunu ve kompozisyonu seçer",
    stage: "selectScenario",
    variables: ["petInstruction", "holdingInstruction", "blockedHandStylesRule", "blockedCompositionsRule", "feedbackHints"],
    systemPrompt: `Sen bir içerik stratejistisin. Instagram için en etkili senaryoyu seçiyorsun.

Seçim kriterleri:
1. ÜRÜN UYUMU: Senaryo ürün tipine uygun olmalı
2. ZAMAN UYUMU: Sabah senaryoları sabah için, akşam senaryoları akşam için
3. ASSET UYUMU: Seçilen masa/tabak/fincan senaryoya uymalı
4. ÇEŞİTLİLİK: Son paylaşımlardan FARKLI senaryo ve kompozisyon seç
5. ETKİLEŞİM: Yüksek etkileşim potansiyeli olan senaryolar öncelikli
6. IŞIK KARAKTERİSTİĞİ: Seçtiğin senaryonun duygusal tonuyla eşleşen ışık karakteristiği öner (enerjik → parlak doğal ışık, samimi → sıcak yumuşak ışık, lüks → dramatik yan ışık, ev sıcaklığı → cozy amber tonlar)
7. KÖPEK: {{petInstruction}}
8. TUTMA ŞEKLİ: {{holdingInstruction}}

ÖNEMLİ ÇEŞİTLİLİK KURALLARI:
- {{blockedHandStylesRule}}
- {{blockedCompositionsRule}}
{{feedbackHints}}

JSON formatında yanıt ver.`,
  }),

  "quality-control": createPromptTemplate({
    id: "quality-control",
    name: "Kalite Kontrol",
    description: "Üretilen görseli değerlendirir ve kalite skoru verir",
    stage: "evaluateImage",
    variables: [],
    systemPrompt: `Sen bir görsel kalite kontrol uzmanısın. Üretilen görseli değerlendir.

Değerlendirme kriterleri (her biri 1-10):
1. ÜRÜN DOĞRULUĞU: Orijinal ürüne ne kadar sadık?
2. KOMPOZİSYON: Çerçeveleme, denge, boşluk kullanımı
3. IŞIK: Doğal mı, sıcak mı, Instagram'a uygun mu?
4. GERÇEKÇİLİK: Yapay görünüyor mu, gerçek fotoğraf gibi mi?
5. INSTAGRAM HAZIRLIĞI: Direkt paylaşılabilir mi?

🔬 FİZİKSEL TUTARLILIK KONTROLÜ:
- GÖLGE TUTARLILIĞI: Tüm objelerin gölgesi aynı yöne mi düşüyor?
- YÜZEY TEMASI: Objeler masada "yüzüyor" mu yoksa ağırlıklarını hissettiriyorlar mı? (Contact shadows olmalı)
- EL ANATOMİSİ: Eğer el varsa; parmak sayısı (5), eklem açısı ve bilek pozisyonu doğal mı?

Fiziksel tutarsızlık tespit edilirse: ilgili kriterin (GERÇEKÇİLİK veya KOMPOZİSYON) skorunu düşür.

⚠️ KRİTİK DUPLİKASYON KONTROLÜ:
- Görselde BİRDEN FAZLA AYNI ÜRÜN var mı? (2 kruvasan, 2 pasta, vb.)
- Görselde BİRDEN FAZLA FİNCAN/BARDAK var mı?
- Görselde BİRDEN FAZLA TABAK var mı?

Duplikasyon tespit edilirse: overallScore = 0, shouldRegenerate = true

Minimum geçme skoru: 7/10 (ortalama)

JSON formatında yanıt ver.`,
  }),

  "content-generation": createPromptTemplate({
    id: "content-generation",
    name: "İçerik Üretimi",
    description: "Caption ve hashtag üretir",
    stage: "generateContent",
    variables: [],
    systemPrompt: `Sen Sade Patisserie'nin sosyal medya yazarısın.

Marka tonu:
- Samimi ama profesyonel
- Türkçe, günlük dil
- Emoji kullanımı minimal ve zarif
- Çağrı içeren ama baskıcı olmayan

Caption kuralları:
- Maximum 150 karakter
- İlk satır dikkat çekici
- Lokasyon ipucu verebilir (Antalya)
- Ürün adı geçebilir ama zorunlu değil

Hashtag kuralları:
- 5-8 hashtag
- #sadepatisserie her zaman dahil
- #antalya veya #antalyacafe dahil
- Ürüne özel hashtagler
- Trend hashtagler

JSON formatında yanıt ver.`,
  }),

  "prompt-optimization": createPromptTemplate({
    id: "prompt-optimization",
    name: "Prompt Optimizasyonu",
    description: "Gemini için görsel üretim prompt'unu optimize eder",
    stage: "optimizePrompt",
    variables: ["trainingContext", "userRulesSection"],
    systemPrompt: `Sen Gemini için prompt optimize eden bir uzmansın. Gemini-native terminoloji kullan.

{{trainingContext}}

## GEMİNİ TERMİNOLOJİSİ REHBERİ

### IŞIK TERİMLERİ (Gemini anlıyor):
- "soft diffused natural light" - yumuşak doğal ışık
- "dramatic side-lighting at 45 degrees" - 45 derece yan ışık
- "warm backlighting with golden rim" - altın arka ışık
- "rim lighting with soft fill" - kenar vurgulu ışık
- "subsurface scattering" - yarı saydam yüzeylerde ışık geçişi
- "specular highlights" - parlak yansımalar

### RENK SICAKLIĞI (Kelvin):
- 3000K: Sıcak, samimi (akşam, cozy)
- 3200K: Altın saat, nostaljik
- 3500K: Sıcak-nötr geçiş
- 5000K: Nötr gün ışığı
- 5500K: Parlak sabah ışığı

### EL TERİMLERİ (Gemini anlıyor):
- "cupping" - kavrama, koruyucu tutma
- "pinching" - iki parmakla tutma
- "cradling" - avuçta taşıma
- "presenting" - açık avuçla sunma
- "breaking" - kırma, ayırma hareketi
- "dipping" - batırma hareketi

### DOKU TERİMLERİ (Ürün bazlı):
- Pasta: "golden-brown laminated layers", "honeycomb crumb structure"
- Çikolata: "glossy tempered surface", "mirror-like sheen"
- Tart: "caramelized sugar shell", "crème brûlée torched top"

## PROMPT KURALLARI (75-150 kelime hedef)

1. SADECE asset listesindeki objeleri kullan
2. Asset listesinde YOKSA prompt'a EKLEME:
   - Cutlery yok → kaşık/çatal/bıçak yazma
   - Napkin yok → peçete yazma
   - Cup yok → fincan/bardak yazma
3. Masa/tabak için tarif uydurma, referans görsele güven
4. Atmosfer için Gemini ışık terminolojisi kullan
5. Tekil tabak, üst üste değil

## PROMPT YAPISI (Mekansal Betimleme)
- Scene Setup: [Ürün] merkezde, [Tabak] üzerinde. [Masa] dokusu net.
- Spatial Relations: Objelerin birbirine göre pozisyonlarını belirt (left-third, centered, right edge, foreground/background)
- Interaction: [El Terimi] eylemi, ürünle temas halinde (varsa)
- Atmosphere: [Kelvin] renk sıcaklığı, [Işık Terimi]. Sonuç odaklı betimle: "Focus on the texture of the croissant layers, let the background blur into soft bokeh" gibi
- Camera: 45 derecelik üst-yan açı, makro detaylar ön planda
- Constraint: 100% fidelity to references

## POZİTİF YÖNLENDİRME
"Yapma" yerine "yap" tercih et. Gemini pozitif talimatlara daha iyi yanıt verir:
- "stacked plates olmasın" yerine → "single plate, clearly separated from background"
- "steam/smoke olmasın" yerine → "clean, crisp air around the product"
- "duplikasyon olmasın" yerine → "exactly one hero product, one plate, one cup"
Negatif prompt gerekiyorsa kısa tut: "Avoid: duplicates, text overlays, watermarks"

ASLA asset listesinde olmayan obje ekleme!
{{userRulesSection}}`,
  }),
};

/**
 * Prompt Studio varsayılan config'i oluştur
 */
export const DEFAULT_PROMPT_STUDIO_CONFIG: Omit<FirestorePromptStudioConfig, "updatedAt"> = {
  prompts: DEFAULT_PROMPT_TEMPLATES as FirestorePromptStudioConfig["prompts"],
};

// ==========================================
// ZAMAN-MOOD EŞLEŞTİRMESİ
// ==========================================

export const DEFAULT_TIME_MOOD_CONFIG: Omit<FirestoreTimeMoodConfig, "updatedAt"> = {
  mappings: [
    {
      startHour: 7,
      endHour: 10,
      mood: "fresh-morning",
      lightPreference: "Soft side light, pencere",
      suggestedScenarios: ["cam-kenari", "zarif-tutma", "ilk-dilim"],
      notes: "Aydınlık, enerjik başlangıç",
    },
    {
      startHour: 10,
      endHour: 12,
      mood: "brunch",
      lightPreference: "Natural bright",
      suggestedScenarios: ["kahve-ani", "paylasim"],
      notes: "Sosyal, paylaşım odaklı",
    },
    {
      startHour: 12,
      endHour: 14,
      mood: "lunch-break",
      lightPreference: "Bright, clean",
      suggestedScenarios: ["zarif-tutma", "mermer-zarafet"],
      notes: "Profesyonel, şık",
    },
    {
      startHour: 14,
      endHour: 17,
      mood: "afternoon",
      lightPreference: "Warm, relaxed",
      suggestedScenarios: ["kahve-kosesi", "yarim-kaldi"],
      notes: "Köpek bu saatlerde uygun",
    },
    {
      startHour: 17,
      endHour: 20,
      mood: "golden-hour",
      lightPreference: "Golden hour, warm",
      suggestedScenarios: ["cam-kenari", "hediye-acilisi"],
      notes: "Romantik, sıcak tonlar",
    },
    {
      startHour: 20,
      endHour: 22,
      mood: "evening",
      lightPreference: "Cozy, intimate",
      suggestedScenarios: ["kahve-kosesi", "yarim-kaldi"],
      notes: "Samimi, ev atmosferi",
    },
  ],
};

// ==========================================
// HAFTALIK TEMALAR
// ==========================================

export const DEFAULT_WEEKLY_THEMES_CONFIG: Omit<FirestoreWeeklyThemesConfig, "updatedAt"> = {
  themes: {
    "0": { // Pazar
      mood: "slow-morning",
      scenarios: ["cam-kenari", "yarim-kaldi"],
      petAllowed: true,
    },
    "1": { // Pazartesi
      mood: "energetic",
      scenarios: ["zarif-tutma", "kahve-ani"],
      petAllowed: false,
    },
    "2": { // Salı
      mood: "productive",
      scenarios: ["mermer-zarafet", "ilk-dilim"],
      petAllowed: false,
    },
    "3": { // Çarşamba
      mood: "balanced",
      scenarios: ["paylasim", "cam-kenari"],
      petAllowed: false,
    },
    "4": { // Perşembe
      mood: "anticipation",
      scenarios: ["hediye-acilisi", "zarif-tutma"],
      petAllowed: false,
    },
    "5": { // Cuma
      mood: "relaxed",
      scenarios: ["kahve-kosesi", "paylasim"],
      petAllowed: true,
    },
    "6": { // Cumartesi
      mood: "cozy",
      scenarios: ["yarim-kaldi", "kahve-kosesi"],
      petAllowed: true,
    },
  },
};

// ==========================================
// MUTLAK KURALLAR
// ==========================================

export const DEFAULT_ABSOLUTE_RULES_CONFIG: Omit<FirestoreAbsoluteRulesConfig, "updatedAt"> = {
  productRules: [
    "TEK ÜRÜN: Görselde yalnızca BİR ana ürün olmalı (referanstan)",
    "TEK FİNCAN: Varsa yalnızca BİR kahve fincanı olmalı",
    "TEK TABAK: Yalnızca BİR tabak (paylaşım senaryosu hariç)",
    "REFERANS SADIKLIĞI: Ürün referans fotoğraftan tanınabilir olmalı",
  ],
  prohibitedElements: [
    "DUPLİKASYON YOK: Aynı üründen birden fazla asla",
    "BUHAR/DUMAN YOK: Steam, smoke, mist, fog yasak",
    "KOYU ARKA PLAN YOK: Siyah, koyu gri arka plan yasak",
    "EKLEME YOK: Prompt'ta olmayan obje ekleme (vazo, çiçek, vb.)",
  ],
  qualityRules: [
    "8K PHOTOREALISTIC: Her zaman yüksek kalite",
    "DOĞAL IŞIK: Yapay flaş görünümü yasak",
    "SICAK TONLAR: Soğuk mavi tonlar yasak (marka estetiği)",
  ],
  allRules: [
    // Ürün kuralları
    "TEK ÜRÜN: Görselde yalnızca BİR ana ürün olmalı",
    "TEK FİNCAN: Varsa yalnızca BİR kahve fincanı olmalı",
    "TEK TABAK: Yalnızca BİR tabak (paylaşım senaryosu hariç)",
    "REFERANS SADIKLIĞI: Ürün referans fotoğraftan tanınabilir olmalı",
    // Yasak elementler
    "DUPLİKASYON YOK: Aynı üründen birden fazla asla",
    "BUHAR/DUMAN YOK: Steam, smoke, mist, fog yasak",
    "KOYU ARKA PLAN YOK: Siyah, koyu gri arka plan yasak",
    "EKLEME YOK: Prompt'ta olmayan obje ekleme yasak",
    // Kalite kuralları
    "8K PHOTOREALISTIC: Her zaman yüksek kalite",
    "DOĞAL IŞIK: Yapay flaş görünümü yasak",
    "SICAK TONLAR: Soğuk mavi tonlar yasak",
  ],
};

// ==========================================
// ORCHESTRATOR TALİMATLARI
// ==========================================

export const DEFAULT_ORCHESTRATOR_INSTRUCTIONS: Omit<FirestoreOrchestratorInstructions, "updatedAt"> = {
  selectionInstructions: [
    "Önce geçmişi kontrol et: Son 15 üretimi incele",
    "Çeşitlilik skorunu hesapla: Benzerlik > 50 ise farklı seç",
    "Zaman-mood eşleştir: Günün saatine göre uygun senaryo seç",
    "Asset kişiliklerini eşleştir: Uyumlu masa/dekor kombinasyonları",
    "Köpek sayacını kontrol et: 15 üretimdir köpek yoksa, uygun senaryoda ekle",
  ],
  promptInstructions: [
    "Referans bildirimi ile başla: 'Using uploaded image(s) as reference...'",
    "MUTLAK KURALLARI ekle: 'ONLY ONE product, ONLY ONE cup...'",
    "Seçilen kompozisyonu belirt: Hangi varyant seçildiyse detaylandır",
    "El stili detayları: Seçilen stil için oje, aksesuar, dövme tarifi",
    "Negative prompt: Tüm yasakları ekle",
  ],
  qualityControlInstructions: [
    "Duplikasyon kontrolü: Birden fazla aynı obje var mı?",
    "Referans sadakati: Ürün tanınabilir mi?",
    "Kompozisyon kontrolü: Seçilen varyanta uygun mu?",
    "Yasak element kontrolü: Buhar, koyu arka plan, ekleme var mı?",
  ],
  generalNotes: "Bu kurallar Firestore'dan dinamik olarak yüklenir. Değişiklikler anında etkili olur.",
};

// ==========================================
// SEED HELPER
// ==========================================

/**
 * Tüm seed verilerini döndürür
 * ConfigService tarafından Firestore'a yüklemek için kullanılır
 */
export function getAllSeedData() {
  const timestamp = Date.now();

  return {
    scenarios: DEFAULT_SCENARIOS.map((s) => ({
      ...s,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    handStyles: DEFAULT_HAND_STYLES.map((h) => ({
      ...h,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    assetPersonalities: DEFAULT_ASSET_PERSONALITIES.map((a) => ({
      ...a,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    diversityRules: {
      ...DEFAULT_DIVERSITY_RULES,
      updatedAt: timestamp,
    },
    timeMoodConfig: {
      ...DEFAULT_TIME_MOOD_CONFIG,
      updatedAt: timestamp,
    },
    weeklyThemesConfig: {
      ...DEFAULT_WEEKLY_THEMES_CONFIG,
      updatedAt: timestamp,
    },
    absoluteRulesConfig: {
      ...DEFAULT_ABSOLUTE_RULES_CONFIG,
      updatedAt: timestamp,
    },
    orchestratorInstructions: {
      ...DEFAULT_ORCHESTRATOR_INSTRUCTIONS,
      updatedAt: timestamp,
    },
    timeoutsConfig: {
      ...DEFAULT_TIMEOUTS_CONFIG,
      updatedAt: timestamp,
    },
    systemSettingsConfig: {
      ...DEFAULT_SYSTEM_SETTINGS_CONFIG,
      updatedAt: timestamp,
    },
    fixedAssetsConfig: {
      ...DEFAULT_FIXED_ASSETS_CONFIG,
      updatedAt: timestamp,
    },
    businessContextConfig: {
      ...DEFAULT_BUSINESS_CONTEXT_CONFIG,
      updatedAt: timestamp,
    },
    assetSelectionConfig: {
      ...DEFAULT_ASSET_SELECTION_CONFIG,
      updatedAt: timestamp,
    },
    promptStudioConfig: {
      prompts: Object.fromEntries(
        Object.entries(DEFAULT_PROMPT_TEMPLATES).map(([key, template]) => [
          key,
          { ...template, updatedAt: timestamp },
        ])
      ),
      updatedAt: timestamp,
    },
    ruleEngineConfig: {
      ...DEFAULT_RULE_ENGINE_CONFIG,
      updatedAt: timestamp,
    },
  };
}

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
  CompositionVariant,
} from "../types";

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
    lightingPreference: "soft natural",
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
    lightingPreference: "bright natural",
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
    lightingPreference: "warm golden",
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
    lightingPreference: "soft warm",
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
    lightingPreference: "natural side light",
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
    lightingPreference: "soft diffused",
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
    lightingPreference: "warm ambient",
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
    lightingPreference: "natural casual",
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
    lightingPreference: "bright warm",
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
    lightingPreference: "clean bright",
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
    lightingPreference: "soft warm",
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
    lightingPreference: "natural outdoor",
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
    lightingPreference: "warm focused",
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
  };
}

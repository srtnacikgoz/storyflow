/**
 * Rules Service
 * ORCHESTRATOR.md ve Firestore'dan kuralları yükler ve birleştirir
 */

import { getFirestore } from "firebase-admin/firestore";
import {
  OrchestratorRules,
  DynamicConfig,
  EffectiveRules,
  RecentHistory,
  VariationRules,
  Scenario,
  HandStyle,
  CompositionVariant,
  ProductionHistoryEntry,
  InteriorType,
} from "./types";

// Varsayılan çeşitlilik kuralları
const DEFAULT_VARIATION_RULES: VariationRules = {
  scenarioGap: 3,
  tableGap: 2,
  handStyleGap: 4,
  compositionGap: 5,
  productGap: 3,      // Aynı ürün 3 üretim sonra tekrar
  plateGap: 2,        // Aynı tabak 2 üretim sonra tekrar
  cupGap: 2,          // Aynı fincan 2 üretim sonra tekrar
  petFrequency: 15,
  outdoorFrequency: 10,
  wabiSabiFrequency: 5,
  similarityThreshold: 50,
};

// Varsayılan senaryolar (ORCHESTRATOR.md'den parse edilemezse fallback)
const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: "zarif-tutma",
    name: "Zarif Tutma",
    description: "Bakımlı el ürün tutuyor",
    includesHands: true,
    compositions: [
      { id: "bottom-right", description: "El sağ alt köşeden giriyor" },
      { id: "bottom-left", description: "El sol alt köşeden giriyor" },
      { id: "top-corner", description: "El üst köşeden giriyor" },
      { id: "center-hold", description: "Ürün ortada, el alttan tutuyor" },
    ],
  },
  {
    id: "kahve-ani",
    name: "Kahve Anı",
    description: "İki el fincan tutuyor, ürün yanında",
    includesHands: true,
    compositions: [
      { id: "product-front", description: "Ürün ön planda keskin, eller arkada bulanık" },
      { id: "product-side", description: "Ürün yanda, eller diagonal pozisyonda" },
      { id: "overhead", description: "Kuş bakışı, ürün ve fincan yan yana" },
    ],
  },
  {
    id: "hediye-acilisi",
    name: "Hediye Açılışı",
    description: "El kutu açıyor",
    includesHands: true,
    compositions: [
      { id: "box-center", description: "Kutu ortada, eller yanlarda" },
      { id: "box-angled", description: "Kutu açılı, kapak açılıyor" },
      { id: "unwrapping", description: "Ambalaj açılma anı" },
    ],
  },
  {
    id: "ilk-dilim",
    name: "İlk Dilim",
    description: "El çatalla pasta alıyor",
    includesHands: true,
    compositions: [
      { id: "fork-entering", description: "Çatal pastaya giriyor" },
      { id: "slice-lifted", description: "Dilim kaldırılmış" },
      { id: "mid-bite", description: "Isırık anı" },
    ],
  },
  {
    id: "cam-kenari",
    name: "Cam Kenarı",
    description: "Pencere önü, şehir manzarası",
    includesHands: false,
    compositions: [
      { id: "window-left", description: "Pencere solda, ürün sağda" },
      { id: "window-right", description: "Pencere sağda, ürün solda" },
      { id: "window-center", description: "Pencere arkada, ürün önde ortada" },
    ],
  },
  {
    id: "mermer-zarafet",
    name: "Mermer Zarafet",
    description: "Mermer yüzey, altın detaylar",
    includesHands: false,
    compositions: [
      { id: "centered", description: "Ürün tam ortada" },
      { id: "diagonal", description: "Diagonal kompozisyon" },
      { id: "corner-composition", description: "Köşe kompozisyonu" },
    ],
  },
  {
    id: "kahve-kosesi",
    name: "Kahve Köşesi",
    description: "Rahat köşe, kitap yanında",
    includesHands: false,
    compositions: [
      { id: "cozy-corner", description: "Rahat köşe düzeni" },
      { id: "reading-nook", description: "Kitap köşesi" },
      { id: "pet-friendly", description: "Köpek dahil edilebilir" },
    ],
  },
  {
    id: "yarim-kaldi",
    name: "Yarım Kaldı",
    description: "Isırık alınmış, yarı dolu fincan",
    includesHands: false,
    compositions: [
      { id: "bitten-product", description: "Isırık izi görünür" },
      { id: "half-eaten", description: "Yarısı yenmiş" },
      { id: "crumbs-scattered", description: "Kırıntılar dağılmış" },
    ],
  },
  {
    id: "paylasim",
    name: "Paylaşım",
    description: "İki tabak, karşılıklı oturma",
    includesHands: false,
    compositions: [
      { id: "two-plates", description: "İki tabak yan yana" },
      { id: "sharing-moment", description: "Paylaşım anı" },
      { id: "conversation", description: "Sohbet ortamı" },
    ],
  },
  {
    id: "paket-servis",
    name: "Paket Servis",
    description: "Kraft torba, takeaway kahve",
    includesHands: false,
    compositions: [
      { id: "package-hero", description: "Paket ön planda" },
      { id: "unboxing", description: "Kutu açılıyor" },
      { id: "takeaway-ready", description: "Götürmeye hazır" },
    ],
  },
  // ═══════════════════════════════════════════════════════════════════
  // INTERIOR SENARYOLARI (AI görsel üretimi YAPILMAZ, gerçek fotoğraf kullanılır)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "vitrin-sergisi",
    name: "Vitrin Sergisi",
    description: "Vitrin içindeki ürün dizilimi",
    includesHands: false,
    isInterior: true,
    interiorType: "vitrin" as InteriorType,
    compositions: [
      { id: "full-display", description: "Tam vitrin görünümü" },
      { id: "detail-focus", description: "Tek ürün odaklı" },
      { id: "angled-view", description: "Açılı vitrin görünümü" },
    ],
  },
  {
    id: "kruvasan-tezgahi",
    name: "Kruvasan Tezgahı",
    description: "Taze kruvasanlar tezgahta dizili",
    includesHands: false,
    isInterior: true,
    interiorType: "tezgah" as InteriorType,
    compositions: [
      { id: "golden-row", description: "Altın renkli sıra" },
      { id: "steam-fresh", description: "Taze çıkmış, sıcak" },
      { id: "variety-display", description: "Çeşitlilik gösterisi" },
    ],
  },
  {
    id: "pastane-ici",
    name: "Pastane İçi",
    description: "Genel pastane mekan atmosferi",
    includesHands: false,
    isInterior: true,
    interiorType: "genel-mekan" as InteriorType,
    compositions: [
      { id: "wide-angle", description: "Geniş açı mekan" },
      { id: "cozy-corner", description: "Rahat köşe" },
      { id: "entrance-view", description: "Giriş görünümü" },
    ],
  },
  {
    id: "oturma-kosesi",
    name: "Oturma Köşesi",
    description: "Samimi oturma alanı görünümü",
    includesHands: false,
    isInterior: true,
    interiorType: "oturma-alani" as InteriorType,
    compositions: [
      { id: "intimate-corner", description: "Samimi köşe" },
      { id: "window-seat", description: "Pencere kenarı koltuk" },
      { id: "cozy-nook", description: "Rahat köşe" },
    ],
  },
  {
    id: "cicek-detay",
    name: "Çiçek Detay",
    description: "Dekoratif çiçekler ve bitkiler",
    includesHands: false,
    isInterior: true,
    interiorType: "dekorasyon" as InteriorType,
    compositions: [
      { id: "vase-focus", description: "Vazo odaklı" },
      { id: "table-arrangement", description: "Masa üstü düzenleme" },
      { id: "window-light", description: "Pencere ışığında" },
    ],
  },
  {
    id: "kahve-hazirligi",
    name: "Kahve Hazırlığı",
    description: "Barista veya kahve hazırlama anı",
    includesHands: false,
    isInterior: true,
    interiorType: "tezgah" as InteriorType,
    compositions: [
      { id: "pour-moment", description: "Dökme anı" },
      { id: "machine-action", description: "Makine çalışıyor" },
      { id: "preparation", description: "Hazırlık aşaması" },
    ],
  },
  {
    id: "sabah-acilis",
    name: "Sabah Açılış",
    description: "Günaydın, kapı girişi görünümü",
    includesHands: false,
    isInterior: true,
    interiorType: "genel-mekan" as InteriorType,
    compositions: [
      { id: "door-entrance", description: "Kapıdan giriş" },
      { id: "morning-light", description: "Sabah ışığı" },
      { id: "welcome-view", description: "Hoş geldin görünümü" },
    ],
  },
  {
    id: "pencere-isigi",
    name: "Pencere Işığı",
    description: "Pencere kenarı, doğal ışık görünümü",
    includesHands: false,
    isInterior: true,
    interiorType: "genel-mekan" as InteriorType,
    compositions: [
      { id: "silhouette", description: "Siluet görünümü" },
      { id: "golden-rays", description: "Altın ışık huzmesi" },
      { id: "soft-glow", description: "Yumuşak parıltı" },
    ],
  },
  {
    id: "raf-zenginligi",
    name: "Raf Zenginliği",
    description: "Dolu raflar, bolluk hissi",
    includesHands: false,
    isInterior: true,
    interiorType: "vitrin" as InteriorType,
    compositions: [
      { id: "full-shelves", description: "Dolu raflar" },
      { id: "abundance", description: "Bolluk görünümü" },
      { id: "organized-display", description: "Düzenli sergi" },
    ],
  },
  {
    id: "detay-cekimi",
    name: "Detay Çekimi",
    description: "Fincan, peçete, aksesuar detayları",
    includesHands: false,
    isInterior: true,
    interiorType: "dekorasyon" as InteriorType,
    compositions: [
      { id: "cup-detail", description: "Fincan detayı" },
      { id: "napkin-fold", description: "Peçete katlama" },
      { id: "accessory-focus", description: "Aksesuar odağı" },
    ],
  },
];

// Varsayılan el stilleri
const DEFAULT_HAND_STYLES: HandStyle[] = [
  {
    id: "elegant",
    name: "Elegant",
    description: "Şık, minimal",
    nailPolish: "Nude/soft pink polish",
    accessories: "Silver midi ring, thin chain bracelet",
    tattoo: "Minimalist (ay, yıldız, fine lines)",
  },
  {
    id: "bohemian",
    name: "Bohemian",
    description: "Bohem, doğal",
    nailPolish: "Earth-tone/terracotta polish",
    accessories: "Multiple stacked rings, beaded bracelet",
    tattoo: "Çiçek, yaprak motifleri",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Sade, temiz",
    nailPolish: "No polish or clear coat",
    accessories: "Single thin gold ring, no bracelet",
    tattoo: "None",
  },
  {
    id: "trendy",
    name: "Trendy",
    description: "Trend, modern",
    nailPolish: "French tip nails",
    accessories: "Chunky gold ring, chain bracelet",
    tattoo: "Geometric, fine line art",
  },
  {
    id: "sporty",
    name: "Sporty",
    description: "Sportif, aktif",
    nailPolish: "No polish",
    accessories: "Fitness watch, simple rubber band",
    tattoo: "None",
  },
];

/**
 * Rules Service
 */
export class RulesService {
  private db: FirebaseFirestore.Firestore;
  private cachedRules: OrchestratorRules | null = null;
  private cachedConfig: DynamicConfig | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 dakika cache

  constructor() {
    this.db = getFirestore();
  }

  /**
   * Statik kuralları yükle (varsayılan değerlerden)
   * NOT: Cloud Functions ortamında dosya sistemi erişimi sınırlı olduğu için
   * kurallar Firestore'dan veya varsayılan değerlerden yüklenir
   */
  async loadStaticRules(): Promise<OrchestratorRules> {
    // Cache kontrolü
    if (this.cachedRules && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.cachedRules;
    }

    try {
      // Firestore'dan parse edilmiş kuralları al (hooks tarafından sync edilmiş olmalı)
      const rulesDoc = await this.db.collection("orchestrator-config").doc("parsed-rules").get();

      if (rulesDoc.exists) {
        const data = rulesDoc.data();
        this.cachedRules = {
          scenarios: data?.scenarios || DEFAULT_SCENARIOS,
          handStyles: data?.handStyles || DEFAULT_HAND_STYLES,
          assetPersonalities: data?.assetPersonalities || [],
          absoluteRules: data?.absoluteRules || [
            "TEK ÜRÜN - Görselde yalnızca BİR ana ürün",
            "TEK FİNCAN - Varsa yalnızca BİR kahve fincanı",
            "REFERANS SADIKLIĞI - Ürün referanstan tanınabilir olmalı",
            "DUPLİKASYON YOK - Aynı üründen birden fazla asla",
            "BUHAR/DUMAN YOK - Steam, smoke, mist yasak",
            "KOYU ARKA PLAN YOK - Siyah, koyu gri yasak",
          ],
          version: data?.version || "1.0.0",
          parsedAt: data?.parsedAt || Date.now(),
        };
      } else {
        // Fallback: Varsayılan değerler
        this.cachedRules = {
          scenarios: DEFAULT_SCENARIOS,
          handStyles: DEFAULT_HAND_STYLES,
          assetPersonalities: [],
          absoluteRules: [
            "TEK ÜRÜN - Görselde yalnızca BİR ana ürün",
            "TEK FİNCAN - Varsa yalnızca BİR kahve fincanı",
            "REFERANS SADIKLIĞI - Ürün referanstan tanınabilir olmalı",
            "DUPLİKASYON YOK - Aynı üründen birden fazla asla",
            "BUHAR/DUMAN YOK - Steam, smoke, mist yasak",
            "KOYU ARKA PLAN YOK - Siyah, koyu gri yasak",
          ],
          version: "1.0.0-default",
          parsedAt: Date.now(),
        };
      }

      this.cacheTimestamp = Date.now();
      return this.cachedRules;
    } catch (error) {
      console.error("[RulesService] Error loading static rules:", error);
      // Hata durumunda varsayılan değerleri döndür
      return {
        scenarios: DEFAULT_SCENARIOS,
        handStyles: DEFAULT_HAND_STYLES,
        assetPersonalities: [],
        absoluteRules: [],
        version: "1.0.0-fallback",
        parsedAt: Date.now(),
      };
    }
  }

  /**
   * Dinamik konfigürasyonu Firestore'dan yükle
   */
  async loadDynamicConfig(): Promise<DynamicConfig> {
    // Cache kontrolü
    if (this.cachedConfig && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.cachedConfig;
    }

    try {
      const configDoc = await this.db.collection("orchestrator-config").doc("dynamic").get();

      if (configDoc.exists) {
        const data = configDoc.data();
        this.cachedConfig = {
          variationRules: {
            ...DEFAULT_VARIATION_RULES,
            ...data?.variationRules,
          },
          weeklyThemes: data?.weeklyThemes || {
            monday: { mood: "energetic", scenarios: ["zarif-tutma", "kahve-ani"], petAllowed: false },
            tuesday: { mood: "productive", scenarios: ["mermer-zarafet", "ilk-dilim"], petAllowed: false },
            wednesday: { mood: "balanced", scenarios: ["paylasim", "cam-kenari"], petAllowed: false },
            thursday: { mood: "anticipation", scenarios: ["hediye-acilisi", "zarif-tutma"], petAllowed: false },
            friday: { mood: "relaxed", scenarios: ["kahve-kosesi", "paylasim"], petAllowed: true },
            saturday: { mood: "cozy", scenarios: ["yarim-kaldi", "kahve-kosesi"], petAllowed: true },
            sunday: { mood: "slow", scenarios: ["cam-kenari", "yarim-kaldi"], petAllowed: true },
          },
          timeMoodMappings: data?.timeMoodMappings || [
            { startHour: 7, endHour: 10, mood: "fresh-morning", lightPreference: "soft side light", suggestedScenarios: ["cam-kenari", "zarif-tutma"], notes: "Aydınlık başlangıç" },
            { startHour: 10, endHour: 12, mood: "brunch", lightPreference: "natural bright", suggestedScenarios: ["kahve-ani", "paylasim"], notes: "Sosyal paylaşım" },
            { startHour: 12, endHour: 14, mood: "lunch-break", lightPreference: "bright clean", suggestedScenarios: ["zarif-tutma", "mermer-zarafet"], notes: "Profesyonel" },
            { startHour: 14, endHour: 17, mood: "afternoon", lightPreference: "warm relaxed", suggestedScenarios: ["kahve-kosesi", "yarim-kaldi"], notes: "Köpek uygun" },
            { startHour: 17, endHour: 20, mood: "golden-hour", lightPreference: "golden warm", suggestedScenarios: ["cam-kenari", "hediye-acilisi"], notes: "Romantik" },
            { startHour: 20, endHour: 22, mood: "evening", lightPreference: "cozy intimate", suggestedScenarios: ["kahve-kosesi", "yarim-kaldi"], notes: "Samimi" },
          ],
          assetPriorities: data?.assetPriorities || {
            underusedBoost: 1.5,
            lastUsedPenalty: 0.5,
          },
          updatedAt: data?.updatedAt || Date.now(),
        };
      } else {
        // Varsayılan config oluştur ve kaydet
        this.cachedConfig = {
          variationRules: DEFAULT_VARIATION_RULES,
          weeklyThemes: {
            monday: { mood: "energetic", scenarios: ["zarif-tutma", "kahve-ani"], petAllowed: false },
            tuesday: { mood: "productive", scenarios: ["mermer-zarafet", "ilk-dilim"], petAllowed: false },
            wednesday: { mood: "balanced", scenarios: ["paylasim", "cam-kenari"], petAllowed: false },
            thursday: { mood: "anticipation", scenarios: ["hediye-acilisi", "zarif-tutma"], petAllowed: false },
            friday: { mood: "relaxed", scenarios: ["kahve-kosesi", "paylasim"], petAllowed: true },
            saturday: { mood: "cozy", scenarios: ["yarim-kaldi", "kahve-kosesi"], petAllowed: true },
            sunday: { mood: "slow", scenarios: ["cam-kenari", "yarim-kaldi"], petAllowed: true },
          },
          timeMoodMappings: [
            { startHour: 7, endHour: 10, mood: "fresh-morning", lightPreference: "soft side light", suggestedScenarios: ["cam-kenari", "zarif-tutma"], notes: "Aydınlık başlangıç" },
            { startHour: 14, endHour: 17, mood: "afternoon", lightPreference: "warm relaxed", suggestedScenarios: ["kahve-kosesi", "yarim-kaldi"], notes: "Köpek uygun" },
            { startHour: 17, endHour: 20, mood: "golden-hour", lightPreference: "golden warm", suggestedScenarios: ["cam-kenari", "hediye-acilisi"], notes: "Romantik" },
          ],
          assetPriorities: {
            underusedBoost: 1.5,
            lastUsedPenalty: 0.5,
          },
          updatedAt: Date.now(),
        };

        // Firestore'a kaydet
        await this.db.collection("orchestrator-config").doc("dynamic").set(this.cachedConfig);
      }

      this.cacheTimestamp = Date.now();
      return this.cachedConfig;
    } catch (error) {
      console.error("[RulesService] Error loading dynamic config:", error);
      return {
        variationRules: DEFAULT_VARIATION_RULES,
        weeklyThemes: {},
        timeMoodMappings: [],
        assetPriorities: { underusedBoost: 1.5, lastUsedPenalty: 0.5 },
        updatedAt: Date.now(),
      };
    }
  }

  /**
   * Son üretim geçmişini yükle
   */
  async loadRecentHistory(limit: number = 15): Promise<RecentHistory> {
    try {
      const historyQuery = await this.db
        .collection("production-history")
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();

      const entries: ProductionHistoryEntry[] = historyQuery.docs.map(doc => doc.data() as ProductionHistoryEntry);

      // Köpek kullanım sayısı
      const petUsageCount = entries.filter(e => e.includesPet).length;
      const lastPetEntry = entries.find(e => e.includesPet);

      return {
        entries,
        petUsageCount,
        lastPetUsage: lastPetEntry?.timestamp,
      };
    } catch (error) {
      console.error("[RulesService] Error loading recent history:", error);
      return {
        entries: [],
        petUsageCount: 0,
      };
    }
  }

  /**
   * Üretim geçmişine kayıt ekle
   */
  async addToHistory(entry: ProductionHistoryEntry): Promise<void> {
    try {
      await this.db.collection("production-history").add({
        ...entry,
        timestamp: entry.timestamp || Date.now(),
      });
    } catch (error) {
      console.error("[RulesService] Error adding to history:", error);
    }
  }

  /**
   * Tüm kuralları birleştir ve etkili kuralları hesapla
   */
  async getEffectiveRules(): Promise<EffectiveRules> {
    const [staticRules, dynamicConfig, recentHistory] = await Promise.all([
      this.loadStaticRules(),
      this.loadDynamicConfig(),
      this.loadRecentHistory(),
    ]);

    const { variationRules } = dynamicConfig;
    const { entries, petUsageCount } = recentHistory;

    // Köpek dahil edilmeli mi?
    // petFrequency = 15 ise ve son 15 üretimde köpek yoksa, dahil et
    const shouldIncludePet = petUsageCount === 0 && entries.length >= variationRules.petFrequency - 1;

    // Bloklanmış senaryolar (son N üretimde kullanılanlar)
    const recentScenarios = entries.slice(0, variationRules.scenarioGap);
    const blockedScenarios = [...new Set(recentScenarios.map(e => e.scenarioId))];

    // Bloklanmış masalar
    const recentTables = entries.slice(0, variationRules.tableGap);
    const blockedTables = [...new Set(recentTables.map(e => e.tableId).filter(Boolean))] as string[];

    // Bloklanmış el stilleri
    const recentHandStyles = entries.slice(0, variationRules.handStyleGap);
    const blockedHandStyles = [...new Set(recentHandStyles.map(e => e.handStyleId).filter(Boolean))] as string[];

    // Bloklanmış kompozisyonlar
    const recentCompositions = entries.slice(0, variationRules.compositionGap);
    const blockedCompositions = [...new Set(recentCompositions.map(e => e.compositionId))];

    // Bloklanmış ürünler
    const recentProducts = entries.slice(0, variationRules.productGap);
    const blockedProducts = [...new Set(recentProducts.map(e => e.productId).filter(Boolean))] as string[];

    // Bloklanmış tabaklar
    const recentPlates = entries.slice(0, variationRules.plateGap);
    const blockedPlates = [...new Set(recentPlates.map(e => e.plateId).filter(Boolean))] as string[];

    // Bloklanmış fincanlar
    const recentCups = entries.slice(0, variationRules.cupGap);
    const blockedCups = [...new Set(recentCups.map(e => e.cupId).filter(Boolean))] as string[];

    return {
      staticRules,
      dynamicConfig,
      recentHistory,
      shouldIncludePet,
      blockedScenarios,
      blockedTables,
      blockedHandStyles,
      blockedCompositions,
      blockedProducts,
      blockedPlates,
      blockedCups,
    };
  }

  /**
   * Belirli bir senaryo için uygun kompozisyon seç
   */
  selectComposition(scenario: Scenario, blockedCompositions: string[]): CompositionVariant {
    const availableCompositions = scenario.compositions.filter(
      c => !blockedCompositions.includes(c.id)
    );

    if (availableCompositions.length === 0) {
      // Tümü bloklanmışsa rastgele seç
      return scenario.compositions[Math.floor(Math.random() * scenario.compositions.length)];
    }

    // Rastgele seç
    return availableCompositions[Math.floor(Math.random() * availableCompositions.length)];
  }

  /**
   * Uygun el stili seç
   */
  selectHandStyle(blockedHandStyles: string[], handStyles: HandStyle[]): HandStyle {
    const availableStyles = handStyles.filter(
      s => !blockedHandStyles.includes(s.id)
    );

    if (availableStyles.length === 0) {
      return handStyles[Math.floor(Math.random() * handStyles.length)];
    }

    return availableStyles[Math.floor(Math.random() * availableStyles.length)];
  }

  /**
   * Günün saatine göre mood al
   */
  getMoodForTime(hour: number, timeMoodMappings: DynamicConfig["timeMoodMappings"]): string {
    const mapping = timeMoodMappings.find(
      m => hour >= m.startHour && hour < m.endHour
    );
    return mapping?.mood || "balanced";
  }

  /**
   * Haftanın gününe göre tema al
   */
  getThemeForDay(dayOfWeek: number, weeklyThemes: DynamicConfig["weeklyThemes"]): { mood: string; scenarios: string[]; petAllowed: boolean } | null {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = days[dayOfWeek];
    return weeklyThemes[dayName] || null;
  }

  /**
   * Cache'i temizle
   */
  clearCache(): void {
    this.cachedRules = null;
    this.cachedConfig = null;
    this.cacheTimestamp = 0;
  }
}

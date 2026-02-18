/**
 * Rules Service
 * Firestore'dan orchestrator kurallarını yükler ve birleştirir.
 *
 * Config-First Mimarisi:
 * - Tüm kurallar Firestore'da saklanır
 * - ORCHESTRATOR.md artık kullanılmaz
 * - ConfigService üzerinden okuma yapılır
 */

import { getFirestore } from "firebase-admin/firestore";
import {
  OrchestratorRules,
  DynamicConfig,
  EffectiveRules,
  PatronRule,
  RecentHistory,
  VariationRules,
  Scenario,
  ProductionHistoryEntry,
  InteriorType,
  GlobalOrchestratorConfig,
} from "./types";
import {
  getGlobalConfig,
  clearConfigCache,
  ensureConfigInitialized,
} from "../services/configService";

// Varsayılan çeşitlilik kuralları (fallback için)
const DEFAULT_VARIATION_RULES: VariationRules = {
  scenarioGap: 3,
  tableGap: 2,
  handStyleGap: 0,
  compositionGap: 5,
  productGap: 3,
  plateGap: 2,
  cupGap: 2,
  petFrequency: 15,
  outdoorFrequency: 10,
  wabiSabiFrequency: 5,
  similarityThreshold: 50,
};

// Varsayılan senaryolar (ORCHESTRATOR.md'den parse edilemezse fallback)
const DEFAULT_SCENARIOS: Scenario[] = [
  { id: "zarif-tutma", name: "Zarif Tutma", description: "Bakımlı el ürün tutuyor", includesHands: false },
  { id: "kahve-ani", name: "Kahve Anı", description: "İki el fincan tutuyor, ürün yanında", includesHands: false },
  { id: "hediye-acilisi", name: "Hediye Açılışı", description: "El kutu açıyor", includesHands: false },
  { id: "ilk-dilim", name: "İlk Dilim", description: "El çatalla pasta alıyor", includesHands: false },
  { id: "cam-kenari", name: "Cam Kenarı", description: "Pencere önü, şehir manzarası", includesHands: false },
  { id: "mermer-zarafet", name: "Mermer Zarafet", description: "Mermer yüzey, altın detaylar", includesHands: false },
  { id: "kahve-kosesi", name: "Kahve Köşesi", description: "Rahat köşe, kitap yanında", includesHands: false },
  { id: "yarim-kaldi", name: "Yarım Kaldı", description: "Isırık alınmış, yarı dolu fincan", includesHands: false },
  { id: "paylasim", name: "Paylaşım", description: "İki tabak, karşılıklı oturma", includesHands: false },
  { id: "paket-servis", name: "Paket Servis", description: "Kraft torba, takeaway kahve", includesHands: false },
  // Interior senaryoları
  { id: "vitrin-sergisi", name: "Vitrin Sergisi", description: "Vitrin içindeki ürün dizilimi", includesHands: false, isInterior: true, interiorType: "vitrin" as InteriorType },
  { id: "kruvasan-tezgahi", name: "Kruvasan Tezgahı", description: "Taze kruvasanlar tezgahta dizili", includesHands: false, isInterior: true, interiorType: "tezgah" as InteriorType },
  { id: "pastane-ici", name: "Pastane İçi", description: "Genel pastane mekan atmosferi", includesHands: false, isInterior: true, interiorType: "genel-mekan" as InteriorType },
  { id: "oturma-kosesi", name: "Oturma Köşesi", description: "Samimi oturma alanı görünümü", includesHands: false, isInterior: true, interiorType: "oturma-alani" as InteriorType },
  { id: "cicek-detay", name: "Çiçek Detay", description: "Dekoratif çiçekler ve bitkiler", includesHands: false, isInterior: true, interiorType: "dekorasyon" as InteriorType },
  { id: "kahve-hazirligi", name: "Kahve Hazırlığı", description: "Barista veya kahve hazırlama anı", includesHands: false, isInterior: true, interiorType: "tezgah" as InteriorType },
  { id: "sabah-acilis", name: "Sabah Açılış", description: "Günaydın, kapı girişi görünümü", includesHands: false, isInterior: true, interiorType: "genel-mekan" as InteriorType },
  { id: "pencere-isigi", name: "Pencere Işığı", description: "Pencere kenarı, doğal ışık görünümü", includesHands: false, isInterior: true, interiorType: "genel-mekan" as InteriorType },
  { id: "raf-zenginligi", name: "Raf Zenginliği", description: "Dolu raflar, bolluk hissi", includesHands: false, isInterior: true, interiorType: "vitrin" as InteriorType },
  { id: "detay-cekimi", name: "Detay Çekimi", description: "Fincan, peçete, aksesuar detayları", includesHands: false, isInterior: true, interiorType: "dekorasyon" as InteriorType },
];

/**
 * Rules Service
 * Config-First mimarisi ile Firestore'dan kuralları yükler
 */
export class RulesService {
  private db: FirebaseFirestore.Firestore;
  private globalConfig: GlobalOrchestratorConfig | null = null;

  constructor() {
    this.db = getFirestore();
  }

  /**
   * Global config'i yükle (ConfigService üzerinden)
   * İlk çağrıda Firestore'dan yükler, sonraki çağrılarda cache'den döner
   */
  private async ensureGlobalConfig(): Promise<GlobalOrchestratorConfig> {
    if (!this.globalConfig) {
      // Config yoksa otomatik seed yap
      await ensureConfigInitialized();
      this.globalConfig = await getGlobalConfig();
    }
    return this.globalConfig;
  }

  /**
   * Statik kuralları yükle (Firestore'dan)
   * Senaryolar, asset kişilikleri ve mutlak kurallar
   */
  async loadStaticRules(): Promise<OrchestratorRules> {
    try {
      const config = await this.ensureGlobalConfig();

      // FirestoreScenario'yu Scenario'ya dönüştür
      const scenarios: Scenario[] = config.scenarios.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        includesHands: s.includesHands,
        compositionId: s.compositionId,
        isInterior: s.isInterior,
        interiorType: s.interiorType,
        suggestedProducts: s.suggestedProducts,
        // Sahne ayarları (Tema'dan taşındı)
        setting: s.setting,
        petAllowed: s.petAllowed,
        accessoryAllowed: s.accessoryAllowed,
        accessoryOptions: s.accessoryOptions,
        shallowDepthOfField: s.shallowDepthOfField,
        // Slot konfigürasyonu (CompositionTemplates'den taşındı)
        compositionSlots: s.compositionSlots,
      }));

      return {
        scenarios,
        handStyles: [],
        assetPersonalities: config.assetPersonalities,
        absoluteRules: config.absoluteRules.allRules,
        version: config.version,
        parsedAt: config.loadedAt,
      };
    } catch (error) {
      console.error("[RulesService] Error loading static rules from ConfigService:", error);
      // Fallback: Varsayılan değerler
      return {
        scenarios: DEFAULT_SCENARIOS,
        handStyles: [],
        assetPersonalities: [],
        absoluteRules: [
          "TEK ÜRÜN - Görselde yalnızca BİR ana ürün",
          "TEK FİNCAN - Varsa yalnızca BİR kahve fincanı",
          "REFERANS SADIKLIĞI - Ürün referanstan tanınabilir olmalı",
          "DUPLİKASYON YOK - Aynı üründen birden fazla asla",
          "BUHAR/DUMAN YOK - Steam, smoke, mist yasak",
          "KOYU ARKA PLAN YOK - Siyah, koyu gri yasak",
        ],
        version: "1.0.0-fallback",
        parsedAt: Date.now(),
      };
    }
  }

  /**
   * Dinamik konfigürasyonu Firestore'dan yükle
   * Çeşitlilik kuralları, haftalık temalar, zaman-mood eşleştirmeleri
   */
  async loadDynamicConfig(): Promise<DynamicConfig> {
    try {
      const config = await this.ensureGlobalConfig();

      return {
        variationRules: config.diversityRules,
        weeklyThemes: config.weeklyThemes.themes,
        timeMoodMappings: config.timeMoodConfig.mappings,
        assetPriorities: {
          underusedBoost: 1.5,
          lastUsedPenalty: 0.5,
        },
        updatedAt: config.loadedAt,
      };
    } catch (error) {
      console.error("[RulesService] Error loading dynamic config from ConfigService:", error);
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
   * @returns true başarılı, false başarısız (ama pipeline durmaz)
   */
  async addToHistory(entry: ProductionHistoryEntry): Promise<boolean> {
    try {
      await this.db.collection("production-history").add({
        ...entry,
        timestamp: entry.timestamp || Date.now(),
      });
      console.log(`[RulesService] History added - product: ${entry.productId}, scenario: ${entry.scenarioId}`);
      return true;
    } catch (error) {
      // KRİTİK: Bu hata çeşitlilik algoritmasını bozar ama pipeline'ı durdurmamalı
      console.error("[RulesService] ⚠️ CRITICAL: Failed to add to history - diversity tracking broken!", error);
      console.error("[RulesService] Entry that failed:", JSON.stringify(entry));
      return false;
    }
  }

  /**
   * Tüm kuralları birleştir ve etkili kuralları hesapla
   */
  async getEffectiveRules(): Promise<EffectiveRules> {
    const [staticRules, dynamicConfig, recentHistory, patronRules] = await Promise.all([
      this.loadStaticRules(),
      this.loadDynamicConfig(),
      this.loadRecentHistory(),
      this.loadPatronRules(),
    ]);

    const { variationRules } = dynamicConfig;
    const { entries, petUsageCount } = recentHistory;

    // Köpek dahil edilmeli mi?
    // petFrequency = 15 ise ve son 15 üretimde köpek yoksa, dahil et
    const shouldIncludePet = petUsageCount === 0 && entries.length >= variationRules.petFrequency - 1;

    // Bloklanmış senaryolar (son N üretimde kullanılanlar)
    const recentScenarios = entries.slice(0, variationRules.scenarioGap);
    const blockedScenarios = [...new Set(recentScenarios.map(e => e.scenarioId))];

    // Masa diversity KALDIRILD — tema preferredTags yeterli
    const blockedTables: string[] = [];

    // Bloklanmış kompozisyonlar
    const recentCompositions = entries.slice(0, variationRules.compositionGap);
    const blockedCompositions = [...new Set(recentCompositions.map(e => e.compositionId))];

    // Ürün diversity KALDIRILD — her üretimde en uygun ürün seçilmeli
    const blockedProducts: string[] = [];

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
      blockedCompositions,
      blockedProducts,
      blockedPlates,
      blockedCups,
      patronRules,
    };
  }

  /**
   * Patron rules yükle (aktif olanlar)
   */
  /**
   * Patron rules yükle (aktif olanlar) - Orchestrator için
   */
  async loadPatronRules(): Promise<PatronRule[]> {
    try {
      const snapshot = await this.db.collection("patron-rules")
        .where("isActive", "==", true)
        .orderBy("priority", "desc")
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PatronRule[];
    } catch (error) {
      console.error("[RulesService] Error loading patron rules:", error);
      return [];
    }
  }

  // ==========================================
  // PATRON RULES CRUD
  // ==========================================

  /**
   * Tüm Patron Rule'ları listele (Admin UI için)
   */
  async listPatronRules(includeInactive = false): Promise<PatronRule[]> {
    let query: FirebaseFirestore.Query = this.db.collection("patron-rules");

    if (!includeInactive) {
      query = query.where("isActive", "==", true);
    }

    const snapshot = await query.orderBy("priority", "desc").get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PatronRule[];
  }

  /**
   * Tek bir Patron Rule getir
   */
  async getPatronRule(id: string): Promise<PatronRule | null> {
    const doc = await this.db.collection("patron-rules").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as PatronRule;
  }

  /**
   * Yeni Patron Rule oluştur
   */
  async createPatronRule(rule: Omit<PatronRule, "id" | "createdAt" | "updatedAt">): Promise<PatronRule> {
    const now = Date.now();
    const newRule = {
      ...rule,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.db.collection("patron-rules").add(newRule);

    // Cache'i temizle (Orchestrator hemen görsün)
    this.clearCache();

    return { id: docRef.id, ...newRule };
  }

  /**
   * Patron Rule güncelle
   */
  async updatePatronRule(id: string, updates: Partial<PatronRule>): Promise<void> {
    await this.db.collection("patron-rules").doc(id).update({
      ...updates,
      updatedAt: Date.now(),
    });

    this.clearCache();
  }

  /**
   * Patron Rule sil
   */
  async deletePatronRule(id: string): Promise<void> {
    await this.db.collection("patron-rules").doc(id).delete();
    this.clearCache();
  }

  /**
   * Belirli bir senaryo için kompozisyon ID'sini döndür
   * NOT: Kompozisyon artık senaryo tanımında sabit (tekli seçim)
   * @deprecated Kompozisyon senaryo tanımından alınır, bu method geriye uyumluluk için
   */
  selectComposition(scenario: Scenario, _blockedCompositions: string[]): { id: string; description: string } {
    // Yeni format: compositionId kullan
    const compositionId = scenario.compositionId || "default";
    return {
      id: compositionId,
      description: compositionId,
    };
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
    this.globalConfig = null;
    clearConfigCache();
    console.log("[RulesService] Cache cleared");
  }

  /**
   * Orchestrator talimatlarını getir
   */
  async getOrchestratorInstructions() {
    const config = await this.ensureGlobalConfig();
    return config.instructions;
  }
}

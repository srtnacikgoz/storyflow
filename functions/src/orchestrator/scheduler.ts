/**
 * Orchestrator Scheduler
 * Zamanlanmış içerik üretimini yönetir
 * TimeScoreService entegrasyonu ile en optimal saatte tetikleme
 */

import { getFirestore } from "firebase-admin/firestore";
import { Orchestrator } from "./orchestrator";
import {
  TimeSlotRule,
  ProductType,
  OrchestratorConfig,
  ScheduledSlot,
  ProductionHistoryEntry,
} from "./types";
// NOT: FieldValue artık kullanılmıyor - asset usage increment orchestrator.ts içinde
// saveProductionHistory kaldırıldı ama getRecentHistory/getPetUsageStats hala burada
import { TimeScoreService } from "../services/timeScore";
import { DayOfWeekIndex } from "../types";
import { getTimeouts, getSystemSettings } from "../services/configService";

/**
 * Undefined değerleri recursive olarak temizle (Firestore uyumluluğu için)
 */
function removeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item)) as T;
  }

  if (typeof obj === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned as T;
  }

  return obj;
}

/**
 * Scheduler Service
 */
export class OrchestratorScheduler {
  private db: FirebaseFirestore.Firestore;
  private config: OrchestratorConfig;
  private timeScoreService: TimeScoreService;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.db = getFirestore();
    this.timeScoreService = new TimeScoreService();
  }

  /**
   * Aktif zaman kurallarını kontrol et ve pipeline başlat
   * Bu fonksiyon Cloud Scheduler tarafından her 15 dakikada bir çağrılır
   * TimeScoreService ile her kural aralığındaki en optimal saatte tetiklenir
   */
  async checkAndTrigger(): Promise<{
    triggered: number;
    skipped: number;
    errors: string[];
  }> {
    const now = new Date();

    // TRT (Europe/Istanbul) zamanını al
    const trtNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));

    const currentHour = trtNow.getHours();
    const currentMinute = trtNow.getMinutes();
    const currentDay = trtNow.getDay() as DayOfWeekIndex; // 0 = Pazar

    console.log(`[Scheduler] Checking slots for day ${currentDay}, time ${currentHour}:${currentMinute}`);

    const result = {
      triggered: 0,
      skipped: 0,
      errors: [] as string[],
    };

    try {
      // Global scheduler kontrolü - kapalıysa hiçbir şey yapma
      const systemSettings = await getSystemSettings();
      if (systemSettings.schedulerEnabled === false) {
        console.log("[Scheduler] ⏸️ Scheduler disabled via system settings. Skipping all rules.");
        return result;
      }

      // Aktif zaman kurallarını al
      const rulesSnapshot = await this.db
        .collection("time-slot-rules")
        .where("isActive", "==", true)
        .get();

      for (const doc of rulesSnapshot.docs) {
        const rule = { id: doc.id, ...doc.data() } as TimeSlotRule;

        // Gün kontrolü
        if (!rule.daysOfWeek.includes(currentDay)) {
          continue;
        }

        // Bu slot için zaten içerik üretilmiş mi?
        const existingSlot = await this.checkExistingSlot(rule.id, now);
        if (existingSlot) {
          console.log(`[Scheduler] Slot ${rule.id} already processed today`);
          result.skipped++;
          continue;
        }

        // Kural aralığındaki en iyi saati bul
        const bestHour = await this.findBestHourInRange(rule, currentDay);
        console.log(`[Scheduler] Rule ${rule.id} (${rule.startHour}-${rule.endHour}): Best hour = ${bestHour}`);

        // Bu kural şu an için geçerli mi? (en iyi saate göre)
        if (!this.isRuleActiveForBestHour(bestHour, currentHour, currentMinute)) {
          continue;
        }

        // Pipeline başlat
        try {
          console.log(`[Scheduler] Triggering pipeline for rule: ${rule.id} at optimal hour ${bestHour}`);

          // Slot oluştur (en iyi saat ile)
          const slot = await this.createSlot(rule, now, bestHour);

          // Pipeline'ı async başlat (beklemeden) - bestHour'ı da gönder
          this.runPipelineAsync(rule, slot.id, bestHour).catch(error => {
            console.error(`[Scheduler] Pipeline error for ${rule.id}:`, error);
          });

          result.triggered++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          result.errors.push(`Rule ${rule.id}: ${errorMsg}`);
        }
      }

      console.log(`[Scheduler] Summary: ${result.triggered} triggered, ${result.skipped} skipped, ${result.errors.length} errors`);

      return result;

    } catch (error) {
      console.error("[Scheduler] Fatal error:", error);
      throw error;
    }
  }

  /**
   * Kural aralığındaki en iyi saati bul (TimeScoreService kullanarak)
   * @param rule - Zaman kuralı
   * @param day - Gün (0-6)
   * @returns En iyi saat
   */
  private async findBestHourInRange(rule: TimeSlotRule, day: DayOfWeekIndex): Promise<number> {
    let bestHour = rule.startHour;
    let bestScore = -1;

    // Kural aralığındaki her saat için skor hesapla
    for (let hour = rule.startHour; hour < rule.endHour; hour++) {
      const score = this.timeScoreService.getDefaultScore(day, hour);

      if (score > bestScore) {
        bestScore = score;
        bestHour = hour;
      }
    }

    console.log(`[Scheduler] Best hour in range ${rule.startHour}-${rule.endHour}: ${bestHour} (score: ${bestScore})`);
    return bestHour;
  }

  /**
   * En iyi saate göre tetikleme zamanı kontrolü
   * Buffer (30dk) önce tetiklenir ki görsel üretimi tamamlandığında tam o saatte paylaşılsın
   * @param bestHour - En iyi saat
   * @param currentHour - Şu anki saat
   * @param currentMinute - Şu anki dakika
   * @returns Tetiklenme zamanı mı?
   */
  private isRuleActiveForBestHour(bestHour: number, currentHour: number, currentMinute: number): boolean {
    const bufferMinutes = this.config.scheduleBuffer || 30;

    // Tetiklenme penceresi: bestHour - buffer ile bestHour arası
    // Örnek: bestHour=9, buffer=30dk → 8:30-9:00 arası tetikle
    const triggerStartHour = bestHour - 1;
    const triggerStartMinute = 60 - bufferMinutes; // 30dk buffer için 30

    // Şu anki zaman kontrolü
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const triggerStartTotalMinutes = triggerStartHour * 60 + triggerStartMinute;
    const triggerEndTotalMinutes = bestHour * 60;

    const isActive = currentTotalMinutes >= triggerStartTotalMinutes &&
      currentTotalMinutes <= triggerEndTotalMinutes;

    if (isActive) {
      console.log(`[Scheduler] Trigger window active: ${triggerStartHour}:${triggerStartMinute} - ${bestHour}:00, current: ${currentHour}:${currentMinute}`);
    }

    return isActive;
  }

  /**
   * Bugün için bu slot işlenmiş mi kontrol et
   */
  private async checkExistingSlot(ruleId: string, date: Date): Promise<boolean> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const snapshot = await this.db
      .collection("scheduled-slots")
      .where("timeSlotRuleId", "==", ruleId)
      .where("scheduledTime", ">=", startOfDay.getTime())
      .where("scheduledTime", "<=", endOfDay.getTime())
      .limit(1)
      .get();

    return !snapshot.empty;
  }

  /**
   * Yeni slot oluştur
   * @param rule - Zaman kuralı
   * @param date - Tarih
   * @param bestHour - En optimal saat (TimeScoreService'den)
   */
  private async createSlot(rule: TimeSlotRule, date: Date, bestHour?: number): Promise<ScheduledSlot> {
    const scheduledTime = new Date(date);
    // bestHour varsa onu kullan, yoksa rule.startHour kullan
    const targetHour = bestHour ?? rule.startHour;
    scheduledTime.setHours(targetHour, 0, 0, 0);

    const slot: Omit<ScheduledSlot, "id"> = {
      scheduledTime: scheduledTime.getTime(),
      timeSlotRuleId: rule.id,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const docRef = await this.db.collection("scheduled-slots").add(slot);

    console.log(`[Scheduler] Created slot for rule ${rule.id} at ${targetHour}:00`);

    return { id: docRef.id, ...slot };
  }

  /**
   * Pipeline'ı async çalıştır
   * @param rule - Zaman kuralı
   * @param slotId - Slot ID
   * @param scheduledHour - İçeriğin hedeflediği saat (zaman dilimine göre içerik üretimi için)
   * @param overrideThemeId - Manuel tema override (Dashboard'dan "Şimdi Üret" için)
   * @param overrideAspectRatio - Manuel aspect ratio override (Dashboard'dan seçim için)
   */
  private async runPipelineAsync(
    rule: TimeSlotRule,
    slotId: string,
    scheduledHour?: number,
    overrideThemeId?: string,
    overrideAspectRatio?: "1:1" | "3:4" | "9:16"
  ): Promise<void> {
    const orchestrator = new Orchestrator(this.config);

    try {
      // Slot durumunu güncelle
      await this.updateSlotStatus(slotId, "generating");

      // Ürün tipini belirle
      const productType = rule.productTypes[0]; // İlk ürün tipi

      // Progress callback - her aşamada slot'u güncelle
      const onProgress = async (stage: string, stageIndex: number, totalStages: number) => {
        await this.db.collection("scheduled-slots").doc(slotId).update({
          currentStage: stage,
          stageIndex,
          totalStages,
          updatedAt: Date.now(),
        });
      };

      // Pipeline çalıştır (progress callback ile, slotId ile, scheduledHour ile, themeId ve aspectRatio ile)
      const result = await orchestrator.runPipeline(
        productType,
        rule,
        onProgress,
        slotId,
        scheduledHour,
        overrideThemeId,
        overrideAspectRatio
      );

      // Slot'u güncelle (undefined değerleri temizle)
      await this.db.collection("scheduled-slots").doc(slotId).update({
        status: "awaiting_approval",
        pipelineResult: removeUndefined(result),
        currentStage: "completed",
        stageIndex: 7,
        totalStages: 7,
        updatedAt: Date.now(),
      });

      // NOT: Üretim geçmişi ve asset usageCount artırımı artık orchestrator.ts içinde yapılıyor
      // Double-write bug'ını önlemek için buradaki saveProductionHistory kaldırıldı
      // Bkz: orchestrator.ts satır 550-565 (addToHistory + incrementAssetUsageCounts)

      console.log(`[Scheduler] Pipeline completed for slot ${slotId}`);

    } catch (error) {
      console.error(`[Scheduler] Pipeline failed for slot ${slotId}:`, error);

      await this.db.collection("scheduled-slots").doc(slotId).update({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        updatedAt: Date.now(),
      });
    }
  }

  /**
   * Slot durumunu güncelle
   */
  private async updateSlotStatus(slotId: string, status: ScheduledSlot["status"]): Promise<void> {
    await this.db.collection("scheduled-slots").doc(slotId).update({
      status,
      updatedAt: Date.now(),
    });
  }

  // ==========================================
  // MANUAL TRIGGERS
  // ==========================================

  /**
   * Manuel olarak belirli bir kural için pipeline başlat
   */
  async triggerManually(ruleId: string): Promise<string> {
    const ruleDoc = await this.db.collection("time-slot-rules").doc(ruleId).get();

    if (!ruleDoc.exists) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    const rule = { id: ruleDoc.id, ...ruleDoc.data() } as TimeSlotRule;
    const slot = await this.createSlot(rule, new Date());

    // Pipeline'ı async başlat
    this.runPipelineAsync(rule, slot.id).catch(error => {
      console.error(`[Scheduler] Manual pipeline error for ${ruleId}:`, error);
    });

    return slot.id;
  }

  /**
   * Belirli bir ürün tipi için hemen içerik üret
   * Pipeline tamamlanana kadar bekler
   * @param productType - Ürün tipi
   * @param overrideThemeId - Opsiyonel tema ID'si (senaryo filtreleme için)
   * @param overrideAspectRatio - Opsiyonel aspect ratio (Instagram formatı için)
   */
  async generateNow(
    productType: ProductType,
    overrideThemeId?: string,
    overrideAspectRatio?: "1:1" | "3:4" | "9:16"
  ): Promise<{
    slotId: string;
    success: boolean;
    error?: string;
    duration?: number;
  }> {
    const startTime = Date.now();

    // Varsayılan kural oluştur
    // themeId varsa rule'a ekle (orchestrator bu themeId'yi kullanacak)
    const tempRule: TimeSlotRule = {
      id: `manual-${Date.now()}`,
      startHour: new Date().getHours(),
      endHour: new Date().getHours() + 1,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      productTypes: [productType],
      isActive: true,
      priority: 0,
      themeId: overrideThemeId, // Tema override
    };

    const slot = await this.createSlot(tempRule, new Date());

    try {
      // Pipeline'ı bekleyerek çalıştır (themeId ve aspectRatio override ile)
      await this.runPipelineAsync(tempRule, slot.id, undefined, overrideThemeId, overrideAspectRatio);

      return {
        slotId: slot.id,
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`[Scheduler] generateNow error:`, error);
      return {
        slotId: slot.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
      };
    }
  }
  // ==========================================
  // PRODUCTION HISTORY TRACKING
  // ==========================================
  // NOT: saveProductionHistory, incrementAssetUsage ve cleanupOldHistory fonksiyonları
  // artık orchestrator.ts içinde yapılıyor (addToHistory + incrementAssetUsageCounts).
  // Double-write bug'ını önlemek için scheduler'daki kopyalar kaldırıldı.
  // Bkz: orchestrator.ts satır 552-580

  /**
   * Son N üretimin geçmişini al
   */
  async getRecentHistory(limit: number = 15): Promise<ProductionHistoryEntry[]> {
    const snapshot = await this.db
      .collection("production-history")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data() as ProductionHistoryEntry);
  }

  /**
   * Köpek kullanım istatistiklerini al
   */
  async getPetUsageStats(recentCount: number = 15): Promise<{
    petUsageCount: number;
    lastPetUsage?: number;
    shouldIncludePet: boolean;
  }> {
    const history = await this.getRecentHistory(recentCount);

    const petEntries = history.filter(e => e.includesPet);
    const petUsageCount = petEntries.length;
    const lastPetUsage = petEntries.length > 0 ? petEntries[0].timestamp : undefined;

    // Köpek dahil edilmeli mi? (Son 15 üretimde hiç köpek yoksa)
    const shouldIncludePet = petUsageCount === 0;

    console.log(`[Scheduler] Pet stats - used: ${petUsageCount}/${recentCount}, shouldInclude: ${shouldIncludePet}`);

    return {
      petUsageCount,
      lastPetUsage,
      shouldIncludePet,
    };
  }

  /**
   * Takılı kalan veya zaman aşımına uğrayan işleri kontrol et
   */
  async checkStuckSlots(): Promise<{ recovered: number; failed: number }> {
    const now = Date.now();

    // Timeout değerlerini config'den al (runtime'da değiştirilebilir)
    const timeoutConfig = await getTimeouts();
    const systemSettings = await getSystemSettings();
    const TIMEOUT_MS = timeoutConfig.processingTimeoutMinutes * 60 * 1000; // Config'den dakika -> ms
    const STUCK_MS = systemSettings.stuckWarningMinutes * 60 * 1000; // Config'den dakika -> ms (uyarı için)

    const result = {
      recovered: 0,
      failed: 0,
    };

    try {
      // 'generating' veya 'pending' durumundaki işleri çek
      const snapshot = await this.db.collection("scheduled-slots")
        .where("status", "in", ["generating", "pending"])
        .get();

      if (snapshot.empty) return result;

      for (const doc of snapshot.docs) {
        const slot = doc.data() as ScheduledSlot;
        const lastUpdate = slot.updatedAt || slot.createdAt;
        const diff = now - lastUpdate;

        // 1. Durum: Zaman aşımı (processingTimeoutMinutes süre işlem yok) -> FAILED yap
        if (diff > TIMEOUT_MS) {
          const timeoutMinutes = timeoutConfig.processingTimeoutMinutes;
          console.warn(`[Scheduler] Slot ${doc.id} timed out (${Math.floor(diff / 60000)}m). Marking as failed.`);
          await doc.ref.update({
            status: "failed",
            error: `Timeout: İşlem ${timeoutMinutes} dakikadan uzun sürdü ve zaman aşımına uğradı.`,
            updatedAt: now,
          });
          result.failed++;
          continue;
        }

        // 2. Durum: Takılı kalma (15 dakikadır işlem yok) -> Logla (İlerde resume eklenebilir)
        if (diff > STUCK_MS) {
          console.log(`[Scheduler] Slot ${doc.id} seems stuck at stage '${slot.currentStage}' for ${Math.floor(diff / 60000)}m.`);
          // Şimdilik sadece logluyoruz. Buraya resume mantığı eklenebilir.
        }
      }

      return result;
    } catch (error) {
      console.error("[Scheduler] checkStuckSlots error:", error);
      return result;
    }
  }
}

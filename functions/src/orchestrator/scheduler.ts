/**
 * Orchestrator Scheduler
 * Zamanlanmış içerik üretimini yönetir
 */

import { getFirestore } from "firebase-admin/firestore";
import { Orchestrator } from "./orchestrator";
import {
  TimeSlotRule,
  ProductType,
  OrchestratorConfig,
  ScheduledSlot,
} from "./types";

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

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.db = getFirestore();
  }

  /**
   * Aktif zaman kurallarını kontrol et ve pipeline başlat
   * Bu fonksiyon Cloud Scheduler tarafından her 15 dakikada bir çağrılır
   */
  async checkAndTrigger(): Promise<{
    triggered: number;
    skipped: number;
    errors: string[];
  }> {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Pazar

    console.log(`[Scheduler] Checking slots for day ${currentDay}, hour ${currentHour}`);

    const result = {
      triggered: 0,
      skipped: 0,
      errors: [] as string[],
    };

    try {
      // Aktif zaman kurallarını al
      const rulesSnapshot = await this.db
        .collection("time-slot-rules")
        .where("isActive", "==", true)
        .get();

      for (const doc of rulesSnapshot.docs) {
        const rule = { id: doc.id, ...doc.data() } as TimeSlotRule;

        // Bu kural şu an için geçerli mi?
        if (!this.isRuleActive(rule, currentDay, currentHour)) {
          continue;
        }

        // Bu slot için zaten içerik üretilmiş mi?
        const existingSlot = await this.checkExistingSlot(rule.id, now);
        if (existingSlot) {
          console.log(`[Scheduler] Slot ${rule.id} already processed today`);
          result.skipped++;
          continue;
        }

        // Pipeline başlat
        try {
          console.log(`[Scheduler] Triggering pipeline for rule: ${rule.id}`);

          // Slot oluştur
          const slot = await this.createSlot(rule, now);

          // Pipeline'ı async başlat (beklemeden)
          this.runPipelineAsync(rule, slot.id).catch(error => {
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
   * Kural şu an için geçerli mi kontrol et
   */
  private isRuleActive(rule: TimeSlotRule, currentDay: number, currentHour: number): boolean {
    // Gün kontrolü
    if (!rule.daysOfWeek.includes(currentDay)) {
      return false;
    }

    // Saat kontrolü (buffer ile)
    const bufferMinutes = this.config.scheduleBuffer || 30;
    const bufferHours = bufferMinutes / 60;

    // Başlangıç saatinden buffer kadar önce tetikle
    const triggerHour = rule.startHour - bufferHours;

    return currentHour >= triggerHour && currentHour < rule.startHour;
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
   */
  private async createSlot(rule: TimeSlotRule, date: Date): Promise<ScheduledSlot> {
    const scheduledTime = new Date(date);
    scheduledTime.setHours(rule.startHour, 0, 0, 0);

    const slot: Omit<ScheduledSlot, "id"> = {
      scheduledTime: scheduledTime.getTime(),
      timeSlotRuleId: rule.id,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const docRef = await this.db.collection("scheduled-slots").add(slot);

    return { id: docRef.id, ...slot };
  }

  /**
   * Pipeline'ı async çalıştır
   */
  private async runPipelineAsync(rule: TimeSlotRule, slotId: string): Promise<void> {
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

      // Pipeline çalıştır (progress callback ile)
      const result = await orchestrator.runPipeline(productType, rule, onProgress);

      // Slot'u güncelle (undefined değerleri temizle)
      await this.db.collection("scheduled-slots").doc(slotId).update({
        status: "awaiting_approval",
        pipelineResult: removeUndefined(result),
        currentStage: "completed",
        stageIndex: 7,
        totalStages: 7,
        updatedAt: Date.now(),
      });

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
   */
  async generateNow(productType: ProductType): Promise<{
    slotId: string;
    success: boolean;
    error?: string;
    duration?: number;
  }> {
    const startTime = Date.now();

    // Varsayılan kural oluştur
    const tempRule: TimeSlotRule = {
      id: `manual-${Date.now()}`,
      startHour: new Date().getHours(),
      endHour: new Date().getHours() + 1,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      productTypes: [productType],
      isActive: true,
      priority: 0,
    };

    const slot = await this.createSlot(tempRule, new Date());

    try {
      // Pipeline'ı bekleyerek çalıştır
      await this.runPipelineAsync(tempRule, slot.id);

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
}

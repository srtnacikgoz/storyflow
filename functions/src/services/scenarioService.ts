/**
 * Scenario Service
 *
 * v3.0 - Mood ve Scenario birleştirildi.
 * Bu servis yeni birleşik Scenario yapısını yönetir.
 *
 * Collection: scenarios
 *
 * Özellikler:
 * - CRUD operasyonları
 * - Atmosfer filtresi (timeOfDay, season, weather)
 * - Firestore'dan dinamik okuma
 */

import { db } from "../config/firebase";
import { Scenario, FirestoreScenario } from "../orchestrator/types";

const COLLECTION_NAME = "scenarios";

export class ScenarioService {
  private collection = db.collection(COLLECTION_NAME);

  /**
   * Tüm senaryoları getir
   * @param activeOnly - Sadece aktif senaryoları getir
   */
  async getAllScenarios(activeOnly: boolean = false): Promise<Scenario[]> {
    let query: FirebaseFirestore.Query = this.collection.orderBy("sortOrder", "asc");

    if (activeOnly) {
      query = query.where("isActive", "==", true);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Scenario));
  }

  /**
   * ID ile senaryo getir
   */
  async getScenarioById(id: string): Promise<Scenario | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Scenario;
  }

  /**
   * Yeni senaryo oluştur
   */
  async createScenario(
    data: Omit<FirestoreScenario, "id" | "createdAt" | "updatedAt">
  ): Promise<Scenario> {
    const now = Date.now();

    // sortOrder otomatik hesapla (en sona ekle)
    const allScenarios = await this.getAllScenarios();
    const maxSortOrder = allScenarios.reduce(
      (max, s) => Math.max(max, s.sortOrder || 0),
      0
    );

    const scenario: Omit<Scenario, "id"> = {
      ...data,
      sortOrder: data.sortOrder ?? maxSortOrder + 1,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.collection.add(scenario);
    console.log(`[ScenarioService] Created scenario: ${docRef.id} - ${data.name}`);
    return { id: docRef.id, ...scenario };
  }

  /**
   * Senaryo güncelle
   */
  async updateScenario(
    id: string,
    data: Partial<Omit<Scenario, "id" | "createdAt" | "updatedAt">>
  ): Promise<void> {
    await this.collection.doc(id).update({
      ...data,
      updatedAt: Date.now(),
    });
    console.log(`[ScenarioService] Updated scenario: ${id}`);
  }

  /**
   * Senaryo sil (hard delete)
   */
  async deleteScenario(id: string): Promise<void> {
    await this.collection.doc(id).delete();
    console.log(`[ScenarioService] Deleted scenario: ${id}`);
  }

  /**
   * Verilen atmosfer koşullarına uygun senaryoları bul
   *
   * @param hourOfDay - Saat (0-23)
   * @param season - Mevsim (opsiyonel)
   * @param weather - Hava durumu (opsiyonel)
   * @returns Uygun senaryolar listesi
   */
  async getMatchingScenarios(
    hourOfDay: number,
    season?: Scenario["season"],
    weather?: Scenario["weather"]
  ): Promise<Scenario[]> {
    const allActive = await this.getAllScenarios(true);

    // Saat -> timeOfDay dönüşümü
    let timeOfDay: Scenario["timeOfDay"] = "night";
    if (hourOfDay >= 5 && hourOfDay < 12) timeOfDay = "morning";
    else if (hourOfDay >= 12 && hourOfDay < 17) timeOfDay = "afternoon";
    else if (hourOfDay >= 17 && hourOfDay < 21) timeOfDay = "evening";

    return allActive.filter((scenario) => {
      // Interior senaryolar her zaman uygun (atmosfer filtresi uygulanmaz)
      if (scenario.isInterior) return true;

      // Atmosfer alanları yoksa (eski format) her zaman uygun
      if (!scenario.timeOfDay && !scenario.season && !scenario.weather) {
        return true;
      }

      // 1. Zaman kontrolü
      const timeMatch =
        !scenario.timeOfDay ||
        scenario.timeOfDay === "any" ||
        scenario.timeOfDay === timeOfDay;

      // 2. Mevsim kontrolü
      const seasonMatch =
        !season ||
        !scenario.season ||
        scenario.season === "any" ||
        scenario.season === season;

      // 3. Hava durumu kontrolü
      const weatherMatch =
        !weather ||
        !scenario.weather ||
        scenario.weather === "any" ||
        scenario.weather === weather;

      return timeMatch && seasonMatch && weatherMatch;
    });
  }

  /**
   * El içeren senaryoları getir
   */
  async getHandScenarios(activeOnly: boolean = true): Promise<Scenario[]> {
    const scenarios = await this.getAllScenarios(activeOnly);
    return scenarios.filter((s) => s.includesHands && !s.isInterior);
  }

  /**
   * El içermeyen (masa üstü) senaryoları getir
   */
  async getTableTopScenarios(activeOnly: boolean = true): Promise<Scenario[]> {
    const scenarios = await this.getAllScenarios(activeOnly);
    return scenarios.filter((s) => !s.includesHands && !s.isInterior);
  }

  /**
   * Interior senaryoları getir
   */
  async getInteriorScenarios(activeOnly: boolean = true): Promise<Scenario[]> {
    const scenarios = await this.getAllScenarios(activeOnly);
    return scenarios.filter((s) => s.isInterior);
  }

  /**
   * Senaryo sayısını getir
   */
  async getScenarioCount(): Promise<{ total: number; active: number; interior: number }> {
    const all = await this.getAllScenarios();
    return {
      total: all.length,
      active: all.filter((s) => s.isActive).length,
      interior: all.filter((s) => s.isInterior).length,
    };
  }

  /**
   * Senaryoları sırala (sortOrder güncelle)
   * @param orderedIds - Yeni sıralamaya göre ID listesi
   */
  async reorderScenarios(orderedIds: string[]): Promise<void> {
    const batch = db.batch();

    orderedIds.forEach((id, index) => {
      const docRef = this.collection.doc(id);
      batch.update(docRef, {
        sortOrder: index + 1,
        updatedAt: Date.now(),
      });
    });

    await batch.commit();
    console.log(`[ScenarioService] Reordered ${orderedIds.length} scenarios`);
  }

  /**
   * Atmosfer prompt'unu oluştur (Senaryo'dan)
   * Bu fonksiyon Gemini promptBuilder'a atmosfer bilgisi sağlar
   */
  buildAtmospherePrompt(scenario: Scenario): string | null {
    // Atmosfer alanları yoksa null döndür
    if (!scenario.lightingPrompt && !scenario.colorGradePrompt) {
      return null;
    }

    const parts: string[] = [];

    if (scenario.lightingPrompt) {
      parts.push(`LIGHTING: ${scenario.lightingPrompt}`);
    }

    if (scenario.colorGradePrompt) {
      parts.push(`COLOR PALETTE: ${scenario.colorGradePrompt}`);
    }

    // Zaman/mevsim/hava bilgisi ekle (varsa)
    const conditions: string[] = [];
    if (scenario.timeOfDay && scenario.timeOfDay !== "any") {
      conditions.push(scenario.timeOfDay);
    }
    if (scenario.season && scenario.season !== "any") {
      conditions.push(scenario.season);
    }
    if (scenario.weather && scenario.weather !== "any") {
      conditions.push(scenario.weather);
    }

    if (conditions.length > 0) {
      parts.push(`CONDITIONS: ${conditions.join(", ")}`);
    }

    return parts.join("\n");
  }
}

// Singleton instance
export const scenarioService = new ScenarioService();

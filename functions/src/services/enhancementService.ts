/**
 * Enhancement Service
 * Preset CRUD + Job yönetimi + AI fotoğraf analizi
 */

import { getFirestore } from "firebase-admin/firestore";
import { EnhancementPreset, EnhancementJob, PhotoAnalysis } from "../orchestrator/types";
import { DEFAULT_ENHANCEMENT_PRESETS } from "../orchestrator/seed/enhancementSeedData";

const db = getFirestore();
const PRESETS_COLLECTION = "enhancement-presets";
const JOBS_COLLECTION = "enhancement-jobs";

export class EnhancementService {
  // ==========================================
  // Preset CRUD
  // ==========================================

  async listPresets(activeOnly = false): Promise<EnhancementPreset[]> {
    let ref: FirebaseFirestore.Query = db.collection(PRESETS_COLLECTION);
    if (activeOnly) {
      ref = ref.where("isActive", "==", true);
    }
    ref = ref.orderBy("order", "asc");
    const snapshot = await ref.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EnhancementPreset));
  }

  async getPreset(id: string): Promise<EnhancementPreset | null> {
    const doc = await db.collection(PRESETS_COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as EnhancementPreset;
  }

  async createPreset(data: Omit<EnhancementPreset, "createdAt" | "updatedAt">): Promise<EnhancementPreset> {
    const now = Date.now();
    const preset: EnhancementPreset = { ...data, createdAt: now, updatedAt: now };
    await db.collection(PRESETS_COLLECTION).doc(data.id).set(preset);
    return preset;
  }

  async updatePreset(id: string, data: Partial<EnhancementPreset>): Promise<void> {
    await db.collection(PRESETS_COLLECTION).doc(id).update({ ...data, updatedAt: Date.now() });
  }

  async deletePreset(id: string): Promise<void> {
    await db.collection(PRESETS_COLLECTION).doc(id).delete();
  }

  async seedPresets(): Promise<{ added: number; skipped: number }> {
    let added = 0;
    let skipped = 0;
    for (const preset of DEFAULT_ENHANCEMENT_PRESETS) {
      const existing = await db.collection(PRESETS_COLLECTION).doc(preset.id).get();
      if (existing.exists) {
        skipped++;
        continue;
      }
      await this.createPreset(preset);
      added++;
    }
    return { added, skipped };
  }

  // ==========================================
  // Job CRUD
  // ==========================================

  async createJob(data: {
    originalImageUrl: string;
    originalStoragePath: string;
  }): Promise<EnhancementJob> {
    const now = Date.now();
    const ref = db.collection(JOBS_COLLECTION).doc();
    const job: EnhancementJob = {
      id: ref.id,
      originalImageUrl: data.originalImageUrl,
      originalStoragePath: data.originalStoragePath,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(job);
    return job;
  }

  async getJob(id: string): Promise<EnhancementJob | null> {
    const doc = await db.collection(JOBS_COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as EnhancementJob;
  }

  async updateJob(id: string, data: Partial<EnhancementJob>): Promise<void> {
    await db.collection(JOBS_COLLECTION).doc(id).update({ ...data, updatedAt: Date.now() });
  }

  async listJobs(limit = 50): Promise<EnhancementJob[]> {
    const snapshot = await db
      .collection(JOBS_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EnhancementJob));
  }

  async deleteJob(id: string): Promise<void> {
    await db.collection(JOBS_COLLECTION).doc(id).delete();
  }

  // ==========================================
  // AI Fotoğraf Analizi (Semantic Anchoring)
  // ==========================================

  /**
   * Gemini analiz prompt'unu oluştur
   * presetIds dinamik olarak Firestore'dan çekilir — hardcoded değil
   */
  buildAnalysisPrompt(presetIds: string[]): string {
    const presetList = presetIds.length > 0
      ? presetIds.join(", ")
      : "studio-white, warm-wood, minimal-marble, dark-dramatic, pastel-soft";

    return `You are a professional food photography analyst. Analyze this product photo and return a JSON object with these fields:

{
  "productType": "type of baked good in Turkish (pasta, kurabiye, ekmek, tart, croissant, etc.)",
  "surfaceProperties": "surface texture description in English (glossy glaze, matte fondant, powdered sugar, chocolate ganache, etc.)",
  "currentLighting": "good | medium | poor",
  "currentBackground": "describe current background in Turkish (beyaz, ahsap masa, karisik, bulanik, etc.)",
  "compositionScore": 7,
  "suggestedPreset": "one of: ${presetList}",
  "notes": "any additional notes about the photo quality or suggestions in Turkish"
}

Rules:
- compositionScore: 1-10, based on framing, focus, and product visibility
- suggestedPreset: choose based on product type and current photo quality
- Be honest about quality — don't inflate scores
- Return ONLY valid JSON, no markdown or extra text`;
  }

  /**
   * Gemini analiz sonucunu parse et
   */
  parseAnalysisResult(text: string): PhotoAnalysis | null {
    try {
      // JSON bloğu çıkar (markdown code fence varsa temizle)
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        productType: parsed.productType || "bilinmiyor",
        surfaceProperties: parsed.surfaceProperties || "unknown",
        currentLighting: parsed.currentLighting || "medium",
        currentBackground: parsed.currentBackground || "bilinmiyor",
        compositionScore: Math.min(10, Math.max(1, Number(parsed.compositionScore) || 5)),
        suggestedPreset: parsed.suggestedPreset || undefined,
        notes: parsed.notes || undefined,
      };
    } catch {
      console.error("[EnhancementService] Analiz parse hatası:", text.substring(0, 200));
      return null;
    }
  }
}

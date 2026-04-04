/**
 * Enhancement Service
 * Preset CRUD + Job yönetimi + AI fotoğraf analizi
 */

import { getFirestore } from "firebase-admin/firestore";
import { EnhancementPreset, EnhancementJob, EnhancementStyle, PhotoAnalysis, UpscaleOption, UpscaleResult } from "../orchestrator/types";
import { DEFAULT_ENHANCEMENT_PRESETS, DEFAULT_ENHANCEMENT_STYLES } from "../orchestrator/seed/enhancementSeedData";

const db = getFirestore();
const PRESETS_COLLECTION = "enhancement-presets";
const STYLES_COLLECTION = "enhancement-styles";
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
  // Style CRUD
  // ==========================================

  async listStyles(activeOnly = false): Promise<EnhancementStyle[]> {
    let ref: FirebaseFirestore.Query = db.collection(STYLES_COLLECTION);
    if (activeOnly) {
      ref = ref.where("isActive", "==", true);
    }
    ref = ref.orderBy("order", "asc");
    const snapshot = await ref.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EnhancementStyle));
  }

  async getStyle(id: string): Promise<EnhancementStyle | null> {
    const doc = await db.collection(STYLES_COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as EnhancementStyle;
  }

  async createStyle(data: Omit<EnhancementStyle, "createdAt" | "updatedAt">): Promise<EnhancementStyle> {
    const now = Date.now();
    const style: EnhancementStyle = { ...data, createdAt: now, updatedAt: now };
    await db.collection(STYLES_COLLECTION).doc(data.id).set(style);
    return style;
  }

  async seedStyles(): Promise<{ added: number; skipped: number }> {
    let added = 0;
    let skipped = 0;
    for (const style of DEFAULT_ENHANCEMENT_STYLES) {
      const existing = await db.collection(STYLES_COLLECTION).doc(style.id).get();
      if (existing.exists) {
        skipped++;
        continue;
      }
      await this.createStyle(style);
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
  // ==========================================
  // Enhancement Prompt Builder (Faz 2)
  // ==========================================

  /**
   * Preset + stil + analiz sonucuna göre enhancement prompt'u oluştur
   * mode: "full" = BG kaldırma + yeni arka plan + gölge + stil
   * mode: "enhance-only" = mevcut arka planı koru, sadece ışık/renk/detay iyileştir
   */
  buildEnhancementPrompt(
    preset: EnhancementPreset | null,
    style: EnhancementStyle | null,
    analysis?: PhotoAnalysis,
    mode: "full" | "enhance-only" = "full"
  ): string {
    const productDesc = analysis
      ? `a ${analysis.surfaceProperties} ${analysis.productType}`
      : "the bakery product";

    // Enhance-only modu: arka plan değiştirme, sadece iyileştir
    if (mode === "enhance-only") {
      const styleInstructions = style?.promptInstructions || "Enhance the lighting, color, and detail quality.";
      return `You are a professional food photography retoucher. Enhance this photo of ${productDesc} WITHOUT changing the background or composition.

ENHANCEMENT STYLE: ${styleInstructions}

CRITICAL RULES:
- DO NOT change the background — keep it exactly as is
- DO NOT move, resize, or reposition the product
- PRESERVE the product's shape, color, texture, and all details exactly
- Only improve: lighting quality, color accuracy, detail sharpness, overall polish
- The result should look like the same photo taken with better equipment and lighting
- Output resolution: match input resolution

Return ONLY the edited image.`;
    }

    // Full modu: BG kaldırma + yeni arka plan + gölge + stil
    const hasReference = preset?.referenceImageUrl;

    const bgInstructions = preset
      ? `BACKGROUND: ${preset.backgroundPrompt}\n\nSHADOW: ${preset.shadowPrompt}\n\nLIGHTING:\n- Direction: ${preset.lightingDirection}\n- Color temperature: ${preset.colorTemperature}`
      : "BACKGROUND: Clean, professional background suitable for the product.";

    const referenceNote = hasReference
      ? "\n\nREFERENCE IMAGE: A reference background photo is provided as the second image. Match the surface, texture, color, and lighting atmosphere of this reference as closely as possible. Do NOT copy the reference exactly — use it as a visual guide for the background style."
      : "";

    const styleInstructions = style
      ? `\n\nENHANCEMENT STYLE: ${style.promptInstructions}`
      : "";

    return `You are a professional food product photographer. Transform this photo into a premium product shot.

TASK: Remove the current background and place ${productDesc} on a new background with natural shadow and professional lighting.

${bgInstructions}${referenceNote}${styleInstructions}

CRITICAL RULES:
- PRESERVE the product EXACTLY as it appears — do NOT modify its shape, color, texture, or any detail
- The product must look REAL, not AI-generated — maintain all imperfections and natural qualities
- Remove ALL of the original background — no traces of the old environment
- The shadow must look physically correct for the surface and lighting direction
- Center the product in frame with balanced composition
- Output resolution: match input resolution, at least 1024px on longest side

Return ONLY the edited image.`;
  }

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

  // ==========================================
  // Upscale (Faz 4) — Sharp.js ile kalite artırma
  // ==========================================

  /** Sabit upscale seçenekleri */
  static readonly UPSCALE_OPTIONS: UpscaleOption[] = [
    {
      id: "instagram-feed",
      displayName: "Instagram Feed",
      description: "1080x1350 (4:5) — Feed paylaşımı için optimum",
      width: 1080,
      height: 1350,
      aspectRatio: "4:5",
      format: "jpeg",
      quality: 95,
    },
    {
      id: "instagram-story",
      displayName: "Instagram Story",
      description: "1080x1920 (9:16) — Story ve Reels için",
      width: 1080,
      height: 1920,
      aspectRatio: "9:16",
      format: "jpeg",
      quality: 95,
    },
    {
      id: "square",
      displayName: "Kare",
      description: "1080x1080 (1:1) — Profil ve grid için",
      width: 1080,
      height: 1080,
      aspectRatio: "1:1",
      format: "jpeg",
      quality: 95,
    },
    {
      id: "hd",
      displayName: "Yüksek Kalite",
      description: "2160px — Katalog ve baskı için",
      width: 2160,
      height: 2700,
      aspectRatio: "4:5",
      format: "png",
      quality: 100,
    },
    {
      id: "original",
      displayName: "Orijinal Oran",
      description: "Orijinal en-boy oranını koru, 2K'ya upscale",
      width: 2048,
      height: 0, // Orijinal orana göre hesaplanacak
      aspectRatio: "original",
      format: "png",
      quality: 100,
    },
  ];

  /**
   * Sharp.js ile görsel upscale + sharpen + format dönüşümü
   */
  async upscaleImage(
    imageBuffer: Buffer,
    option: UpscaleOption
  ): Promise<{ buffer: Buffer; width: number; height: number; format: string }> {
    const sharp = (await import("sharp")).default;

    // Orijinal boyutları al
    const metadata = await sharp(imageBuffer).metadata();
    const origWidth = metadata.width || 1024;
    const origHeight = metadata.height || 1024;

    let targetWidth = option.width;
    let targetHeight = option.height;

    // "original" oranında: orijinal aspect ratio korunarak upscale
    if (option.aspectRatio === "original" || targetHeight === 0) {
      const ratio = origHeight / origWidth;
      targetHeight = Math.round(targetWidth * ratio);
    }

    // Resize + crop (cover) + sharpen
    let pipeline = sharp(imageBuffer)
      .resize(targetWidth, targetHeight, {
        fit: "cover",
        position: "centre",
        kernel: "lanczos3",
      })
      .sharpen({ sigma: 0.8, m1: 1.0, m2: 0.5 });

    // Format seçimi
    let outputFormat = option.format;
    if (option.format === "jpeg") {
      pipeline = pipeline.jpeg({ quality: option.quality, mozjpeg: true });
    } else {
      pipeline = pipeline.png({ quality: option.quality, compressionLevel: 6 });
      outputFormat = "png";
    }

    const outputBuffer = await pipeline.toBuffer();

    return {
      buffer: outputBuffer,
      width: targetWidth,
      height: targetHeight,
      format: outputFormat,
    };
  }
}

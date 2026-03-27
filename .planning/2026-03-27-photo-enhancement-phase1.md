# Photo Enhancement — Faz 1: Temel Altyapi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gercek urun fotografini yukleyip AI ile analiz eden, enhancement preset'lerini Firestore'dan yoneten temel altyapiyi kurmak.

**Architecture:** Orchestrator pattern (modular controller + shared.ts). Enhancement jobs Firestore'da, gorseller Firebase Storage'da. Admin Panel'de yeni "Fotograf Iyilestir" sayfasi. Gemini 3.1 Flash Image analiz icin kullanilacak.

**Tech Stack:** Firebase Functions (TypeScript), React + Tailwind (Admin), Firestore, Firebase Storage, Gemini API

---

## Dosya Haritasi

| Dosya | Islem | Sorumluluk |
|-------|-------|------------|
| `functions/src/orchestrator/types.ts` | Modify | EnhancementPreset + EnhancementJob tipleri |
| `functions/src/services/enhancementService.ts` | Create | Enhancement preset CRUD + job yonetimi |
| `functions/src/controllers/orchestrator/enhancementController.ts` | Create | HTTP endpoint'ler |
| `functions/src/controllers/orchestrator/index.ts` | Modify | Yeni export'lar |
| `functions/src/orchestrator/seed/enhancementSeedData.ts` | Create | Varsayilan preset verileri |
| `admin/src/types/index.ts` | Modify | Yeni tip import'lari |
| `admin/src/services/api.ts` | Modify | Enhancement API metodlari |
| `admin/src/pages/Enhance.tsx` | Create | Ana sayfa — yukle, analiz et, preset sec |
| `admin/src/App.tsx` | Modify | Route ekle |
| `admin/src/components/Sidebar.tsx` | Modify | Menu item ekle |

---

### Task 1: TypeScript Tipleri

**Files:**
- Modify: `functions/src/orchestrator/types.ts`
- Modify: `admin/src/types/index.ts`

- [ ] **Step 1: Backend tipleri ekle**

`functions/src/orchestrator/types.ts` dosyasinin sonuna ekle:

```typescript
// ==========================================
// Photo Enhancement Types
// ==========================================

/** Enhancement arka plan preset'i */
export interface EnhancementPreset {
  id: string;
  displayName: string;         // "Studio Beyaz", "Sicak Ahsap"
  description?: string;
  backgroundStyle: string;     // "pure-white", "warm-wood", "dark-slate", "minimal-marble"
  backgroundPrompt: string;    // Gemini'ye gonderilecek arka plan talimat
  shadowType: string;          // "soft-drop", "contact", "directional", "none" — Firestore'da serbest
  shadowPrompt: string;        // Golge talimat
  lightingDirection: string;   // "top-left", "top-right", "front", "natural" — Firestore'da serbest
  colorTemperature: string;    // "warm", "neutral", "cool" — Firestore'da serbest
  isActive: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

/** Enhancement is durumu */
export type EnhancementJobStatus = "pending" | "analyzing" | "processing" | "completed" | "failed";

/** AI foto analiz sonucu */
export interface PhotoAnalysis {
  productType: string;        // "pasta", "kurabiye", "ekmek"
  surfaceProperties: string;  // "parlak glaze", "mat fondant", "pudra sekeri"
  currentLighting: string;     // "good", "medium", "poor"
  currentBackground: string;  // "beyaz", "ahsap masa", "karisik"
  compositionScore: number;   // 1-10
  suggestedPreset?: string;   // Onerilen preset ID
  notes?: string;             // Ek notlar
}

/** Enhancement is kaydi */
export interface EnhancementJob {
  id: string;
  originalImageUrl: string;     // Yuklenen orijinal
  originalStoragePath: string;  // Storage path
  analysis?: PhotoAnalysis;     // AI analiz sonucu
  selectedPresetId?: string;    // Kullanicinin sectigi preset
  enhancedImageUrl?: string;    // Sonuc gorsel URL
  status: EnhancementJobStatus;
  error?: string;
  createdAt: number;
  updatedAt: number;
}
```

- [ ] **Step 2: Frontend tipleri ekle**

`admin/src/types/index.ts` dosyasinin sonuna ayni tiplerin export'unu ekle (veya backend'den import pattern kullaniliyorsa oradan import et).

- [ ] **Step 3: Build kontrol**

Run: `cd functions && npm run build`
Expected: Basarili build, yeni tipler tanimli.

---

### Task 2: Seed Data — Varsayilan Preset'ler

**Files:**
- Create: `functions/src/orchestrator/seed/enhancementSeedData.ts`

- [ ] **Step 1: Seed dosyasini olustur**

```typescript
/**
 * Enhancement Preset Seed Data
 * Varsayilan arka plan ve iyilestirme preset'leri
 */

import { EnhancementPreset } from "../types";

export const DEFAULT_ENHANCEMENT_PRESETS: Omit<EnhancementPreset, "createdAt" | "updatedAt">[] = [
  {
    id: "studio-white",
    displayName: "Studio Beyaz",
    description: "Saf beyaz arka plan, yumusak golge. E-ticaret ve katalog icin ideal.",
    backgroundStyle: "pure-white",
    backgroundPrompt: "Place the product on a pure white seamless background. Clean, bright, professional product photography style.",
    shadowType: "soft-drop",
    shadowPrompt: "Add a subtle soft drop shadow beneath the product, slightly diffused, natural looking.",
    lightingDirection: "top-left",
    colorTemperature: "neutral",
    isActive: true,
    order: 1,
  },
  {
    id: "warm-wood",
    displayName: "Sicak Ahsap",
    description: "Ahsap masa uzerinde, sicak isikli. Kafe/pastane atmosferi.",
    backgroundStyle: "warm-wood",
    backgroundPrompt: "Place the product on a warm-toned rustic wooden table surface. Soft natural daylight from a window. Cozy bakery atmosphere.",
    shadowType: "contact",
    shadowPrompt: "Natural contact shadow on the wood surface with subtle warm light reflection.",
    lightingDirection: "top-right",
    colorTemperature: "warm",
    isActive: true,
    order: 2,
  },
  {
    id: "minimal-marble",
    displayName: "Minimal Mermer",
    description: "Acik mermer yuzey, temiz ve modern estetik.",
    backgroundStyle: "minimal-marble",
    backgroundPrompt: "Place the product on a light white marble surface with subtle gray veining. Clean, minimal, modern aesthetic. Soft even lighting.",
    shadowType: "contact",
    shadowPrompt: "Gentle contact shadow on the marble, very subtle reflection on the polished surface.",
    lightingDirection: "front",
    colorTemperature: "neutral",
    isActive: true,
    order: 3,
  },
  {
    id: "dark-dramatic",
    displayName: "Koyu Dramatik",
    description: "Koyu slate/beton arka plan, guclu yonlu isik. Premium urunler icin.",
    backgroundStyle: "dark-slate",
    backgroundPrompt: "Place the product on a dark charcoal slate surface. Dramatic directional lighting from one side, deep shadows on the opposite. Moody, premium feel.",
    shadowType: "directional",
    shadowPrompt: "Strong directional shadow extending to one side, dramatic contrast between lit and shadow areas.",
    lightingDirection: "top-left",
    colorTemperature: "warm",
    isActive: true,
    order: 4,
  },
  {
    id: "pastel-soft",
    displayName: "Pastel Yumusak",
    description: "Yumusak pastel tonlu arka plan, Instagram icin optimum.",
    backgroundStyle: "pastel-soft",
    backgroundPrompt: "Place the product on a soft pastel-toned surface (light pink or cream). Dreamy, soft diffused lighting. Instagram-friendly aesthetic.",
    shadowType: "soft-drop",
    shadowPrompt: "Very soft, barely visible shadow. Light and airy feel.",
    lightingDirection: "front",
    colorTemperature: "warm",
    isActive: true,
    order: 5,
  },
];
```

- [ ] **Step 2: Build kontrol**

Run: `cd functions && npm run build`
Expected: Basarili.

---

### Task 3: Enhancement Service — Backend

**Files:**
- Create: `functions/src/services/enhancementService.ts`

- [ ] **Step 1: Service dosyasini olustur**

```typescript
/**
 * Enhancement Service
 * Preset CRUD + Job yonetimi + AI foto analizi
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
  // AI Foto Analizi (Faz 1.3 — Semantic Anchoring)
  // ==========================================

  /**
   * Gemini ile fotograf analizi yap
   * Urun tipini, yuzey ozelliklerini, isik kalitesini tespit et
   */
  buildAnalysisPrompt(presetIds: string[]): string {
    const presetList = presetIds.length > 0 ? presetIds.join(", ") : "studio-white, warm-wood, minimal-marble, dark-dramatic, pastel-soft";
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
      // JSON blogu cikar (markdown code fence varsa temizle)
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
      console.error("[EnhancementService] Analiz parse hatasi:", text);
      return null;
    }
  }
}
```

- [ ] **Step 2: Build kontrol**

Run: `cd functions && npm run build`
Expected: Basarili.

---

### Task 4: Enhancement Controller — Backend

**Files:**
- Create: `functions/src/controllers/orchestrator/enhancementController.ts`
- Modify: `functions/src/controllers/orchestrator/index.ts`

- [ ] **Step 1: Controller dosyasini olustur**

```typescript
/**
 * Enhancement Controller
 * Fotograf iyilestirme preset CRUD + job yonetimi + AI analiz endpoint'leri
 */

import { functions, getCors, REGION, errorResponse, successResponse, getConfig } from "./shared";
import { getSystemSettings } from "../../services/configService";
import { EnhancementService } from "../../services/enhancementService";

const enhancementService = new EnhancementService();

// ==========================================
// Preset Endpoints
// ==========================================

export const listEnhancementPresets = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 10, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const activeOnly = request.query.activeOnly === "true";
        const presets = await enhancementService.listPresets(activeOnly);
        successResponse(response, { presets, count: presets.length });
      } catch (error) {
        errorResponse(response, error, "listEnhancementPresets");
      }
    });
  });

export const createEnhancementPreset = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 10, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }
        const data = request.body;
        if (!data.id || !data.displayName) {
          response.status(400).json({ success: false, error: "id ve displayName zorunlu" });
          return;
        }
        const preset = await enhancementService.createPreset(data);
        successResponse(response, { preset }, 201);
      } catch (error) {
        errorResponse(response, error, "createEnhancementPreset");
      }
    });
  });

export const updateEnhancementPreset = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 10, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "PUT" && request.method !== "PATCH") {
          response.status(405).json({ success: false, error: "Use PUT or PATCH" });
          return;
        }
        const id = request.query.id as string;
        if (!id) {
          response.status(400).json({ success: false, error: "id query param zorunlu" });
          return;
        }
        await enhancementService.updatePreset(id, request.body);
        successResponse(response, { message: "Guncellendi" });
      } catch (error) {
        errorResponse(response, error, "updateEnhancementPreset");
      }
    });
  });

export const deleteEnhancementPreset = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 10, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "DELETE") {
          response.status(405).json({ success: false, error: "Use DELETE" });
          return;
        }
        const id = request.query.id as string;
        if (!id) {
          response.status(400).json({ success: false, error: "id query param zorunlu" });
          return;
        }
        await enhancementService.deletePreset(id);
        successResponse(response, { message: "Silindi" });
      } catch (error) {
        errorResponse(response, error, "deleteEnhancementPreset");
      }
    });
  });

export const seedEnhancementPresets = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 30, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }
        const result = await enhancementService.seedPresets();
        successResponse(response, result);
      } catch (error) {
        errorResponse(response, error, "seedEnhancementPresets");
      }
    });
  });

// ==========================================
// Job Endpoints
// ==========================================

export const listEnhancementJobs = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 10, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const limit = parseInt(request.query.limit as string) || 50;
        const jobs = await enhancementService.listJobs(limit);
        successResponse(response, { jobs, count: jobs.length });
      } catch (error) {
        errorResponse(response, error, "listEnhancementJobs");
      }
    });
  });

export const createEnhancementJob = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 10, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }
        const { originalImageUrl, originalStoragePath } = request.body;
        if (!originalImageUrl || !originalStoragePath) {
          response.status(400).json({ success: false, error: "originalImageUrl ve originalStoragePath zorunlu" });
          return;
        }
        const job = await enhancementService.createJob({ originalImageUrl, originalStoragePath });
        successResponse(response, { job }, 201);
      } catch (error) {
        errorResponse(response, error, "createEnhancementJob");
      }
    });
  });

export const getEnhancementJob = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 10, memory: "256MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const id = request.query.id as string;
        if (!id) {
          response.status(400).json({ success: false, error: "id query param zorunlu" });
          return;
        }
        const job = await enhancementService.getJob(id);
        if (!job) {
          response.status(404).json({ success: false, error: "Job bulunamadi" });
          return;
        }
        successResponse(response, { job });
      } catch (error) {
        errorResponse(response, error, "getEnhancementJob");
      }
    });
  });

/**
 * AI Foto Analizi endpoint
 * Gemini ile yuklenen fotoyu analiz et
 */
export const analyzePhoto = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 60, memory: "512MB", minInstances: 0 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const { jobId, imageBase64, mimeType } = request.body;
        if (!jobId || !imageBase64) {
          response.status(400).json({ success: false, error: "jobId ve imageBase64 zorunlu" });
          return;
        }

        // Base64 boyut kontrolu (~10MB limit)
        const base64SizeBytes = (imageBase64.length * 3) / 4;
        if (base64SizeBytes > 8 * 1024 * 1024) {
          response.status(400).json({ success: false, error: "Gorsel 8MB'dan buyuk olamaz" });
          return;
        }

        // Job'u analyzing durumuna gecir
        await enhancementService.updateJob(jobId, { status: "analyzing" });

        // Gemini model'ini system settings'ten oku (hardcoded YASAK)
        const config = await getConfig();
        const systemSettings = await getSystemSettings();
        const analysisModel = systemSettings?.analysisModel || "gemini-2.0-flash";

        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
        const model = genAI.getGenerativeModel({ model: analysisModel });

        // Aktif preset ID'lerini al (prompt'a dinamik olarak ekle)
        const activePresets = await enhancementService.listPresets(true);
        const presetIds = activePresets.map(p => p.id);

        const result = await model.generateContent([
          {
            inlineData: {
              mimeType: mimeType || "image/jpeg",
              data: imageBase64,
            },
          },
          { text: enhancementService.buildAnalysisPrompt(presetIds) },
        ]);

        const text = result.response.text();
        const analysis = enhancementService.parseAnalysisResult(text);

        if (!analysis) {
          await enhancementService.updateJob(jobId, {
            status: "failed",
            error: "AI analiz sonucu parse edilemedi",
          });
          response.status(500).json({ success: false, error: "Analiz basarisiz" });
          return;
        }

        // Job'u guncelle
        await enhancementService.updateJob(jobId, {
          status: "pending",
          analysis,
        });

        successResponse(response, { analysis });
      } catch (error) {
        errorResponse(response, error, "analyzePhoto");
      }
    });
  });
```

- [ ] **Step 2: Export'lari index.ts'e ekle**

`functions/src/controllers/orchestrator/index.ts` dosyasinin sonuna ekle:

```typescript
// Enhancement Controller
export {
  listEnhancementPresets,
  createEnhancementPreset,
  updateEnhancementPreset,
  deleteEnhancementPreset,
  seedEnhancementPresets,
  listEnhancementJobs,
  createEnhancementJob,
  getEnhancementJob,
  analyzePhoto,
} from "./enhancementController";
```

- [ ] **Step 3: Build kontrol**

Run: `cd functions && npm run build`
Expected: Basarili. Tum endpoint'ler export edilmis.

---

### Task 5: Frontend API Metodlari

**Files:**
- Modify: `admin/src/services/api.ts`
- Modify: `admin/src/types/index.ts`

- [ ] **Step 1: Type import'lari guncelle**

`admin/src/types/index.ts` dosyasinda EnhancementPreset, EnhancementJob, PhotoAnalysis tiplerini tanimla veya export et (Task 1'de eklenmis olmali).

- [ ] **Step 2: API metodlarini ekle**

`admin/src/services/api.ts` dosyasina ApiService class'inin icine ekle:

```typescript
  // ==========================================
  // Enhancement Preset API
  // ==========================================

  async getEnhancementPresets(activeOnly = false): Promise<EnhancementPreset[]> {
    const params = activeOnly ? "?activeOnly=true" : "";
    const res = await this.fetch<{ presets: EnhancementPreset[] }>(`listEnhancementPresets${params}`);
    return res.presets;
  }

  async createEnhancementPreset(data: Partial<EnhancementPreset>): Promise<EnhancementPreset> {
    const res = await this.fetch<{ preset: EnhancementPreset }>("createEnhancementPreset", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.preset;
  }

  async updateEnhancementPreset(id: string, data: Partial<EnhancementPreset>): Promise<void> {
    await this.fetch(`updateEnhancementPreset?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteEnhancementPreset(id: string): Promise<void> {
    await this.fetch(`deleteEnhancementPreset?id=${id}`, { method: "DELETE" });
  }

  async seedEnhancementPresets(): Promise<{ added: number; skipped: number }> {
    const res = await this.fetch<{ added: number; skipped: number }>("seedEnhancementPresets", {
      method: "POST",
    });
    return res;
  }

  // ==========================================
  // Enhancement Job API
  // ==========================================

  async getEnhancementJobs(limit = 50): Promise<EnhancementJob[]> {
    const res = await this.fetch<{ jobs: EnhancementJob[] }>(`listEnhancementJobs?limit=${limit}`);
    return res.jobs;
  }

  async createEnhancementJob(data: { originalImageUrl: string; originalStoragePath: string }): Promise<EnhancementJob> {
    const res = await this.fetch<{ job: EnhancementJob }>("createEnhancementJob", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.job;
  }

  async getEnhancementJob(id: string): Promise<EnhancementJob> {
    const res = await this.fetch<{ job: EnhancementJob }>(`getEnhancementJob?id=${id}`);
    return res.job;
  }

  async analyzePhoto(jobId: string, imageBase64: string, mimeType: string): Promise<PhotoAnalysis> {
    const res = await this.fetch<{ analysis: PhotoAnalysis }>("analyzePhoto", {
      method: "POST",
      body: JSON.stringify({ jobId, imageBase64, mimeType }),
    });
    return res.analysis;
  }
```

- [ ] **Step 3: Build kontrol**

Run: `cd admin && npm run build`
Expected: Basarili.

---

### Task 6: Admin Panel — Enhance Sayfasi

**Files:**
- Create: `admin/src/pages/Enhance.tsx`

- [ ] **Step 1: Sayfa componentini olustur**

Onemli: Bu dosya ana sayfadir. Icerik:
1. Foto yukleme alani (drag & drop)
2. Yuklenen fotonun onizlemesi
3. "Analiz Et" butonu — Gemini ile analiz
4. Analiz sonucu gosterimi (urun tipi, kalite skoru, onerilen preset)
5. Preset secim kartlari (Firestore'dan)
6. "Iyilestir" butonu (Faz 2'de aktif olacak, simdilik disabled)

Yaklaşık 350-380 satır olacak (400 sinirinin altinda).

Sayfa yapisi:
- Sol panel: Foto yukleme + onizleme + analiz sonucu
- Sag panel: Preset kartlari listesi

UI dili: Turkce. Tailwind + amber/slate renk paleti (projedeki mevcut tema).

NOT: Detayli JSX kodunu burada yazmiyorum cunku 400+ satirlik plan dosyasi olur. Uygulama sirasinda mevcut sayfalarin (Ideas.tsx, Styles.tsx) pattern'lerini takip et:
- useState ile state yonetimi
- useEffect ile ilk yukleme
- Loading/error/content conditional render
- Modal pattern (gerekirse)

Temel state'ler:
```typescript
const [presets, setPresets] = useState<EnhancementPreset[]>([]);
const [jobs, setJobs] = useState<EnhancementJob[]>([]);
const [loading, setLoading] = useState(true);
const [uploading, setUploading] = useState(false);
const [analyzing, setAnalyzing] = useState(false);
const [currentJob, setCurrentJob] = useState<EnhancementJob | null>(null);
const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
```

Foto yukleme icin mevcut AssetUpload.tsx componentini KULLANMA — bu component Cloudinary'e ozel. Dogrudan Firebase Storage upload yap (ref pattern'i Assets sayfasinda var).

- [ ] **Step 2: Build kontrol**

Run: `cd admin && npm run build`
Expected: Basarili.

---

### Task 7: Route + Sidebar Entegrasyonu

**Files:**
- Modify: `admin/src/App.tsx`
- Modify: `admin/src/components/Sidebar.tsx`

- [ ] **Step 1: Route ekle**

`admin/src/App.tsx` dosyasinda:

Lazy import ekle (diger import'larin yanina):
```typescript
const Enhance = lazy(() => import("./pages/Enhance"));
```

Route ekle (orchestrator route'unun altina):
```typescript
<Route path="enhance" element={<Suspense fallback={<PageLoader />}><Enhance /></Suspense>} />
```

- [ ] **Step 2: Sidebar menu item ekle**

`admin/src/components/Sidebar.tsx` dosyasinda "URETIM ARACLARI" grubuna yeni item ekle:

```typescript
{
  path: "/admin/enhance",
  label: "Fotograf Iyilestir",
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
},
```

Sparkle/star ikonu — enhancement/iyilestirme icin uygun.

- [ ] **Step 3: Full build kontrol**

Run: `cd admin && npm run build && cd ../functions && npm run build`
Expected: Her iki build de basarili.

---

### Task 8: Seed Calistir + Smoke Test

- [ ] **Step 1: Deploy (sadece yeni fonksiyonlar)**

```bash
cd functions && npm run build && firebase deploy --only functions:listEnhancementPresets,functions:createEnhancementPreset,functions:updateEnhancementPreset,functions:deleteEnhancementPreset,functions:seedEnhancementPresets,functions:listEnhancementJobs,functions:createEnhancementJob,functions:getEnhancementJob,functions:analyzePhoto
```

NOT: Cok fazla fonksiyon varsa FUNCTIONS_DISCOVERY_TIMEOUT gerekli olabilir:
```bash
FUNCTIONS_DISCOVERY_TIMEOUT=120 firebase deploy --only functions
```

- [ ] **Step 2: Seed endpoint'i calistir**

```bash
curl -X POST https://europe-west1-instagram-automation-ad77b.cloudfunctions.net/seedEnhancementPresets
```

Expected: `{ "success": true, "added": 5, "skipped": 0 }`

- [ ] **Step 3: List endpoint'i test et**

```bash
curl https://europe-west1-instagram-automation-ad77b.cloudfunctions.net/listEnhancementPresets
```

Expected: 5 preset donmeli.

- [ ] **Step 4: Admin Panel'de sayfa kontrol**

Admin Panel'i ac, sidebar'da "Fotograf Iyilestir" gorunmeli, sayfa yuklenmeli, preset'ler listelenmeli.

---

## Faz 1 Tamamlanma Kriterleri

- [ ] 5 varsayilan preset Firestore'da
- [ ] Admin Panel'de sayfa gorunuyor
- [ ] Foto yuklenebiliyor (Firebase Storage)
- [ ] "Analiz Et" butonu Gemini ile foto analizi yapiyor
- [ ] Analiz sonucu ekranda gosteriliyor (urun tipi, skor, onerilen preset)
- [ ] Preset kartlari secilip highlight ediliyor
- [ ] "Iyilestir" butonu gorunuyor ama disabled (Faz 2 icin)
- [ ] Her iki build basarili (`functions` + `admin`)

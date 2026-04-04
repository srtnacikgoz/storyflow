# Stil Stüdyosu (Style Studio) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standart görsel arkaplan, ışık, ambians ve stil oluşturmak için yeni bir admin sayfası. Referans görsel analizi ile tutarlı ürün fotoğrafları üretecek prompt'lar oluşturur.

**Architecture:** Firestore-driven config (`global/config/visual-standards/items/*`), backend controller (`styleStudioController.ts`), React frontend sayfası modüler alt bileşenlerle. Poster sayfasındaki analiz pattern'i temel alınır, daha kompakt ve minimal bir UI ile.

**Tech Stack:** Firebase Functions (TypeScript), React 19, Tailwind CSS 3, Gemini/Anthropic/OpenRouter vision API

---

## File Structure

### Backend (functions/)
| Action | File | Responsibility |
|--------|------|----------------|
| Create | `functions/src/controllers/orchestrator/styleStudioController.ts` | CRUD + analiz + prompt üretimi + seed |
| Modify | `functions/src/controllers/orchestrator/index.ts` | Export hub'a yeni controller ekleme |
| Modify | `functions/src/controllers/orchestratorController.ts` | Re-export hub'a ekleme |

### Frontend (admin/)
| Action | File | Responsibility |
|--------|------|----------------|
| Create | `admin/src/pages/StyleStudio.tsx` | Ana sayfa — standard listesi + yeni standard oluşturma |
| Create | `admin/src/components/style-studio/StyleAnalyzer.tsx` | Görsel analizi modal bileşeni |
| Create | `admin/src/components/style-studio/StandardPromptGenerator.tsx` | Prompt üretim bileşeni |
| Modify | `admin/src/App.tsx` | Route ekleme |
| Modify | `admin/src/components/Sidebar.tsx` | Navigasyon öğesi ekleme |
| Modify | `admin/src/services/api.ts` | API metotları ekleme |
| Modify | `admin/src/types/index.ts` | Type tanımları ekleme |

---

## Task 1: Type Tanımları

**Files:**
- Modify: `admin/src/types/index.ts`

- [ ] **Step 1: VisualStandard type'larını ekle**

`admin/src/types/index.ts` dosyasının sonuna ekle:

```typescript
// ── Visual Standard (Stil Stüdyosu) ──────────────────────────
export interface VisualStandardBackground {
  type: string;       // "marble" | "wood" | "concrete" | "fabric" | "solid" | "gradient"
  color: string;      // dominant hex
  description: string;
}

export interface VisualStandardLighting {
  direction: string;    // "overhead" | "side-left" | "side-right" | "backlit" | "front"
  quality: string;      // "soft-diffused" | "hard-directional" | "natural"
  temperature: string;  // "warm" | "neutral" | "cool"
  description: string;
}

export interface VisualStandardSurface {
  material: string;   // "marble" | "wood" | "concrete" | "linen" | "ceramic" | "slate"
  texture: string;    // "smooth" | "rough" | "glossy" | "matte"
  description: string;
}

export interface VisualStandardAmbiance {
  mood: string;       // "minimal" | "cozy" | "luxurious" | "rustic" | "modern" | "editorial"
  adjectives: string[];
  description: string;
}

export interface VisualStandard {
  id: string;
  name: string;
  description: string;
  thumbnail: string;          // base64 data URI of reference image
  background: VisualStandardBackground;
  lighting: VisualStandardLighting;
  colorPalette: string[];     // 3-5 hex colors
  surface: VisualStandardSurface;
  ambiance: VisualStandardAmbiance;
  cameraAngle: string;        // "flat-lay" | "45-degree" | "hero-shot" | "close-up"
  promptTemplate: string;     // AI-generated base prompt template
  isActive: boolean;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface VisualStyleAnalysisResult {
  background: VisualStandardBackground;
  lighting: VisualStandardLighting;
  colorPalette: string[];
  surface: VisualStandardSurface;
  ambiance: VisualStandardAmbiance;
  cameraAngle: string;
  overallDescription: string;
  promptTemplate: string;
}
```

- [ ] **Step 2: Build kontrolü**

Run: `cd admin && npx tsc --noEmit 2>&1 | head -20`
Expected: Yeni type'lar compile hatası vermemeli

- [ ] **Step 3: Commit**

```bash
git add admin/src/types/index.ts
git commit -m "feat(style-studio): VisualStandard type tanımları"
```

---

## Task 2: Backend Controller — styleStudioController.ts

**Files:**
- Create: `functions/src/controllers/orchestrator/styleStudioController.ts`

- [ ] **Step 1: Controller dosyasını oluştur**

```typescript
/**
 * Style Studio Controller
 * Görsel standart CRUD, görsel analizi, prompt üretimi, seed
 */

import { createHttpFunction, db } from "./shared";
import { getSystemSettings } from "../../services/configService";
import { clearConfigCache } from "../../services/config/configCache";

const STANDARDS_PATH = "global/config/visual-standards/items";

/**
 * Standartları listele
 * GET /listVisualStandards
 */
export const listVisualStandards = createHttpFunction(async (req, res) => {
  const snapshot = await db.collection(STANDARDS_PATH)
    .orderBy("createdAt", "desc")
    .get();

  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json({ success: true, data: items, count: items.length });
});

/**
 * Standart oluştur
 * POST /createVisualStandard
 */
export const createVisualStandard = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const data = req.body;
  if (!data.name) {
    res.status(400).json({ success: false, error: "name gerekli" });
    return;
  }

  const id = data.id || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

  await db.collection(STANDARDS_PATH).doc(id).set({
    ...data,
    id,
    isActive: data.isActive ?? true,
    isDefault: data.isDefault ?? false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  clearConfigCache();

  res.json({ success: true, data: { id }, message: "Standart oluşturuldu" });
});

/**
 * Standart güncelle
 * POST /updateVisualStandard
 */
export const updateVisualStandard = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { id, ...updates } = req.body;
  if (!id) {
    res.status(400).json({ success: false, error: "id gerekli" });
    return;
  }

  await db.collection(STANDARDS_PATH).doc(id).update({
    ...updates,
    updatedAt: Date.now(),
  });
  clearConfigCache();

  res.json({ success: true, message: "Standart güncellendi" });
});

/**
 * Standart sil
 * POST /deleteVisualStandard
 */
export const deleteVisualStandard = createHttpFunction(async (req, res) => {
  const id = req.body?.id || req.query.id;
  if (!id) {
    res.status(400).json({ success: false, error: "id gerekli" });
    return;
  }

  await db.collection(STANDARDS_PATH).doc(id as string).delete();
  clearConfigCache();

  res.json({ success: true, message: "Standart silindi" });
});

/**
 * Görsel analizi — referans görsel yükle, stil özelliklerini çıkar
 * POST /analyzeVisualStyle
 * Body: { imageBase64, imageMimeType? }
 */
export const analyzeVisualStyle = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { imageBase64, imageMimeType } = req.body;
  if (!imageBase64) {
    res.status(400).json({ success: false, error: "imageBase64 gerekli" });
    return;
  }

  const systemSettings = await getSystemSettings();
  const anthropicApiKey = systemSettings?.anthropicApiKey;
  const openRouterApiKey = (systemSettings as any)?.openRouterApiKey;
  const analysisModel = (systemSettings as any)?.posterAnalysisModel || "claude-haiku-4-5-20251001";

  const isAnthropicModel = !analysisModel.includes("/");
  if (isAnthropicModel && !anthropicApiKey) {
    res.status(400).json({ success: false, error: "Anthropic API key tanımlı değil (Ayarlar > API Ayarları)" });
    return;
  }
  if (!isAnthropicModel && !openRouterApiKey) {
    res.status(400).json({ success: false, error: "OpenRouter API key tanımlı değil (Ayarlar > API Ayarları)" });
    return;
  }

  const systemPrompt = `You are a professional food photography art director. Analyze the reference image and extract precise visual style characteristics for recreating this exact look consistently across product photos.

Return ONLY valid JSON:
{
  "background": {
    "type": "marble|wood|concrete|fabric|solid|gradient|slate|ceramic",
    "color": "#hex of dominant background color",
    "description": "precise description: color tone, texture, pattern, any gradients or variations"
  },
  "lighting": {
    "direction": "overhead|side-left|side-right|backlit|front",
    "quality": "soft-diffused|hard-directional|natural",
    "temperature": "warm|neutral|cool",
    "description": "lighting setup details: direction, softness, shadow character, color temperature (Kelvin estimate)"
  },
  "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "surface": {
    "material": "marble|wood|concrete|linen|ceramic|slate|metal",
    "texture": "smooth|rough|glossy|matte",
    "description": "surface material, finish, and texture details"
  },
  "ambiance": {
    "mood": "minimal|cozy|luxurious|rustic|modern|editorial",
    "adjectives": ["adj1", "adj2", "adj3"],
    "description": "overall visual atmosphere and feeling"
  },
  "cameraAngle": "flat-lay|45-degree|hero-shot|close-up",
  "overallDescription": "2-3 sentences summarizing the complete visual style",
  "promptTemplate": "A reusable prompt template (in English) describing this exact visual style for generating consistent product photos. Use specific technical terms: lens, aperture, lighting setup, surface material, color temperature. Leave [PRODUCT] as placeholder for the product to be photographed."
}`;

  const userText = "Analyze this reference image. Extract the complete visual style characteristics for consistent product photography reproduction. Return JSON only.";

  let responseText: string;

  if (isAnthropicModel) {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    const result = await anthropic.messages.create({
      model: analysisModel,
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: (imageMimeType || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: imageBase64,
            },
          },
          { type: "text", text: userText },
        ],
      }],
    });
    responseText = result.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map(b => b.text).join("").trim();
  } else {
    const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://instagram-automation-ad77b.web.app",
      },
      body: JSON.stringify({
        model: analysisModel,
        max_tokens: 1200,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${imageMimeType || "image/jpeg"};base64,${imageBase64}` },
              },
              { type: "text", text: userText },
            ],
          },
        ],
      }),
    });
    const orData = await orResponse.json() as any;
    if (!orResponse.ok) throw new Error(orData?.error?.message || "OpenRouter hatası");
    responseText = (orData.choices?.[0]?.message?.content || "").trim();
  }

  let analysis;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Parse failed", raw: responseText };
  } catch {
    analysis = { error: "Parse failed", raw: responseText };
  }

  res.json({ success: true, data: analysis });
}, { timeoutSeconds: 60, memory: "512MiB" });

/**
 * Standart bazlı prompt üret
 * POST /generateStandardPrompt
 * Body: { standardId, productName, productDescription?, targetModel? }
 */
export const generateStandardPrompt = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { standardId, productName, productDescription, targetModel } = req.body;
  if (!standardId || !productName) {
    res.status(400).json({ success: false, error: "standardId ve productName gerekli" });
    return;
  }

  // Standart verisini al
  const doc = await db.collection(STANDARDS_PATH).doc(standardId).get();
  if (!doc.exists) {
    res.status(404).json({ success: false, error: "Standart bulunamadı" });
    return;
  }

  const standard = doc.data()!;
  const model = targetModel || "gemini";

  // promptTemplate içindeki [PRODUCT] placeholder'ını değiştir
  let prompt = (standard.promptTemplate || "").replace(/\[PRODUCT\]/g, productName);

  // Ürün açıklaması varsa ekle
  if (productDescription) {
    prompt += `\n\nProduct details: ${productDescription}`;
  }

  // Hedef model formatına göre düzenle
  const modelInstructions: Record<string, string> = {
    gemini: "Write as a single flowing narrative paragraph with technical photography terms (lens, aperture, color temperature).",
    "dall-e": "Write as structured description. Wrap literal text in quotes. Include style, medium, technical details.",
    midjourney: "Write as comma-separated tags with Midjourney parameters (--ar, --s, --q).",
    flux: "Write in natural language focusing on style, atmosphere, and visual qualities.",
  };

  // Eğer ek format dönüşümü isteniyorsa AI ile yeniden formatla
  const systemSettings = await getSystemSettings();
  const anthropicApiKey = systemSettings?.anthropicApiKey;
  const openRouterApiKey = (systemSettings as any)?.openRouterApiKey;
  const analysisModel = (systemSettings as any)?.posterAnalysisModel || "claude-haiku-4-5-20251001";
  const isAnthropicModel = !analysisModel.includes("/");

  const hasApiKey = isAnthropicModel ? !!anthropicApiKey : !!openRouterApiKey;

  if (hasApiKey && model !== "raw") {
    const formatPrompt = `You are a prompt engineer for AI image generation.

Given this base prompt describing a visual style:
---
${prompt}
---

Rewrite it optimized for ${model} image generation.
${modelInstructions[model] || modelInstructions.gemini}

The product is: ${productName}${productDescription ? ` — ${productDescription}` : ""}

Visual standard details:
- Background: ${standard.background?.description || "not specified"}
- Lighting: ${standard.lighting?.description || "not specified"}
- Surface: ${standard.surface?.description || "not specified"}
- Ambiance: ${standard.ambiance?.description || "not specified"}
- Camera: ${standard.cameraAngle || "not specified"}
- Colors: ${(standard.colorPalette || []).join(", ")}

Return ONLY the final prompt text, no JSON, no explanation.`;

    let formattedPrompt: string;

    if (isAnthropicModel) {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const anthropic = new Anthropic({ apiKey: anthropicApiKey });
      const result = await anthropic.messages.create({
        model: analysisModel,
        max_tokens: 800,
        messages: [{ role: "user", content: formatPrompt }],
      });
      formattedPrompt = result.content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map(b => b.text).join("").trim();
    } else {
      const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://instagram-automation-ad77b.web.app",
        },
        body: JSON.stringify({
          model: analysisModel,
          max_tokens: 800,
          messages: [{ role: "user", content: formatPrompt }],
        }),
      });
      const orData = await orResponse.json() as any;
      if (!orResponse.ok) throw new Error(orData?.error?.message || "OpenRouter hatası");
      formattedPrompt = (orData.choices?.[0]?.message?.content || "").trim();
    }

    res.json({
      success: true,
      data: {
        prompt: formattedPrompt,
        basePrompt: prompt,
        targetModel: model,
        standardName: standard.name,
      },
    });
    return;
  }

  // API key yoksa raw prompt döndür
  res.json({
    success: true,
    data: {
      prompt,
      basePrompt: prompt,
      targetModel: "raw",
      standardName: standard.name,
    },
  });
}, { timeoutSeconds: 60, memory: "512MiB" });

/**
 * Varsayılan standartları seed et
 * POST /seedVisualStandards
 */
export const seedVisualStandards = createHttpFunction(async (req, res) => {
  const defaults = [
    {
      id: "minimal-white",
      name: "Minimal White",
      description: "Sade beyaz arkaplan, yumuşak gölgeler, temiz ve modern",
      thumbnail: "",
      background: { type: "solid", color: "#FFFFFF", description: "Pure white background with subtle shadow" },
      lighting: { direction: "overhead", quality: "soft-diffused", temperature: "neutral", description: "Soft overhead diffused light, minimal shadows, 5000K neutral" },
      colorPalette: ["#FFFFFF", "#F5F5F5", "#E0E0E0", "#333333"],
      surface: { material: "ceramic", texture: "smooth", description: "White ceramic or acrylic smooth surface" },
      ambiance: { mood: "minimal", adjectives: ["clean", "modern", "airy"], description: "Clean minimal aesthetic with generous white space" },
      cameraAngle: "45-degree",
      promptTemplate: "Professional food photography of [PRODUCT] on a clean white ceramic surface. Soft overhead diffused lighting at 5000K neutral color temperature. Minimal styling with generous white space. Shot at 45-degree angle with 85mm lens, f/4 aperture. Clean, modern, airy atmosphere with subtle shadows.",
      isActive: true,
      isDefault: true,
    },
    {
      id: "dark-moody",
      name: "Dark & Moody",
      description: "Koyu arkaplan, dramatik yan ışık, lüks ve sofistike",
      thumbnail: "",
      background: { type: "slate", color: "#1A1A2E", description: "Dark slate/charcoal textured background" },
      lighting: { direction: "side-left", quality: "hard-directional", temperature: "warm", description: "Dramatic side light from left, warm 3200K, strong shadows for depth" },
      colorPalette: ["#1A1A2E", "#16213E", "#D4A945", "#F5EDE0", "#8B4513"],
      surface: { material: "slate", texture: "rough", description: "Dark slate surface with natural texture variations" },
      ambiance: { mood: "luxurious", adjectives: ["dramatic", "sophisticated", "rich"], description: "Moody, luxurious atmosphere with dramatic chiaroscuro lighting" },
      cameraAngle: "hero-shot",
      promptTemplate: "Dramatic food photography of [PRODUCT] on a dark slate textured surface. Strong directional side light from left at 3200K warm temperature creating deep shadows and highlights. Dark charcoal background. Rich, moody atmosphere. Shot at eye level (hero shot) with 100mm macro lens, f/2.8 aperture. Luxurious, sophisticated, dramatic styling.",
      isActive: true,
      isDefault: false,
    },
    {
      id: "rustic-wood",
      name: "Rustic Wood",
      description: "Ahşap yüzey, doğal ışık, sıcak ve samimi",
      thumbnail: "",
      background: { type: "wood", color: "#8B6914", description: "Warm-toned natural wood grain surface" },
      lighting: { direction: "side-right", quality: "natural", temperature: "warm", description: "Natural window light from right, warm golden hour quality, 3800K" },
      colorPalette: ["#8B6914", "#DEB887", "#F5EDE0", "#654321", "#2F1810"],
      surface: { material: "wood", texture: "rough", description: "Natural oak or walnut wood with visible grain" },
      ambiance: { mood: "cozy", adjectives: ["warm", "inviting", "artisanal"], description: "Cozy artisanal atmosphere with warm natural tones" },
      cameraAngle: "flat-lay",
      promptTemplate: "Artisanal food photography of [PRODUCT] on a natural wood surface with visible grain texture. Warm natural window light from the right side at 3800K golden hour quality. Rustic wooden background. Shot from directly above (flat lay) with 50mm lens, f/5.6 aperture. Warm, inviting, artisanal atmosphere with natural earth tones.",
      isActive: true,
      isDefault: false,
    },
    {
      id: "marble-elegance",
      name: "Marble Elegance",
      description: "Mermer yüzey, premium hissiyat, zarif ve şık",
      thumbnail: "",
      background: { type: "marble", color: "#F0EDE8", description: "White Carrara marble with grey veining" },
      lighting: { direction: "front", quality: "soft-diffused", temperature: "cool", description: "Soft frontal fill light, cool 5500K, even illumination with subtle dimension" },
      colorPalette: ["#F0EDE8", "#C0B8A8", "#8C8278", "#D4A945", "#1A1A2E"],
      surface: { material: "marble", texture: "glossy", description: "Polished white Carrara marble with subtle grey veining" },
      ambiance: { mood: "editorial", adjectives: ["elegant", "refined", "premium"], description: "Premium editorial aesthetic with refined elegance" },
      cameraAngle: "45-degree",
      promptTemplate: "Premium editorial food photography of [PRODUCT] on polished white Carrara marble surface with subtle grey veining. Soft frontal fill light at 5500K cool temperature, even illumination. Elegant marble background. Shot at 45-degree angle with 90mm tilt-shift lens, f/4 aperture. Refined, premium, editorial styling with subtle color accents.",
      isActive: true,
      isDefault: false,
    },
  ];

  const batch = db.batch();
  for (const item of defaults) {
    const ref = db.collection(STANDARDS_PATH).doc(item.id);
    batch.set(ref, { ...item, createdAt: Date.now(), updatedAt: Date.now() }, { merge: true });
  }
  await batch.commit();
  clearConfigCache();

  res.json({ success: true, message: `${defaults.length} varsayılan standart seed edildi` });
});
```

- [ ] **Step 2: Build kontrolü**

Run: `cd functions && npx tsc --noEmit 2>&1 | head -20`
Expected: Hata olmamalı

- [ ] **Step 3: Commit**

```bash
git add functions/src/controllers/orchestrator/styleStudioController.ts
git commit -m "feat(style-studio): backend controller — CRUD, analiz, prompt üretimi, seed"
```

---

## Task 3: Backend Export Hub'larına Ekleme

**Files:**
- Modify: `functions/src/controllers/orchestrator/index.ts`
- Modify: `functions/src/controllers/orchestratorController.ts`

- [ ] **Step 1: orchestrator/index.ts'e export ekle**

`functions/src/controllers/orchestrator/index.ts` dosyasının sonuna ekle:

```typescript
// Style Studio Controller (Stil Stüdyosu)
export {
  listVisualStandards,
  createVisualStandard,
  updateVisualStandard,
  deleteVisualStandard,
  analyzeVisualStyle,
  generateStandardPrompt,
  seedVisualStandards,
} from "./styleStudioController";
```

- [ ] **Step 2: orchestratorController.ts'e export ekle**

`functions/src/controllers/orchestratorController.ts` dosyasındaki re-export bloğuna ekle:

```typescript
  // Style Studio Controller
  listVisualStandards,
  createVisualStandard,
  updateVisualStandard,
  deleteVisualStandard,
  analyzeVisualStyle,
  generateStandardPrompt,
  seedVisualStandards,
```

- [ ] **Step 3: Build kontrolü**

Run: `cd functions && npx tsc --noEmit 2>&1 | head -20`
Expected: Hata olmamalı

- [ ] **Step 4: Commit**

```bash
git add functions/src/controllers/orchestrator/index.ts functions/src/controllers/orchestratorController.ts
git commit -m "feat(style-studio): export hub'larına controller eklendi"
```

---

## Task 4: API Service Metotları

**Files:**
- Modify: `admin/src/services/api.ts`

- [ ] **Step 1: API metotlarını ekle**

`admin/src/services/api.ts` dosyasının `ApiService` class'ının sonuna (kapanış süslü parantezinden önce) ekle:

```typescript
  // ── Visual Standards (Stil Stüdyosu) ────────────────────────

  async listVisualStandards(): Promise<any[]> {
    const data = await this.fetchApi("/listVisualStandards");
    return data.data || [];
  }

  async createVisualStandard(standard: Record<string, any>): Promise<{ id: string }> {
    return this.fetchApi("/createVisualStandard", {
      method: "POST",
      body: JSON.stringify(standard),
    });
  }

  async updateVisualStandard(id: string, updates: Record<string, any>): Promise<void> {
    await this.fetchApi("/updateVisualStandard", {
      method: "POST",
      body: JSON.stringify({ id, ...updates }),
    });
  }

  async deleteVisualStandard(id: string): Promise<void> {
    await this.fetchApi("/deleteVisualStandard", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  }

  async analyzeVisualStyle(imageBase64: string, imageMimeType?: string): Promise<any> {
    const data = await this.fetchApi("/analyzeVisualStyle", {
      method: "POST",
      body: JSON.stringify({ imageBase64, imageMimeType }),
    });
    return data.data;
  }

  async generateStandardPrompt(params: {
    standardId: string;
    productName: string;
    productDescription?: string;
    targetModel?: string;
  }): Promise<{ prompt: string; basePrompt: string; targetModel: string; standardName: string }> {
    const data = await this.fetchApi("/generateStandardPrompt", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return data.data;
  }

  async seedVisualStandards(): Promise<any> {
    return this.fetchApi("/seedVisualStandards", { method: "POST" });
  }
```

- [ ] **Step 2: Build kontrolü**

Run: `cd admin && npx tsc --noEmit 2>&1 | head -20`
Expected: Hata olmamalı

- [ ] **Step 3: Commit**

```bash
git add admin/src/services/api.ts
git commit -m "feat(style-studio): API service metotları eklendi"
```

---

## Task 5: StyleAnalyzer Bileşeni

**Files:**
- Create: `admin/src/components/style-studio/StyleAnalyzer.tsx`

- [ ] **Step 1: StyleAnalyzer bileşenini oluştur**

```tsx
import { useState } from "react";
import { api } from "../../services/api";
import type { VisualStyleAnalysisResult } from "../../types";

interface StyleAnalyzerProps {
  onAnalysisComplete: (result: VisualStyleAnalysisResult, imagePreview: string) => void;
}

export default function StyleAnalyzer({ onAnalysisComplete }: StyleAnalyzerProps) {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageMimeType(file.type);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64((reader.result as string).split(",")[1]);
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64 || !imagePreview) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await api.analyzeVisualStyle(imageBase64, imageMimeType);
      if (result.error) {
        setError(result.error);
        return;
      }
      onAnalysisComplete(result as VisualStyleAnalysisResult, imagePreview);
    } catch (err: any) {
      setError(err.message || "Analiz başarısız");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImageBase64(null);
    setImagePreview(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {!imagePreview ? (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-brand-blue/60 hover:bg-brand-blue/5 transition-all group">
          <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-brand-blue/10 flex items-center justify-center mb-3 transition-colors">
            <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">Referans görsel yükle</p>
          <p className="text-xs text-gray-400 mt-1">Beğendiğin bir ürün fotoğrafını yükle</p>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
      ) : (
        <div className="flex gap-4 items-start">
          <div className="relative group">
            <img src={imagePreview} alt="Referans" className="w-28 h-28 object-cover rounded-xl border border-gray-200" />
            <button
              onClick={handleReset}
              className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-300 transition shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm text-gray-600">Görsel yüklendi. Stili analiz etmek için butona bas.</p>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {analyzing ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analiz ediliyor...
                </span>
              ) : "Stili Analiz Et"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build kontrolü**

Run: `cd admin && npx tsc --noEmit 2>&1 | head -20`
Expected: Hata olmamalı

- [ ] **Step 3: Commit**

```bash
git add admin/src/components/style-studio/StyleAnalyzer.tsx
git commit -m "feat(style-studio): StyleAnalyzer bileşeni — görsel yükleme ve analiz"
```

---

## Task 6: StandardPromptGenerator Bileşeni

**Files:**
- Create: `admin/src/components/style-studio/StandardPromptGenerator.tsx`

- [ ] **Step 1: Prompt üretici bileşenini oluştur**

```tsx
import { useState } from "react";
import { api } from "../../services/api";

interface StandardPromptGeneratorProps {
  standardId: string;
  standardName: string;
  onClose: () => void;
}

const TARGET_MODELS = [
  { id: "gemini", label: "Gemini", desc: "Narrative paragraph" },
  { id: "dall-e", label: "DALL-E / GPT", desc: "Structured description" },
  { id: "midjourney", label: "Midjourney", desc: "Tag-based" },
  { id: "flux", label: "Flux", desc: "Natural language" },
];

export default function StandardPromptGenerator({ standardId, standardName, onClose }: StandardPromptGeneratorProps) {
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [targetModel, setTargetModel] = useState("gemini");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ prompt: string; basePrompt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!productName.trim()) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.generateStandardPrompt({
        standardId,
        productName: productName.trim(),
        productDescription: productDescription.trim() || undefined,
        targetModel,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Prompt üretimi başarısız");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.prompt) return;
    await navigator.clipboard.writeText(result.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">Prompt Oluştur</h3>
            <p className="text-xs text-gray-500 mt-0.5">Standart: {standardName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Ürün adı */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı *</label>
            <input
              type="text"
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="ör. Çikolatalı Ekler"
              className="input"
            />
          </div>

          {/* Ürün açıklaması */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Açıklaması</label>
            <textarea
              value={productDescription}
              onChange={e => setProductDescription(e.target.value)}
              placeholder="ör. Belçika çikolatası kaplamalı, vanilya kremalı..."
              rows={2}
              className="input resize-none"
            />
          </div>

          {/* Hedef model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hedef Model</label>
            <div className="grid grid-cols-4 gap-2">
              {TARGET_MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setTargetModel(m.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
                    targetModel === m.id
                      ? "border-brand-blue bg-brand-blue/10 text-gray-900"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Üret butonu */}
          <button
            onClick={handleGenerate}
            disabled={generating || !productName.trim()}
            className="btn-primary w-full disabled:opacity-50"
          >
            {generating ? "Üretiliyor..." : "Prompt Oluştur"}
          </button>

          {/* Hata */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Sonuç */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Oluşturulan Prompt</span>
                <button
                  onClick={handleCopy}
                  className="text-xs font-medium text-brand-blue hover:text-brand-blue/80 transition"
                >
                  {copied ? "Kopyalandı!" : "Kopyala"}
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{result.prompt}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build kontrolü**

Run: `cd admin && npx tsc --noEmit 2>&1 | head -20`
Expected: Hata olmamalı

- [ ] **Step 3: Commit**

```bash
git add admin/src/components/style-studio/StandardPromptGenerator.tsx
git commit -m "feat(style-studio): StandardPromptGenerator bileşeni — prompt üretim modalı"
```

---

## Task 7: Ana Sayfa — StyleStudio.tsx

**Files:**
- Create: `admin/src/pages/StyleStudio.tsx`

- [ ] **Step 1: StyleStudio sayfasını oluştur**

```tsx
import { useState, useEffect } from "react";
import { api } from "../services/api";
import type { VisualStandard, VisualStyleAnalysisResult } from "../types";
import StyleAnalyzer from "../components/style-studio/StyleAnalyzer";
import StandardPromptGenerator from "../components/style-studio/StandardPromptGenerator";

type ViewMode = "list" | "create";

export default function StyleStudio() {
  const [standards, setStandards] = useState<VisualStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [seeding, setSeeding] = useState(false);

  // Yeni standart oluşturma state'leri
  const [analysisResult, setAnalysisResult] = useState<VisualStyleAnalysisResult | null>(null);
  const [analysisImage, setAnalysisImage] = useState<string | null>(null);
  const [standardName, setStandardName] = useState("");
  const [saving, setSaving] = useState(false);

  // Prompt üretici state'i
  const [promptTarget, setPromptTarget] = useState<{ id: string; name: string } | null>(null);

  // Silme state'i
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadStandards = async () => {
    try {
      const data = await api.listVisualStandards();
      setStandards(data as VisualStandard[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStandards(); }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await api.seedVisualStandards();
      await loadStandards();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleAnalysisComplete = (result: VisualStyleAnalysisResult, preview: string) => {
    setAnalysisResult(result);
    setAnalysisImage(preview);
  };

  const handleSaveStandard = async () => {
    if (!analysisResult || !standardName.trim()) return;
    setSaving(true);
    try {
      await api.createVisualStandard({
        name: standardName.trim(),
        description: analysisResult.overallDescription || "",
        thumbnail: analysisImage || "",
        background: analysisResult.background,
        lighting: analysisResult.lighting,
        colorPalette: analysisResult.colorPalette,
        surface: analysisResult.surface,
        ambiance: analysisResult.ambiance,
        cameraAngle: analysisResult.cameraAngle,
        promptTemplate: analysisResult.promptTemplate || "",
      });
      // Reset ve listeye dön
      setAnalysisResult(null);
      setAnalysisImage(null);
      setStandardName("");
      setViewMode("list");
      await loadStandards();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu standart silinecek. Emin misin?")) return;
    setDeleting(id);
    try {
      await api.deleteVisualStandard(id);
      setStandards(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (standard: VisualStandard) => {
    try {
      await api.updateVisualStandard(standard.id, { isActive: !standard.isActive });
      setStandards(prev => prev.map(s => s.id === standard.id ? { ...s, isActive: !s.isActive } : s));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stil Stüdyosu</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ürün fotoğrafları için standart görsel stiller oluştur ve yönet
          </p>
        </div>
        <div className="flex items-center gap-2">
          {standards.length === 0 && (
            <button onClick={handleSeed} disabled={seeding} className="btn-secondary text-sm disabled:opacity-50">
              {seeding ? "Yükleniyor..." : "Varsayılanları Yükle"}
            </button>
          )}
          {viewMode === "list" ? (
            <button onClick={() => setViewMode("create")} className="btn-primary text-sm">
              + Yeni Standart
            </button>
          ) : (
            <button
              onClick={() => { setViewMode("list"); setAnalysisResult(null); setAnalysisImage(null); setStandardName(""); }}
              className="btn-secondary text-sm"
            >
              Listeye Dön
            </button>
          )}
        </div>
      </div>

      {/* Hata */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}

      {/* Oluşturma modu */}
      {viewMode === "create" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Yeni Görsel Standart</h2>
          <p className="text-sm text-gray-500 -mt-4">
            Beğendiğin bir referans görseli yükle, AI stili analiz etsin. Sonucu standart olarak kaydet.
          </p>

          {/* Analiz bölümü */}
          <StyleAnalyzer onAnalysisComplete={handleAnalysisComplete} />

          {/* Analiz sonucu */}
          {analysisResult && (
            <div className="space-y-5 pt-2">
              {/* Renk paleti */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Renk Paleti</label>
                <div className="flex gap-2">
                  {(analysisResult.colorPalette || []).map((color, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-lg border border-gray-200 shadow-sm" style={{ backgroundColor: color }} />
                      <span className="text-[10px] text-gray-400 font-mono">{color}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Özellik grid'i */}
              <div className="grid grid-cols-2 gap-3">
                {/* Arkaplan */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Arkaplan</span>
                  </div>
                  <p className="text-sm text-gray-800">{analysisResult.background?.type}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{analysisResult.background?.description}</p>
                </div>

                {/* Işık */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Işık</span>
                  </div>
                  <p className="text-sm text-gray-800">{analysisResult.lighting?.direction} / {analysisResult.lighting?.quality}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{analysisResult.lighting?.description}</p>
                </div>

                {/* Yüzey */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-stone-400" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Yüzey</span>
                  </div>
                  <p className="text-sm text-gray-800">{analysisResult.surface?.material} / {analysisResult.surface?.texture}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{analysisResult.surface?.description}</p>
                </div>

                {/* Ambians */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-violet-400" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ambians</span>
                  </div>
                  <p className="text-sm text-gray-800">{analysisResult.ambiance?.mood}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{(analysisResult.ambiance?.adjectives || []).join(", ")}</p>
                </div>
              </div>

              {/* Kamera */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Kamera</span>
                <span className="text-sm text-gray-800">{analysisResult.cameraAngle}</span>
              </div>

              {/* Genel açıklama */}
              {analysisResult.overallDescription && (
                <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-4">
                  <p className="text-sm text-gray-700 leading-relaxed">{analysisResult.overallDescription}</p>
                </div>
              )}

              {/* Prompt template önizleme */}
              {analysisResult.promptTemplate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Şablonu</label>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <p className="text-xs text-gray-600 leading-relaxed font-mono">{analysisResult.promptTemplate}</p>
                  </div>
                </div>
              )}

              {/* İsim ve kaydet */}
              <div className="flex items-end gap-3 pt-2 border-t border-gray-100">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Standart Adı *</label>
                  <input
                    type="text"
                    value={standardName}
                    onChange={e => setStandardName(e.target.value)}
                    placeholder="ör. Dark Chocolate Premium"
                    className="input"
                  />
                </div>
                <button
                  onClick={handleSaveStandard}
                  disabled={saving || !standardName.trim()}
                  className="btn-primary disabled:opacity-50 whitespace-nowrap"
                >
                  {saving ? "Kaydediliyor..." : "Standart Olarak Kaydet"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Standart listesi */}
      {viewMode === "list" && (
        <>
          {standards.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">Henüz görsel standart yok.</p>
              <p className="text-xs text-gray-400 mt-1">Yeni standart oluştur veya varsayılanları yükle.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {standards.map(standard => (
                <div
                  key={standard.id}
                  className={`bg-white rounded-2xl border p-4 transition-all hover:shadow-md ${
                    standard.isActive ? "border-gray-100" : "border-gray-100 opacity-60"
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Thumbnail veya renk paleti */}
                    {standard.thumbnail ? (
                      <img src={standard.thumbnail} alt={standard.name} className="w-20 h-20 object-cover rounded-xl border border-gray-100 flex-shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl border border-gray-100 flex-shrink-0 grid grid-cols-2 grid-rows-2 overflow-hidden">
                        {(standard.colorPalette || []).slice(0, 4).map((color, i) => (
                          <div key={i} style={{ backgroundColor: color }} />
                        ))}
                      </div>
                    )}

                    {/* Bilgiler */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 truncate">{standard.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{standard.description}</p>
                        </div>
                      </div>

                      {/* Tag'ler */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {standard.background?.type && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">
                            {standard.background.type}
                          </span>
                        )}
                        {standard.lighting?.direction && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-yellow-50 text-yellow-700 font-medium">
                            {standard.lighting.direction}
                          </span>
                        )}
                        {standard.ambiance?.mood && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 font-medium">
                            {standard.ambiance.mood}
                          </span>
                        )}
                        {standard.cameraAngle && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
                            {standard.cameraAngle}
                          </span>
                        )}
                      </div>

                      {/* Aksiyonlar */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => setPromptTarget({ id: standard.id, name: standard.name })}
                          className="text-xs font-medium text-brand-blue hover:text-brand-blue/80 transition"
                        >
                          Prompt Oluştur
                        </button>
                        <span className="text-gray-200">|</span>
                        <button
                          onClick={() => handleToggleActive(standard)}
                          className={`text-xs font-medium transition ${standard.isActive ? "text-gray-400 hover:text-gray-600" : "text-green-600 hover:text-green-700"}`}
                        >
                          {standard.isActive ? "Pasif Yap" : "Aktif Yap"}
                        </button>
                        <span className="text-gray-200">|</span>
                        <button
                          onClick={() => handleDelete(standard.id)}
                          disabled={deleting === standard.id}
                          className="text-xs font-medium text-red-400 hover:text-red-600 transition disabled:opacity-50"
                        >
                          {deleting === standard.id ? "Siliniyor..." : "Sil"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Prompt üretici modal */}
      {promptTarget && (
        <StandardPromptGenerator
          standardId={promptTarget.id}
          standardName={promptTarget.name}
          onClose={() => setPromptTarget(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build kontrolü**

Run: `cd admin && npx tsc --noEmit 2>&1 | head -20`
Expected: Hata olmamalı

- [ ] **Step 3: Commit**

```bash
git add admin/src/pages/StyleStudio.tsx
git commit -m "feat(style-studio): ana sayfa — standart listesi, analiz, kaydetme"
```

---

## Task 8: Route ve Navigasyon Ekleme

**Files:**
- Modify: `admin/src/App.tsx`
- Modify: `admin/src/components/Sidebar.tsx`

- [ ] **Step 1: App.tsx'e route ekle**

`admin/src/App.tsx` dosyasında lazy import bloğuna ekle:

```typescript
const StyleStudio = lazy(() => import("./pages/StyleStudio"));
```

Aynı dosyada `/admin` Route'unun children'larına ekle (poster route'undan sonra):

```tsx
<Route path="style-studio" element={<Suspense fallback={<PageLoader />}><StyleStudio /></Suspense>} />
```

- [ ] **Step 2: Sidebar.tsx'e navigasyon öğesi ekle**

`admin/src/components/Sidebar.tsx` dosyasında "ÜRETİM ARAÇLARI" grubuna, Poster'den sonra ekle:

```tsx
{
  to: "/admin/style-studio",
  label: "Stil Stüdyosu",
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
}
```

- [ ] **Step 3: Build kontrolü**

Run: `cd admin && npx tsc --noEmit 2>&1 | head -20`
Expected: Hata olmamalı

- [ ] **Step 4: Commit**

```bash
git add admin/src/App.tsx admin/src/components/Sidebar.tsx
git commit -m "feat(style-studio): route ve sidebar navigasyonu eklendi"
```

---

## Task 9: Build Doğrulama

**Files:** Tüm değişiklikler

- [ ] **Step 1: Functions build**

Run: `cd functions && npm run build 2>&1 | tail -10`
Expected: Build başarılı

- [ ] **Step 2: Admin build**

Run: `cd admin && npm run build 2>&1 | tail -10`
Expected: Build başarılı

- [ ] **Step 3: Sorunları düzelt (varsa)**

Eğer build hataları varsa, hata mesajlarına göre düzelt ve tekrar build et.

- [ ] **Step 4: Final commit (gerekirse)**

Build fix'leri varsa commit et:

```bash
git add -A
git commit -m "fix(style-studio): build hataları düzeltildi"
```

---

## Özet

| Task | Dosya | Açıklama |
|------|-------|----------|
| 1 | `admin/src/types/index.ts` | Type tanımları |
| 2 | `functions/src/controllers/orchestrator/styleStudioController.ts` | Backend controller (CRUD + analiz + prompt + seed) |
| 3 | `functions/src/controllers/orchestrator/index.ts` + `orchestratorController.ts` | Export hub ekleme |
| 4 | `admin/src/services/api.ts` | API metotları |
| 5 | `admin/src/components/style-studio/StyleAnalyzer.tsx` | Görsel analiz bileşeni |
| 6 | `admin/src/components/style-studio/StandardPromptGenerator.tsx` | Prompt üretim modalı |
| 7 | `admin/src/pages/StyleStudio.tsx` | Ana sayfa |
| 8 | `admin/src/App.tsx` + `Sidebar.tsx` | Route ve navigasyon |
| 9 | Build doğrulama | Her iki tarafın build kontrolü |

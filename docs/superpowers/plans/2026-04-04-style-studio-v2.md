# Stil Stüdyosu v2 — İki Aşamalı Analiz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tutarlı ürün fotoğrafları üretmek için iki aşamalı bir sistem: (1) sahne/arkaplan görseli analiz edilerek sahne standardı oluşturulur, (2) ürün görseli analiz edilerek ürün detayları çıkarılır, (3) AI ikisini birleştirerek hedef modele özel prompt üretir. Referans görseller de prompt'a dahil edilir.

**Architecture:** Mevcut Stil Stüdyosu v1 (CRUD, tek analiz, basit prompt üretimi) tamamen yeniden yazılacak. Backend'de `analyzeScene` (sahne analizi) ve `analyzeProduct` (ürün analizi) ayrı endpoint'ler olacak. `generateStudioPrompt` ikisini AI ile birleştirecek. Frontend'de sayfa 3 panelli akış olacak: sol panel standart listesi, orta panel sahne/ürün analizi, sağ panel prompt çıktısı. Tüm konfigürasyonlar (sunum altlığı, prop kuralları, kadraj ayarları) Firestore-driven olacak.

**Tech Stack:** Firebase Functions (TypeScript), React 19, Tailwind CSS 3, Anthropic/OpenRouter vision API, Gemini image generation (referans görsel desteği)

---

## Araştırma Bulguları (Plana Yansıyanlar)

Web araştırmasından elde edilen ve bu plana yansıyan kritik bilgiler:

1. **Gemini referans görsel desteği:** Gemini 3 Pro Image max 6 obje + 5 karakter referans görseli destekliyor. Sahne referans görseli obje fidelity olarak gönderilebilir.
2. **5 katmanlı prompt yapısı:** Image Type → Subject → Scene → Technical Specs → Mood/Brand. Tutarlılık için en etkili yapı.
3. **2 parçalı prompt:** Sahne (yüzey/arkaplan) + Ürün (detay/özellik) olarak ayırmak, catalog-ready çıktılar için en iyi yöntem.
4. **Prompt front-loading:** AI modeller prompt'un başına daha fazla ağırlık veriyor. Kritik bilgiler (sahne, ışık) başta olmalı.
5. **Doku-ışık uyumu:** Parlak yüzeyler (ganaj, glaze) farklı ışık ister, mat yüzeyler (kakao tozu, un) farklı. AI birleştirme aşamasında bu uyumu optimize etmeli.
6. **Güvenli terminoloji:** Gemini safety filter'ları tetiklemeyecek terimler kullanılmalı (MEMORY.md'deki güvenli terimler listesi).

---

## File Structure

### Backend — Yeniden Yazılacak/Oluşturulacak Dosyalar

| Action | File | Responsibility |
|--------|------|----------------|
| Rewrite | `functions/src/controllers/orchestrator/styleStudioController.ts` | Sahne analizi, ürün analizi, prompt birleştirme, CRUD |
| Rewrite | `functions/src/controllers/orchestrator/styleStudioSeedData.ts` | Seed verisi + sunum altlığı + prop kuralları |
| Create | `functions/src/services/styleStudioAiService.ts` | AI çağrı mantığı (Anthropic/OpenRouter), prompt'lar burada |
| Modify | `functions/src/controllers/orchestrator/index.ts` | Yeni endpoint export'ları |
| Modify | `functions/src/controllers/orchestratorController.ts` | Re-export |

### Frontend — Yeniden Yazılacak/Oluşturulacak Dosyalar

| Action | File | Responsibility |
|--------|------|----------------|
| Rewrite | `admin/src/pages/StyleStudio.tsx` | Ana sayfa — 3 panelli akış, state yönetimi |
| Rewrite | `admin/src/components/style-studio/StyleAnalyzer.tsx` | Sahne analizi — arkaplan görseli yükleme ve analiz |
| Create | `admin/src/components/style-studio/ProductAnalyzer.tsx` | Ürün analizi — ürün görseli yükleme ve analiz |
| Create | `admin/src/components/style-studio/PromptComposer.tsx` | Prompt birleştirme — sahne+ürün → final prompt |
| Create | `admin/src/components/style-studio/SceneCard.tsx` | Standart listesinde sahne kartı |
| Create | `admin/src/components/style-studio/AnalysisResultPanel.tsx` | Analiz sonuç gösterimi (renk paleti, özellikler) |
| Rewrite | `admin/src/components/style-studio/StandardPromptGenerator.tsx` | Siliniyor — PromptComposer ile değiştirilecek |
| Modify | `admin/src/services/api.ts` | Yeni API metotları |
| Modify | `admin/src/types/index.ts` | Güncellenmiş type'lar |

---

## Task 1: Type Tanımları Güncelleme

**Files:**
- Modify: `admin/src/types/index.ts`

- [ ] **Step 1: Mevcut VisualStandard type'larını sil ve yenilerini yaz**

`admin/src/types/index.ts` dosyasındaki `// ── Visual Standard` bloğunu bul ve tamamını şu ile değiştir:

```typescript
// ── Style Studio v2 ──────────────────────────────────────────

export interface SceneBackground {
  type: string;          // "marble" | "wood" | "concrete" | "fabric" | "solid" | "gradient" | "slate"
  color: string;         // dominant hex
  description: string;   // İngilizce detaylı açıklama
}

export interface SceneLighting {
  direction: string;     // "overhead" | "side-left" | "side-right" | "backlit" | "front" | "three-point"
  quality: string;       // "soft-diffused" | "hard-directional" | "natural" | "rim"
  temperature: string;   // "warm 2700-3500K" | "neutral 4000K" | "cool 5000K+"
  shadowCharacter: string; // "soft-minimal" | "medium-defined" | "hard-dramatic" | "none"
  description: string;
}

export interface SceneSurface {
  material: string;      // "marble" | "wood" | "concrete" | "linen" | "ceramic" | "slate" | "none"
  texture: string;       // "smooth" | "rough" | "glossy" | "matte" | "grain" | "veined"
  description: string;
}

export interface SceneAmbiance {
  mood: string;          // "minimal" | "cozy" | "luxurious" | "rustic" | "modern" | "editorial" | "dramatic"
  adjectives: string[];  // 3 sıfat
  description: string;
}

export interface SceneServingBase {
  type: string;          // "round-marble" | "slate-board" | "ceramic-plate" | "wood-board" | "none"
  shape: string;         // "round" | "square" | "rectangular" | "none"
  color: string;         // hex veya açıklama
  heightCm: number;      // yükseklik cm
  description: string;
}

export interface ScenePropRules {
  allowed: boolean;      // prop kullanımı izinli mi
  types: string[];       // izin verilen prop tipleri: "flowers" | "herbs" | "crumbs" | "sauce-drizzle" | "fabric"
  maxCount: number;      // max prop sayısı
  description: string;   // genel prop politikası
}

export interface SceneDepthOfField {
  foreground: string;    // "sharp" | "slightly-blurred"
  background: string;    // "sharp" | "soft-bokeh" | "heavy-bokeh" | "clean"
  description: string;
}

export interface SceneStandard {
  id: string;
  name: string;
  description: string;
  referenceImage: string;       // base64 data URI — sahne referans görseli
  background: SceneBackground;
  lighting: SceneLighting;
  colorPalette: string[];       // 5 hex
  surface: SceneSurface;
  ambiance: SceneAmbiance;
  servingBase: SceneServingBase;
  propRules: ScenePropRules;
  depthOfField: SceneDepthOfField;
  cameraAngle: string;          // "flat-lay" | "45-degree" | "hero-shot" | "close-up" | "three-quarter"
  productFrameRatio: number;    // ürün frame'in yüzde kaçını kaplasın (0.4-0.7)
  scenePrompt: string;          // AI tarafından üretilen sahne prompt'u (İngilizce)
  isActive: boolean;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SceneAnalysisResult {
  background: SceneBackground;
  lighting: SceneLighting;
  colorPalette: string[];
  surface: SceneSurface;
  ambiance: SceneAmbiance;
  servingBase: SceneServingBase;
  propRules: ScenePropRules;
  depthOfField: SceneDepthOfField;
  cameraAngle: string;
  productFrameRatio: number;
  scenePrompt: string;
  overallDescription: string;
}

export interface ProductAnalysisResult {
  name: string;                 // AI'ın tanıdığı ürün adı
  type: string;                 // "tart" | "cake" | "eclair" | "macaron" | "bread" | "cookie" | "chocolate" | "other"
  shape: string;                // "round" | "rectangular" | "cylindrical" | "irregular" | "layered"
  sizeCm: string;               // tahmini boyut: "15cm diameter" | "12x8cm"
  surfaceTexture: string;       // "glossy-ganache" | "matte-powder" | "caramelized" | "frosted" | "raw-dough"
  colors: string[];             // ürün renkleri (hex)
  toppings: string[];           // "raspberries" | "chocolate-shavings" | "powdered-sugar" | "glaze" | "nuts"
  garnish: string;              // ana garnitür açıklaması
  layers: string;               // "single" | "multi-layer" | "visible-cross-section"
  distinguishingFeatures: string; // öne çıkan özellikler
  productPrompt: string;        // AI tarafından üretilen ürün prompt'u (İngilizce)
}

export interface ComposedPromptResult {
  finalPrompt: string;          // birleştirilmiş prompt
  scenePrompt: string;          // sahne kısmı
  productPrompt: string;        // ürün kısmı
  targetModel: string;          // hedef model
  sceneName: string;
  productName: string;
}
```

- [ ] **Step 2: Build kontrolü**

Run: `cd admin && npx tsc --noEmit 2>&1 | head -20`
Expected: Hata olabilir (eski type'ları kullanan dosyalar), bunlar sonraki task'larda düzeltilecek

- [ ] **Step 3: Commit**

```bash
git add admin/src/types/index.ts
git commit -m "feat(style-studio-v2): type tanımları — sahne, ürün, birleştirilmiş prompt"
```

---

## Task 2: AI Service Katmanı

**Files:**
- Create: `functions/src/services/styleStudioAiService.ts`

Bu dosya tüm AI çağrı mantığını, prompt template'lerini ve model yönlendirmesini içerir. Controller'lar sadece bu service'i çağırır.

- [ ] **Step 1: AI service dosyasını oluştur**

```typescript
/**
 * Style Studio AI Service
 * Sahne analizi, ürün analizi, prompt birleştirme
 */

import { getSystemSettings } from "../services/configService";

// ─── Model Yönlendirme ─────────────────────────────────────────

interface AiCallOptions {
  systemPrompt: string;
  userContent: Array<{ type: "text"; text: string } | { type: "image"; base64: string; mimeType: string }>;
  maxTokens?: number;
}

async function callAiModel(options: AiCallOptions): Promise<string> {
  const systemSettings = await getSystemSettings();
  const anthropicApiKey = systemSettings?.anthropicApiKey;
  const openRouterApiKey = (systemSettings as any)?.openRouterApiKey;
  const model = (systemSettings as any)?.posterAnalysisModel;

  if (!model) throw new Error("Analiz modeli tanımlı değil (Ayarlar > AI Model Seçimi)");

  const isAnthropic = !model.includes("/");

  if (isAnthropic && !anthropicApiKey) throw new Error("Anthropic API key tanımlı değil");
  if (!isAnthropic && !openRouterApiKey) throw new Error("OpenRouter API key tanımlı değil");

  if (isAnthropic) {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const messages: any[] = [{
      role: "user",
      content: options.userContent.map(c => {
        if (c.type === "text") return { type: "text", text: c.text };
        return {
          type: "image",
          source: {
            type: "base64",
            media_type: (c.mimeType || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: c.base64,
          },
        };
      }),
    }];

    const result = await anthropic.messages.create({
      model,
      max_tokens: options.maxTokens || 1500,
      system: options.systemPrompt,
      messages,
    });

    return result.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map(b => b.text).join("").trim();
  }

  // OpenRouter
  const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://instagram-automation-ad77b.web.app",
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens || 1500,
      messages: [
        { role: "system", content: options.systemPrompt },
        {
          role: "user",
          content: options.userContent.map(c => {
            if (c.type === "text") return { type: "text", text: c.text };
            return {
              type: "image_url",
              image_url: { url: `data:${c.mimeType || "image/jpeg"};base64,${c.base64}` },
            };
          }),
        },
      ],
    }),
  });

  const orData = await orResponse.json() as any;
  if (!orResponse.ok) {
    throw new Error(`OpenRouter (${model}): ${orData?.error?.message || "Bilinmeyen hata"}`);
  }
  return (orData.choices?.[0]?.message?.content || "").trim();
}

function parseJson(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSON bulunamadı");
  return JSON.parse(match[0]);
}

// ─── Sahne Analizi ──────────────────────────────────────────────

const SCENE_ANALYSIS_PROMPT = `You are a professional food photography art director. Analyze this SCENE/BACKGROUND image (not the product) and extract every visual detail needed to recreate this exact setting consistently.

IMPORTANT: ALL output MUST be in English.

Return ONLY valid JSON:
{
  "background": {
    "type": "marble | wood | concrete | fabric | solid | gradient | slate | ceramic | stone",
    "color": "#hex of dominant background color",
    "description": "precise: color tone, texture pattern, any veining/grain, gradients, wear marks"
  },
  "lighting": {
    "direction": "overhead | side-left | side-right | backlit | front | three-point",
    "quality": "soft-diffused | hard-directional | natural | rim",
    "temperature": "warm 2700-3500K | neutral 4000K | cool 5000K+",
    "shadowCharacter": "soft-minimal | medium-defined | hard-dramatic | none",
    "description": "full lighting setup: source type, direction, diffusion, fill lights, shadow behavior, color temperature in Kelvin"
  },
  "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "surface": {
    "material": "marble | wood | concrete | linen | ceramic | slate | metal | none",
    "texture": "smooth | rough | glossy | matte | grain | veined",
    "description": "exact surface: material finish, reflectivity, pattern detail"
  },
  "ambiance": {
    "mood": "minimal | cozy | luxurious | rustic | modern | editorial | dramatic",
    "adjectives": ["adj1", "adj2", "adj3"],
    "description": "overall visual atmosphere"
  },
  "servingBase": {
    "type": "round-marble | slate-board | ceramic-plate | wood-board | none",
    "shape": "round | square | rectangular | none",
    "color": "#hex or descriptive color",
    "heightCm": 0.5,
    "description": "serving base/pedestal details: material, edge profile, finish"
  },
  "propRules": {
    "allowed": true,
    "types": ["list of visible prop types: flowers, herbs, crumbs, sauce-drizzle, fabric, utensils"],
    "maxCount": 2,
    "description": "prop policy: what decorative elements are present, their role, density"
  },
  "depthOfField": {
    "foreground": "sharp | slightly-blurred",
    "background": "sharp | soft-bokeh | heavy-bokeh | clean",
    "description": "focus behavior: what's sharp, what's soft, bokeh quality"
  },
  "cameraAngle": "flat-lay | 45-degree | hero-shot | close-up | three-quarter",
  "productFrameRatio": 0.55,
  "scenePrompt": "A detailed English prompt that describes ONLY the scene setup (no product). Include: exact surface material and color, lighting setup with Kelvin temperature, shadow behavior, camera angle with lens specs (focal length, aperture), depth of field, atmosphere. Use [PRODUCT] as placeholder where the product would be placed. This prompt will be used to recreate this exact scene with different products.",
  "overallDescription": "2-3 sentence summary of the complete scene aesthetic"
}`;

export async function analyzeScene(imageBase64: string, imageMimeType: string): Promise<any> {
  const responseText = await callAiModel({
    systemPrompt: SCENE_ANALYSIS_PROMPT,
    userContent: [
      { type: "image", base64: imageBase64, mimeType: imageMimeType },
      { type: "text", text: "Analyze this scene/background image. Extract every visual detail for consistent reproduction. Return JSON only." },
    ],
    maxTokens: 2000,
  });
  return parseJson(responseText);
}

// ─── Ürün Analizi ───────────────────────────────────────────────

const PRODUCT_ANALYSIS_PROMPT = `You are a professional food stylist and photographer. Analyze this PRODUCT image and extract every physical and visual detail needed to accurately describe this product in an image generation prompt.

IMPORTANT: ALL output MUST be in English.

Return ONLY valid JSON:
{
  "name": "identified product name in English (e.g. 'Raspberry Tart')",
  "type": "tart | cake | eclair | macaron | bread | cookie | chocolate | croissant | mousse | pudding | pie | other",
  "shape": "round | rectangular | cylindrical | irregular | layered | dome | triangular",
  "sizeCm": "estimated dimensions: e.g. '15cm diameter, 4cm height' or '12x8x5cm'",
  "surfaceTexture": "glossy-ganache | matte-powder | caramelized | frosted | raw-dough | smooth-cream | rough-crumbly | glazed",
  "colors": ["#hex1", "#hex2", "#hex3"],
  "toppings": ["list every visible topping: raspberries, chocolate-shavings, powdered-sugar, glaze, nuts, caramel-drizzle, gold-leaf, mint-leaf, cocoa-powder"],
  "garnish": "main garnish description: exact placement, quantity, arrangement pattern",
  "layers": "single | multi-layer | visible-cross-section | filled",
  "distinguishingFeatures": "what makes THIS product unique: fluted pastry edges, visible jam layer, artful berry arrangement, dusted sugar crystals",
  "productPrompt": "A detailed English description of this exact product for image generation. Include: product type, exact shape and dimensions, surface texture and finish, colors, all toppings with arrangement, garnish details, layer structure. Be hyper-specific about textures: 'glistening raspberry drupelets', 'golden-brown fluted tart shell with visible butter layers'. Do NOT include any scene/background information — only the product itself."
}`;

export async function analyzeProduct(imageBase64: string, imageMimeType: string): Promise<any> {
  const responseText = await callAiModel({
    systemPrompt: PRODUCT_ANALYSIS_PROMPT,
    userContent: [
      { type: "image", base64: imageBase64, mimeType: imageMimeType },
      { type: "text", text: "Analyze this food product. Extract every physical detail for accurate reproduction. Return JSON only." },
    ],
    maxTokens: 1500,
  });
  return parseJson(responseText);
}

// ─── Prompt Birleştirme ─────────────────────────────────────────

const MODEL_FORMAT_INSTRUCTIONS: Record<string, string> = {
  gemini: `Write as a single flowing narrative paragraph. Include camera specs (85mm lens, f/2.8 aperture), lighting with exact Kelvin temperature, and spatial composition directions. Be descriptive about textures and materials. Gemini responds best to narrative descriptions.`,
  "dall-e": `Write as structured sentences in this order: 1) Background/Scene setup 2) Product placement and description 3) Key texture details 4) Photography style/medium 5) Technical lighting setup 6) Mood/constraints. Use complete sentences, not tags.`,
  midjourney: `Write as comma-separated descriptive phrases. Concise and evocative, no full sentences. Keep under 60 words total. End with: --ar 4:5 --v 7 --s 250 --q 2 --style raw --no blurry distorted watermark cartoon illustration`,
  flux: `Write as a detailed descriptive paragraph. Include art direction, exact composition with spatial terms (upper-third, center), framing, lighting type and direction, style classification, and material/texture descriptions for maximum realism.`,
};

const COMPOSE_PROMPT_TEMPLATE = `You are a prompt engineer specializing in AI food photography generation.

You will receive:
1. A SCENE PROMPT describing the background, lighting, surface, and atmosphere
2. A PRODUCT PROMPT describing the food product in detail
3. A TARGET MODEL for format optimization

Your job: Merge these into ONE cohesive image generation prompt that places the product naturally into the scene.

CRITICAL RULES:
- The final prompt MUST be entirely in English
- Front-load the most important visual elements (scene setup → product → details → technical → mood)
- Ensure lighting-texture harmony: glossy surfaces need specular highlights, matte surfaces need diffused light
- Include the serving base/pedestal if specified in the scene
- Respect the product frame ratio (how much of the frame the product should fill)
- Never use terms that trigger AI safety filters: avoid gender terms, "grip", "pinch", "cup" for hand descriptions
- Never mention brand names
- Include specific camera specs: focal length (85mm-100mm), aperture (f/2.8-f/4), and composition framing

FORMAT INSTRUCTIONS for {targetModel}:
{formatInstructions}

Return ONLY the final merged prompt. No explanations, no labels, no JSON.`;

export async function composePrompt(
  scenePrompt: string,
  productPrompt: string,
  targetModel: string,
  productName: string,
  sceneName: string,
  extras?: { servingBase?: string; propRules?: string; productFrameRatio?: number }
): Promise<string> {
  const formatInstructions = MODEL_FORMAT_INSTRUCTIONS[targetModel] || MODEL_FORMAT_INSTRUCTIONS.gemini;

  const systemPrompt = COMPOSE_PROMPT_TEMPLATE
    .replace("{targetModel}", targetModel)
    .replace("{formatInstructions}", formatInstructions);

  const userMessage = `SCENE PROMPT:
${scenePrompt}

PRODUCT PROMPT:
${productPrompt}

ADDITIONAL CONTEXT:
- Product name: ${productName}
- Scene name: ${sceneName}
- Serving base: ${extras?.servingBase || "not specified"}
- Prop rules: ${extras?.propRules || "not specified"}
- Product should fill approximately ${Math.round((extras?.productFrameRatio || 0.55) * 100)}% of the frame

Merge these into one cohesive prompt for ${targetModel}.`;

  return callAiModel({
    systemPrompt,
    userContent: [{ type: "text", text: userMessage }],
    maxTokens: 800,
  });
}
```

- [ ] **Step 2: Build kontrolü**

Run: `cd functions && npx tsc --noEmit 2>&1 | head -20`
Expected: Temiz build

- [ ] **Step 3: Commit**

```bash
git add functions/src/services/styleStudioAiService.ts
git commit -m "feat(style-studio-v2): AI service — sahne analizi, ürün analizi, prompt birleştirme"
```

---

## Task 3: Backend Controller Yeniden Yazımı

**Files:**
- Rewrite: `functions/src/controllers/orchestrator/styleStudioController.ts`

Mevcut controller tamamen yeniden yazılacak. CRUD aynı kalacak, ancak `analyzeVisualStyle` → `analyzeScene` + `analyzeProduct`, `generateStandardPrompt` → `generateStudioPrompt` olarak değişecek.

- [ ] **Step 1: Controller'ı yeniden yaz**

```typescript
/**
 * Style Studio v2 Controller
 * İki aşamalı analiz: sahne + ürün → birleştirilmiş prompt
 */

import { createHttpFunction, db } from "./shared";
import { clearConfigCache } from "../../services/config/configCache";
import { buildDefaultSceneStandards } from "./styleStudioSeedData";
import { analyzeScene, analyzeProduct, composePrompt } from "../../services/styleStudioAiService";

const STANDARDS_PATH = "global/config/style-studio/standards/items";

// ─── CRUD ───────────────────────────────────────────────────────

export const listVisualStandards = createHttpFunction(async (req, res) => {
  const snapshot = await db.collection(STANDARDS_PATH).orderBy("createdAt", "desc").get();
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json({ success: true, data });
});

export const createVisualStandard = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ success: false, error: "Use POST" }); return; }

  const { name, ...rest } = req.body || {};
  if (!name) { res.status(400).json({ success: false, error: "name gerekli" }); return; }

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const existing = await db.collection(STANDARDS_PATH).doc(id).get();
  if (existing.exists) { res.status(409).json({ success: false, error: "Bu ID zaten mevcut" }); return; }

  await db.collection(STANDARDS_PATH).doc(id).set({
    ...rest, id, name, isActive: rest.isActive ?? true, isDefault: rest.isDefault ?? false,
    createdAt: Date.now(), updatedAt: Date.now(),
  });
  clearConfigCache();
  res.json({ success: true, data: { id }, message: "Sahne standardı oluşturuldu" });
});

export const updateVisualStandard = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ success: false, error: "Use POST" }); return; }
  const { id, ...updates } = req.body || {};
  if (!id) { res.status(400).json({ success: false, error: "id gerekli" }); return; }
  await db.collection(STANDARDS_PATH).doc(id).update({ ...updates, updatedAt: Date.now() });
  clearConfigCache();
  res.json({ success: true, message: "Sahne standardı güncellendi" });
});

export const deleteVisualStandard = createHttpFunction(async (req, res) => {
  const id = req.body?.id || req.query.id;
  if (!id) { res.status(400).json({ success: false, error: "id gerekli" }); return; }
  await db.collection(STANDARDS_PATH).doc(id as string).delete();
  clearConfigCache();
  res.json({ success: true, message: "Sahne standardı silindi" });
});

// ─── Sahne Analizi ──────────────────────────────────────────────

export const analyzeVisualStyle = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ success: false, error: "Use POST" }); return; }
  const { imageBase64, imageMimeType } = req.body || {};
  if (!imageBase64) { res.status(400).json({ success: false, error: "imageBase64 gerekli" }); return; }

  try {
    const analysis = await analyzeScene(imageBase64, imageMimeType || "image/jpeg");
    res.json({ success: true, data: analysis });
  } catch (err: any) {
    console.error("[analyzeScene]", err?.message);
    res.status(500).json({ success: false, error: err?.message || "Sahne analizi başarısız" });
  }
}, { timeoutSeconds: 90, memory: "512MiB" });

// ─── Ürün Analizi ───────────────────────────────────────────────

export const analyzeProductImage = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ success: false, error: "Use POST" }); return; }
  const { imageBase64, imageMimeType } = req.body || {};
  if (!imageBase64) { res.status(400).json({ success: false, error: "imageBase64 gerekli" }); return; }

  try {
    const analysis = await analyzeProduct(imageBase64, imageMimeType || "image/jpeg");
    res.json({ success: true, data: analysis });
  } catch (err: any) {
    console.error("[analyzeProduct]", err?.message);
    res.status(500).json({ success: false, error: err?.message || "Ürün analizi başarısız" });
  }
}, { timeoutSeconds: 90, memory: "512MiB" });

// ─── Prompt Birleştirme ─────────────────────────────────────────

export const generateStudioPrompt = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ success: false, error: "Use POST" }); return; }

  const { standardId, productAnalysis, targetModel, productName } = req.body || {};
  if (!standardId || !productAnalysis) {
    res.status(400).json({ success: false, error: "standardId ve productAnalysis gerekli" });
    return;
  }

  const doc = await db.collection(STANDARDS_PATH).doc(standardId).get();
  if (!doc.exists) { res.status(404).json({ success: false, error: "Sahne standardı bulunamadı" }); return; }

  const standard = doc.data()!;
  const scenePrompt = standard.scenePrompt || "";
  const productPrompt = productAnalysis.productPrompt || "";
  const name = productName || productAnalysis.name || "product";

  try {
    const finalPrompt = await composePrompt(
      scenePrompt,
      productPrompt,
      targetModel || "gemini",
      name,
      standard.name || "",
      {
        servingBase: standard.servingBase?.description,
        propRules: standard.propRules?.description,
        productFrameRatio: standard.productFrameRatio,
      }
    );
    res.json({
      success: true,
      data: {
        finalPrompt,
        scenePrompt,
        productPrompt,
        targetModel: targetModel || "gemini",
        sceneName: standard.name,
        productName: name,
      },
    });
  } catch (err: any) {
    console.error("[generateStudioPrompt]", err?.message);
    res.status(500).json({ success: false, error: err?.message || "Prompt birleştirme başarısız" });
  }
}, { timeoutSeconds: 90, memory: "512MiB" });

// ─── Seed ───────────────────────────────────────────────────────

export const seedVisualStandards = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ success: false, error: "Use POST" }); return; }
  const now = Date.now();
  const defaults = buildDefaultSceneStandards(now);
  const batch = db.batch();
  for (const s of defaults) {
    batch.set(db.collection(STANDARDS_PATH).doc(s.id), s, { merge: true });
  }
  await batch.commit();
  clearConfigCache();
  res.json({ success: true, data: { seeded: defaults.length }, message: `${defaults.length} sahne standardı yüklendi` });
});
```

- [ ] **Step 2: Build kontrolü**

Run: `cd functions && npx tsc --noEmit 2>&1 | head -20`
Expected: Temiz veya sadece seed data type hatası (sonraki task'ta düzeltilecek)

- [ ] **Step 3: Commit**

```bash
git add functions/src/controllers/orchestrator/styleStudioController.ts
git commit -m "feat(style-studio-v2): controller yeniden yazımı — sahne/ürün analizi, prompt birleştirme"
```

---

## Task 4: Seed Data Güncelleme

**Files:**
- Rewrite: `functions/src/controllers/orchestrator/styleStudioSeedData.ts`

- [ ] **Step 1: Seed data'yı v2 formatına güncelle**

```typescript
/**
 * Style Studio v2 — Varsayılan Sahne Standartları
 */

export interface SceneStandardSeed {
  id: string;
  name: string;
  description: string;
  referenceImage: string;
  background: { type: string; color: string; description: string };
  lighting: { direction: string; quality: string; temperature: string; shadowCharacter: string; description: string };
  colorPalette: string[];
  surface: { material: string; texture: string; description: string };
  ambiance: { mood: string; adjectives: string[]; description: string };
  servingBase: { type: string; shape: string; color: string; heightCm: number; description: string };
  propRules: { allowed: boolean; types: string[]; maxCount: number; description: string };
  depthOfField: { foreground: string; background: string; description: string };
  cameraAngle: string;
  productFrameRatio: number;
  scenePrompt: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: number;
}

export function buildDefaultSceneStandards(now: number): SceneStandardSeed[] {
  const defaultServingBase = {
    type: "round-marble",
    shape: "round",
    color: "#E8E4DE",
    heightCm: 0.5,
    description: "Round light grey marble serving base, 0.5cm height, subtle veining, matte finish",
  };

  return [
    {
      id: "minimal-white",
      name: "Minimal White",
      description: "Sade beyaz stüdyo — ürün tek başına parlıyor",
      referenceImage: "",
      background: { type: "solid", color: "#FFFFFF", description: "Pure white seamless studio background, no texture, slight warm tone" },
      lighting: { direction: "overhead", quality: "soft-diffused", temperature: "neutral 5000K", shadowCharacter: "soft-minimal", description: "Large overhead softbox with diffusion panel, even illumination, minimal shadow cast, neutral 5000K daylight balance" },
      colorPalette: ["#FFFFFF", "#F5F5F5", "#E8E8E8", "#D0D0D0", "#333333"],
      surface: { material: "none", texture: "smooth", description: "Clean white seamless surface, no visible texture or grain" },
      ambiance: { mood: "minimal", adjectives: ["clean", "airy", "modern"], description: "Pure minimalist aesthetic with maximum negative space" },
      servingBase: defaultServingBase,
      propRules: { allowed: false, types: [], maxCount: 0, description: "No props allowed — pure product focus only" },
      depthOfField: { foreground: "sharp", background: "clean", description: "Everything in focus, clean white background with no distractions" },
      cameraAngle: "three-quarter",
      productFrameRatio: 0.55,
      scenePrompt: "Professional food photography scene: pure white seamless studio background. Large overhead softbox lighting with full diffusion at 5000K neutral daylight. Round light grey marble serving base (0.5cm height, subtle veining). No props, no decorations — maximum negative space. Shot from three-quarter angle with 85mm lens at f/4. Product [PRODUCT] fills 55% of frame. Clean, modern, minimal commercial photography.",
      isActive: true,
      isDefault: true,
      createdAt: now,
    },
    {
      id: "dark-moody",
      name: "Dark & Moody",
      description: "Dramatik karanlık atmosfer — sıcak amber tonlarıyla premium his",
      referenceImage: "",
      background: { type: "solid", color: "#1A1A1A", description: "Deep charcoal-black background with subtle texture variation" },
      lighting: { direction: "side-left", quality: "hard-directional", temperature: "warm 3200K", shadowCharacter: "hard-dramatic", description: "Single strong side light from left at 3200K warm amber, creating deep chiaroscuro shadows, no fill light" },
      colorPalette: ["#1A1A1A", "#2D2D2D", "#8B6914", "#C4A24D", "#F5E6C8"],
      surface: { material: "slate", texture: "rough", description: "Dark charcoal slate surface with natural rough texture and subtle warm reflections" },
      ambiance: { mood: "dramatic", adjectives: ["moody", "luxurious", "cinematic"], description: "High contrast dark atmosphere with warm amber accents, premium editorial feel" },
      servingBase: { type: "slate-board", shape: "round", color: "#2D2D2D", heightCm: 1, description: "Dark slate round board, 1cm height, natural edge, matte finish" },
      propRules: { allowed: true, types: ["crumbs", "sauce-drizzle"], maxCount: 1, description: "Minimal props — only subtle crumbs or sauce drizzle for texture interest" },
      depthOfField: { foreground: "sharp", background: "soft-bokeh", description: "Product sharp, background falls into soft warm bokeh" },
      cameraAngle: "45-degree",
      productFrameRatio: 0.6,
      scenePrompt: "Dramatic food photography scene: deep charcoal-black background. Single strong side light from left at 3200K warm amber creating deep chiaroscuro shadows. Dark slate surface with natural rough texture. Dark slate round serving board (1cm height). Subtle crumbs allowed for texture. Soft warm bokeh in background. Shot from 45-degree angle with 100mm macro lens at f/2.8. Product [PRODUCT] fills 60% of frame. Moody, luxurious, cinematic commercial photography.",
      isActive: true,
      isDefault: false,
      createdAt: now,
    },
    {
      id: "rustic-wood",
      name: "Rustic Wood",
      description: "Doğal ahşap yüzey — sıcak, otantik, zanaatkarlık hissi",
      referenceImage: "",
      background: { type: "textured", color: "#8B6343", description: "Natural aged oak wood with visible grain, warm brown tones, authentic patina" },
      lighting: { direction: "side-right", quality: "natural", temperature: "warm 3800K", shadowCharacter: "medium-defined", description: "Natural window light from right side at 3800K golden hour quality, soft shadows with defined edges" },
      colorPalette: ["#8B6343", "#C49A6C", "#F5E6D3", "#6B4226", "#D4A96A"],
      surface: { material: "wood", texture: "grain", description: "Aged natural oak surface with visible wood grain, knots, and warm brown patina" },
      ambiance: { mood: "cozy", adjectives: ["rustic", "warm", "artisanal"], description: "Warm handcrafted atmosphere evoking artisanal bakery authenticity" },
      servingBase: { type: "wood-board", shape: "round", color: "#6B4226", heightCm: 1.5, description: "Round dark walnut cutting board, 1.5cm height, natural edge, oiled finish" },
      propRules: { allowed: true, types: ["herbs", "crumbs", "fabric"], maxCount: 2, description: "Linen napkin corner and scattered herb leaves for rustic authenticity" },
      depthOfField: { foreground: "sharp", background: "soft-bokeh", description: "Product and immediate surface sharp, background with gentle warm bokeh" },
      cameraAngle: "45-degree",
      productFrameRatio: 0.5,
      scenePrompt: "Artisanal food photography scene: aged natural oak wood surface with visible grain and warm brown patina. Natural window light from right side at 3800K golden hour quality, medium-defined shadows. Round dark walnut cutting board (1.5cm height). Linen napkin corner visible. Shot from 45-degree angle with 85mm lens at f/3.5. Product [PRODUCT] fills 50% of frame. Warm, rustic, artisanal bakery photography.",
      isActive: true,
      isDefault: false,
      createdAt: now,
    },
    {
      id: "marble-elegance",
      name: "Marble Elegance",
      description: "Carrara mermer — soğuk, rafine, lüks marka estetiği",
      referenceImage: "",
      background: { type: "surface", color: "#F0EDE8", description: "White Carrara marble with delicate grey veining, cool sophisticated tone" },
      lighting: { direction: "front", quality: "soft-diffused", temperature: "neutral 4500K", shadowCharacter: "soft-minimal", description: "Frontal fill light at 4500K with subtle side accent for marble vein definition, soft even illumination" },
      colorPalette: ["#F0EDE8", "#E0DBD4", "#C8C0B8", "#9B9590", "#2C2C2C"],
      surface: { material: "marble", texture: "veined", description: "Polished Carrara white marble with elegant grey veining, cool reflective surface" },
      ambiance: { mood: "editorial", adjectives: ["elegant", "refined", "premium"], description: "High-end editorial luxury aesthetic with cool marble tones and pristine presentation" },
      servingBase: defaultServingBase,
      propRules: { allowed: true, types: ["crumbs", "sauce-drizzle"], maxCount: 1, description: "Minimal — only artful crumbs or thin sauce drizzle for visual interest" },
      depthOfField: { foreground: "sharp", background: "slightly-blurred", description: "Product and marble surface sharp, slight background softening for depth" },
      cameraAngle: "three-quarter",
      productFrameRatio: 0.55,
      scenePrompt: "Premium editorial food photography scene: polished white Carrara marble surface with delicate grey veining. Frontal fill light at 4500K neutral with subtle side accent for marble definition. Round light grey marble serving base (0.5cm height). Minimal artful crumbs if appropriate. Shot from three-quarter angle with 90mm tilt-shift lens at f/4. Product [PRODUCT] fills 55% of frame. Elegant, refined, luxury brand editorial photography.",
      isActive: true,
      isDefault: false,
      createdAt: now,
    },
  ];
}
```

- [ ] **Step 2: Build kontrolü**

Run: `cd functions && npx tsc --noEmit 2>&1 | head -20`
Expected: Temiz build

- [ ] **Step 3: Commit**

```bash
git add functions/src/controllers/orchestrator/styleStudioSeedData.ts
git commit -m "feat(style-studio-v2): seed data — sunum altlığı, prop kuralları, derinlik alanı eklendi"
```

---

## Task 5: Export Hub ve API Güncelleme

**Files:**
- Modify: `functions/src/controllers/orchestrator/index.ts`
- Modify: `functions/src/controllers/orchestratorController.ts`
- Modify: `admin/src/services/api.ts`

- [ ] **Step 1: orchestrator/index.ts export'larını güncelle**

Mevcut Style Studio export bloğunu bul ve şu ile değiştir:

```typescript
// Style Studio Controller v2 (Stil Stüdyosu)
export {
  listVisualStandards,
  createVisualStandard,
  updateVisualStandard,
  deleteVisualStandard,
  analyzeVisualStyle,
  analyzeProductImage,
  generateStudioPrompt,
  seedVisualStandards,
} from "./styleStudioController";
```

- [ ] **Step 2: orchestratorController.ts export'larını güncelle**

Mevcut Style Studio re-export bloğunu bul ve şu ile değiştir:

```typescript
  // Style Studio Controller v2
  listVisualStandards,
  createVisualStandard,
  updateVisualStandard,
  deleteVisualStandard,
  analyzeVisualStyle,
  analyzeProductImage,
  generateStudioPrompt,
  seedVisualStandards,
```

`generateStandardPrompt` referansını kaldır (artık `generateStudioPrompt` var).

- [ ] **Step 3: API service'e yeni metotlar ekle**

`admin/src/services/api.ts` dosyasındaki Visual Standards bölümünü şu ile değiştir:

```typescript
  // ── Style Studio v2 ────────────────────────────────────────

  async listVisualStandards(): Promise<any[]> {
    const res = await this.fetch<{ success: boolean; data: any[] }>("listVisualStandards");
    return res.data;
  }

  async createVisualStandard(standard: Record<string, any>): Promise<{ id: string }> {
    const res = await this.fetch<{ success: boolean; data: { id: string } }>("createVisualStandard", {
      method: "POST",
      body: JSON.stringify(standard),
    });
    return res.data;
  }

  async updateVisualStandard(id: string, updates: Record<string, any>): Promise<void> {
    await this.fetch("updateVisualStandard", {
      method: "POST",
      body: JSON.stringify({ id, ...updates }),
    });
  }

  async deleteVisualStandard(id: string): Promise<void> {
    await this.fetch("deleteVisualStandard", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  }

  async analyzeScene(imageBase64: string, imageMimeType?: string): Promise<any> {
    const res = await this.fetch<{ success: boolean; data: any }>("analyzeVisualStyle", {
      method: "POST",
      body: JSON.stringify({ imageBase64, imageMimeType }),
    });
    return res.data;
  }

  async analyzeProduct(imageBase64: string, imageMimeType?: string): Promise<any> {
    const res = await this.fetch<{ success: boolean; data: any }>("analyzeProductImage", {
      method: "POST",
      body: JSON.stringify({ imageBase64, imageMimeType }),
    });
    return res.data;
  }

  async generateStudioPrompt(params: {
    standardId: string;
    productAnalysis: any;
    targetModel?: string;
    productName?: string;
  }): Promise<any> {
    const res = await this.fetch<{ success: boolean; data: any }>("generateStudioPrompt", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return res.data;
  }

  async seedVisualStandards(): Promise<any> {
    const res = await this.fetch<{ success: boolean; data: any }>("seedVisualStandards", {
      method: "POST",
    });
    return res.data;
  }
```

Eski `analyzeVisualStyle`, `generateStandardPrompt` metotlarını sil.

- [ ] **Step 4: Build kontrolü**

Run: `cd functions && npx tsc --noEmit 2>&1 | head -10 && cd ../admin && npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 5: Commit**

```bash
git add functions/src/controllers/orchestrator/index.ts functions/src/controllers/orchestratorController.ts admin/src/services/api.ts
git commit -m "feat(style-studio-v2): export hub'lar ve API metotları güncellendi"
```

---

## Task 6: AnalysisResultPanel Bileşeni

**Files:**
- Create: `admin/src/components/style-studio/AnalysisResultPanel.tsx`

Hem sahne hem ürün analiz sonuçlarını gösteren ortak bileşen.

- [ ] **Step 1: Bileşeni oluştur**

```typescript
import type { SceneAnalysisResult, ProductAnalysisResult } from "../../types";

interface ScenePanelProps {
  type: "scene";
  result: SceneAnalysisResult;
}

interface ProductPanelProps {
  type: "product";
  result: ProductAnalysisResult;
}

type AnalysisResultPanelProps = ScenePanelProps | ProductPanelProps;

export default function AnalysisResultPanel(props: AnalysisResultPanelProps) {
  if (props.type === "scene") return <SceneResult result={props.result} />;
  return <ProductResult result={props.result} />;
}

function SceneResult({ result }: { result: SceneAnalysisResult }) {
  return (
    <div className="space-y-3">
      {/* Renk paleti */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 w-16 flex-shrink-0">Palet</span>
        <div className="flex gap-1.5">
          {(result.colorPalette || []).map((hex, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className="w-7 h-7 rounded-md border border-gray-200 shadow-sm" style={{ backgroundColor: hex }} />
              <span className="text-[9px] text-gray-400 font-mono">{hex}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Özellik grid */}
      <div className="grid grid-cols-2 gap-2">
        <PropCard dot="amber" label="Arkaplan" value={result.background?.type} detail={result.background?.description} />
        <PropCard dot="yellow" label="Işık" value={`${result.lighting?.direction} · ${result.lighting?.quality}`} detail={result.lighting?.description} />
        <PropCard dot="stone" label="Yüzey" value={`${result.surface?.material} · ${result.surface?.texture}`} detail={result.surface?.description} />
        <PropCard dot="violet" label="Ambians" value={result.ambiance?.mood} detail={result.ambiance?.adjectives?.join(", ")} />
        <PropCard dot="blue" label="Kamera" value={result.cameraAngle} detail={`Ürün oranı: %${Math.round((result.productFrameRatio || 0.55) * 100)}`} />
        <PropCard dot="emerald" label="Altlık" value={result.servingBase?.type} detail={result.servingBase?.description} />
        <PropCard dot="rose" label="Prop" value={result.propRules?.allowed ? `İzinli (max ${result.propRules.maxCount})` : "Yasak"} detail={result.propRules?.description} />
        <PropCard dot="cyan" label="Derinlik" value={`Ön: ${result.depthOfField?.foreground}`} detail={`Arka: ${result.depthOfField?.background}`} />
      </div>

      {/* Sahne prompt'u */}
      {result.scenePrompt && (
        <div className="bg-gray-900 rounded-xl px-3 py-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Scene Prompt</span>
            <CopyButton text={result.scenePrompt} />
          </div>
          <p className="text-xs text-gray-300 font-mono leading-relaxed">{result.scenePrompt}</p>
        </div>
      )}
    </div>
  );
}

function ProductResult({ result }: { result: ProductAnalysisResult }) {
  return (
    <div className="space-y-3">
      {/* Ürün adı ve tipi */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900">{result.name}</p>
          <p className="text-xs text-gray-500">{result.type} · {result.shape} · {result.sizeCm}</p>
        </div>
      </div>

      {/* Ürün renkleri */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 w-16 flex-shrink-0">Renkler</span>
        <div className="flex gap-1.5">
          {(result.colors || []).map((hex, i) => (
            <div key={i} className="w-6 h-6 rounded-md border border-gray-200" style={{ backgroundColor: hex }} />
          ))}
        </div>
      </div>

      {/* Özellikler */}
      <div className="grid grid-cols-2 gap-2">
        <PropCard dot="amber" label="Yüzey" value={result.surfaceTexture} detail="" />
        <PropCard dot="green" label="Katman" value={result.layers} detail="" />
        <PropCard dot="red" label="Topping" value={(result.toppings || []).join(", ")} detail="" />
        <PropCard dot="yellow" label="Garnitür" value={result.garnish} detail="" />
      </div>

      {/* Ayırt edici özellikler */}
      {result.distinguishingFeatures && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <p className="text-xs text-amber-800">{result.distinguishingFeatures}</p>
        </div>
      )}

      {/* Ürün prompt'u */}
      {result.productPrompt && (
        <div className="bg-gray-900 rounded-xl px-3 py-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Product Prompt</span>
            <CopyButton text={result.productPrompt} />
          </div>
          <p className="text-xs text-gray-300 font-mono leading-relaxed">{result.productPrompt}</p>
        </div>
      )}
    </div>
  );
}

// ─── Yardımcılar ────────────────────────────────────────────────

const DOT_COLORS: Record<string, string> = {
  amber: "bg-amber-400", yellow: "bg-yellow-400", stone: "bg-stone-400",
  violet: "bg-violet-400", blue: "bg-blue-400", emerald: "bg-emerald-400",
  rose: "bg-rose-400", cyan: "bg-cyan-400", green: "bg-green-400", red: "bg-red-400",
};

function PropCard({ dot, label, value, detail }: { dot: string; label: string; value?: string; detail?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-2.5 py-2">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[dot] || "bg-gray-400"}`} />
        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">{label}</span>
      </div>
      {value && <p className="text-xs text-gray-800 leading-tight">{value}</p>}
      {detail && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{detail}</p>}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-[10px] text-gray-500 hover:text-brand-blue transition">
      {copied ? "Kopyalandı" : "Kopyala"}
    </button>
  );
}

// useState import'u
import { useState } from "react";
```

- [ ] **Step 2: Build kontrolü**

Run: `cd admin && npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
git add admin/src/components/style-studio/AnalysisResultPanel.tsx
git commit -m "feat(style-studio-v2): AnalysisResultPanel — sahne ve ürün analiz sonuçları"
```

---

## Task 7: ProductAnalyzer Bileşeni

**Files:**
- Create: `admin/src/components/style-studio/ProductAnalyzer.tsx`

Ürün görseli yükleme ve analiz bileşeni. StyleAnalyzer ile benzer pattern ama `analyzeProduct` çağırır.

- [ ] **Step 1: Bileşeni oluştur**

```typescript
import { useState } from "react";
import { api } from "../../services/api";
import type { ProductAnalysisResult } from "../../types";

interface ProductAnalyzerProps {
  onAnalysisComplete: (result: ProductAnalysisResult, imagePreview: string) => void;
}

export default function ProductAnalyzer({ onAnalysisComplete }: ProductAnalyzerProps) {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Görsel boyutu 5MB'ı aşamaz"); return; }
    setImageMimeType(file.type);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64((reader.result as string).split(",")[1]);
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => { setImageBase64(null); setImagePreview(null); setError(null); };

  const handleAnalyze = async () => {
    if (!imageBase64 || !imagePreview) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await api.analyzeProduct(imageBase64, imageMimeType);
      onAnalysisComplete(result as ProductAnalysisResult, imagePreview);
    } catch (err: any) {
      setError(err.message || "Ürün analizi başarısız");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600">2</span>
        <span className="text-sm font-semibold text-gray-800">Ürün Görseli</span>
      </div>

      {!imagePreview ? (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all group">
          <svg className="w-8 h-8 text-gray-300 group-hover:text-orange-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 013 15.546V12a9 9 0 0118 0v3.546zM12 3v2m0 0a3 3 0 013 3v1H9V8a3 3 0 013-3z" />
          </svg>
          <p className="text-xs font-medium text-gray-600">Ürün fotoğrafı yükle</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Ürünün detaylarını analiz edeceğiz</p>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
      ) : (
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <img src={imagePreview} alt="Ürün" className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
            <button onClick={handleReset} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 text-gray-400 hover:text-red-500">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1">
            <button onClick={handleAnalyze} disabled={analyzing} className="btn-primary text-sm w-full disabled:opacity-60">
              {analyzing ? "Ürün analiz ediliyor..." : "Ürünü Analiz Et"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Build kontrolü**

Run: `cd admin && npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
git add admin/src/components/style-studio/ProductAnalyzer.tsx
git commit -m "feat(style-studio-v2): ProductAnalyzer bileşeni — ürün görseli analizi"
```

---

## Task 8: PromptComposer Bileşeni

**Files:**
- Create: `admin/src/components/style-studio/PromptComposer.tsx`

Sahne + ürün analiz sonuçlarını birleştirip final prompt üreten bileşen. Eski `StandardPromptGenerator`'ın yerini alır.

- [ ] **Step 1: Bileşeni oluştur**

```typescript
import { useState } from "react";
import { api } from "../../services/api";
import type { ProductAnalysisResult, ComposedPromptResult } from "../../types";

interface PromptComposerProps {
  standardId: string;
  standardName: string;
  productAnalysis: ProductAnalysisResult;
  productImage: string;
  sceneImage: string;
  onClose: () => void;
}

const TARGET_MODELS = [
  { id: "gemini", label: "Gemini" },
  { id: "dall-e", label: "DALL-E / GPT" },
  { id: "midjourney", label: "Midjourney" },
  { id: "flux", label: "Flux" },
];

export default function PromptComposer({ standardId, standardName, productAnalysis, productImage, sceneImage, onClose }: PromptComposerProps) {
  const [targetModel, setTargetModel] = useState("gemini");
  const [productName, setProductName] = useState(productAnalysis.name || "");
  const [composing, setComposing] = useState(false);
  const [result, setResult] = useState<ComposedPromptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCompose = async () => {
    if (!productName.trim()) return;
    setComposing(true);
    setError(null);
    try {
      const data = await api.generateStudioPrompt({
        standardId,
        productAnalysis,
        targetModel,
        productName: productName.trim(),
      });
      setResult(data as ComposedPromptResult);
    } catch (err: any) {
      setError(err.message || "Prompt birleştirme başarısız");
    } finally {
      setComposing(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.finalPrompt) return;
    await navigator.clipboard.writeText(result.finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Prompt Birleştir</h2>
            <p className="text-xs text-gray-500 mt-0.5">Sahne: {standardName} + Ürün: {productAnalysis.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Referans görseller */}
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-1.5">Sahne</p>
              <img src={sceneImage} alt="Sahne" className="w-full h-24 object-cover rounded-lg border border-gray-100" />
            </div>
            <div className="flex items-center text-gray-300 text-lg">+</div>
            <div className="flex-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-1.5">Ürün</p>
              <img src={productImage} alt="Ürün" className="w-full h-24 object-cover rounded-lg border border-gray-100" />
            </div>
          </div>

          {/* Ürün adı */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı</label>
            <input type="text" value={productName} onChange={e => setProductName(e.target.value)} className="input" placeholder="ör. Frambuazlı Tart" />
          </div>

          {/* Model seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hedef Model</label>
            <div className="flex gap-2">
              {TARGET_MODELS.map(m => (
                <button key={m.id} onClick={() => setTargetModel(m.id)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition ${
                    targetModel === m.id ? "border-brand-blue bg-brand-blue/10 text-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Üret butonu */}
          <button onClick={handleCompose} disabled={composing || !productName.trim()} className="btn-primary w-full disabled:opacity-50">
            {composing ? "Birleştiriliyor..." : "Prompt Oluştur"}
          </button>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          {/* Sonuç */}
          {result && (
            <div className="space-y-3">
              <div className="bg-gray-900 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Final Prompt — {result.targetModel}</span>
                  <button onClick={handleCopy} className="text-xs font-medium text-brand-blue hover:text-brand-blue/80">{copied ? "Kopyalandı!" : "Kopyala"}</button>
                </div>
                <p className="text-sm text-gray-200 font-mono leading-relaxed whitespace-pre-wrap">{result.finalPrompt}</p>
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

Run: `cd admin && npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
git add admin/src/components/style-studio/PromptComposer.tsx
git commit -m "feat(style-studio-v2): PromptComposer — sahne+ürün birleştirme modalı"
```

---

## Task 9: StyleAnalyzer Güncelleme

**Files:**
- Rewrite: `admin/src/components/style-studio/StyleAnalyzer.tsx`

Mevcut `StyleAnalyzer` güncellenerek `analyzeScene` çağıracak ve `SceneAnalysisResult` döndürecek.

- [ ] **Step 1: StyleAnalyzer'ı güncelle**

Dosyadaki `api.analyzeVisualStyle` çağrısını `api.analyzeScene` ile değiştir. Prop type'ı `VisualStyleAnalysisResult` yerine `SceneAnalysisResult` olacak. Label'lar "Sahne görseli yükle" olarak değişecek. Step numarası ekle (1).

Import'ları güncelle:
```typescript
import type { SceneAnalysisResult } from "../../types";
```

Props:
```typescript
interface StyleAnalyzerProps {
  onAnalysisComplete: (result: SceneAnalysisResult, imagePreview: string) => void;
}
```

API çağrısı:
```typescript
const result = await api.analyzeScene(imageBase64, imageMimeType);
onAnalysisComplete(result as SceneAnalysisResult, imagePreview);
```

Label değişiklikleri:
- "Referans görsel yükle" → "Sahne/arkaplan görseli yükle"
- "Stili Analiz Et" → "Sahneyi Analiz Et"
- Step badge ekle: `<span className="w-5 h-5 rounded-full bg-brand-blue/10 flex items-center justify-center text-[10px] font-bold text-brand-blue">1</span>`

- [ ] **Step 2: Build kontrolü**

Run: `cd admin && npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
git add admin/src/components/style-studio/StyleAnalyzer.tsx
git commit -m "feat(style-studio-v2): StyleAnalyzer sahne analizine dönüştürüldü"
```

---

## Task 10: Ana Sayfa Yeniden Yazımı

**Files:**
- Rewrite: `admin/src/pages/StyleStudio.tsx`
- Delete: `admin/src/components/style-studio/StandardPromptGenerator.tsx`

Ana sayfa tamamen yeniden yazılacak. 3 adımlı akış:
1. Sahne standardı seç (listeden) veya yeni oluştur (analiz ile)
2. Ürün görseli yükle ve analiz et
3. Prompt birleştir ve üret

- [ ] **Step 1: Eski StandardPromptGenerator'ı sil**

```bash
rm admin/src/components/style-studio/StandardPromptGenerator.tsx
```

- [ ] **Step 2: StyleStudio.tsx'i yeniden yaz**

Bu dosya ~380 satır olacak (400 limit altında). Akış:

```typescript
import { useState, useEffect } from "react";
import { api } from "../services/api";
import type { SceneStandard, SceneAnalysisResult, ProductAnalysisResult } from "../types";
import StyleAnalyzer from "../components/style-studio/StyleAnalyzer";
import ProductAnalyzer from "../components/style-studio/ProductAnalyzer";
import AnalysisResultPanel from "../components/style-studio/AnalysisResultPanel";
import PromptComposer from "../components/style-studio/PromptComposer";

type ViewMode = "studio" | "create-scene";

export default function StyleStudio() {
  // Standartlar
  const [standards, setStandards] = useState<SceneStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("studio");
  const [seeding, setSeeding] = useState(false);

  // Sahne oluşturma
  const [sceneAnalysis, setSceneAnalysis] = useState<SceneAnalysisResult | null>(null);
  const [sceneImage, setSceneImage] = useState<string | null>(null);
  const [sceneName, setSceneName] = useState("");
  const [savingScene, setSavingScene] = useState(false);

  // Stüdyo akışı
  const [selectedStandard, setSelectedStandard] = useState<SceneStandard | null>(null);
  const [productAnalysis, setProductAnalysis] = useState<ProductAnalysisResult | null>(null);
  const [productImage, setProductImage] = useState<string | null>(null);

  // Prompt composer
  const [showComposer, setShowComposer] = useState(false);

  // Silme
  const [deleting, setDeleting] = useState<string | null>(null);

  // ─── Veri yükleme ────
  const loadStandards = async () => { /* api.listVisualStandards + setStandards */ };
  useEffect(() => { loadStandards(); }, []);

  // ─── Handlers ────
  const handleSeed = async () => { /* seed + reload */ };
  const handleSceneAnalysisComplete = (result: SceneAnalysisResult, preview: string) => { /* set state */ };
  const handleSaveScene = async () => { /* api.createVisualStandard + reset + switch to studio */ };
  const handleSelectStandard = (s: SceneStandard) => { /* set selectedStandard, reset product */ };
  const handleProductAnalysisComplete = (result: ProductAnalysisResult, preview: string) => { /* set state */ };
  const handleDelete = async (id: string) => { /* confirm + delete */ };

  // ─── Render ────
  // Loading spinner → Header → viewMode switch
  // "studio" mode: Sol panel (standart listesi) + Sağ panel (seçilen standart + ürün analizi + prompt butonu)
  // "create-scene" mode: Sahne oluşturma formu (StyleAnalyzer + AnalysisResultPanel + isim + kaydet)
}
```

**Layout yapısı:**

```
┌──────────────────────────────────────────────────────────┐
│  Stil Stüdyosu              [+ Yeni Sahne] [Seed]       │
├──────────────────┬───────────────────────────────────────┤
│  SOL PANEL       │  SAĞ PANEL                           │
│  Sahne Listesi   │                                       │
│  ┌────────────┐  │  ┌─────────────────────────────────┐ │
│  │ Minimal    │◄─┤  │ Seçili Sahne Bilgileri          │ │
│  │ White    ✓ │  │  │ (AnalysisResultPanel type=scene) │ │
│  └────────────┘  │  └─────────────────────────────────┘ │
│  ┌────────────┐  │                                       │
│  │ Dark &     │  │  ┌─────────────────────────────────┐ │
│  │ Moody      │  │  │ ADIM 2: Ürün Görseli            │ │
│  └────────────┘  │  │ (ProductAnalyzer)                │ │
│  ┌────────────┐  │  └─────────────────────────────────┘ │
│  │ Rustic     │  │                                       │
│  │ Wood       │  │  ┌─────────────────────────────────┐ │
│  └────────────┘  │  │ Ürün Analiz Sonuçları           │ │
│  ┌────────────┐  │  │ (AnalysisResultPanel type=prod)  │ │
│  │ Marble     │  │  └─────────────────────────────────┘ │
│  │ Elegance   │  │                                       │
│  └────────────┘  │  [     Prompt Oluştur      ]         │
│                  │  (PromptComposer modal açılır)        │
└──────────────────┴───────────────────────────────────────┘
```

Tam implementasyonu subagent'a bırakıyorum — layout ASCII'si ve handler skeleton'ı yeterli bağlam sağlıyor. Önemli kurallar:
- Dosya 400 satırı geçmemeli
- `SceneStandard` type'ı kullanılmalı (eski `VisualStandard` değil)
- `PromptComposer` modalı `selectedStandard + productAnalysis` dolunca gösterilebilir
- Sol panel scroll edilebilir, sabit genişlik (w-72)
- Seçili standart vurgulanmalı (border-brand-blue)

- [ ] **Step 3: Build kontrolü**

Run: `cd admin && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(style-studio-v2): ana sayfa — 3 adımlı akış (sahne seç → ürün analiz → prompt üret)"
```

---

## Task 11: Build Doğrulama ve Deploy

**Files:** Tüm değişiklikler

- [ ] **Step 1: Functions build**

Run: `cd functions && npm run build 2>&1 | tail -10`
Expected: Build başarılı

- [ ] **Step 2: Admin build**

Run: `cd admin && npm run build 2>&1 | tail -10`
Expected: Build başarılı

- [ ] **Step 3: Sorunları düzelt (varsa)**

- [ ] **Step 4: Deploy**

```bash
cd functions && npm run build
FUNCTIONS_DISCOVERY_TIMEOUT=120000 firebase deploy --only functions:listVisualStandards,functions:createVisualStandard,functions:updateVisualStandard,functions:deleteVisualStandard,functions:analyzeVisualStyle,functions:analyzeProductImage,functions:generateStudioPrompt,functions:seedVisualStandards

cd admin && npm run build && firebase deploy --only hosting
```

- [ ] **Step 5: Doğrulama**

```bash
curl -s https://europe-west1-instagram-automation-ad77b.cloudfunctions.net/listVisualStandards
# Beklenen: {"success":true,"data":[...]}
```

- [ ] **Step 6: Seed (eğer standartlar boşsa)**

```bash
curl -X POST https://europe-west1-instagram-automation-ad77b.cloudfunctions.net/seedVisualStandards
```

---

## Özet

| Task | Dosya(lar) | Açıklama |
|------|-----------|----------|
| 1 | `admin/src/types/index.ts` | v2 type'ları: SceneStandard, ProductAnalysisResult, ComposedPromptResult |
| 2 | `functions/src/services/styleStudioAiService.ts` | AI service: sahne analizi, ürün analizi, prompt birleştirme |
| 3 | `functions/.../styleStudioController.ts` | Controller yeniden yazımı: analyzeScene + analyzeProduct + generateStudioPrompt |
| 4 | `functions/.../styleStudioSeedData.ts` | v2 seed data: sunum altlığı, prop kuralları, derinlik alanı |
| 5 | `*/index.ts` + `api.ts` | Export hub'lar + API metotları güncelleme |
| 6 | `*/AnalysisResultPanel.tsx` | Sahne ve ürün analiz sonuç gösterimi |
| 7 | `*/ProductAnalyzer.tsx` | Ürün görseli yükleme ve analiz |
| 8 | `*/PromptComposer.tsx` | Sahne+ürün → final prompt birleştirme modalı |
| 9 | `*/StyleAnalyzer.tsx` | Sahne analizine dönüştürme |
| 10 | `*/StyleStudio.tsx` | Ana sayfa: 3 adımlı akış |
| 11 | Build + Deploy | Doğrulama ve yayınlama |

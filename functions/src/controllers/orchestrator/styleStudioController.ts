/**
 * Style Studio Controller
 * Görsel standart yönetimi — CRUD, AI analiz, prompt üretimi, seed
 */

import { createHttpFunction, db } from "./shared";
import { getSystemSettings } from "../../services/configService";
import { clearConfigCache } from "../../services/config/configCache";
import { buildDefaultVisualStandards } from "./styleStudioSeedData";

const VISUAL_STANDARDS_PATH = "global/config/style-studio/standards/items";

// ─── Görsel standart tipi ───────────────────────────────────────────────────

interface VisualStandard {
  id: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  background?: {
    type?: string;
    color?: string;
    description?: string;
  };
  lighting?: {
    direction?: string;
    quality?: string;
    temperature?: string;
    description?: string;
  };
  colorPalette?: string[];
  surface?: {
    material?: string;
    texture?: string;
    description?: string;
  };
  ambiance?: {
    mood?: string;
    adjectives?: string[];
    description?: string;
  };
  cameraAngle?: string;
  overallDescription?: string;
  promptTemplate?: string;
  createdAt: number;
  updatedAt?: number;
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

/**
 * Tüm görsel standartları listele
 * GET /listVisualStandards
 */
export const listVisualStandards = createHttpFunction(async (req, res) => {
  const snapshot = await db.collection(VISUAL_STANDARDS_PATH)
    .orderBy("createdAt", "desc")
    .get();

  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  res.json({ success: true, data });
});

/**
 * Yeni görsel standart oluştur
 * POST /createVisualStandard
 * Body: { name, ...fields }
 */
export const createVisualStandard = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { name, ...rest } = req.body || {};
  if (!name) {
    res.status(400).json({ success: false, error: "name gerekli" });
    return;
  }

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "").replace(/^-+/, "");

  // Aynı ID zaten varsa hata ver
  const existing = await db.collection(VISUAL_STANDARDS_PATH).doc(id).get();
  if (existing.exists) {
    res.status(409).json({ success: false, error: "Bu ID zaten mevcut" });
    return;
  }

  const standard: VisualStandard = {
    ...rest,
    id,
    name,
    isActive: rest.isActive ?? true,
    isDefault: rest.isDefault ?? false,
    createdAt: Date.now(),
  };

  await db.collection(VISUAL_STANDARDS_PATH).doc(id).set(standard);
  clearConfigCache();

  res.json({ success: true, data: { id }, message: "Görsel standart oluşturuldu" });
});

/**
 * Görsel standart güncelle
 * POST /updateVisualStandard
 * Body: { id, ...fields }
 */
export const updateVisualStandard = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { id, ...updates } = req.body || {};
  if (!id) {
    res.status(400).json({ success: false, error: "id gerekli" });
    return;
  }

  await db.collection(VISUAL_STANDARDS_PATH).doc(id).update({
    ...updates,
    updatedAt: Date.now(),
  });
  clearConfigCache();

  res.json({ success: true, message: "Görsel standart güncellendi" });
});

/**
 * Görsel standart sil
 * POST /deleteVisualStandard
 * Body: { id } veya ?id=...
 */
export const deleteVisualStandard = createHttpFunction(async (req, res) => {
  const id = req.body?.id || req.query.id;
  if (!id) {
    res.status(400).json({ success: false, error: "id gerekli" });
    return;
  }

  await db.collection(VISUAL_STANDARDS_PATH).doc(id as string).delete();
  clearConfigCache();

  res.json({ success: true, message: "Görsel standart silindi" });
});

// ─── AI Analiz ──────────────────────────────────────────────────────────────

/**
 * Görsel analiz — fotoğraftan görsel standart özelliklerini çıkar
 * POST /analyzeVisualStyle
 * Body: { imageBase64, imageMimeType? }
 */
export const analyzeVisualStyle = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { imageBase64, imageMimeType } = req.body || {};
  if (!imageBase64) {
    res.status(400).json({ success: false, error: "imageBase64 gerekli" });
    return;
  }

  const systemSettings = await getSystemSettings();
  const anthropicApiKey = systemSettings?.anthropicApiKey;
  const openRouterApiKey = (systemSettings as any)?.openRouterApiKey;
  const analysisModel = systemSettings?.posterAnalysisModel;

  if (!analysisModel) {
    res.status(400).json({ success: false, error: "Poster analiz modeli tanımlı değil (Ayarlar > AI Model Seçimi)" });
    return;
  }

  // Model yönlendirme: slash içermeyen = Anthropic, slash içeren = OpenRouter
  const isAnthropicModel = !analysisModel.includes("/");

  if (isAnthropicModel && !anthropicApiKey) {
    res.status(400).json({ success: false, error: "Anthropic API key tanımlı değil (Ayarlar > API Ayarları)" });
    return;
  }
  if (!isAnthropicModel && !openRouterApiKey) {
    res.status(400).json({ success: false, error: "OpenRouter API key tanımlı değil (Ayarlar > API Ayarları)" });
    return;
  }

  const systemPrompt = `You analyze product photography and extract precise visual style properties.
IMPORTANT: ALL output MUST be in English. Never use Turkish or any other language.

Return ONLY valid JSON with this exact structure:
{
  "background": {
    "type": "solid | gradient | textured | surface",
    "color": "approximate hex or descriptive color",
    "description": "detailed description of the background"
  },
  "lighting": {
    "direction": "overhead | side | front | backlit | three-point",
    "quality": "soft diffused | hard directional | natural",
    "temperature": "warm 2700-3500K | neutral 4000K | cool 5000K+",
    "description": "lighting setup description"
  },
  "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "surface": {
    "material": "marble | wood | fabric | ceramic | concrete | none",
    "texture": "smooth | rough | grain | matte | glossy",
    "description": "surface description"
  },
  "ambiance": {
    "mood": "minimal | cozy | editorial | dramatic | fresh | rustic | elegant",
    "adjectives": ["adj1", "adj2", "adj3"],
    "description": "overall ambiance and feel"
  },
  "cameraAngle": "overhead | 45-degree | eye-level | three-quarter",
  "overallDescription": "2-3 sentence description of the complete visual style",
  "promptTemplate": "A product photography image of [PRODUCT] with [describe background], [describe lighting], [describe surface/props], [describe mood/atmosphere]. Shot from [cameraAngle]. [Additional style descriptors]."
}

The promptTemplate MUST include [PRODUCT] as a placeholder for the product name.
Be specific and technical — this data will be used to reproduce this visual style.
ALL descriptions, adjectives, and the promptTemplate MUST be in English.`;

  const userText = "Analyze this product photography image and extract its complete visual style properties. Return JSON only.";

  let responseText: string;

  console.log(`[analyzeVisualStyle] Model: ${analysisModel}, isAnthropic: ${isAnthropicModel}`);

  try {
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
      if (!orResponse.ok) {
        const errMsg = orData?.error?.message || orData?.error?.code || JSON.stringify(orData?.error) || "Bilinmeyen OpenRouter hatası";
        throw new Error(`OpenRouter (${analysisModel}): ${errMsg}`);
      }
      responseText = (orData.choices?.[0]?.message?.content || "").trim();
    }
  } catch (err: any) {
    console.error(`[analyzeVisualStyle] Model hatası (${analysisModel}):`, err?.message || err);
    res.status(500).json({
      success: false,
      error: `Model hatası (${analysisModel}): ${err?.message || "Bilinmeyen hata"}`,
    });
    return;
  }

  // JSON parse
  let analysis;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Parse failed", raw: responseText };
  } catch {
    analysis = { error: "Parse failed", raw: responseText };
  }

  res.json({ success: true, data: analysis });
}, { timeoutSeconds: 60, memory: "512MiB" });

// ─── Prompt Üretimi ─────────────────────────────────────────────────────────

// Hedef model bazlı yeniden formatlama talimatları
const MODEL_FORMAT_INSTRUCTIONS: Record<string, string> = {
  gemini: `Rewrite as a single flowing paragraph. Include camera specs (lens, aperture), lighting with color temperature (e.g. "5500K daylight"), and spatial composition directions. Be descriptive about textures and materials.`,
  "dall-e": `Rewrite as structured sentences following this order: 1) Background/Scene 2) Subject/Product reference 3) Key Details 4) Style/Medium 5) Technical lighting 6) Mood. Wrap any text in "double quotes". Specify font style and placement.`,
  midjourney: `Rewrite as comma-separated descriptive phrases — concise, evocative, no full sentences. Keep under 60 words. End with: --ar 2:3 --v 7 --s 150 --q 2 --style raw --no blurry distorted watermark cartoon`,
  flux: `Rewrite as a detailed descriptive paragraph. Include art direction, composition, framing, lighting type and direction, style classification, and material/texture descriptions for realism.`,
};

/**
 * Standart için hazır prompt üret
 * POST /generateStandardPrompt
 * Body: { standardId, productName, productDescription?, targetModel? }
 */
export const generateStandardPrompt = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { standardId, productName, productDescription, targetModel } = req.body || {};
  if (!standardId || !productName) {
    res.status(400).json({ success: false, error: "standardId ve productName gerekli" });
    return;
  }

  // Standartı Firestore'dan oku
  const doc = await db.collection(VISUAL_STANDARDS_PATH).doc(standardId).get();
  if (!doc.exists) {
    res.status(404).json({ success: false, error: `Görsel standart bulunamadı: ${standardId}` });
    return;
  }

  const standard = doc.data() as VisualStandard;
  if (!standard.promptTemplate) {
    res.status(400).json({ success: false, error: "Bu standartta promptTemplate tanımlı değil" });
    return;
  }

  // [PRODUCT] placeholder'ını değiştir
  const productLabel = productDescription ? `${productName} (${productDescription})` : productName;
  let prompt = standard.promptTemplate.replace(/\[PRODUCT\]/g, productLabel);

  // Hedef model seçilmişse AI ile yeniden formatla
  if (targetModel && MODEL_FORMAT_INSTRUCTIONS[targetModel]) {
    const systemSettings = await getSystemSettings();
    const anthropicApiKey = systemSettings?.anthropicApiKey;
    const openRouterApiKey = (systemSettings as any)?.openRouterApiKey;
    const promptModel = systemSettings?.posterPromptModel || systemSettings?.posterAnalysisModel;

    if (promptModel) {
      const isAnthropicModel = !promptModel.includes("/");
      const hasKey = isAnthropicModel ? !!anthropicApiKey : !!openRouterApiKey;

      if (hasKey) {
        const systemPrompt = `You are a prompt engineer. Reformat the given image generation prompt for a specific AI model.
${MODEL_FORMAT_INSTRUCTIONS[targetModel]}
IMPORTANT: The output prompt MUST be entirely in English. Never translate to Turkish or any other language.
Return ONLY the reformatted prompt — no explanations, no labels.`;

        try {
          let reformatted: string;

          if (isAnthropicModel) {
            const Anthropic = (await import("@anthropic-ai/sdk")).default;
            const anthropic = new Anthropic({ apiKey: anthropicApiKey });
            const result = await anthropic.messages.create({
              model: promptModel,
              max_tokens: 800,
              system: systemPrompt,
              messages: [{ role: "user", content: prompt }],
            });
            reformatted = result.content
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
                model: promptModel,
                max_tokens: 800,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: prompt },
                ],
              }),
            });
            const orData = await orResponse.json() as any;
            if (orResponse.ok) {
              reformatted = (orData.choices?.[0]?.message?.content || "").trim();
            } else {
              // Hata durumunda orijinal prompt'u kullan
              console.warn(`[generateStandardPrompt] OpenRouter hatası, orijinal prompt kullanılıyor`);
              reformatted = prompt;
            }
          }

          if (reformatted) prompt = reformatted;
        } catch (err: any) {
          console.warn(`[generateStandardPrompt] Reformat hatası, orijinal prompt kullanılıyor:`, err?.message);
          // Hata olsa bile orijinal prompt'u döndür
        }
      }
    }
  }

  res.json({
    success: true,
    data: {
      prompt,
      standardId,
      standardName: standard.name,
      productName,
      targetModel: targetModel || "generic",
    },
  });
}, { timeoutSeconds: 60, memory: "512MiB" });

// ─── Seed ───────────────────────────────────────────────────────────────────

/**
 * 4 varsayılan görsel standart yükle
 * POST /seedVisualStandards
 */
export const seedVisualStandards = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const now = Date.now();
  const defaults = buildDefaultVisualStandards(now);

  const batch = db.batch();
  for (const standard of defaults) {
    const ref = db.collection(VISUAL_STANDARDS_PATH).doc(standard.id);
    batch.set(ref, standard, { merge: true });
  }
  await batch.commit();
  clearConfigCache();

  res.json({
    success: true,
    data: { seeded: defaults.length, ids: defaults.map(s => s.id) },
    message: `${defaults.length} görsel standart yüklendi`,
  });
});

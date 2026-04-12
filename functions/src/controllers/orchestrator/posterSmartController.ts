/**
 * Poster Smart Controller
 * Kombinasyon kontrolü, stil CRUD, görsel analizi
 */

import { createHttpFunction, errorResponse, db } from "./shared";
import { getSystemSettings } from "../../services/configService";
import { clearConfigCache } from "../../services/config/configCache";
import { getPosterStyleById, getPosterMoodById, getPosterAspectRatioById, getPosterTypographyById, getPosterLayoutById } from "../../services/config/posterConfig";
import { getGlobalRules } from "../../services/posterLearningService";

const POSTER_CONFIG_PATH = "global/config/poster-config";
const GALLERY_PATH = "global/posters/items";

/**
 * Kombinasyon kontrolü — üretmeden önce aynı stil+mood ile düşük puanlı run var mı?
 * POST /checkPosterCombination
 * Body: { styleId, moodId }
 */
export const checkPosterCombination = createHttpFunction(async (req, res) => {
  const { styleId, moodId } = req.body || {};
  if (!styleId || !moodId) {
    res.json({ success: true, data: { warning: false } });
    return;
  }

  // Bu kombinasyonla 1 yıldız almış run'lar var mı?
  const snapshot = await db.collection(GALLERY_PATH)
    .where("styleId", "==", styleId)
    .where("moodId", "==", moodId)
    .where("rating", "==", 1)
    .limit(5)
    .get();

  if (snapshot.empty) {
    res.json({ success: true, data: { warning: false } });
    return;
  }

  // Feedback notlarını topla
  const feedbacks = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      note: data.feedbackNote || "",
      categories: data.feedbackCategories || [],
      createdAt: data.createdAt,
    };
  });

  res.json({
    success: true,
    data: {
      warning: true,
      count: feedbacks.length,
      message: `Bu kombinasyon daha önce ${feedbacks.length} kez 1 yıldız aldı.`,
      feedbacks,
    },
  });
});

/**
 * Poster stili güncelle (CRUD — update)
 * POST /updatePosterStyle
 * Body: { id, ...fields }
 */
export const updatePosterStyle = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { id, ...updates } = req.body;
  if (!id) {
    res.status(400).json({ success: false, error: "id gerekli" });
    return;
  }

  await db.collection(`${POSTER_CONFIG_PATH}/styles/items`).doc(id).update({
    ...updates,
    updatedAt: Date.now(),
  });
  clearConfigCache();

  res.json({ success: true, message: "Stil güncellendi" });
});

/**
 * Poster stili oluştur (CRUD — create)
 * POST /createPosterStyle
 */
export const createPosterStyle = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const data = req.body;
  if (!data.name || !data.nameTr) {
    res.status(400).json({ success: false, error: "name ve nameTr gerekli" });
    return;
  }

  const id = data.id || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  const docPath = `${POSTER_CONFIG_PATH}/styles/items/${id}`;
  console.log(`[createPosterStyle] Kaydediliyor: id=${id}, path=${docPath}, name=${data.name}`);

  const docData = {
    ...data,
    id,
    isActive: data.isActive ?? true,
    sortOrder: data.sortOrder ?? 99,
    createdAt: Date.now(),
  };
  await db.collection(`${POSTER_CONFIG_PATH}/styles/items`).doc(id).set(docData);

  // Doğrulama: kayıt gerçekten Firestore'da mı?
  const verify = await db.collection(`${POSTER_CONFIG_PATH}/styles/items`).doc(id).get();
  if (!verify.exists) {
    console.error(`[createPosterStyle] HATA: Döküman kaydedildi ama doğrulanamadı! id=${id}`);
    res.status(500).json({ success: false, error: "Stil kaydedilemedi — Firestore doğrulaması başarısız" });
    return;
  }
  console.log(`[createPosterStyle] Doğrulandı: id=${id}, isActive=${verify.data()?.isActive}, sortOrder=${verify.data()?.sortOrder}`);

  clearConfigCache();

  res.json({ success: true, data: { id }, message: "Stil oluşturuldu" });
});

/**
 * Poster stili sil (CRUD — delete)
 * POST /deletePosterStyle
 */
export const deletePosterStyle = createHttpFunction(async (req, res) => {
  const id = req.body?.id || req.query.id;
  if (!id) {
    res.status(400).json({ success: false, error: "id gerekli" });
    return;
  }

  await db.collection(`${POSTER_CONFIG_PATH}/styles/items`).doc(id as string).delete();
  clearConfigCache();

  res.json({ success: true, message: "Stil silindi" });
});

/**
 * Görsel analizi — poster yükle, stil/mood/tipografi bilgilerini çıkar
 * POST /analyzePosterDesign
 * Body: { imageBase64, imageMimeType }
 */
export const analyzePosterDesign = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const { imageBase64, imageMimeType } = req.body;
  if (!imageBase64) {
    res.status(400).json({ success: false, error: "imageBase64 gerekli" });
    return;
  }

  // Sistem ayarlarını al
  const systemSettings = await getSystemSettings();
  const anthropicApiKey = systemSettings?.anthropicApiKey;
  const openRouterApiKey = (systemSettings as any)?.openRouterApiKey;
  const analysisModel = systemSettings?.posterAnalysisModel;
  if (!analysisModel) {
    res.status(400).json({ success: false, error: "Poster analiz modeli tanımlı değil (Ayarlar > AI Model Seçimi)" });
    return;
  }

  // Model yönlendirme: slash içermeyen = Anthropic modeli, slash içeren = OpenRouter (provider/model-name)
  const isAnthropicModel = !analysisModel.includes("/");
  if (isAnthropicModel && !anthropicApiKey) {
    res.status(400).json({ success: false, error: "Anthropic API key tanımlı değil (Ayarlar > API Ayarları)" });
    return;
  }
  if (!isAnthropicModel && !openRouterApiKey) {
    res.status(400).json({ success: false, error: "OpenRouter API key tanımlı değil (Ayarlar > API Ayarları)" });
    return;
  }

  // Mevcut stilleri, mood'ları, tipografileri al (eşleştirme için)
  const stylesSnap = await db.collection(`${POSTER_CONFIG_PATH}/styles/items`).where("isActive", "==", true).get();
  const moodsSnap = await db.collection(`${POSTER_CONFIG_PATH}/moods/items`).where("isActive", "==", true).get();
  const typoSnap = await db.collection(`${POSTER_CONFIG_PATH}/typographies/items`).where("isActive", "==", true).get();

  const styleNames = stylesSnap.docs.map(d => `${d.id}: ${d.data().name} — ${d.data().description}`);
  const moodNames = moodsSnap.docs.map(d => `${d.id}: ${d.data().name}`);
  const typoNames = typoSnap.docs.map(d => `${d.id}: ${d.data().name} — ${d.data().description}`);

  // ── ANAYASA MADDE 1 & 2: Sonnet kapasitesi tam kullanılır, çıktı doğrudan prompt'a enjekte edilebilir ──
  const systemPrompt = `You are a world-class art director and design forensics expert. You analyze poster images with the precision of a professional cinematographer, typographer, and color theorist combined.

CRITICAL MISSION: Your analysis output will be fed DIRECTLY into an AI image generator (Gemini) to recreate this poster with a different product. If your values are vague, the recreation will fail. Every single field must be specific enough that an AI can reconstruct the identical visual style without seeing the original.

FORBIDDEN VAGUE TERMS (never use these):
- "warm colors", "nice lighting", "clean look", "modern font", "minimal design"
- Any description without a measurement, hex code, Kelvin value, or ratio

REQUIRED: Return ONLY valid JSON. No markdown fences, no preamble, no explanation.

{
  "styleId": "exact-id from provided list",
  "styleName": "Style Name",
  "moodId": "exact-id from provided list",
  "moodName": "Mood Name",
  "typographyId": "exact-id from provided list",
  "typographyName": "Typography Name",

  "colorDNA": {
    "dominantColors": [
      { "role": "background", "hex": "#F2EDE0", "percentage": 65, "temperature": "warm 3200K equivalent", "saturation": "muted" },
      { "role": "primary text", "hex": "#1A1008", "percentage": 8 },
      { "role": "accent", "hex": "#C4934A", "percentage": 5 }
    ],
    "harmonyType": "analogous | complementary | triadic | split-complementary | monochromatic",
    "overallTemperature": "warm (2700-3500K) | neutral (4000K) | cool (5500K+)",
    "saturationLevel": "vivid | moderate | muted | desaturated",
    "contrastRatio": "high (7:1+) | medium (4.5:1) | low (2:1) | flat (1.5:1)",
    "colorGrade": "describe as a film color grade — e.g. 'faded highlights, lifted blacks, warm midtones' or 'cool teal shadows, orange highlights, desaturated mids'"
  },

  "typographyDNA": {
    "primaryFont": {
      "classification": "geometric sans-serif | humanist sans | grotesque | transitional serif | old-style serif | didone (high-contrast serif) | slab serif | script | display | monospace",
      "serifSubclass": "old-style | transitional | didone | slab | null (if sans)",
      "strokeContrast": "none (1:1) | low (1:2) | medium (1:3) | high (1:5) | extreme (1:8+, Didone)",
      "weight": "thin (100) | light (300) | regular (400) | medium (500) | semibold (600) | bold (700) | black (900)",
      "capitalization": "ALL-CAPS | Title Case | Sentence case | lowercase",
      "letterSpacing": "very tight (-0.05em) | tight (-0.02em) | normal (0em) | wide (0.08em) | very wide (0.2em+)",
      "axisStress": "diagonal (humanist) | vertical (rational/didone) | horizontal",
      "xHeightRatio": "low (<0.5, classical) | medium (0.5-0.65) | high (>0.65, screen-optimized)",
      "textColor": "#hex exact value",
      "promptDescription": "Write this as a complete image-gen prompt phrase, e.g.: 'high-contrast Didone serif headline, ultra-thin hairlines with heavy verticals, all-caps, tight letter-spacing, fashion editorial style, deep brown #1A1008'"
    },
    "secondaryFont": "describe if present, null if not",
    "textHierarchyCount": "number of distinct text sizes/roles visible"
  },

  "compositionDNA": {
    "gridType": "rule-of-thirds | golden-ratio | centered-symmetry | dynamic-diagonal | modular-grid | free-form",
    "balance": "symmetrical | asymmetrical | radial | all-over",
    "focalPoint": {
      "position": "describe as clock position and grid zone, e.g. 'center-top, upper-third intersection'",
      "xPercent": 50,
      "yPercent": 33
    },
    "productScale": "product fills approximately X% of frame height",
    "productPlacement": "upper-left | upper-center | upper-right | center-left | dead-center | center-right | lower-left | lower-center | lower-right",
    "textZone": "where text lives relative to product: above / below / left / right / overlay-bottom / overlay-top / surrounding",
    "negativeSpaceRatio": "generous (60%+) | moderate (40-60%) | tight (20-40%) | packed (<20%)",
    "visualFlow": "left-to-right | top-to-bottom | circular | Z-pattern | static",
    "promptDescription": "Write as image-gen phrase: e.g. 'asymmetric rule-of-thirds composition, product in upper-left quadrant at 40% frame height, generous white space on right, text anchored to lower-third'"
  },

  "lightingDNA": {
    "pattern": "rembrandt | butterfly | split | loop | broad | short | flat | rim | backlit | natural-window | overhead | under-lit",
    "quality": "hard (sharp shadow edges) | soft (graduated shadows) | diffused (shadowless) | specular (hot spots)",
    "direction": "top-left 45° | top-right 45° | overhead | side-left 90° | side-right 90° | front | back | under",
    "colorTemperature": "exact Kelvin range, e.g. '2800-3200K tungsten warm' or '5500K daylight neutral' or '7000K shade cool'",
    "keyToFillRatio": "flat (1:1) | low-contrast (2:1) | medium (4:1) | dramatic (6:1) | extreme chiaroscuro (8:1+)",
    "shadowDescription": "sharp and defined | soft and graduated | minimal | absent | colored shadows",
    "rimLight": "yes — describe color and intensity | none",
    "promptDescription": "Write as image-gen phrase: e.g. '45-degree top-left Rembrandt key light, soft diffused quality, 3000K tungsten warmth, 4:1 key-to-fill ratio, soft shadow falling to lower-right, subtle warm rim light'"
  },

  "atmosphereDNA": {
    "moodAdjectives": ["specific", "evocative", "adjective — max 4, never generic"],
    "grainLevel": "none | subtle film grain | moderate | heavy analog grain",
    "textureOverlay": "none | subtle paper | linen | concrete | marble | aged paper | halftone dots | fabric weave",
    "vignetteStrength": "none | very subtle | moderate | strong",
    "depthEffect": "flat (all in focus) | shallow DOF (background blur) | deep focus | tilt-shift",
    "styleEra": "contemporary | retro (specify decade) | vintage | timeless | futuristic",
    "promptDescription": "Write as image-gen phrase: e.g. 'quiet Sunday-morning intimacy, subtle aged paper texture overlay, very gentle vignette at edges, shallow depth of field with soft bokeh background, timeless quality'"
  },

  "generationPrompt": {
    "highLevel": "One sentence: subject + composition + overall style direction. This sets the scene. E.g.: 'Editorial product poster with artisan pastry as hero, asymmetric rule-of-thirds composition, quiet luxury editorial style'",
    "lowLevel": "Technical details paragraph: color + lighting + typography + texture + atmosphere. Everything except the product itself. This is copy-pasteable into Gemini. Must be 80-120 words.",
    "negativeGuide": "What to explicitly avoid: e.g. 'avoid flat lighting, avoid saturated colors, avoid centered symmetry, avoid heavy drop shadows'"
  },

  "reproducibility": {
    "score": 85,
    "comment": "One sentence on overall fidelity expectation",
    "highFidelity": ["background color", "lighting direction", "composition structure"],
    "mediumFidelity": ["typography weight (no exact font match)", "texture intensity"],
    "lowFidelity": ["exact font name", "product-specific reflections"]
  },

  "technicalNotes": "2-3 sentences: what specific choices make this poster uniquely effective, and what would break if changed."
}`;

  const userText = `Analyze this poster image with full forensic precision. Every field must be actionable for an AI image generator.

PRESET MATCHING — select the closest IDs from these lists:

STYLES:
${styleNames.join("\n")}

MOODS:
${moodNames.join("\n")}

TYPOGRAPHIES:
${typoNames.join("\n")}

REMEMBER: vague terms = failed recreation. Be the art director who sees hex codes and Kelvin values, not just "warm and minimal".

Return JSON only.`;

  let responseText: string;

  console.log(`[analyzePosterDesign] Model: ${analysisModel}, isAnthropic: ${isAnthropicModel}`);

  try {
    if (isAnthropicModel) {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const anthropic = new Anthropic({ apiKey: anthropicApiKey });
      const result = await anthropic.messages.create({
        model: analysisModel,
        max_tokens: 8192,
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
          max_tokens: 8192,
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
    console.error(`[analyzePosterDesign] Model hatası (${analysisModel}):`, err?.message || err);
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

  // Model adını yanıta ekle
  if (analysis && !analysis.error) {
    analysis._analysisModel = analysisModel;
  }
  console.log(`[analyzePosterDesign] v2 — Yanıt gönderiliyor, _analysisModel=${analysis?._analysisModel || "YOK"}, keys=${Object.keys(analysis || {}).slice(0, 5).join(",")}`);

  res.json({ success: true, data: analysis });
}, { timeoutSeconds: 90, memory: "512MiB" });

// Hedef model bazlı prompt format talimatları (araştırma bazlı — OpenAI Cookbook, Midjourney Docs, Google Developers Blog)
const TARGET_MODEL_INSTRUCTIONS: Record<string, string> = {
  gemini: `Write a single flowing paragraph — Gemini responds best to narrative descriptions, not tags or bullet points.
Include camera specs: lens focal length (e.g. "85mm"), aperture (e.g. "f/2.8"), specific lighting with color temperature (e.g. "5500K daylight").
Specify composition with spatial directions: "product in the upper third", "negative space on the left".
Be descriptive about textures, materials, surfaces — Gemini excels at reproducing physical qualities.`,

  "dall-e": `Write as a structured, detailed description using complete sentences — GPT Image was trained on descriptive captions, not tag-based prompts.
STRUCTURE (this order matters — earlier elements get more weight):
1. Background/Scene: describe the environment, surface, atmosphere
2. Subject: the product — position, angle, scale, key visual details
3. Key Details: textures, toppings, colors, materials — be hyper-specific
4. Style/Medium: "professional commercial food photography", "studio product shot"
5. Technical: lighting setup (direction, quality, temperature), lens info, depth of field
6. Mood/Constraints: overall feeling, what to avoid

TEXT RENDERING RULES (GPT Image excels at this):
- Wrap ALL literal text in "double quotes"
- Specify font style: "elegant serif", "bold sans-serif", "light italic"
- Specify color: "warm cognac brown", "charcoal gray", "golden orange"
- Specify placement: "centered below the product", "upper right corner at 15-degree angle"
- Specify size relationship: "title large and commanding", "subtitle smaller and lighter"
- For brand names, spell letter-by-letter if accuracy matters: S-A-D-E
- Add: "crisp lettering, consistent spacing, no duplicate glyphs"

AVOID: generic quality words ("beautiful", "stunning", "amazing") — be specific instead.`,

  midjourney: `Write as comma-separated descriptive phrases — concise, evocative, no full sentences. Midjourney interprets mood and style from keywords.
STRUCTURE: subject and key details first, then environment, then style/medium, then lighting/mood.
Do NOT use :: (double colon) for word weights — it is NOT supported in Midjourney v7.
Keep total prompt under 60 words (before parameters) for best results. No explanations, no sentences.
Do NOT put --no inside the prompt text. All parameters go at the END.

OUTPUT FORMAT — return EXACTLY two sections separated by "---":

SECTION 1 (PROMPT): The complete, ready-to-paste Midjourney prompt. The prompt text followed by ALL parameters on the SAME LINE. End with: --ar 2:3 --v 7 --s 150 --q 2 --style raw --no blurry distorted watermark cartoon
This section must be a SINGLE block that can be directly pasted into Midjourney with no editing.

SECTION 2 (after ---): Parameter reference guide in Turkish:
• --ar 2:3 → Aspect ratio (poster için 2:3 ideal)
• --v 7 → Versiyon (8 alpha da denenebilir)
• --s 100-250 → Stilize (düşük=prompta sadık, yüksek=artistik)
• --q 2 → Kalite (2=standart, 4=yüksek detay)
• --style raw → Ham fotoğrafik çıktı (stilizasyon yok)
• --chaos 0-100 → Çeşitlilik (0=benzer, 30+=farklı varyasyonlar)
• --no → Hariç tutulacak öğeler`,

  flux: `Write a detailed descriptive paragraph in natural language — Flux responds well to flowing descriptions with specific visual details.
Include art direction: composition, framing, spatial arrangement.
Include lighting: type (studio, natural, cinematic), direction, quality.
Be explicit about style: "photographic commercial product shot" or "editorial illustration".
Flux handles text rendering well — include text in quotes with font and color descriptions.
Specify aspect ratio in the description: "tall portrait format, 2:3 ratio".
Include material/texture descriptions for realism: "buttery laminated layers", "crisp golden crust".`,
};

/**
 * Sadece prompt üret — görsel üretmeden, hedef modele özel optimize edilmiş prompt
 * POST /generatePosterPrompt
 * Body: { productImageBase64, productMimeType, styleId, moodId, aspectRatioId, typographyId?, layoutId?, title?, subtitle?, price?, targetModel, additionalNotes? }
 */
export const generatePosterPrompt = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  // ═══ LOG SİSTEMİ ═══
  const logs: Array<{ ts: number; phase: string; level: string; message: string; data?: any }> = [];
  const t0 = Date.now();
  const log = (phase: string, message: string, data?: any, level = "info") => {
    logs.push({ ts: Date.now() - t0, phase, level, message, data });
    console.log(`[PromptGen] ${level === "error" ? "❌" : "✓"} ${phase} | ${message}`);
  };

  const {
    productImageBase64, productImageUrl, productMimeType,
    styleId = "bold-minimal", moodId = "warm-intimate", aspectRatioId = "2-3",
    typographyId, subtitleTypographyId, layoutId, title, subtitle, price,
    targetModel = "gemini",
    additionalNotes,
    includeText = true,
    referenceImageBase64, referenceImageMimeType,
    removeBackground, keepObjects,
  } = req.body;

  log("INIT", "Prompt üretimi başladı", {
    hedefModel: targetModel,
    styleId, moodId, aspectRatioId,
    başlıkTipografisi: typographyId || "otomatik",
    altBaşlıkTipografisi: subtitleTypographyId || "otomatik",
    yerleşim: layoutId || "otomatik",
    başlık: title || "(AI üretecek)",
    altBaşlık: subtitle || "(AI üretecek)",
    fiyat: price || "(yok)",
    metinDahil: includeText,
    referansPoster: referenceImageBase64 ? "VAR" : "YOK",
    ekNotlar: additionalNotes || "(yok)",
    arkaplanKaldır: removeBackground || false,
    saklananObjeler: keepObjects || "(yok)",
  });

  if (!productImageBase64 && !productImageUrl) {
    log("INIT", "Ürün görseli eksik", undefined, "error");
    res.status(400).json({ success: false, error: "Ürün görseli gerekli.", logs });
    return;
  }

  const systemSettings = await getSystemSettings();
  const anthropicApiKey = systemSettings?.anthropicApiKey;
  const openRouterApiKey = (systemSettings as any)?.openRouterApiKey;
  const promptModel = (systemSettings as any)?.posterPromptModel || "claude-haiku-4-5-20251001";
  const isAnthropicPromptModel = !promptModel.includes("/");

  if (isAnthropicPromptModel && !anthropicApiKey) {
    log("CONFIG", "Anthropic API key tanımlı değil", undefined, "error");
    res.status(400).json({ success: false, error: "Anthropic API key tanımlı değil.", logs });
    return;
  }
  if (!isAnthropicPromptModel && !openRouterApiKey) {
    log("CONFIG", "OpenRouter API key tanımlı değil", undefined, "error");
    res.status(400).json({ success: false, error: "OpenRouter API key tanımlı değil (Ayarlar > API Ayarları).", logs });
    return;
  }

  // Config oku
  const configStart = Date.now();
  const [style, mood, aspectRatio, typography, subtitleTypography, layout] = await Promise.all([
    getPosterStyleById(styleId),
    getPosterMoodById(moodId),
    getPosterAspectRatioById(aspectRatioId),
    typographyId ? getPosterTypographyById(typographyId) : Promise.resolve(null),
    subtitleTypographyId ? getPosterTypographyById(subtitleTypographyId) : Promise.resolve(null),
    layoutId ? getPosterLayoutById(layoutId) : Promise.resolve(null),
  ]);

  log("CONFIG", "Firestore config yüklendi", {
    süre: `${Date.now() - configStart}ms`,
    stil: style?.name || "bulunamadı",
    stilAçıklama: style?.description || "",
    mood: mood?.name || "bulunamadı",
    ratio: aspectRatio ? `${aspectRatio.width}:${aspectRatio.height}` : "bulunamadı",
    tipografi: typography?.name || "otomatik",
    yerleşim: layout?.name || "otomatik",
  });

  // Görsel hazırla
  let imageBase64 = productImageBase64;
  let imageMimeType = productMimeType || "image/jpeg";
  if (!imageBase64 && productImageUrl) {
    const fetchResponse = await fetch(productImageUrl);
    const buffer = await fetchResponse.arrayBuffer();
    imageBase64 = Buffer.from(buffer).toString("base64");
    imageMimeType = fetchResponse.headers.get("content-type") || "image/jpeg";
  }

  const imageSizeKB = Math.round((imageBase64.length * 3 / 4) / 1024);
  log("CONFIG", "Ürün görseli hazır", { boyut: `${imageSizeKB} KB`, mimeType: imageMimeType });

  if (referenceImageBase64) {
    const refSizeKB = Math.round((referenceImageBase64.length * 3 / 4) / 1024);
    log("CONFIG", "Referans poster yüklendi", { boyut: `${refSizeKB} KB`, mimeType: referenceImageMimeType || "image/jpeg" });
  }

  // Model bazlı format talimatı
  const modelInstruction = TARGET_MODEL_INSTRUCTIONS[targetModel] || TARGET_MODEL_INSTRUCTIONS.gemini;

  log("PROMPT-BUILD", "Model talimatı seçildi", { model: targetModel, talimatUzunluk: `${modelInstruction.length} karakter` });

  // Metin talimatı — boş alanlar için açık yasak eklenir
  const textParts: string[] = [];
  if (title) textParts.push(`Title: "${title}"`);
  if (subtitle) textParts.push(`Subtitle: "${subtitle}"`);
  if (price) textParts.push(`Price: "₺${price.replace("₺", "")}"`);
  textParts.push(`Brand: "SADE PATISSERIE" (small, bottom area)`);

  const textForbidden: string[] = [];
  if (!subtitle) textForbidden.push("NO subtitle, tagline, or secondary line");
  if (!price) textForbidden.push("NO price, cost, or any numeric value");

  const textInstruction = includeText
    ? [
        `EXACT TEXT TO RENDER IN THE POSTER (use only these, nothing else):`,
        textParts.map(p => `  - ${p}`).join("\n"),
        textForbidden.length > 0
          ? `STRICTLY FORBIDDEN — do NOT add:\n${textForbidden.map(f => `  - ${f}`).join("\n")}`
          : "",
        `Do NOT invent, hallucinate, or add any text not listed above.`,
      ].filter(Boolean).join("\n")
    : `Do NOT include any text in the image. Leave clean space in the lower third for programmatic text overlay.`;

  // System prompt
  const globalRulesData = await getGlobalRules();
  const rulesText = globalRulesData.rules.length > 0
    ? `\n\nMANDATORY RULES:\n${globalRulesData.rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
    : "";

  const correctionsText = style.learnedCorrections && Object.keys(style.learnedCorrections).length > 0
    ? `\n\nLEARNED CORRECTIONS:\n${Object.entries(style.learnedCorrections).map(([k, v]) => `- ${k}: ${v}`).join("\n")}`
    : "";

  const systemPrompt = `You are an elite poster prompt engineer. You write optimized image generation prompts for different AI models.

TARGET MODEL: ${targetModel.toUpperCase()}
FORMAT INSTRUCTIONS: ${modelInstruction}

DESIGN STYLE: ${style.name} — ${style.description}
Background: ${style.promptDirections.background}
Typography: ${style.promptDirections.typography}
Layout: ${style.promptDirections.layout}
Color Palette: ${style.promptDirections.colorPalette}
Product Placement: ${style.promptDirections.productPlacement}
Lighting: ${style.promptDirections.lighting}
Overall Feel: ${style.promptDirections.overallFeel}

MOOD: ${mood.name}
Color Shift: ${mood.promptModifiers.colorShift}
Lighting: ${mood.promptModifiers.lightingAdjust}
Texture: ${mood.promptModifiers.textureNote}
Atmosphere: ${mood.promptModifiers.atmosphereNote}

ASPECT RATIO: ${aspectRatio.promptInstruction}
${typography ? `\nTITLE TYPOGRAPHY: ${typography.promptInstruction}` : ""}
${subtitleTypography ? `\nSUBTITLE TYPOGRAPHY: ${subtitleTypography.promptInstruction}` : ""}
${layout ? `\nLAYOUT: ${layout.promptInstruction}` : ""}
${rulesText}${correctionsText}${style.backgroundHex ? `

⚠️ MANDATORY BACKGROUND COLOR OVERRIDE:
The user has explicitly chosen background color: ${style.backgroundHex}
You MUST use this exact color as the dominant background color of the poster.
Do NOT use white, cream, or any other background color — use ${style.backgroundHex} and its tonal variations.
This overrides any background color described in the style directions above.` : ""}

${textInstruction}
${referenceImageBase64 ? `
REFERENCE POSTER: A reference poster image is provided as the SECOND image. You MUST:
1. Analyze its layout, composition, spacing, and visual hierarchy
2. Identify its color palette, lighting style, and background treatment
3. Note its typography style, font weight, text placement, and size relationships
4. Observe its product positioning, angle, and negative space usage
5. Replicate the same visual DNA in your prompt — but with the product from the FIRST image
Do NOT describe the reference poster itself — use it as a style template for the new prompt.` : ""}
${removeBackground ? `
BACKGROUND REMOVAL MODE — ACTIVE:
${keepObjects ? `Isolate the main product along with these objects: ${keepObjects}.` : "Isolate ONLY the main product (plate included if present)."}
Remove the entire background.${targetModel === "dall-e" ? " Place on a pure white background, seamless, no shadows on background." : " Create a perfectly clean transparent background (alpha channel)."}
Preserve realistic food textures: crispy bread, melted cheese flow, fresh greens, plate material quality.
Keep subtle natural contact shadows directly under the product only.
No floating look, no artificial drop shadow.
Edges must be ultra-clean and precise — no halo, no white edges, no jagged mask, no color spill.
Maintain color accuracy and lighting direction from the original photo.
${targetModel !== "dall-e" ? "Export as high-resolution PNG with full transparency." : ""}
Premium food photography cutout, editorial quality.
The prompt you write MUST prominently include these background removal instructions. This overrides any background style selection.` : ""}

CRITICAL — PRODUCT REFERENCE RULE:
The user will upload the product photo directly to the AI image generator alongside your prompt.
Therefore, do NOT describe the product's appearance in the prompt. No color, shape, texture, topping descriptions.
Instead, refer to the product generically: "this product", "the product", "the pastry" etc.
${removeBackground
    ? "Since BACKGROUND REMOVAL MODE is active: Do NOT describe any background scene, environment, or setting. Focus entirely on isolating the product with clean edges, preserved textures, contact shadows, and transparent (or white) background."
    : "The prompt should ONLY describe: background, composition, lighting, atmosphere, layout, text placement, camera angle, mood — everything EXCEPT the product itself."}
The AI generator already sees the product photo — your job is to describe the ${removeBackground ? "isolation and cutout quality" : "SCENE and DESIGN around it"}.

Analyze the product image carefully and write the prompt. Return EXACTLY:

ANALYSIS:
(2-3 lines — what you observe about the product, for your own understanding only${referenceImageBase64 ? " + how you'll adapt the reference poster's style" : ""})

PROMPT:
(The optimized prompt for ${targetModel.toUpperCase()} — ready to copy-paste. Do NOT describe the product. ${removeBackground ? "Focus on background removal, edge quality, shadow handling, and transparency." : "Describe only the scene, composition, background, lighting, typography, and design elements around it."})`;

  log("PROMPT-BUILD", "System prompt hazırlandı", {
    uzunluk: `${systemPrompt.length} karakter`,
    globalKuralSayısı: globalRulesData.rules?.length || 0,
    öğrenilmişDüzeltmeSayısı: Object.keys(style.learnedCorrections || {}).length,
    referansPosterTalimatı: referenceImageBase64 ? "dahil edildi" : "yok",
  });
  log("PROMPT-BUILD", "System prompt tam metin", { systemPrompt });

  // AI çağrısı — Anthropic veya OpenRouter
  log("CLAUDE", "AI çağrısı başlıyor", { model: promptModel, provider: isAnthropicPromptModel ? "Anthropic" : "OpenRouter" });
  const claudeStart = Date.now();

  const userText = `Write an optimized ${targetModel.toUpperCase()} prompt for a poster with this product.${referenceImageBase64 ? " Use the SECOND image as a style/layout reference." : ""}${additionalNotes ? ` Notes: ${additionalNotes}` : ""}`;

  let fullResponse: string;
  let inputTokens = 0;
  let outputTokens = 0;

  if (isAnthropicPromptModel) {
    // Anthropic SDK
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const messageContent: any[] = [
      { type: "image", source: { type: "base64", media_type: imageMimeType as any, data: imageBase64 } },
    ];
    if (referenceImageBase64) {
      messageContent.push(
        { type: "image", source: { type: "base64", media_type: (referenceImageMimeType || "image/jpeg") as any, data: referenceImageBase64 } },
      );
    }
    messageContent.push({ type: "text", text: userText });

    log("CLAUDE", "Mesaj içeriği hazırlandı", {
      görseller: referenceImageBase64 ? "ürün + referans poster (2 görsel)" : "sadece ürün (1 görsel)",
      kullanıcıMesajı: userText,
    });

    const claudeResult = await anthropic.messages.create({
      model: promptModel,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: messageContent }],
    });

    fullResponse = claudeResult.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map(b => b.text).join("").trim();
    inputTokens = claudeResult.usage?.input_tokens || 0;
    outputTokens = claudeResult.usage?.output_tokens || 0;
  } else {
    // OpenRouter — OpenAI-compatible
    const orContent: any[] = [
      { type: "image_url", image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } },
    ];
    if (referenceImageBase64) {
      orContent.push(
        { type: "image_url", image_url: { url: `data:${referenceImageMimeType || "image/jpeg"};base64,${referenceImageBase64}` } },
      );
    }
    orContent.push({ type: "text", text: userText });

    log("CLAUDE", "OpenRouter mesaj hazırlandı", {
      görseller: referenceImageBase64 ? "ürün + referans poster (2 görsel)" : "sadece ürün (1 görsel)",
      kullanıcıMesajı: userText,
    });

    const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://instagram-automation-ad77b.web.app",
      },
      body: JSON.stringify({
        model: promptModel,
        max_tokens: 1500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: orContent },
        ],
      }),
    });
    const orData = await orResponse.json() as any;
    if (!orResponse.ok) {
      const errMsg = orData?.error?.message || JSON.stringify(orData?.error) || "Bilinmeyen hata";
      throw new Error(`OpenRouter (${promptModel}): ${errMsg}`);
    }
    fullResponse = (orData.choices?.[0]?.message?.content || "").trim();
    inputTokens = orData.usage?.prompt_tokens || 0;
    outputTokens = orData.usage?.completion_tokens || 0;
  }

  const claudeDuration = Date.now() - claudeStart;
  const cost = (inputTokens * 0.001 + outputTokens * 0.005) / 1000;

  log("CLAUDE", "AI yanıtı alındı", {
    süre: `${claudeDuration}ms`,
    inputTokens,
    outputTokens,
    maliyet: `$${cost.toFixed(6)}`,
    yanıtUzunluk: `${fullResponse.length} karakter`,
  });

  // ANALYSIS ve PROMPT ayır
  const analysisMatch = fullResponse.match(/ANALYSIS:\s*([\s\S]*?)(?=PROMPT:)/i);
  const promptMatch = fullResponse.match(/PROMPT:\s*([\s\S]*?)$/i);

  const analysis = analysisMatch?.[1]?.trim() || "";
  let generatedPrompt = promptMatch?.[1]?.trim() || fullResponse;

  // Midjourney: --- ayracından sonrasını kaldır
  if (targetModel === "midjourney" && generatedPrompt.includes("---")) {
    const before = generatedPrompt;
    generatedPrompt = generatedPrompt.split("---")[0].trim();
    log("POST-PROCESS", "Midjourney --- ayracı temizlendi", { kaldırılan: `${before.length - generatedPrompt.length} karakter` });
  }

  log("SONUÇ", "Ürün analizi", { analiz: analysis });
  log("SONUÇ", "Üretilen prompt", { prompt: generatedPrompt });

  const totalDuration = Date.now() - t0;
  log("ÖZET", "Prompt üretimi tamamlandı", {
    toplamSüre: `${(totalDuration / 1000).toFixed(1)}sn`,
    hedefModel: targetModel,
    maliyet: `$${cost.toFixed(6)}`,
    referansPoster: referenceImageBase64 ? "kullanıldı" : "kullanılmadı",
    promptUzunluk: `${generatedPrompt.length} karakter`,
  });

  res.json({
    success: true,
    data: {
      prompt: generatedPrompt,
      analysis,
      targetModel,
      style: style.name,
      mood: mood.name,
      cost,
      logs,
    },
  });
}, { timeoutSeconds: 60, memory: "512MiB" });

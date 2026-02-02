/**
 * Gemini Prompt Builder
 * Gemini-native terminoloji kullanarak prompt oluşturur
 *
 * Bu modül GEMINI-TERMINOLOGY-DICTIONARY.md'deki terminolojiyi kullanır
 * ve Firestore'daki preset'lerden veri çeker.
 */

import { getFirestore } from "firebase-admin/firestore";
import { MoodService } from "../services/moodService";
import { getBusinessContext } from "../services/configService";

// Gemini Terminology Types
export interface GeminiMoodDefinition {
  id: string;
  name: string;
  nameEn: string;
  geminiAtmosphere: string;
  lighting: string;
  temperature: string; // Kelvin (3000K, 3500K, 5000K, etc.)
  colorPalette: string[];
  timeOfDay: string[];
  bestFor: string[];
}

export interface GeminiLightingPreset {
  id: string;
  name: string;
  nameEn: string;
  direction: string; // backlighting, side-lighting-45, rim-lighting, diffused-window
  quality: string; // soft, hard, diffused
  temperature: string;
  geminiTerms: string[];
  geminiPrompt: string;
  bestFor: string[];
}

export interface GeminiHandPose {
  id: string;
  name: string;
  nameEn: string;
  geminiPrompt: string;
  skinTone: string;
  nailStyle: string;
  entryPoint: string; // bottom-right, bottom-left, right-side, top-down
  bestFor: string[];
}

export interface GeminiCompositionTemplate {
  id: string;
  name: string;
  nameEn: string;
  entryPoint: string;
  geminiPrompt: string;
  cameraAngle: string;
  subjectPlacement: string;
}

export interface GeminiNegativePromptSet {
  id: string;
  category: string;
  terms: string[];
  priority: number;
}

export interface GeminiProductTextureProfile {
  id: string;
  productType: string;
  geminiTerms: string[];
  geminiPrompt: string;
  focusAreas: string[];
}

// Cache for loaded presets (performance optimization)
let cachedPresets: {
  moods: GeminiMoodDefinition[];
  lighting: GeminiLightingPreset[];
  handPoses: GeminiHandPose[];
  compositions: GeminiCompositionTemplate[];
  negativePrompts: GeminiNegativePromptSet[];
  textureProfiles: GeminiProductTextureProfile[];
  loadedAt: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 dakika cache

/**
 * Gemini preset'lerini Firestore'dan yükle (cache'li)
 */
export async function loadGeminiPresets(): Promise<typeof cachedPresets> {
  // Cache kontrolü
  if (cachedPresets && Date.now() - cachedPresets.loadedAt < CACHE_TTL) {
    return cachedPresets;
  }

  const db = getFirestore();
  const presetsRef = db.collection("global").doc("config").collection("gemini-presets");

  try {
    // Paralel yükleme
    const [
      lightingDocs,
      handPoseDocs,
      compositionDocs,
      moodDocs,
      textureDocs,
      negativeDocs,
    ] = await Promise.all([
      presetsRef.doc("lighting-presets").collection("items").get(),
      presetsRef.doc("hand-poses").collection("items").get(),
      presetsRef.doc("composition-templates").collection("items").get(),
      presetsRef.doc("mood-definitions").collection("items").get(),
      presetsRef.doc("product-textures").collection("items").get(),
      presetsRef.doc("negative-prompts").collection("items").get(),
    ]);

    cachedPresets = {
      moods: moodDocs.docs.map(doc => ({ id: doc.id, ...doc.data() } as GeminiMoodDefinition)),
      lighting: lightingDocs.docs.map(doc => ({ id: doc.id, ...doc.data() } as GeminiLightingPreset)),
      handPoses: handPoseDocs.docs.map(doc => ({ id: doc.id, ...doc.data() } as GeminiHandPose)),
      compositions: compositionDocs.docs.map(doc => ({ id: doc.id, ...doc.data() } as GeminiCompositionTemplate)),
      negativePrompts: negativeDocs.docs.map(doc => ({ id: doc.id, ...doc.data() } as GeminiNegativePromptSet)),
      textureProfiles: textureDocs.docs.map(doc => ({ id: doc.id, ...doc.data() } as GeminiProductTextureProfile)),
      loadedAt: Date.now(),
    };

    console.log(`[GeminiPromptBuilder] Loaded presets: ${cachedPresets.moods.length} moods, ${cachedPresets.lighting.length} lighting, ${cachedPresets.handPoses.length} hand poses`);

    return cachedPresets;
  } catch (error) {
    console.error("[GeminiPromptBuilder] Failed to load presets:", error);
    // Fallback to hardcoded defaults if Firestore fails
    return getDefaultPresets();
  }
}

/**
 * Hardcoded default presets (Firestore erişimi başarısız olursa)
 */
function getDefaultPresets(): typeof cachedPresets {
  return {
    moods: [
      {
        id: "morning-ritual",
        name: "Sabah Ritüeli",
        nameEn: "Morning Ritual",
        geminiAtmosphere: "Bright and airy, fresh morning energy, clean minimal aesthetic",
        lighting: "Natural morning light, soft shadows",
        temperature: "5500K",
        colorPalette: ["white", "cream", "light wood", "pastel"],
        timeOfDay: ["morning"],
        bestFor: ["breakfast", "coffee", "croissants"],
      },
      {
        id: "cozy-intimate",
        name: "Samimi/Sıcak",
        nameEn: "Cozy Intimate",
        geminiAtmosphere: "Warm and inviting, intimate gathering, comfortable homey feeling",
        lighting: "Warm tungsten accent, soft diffused",
        temperature: "3000K",
        colorPalette: ["warm brown", "cream", "burnt orange", "gold"],
        timeOfDay: ["evening", "night"],
        bestFor: ["comfort food", "sharing moments", "hot drinks"],
      },
      {
        id: "bright-airy",
        name: "Aydınlık/Ferah",
        nameEn: "Bright Airy",
        geminiAtmosphere: "Clean contemporary aesthetic, bright editorial style, minimalist elegance",
        lighting: "Soft diffused daylight, minimal shadows",
        temperature: "5000K",
        colorPalette: ["white", "marble", "light grey", "sage"],
        timeOfDay: ["morning", "noon", "afternoon"],
        bestFor: ["modern presentation", "editorial", "product focus"],
      },
    ],
    lighting: [
      {
        id: "soft-diffused",
        name: "Yumuşak Yayılmış",
        nameEn: "Soft Diffused",
        direction: "diffused-window",
        quality: "soft",
        temperature: "5000K",
        geminiTerms: ["soft diffused natural light", "gentle shadows", "even illumination"],
        geminiPrompt: "Soft diffused natural light, gentle shadows, even illumination",
        bestFor: ["croissants", "cakes", "cookies"],
      },
      {
        id: "dramatic-side",
        name: "Dramatik Yan Işık",
        nameEn: "Dramatic Side Light",
        direction: "side-lighting-45",
        quality: "hard",
        temperature: "3500K",
        geminiTerms: ["dramatic side-lighting", "45 degrees", "defined shadows", "texture emphasis"],
        geminiPrompt: "Dramatic side-lighting at 45 degrees, defined shadows, texture emphasis",
        bestFor: ["chocolates", "macarons", "dark pastries"],
      },
      {
        id: "golden-backlight",
        name: "Altın Arka Işık",
        nameEn: "Golden Backlight",
        direction: "backlighting",
        quality: "soft",
        temperature: "3200K",
        geminiTerms: ["warm backlighting", "golden rim light", "subsurface glow"],
        geminiPrompt: "Warm backlighting, golden rim light, subsurface glow",
        bestFor: ["bread", "croissants", "honey glazed"],
      },
    ],
    handPoses: [
      {
        id: "cupping",
        name: "Kavrama",
        nameEn: "Cupping",
        geminiPrompt: "Elegant feminine hands gently cupping, protective hold, nurturing gesture",
        skinTone: "warm olive",
        nailStyle: "natural short nails, subtle nude polish",
        entryPoint: "bottom-right",
        bestFor: ["warm drinks", "delicate items", "round objects"],
      },
      {
        id: "pinching",
        name: "Tutma",
        nameEn: "Pinching",
        geminiPrompt: "Delicate pinch grip between thumb and fingers, refined gesture, precise hold",
        skinTone: "warm olive",
        nailStyle: "natural manicure",
        entryPoint: "bottom-right",
        bestFor: ["small pastries", "chocolates", "macarons"],
      },
      {
        id: "breaking",
        name: "Kırma",
        nameEn: "Breaking",
        geminiPrompt: "Hands gently breaking apart, revealing interior texture, discovery moment",
        skinTone: "warm olive",
        nailStyle: "natural nails",
        entryPoint: "center",
        bestFor: ["bread", "croissants", "filled pastries"],
      },
    ],
    compositions: [
      {
        id: "bottom-right",
        name: "Sağ Alt Köşe",
        nameEn: "Bottom Right Entry",
        entryPoint: "bottom-right",
        geminiPrompt: "Hand entering frame from bottom-right corner",
        cameraAngle: "45-degree",
        subjectPlacement: "center",
      },
      {
        id: "overhead",
        name: "Kuşbakışı",
        nameEn: "Overhead",
        entryPoint: "top-down",
        geminiPrompt: "Overhead view with hands from top",
        cameraAngle: "90-degree",
        subjectPlacement: "center",
      },
    ],
    negativePrompts: [
      {
        id: "always-avoid",
        category: "always",
        terms: [
          "steam", "smoke", "vapor",
          "stacked plates", "plates on top of each other",
          "multiple same products", "duplicates",
          "text", "watermarks", "logos",
          "artificial", "plastic appearance",
        ],
        priority: 1,
      },
      {
        id: "hand-avoid",
        category: "hands",
        terms: [
          "deformed fingers", "extra fingers",
          "unnatural hand position",
          "floating hands",
        ],
        priority: 2,
      },
    ],
    textureProfiles: [
      {
        id: "croissant",
        productType: "croissants",
        geminiTerms: ["golden-brown laminated layers", "flaky buttery exterior", "visible honeycomb crumb structure"],
        geminiPrompt: "Perfectly laminated croissant showing golden-brown flaky layers, visible honeycomb interior structure",
        focusAreas: ["lamination", "color gradient", "flakiness"],
      },
      {
        id: "chocolate",
        productType: "chocolates",
        geminiTerms: ["glossy tempered surface", "sharp snap lines", "mirror-like sheen"],
        geminiPrompt: "Professionally tempered chocolate with glossy mirror-like surface, sharp clean edges",
        focusAreas: ["temper shine", "surface quality", "edge definition"],
      },
    ],
    loadedAt: Date.now(),
  };
}

/**
 * Mood ID'den Gemini atmosfer tanımını al
 */
export async function getMoodAtmosphere(moodId: string): Promise<GeminiMoodDefinition | null> {
  const presets = await loadGeminiPresets();
  if (!presets) return null;

  return presets.moods.find(m => m.id === moodId) || null;
}

/**
 * Lighting preset ID'den Gemini ışık tanımını al
 */
export async function getLightingPreset(presetId: string): Promise<GeminiLightingPreset | null> {
  const presets = await loadGeminiPresets();
  if (!presets) return null;

  return presets.lighting.find(l => l.id === presetId) || null;
}

/**
 * Hand pose ID'den Gemini el pozu tanımını al
 */
export async function getHandPose(poseId: string): Promise<GeminiHandPose | null> {
  const presets = await loadGeminiPresets();
  if (!presets) return null;

  return presets.handPoses.find(h => h.id === poseId) || null;
}

/**
 * Composition ID'den Gemini kompozisyon şablonunu al
 */
export async function getCompositionTemplate(compositionId: string): Promise<GeminiCompositionTemplate | null> {
  const presets = await loadGeminiPresets();
  if (!presets) return null;

  return presets.compositions.find(c => c.id === compositionId) || null;
}

/**
 * Ürün tipine göre texture profile al
 */
export async function getTextureProfile(productType: string): Promise<GeminiProductTextureProfile | null> {
  const presets = await loadGeminiPresets();
  if (!presets) return null;

  return presets.textureProfiles.find(t => t.productType === productType) || null;
}

/**
 * Tüm negative prompt'ları birleştir
 */
export async function buildNegativePrompt(categories?: string[]): Promise<string> {
  const presets = await loadGeminiPresets();
  if (!presets) {
    // Fallback to basic negatives
    return "steam, smoke, stacked plates, duplicates, deformed fingers, text, watermarks";
  }

  let negatives = presets.negativePrompts;

  // Kategori filtresi varsa uygula
  if (categories && categories.length > 0) {
    negatives = negatives.filter(n => categories.includes(n.category) || n.category === "always");
  }

  // Priority'ye göre sırala ve birleştir
  const sortedTerms = negatives
    .sort((a, b) => a.priority - b.priority)
    .flatMap(n => n.terms);

  // Unique terms
  const uniqueTerms = [...new Set(sortedTerms)];

  return uniqueTerms.join(", ");
}

/**
 * Zamana göre en uygun mood'u öner
 */
export async function suggestMoodForTime(timeOfDay: string): Promise<GeminiMoodDefinition | null> {
  // 1. Dinamik Mood Servisi'nden mood ara
  try {
    const moodService = new MoodService();

    // Mevsimi belirle
    const month = new Date().getMonth(); // 0-11
    let season: "winter" | "spring" | "summer" | "autumn" = "winter";
    if (month >= 2 && month <= 4) season = "spring";
    else if (month >= 5 && month <= 7) season = "summer";
    else if (month >= 8 && month <= 10) season = "autumn";

    const hour = new Date().getHours();

    // Servisten eşleşen moodları al
    const matchingMoods = await moodService.getMatchingMoods(hour, season);

    if (matchingMoods.length > 0) {
      // Rastgele bir mood seç
      const randomMood = matchingMoods[Math.floor(Math.random() * matchingMoods.length)];

      console.log(`[GeminiPromptBuilder] Selected dynamic mood: ${randomMood.name} (${randomMood.id})`);

      // GeminiMoodDefinition formatına dönüştür
      return {
        id: randomMood.id,
        name: randomMood.name,
        nameEn: randomMood.name,
        geminiAtmosphere: randomMood.description,
        lighting: randomMood.lightingPrompt,
        temperature: "warm/neutral/cool", // Mood içinde opsiyonel olabilir, şimdilik generic
        colorPalette: [randomMood.colorGradePrompt],
        timeOfDay: [randomMood.timeOfDay],
        bestFor: []
      };
    }
  } catch (error) {
    console.warn("[GeminiPromptBuilder] Failed to fetch dynamic moods:", error);
  }

  // 2. Fallback: Legacy presets
  const presets = await loadGeminiPresets();
  if (!presets) return null;

  // timeOfDay'e uygun mood bul
  const suitable = presets.moods.find(m => m.timeOfDay.includes(timeOfDay));

  // Bulamazsa fallback
  return suitable || presets.moods[0] || null;
}

/**
 * Ürün tipine göre en uygun ışık preset'ini öner
 */
export async function suggestLightingForProduct(productType: string): Promise<GeminiLightingPreset | null> {
  const presets = await loadGeminiPresets();
  if (!presets) return null;

  // Ürün tipine uygun ışık bul
  const suitable = presets.lighting.find(l => l.bestFor.includes(productType));

  // Bulamazsa ilk preset'i kullan (soft-diffused genelde güvenli)
  return suitable || presets.lighting[0] || null;
}

/**
 * Prompt building karar adımı
 */
interface PromptBuildingStep {
  step: string;
  input: string | null;
  matched: boolean;
  result: string | null;
  fallback: boolean;
  details?: Record<string, unknown>;
}

/**
 * Senaryo için tam Gemini prompt oluştur
 * Bu fonksiyon orchestrator.ts'deki buildDynamicPrompt'un yerini alabilir
 *
 * decisions dizisi: Her karar noktasını kaydeder (eşleşme, fallback, sonuç)
 */
export async function buildGeminiPrompt(params: {
  moodId?: string;
  lightingPresetId?: string;
  handPoseId?: string;
  compositionId?: string;
  productType?: string;
  includesHands: boolean;
  timeOfDay: string;
  // Asset etiketleri - Gemini'ye constraint olarak gönderilir
  assetTags?: {
    product?: string[];
    plate?: string[];
    table?: string[];
    cup?: string[];
    accessory?: string[];
    napkin?: string[];
  };
}): Promise<{
  mainPrompt: string;
  negativePrompt: string;
  metadata: {
    mood?: GeminiMoodDefinition;
    lighting?: GeminiLightingPreset;
    handPose?: GeminiHandPose;
    composition?: GeminiCompositionTemplate;
    textureProfile?: GeminiProductTextureProfile;
  };
  decisions: PromptBuildingStep[];
}> {
  const decisions: PromptBuildingStep[] = [];
  const presets = await loadGeminiPresets();

  // === KARAR 1: Mood / Atmosfer Seçimi ===
  let mood: GeminiMoodDefinition | null | undefined;
  if (params.moodId) {
    // moodId verilmiş → preset'te ara
    mood = presets?.moods.find(m => m.id === params.moodId);
    decisions.push({
      step: "mood-selection",
      input: params.moodId,
      matched: !!mood,
      result: mood ? `${mood.name} (${mood.id})` : null,
      fallback: false,
      details: mood
        ? { atmosphere: mood.geminiAtmosphere, lighting: mood.lighting, temperature: mood.temperature, colorPalette: mood.colorPalette }
        : { availablePresetIds: presets?.moods.map(m => m.id) || [], reason: `moodId "${params.moodId}" preset listesinde bulunamadı` },
    });
  } else {
    // moodId yok → zamana göre öner
    mood = await suggestMoodForTime(params.timeOfDay);
    decisions.push({
      step: "mood-selection",
      input: null,
      matched: !!mood,
      result: mood ? `${mood.name} (${mood.id})` : null,
      fallback: true,
      details: mood
        ? { atmosphere: mood.geminiAtmosphere, source: "suggestMoodForTime", timeOfDay: params.timeOfDay }
        : { reason: "suggestMoodForTime sonuç döndürmedi", timeOfDay: params.timeOfDay },
    });
  }

  // === KARAR 2: Işık Seçimi ===
  let lighting: GeminiLightingPreset | null | undefined;
  if (params.lightingPresetId) {
    lighting = presets?.lighting.find(l => l.id === params.lightingPresetId);
    decisions.push({
      step: "lighting-selection",
      input: params.lightingPresetId,
      matched: !!lighting,
      result: lighting ? `${lighting.name} (${lighting.id})` : null,
      fallback: false,
      details: lighting
        ? { geminiPrompt: lighting.geminiPrompt, temperature: lighting.temperature, direction: lighting.direction }
        : { availablePresetIds: presets?.lighting.map(l => l.id) || [], reason: `lightingPresetId "${params.lightingPresetId}" bulunamadı` },
    });
  } else if (mood && mood.lighting) {
    // === FIX START ===
    // ÖNCELİK DÜZELTMESİ: Eğer Mood'un kendi ışığı varsa, Ürün Default ışığını ezmeliyiz.
    // lighting değişkenini null bırakıyoruz ki aşağıda (Satır 633) mood.lighting kullanılsın.
    lighting = null;
    decisions.push({
      step: "lighting-selection",
      input: mood.id,
      matched: true,
      result: `Mood lighting önceliklendirildi: ${mood.lighting}`,
      fallback: false,
      details: { reason: "Mood lighting takes precedence over Product Default", moodId: mood.id }
    });
  } else if (params.productType) {
    lighting = await suggestLightingForProduct(params.productType);
    decisions.push({
      step: "lighting-selection",
      input: null,
      matched: !!lighting,
      result: lighting ? `${lighting.name} (${lighting.id})` : null,
      fallback: true,
      details: lighting
        ? { geminiPrompt: lighting.geminiPrompt, source: "suggestLightingForProduct", productType: params.productType }
        : { reason: "suggestLightingForProduct sonuç döndürmedi", productType: params.productType },
    });
  } else {
    // Ne lightingPresetId ne productType var → ışık yok
    lighting = null;
    const useMoodLighting = !!(mood && mood.lighting);
    decisions.push({
      step: "lighting-selection",
      input: null,
      matched: false,
      result: useMoodLighting ? `Mood lighting kullanılacak: ${mood!.lighting}` : null,
      fallback: useMoodLighting,
      details: { reason: "lightingPresetId ve productType verilmedi", useMoodLightingFallback: useMoodLighting },
    });
  }

  // === KARAR 3: El Pozu ===
  const handPose = params.includesHands && params.handPoseId
    ? presets?.handPoses.find(h => h.id === params.handPoseId)
    : null;

  if (params.includesHands) {
    decisions.push({
      step: "hand-pose-selection",
      input: params.handPoseId || null,
      matched: !!handPose,
      result: handPose ? `${handPose.name} (${handPose.id})` : null,
      fallback: false,
      details: handPose
        ? { geminiPrompt: handPose.geminiPrompt, skinTone: handPose.skinTone }
        : params.handPoseId
          ? { reason: `handPoseId "${params.handPoseId}" bulunamadı` }
          : { reason: "handPoseId verilmedi" },
    });
  }

  // === KARAR 4: Kompozisyon ===
  const composition = params.compositionId
    ? presets?.compositions.find(c => c.id === params.compositionId)
    : null;

  if (params.compositionId) {
    decisions.push({
      step: "composition-selection",
      input: params.compositionId,
      matched: !!composition,
      result: composition ? `${composition.name} (${composition.id})` : null,
      fallback: false,
      details: composition
        ? { geminiPrompt: composition.geminiPrompt, cameraAngle: composition.cameraAngle }
        : { reason: `compositionId "${params.compositionId}" bulunamadı` },
    });
  }

  // === KARAR 5: Ürün Dokusu ===
  const textureProfile = params.productType
    ? await getTextureProfile(params.productType)
    : null;

  decisions.push({
    step: "texture-profile",
    input: params.productType || null,
    matched: !!textureProfile,
    result: textureProfile ? `${textureProfile.productType} profili` : null,
    fallback: false,
    details: textureProfile
      ? { geminiPrompt: textureProfile.geminiPrompt, focusAreas: textureProfile.focusAreas }
      : { reason: params.productType ? `"${params.productType}" için profil bulunamadı` : "productType verilmedi" },
  });

  // === PROMPT OLUŞTURMA ===
  const promptParts: string[] = [];

  // 1. Format ve context
  promptParts.push("Using uploaded image as reference for the product.");
  promptParts.push("");
  promptParts.push("Professional lifestyle Instagram photo for Sade Patisserie.");
  promptParts.push("");

  // 2. Atmosfer (mood)
  if (mood) {
    promptParts.push(`ATMOSPHERE: ${mood.geminiAtmosphere}`);
    promptParts.push(`Color palette: ${mood.colorPalette.join(", ")}`);
    promptParts.push("");
  }

  // 3. Işık
  let lightingSource = "none";
  if (lighting) {
    promptParts.push(`LIGHTING:`);
    promptParts.push(`- ${lighting.geminiPrompt}`);
    promptParts.push(`- Color temperature: ${lighting.temperature}`);
    promptParts.push(`- Shallow depth of field (f/2.0)`);
    promptParts.push("");
    lightingSource = "preset";
  } else if (mood && mood.lighting) {
    // Lighting preset yoksa MOOD lighting kullan
    promptParts.push(`LIGHTING:`);
    promptParts.push(`- ${mood.lighting}`);
    promptParts.push(`- Shallow depth of field (f/2.0)`);
    promptParts.push("");
    lightingSource = "mood-fallback";
  }

  // Işık kaynağını kaydet
  decisions.push({
    step: "lighting-applied",
    input: lightingSource,
    matched: lightingSource !== "none",
    result: lightingSource === "preset"
      ? `Preset: ${lighting!.geminiPrompt}`
      : lightingSource === "mood-fallback"
        ? `Mood fallback: ${mood!.lighting}`
        : "Işık bilgisi prompt'a eklenmedi",
    fallback: lightingSource === "mood-fallback",
    details: { source: lightingSource },
  });

  // 4. El (varsa)
  if (params.includesHands && handPose) {
    promptParts.push(`HANDS:`);
    promptParts.push(`- ${handPose.geminiPrompt}`);
    promptParts.push(`- Skin tone: ${handPose.skinTone}`);
    promptParts.push(`- Nails: ${handPose.nailStyle}`);
    if (composition) {
      promptParts.push(`- ${composition.geminiPrompt}`);
    }
    promptParts.push("");
  }

  // 5. Ürün dokusu
  if (textureProfile) {
    promptParts.push(`PRODUCT TEXTURE:`);
    promptParts.push(`- ${textureProfile.geminiPrompt}`);
    promptParts.push("");
  }

  // 5.5 Asset Etiketleri (Gemini önerileri ile - constraint olarak sunuluyor)
  if (params.assetTags) {
    const tagLines: string[] = [];

    // Her asset tipi için rol tanımlayarak ekle
    if (params.assetTags.plate?.length) {
      tagLines.push(`- PLATE (serving surface): ${params.assetTags.plate.join(", ")}`);
    }
    if (params.assetTags.cup?.length) {
      tagLines.push(`- CUP/MUG (beverage container): ${params.assetTags.cup.join(", ")}`);
    }
    if (params.assetTags.table?.length) {
      tagLines.push(`- TABLE (background surface): ${params.assetTags.table.join(", ")}`);
    }
    if (params.assetTags.accessory?.length) {
      tagLines.push(`- ACCESSORY (decorative element): ${params.assetTags.accessory.join(", ")}`);
    }
    if (params.assetTags.napkin?.length) {
      tagLines.push(`- NAPKIN (textile element): ${params.assetTags.napkin.join(", ")}`);
    }
    // Ürün etiketleri de eklenebilir
    if (params.assetTags.product?.length) {
      tagLines.push(`- PRODUCT: ${params.assetTags.product.join(", ")}`);
    }

    if (tagLines.length > 0) {
      promptParts.push(`ASSET CONSTRAINTS (FOLLOW THESE):`);
      promptParts.push(`Use reference images exactly as described below:`);
      promptParts.push(...tagLines);
      promptParts.push("");
      promptParts.push(`NOTE: If tags conflict with visual evidence in reference images, prioritize visual evidence.`);
      promptParts.push("");

      decisions.push({
        step: "asset-tags",
        input: JSON.stringify(params.assetTags),
        matched: true,
        result: `${tagLines.length} asset tipi için constraint eklendi`,
        fallback: false,
        details: { tagCount: tagLines.length, tags: params.assetTags },
      });
    }
  }

  // 6. İşletme Bağlamı (SaaS uyumlu - mekan bilgileri)
  // NOT: Bu bölüm STYLE GUIDANCE olarak sunuluyor, referans görseller öncelikli
  try {
    const businessContext = await getBusinessContext();
    if (businessContext.isEnabled && businessContext.promptContext) {
      // "MANDATORY" yerine "STYLE GUIDANCE" kullan - referans görseller öncelikli
      promptParts.push(`STYLE GUIDANCE (from business context):`);
      promptParts.push(`${businessContext.promptContext}`);
      promptParts.push("");
      promptParts.push(`IMPORTANT: Use this as STYLE/ATMOSPHERE reference only.`);
      promptParts.push(`DO NOT recreate the physical space described above.`);
      promptParts.push(`ALWAYS prioritize visual evidence from reference images over this text.`);
      promptParts.push("");

      decisions.push({
        step: "business-context",
        input: businessContext.businessName,
        matched: true,
        result: businessContext.promptContext.substring(0, 100) + "...",
        fallback: false,
        details: {
          businessName: businessContext.businessName,
          floorLevel: businessContext.floorLevel,
          isEnabled: businessContext.isEnabled,
          approach: "style-guidance-only", // Görsel öncelikli yaklaşım
        },
      });
    } else {
      decisions.push({
        step: "business-context",
        input: null,
        matched: false,
        result: "Business context disabled or empty",
        fallback: false,
        details: { isEnabled: businessContext.isEnabled },
      });
    }
  } catch (error) {
    console.warn("[GeminiPromptBuilder] Failed to load business context:", error);
    decisions.push({
      step: "business-context",
      input: null,
      matched: false,
      result: "Failed to load business context",
      fallback: false,
      details: { error: String(error) },
    });
  }

  // 7. Kurallar
  promptParts.push(`RULES:`);
  promptParts.push(`- Use ONLY assets from reference images`);
  promptParts.push(`- Product clearly recognizable from reference`);
  promptParts.push(`- Single product, natural setting`);
  promptParts.push(`- NO steam, NO smoke`);
  promptParts.push("");

  // 7. Format
  promptParts.push(`9:16 vertical for Instagram Stories. 8K photorealistic.`);

  // Negative prompt oluştur
  const negativeCategories = params.includesHands ? ["always", "hands"] : ["always"];
  const negativePrompt = await buildNegativePrompt(negativeCategories);

  console.log(`[GeminiPromptBuilder] Prompt built: mood=${mood?.id || "NONE"}, lighting=${lighting?.id || lightingSource}, hands=${handPose?.id || "NONE"}, texture=${textureProfile?.productType || "NONE"}, decisions=${decisions.length} steps`);

  return {
    mainPrompt: promptParts.join("\n"),
    negativePrompt,
    metadata: {
      mood: mood || undefined,
      lighting: lighting || undefined,
      handPose: handPose || undefined,
      composition: composition || undefined,
      textureProfile: textureProfile || undefined,
    },
    decisions,
  };
}

/**
 * Senaryo verilerinden Gemini prompt parametrelerini çıkar
 * (Admin panelinde seçilen değerleri kullanır)
 * NOT: lightingPreset artık Senaryo'dan değil, Mood'dan geliyor (v2.0)
 */
export function extractGeminiParamsFromScenario(scenario: {
  mood?: string;
  // lightingPreset kaldırıldı - Işık artık sadece Mood'dan
  handPose?: string;
  compositionEntry?: string;
  includesHands?: boolean;
}): {
  moodId?: string;
  // lightingPresetId kaldırıldı - Mood fallback kullanılacak
  handPoseId?: string;
  compositionId?: string;
} {
  return {
    moodId: scenario.mood || undefined,
    // lightingPresetId: Artık Senaryo'dan değil, buildGeminiPrompt içinde Mood'dan alınacak
    handPoseId: scenario.includesHands ? scenario.handPose || undefined : undefined,
    compositionId: scenario.includesHands ? scenario.compositionEntry || undefined : undefined,
  };
}

/**
 * Tema verilerinden Gemini prompt parametrelerini çıkar
 */
export function extractGeminiParamsFromTheme(theme: {
  mood?: string;
  lightingPreset?: string;
}): {
  moodId?: string;
  lightingPresetId?: string;
} {
  return {
    moodId: theme.mood || undefined,
    lightingPresetId: theme.lightingPreset || undefined,
  };
}

// Cache'i temizle (test veya force reload için)
export function clearCache(): void {
  cachedPresets = null;
}

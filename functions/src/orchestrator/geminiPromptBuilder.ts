/**
 * Gemini Prompt Builder
 * Gemini-native terminoloji kullanarak prompt oluşturur
 *
 * Bu modül GEMINI-TERMINOLOGY-DICTIONARY.md'deki terminolojiyi kullanır
 * ve Firestore'daki preset'lerden veri çeker.
 */

import { getFirestore } from "firebase-admin/firestore";

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
 * Senaryo için tam Gemini prompt oluştur
 * Bu fonksiyon orchestrator.ts'deki buildDynamicPrompt'un yerini alabilir
 */
export async function buildGeminiPrompt(params: {
  moodId?: string;
  lightingPresetId?: string;
  handPoseId?: string;
  compositionId?: string;
  productType?: string;
  includesHands: boolean;
  timeOfDay: string;
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
}> {
  const presets = await loadGeminiPresets();

  // Metadata topla
  const mood = params.moodId
    ? presets?.moods.find(m => m.id === params.moodId)
    : await suggestMoodForTime(params.timeOfDay);

  const lighting = params.lightingPresetId
    ? presets?.lighting.find(l => l.id === params.lightingPresetId)
    : params.productType ? await suggestLightingForProduct(params.productType) : null;

  const handPose = params.includesHands && params.handPoseId
    ? presets?.handPoses.find(h => h.id === params.handPoseId)
    : null;

  const composition = params.compositionId
    ? presets?.compositions.find(c => c.id === params.compositionId)
    : null;

  const textureProfile = params.productType
    ? await getTextureProfile(params.productType)
    : null;

  // Prompt parçalarını oluştur
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
  if (lighting) {
    promptParts.push(`LIGHTING:`);
    promptParts.push(`- ${lighting.geminiPrompt}`);
    promptParts.push(`- Color temperature: ${lighting.temperature}`);
    promptParts.push(`- Shallow depth of field (f/2.0)`);
    promptParts.push("");
  }

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

  // 6. Kurallar
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
  };
}

/**
 * Senaryo verilerinden Gemini prompt parametrelerini çıkar
 * (Admin panelinde seçilen değerleri kullanır)
 */
export function extractGeminiParamsFromScenario(scenario: {
  mood?: string;
  lightingPreset?: string;
  handPose?: string;
  compositionEntry?: string;
  includesHands?: boolean;
}): {
  moodId?: string;
  lightingPresetId?: string;
  handPoseId?: string;
  compositionId?: string;
} {
  return {
    moodId: scenario.mood || undefined,
    lightingPresetId: scenario.lightingPreset || undefined,
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

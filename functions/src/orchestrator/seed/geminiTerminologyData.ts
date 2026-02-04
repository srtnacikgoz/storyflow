/**
 * Gemini Terminology Seed Data
 * GEMINI-TERMINOLOGY-DICTIONARY.md'den derlenen preset'ler
 *
 * Firestore yapısı:
 * - global/config/gemini-presets/lighting-presets
 * - global/config/gemini-presets/hand-poses
 * - global/config/gemini-presets/composition-templates
 * - global/config/gemini-presets/mood-definitions
 * - global/config/gemini-presets/product-textures
 * - global/config/gemini-presets/negative-prompts
 */

import {
  LightingPreset,
  HandPose,
  CompositionTemplate,
  MoodDefinition,
  ProductTextureProfile,
  NegativePromptSet,
  TextureLightingMapping,
  PromptPollutionTerm,
  ProductColorExpectation,
  ColorHarmonyProfile,
} from "../../types";

// ==========================================
// IŞIKLANDIRMA PRESET'LERİ
// ==========================================

export const LIGHTING_PRESETS: Omit<LightingPreset, "id">[] = [
  {
    name: "Sabah Penceresi",
    nameEn: "Morning Window",
    direction: "side-lighting-90",
    quality: "natural-window",
    temperature: "5500K",
    geminiTerms: [
      "soft morning sunlight",
      "side-lit from window",
      "bright and airy",
      "hazy morning light",
    ],
    geminiPrompt:
      "Soft natural morning sunlight streaming from a side window at 90-degree angle, creating gentle shadows and a bright, airy atmosphere. Color temperature 5500K.",
    bestFor: ["morning-ritual", "fresh", "energetic"],
    technicalDetails: "f/2.8, ISO 100, diffused natural light",
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Altın Saat",
    nameEn: "Golden Hour",
    direction: "side-lighting-45",
    quality: "golden-hour",
    temperature: "3000K",
    geminiTerms: [
      "golden hour warm sunlight",
      "long dramatic shadows",
      "warm amber tones",
      "45-degree angle",
    ],
    geminiPrompt:
      "Warm golden hour sunlight at 45-degree angle (Rembrandt lighting), creating long dramatic shadows and amber tones. Color temperature 3000K, intimate and romantic atmosphere.",
    bestFor: ["rustic-heritage", "warm", "romantic", "cozy"],
    technicalDetails: "f/2.2, ISO 200, warm color grading",
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Yumuşak Stüdyo",
    nameEn: "Soft Studio",
    direction: "side-lighting-45",
    quality: "diffused-softbox",
    temperature: "5000K",
    geminiTerms: [
      "diffused softbox light",
      "soft shadows",
      "clean professional look",
      "neutral white balance",
    ],
    geminiPrompt:
      "Professional diffused softbox lighting from 45-degree angle, creating soft shadows and clean highlights. Neutral 5000K color temperature, studio-quality appearance.",
    bestFor: ["professional", "clean", "balanced"],
    technicalDetails: "f/4.0, ISO 100, neutral color",
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Dramatik Arka Işık",
    nameEn: "Dramatic Backlight",
    direction: "backlighting",
    quality: "hard-light",
    temperature: "5500K",
    geminiTerms: [
      "strong backlighting",
      "rim light",
      "silhouette edges",
      "translucent liquids",
    ],
    geminiPrompt:
      "Strong backlighting creating rim light effect, highlighting translucent liquids and product edges. High contrast with specular highlights.",
    bestFor: ["coffee", "beverages", "sauces", "dramatic"],
    technicalDetails: "f/2.8, ISO 200, high contrast",
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "Gece Yarısı Gurmesi",
    nameEn: "Gourmet Midnight",
    direction: "rim-lighting",
    quality: "hard-light",
    temperature: "3500K",
    geminiTerms: [
      "low-key lighting",
      "Chiaroscuro effect",
      "high contrast",
      "specular highlights on dark surface",
    ],
    geminiPrompt:
      "Moody low-key lighting with Chiaroscuro effect. Deep shadows with bright specular highlights on product. Dark atmosphere but product details visible.",
    bestFor: ["gourmet-midnight", "luxurious", "chocolate", "sophisticated"],
    technicalDetails: "f/2.0, ISO 400, selective lighting",
    isActive: true,
    sortOrder: 5,
  },
  {
    name: "Akdeniz Terası",
    nameEn: "Mediterranean Terrace",
    direction: "side-lighting-45",
    quality: "natural-window",
    temperature: "5500K",
    geminiTerms: [
      "intense Mediterranean sunlight",
      "crisp high-contrast shadows",
      "sun-drenched terrace",
      "subsurface scattering on cream",
    ],
    geminiPrompt:
      "Intense direct Mediterranean morning sunlight (5500K) from 45-degree angle. Crisp high-contrast shadows on table, subsurface scattering on cream and moist surfaces. Sun-lit terrace atmosphere.",
    bestFor: ["terrace", "outdoor", "bright", "energetic"],
    technicalDetails: "f/2.2, ISO 100, high dynamic range",
    isActive: true,
    sortOrder: 6,
  },
];

// ==========================================
// EL POZ ŞABLONLARI
// ==========================================

export const HAND_POSES: Omit<HandPose, "id">[] = [
  {
    name: "Zarif Kavrama",
    nameEn: "Elegant Grip",
    gripType: "cupping",
    entryPoint: "bottom-right",
    fingerPosition: "fingers gently curved around the object, thumb supporting from side",
    wristAngle: "slight 15-degree upward tilt",
    geminiTerms: [
      "elegant feminine hand",
      "gentle cupping grip",
      "natural skin texture",
      "subsurface scattering on fingertips",
    ],
    geminiPrompt:
      "Elegant feminine hand with natural skin texture gently cupping the object. Fingers curved naturally with thumb supporting. Realistic contact shadows where fingertips meet surface. Subsurface scattering on skin where light passes through.",
    skinDetails: [
      "natural skin texture with visible pores",
      "subsurface scattering on fingertips",
      "clean manicured nails",
    ],
    avoidTerms: ["deformed hands", "extra fingers", "plastic skin", "floating hand"],
    bestFor: ["coffee", "viennoiserie", "small-desserts"],
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "İnce Tutma",
    nameEn: "Delicate Pinch",
    gripType: "pinching",
    entryPoint: "bottom-left",
    fingerPosition: "thumb and index finger pinching delicately, other fingers elegantly extended",
    wristAngle: "natural horizontal position",
    geminiTerms: [
      "delicate pinch grip",
      "fingertips gently gripping",
      "precise contact point",
      "elegant finger extension",
    ],
    geminiPrompt:
      "Slender fingers delicately pinching the object between thumb and index finger. Other fingers elegantly extended. Sharp focus on contact point with realistic pressure indentation and contact shadow.",
    skinDetails: [
      "slender fingers",
      "natural nails",
      "slight skin texture",
    ],
    avoidTerms: ["crushing grip", "deformed fingers", "unnatural angle"],
    bestFor: ["chocolate", "small-desserts", "profiterole"],
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Sunum Pozu",
    nameEn: "Presentation Pose",
    gripType: "presenting",
    entryPoint: "center",
    fingerPosition: "hand flat, palm up, product resting on palm",
    wristAngle: "slight upward tilt toward camera",
    geminiTerms: [
      "presenting pose",
      "open palm",
      "product showcase",
      "inviting gesture",
    ],
    geminiPrompt:
      "Hand in presenting pose with open palm, product resting gracefully. Fingers slightly curved inward creating a natural cradle. Inviting gesture toward viewer.",
    skinDetails: [
      "warm skin tone",
      "natural texture",
      "soft palm lines visible",
    ],
    avoidTerms: ["stiff pose", "unnatural positioning", "floating product"],
    bestFor: ["chocolate", "small-desserts", "special-orders"],
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Kırma Anı",
    nameEn: "Breaking Moment",
    gripType: "breaking",
    entryPoint: "bottom-right",
    fingerPosition: "both hands pulling apart, fingers curved around each half",
    wristAngle: "opposing angles creating tension",
    geminiTerms: [
      "breaking action",
      "dynamic tension",
      "crumbs falling",
      "motion blur on particles",
    ],
    geminiPrompt:
      "Hands in the moment of breaking the pastry apart. Dynamic tension visible in finger positions. Flaky layers shattering, crumbs falling with slight motion blur. Action captured mid-movement.",
    skinDetails: [
      "natural skin under action",
      "visible finger pressure",
      "dynamic lighting on knuckles",
    ],
    avoidTerms: ["static pose", "clean break", "no debris"],
    bestFor: ["viennoiserie", "special-orders"],
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "Tabak Tutma",
    nameEn: "Plate Hold",
    gripType: "cradling",
    entryPoint: "side-left",
    fingerPosition: "fingers supporting plate edge, thumb on top rim",
    wristAngle: "natural carrying position",
    geminiTerms: [
      "plate cradling grip",
      "stable support",
      "natural carrying pose",
      "contact shadow on plate edge",
    ],
    geminiPrompt:
      "Hand naturally cradling ceramic plate from the side. Fingers supporting underneath, thumb resting on top rim for stability. Natural carrying pose with realistic contact shadows.",
    skinDetails: [
      "natural skin tone",
      "visible knuckles",
      "subtle vein detail",
    ],
    avoidTerms: ["gripping too tight", "unnatural wrist", "floating plate"],
    bestFor: ["slice-cakes", "big-cakes", "special-orders"],
    isActive: true,
    sortOrder: 5,
  },
];

// ==========================================
// KOMPOZİSYON ŞABLONLARI
// ==========================================

export const COMPOSITION_TEMPLATES: Omit<CompositionTemplate, "id">[] = [
  // ========== EL GİRİŞ NOKTALARI ==========
  {
    name: "Sağ Alt Köşe Girişi",
    nameEn: "Bottom Right Entry",
    entryPoint: "bottom-right",
    angleDescription: "45-degree angle entry, fingers pointing toward upper-left",
    productPlacement: "center-left of frame, slightly elevated",
    propsPlacement: "cup top-left corner, plate centered beneath product",
    negativeSpace: "30% top area, 15% left side for breathing room",
    geminiTerms: [
      "rule of thirds",
      "diagonal composition",
      "leading lines from corner",
      "negative space top",
    ],
    geminiPrompt:
      "Composition following rule of thirds. Hand entering from bottom-right corner at 45-degree angle, creating diagonal leading lines. Product positioned center-left. Generous negative space in top third for Instagram text overlay.",
    aspectRatio: "9:16",
    bestFor: ["story", "lifestyle", "hand-interaction"],
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Sol Alt Köşe Girişi",
    nameEn: "Bottom Left Entry",
    entryPoint: "bottom-left",
    angleDescription: "45-degree angle entry, fingers pointing toward upper-right",
    productPlacement: "center-right of frame",
    propsPlacement: "cup top-right corner, supporting elements on right",
    negativeSpace: "30% top area, 15% right side",
    geminiTerms: [
      "mirrored composition",
      "left-hand entry",
      "diagonal flow",
      "balanced negative space",
    ],
    geminiPrompt:
      "Mirror composition of right entry. Hand entering from bottom-left at 45-degree angle. Product positioned center-right. Diagonal flow guides eye from bottom-left to top-right.",
    aspectRatio: "9:16",
    bestFor: ["story", "lifestyle", "variety"],
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Sağ Kenar Girişi",
    nameEn: "Right Side Entry",
    entryPoint: "right-side",
    angleDescription: "horizontal entry from right side at mid-frame height",
    productPlacement: "center-left of frame",
    propsPlacement: "minimal, focus on hand-product interaction",
    negativeSpace: "left side 25% for balance",
    geminiTerms: [
      "side entry",
      "horizontal reaching",
      "dynamic interaction",
      "action shot",
    ],
    geminiPrompt:
      "Hand reaching in horizontally from right side of frame at mid-height. Creates sense of action and interaction. Product positioned center-left. Captures moment of reaching or taking.",
    aspectRatio: "9:16",
    bestFor: ["action", "reaching", "dynamic"],
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Yukarıdan Giriş",
    nameEn: "Top Down Entry",
    entryPoint: "top-down",
    angleDescription: "90-degree overhead with hands visible from above",
    productPlacement: "center of frame on flat surface",
    propsPlacement: "arranged around product in flat-lay style",
    negativeSpace: "even distribution around center",
    geminiTerms: [
      "overhead view",
      "flat lay",
      "bird's eye",
      "hands from top",
    ],
    geminiPrompt:
      "Overhead 90-degree view with hands entering from top of frame. Palms partially visible, holding or presenting product. Flat-lay composition with product centered. Perfect for showing both product and hands clearly.",
    aspectRatio: "1:1",
    bestFor: ["flat-lay", "presentation", "tutorial"],
    isActive: true,
    sortOrder: 4,
  },
  // ========== FOTOĞRAF TÜRLERİ ==========
  {
    name: "Ürün Odaklı (Hero)",
    nameEn: "Hero Center",
    entryPoint: "center",
    angleDescription: "direct facing, product as absolute hero",
    productPlacement: "dead center of frame, occupying 60% of visual weight",
    propsPlacement: "minimal or none, clean backdrop only",
    negativeSpace: "even distribution, 20% each side",
    geminiTerms: [
      "hero shot",
      "product focus",
      "centered composition",
      "minimal background",
    ],
    geminiPrompt:
      "Product as the absolute hero, dead center in frame. Clean, uncluttered composition. All visual attention directed to the main subject. Professional e-commerce quality with crisp focus on product details.",
    aspectRatio: "4:5",
    bestFor: ["product-launch", "catalog", "e-commerce", "feature"],
    isActive: true,
    sortOrder: 5,
  },
  {
    name: "Yaşam Tarzı (Lifestyle)",
    nameEn: "Lifestyle Hand",
    entryPoint: "bottom-right",
    angleDescription: "natural hand interaction, candid feel",
    productPlacement: "slightly off-center for natural look",
    propsPlacement: "contextual items suggesting daily life (coffee, book, etc.)",
    negativeSpace: "organic, not strictly measured",
    geminiTerms: [
      "lifestyle photography",
      "natural interaction",
      "candid moment",
      "human connection",
    ],
    geminiPrompt:
      "Lifestyle composition showing natural human interaction with product. Hand holding or using product in authentic way. Warm, inviting atmosphere suggesting real moment in daily life. Connection between person and product.",
    aspectRatio: "9:16",
    bestFor: ["social-media", "instagram", "engagement", "relatable"],
    isActive: true,
    sortOrder: 6,
  },
  {
    name: "Düz Yüzey (Flat Lay)",
    nameEn: "Flat Lay",
    entryPoint: "top-down",
    angleDescription: "90-degree overhead, organized arrangement",
    productPlacement: "center of curated flat-lay arrangement",
    propsPlacement: "aesthetically arranged supporting items around product",
    negativeSpace: "corners left clean, frame breathing room",
    geminiTerms: [
      "flat lay composition",
      "organized aesthetic",
      "birds eye view",
      "curated arrangement",
    ],
    geminiPrompt:
      "Bird's eye view flat lay composition. Product centered with supporting props arranged in aesthetic pattern around it. Clean organized layout. Perfect for showcasing product with complementary items.",
    aspectRatio: "1:1",
    bestFor: ["instagram-square", "branding", "multiple-items", "aesthetic"],
    isActive: true,
    sortOrder: 7,
  },
  {
    name: "Yakın Çekim (Macro)",
    nameEn: "Close Up Detail",
    entryPoint: "center",
    angleDescription: "macro lens perspective, extreme detail focus",
    productPlacement: "filling 80% of frame with product detail",
    propsPlacement: "none - pure product focus",
    negativeSpace: "minimal, detail fills frame",
    geminiTerms: [
      "macro detail",
      "texture focus",
      "close-up shot",
      "detail photography",
    ],
    geminiPrompt:
      "Extreme close-up focusing on product texture and details. Macro perspective revealing surface quality, craftsmanship, and material properties. Sharp focus on hero area with natural bokeh falloff. Quality and detail emphasis.",
    aspectRatio: "4:5",
    bestFor: ["texture", "quality", "craftsmanship", "detail"],
    isActive: true,
    sortOrder: 8,
  },
  {
    name: "Ortam Sahnesi",
    nameEn: "Ambient Scene",
    entryPoint: "side-right",
    angleDescription: "environmental context, product as part of scene",
    productPlacement: "positioned naturally within larger scene context",
    propsPlacement: "rich environmental elements suggesting location/mood",
    negativeSpace: "scene-driven, atmospheric",
    geminiTerms: [
      "environmental portrait",
      "scene setting",
      "atmospheric",
      "storytelling",
    ],
    geminiPrompt:
      "Product positioned naturally within atmospheric scene. Environmental context tells a story. Rich props and setting create mood and location sense. Product is part of a larger narrative moment.",
    aspectRatio: "9:16",
    bestFor: ["storytelling", "mood", "branding", "editorial"],
    isActive: true,
    sortOrder: 9,
  },
  {
    name: "Minimal / Sade",
    nameEn: "Minimal Clean",
    entryPoint: "center",
    angleDescription: "clean, simple, uncluttered aesthetic",
    productPlacement: "center with maximum breathing room",
    propsPlacement: "none or single subtle element",
    negativeSpace: "generous, 40%+ of frame",
    geminiTerms: [
      "minimalist",
      "clean aesthetic",
      "negative space",
      "simple composition",
    ],
    geminiPrompt:
      "Minimalist composition with generous negative space. Product isolated on clean background. Maximum visual breathing room. Modern, sophisticated aesthetic. Less is more approach.",
    aspectRatio: "4:5",
    bestFor: ["professional", "catalog", "modern", "sophisticated"],
    isActive: true,
    sortOrder: 10,
  },
];

// ==========================================
// MOOD TANIMLARI
// ==========================================

export const MOOD_DEFINITIONS: Omit<MoodDefinition, "id">[] = [
  {
    name: "Sabah Enerjisi",
    nameEn: "Morning Energy",
    style: "morning-ritual",
    lightingPresetId: "morning-window",
    colorPalette: ["white", "cream", "light wood", "pastel accents"],
    temperature: "5500K",
    depthOfField: "shallow f/2.0",
    backgroundStyle: "bright cafe terrace, white linen, soft bokeh",
    geminiAtmosphere:
      "Bright and airy morning atmosphere. Fresh energy, new day beginning. Clean whites and soft pastels. Natural sunlight creating optimistic mood.",
    geminiTerms: [
      "bright and airy",
      "fresh morning energy",
      "clean minimal aesthetic",
      "soft natural light",
    ],
    avoidTerms: ["dark", "moody", "dramatic shadows", "evening"],
    bestTimeOfDay: ["morning", "brunch"],
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Rustik Nostalji",
    nameEn: "Rustic Heritage",
    style: "rustic-heritage",
    lightingPresetId: "golden-hour",
    colorPalette: ["earth tones", "dark wood", "copper", "deep browns"],
    temperature: "3000K",
    depthOfField: "medium f/2.8",
    backgroundStyle: "weathered wood table, vintage props, rustic textures",
    geminiAtmosphere:
      "Nostalgic rustic atmosphere. Warm golden light, handcrafted feel. Connection to tradition and artisanal quality. Inviting and homey.",
    geminiTerms: [
      "golden hour warmth",
      "rustic textures",
      "artisanal aesthetic",
      "nostalgic mood",
    ],
    avoidTerms: ["modern", "cold", "clinical", "bright white"],
    bestTimeOfDay: ["afternoon", "golden-hour"],
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Lüks Gece",
    nameEn: "Gourmet Midnight",
    style: "gourmet-midnight",
    lightingPresetId: "gourmet-midnight",
    colorPalette: ["black", "deep gray", "gold accents", "rich burgundy"],
    temperature: "3500K",
    depthOfField: "shallow f/2.0",
    backgroundStyle: "dark slate, minimal props, dramatic shadows",
    geminiAtmosphere:
      "Sophisticated midnight atmosphere. Luxury and indulgence. Deep shadows with rich highlights. Intense focus on premium quality.",
    geminiTerms: [
      "low-key dramatic",
      "luxury aesthetic",
      "rich deep tones",
      "sophisticated mood",
    ],
    avoidTerms: ["bright", "cheerful", "casual", "daylight"],
    bestTimeOfDay: ["evening", "night"],
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Sosyal Paylaşım",
    nameEn: "Social Sharing",
    style: "bright-airy",
    lightingPresetId: "soft-studio",
    colorPalette: ["warm neutrals", "white", "soft gold", "natural wood"],
    temperature: "5000K",
    depthOfField: "medium f/3.2",
    backgroundStyle: "cafe setting, multiple seats implied, social atmosphere",
    geminiAtmosphere:
      "Welcoming social atmosphere. Ready to share moments with friends. Warm but bright, inviting participation. Connection and togetherness.",
    geminiTerms: [
      "welcoming cafe scene",
      "social atmosphere",
      "warm inviting light",
      "sharing moment",
    ],
    avoidTerms: ["isolated", "lonely", "dramatic", "intense"],
    bestTimeOfDay: ["brunch", "afternoon"],
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "Samimi Köşe",
    nameEn: "Cozy Intimate",
    style: "cozy-intimate",
    lightingPresetId: "golden-hour",
    colorPalette: ["warm beige", "soft brown", "cream", "muted colors"],
    temperature: "3200K",
    depthOfField: "shallow f/2.2",
    backgroundStyle: "cozy corner, soft textiles, intimate setting",
    geminiAtmosphere:
      "Intimate cozy atmosphere. Homey comfort and relaxation. Soft warm light creating sense of safety and comfort. Personal quiet moment.",
    geminiTerms: [
      "cozy intimate setting",
      "warm homey feel",
      "soft comfort",
      "relaxed atmosphere",
    ],
    avoidTerms: ["busy", "bright", "energetic", "public"],
    bestTimeOfDay: ["afternoon", "evening"],
    isActive: true,
    sortOrder: 5,
  },
];

// ==========================================
// ÜRÜN DOKU PROFİLLERİ
// ==========================================

export const PRODUCT_TEXTURE_PROFILES: Omit<ProductTextureProfile, "id">[] = [
  {
    category: "viennoiserie",
    heroFeature: "lamination",
    criticalTerms: [
      "honeycomb structure",
      "shattered flakes",
      "golden-brown crust",
      "flaky pastry layers",
      "crispy exterior",
    ],
    surfaceType: "porous",
    geminiPrompt:
      "Focus on the honeycomb lamination structure of the pastry. Shattered flaky layers visible, golden-brown caramelized crust. Crispy exterior texture catching the light.",
    lightingNotes: "Side-lighting at 90° best reveals flaky layers",
    avoidTerms: ["flat surface", "smooth", "unbaked", "soggy"],
  },
  {
    category: "chocolate",
    heroFeature: "reflection",
    criticalTerms: [
      "mirror-like tempered finish",
      "high gloss",
      "sharp snap edges",
      "specular highlights",
      "crisp light bars reflection",
    ],
    surfaceType: "glossy",
    geminiPrompt:
      "Mirror-like tempered chocolate surface with high gloss finish. Sharp snap edges visible. Crisp specular highlights reflecting studio light bars. Professional chocolate photography.",
    lightingNotes: "Rim lighting essential for gloss, avoid flat light",
    avoidTerms: ["matte", "bloomed", "melted", "formless", "plastic texture"],
  },
  {
    category: "slice-cakes",
    heroFeature: "cross-section",
    criticalTerms: [
      "neat layers visible",
      "moist sponge texture",
      "velvety frosting",
      "porous airy crumb",
      "offset spatula strokes",
    ],
    surfaceType: "moist",
    geminiPrompt:
      "Cross-section revealing neat distinct layers. Moist porous sponge crumb visible. Velvety smooth frosting between layers. Fresh, just-cut appearance.",
    lightingNotes: "Side light reveals layer depth, avoid harsh shadows",
    avoidTerms: ["dry", "crumbly", "collapsed layers", "runny frosting"],
  },
  {
    category: "coffee",
    heroFeature: "microfoam",
    criticalTerms: [
      "golden crema",
      "silky microfoam",
      "tiger mottling pattern",
      "crisp latte art edges",
      "steam wisps",
    ],
    surfaceType: "liquid",
    geminiPrompt:
      "Perfect golden crema with silky microfoam. Tiger mottling pattern on espresso. Crisp edges on latte art. Slight steam wisps suggest freshness.",
    lightingNotes: "Backlighting makes liquid glow, rim light on cup edge",
    avoidTerms: ["flat foam", "no crema", "cold", "spilled"],
  },
  {
    category: "small-desserts",
    heroFeature: "detail-precision",
    criticalTerms: [
      "precise piping",
      "delicate decorations",
      "glossy glaze",
      "vibrant colors",
      "miniature perfection",
    ],
    surfaceType: "mixed",
    geminiPrompt:
      "Precise detailed work on miniature desserts. Delicate piping and decorations clearly visible. Glossy glazes where applicable. Vibrant natural colors.",
    lightingNotes: "Soft diffused light prevents harsh shadows on small details",
    avoidTerms: ["messy", "smudged", "rough edges", "dull colors"],
  },
  {
    category: "profiterole",
    heroFeature: "chocolate-flow",
    criticalTerms: [
      "flowing chocolate sauce",
      "choux texture visible",
      "cream peeking through",
      "glossy chocolate coating",
      "stacked presentation",
    ],
    surfaceType: "glossy",
    geminiPrompt:
      "Profiteroles with flowing glossy chocolate sauce. Choux pastry texture visible where exposed. Fresh cream peeking through. Dynamic chocolate drip captured.",
    lightingNotes: "Backlight chocolate sauce for glow, side light for texture",
    avoidTerms: ["dry chocolate", "deflated choux", "no cream visible"],
  },
  // ==========================================
  // GRANÜLER DOKU PROFİLLERİ (GEMINI-TEXTURE-DICTIONARY)
  // Alt kategoriler - daha spesifik doku terimleri
  // ==========================================
  {
    category: "chocolate-tempered",
    heroFeature: "temper-sheen",
    criticalTerms: [
      "tempered chocolate sheen",
      "mirror-like tempered finish",
      "professional chocolate photography",
      "specular highlights on curved chocolate",
    ],
    surfaceType: "glossy",
    geminiPrompt:
      "Tempered chocolate with professional sheen. Mirror-like surface catching specular highlights. Sharp clean edges showing proper temper. Crisp light bars reflection on curved surfaces.",
    lightingNotes: "Side lighting to create specular highlights",
    avoidTerms: ["bloomed", "matte", "fingerprints", "melted"],
  },
  {
    category: "chocolate-glaze",
    heroFeature: "mirror-glaze",
    criticalTerms: [
      "mirror glaze surface reflecting soft window light",
      "flawless glaze finish",
      "perfect reflection",
      "liquid-smooth coating",
    ],
    surfaceType: "glossy",
    geminiPrompt:
      "Mirror glaze surface reflecting soft window light. Flawless liquid-smooth coating with perfect reflection. Deep rich color with no imperfections.",
    lightingNotes: "Soft diffused light for even reflections",
    avoidTerms: ["cracked glaze", "bubbles", "drips", "uneven"],
  },
  {
    category: "chocolate-snap",
    heroFeature: "snap-texture",
    criticalTerms: [
      "snap texture",
      "clean break edge",
      "crisp snap lines",
      "visible temper at break point",
    ],
    surfaceType: "matte",
    geminiPrompt:
      "Chocolate showing clean snap texture at break point. Crisp break lines revealing proper temper. Matte interior contrasting with glossy exterior.",
    lightingNotes: "Side lighting for texture depth at snap edge",
    avoidTerms: ["crumbly", "soft break", "waxy"],
  },
  {
    category: "chocolate-cocoa-dust",
    heroFeature: "cocoa-dusting",
    criticalTerms: [
      "velvety matte cocoa dusting",
      "fine cocoa powder coating",
      "soft powdery texture",
      "dusted truffle surface",
    ],
    surfaceType: "matte",
    geminiPrompt:
      "Velvety matte cocoa dusting covering the surface. Fine powdery texture with soft edges. Delicate cocoa coating suggesting handcrafted quality.",
    lightingNotes: "Soft diffused light for velvety matte appearance",
    avoidTerms: ["clumpy", "wet", "uneven dusting"],
  },
  {
    category: "cream-buttercream",
    heroFeature: "buttercream-finish",
    criticalTerms: [
      "silky smooth buttercream finish",
      "spatula strokes visible",
      "velvety frosting",
      "perfectly piped buttercream",
    ],
    surfaceType: "moist",
    geminiPrompt:
      "Silky smooth buttercream finish with visible spatula strokes. Velvety texture catching soft light. Perfectly piped with clean edges.",
    lightingNotes: "Soft diffused light to show contours",
    avoidTerms: ["grainy", "melting", "air bubbles", "curdled"],
  },
  {
    category: "cream-mousse",
    heroFeature: "aerated-texture",
    criticalTerms: [
      "aerated mousse texture",
      "light airy foam",
      "delicate mousse surface",
      "pillowy soft texture",
    ],
    surfaceType: "moist",
    geminiPrompt:
      "Aerated mousse texture showing light airy structure. Delicate foam-like surface with soft peaks. Pillowy appearance suggesting lightness.",
    lightingNotes: "Soft diffused light to prevent harsh shadows on delicate texture",
    avoidTerms: ["dense", "flat", "collapsed", "separated"],
  },
  {
    category: "cream-meringue",
    heroFeature: "toasted-peaks",
    criticalTerms: [
      "piped meringue peaks with lightly toasted edges",
      "caramelized meringue tips",
      "glossy meringue surface",
      "torch-kissed peaks",
    ],
    surfaceType: "caramelized",
    geminiPrompt:
      "Piped meringue peaks with lightly toasted edges. Glossy white surface transitioning to golden-brown caramelized tips. Torch-kissed perfection.",
    lightingNotes: "Side lighting for texture depth on caramelized peaks",
    avoidTerms: ["burnt", "weeping", "deflated", "raw"],
  },
  {
    category: "cream-ganache",
    heroFeature: "ganache-richness",
    criticalTerms: [
      "luscious, thick ganache",
      "rich glossy ganache",
      "velvety chocolate cream",
      "pourable consistency",
    ],
    surfaceType: "glossy",
    geminiPrompt:
      "Luscious thick ganache with rich glossy surface. Velvety chocolate cream showing perfect consistency. Deep color with subtle sheen.",
    lightingNotes: "Side lighting for glossy highlights",
    avoidTerms: ["grainy", "separated", "too thin", "dull"],
  },
  {
    category: "pastry-laminated",
    heroFeature: "visible-lamination",
    criticalTerms: [
      "visible flaky laminated layers",
      "honeycomb cross-section",
      "shattered flakes",
      "buttery layer separation",
    ],
    surfaceType: "porous",
    geminiPrompt:
      "Visible flaky laminated layers showing honeycomb structure. Shattered flakes catching the light. Buttery layer separation revealing craftsmanship.",
    lightingNotes: "Backlighting to show translucency of the crumb",
    avoidTerms: ["dense", "compressed", "unbaked layers", "soggy"],
  },
  {
    category: "pastry-crumb",
    heroFeature: "open-crumb",
    criticalTerms: [
      "moist, open crumb structure",
      "porous airy interior",
      "soft sponge texture",
      "even hole distribution",
    ],
    surfaceType: "porous",
    geminiPrompt:
      "Moist open crumb structure with porous airy interior. Even hole distribution suggesting proper fermentation. Soft sponge texture.",
    lightingNotes: "Backlighting to show crumb translucency",
    avoidTerms: ["dense", "gummy", "collapsed", "dry"],
  },
  {
    category: "pastry-crust",
    heroFeature: "golden-crust",
    criticalTerms: [
      "golden-brown baked crust",
      "Maillard reaction surface",
      "caramelized exterior",
      "crispy golden shell",
    ],
    surfaceType: "caramelized",
    geminiPrompt:
      "Golden-brown baked crust showing Maillard reaction. Caramelized exterior with crispy texture. Rich color gradient from golden to brown.",
    lightingNotes: "Side lighting for texture depth",
    avoidTerms: ["burnt", "pale", "soft crust", "uneven color"],
  },
  {
    category: "pastry-tart-edge",
    heroFeature: "tart-shell",
    criticalTerms: [
      "buttery tart shell edge",
      "short crust texture",
      "crisp pastry border",
      "golden shortcrust rim",
    ],
    surfaceType: "caramelized",
    geminiPrompt:
      "Buttery tart shell edge with short crumbly texture. Crisp pastry border showing golden color. Perfect rim definition.",
    lightingNotes: "Side lighting for edge definition",
    avoidTerms: ["soggy bottom", "burnt edges", "cracked shell", "raw dough"],
  },
];

// ==========================================
// NEGATIVE PROMPT KOLEKSİYONLARI
// ==========================================

export const NEGATIVE_PROMPT_SETS: Omit<NegativePromptSet, "id">[] = [
  {
    name: "Teknik Kusurlar",
    category: "technical",
    terms: [
      "blur",
      "grain",
      "noise",
      "low resolution",
      "watermark",
      "text overlay",
      "signature",
      "distorted",
      "motion blur",
      "out of focus",
    ],
    geminiFormat:
      "Avoid any blur, grain, noise, low resolution, watermarks, text overlays, signatures, or distortion.",
    isDefault: true,
    applicableTo: "all",
  },
  {
    name: "Yemek Styling Hataları",
    category: "food-styling",
    terms: [
      "plastic texture",
      "wax",
      "artificial shine",
      "oily",
      "greasy",
      "moldy",
      "burnt",
      "raw dough",
      "messy plate",
      "hair",
      "debris",
    ],
    geminiFormat:
      "Avoid any plastic or wax textures, artificial shine, overly greasy appearance, burnt or raw elements, messy presentation, or foreign debris.",
    isDefault: true,
    applicableTo: "all",
  },
  {
    name: "El Anatomisi Hataları",
    category: "anatomy",
    terms: [
      "deformed hands",
      "extra fingers",
      "missing fingers",
      "fused fingers",
      "missing limbs",
      "bad anatomy",
      "claw-like hands",
      "floating hand",
      "disconnected hand",
    ],
    geminiFormat:
      "Avoid any anatomical errors: deformed hands, incorrect finger count, fused or missing fingers, unnatural poses, or disconnected/floating hands.",
    isDefault: false,
    applicableTo: "all",
  },
  {
    name: "Kompozisyon Hataları",
    category: "composition",
    terms: [
      "cluttered background",
      "distracting elements",
      "messy kitchen",
      "plastic wrap visible",
      "neon colors",
      "bright artificial lighting",
      "multiple products",
      "duplicate items",
    ],
    geminiFormat:
      "Avoid cluttered backgrounds, distracting elements, visible packaging, neon colors, harsh artificial lighting, or multiple/duplicate main products.",
    isDefault: true,
    applicableTo: "all",
  },
  {
    name: "Çikolata Özel",
    category: "food-styling",
    terms: [
      "bloomed chocolate",
      "melted formless",
      "dull matte surface",
      "fingerprints",
      "cracked coating",
      "blue lighting",
    ],
    geminiFormat:
      "Avoid bloomed chocolate, melted formless shapes, dull matte surfaces, fingerprints, cracked coatings, or blue/cold lighting on chocolate.",
    isDefault: false,
    applicableTo: ["chocolate"],
  },
  {
    name: "Pasta Özel",
    category: "food-styling",
    terms: [
      "collapsed layers",
      "runny frosting",
      "dry cracked surface",
      "uneven layers",
      "air bubbles in frosting",
      "separated cream",
    ],
    geminiFormat:
      "Avoid collapsed or uneven layers, runny or separated frosting, dry cracked surfaces, or visible air bubbles in cream.",
    isDefault: false,
    applicableTo: ["slice-cakes", "big-cakes"],
  },
];

// ==========================================
// IŞIK-DOKU EŞLEŞTİRME MATRİSİ
// GEMINI-TEXTURE-DICTIONARY.md'den derlendi
// "Işık Olmadan Doku Olmaz" prensibi
// ==========================================

export const TEXTURE_LIGHTING_MAP: TextureLightingMapping[] = [
  // === DÜZELTME (2026-02-03 Gemini Review) ===
  // glossy: side-lighting → high-angle-specular (yansıma açısı kontrolü için)
  // porous: backlighting → raking-light (gözenek gölgeleri için)
  {
    surfaceType: "glossy",
    recommendedLighting: "high-angle-specular",
    reason: "Parlaklığı 'patlatmak' için yüksek açılı specular ışık gerekli. Yansıma açısı (angle of incidence) kontrol edilmeli. Side-lighting derinlik verir ama specular highlights için yetersiz.",
    geminiTerms: [
      "high-angle specular lighting",
      "controlled reflection angle",
      "crisp specular highlights on glossy surface",
      "mirror-like reflection with precise light positioning",
      "hard reflection for chocolate sheen",
    ],
    bestLightingPresetIds: ["dramatic-side", "gourmet-midnight"],
  },
  {
    surfaceType: "moist",
    recommendedLighting: "soft-diffused",
    reason: "Yumuşak ışık, nemin yarattığı hafif parıltıyı dağıtmadan korur. Sert ışık ıslak yüzeylerde aşırı parlamaya neden olur.",
    geminiTerms: [
      "soft diffused light to show contours",
      "gentle shadows preserving moisture sheen",
      "even illumination without harsh reflections",
      "soft natural light",
    ],
    bestLightingPresetIds: ["soft-studio", "morning-window"],
  },
  // === KRİTİK DÜZELTME: porous için backlighting HATALI ===
  // Backlighting gözeneklerin içini karanlıkta bırakır, doku kaybolur.
  // Raking light (yüzeyi yalayan ışık) her gözenek için minik gölge oluşturur.
  {
    surfaceType: "porous",
    recommendedLighting: "raking-light",
    reason: "Gözenekli yüzeylerde LOW-ANGLE RAKING LIGHT kullanılmalı. Işık yüzeye çok dar açıyla geldiğinde, her küçük gözenek kendi minik gölgesini oluşturur. Bu 'tactile quality' (dokunma hissi) katar. Backlighting HATALI - gözenekleri karanlıkta bırakır.",
    geminiTerms: [
      "low-angle raking light",
      "grazing light across porous surface",
      "texture-revealing shallow angle illumination",
      "each pore casting its own tiny shadow",
      "tactile quality lighting",
    ],
    bestLightingPresetIds: ["dramatic-side", "golden-hour"],
  },
  {
    surfaceType: "matte",
    recommendedLighting: "soft-diffused",
    reason: "Yumuşak geçişler için dağınık ışık. Mat yüzeylerde sert ışık düzensiz gölgeler yaratır.",
    geminiTerms: [
      "diffused soft light",
      "even soft lighting",
      "velvety soft shadows",
      "gentle illumination",
    ],
    bestLightingPresetIds: ["soft-studio", "morning-window"],
  },
  {
    surfaceType: "caramelized",
    recommendedLighting: "side-lighting",
    reason: "Texture depth için yan ışık. Karamelize yüzeyin doku derinliği ancak açılı ışıkla ortaya çıkar.",
    geminiTerms: [
      "side lighting for texture depth",
      "golden-brown highlights",
      "defined shadows on crust",
      "warm side-lighting",
    ],
    bestLightingPresetIds: ["golden-hour", "dramatic-side"],
  },
  {
    surfaceType: "liquid",
    recommendedLighting: "backlighting",
    reason: "Sıvılarda ışık geçirgenliği için arka ışık. Kahve kreması, bal gibi sıvılar arkadan ışıkla parlar.",
    geminiTerms: [
      "backlighting makes liquid glow",
      "translucent liquid illumination",
      "light passing through liquid",
      "subsurface glow",
    ],
    bestLightingPresetIds: ["dramatic-backlight"],
  },
  {
    surfaceType: "mixed",
    recommendedLighting: "soft-diffused",
    reason: "Karışık yüzeyler için dengeli ışık. Birden fazla doku tipinde yumuşak ışık en güvenli seçim.",
    geminiTerms: [
      "balanced soft lighting",
      "gentle even illumination",
      "soft diffused natural light",
    ],
    bestLightingPresetIds: ["soft-studio", "morning-window"],
  },
  // === YENİ DOKU TİPLERİ (Gemini Review 2026-02-03) ===
  // Patisserie için kritik eksik tipler eklendi
  {
    surfaceType: "flaky",
    recommendedLighting: "high-contrast-side",
    reason: "Katmanlı/pullu dokular (kruvasan) için yüksek kontrastlı yan ışık. Katmanların arasına gölge girmesi gerekir ki 'ayrışma' net görülsün.",
    geminiTerms: [
      "high-contrast side-lighting",
      "dramatic shadows between flaky layers",
      "crisp layer separation visible",
      "texture-emphasizing directional light",
    ],
    bestLightingPresetIds: ["dramatic-side", "mediterranean-terrace"],
  },
  {
    surfaceType: "powdery",
    recommendedLighting: "flat-frontal",
    reason: "Unlu/pudra şekerli dokular için düşük yoğunluklu düz ön ışık. Tozlu doku sert gölgeleri sevmez; sert gölge tozu 'kirli' gösterir.",
    geminiTerms: [
      "flat frontal light",
      "low-intensity even illumination",
      "shadow-free powder coating",
      "clean powder sugar appearance",
      "diffused front lighting",
    ],
    bestLightingPresetIds: ["soft-studio", "morning-window"],
  },
  {
    surfaceType: "velvety",
    recommendedLighting: "top-down-ambient",
    reason: "Kadifemsi dokular (velvet sprey çikolata) için yukarıdan ambient ışık. Kadife doku ışığı her yöne dağıttığı için, belirli yönden gelen sert ışık 'mat lüks' hissini bozar.",
    geminiTerms: [
      "top-down ambient light",
      "soft overhead illumination",
      "even light distribution for velvet texture",
      "matte luxury appearance",
      "non-directional soft lighting",
    ],
    bestLightingPresetIds: ["soft-studio"],
  },
];

// ==========================================
// PROMPT POLLUTION TERİMLERİ
// GEMINI-TEXTURE-DICTIONARY.md'den derlendi
// İşe yaramayan, kaçınılması gereken terimler
// ==========================================

export const PROMPT_POLLUTION_TERMS: PromptPollutionTerm[] = [
  {
    term: "8K",
    reason: "Fiziksel çözünürlüğü değiştirmez, sadece estetik işaretçi. Gemini zaten maksimum kalite üretir.",
    severity: "warning",
    alternative: "sharp focus on details",
  },
  {
    term: "4K",
    reason: "Fiziksel çözünürlüğü değiştirmez. Çözünürlük model tarafından belirlenir.",
    severity: "warning",
    alternative: "crisp details",
  },
  {
    term: "ultra HD",
    reason: "Anlamsız terim. Model zaten yüksek kalite üretir.",
    severity: "warning",
    alternative: "high detail",
  },
  {
    term: "hyper-realistic",
    reason: "Ters tepebilir, over-processing yapabilir. Aşırı işleme artifaktlara neden olur.",
    severity: "block",
    alternative: "realistic photograph",
  },
  {
    term: "photorealistic",
    reason: "Gereksiz. 'a photo of' ifadesi zaten gerçekçilik sağlar.",
    severity: "warning",
    alternative: "a photo of",
  },
  {
    term: "extremely detailed",
    reason: "Çok genel. Model ne detayını bilmiyor, spesifik olmak gerekir.",
    severity: "warning",
    alternative: "intricate textures visible",
  },
  {
    term: "best quality",
    reason: "Anlamsız. Model her zaman en iyisini yapmaya çalışıyor.",
    severity: "warning",
  },
  {
    term: "cinematic lighting",
    reason: "Çok belirsiz. Hangi sinema? Hangi ışık? Spesifik olmak gerekir.",
    severity: "warning",
    alternative: "dramatic side-lighting at 45 degrees",
  },
  {
    term: "masterpiece",
    reason: "Subjektif ve anlamsız. Model kalite kararı veremiyor.",
    severity: "warning",
  },
  {
    term: "award winning",
    reason: "Model ödül kavramını anlamıyor. Teknik terimler daha etkili.",
    severity: "warning",
  },
  {
    term: "professional",
    reason: "Çok genel. 'Professional lifestyle photography' gibi bağlam gerekir.",
    severity: "warning",
    alternative: "professional food photography",
  },
  {
    term: "high resolution",
    reason: "Çözünürlük prompt'tan bağımsız. Model kapasitesi belirler.",
    severity: "warning",
  },
];

// ==========================================
// ATMOSPHERIC INTEGRATION - RENK SICAKLIĞI UYUMLULUK MATRİSİ
// Her ürün kategorisinin doğal görünmesi için tercih ettiği Kelvin aralığı
// ==========================================

export const PRODUCT_COLOR_EXPECTATIONS: ProductColorExpectation[] = [
  {
    category: "chocolate",
    preferredRange: { min: 2700, max: 3500, label: "warm amber" },
    tolerableRange: { min: 2500, max: 4000, label: "warm to neutral" },
    forbiddenRange: { min: 5500, max: 7000, label: "cool blue" }, // Çikolata mavimsi OLMAMALI
    dominantHue: "warm brown",
    colorGradingHint: "Enhance warm brown tones, slight orange undertones. Avoid any blue cast on chocolate surface.",
  },
  {
    category: "viennoiserie",
    preferredRange: { min: 3000, max: 4500, label: "warm golden" },
    tolerableRange: { min: 2700, max: 5500, label: "warm to daylight" },
    dominantHue: "golden brown",
    colorGradingHint: "Emphasize golden-brown crust, warm buttery tones. Maillard reaction colors should pop.",
  },
  {
    category: "coffee",
    preferredRange: { min: 2700, max: 3500, label: "warm cozy" },
    tolerableRange: { min: 2500, max: 5000, label: "warm to neutral" },
    dominantHue: "rich brown",
    colorGradingHint: "Rich espresso brown, golden crema highlights. Steam should appear warm, not cold.",
  },
  {
    category: "slice-cakes",
    preferredRange: { min: 4000, max: 5500, label: "neutral daylight" },
    tolerableRange: { min: 3500, max: 6000, label: "balanced" },
    dominantHue: "varied",
    colorGradingHint: "True color representation important. Frosting colors should be accurate, not yellow-shifted.",
  },
  {
    category: "big-cakes",
    preferredRange: { min: 4000, max: 5500, label: "neutral daylight" },
    tolerableRange: { min: 3500, max: 6000, label: "balanced" },
    dominantHue: "varied",
    colorGradingHint: "Accurate color reproduction for decorations. White frosting should appear white, not cream.",
  },
  {
    category: "small-desserts",
    preferredRange: { min: 4500, max: 5500, label: "bright neutral" },
    tolerableRange: { min: 4000, max: 6000, label: "neutral to bright" },
    dominantHue: "vibrant",
    colorGradingHint: "Vibrant colors, accurate representation. Pastels should be delicate, not muddy.",
  },
  {
    category: "profiterole",
    preferredRange: { min: 3000, max: 4000, label: "warm" },
    tolerableRange: { min: 2700, max: 4500, label: "warm to neutral" },
    dominantHue: "chocolate brown",
    colorGradingHint: "Glossy chocolate sauce should appear rich brown. Cream should be warm white, not stark.",
  },
  {
    category: "special-orders",
    preferredRange: { min: 4000, max: 5500, label: "neutral daylight" },
    tolerableRange: { min: 3500, max: 6000, label: "flexible" },
    dominantHue: "varied",
    colorGradingHint: "Adapt to product dominant color. Prioritize accurate color representation.",
  },
];

// ==========================================
// MOOD-PRODUCT RENK UYUMU MATRİSİ
// Hangi mood hangi ürünle iyi gider?
// ==========================================

export const COLOR_HARMONY_PROFILES: ColorHarmonyProfile[] = [
  // Sabah Enerjisi (5500K) - Soğuk tonlar
  { productCategory: "chocolate", moodStyle: "morning-ritual", harmonyScore: 45, paletteOverlap: ["cream"], conflictingColors: ["cool blue vs warm brown"], suggestedAdjustment: "warm up +500K" },
  { productCategory: "viennoiserie", moodStyle: "morning-ritual", harmonyScore: 90, paletteOverlap: ["cream", "golden", "pastel"], conflictingColors: [], suggestedAdjustment: "none" },
  { productCategory: "coffee", moodStyle: "morning-ritual", harmonyScore: 85, paletteOverlap: ["cream", "white"], conflictingColors: [], suggestedAdjustment: "slight warm +200K" },
  { productCategory: "slice-cakes", moodStyle: "morning-ritual", harmonyScore: 80, paletteOverlap: ["pastel", "white"], conflictingColors: [], suggestedAdjustment: "none" },
  { productCategory: "small-desserts", moodStyle: "morning-ritual", harmonyScore: 88, paletteOverlap: ["pastel", "vibrant"], conflictingColors: [], suggestedAdjustment: "none" },

  // Rustik Nostalji (3000K) - Sıcak tonlar
  { productCategory: "chocolate", moodStyle: "rustic-heritage", harmonyScore: 95, paletteOverlap: ["earth tones", "copper", "deep browns"], conflictingColors: [], suggestedAdjustment: "none" },
  { productCategory: "viennoiserie", moodStyle: "rustic-heritage", harmonyScore: 92, paletteOverlap: ["golden", "earth tones"], conflictingColors: [], suggestedAdjustment: "none" },
  { productCategory: "coffee", moodStyle: "rustic-heritage", harmonyScore: 98, paletteOverlap: ["copper", "deep browns"], conflictingColors: [], suggestedAdjustment: "none" },
  { productCategory: "slice-cakes", moodStyle: "rustic-heritage", harmonyScore: 65, paletteOverlap: ["cream"], conflictingColors: ["cool pastels vs warm amber"], suggestedAdjustment: "cool down -300K or use warm-toned cakes" },
  { productCategory: "small-desserts", moodStyle: "rustic-heritage", harmonyScore: 60, paletteOverlap: [], conflictingColors: ["vibrant colors vs muted earth"], suggestedAdjustment: "cool down -500K" },

  // Lüks Gece (3500K) - Dramatik
  { productCategory: "chocolate", moodStyle: "gourmet-midnight", harmonyScore: 100, paletteOverlap: ["black", "deep gray", "gold accents"], conflictingColors: [], suggestedAdjustment: "none - perfect match" },
  { productCategory: "viennoiserie", moodStyle: "gourmet-midnight", harmonyScore: 55, paletteOverlap: ["gold"], conflictingColors: ["bright pastry vs dark mood"], suggestedAdjustment: "brighten pastry with rim light" },
  { productCategory: "coffee", moodStyle: "gourmet-midnight", harmonyScore: 90, paletteOverlap: ["deep gray", "gold"], conflictingColors: [], suggestedAdjustment: "none" },
  { productCategory: "profiterole", moodStyle: "gourmet-midnight", harmonyScore: 95, paletteOverlap: ["black", "gold accents"], conflictingColors: [], suggestedAdjustment: "none" },

  // Sosyal Paylaşım (5000K) - Nötr
  { productCategory: "chocolate", moodStyle: "bright-airy", harmonyScore: 70, paletteOverlap: ["warm neutrals"], conflictingColors: ["slightly cool for chocolate"], suggestedAdjustment: "warm up +300K" },
  { productCategory: "viennoiserie", moodStyle: "bright-airy", harmonyScore: 85, paletteOverlap: ["warm neutrals", "soft gold"], conflictingColors: [], suggestedAdjustment: "none" },
  { productCategory: "slice-cakes", moodStyle: "bright-airy", harmonyScore: 90, paletteOverlap: ["white", "soft colors"], conflictingColors: [], suggestedAdjustment: "none" },
  { productCategory: "small-desserts", moodStyle: "bright-airy", harmonyScore: 92, paletteOverlap: ["vibrant", "soft gold"], conflictingColors: [], suggestedAdjustment: "none" },

  // Samimi Köşe (3200K) - Sıcak samimi
  { productCategory: "chocolate", moodStyle: "cozy-intimate", harmonyScore: 92, paletteOverlap: ["warm beige", "soft brown"], conflictingColors: [], suggestedAdjustment: "none" },
  { productCategory: "viennoiserie", moodStyle: "cozy-intimate", harmonyScore: 88, paletteOverlap: ["warm beige", "cream"], conflictingColors: [], suggestedAdjustment: "none" },
  { productCategory: "coffee", moodStyle: "cozy-intimate", harmonyScore: 95, paletteOverlap: ["warm beige", "soft brown", "cream"], conflictingColors: [], suggestedAdjustment: "none" },
  { productCategory: "slice-cakes", moodStyle: "cozy-intimate", harmonyScore: 75, paletteOverlap: ["cream"], conflictingColors: ["cool frostings may look yellow"], suggestedAdjustment: "use warm-toned cakes or cool down slightly" },
];

/**
 * Kelvin değerini string'den parse et
 * "3000K" -> 3000
 */
export function parseKelvin(kelvinStr: string): number {
  const match = kelvinStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 5000; // Default daylight
}

/**
 * Ürün kategorisi için renk beklentisini bul
 */
export function getProductColorExpectation(category: string): ProductColorExpectation | null {
  return PRODUCT_COLOR_EXPECTATIONS.find(e => e.category === category) || null;
}

/**
 * Mood-Product uyum skorunu bul
 */
export function getColorHarmonyScore(productCategory: string, moodStyle: string): ColorHarmonyProfile | null {
  return COLOR_HARMONY_PROFILES.find(
    h => h.productCategory === productCategory && h.moodStyle === moodStyle
  ) || null;
}

// ==========================================
// SEED HELPER
// ==========================================

/**
 * Tüm Gemini terminoloji verilerini döndürür
 * ID'ler otomatik oluşturulur (slug formatında)
 */
export function getGeminiTerminologySeedData() {
  const createSlug = (name: string): string =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  return {
    lightingPresets: LIGHTING_PRESETS.map((p) => ({
      id: createSlug(p.nameEn),
      ...p,
    })),
    handPoses: HAND_POSES.map((p) => ({
      id: createSlug(p.nameEn),
      ...p,
    })),
    compositionTemplates: COMPOSITION_TEMPLATES.map((t) => ({
      id: createSlug(t.nameEn),
      ...t,
    })),
    moodDefinitions: MOOD_DEFINITIONS.map((m) => ({
      id: createSlug(m.nameEn),
      ...m,
    })),
    productTextureProfiles: PRODUCT_TEXTURE_PROFILES.map((p) => ({
      id: p.category,
      ...p,
    })),
    negativePromptSets: NEGATIVE_PROMPT_SETS.map((n) => ({
      id: createSlug(n.name),
      ...n,
    })),
    textureLightingMap: TEXTURE_LIGHTING_MAP,
    promptPollutionTerms: PROMPT_POLLUTION_TERMS,
    productColorExpectations: PRODUCT_COLOR_EXPECTATIONS,
    colorHarmonyProfiles: COLOR_HARMONY_PROFILES,
  };
}

/**
 * Style Studio v2 — Sahne Standartları Seed Verisi
 * Yeni alanlar: servingBase, propRules, depthOfField, productFrameRatio, scenePrompt
 */

export interface SceneStandardSeed {
  id: string;
  name: string;
  description: string; // Türkçe açıklama (UI'da görünür)
  referenceImage: string; // Seed'de boş bırakılır
  background: { type: string; color: string; description: string };
  lighting: {
    direction: string;
    quality: string;
    temperature: string;
    shadowCharacter: string;
    description: string;
  };
  colorPalette: string[]; // 5 hex renk
  surface: { material: string; texture: string; description: string };
  ambiance: { mood: string; adjectives: string[]; description: string };
  servingBase: {
    type: string;
    shape: string;
    color: string;
    heightCm: number;
    description: string;
  };
  propRules: {
    allowed: boolean;
    types: string[];
    maxCount: number;
    description: string;
  };
  depthOfField: { foreground: string; background: string; description: string };
  cameraAngle: string;
  productFrameRatio: number; // 0.4–0.7 arası
  scenePrompt: string; // İngilizce, [PRODUCT] placeholder içerir
  isActive: boolean;
  isDefault: boolean;
  createdAt: number;
}

export function buildDefaultSceneStandards(now: number): SceneStandardSeed[] {
  return [
    {
      id: "minimal-white",
      name: "Minimal White",
      description:
        "Sade beyaz stüdyo — ürünün kendisi öne çıkar, maksimum negatif alan",
      referenceImage: "",
      background: {
        type: "solid",
        color: "#FFFFFF",
        description:
          "Pure white seamless background with a gentle vignette fade at the edges",
      },
      lighting: {
        direction: "overhead",
        quality: "soft diffused",
        temperature: "5000K daylight",
        shadowCharacter: "minimal — soft and nearly invisible drop shadow",
        description:
          "Large overhead softbox with full diffusion panel at 5000K; even, shadow-free illumination that reveals product texture without drama",
      },
      colorPalette: ["#FFFFFF", "#F5F5F5", "#E8E8E8", "#CCCCCC", "#333333"],
      surface: {
        material: "white coated surface",
        texture: "smooth matte",
        description:
          "Seamless white matte surface, completely prop-free, product as the sole visual element",
      },
      ambiance: {
        mood: "minimal",
        adjectives: ["clean", "airy", "modern", "clinical"],
        description:
          "Pure minimalist aesthetic with maximum negative space; the product breathes freely against an immaculate white field",
      },
      servingBase: {
        type: "round-marble",
        shape: "round",
        color: "#E8E4DE",
        heightCm: 0.5,
        description:
          "Round light grey marble serving base, 0.5cm height, subtle veining, matte finish",
      },
      propRules: {
        allowed: false,
        types: [],
        maxCount: 0,
        description:
          "No props permitted; only the product and its serving base are visible in the frame",
      },
      depthOfField: {
        foreground: "sharp — product in full focus",
        background: "clean white, no bokeh needed",
        description:
          "Focused throughout the product; background is pure white so depth-of-field blur is not required",
      },
      cameraAngle: "three-quarter",
      productFrameRatio: 0.55,
      scenePrompt:
        "Professional food product photography of [PRODUCT] on a round light grey marble serving base (0.5cm height, subtle veining) placed on a pure white seamless surface. Overhead softbox lighting at 5000K daylight temperature with large diffusion panel — even, shadow-free illumination. Three-quarter camera angle, 85mm lens, f/3.5 aperture, product occupying 55% of the frame. Generous negative space on all sides. No props, no textures beyond the marble base. Colours: pure white (#FFFFFF), light grey (#E8E8E8), charcoal accent (#333333). Hyper-realistic commercial food photography, editorial quality.",
      isActive: true,
      isDefault: true,
      createdAt: now,
    },
    {
      id: "dark-moody",
      name: "Dark & Moody",
      description:
        "Dramatik karanlık atmosfer — sıcak amber tonlarıyla premium ve gizemli his",
      referenceImage: "",
      background: {
        type: "solid",
        color: "#1A1A1A",
        description:
          "Deep charcoal-black background, near-black with very subtle surface texture visible only under raking light",
      },
      lighting: {
        direction: "side-left",
        quality: "hard directional",
        temperature: "3200K amber",
        shadowCharacter:
          "deep and dramatic — long warm shadows extending across the surface",
        description:
          "Single hard light source from the left at 3200K amber; high contrast with deep, warm shadows that sculpt the product form",
      },
      colorPalette: ["#1A1A1A", "#2D2D2D", "#8B6914", "#C4A24D", "#F5E6C8"],
      surface: {
        material: "dark slate",
        texture: "fine grain",
        description:
          "Dark slate or black marble surface with barely perceptible fine grain; absorbs light to deepen shadows",
      },
      ambiance: {
        mood: "dramatic",
        adjectives: ["moody", "luxurious", "mysterious", "premium"],
        description:
          "High-contrast dark atmosphere with warm amber accents; evokes premium indulgence and intimate gastronomy",
      },
      servingBase: {
        type: "round-slate",
        shape: "round",
        color: "#2A2A2A",
        heightCm: 1.0,
        description:
          "Round dark slate serving board, 1cm height, matte black finish, slight natural roughness",
      },
      propRules: {
        allowed: true,
        types: ["crumbs", "sauce-drizzle"],
        maxCount: 1,
        description:
          "Maximum one prop element allowed — either natural crumbs scattered at the product base or a fine sauce drizzle; no decorative objects",
      },
      depthOfField: {
        foreground:
          "sharp — product and serving base in crisp focus at f/2.8",
        background:
          "soft warm bokeh — background surface fades into rich amber blur",
        description:
          "Shallow depth of field at f/2.8 creates a warm bokeh background; foreground product remains tack-sharp to maximise texture detail",
      },
      cameraAngle: "45-degree",
      productFrameRatio: 0.6,
      scenePrompt:
        "Dramatic dark-moody food product photography of [PRODUCT] on a round dark slate serving board (1cm height, matte black) on a charcoal-black surface. Single hard side-left light at 3200K amber creating deep warm shadows and strong contrast. 45-degree camera angle, 85mm lens, f/2.8 aperture — product sharp, background fades into warm amber bokeh. Product occupying 60% of frame. Optional: scattered natural crumbs at the product base (max 1 prop). Colour palette: near-black (#1A1A1A), deep slate (#2D2D2D), warm amber (#C4A24D), cream (#F5E6C8). Cinematic luxury food photography, premium editorial quality.",
      isActive: true,
      isDefault: false,
      createdAt: now,
    },
    {
      id: "rustic-wood",
      name: "Rustic Wood",
      description:
        "Doğal ahşap yüzey — sıcak, el yapımı, otantik zanaatkarlık hissi",
      referenceImage: "",
      background: {
        type: "textured",
        color: "#8B6343",
        description:
          "Aged oak planks background with visible grain, knots, and warm brown patina; horizontal wood grain orientation",
      },
      lighting: {
        direction: "right",
        quality: "natural soft",
        temperature: "3800K warm window light",
        shadowCharacter:
          "gentle — soft directional shadows that follow wood grain",
        description:
          "Natural window light from the right at 3800K; soft and warm with subtle diffusion, creating gentle shadows that emphasise both product and wood texture",
      },
      colorPalette: ["#8B6343", "#C49A6C", "#F5E6D3", "#6B4226", "#D4A96A"],
      surface: {
        material: "aged oak",
        texture: "visible wood grain",
        description:
          "Aged oak surface with prominent natural grain, warm amber tones, and authentic weathering marks",
      },
      ambiance: {
        mood: "cozy",
        adjectives: ["rustic", "warm", "artisanal", "wholesome"],
        description:
          "Warm, handcrafted atmosphere with natural textures evoking artisanal craftsmanship and genuine authenticity",
      },
      servingBase: {
        type: "rectangle-walnut",
        shape: "rectangle",
        color: "#5C3D2E",
        heightCm: 1.5,
        description:
          "Rectangular walnut cutting board, 1.5cm height, natural oil finish, visible end-grain detail",
      },
      propRules: {
        allowed: true,
        types: ["fresh-herbs", "crumbs", "linen-fabric"],
        maxCount: 2,
        description:
          "Up to two prop elements allowed from: fresh herbs (sprig of rosemary or thyme), scattered crumbs, or a folded linen cloth at the frame edge; no more than two simultaneously",
      },
      depthOfField: {
        foreground: "sharp — product and board in crisp focus at f/3.5",
        background:
          "soft warm blur — wood background gently out of focus at f/3.5",
        description:
          "Moderate depth of field at f/3.5; product and board sharp, background wood softens into warm blur while still suggesting texture",
      },
      cameraAngle: "45-degree",
      productFrameRatio: 0.5,
      scenePrompt:
        "Warm artisanal food product photography of [PRODUCT] on a rectangular walnut cutting board (1.5cm height, natural oil finish, visible end-grain) on an aged oak surface with natural grain. Natural window light from the right at 3800K, soft warm directional light with gentle shadows. 45-degree camera angle, 85mm lens, f/3.5 aperture — product sharp, background oak softly blurred. Product occupying 50% of frame. Optional props (max 2): sprig of fresh rosemary or thyme and/or scattered crumbs at base. Colour palette: warm oak (#8B6343), honey amber (#C49A6C), cream (#F5E6D3), dark walnut (#6B4226). Rustic artisanal food photography, editorial quality.",
      isActive: true,
      isDefault: false,
      createdAt: now,
    },
    {
      id: "marble-elegance",
      name: "Marble Elegance",
      description:
        "Carrara mermer yüzey — soğuk, rafine, lüks marka estetiği",
      referenceImage: "",
      background: {
        type: "textured",
        color: "#F8F5F0",
        description:
          "Carrara white marble with delicate grey veining; cool, pristine, and refined surface",
      },
      lighting: {
        direction: "frontal fill",
        quality: "soft diffused",
        temperature: "4500K neutral-cool",
        shadowCharacter:
          "barely visible — even fill with a very soft accent shadow",
        description:
          "Frontal soft fill light at 4500K with a subtle side accent; even illumination that highlights marble veining without harsh reflections on the polished surface",
      },
      colorPalette: ["#F8F5F0", "#E8E4DE", "#C8C0B8", "#9B9590", "#2C2C2C"],
      surface: {
        material: "polished Carrara marble",
        texture: "smooth with fine grey veining",
        description:
          "Polished Carrara marble with delicate grey veining and cool white base; sophisticated and pristine",
      },
      ambiance: {
        mood: "elegant",
        adjectives: ["luxurious", "refined", "sophisticated", "timeless"],
        description:
          "High-end luxury aesthetic with cool marble tones and pristine presentation; suggests premium quality and timeless elegance",
      },
      servingBase: {
        type: "round-marble",
        shape: "round",
        color: "#E8E4DE",
        heightCm: 0.5,
        description:
          "Round light grey marble serving base, 0.5cm height, subtle veining, matte finish",
      },
      propRules: {
        allowed: true,
        types: ["crumbs"],
        maxCount: 1,
        description:
          "Maximum one prop allowed — only delicate crumbs scattered naturally at the product base; no other decorative elements",
      },
      depthOfField: {
        foreground: "sharp — product and base in crisp focus at f/4",
        background:
          "subtle soft blur — marble background fades gently, veining still suggested",
        description:
          "Controlled depth of field at f/4; product and serving base tack-sharp, marble surface behind gradually softens while its texture remains implied",
      },
      cameraAngle: "three-quarter",
      productFrameRatio: 0.55,
      scenePrompt:
        "Elegant luxury food product photography of [PRODUCT] on a round light grey marble serving base (0.5cm height, subtle veining, matte finish) on polished Carrara white marble with delicate grey veining. Frontal soft fill light at 4500K neutral-cool temperature with a subtle side accent — even, reflection-controlled illumination. Three-quarter camera angle, 85mm lens, f/4 aperture — product and base sharp, marble surface behind softly blurred. Product occupying 55% of frame. Optional prop (max 1): delicate crumbs scattered at the product base. Colour palette: warm white (#F8F5F0), light grey marble (#E8E4DE), mid grey (#C8C0B8), cool taupe (#9B9590), charcoal (#2C2C2C). High-end luxury brand food photography, editorial quality.",
      isActive: true,
      isDefault: false,
      createdAt: now,
    },
  ];
}

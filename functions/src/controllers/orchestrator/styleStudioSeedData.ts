/**
 * Style Studio — Varsayılan Görsel Standartlar
 * Seed verisi buradan yönetilir, koda gömülmez
 */

export interface VisualStandardSeed {
  id: string;
  name: string;
  description: string;
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
}

export function buildDefaultVisualStandards(now: number): VisualStandardSeed[] {
  return [
    {
      id: "minimal-white",
      name: "Minimal White",
      description: "Sade beyaz stüdyo — ürünün kendisi öne çıkar, maksimum negatif alan",
      isActive: true,
      isDefault: true,
      background: {
        type: "solid",
        color: "#FFFFFF",
        description: "Pure white seamless background with gentle vignette at edges",
      },
      lighting: {
        direction: "overhead",
        quality: "soft diffused",
        temperature: "neutral 4000K",
        description: "Overhead softbox with large diffusion panel, minimal shadows, clean and clinical feel",
      },
      colorPalette: ["#FFFFFF", "#F5F5F5", "#E8E8E8", "#CCCCCC", "#333333"],
      surface: {
        material: "none",
        texture: "smooth",
        description: "Clean white surface, no props or textures, product as the sole focus",
      },
      ambiance: {
        mood: "minimal",
        adjectives: ["clean", "airy", "modern"],
        description: "Pure minimalist aesthetic with maximum negative space, letting the product breathe",
      },
      cameraAngle: "three-quarter",
      overallDescription: "Crisp, clinical white studio photography. Product is the sole focus against a seamless white background with soft, even lighting that reveals texture and form without dramatic shadows.",
      promptTemplate: "Professional product photography of [PRODUCT] on a pure white seamless background. Soft overhead studio lighting with large diffusion, neutral 4000K color temperature. Clean minimal composition with generous negative space. Shot at three-quarter angle, shallow depth of field. No props, no texture — pure product focus. Commercial editorial style.",
      createdAt: now,
    },
    {
      id: "dark-moody",
      name: "Dark & Moody",
      description: "Dramatik karanlık atmosfer — sıcak amber tonlarıyla premium ve gizemli his",
      isActive: true,
      isDefault: false,
      background: {
        type: "solid",
        color: "#1A1A1A",
        description: "Deep dark slate or charcoal background, almost black with subtle texture",
      },
      lighting: {
        direction: "side",
        quality: "hard directional",
        temperature: "warm 2700-3500K",
        description: "Single dramatic side light with warm amber tones, creating strong contrast and deep shadows",
      },
      colorPalette: ["#1A1A1A", "#2D2D2D", "#8B6914", "#C4A24D", "#F5E6C8"],
      surface: {
        material: "concrete",
        texture: "rough",
        description: "Dark concrete or slate surface with subtle grain, adds depth and texture contrast",
      },
      ambiance: {
        mood: "dramatic",
        adjectives: ["moody", "dramatic", "luxurious"],
        description: "High contrast dark atmosphere with warm amber accents, creating a premium and mysterious feel",
      },
      cameraAngle: "45-degree",
      overallDescription: "Dramatic dark studio photography with strong side lighting and warm amber tones. Deep shadows and high contrast create a luxurious, editorial mood perfect for premium products.",
      promptTemplate: "Dramatic product photography of [PRODUCT] on a dark charcoal surface. Single warm side light at 2700K creating strong contrast and deep shadows. Dark moody atmosphere with amber accents. Shot at 45-degree angle. Premium editorial commercial photography style, cinematic quality.",
      createdAt: now,
    },
    {
      id: "rustic-wood",
      name: "Rustic Wood",
      description: "Doğal ahşap yüzey — sıcak, el yapımı, otantik zanaatkarlık hissi",
      isActive: true,
      isDefault: false,
      background: {
        type: "textured",
        color: "#8B6343",
        description: "Natural wood grain background, warm brown tones with visible grain texture",
      },
      lighting: {
        direction: "side",
        quality: "natural",
        temperature: "warm 3500K",
        description: "Natural window light from the side, soft and warm, creating gentle shadows that emphasize wood grain",
      },
      colorPalette: ["#8B6343", "#C49A6C", "#F5E6D3", "#6B4226", "#D4A96A"],
      surface: {
        material: "wood",
        texture: "grain",
        description: "Aged natural wood surface with visible grain, knots, and warm brown tones",
      },
      ambiance: {
        mood: "cozy",
        adjectives: ["rustic", "warm", "artisanal"],
        description: "Warm, handcrafted atmosphere with natural textures evoking artisanal craftsmanship and wholesome authenticity",
      },
      cameraAngle: "45-degree",
      overallDescription: "Warm rustic product photography on natural wood surfaces with soft window lighting. Handcrafted, artisanal feel with genuine textures and warm color palette evoking authenticity and craft.",
      promptTemplate: "Warm artisanal product photography of [PRODUCT] on a natural aged wood surface with visible grain. Soft natural window light from the side at 3500K, gentle warm shadows. Rustic cozy atmosphere with earthy brown tones. 45-degree angle shot. Handcrafted artisanal commercial photography style.",
      createdAt: now,
    },
    {
      id: "marble-elegance",
      name: "Marble Elegance",
      description: "Carrara mermer yüzey — soğuk, rafine, lüks marka estetiği",
      isActive: true,
      isDefault: false,
      background: {
        type: "textured",
        color: "#F8F5F0",
        description: "Carrara white marble with subtle grey veining, refined and luxurious",
      },
      lighting: {
        direction: "front",
        quality: "soft diffused",
        temperature: "neutral 4000K",
        description: "Frontal fill light with gentle side accent, even illumination that highlights marble texture without harsh reflections",
      },
      colorPalette: ["#F8F5F0", "#E8E4DE", "#C8C0B8", "#9B9590", "#2C2C2C"],
      surface: {
        material: "marble",
        texture: "smooth",
        description: "Polished Carrara marble with delicate grey veining, cool and sophisticated",
      },
      ambiance: {
        mood: "elegant",
        adjectives: ["luxurious", "refined", "sophisticated"],
        description: "High-end luxury aesthetic with cool marble tones and pristine presentation, suggesting premium quality and timeless elegance",
      },
      cameraAngle: "three-quarter",
      overallDescription: "Sophisticated marble surface product photography with even frontal lighting. Cool, elegant Carrara marble background with subtle grey veining creates a luxurious context for premium products.",
      promptTemplate: "Elegant luxury product photography of [PRODUCT] on polished Carrara white marble with subtle grey veining. Even frontal fill light at 4000K neutral temperature, slight side accent. Cool sophisticated atmosphere, pristine and refined. Three-quarter angle shot. High-end editorial commercial photography, luxury brand aesthetic.",
      createdAt: now,
    },
  ];
}

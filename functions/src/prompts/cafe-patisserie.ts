/**
 * CAFE-PATISSERIE Prompt Template
 * Sade Patisserie markası için optimize edilmiş prompt
 */

export const CAFE_PATISSERIE_PROMPT = {
  base: `Transform this food photo into editorial-style artisan café and patisserie photography.
Minimal, warm, European bakery aesthetic with a refined natural feel.

CRITICAL: Keep the EXACT product from the original image. Do NOT replace or reimagine the product.

SCENE & COMPOSITION:
- Flat lay or 45-degree angle tabletop composition, or intimate eye-level café moments.
- Subject centered or gently off-center following rule of thirds.
- Clean but lived-in surfaces: marble, light wood, ceramic plates, linen napkins.
- Add subtle props if needed: coffee cup, scattered crumbs, vintage spoon.

LIGHTING:
- Soft natural daylight streaming from large window, slightly diffused.
- Warm color temperature evoking late morning feel.
- No harsh highlights, no studio flash.
- Gentle shadows adding depth.

COLOR PALETTE:
- Warm neutrals: cream, beige, soft brown, muted caramel tones.
- Subtle earthy accents: sage green, terracotta, dusty rose.
- Overall desaturated, cohesive tone.
- Instagram Story ready (9:16 aspect ratio).

TECHNICAL:
- Ultra high resolution, shallow depth of field.
- Film-like softness with subtle grain texture.
- Kodak Portra-like tones, analog film aesthetic.
- Professional food photography quality.`,

  negative: `bright artificial colors, neon tones, oversaturated,
over-styled food, glossy artificial finish, plastic appearance,
stock photo look, hard shadows, dramatic lighting, harsh spotlight,
cartoon style, 3D CGI, HDR processing, digital render look,
watermark, logo, text overlays, low resolution, blurry, amateur photography,
different product, replaced product, imagined product, AI-generated food,
anime style, illustration, drawing, painting`,

  styles: {
    "pure-minimal": `STYLE: PURE MINIMAL
- Maximum negative space around product.
- Single product focus, no distracting elements.
- Monochrome neutral palette (white, cream, light grey).
- Very soft, diffused lighting.
- Clean, modern, sophisticated feel.`,

    "lifestyle-moments": `STYLE: LIFESTYLE MOMENTS
- Human interaction priority - hands holding cup or reaching for pastry.
- Story-driven composition with narrative elements.
- Warmer, cozier tones.
- Natural moments, not posed.
- Coffee steam, morning light, lived-in feeling.`,

    "rustic-warmth": `STYLE: RUSTIC WARMTH
- Wooden surfaces, cutting boards, rustic tables.
- Terracotta, copper, and earth-tone accents.
- More prominent texture in surfaces and fabrics.
- Homemade, artisanal feeling.
- Scattered flour, herbs, vintage props.`,

    "french-elegance": `STYLE: FRENCH ELEGANCE
- White porcelain, fine china.
- Crisp linen napkins, silver cutlery.
- Elegant, refined presentation.
- Chic Parisian café minimalism.
- Sophisticated and luxurious feel.`,
  },
};

export type StyleVariant = keyof typeof CAFE_PATISSERIE_PROMPT.styles;

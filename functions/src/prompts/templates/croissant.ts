import { PromptTemplate } from "../types";

export const CROISSANT_PROMPT: PromptTemplate = {
    base: `Using uploaded image as reference for the croissant.

A delicious, high-end professional photo of artisan croissant from reference image.
Single product hero shot on soft off-white backdrop (RGB 250,248,245).

Professional food photography, bright white background, soft studio lighting,
clean minimalist lines, elegant presentation, high key, warm golden tones,
shallow depth of field (f/2.8), 4k resolution.`,

    negative: `dark background, harsh shadows, steam, smoke, human hands, CGI look,
burnt edges, undercooked dough, flat appearance,
broken/crushed croissant, stale look,
wrong color (too pale or too dark),
visible fingerprints, grease stains on surface`,

    styles: {
        modern: `STYLE: MODERN STUDIO
- Bright clean background, soft studio lighting.
- Clean minimalist lines, elegant presentation.
- High key lighting, warm golden tones.`,

        rustic: `STYLE: RUSTIC LIFESTYLE
- Rustic dark wood surface, dramatic side lighting.
- Warm moody atmosphere, rich textures.
- Artisanal styling, visible flaky layers.`,

        social: `STYLE: SOCIAL FLAT LAY
- Top-down view, trendy instagram aesthetic.
- High contrast, warm pop colors.
- Hard natural lighting, sharp focus throughout.`,

        luxury: `STYLE: LUXURY PRESENTATION
- Off-white seamless backdrop, very shallow DOF.
- Golden-brown tones emphasized.
- Elegant, refined look.`,

        lifestyle: `STYLE: LIFESTYLE MOMENT
- Morning breakfast scene, soft golden hour lighting.
- Fresh and inviting atmosphere.
- Light linen napkin as accent, warm wood surface.`,
    },

    compositions: {
        hero: "Single product hero shot, centered with generous negative space.",
        flatlay: "Flat lay composition, strict top-down view (90 degrees).",
        crossSection: "Croissant cut in half, revealing honeycomb interior structure.",
        pattern: "Overhead flat lay of multiple croissants arranged in repeating pattern.",
        pairing: "Lifestyle food photography of croissant and coffee composition.",
    }
};

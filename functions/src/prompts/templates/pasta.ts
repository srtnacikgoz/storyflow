import { PromptTemplate } from "../types";

export const PASTA_PROMPT: PromptTemplate = {
    base: `Using uploaded image as reference for the cake.

A delicious, high-end professional photo of artisan cake from reference image.
Single product hero shot on soft off-white backdrop (RGB 250,248,245).

Professional food photography, bright clean background, soft studio lighting,
elegant presentation, creamy textures emphasized, high key lighting,
warm inviting tones, shallow depth of field (f/2.8), 4k resolution.`,

    negative: `dark background, harsh shadows, steam, smoke, human hands, CGI look,
melted appearance, collapsed layers, dry cracked surface,
lopsided cake, messy presentation, crumbs everywhere,
artificial food coloring visible, plastic decorations looking fake,
sunken middle, overflowed filling, soggy bottom`,

    styles: {
        modern: `STYLE: MODERN STUDIO
- Bright clean background, soft studio lighting.
- Elegant presentation, creamy textures emphasized.
- High key lighting, warm inviting tones.`,

        rustic: `STYLE: RUSTIC LIFESTYLE
- Vintage cake stand, rustic wood table setting.
- Rustic warm atmosphere, natural window light.
- Cozy café aesthetic, rich textures.`,

        social: `STYLE: SOCIAL FLAT LAY
- Flat lay composition with elegant props.
- Top-down view, trendy instagram aesthetic.
- Clean minimalist composition, marble surface.`,

        luxury: `STYLE: LUXURY CELEBRATION
- Soft glamorous lighting, subtle sparkle.
- Luxurious presentation, gift-worthy appearance.
- Clean sophisticated backdrop.`,

        lifestyle: `STYLE: LIFESTYLE PAIRING
- Cake slice and tea/coffee composition.
- Afternoon tea atmosphere, warm golden light.
- Elegant table setting.`,
    },

    compositions: {
        hero: "Commercial product photography of whole decorated cake, centered.",
        slice: "Cake slice on plate, revealing beautiful interior layers.",
        crossSection: "Macro photography of cross-section showing distinct layers.",
        grid: "Overhead flat lay of assorted mini cakes arranged in grid.",
        pairing: "Lifestyle photography of cake slice and beverage.",
    }
};

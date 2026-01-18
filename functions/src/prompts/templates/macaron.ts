import { PromptTemplate } from "../types";

export const MACARON_PROMPT: PromptTemplate = {
    base: `Using uploaded image as reference for the macaron.

A delicious, high-end professional photo of French macaron from reference.
Single or paired macarons on soft off-white backdrop (RGB 250,248,245).

Professional food photography, bright clean background, soft diffused lighting,
elegant pastel presentation, smooth shell texture visible,
delicate ruffled feet detail, shallow depth of field (f/2.8), 4k resolution.`,

    negative: `dark background, black backdrop, grey background,
steam, smoke, vapor, mist,
human hands, fingers, human elements,
harsh shadows, flash photography,
cracked shells, hollow macarons, lopsided shape,
uneven feet, no feet visible, glossy wet appearance,
color distortion, oversaturated colors`,

    styles: {
        modern: `STYLE: MODERN PASTEL
- Bright clean background, soft diffused lighting.
- Elegant pastel presentation.
- Smooth shell texture, delicate ruffled feet.`,

        rustic: `STYLE: RUSTIC PATISSERIE
- Vintage plate or marble surface.
- Soft natural light, romantic aesthetic.
- Pastel colors pop against neutral surface.`,

        social: `STYLE: SOCIAL RAINBOW
- Rainbow gradient or organized grid pattern.
- Top-down view, trendy instagram aesthetic.
- Even soft lighting, sharp focus throughout.`,

        luxury: `STYLE: LUXURY GIFT
- Soft glamorous lighting, subtle sparkle.
- Elegant gift-worthy presentation.
- Nestled in packaging if applicable.`,

        lifestyle: `STYLE: LIFESTYLE SCATTERED
- Artistic food photography, scattered on surface.
- Casual elegant arrangement.
- Soft natural light, visual harmony.`,
    },

    compositions: {
        hero: "Macro product photography of single macaron, centered.",
        stack: "Stacked macarons, 2-3 vertically, complementary colors.",
        rainbow: "Flat lay rainbow gradient, strict top-down view.",
        box: "Commercial product photography of macaron gift box.",
        filling: "Macaron with bite taken, showing luscious filling.",
    }
};

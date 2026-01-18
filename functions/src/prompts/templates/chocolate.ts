import { PromptTemplate } from "../types";

export const CHOCOLATE_PROMPT: PromptTemplate = {
    base: `Using uploaded image as reference for the chocolate.

A delicious, high-end professional photo of artisan chocolate from reference.
Single piece or small arrangement on soft off-white backdrop (RGB 250,248,245).

Professional food photography, bright clean background, soft studio lighting,
luxurious presentation, glossy finish emphasized, high key lighting,
rich chocolate tones, shallow depth of field (f/2.8), 4k resolution.`,

    negative: `dark background, black backdrop, grey background,
steam, smoke, vapor, mist,
human hands, fingers, human elements,
harsh shadows, flash photography,
CGI look, artificial, plastic appearance,
chocolate bloom (white spots), melted appearance,
fingerprints, smudges, dust particles,
uneven tempering, dull matte where should be glossy`,

    styles: {
        modern: `STYLE: MODERN STUDIO
- Bright clean background, soft studio lighting.
- Luxurious presentation, glossy finish emphasized.
- High key lighting, rich chocolate tones.`,

        rustic: `STYLE: RUSTIC ARTISANAL
- Placed on dark slate or marble surface.
- Moody elegant atmosphere, dramatic side lighting.
- Rich textures, craft chocolate aesthetic.`,

        social: `STYLE: SOCIAL GRID FLAT LAY
- Flat lay grid arrangement, organized rows and columns.
- Top-down view, trendy instagram aesthetic.
- Consistent lighting across all pieces.`,

        luxury: `STYLE: LUXURY BONBON
- Mirror-like surface reflection is key focus.
- Back light for maximum sheen.
- Rich color depth, luxurious appearance.`,

        lifestyle: `STYLE: LIFESTYLE INGREDIENT
- Story-telling composition with raw ingredients.
- Rustic wood or marble surface, warm lighting.
- Chocolate as hero, ingredients scattered artistically.`,
    },

    compositions: {
        hero: "Macro product photography of single chocolate bonbon, centered.",
        grid: "Professional flat lay arrangement in perfect grid pattern.",
        box: "Commercial product photography of gift box, brand elements visible.",
        break: "Broken chocolate bar showing clean snap and interior texture.",
    }
};

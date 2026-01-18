import { PromptTemplate } from "../types";

export const COFFEE_PROMPT: PromptTemplate = {
    base: `Using uploaded image as reference for the coffee.

A delicious, high-end professional photo of specialty coffee from reference.
Single cup on soft off-white backdrop (RGB 250,248,245).

Professional food photography, bright clean background, soft studio lighting,
latte art clearly visible (if present), crema texture detailed,
warm inviting tones, shallow depth of field (f/2.8), 4k resolution.

CRITICAL: NO STEAM, SMOKE, OR VAPOR.`,

    negative: `steam, smoke, vapor, mist, fog, hot steam rising,
dark background, black backdrop, grey background,
human hands, fingers, human elements,
harsh shadows, flash photography,
watery weak coffee, broken crema, flat foam,
dirty cup rim, lipstick marks, spills,
blurry latte art, melted ice, cloudy layers`,

    styles: {
        modern: `STYLE: MODERN CLEAN
- Bright clean background, soft studio lighting.
- Latte art clearly visible, crema texture detailed.
- Warm inviting tones, shallow depth of field.`,

        rustic: `STYLE: RUSTIC CAFE
- Rustic wood table, morning café atmosphere.
- Warm cozy aesthetic, natural window light.
- Inviting morning mood.`,

        social: `STYLE: SOCIAL FLAT LAY
- Flat lay composition with minimal elegant props.
- Top-down view, trendy instagram aesthetic.
- Clean composition, marble or light wood surface.`,

        luxury: `STYLE: LUXURY SPECIALTY
- High-end specialty coffee presentation.
- Elegant glassware or ceramic.
- Sophisticated lighting, premium feel.`,

        lifestyle: `STYLE: LIFESTYLE PAIRING
- Coffee and pastry pairing.
- Morning breakfast atmosphere, warm natural light.
- Inviting "come enjoy" mood.`,
    },

    compositions: {
        hero: "Overhead photography of latte art, strict top-down view.",
        side: "Side angle showing cup profile and layers/crema.",
        iced: "Side angle showing beautiful milk/coffee layers and ice.",
        pour: "Action shot of pour over brewing, water stream frozen.",
        flight: "Coffee flight, 3 different drinks arranged in line.",
    }
};

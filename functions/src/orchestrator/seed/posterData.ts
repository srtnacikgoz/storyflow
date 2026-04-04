/**
 * Poster Seed Data
 * Tasarım araştırmasına dayanan stiller, mood'lar ve aspect ratio'lar
 * Kaynak: Dribbble, Behance, Creative Bloq, Google Developers Blog (2025-2026 trendleri)
 */

import { PosterStyle, PosterMood, PosterAspectRatio, PosterTypography, PosterLayout, PosterCameraAngle, PosterLightingType, PosterBackground } from "../../types/poster";

// ═══════════════════════════════════════════════════════════════
// STİLLER — Her biri araştırmadan gelen farklı estetik yaklaşım
// ═══════════════════════════════════════════════════════════════

export const POSTER_STYLES: Omit<PosterStyle, "id">[] = [
  {
    name: "Bold Minimal",
    nameTr: "Cesur Minimal",
    description: "Cesur tipografi, tek güçlü görsel, amaçlı negatif alan, yüksek kontrast",
    promptDirections: {
      background: "Clean solid background — pure white, deep black, or a single bold color. No textures, no gradients. The emptiness is intentional and powerful.",
      typography: "Bold condensed sans-serif typeface. Title is large and commanding — it should feel like a magazine cover headline. High contrast between text and background. Minimal text: one title, one subtitle max.",
      layout: "Asymmetric composition. Product slightly off-center with generous negative space on one side for text. The empty space is deliberate — it creates tension and focus. Nothing decorative.",
      colorPalette: "Maximum 2-3 colors. High contrast pairs: black/white, navy/cream, charcoal/gold. One accent color allowed. No pastels, no gradients.",
      productPlacement: "Product is the hero — takes 35-45% of the frame. Slightly off-center using rule of thirds. Clean edges, no overlapping elements. Shot at eye level or slightly above.",
      lighting: "Hard directional light creating strong shadows. High contrast between highlights and shadows. Studio-quality, intentional lighting — not ambient.",
      overallFeel: "Confident, modern, magazine-cover energy. Every element earns its place. If it doesn't serve a purpose, it's removed.",
    },
    examplePromptFragment: "A bold minimal poster with stark contrast — the product sits powerfully off-center against a clean background, with commanding typography that demands attention. Shot on 85mm lens, f/2.8, hard directional studio lighting creating dramatic shadows.",
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Editorial Kinfolk",
    nameTr: "Editöryal Kinfolk",
    description: "Çok boşluk, pastel tonlar, analog fotoğraf hissi, sıcak minimalizm",
    promptDirections: {
      background: "Warm off-white, soft cream, or pale linen. Subtle paper texture like premium uncoated stock. Feels tactile and organic, like a high-end lifestyle magazine spread.",
      typography: "Elegant thin serif typeface — think Freight Display or Cormorant. Understated, not shouting. Title is medium-sized, refined. Generous letter-spacing. Small-caps for subtitles.",
      layout: "Extremely generous whitespace — at least 45% of the poster is breathing room. Product in upper third, text in lower third. Structured but airy, like a book page. Every element has room to exist.",
      colorPalette: "Muted, warm palette: cream, sand, soft terracotta, warm gray, dusty rose. Nothing saturated. Earth tones with subtle warmth. Feels like morning light on linen.",
      productPlacement: "Product modestly sized (25-30% height), centered or slightly left. Natural, relaxed placement — not forced or dramatic. Soft natural shadow beneath. Feels photographed, not designed.",
      lighting: "Soft diffused natural light — like morning window light. Low contrast, gentle shadows. Warm color temperature (3500-4000K). Film-like quality with slight grain.",
      overallFeel: "Quiet luxury. Scandinavian-Japanese hybrid. The poster feels like it belongs in a Kinfolk or Cereal magazine. Warm but minimal, inviting but restrained.",
    },
    examplePromptFragment: "An editorial lifestyle poster in the Kinfolk aesthetic — soft morning light bathes the product on warm cream paper, with elegant thin serif typography and generous whitespace. Shot on 50mm lens, f/4, natural diffused window light, subtle analog film grain.",
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Neo Deco",
    nameTr: "Neo Deco / Lüks",
    description: "Art Deco'nun modern yorumu: geometrik motifler, zarif serif tipografi, altın aksanlar",
    promptDirections: {
      background: "Deep, rich background — midnight navy, forest green, burgundy, or matte black. Optional: subtle geometric Art Deco pattern (thin gold lines, fan shapes, or chevrons) as a border or frame element.",
      typography: "Elegant high-contrast serif with Art Deco influence — geometric, structured, luxurious. Title is grand but not oversized. Gold or cream colored text on dark background. Tracked uppercase for subtitles.",
      layout: "Symmetrical, centered composition. Product framed by geometric elements — thin lines, arches, or decorative borders. Structured like a luxury brand advertisement. Balanced and deliberate.",
      colorPalette: "Dark luxury: midnight navy + gold, black + champagne, forest green + brass, burgundy + cream. Metallic accents (gold, brass, copper) are key. Rich, jewel-toned base colors.",
      productPlacement: "Product centered, elevated on a pedestal-like visual hierarchy. Takes 30-35% of frame. Surrounded by subtle geometric framing. Feels precious and presented, like a jewel in a case.",
      lighting: "Dramatic rim lighting or cinematic side light. Product glows against the dark background. Warm highlights on metallic elements. Moody but not murky.",
      overallFeel: "Old-world luxury meets modern design. Feels like a premium brand campaign — Cartier, Ladurée, or a luxury hotel menu. Sophisticated, timeless, unapologetically rich.",
    },
    examplePromptFragment: "A Neo Deco luxury poster — the product is presented like a precious object against deep midnight navy, framed by subtle gold geometric Art Deco elements, with elegant high-contrast serif typography. Cinematic rim lighting, warm gold highlights, shot on 100mm macro lens, f/2.8.",
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Swiss International",
    nameTr: "Swiss / Uluslararası",
    description: "Grid sistemi, temiz sans-serif, asimetrik layout, bilgi hiyerarşisi",
    promptDirections: {
      background: "Clean, flat color — white, light gray, or a single saturated color (red, blue, yellow). No texture, no gradient. The background is a canvas for the grid.",
      typography: "Clean geometric sans-serif — Helvetica, Akzidenz-Grotesk style. Flush-left alignment, ragged-right. Title is bold but follows the grid. Numbers and details are treated as design elements. Strong hierarchy through size contrast.",
      layout: "Strict mathematical grid. Asymmetric but structured — content aligns to invisible columns. Information hierarchy is paramount. Product and text occupy distinct grid zones. Feels organized, rational, functional.",
      colorPalette: "Limited palette: black + white + one accent color (Swiss red, blue, or yellow). Or monochrome with a single bright accent. Colors are flat and confident — no shading, no gradient.",
      productPlacement: "Product placed precisely within the grid — not floating freely. Often in the upper-right or lower-left quadrant. Treated as one element in the system, not the only element. Clean cutout with no shadow if on colored background.",
      lighting: "Even, flat lighting. No dramatic shadows — the design language, not the lighting, creates hierarchy. Product is clearly visible, well-lit, professional but not emotional.",
      overallFeel: "Rational beauty. The poster communicates through structure and precision. Every element is placed with mathematical intention. Clean, confident, timeless — like a Swiss railway poster or Braun product manual.",
    },
    examplePromptFragment: "A Swiss International style poster — precise grid-based layout with clean geometric sans-serif typography flush-left aligned, product placed within a structured asymmetric composition on a clean flat background, bold accent color, rational and functional aesthetic.",
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "Monochrome",
    nameTr: "Monokrom",
    description: "Tek rengin tüm tonları, dramatik, güçlü hiyerarşi",
    promptDirections: {
      background: "Single color in its full tonal range — from lightest tint to deepest shade. Could be all-blue (sky to navy), all-terracotta (peach to burnt sienna), all-green (mint to forest). Background and foreground are the same color family.",
      typography: "Bold, confident typeface — works in both serif and sans-serif. Text in the lightest or darkest tone of the chosen color. High contrast within the monochrome spectrum. Title is strong and clear.",
      layout: "Layered depth through tonal variation. Product in mid-tone, text in extreme light/dark. Simple composition — the color does the heavy lifting. Can be centered or asymmetric.",
      colorPalette: "ONE color, ALL its tones. From 5% to 95% saturation/lightness. Optional: a single tiny accent in a complementary color for the brand mark only. The constraint is the creative tool.",
      productPlacement: "Product takes 30-40% of frame. Can be centered or off-center. Natural shadow in a darker tone of the base color. The product should feel embedded in the color world, not placed on top of it.",
      lighting: "Tonal lighting that matches the color world. If blue: cool studio light. If warm: golden hour warmth. Shadows and highlights stay within the color family. Cohesive, immersive.",
      overallFeel: "Immersive and bold. Like looking through a colored lens at the world. The constraint of one color forces creative depth. Dramatic but elegant.",
    },
    examplePromptFragment: "A monochrome poster in a single color family — every element from background to text to shadow exists within the same tonal spectrum, creating immersive depth and dramatic hierarchy. Shot with tonal lighting that matches the color world, 85mm lens, f/3.5.",
    isActive: true,
    sortOrder: 5,
  },
  {
    name: "Gradient Duotone",
    nameTr: "Gradient / Duotone",
    description: "Renk geçişleri, mesh gradient, grenli doku, modern dijital estetik",
    promptDirections: {
      background: "Smooth gradient or mesh gradient background — two or three colors flowing into each other. Add subtle grain/noise texture for depth (like Spotify's brand aesthetic). Colors can be bold (electric blue to magenta) or subtle (peach to lavender).",
      typography: "Modern sans-serif, medium weight. White or very light text works best against gradient backgrounds. Title is clean and readable — not competing with the color play. Subtle text shadow for legibility if needed.",
      layout: "Simple centered or slightly off-center. The gradient IS the design — keep other elements minimal. Product + title + brand, nothing more. Let the color transition flow from top to bottom or corner to corner.",
      colorPalette: "Two to three colors in smooth transition. Trending combos: peach→lavender, electric blue→magenta, sunset orange→deep purple, teal→emerald. Add grain/noise for analog feel. Colors should feel alive and flowing.",
      productPlacement: "Product centered or slightly above center. Clean cutout with soft drop shadow. The product should feel like it's floating in the color field. Size: 30-35% of frame. The gradient wraps around it.",
      lighting: "Soft, ambient lighting that matches the gradient's warmth/coolness. No harsh shadows — the color gradient provides the visual interest. Product is evenly lit with subtle rim light matching the gradient's brighter color.",
      overallFeel: "Digital-native, contemporary, fresh. Feels like a Spotify playlist cover or Instagram brand campaign. Modern, young, eye-catching. The colors do the talking.",
    },
    examplePromptFragment: "A modern gradient poster — smooth color transition from warm peach to soft lavender with subtle grain texture, the product floats cleanly in the center of the color field, minimal white sans-serif typography. Soft ambient lighting, 50mm lens, f/4.",
    isActive: true,
    sortOrder: 6,
  },
  {
    name: "Floating Product",
    nameTr: "Havada Süzen Ürün",
    description: "Ürün havada süzülüyor, gölge ile derinlik, temiz arka plan",
    promptDirections: {
      background: "Clean, solid, light background — white, very pale gray, or soft pastel. The background is intentionally empty to make the floating effect dramatic. No patterns, no distractions.",
      typography: "Versatile — works with both serif and sans-serif. Text is secondary to the floating product effect. Clean, well-spaced, elegant. Positioned below the product with good separation.",
      layout: "Product dominates the center-upper area, floating above its own shadow. Generous space above and below. The gap between the product and its shadow creates the illusion of levitation. Text anchored at the bottom third.",
      colorPalette: "Neutral base (white/cream/light gray) with the product providing all the color. The poster's palette comes FROM the product — if it's a chocolate croissant, warm browns dominate. Optional: one accent color from the product for the title.",
      productPlacement: "Product at 40-50% of frame — larger than other styles because it's THE show. Floating 'above' the surface with a realistic drop shadow below (soft, diffused, slightly offset). Slight rotation (5-10°) adds dynamism. Shot from slightly below to enhance the floating feel.",
      lighting: "Top-down or 45-degree key light with a softer fill. The lighting must create a convincing shadow on the 'surface' below. Rim light on the top edge of the product adds separation. Clean, commercial photography lighting.",
      overallFeel: "Product photography elevated to art. Like an Apple product launch or premium e-commerce hero shot. The levitation adds magic and premium feel. Simple but impactful.",
    },
    examplePromptFragment: "A floating product poster — the product levitates above a clean white surface, casting a soft diffused shadow below, photographed from slightly below to enhance the floating illusion, subtle rim light on the top edge. Shot on 90mm lens, f/2.8, commercial studio lighting, slight 5-degree rotation.",
    isActive: true,
    sortOrder: 7,
  },
  {
    name: "Type Hero",
    nameTr: "Tipografi Kahraman",
    description: "Tipografi ana görsel olarak, büyük/gerilmiş/dondurulmuş harfler, ürün küçük",
    promptDirections: {
      background: "Background serves the typography — solid color that creates maximum contrast with the letter forms. Can be bold (red, black, navy) or neutral (white, cream). No busy textures that compete with the letters.",
      typography: "TYPOGRAPHY IS THE HERO. The product name or title fills 40-60% of the poster area. Letters are oversized, potentially cropped at edges, stretched, or stylized. Experimental but readable. This is where the design lives.",
      layout: "Typography-first composition. Large letters fill the space, product is nested within or placed beside the text. The product is important but secondary in scale — it's 15-25% of the frame. Text and product create a unified visual.",
      colorPalette: "High contrast is essential. Black text on white, white on deep color, or bold colored text on neutral. The typography color choice IS the design decision. Can use 2-3 colors: text color, background color, product accent.",
      productPlacement: "Product is smaller than usual — 15-25% of frame. Positioned strategically: centered below the giant text, nested inside a letter form, or placed beside the typography. The product complements the text, not the other way around.",
      lighting: "Product lighting is clean and clear — the product needs to be recognizable even at smaller scale. The typography may have its own visual treatment (shadow, 3D effect, texture). No dramatic product lighting competing with the type.",
      overallFeel: "Graphic design poster, not product photography. Feels like a fashion brand campaign or music festival poster. The typography makes the statement, the product grounds it in reality. Bold, graphic, artistic.",
    },
    examplePromptFragment: "A type-hero poster where oversized bold typography fills 50% of the frame — letters are large, confident, potentially cropped at the edges. The product sits modestly below the commanding text, clean and recognizable but secondary to the typographic statement. High contrast, graphic design energy.",
    isActive: true,
    sortOrder: 8,
  },
];

// ═══════════════════════════════════════════════════════════════
// MOOD'LAR — Her biri prompt'a gerçek etki eden modifikatörler
// ═══════════════════════════════════════════════════════════════

export const POSTER_MOODS: Omit<PosterMood, "id">[] = [
  {
    name: "Warm & Intimate",
    nameTr: "Sıcak & Samimi",
    promptModifiers: {
      colorShift: "Shift the entire palette toward warm tones — amber, terracotta, golden cream, burnt sienna. Even neutral colors should lean warm (warm gray, not cool gray).",
      lightingAdjust: "Golden hour warmth, approximately 3000-3500K color temperature. Soft, enveloping light that feels like late afternoon sun through a café window.",
      textureNote: "Add subtle analog film grain. Slightly desaturate for a nostalgic, lived-in quality. Think: expired Portra 400 film stock.",
      atmosphereNote: "The poster should feel like a warm invitation — a Sunday morning, freshly brewed coffee, soft music playing. Cozy without being cluttered.",
    },
    compatibleStyles: ["editorial-kinfolk", "neo-deco", "floating-product", "monochrome"],
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Fresh & Energetic",
    nameTr: "Taze & Enerjik",
    promptModifiers: {
      colorShift: "Bright, saturated, alive colors — lime green, electric coral, sunny yellow, sky blue. Colors should feel like they just woke up. High saturation, high energy.",
      lightingAdjust: "Bright, clean daylight — 5500K, high key lighting. Minimal shadows. Everything is visible, nothing is hidden. Feels like a clear morning.",
      textureNote: "Crisp and clean — no grain, no noise. Sharp edges, vivid colors. Digital-native clarity. If texture exists, it's fresh: dew drops, clean surfaces.",
      atmosphereNote: "Energy and optimism. Spring morning, farmers market, new beginnings. The poster should make you want to get up and go.",
    },
    compatibleStyles: ["bold-minimal", "swiss-international", "gradient-duotone", "floating-product"],
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Luxe & Refined",
    nameTr: "Lüks & Rafine",
    promptModifiers: {
      colorShift: "Deep, rich tones — midnight navy, burgundy, forest green, matte black. Metallic accents: gold, brass, champagne. Dark luxury palette. Nothing bright or casual.",
      lightingAdjust: "Low-key, cinematic lighting. Dramatic shadows with rich highlights. Warm accent light on metallic/golden elements. Feels like a dimly lit luxury boutique.",
      textureNote: "Subtle richness — velvet, silk, brushed metal, dark wood. Materials that whisper expense. Optional: very subtle noise for depth, like a luxury brand campaign.",
      atmosphereNote: "Old money sophistication. Not flashy, not loud — quietly expensive. Like walking into a Michelin-starred restaurant or a private members' club. Understated power.",
    },
    compatibleStyles: ["neo-deco", "monochrome", "bold-minimal", "type-hero"],
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Earthy & Organic",
    nameTr: "Toprak & Organik",
    promptModifiers: {
      colorShift: "Earth tones: terracotta, olive green, warm sand, clay, dried herb tones, muted sage. Colors found in nature, not manufactured. Desaturated but warm.",
      lightingAdjust: "Natural, organic light — like filtered through leaves or a linen curtain. Soft, diffused, 4000K warmth. Not studio-perfect, more documentary.",
      textureNote: "Natural materials: kraft paper, unbleached cotton, rough clay, dried flowers, wood grain. Tactile and handmade feeling. Imperfection is beauty.",
      atmosphereNote: "Grounded, sustainable, real. Farm-to-table, artisan workshop, morning hike. The poster should feel like it smells of fresh bread and earth.",
    },
    compatibleStyles: ["editorial-kinfolk", "monochrome", "floating-product", "swiss-international"],
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "Cool & Modern",
    nameTr: "Serin & Modern",
    promptModifiers: {
      colorShift: "Cool tones: steel blue, teal, icy gray, mint, slate. Slight blue undertone to everything. Think: Scandinavian design, early morning frost, clean technology.",
      lightingAdjust: "Cool, precise lighting — 6000-6500K. Clean shadows, blue-ish tint to highlights. Technically perfect, almost clinical but beautiful. LED studio feel.",
      textureNote: "Smooth, precise surfaces. Brushed aluminum, frosted glass, polished concrete. Clean digital feel — no grain, no imperfection. If texture exists, it's deliberate and geometric.",
      atmosphereNote: "Contemporary clarity. Apple Store meets Copenhagen café. Smart, clean, forward-thinking. The poster should feel designed by a machine that has good taste.",
    },
    compatibleStyles: ["swiss-international", "bold-minimal", "gradient-duotone", "monochrome"],
    isActive: true,
    sortOrder: 5,
  },
  {
    name: "Dramatic & Bold",
    nameTr: "Dramatik & Cesur",
    promptModifiers: {
      colorShift: "High-contrast, saturated darks with bright accents. Deep black shadows, vivid highlights. If color exists, it's intense — deep red, electric blue, hot pink against black or dark gray.",
      lightingAdjust: "Chiaroscuro — extreme contrast between light and shadow. Single strong light source creating dramatic shadows. Rim lighting for product separation. Cinematic, theatrical.",
      textureNote: "Rich shadows and specular highlights. Glossy surfaces catch light dramatically. Smoke, steam, or atmospheric haze optional. Every texture is amplified by the dramatic lighting.",
      atmosphereNote: "High drama, fashion editorial energy. The poster should feel like a scene from a noir film or a Vogue editorial. Theatrical, captivating, impossible to ignore.",
    },
    compatibleStyles: ["bold-minimal", "neo-deco", "type-hero", "monochrome"],
    isActive: true,
    sortOrder: 6,
  },
];

// ═══════════════════════════════════════════════════════════════
// ASPECT RATIO'LAR
// ═══════════════════════════════════════════════════════════════

export const POSTER_ASPECT_RATIOS: Omit<PosterAspectRatio, "id">[] = [
  {
    label: "2:3 (Poster)",
    width: 2,
    height: 3,
    useCase: "Poster, baskı, Pinterest",
    promptInstruction: "Generate this image in 2:3 portrait aspect ratio (width:height = 2:3, tall poster format like 40x60cm, significantly taller than wide).",
    isActive: true,
    sortOrder: 1,
  },
  {
    label: "4:5 (Instagram Feed)",
    width: 4,
    height: 5,
    useCase: "Instagram feed, Facebook",
    promptInstruction: "Generate this image in 4:5 portrait aspect ratio (width:height = 4:5, slightly taller than wide, Instagram feed optimal format).",
    isActive: true,
    sortOrder: 2,
  },
  {
    label: "1:1 (Kare)",
    width: 1,
    height: 1,
    useCase: "Instagram kare, profil, sosyal medya",
    promptInstruction: "Generate this image in 1:1 square aspect ratio (equal width and height, perfect square format).",
    isActive: true,
    sortOrder: 3,
  },
  {
    label: "9:16 (Story)",
    width: 9,
    height: 16,
    useCase: "Instagram/TikTok Story, Reels kapak",
    promptInstruction: "Generate this image in 9:16 portrait aspect ratio (width:height = 9:16, full-screen vertical story format, very tall and narrow).",
    isActive: true,
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════
// TİPOGRAFİ STİLLERİ
// ═══════════════════════════════════════════════════════════════

export const POSTER_TYPOGRAPHIES: Omit<PosterTypography, "id">[] = [
  {
    name: "Elegant Serif",
    nameTr: "Zarif Serif",
    description: "Klasik, ince, lüks hissi veren serif font",
    promptInstruction: "Use an elegant high-contrast serif typeface — thin hairlines, refined letterforms, like Didot, Playfair Display, or Cormorant. The typography should whisper luxury. Title in medium weight, subtitle in light italic.",
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Bold Sans-Serif",
    nameTr: "Cesur Sans-Serif",
    description: "Modern, güçlü, dikkat çeken sans-serif font",
    promptInstruction: "Use a bold geometric sans-serif typeface — strong, confident, modern, like Futura Bold, Montserrat Black, or DM Sans Bold. The typography should command attention. High contrast between title weight and subtitle weight.",
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Minimal Geometric",
    nameTr: "Minimal Geometrik",
    description: "Temiz, hafif, geometrik sans-serif",
    promptInstruction: "Use a clean, light-weight geometric sans-serif — airy, precise, Swiss-inspired, like Helvetica Neue Light, Inter, or Space Grotesk. Generous letter-spacing. The typography should feel effortless and modern.",
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Handwritten Script",
    nameTr: "El Yazısı",
    description: "Organik, sıcak, el yazısı hissi veren script font",
    promptInstruction: "Use a flowing handwritten script typeface for the title — organic, warm, personal, like a calligrapher's hand. The subtitle should be in a clean complementary sans-serif. The contrast between script title and clean subtitle creates visual interest.",
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "Condensed Display",
    nameTr: "Dar Display",
    description: "Dar, yüksek, poster tarzı display font",
    promptInstruction: "Use a tall condensed display typeface — narrow, impactful, poster-worthy, like Oswald, Bebas Neue, or Anton. Letters are tall and compressed. The typography IS a design element — large, graphic, space-filling.",
    isActive: true,
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════
// LAYOUT PRESET'LERİ — Element yerleşim şablonları
// ═══════════════════════════════════════════════════════════════

export const POSTER_LAYOUTS: Omit<PosterLayout, "id">[] = [
  {
    name: "Classic Center",
    nameTr: "Klasik Ortalı",
    description: "Ürün üstte, başlık ortada, fiyat altta — dengeli",
    promptInstruction: "Layout: Product centered in the upper third. Title centered below the product with generous spacing. Subtitle directly below the title. Price centered near the bottom, clearly formatted. Brand block at the very bottom. Everything aligned to center axis.",
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Price Top Corner Angled",
    nameTr: "Fiyat Üst Köşe Açılı",
    description: "Fiyat üst köşede 45° açıyla, dikkat çekici",
    promptInstruction: "Layout: Price displayed prominently in the upper-right corner, rotated at approximately 45 degrees, bold and eye-catching — like a sale tag or stamp. Product centered. Title and subtitle in the lower third, left-aligned or centered. Brand block at the very bottom.",
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Left Aligned Editorial",
    nameTr: "Sol Hizalı Editöryal",
    description: "Her şey sola yaslı, dergi layout'u",
    promptInstruction: "Layout: All text flush-left aligned. Product positioned right-of-center or right third. Title large on the left side, subtitle below it. Price left-aligned below subtitle, small but clear. Generous right margin. Editorial magazine aesthetic — asymmetric, dynamic, modern.",
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Price Badge Large",
    nameTr: "Büyük Fiyat Rozeti",
    description: "Fiyat büyük daire/rozet içinde, promosyon tarzı",
    promptInstruction: "Layout: Price inside a bold circular badge or stamp — large, impossible to miss, positioned in the upper-right or lower-right area. The badge has a contrasting color. Product centered. Title below or above the product. Promotional, eye-catching layout.",
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "Split Horizontal",
    nameTr: "Yatay Bölünmüş",
    description: "Üst yarı görsel, alt yarı metin — ikiye bölünmüş",
    promptInstruction: "Layout: Poster divided horizontally. Top 55% is the product area (product centered with space around it). Bottom 45% is the text area with a subtle background shift (slightly darker or different tone). Title, subtitle, and price stacked in the lower section. Clean separation between image and text zones.",
    isActive: true,
    sortOrder: 5,
  },
  {
    name: "No Price",
    nameTr: "Fiyatsız / Marka",
    description: "Fiyat yok, sadece ürün + başlık + marka — saf estetik",
    promptInstruction: "Layout: No price displayed. This is a pure brand/aesthetic poster. Product prominent, title elegant, brand block subtle at bottom. Maximum breathing space. The poster sells the feeling, not the price.",
    isActive: true,
    sortOrder: 6,
  },
];

// ═══════════════════════════════════════════════════════════════
// KAMERA AÇILARI
// ═══════════════════════════════════════════════════════════════

export const POSTER_CAMERA_ANGLES: Omit<PosterCameraAngle, "id">[] = [
  {
    name: "Flat Lay",
    nameTr: "Düz Çekim (Top-Down)",
    description: "Doğrudan tepeden, 90° — ürünü düzlemsel gösterir",
    promptInstruction: "Flat lay composition, shot directly overhead at 90°. Camera positioned directly above the subject looking straight down. Objects arranged flat on surface.",
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "45 Degree Overhead",
    nameTr: "45° Üst Açı",
    description: "45° yukarıdan çapraz — derinlik verir, en popüler açı",
    promptInstruction: "45-degree overhead angle, camera positioned at 45° above the subject. Creates a natural perspective that shows both the top and front of the product.",
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Hero Shot",
    nameTr: "Kahraman Çekimi",
    description: "Göz hizasında, tam cepheden — ürünü güçlü gösterir",
    promptInstruction: "Hero shot, camera at eye level shooting straight-on at the product. Subject fills the frame powerfully. Slight upward tilt optional for imposing feel.",
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Close-Up Macro",
    nameTr: "Yakın Plan (Makro)",
    description: "Çok yakın — doku, detay ve kaliteyi ön plana çıkarır",
    promptInstruction: "Extreme close-up macro shot. Camera extremely close to the subject, revealing textures, details, and fine craftsmanship. Shallow depth of field, subject fills frame.",
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "Three Quarter Angle",
    nameTr: "¾ Açı (Köşeden)",
    description: "Ürünün ön-yan köşesinden — perspektif ve boyut hissi",
    promptInstruction: "Three-quarter angle view, camera positioned at approximately 45° to the side and slightly elevated. Shows the front and one side of the product, giving natural depth and dimension.",
    isActive: true,
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════
// IŞIK / AYDINLATMA TİPLERİ
// ═══════════════════════════════════════════════════════════════

export const POSTER_LIGHTING_TYPES: Omit<PosterLightingType, "id">[] = [
  {
    name: "Natural Window Light",
    nameTr: "Doğal Pencere Işığı",
    description: "Yumuşak difüz doğal ışık — sıcak ve organik",
    promptInstruction: "Soft natural window light from the side, diffused through sheer curtains. Warm color temperature (3500-4000K), gentle gradual shadows, organic and authentic feel.",
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Studio Soft Box",
    nameTr: "Stüdyo Soft Box",
    description: "Profesyonel stüdyo yumuşak kutu ışığı — temiz ve kontrollü",
    promptInstruction: "Professional studio softbox lighting, large and diffused. Clean even illumination with soft shadows. Neutral color temperature (5000K). Product looks polished and commercial.",
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Golden Hour",
    nameTr: "Altın Saat (Gün Batımı)",
    description: "Sıcak altın tonlarında gün batımı ışığı — nostaljik ve zarif",
    promptInstruction: "Golden hour lighting, warm golden-orange light at a low angle as if near sunset. Long soft shadows, warm glow (2700-3000K), romantic and nostalgic atmosphere.",
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Dramatic Side Light",
    nameTr: "Dramatik Yan Işık",
    description: "Güçlü tek yönlü yan ışık — karakter ve derinlik",
    promptInstruction: "Dramatic hard side lighting from one direction, creating strong contrast between highlight and shadow. Chiaroscuro effect. Studio light at 90° to the subject.",
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "Neon Glow",
    nameTr: "Neon Parıltı",
    description: "Renkli neon ışık yansımaları — modern ve çarpıcı",
    promptInstruction: "Colorful neon glow lighting, vibrant colored light sources (purple, pink, cyan) casting soft colored reflections on the product and surrounding surfaces. Dark background enhances the glow effect.",
    isActive: true,
    sortOrder: 5,
  },
  {
    name: "Backlit Halo",
    nameTr: "Arka Işık (Hale Efekti)",
    description: "Ürünün arkasından gelen ışık — siluet ve hale efekti",
    promptInstruction: "Backlit composition with light source behind the subject creating a halo or rim light effect. Subject partially silhouetted with glowing edges. Adds mystery and premium feel.",
    isActive: true,
    sortOrder: 6,
  },
];

// ═══════════════════════════════════════════════════════════════
// ARKA PLAN / ORTAMLAR
// ═══════════════════════════════════════════════════════════════

export const POSTER_BACKGROUNDS: Omit<PosterBackground, "id">[] = [
  {
    name: "Pure White",
    nameTr: "Saf Beyaz",
    description: "Düz beyaz arka plan — temiz ve evrensel",
    promptInstruction: "Pure clean white background, seamless studio backdrop. Perfectly even, no shadows visible on background. Clinical cleanliness.",
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Marble Surface",
    nameTr: "Mermer Yüzey",
    description: "Beyaz veya gri mermer yüzey — lüks ve zamansız",
    promptInstruction: "White or light grey marble surface with subtle natural veining. Product placed directly on polished marble. Elegant and timeless luxury feel.",
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Wooden Table",
    nameTr: "Ahşap Masa",
    description: "Sıcak ahşap yüzey — doğal ve samimi",
    promptInstruction: "Warm natural wood surface, light oak or walnut. Subtle wood grain texture visible. Product placed on wooden table or cutting board. Organic, artisanal feel.",
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Linen Fabric",
    nameTr: "Keten Kumaş",
    description: "Krem/bej keten dokulu zemin — editorial ve yumuşak",
    promptInstruction: "Soft linen fabric background in cream or warm beige. Subtle natural fabric texture. Product resting on or surrounded by linen. Editorial lifestyle aesthetic.",
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "Dark Moody",
    nameTr: "Koyu & Atmosferik",
    description: "Koyu lacivert/siyah arka plan — dramatik ve premium",
    promptInstruction: "Dark moody background in deep charcoal, midnight navy, or matte black. Rich shadows with product emerging from darkness. Dramatic, premium feel.",
    isActive: true,
    sortOrder: 5,
  },
  {
    name: "Outdoor Nature",
    nameTr: "Doğal Dış Mekan",
    description: "Açık hava, yeşillik veya taş yüzey ortamı",
    promptInstruction: "Natural outdoor setting, soft green foliage or stone surface background, bokeh background effect. Fresh air and natural environment. Product placed on rustic stone or surrounded by natural elements.",
    isActive: true,
    sortOrder: 6,
  },
  {
    name: "Pastel Solid",
    nameTr: "Pastel Tek Renk",
    description: "Yumuşak pastel tonlarda düz arka plan",
    promptInstruction: "Soft pastel solid color background — blush pink, sage green, lavender, or powder blue. Smooth gradient-free single color. Cheerful, approachable, social media friendly.",
    isActive: true,
    sortOrder: 7,
  },
];

/**
 * Tüm poster seed data'sını döndür
 */
export function getPosterSeedData() {
  return {
    styles: POSTER_STYLES.map((s) => ({
      ...s,
      id: s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
    })),
    moods: POSTER_MOODS.map((m) => ({
      ...m,
      id: m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
    })),
    aspectRatios: POSTER_ASPECT_RATIOS.map((ar) => ({
      ...ar,
      id: `${ar.width}-${ar.height}`,
    })),
    typographies: POSTER_TYPOGRAPHIES.map((t) => ({
      ...t,
      id: t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
    })),
    layouts: POSTER_LAYOUTS.map((l) => ({
      ...l,
      id: l.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
    })),
    cameraAngles: POSTER_CAMERA_ANGLES.map((c) => ({
      ...c,
      id: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
    })),
    lightingTypes: POSTER_LIGHTING_TYPES.map((l) => ({
      ...l,
      id: l.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
    })),
    backgrounds: POSTER_BACKGROUNDS.map((b) => ({
      ...b,
      id: b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
    })),
  };
}

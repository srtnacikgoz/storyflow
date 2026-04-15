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
    description: "Tamamen boş arka plan, ortada tek büyük ürün, kalın güçlü yazı. Vitrin afişi — hiçbir şey fazla, her piksel kasıtlı.",
    promptDirections: {
      styleDirective: "Background: Clean solid background — pure white, deep black, or a single bold color. No textures, no gradients. The emptiness is intentional and powerful. Typography: Bold condensed sans-serif typeface. Title is large and commanding — it should feel like a magazine cover headline. High contrast between text and background. Minimal text: one title, one subtitle max. Layout: Asymmetric composition. Product slightly off-center with generous negative space on one side for text. The empty space is deliberate — it creates tension and focus. Nothing decorative. Product: Product is the hero — takes 35-45% of the frame. Slightly off-center using rule of thirds. Clean edges, no overlapping elements. Shot at eye level or slightly above. Color Palette: Maximum 2-3 colors. High contrast pairs: black/white, navy/cream, charcoal/gold. One accent color allowed. No pastels, no gradients. Lighting: Hard directional light creating strong shadows. High contrast between highlights and shadows. Studio-quality, intentional lighting — not ambient. Overall Feel: Confident, modern, magazine-cover energy. Every element earns its place. If it doesn't serve a purpose, it's removed.",
      dallEPrompt: "A professional product poster featuring {PRODUCT}. A bold minimal poster with stark contrast — {PRODUCT} sits powerfully off-center against a clean background, with commanding typography that demands attention. Shot on 85mm lens, f/2.8, hard directional studio lighting creating dramatic shadows.",
    },
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Editorial Kinfolk",
    nameTr: "Editöryal Kinfolk",
    description: "Krem-bej zemin, ince zarif yazı, ürün mütevazı ve sıcak. Prestijli lifestyle dergisi sayfası gibi — nefes alıyor, bastırmıyor.",
    promptDirections: {
      styleDirective: "Background: Warm off-white, soft cream, or pale linen. Subtle paper texture like premium uncoated stock. Feels tactile and organic, like a high-end lifestyle magazine spread. Typography: Elegant thin serif typeface — think Freight Display or Cormorant. Understated, not shouting. Title is medium-sized, refined. Generous letter-spacing. Small-caps for subtitles. Layout: Extremely generous whitespace — at least 45% of the poster is breathing room. Product in upper third, text in lower third. Structured but airy, like a book page. Every element has room to exist. Product: Product modestly sized (25-30% height), centered or slightly left. Natural, relaxed placement — not forced or dramatic. Soft natural shadow beneath. Feels photographed, not designed. Color Palette: Muted, warm palette: cream, sand, soft terracotta, warm gray, dusty rose. Nothing saturated. Earth tones with subtle warmth. Feels like morning light on linen. Lighting: Soft diffused natural light — like morning window light. Low contrast, gentle shadows. Warm color temperature (3500-4000K). Film-like quality with slight grain. Overall Feel: Quiet luxury. Scandinavian-Japanese hybrid. The poster feels like it belongs in a Kinfolk or Cereal magazine. Warm but minimal, inviting but restrained.",
      dallEPrompt: "A professional product poster featuring {PRODUCT}. An editorial lifestyle poster in the Kinfolk aesthetic — soft morning light bathes {PRODUCT} on warm cream paper, with elegant thin serif typography and generous whitespace. Shot on 50mm lens, f/4, natural diffused window light, subtle analog film grain.",
    },
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Neo Deco",
    nameTr: "Neo Deco / Lüks",
    description: "Koyu lacivert ya da siyah zemin, altın çerçeve ve süslemeler, lüks serif yazı. Ladurée ya da Cartier afişi — daveti fısıldıyor.",
    promptDirections: {
      styleDirective: "Background: Deep, rich background — midnight navy, forest green, burgundy, or matte black. Optional: subtle geometric Art Deco pattern (thin gold lines, fan shapes, or chevrons) as a border or frame element. Typography: Elegant high-contrast serif with Art Deco influence — geometric, structured, luxurious. Title is grand but not oversized. Gold or cream colored text on dark background. Tracked uppercase for subtitles. Layout: Symmetrical, centered composition. Product framed by geometric elements — thin lines, arches, or decorative borders. Structured like a luxury brand advertisement. Balanced and deliberate. Product: Product centered, elevated on a pedestal-like visual hierarchy. Takes 30-35% of frame. Surrounded by subtle geometric framing. Feels precious and presented, like a jewel in a case. Color Palette: Dark luxury: midnight navy + gold, black + champagne, forest green + brass, burgundy + cream. Metallic accents (gold, brass, copper) are key. Rich, jewel-toned base colors. Lighting: Dramatic rim lighting or cinematic side light. Product glows against the dark background. Warm highlights on metallic elements. Moody but not murky. Overall Feel: Old-world luxury meets modern design. Feels like a premium brand campaign — Cartier, Ladurée, or a luxury hotel menu. Sophisticated, timeless, unapologetically rich.",
      dallEPrompt: "A professional product poster featuring {PRODUCT}. A Neo Deco luxury poster — {PRODUCT} is presented like a precious object against deep midnight navy, framed by subtle gold geometric Art Deco elements, with elegant high-contrast serif typography. Cinematic rim lighting, warm gold highlights, shot on 100mm macro lens, f/2.8.",
    },
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Swiss International",
    nameTr: "Swiss / Uluslararası",
    description: "Beyaz veya düz renkli zemin, sol hizalı temiz yazı, ürün matematiksel konumlandırılmış. Braun ve Apple tasarımı gibi — rasyonel güzellik.",
    promptDirections: {
      styleDirective: "Background: Clean, flat color — white, light gray, or a single saturated color (red, blue, yellow). No texture, no gradient. The background is a canvas for the grid. Typography: Clean geometric sans-serif — Helvetica, Akzidenz-Grotesk style. Flush-left alignment, ragged-right. Title is bold but follows the grid. Numbers and details are treated as design elements. Strong hierarchy through size contrast. Layout: Strict mathematical grid. Asymmetric but structured — content aligns to invisible columns. Information hierarchy is paramount. Product and text occupy distinct grid zones. Feels organized, rational, functional. Product: Product placed precisely within the grid — not floating freely. Often in the upper-right or lower-left quadrant. Treated as one element in the system, not the only element. Clean cutout with no shadow if on colored background. Color Palette: Limited palette: black + white + one accent color (Swiss red, blue, or yellow). Or monochrome with a single bright accent. Colors are flat and confident — no shading, no gradient. Lighting: Even, flat lighting. No dramatic shadows — the design language, not the lighting, creates hierarchy. Product is clearly visible, well-lit, professional but not emotional. Overall Feel: Rational beauty. The poster communicates through structure and precision. Every element is placed with mathematical intention. Clean, confident, timeless — like a Swiss railway poster or Braun product manual.",
      dallEPrompt: "A professional product poster featuring {PRODUCT}. A Swiss International style poster — precise grid-based layout with clean geometric sans-serif typography flush-left aligned, {PRODUCT} placed within a structured asymmetric composition on a clean flat background, bold accent color, rational and functional aesthetic.",
    },
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "Monochrome",
    nameTr: "Monokrom",
    description: "Tek bir renk ailesinin açıktan koyuya tüm tonları kullanılır. Kahverenginin kreminden espressosuna kadar — renk uyumu otomatik mükemmel.",
    promptDirections: {
      styleDirective: "Background: Single color in its full tonal range — from lightest tint to deepest shade. Could be all-blue (sky to navy), all-terracotta (peach to burnt sienna), all-green (mint to forest). Background and foreground are the same color family. Typography: Bold, confident typeface — works in both serif and sans-serif. Text in the lightest or darkest tone of the chosen color. High contrast within the monochrome spectrum. Title is strong and clear. Layout: Layered depth through tonal variation. Product in mid-tone, text in extreme light/dark. Simple composition — the color does the heavy lifting. Can be centered or asymmetric. Product: Product takes 30-40% of frame. Can be centered or off-center. Natural shadow in a darker tone of the base color. The product should feel embedded in the color world, not placed on top of it. Color Palette: ONE color, ALL its tones. From 5% to 95% saturation/lightness. Optional: a single tiny accent in a complementary color for the brand mark only. The constraint is the creative tool. Lighting: Tonal lighting that matches the color world. If blue: cool studio light. If warm: golden hour warmth. Shadows and highlights stay within the color family. Cohesive, immersive. Overall Feel: Immersive and bold. Like looking through a colored lens at the world. The constraint of one color forces creative depth. Dramatic but elegant.",
      dallEPrompt: "A professional product poster featuring {PRODUCT}. A monochrome poster in a single color family — every element from background to text to shadow exists within the same tonal spectrum, creating immersive depth and dramatic hierarchy. Shot with tonal lighting that matches the color world, 85mm lens, f/3.5.",
    },
    isActive: true,
    sortOrder: 5,
  },
  {
    name: "Gradient Duotone",
    nameTr: "Gradient / Duotone",
    description: "Arka plan iki renkten birbirine akıyor — mordan turuncuya, maviden yeşile. Spotify kapak afişi enerjisi — dijital, genç, sosyal medyaya uygun.",
    promptDirections: {
      styleDirective: "Background: Smooth gradient or mesh gradient background — two or three colors flowing into each other. Add subtle grain/noise texture for depth (like Spotify's brand aesthetic). Colors can be bold (electric blue to magenta) or subtle (peach to lavender). Typography: Modern sans-serif, medium weight. White or very light text works best against gradient backgrounds. Title is clean and readable — not competing with the color play. Subtle text shadow for legibility if needed. Layout: Simple centered or slightly off-center. The gradient IS the design — keep other elements minimal. Product + title + brand, nothing more. Let the color transition flow from top to bottom or corner to corner. Product: Product centered or slightly above center. Clean cutout with soft drop shadow. The product should feel like it's floating in the color field. Size: 30-35% of frame. The gradient wraps around it. Color Palette: Two to three colors in smooth transition. Trending combos: peach→lavender, electric blue→magenta, sunset orange→deep purple, teal→emerald. Add grain/noise for analog feel. Colors should feel alive and flowing. Lighting: Soft, ambient lighting that matches the gradient's warmth/coolness. No harsh shadows — the color gradient provides the visual interest. Product is evenly lit with subtle rim light matching the gradient's brighter color. Overall Feel: Digital-native, contemporary, fresh. Feels like a Spotify playlist cover or Instagram brand campaign. Modern, young, eye-catching. The colors do the talking.",
      dallEPrompt: "A professional product poster featuring {PRODUCT}. A modern gradient poster — smooth color transition from warm peach to soft lavender with subtle grain texture, {PRODUCT} floats cleanly in the center of the color field, minimal white sans-serif typography. Soft ambient lighting, 50mm lens, f/4.",
    },
    isActive: true,
    sortOrder: 6,
  },
  {
    name: "Floating Product",
    nameTr: "Havada Süzen Ürün",
    description: "Ürün beyaz zemin üzerinde havada asılı gibi durur — altında gerçekçi gölge. Apple ürün lansmanı afişi: ürün tek kral, başka hiçbir şey yok.",
    promptDirections: {
      styleDirective: "Background: Clean, solid, light background — white, very pale gray, or soft pastel. The background is intentionally empty to make the floating effect dramatic. No patterns, no distractions. Typography: Versatile — works with both serif and sans-serif. Text is secondary to the floating product effect. Clean, well-spaced, elegant. Positioned below the product with good separation. Layout: Product dominates the center-upper area, floating above its own shadow. Generous space above and below. The gap between the product and its shadow creates the illusion of levitation. Text anchored at the bottom third. Product: Product at 40-50% of frame — larger than other styles because it's THE show. Floating 'above' the surface with a realistic drop shadow below (soft, diffused, slightly offset). Slight rotation (5-10°) adds dynamism. Shot from slightly below to enhance the floating feel. Color Palette: Neutral base (white/cream/light gray) with the product providing all the color. The poster's palette comes FROM the product — if it's a chocolate croissant, warm browns dominate. Optional: one accent color from the product for the title. Lighting: Top-down or 45-degree key light with a softer fill. The lighting must create a convincing shadow on the 'surface' below. Rim light on the top edge of the product adds separation. Clean, commercial photography lighting. Overall Feel: Product photography elevated to art. Like an Apple product launch or premium e-commerce hero shot. The levitation adds magic and premium feel. Simple but impactful.",
      dallEPrompt: "A professional product poster featuring {PRODUCT}. A floating product poster — {PRODUCT} levitates above a clean white surface, casting a soft diffused shadow below, photographed from slightly below to enhance the floating illusion, subtle rim light on the top edge. Shot on 90mm lens, f/2.8, commercial studio lighting, slight 5-degree rotation.",
    },
    isActive: true,
    sortOrder: 7,
  },
  {
    name: "Type Hero",
    nameTr: "Tipografi Kahraman",
    description: "Ürün adı ya da bir söz posterın yarısını kaplayan dev harflerle yazılmış. Ürün küçük ama sahne onunla tamamlanıyor — moda kampanyası veya albüm kapağı enerjisi.",
    promptDirections: {
      styleDirective: "Background: Background serves the typography — solid color that creates maximum contrast with the letter forms. Can be bold (red, black, navy) or neutral (white, cream). No busy textures that compete with the letters. Typography: TYPOGRAPHY IS THE HERO. The product name or title fills 40-60% of the poster area. Letters are oversized, potentially cropped at edges, stretched, or stylized. Experimental but readable. This is where the design lives. Layout: Typography-first composition. Large letters fill the space, product is nested within or placed beside the text. The product is important but secondary in scale — it's 15-25% of the frame. Text and product create a unified visual. Product: Product is smaller than usual — 15-25% of frame. Positioned strategically: centered below the giant text, nested inside a letter form, or placed beside the typography. The product complements the text, not the other way around. Color Palette: High contrast is essential. Black text on white, white on deep color, or bold colored text on neutral. The typography color choice IS the design decision. Can use 2-3 colors: text color, background color, product accent. Lighting: Product lighting is clean and clear — the product needs to be recognizable even at smaller scale. The typography may have its own visual treatment (shadow, 3D effect, texture). No dramatic product lighting competing with the type. Overall Feel: Graphic design poster, not product photography. Feels like a fashion brand campaign or music festival poster. The typography makes the statement, the product grounds it in reality. Bold, graphic, artistic.",
      dallEPrompt: "A professional product poster featuring {PRODUCT}. A type-hero poster where oversized bold typography fills 50% of the frame — letters are large, confident, potentially cropped at the edges. {PRODUCT} sits modestly below the commanding text, clean and recognizable but secondary to the typographic statement. High contrast, graphic design energy.",
    },
    isActive: true,
    sortOrder: 8,
  },
];

// ═══════════════════════════════════════════════════════════════
// MOOD'LAR — Her biri prompt'a gerçek etki eden modifikatörler
// ═══════════════════════════════════════════════════════════════

export const POSTER_MOODS: Omit<PosterMood, "id">[] = [
  {
    name: "Studio Shot",
    nameTr: "Stüdyo Çekim",
    promptModifiers: {
      productClarity: "Maximum sharpness. The product is the absolute hero — every detail visible, every texture rendered in high resolution. Tack-sharp focus across the entire product.",
      background: "Clean, simple, solid color or very soft gradient. No patterns, no textures, no distractions. The background exists only to make the product stand out.",
      surroundings: "Nothing. Zero props, zero accessories, zero decorative elements. Only the product exists in this frame.",
      lighting: "Professional studio lighting. Even, shadowless or with minimal controlled shadows. High-key lighting that reveals every detail without harsh contrast.",
      colorPalette: "Neutral and clean — whites, light grays, soft creams. The product's own colors are the only color story. Background never competes with the product.",
      compositionStyle: "Product centered or slightly off-center with generous negative space. Clean, e-commerce quality. The product occupies 50-70% of the frame.",
    },
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Lively Scene",
    nameTr: "Canlı Sahne",
    promptModifiers: {
      productClarity: "Sharp and clear, but the product lives within a scene — it's part of a story, not isolated. Focus is on the product but the environment is also in focus.",
      background: "Natural, lived-in environment — wooden table, marble counter, café setting, kitchen surface. Real-world context that feels authentic and inviting.",
      surroundings: "Rich with complementary props — coffee cup, scattered crumbs, fresh flowers, linen napkin, wooden cutting board, seasonal fruits. The scene tells a story around the product.",
      lighting: "Natural daylight, golden hour warmth. Soft window light with gentle shadows. Feels like a real moment captured, not staged. 3500-4500K color temperature.",
      colorPalette: "Warm, inviting tones — amber, cream, natural wood, terracotta. The overall palette feels like a cozy café or a Sunday morning kitchen.",
      compositionStyle: "Lifestyle flat-lay or 45-degree angle. Product is clearly the star but surrounded by context. Rule of thirds, natural arrangement that feels effortless.",
    },
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Minimal Art",
    nameTr: "Minimal Sanat",
    promptModifiers: {
      productClarity: "Stylized, almost art-directed. The product may be shot from an unusual angle (overhead, extreme close-up). Artistic interpretation over documentary accuracy.",
      background: "Pastel gradient or solid pastel tone — lavender, blush pink, mint, soft peach, powder blue. Gallery-like, clean, modern.",
      surroundings: "Abstract geometric shapes, clean lines, minimal sculptural elements. If props exist, they're geometric — spheres, cubes, arches in matching pastel tones.",
      lighting: "Soft, even, almost shadowless. Flat lighting that emphasizes color over depth. Diffused and gentle — no harsh shadows, no dramatic contrast.",
      colorPalette: "Pastel-dominant — soft, desaturated, harmonious. 2-3 pastel tones maximum. The palette feels like a curated art exhibition or a design magazine spread.",
      compositionStyle: "Highly designed, intentional placement. Asymmetric balance, negative space as a design element. The composition itself is the artwork — product is part of a visual arrangement.",
    },
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Dark Luxe",
    nameTr: "Karanlık Lüks",
    promptModifiers: {
      productClarity: "The product glows against darkness. Highlighted with precision — rim light separates it from the background. Every detail is visible but dramatically lit.",
      background: "Dark — black, charcoal, deep navy, dark marble. The background absorbs light and pushes the product forward. Rich, deep, luxurious darkness.",
      surroundings: "Minimal and premium — a gold accent, silk fabric, a single dark flower, metallic utensil. Less is more. Every element whispers luxury.",
      lighting: "Dramatic spot lighting, chiaroscuro, rim light. Single strong light source creating deep shadows and bright highlights. Cinematic, theatrical. 2800-3200K warm accent.",
      colorPalette: "Dark base with luxurious accents — gold, champagne, deep burgundy, copper against black/charcoal. High contrast between dark and light. Premium feel.",
      compositionStyle: "Product elevated or spotlit, often centered with dramatic negative space in dark tones. Feels like a luxury brand campaign or a Michelin-star menu photograph.",
    },
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "Pop Color",
    nameTr: "Pop Renkli",
    promptModifiers: {
      productClarity: "Product is crisp and clear, often framed or contained within a shape (circle, rounded rectangle) against the colorful background. High contrast separation.",
      background: "Bold, vivid gradient or color blocks — electric coral, hot pink, bright orange, lime green, vivid purple. Eye-catching, scroll-stopping colors.",
      surroundings: "Graphic elements — bold typography, badges, stickers, price tags, 'NEW' labels, confetti, geometric shapes. The poster is designed to grab attention and communicate a message.",
      lighting: "Bright, even, uniform — no shadows, no drama. Flat, high-key lighting that keeps everything vivid and readable. The colors are the star, not the light.",
      colorPalette: "Maximum saturation, maximum energy. 2-3 bold complementary colors. Think: fast food campaigns, sale posters, social media ads. Nothing muted, nothing pastel.",
      compositionStyle: "Graphic poster layout — product framed in center, text/badges around it. Designed for immediate impact, clear hierarchy. Feels like a campaign poster or a promotional flyer.",
    },
    isActive: true,
    sortOrder: 5,
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

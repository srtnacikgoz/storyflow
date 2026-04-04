/**
 * Hand Styles Config — El stilleri CRUD
 * Senaryolarda kullanılacak el stillerinin dinamik yönetimi.
 */

import { HandStyleDefinition, HandStylesConfig } from "../../orchestrator/types";
import { CACHE_TTL, getDb, registerCacheClear } from "./configCache";

// Hand Styles Cache
let handStylesCache: HandStylesConfig | null = null;
let handStylesCacheTimestamp = 0;

// Cache temizleme kaydı
registerCacheClear(() => {
  handStylesCache = null;
  handStylesCacheTimestamp = 0;
});

/**
 * Varsayılan el stilleri — seed verisi
 */
export const DEFAULT_HAND_STYLES: HandStyleDefinition[] = [
  { id: "elegant-manicured", label: "Bakımlı & Zarif", category: "neutral", geminiPrompt: "An elegant hand with perfectly manicured nails, slender fingers, resting gracefully near the product", tags: ["zarif", "bakımlı"], isActive: true, order: 1 },
  { id: "tattooed-delicate", label: "Dövmeli & İnce", category: "neutral", geminiPrompt: "A delicate hand with artistic tattoo sleeve, well-groomed nails, gently holding the product", tags: ["dövme", "sanatsal"], isActive: true, order: 2 },
  { id: "rings-accessorized", label: "Yüzüklü & Aksesuarlı", category: "neutral", geminiPrompt: "A hand adorned with delicate gold rings, neatly manicured nails, touching the product elegantly", tags: ["yüzük", "altın"], isActive: true, order: 3 },
  { id: "natural-minimal", label: "Doğal & Minimal", category: "neutral", geminiPrompt: "A clean, natural hand with short trimmed nails, gently resting beside the product", tags: ["doğal", "minimal"], isActive: true, order: 4 },
  { id: "bracelet-boho", label: "Bilezikli & Bohem", category: "neutral", geminiPrompt: "A hand with stacked bohemian bracelets, natural nails, casually holding the product", tags: ["bilezik", "bohem"], isActive: true, order: 5 },
  { id: "long-nails-glam", label: "Uzun Tırnaklı & Glamour", category: "neutral", geminiPrompt: "A hand with long, perfectly shaped nails in a neutral tone, elegantly presenting the product", tags: ["uzun tırnak", "glamour"], isActive: true, order: 6 },
  { id: "muscular-strong", label: "Kaslı & Güçlü", category: "male", geminiPrompt: "A strong, muscular hand with clean short nails, firmly yet gently gripping the product", tags: ["kaslı", "güçlü"], isActive: true, order: 7 },
  { id: "rugged-masculine", label: "Sert & Maskülen", category: "male", geminiPrompt: "A rugged hand with weathered skin, short nails, holding the product with confidence", tags: ["sert", "maskülen"], isActive: true, order: 8 },
  { id: "watch-formal", label: "Saatli & Formal", category: "male", geminiPrompt: "A well-groomed hand wearing a classic watch, neatly trimmed nails, presenting the product", tags: ["saat", "formal"], isActive: true, order: 9 },
  { id: "child-small", label: "Çocuk Eli", category: "child", geminiPrompt: "A small child's hand, tiny fingers reaching for or gently touching the product", tags: ["çocuk", "küçük"], isActive: true, order: 10 },
  { id: "child-playful", label: "Çocuk Eli (Oyuncu)", category: "child", geminiPrompt: "A child's playful hand with slightly messy fingers, excitedly reaching toward the product", tags: ["çocuk", "oyuncu"], isActive: true, order: 11 },
  { id: "aged-wisdom", label: "Yaşlı & Bilge", category: "neutral", geminiPrompt: "An aged hand with character lines, clean nails, tenderly holding the product", tags: ["yaşlı", "bilge"], isActive: true, order: 12 },
  { id: "dark-nail-edgy", label: "Koyu Tırnaklı & Cesur", category: "neutral", geminiPrompt: "A hand with dark painted nails, edgy style rings, confidently holding the product", tags: ["koyu tırnak", "cesur"], isActive: true, order: 13 },
  { id: "french-tip-classic", label: "French Tip & Klasik", category: "neutral", geminiPrompt: "A hand with classic French tip manicure, clean and sophisticated, delicately touching the product", tags: ["french tip", "klasik"], isActive: true, order: 14 },
  { id: "henna-decorated", label: "Kınalı & Süslü", category: "neutral", geminiPrompt: "A hand decorated with intricate henna patterns, holding the product with grace", tags: ["kına", "süslü"], isActive: true, order: 15 },
  { id: "sporty-active", label: "Sportif & Aktif", category: "neutral", geminiPrompt: "An athletic hand with short functional nails, energetically gripping the product", tags: ["sportif", "aktif"], isActive: true, order: 16 },
  { id: "pearl-elegant", label: "İncili & Sofistike", category: "neutral", geminiPrompt: "A refined hand with pearl ring, soft skin, elegantly presenting the product", tags: ["inci", "sofistike"], isActive: true, order: 17 },
  { id: "leather-bracelet", label: "Deri Bilezikli & Casual", category: "neutral", geminiPrompt: "A casual hand wearing a leather wrap bracelet, natural nails, relaxed grip on the product", tags: ["deri", "casual"], isActive: true, order: 18 },
  { id: "paint-stained-artist", label: "Boyalı & Sanatçı", category: "neutral", geminiPrompt: "An artist's hand with traces of paint, creative rings, passionately presenting the product", tags: ["sanatçı", "boya"], isActive: true, order: 19 },
  { id: "minimal-clean", label: "Sade & Temiz", category: "neutral", geminiPrompt: "A perfectly clean hand with no accessories, trimmed nails, simply resting near the product", tags: ["sade", "temiz"], isActive: true, order: 20 },
  { id: "glam-alluring", label: "Çekici & Baştan Çıkarıcı", category: "glam", geminiPrompt: "A glamorous hand with long almond-shaped nails in deep red, gold chain bracelet, luxuriously resting fingers near the product with dramatic lighting", tags: ["çekici", "glamour", "kırmızı tırnak"], isActive: true, order: 21 },
  { id: "glam-velvet", label: "Kadife & Lüks", category: "glam", geminiPrompt: "An alluring hand with glossy stiletto nails in burgundy, velvet fabric draped over wrist, delicately lifting the product under warm golden light", tags: ["kadife", "lüks", "stiletto"], isActive: true, order: 22 },
];

/**
 * El stillerini getirir (CACHE'Lİ)
 * Document: global/config/settings/hand-styles
 */
export async function getHandStyles(): Promise<HandStylesConfig> {
  const now = Date.now();

  if (handStylesCache && now - handStylesCacheTimestamp < CACHE_TTL) {
    return handStylesCache;
  }

  const doc = await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("hand-styles")
    .get();

  if (!doc.exists) {
    console.warn("[ConfigService] hand-styles dokümanı Firestore'da bulunamadı. Seed endpoint'ini çağırın: /seedGeminiTerminology");
    const defaultConfig: HandStylesConfig = {
      styles: DEFAULT_HAND_STYLES,
      updatedAt: Date.now(),
    };
    handStylesCache = defaultConfig;
    handStylesCacheTimestamp = now;
    return defaultConfig;
  }

  handStylesCache = doc.data() as HandStylesConfig;
  handStylesCacheTimestamp = now;
  return handStylesCache;
}

/**
 * El stillerini günceller
 * Tüm styles array'i birden yazılır
 */
export async function updateHandStyles(
  styles: HandStyleDefinition[],
  updatedBy?: string
): Promise<HandStylesConfig> {
  const config: HandStylesConfig = {
    styles,
    updatedAt: Date.now(),
    ...(updatedBy ? { updatedBy } : {}),
  };

  await getDb()
    .collection("global")
    .doc("config")
    .collection("settings")
    .doc("hand-styles")
    .set(config);

  handStylesCache = null;
  handStylesCacheTimestamp = 0;

  console.log(`[ConfigService] Hand styles updated: ${styles.length} styles`);
  return config;
}

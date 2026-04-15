/**
 * Poster Üretim Sistemi — Type Tanımları
 */

// Stil prompt talimatları — her stil için farklı
export interface PosterPromptDirections {
  styleDirective?: string;     // Stilin tüm tarifi — tek metin (yeni format)
  dallEPrompt?: string;        // Doğrudan ChatGPT'ye yapıştırılabilir DALL-E şablon promptu ({PRODUCT} placeholder)
  // Backward compat — eski stiller için, yeni stiller bunları kullanmaz
  background?: string;
  typography?: string;
  layout?: string;
  colorPalette?: string;
  lighting?: string;
  overallFeel?: string;
  productPlacement?: string;
}

// Mood prompt modifikatörleri
export interface PosterMoodModifiers {
  productClarity: string;    // Ürün ne kadar net/stilize olacak
  background: string;        // Arka plan nasıl olacak
  surroundings: string;      // Çevrede ne olacak (veya olmayacak)
  lighting: string;          // Işık tipi ve yönü
  colorPalette: string;      // Renk paleti talimatı
  compositionStyle: string;  // Kompozisyon/yerleşim yaklaşımı
}

// Poster Stil — Firestore'da yaşar
export interface PosterStyle {
  id: string;
  name: string;              // "Bold Minimal"
  nameTr: string;            // "Cesur Minimal"
  description: string;
  promptDirections: PosterPromptDirections;
  dallEPrompt?: string;          // Doğrudan yapıştırılabilir DALL-E şablon promptu
  examplePromptFragment?: string; // DEPRECATED — eski stiller için, yeni stiller dallEPrompt kullanır
  thumbnailUrl?: string;
  isActive: boolean;
  sortOrder: number;
  // Arka plan renk anchor'ı — stilin doğal rengi (DNA'dan/metinden türetilir, standart olarak yaşar)
  defaultBackgroundHex?: string;
  // Kullanıcı override'ı — dolu ise defaultBackgroundHex yerine bu kullanılır
  backgroundHex?: string;
  // Öğrenme sistemi — feedback'lerden türetilen düzeltmeler
  learnedCorrections?: Record<string, string>; // kategori → düzeltme notu
  lastLearnedAt?: number;    // Son öğrenme zamanı
}

// Poster Mood — Firestore'da yaşar
export interface PosterMood {
  id: string;
  name: string;              // "Warm & Intimate"
  nameTr: string;            // "Sıcak & Samimi"
  promptModifiers: PosterMoodModifiers;
  isActive: boolean;
  sortOrder: number;
}

// Poster Aspect Ratio — Firestore'da yaşar
export interface PosterAspectRatio {
  id: string;
  label: string;             // "2:3 (Poster)"
  width: number;
  height: number;
  useCase: string;           // "Poster, baskı, Pinterest"
  promptInstruction: string; // Gemini'ye gidecek aspect ratio talimatı
  isActive: boolean;
  sortOrder: number;
}

// Poster Galeri — üretilen posterler
export interface PosterGalleryItem {
  id: string;
  posterUrl: string;
  thumbnailUrl?: string;
  styleId: string;
  moodId: string;
  aspectRatioId: string;
  title: string;
  subtitle?: string;
  generatedPrompt: string;
  productAnalysis: string;
  cost: { claude: number; gemini: number; total: number };
  model: string;
  createdAt: number;
  rating?: number;           // 1-5
  isFavorite?: boolean;
  // Geri bildirim
  feedbackCategories?: string[]; // eksik kategoriler: background, typography, vb.
  feedbackNote?: string;         // serbest not
  feedbackAt?: number;           // feedback zamanı
}

// Feedback kategorileri
export const POSTER_FEEDBACK_CATEGORIES = [
  { id: "background", label: "Arka Plan", labelTr: "Arka plan düz/sıkıcı/yanlış" },
  { id: "typography", label: "Tipografi", labelTr: "Font seçimi/boyut/stil kötü" },
  { id: "product-placement", label: "Ürün Yerleşimi", labelTr: "Ürün çok büyük/küçük/yanlış yerde" },
  { id: "text-content", label: "Metin İçeriği", labelTr: "Fiyat formatı/başlık/altbaşlık sorunlu" },
  { id: "composition", label: "Kompozisyon", labelTr: "Genel düzen/denge bozuk" },
  { id: "color", label: "Renk Paleti", labelTr: "Renkler uyumsuz/sönük/yanlış" },
] as const;

// Tipografi stili — Firestore'da yaşar
export interface PosterTypography {
  id: string;
  name: string;              // "Elegant Serif"
  nameTr: string;            // "Zarif Serif"
  description: string;
  promptInstruction: string; // Gemini'ye gidecek tipografi talimatı
  isActive: boolean;
  sortOrder: number;
}

// Layout yerleşim preset'i — Firestore'da yaşar
export interface PosterLayout {
  id: string;
  name: string;              // "Price Top Corner Angled"
  nameTr: string;            // "Fiyat Üst Köşe Açılı"
  description: string;
  promptInstruction: string; // Element yerleşim talimatı
  isActive: boolean;
  sortOrder: number;
}

// Kamera / Çekim Açısı — Firestore'da yaşar
export interface PosterCameraAngle {
  id: string;
  name: string;              // "Flat Lay"
  nameTr: string;            // "Düz Çekim"
  description: string;
  promptInstruction: string; // Prompt'a eklenen talimat
  isActive: boolean;
  sortOrder: number;
}

// Işık / Aydınlatma Tipi — Firestore'da yaşar
export interface PosterLightingType {
  id: string;
  name: string;              // "Natural Window Light"
  nameTr: string;            // "Doğal Pencere Işığı"
  description: string;
  promptInstruction: string;
  isActive: boolean;
  sortOrder: number;
}

// Arka Plan / Ortam — Firestore'da yaşar
export interface PosterBackground {
  id: string;
  name: string;              // "Marble Surface"
  nameTr: string;            // "Mermer Yüzey"
  description: string;
  promptInstruction: string;
  isActive: boolean;
  sortOrder: number;
}

// Evrensel poster kuralları
export interface PosterGlobalRules {
  rules: string[];
  updatedAt: number;
  updatedBy?: string;
}

/**
 * Malzeme Görsel Prompt Üretici — Type Tanımları
 *
 * Sade Patisserie'nin hammadde/üretim süreçlerini vurgulayan
 * tutarlı DALL-E prompt'ları üretmek için kullanılan tipler.
 */

// Stil Profili — tutarlılık şablonu (Firestore'da yaşar)
export interface IngredientStyleProfile {
  id: string;
  name: string;                // "Sade Minimal"
  cameraAngle: string;         // "45° üstten"
  lighting: string;            // "Doğal gün ışığı, soldan pencere"
  surface: string;             // "Beyaz mermer yüzey"
  colorPalette: string;        // "Pastel, sıcak tonlar"
  atmosphere: string;          // "Minimal, temiz, profesyonel"
  framing: string;             // "Yakın çekim, nefes payı"
  referenceImageUrl?: string | null;  // Beğenilen DALL-E çıktısı referansı
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// Malzeme — görselleştirilecek hammadde (Firestore'da yaşar)
export interface IngredientItem {
  id: string;
  name: string;                // "Mascarpone"
  description: string;         // "Günlük taze üretim"
  message: string;             // "Tiramisumuzun sırrı"
  usedInProducts: string[];    // ["Tiramisu", "Cheesecake"]
  isActive: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

// Prompt Geçmişi — üretilen prompt kayıtları (Firestore'da yaşar)
export interface IngredientPromptHistory {
  id: string;
  ingredientId: string;
  ingredientName: string;      // Denormalize — hızlı gösterim için
  styleProfileId: string;
  styleProfileName: string;    // Denormalize
  generatedPrompt: string;     // Birleştirilmiş DALL-E prompt'u
  sceneDetail: string;         // Gemini'nin yazdığı sahne kısmı
  referenceImageUrl?: string | null;
  cost: number;                // Gemini API maliyeti
  model: string;               // Kullanılan Gemini modeli
  createdAt: number;
}

import { useState, useEffect } from "react";
import { api } from "../services/api";
import PosterAnalyzer from "../components/poster/PosterAnalyzer";
import PromptGenerator from "../components/poster/PromptGenerator";

interface PosterStyle {
  id: string; name: string; nameTr: string; description: string;
  isActive: boolean; sortOrder: number;
}
interface PosterMood {
  id: string; name: string; nameTr: string;
  compatibleStyles: string[]; isActive: boolean; sortOrder: number;
}
interface PosterAspectRatio {
  id: string; label: string; width: number; height: number;
  useCase: string; isActive: boolean;
}
interface PosterTypography {
  id: string; name: string; nameTr: string; description: string;
  isActive: boolean; sortOrder: number;
}
interface PosterLayout {
  id: string; name: string; nameTr: string; description: string;
  isActive: boolean; sortOrder: number;
}
interface PosterCameraAngle {
  id: string; name: string; nameTr: string; description: string;
  promptInstruction: string; isActive: boolean; sortOrder: number;
}
interface PosterLightingType {
  id: string; name: string; nameTr: string; description: string;
  promptInstruction: string; isActive: boolean; sortOrder: number;
}
interface PosterBackground {
  id: string; name: string; nameTr: string; description: string;
  promptInstruction: string; isActive: boolean; sortOrder: number;
}

// Kamera açısı diyagramları — SVG piktogramlar
// Kamera açısı diyagramları — kamera konumu + açısı
const CAMERA_ANGLE_DIAGRAMS: Record<string, React.ReactElement> = {
  "flat-lay": (
    // Kamera tam tepede, ürün yerde düz — kuş bakışı
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      <rect x="14" y="36" width="28" height="16" rx="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
      <line x1="28" y1="36" x2="28" y2="28" stroke="#9ca3af" strokeWidth="1" strokeDasharray="2 2"/>
      <line x1="14" y1="36" x2="42" y2="36" stroke="#9ca3af" strokeWidth="1" strokeDasharray="2 2"/>
      {/* Kamera üstten bakıyor */}
      <rect x="22" y="4" width="12" height="8" rx="2" fill="#1f2937"/>
      <circle cx="28" cy="8" r="2.5" fill="#4b5563"/>
      <circle cx="28" cy="8" r="1.2" fill="#9ca3af"/>
      {/* Dik ok */}
      <line x1="28" y1="13" x2="28" y2="33" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="3 2"/>
      <polygon points="28,36 24.5,30 31.5,30" fill="#6b7280"/>
      <text x="32" y="22" fontSize="8" fill="#9ca3af" fontFamily="sans-serif" fontWeight="bold">90°</text>
    </svg>
  ),
  "45-degree-overhead": (
    // Kamera köşeden 45° açıyla bakıyor
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      {/* Zemin */}
      <line x1="4" y1="48" x2="52" y2="48" stroke="#e5e7eb" strokeWidth="1.5"/>
      {/* Ürün */}
      <rect x="28" y="34" width="20" height="14" rx="2" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
      {/* Kamera — sol üstte */}
      <rect x="4" y="6" width="12" height="8" rx="2" fill="#1f2937"/>
      <circle cx="10" cy="10" r="2.5" fill="#4b5563"/>
      <circle cx="10" cy="10" r="1.2" fill="#9ca3af"/>
      <polygon points="16,8 20,10 16,12" fill="#1f2937"/>
      {/* 45° ok */}
      <line x1="20" y1="14" x2="34" y2="32" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="3 2"/>
      <polygon points="36,34 29,30 33,27" fill="#6b7280"/>
      {/* Açı yayı */}
      <path d="M 20,28 A 10,10 0 0,1 28,20" stroke="#9ca3af" strokeWidth="1" fill="none"/>
      <text x="22" y="19" fontSize="8" fill="#9ca3af" fontFamily="sans-serif" fontWeight="bold">45°</text>
    </svg>
  ),
  "hero-shot": (
    // Kamera ürünle aynı yükseklikte, tam karşıdan
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      <line x1="4" y1="46" x2="52" y2="46" stroke="#e5e7eb" strokeWidth="1.5"/>
      {/* Ürün */}
      <rect x="36" y="22" width="16" height="24" rx="2" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
      {/* Kamera — sol, aynı hizada */}
      <rect x="4" y="26" width="12" height="8" rx="2" fill="#1f2937"/>
      <circle cx="10" cy="30" r="2.5" fill="#4b5563"/>
      <circle cx="10" cy="30" r="1.2" fill="#9ca3af"/>
      <polygon points="16,27 21,30 16,33" fill="#1f2937"/>
      {/* Yatay ok */}
      <line x1="21" y1="30" x2="33" y2="30" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="3 2"/>
      <polygon points="36,30 31,27 31,33" fill="#6b7280"/>
      <text x="20" y="22" fontSize="8" fill="#9ca3af" fontFamily="sans-serif" fontWeight="bold">0°</text>
    </svg>
  ),
  "close-up-macro": (
    // Kamera çok yakın, detay çerçevesi
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      {/* Ürün */}
      <rect x="10" y="18" width="36" height="28" rx="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
      {/* Detay doku */}
      <circle cx="20" cy="28" r="2.5" fill="#d1d5db"/>
      <circle cx="28" cy="28" r="2.5" fill="#d1d5db"/>
      <circle cx="36" cy="28" r="2.5" fill="#d1d5db"/>
      <circle cx="24" cy="36" r="2.5" fill="#d1d5db"/>
      <circle cx="32" cy="36" r="2.5" fill="#d1d5db"/>
      {/* Kamera çok yakın üstte */}
      <rect x="22" y="2" width="12" height="7" rx="2" fill="#1f2937"/>
      <circle cx="28" cy="5.5" r="2" fill="#4b5563"/>
      <circle cx="28" cy="5.5" r="1" fill="#9ca3af"/>
      <line x1="28" y1="10" x2="28" y2="16" stroke="#6b7280" strokeWidth="2"/>
      {/* Yakın alan çerçevesi */}
      <rect x="6" y="14" width="44" height="36" rx="4" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4 2" fill="none"/>
    </svg>
  ),
  "three-quarter-angle": (
    // Kamera köşeden, ürünün hem önü hem yanı görünüyor
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      <line x1="4" y1="48" x2="52" y2="48" stroke="#e5e7eb" strokeWidth="1.5"/>
      {/* 3D kutu — ürün */}
      <polygon points="20,22 40,22 46,34 26,34" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
      <polygon points="20,22 26,34 26,42 20,30" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1.5"/>
      <polygon points="20,22 40,22 40,14 20,14" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="1.2"/>
      {/* Kamera — sol üst */}
      <rect x="2" y="4" width="12" height="8" rx="2" fill="#1f2937"/>
      <circle cx="8" cy="8" r="2.5" fill="#4b5563"/>
      <circle cx="8" cy="8" r="1.2" fill="#9ca3af"/>
      <polygon points="14,6 18,8 14,10" fill="#1f2937"/>
      {/* Köşegen ok */}
      <line x1="18" y1="12" x2="26" y2="20" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="3 2"/>
      <polygon points="28,22 22,18 25,15" fill="#6b7280"/>
    </svg>
  ),
};

// Işık tipi diyagramları — ışık kaynağı konumu ve etkisi
const LIGHTING_DIAGRAMS: Record<string, React.ReactElement> = {
  "natural-window-light": (
    // Pencereden yumuşak yan ışık
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      <line x1="4" y1="48" x2="52" y2="48" stroke="#e5e7eb" strokeWidth="1.5"/>
      {/* Ürün */}
      <rect x="30" y="26" width="18" height="22" rx="2" fill="#f9fafb" stroke="#d1d5db" strokeWidth="1.5"/>
      {/* Gölge */}
      <ellipse cx="39" cy="48" rx="7" ry="2.5" fill="#e5e7eb"/>
      {/* Pencere — sol */}
      <rect x="2" y="8" width="14" height="22" rx="1" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.5"/>
      <line x1="9" y1="8" x2="9" y2="30" stroke="#93c5fd" strokeWidth="1"/>
      <line x1="2" y1="19" x2="16" y2="19" stroke="#93c5fd" strokeWidth="1"/>
      {/* Yumuşak ışık huzmeleri */}
      <line x1="16" y1="12" x2="30" y2="28" stroke="#fde68a" strokeWidth="1.5" opacity="0.8"/>
      <line x1="16" y1="17" x2="30" y2="32" stroke="#fde68a" strokeWidth="2" opacity="0.9"/>
      <line x1="16" y1="22" x2="30" y2="36" stroke="#fde68a" strokeWidth="1.5" opacity="0.8"/>
      <line x1="16" y1="27" x2="30" y2="40" stroke="#fde68a" strokeWidth="1" opacity="0.6"/>
    </svg>
  ),
  "studio-soft-box": (
    // Büyük soft box, yukarıdan ön
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      <line x1="4" y1="50" x2="52" y2="50" stroke="#e5e7eb" strokeWidth="1.5"/>
      {/* Ürün */}
      <rect x="20" y="30" width="18" height="20" rx="2" fill="#f9fafb" stroke="#d1d5db" strokeWidth="1.5"/>
      <ellipse cx="29" cy="50" rx="7" ry="2" fill="#e5e7eb"/>
      {/* Soft box — büyük dikdörtgen üstte */}
      <rect x="10" y="2" width="38" height="14" rx="3" fill="#fef9c3" stroke="#fde047" strokeWidth="1.5"/>
      <rect x="14" y="5" width="30" height="8" rx="2" fill="#fef08a" stroke="#facc15" strokeWidth="1"/>
      {/* Geniş yayılan ışık */}
      <line x1="14" y1="16" x2="20" y2="30" stroke="#fde68a" strokeWidth="1.5" opacity="0.7"/>
      <line x1="22" y1="16" x2="25" y2="30" stroke="#fde68a" strokeWidth="2" opacity="0.9"/>
      <line x1="29" y1="16" x2="29" y2="30" stroke="#fde68a" strokeWidth="2.5" opacity="1"/>
      <line x1="36" y1="16" x2="33" y2="30" stroke="#fde68a" strokeWidth="2" opacity="0.9"/>
      <line x1="44" y1="16" x2="38" y2="30" stroke="#fde68a" strokeWidth="1.5" opacity="0.7"/>
    </svg>
  ),
  "golden-hour": (
    // Güneş ufukta, uzun gölge, sıcak ışık
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      <line x1="4" y1="44" x2="52" y2="44" stroke="#e5e7eb" strokeWidth="1.5"/>
      {/* Ürün */}
      <rect x="28" y="28" width="14" height="16" rx="2" fill="#fef9c3" stroke="#fde68a" strokeWidth="1.5"/>
      {/* Uzun gölge */}
      <polygon points="28,44 42,44 52,50 38,50" fill="#f3f4f6" opacity="0.8"/>
      {/* Güneş — sola yakın ufukta */}
      <circle cx="8" cy="44" r="7" fill="#fbbf24" opacity="0.9"/>
      <circle cx="8" cy="44" r="5" fill="#f59e0b"/>
      {/* Güneş huzmeleri */}
      <line x1="8" y1="34" x2="8" y2="30" stroke="#fbbf24" strokeWidth="1.5"/>
      <line x1="14" y1="36" x2="17" y2="33" stroke="#fbbf24" strokeWidth="1.5"/>
      <line x1="16" y1="44" x2="20" y2="44" stroke="#fbbf24" strokeWidth="1.5"/>
      {/* Alçak açılı ışık huzmeleri */}
      <line x1="15" y1="42" x2="28" y2="34" stroke="#fbbf24" strokeWidth="1.5" opacity="0.8"/>
      <line x1="15" y1="44" x2="28" y2="38" stroke="#fbbf24" strokeWidth="2" opacity="0.9"/>
    </svg>
  ),
  "dramatic-side-light": (
    // Sert tek taraflı yan ışık, güçlü gölge
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      <line x1="4" y1="50" x2="52" y2="50" stroke="#e5e7eb" strokeWidth="1.5"/>
      {/* Ürün — yarısı aydınlık yarısı karanlık */}
      <rect x="20" y="20" width="18" height="30" rx="2" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1.5"/>
      {/* Karanlık taraf */}
      <rect x="29" y="20" width="9" height="30" rx="0" fill="#374151" opacity="0.5"/>
      <rect x="29" y="20" width="9" height="30" rx="2" fill="url(#shadowGrad)" opacity="0.6"/>
      {/* Sert ışık kaynağı — sol */}
      <rect x="2" y="28" width="10" height="8" rx="2" fill="#1f2937"/>
      <circle cx="7" cy="32" r="3" fill="#fbbf24"/>
      <circle cx="7" cy="32" r="1.5" fill="#fef9c3"/>
      {/* Sert ışık huzmeleri */}
      <line x1="12" y1="30" x2="20" y2="26" stroke="#fbbf24" strokeWidth="2"/>
      <line x1="12" y1="32" x2="20" y2="32" stroke="#fbbf24" strokeWidth="2.5"/>
      <line x1="12" y1="34" x2="20" y2="38" stroke="#fbbf24" strokeWidth="2"/>
    </svg>
  ),
  "neon-glow": (
    // Renkli neon ışıklar, koyu arka plan
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      <rect x="0" y="0" width="56" height="56" rx="4" fill="#0f0f1a"/>
      <line x1="4" y1="50" x2="52" y2="50" stroke="#1e1e3a" strokeWidth="1.5"/>
      {/* Ürün */}
      <rect x="18" y="18" width="20" height="28" rx="3" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5"/>
      {/* Sol neon — mor */}
      <line x1="4" y1="12" x2="4" y2="44" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round"/>
      <line x1="4" y1="12" x2="4" y2="44" stroke="#c4b5fd" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
      {/* Sağ neon — pembe */}
      <line x1="52" y1="12" x2="52" y2="44" stroke="#f472b6" strokeWidth="3" strokeLinecap="round"/>
      <line x1="52" y1="12" x2="52" y2="44" stroke="#fbcfe8" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
      {/* Yansıma efekti */}
      <rect x="18" y="18" width="20" height="28" rx="3" fill="none" stroke="#818cf8" strokeWidth="0.5" opacity="0.5"/>
      {/* Parıltı noktaları */}
      <circle cx="18" cy="32" r="3" fill="#a78bfa" opacity="0.4"/>
      <circle cx="38" cy="32" r="3" fill="#f472b6" opacity="0.4"/>
    </svg>
  ),
  "backlit-halo": (
    // Arka ışık, ürün önden karanlık, hale efekti
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      <line x1="4" y1="50" x2="52" y2="50" stroke="#e5e7eb" strokeWidth="1.5"/>
      {/* Arka plan ışık kaynağı */}
      <circle cx="28" cy="20" r="12" fill="#fef9c3" opacity="0.5"/>
      <circle cx="28" cy="20" r="8" fill="#fef08a" opacity="0.6"/>
      <circle cx="28" cy="20" r="4" fill="#fde047"/>
      {/* Işın çizgileri */}
      <line x1="28" y1="6" x2="28" y2="2" stroke="#fbbf24" strokeWidth="1.5"/>
      <line x1="38" y1="10" x2="41" y2="7" stroke="#fbbf24" strokeWidth="1.5"/>
      <line x1="18" y1="10" x2="15" y2="7" stroke="#fbbf24" strokeWidth="1.5"/>
      <line x1="42" y1="20" x2="46" y2="20" stroke="#fbbf24" strokeWidth="1.5"/>
      <line x1="14" y1="20" x2="10" y2="20" stroke="#fbbf24" strokeWidth="1.5"/>
      {/* Ürün — önde koyu (siluet) */}
      <rect x="20" y="26" width="16" height="24" rx="2" fill="#374151"/>
      {/* Hale (rim light) */}
      <rect x="19" y="25" width="18" height="26" rx="3" fill="none" stroke="#fde68a" strokeWidth="2" opacity="0.8"/>
    </svg>
  ),
};

// Arka plan diyagramları — yüzey ve ortam dokusu
const BACKGROUND_DIAGRAMS: Record<string, React.ReactElement> = {
  "pure-white": (
    // Düz beyaz zemin, ürün temiz
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      <rect x="2" y="2" width="52" height="52" rx="4" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1.5"/>
      {/* Sonsuz zemin çizgisi */}
      <path d="M 4 36 Q 28 30 52 36" stroke="#e5e7eb" strokeWidth="1" fill="none"/>
      {/* Ürün gölgesi */}
      <ellipse cx="28" cy="40" rx="10" ry="2.5" fill="#f3f4f6"/>
      {/* Ürün */}
      <rect x="18" y="20" width="20" height="20" rx="3" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1.5"/>
      {/* Temiz/sade işareti */}
      <text x="14" y="52" fontSize="7" fill="#d1d5db" fontFamily="sans-serif">clean</text>
    </svg>
  ),
  "marble-surface": (
    // Mermer damar dokusu
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      <rect x="2" y="2" width="52" height="52" rx="4" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5"/>
      {/* Mermer damarları */}
      <path d="M 8 10 Q 20 22 14 34 Q 8 46 20 50" stroke="#cbd5e1" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M 22 4 Q 30 16 26 28 Q 22 40 32 52" stroke="#e2e8f0" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <path d="M 36 8 Q 42 18 38 32 Q 34 44 44 50" stroke="#cbd5e1" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <path d="M 46 14 Q 50 24 48 38" stroke="#e2e8f0" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
      {/* Ürün */}
      <rect x="16" y="18" width="22" height="18" rx="3" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" opacity="0.9"/>
      <ellipse cx="27" cy="36" rx="8" ry="2" fill="#e2e8f0" opacity="0.6"/>
    </svg>
  ),
  "wooden-table": (
    // Ahşap tahta çizgileri
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      <rect x="2" y="2" width="52" height="52" rx="4" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5"/>
      {/* Tahta çizgileri */}
      <line x1="2" y1="14" x2="54" y2="14" stroke="#d97706" strokeWidth="0.8" opacity="0.4"/>
      <line x1="2" y1="28" x2="54" y2="28" stroke="#b45309" strokeWidth="1" opacity="0.3"/>
      <line x1="2" y1="42" x2="54" y2="42" stroke="#d97706" strokeWidth="0.8" opacity="0.4"/>
      {/* Ahşap doku — ince yatay çizgiler */}
      <line x1="2" y1="8" x2="54" y2="8" stroke="#fbbf24" strokeWidth="0.5" opacity="0.5"/>
      <line x1="2" y1="20" x2="54" y2="20" stroke="#fbbf24" strokeWidth="0.5" opacity="0.5"/>
      <line x1="2" y1="35" x2="54" y2="35" stroke="#fbbf24" strokeWidth="0.5" opacity="0.5"/>
      <line x1="2" y1="48" x2="54" y2="48" stroke="#fbbf24" strokeWidth="0.5" opacity="0.5"/>
      {/* Düğüm noktası */}
      <ellipse cx="42" cy="21" rx="4" ry="3" stroke="#b45309" strokeWidth="0.8" fill="none" opacity="0.4"/>
      {/* Ürün */}
      <rect x="15" y="16" width="22" height="18" rx="3" fill="#fffbeb" stroke="#d97706" strokeWidth="1.5" opacity="0.95"/>
      <ellipse cx="26" cy="34" rx="8" ry="2" fill="#d97706" opacity="0.2"/>
    </svg>
  ),
  "linen-fabric": (
    // Dokuma kumaş grid deseni
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      <rect x="2" y="2" width="52" height="52" rx="4" fill="#fefce8" stroke="#ca8a04" strokeWidth="1.5"/>
      {/* Keten dokuma deseni — yatay */}
      {[8,13,18,23,28,33,38,43,48].map((y, i) => (
        <line key={`h${i}`} x1="2" y1={y} x2="54" y2={y} stroke="#d4b896" strokeWidth="0.6" opacity="0.5"/>
      ))}
      {/* Dikey */}
      {[8,13,18,23,28,33,38,43,48].map((x, i) => (
        <line key={`v${i}`} x1={x} y1="2" x2={x} y2="54" stroke="#d4b896" strokeWidth="0.6" opacity="0.3"/>
      ))}
      {/* Ürün */}
      <rect x="14" y="16" width="22" height="18" rx="3" fill="#fffdf0" stroke="#ca8a04" strokeWidth="1.5" opacity="0.95"/>
      <ellipse cx="25" cy="34" rx="8" ry="2" fill="#ca8a04" opacity="0.15"/>
    </svg>
  ),
  "dark-moody": (
    // Koyu arka plan, ürün karanlıktan çıkıyor
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      <rect x="2" y="2" width="52" height="52" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5"/>
      {/* Gradient efekti için katmanlar */}
      <circle cx="28" cy="30" r="22" fill="#1e293b" opacity="0.6"/>
      <circle cx="28" cy="30" r="14" fill="#1e293b" opacity="0.4"/>
      {/* Ürün */}
      <rect x="16" y="18" width="22" height="24" rx="3" fill="#334155" stroke="#475569" strokeWidth="1.5"/>
      {/* Subtle highlight */}
      <rect x="16" y="18" width="22" height="6" rx="3" fill="#475569" opacity="0.5"/>
      {/* Rim ışığı */}
      <rect x="15" y="17" width="24" height="26" rx="4" fill="none" stroke="#64748b" strokeWidth="0.8" opacity="0.6"/>
      {/* Zemin yansıması */}
      <ellipse cx="27" cy="42" rx="9" ry="2" fill="#334155" opacity="0.8"/>
    </svg>
  ),
  "outdoor-nature": (
    // Yeşillik, taş, açık hava
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      <rect x="2" y="2" width="52" height="52" rx="4" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5"/>
      {/* Gökyüzü */}
      <rect x="2" y="2" width="52" height="24" rx="4" fill="#e0f2fe" opacity="0.8"/>
      {/* Arka plan yapraklar */}
      <ellipse cx="8" cy="32" rx="8" ry="10" fill="#4ade80" opacity="0.4"/>
      <ellipse cx="48" cy="28" rx="9" ry="12" fill="#22c55e" opacity="0.3"/>
      <ellipse cx="44" cy="40" rx="7" ry="8" fill="#4ade80" opacity="0.4"/>
      {/* Taş yüzey */}
      <rect x="2" y="40" width="52" height="14" rx="0" fill="#d1d5db" opacity="0.7"/>
      <line x1="2" y1="40" x2="54" y2="40" stroke="#9ca3af" strokeWidth="1"/>
      <ellipse cx="12" cy="43" rx="5" ry="2" fill="#9ca3af" opacity="0.3"/>
      <ellipse cx="36" cy="46" rx="7" ry="2" fill="#9ca3af" opacity="0.3"/>
      {/* Ürün */}
      <rect x="18" y="26" width="18" height="18" rx="3" fill="#ffffff" stroke="#d1d5db" strokeWidth="1.5"/>
      <ellipse cx="27" cy="44" rx="7" ry="1.5" fill="#9ca3af" opacity="0.5"/>
    </svg>
  ),
  "pastel-solid": (
    // Soft renk blokları örnek
    <svg viewBox="0 0 56 56" className="w-12 h-12" fill="none">
      {/* 4 pastel renk kutusu */}
      <rect x="2" y="2" width="26" height="26" rx="3" fill="#fbcfe8"/>
      <rect x="30" y="2" width="24" height="26" rx="3" fill="#bbf7d0"/>
      <rect x="2" y="30" width="26" height="24" rx="3" fill="#c7d2fe"/>
      <rect x="30" y="30" width="24" height="24" rx="3" fill="#fde68a"/>
      {/* Seçim çerçevesi */}
      <rect x="1" y="1" width="54" height="54" rx="4" stroke="#e5e7eb" strokeWidth="1.5" fill="none"/>
      {/* Ürün ortada */}
      <rect x="15" y="15" width="26" height="26" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1.5"/>
      <ellipse cx="28" cy="41" rx="9" ry="2" fill="#e5e7eb" opacity="0.6"/>
    </svg>
  ),
};

const RATIO_ICONS: Record<string, string> = {
  "2-3": "▯", "4-5": "▯", "1-1": "▢", "9-16": "▏",
};

export default function Poster() {
  // Firestore verileri
  const [styles, setStyles] = useState<PosterStyle[]>([]);
  const [moods, setMoods] = useState<PosterMood[]>([]);
  const [ratios, setRatios] = useState<PosterAspectRatio[]>([]);
  const [typographies, setTypographies] = useState<PosterTypography[]>([]);
  const [layouts, setLayouts] = useState<PosterLayout[]>([]);
  const [cameraAngles, setCameraAngles] = useState<PosterCameraAngle[]>([]);
  const [lightingTypes, setLightingTypes] = useState<PosterLightingType[]>([]);
  const [backgrounds, setBackgrounds] = useState<PosterBackground[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  // Seçimler
  const [selectedStyle, setSelectedStyle] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [selectedRatio, setSelectedRatio] = useState("2-3");
  const [selectedTitleTypography, setSelectedTitleTypography] = useState("");
  const [selectedSubtitleTypography, setSelectedSubtitleTypography] = useState("");
  const [selectedLayout, setSelectedLayout] = useState("");
  const [selectedCameraAngle, setSelectedCameraAngle] = useState("");
  const [selectedLightingType, setSelectedLightingType] = useState("");
  const [selectedBackground, setSelectedBackground] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");

  // Stil açıklama detayı (hover/click ile full açıklama)
  const [expandedStyleDesc, setExpandedStyleDesc] = useState<string | null>(null);
  // Form
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [price, setPrice] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [explodedLayers, setExplodedLayers] = useState("");

  // Görsel
  const [productImageBase64, setProductImageBase64] = useState<string | null>(null);
  const [productMimeType, setProductMimeType] = useState("image/jpeg");
  const [productPreview, setProductPreview] = useState<string | null>(null);

  // Referans poster
  const [referenceImageBase64, setReferenceImageBase64] = useState<string | null>(null);
  const [referenceImageMimeType, setReferenceImageMimeType] = useState("image/jpeg");
  const [referencePreview, setReferencePreview] = useState<string | null>(null);

  // Config yükle
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setConfigLoading(true);
    setConfigError(null);
    try {
      const [stylesData, moodsData, ratiosData, typoData, layoutData] = await Promise.all([
        api.listPosterStyles(),
        api.listPosterMoods(),
        api.listPosterAspectRatios(),
        api.listPosterTypographies(),
        api.listPosterLayouts(),
      ]);
      setStyles(stylesData);
      setMoods(moodsData);
      setRatios(ratiosData);
      setTypographies(typoData);
      setLayouts(layoutData);

      // Yeni endpoint'ler — deploy edilmemişse sayfa yine çalışır
      const [cameraData, lightingData, bgData] = await Promise.all([
        api.listCameraAngles().catch(() => []),
        api.listLightingTypes().catch(() => []),
        api.listBackgrounds().catch(() => []),
      ]);
      setCameraAngles(cameraData.filter((c: PosterCameraAngle) => c.isActive).sort((a: PosterCameraAngle, b: PosterCameraAngle) => a.sortOrder - b.sortOrder));
      setLightingTypes(lightingData.filter((l: PosterLightingType) => l.isActive).sort((a: PosterLightingType, b: PosterLightingType) => a.sortOrder - b.sortOrder));
      setBackgrounds(bgData.filter((b: PosterBackground) => b.isActive).sort((a: PosterBackground, b: PosterBackground) => a.sortOrder - b.sortOrder));
      if (stylesData.length > 0) setSelectedStyle(stylesData[0].id);
      if (moodsData.length > 0) setSelectedMood(moodsData[0].id);
    } catch (err: any) {
      setConfigError(err.message || "Config yüklenemedi");
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      await api.seedPosterConfig();
      await loadConfig();
    } catch (err: any) {
      alert("Seed hatası: " + err.message);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setProductImageBase64(base64);
      setProductPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Prompt Generator'a gönderilecek birleşik notlar
  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceImageMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setReferenceImageBase64(base64);
      setReferencePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const combinedAdditionalNotes = [
    additionalNotes,
    explodedLayers ? `EXPLODED VIEW LAYER ORDER (bottom to top):\n${explodedLayers}` : "",
  ].filter(Boolean).join("\n\n");

  // Config yüklenirken
  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  // Config bulunamadı — seed gerekiyor
  if (configError || styles.length === 0) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Poster Konfigürasyonu Bulunamadı</h1>
        <p className="text-sm text-gray-500 mb-6">
          {configError || "Firestore'da poster stilleri yok. Seed çalıştırarak yükleyin."}
        </p>
        <button onClick={handleSeed} className="btn-primary px-6 py-2">
          Poster Config Seed Et
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Poster Prompt Üret</h1>
          <p className="text-sm text-gray-500 mt-1">ChatGPT, Midjourney veya DALL-E için optimize edilmiş prompt</p>
        </div>
        <PosterAnalyzer
          onApplyStyle={(sId, mId, tId) => {
            if (sId) setSelectedStyle(sId);
            if (mId) setSelectedMood(mId);
            if (tId) setSelectedTitleTypography(tId);
          }}
          onStyleSaved={loadConfig}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        {/* Ürün Görseli */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Ürün Görseli *</label>
          {productPreview ? (
            <div className="flex items-center gap-3">
              <img src={productPreview} alt="Ürün" className="w-20 h-20 object-cover rounded-lg border" />
              <button onClick={() => { setProductPreview(null); setProductImageBase64(null); }} className="text-xs text-red-500 hover:text-red-700">Değiştir</button>
            </div>
          ) : (
            <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-amber-400 transition">
              <div className="text-center">
                <p className="text-sm text-gray-500">Ürün fotoğrafı yükle</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP</p>
              </div>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Referans Poster (opsiyonel) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Referans Poster <span className="text-xs text-gray-400">(opsiyonel — "bu tarzda üret")</span>
          </label>
          {referencePreview ? (
            <div className="flex items-center gap-3">
              <img src={referencePreview} alt="Referans" className="w-20 h-28 object-cover rounded-lg border border-violet-300" />
              <div>
                <p className="text-xs text-violet-600 font-medium">Referans poster yüklendi</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Stil, layout ve renk paleti bu posterden alınacak</p>
                <button onClick={() => { setReferencePreview(null); setReferenceImageBase64(null); }} className="text-xs text-red-500 hover:text-red-700 mt-1">Kaldır</button>
              </div>
            </div>
          ) : (
            <label className="flex items-center justify-center border-2 border-dashed border-violet-200 rounded-lg p-4 cursor-pointer hover:border-violet-400 transition bg-violet-50/30">
              <div className="text-center">
                <p className="text-sm text-violet-500">Beğendiğin bir poster yükle</p>
                <p className="text-[10px] text-gray-400 mt-1">Claude bu posterin stilini analiz edip prompt'a yansıtacak</p>
              </div>
              <input type="file" accept="image/*" onChange={handleReferenceUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Stil Seçimi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tasarım Stili</label>
          <div className="grid grid-cols-2 gap-2">
            {styles.map(s => (
              <div
                key={s.id}
                className={`relative group border rounded-xl transition ${
                  selectedStyle === s.id
                    ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {/* Üst satır: isim + aksiyon butonları */}
                <div className="flex items-start justify-between gap-1 p-3 pb-1">
                  <button
                    onClick={() => setSelectedStyle(s.id)}
                    className="flex-1 text-left"
                  >
                    <span className="font-medium text-sm">{s.nameTr}</span>
                  </button>
                  <div className="flex gap-1 flex-shrink-0">
                    {/* Açıklama detayı */}
                    {s.description && (
                      <button
                        onClick={e => { e.stopPropagation(); setExpandedStyleDesc(expandedStyleDesc === s.id ? null : s.id); }}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                          expandedStyleDesc === s.id
                            ? "bg-violet-100 border-violet-300 text-violet-600"
                            : "bg-gray-50 border-gray-200 text-gray-400 hover:text-violet-600 hover:border-violet-300"
                        }`}
                        title="Açıklamayı gör"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}
                    {/* Sil */}
                    <button
                      onClick={async e => {
                        e.stopPropagation();
                        // Optimistic: listeden hemen kaldır
                        const backup = [...styles];
                        setStyles(prev => prev.filter(x => x.id !== s.id));
                        if (selectedStyle === s.id) setSelectedStyle("");
                        if (expandedStyleDesc === s.id) setExpandedStyleDesc(null);
                        try {
                          await api.deletePosterStyle(s.id);
                        } catch {
                          // Başarısızsa geri al
                          setStyles(backup);
                          alert("Silinemedi");
                        }
                      }}
                      className="w-6 h-6 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors"
                      title="Sil"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Kısa açıklama satırı — tıklanabilir alan */}
                {s.description && (
                  <button onClick={() => setSelectedStyle(s.id)} className="w-full px-3 pb-2 text-left">
                    <span className="text-xs text-gray-500 truncate block">{s.description}</span>
                  </button>
                )}

                {/* Açıklama detay paneli — inline expand */}
                {expandedStyleDesc === s.id && (
                  <div className="px-3 pb-3 -mt-1">
                    <p className="text-xs text-gray-600 bg-white border border-violet-100 rounded-lg p-2.5 leading-relaxed">{s.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mood Seçimi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mood</label>
          <div className="grid grid-cols-3 gap-2">
            {moods.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMood(m.id)}
                className={`p-2.5 border rounded-xl text-left transition ${
                  selectedMood === m.id
                    ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="font-medium text-xs">{m.nameTr}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Boyut</label>
          <div className="flex gap-2">
            {ratios.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRatio(r.id)}
                className={`flex-1 py-2.5 px-3 border rounded-xl text-center transition ${
                  selectedRatio === r.id
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-lg block">{RATIO_ICONS[r.id] || "▯"}</span>
                <span className="text-xs font-medium">{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Çekim Açısı */}
        {cameraAngles.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Çekim Açısı <span className="text-xs text-gray-400">(opsiyonel)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedCameraAngle("")}
                className={`p-2.5 border rounded-xl text-left transition ${
                  !selectedCameraAngle ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="font-medium text-xs">Otomatik</span>
              </button>
              {cameraAngles.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCameraAngle(c.id)}
                  className={`p-2.5 border rounded-xl text-left transition ${
                    selectedCameraAngle === c.id
                      ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {CAMERA_ANGLE_DIAGRAMS[c.id] && (
                      <div className="shrink-0 opacity-70">{CAMERA_ANGLE_DIAGRAMS[c.id]}</div>
                    )}
                    <div>
                      <span className="font-medium text-xs">{c.nameTr}</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5 line-clamp-2">{c.description}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Aydınlatma */}
        {lightingTypes.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aydınlatma <span className="text-xs text-gray-400">(opsiyonel)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedLightingType("")}
                className={`p-2.5 border rounded-xl text-left transition ${
                  !selectedLightingType ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="font-medium text-xs">Otomatik</span>
              </button>
              {lightingTypes.map(l => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLightingType(l.id)}
                  className={`p-2.5 border rounded-xl text-left transition ${
                    selectedLightingType === l.id
                      ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {LIGHTING_DIAGRAMS[l.id] && (
                      <div className="shrink-0 opacity-80">{LIGHTING_DIAGRAMS[l.id]}</div>
                    )}
                    <div>
                      <span className="font-medium text-xs">{l.nameTr}</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5 line-clamp-2">{l.description}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Arka Plan */}
        {backgrounds.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Arka Plan <span className="text-xs text-gray-400">(opsiyonel)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedBackground("")}
                className={`p-2.5 border rounded-xl text-left transition ${
                  !selectedBackground ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="font-medium text-xs">Otomatik</span>
              </button>
              {backgrounds.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBackground(b.id)}
                  className={`p-2.5 border rounded-xl text-left transition ${
                    selectedBackground === b.id
                      ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {BACKGROUND_DIAGRAMS[b.id] && (
                      <div className="shrink-0 rounded-lg overflow-hidden">{BACKGROUND_DIAGRAMS[b.id]}</div>
                    )}
                    <div>
                      <span className="font-medium text-xs">{b.nameTr}</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5 line-clamp-2">{b.description}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tipografi — Başlık */}
        {typographies.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Başlık Tipografisi <span className="text-xs text-gray-400">(opsiyonel)</span></label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTitleTypography("")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  !selectedTitleTypography
                    ? "bg-gray-900 text-white"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300"
                }`}
              >
                Otomatik
              </button>
              {typographies.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTitleTypography(t.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    selectedTitleTypography === t.id
                      ? "bg-violet-600 text-white"
                      : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {t.nameTr}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tipografi — Alt Başlık */}
        {typographies.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Alt Başlık Tipografisi <span className="text-xs text-gray-400">(opsiyonel)</span></label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSubtitleTypography("")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  !selectedSubtitleTypography
                    ? "bg-gray-900 text-white"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300"
                }`}
              >
                Otomatik
              </button>
              {typographies.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedSubtitleTypography(t.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    selectedSubtitleTypography === t.id
                      ? "bg-amber-600 text-white"
                      : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {t.nameTr}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Layout / Yerleşim */}
        {layouts.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Yerleşim <span className="text-xs text-gray-400">(opsiyonel)</span></label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedLayout("")}
                className={`p-2 border rounded-xl text-center transition ${
                  !selectedLayout
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-xs font-medium">Otomatik</span>
              </button>
              {layouts.map(l => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLayout(l.id)}
                  className={`p-2 border rounded-xl text-center transition ${
                    selectedLayout === l.id
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xs font-medium">{l.nameTr}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Katman Sıralaması — sadece Exploded View stili seçilince */}
        {selectedStyle.includes("exploded") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Katman Sıralaması <span className="text-xs text-gray-400">(alttan üste, her satır bir katman)</span>
            </label>
            <textarea
              value={explodedLayers}
              onChange={e => setExplodedLayers(e.target.value)}
              placeholder={"Kroasan kase (alt)\nKaşar peynir\nOmlet\nFüme et\nMaydanoz (üst)"}
              rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">Her satır bir katman. En alttaki malzeme ilk satır, en üstteki son satır.</p>
          </div>
        )}

        {/* Metin Alanları */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Başlık <span className="text-gray-400">(boşsa AI önerir)</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Taze Kruvasan" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Alt Başlık <span className="text-gray-400">(boşsa AI önerir)</span></label>
            <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="El yapımı, tereyağlı" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fiyat <span className="text-gray-400">(opsiyonel)</span></label>
            <input type="text" value={price} onChange={e => setPrice(e.target.value)} placeholder="₺85" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ek Notlar <span className="text-gray-400">(opsiyonel)</span></label>
            <input type="text" value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} placeholder="Bahar temalı..." className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Negatif Prompt */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Negatif Prompt <span className="text-gray-400">(istemediğin öğeler — opsiyonel)</span>
          </label>
          <input
            type="text"
            value={negativePrompt}
            onChange={e => setNegativePrompt(e.target.value)}
            placeholder="blurry, text overlay, watermark, distorted..."
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-[10px] text-gray-400 mt-1">Midjourney'de --no prefix otomatik eklenir</p>
        </div>

        {/* Prompt Üret */}
        <PromptGenerator
          productImageBase64={productImageBase64}
          productMimeType={productMimeType}
          styleId={selectedStyle}
          moodId={selectedMood}
          aspectRatioId={selectedRatio}
          typographyId={selectedTitleTypography || undefined}
          subtitleTypographyId={selectedSubtitleTypography || undefined}
          layoutId={selectedLayout || undefined}
          title={title}
          subtitle={subtitle}
          price={price}
          additionalNotes={combinedAdditionalNotes}
          referenceImageBase64={referenceImageBase64}
          referenceImageMimeType={referenceImageMimeType}
          cameraAngleId={selectedCameraAngle || undefined}
          lightingTypeId={selectedLightingType || undefined}
          backgroundId={selectedBackground || undefined}
          negativePrompt={negativePrompt || undefined}
        />
      </div>
    </div>
  );
}

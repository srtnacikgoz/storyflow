# Tema Setting Katmanı - Uygulama Planı

**Tarih:** 2026-02-06
**Durum:** Onay Bekliyor
**Öncelik:** Yüksek

---

## Problem

Gemini ürettiği görsellerde dış alan ve pencere perspektifini yanlış yapıyor. Mevcut "NO high-rise views" gibi negatif kısıtlamalar etkisiz çünkü:

> **Gemini Insight:** "Bıçak ekleme" DEĞİL → "Sadece çatal ekle"
> AI olumsuzlama kavramını işlemekte zorlanır

## Çözüm

Theme'e **pozitif sahne tanımlamaları** içeren `setting` alanı ekle.

---

## 1. Type Tanımları (types.ts)

```typescript
/**
 * Tema mekan ayarları - Pozitif sahne tanımlamaları
 * Gemini'ye "ne yapma" yerine "tam olarak ne yap" söyler
 */
export interface ThemeSetting {
  /**
   * Mekan tipi
   * - indoor: İç mekan (pencere yok veya görünmüyor)
   * - indoor-window: İç mekan, pencereden dışarısı görünüyor
   * - outdoor-terrace: Dış mekan, teras/bahçe
   */
  locationType: "indoor" | "indoor-window" | "outdoor-terrace";

  /**
   * Pencere manzarası (sadece indoor-window için)
   * Pozitif, detaylı tanımlama
   * Örnek: "Cobblestone sidewalk with parked bicycles and morning pedestrians"
   */
  windowView?: string;

  /**
   * Hava durumu / Işık
   * Örnek: "Soft overcast daylight" | "Bright morning sunshine" | "Rainy day, droplets on window"
   */
  weather?: string;

  /**
   * Dış mekan tanımı (sadece outdoor-terrace için)
   * Örnek: "Sunny café terrace with potted plants and wrought iron furniture"
   */
  outdoorScene?: string;

  /**
   * Genel atmosfer (Gemini'nin sevdiği format)
   * Örnek: "Cozy morning coffee moment, intimate and warm"
   */
  atmosphere?: string;

  /**
   * Sabitlenmiş masa asset'i (bu tema hep bu masayı kullansın)
   * Asset ID referansı
   */
  pinnedTableId?: string;
}

// Theme interface güncelleme
export interface Theme {
  id: string;
  name: string;
  description?: string;
  scenarios: string[];
  petAllowed: boolean;
  accessoryAllowed: boolean;

  // YENİ: Sahne ayarları
  setting?: ThemeSetting;

  // YENİ: Tercih edilen asset tag'leri (Rule Engine bonus)
  preferredTags?: {
    table?: string[];  // ["dışarısı", "cam önü", "pencere"]
    plate?: string[];
    cup?: string[];
  };

  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
}
```

---

## 2. Prompt Builder Entegrasyonu (geminiPromptBuilder.ts)

Mevcut negatif `ENVIRONMENT CONSTRAINTS` yerine pozitif `SCENE SETTING` bloğu:

```typescript
// Theme setting varsa pozitif sahne tanımı oluştur
function buildSceneSetting(setting: ThemeSetting): string[] {
  const lines: string[] = ["SCENE SETTING:"];

  if (setting.locationType === "indoor-window") {
    lines.push(`- Indoor café with large street-facing window`);
    if (setting.windowView) {
      lines.push(`- View through window: ${setting.windowView}`);
    }
  } else if (setting.locationType === "outdoor-terrace") {
    if (setting.outdoorScene) {
      lines.push(`- ${setting.outdoorScene}`);
    } else {
      lines.push(`- Outdoor café terrace setting`);
    }
  } else {
    lines.push(`- Cozy indoor café setting`);
  }

  if (setting.weather) {
    lines.push(`- ${setting.weather}`);
  }

  if (setting.atmosphere) {
    lines.push(`- ${setting.atmosphere}`);
  }

  return lines;
}
```

**Prompt'ta konumu:** ATMOSPHERE bölümünden hemen sonra, ASSET CONSTRAINTS'ten önce.

---

## 3. Asset Seçimi Entegrasyonu (orchestrator.ts)

### 3.1 Pinned Table
```typescript
// Tema'da pinnedTableId varsa Rule Engine'i bypass et
if (themeData?.setting?.pinnedTableId) {
  const pinnedTable = await loadAssetById(themeData.setting.pinnedTableId);
  if (pinnedTable) {
    selectedTable = pinnedTable;
    console.log(`[Orchestrator] Pinned table used: ${pinnedTable.name}`);
  }
}
```

### 3.2 Preferred Tags (Bonus Skor)
```typescript
// Rule Engine'de tema preferredTags bonus skoru
if (themeData?.preferredTags?.table) {
  const bonusTags = themeData.preferredTags.table;
  // Asset'in tag'leri ile kesişim varsa +15 bonus
  const matchCount = asset.tags.filter(t => bonusTags.includes(t)).length;
  score += matchCount * 15;
}
```

---

## 4. Admin Panel - Tema Formu (Themes.tsx)

Yeni bölüm: **Sahne Ayarları**

```
┌─────────────────────────────────────────────┐
│ Tema Düzenle: Cam Önü Sabah                 │
├─────────────────────────────────────────────┤
│                                             │
│ ─── Temel Bilgiler ─────────────────────    │
│ Ad:          [Cam Önü Sabah           ]     │
│ Senaryolar:  [▼ cam-kenari, zarif-tutma]    │
│                                             │
│ ─── Sahne Ayarları (YENİ) ──────────────    │
│                                             │
│ Mekan Tipi:                                 │
│   (○) İç Mekan (pencere yok)               │
│   (●) İç Mekan + Pencere Manzarası         │
│   (○) Dış Mekan / Teras                    │
│                                             │
│ Pencere Manzarası:                          │
│   [Cobblestone sidewalk with parked____]    │
│   [bicycles and morning pedestrians___]     │
│   Örnek: "Tree-lined street with cafés"     │
│                                             │
│ Hava / Işık:                                │
│   [▼ Yumuşak bulutlu gün ışığı       ]     │
│   Seçenekler:                               │
│   - Parlak sabah güneşi                     │
│   - Yumuşak bulutlu gün ışığı               │
│   - Yağmurlu gün, camdaki damlalar          │
│   - Altın saat sıcak ışığı                  │
│                                             │
│ Atmosfer:                                   │
│   [Intimate morning coffee moment, ___]     │
│   [cozy and peaceful________________]       │
│                                             │
│ ─── Sabit Masa ─────────────────────────    │
│                                             │
│ Bu tema için sabit masa:                    │
│   [▼ Mermer cam önü masa (ID: abc123)]     │
│   ℹ️ Seçilirse her zaman bu masa kullanılır │
│                                             │
│ ─── İzinler ────────────────────────────    │
│                                             │
│ [✓] Evcil hayvan izni                       │
│ [✓] Aksesuar izni                           │
│                                             │
│           [İptal]  [Kaydet]                 │
└─────────────────────────────────────────────┘
```

---

## 5. Varsayılan Weather Seçenekleri

```typescript
export const WEATHER_PRESETS = [
  {
    id: "bright-morning",
    label: "Parlak Sabah Güneşi",
    prompt: "Bright morning sunshine streaming through window, sharp shadows"
  },
  {
    id: "soft-overcast",
    label: "Yumuşak Bulutlu Gün",
    prompt: "Soft overcast daylight, diffused and even lighting, gray-white sky"
  },
  {
    id: "rainy-day",
    label: "Yağmurlu Gün",
    prompt: "Rainy day with water droplets on window glass, moody overcast light"
  },
  {
    id: "golden-hour",
    label: "Altın Saat",
    prompt: "Warm golden hour sunlight, long soft shadows, orange-pink tones"
  },
  {
    id: "cloudy-afternoon",
    label: "Bulutlu Öğleden Sonra",
    prompt: "Cloudy afternoon light, neutral diffused illumination"
  }
];
```

---

## 6. Uygulama Sırası

| Adım | Dosya | Ne Yapılacak | Zorluk |
|------|-------|--------------|--------|
| 1 | `types.ts` | `ThemeSetting` interface + `Theme` güncelleme | Kolay |
| 2 | `types.ts` | `WEATHER_PRESETS` sabit tanımları | Kolay |
| 3 | `geminiPromptBuilder.ts` | `buildSceneSetting()` fonksiyonu + prompt entegrasyonu | Orta |
| 4 | `orchestrator.ts` | Pinned table bypass + preferred tags bonus | Orta |
| 5 | `admin/types/index.ts` | Frontend type güncellemeleri | Kolay |
| 6 | `admin/pages/Themes.tsx` | Sahne ayarları formu | Orta |
| 7 | `admin/services/api.ts` | Gerekirse yeni endpoint | Kolay |
| 8 | Test | "Cam önü sabah" teması ile görsel üret | - |

---

## 7. Örnek Tema: Cam Önü Sabah

```json
{
  "id": "cam-onu-sabah",
  "name": "Cam Önü Sabah",
  "description": "Pencere kenarında sabah kahvaltısı atmosferi",
  "scenarios": ["cam-kenari", "zarif-tutma", "ilk-dilim"],
  "petAllowed": false,
  "accessoryAllowed": false,
  "setting": {
    "locationType": "indoor-window",
    "windowView": "Cobblestone sidewalk with parked bicycles, morning pedestrians, and tree-lined street",
    "weather": "Soft overcast daylight filtering through large window, even diffused illumination",
    "atmosphere": "Intimate morning coffee moment, peaceful and contemplative"
  },
  "preferredTags": {
    "table": ["dışarısı", "cam önü", "pencere", "mermer"]
  }
}
```

**Üretilecek prompt bloğu:**
```
SCENE SETTING:
- Indoor café with large street-facing window
- View through window: Cobblestone sidewalk with parked bicycles, morning pedestrians, and tree-lined street
- Soft overcast daylight filtering through large window, even diffused illumination
- Intimate morning coffee moment, peaceful and contemplative
```

---

## 8. Başarı Kriterleri

1. ✅ "Cam önü" teması seçildiğinde pencere manzarası doğru olmalı
2. ✅ Zemin kat perspektifi korunmalı (sokak seviyesi)
3. ✅ Hava durumu seçimine göre ışık değişmeli
4. ✅ Pinned table seçiliyse her zaman o masa kullanılmalı
5. ✅ preferredTags'li masalar öncelikli seçilmeli
6. ✅ Mevcut temalar geriye uyumlu çalışmalı (setting opsiyonel)

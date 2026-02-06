# Tema Katmanı V2 - Uygulama Planı

**Tarih:** 2026-02-06
**Durum:** Onay Bekliyor
**Referans:** `.claude/references/GORSEL-URETIM-FELSEFESI.md`

---

## Özet

Tema'ya `setting` alanı eklenerek:
1. Asset seçiminde tag bazlı tercih (preferredTags)
2. Sabit masa seçeneği (pinnedTableId)
3. Hava/ışık/atmosfer ayarları (Gemini'ye gidecek)

---

## 1. Type Tanımları

### functions/src/orchestrator/types.ts

```typescript
/**
 * Hava durumu preset'leri
 */
export const WEATHER_PRESETS = [
  {
    id: "bright-sunny",
    labelTr: "Parlak Güneşli",
    prompt: "Bright sunshine, warm natural light with defined shadows"
  },
  {
    id: "soft-overcast",
    labelTr: "Yumuşak Bulutlu",
    prompt: "Soft overcast daylight, diffused even illumination, no harsh shadows"
  },
  {
    id: "rainy",
    labelTr: "Yağmurlu",
    prompt: "Rainy day atmosphere, water droplets visible on glass, moody diffused light"
  },
  {
    id: "golden-hour",
    labelTr: "Altın Saat",
    prompt: "Golden hour warm light, long soft shadows, orange-amber tones"
  },
  {
    id: "cloudy-neutral",
    labelTr: "Bulutlu Nötr",
    prompt: "Cloudy day, neutral balanced light, soft shadows"
  }
] as const;

export type WeatherPresetId = typeof WEATHER_PRESETS[number]["id"];

/**
 * Tema sahne ayarları
 */
export interface ThemeSetting {
  /**
   * Tercih edilen asset tag'leri (Türkçe)
   * Rule Engine'de bonus skor için kullanılır
   */
  preferredTags?: {
    table?: string[];   // ["cam önü", "dışarısı", "pencere"]
    plate?: string[];   // ["modern", "minimal"]
    cup?: string[];     // ["şeffaf", "porselen"]
  };

  /**
   * Sabitlenmiş masa (Asset ID)
   * Seçilirse Rule Engine bypass edilir, her zaman bu masa kullanılır
   */
  pinnedTableId?: string;

  /**
   * Hava durumu preset ID
   * WEATHER_PRESETS'ten seçilir
   */
  weatherPreset?: WeatherPresetId;

  /**
   * Özel hava/ışık tanımı (preset yerine veya ek olarak)
   * İngilizce, Gemini'ye gider
   */
  customLighting?: string;

  /**
   * Atmosfer tanımı
   * İngilizce, Gemini'ye gider
   * Örnek: "Peaceful morning coffee moment, intimate and cozy"
   */
  atmosphere?: string;
}

/**
 * Tema tanımı (güncellenmiş)
 */
export interface Theme {
  id: string;
  name: string;
  description?: string;
  scenarios: string[];
  petAllowed: boolean;
  accessoryAllowed: boolean;

  // YENİ: Sahne ayarları
  setting?: ThemeSetting;

  // Metadata
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
}
```

---

## 2. Prompt Builder Entegrasyonu

### functions/src/orchestrator/geminiPromptBuilder.ts

```typescript
import { WEATHER_PRESETS, ThemeSetting } from "./types";

/**
 * Tema setting'inden SCENE SETTING bloğu oluşturur
 * Pozitif tanımlamalar - "ne yap" formatında
 */
function buildSceneSettingFromTheme(setting: ThemeSetting): string[] {
  const lines: string[] = [];

  // Hava/Işık
  if (setting.weatherPreset) {
    const preset = WEATHER_PRESETS.find(p => p.id === setting.weatherPreset);
    if (preset) {
      lines.push(preset.prompt);
    }
  }

  // Özel ışık tanımı
  if (setting.customLighting) {
    lines.push(setting.customLighting);
  }

  // Atmosfer
  if (setting.atmosphere) {
    lines.push(setting.atmosphere);
  }

  if (lines.length === 0) return [];

  return [
    "SCENE SETTING:",
    ...lines.map(l => `- ${l}`),
    ""
  ];
}
```

**Entegrasyon noktası:** `buildGeminiPrompt()` fonksiyonunda, ATMOSPHERE bölümünden sonra.

---

## 3. Orchestrator Entegrasyonu

### functions/src/orchestrator/orchestrator.ts

#### 3.1 Pinned Table Bypass

```typescript
// Masa seçimi - Tema'da pinnedTableId varsa bypass
let selectedTable: Asset | null = null;

if (themeData?.setting?.pinnedTableId) {
  // Direkt pinned table'ı yükle
  const pinnedDoc = await this.db.collection("assets").doc(themeData.setting.pinnedTableId).get();
  if (pinnedDoc.exists) {
    selectedTable = { id: pinnedDoc.id, ...pinnedDoc.data() } as Asset;
    console.log(`[Orchestrator] 📌 Pinned table used: ${selectedTable.name}`);
  }
}

if (!selectedTable) {
  // Normal Rule Engine akışı (preferredTags bonus ile)
  selectedTable = await this.selectTable(context, themeData?.setting?.preferredTags?.table);
}
```

#### 3.2 Preferred Tags Bonus

```typescript
// selectAsset fonksiyonunda (veya Rule Engine scorer'da)
function calculateScore(asset: Asset, preferredTags?: string[]): number {
  let score = baseScore; // usageCount vs.

  if (preferredTags && asset.tags) {
    const matchCount = asset.tags.filter(t => preferredTags.includes(t)).length;
    score += matchCount * 15; // Her eşleşen tag +15 bonus
  }

  return score;
}
```

---

## 4. Admin Panel

### admin/src/types/index.ts

```typescript
export const WEATHER_PRESETS = [
  { id: "bright-sunny", labelTr: "Parlak Güneşli" },
  { id: "soft-overcast", labelTr: "Yumuşak Bulutlu" },
  { id: "rainy", labelTr: "Yağmurlu" },
  { id: "golden-hour", labelTr: "Altın Saat" },
  { id: "cloudy-neutral", labelTr: "Bulutlu Nötr" },
] as const;

export interface ThemeSetting {
  preferredTags?: {
    table?: string[];
    plate?: string[];
    cup?: string[];
  };
  pinnedTableId?: string;
  weatherPreset?: string;
  customLighting?: string;
  atmosphere?: string;
}

export interface Theme {
  id: string;
  name: string;
  description?: string;
  scenarios: string[];
  petAllowed: boolean;
  accessoryAllowed: boolean;
  setting?: ThemeSetting;
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
}
```

### admin/src/pages/Themes.tsx - Yeni Bölüm

```
┌─────────────────────────────────────────────────┐
│ ─── Sahne Ayarları ─────────────────────────    │
│                                                 │
│ Masa Tercihi (tag'ler):                         │
│ [cam önü, dışarısı, pencere_________] [+ Ekle]  │
│ ℹ️ Bu tag'lere sahip masalar öncelikli seçilir  │
│                                                 │
│ Sabit Masa:                                     │
│ [▼ Seçiniz (opsiyonel)________________]        │
│    - Mermer cam önü masa (abc123)               │
│    - Ahşap bahçe masası (def456)                │
│ ℹ️ Seçilirse her zaman bu masa kullanılır       │
│                                                 │
│ Hava Durumu:                                    │
│ [▼ Parlak Güneşli___________________]          │
│    - Parlak Güneşli                             │
│    - Yumuşak Bulutlu                            │
│    - Yağmurlu                                   │
│    - Altın Saat                                 │
│    - Bulutlu Nötr                               │
│                                                 │
│ Özel Işık (opsiyonel):                          │
│ [Warm side lighting from window_____]           │
│ ℹ️ İngilizce, Gemini'ye gider                   │
│                                                 │
│ Atmosfer:                                       │
│ [Peaceful morning coffee moment_____]           │
│ ℹ️ İngilizce, Gemini'ye gider                   │
└─────────────────────────────────────────────────┘
```

---

## 5. Uygulama Sırası

| # | Dosya | Değişiklik | Bağımlılık |
|---|-------|------------|------------|
| 1 | `functions/src/orchestrator/types.ts` | WEATHER_PRESETS, ThemeSetting, Theme güncelle | - |
| 2 | `functions/src/orchestrator/geminiPromptBuilder.ts` | buildSceneSettingFromTheme() + entegrasyon | 1 |
| 3 | `functions/src/orchestrator/orchestrator.ts` | pinnedTable bypass + preferredTags bonus | 1 |
| 4 | `admin/src/types/index.ts` | Frontend type'ları | 1 |
| 5 | `admin/src/pages/Themes.tsx` | Sahne ayarları formu | 4 |
| 6 | Build + Deploy | `npm run build && firebase deploy` | 1-5 |
| 7 | Test | "Cam önü" teması oluştur, görsel üret | 6 |

---

## 6. Örnek Tema

```json
{
  "id": "cam-onu-sabah",
  "name": "Cam Önü Sabah",
  "description": "Pencere kenarında huzurlu sabah kahvaltısı",
  "scenarios": ["cam-kenari", "zarif-tutma", "ilk-dilim"],
  "petAllowed": false,
  "accessoryAllowed": false,
  "setting": {
    "preferredTags": {
      "table": ["cam önü", "dışarısı", "pencere", "sokak manzarası"]
    },
    "weatherPreset": "soft-overcast",
    "atmosphere": "Peaceful morning coffee moment, intimate and contemplative"
  }
}
```

**Sonuç:**
- Masa: "cam önü" tag'li masa fotoğrafı seçilir (sokak manzarası dahil)
- Prompt'a eklenir: "Soft overcast daylight, diffused even illumination" + "Peaceful morning coffee moment"
- Gemini: Fotoğraftaki ortamı kullanır, sadece bulutlu gün ışığı ekler

---

## 7. Geriye Uyumluluk

- `setting` alanı **opsiyonel** - mevcut temalar aynen çalışmaya devam eder
- `setting` yoksa mevcut business context davranışı korunur
- Varsayılan temalara setting eklemek opsiyonel

---

## 8. Başarı Kriterleri

1. ✅ "Cam önü" tag'li masa seçildiğinde fotoğraftaki sokak manzarası korunur
2. ✅ Hava durumu preset'e göre ışık değişir (güneşli vs bulutlu)
3. ✅ pinnedTableId seçiliyse her zaman o masa kullanılır
4. ✅ preferredTags eşleşen masalar öncelikli seçilir
5. ✅ Mevcut temalar geriye uyumlu çalışır
6. ✅ Admin panelde tema düzenlenebilir

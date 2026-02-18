# Tema Veri Modeli Araştırması

> **Dosyalar:** `functions/src/orchestrator/types.ts`, `admin/src/types/index.ts`
> **Tarih:** 2026-02-11

---

## 1. Backend Theme Interface (types.ts:1100-1116)

```typescript
export interface Theme {
  id: string;           // "morning-energy"
  name: string;         // "Sabah Enerjisi"
  description?: string; // "Enerjik sabah paylaşımları için"
  scenarios: string[];  // ["cam-kenari"] — Array ama UI tekil kullanıyor
  petAllowed: boolean;
  accessoryAllowed: boolean;
  accessoryOptions?: string[];  // ["kitap", "telefon"]
  setting?: ThemeSetting;       // v3.1 sahne ayarları
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
}
```

## 2. ThemeSetting Interface (admin types:619-628)

```typescript
export interface ThemeSetting {
  preferredTags?: {
    table?: string[];
    plate?: string[];
    cup?: string[];
  };
  weatherPreset?: WeatherPresetId;
  lightingPreset?: LightingPresetId;
  atmospherePreset?: AtmospherePresetId;
}
```

---

## 3. Preset Değerleri

### Weather Presets
| ID | Türkçe Label |
|----|-------------|
| bright-sunny | Güneşli Parlak |
| soft-overcast | Yumuşak Bulutlu |
| rainy | Yağmurlu |
| golden-hour | Altın Saat |
| cloudy-neutral | Bulutlu Nötr |

### Lighting Presets
| ID | Türkçe Label |
|----|-------------|
| window-warm | Pencere Sıcak Işık |
| soft-diffused | Yumuşak Dağınık |
| dramatic-side | Dramatik Yan Işık |
| backlit-glow | Arkadan Aydınlatma |
| morning-bright | Sabah Parlak |
| candle-warm | Mum Işığı Sıcaklığı |

### Atmosphere Presets
| ID | Türkçe Label |
|----|-------------|
| peaceful-morning | Huzurlu Sabah |
| energetic-brunch | Enerjik Brunch |
| cozy-evening | Samimi Akşam |
| elegant-minimal | Zarif Minimal |
| casual-relaxed | Rahat Günlük |
| romantic-dreamy | Romantik Rüya |
| festive-celebration | Kutlama Havası |

---

## 4. Field Uyumsuzlukları

| Backend Field | UI Davranışı | Sorun |
|---|---|---|
| `scenarios: string[]` | Tekil select → `[form.scenario]` sarılıyor | Array ama tek eleman. Veri modeli çoklu, UI kısıtlamış |

---

## 5. DEFAULT_THEMES (types.ts:1121-1164)

5 hardcoded default tema:

| ID | Adı | Senaryolar | Pet | Aksesuar | Setting |
|----|-----|-----------|-----|----------|---------|
| morning-energy | Sabah Enerjisi | cam-kenari, zarif-tutma, ilk-dilim | Hayır | Hayır | YOK |
| brunch-social | Brunch Keyfi | kahve-ani, paylasim | Hayır | Evet | YOK |
| afternoon-chill | Öğleden Sonra Rahatlığı | kahve-kosesi, yarim-kaldi | Evet | Evet | YOK |
| golden-hour | Altın Saat | cam-kenari, hediye-acilisi | Hayır | Hayır | YOK |
| cozy-night | Gece Samimiyeti | kahve-kosesi, yarim-kaldi | Evet | Evet | YOK |

**Sorun:** Hiçbir default temada `setting` alanı yok — weatherPreset, lightingPreset, atmospherePreset tanımlı değil.

---

## 6. Dead/Zombie Fields

Tema interface'inde OLMAYAN ama orchestrator'da hâlâ referans edilen field'lar:

| Field | Interface'de | Orchestrator'da | Satır |
|-------|-------------|----------------|-------|
| `mood` | YOK (v3.0'da kaldırıldı) | `themeData?.mood` okunuyor | orchestrator.ts:271 |
| `styleId` | YOK | `themeData?.styleId` okunuyor | orchestrator.ts:310 |
| `colors` | YOK | `themeData?.colors` loglanıyor | orchestrator.ts:333 |

Bu field'lar Firestore'daki eski dokümanlarda kalıntı olarak mevcut olabilir. Orchestrator onları okuyor ama yeni tema oluşturulduğunda bu field'lar yazılmıyor.

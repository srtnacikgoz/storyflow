# Mood / Senaryo / Tema Uyum Analizi

> **Tarih:** 2026-02-02
> **Durum:** Kritik çakışmalar tespit edildi
> **Sonuç:** Prompt'a 3 katmanlı çakışan talimatlar enjekte ediliyor

---

## 📊 Kavram Tanımları

### 1. MOOD (Ruh Hali)
**Firestore:** `moods` collection

| Alan | Tip | Açıklama |
|------|-----|----------|
| timeOfDay | enum | morning/afternoon/evening/night/any |
| season | enum | winter/spring/summer/autumn/any |
| weather | enum | sunny/cloudy/rainy/snowy/any |
| lightingPrompt | string | "soft window light, overcast shadows" |
| colorGradePrompt | string | "cool blue tones, desaturated" |
| geminiPresetId | string? | Gemini preset eşleştirmesi (yeni eklendi) |

**Amaç:** Atmosfer, ışık, renk ve hava durumu tanımlar.

---

### 2. SCENARIO (Senaryo)
**Firestore:** `scenarios` collection

| Alan | Tip | Açıklama |
|------|-----|----------|
| name | string | "Zarif Tutma", "Kahve Anı" |
| description | string | Ortam/mekan açıklaması |
| includesHands | boolean | El içeriyor mu? |
| handPose | string? | El pozu (cupping, pinching) |
| compositionEntry | string? | Kompozisyon giriş noktası |
| mood | string? | **DEPRECATED** - Tema'dan devralınıyor |

**Amaç:** Fiziksel kompozisyon ve poz tanımlar.

---

### 3. THEME (Tema)
**Firestore:** `themes` collection

| Alan | Tip | Açıklama |
|------|-----|----------|
| name | string | "Sabah Enerjisi", "Brunch Keyfi" |
| description | string? | Tema açıklaması |
| scenarios | string[] | Kullanılabilir senaryo ID'leri |
| mood | string | Mood document ID referansı |
| petAllowed | boolean | Köpek dahil edilebilir mi? |
| accessoryAllowed | boolean | Aksesuar dahil edilebilir mi? |

**Amaç:** Senaryoları gruplar ve mood ile bağlar.

---

## 🔄 Hiyerarşi ve İlişki

```
TEMA
 ├── mood (referans) ──────────► MOOD
 │                                ├── timeOfDay
 │                                ├── season
 │                                ├── weather
 │                                ├── lightingPrompt
 │                                ├── colorGradePrompt
 │                                └── geminiPresetId ──► GEMINI PRESET
 │                                                        ├── geminiAtmosphere
 │                                                        ├── lighting
 │                                                        └── colorPalette
 │
 └── scenarios[] ──────────────► SENARYO[]
                                  ├── description
                                  ├── handPose
                                  ├── compositionEntry
                                  └── mood (DEPRECATED!)
```

---

## 🔴 ÇAKIŞMA ANALİZİ

### 1. AÇIKLAMA / ORTAM (3 Katman!)

Prompt'a **3 farklı açıklama** enjekte ediliyor:

| # | Bölüm | Kaynak | Örnek |
|---|-------|--------|-------|
| 1 | SCENARIO CONTEXT | Scenario.description | "El ile zarif tutma, romantik kahve anı" |
| 2 | THEME CONTEXT | Theme.description | "Enerjik sabah paylaşımları için" |
| 3 | MOOD CONTEXT | Mood.description | "Kış sabahı, yağmurlu cafe atmosferi" |

**Çelişki Örneği:**
- Senaryo: "romantik kahve anı" (akşam havası)
- Tema: "enerjik sabah" (sabah havası)
- Mood: "yağmurlu cafe" (kapalı hava)

Gemini hangisine uyacak?

---

### 2. IŞIK (3 Katman! 🔴 KRİTİK)

| # | Bölüm | Kaynak | Kod Satırı |
|---|-------|--------|------------|
| 1 | LIGHTING | GeminiPreset.lighting veya Mood'tan fallback | geminiPromptBuilder.ts:700-712 |
| 2 | MOOD LIGHTING | Mood.lightingPrompt | orchestrator.ts:2128-2130 |
| 3 | WEATHER OVERRIDE | Mood.weather | orchestrator.ts:2040-2047 |

**Çelişki Örneği:**
```
LIGHTING: Soft diffused natural light, gentle shadows
MOOD LIGHTING: warm tungsten accent, dramatic side lighting
WEATHER OVERRIDE: soft, diffused, flat lighting. No direct sunlight.
```

Aynı prompt'ta 3 farklı ışık talimatı!

---

### 3. RENK (2 Katman)

| # | Bölüm | Kaynak | Kod Satırı |
|---|-------|--------|------------|
| 1 | Color palette | GeminiPreset.colorPalette | geminiPromptBuilder.ts:692 |
| 2 | COLOR GRADE | Mood.colorGradePrompt | orchestrator.ts:2132-2134 |

**Çelişki Örneği:**
```
Color palette: white, cream, light wood, pastel
COLOR GRADE: cool blue tones, desaturated, high contrast
```

---

### 4. ATMOSFER (2 Katman)

| # | Bölüm | Kaynak |
|---|-------|--------|
| 1 | ATMOSPHERE | GeminiPreset.geminiAtmosphere |
| 2 | MOOD CONTEXT | Mood.description |

İkisi de "atmosfer" tanımlıyor ama farklı formatlar.

---

### 5. ZAMAN (2 Katman)

| # | Kullanım | Kaynak |
|---|----------|--------|
| 1 | buildGeminiPrompt param | timeOfDay parametresi |
| 2 | TIME OF DAY enjeksiyon | Mood.timeOfDay |

---

## 📋 Prompt Enjeksiyon Sırası

Final prompt şu sırayla oluşuyor:

```
1. SCENARIO CONTEXT: ${scenarioDescription}          ← Senaryo

2. [buildGeminiPrompt çıktısı]
   - "Using uploaded image as reference..."
   - ATMOSPHERE: ${geminiPreset.geminiAtmosphere}    ← Gemini Preset
   - Color palette: ${geminiPreset.colorPalette}     ← Gemini Preset
   - LIGHTING: ${lighting.geminiPrompt}              ← Gemini Preset veya Mood
   - HANDS: ${handPose.geminiPrompt}                 ← Senaryodan
   - PRODUCT TEXTURE: ...
   - ASSET CONSTRAINTS: ...                          ← Yeni eklendi
   - STYLE GUIDANCE: ...                             ← Business Context
   - RULES: ...
   - FORMAT: ...

3. WEATHER OVERRIDE: ...                             ← Mood.weather

4. THEME CONTEXT: ${themeDescription}                ← Tema

5. MOOD CONTEXT: ${moodDescription}                  ← Mood

6. TIME OF DAY: ${timeOfDayDesc}                     ← Mood.timeOfDay

7. SEASON: ${seasonDesc}                             ← Mood.season

8. MOOD LIGHTING: ${lightingPrompt}                  ← Mood.lightingPrompt (İKİNCİ KEZ IŞIK!)

9. COLOR GRADE: ${colorGradePrompt}                  ← Mood.colorGradePrompt (İKİNCİ KEZ RENK!)
```

---

## 🎯 Sorunların Özeti

| # | Sorun | Ciddiyet | Etki |
|---|-------|----------|------|
| 1 | 3 açıklama context'i | 🔴 Kritik | Gemini ne yapacağını bilemez |
| 2 | 3 ışık talimatı | 🔴 Kritik | Işık tutarsızlığı |
| 3 | 2 renk talimatı | 🟠 Yüksek | Renk tutarsızlığı |
| 4 | 2 atmosfer talimatı | 🟠 Yüksek | Atmosfer tutarsızlığı |
| 5 | Öncelik belirsiz | 🔴 Kritik | Çelişki durumunda ne olacağı belirsiz |
| 6 | Scenario.mood deprecated | 🟡 Orta | Kod temizliği gerekli |

---

## 💡 Çözüm Önerileri

### A. Katmanları Birleştir (Radikal)
- SCENARIO/THEME/MOOD CONTEXT → Tek bir CONTEXT bölümü
- Işık talimatlarını tek noktada topla
- Renk talimatlarını tek noktada topla

### B. Öncelik Sırası Belirle
```
1. WEATHER OVERRIDE (en yüksek öncelik - çelişirse bu geçerli)
2. LIGHTING (Gemini Preset) > MOOD LIGHTING (fallback)
3. SCENARIO CONTEXT > THEME CONTEXT > MOOD CONTEXT
```

### C. Çelişki Notu Ekle
Her bölüme "If this conflicts with X, prioritize Y" notu ekle.

### D. Mood'u Tek Kaynak Yap
- Mood zaten tüm bilgiyi içeriyor
- THEME/SCENARIO sadece Mood referansı tutsun
- Orchestrator sadece Mood'tan değer çeksin

---

## 🔍 İlişkili Dosyalar

| Dosya | Satırlar | İçerik |
|-------|----------|--------|
| orchestrator/types.ts | 144-167 | Mood interface |
| orchestrator/types.ts | 520-541 | Scenario interface |
| orchestrator/types.ts | 908-921 | Theme interface |
| orchestrator/orchestrator.ts | 2000-2150 | Prompt enjeksiyonları |
| orchestrator/geminiPromptBuilder.ts | 680-800 | Temel prompt oluşturma |

---

## 📝 Aksiyon Önerileri

1. **Hemen:** Işık enjeksiyonunu tek noktaya taşı
2. **Kısa Vadeli:** Context bölümlerini birleştir
3. **Orta Vadeli:** Mood-Tema-Senaryo hiyerarşisini yeniden tasarla
4. **Uzun Vadeli:** Tek kaynak ilkesi (Single Source of Truth) uygula

---

**Son Güncelleme:** 2026-02-02

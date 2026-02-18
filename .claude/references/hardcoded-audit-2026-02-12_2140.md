# HARDCODED AUDIT RAPORU

> **Tarih:** 12 Şubat 2026 - 21:40
> **Kapsam:** Tüm proje (functions + admin)
> **Yöntem:** 8 paralel araştırma agenti
> **Toplam Bulgu:** 90+

---

## EXECUTIVE SUMMARY

Proje dinamik kategori sistemi (`DynamicCategory`, `SlotDefinition`) kullanıyor ama TypeScript type'ları, interface field'ları, UI sabitleri ve config constant'ları hâlâ **hardcoded**. Yeni kategori/slot/ürün tipi eklendiğinde birçok dosyada manuel değişiklik gerekiyor.

**En kritik sorun:** `AssetSelection` interface'i sabit field'lere sahip (`table`, `plate`, `cup`). Slot sistemi dinamik ama bu interface değil — yeni slot = kod değişikliği.

---

## BÖLÜM 1: KRİTİK (Yeni Kategori/Slot Eklenince Bozulur)

### 1.1 AssetSelection Interface — Sabit Field'ler
| Dosya | Satır | Detay |
|-------|-------|-------|
| `functions/src/orchestrator/types.ts` | AssetSelection interface | `product`, `plate?`, `cup?`, `table?` — sabit field'ler. Dinamik slot desteği yok |
| `admin/src/pages/OrchestratorDashboard.tsx` | Birden fazla | `assetSelection.table`, `.plate`, `.cup` direkt erişim |
| `functions/src/controllers/orchestrator/pipelineController.ts` | 415-428 | `fieldName as "table" \| "plate" \| "cup"` hardcoded cast |
| `functions/src/controllers/orchestrator/pipelineController.ts` | 469-471 | `tables: slotStats["surface"]`, `plates: slotStats["dish"]` backward-compat mapping |

**Çözüm:** `AssetSelection` → `Record<string, Asset>` veya named fields + `[key: string]: Asset | undefined` index signature

---

### 1.2 Union Type'lar — Yeni Değer = Build Hatası
| Dosya | Satır | Type | İçerik |
|-------|-------|------|--------|
| `functions/src/orchestrator/types.ts` | 13-27 | `AssetCategory` | 14 hardcoded kategori |
| `functions/src/orchestrator/types.ts` | 32-36 | `ProductType` | `"croissants" \| "pastas" \| "chocolates" \| "coffees"` |
| `functions/src/orchestrator/types.ts` | 41-99 | `PropType`, `FurnitureType`, `EnvironmentType`, `PetType`, `AccessoryType` | Her biri ayrı union |
| `admin/src/types/index.ts` | 351 | `AssetCategory` (DUPLICATE) | functions ile senkron değil |

**Çözüm:** Union type'ları `string` yap, runtime validation ekle. Admin types → functions types'dan import et.

---

### 1.3 Preset Constants — Kullanıcı Özelleştiremiyor
| Dosya | Satır | Sabit | Adet |
|-------|-------|-------|------|
| `functions/src/orchestrator/types.ts` | 950-1000 | `WEATHER_PRESETS` | 5 hava durumu |
| `functions/src/orchestrator/types.ts` | 1000-1030 | `LIGHTING_PRESETS` | 6 ışık preset |
| `functions/src/orchestrator/types.ts` | 1030-1061 | `ATMOSPHERE_PRESETS` | 7 atmosfer preset |

**Çözüm:** `global/config/gemini-presets/` Firestore'dan yükle (admin'den düzenlenebilir)

---

## BÖLÜM 2: YÜKSEK (Pipeline/Veri Doğruluğu Riski)

### 2.1 Beverage Rules & Tag Mappings
| Dosya | Satır | Sabit |
|-------|-------|-------|
| `functions/src/orchestrator/seed/defaultData.ts` | 62-83 | `DEFAULT_BEVERAGE_RULES` — croissants→tea, pastas→coffee vs. |
| `functions/src/orchestrator/seed/defaultData.ts` | 89-94 | `DEFAULT_BEVERAGE_TAG_MAPPINGS` — tea→["çay", "bitki çayı"...], coffee→["kahve", "espresso"...] |
| `functions/src/orchestrator/geminiPromptBuilder.ts` | 1153-1159 | `beverageLabels` — tea→"TEA (amber/golden liquid)" |

**Çözüm:** `global/config/settings/beverage-rules` ve `beverage-tag-mappings` Firestore'dan

---

### 2.2 AI Model & Pricing — Sık Değişen Değerler
| Dosya | Satır | Sabit |
|-------|-------|-------|
| `functions/src/services/usage.ts` | 8-15 | `COSTS` — DALLE_3_HD: 0.08, GEMINI_FLASH: 0.01 vs. |
| `functions/src/services/reve.ts` | 85-91 | `COSTS` — reve-edit model pricing |
| `functions/src/services/visualCriticService.ts` | 42 | `modelName = "gemini-3-pro-preview"` |
| `functions/src/services/instagram.ts` | 16 | `INSTAGRAM_API_BASE = "https://graph.facebook.com/v18.0"` |

**Çözüm:** `configService` → `system-settings` doc'tan runtime'da oku

---

### 2.3 Mood & Atmosfer Mapping'leri
| Dosya | Satır | Sabit |
|-------|-------|-------|
| `functions/src/orchestrator/orchestrator.ts` | 2353-2427 | 12 hardcoded mood (lighting, atmosphere, colorPalette) |
| `functions/src/orchestrator/orchestrator.ts` | 2213-2233 | `timeOfDayMap`, `seasonMap` |
| `functions/src/orchestrator/helpers/timeUtils.ts` | 35-43 | `moodMap` — morning→"morning-ritual" vs. |
| `functions/src/orchestrator/geminiPromptBuilder.ts` | 1237-1251 | `floorConstraints` — ground/upper/basement kuralları |

**Çözüm:** `global/config/gemini-presets/mood-definitions` Firestore'dan

---

### 2.4 Senaryo Override'lar
| Dosya | Satır | Sabit |
|-------|-------|-------|
| `functions/src/orchestrator/orchestrator.ts` | 2491-2504 | `scenarioOverrides` — "kahve-ani" → özel prompt |

**Çözüm:** Scenario document'ına `customPromptTemplate` alanı ekle

---

## BÖLÜM 3: ORTA (Çalışır Ama Esnek Değil)

### 3.1 Firestore Collection Path'leri — 15+ Dosyada Dağınık
| Koleksiyon | Dosyalar |
|-----------|---------|
| `"scheduled-slots"` | pipelineController, slotController, dashboardController |
| `"assets"` | orchestrator, pipelineController, assetController, dashboardController |
| `"themes"` | themeController, scenarioController, dashboardController |
| `"global/scenarios/items"` | scenarioController (6 kez) |
| `"pipeline-results"` | orchestrator, dashboardController |
| `"media-queue"` | queue service, orchestrator |
| `"production-history"` | configController |
| `"ai-rules"` | orchestrator |
| `"global/config/gemini-presets/*"` | geminiPromptBuilder, configController |

**Çözüm:** Merkezi `src/config/firestorePaths.ts` dosyası oluştur

---

### 3.2 Frontend Fallback Dizileri
| Dosya | Satır | Sabit | Not |
|-------|-------|-------|-----|
| `admin/src/pages/Assets.tsx` | 46-56 | `CATEGORY_LABELS_FALLBACK` (7 label) | Dinamik override var ✓ |
| `admin/src/pages/Assets.tsx` | 59-109 | `SUBTYPE_LABELS` (50+ label) | Dinamik override var ✓ |
| `admin/src/pages/Assets.tsx` | 112-128 | `SUBTYPES_BY_CATEGORY_FALLBACK` (30+ slug) | Dinamik override var ✓ |
| `admin/src/pages/Assets.tsx` | 152-160 | `FIELDS_BY_CATEGORY_FALLBACK` (7 kategori alan kuralı) | Dinamik override YOK ❌ |
| `admin/src/pages/Scenarios.tsx` | 37-43 | `WEATHER_AUTO_MAP` (5 mapping) | Dinamik YOK ❌ |
| `admin/src/pages/Scenarios.tsx` | 68-131 | Fallback diziler (el pozları, komposizyon, interior vs.) | Dinamik override var ✓ |
| `admin/src/pages/Scenarios.tsx` | 126-131 | `PRODUCT_TYPE_OPTIONS` (4 ürün + emoji) | Dinamik YOK ❌ |
| `admin/src/pages/Scenarios.tsx` | 326-364 | Filename keyword filtreleri (masa/tabak/fincan) | Dinamik YOK ❌ |

---

### 3.3 Kategori Bazlı Enum/Label Sabitleri
| Dosya | Satır | Sabit |
|-------|-------|-------|
| `functions/src/orchestrator/types.ts` | 104-115 | `ACCESSORY_TYPES` (10 aksesuar + Türkçe label + emoji) |
| `functions/src/orchestrator/types.ts` | 232-272 | `TABLE_TOP_SHAPES`, `CUP_TYPES`, `PLATE_TYPES`, `CUTLERY_TYPES` |
| `functions/src/services/analytics.ts` | 28-53 | `CATEGORY_LABELS`, `AI_MODEL_LABELS`, `STYLE_LABELS` |

---

### 3.4 Scoring & Threshold Değerleri
| Dosya | Satır | Sabit |
|-------|-------|-------|
| `functions/src/orchestrator/ruleEngine/constants.ts` | 4-20 | `DEFAULT_SCORING_WEIGHTS`, `DEFAULT_THRESHOLDS` |
| `functions/src/orchestrator/seed/defaultData.ts` | 41-52 | `DEFAULT_RULE_ENGINE_CONFIG` (aynı threshold'lar tekrar) |

---

### 3.5 Diversity Rules — Eski Field İsimleri
| Dosya | Satır | Sabit |
|-------|-------|-------|
| `functions/src/controllers/orchestrator/configController.ts` | 127-137 | `tableGap`, `plateGap`, `cupGap` — eski field isimleri |

**Çözüm:** SlotDefinition key'lerinden dinamik gap field'leri: `surfaceGap`, `dishGap`, `drinkwareGap`

---

### 3.6 Status & Config Sabitleri
| Dosya | Satır | Sabit |
|-------|-------|-------|
| `functions/src/services/queue.ts` | 164 | `activeStatuses = ["pending", "processing", "awaiting_approval", "scheduled"]` |
| `functions/src/services/queue.ts` | 293 | `editableStatuses = ["pending", "failed", "rejected"]` |
| `functions/src/services/queue.ts` | 51-56 | Default productCategory: "chocolate", aiModel: "gemini-flash", styleVariant: "lifestyle-moments" |
| `functions/src/controllers/orchestrator/pipelineController.ts` | 20 | `TIMEZONE = "Europe/Istanbul"` |

---

## BÖLÜM 4: DÜŞÜK (Kabul Edilebilir / Seed Data)

### 4.1 UI Sabitleri (Lokalizasyon)
| Dosya | Sabit | Not |
|-------|-------|-----|
| `admin/src/pages/OrchestratorDashboard.tsx` | `ASPECT_RATIO_OPTIONS`, `STATUS_CONFIG`, `STAGE_LABELS`, `GRID_CONFIG` | UI etiketleri + renk mapping |
| `admin/src/pages/AIMonitor.tsx` | `STAGE_COLORS`, `STAGE_LABELS`, `STAGE_ORDER`, `STATUS_COLORS` | Pipeline aşama sabitleri |
| `admin/src/pages/TimeSlots.tsx` | `DAY_NAMES`, `DAY_NAMES_SHORT`, `getTimeSlotName()` | Gün isimleri + zaman dilimi |
| `admin/src/pages/TimeSlots.tsx` | `DAY_HOUR_SCORES` (168 satır) | Instagram engagement skorları |
| `admin/src/pages/Categories.tsx` | `EATING_METHOD_OPTIONS` | 5 yeme şekli (Scenarios'ta da tekrar) |
| `admin/src/components/Sidebar.tsx` | `menuGroups` | Navigasyon yapısı + version |

### 4.2 Seed Data (İlk Kurulum)
| Dosya | Sabit | Not |
|-------|-------|-----|
| `functions/src/orchestrator/types.ts` | `DEFAULT_THEMES` (6 tema) | İlk yükleme — Firestore'a yazılır |
| `functions/src/orchestrator/types.ts` | `DEFAULT_SLOT_DEFINITIONS` (5 slot) | İlk yükleme — Firestore'a yazılır |
| `functions/src/orchestrator/types.ts` | `DEFAULT_PRODUCT_SLOT_DEFAULTS` | İlk yükleme |
| `functions/src/orchestrator/seed/defaultData.ts` | `DEFAULT_SCENARIOS` (30+ senaryo) | İlk yükleme |
| `functions/src/services/captionTemplate.ts` | `seedDefaultTemplates()` (8 template) | İlk yükleme |
| `functions/src/services/styleService.ts` | Default stiller (5 adet) | İlk yükleme |

### 4.3 Teknik Sabitler
| Dosya | Sabit | Not |
|-------|-------|-----|
| `functions/src/services/configService.ts` | `CACHE_TTL = 5 * 60 * 1000` | Cache süresi |
| `functions/src/services/gemini.ts` | `timeoutMs = 60000` | API timeout |
| `functions/src/services/categoryService.ts` | Batch limit: 450 | Firestore 500 limitine yakın |
| `functions/src/services/telegram.ts` | `TELEGRAM_API_BASE` | Nadiren değişir |

---

## BÖLÜM 5: TEKRARLANAN HARDCODED PATTERN'LER

### 5.1 Kategori Listesi Tekrarı
Aynı kategori listesi (`"products"`, `"furniture"`, `"props"`, `"accessories"` ...) şu dosyalarda tekrarlanıyor:
- `functions/src/orchestrator/ruleEngine/preFilter.ts` — **4 kez**
- `functions/src/orchestrator/ruleEngine/scorer.ts` — **2 kez**
- `functions/src/orchestrator/ruleEngine/postValidator.ts` — **1 kez**
- `functions/src/orchestrator/orchestrator.ts` — **5+ kez** (special asset queries)

### 5.2 Slot Field Erişimi Tekrarı
`assetSelection.table`, `assetSelection.plate`, `assetSelection.cup` pattern'i:
- `orchestrator.ts` — resolveCompositionAssets, logging
- `pipelineController.ts` — pre-flight response
- `OrchestratorDashboard.tsx` — UI render
- `configController.ts` — diversity rules (tableGap, plateGap, cupGap)

---

## BÖLÜM 6: ÖNCELİK MATRİSİ

| Öncelik | Kategori | Bulgu Sayısı | Etki |
|---------|----------|-------------|------|
| **P0 — Acil** | AssetSelection interface dinamikleştir | 4 dosya | Yeni slot eklenemez |
| **P0 — Acil** | Union type'ları string'e çevir | 6 type | Build kırılır |
| **P1 — Yüksek** | Preset constants → Firestore | 3 preset grubu | Kullanıcı özelleştiremiyor |
| **P1 — Yüksek** | Beverage rules → Firestore | 3 sabit | Yeni ürün tipi bozulur |
| **P1 — Yüksek** | AI model/pricing → config | 4 sabit | Fiyat değişince güncellenemiyor |
| **P2 — Orta** | Firestore path'leri merkezi | 15+ dosya | Bakım zorluğu |
| **P2 — Orta** | Frontend PRODUCT_TYPE_OPTIONS dinamik | 3 dosya | Yeni ürün UI'da gözükmez |
| **P2 — Orta** | Filename keyword filtreleri kaldır | 1 dosya | Güvenilmez filtreleme |
| **P2 — Orta** | Diversity rules field isimleri | 1 dosya | Eski slot isimleri |
| **P3 — Düşük** | UI label/renk sabitleri | 6+ dosya | Lokalizasyon eksikliği |
| **P3 — Düşük** | Seed data | 6 dosya | Kabul edilir (ilk kurulum) |
| **P3 — Düşük** | Teknik sabitler (cache, timeout) | 4 dosya | Nadiren değişir |

---

## BÖLÜM 7: ÖNERİLEN AKSIYON PLANI

### Faz 1: Yapısal Düzeltmeler (P0)
1. `AssetSelection` → index signature ekle: `[slotKey: string]: Asset | undefined`
2. `AssetCategory`, `ProductType` vs. → `string` type'a çevir, runtime validation
3. Admin types → functions types'dan re-export (duplicate kaldır)

### Faz 2: Config Dinamikleştirme (P1)
4. `WEATHER_PRESETS`, `LIGHTING_PRESETS`, `ATMOSPHERE_PRESETS` → Firestore config
5. `DEFAULT_BEVERAGE_RULES`, `DEFAULT_BEVERAGE_TAG_MAPPINGS` → Firestore config
6. AI model isimleri + pricing → `system-settings` doc

### Faz 3: Frontend Dinamikleştirme (P2)
7. `PRODUCT_TYPE_OPTIONS` → `DynamicCategory` products subTypes'dan
8. `FIELDS_BY_CATEGORY_FALLBACK` → kategori tanımına alan kuralı ekle
9. Filename keyword filtreleri → `asset.subType` kullan
10. Firestore path'leri → merkezi constants dosyası

### Faz 4: İyileştirmeler (P3)
11. UI label'ları → config veya i18n sistemi
12. `DAY_HOUR_SCORES` → backend analytics API'den
13. `EATING_METHOD_OPTIONS` tekrarı → tek kaynak

---

*Rapor sonu. 8 paralel agent tarafından üretildi, ana context'te birleştirildi.*

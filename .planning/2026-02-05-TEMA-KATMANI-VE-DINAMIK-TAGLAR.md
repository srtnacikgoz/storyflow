# Tema Katmanı & Dinamik Tag Sistemi

**Tarih:** 2026-02-05
**Durum:** Onaylandı (Brainstorming tamamlandı)
**Öncelik:** Yüksek

---

## Özet

Tema sistemi şu an senaryoyu kopyalıyor ve gerçek bir değer üretmiyor. Bu plan ile:
1. **Tema**, senaryonun **ne** olduğunu değil, **nasıl** göründüğünü belirleyen bir **katman** haline gelecek
2. **Asset tag'leri**, serbest metin yerine **dinamik, yapılandırılmış, kategori bazlı** şemalara dönüşecek
3. İki sistem birbirini besleyecek: Tema'nın `preferredTags`'i, asset'lerin `structuredTags`'i ile alan bazlı eşleşecek

**Temel Felsefe:** Aynı senaryo + farklı tema = tamamen farklı görsel çıktı.

---

## Bölüm 1: Dinamik Tag Sistemi

### 1.1 Neden?

Mevcut sorunlar:
- Tag'ler serbest metin → tutarsızlık ("ahşap" vs "wooden" vs "wood")
- Tenant neyi girmesi gerektiğini bilmiyor
- Zorunlu değil, atlanabiliyor
- Tema'nın preferredTags'i ile eşleşme garanti değil
- SaaS'ta her tenant farklı tag formatı kullanır → kaos

### 1.2 Yeni Yapı: Tag Şemaları

Firestore'da `tagSchemas` koleksiyonu. Her asset kategorisi için ayrı şema:

```typescript
// Firestore: tagSchemas/{categoryId}
interface TagSchema {
  categoryId: string;           // "plate", "table", "cup", "product", ...
  label: string;                // "Tabak", "Masa", "Fincan", ...
  groups: TagGroup[];
  createdAt: number;
  updatedAt: number;
}

interface TagGroup {
  key: string;                  // "material", "color", "style", ...
  label: string;                // "Malzeme", "Renk", "Stil", ...
  required: boolean;            // Zorunlu mu?
  multiSelect: boolean;         // Birden fazla seçilebilir mi? (ör: renkler)
  options: TagOption[];
  sortOrder: number;            // Admin panelde sıralama
}

interface TagOption {
  value: string;                // "ceramic" (backend key - İngilizce, standart)
  label: string;                // "Seramik" (frontend gösterim - lokalize)
  isSystem: boolean;            // Sistem tanımlı mı? (tenant silemez)
  addedBy?: string;             // Tenant tarafından eklendiyse tenant ID
}
```

### 1.3 Örnek Şemalar

**Plate (Tabak):**
| Grup | Zorunlu | Multi | Seçenekler |
|------|---------|-------|------------|
| material | Evet | Hayır | ceramic, porcelain, wood, glass, metal, stone, bamboo |
| color | Evet | Evet | white, beige, gray, blue, black, terracotta, brown, green |
| style | Evet | Hayır | minimal, rustic, modern, vintage, organic, industrial |
| pattern | Hayır | Hayır | plain, striped, textured, patterned, hand-painted |
| size | Hayır | Hayır | small, medium, large |
| shape | Hayır | Hayır | round, square, oval, irregular, rectangular |

**Table (Masa):**
| Grup | Zorunlu | Multi | Seçenekler |
|------|---------|-------|------------|
| material | Evet | Hayır | wood, marble, metal, glass, concrete, stone, laminate |
| color | Evet | Evet | natural-wood, white, black, gray, brown, dark-walnut |
| surface | Evet | Hayır | smooth, grain-textured, scratched, natural, polished |
| style | Evet | Hayır | minimal, rustic, modern, vintage, industrial, scandinavian |

**Product (Ürün - croissant, pasta, vb.):**
| Grup | Zorunlu | Multi | Seçenekler |
|------|---------|-------|------------|
| texture | Evet | Evet | flaky, smooth, layered, crispy, soft, glazed, powdered |
| color | Evet | Evet | golden, brown, dark-chocolate, white, cream, colorful |
| size | Hayır | Hayır | mini, standard, large, assorted |
| presentation | Hayır | Hayır | whole, sliced, bitten, stacked, scattered |

**Cup (Fincan/Bardak):**
| Grup | Zorunlu | Multi | Seçenekler |
|------|---------|-------|------------|
| material | Evet | Hayır | ceramic, porcelain, glass, metal, paper |
| color | Evet | Evet | white, black, transparent, brown, beige, colored |
| type | Evet | Hayır | espresso-cup, latte-mug, tea-glass, tumbler, takeaway |
| style | Evet | Hayır | minimal, rustic, modern, vintage, artisan |

### 1.4 Asset'te Tag Format Değişikliği

```typescript
// ESKİ (düz string array - kaldırılmayacak, geriye uyumluluk):
tags: ["beyaz", "seramik", "minimal"]

// YENİ (yapılandırılmış):
structuredTags: {
  material: "ceramic",
  color: ["white"],
  style: "minimal",
  pattern: "plain"
}
```

**Geçiş stratejisi:** Eski `tags` alanı korunur (geriye uyumluluk). Yeni `structuredTags` alanı eklenir. Rule Engine önce `structuredTags`'e bakar, yoksa `tags`'e fallback yapar.

### 1.5 Tenant Tag Genişletme

- Sistem şemaları `isSystem: true` seçeneklerle gelir (tenant silemez)
- Tenant kendi seçeneklerini ekleyebilir (`addedBy: tenantId`)
- Tenant eklediği seçenekleri silebilir/düzenleyebilir
- Sistem seçenekleri tüm tenant'larda ortaktır

### 1.6 Admin Panel - Asset Modal Tag UX

Mevcut: Serbest metin input, virgülle ayrılmış
Yeni tasarım:

```
┌─────────────────────────────────────────────┐
│ Asset Ekle: Tabak                           │
├─────────────────────────────────────────────┤
│                                             │
│ 📷 [Görsel Yükleme Alanı]                  │
│                                             │
│ ─── Zorunlu Etiketler ─────────────────     │
│                                             │
│ Malzeme *        [▼ Seramik         ]       │
│ Renk *           [◉ Beyaz] [◉ Bej] [○ Gri] │
│ Stil *           [▼ Minimal         ]       │
│                                             │
│ ─── Opsiyonel Etiketler ──────────────      │
│                                             │
│ Desen            [▼ Seçiniz...      ]       │
│ Boyut            [▼ Seçiniz...      ]       │
│ Form             [▼ Seçiniz...      ]       │
│                                             │
│ ─── Özel Etiket Ekle ─────────────────      │
│ [+ Yeni seçenek ekle: _____________ ]       │
│                                             │
│ ⚠️ Zorunlu alanlar doldurulmadan            │
│    asset aktif edilemez                      │
│                                             │
│           [İptal]  [Kaydet]                 │
└─────────────────────────────────────────────┘
```

**UX Kuralları:**
- Kategori seçilince tag şeması otomatik yüklenir
- Zorunlu gruplar kırmızı yıldızlı
- Multi-select gruplar chip/checkbox, single-select dropdown
- Zorunlu gruplar doldurulmadan `isActive: true` yapılamaz
- "Neden etiketler önemli?" tooltip/bilgi kutusu (tenant eğitimi)

---

## Bölüm 2: Tema Katmanı

### 2.1 Tema'nın Yeni Rolü

**Eski:** Tema = senaryo gruplayıcı + pet/accessory boolean
**Yeni:** Tema = senaryonun görsel stilini belirleyen katman

Aynı senaryo + farklı tema = farklı görsel:
- "cam-kenari" + "Minimalist Beyaz" → beyaz seramik tabak, sade, soğuk ışık
- "cam-kenari" + "Rustik Kahvaltı" → ahşap tabak, keten peçete, sıcak doğal ışık

### 2.2 Tema'nın Yeni Alanları

```typescript
interface Theme {
  // Mevcut alanlar (korunacak)
  id: string;
  name: string;
  description?: string;          // AI tarafından üretilen açıklama (artık anlamlı)
  scenarios: string[];
  petAllowed: boolean;
  accessoryAllowed: boolean;
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;

  // YENİ ALANLAR
  pinnedAssets?: {               // Sabit asset'ler (her zaman bu kullanılır)
    plate?: string;              // Asset ID
    table?: string;
    cup?: string;
    napkin?: string;
    // product hariç - ürün zaten dışarıdan geliyor
  };

  preferredTags?: {              // Rule Engine'e bonus skor verecek tag'ler
    material?: string[];         // ["wood", "stone"]
    color?: string[];            // ["brown", "beige"]
    style?: string[];            // ["rustic"]
    [key: string]: string[] | undefined;  // Dinamik tag gruplarına göre genişler
  };

  colorPalette?: string[];       // Prompt'a eklenen renk yönlendirmesi
                                 // ["warm earth tones", "brown", "cream", "olive"]

  atmosphereNote?: string;       // Senaryo üzerine eklenen atmosfer katmanı
                                 // "Warm morning light, cozy and intimate feel"

  propDensity?: "minimal" | "moderate" | "rich";  // Sahnede ne kadar obje olsun
}
```

### 2.3 Pipeline Entegrasyonu

#### Adım 1: Pinned Asset'ler (Rule Engine Bypass)
```
Tema'da pinnedAssets.plate = "asset-123" varsa:
→ Rule Engine plate seçimini ATLA
→ Direkt "asset-123" kullan
→ Diğer kategoriler normal Rule Engine akışı
```

#### Adım 2: Preferred Tags (Rule Engine Bonus)
```
Tema'da preferredTags.style = ["rustic"] varsa:
→ Rule Engine scoring'de structuredTags.style === "rustic" olan asset'lere +20 bonus
→ Garanti değil ama güçlü yönlendirme
```

#### Adım 3: Atmosfer & Renk Paleti (Prompt Enjeksiyonu)
```
Mevcut prompt yapısı:
  1. Format & Context
  2. Atmosphere (mood preset'ten)
  3. Lighting
  ...
  7. Asset Constraints
  8. Scene Direction (senaryo description)

Yeni ekleme:
  8. Scene Direction (senaryo description)
  9. THEME LAYER:              ← YENİ
     - Color Palette: warm earth tones, brown, cream
     - Atmosphere: Warm morning light, cozy and intimate feel
     - Prop Density: moderate
```

#### Adım 4: Prop Density (Asset Sayısı Kontrolü)
```
minimal  → Sadece zorunlu: ürün + tabak/yüzey. Peçete, aksesuar yok.
moderate → Ürün + tabak + 1-2 ek prop (peçete, çatal, vb.)
rich     → Ürün + tabak + peçete + aksesuar + dekoratif öğeler
```

### 2.4 Admin Panel - Tema Formu (Yeni)

```
┌─────────────────────────────────────────────┐
│ Tema Düzenle: Rustik Kahvaltı               │
├─────────────────────────────────────────────┤
│                                             │
│ Temel Bilgiler                              │
│ Ad:          [Rustik Kahvaltı          ]    │
│ Senaryolar:  [▼ cam-kenari, masa-ustu  ]    │
│                                             │
│ ─── Görsel Stil ───────────────────────     │
│                                             │
│ Renk Paleti:  [◉ Sıcak toprak tonları]     │
│               [◉ Kahverengi] [◉ Krem]       │
│               [+ Ekle]                      │
│                                             │
│ Atmosfer Notu: [Sıcak sabah ışığı, samimi  │
│                 ve doğal bir his_________]   │
│                                             │
│ Prop Yoğunluğu: (○) Minimal                │
│                  (●) Orta                   │
│                  (○) Zengin                 │
│                                             │
│ ─── Sabit Asset'ler (Pinned) ──────────     │
│                                             │
│ Tabak:  [▼ Ahşap Sunum Tahtası (ID:023)]   │
│ Masa:   [▼ Seçilmedi - Rule Engine seçer]   │
│ Fincan: [▼ Seçilmedi - Rule Engine seçer]   │
│                                             │
│ ─── Tag Tercihleri ────────────────────     │
│                                             │
│ Tercih edilen stiller:                      │
│   [◉ rustic] [◉ vintage] [○ modern] ...    │
│ Tercih edilen malzemeler:                   │
│   [◉ wood] [◉ linen] [○ ceramic] ...       │
│                                             │
│ ─── İzinler ───────────────────────────     │
│                                             │
│ [✓] Evcil hayvan izni                       │
│ [ ] Aksesuar izni                           │
│                                             │
│           [İptal]  [Kaydet]                 │
└─────────────────────────────────────────────┘
```

### 2.5 Tema AI Açıklaması (Artık Anlamlı)

Eski: Tema adından generic açıklama üret (senaryo kopyası)
Yeni: Tema'nın TÜM alanlarından anlamlı açıklama üret:

```
Input: {
  name: "Rustik Kahvaltı",
  scenarios: ["cam-kenari", "masa-ustu"],
  preferredTags: { style: ["rustic"], material: ["wood", "linen"] },
  colorPalette: ["warm earth tones", "brown", "cream"],
  propDensity: "moderate",
  pinnedAssets: { plate: "ahsap-sunum-tahtasi-023" }
}

Output: "A warm, rustic breakfast setting featuring natural wood surfaces
and linen textures. The scene uses earthy tones with brown and cream as
the dominant palette. Props are moderate - enough to create atmosphere
without cluttering. The wooden serving board anchors the composition."
```

Bu açıklama artık senaryo kopyası değil, gerçekten tema'nın **stilini** tarif ediyor.

---

## Bölüm 3: Rule Engine Güncellemesi

### 3.1 Structured Tag Matching (Yeni Scorer Bileşeni)

Mevcut `tagMatch` scorer'ı düz string karşılaştırma yapıyor.
Yeni scorer alan bazlı eşleşme yapacak:

```typescript
// Eski:
// asset.tags.includes("rustic") → +10

// Yeni:
// asset.structuredTags.style === "rustic"
//   && theme.preferredTags.style.includes("rustic")
//   → +15 (alan bazlı kesin eşleşme, daha yüksek skor)
```

### 3.2 Tema Bonus Skoru

Rule Engine'e yeni scoring bileşeni: `themePreferenceMatch`

```
Score bileşenleri (güncellenmiş):
  tagMatch:              0-40 (mevcut, structuredTags ile güncellenir)
  usageBonus:            0-20 (mevcut, değişmez)
  moodMatch:             0-20 (mevcut, değişmez)
  productCompat:         0-20 (mevcut, değişmez)
  patronBonus/Penalty:   -30 to +20 (mevcut, değişmez)
  themePreferenceMatch:  0-25 (YENİ - tema preferredTags eşleşmesi)
```

### 3.3 Pinned Asset Akışı

```typescript
// Pipeline'da tema uygulanırken:
if (theme.pinnedAssets?.plate) {
  // Rule Engine'den plate seçimini ATLA
  // Direkt pinned asset'i yükle
  selection.plate = await loadAssetById(theme.pinnedAssets.plate);
} else {
  // Normal Rule Engine akışı (tema preferredTags etkisiyle)
  selection.plate = ruleEngine.selectBest("plate", context);
}
```

---

## Bölüm 4: Uygulama Sırası

### Faz A: Dinamik Tag Altyapısı (Öncelik: İLK)
Tema katmanı tag'lere bağımlı. Önce tag altyapısı hazır olmalı.

1. **A1:** `TagSchema` ve `TagGroup` type tanımları (functions/src/orchestrator/types.ts)
2. **A2:** Firestore `tagSchemas` koleksiyonu + varsayılan şemalar (plate, table, cup, product, napkin, accessory)
3. **A3:** Tag schema CRUD controller (functions/src/controllers/orchestrator/tagSchemaController.ts)
4. **A4:** Asset type'a `structuredTags` alanı ekle (geriye uyumlu, eski `tags` korunur)
5. **A5:** Admin panel: Tag Şemaları yönetim sayfası (yeni sayfa)
6. **A6:** Admin panel: Asset modal'da yapılandırılmış tag girişi (kategori bazlı dinamik form)
7. **A7:** Zorunlu tag validasyonu (zorunlu gruplar doldurulmadan asset aktif edilemez)
8. **A8:** Mevcut asset'lerin tag migration stratejisi (eski tags → structuredTags mapping)

### Faz B: Tema Katmanı
Tag altyapısı hazır olduktan sonra tema genişletilir.

1. **B1:** Theme type güncelle (pinnedAssets, preferredTags, colorPalette, atmosphereNote, propDensity)
2. **B2:** Admin panel: Tema formu güncelle (yeni alanlar)
3. **B3:** Pinned asset seçimi UI (asset dropdown/search)
4. **B4:** preferredTags UI (tag şemalarından dinamik chip seçimi)
5. **B5:** Pipeline: Pinned asset bypass logiği (orchestrator.ts)
6. **B6:** Pipeline: preferredTags → Rule Engine bonus scorer
7. **B7:** Pipeline: atmosphereNote + colorPalette → Gemini prompt enjeksiyonu
8. **B8:** Pipeline: propDensity → asset sayısı kontrolü
9. **B9:** Tema AI açıklama üretimini güncelle (tüm yeni alanları input olarak kullan)

### Faz C: Rule Engine Güncelleme
1. **C1:** Scorer'a `themePreferenceMatch` bileşeni ekle
2. **C2:** `structuredTags` bazlı tag matching (alan bazlı kesin eşleşme)
3. **C3:** Fallback: `structuredTags` yoksa eski `tags` array'ine bak

---

## Bölüm 5: Etki Alanı

### Değişecek Dosyalar
| Dosya | Değişiklik |
|-------|-----------|
| functions/src/orchestrator/types.ts | TagSchema, TagGroup, TagOption type'ları + Theme güncelleme + Asset.structuredTags |
| functions/src/controllers/orchestrator/tagSchemaController.ts | YENİ - Tag şema CRUD |
| functions/src/controllers/orchestrator/themeController.ts | Tema güncelleme (yeni alanlar) |
| functions/src/orchestrator/orchestrator.ts | Pinned asset bypass, atmosfer/renk prompt enjeksiyonu, propDensity |
| functions/src/orchestrator/ruleEngine/scorer.ts | themePreferenceMatch bileşeni, structuredTags matching |
| functions/src/orchestrator/geminiPromptBuilder.ts | Theme layer prompt bloğu |
| admin/src/pages/Assets.tsx | Yapılandırılmış tag giriş formu |
| admin/src/pages/Themes.tsx | Yeni tema formu (pinned, preferredTags, vb.) |
| admin/src/pages/TagSchemas.tsx | YENİ - Tag şema yönetim sayfası |
| admin/src/types/index.ts | Frontend type güncellemeleri |
| admin/src/services/api.ts | Yeni endpoint'ler (tagSchema CRUD) |

### Etkilenen Özellikler
- Asset yönetimi (tag girişi değişiyor)
- Tema yönetimi (tamamen yenileniyor)
- Rule Engine scoring (yeni bileşen)
- Prompt pipeline (yeni theme layer bloğu)
- AI açıklama üretimi (tema description)

---

## Bölüm 6: Riskler

| Risk | Olasılık | Etki | Çözüm |
|------|----------|------|--------|
| Mevcut tag'lerin migration'ı zor | Orta | Orta | Eski `tags` korunur, `structuredTags` paralel eklenir. Kademeli geçiş. |
| Tag şema yönetimi karmaşık UI | Düşük | Orta | Basit tablo formatı, drag-drop sıralama. MVP'de minimal. |
| Pinned asset diversity sorunlu | Orta | Düşük | Pinned asset diversity rotation'dan muaf tutulur (bilinçli tekrar). |
| preferredTags çok dar → asset bulunamaz | Düşük | Orta | Bonus skor sistemi, garanti değil. Asset bulunamazsa fallback mevcut. |
| Geriye uyumluluk kırılması | Düşük | Yüksek | Tüm yeni alanlar optional. Eski tema/asset'ler aynen çalışmaya devam eder. |

---

## Bölüm 7: Başarı Kriterleri

1. ✅ Aynı senaryo + farklı tema → gözle görülür farklı görseller üretilmeli
2. ✅ Pinned asset her zaman görselde görünmeli
3. ✅ preferredTags olan asset'ler daha sık seçilmeli (loglardan doğrulanabilir)
4. ✅ Zorunlu tag'ler olmadan asset aktif edilememeli
5. ✅ Tenant kendi tag seçeneklerini ekleyebilmeli
6. ✅ Eski asset'ler (structuredTags olmayan) çalışmaya devam etmeli
7. ✅ Build başarılı, mevcut pipeline kırılmamış olmalı

---

## Sonraki Adımlar

- [ ] Faz A başla: TagSchema type tanımları
- [ ] Varsayılan tag şemalarını belirle (her kategori için gruplar ve seçenekler)
- [ ] Admin panel tag şema yönetim sayfası mockup
- [ ] Asset modal yeni tag UX mockup

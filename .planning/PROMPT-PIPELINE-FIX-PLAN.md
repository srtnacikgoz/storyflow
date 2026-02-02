# Prompt Pipeline Düzeltme Planı

> **Oluşturma Tarihi:** 2026-02-02
> **Son Güncelleme:** 2026-02-02 (Uygulama Tamamlandı)
> **Durum:** ✅ TAMAMLANDI
> **İlişkili:** PROMPT-PIPELINE-SORUNLARI.md, GEMINI-LANGUAGE-ADAPTATION.md

## ✅ Uygulanan Değişiklikler (2026-02-02)

### Görev 1: Asset Etiketleri ✅
- `geminiPromptBuilder.ts`: `assetTags` parametresi eklendi
- `geminiPromptBuilder.ts`: ASSET CONSTRAINTS bölümü prompt'a eklendi
- `orchestrator.ts`: selectedAssets'ten tag'ler buildGeminiPrompt'a geçiriliyor

### Görev 2: Mood ID Eşleştirme ✅
- `orchestrator.ts`: getMoodFromTime() gemini-preset ID'leri kullanıyor
- `orchestrator.ts`: moodDetails'e geminiPresetId eklendi
- `orchestrator.ts`: Mood hesaplaması geminiPresetId öncelikli

### Görev 3: userRules Loglama ✅
- `orchestrator.ts`: data.title + data.description kullanılıyor
- `orchestrator.ts`: data.type kullanılıyor (ruleType değil)

---

---

## 📊 Sorun Özeti

| # | Sorun | Öncelik | Dosya | Zorluk |
|---|-------|---------|-------|--------|
| 4 | Asset etiketleri Gemini'ye gitmiyor | 🔴 Kritik | geminiPromptBuilder.ts | Orta |
| 3 | Mood ID eşleşmiyor | 🔴 Kritik | orchestrator.ts + geminiPromptBuilder.ts | Orta |
| 1 | userRules loglama yanlış | 🟡 Düşük | orchestrator.ts | Kolay |

---

## 🔬 DETAYLI ANALİZ SONUÇLARI

### Mimari Bulguları

#### 1. Çift Servis Mimarisi (ClaudeService vs GeminiService)

**Durum:** Eski ve yeni servisler birlikte mevcut.

| Servis | Dosya | Aktif mi? | Kullanım |
|--------|-------|-----------|----------|
| `ClaudeService` | claudeService.ts | ❓ Eski | Muhtemelen kullanılmıyor |
| `GeminiService` | gemini.ts | ✅ Aktif | Orchestrator bu servisi kullanıyor |

**Orchestrator çağrıları (orchestrator.ts):**
```typescript
this.gemini.selectAssets(...)      // satır 661
this.gemini.selectScenario(...)    // satır 829
this.gemini.optimizePrompt(...)    // satır 1012
```

**Öneri:** ClaudeService arşivlenebilir veya silinebilir.

---

#### 2. Etiket Akışı Analizi

**Etiketler nerede kullanılıyor?**

| Aşama | Etiketler | Dosya | Satır |
|-------|-----------|-------|-------|
| Asset Seçimi | ✅ Gönderiliyor | gemini.ts | 591-622 |
| Prompt Optimizasyonu | ✅ Gönderiliyor | gemini.ts | 900-902 |
| **Görsel Üretimi** | ❌ **GÖNDERİLMİYOR** | geminiPromptBuilder.ts | 632-760 |

**Kanıt (gemini.ts:591-622):**
```typescript
// selectAssets fonksiyonu - etiketler dahil
`ÜRÜNLER: ${JSON.stringify(availableAssets.products?.map((a: any) => ({
  id: a.id,
  filename: a.filename,
  tags: a.tags || [],  // ← BURADA VAR
  usageCount: a.usageCount || 0
}))}`
```

**Sonuç:** Etiketler asset seçiminde kullanılıyor (hangi tabağı seç?), ama görsel üretim prompt'una (bu tabakla nasıl görsel üret?) dahil edilmiyor.

---

#### 3. Üç Farklı Mood Sistemi

Sistemde **3 farklı Mood tanımı** var ve birbiriyle uyumsuz:

| Interface | Dosya | Collection | geminiAtmosphere |
|-----------|-------|------------|------------------|
| `Mood` | orchestrator/types.ts:144 | `moods` | ❌ YOK |
| `MoodDefinition` | types/index.ts:925 | ? | ✅ VAR |
| `GeminiMoodDefinition` | geminiPromptBuilder.ts:14 | `gemini-presets/mood-definitions` | ✅ VAR |

**`moods` Collection Yapısı (types.ts:144):**
```typescript
interface Mood {
  id: string;
  name: string;
  description: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night" | "any";
  season: string;
  weather: string;
  lightingPrompt: string;      // ← VAR
  colorGradePrompt: string;    // ← VAR
  // geminiAtmosphere: YOK!     // ← EKSİK
}
```

**`GeminiMoodDefinition` Yapısı (geminiPromptBuilder.ts:14):**
```typescript
interface GeminiMoodDefinition {
  id: string;
  name: string;
  geminiAtmosphere: string;    // ← VAR
  lighting: string;
  temperature: string;
  colorPalette: string[];
  // ...
}
```

**Sorunun Anatomisi:**
```
Admin Panel → Tema → mood: "WPjaGbItgXofQ1GhM3xy" (moods collection doc ID)
                            ↓
Orchestrator → moods/{id} doc'u okur
                            ↓
         Doc yapısı: { lightingPrompt, colorGradePrompt } (geminiAtmosphere YOK!)
                            ↓
buildGeminiPrompt → moodId: "WPjaGbItgXofQ1GhM3xy"
                            ↓
                    gemini-presets/mood-definitions içinde ara
                            ↓
              Bulunan ID'ler: ["morning-ritual", "cozy-intimate", "bright-airy"]
                            ↓
                    ❌ EŞLEŞMİYOR → matched: false
```

---

#### 4. GEMINI-LANGUAGE-ADAPTATION Planı ile İlişki

Bu plan zaten kısmen uygulanmış:

| Planlanan | Tanımlanmış | Firestore'da | Kullanılıyor |
|-----------|-------------|--------------|--------------|
| `GeminiMoodDefinition` | ✅ geminiPromptBuilder.ts:14 | ❓ gemini-presets | ❓ |
| `GeminiLightingPreset` | ✅ geminiPromptBuilder.ts:26 | ❓ gemini-presets | ❓ |
| `GeminiHandPose` | ✅ geminiPromptBuilder.ts:38 | ❓ gemini-presets | ❓ |
| `GeminiCompositionTemplate` | ✅ geminiPromptBuilder.ts:49 | ❓ gemini-presets | ❓ |

**Firestore yolu:** `global/config/gemini-presets/`

**loadGeminiPresets() fonksiyonu (geminiPromptBuilder.ts:90-135):**
- Firestore'dan paralel yükleme yapıyor
- Cache mekanizması var (5 dakika TTL)
- Fallback olarak hardcoded default'lar mevcut

---

#### 5. Gemini Önerileri (2026-02-02)

Gemini'den alınan feedback:

1. **Semantik Gruplandırma:** Etiketleri kategorize et
   - Technical Metadata: [Large, 4K, MP4]
   - Descriptive Tags: [Sunset, Cinematic]
   - Functional Role: [Background Element, Hero Asset]

2. **Constraint Olarak Sunma:** Etiketleri bilgi değil, kısıtlama olarak ver

3. **Çelişki Yönetimi:** Etiket ile görsel kanıt çelişirse, görseli önceliklendirme notu ekle

4. **Dinamik Ağırlıklandırma:** Tüm etiketleri değil, ilgili olanları gönder

---

## 🔴 GÖREV 1: Asset Etiketlerini Gemini Prompt'a Ekle

### Problem
`buildGeminiPrompt()` fonksiyonu asset etiketlerini (tags) hiç almıyor ve prompt'a eklemiyor.

**Mevcut prompt bölümleri (satır 632-760):**
1. Format ✓
2. ATMOSPHERE ✓
3. LIGHTING ✓
4. HANDS ✓
5. PRODUCT TEXTURE ✓
6. BUSINESS CONTEXT ✓
7. RULES ✓
8. FORMAT ✓
9. **ASSET TAGS → YOK! ❌**

### Çözüm

#### Adım 1.1: `GeminiPromptParams` interface'ine assetTags ekle

**Dosya:** `geminiPromptBuilder.ts` (satır ~440)

```typescript
export interface GeminiPromptParams {
  // ... mevcut alanlar

  // YENİ: Asset etiketleri
  assetTags?: {
    product?: string[];      // Ürün etiketleri
    plate?: string[];        // Tabak etiketleri
    table?: string[];        // Masa etiketleri
    cup?: string[];          // Fincan etiketleri
    accessory?: string[];    // Aksesuar etiketleri
    napkin?: string[];       // Peçete etiketleri
  };
}
```

#### Adım 1.2: `buildGeminiPrompt()` içine ASSET CONSTRAINTS bölümü ekle

**Dosya:** `geminiPromptBuilder.ts` (satır ~697, PRODUCT TEXTURE'dan sonra)

**Gemini Önerileri ile Güncellenmiş Yaklaşım:**
- Etiketleri kategorize et (rol + etiketler)
- Kısıtlama olarak sun (CONSTRAINTS)
- Çelişki durumunda görsel kanıtı önceliklendirme notu ekle

```typescript
// 5.5 Asset Etiketleri (YENİ - Gemini önerileri ile)
if (params.assetTags) {
  const tagLines: string[] = [];

  // Her asset tipi için rol tanımlayarak ekle
  if (params.assetTags.plate?.length) {
    tagLines.push(`- PLATE (serving surface): ${params.assetTags.plate.join(", ")}`);
  }
  if (params.assetTags.cup?.length) {
    tagLines.push(`- CUP/MUG (beverage container): ${params.assetTags.cup.join(", ")}`);
  }
  if (params.assetTags.table?.length) {
    tagLines.push(`- TABLE (background surface): ${params.assetTags.table.join(", ")}`);
  }
  if (params.assetTags.accessory?.length) {
    tagLines.push(`- ACCESSORY (decorative element): ${params.assetTags.accessory.join(", ")}`);
  }
  if (params.assetTags.napkin?.length) {
    tagLines.push(`- NAPKIN (textile element): ${params.assetTags.napkin.join(", ")}`);
  }

  if (tagLines.length > 0) {
    promptParts.push(`ASSET CONSTRAINTS (FOLLOW THESE):`);
    promptParts.push(`Use reference images exactly as described below:`);
    promptParts.push(...tagLines);
    promptParts.push("");
    promptParts.push(`NOTE: If tags conflict with visual evidence in reference images, prioritize visual evidence.`);
    promptParts.push("");

    decisions.push({
      step: "asset-tags",
      input: params.assetTags,
      matched: true,
      result: `${tagLines.length} asset tipi için constraint eklendi`,
      fallback: false,
      details: { tagCount: tagLines.length },
    });
  }
}
```

**Neden CONSTRAINTS?**
Gemini'nin analizi: Etiketleri sadece bilgi olarak değil, "kısıtlama" olarak sunmak modelin davranışını daha iyi yönlendirir.

#### Adım 1.3: Orchestrator'dan asset tags'i geç

**Dosya:** `orchestrator.ts` (getScenarioPrompt çağrısı, satır ~1648)

```typescript
// getScenarioPrompt veya generateImage çağrısında:
const assetTags = {
  product: selectedAssets.product?.tags || [],
  plate: selectedAssets.plate?.tags || [],
  table: selectedAssets.table?.tags || [],
  cup: selectedAssets.cup?.tags || [],
  accessory: selectedAssets.accessory?.tags || [],
  napkin: selectedAssets.napkin?.tags || [],
};

const geminiParams: GeminiPromptParams = {
  // ... mevcut params
  assetTags,
};
```

### Test Kriteri
- [ ] AI Monitor'de `asset-tags` decision adımı görünmeli
- [ ] Gemini prompt'unda "ASSET CONSTRAINTS" bölümü olmalı
- [ ] Etiketler doğru asset tipine atanmalı

---

## 🔴 GÖREV 2: Mood ID Eşleştirme Sorunu

### Problem

İki farklı collection var ve birbirleriyle konuşmuyor:

| Collection | Kullanım | ID Formatı |
|------------|----------|------------|
| `moods` | Admin panelden tema oluştururken | Firestore auto-ID (`WPjaGbItgXofQ1GhM3xy`) |
| `gemini-presets/mood-definitions` | buildGeminiPrompt içinde | Human-readable (`morning-ritual`) |

**Akış:**
```
Theme.mood = "WPjaGbItgXofQ1GhM3xy"  (Firestore moods doc ID)
      ↓
orchestrator: moodId = "WPjaGbItgXofQ1GhM3xy"
      ↓
buildGeminiPrompt: presets.moods.find(m => m.id === "WPjaGbItgXofQ1GhM3xy")
      ↓
❌ BULUNAMADI (çünkü preset ID'leri "morning-ritual" gibi)
      ↓
Fallback: suggestMoodForTime() veya null
```

### Çözüm Alternatifleri

#### Alternatif A: Mood Doc'a geminiPresetId Ekle (ÖNERİLEN)

**Yaklaşım:** `moods` collection'daki her doc'a `geminiPresetId` alanı ekle.

**Firestore:** `moods/{docId}` dokümanına yeni alan

```json
{
  "id": "WPjaGbItgXofQ1GhM3xy",
  "name": "Sabah Enerjisi",
  "lightingPrompt": "...",
  "colorGradePrompt": "...",
  "geminiPresetId": "morning-ritual"  // ← YENİ ALAN
}
```

**Kod Değişikliği (orchestrator.ts ~265):**
```typescript
const effectiveMoodId = themeData?.mood;
let geminiMoodId: string | undefined;

if (effectiveMoodId) {
  const moodDoc = await this.db.collection("moods").doc(effectiveMoodId).get();
  if (moodDoc.exists) {
    const moodData = moodDoc.data();
    geminiMoodId = moodData?.geminiPresetId || moodData?.slug;
  }
}

// buildGeminiPrompt'a geminiMoodId gönder
const geminiParams = {
  moodId: geminiMoodId,  // ← Artık doğru format
  // ...
};
```

**Admin Panel:** Mood düzenleme modalında dropdown ile geminiPresetId seçimi.

#### Alternatif B: getMoodFromTime() Güncelle

**Dosya:** `orchestrator.ts` (satır 1627-1637)

```typescript
private getMoodFromTime(): string {
  const timeOfDay = this.getTimeOfDay();

  // Gemini presets ile uyumlu ID'ler kullan
  const moodMap: Record<string, string> = {
    morning: "morning-ritual",    // ← Güncellenmiş
    noon: "bright-airy",          // ← Güncellenmiş
    afternoon: "bright-airy",     // ← Güncellenmiş
    evening: "cozy-intimate",     // ← Güncellenmiş
    night: "cozy-intimate",
  };
  return moodMap[timeOfDay] || "cozy-intimate";
}
```

### Önerilen Yaklaşım
1. **Hemen:** Alternatif B'yi uygula (getMoodFromTime güncelle)
2. **Sonra:** Alternatif A'yı uygula (Admin panel + Firestore)

### Uygulama Adımları

#### Adım 2.1: getMoodFromTime() güncelle

**Dosya:** `orchestrator.ts` (satır 1627-1637)

Mevcut hardcoded ID'leri gemini-presets ID'leri ile değiştir.

#### Adım 2.2: Mood doc okurken geminiPresetId kontrolü ekle

**Dosya:** `orchestrator.ts` (satır ~265-290)

```typescript
const effectiveMoodId = themeData?.mood;
let geminiMoodId = effectiveMoodId;

if (effectiveMoodId) {
  const moodDoc = await this.db.collection("moods").doc(effectiveMoodId).get();
  if (moodDoc.exists) {
    const moodData = moodDoc.data();
    // Önce geminiPresetId'ye bak, yoksa slug, yoksa orijinal ID
    geminiMoodId = moodData?.geminiPresetId || moodData?.slug || effectiveMoodId;
  }
}
```

### Test Kriteri
- [ ] Mood eşleştirme `matched: true` döndürmeli
- [ ] Morning/noon/afternoon/evening için doğru preset kullanılmalı
- [ ] AI Monitor'de mood karar adımı detaylı görünmeli

---

## 🟡 GÖREV 3: userRules Loglama Düzeltmesi

### Problem
`orchestrator.ts:362` satırında `data.content` okunuyor ama AIRule tipinde bu alan yok.

**AIRule interface (types.ts:1611-1633):**
```typescript
export interface AIRule {
  id: string;
  type: "do" | "dont";
  category: AIRuleCategoryId;
  title: string;           // ← VAR
  description: string;     // ← VAR
  // content: YOK!          // ← EKSİK
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### Çözüm

**Dosya:** `orchestrator.ts` (satır 357-366)

**Önceki:**
```typescript
userRulesSnapshot.docs.forEach(doc => {
  const data = doc.data();
  userRulesForLog.push({
    id: doc.id,
    category: data.category || "general",
    content: data.content || "",  // ← YANLIŞ - content yok
    ruleType: data.ruleType || "do",
    applied: true,
  });
});
```

**Sonraki:**
```typescript
userRulesSnapshot.docs.forEach(doc => {
  const data = doc.data();
  userRulesForLog.push({
    id: doc.id,
    category: data.category || "general",
    content: data.title
      ? `${data.title}${data.description ? ": " + data.description : ""}`
      : data.description || "",  // ← DOĞRU - title + description
    ruleType: data.type || "do",  // "ruleType" değil "type"
    applied: true,
  });
});
```

### Test Kriteri
- [ ] AI Monitor'de userRules content'i dolu görünmeli
- [ ] Title ve description birleşik gösterilmeli

---

## 📋 Uygulama Sırası

| Sıra | Görev | Bağımlılık | Değişecek Dosyalar |
|------|-------|------------|-------------------|
| 1 | Görev 1: Asset Tags | Yok | geminiPromptBuilder.ts, orchestrator.ts |
| 2 | Görev 2: Mood ID | Yok | orchestrator.ts |
| 3 | Görev 3: userRules Log | Yok | orchestrator.ts |

---

## 🧪 Test Planı

### Manuel Test

1. **Asset Tags Testi:**
   - Bir asset'e birkaç etiket ekle (örn: tabak → "cheesecake tabağı, büyük")
   - Pipeline çalıştır
   - AI Monitor'de "asset-tags" adımını kontrol et
   - Gemini prompt'unda "ASSET CONSTRAINTS" bölümünü ara

2. **Mood ID Testi:**
   - Sabah saatinde pipeline çalıştır
   - AI Monitor'de mood-selection adımında `matched: true` olmalı
   - Tema ile çalıştır, tema mood'u doğru eşleşmeli

3. **userRules Testi:**
   - Aktif bir AI kuralı ekle (title + description ile)
   - Pipeline çalıştır
   - Log'larda kural content'i görünmeli

---

## 🔮 Gelecek İyileştirmeler

### Kısa Vadeli
- [ ] ClaudeService.ts arşivle veya sil
- [ ] Admin panelde mood düzenleme modalına geminiPresetId dropdown ekle
- [ ] Firestore'daki mevcut mood doc'larına geminiPresetId migration

### Orta Vadeli (GEMINI-LANGUAGE-ADAPTATION)
- [ ] `moods` collection'ı `GeminiMoodDefinition` formatına dönüştür
- [ ] Admin panelden doğrudan `gemini-presets` yönetimi
- [ ] Mood, lighting, handPose için birleşik preset yönetimi

---

## 📝 Notlar

### Risk Analizi
| Risk | Olasılık | Etki | Önlem |
|------|----------|------|-------|
| Prompt çok uzar | Düşük | Orta | Etiket sayısını limitle |
| Mood eşleşmesi hala başarısız | Orta | Yüksek | Fallback mekanizması koru |
| Log formatı bozulur | Düşük | Düşük | Mevcut format korunacak |

### Referanslar
- `PROMPT-PIPELINE-SORUNLARI.md` - Sorun tespitleri
- `GEMINI-LANGUAGE-ADAPTATION.md` - Uzun vadeli plan
- `geminiPromptBuilder.ts` - Type tanımları ve preset yükleme

---

**Son Güncelleme:** 2026-02-02 (Detaylı Analiz Eklendi)

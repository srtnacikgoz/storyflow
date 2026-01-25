# Gemini Dili Adaptasyonu - Kapsamlı Plan

> **Amaç:** Tüm sistemi Gemini'nin anlayacağı teknik dile çevirmek
> **Felsefe:** "Biz arka plan, Gemini başrol oyuncusu"
> **Oluşturulma:** 2026-01-25
> **Durum:** Planlama aşamasında

---

## 1. Problem Tanımı

### Mevcut Durum
- Senaryo açıklamaları belirsiz: "Bakımlı el ürün tutuyor"
- Teknik terimler yerine günlük dil kullanılıyor
- Kullanıcı (admin) teknik bilgi olmadan seçim yapamıyor
- Gemini'ye giden prompt'lar tutarsız

### Hedef Durum
- Her alan Gemini-native terminoloji kullanacak
- Dropdown'larla teknik seçim kolaylaşacak
- Prompt'lar tutarlı ve etkili olacak
- Görsel kalitesi artacak

---

## 2. Etkilenen Alanlar (Scope)

### 2.1 Veri Modelleri (Firestore)

| Collection | Etkilenen Alanlar | Mevcut → Hedef |
|------------|-------------------|----------------|
| `themes` | mood, description | Teknik mood terminolojisi |
| `scenarios` | description, compositions, lightingPreference, mood | Gemini-native prompt parçaları |
| `hand-styles` | description, details | Teknik el pozisyon/stil tanımları |
| `assets` | visualProperties, tags | Gemini'nin anlayacağı görsel özellikler |

### 2.2 Admin Panel Modalları

| Modal | Güncellenecek Alanlar |
|-------|----------------------|
| **Tema Oluşturma** | Mood dropdown (teknik açıklamalı) |
| **Senaryo Oluşturma** | Açıklama yapısı, ışık dropdown, mood dropdown, kompozisyon editörü |
| **El Stili Oluşturma** | Poz, açı, tırnak stili, grip tipi dropdown'ları |
| **Asset Ekleme** | Visual properties (Gemini-friendly tags) |
| **YENİ: Işık Ayarları** | Lighting presets yönetimi |
| **YENİ: Kompozisyon Şablonları** | Reusable composition definitions |

### 2.3 Backend (Orchestrator)

| Dosya | Etkilenen Alan |
|-------|----------------|
| `claudeService.ts` | Asset seçim kuralları, prompt hazırlama |
| `orchestrator.ts` | buildDynamicPrompt, moodAtmosphere, compositionDetails |
| `gemini.ts` | Prompt prefix/suffix yapısı |

---

## 3. Araştırma Fazı (Phase 0)

### Yaklaşım Felsefesi

```
ESKİ (YANLIŞ):
"Gemini, şu 5 konuda, şu 3 madde hakkında bilgi ver"
→ Biz sınırlıyoruz, yönlendiriyoruz
→ Gemini'nin bilgi evrenini daraltıyoruz

YENİ (DOĞRU):
"Gemini, bu konu hakkında her şeyi anlat"
→ O genişletir, biz öğreniriz
→ Onun kategorilerini, onun terimlerini kullanırız
```

**Temel İlke:** Biz arka plan, Gemini başrol oyuncusu.

### 3.1 Gemini'ye Sorulacak Sorular

**Felsefe:** Yönlendirme yok, örnek yok, madde yok. Gemini'ye alanı bırak.

---

#### Soru 1: Genel Prompt Yapısı
```
Food photography görseli üretmek için prompt yazıyorum.

En iyi sonucu almak için hangi bilgiler kritik?
Hangileri opsiyonel?
Bilgi eksik olunca ne olur?

Kategorize et, örnekle, derinleştir.
```

---

#### Soru 2: El ve Ürün Etkileşimi
```
Food photography'de insan eli ve ürün birlikte göründüğünde:

En iyi sonucu almak için hangi bilgiler kritik?
Bu konu hakkında bana her şeyi anlat.

Kategorize et, örnekle, derinleştir.
```

---

#### Soru 3: Atmosfer ve Mood
```
Food photography görsellerinde atmosfer ve mood konusunda:

En iyi sonucu almak için hangi bilgiler kritik?
Bu konu hakkında bana her şeyi anlat.

Kategorize et, örnekle, derinleştir.
```

---

#### Soru 4: Işıklandırma
```
Food photography'de ışıklandırma konusunda:

En iyi sonucu almak için hangi bilgiler kritik?
Hangi terimler en etkili?
Bu konu hakkında bana her şeyi anlat.

Kategorize et, örnekle, derinleştir.
```

---

#### Soru 5: Negative Prompt (--no)
```
Görsel üretimde istemediğim şeyleri belirtmek için
"--no" formatını kullanıyorum.

En iyi sonucu almak için hangi terimler etkili?
Hangileri gereksiz?
Bu konu hakkında bana her şeyi anlat.

Kategorize et, örnekle, derinleştir.
```

---

#### Soru 6: Mevcut Prompt Analizi
```
Şu ana kadar şu tür promptlar kullanıyorum:
[örnek prompt yapıştırılacak]

Daha iyi sonuç için:
- Eksik olan ne?
- Gereksiz olan ne?
- Nasıl iyileştirebilirim?

Detaylı analiz yap.
```

### 3.2 Referans Döküman Oluşturma

Araştırma sonuçları şu dosyaya kaydedilecek:
```
.claude/references/GEMINI-TERMINOLOGY-DICTIONARY.md
```

İçerik yapısı:
- Lighting Terms (TR → EN → Gemini Prompt)
- Composition Terms
- Hand/Pose Terms
- Mood Translations
- Negative Prompt Library
- Example Prompt Templates

---

## 4. Implementasyon Fazları

### Phase 1: Terminoloji ve Veri Yapısı (2-3 gün)

#### 1.1 Yeni Type Tanımları
```typescript
// types/geminiTerminology.ts

interface LightingPreset {
  id: string;
  name: string;           // "Altın Saat" (TR)
  geminiTerm: string;     // "golden hour warm sunlight"
  technicalDetails: string; // "2700-3000K, soft shadows, amber tones"
  bestFor: string[];      // ["warm", "romantic", "cozy"]
}

interface CompositionTemplate {
  id: string;
  name: string;
  entryPoint: "bottom-right" | "bottom-left" | "top" | "side" | "center";
  angleDescription: string;  // "45-degree angle, fingers pointing upper-left"
  geminiPrompt: string;      // Full Gemini-ready description
}

interface HandPose {
  id: string;
  name: string;
  gripType: "cupping" | "pinching" | "cradling" | "presenting" | "holding";
  fingerPosition: string;
  wristAngle: string;
  geminiPrompt: string;
}

interface MoodDefinition {
  id: string;
  name: string;
  lighting: LightingPreset;
  colorTemperature: string;
  depthOfField: string;
  compositionStyle: string;
  geminiAtmosphere: string;  // Full atmosphere prompt
}
```

#### 1.2 Firestore Seed Data
- `global/config/lighting-presets`
- `global/config/composition-templates`
- `global/config/hand-poses`
- `global/config/mood-definitions`

### Phase 2: Admin Panel UI (3-4 gün)

#### 2.1 Yeni/Güncellenen Modallar

**Senaryo Modal Güncellemesi:**
```
┌─────────────────────────────────────────────────┐
│ Senaryo Oluştur                                 │
├─────────────────────────────────────────────────┤
│ Ad: [________________]                          │
│                                                 │
│ Açıklama Oluşturucu:                           │
│ ┌─────────────────────────────────────────────┐│
│ │ El Pozisyonu: [Dropdown ▼]                  ││
│ │ > Cupping - Avuç içinde kavrama             ││
│ │ > Pinching - Parmak uçlarıyla tutma         ││
│ │ > Cradling - Nazikçe taşıma                 ││
│ │ > Presenting - Sunma pozu                   ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ Kompozisyon:                                    │
│ ┌─────────────────────────────────────────────┐│
│ │ Entry Point: [Dropdown ▼]                   ││
│ │ > Bottom-right (45° açı, sağ alt köşe)      ││
│ │ > Bottom-left (45° açı, sol alt köşe)       ││
│ │ > Top-corner (üst köşeden giriş)            ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ Işıklandırma: [Dropdown ▼]                     │
│ > Soft Side Light - Yumuşak yan ışık          │
│ > Golden Hour - Altın saat (sıcak)            │
│ > Diffused Window - Pencere ışığı             │
│ > Rim Light - Kenar aydınlatma                │
│                                                 │
│ Mood: [Dropdown ▼]                             │
│ > Elegant (f/2.0, soft shadows, muted tones)  │
│ > Energetic (high contrast, vibrant colors)   │
│                                                 │
│ 📝 Oluşturulan Gemini Prompt (önizleme):       │
│ ┌─────────────────────────────────────────────┐│
│ │ "Elegant feminine hand entering frame from  ││
│ │ bottom-right at 45-degree angle, fingers    ││
│ │ gently cradling the product. Soft side      ││
│ │ light from left, shallow depth of field     ││
│ │ (f/2.0), muted elegant tones..."            ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ [İptal]                           [Kaydet]     │
└─────────────────────────────────────────────────┘
```

**Tema Modal Güncellemesi:**
- Mood dropdown: Teknik açıklamalar + örnek prompt önizleme
- Atmosfer builder: Lighting + color temp + DoF kombinasyonu

**Asset Modal Güncellemesi:**
- Visual properties: Gemini-friendly tag seçicisi
- Material, color, style → Gemini terimleriyle

#### 2.2 Yeni Sayfalar (Opsiyonel)

- `/settings/lighting-presets` - Işık ayarları yönetimi
- `/settings/composition-library` - Kompozisyon şablonları
- `/settings/terminology` - Terim sözlüğü görüntüleme

### Phase 3: Backend Entegrasyonu (2-3 gün)

#### 3.1 Prompt Builder Refactor
```typescript
// orchestrator/promptBuilder.ts

class GeminiPromptBuilder {
  private lightingPresets: Map<string, LightingPreset>;
  private compositions: Map<string, CompositionTemplate>;
  private handPoses: Map<string, HandPose>;
  private moods: Map<string, MoodDefinition>;

  buildScenarioPrompt(scenario: Scenario, assets: AssetSelection): string {
    // Tüm bileşenleri Gemini-native olarak birleştir
  }

  buildNegativePrompt(context: PromptContext): string {
    // Kategori bazlı --no formatında
  }
}
```

#### 3.2 Claude Service Güncelleme
- Asset seçim kuralları Gemini terminolojisiyle
- Mood → Lighting → Color mapping

### Phase 4: Test ve İyileştirme (1-2 gün)

- Her mood için test görsel üretimi
- Prompt kalitesi karşılaştırması (önce/sonra)
- Kullanıcı feedback toplama
- Fine-tuning

---

## 5. Başarı Kriterleri

| Metrik | Mevcut | Hedef |
|--------|--------|-------|
| Prompt tutarlılığı | Değişken | %95+ aynı yapı |
| Kullanıcı anlayışı | Teknik bilgi gerekli | Dropdown ile kolay |
| Görsel kalitesi | Rastgele | Mood'a uygun |
| Hata oranı (Gemini blocked) | ~%5 | <%1 |

---

## 6. Zaman Çizelgesi

```
Hafta 1:
├── Phase 0: Araştırma (Gemini sorular + döküman)
└── Phase 1: Terminoloji ve veri yapısı

Hafta 2:
├── Phase 2: Admin panel UI güncellemeleri
└── Phase 3: Backend entegrasyonu

Hafta 3:
└── Phase 4: Test ve iyileştirme
```

---

## 7. Riskler ve Azaltma

| Risk | Olasılık | Etki | Azaltma |
|------|----------|------|---------|
| Gemini terminolojisi değişebilir | Düşük | Yüksek | Referans dökümanı güncel tut |
| Çok fazla dropdown kullanıcıyı yorar | Orta | Orta | Smart defaults, presets |
| Mevcut senaryolar bozulur | Orta | Yüksek | Migration script, backward compat |

---

## 8. Sonraki Adım

**Hemen yapılacak:**
1. Gemini'ye Phase 0 sorularını sor
2. Yanıtları `GEMINI-TERMINOLOGY-DICTIONARY.md`'ye kaydet
3. Phase 1'e başla

---

## Notlar

- Bu plan yaşayan bir döküman - ilerledikçe güncellenecek
- Her phase sonunda commit + push
- Kullanıcı feedback'i kritik

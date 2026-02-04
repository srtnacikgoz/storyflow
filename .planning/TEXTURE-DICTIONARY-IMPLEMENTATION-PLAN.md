# GEMINI-TEXTURE-DICTIONARY Uygulama Planı

> **Oluşturma Tarihi:** 2026-02-03
> **Son Güncelleme:** 2026-02-03
> **Durum:** 📋 PLAN AŞAMASINDA
> **Kaynak:** `.claude/references/GEMINI-TEXTURE-DICTIONARY.md`

---

## Özet

Bu plan, Gemini 3 Pro Image için optimize edilmiş doku ve kalite terimlerini mevcut prompt pipeline'a entegre etmeyi amaçlar.

### Mevcut Durum
- `geminiPromptBuilder.ts` → Genel prompt oluşturma
- `geminiTerminologyData.ts` → Seed data (ışık, el pozu, kompozisyon, mood, negatif)
- `PRODUCT_TEXTURE_PROFILES` → Kategori bazlı doku terimleri (viennoiserie, chocolate, slice-cakes, coffee vb.)

### Sözlüğün Getirdiği Yenilikler
1. **Işık-Doku Eşleştirme Matrisi** - "Çikolata parlaklığı → Side lighting"
2. **İşe Yaramayan Terimler (Prompt Pollution)** - 8K, 4K, hyper-realistic yasak
3. **Granüler Doku Terimleri** - Alt kategoriler (temper, snap, glaze, cocoa dust)
4. **Temel Prensip** - "Işık Olmadan Doku Olmaz"

---

## Phase 1: Işık-Doku Eşleştirme Matrisi

### Amaç
Sözlükteki "Işık-Doku Eşleştirme Tablosu"nu sisteme entegre et.

### Sözlükteki Tablo
| Malzeme | Önerilen Işık | Neden |
|---------|---------------|-------|
| Çikolata parlaklığı | Side lighting | Specular highlights için |
| Krema dokusu | Soft diffused | Konturları göstermek için |
| Hamur gözenekleri | Backlighting | Translucency için |
| Karamelize kabuk | Side lighting | Texture depth için |
| Mat kakao tozu | Diffused | Yumuşak geçişler için |

### Yapılacak
1. **Yeni veri yapısı:** `TEXTURE_LIGHTING_MAP`
   ```typescript
   interface TextureLightingMapping {
     textureType: string;           // "glossy" | "moist" | "porous" | "matte" | "caramelized"
     recommendedLighting: string;   // "side-lighting" | "soft-diffused" | "backlighting"
     reason: string;                // Neden bu ışık?
     geminiTerms: string[];         // Işık terimleri
   }
   ```

2. **Konum:** `geminiTerminologyData.ts` içine ekle

3. **Fonksiyon:** `suggestLightingForTexture(textureType: string)`
   - Doku tipine göre ışık öner
   - `buildGeminiPrompt` içinde kullan

### Dosyalar
- [ ] `functions/src/orchestrator/seed/geminiTerminologyData.ts` - Yeni mapping ekle
- [ ] `functions/src/orchestrator/geminiPromptBuilder.ts` - Yeni fonksiyon ekle

---

## Phase 2: Prompt Pollution Koruması

### Amaç
İşe yaramayan terimleri otomatik filtrele veya kullanıcıyı uyar.

### Sözlükteki Yasak Terimler
| Terim | Neden İşe Yaramaz |
|-------|-------------------|
| `8K`, `4K`, `ultra HD` | Fiziksel çözünürlüğü değiştirmez |
| `hyper-realistic` | Ters tepebilir, over-processing |
| `photorealistic` | Gereksiz, "a photo of" yeterli |
| `extremely detailed` | Çok genel |
| `best quality` | Anlamsız |
| `cinematic lighting` | Belirsiz |

### Yapılacak
1. **Yeni veri yapısı:** `PROMPT_POLLUTION_TERMS`
   ```typescript
   interface PromptPollutionTerm {
     term: string;
     reason: string;
     severity: "warning" | "block";  // Uyar mı yoksa engelle mi
   }
   ```

2. **Fonksiyon:** `cleanPromptPollution(prompt: string)`
   - Yasak terimleri tespit et
   - Uyar veya temizle
   - Log'a kaydet (decision tracking)

3. **UI Entegrasyonu (Opsiyonel):**
   - Prompt Studio'da kullanıcı bu terimleri yazarsa kırmızı uyarı göster

### Dosyalar
- [ ] `functions/src/orchestrator/seed/geminiTerminologyData.ts` - Pollution list ekle
- [ ] `functions/src/orchestrator/geminiPromptBuilder.ts` - Cleaner fonksiyonu
- [ ] `admin/src/pages/PromptStudio.tsx` (opsiyonel) - UI uyarısı

---

## Phase 3: Granüler Doku Terimleri

### Amaç
Mevcut `PRODUCT_TEXTURE_PROFILES`'ı sözlükteki detaylı terimlerle zenginleştir.

### Sözlükteki Yeni Terimler

#### Çikolata (chocolate)
| Doku Tipi | Mevcut | Sözlük Terimi |
|-----------|--------|---------------|
| Parlak yüzey | `glossy tempered surface` | `tempered chocolate sheen` |
| Glazür | - | `mirror glaze surface reflecting soft window light` |
| Kıvrım parlaması | - | `specular highlights on curved chocolate` |
| Kırık doku | - | `snap texture` |
| Toz kaplama | - | `velvety matte cocoa dusting` |

#### Krema (cream)
| Doku Tipi | Mevcut | Sözlük Terimi |
|-----------|--------|---------------|
| Pürüzsüz | - | `silky smooth buttercream finish` |
| Mus | - | `aerated mousse texture` |
| Beze | - | `piped meringue peaks with lightly toasted edges` |
| Ganaj | - | `luscious, thick ganache` |

#### Hamur (viennoiserie)
| Doku Tipi | Mevcut | Sözlük Terimi |
|-----------|--------|---------------|
| Katmanlı | `flaky pastry layers` | `visible flaky laminated layers` |
| Gözenekli | `honeycomb crumb structure` | `moist, open crumb structure` |
| Kabuk | - | `golden-brown baked crust` |
| Tart kenarı | - | `buttery tart shell edge` |

### Yapılacak
1. **Alt kategoriler ekle:**
   - `chocolate-tempered`, `chocolate-glaze`, `chocolate-snap`, `chocolate-cocoa-dust`
   - `cream-buttercream`, `cream-mousse`, `cream-meringue`, `cream-ganache`
   - `pastry-laminated`, `pastry-crumb`, `pastry-crust`, `pastry-tart-edge`

2. **Mapping fonksiyonu:**
   - Ürün tipinden alt doku kategorisini çıkar
   - `getTextureSubProfile(productType, context)`

### Dosyalar
- [ ] `functions/src/orchestrator/seed/geminiTerminologyData.ts` - Alt profiller

---

## Phase 4: Otomatik Doku-Işık Zinciri

### Amaç
`buildGeminiPrompt` fonksiyonunda tam zincir oluştur:
**Ürün Tipi → Baskın Doku → Uygun Işık → Prompt**

### Akış
```
1. Ürün tipi belirlenir (örn: "chocolate")
2. Texture profile çekilir → surfaceType: "glossy"
3. Lighting map'e bakılır → "side-lighting"
4. Lighting preset seçilir → "dramatic-side"
5. Prompt oluşturulur
```

### Yapılacak
1. **`buildGeminiPrompt` güncellemesi:**
   - Texture profile'dan `surfaceType` al
   - Surface type'a göre lighting öner (manuel seçim yoksa)
   - Decision log'a kaydet

2. **Fallback mekanizması:**
   - Manuel ışık seçimi varsa → Onu kullan
   - Yoksa → Doku-ışık eşleştirmesini kullan
   - O da yoksa → Genel "soft-diffused" kullan

### Dosyalar
- [ ] `functions/src/orchestrator/geminiPromptBuilder.ts` - Chain logic

---

## Phase 5: Sözlük Senkronizasyonu (Opsiyonel)

### Amaç
Sözlük dökümanı ile kod arasında tutarlılık sağla.

### Yapılacak
1. **Referans linki:** Kod yorumlarında sözlüğe referans ver
2. **Versiyon takibi:** Sözlük güncellendiğinde kodu da güncelle
3. **Test:** Sözlükteki örnek prompt'ları test olarak kullan

---

## Öncelik Sıralaması

| Phase | Öncelik | Zorluk | Etki |
|-------|---------|--------|------|
| Phase 1: Işık-Doku Matrisi | 🔴 Yüksek | Orta | Yüksek |
| Phase 2: Pollution Koruması | 🟡 Orta | Kolay | Orta |
| Phase 3: Granüler Terimler | 🟡 Orta | Orta | Yüksek |
| Phase 4: Otomatik Zincir | 🔴 Yüksek | Zor | Çok Yüksek |
| Phase 5: Senkronizasyon | 🟢 Düşük | Kolay | Düşük |

---

## Tahmini İş Yükü

| Phase | Dosya Sayısı | Değişiklik Boyutu |
|-------|--------------|-------------------|
| Phase 1 | 2 | ~100 satır |
| Phase 2 | 2-3 | ~80 satır |
| Phase 3 | 1 | ~150 satır |
| Phase 4 | 1 | ~50 satır |
| Phase 5 | - | Sadece yorum |

**Toplam:** ~380 satır yeni/değiştirilmiş kod

---

## Test Planı

### Manuel Test
1. **Çikolata görseli üret:**
   - Beklenti: Side lighting otomatik seçilmeli
   - Prompt'ta `tempered chocolate sheen` veya `specular highlights` olmalı

2. **Kruvasan görseli üret:**
   - Beklenti: Backlighting önerilmeli (gözenekler için)
   - Prompt'ta `visible flaky laminated layers` olmalı

3. **Pollution testi:**
   - Prompt'a "8K ultra HD" ekle
   - Beklenti: Uyarı veya otomatik temizleme

### Otomatik Test (Opsiyonel)
```typescript
describe("TextureLightingMapping", () => {
  it("should suggest side lighting for glossy textures", () => {
    const lighting = suggestLightingForTexture("glossy");
    expect(lighting.direction).toBe("side-lighting");
  });
});
```

---

## Riskler ve Azaltma

| Risk | Olasılık | Etki | Azaltma |
|------|----------|------|---------|
| Mevcut prompt'lar bozulur | Orta | Yüksek | Fallback mekanizması koru |
| Firestore quota aşımı | Düşük | Orta | Cache'i koru |
| Çelişen terimler | Orta | Orta | Decision log ile izle |

---

## Sonraki Adımlar

1. [ ] Kullanıcı onayı al
2. [ ] Phase 1'den başla (Işık-Doku Matrisi)
3. [ ] Her phase sonrası test et
4. [ ] Gerekirse sözlüğü güncelle

---

## Gemini'ye Sorulacak Soru

Bu planı Gemini'nin değerlendirmesi için:

> "Bu GEMINI-TEXTURE-DICTIONARY implementasyon planını incele. Özellikle şu konularda geri bildirim ver:
> 1. Işık-Doku eşleştirme mantığı doğru mu?
> 2. Alt doku kategorileri yeterli mi?
> 3. Prompt pollution listesinde eksik terim var mı?
> 4. Otomatik zincir (ürün → doku → ışık) yaklaşımı riskli mi?"

---

**Son Güncelleme:** 2026-02-03

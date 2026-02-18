# Derin Arastirma Raporu: Orchestrator.ts Komple Analiz

## Ozet
Orchestrator.ts ~2500 satirlik monolitik bir dosya. Uc temel sorun tespit edildi: (1) Diversity block kullanicinin tema secimini sessizce eziyor ve Uretim Kontrolu modal'i yanlis bilgi gosteriyor, (2) Aksesuar secimi hardcoded 5 opsiyon + cesiltilik mekanizmasi yok = hep gozluk, (3) ProductType belirleme ve senaryo secimi birbirinden bagimsiz iki noktada yapiliyor, tutarsizliga yol aciyor.

## Kok Nedenler

### 1. Diversity Block Tema Senaryosunu Eziyor
**Kok neden:** productType belirleme (satir 595-623) ve senaryo secimi (satir 1130-1279) FARKLI asamalarda yapiliyor. Normal modda productType tema senaryosunun ilk suggestedProducts'indan alinir (diversity kontrolu OLMADAN), ama gercek senaryo secimi Stage 2'de diversity block UYGULANARAK yapilir. Sonuc: productType ile secilen senaryo uyumsuz olabiliyor.

**Kanitlar:**
1. **orchestrator.ts:602-606** - Normal modda productType belirleme: `themeScenario = normalScenarios[0]` → `suggestedProducts[0]` → diversity KONTROL EDİLMEZ
2. **orchestrator.ts:1165-1167** - Stage 2 senaryo secimi: `filteredScenarios.filter(s => !blockedScenarios.includes(s.id))` → diversity UYGULANIR
3. **orchestrator.ts:1170-1173** - Fallback: tum senaryolar blokluysa `themeFilteredScenarios` kullanilir (diversity GORMEZDEN GELİNİR)

**Veri Akisi:**
```
[Tema secildi] → [productType = chocolates (diversity YOK)] → [Asset yukle (chocolates)]
→ [Stage 2: Senaryo sec] → [Diversity block: tema senaryosu BLOKLU]
→ [Fallback: tema senaryolarina don] → [Ama productType ZATEN belirlendi: chocolates vs pastas TUTARSIZLIK]
```

**NOT:** Log'larda `productType: "pastas"` gorunuyor. Bu, fallback senaryosunun `suggestedProducts: ["pastas"]` oldugu anlamina geliyor. Yani diversity block calisti, baska senaryo secildi, AMA productType farkli bir asamada belirlendiginden tutarsizlik olustu.

### 2. Aksesuar Hep Gozluk
**Kok neden:** Aksesuar asset secimi devre disi (`orchestrator.ts:920-924`), referans gorsel gonderilmiyor, yerine hardcoded 5 opsiyonlu bir prompt var (`geminiPromptBuilder.ts:1174`). Cesitlilik mekanizmasi yok.

**Kanitlar:**
1. **orchestrator.ts:920-924** - `accessory: { enabled: false }` → aksesuar asset secimi devre disi
2. **geminiPromptBuilder.ts:1174** - Hardcoded: `"a closed book, a smartphone, a keychain, reading glasses, or a small notebook"`
3. **referenceBuilder.ts** - Aksesuar referans gorseli GONDERILMIYOR

### 3. Uretim Kontrolu Modal'i Yanlis Bilgi Gosteriyor
**Kok neden:** Pre-flight validation (pipelineController.ts:189-317) diversity block'u kontrol etmiyor. İlk senaryodan productType aliyor ve gosteriyor, ama pipeline farkli senaryo secebilir.

**Kanitlar:**
1. **pipelineController.ts:251** - `primaryScenario = themeScenarios[0]` → diversity KONTROL EDİLMEZ
2. **pipelineController.ts:256-258** - `determinedProductType = primaryScenario.suggestedProducts[0]` → gercek pipeline bunu kullanmayabilir
3. **Kullanici deneyimi:** Modal "chocolates" dedi, pipeline "pastas" uretti

---

## Tam Pipeline Akisi

```
[1. Tema Yukleme]
  orchestrator.ts:249-272
  themeId → Firestore → themeData
  themeFilteredScenarios = allScenarios.filter(themeData.scenarios)

[2. Mod Belirleme]
  orchestrator.ts:202
  isAutoMode = isRandomMode === true

[3. ProductType Belirleme] ⚠️ DIVERSITY KONTROL YOK
  NORMAL: orchestrator.ts:595-623
    normalScenarios[0].suggestedProducts[0] → productType
  AUTO: orchestrator.ts:628-683
    diversity block uygulanir → autoScenarios → random → suggestedProducts → productType

[4. Asset Yukleme]
  orchestrator.ts:702
  loadAvailableAssets(productType) → products, tables, plates, cups, vb.

[5. PreferredTags Diversity Muafiyet]
  orchestrator.ts:747-777
  Tercih edilen asset'leri blockedTables/Plates/Cups'tan cikar

[6. __none__ Kontrolu]
  orchestrator.ts:926-942
  preferredTags.table/plate/cup === ["__none__"] → o kategoriyi bosalt

[7. RuleEngine PreFilter]
  orchestrator.ts:813
  blocked + inactive + patron exclude + urun uyumluluk

[8. RuleEngine Scoring]
  orchestrator.ts:817
  Asset puanlama

[9. RuleEngine Threshold]
  orchestrator.ts:820
  Esik alti eleme

[10. PreferredTags Bonus]
  orchestrator.ts:827-856
  Tercih edilen tag'lere +15 bonus/tag

[11. Plate Filter]
  orchestrator.ts:858-918
  productTags → "X tabagi" eslestirme + preferredTags override

[12. Cup/Beverage Filter]
  orchestrator.ts:944-1003
  productType → beverageRules → tagMappings → fincan filtreleme + preferredTags override

[13. Gemini Asset Secimi]
  orchestrator.ts:1005-1015
  qualifiedAssets → Gemini → final asset secimi

[14. Senaryo Secimi] ⚠️ DIVERSITY BURADA UYGULANIR
  orchestrator.ts:1130-1279
  themeFilteredScenarios → productType filter → diversity block → Gemini/direkt secim
  Fallback: tum bloklu → tema senaryolarina don

[15. Prompt Olusturma]
  orchestrator.ts:2337-2350
  buildGeminiPrompt({ moodId, handPoseId, compositionId, productType, ... })
  geminiPromptBuilder.ts → sahne, el, kompozisyon, atmosfer, aksesuar

[16. Gorsel Uretim]
  Gemini Pro Image → referans gorseller + prompt → final gorsel
```

---

## Sorun Noktalari Ozeti

| # | Sorun | Dosya:Satir | Siddet |
|---|-------|------------|--------|
| 1 | ProductType diversity'siz belirleniyor (NORMAL mod) | orchestrator.ts:602-606 | KRİTİK |
| 2 | Pre-flight modal diversity block bilmiyor | pipelineController.ts:251 | KRİTİK |
| 3 | Aksesuar hardcoded 5 opsiyon | geminiPromptBuilder.ts:1174 | ORTA |
| 4 | Aksesuar cesitlilik mekanizmasi yok | - | ORTA |
| 5 | ProductType + Senaryo secimi iki farkli asamada | orchestrator.ts:595 vs 1130 | MİMARİ |
| 6 | Monolitik dosya (~2500 satir) | orchestrator.ts | MİMARİ |

---

## Cozum Onerileri

### Oneri 1: Tema Seciliyken Diversity Block'u Senaryo Icin Devre Disi Birak (ACIL)
- **Dosya:** `orchestrator.ts:1165-1167`
- **Degisiklik:** Tema secili ve tum senaryolar blokluysa, diversity block'u GORMEZDEN GEL (mevcut fallback mantigi zaten bunu yapiyor ama productType tutarsizligi kaliyor)
- **Gercek fix:** ProductType belirlemeyi senaryo seciminden SONRA yap, boylece secilen senaryonun suggestedProducts'i kullanilir
- **Risk:** Dusuk — zaten fallback olarak ayni sey yapiliyor
- **Yan etki:** Yok

### Oneri 2: ProductType Belirlemeyi Senaryo Seciminden Sonraya Tasi (MİMARİ)
- **Dosya:** `orchestrator.ts:595-623` ve `1257-1274`
- **Degisiklik:** Mevcut: productType (adim 3) → asset yukle (adim 4) → senaryo sec (adim 14). Olmasi gereken: senaryo sec → productType belirle → asset yukle
- **Risk:** Yuksek — pipeline siralamasi degisir, birden fazla asamayi etkiler
- **Yan etki:** Asset yukleme ve beverage filtreleme sirasi degisir

### Oneri 3: Aksesuar Cesitlilik Mekanizmasi (ORTA)
- **Dosya:** `geminiPromptBuilder.ts:1174`
- **Degisiklik:** Hardcoded listeyi Firestore config'e tasi + son kullanilan aksesuari prompt'tan cikar + rotation ekle
- **Risk:** Dusuk
- **Yan etki:** Yok

### Oneri 4: Pre-flight Modal Diversity Bilgisi (ORTA)
- **Dosya:** `pipelineController.ts:251`
- **Degisiklik:** Validation endpoint'inde diversity block kontrolu ekle, blocked senaryolari goster, "senaryo degisebilir" uyarisi ver
- **Risk:** Dusuk
- **Yan etki:** Yok

### Oneri 5: Orchestrator Refactoring (UZUN VADELI)
- **Dosya:** Tum `orchestrator.ts`
- **Degisiklik:** Monolitik dosyayi modullere ayir: ThemeResolver, ScenarioSelector, AssetPipeline, PromptAssembler
- **Risk:** Yuksek — kapsamli degisiklik
- **Yan etki:** Tum pipeline etkilenir

---

## Kontrol Listesi
- [ ] ProductType belirleme siralamasini duzelt (senaryo seciminden SONRA)
- [ ] Pre-flight modal'a diversity block uyarisi ekle
- [ ] Aksesuar listesini config'e tasi
- [ ] Aksesuar cesitlilik mekanizmasi ekle
- [ ] Build kontrolu (functions + admin)
- [ ] Deploy sonrasi en az 3 farkli temayla test

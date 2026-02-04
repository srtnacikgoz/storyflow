# Prompt Pipeline V2 - Açık Sorunlar

> **Oluşturma Tarihi:** 2026-02-02
> **Son Güncelleme:** 2026-02-03
> **Durum:** 🟢 BÜYÜK ÖLÇÜDE DÜZELTİLDİ
> **İlişkili:** PROMPT-PIPELINE-SORUNLARI.md, PROMPT-PIPELINE-FIX-PLAN.md

---

## Özet

V1 düzeltmeleri sonrası tespit edilen sorunlar ve çözüm durumları.

| # | Sorun | Öncelik | Durum | Düzeltme |
|---|-------|---------|-------|----------|
| 1 | BUSINESS CONTEXT hayali ortam yaratıyor | 🔴 Kritik | ✅ DÜZELTİLDİ | 2026-02-03 |
| 2 | Prompt çok uzun/çelişkili | 🔴 Kritik | ✅ AZALTILDI | 2026-02-03 |
| 3 | Senaryo-ürün filtreleme yok | 🔴 Kritik | ✅ ZATEN VARDI | Kod kontrolü |
| 4 | Senaryo açıklamasında hardcoded ürün adı | 🔴 Kritik | ✅ DEĞERLENDİRİLDİ | Seed data temiz |
| 5 | Referans ortam korunmuyor (text2img vs img2img) | 🔴 Kritik | ✅ DÜZELTİLDİ | 2026-02-03 |

---

## ✅ SORUN 1: BUSINESS CONTEXT Hayali Ortam Yaratıyor - DÜZELTİLDİ

**Düzeltme Tarihi:** 2026-02-03

**Dosya:** `geminiPromptBuilder.ts:752-799`

**Yapılan:**
- BUSINESS CONTEXT bölümü **prompt'a eklenmiyor** artık
- Sadece decision log'a kaydediliyor (debugging için)
- Veri kaybedilmiyor ama prompt'u kirletmiyor

**Kod Değişikliği:**
```typescript
// ÖNCEKİ: promptParts.push(`${businessContext.promptContext}`);
// YENİ: Sadece log'a yazılıyor, prompt'a eklenmiyor
console.log(`[GeminiPromptBuilder] Business context SKIPPED - referans görseller öncelikli.`);
```

**Gerekçe (Gemini Analizi):**
> "Metin promptu referansı silmez ama 'yeniden yorumlar'. 'Ground floor patisserie with floor-to-ceiling windows' gibi tarifler görseldeki perspektifi bükebilir."

---

## ✅ SORUN 2: Prompt Çok Uzun ve Çelişkili - AZALTILDI

**Düzeltme Tarihi:** 2026-02-03

**Yapılan:**
- BUSINESS CONTEXT kaldırıldı
- SCENARIO CONTEXT kaldırıldı
- Prompt artık daha kısa ve odaklı

**Kalan Bölümler:**
- MOOD (atmosfer)
- LIGHTING (ışık)
- COMPOSITION (kompozisyon)
- ASSET RULES (referans kuralları)

**Sonuç:** Çelişki riski azaltıldı, referans görseller öncelikli hale geldi.

---

## ✅ SORUN 3: Senaryo-Ürün Filtreleme - ZATEN VARDI

**Kontrol Tarihi:** 2026-02-03

**Dosya:** `orchestrator.ts:795-810`

**Durum:** Kod incelemesi sonucu filtreleme ZATEN MEVCUTTU:
```typescript
const productTypeFiltered = filteredScenarios.filter(s => {
  const scenario = s as FirestoreScenario;
  if (!scenario.suggestedProducts || scenario.suggestedProducts.length === 0) {
    return true; // Tanımlı değilse tüm ürünlerle uyumlu
  }
  return scenario.suggestedProducts.includes(productType);
});
```

**Not:** Döküman oluşturulduğunda bu kod zaten vardı ama fark edilmemişti.

---

## ✅ SORUN 4: Senaryo Açıklamasında Hardcoded Ürün Adı - DEĞERLENDİRİLDİ

**Kontrol Tarihi:** 2026-02-03

**Dosya:** `defaultData.ts:68-335` (seed data)

**Durum:** Seed data incelemesi sonucu description'lar GENEL ve TEMİZ:

| Senaryo | Description | Durum |
|---------|-------------|-------|
| zarif-tutma | "Bakımlı el ürün tutuyor. Premium, şık görünüm." | ✅ Temiz |
| cam-kenari | "Pencere önü, doğal ışık. Aydınlık, ferah atmosfer." | ✅ Temiz |
| kahve-ani | "Eller fincan tutuyor, ürün ön planda." | ✅ Temiz |

**Ek Önlem:** `scenarioDescription` artık prompt'a eklenmiyor (SORUN 5 çözümü ile birlikte).

**Not:** Dökümanın iddia ettiği "delicately break a flaky, golden croissant" ifadesi seed data'da YOK. Muhtemelen Firestore'da manuel değiştirilmiş olabilir veya döküman eski.

---

## ✅ SORUN 5: Referans Ortam Korunmuyor - DÜZELTİLDİ

**Düzeltme Tarihi:** 2026-02-03

**Dosyalar:**
- `orchestrator.ts:2024-2047` (buildDynamicPromptWithGemini)
- `orchestrator.ts:1711-1717` (getScenarioPrompt)
- `orchestrator.ts:2430-2435` (buildDynamicPromptLegacy)

**Yapılan:**
- SCENARIO CONTEXT tüm lokasyonlardan **kaldırıldı**
- `scenarioDescription` artık prompt'a eklenmiyor
- Sadece log'a yazılıyor (debugging için)

**Kod Değişikliği:**
```typescript
// ÖNCEKİ: prompt = `SCENARIO CONTEXT: ${scenarioDescription}\n\n${prompt}`;
// YENİ: Sadece log'a yazılıyor
console.log(`[Orchestrator] Scenario description SKIPPED - referans görseller öncelikli.`);
```

**Gerekçe (Gemini Analizi):**
> "Semantik çatışma yaşanıyor. 'Pencere önü, doğal ışık' gibi tarifler bile referans görselle çelişebilir. Çözüm: Inpainting veya metin tariflerini kaldırma."

---

## 🔬 Kök Neden Analizi - ÇÖZÜLDÜ

```
SORUN:
                    METIN AÇIKLAMALARI
                          ↓
    ┌─────────────────────┼─────────────────────┐
    ↓                     ↓                     ↓
BUSINESS CONTEXT    SCENARIO CONTEXT      MOOD CONTEXT
"zemin kat dükkan"  "pencere önü"         "cozy cafe"
    ↓                     ↓                     ↓
    └─────────────────────┴─────────────────────┘
                          ↓
              PROMPT'TA ORTAM TARİFİ
                          ↓
         REFERANS GÖRSELLER OVERRIDE EDİLİYOR

ÇÖZÜM:
                    METIN AÇIKLAMALARI
                          ↓
    ┌─────────────────────┼─────────────────────┐
    ↓                     ↓                     ↓
BUSINESS CONTEXT    SCENARIO CONTEXT      MOOD CONTEXT
   ❌ DEVRE DIŞI        ❌ DEVRE DIŞI      ✅ SADECE ATMOSFER

                    REFERANS GÖRSELLER
                          ↓
              ORTAM BİLGİSİ BURADAN GELİYOR ✅
```

---

## 📋 Tamamlanan Adımlar

- [x] Sorun 3: `suggestedProducts` filtreleme - ZATEN VARDI
- [x] Sorun 4: Senaryo description'ları - Seed data temiz, ek önlem alındı
- [x] Sorun 1: BUSINESS CONTEXT - DEVRE DIŞI BIRAKILDI
- [x] Sorun 2: Prompt uzunluğu - AZALTILDI
- [x] Sorun 5: SCENARIO CONTEXT - DEVRE DIŞI BIRAKILDI

---

## 🔜 Sonraki Adımlar

- [ ] **TEST:** Yeni pipeline ile görsel üret, ortam korunuyor mu kontrol et
- [ ] **İZLEME:** Decision log'lardan kaldırılan bölümlerin etkisini takip et
- [ ] **GERİ DÖNÜŞ:** Eğer stil/atmosfer eksikliği yaşanırsa, sadece ışık/renk bilgisi eklenmesi değerlendirilebilir

---

## 📝 Teknik Detaylar

### Değiştirilen Dosyalar

| Dosya | Satırlar | Değişiklik |
|-------|----------|------------|
| `geminiPromptBuilder.ts` | 752-799 | BUSINESS CONTEXT devre dışı |
| `orchestrator.ts` | 2024-2047 | SCENARIO CONTEXT devre dışı (buildDynamicPromptWithGemini) |
| `orchestrator.ts` | 1711-1717 | SCENARIO CONTEXT devre dışı (getScenarioPrompt) |
| `orchestrator.ts` | 2430-2435 | SCENARIO CONTEXT devre dışı (buildDynamicPromptLegacy) |
| `orchestrator.ts` | 23-34 | FirestoreScenario import eklendi |

### Build Durumu

```bash
npm run build  # ✅ Başarılı
```

---

**Son Güncelleme:** 2026-02-03 (Claude tarafından)

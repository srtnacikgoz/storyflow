# Tema ↔ Kompozisyon Template Çatışma Analizi
**Tarih:** 2026-02-10 | **Agent:** Explore (Sonnet)

---

## 6 Çakışma Noktası

### 1. ASSET TAG'LERİ — ÇİFTE KOMUTA
- **Tema:** `preferredTags.table/plate/cup` → PROMPT'a gider (Gemini constraint)
- **Template:** `slot.filterTags` → HAVUZDAN seçim filtresi
- **Sorun:** Template ahşap masa seçer, ama tema mermer diyor prompt'ta → Gemini karışır
- **Satır:** orchestrator.ts:2106 (tema), 2934 (template)

### 2. TEMA BAĞI — OPSİYONEL AMA BİLGİSİZ
- Template `themeId` var ama tema setting'ini OKUMUYOR
- Template slot'ları tema preferredTags'dan HABERSIZ
- **Satır:** types.ts:2182, orchestrator.ts:835-838

### 3. ESTETİK KURALLAR — TEMPLATE BİLMİYOR
- Tema: weather/lighting/atmosphere presetleri
- Template: Sadece asset ID veya filterTags
- Template estetik kurallardan habersiz → "bulutlu ışık" ama "güneşli pencere kenarı masa" seçebilir
- **Satır:** geminiPromptBuilder.ts:741-775

### 4. İZİN SİSTEMİ — BYPASS RİSKİ
- Tema: `petAllowed=false, accessoryAllowed=false`
- Template: `decor` slot enabled
- Pipeline bu çelişkiyi KONTROL ETMİYOR → template bypass eder
- **Satır:** types.ts:1105-1107

### 5. SENARYO BAĞI — ÇAKIŞMA
- Tema: `scenarios = ["A", "B"]`
- Template: `scenarioId = "C"` (tema dışı)
- Pipeline tema filtresini ÖNCE uygular → template scenarioId yok sayılabilir
- **Satır:** orchestrator.ts:248, 835

### 6. ASSET HAVUZU — İKİ FARKLI AŞAMADA
- Tema preferredTags → prompt'a (havuz dışında)
- Template filterTags → havuzdan seçimde
- İki farklı aşamada, tutarsızlık riski
- **Satır:** orchestrator.ts:2106, 2934

## Kritik Risk
**Tema "mermer masa" der, template "ahşap masa" seçer → referans görsel ahşap, prompt mermer → Gemini karışır.**

# Senaryo Admin UI Araştırması
**Tarih:** 2026-02-10 | **Agent:** Explore (Sonnet)

---

## 1. Senaryo Listesi Sayfası

**Sayfa:** `admin/src/pages/Scenarios.tsx`

**Görünür Alanlar:**
- Senaryo Adı (name)
- Açıklama (description)
- Badge'ler: "El var", "Interior", "Pasif"
- Kompozisyon (compositionId)
- Önerilen Ürünler (suggestedProducts)
- El Pozu (handPose) — sadece el senaryolarda

## 2. Senaryo Oluşturma/Düzenleme Formu

**Modal:** Scenarios.tsx (satır 731-1061)

### Temel Bilgiler
- **Senaryo Adı*** — text input, Title Case (satır 753)
- **Açıklama*** — textarea + AI üretim özelliği (satır 770-817)

### Senaryo Tipi
- **El İçeren Senaryo** — checkbox → includesHands (satır 850)
- **Mekan Fotoğrafı** — checkbox → isInterior (satır 862)
  - Interior Türü dropdown (interior aktifse)

### Ürün Tercihleri
- **Önerilen Ürün Tipleri** — multi-checkbox → suggestedProducts (satır 901-928)
  - croissants, pastas, chocolates, coffees

### El Detayları (includesHands=true ise)
- **El Nasıl Tutsun?** — dropdown → handPose (satır 947)
- **El Nereden Girsin?** — dropdown → compositionEntry (satır 965)

### Kompozisyon
- **Fotoğraf Kompozisyonu*** — dropdown → compositionId (satır 1007) — ZORUNLU

## 3. Dashboard'da Senaryo

**Senaryo seçim dropdown'ı YOK.** Tema seçimi var, senaryo otomatik belirleniyor.

State'ler: themes, selectedThemeId, compositionTemplates, selectedTemplateId
Tema kartlarında ilk 2 senaryo ID'si gösterilir.

## 4. Template Modal'da Senaryo

- Senaryo Dropdown (scenarioId) — opsiyonel (CompositionTemplates.tsx:453-469)
- Template kartlarında senaryo adı badge olarak gösterilir

## 5. Tema Sayfasında Senaryo

- Tekil senaryo seçimi (Themes.tsx:1003-1069)
- Backend'e `[form.scenario]` array olarak gönderilir

## 6. Senaryo API Çağrıları

| Fonksiyon | Kullanım |
|-----------|---------|
| listScenarios() | api.ts:1273-1298 |
| getGeminiPresets() | api.ts:1301-1367 (el pozları, kompozisyonlar) |
| generateScenarioDescription() | api.ts:1980-1995 (AI üretim) |

**Not:** Frontend'de Scenario tip tanımı yok (admin/src/types/index.ts'de export edilmemiş).

## Kritik Bulgular

1. Dashboard'da manuel senaryo seçimi YOK — tema seçimi yeterli
2. Frontend Scenario tipi export edilmemiş — yerel interface'ler kullanılıyor
3. compositionId zorunlu alan (modal validation)
4. AI açıklama üretimi mevcut (Gemini entegrasyonu)
5. Senaryolarda tag sistemi YOK (Theme ve Asset'te var)

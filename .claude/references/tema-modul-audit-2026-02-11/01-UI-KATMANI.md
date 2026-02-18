# Tema UI Katmanı Araştırması

> **Dosya:** `admin/src/pages/Themes.tsx` (1434 satır)
> **Tarih:** 2026-02-11

---

## 1. Form Alanları ve Efektivite

| Alan | Tip | Efektif mi? | Açıklama |
|------|-----|-------------|----------|
| Tema ID | text input | Orta | Sadece yeni temada, otomatik slug |
| Tema Adı | text input | Orta | Prompt'a GİRMİYOR, sadece metadata |
| Açıklama | textarea + AI | ZAYIF | Prompt sonuna "THEME CONTEXT:" olarak yapıştırılıyor |
| Senaryo | select (tekil) | GÜÇLÜ | Pipeline'ın temel yönlendiricisi |
| Köpek İzni | checkbox | ORTA | Senaryo filtreleme ile dolaylı etki |
| Aksesuar İzni | checkbox + tag input | ORTA | Referans görsel seçimi, prompt metniyle DEĞİL |
| Masa Tercihi | multi-select dropdown | GÜÇLÜ | preferredTags → asset seçimini override |
| Tabak Tercihi | multi-select dropdown | GÜÇLÜ | preferredTags → asset seçimini override |
| Fincan Tercihi | multi-select dropdown | GÜÇLÜ | preferredTags → asset seçimini override |
| Hava Durumu | select | GÜÇLÜ | SCENE SETTING bölümüne doğrudan prompt metni |
| Işık | select | GÜÇLÜ | LIGHTING bölümüne doğrudan prompt metni |
| Atmosfer | select | GÜÇLÜ | SCENE SETTING bölümüne doğrudan prompt metni |

---

## 2. UI Akıllıcılık (İyi Çalışan)

### WEATHER_AUTO_MAP (Themes.tsx:65-71)
Hava durumu seçilince ışık + atmosfer otomatik ayarlanıyor:
- bright-sunny → morning-bright + energetic-brunch
- soft-overcast → soft-diffused + casual-relaxed
- rainy → window-warm + cozy-evening
- golden-hour → dramatic-side + romantic-dreamy
- cloudy-neutral → soft-diffused + peaceful-morning

Kullanıcı override edebiliyor — iyi UX.

### `__none__` Özel Değeri
Masa/tabak/fincan'da "sahnede olmasın" seçeneği. Akıllıca tasarlanmış.

### AI ile Açıklama Üretimi (Themes.tsx:853-869)
Tema adına göre Gemini açıklama üretiyor. Loading overlay var.

---

## 3. UI Sorunları

### Sorun 1: Tooltip Tutarsızlığı
- Masa tercihinde tooltip VAR (Themes.tsx:1083-1086)
- Tabak tercihinde tooltip YOK (Themes.tsx:1166-1168)
- Fincan tercihinde tooltip YOK (Themes.tsx:1237-1239)

### Sorun 2: Çeşitlilik Kuralları Yanlış Yerde
Çeşitlilik kuralları (Themes.tsx:638-785) tema sayfasında ama:
- Tema-specific DEĞİL, global config
- `api.getOrchestratorConfig()` / `api.updateOrchestratorConfig()` ile çalışıyor
- Tema CRUD'dan tamamen bağımsız
- Kendi sayfası veya Settings'e taşınmalı

Kurallar:
- Senaryo Aralığı (scenarioGap) — default 3
- Masa Aralığı (tableGap) — default 2
- El Stili Aralığı (handStyleGap) — default 4
- Kompozisyon Aralığı (compositionGap) — default 2
- Köpek Frekansı (petFrequency) — default 15
- Benzerlik Eşiği (similarityThreshold) — default %50

### Sorun 3: Hardcoded Asset SubType Keyword'leri
```
Themes.tsx:175: tableKeywords = ["tables", "table", "masa", "masalar"]
Themes.tsx:193: plateKeywords = ["plates", "plate", "tabak", "tabaklar"]
Themes.tsx:202: cupKeywords = ["cups", "cup", "fincan", "fincanlar", "bardak", "bardaklar"]
```
Firestore subType naming convention'ı değişirse sessizce bozulur.

### Sorun 4: Çift API Çağrısı
```
Themes.tsx:169-173:
  api.listAssets({ category: "furniture" })  // İngilizce
  api.listAssets({ category: "Mobilya" })    // Türkçe
```
Firestore naming tutarsızlığını hack'liyor. Performans kaybı.

### Sorun 5: scenarios Array vs Tekil UI
- Backend: `scenarios: string[]` (çoklu)
- UI: `scenario: ""` (tekil select)
- Submit'te: `const scenariosArray = form.scenario ? [form.scenario] : []`
- Array desteği var ama UI tek senaryo seçtiriyor

---

## 4. State Yönetimi

### Yüklenen Veriler (useEffect — Themes.tsx:135-141)
1. `loadThemes()` — Tema listesi
2. `loadScenarios()` — Tüm senaryolar (senaryo dropdown için)
3. `loadVariationRules()` — Orchestrator config
4. `loadTableTags()` — Masa asset tag'leri
5. `loadPropTags()` — Tabak + fincan tag'leri

### Form State
- `form` state: emptyTheme şablonu ile başlıyor (Themes.tsx:74-91)
- openModal'da tema verileri form'a map'leniyor (Themes.tsx:276-299)
- preferredTags → flat array'lere açılıyor (preferredTableTags, preferredPlateTags, preferredCupTags)
- Submit'te geri nested objeye sarılıyor (Themes.tsx:319-324)

### API Çağrıları
- `api.listThemes()` — GET
- `api.createTheme()` — POST
- `api.updateTheme()` — PUT
- `api.deleteTheme()` — DELETE
- `api.listScenarios()` — GET (senaryo listesi)
- `api.listAssets()` — GET (tag'ler için)
- `api.getOrchestratorConfig()` — GET (çeşitlilik kuralları)
- `api.updateOrchestratorConfig()` — PUT (çeşitlilik kuralları)
- `api.generateThemeDescription()` — POST (AI açıklama)

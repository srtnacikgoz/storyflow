# Senaryo Pipeline Akışı Araştırması
**Tarih:** 2026-02-10 | **Agent:** Explore (Sonnet)

---

## Başlangıç Noktası

Dashboard "Şimdi Üret" → `scheduler.ts:389-437 generateNow()` → `orchestrator.runPipeline()`
Alternatif: Cloud Scheduler otomatik (`scheduler.ts:67-154 checkAndTrigger()`)

## Pipeline Aşamaları

### A. Pre-Stage: Tema Yükleme (satır 232-265)
- `allScenarios = effectiveRules.staticRules.scenarios`
- Tema varsa → `themeData.scenarios.includes(s.id)` ile filtrele
- Interior-only tema kontrolü: `themeFilteredScenarios.every(s => s.isInterior)`

### B. Interior-Only Tema → Hızlı Çıkış (satır 440-574)
- Rastgele interior senaryo seç
- AI üretimi atlanır, mevcut fotoğraf kullanılır
- Stage 1-5 bypass → direkt Telegram'a

### C. Normal Mod: ProductType Belirleme (satır 583-611)
- ProductType yoksa → tema senaryosunun `suggestedProducts[0]` kullanılır

### D. Rastgele Mod: Puanlama Algoritması (satır 620-783)
4 kriterli puanlama (Gemini ATLANIR):
1. **Stok uyumluluğu** (0-30 puan): suggestedProducts vs aktif stok
2. **Zaman uyumu** (0-15 puan): Senaryo adı/description'da zaman kelimesi
3. **Yenilik** (0-20 puan): Son 15 üretimde ne kadar önce kullanıldı
4. **Kullanım sıklığı** (0-10 puan): Az kullanılana bonus

### E. Stage 2: Senaryo Seçimi (satır 887-1100)
3 durum:
1. **AUTO MOD:** Puanlama sonucu zaten var → Gemini yok
2. **TEK SENARYO:** Direkt seç → Gemini yok (token tasarrufu)
3. **ÇOKLU SENARYO:** `gemini.selectScenario()` çağrılır

### F. El Stili Seçimi (satır 976-983)
- `includesHands: true` ise → `rulesService.selectHandStyle()`

### G. Interior Split (satır 1105-1170)
- Seçilen senaryo interior ise → Stage 3-5 atlanır, AI üretimi YOK

### H. Stage 3: Prompt Oluşturma (satır 1191-1214)
- scenarioDescription → SCENE DIRECTION
- compositionId → getCompositionDetails
- handStyle → getHandStyleDetails
- handPose, compositionEntry → Gemini'ye

### I. Production History (satır 1576-1592)
Kaydedilenler: scenarioId, compositionId, handStyleId, tableId, productId, plateId, cupId

## Okunan Senaryo Alanları

| Alan | Kullanım | Satır |
|------|---------|-------|
| id | Eşleştirme, history | 479, 989, 1049, 1578 |
| name | Loglama | 480, 590, 970 |
| description | SCENE DIRECTION prompt | 481, 991, 1059, 1837 |
| includesHands | El stili tetikleme | 483, 976, 1006 |
| suggestedProducts | ProductType + filtreleme + puanlama | 592, 676, 760, 899 |
| isInterior | AI bypass | 255, 453, 1050, 1105 |
| interiorType | Interior asset kategorisi | 456, 488, 1107 |
| compositionId | Kompozisyon template | 484, 992, 1054 |
| handPose | Gemini'ye el pozu | 1185 |
| compositionEntry | Gemini'ye giriş noktası | 1186 |

**SONUÇ:** Tüm alanlar aktif kullanımda. Dead code yok.

# Entegrasyon Analiz — Veri Akışı & Orchestrator Bağlantısı

---

## 1. End-to-End Veri Akışı

```
Admin Panel (CompositionTemplates.tsx)
  │ CRUD → api.createCompositionTemplate()
  ▼
compositionController.ts → configService.ts → Firestore
  │
  │ (ayrı akış: üretim tetikleme)
  │
OrchestratorDashboard.tsx
  │ buildCompositionConfig() → compositionConfig oluştur
  │ api.orchestratorGenerateNow(themeId, ..., compositionConfig)
  ▼
pipelineController.ts → scheduler.generateNow()
  ▼
scheduler.runPipelineAsync() → compositionConfig pass through
  ▼
orchestrator.runPipeline(compositionConfig)
  │
  ├─ resolveCompositionAssets() → slot bazlı asset seçimi ✅
  ├─ Scenario selection → compositionConfig.scenarioId YOKSAYILIYOR ❌
  └─ Prompt building → geminiPromptBuilder (farklı scope)
```

---

## 2. Kritik Entegrasyon Sorunları

### SORUN #1: scenarioId Tamamen Yoksayılıyor

**Akış:**
1. Template'de scenarioId saklanıyor (CompositionTemplates.tsx:43)
2. buildCompositionConfig()'de compositionConfig'e aktarılıyor (Dashboard:246)
3. scheduler → orchestrator'a ulaşıyor (scheduler.ts:314)
4. **AMA orchestrator içinde compositionConfig.scenarioId hiç referans edilmiyor!**
5. Senaryo seçimi hâlâ timeSlotRule.scenarioPreference kullanıyor (orchestrator.ts:915-939)

**Etki:** Template'deki senaryo seçimi hiçbir işe yaramıyor.

### SORUN #2: themeId Çift Gönderim

**Dashboard (OrchestratorDashboard.tsx:245, 264):**
```
compositionConfig.themeId = template.themeId || selectedThemeId
orchestratorGenerateNow(selectedThemeId, ..., compositionConfig)
→ themeId İKİ YERDE var
```

**Risk:** template.themeId ≠ selectedThemeId olduğunda hangisi kazanır belli değil.

### SORUN #3: 3 Ayrı "Composition Template" Tanımı

1. **Admin CompositionTemplate** — Slot sistemi (SlotConfig, themeId, scenarioId)
2. **Gemini CompositionTemplate** — Prompt builder presets (geminiPrompt, cameraAngle)
3. **Ölü CompositionTemplate** — functions/src/types/index.ts:914 (entryPoint, köşeden giriş)

`getCompositionTemplate()` fonksiyonu (geminiPromptBuilder.ts:345) Gemini presets'ten çekiyor, Admin template'lerden DEĞİL.

---

## 3. Entegrasyon Kontrol Listesi

| Akış | Durum | Not |
|------|-------|-----|
| Template CRUD | ✅ Tam | API + Firestore çalışıyor |
| Template → Dashboard yükleme | ✅ Tam | selectedTemplateId → buildCompositionConfig |
| Dashboard → Pipeline tetikleme | ⚠️ Kısmi | themeId çift gönderim |
| Pipeline → Asset resolve | ✅ Tam | resolveCompositionAssets() çalışıyor |
| Pipeline → Scenario select | ❌ Kopuk | scenarioId yoksayılıyor |
| Pipeline → Prompt build | ⚠️ Kısmi | Farklı composition template scope |
| Type tutarlılığı | ⚠️ Kısmi | Frontend SlotConfig vs Backend SlotSelection |

---

## 4. Kullanılmayan Alanlar

| Alan | Tanımlandığı yer | Kullanılıyor mu? |
|------|-----------------|-----------------|
| CompositionTemplate.scenarioId | admin/types:1435 | ❌ Pipeline'da yoksayılıyor |
| CompositionTemplate.description | admin/types:1436 | ⚠️ Listede gösterilmiyor |
| CompositionConfig.scenarioId | orchestrator/types:2215 | ❌ Hiçbir yerde kontrol edilmiyor |
| CompositionConfig.sourcePresetId | orchestrator/types:2224 | ❌ Hiçbir yerde set edilmiyor |

---

## 5. Eksik Entegrasyon Akışları

### Eksik #1: Template.scenarioId → Orchestrator
- compositionConfig.scenarioId varsa o senaryo seçilmeli
- Override precedence: compositionConfig.scenarioId > timeSlotRule > AI selection

### Eksik #2: Tema-Senaryo Uyumluluk Kontrolü
- Template formunda tema seçince uyumlu senaryolar filtrelenmeli
- Şu an bağımsız select'ler

### Eksik #3: Tenant Presets UI
- Backend tenant desteği var
- Admin UI'da sadece "system" template'ler yönetiliyor

---

## 6. Asset Resolution Detayı

**Orchestrator.ts:**
- SLOT_TO_ASSET_FIELD mapping (satır 2896-2902): surface→table, dish→plate, drinkware→cup, textile→napkin, decor→cutlery
- selectRandomFromPool() (satır 2925-2954): Tag-based filtering + usageCount weighted + top 50% stratejisi
- Fallback: Filter boşsa tüm havuzdan seç ✅

---

## 7. Slot State Dönüşüm Akışı

```
Frontend "Seç" (manual)
  → Kayıt: { state: "random", filterTags: [...] }  (CompositionTemplates.tsx:147)
  → Firestore: { state: "random", filterTags: [...] }
  → Okuma: { state: "manual" } geri dönüştürülüyor  (CompositionTemplates.tsx:109)

Frontend "Rastgele" (random)
  → Kayıt: { state: "random" }  (filterTags yok)
  → Firestore: { state: "random" }
  → Okuma: { state: "random" }  (dönüşüm yok)
```

**Sorun:** "manual" aslında "filtered random" — naming yanıltıcı.

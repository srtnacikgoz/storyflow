# Dashboard Override Zinciri Analizi
**Tarih:** 2026-02-10 | **Agent:** Explore (Sonnet)

---

## Override Hiyerarşisi

```
1. Dashboard Seçimi (En Yüksek)
2. CompositionConfig Template
3. TimeSlotRule (Scheduler)
4. Sistem Varsayılanları (En Düşük)
```

## Dashboard Seçimleri

### 1. Tema (`selectedThemeId`)
- Dashboard → `overrideThemeId` → `effectiveThemeId`
- Template themeId: sadece dashboard tema boşsa devreye girer
- **Satır:** orchestrator.ts:237, 835-837

### 2. Template (`selectedTemplateId`)
- `buildCompositionConfig()` → slot'lar + themeId + scenarioId
- Template themeId çakışması: `template.themeId || selectedThemeId || undefined`
- **Satır:** OrchestratorDashboard.tsx:233-250

### 3. Aspect Ratio (`selectedAspectRatio`)
- Tek kaynak, çakışma YOK
- **Satır:** orchestrator.ts:1161

### 4. Rastgele Mod (`isRandomMode`)
- true → Akıllı puanlama algoritması (Gemini atlanır)
- Tek kaynak, çakışma YOK
- **Satır:** orchestrator.ts:190

## Tema Çakışma Detayı

```typescript
// Frontend
themeId: template.themeId || selectedThemeId || undefined

// Backend
if (compositionConfig.themeId && !overrideThemeId) {
  overrideThemeId = compositionConfig.themeId; // Template kazanır
}
```

Dashboard tema seçiliyse → Dashboard kazanır
Dashboard tema boşsa → Template themeId kazanır

## Otomatik vs Manuel

- İkisi de aynı `runPipeline` kullanır
- Fark: Otomatik'te `timeSlotRule.themeId` dolu, manuel'de boş
- Dashboard `overrideThemeId` ile tüm kontrolü alır

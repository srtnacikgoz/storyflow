# 07 - Backend Entegrasyon ve Mimari Analiz

---

## API Endpoint Mapping

| Frontend Fonksiyon | Backend Endpoint | Controller |
|-------------------|-----------------|------------|
| api.getSystemSettings() | getSystemSettingsConfig | configController.ts |
| api.updateSystemSettings() | updateSystemSettingsConfig | configController.ts |
| api.getBusinessContext() | getBusinessContextConfig | configController.ts |
| api.updateBusinessContext() | updateBusinessContextConfig | configController.ts |
| api.getAssetSelectionConfig() | getAssetSelectionConfigEndpoint | configController.ts |
| api.updateAssetSelectionConfig() | updateAssetSelectionConfigEndpoint | configController.ts |
| api.getProductSlotDefaults() | getProductSlotDefaultsEndpoint | configController.ts |
| api.updateProductSlotDefaults() | updateProductSlotDefaultsEndpoint | configController.ts |
| api.validateInstagramToken() | validateInstagramToken | instagramController.ts |

---

## Firestore Yapisi

```
global/config/settings/
├── system-settings          ← Settings sayfasinda (scheduler toggle)
├── business-context         ← Settings sayfasinda
├── asset-selection          ← Settings sayfasinda
├── product-slot-defaults    ← Settings sayfasinda
├── timeouts                 ← Settings'te YOK
├── fixed-assets             ← Settings'te YOK
├── diversity-rules          ← Settings'te YOK
├── weekly-themes            ← Settings'te YOK
├── absolute-rules           ← Settings'te YOK
├── time-mood                ← Settings'te YOK
├── orchestrator-instructions ← Settings'te YOK
├── prompt-studio            ← Settings'te YOK (ayri sayfa)
├── rule-engine              ← Settings'te YOK
├── beverage-rules           ← Settings'te YOK
└── slot-definitions         ← Settings'te YOK
```

Settings sayfasinda gosterilen: 4/15 config
Gosterilmeyen: 11/15 config (baska sayfalarda veya hic yonetilmiyor)

---

## State Yonetimi

### Sayfa Acilisinda 6 Paralel Istek

```typescript
useEffect(() => {
  checkToken();                // API 1: Instagram token
  checkTourStatuses();         // localStorage (sync)
  loadSchedulerStatus();       // API 2: getSystemSettings
  loadBusinessContext();       // API 3: getBusinessContext
  loadAssetSelectionConfig();  // API 4: getAssetSelectionConfig
  loadProductSlotDefaults();   // API 5: getProductSlotDefaults
}, [...]);
```

### State Yapisi

| State | Loading State | Saving State | Optimistic Update |
|-------|-------------|-------------|-------------------|
| tokenStatus | loading | - | Hayir |
| schedulerEnabled | null=loading | schedulerToggling | Evet (rollback var) |
| businessContext | businessContextLoading | businessContextSaving | Toggle icin evet |
| assetConfig | assetConfigLoading | assetConfigSaving | Evet (rollback var) |
| slotDefaults | slotDefaultsLoading | slotDefaultsSaving | Evet (rollback var) |
| tourStatuses | - | - | Aninda (localStorage) |

---

## Backend Validation Ozeti

### System Settings
- schedulerEnabled: boolean type check
- claudeInputCostPer1K: 0.001-0.1 range
- claudeOutputCostPer1K: 0.001-0.5 range
- geminiDefaultFaithfulness: 0.0-1.0 range
- maxFeedbackForPrompt: 1-50 integer
- stuckWarningMinutes: 5-60 integer
- maxLogsPerQuery: 10-500 integer
- cacheTTLMinutes: 1-60 integer

### Business Context
- String fields: type check (string mi?)
- Boolean fields: type check (boolean mi?)
- dominantMaterials: Array check
- floorLevel: enum check (ground|upper|basement|outdoor)
- ❌ Min-length / empty string check YOK

### Asset Selection
- enabled: boolean check
- Deep merge ile partial update

### Product Slot Defaults
- _default key zorunlu
- Full overwrite (partial update yok)

---

## Frontend Validation

**MEVCUT DURUM: SIFIR**

Hicbir input'ta frontend validation yok:
- Bos string gonderilebilir (businessName, promptContext, vb.)
- Cok uzun string gonderilebilir
- Ozel karakter kontrolu yok
- dominantMaterials icin format kontrolu yok

---

## Cache Mekanizmasi

| Katman | Cache Var mi? | TTL |
|--------|-------------|-----|
| Frontend (Settings.tsx) | ❌ Yok | Her acilista fetch |
| Backend (configService.ts) | ✅ systemSettings | 5 dakika |
| Backend (configService.ts) | ✅ promptStudio | 5 dakika |
| Backend (configService.ts) | ✅ slotDefinitions | 5 dakika |
| Backend (configService.ts) | ❌ businessContext | Yok |
| Backend (configService.ts) | ❌ assetSelection | Yok |
| Backend (configService.ts) | ❌ productSlotDefaults | Yok |

---

## Performans Notlari

1. 5 paralel API cagri → Network bandwidth yuksek ama Promise.all benzeri paralel calisma
2. Her API cagri ayri Cloud Function → cold start riski (ama cache ile minimize)
3. Frontend cache yok → her sayfa acilisinda tekrar fetch
4. Backend'de tum config'ler getGlobalConfig() ile tek seferde cekilebilir ama Settings sayfasi bunu kullanmiyor

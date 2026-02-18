# 04 - Asset Secim Kurallari Bolumu

## Alanlar

6 asset kategorisi x 2 mod (manual/scheduled) = 12 toggle

| Kategori | Frontend Key | Backend Slot Karsiligi | Dogru mu? |
|----------|-------------|----------------------|-----------|
| Tabak | plate | dish | ✅ |
| Masa | table | surface | ✅ |
| Fincan | cup | drinkware | ✅ |
| Aksesuar | accessory | - | ⚠️ |
| Pecete | napkin | textile | ✅ |
| Catal-Bicak | cutlery | decor | ❌ YANLIS |

## Kritik Bulgu: Toggle'lar Yaniltici

### Ne Soyluyorlar
- "Acik (Yesil): Bu asset kategorisi ZORUNLU - Gemini mutlaka secmeli"
- "Kapali (Gri): Bu asset kategorisi HARIC - Sahnede yer almayacak"

### Gercekte Ne Yapiyorlar
- Asset **secimini** etkilemiyorlar
- Sadece Gemini **prompt'una** hint olarak gidiyorlar
- Composition template secilirse tamamen **ignore** ediliyorlar

### Kod Akisi

```
Frontend toggle → Firestore: global/config/settings/asset-selection → Kaydedildi

Pipeline'da:
  orchestrator.ts:875-878:
    const assetSelectionConfig = await getAssetSelectionConfig();
    const assetSelectionRules = isManual
      ? assetSelectionConfig.manual
      : assetSelectionConfig.scheduled;

  → Bu rules SADECE gemini.ts:optimizePrompt() icinde kullaniliyor
  → Asset secim asamasinda (resolveCompositionAssets) KULLANILMIYOR
```

## Cutlery Mapping Hatasi

```typescript
// orchestrator.ts:2896 — SLOT_TO_ASSET_FIELD
{
  surface: "table",
  dish: "plate",
  drinkware: "cup",
  textile: "napkin",
  decor: "cutlery",  // ❌ "decor" slotu "cutlery" asset'ine eslenimis
}
```

- Frontend'de "Catal-Bicak" toggle'i → backend'de `cutlery` key
- Ama backend slot sistemi `decor` → "aksesuar/dekorasyon" olmali
- Sonuc: Cutlery toggle'i yanlislikla dekor slotunu kontrol ediyor

## Manual vs Scheduled Ayrimi

- `isManual` parametresi `generateNow()`'da `undefined` olarak geciliyor
- Heuristic: `actualIsManual = isManual !== undefined ? isManual : !slotId`
- Manuel uretim bazen `scheduled` kurallarini kullanabilir

## Race Condition Analizi

- Deep merge kullaniliyor (partial updates)
- Firestore transaction yok
- Esanlamli 2 toggle degisikligi race condition yaratabilir (dusuk olasilik)

## Default Config

```typescript
// seed/defaultData.ts
DEFAULT_ASSET_SELECTION_CONFIG = {
  manual: {
    plate: { enabled: true },
    table: { enabled: true },
    cup: { enabled: false },
    accessory: { enabled: true },
    napkin: { enabled: true },
    cutlery: { enabled: false },
  },
  scheduled: {
    plate: { enabled: true },
    table: { enabled: true },
    cup: { enabled: false },
    accessory: { enabled: false },
    napkin: { enabled: false },
    cutlery: { enabled: false },
  },
}
```

## Dosya Konumlari

- Frontend: `admin/src/pages/Settings.tsx:698-795`
- Backend Controller: `functions/src/controllers/orchestrator/configController.ts:1336-1415`
- Config Service: `functions/src/services/configService.ts:1084-1137`
- Pipeline Kullanim: `functions/src/orchestrator/orchestrator.ts:875-878`
- Prompt Kullanim: `functions/src/services/gemini.ts:899-995`
- Slot Mapping: `functions/src/orchestrator/orchestrator.ts:2896`

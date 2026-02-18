# 03 - Isletme Baglami (Business Context) Bolumu — EN KRITIK BULGULAR

## Alanlar ve Kullanim Durumu

| Alan | UI'da var mi? | Firestore'da var mi? | Pipeline'da kullaniliyor mu? | Sonuc |
|------|--------------|---------------------|----------------------------|-------|
| **promptContext** | ✅ "EN ONEMLI" etiketi | ✅ | ❌ **KULLANILMIYOR** | DEAD FIELD |
| **isEnabled** | ✅ toggle | ✅ | ✅ floorLevel kontrolu buna bagli | CALISIYOR |
| **floorLevel** | ✅ dropdown | ✅ | ✅ Negatif kisitlamalar ekliyor | CALISIYOR (sinirli) |
| businessName | ✅ input | ✅ | ❌ Sadece logging | DEAD FIELD |
| businessType | ✅ input | ✅ | ❌ | DEAD FIELD |
| locationDescription | ✅ textarea | ✅ | ❌ | DEAD FIELD |
| decorStyle | ✅ input | ✅ | ❌ | DEAD FIELD |
| dominantMaterials | ✅ input (virgul) | ✅ | ❌ | DEAD FIELD |
| colorScheme | ✅ input | ✅ | ❌ | DEAD FIELD |
| hasStreetView | ✅ checkbox | ✅ | ❌ | DEAD FIELD |
| hasWindowView | ✅ checkbox | ✅ | ❌ | DEAD FIELD |
| windowViewDescription | ❌ UI'da YOK | ✅ (type'da var) | ❌ | DEAD FIELD + GHOST FIELD |

## floorLevel — Tek Calisan Mekanizma

```typescript
// geminiPromptBuilder.ts:1245-1275
const businessContext = await getBusinessContext();
if (businessContext.isEnabled && businessContext.floorLevel) {
  const floorConstraints = {
    ground: ["NO high-rise views, NO skyscraper backgrounds"],
    upper: ["NO street-level views, show elevated perspective"],
    basement: ["NO window views, NO natural light from windows"],
    outdoor: ["Outdoor setting, NO interior walls or ceilings"],
  };
}
```

## promptContext — "EN ONEMLI" Ama Kullanilmiyor

- UI'da mavi kutu icinde, "AI Prompt Baglami (En Onemli Alan)" etiketi var
- Placeholder: "Ground floor patisserie with warm tones..."
- Firestore'a kaydediliyor
- **AMA:** Backend'de hicbir yerde `businessContext.promptContext` okunmuyor
- `configService.ts` yorumunda "AI prompt'una dogrudan eklenir" yaziyor ama KOD YOK

## Kaydetme Mekanizmasi

- "Degisiklikleri Kaydet" butonu → TUM businessContext objesi gonderiliyor
- Backend: Partial update (Firestore `update` ile spread)
- Toggle (isEnabled): Ayri endpoint, sadece `{ isEnabled: boolean }` gonderiyor
- **Sorun:** Toggle ile kaydet butonu ayni objeyi manipule ediyor — toggle sonrasi kaydet basarsa eski isEnabled degerini overwrite edebilir

## Default Degerler (Seed Data)

```typescript
// orchestrator/seed/defaultData.ts:501-522
DEFAULT_BUSINESS_CONTEXT_CONFIG = {
  businessName: "Sade Patisserie",
  businessType: "pastane",
  locationDescription: "Zemin kattaki butik pastane...",
  floorLevel: "ground",
  hasStreetView: true,
  hasWindowView: true,
  windowViewDescription: "Sokak manzarasi...",
  decorStyle: "Minimal modern, sicak tonlar",
  dominantMaterials: ["ahsap", "mermer", "seramik"],
  colorScheme: "Sicak krem, bej ve kahve tonlari",
  promptContext: "Ground floor artisan patisserie with street-level storefront...",
  isEnabled: true,
}
```

## Dosya Konumlari

- Frontend: `admin/src/pages/Settings.tsx:481-696`
- Backend Controller: `functions/src/controllers/orchestrator/configController.ts:920-1030`
- Config Service: `functions/src/services/configService.ts:467-484, 1046-1074`
- Prompt Builder (floorLevel): `functions/src/orchestrator/geminiPromptBuilder.ts:1245-1275`
- Seed Data: `functions/src/orchestrator/seed/defaultData.ts:501-522`

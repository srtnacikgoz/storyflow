# 05 - Urun Tipi Slot Varsayilanlari Bolumu

## Durum: EN SAGLIKLI CALISAN BOLUM

Bu bolum, template secilmeden uretim yapildiginda hangi slot'larin acik olacagini belirler.

## Alanlar

Tablo yapisi: Satir = Urun Tipi, Sutun = Slot

| Slot Key | Label | Asset Kategorisi |
|----------|-------|-----------------|
| surface | Yuzey | furniture → tables |
| dish | Tabak | props → plates |
| drinkware | Bardak | props → cups |
| textile | Pecete | props → napkins |
| decor | Dekor | ? → cutlery (mapping sorunu) |

## Pipeline'da Kullanim — CALISIYOR

```typescript
// orchestrator.ts:813-821
if (!compositionConfig || Object.keys(compositionConfig.slots).length === 0) {
  // Template secilmemis → slot defaults'tan oku
  const productSlotDefaults = await getProductSlotDefaults();
  const defaults = productSlotDefaults[effectiveProductType]
    || productSlotDefaults._default
    || DEFAULT_PRODUCT_SLOT_DEFAULTS._default;

  // Sadece enabled=true olan slotlar etkinlestirilir
  compositionConfig.slots = ...;
}
```

**Template secilirse slot defaults KULLANILMAZ — template override eder.**

## Default Degerler (Hardcoded Fallback)

```typescript
// types.ts — DEFAULT_PRODUCT_SLOT_DEFAULTS
chocolates: { surface: true, dish: false, drinkware: true, textile: false, decor: false }
coffees:    { surface: true, dish: false, drinkware: true, textile: false, decor: false }
croissants: { surface: true, dish: true,  drinkware: true, textile: true,  decor: false }
pastas:     { surface: true, dish: true,  drinkware: true, textile: true,  decor: false }
_default:   { surface: true, dish: true,  drinkware: true, textile: true,  decor: false }
```

Mantik:
- Chocolates/Coffees: Kutulu urun → tabak ve peceteye ihtiyac yok
- Croissants/Pastas: Acik urun → tabak ve pecete gerekli

## _default Fallback Mekanizmasi

- Bilinmeyen urun tipi gelince → `_default` satiri kullaniliyor
- _default silinemez (frontend'de kontrol var)
- Yeni urun tipi eklendiginde _default kopyalaniyor

## Sorunlar

### 1. PRODUCT_TYPE_LABELS Hardcoded
```typescript
const PRODUCT_TYPE_LABELS = {
  chocolates: "Cikolatalar",
  coffees: "Kahveler",
  croissants: "Kruvasanlar",
  pastas: "Pastalar",
  _default: "Varsayilan",
};
```
- Sadece 4 tip + _default
- Yeni eklenen tipler label'siz kaliyor (slug gosteriliyor)
- Dinamik kategori sistemine uyumsuz

### 2. SLOT_LABELS Hardcoded (5 slot)
```typescript
const SLOT_LABELS = {
  surface: { label: "Yuzey", icon: "🪑" },
  dish: { label: "Tabak", icon: "🍽️" },
  drinkware: { label: "Bardak", icon: "☕" },
  textile: { label: "Pecete", icon: "🧻" },
  decor: { label: "Dekor", icon: "🌸" },
};
```
- Dinamik slot sistemi varken tablo statik
- Yeni slot eklenirse Settings'te gorulmez
- Backend'den getSlotDefinitions() ile cekilebilir ama cekilmiyor

### 3. Slug Olusturma
```typescript
const slug = newProductType.trim().toLowerCase().replace(/\s+/g, "-");
// "Dondurma Dut" → "dondurma-dut"
```
- Case-sensitive karsilastirma riski
- TypeScript ProductType literal union'a uyumsuz (runtime'da kabul ediliyor)

### 4. Full Overwrite
- `updateProductSlotDefaults()` tum defaults map'ini birden yaziyor
- Partial update desteklenmiyor
- Frontend tum state'i maintain etmek zorunda

## Dosya Konumlari

- Frontend: `admin/src/pages/Settings.tsx:797-933`
- Backend Controller: `functions/src/controllers/orchestrator/configController.ts:1445-1476`
- Config Service: `functions/src/services/configService.ts:1219-1261`
- Pipeline Kullanim: `functions/src/orchestrator/orchestrator.ts:813-821`
- Type Definitions: `functions/src/orchestrator/types.ts` (ProductSlotDefaults, DEFAULT_PRODUCT_SLOT_DEFAULTS)

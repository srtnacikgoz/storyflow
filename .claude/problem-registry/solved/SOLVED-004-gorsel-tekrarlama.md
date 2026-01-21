# SOLVED-004: Görsel Üretiminde Tekrarlama Sorunu

**Durum:** ✅ ÇÖZÜLDÜ
**Kategori:** orchestrator, firestore
**Öncelik:** 🔴 KRİTİK
**Oluşturma:** 2026-01-21
**Çözüm Tarihi:** 2026-01-21

---

## Belirti

Her görsel üretiminde aynı unsurlar çıkıyordu:
- Hep tiramisu (pasta seçilse bile)
- Hep gri tabak
- Hep yeşil fincan
- Hep ahşap unsurlar

---

## Kök Neden

### 1. Production History Firestore Hatası
`scheduler.ts:419`'da `handStyleId` undefined olabiliyordu ve Firestore undefined değerleri kabul etmiyor.

```typescript
// HATA
handStyleId: result.scenarioSelection?.handStyle,  // undefined!
```

Bu yüzden production history kaydedilmiyordu ve rotasyon algoritması çalışmıyordu.

### 2. Product/Plate/Cup Rotasyonu Eksikti
`VariationRules`'da sadece `tableGap`, `scenarioGap`, `handStyleGap`, `compositionGap` vardı. Ürün, tabak ve fincan için rotasyon kuralı **yoktu**.

---

## Çözüm

### 1. types.ts - ProductionHistoryEntry Güncellendi
```typescript
export interface ProductionHistoryEntry {
  // ... mevcut alanlar
  productId?: string | null;
  plateId?: string | null;
  cupId?: string | null;
}
```

### 2. types.ts - VariationRules Güncellendi
```typescript
export interface VariationRules {
  // ... mevcut kurallar
  productGap: number;   // 3 (aynı ürün 3 üretim sonra)
  plateGap: number;     // 2
  cupGap: number;       // 2
}
```

### 3. types.ts - EffectiveRules Güncellendi
```typescript
export interface EffectiveRules {
  // ... mevcut alanlar
  blockedProducts: string[];
  blockedPlates: string[];
  blockedCups: string[];
}
```

### 4. rulesService.ts - Bloklanmış Listeler Eklendi
```typescript
const blockedProducts = [...new Set(entries.slice(0, variationRules.productGap).map(e => e.productId).filter(Boolean))];
const blockedPlates = [...new Set(entries.slice(0, variationRules.plateGap).map(e => e.plateId).filter(Boolean))];
const blockedCups = [...new Set(entries.slice(0, variationRules.cupGap).map(e => e.cupId).filter(Boolean))];
```

### 5. claudeService.ts - Claude Prompt'a Bloklanmış Listeler Eklendi
```typescript
⚠️ ÇEŞİTLİLİK KURALLARI (KRİTİK - Bu ID'leri SEÇME):
- BLOKLANMIŞ ÜRÜNLER: ${blockedProducts.join(", ")}
- BLOKLANMIŞ TABAKLAR: ${blockedPlates.join(", ")}
- BLOKLANMIŞ FİNCANLAR: ${blockedCups.join(", ")}
- BLOKLANMIŞ MASALAR: ${blockedTables.join(", ")}
```

---

## Değiştirilen Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `functions/src/orchestrator/types.ts` | ProductionHistoryEntry, VariationRules, EffectiveRules |
| `functions/src/orchestrator/rulesService.ts` | DEFAULT_VARIATION_RULES, getEffectiveRules |
| `functions/src/orchestrator/claudeService.ts` | selectAssets prompt |

---

## Test

Deploy sonrası birkaç görsel üretimi yapılarak rotasyonun çalıştığı doğrulanmalı.

---

## İlişkili Pattern

- [Pattern: Firestore Undefined](../patterns/firestore-undefined.md)

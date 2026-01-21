# SOLVED-002: Interior Senaryolarda AI Üretimi Atlama

**Durum:** ✅ ÇÖZÜLDÜ
**Kategori:** orchestrator
**Öncelik:** 🟠 YÜKSEK
**Oluşturma:** 2026-01-21
**Çözüm:** 2026-01-21
**Süre:** ~3 saat

---

## Belirti

Interior (mekan atmosferi) fotoğrafları için AI görsel üretimi yapılıyordu.
- Vitrin, tezgah, oturma alanı gibi mekan fotoğrafları için AI üretimi gereksiz
- Gerçek fotoğraflar doğrudan kullanılmalı
- AI üretimi zaman ve maliyet kaybı

---

## Kök Neden

Sistem sadece "ürün görseli" üretmek için tasarlanmıştı. Interior senaryolar için özel akış yoktu.

---

## Çözüm

### 1. Tip Tanımları Güncellendi

`types.ts`:
```typescript
// Senaryo tipine isInterior ve interiorType eklendi
export interface Scenario {
  id: string;
  name: string;
  description: string;
  includesHands: boolean;
  isInterior?: boolean;           // YENİ
  interiorType?: InteriorType;    // YENİ
  compositions: CompositionVariant[];
}

// Interior alt tipleri
export type InteriorType =
  | "vitrin"
  | "tezgah"
  | "oturma-alani"
  | "dekorasyon"
  | "genel-mekan";
```

### 2. Interior Senaryolar Tanımlandı

`rulesService.ts` - 10 yeni interior senaryo:
- vitrin-sergisi
- kruvasan-tezgahi
- pastane-ici
- oturma-kosesi
- cicek-detay
- kahve-hazirligi
- sabah-acilis
- pencere-isigi
- raf-zenginligi
- detay-cekimi

### 3. Orchestrator Akışı Güncellendi

`orchestrator.ts`:
```typescript
// Interior senaryo kontrolü
const isInteriorScenario = selectedScenario?.isInterior || false;

if (isInteriorScenario) {
  console.log("[Orchestrator] Interior scenario - skipping AI generation");

  // Interior asset seç (gerçek fotoğraf)
  const selectedInterior = this.selectInteriorAsset(assets.interior, interiorType);

  // AI üretimi atla, direkt sonuca git
  // Stage 3, 4, 5 atlanıyor
}
```

### 4. Interior Asset Seçim Metodu Eklendi

```typescript
private selectInteriorAsset(interiorAssets: Asset[], interiorType?: string): Asset | null {
  let filtered = interiorAssets;

  if (interiorType) {
    filtered = interiorAssets.filter(a => a.subType === interiorType);
  }

  // Rastgele seç
  return filtered[Math.floor(Math.random() * filtered.length)];
}
```

### 5. Frontend Güncellendi

- Assets.tsx: Interior kategori ve alt tipler eklendi
- Themes.tsx: Interior senaryolar listede gösteriliyor

---

## Değiştirilen Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `functions/src/orchestrator/types.ts` | isInterior, interiorType, InteriorType eklendi |
| `functions/src/orchestrator/rulesService.ts` | 10 interior senaryo eklendi |
| `functions/src/orchestrator/orchestrator.ts` | Interior akış ve selectInteriorAsset eklendi |
| `admin/src/types/index.ts` | InteriorType eklendi |
| `admin/src/pages/Assets.tsx` | Interior kategori eklendi |
| `admin/src/pages/Themes.tsx` | Interior senaryolar gösterimi |

---

## Test

1. Interior senaryo seçildi (vitrin-sergisi)
2. AI üretimi atlandı (Stage 3,4,5 skip)
3. Interior asset doğrudan kullanıldı
4. Pipeline süresi ve maliyeti düştü

---

## Öğrenilen Ders

> Yeni bir "senaryo tipi" eklerken hem backend (types, orchestrator, rulesService)
> hem frontend (types, ilgili sayfalar) güncellenmeli.

---

## İlişkili Sorunlar

- [ACTIVE-002: Görsel Tekrarlama](../active/ACTIVE-002-gorsel-tekrarlama.md) - Interior tema seçildiğinde hala AI üretimi yapılıyorsa bu sorunla ilişkili olabilir

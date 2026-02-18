# Senaryo ↔ Composition Etkileşimi Araştırması
**Tarih:** 2026-02-10 | **Agent:** Explore (Sonnet)

---

## 1. Senaryo Seçimi Composition Slotlarını Etkiliyor mu?

**HAYIR — doğrudan etkilemiyor.** Sadece dolaylı bilgi aktarımı var.

- `hands` slot özel durum: aktif ise sadece flag set edilir
- Gerçek el stili senaryo aşamasında belirlenir (satır 976-983)

## 2. Template'de scenarioId — Zorunlu Değil

```typescript
// types.ts:2172-2188
export interface CompositionTemplate {
  scenarioId?: string;  // ← Opsiyonel bağ, kilitlenmez
}
```

- Bilgi amaçlı, pipeline'da zorunlu bağ YOK
- Override varsa override kazanır (satır 836-838)

## 3. hands Slot vs includesHands — ÇİFT OTORİTE ⚠️

**Senaryo:** `includesHands: boolean` (types.ts:559)
**Composition:** `hands` slot durumu (orchestrator.ts:3006-3013)

**ÇAKIŞMA:**
- Senaryo `includesHands: false` + template `hands: enabled` → ?
- Hangisi öncelikli? Net kural yok.

## 4. Eski compositionId vs Yeni Slot Sistemi — PARALEL ⚠️

**Eski sistem (hâlâ aktif):**
- `scenario.compositionId` → prompt builder → GeminiCompositionTemplate → prompt TEXT
- orchestrator.ts:1054 → `predefinedCompositionId`
- geminiPromptBuilder.ts:956-969 → preset yüklenir

**Yeni sistem:**
- `CompositionTemplate.slots` → `resolveCompositionAssets` → referans GÖRSELLER
- orchestrator.ts:2964-3048 → slot bazlı asset seçimi

**SORUN:** İki sistem birbirini bilmiyor. Aynı anda çalışıyor.

## 5. Senaryo Description vs Template Slotları — Koordinasyonsuz

- Description "minimal sahne" → template "çatal-bıçak zorunlu" diyebilir
- İki sistem arasında koordinasyon mekanizması YOK
- Fakat çakışma nadir (farklı katmanlar)

## 6. Auto-Default — Sadece ProductType Bazlı

```typescript
// orchestrator.ts:811-829
const defaults = productSlotDefaults[effectiveProductType] || productSlotDefaults._default;
```

- Senaryo bilgisi auto-default'ta KULLANILMIYOR
- Sadece productType kontrol ediliyor

## Kritik Çakışma Tablosu

| Senaryo Alanı | Composition Alanı | Sonuç |
|--------------|-------------------|-------|
| includesHands: true | hands slot disabled | **ÇAKIŞMA** — Hangisi geçerli? |
| compositionId: "overhead" | CompositionTemplate.slots | **PARALEL** — Eski prompt, yeni asset |
| description: "minimal" | slots.decor: enabled | **KOORDİNASYONSUZ** — Çakışabilir |
| suggestedProducts | Template yok | Filtreleme yapılır |
| isInterior: true | Template yok | AI bypass |

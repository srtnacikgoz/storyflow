# Type Sistemi Analiz — Veri Modeli & Uyumsuzluklar

---

## 1. Type Tanımları Haritası

### Backend (Kaynak — Authoritative)
**Dosya:** `functions/src/orchestrator/types.ts`

| Type | Satır | Tanım |
|------|-------|-------|
| SlotState | 2074 | `"disabled" \| "manual" \| "random"` |
| SlotDefinition | 2083 | key, label, category, subType, order, isActive, isRequired |
| SlotConfig | 2129 | `{ state, assetId?, filterTags? }` |
| SlotSelection | 2146 | `{ slotKey, state, assetId?, filterTags?, source }` |
| CompositionTemplate | 2172 | slots: `Record<string, SlotConfig>` |
| CompositionConfig | 2210 | slots: `Record<string, SlotSelection>` |

### Frontend (Consumer)
**Dosya:** `admin/src/types/index.ts`

| Type | Satır | Backend ile Uyumlu mu? |
|------|-------|----------------------|
| SlotState | 1407 | ✅ Aynı |
| SlotDefinition | 1409 | ✅ Aynı |
| SlotConfig | 1426 | ✅ Aynı |
| CompositionTemplate | 1432 | ✅ Aynı |
| CompositionConfig | 1449 | ❌ FARKLI — SlotConfig vs SlotSelection |

### Ölü Tanım
**Dosya:** `functions/src/types/index.ts:914`
- Eski CompositionTemplate (entryPoint, angleDescription, geminiPrompt)
- Kullanılmıyor — silinmeli

---

## 2. Kritik Uyumsuzluk: CompositionConfig

**Frontend (admin/src/types/index.ts:1449):**
```typescript
slots: Record<string, SlotConfig & { source?: "template" | "override" | "manual" }>
```

**Backend (functions/src/orchestrator/types.ts:2210):**
```typescript
slots: Record<string, SlotSelection>
// SlotSelection = { slotKey: string, state, assetId?, filterTags?, source }
```

**Farklar:**

| Özellik | Frontend gönderir | Backend bekler | Uyumlu? |
|---------|------------------|---------------|---------|
| slotKey | ❌ GÖNDERMİYOR | ZORUNLU | ❌ HAYIR |
| state | ✅ string | ✅ string | ✅ |
| assetId | ✅ optional | ✅ optional | ✅ |
| filterTags | ✅ optional | ✅ optional | ✅ |
| source | ⚠️ optional | ZORUNLU | ⚠️ Kısmi |

**Risk:** Backend `slotSelection as SlotSelection` type casting yapıyor (orchestrator.ts:2999)

---

## 3. Slot Key Tipi Sorunu

Slot key'ler `string` olarak tanımlı — union type değil:
```typescript
// Mevcut: Record<string, SlotConfig>
// Olması gereken: Record<SlotKey, SlotConfig>
// type SlotKey = "surface" | "dish" | "drinkware" | "textile" | "decor" | "hands"
```

**Risk:** Typo compile-time'da yakalanmıyor.
**Referans:** SLOT_TO_ASSET_FIELD mapping (orchestrator.ts:2896-2902)

---

## 4. Frontend-Backend Dönüşüm Sorunu

### Kayıt (CompositionTemplates.tsx:171-176)
```
Frontend "manual" + filterTags → Backend "random" + filterTags
```

### Okuma (CompositionTemplates.tsx:127-135)
```
Backend "random" + filterTags → Frontend "manual"
```

**Sonuç:** State semantiği kayıyor — "manual" aslında "filtered random"

---

## 5. DRY İhlalleri

| Type | Dosya 1 | Dosya 2 | Konsisten? |
|------|---------|---------|-----------|
| SlotState | admin/types:1407 | orchestrator/types:2074 | ✅ |
| SlotDefinition | admin/types:1409 | orchestrator/types:2083 | ✅ |
| SlotConfig | admin/types:1426 | orchestrator/types:2129 | ✅ |
| CompositionTemplate | admin/types:1432 | orchestrator/types:2172 | ✅ |
| CompositionConfig | admin/types:1449 | orchestrator/types:2210 | ❌ FARKLI |

---

## 6. Null/Undefined Riskleri

| Alan | Risk | Satır |
|------|------|-------|
| slotKey | Frontend göndermezse undefined | orchestrator.ts:2999 |
| compositionConfig.slots | undefined olabilir, Object.keys() patlar | orchestrator.ts:819-820 |
| source | Optional ama backend "manual" yazması bekleniyor | orchestrator.ts:829 |

---

## 7. Öneriler

1. **slotKey alanını ekle** — Dashboard buildCompositionConfig'de `slotKey: key` eklenmeli
2. **CompositionConfig type'ını normalize et** — Frontend SlotSelection kullanmalı
3. **Type casting kaldır** — `as SlotSelection` yerine doğru type gelmeli
4. **Ölü kodu sil** — functions/src/types/index.ts:914 eski tanım
5. **SlotKey union type oluştur** — typo koruması için

---

## Genel Sağlık: 5/10

- Type'lar çoğunlukla konsisten ama kritik CompositionConfig uyumsuzluğu var
- Runtime type casting kullanılıyor — güvensiz
- Ölü kod bakım yükü oluşturuyor
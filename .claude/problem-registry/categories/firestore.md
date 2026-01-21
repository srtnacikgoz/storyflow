# Kategori: Firestore

Firestore veritabanı ile ilgili sorunlar.

---

## Aktif Sorunlar

| ID | Başlık | Öncelik | Durum |
|----|--------|---------|-------|
| [ACTIVE-001](../active/ACTIVE-001-dashboard-status.md) | Dashboard Status Takılması | 🔴 KRİTİK | 🟡 Araştırılıyor |
| [ACTIVE-002](../active/ACTIVE-002-gorsel-tekrarlama.md) | Görsel Tekrarlama | 🔴 KRİTİK | 🟡 Araştırılıyor |

---

## Çözülmüş Sorunlar

| ID | Başlık | Çözüm Tarihi |
|----|--------|--------------|
| [SOLVED-001](../solved/SOLVED-001-telegram-race-condition.md) | Race Condition | 2026-01-20 |
| [SOLVED-003](../solved/SOLVED-003-assets-crud.md) | Assets CRUD | 2026-01-21 |

---

## İlgili Pattern'ler

- [Firestore Undefined](../patterns/firestore-undefined.md)
- [Race Condition](../patterns/race-condition.md)

---

## Anahtar Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `functions/src/services/firestoreService.ts` | Firestore wrapper |
| `functions/src/orchestrator/scheduler.ts` | Production history yazımı |

---

## Hızlı Referans

### Temel Kurallar
- `undefined` değer **YASAK** → `|| null` kullan
- Transaction ile atomic işlemler
- Batch write limiti: 500

### Collection'lar
| Collection | Amaç |
|------------|------|
| `media-queue` | Onay bekleyen görseller |
| `scheduled-slots` | Zamanlanmış paylaşımlar |
| `assets` | Ürün görselleri |
| `products` | Ürün bilgileri |
| `timeslots` | Paylaşım zaman dilimleri |
| `config` | Sistem konfigürasyonu |

### Undefined → Null Dönüşümü
```typescript
// ❌ YANLIŞ
const data = {
  field: someValue?.property,  // undefined olabilir
};

// ✅ DOĞRU
const data = {
  field: someValue?.property || null,
};
```

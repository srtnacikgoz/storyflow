# SOLVED-001: Telegram "Yeniden Oluştur" 6 Görsel Sorunu

**Durum:** ✅ ÇÖZÜLDÜ
**Kategori:** telegram, firestore
**Öncelik:** 🔴 KRİTİK
**Oluşturma:** 2026-01-20
**Çözüm:** 2026-01-20
**Süre:** ~2 saat

---

## Belirti

Telegram'a gelen görsel için "yeniden oluştur" denildiğinde:
- 6 tane yeniden görsel oluşturuyor
- Hiçbiri paylaşılabilir veya silinebilir değil
- Aynı buton tıklandığında çoklu işlem başlıyor

---

## Kök Neden

**Race condition** - Telegram birden fazla callback gönderdiğinde (hızlı tıklama veya retry) her callback aynı anda `item.status !== "awaiting_approval"` kontrolünü geçiyordu.

```
Callback 1 → status kontrol → "awaiting_approval" ✓ → işleme başla
Callback 2 → status kontrol → "awaiting_approval" ✓ → işleme başla (paralel!)
Callback 3 → status kontrol → "awaiting_approval" ✓ → işleme başla (paralel!)
...
```

Her callback paralel olarak `processWithApproval` çağırıyordu.

---

## Çözüm

### Firestore Transaction ile Atomic Lock

**1. queue.ts'e yeni fonksiyon eklendi:**

```typescript
async tryMarkForRegeneration(itemId: string): Promise<boolean> {
  const db = getFirestore();
  const docRef = db.collection("media-queue").doc(itemId);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);

      if (!doc.exists) return false;

      const data = doc.data();
      if (data?.status !== "awaiting_approval") return false;
      if (data?.approvalStatus === "regenerating") return false;

      // Atomic update - sadece ilk callback başarılı olur
      transaction.update(docRef, {
        approvalStatus: "regenerating",
        regenerationStartedAt: Date.now(),
      });

      return true;
    });
  } catch (error) {
    console.error("[Queue] Regeneration lock failed:", error);
    return false;
  }
}
```

**2. telegramController.ts güncellendi:**

```typescript
case "regenerate": {
  // ATOMIC LOCK: Race condition önleme
  const lockAcquired = await queue.tryMarkForRegeneration(parsed.itemId);

  if (!lockAcquired) {
    console.log("[Telegram Webhook] Regeneration already in progress, skipping duplicate");
    response.status(200).json({ ok: true, message: "Already regenerating" });
    return;
  }

  // Lock alındı, şimdi işleme devam et
  // ...
}
```

---

## Değiştirilen Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `functions/src/services/queue.ts` | `tryMarkForRegeneration()` eklendi |
| `functions/src/controllers/telegramController.ts` | regenerate case güncellendi |

---

## Denenen Yaklaşımlar

### ❌ Yaklaşım 1: Basit Status Kontrolü
**Ne yapıldı:** `if (item.status !== "awaiting_approval") return;`
**Sonuç:** Race condition'ı engellemedi - paralel okumalar aynı değeri görüyordu

### ❌ Yaklaşım 2: Debounce
**Ne yapıldı:** İstemci tarafında debounce
**Sonuç:** Telegram retry mekanizmasını engelleyemedi

### ✅ Yaklaşım 3: Firestore Transaction
**Ne yapıldı:** Atomic lock ile sadece ilk callback'in geçmesi sağlandı
**Sonuç:** Çalıştı

---

## Test

1. Telegram'dan "Yeniden Oluştur" butonuna hızlıca birden fazla tıklandı
2. Sadece 1 görsel oluşturuldu
3. Diğer callback'ler "Already regenerating" ile reddedildi

---

## Öğrenilen Ders

> **Telegram callback'leri için Firestore Transaction kullanmak şart.**
> Basit read-then-write pattern'i race condition'a açık.

---

## İlişkili Sorunlar

- [Pattern: Race Condition](../patterns/race-condition.md)
- [Pattern: Firestore Transaction](../patterns/firestore-transaction.md)

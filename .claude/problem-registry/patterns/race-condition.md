# Pattern: Race Condition (Telegram Callback)

**Kategori:** telegram, firestore
**Sıklık:** Orta
**Önem:** 🔴 KRİTİK

---

## Belirti

- Aynı işlem birden fazla kez çalışıyor
- Telegram butonuna tıklandığında çoklu sonuç
- Duplicate kayıtlar oluşuyor

---

## Neden Oluyor?

Telegram callback'leri birden fazla kez gelebilir:
1. Kullanıcı hızlı tıklama
2. Telegram retry mekanizması
3. Network timeout sonrası tekrar gönderim

Basit read-then-write pattern'i bu durumda çalışmıyor:

```typescript
// SORUNLU KOD
const item = await getItem(id);
if (item.status !== "pending") return;  // Race condition!

// Bu noktada başka bir callback da aynı kontrolü geçmiş olabilir
await processItem(id);
```

---

## Çözüm: Firestore Transaction

```typescript
async function tryAcquireLock(itemId: string): Promise<boolean> {
  const db = getFirestore();
  const docRef = db.collection("items").doc(itemId);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);

      if (!doc.exists) return false;

      const data = doc.data();
      if (data?.status !== "pending") return false;
      if (data?.processing === true) return false;  // Zaten işleniyor

      // Atomic lock - sadece ilk callback başarılı olur
      transaction.update(docRef, {
        processing: true,
        processingStartedAt: Date.now(),
      });

      return true;
    });
  } catch (error) {
    return false;
  }
}

// Kullanım
const lockAcquired = await tryAcquireLock(itemId);
if (!lockAcquired) {
  return { ok: true, message: "Already processing" };
}

// Şimdi güvenle işlem yap
await processItem(itemId);
```

---

## Kontrol Listesi

Telegram callback'leri için:

- [ ] Status kontrolü transaction içinde mi?
- [ ] Lock mekanizması var mı?
- [ ] Duplicate callback'ler için graceful response var mı?

---

## İlgili Sorunlar

- [SOLVED-001: Telegram Race Condition](../solved/SOLVED-001-telegram-race-condition.md)

# Pattern: Firestore Undefined Değer Hatası

**Kategori:** firestore
**Sıklık:** Sık
**Önem:** 🔴 KRİTİK

---

## Belirti

```
Error: Value for argument "data" is not a valid Firestore document.
Cannot use "undefined" as a Firestore value (found in field "fieldName").
```

---

## Neden Oluyor?

Firestore `undefined` değerleri kabul etmiyor. JavaScript'te optional property'ler veya `?.` operatörü `undefined` dönebilir.

```typescript
// Sorunlu kod
const data = {
  name: user.name,
  email: user.email,
  phone: user.phone,  // undefined olabilir!
};

await db.collection("users").add(data);  // HATA!
```

---

## Çözüm

### Yöntem 1: `|| null` Kullan

```typescript
const data = {
  name: user.name,
  email: user.email,
  phone: user.phone || null,  // undefined yerine null
};
```

### Yöntem 2: Undefined Alanları Filtrele

```typescript
const data = {
  name: user.name,
  email: user.email,
  ...(user.phone && { phone: user.phone }),
};
```

### Yöntem 3: Firestore Ayarı (Önerilmez)

```typescript
const settings = { ignoreUndefinedProperties: true };
db.settings(settings);
```

---

## Kontrol Listesi

Firestore'a veri yazarken:

- [ ] Optional alanlar `|| null` ile sarmalandı mı?
- [ ] `?.` operatörü kullanılan yerlerde fallback var mı?
- [ ] Tip tanımında `?` olan alanlar kontrol edildi mi?

---

## İlgili Sorunlar

- [ACTIVE-002: Görsel Tekrarlama](../active/ACTIVE-002-gorsel-tekrarlama.md) - handStyleId undefined hatası
- [SOLVED-001: Telegram Race Condition](../solved/SOLVED-001-telegram-race-condition.md) - benzer pattern

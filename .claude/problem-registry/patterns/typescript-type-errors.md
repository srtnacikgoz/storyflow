# Pattern: TypeScript Tip Hataları

**Kategori:** typescript
**Sıklık:** Sık
**Önem:** 🟡 ORTA

---

## Belirti

```
Type 'string | undefined' is not assignable to type 'string'.
Type 'undefined' is not assignable to type 'string'.
```

Build başarısız, tip uyumsuzluğu.

---

## Yaygın Senaryolar

### 1. Optional Property

```typescript
interface User {
  name: string;
  email?: string;  // string | undefined
}

// HATA
const emailLower: string = user.email.toLowerCase();

// ÇÖZÜM 1: Varsayılan değer
const emailLower: string = (user.email || "").toLowerCase();

// ÇÖZÜM 2: Nullish coalescing
const emailLower: string = (user.email ?? "").toLowerCase();

// ÇÖZÜM 3: Optional chaining + fallback
const emailLower: string = user.email?.toLowerCase() ?? "";
```

### 2. Array Property

```typescript
interface Item {
  tags?: string[];
}

// HATA
const firstTag = item.tags[0];

// ÇÖZÜM
const firstTag = item.tags?.[0] ?? "";
const tagCount = item.tags?.length ?? 0;
const allTags = item.tags ?? [];
```

### 3. Nested Object

```typescript
interface Product {
  visualProperties?: {
    dominantColors?: string[];
  };
}

// HATA
const colors = product.visualProperties.dominantColors;

// ÇÖZÜM
const colors = product.visualProperties?.dominantColors ?? [];
```

---

## Çözüm Stratejileri

| Durum | Çözüm |
|-------|-------|
| `string \| undefined` | `value ?? ""` veya `value \|\| ""` |
| `number \| undefined` | `value ?? 0` |
| `boolean \| undefined` | `value ?? false` |
| `T[] \| undefined` | `value ?? []` |
| `Object \| undefined` | `value ?? {}` |

---

## Kontrol Listesi

- [ ] Optional property'ler (`?`) için fallback değer var mı?
- [ ] Array erişiminde optional chaining (`?.`) kullanıldı mı?
- [ ] Nested object erişiminde her seviye kontrol ediliyor mu?

---

## İlgili Sorunlar

- [SOLVED-003: Assets CRUD](../solved/SOLVED-003-assets-crud.md) - visualProperties tip hatası

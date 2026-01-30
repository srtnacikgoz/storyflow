---
name: saas-dostu
description: SaaS-dostu, multi-tenant aware kod yazım standartları. Hardcoded yasağı, tam zincir kontrolü, tenant isolation, config-driven yaklaşım. Use when writing new features, refactoring code, adding UI fields, creating API endpoints, designing database schemas. Triggers on "yeni özellik", "ekle", "oluştur", "refactor", "değiştir".
---

# SaaS-Dostu Kod Yazım Standartları

**Bu skill, her kod yazımında SaaS perspektifini ve işlevsellik garantisini sağlar.**

> "Bir özellik ya tam çalışır, ya da hiç olmaz."
> "Hardcoded değer = Teknik borç = SaaS'ta ölüm"

---

## Ne Zaman Aktif?

Bu skill şu durumlarda **otomatik** devreye girer:

| Durum | Tetikleyici |
|-------|-------------|
| Yeni özellik yazarken | "ekle", "oluştur", "yeni", "implement" |
| Refactor yaparken | "refactor", "düzenle", "iyileştir" |
| UI/Form alanı eklerken | "alan ekle", "input", "form", "checkbox" |
| API endpoint oluştururken | "endpoint", "API", "controller" |
| Veritabanı şeması tasarlarken | "collection", "schema", "model", "type" |

---

## ALTIN KURALLAR

### 1. İŞLEVSİZ KOD YASAĞI

**Her kod satırı gerçek bir etki yaratmalı.**

```
UI'da görünüyor mu? → Kayıt ediliyor mu? → İşleniyor mu? → Sonuç üretiyor mu?
        ↓                    ↓                  ↓                 ↓
       ✓                    ✓                  ✓                 ✓

Herhangi biri ✗ ise → KOD YAZMA veya TAM ZİNCİRİ TAMAMLA
```

**Kontrol Soruları:**
- [ ] Bu alan/özellik nerede kullanılıyor?
- [ ] Kaydedilen değer bir yerde OKUNUYOR mu?
- [ ] Okunan değer bir SONUÇ üretiyor mu?
- [ ] Kullanıcı bu özelliği kullandığında fark ediyor mu?

**YASAK Örnekler:**
```typescript
// ❌ YANLIŞ: Kaydediliyor ama hiçbir yerde kullanılmıyor
const scenario = {
  lightingPreference: data.lightingPreference, // UI'da var, kaydediliyor ama...
};
// promptBuilder'da lightingPreference hiç okunmuyor!

// ❌ YANLIŞ: "İleride lazım olur" mantığı
interface User {
  futureFeature?: string; // Şimdi kullanılmıyor, "sonra işleriz"
}
```

**DOĞRU Yaklaşım:**
```typescript
// ✓ DOĞRU: Tam zincir çalışıyor
const scenario = {
  lightingPreference: data.lightingPreference,
};

// promptBuilder.ts'de:
if (scenario.lightingPreference) {
  prompt += `, ${scenario.lightingPreference} lighting`; // KULLANILIYOR!
}
```

---

### 2. HARDCODED YASAĞI

**Sabit değerler = Ölçeklenemez kod = SaaS'ta felaket**

| YASAK | ZORUNLU |
|-------|---------|
| `enum Status { ... }` | Firestore `global/config/statuses` |
| `const CATEGORIES = [...]` | Firestore `categories` collection |
| `if (type === "pasta")` | `if (type === config.pastaType)` |
| `timeout: 5000` | `timeout: config.timeoutMs` |

**Kontrol Soruları:**
- [ ] Bu değer tenant'a göre değişebilir mi?
- [ ] Bu değer admin panelden yönetilebilmeli mi?
- [ ] Bu değer deploy olmadan güncellenebilmeli mi?

**3 sorudan birine EVET ise → CONFIG'E TAŞI**

**Pattern:**
```typescript
// ❌ YANLIŞ
const ASSET_CATEGORIES = ["plate", "table", "cup"];

// ✓ DOĞRU
const categories = await getCategories(); // Firestore'dan
// veya
const categories = config.assetCategories; // Config'den
```

---

### 3. TENANT ISOLATION (Multi-Tenant Hazırlık)

**Her veri parçası tenant'a ait olmalı.**

**Firestore Yapısı:**
```
// ❌ YANLIŞ - Global, tenant yok
assets/
  asset-1
  asset-2

// ✓ DOĞRU - Tenant bazlı
tenants/{tenantId}/assets/
  asset-1
  asset-2

// veya field bazlı
assets/
  asset-1: { tenantId: "tenant-1", ... }
  asset-2: { tenantId: "tenant-2", ... }
```

**Kod Örneği:**
```typescript
// ❌ YANLIŞ
const assets = await db.collection("assets").get();

// ✓ DOĞRU
const assets = await db
  .collection("assets")
  .where("tenantId", "==", currentTenantId)
  .get();
```

**Not:** Şu an tek tenant olsa bile, yapıyı multi-tenant ready tut.

---

### 4. CONFIG-DRIVEN YAKLAŞIM

**Tüm davranışlar config'den kontrol edilmeli.**

**Config Hiyerarşisi:**
```
1. Tenant Config (en yüksek öncelik)
   ↓
2. Global Config
   ↓
3. Default Values (kod içinde, fallback)
```

**Örnek:**
```typescript
// Config yapısı
interface TenantConfig {
  features: {
    visualGeneration: boolean;
    telegramApproval: boolean;
  };
  limits: {
    maxAssetsPerCategory: number;
    maxSlotsPerDay: number;
  };
  branding: {
    primaryColor: string;
    logoUrl: string;
  };
}

// Kullanım
const config = await getTenantConfig(tenantId);
if (config.features.telegramApproval) {
  await sendTelegramNotification();
}
```

---

### 5. FEATURE FLAGS

**Özellikler tenant bazlı açılıp kapanabilmeli.**

```typescript
// ✓ DOĞRU
interface FeatureFlags {
  enableVisualCritic: boolean;      // Görsel kritik özelliği
  enableAutoScheduler: boolean;     // Otomatik zamanlama
  enablePetInPhotos: boolean;       // Fotoğraflarda köpek
  enableAccessorySelection: boolean; // Aksesuar seçimi
}

// Kullanım
if (await isFeatureEnabled(tenantId, "enableVisualCritic")) {
  result = await runVisualCritic(image);
}
```

---

### 6. SOFT DELETE

**Veri asla fiziksel silinmez.**

```typescript
// ❌ YANLIŞ
await db.collection("assets").doc(id).delete();

// ✓ DOĞRU
await db.collection("assets").doc(id).update({
  isDeleted: true,
  deletedAt: Date.now(),
  deletedBy: userId,
});

// Sorgularda
const assets = await db
  .collection("assets")
  .where("isDeleted", "==", false) // veya where("isDeleted", "!=", true)
  .get();
```

---

## PRE-CODE CHECKLIST

**Kod yazmadan ÖNCE bu listeyi kontrol et:**

```
┌─────────────────────────────────────────────────────────────┐
│  📋 SaaS-Dostu Pre-Code Checklist                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  □ Bu özellik tam zincir olarak çalışacak mı?              │
│    (UI → Kayıt → İşleme → Sonuç)                           │
│                                                             │
│  □ Hardcoded değer var mı? Config'e taşınabilir mi?        │
│                                                             │
│  □ Tenant ID gerekli mi? Multi-tenant ready mi?            │
│                                                             │
│  □ Feature flag gerekli mi?                                │
│                                                             │
│  □ Soft delete kullanılıyor mu?                            │
│                                                             │
│  □ Bu özellik admin panelden yönetilebilir mi?             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## POST-CODE REVIEW

**Kod yazdıktan SONRA bu kontrolü yap:**

### Zincir Tamamlık Kontrolü

Her yeni alan için:
```
1. UI'da görünüyor mu?           → [dosya:satır]
2. State'e/Form'a bağlı mı?      → [dosya:satır]
3. API'ye gönderiliyor mu?       → [dosya:satır]
4. Backend'de alınıyor mu?       → [dosya:satır]
5. Firestore'a kaydediliyor mu?  → [dosya:satır]
6. Bir yerde okunuyor mu?        → [dosya:satır]
7. Sonuç üretiyor mu?            → [dosya:satır]
```

**Herhangi bir adım eksikse → TAMAMLA veya SİL**

---

## KIRMIZI BAYRAKLAR

Bu cümleleri duyduğunda ALARM:

| Cümle | Anlam | Aksiyon |
|-------|-------|---------|
| "Şimdilik kaydetsin, sonra işleriz" | İşlevsiz kod | YAPMA |
| "İleride lazım olur" | Over-engineering | YAPMA |
| "Enum olarak tanımlayalım" | Hardcoded | CONFIG'E TAŞI |
| "Sadece bu proje için" | SaaS-unfriendly | GENEL YAP |
| "Hızlıca yapalım" | Teknik borç | DOĞRU YAP |

---

## ÖRNEK: DOĞRU YAKLAŞIM

**Senaryo:** Asset kategorileri eklemek istiyoruz.

### ❌ YANLIŞ Yaklaşım:
```typescript
// types.ts
enum AssetCategory {
  PLATE = "plate",
  TABLE = "table",
  CUP = "cup",
}

// component.tsx
<select>
  {Object.values(AssetCategory).map(cat => (
    <option>{cat}</option>
  ))}
</select>
```

**Sorunlar:**
- Hardcoded enum
- Yeni kategori = deploy gerekli
- Tenant bazlı kategori yok

### ✓ DOĞRU Yaklaşım:
```typescript
// Firestore: global/config/settings/categories
// veya: tenants/{tenantId}/config/categories

// categoryService.ts
export async function getCategories(tenantId?: string): Promise<Category[]> {
  const path = tenantId
    ? `tenants/${tenantId}/config/categories`
    : "global/config/settings/categories";

  const doc = await db.doc(path).get();
  return doc.data()?.items || DEFAULT_CATEGORIES;
}

// component.tsx
const [categories, setCategories] = useState<Category[]>([]);

useEffect(() => {
  getCategories(tenantId).then(setCategories);
}, [tenantId]);

<select>
  {categories.map(cat => (
    <option key={cat.id}>{cat.displayName}</option>
  ))}
</select>
```

**Avantajlar:**
- Config-driven
- Deploy gerektirmez
- Tenant bazlı özelleştirilebilir
- Admin panelden yönetilebilir

---

## REFERANSLAR

Bu skill aşağıdaki kuralları tamamlar:

- `.claude/rules/ISLEVSIZ-KOD-YASAGI.md` - İşlevsiz kod detayları
- `.claude/rules/PROJE-KURALLARI.md` - Genel kod standartları
- `.claude/rules/Iron-Rules.md` - Temel güvenlik kuralları

---

## ÖZET

```
┌────────────────────────────────────────────────────────────┐
│                   SaaS-Dostu Manifesto                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Her kod satırı GERÇEK ETKİ yaratmalı                  │
│  2. Hardcoded değer YASAK - Config kullan                 │
│  3. Multi-tenant HAZIR ol                                  │
│  4. Feature flags ile KONTROL sağla                       │
│  5. Soft delete ile VERİYİ KORU                           │
│  6. Admin panelden YÖNETİLEBİLİR yap                      │
│                                                            │
│  "Bugün tek tenant için yazıyorsun,                       │
│   yarın 1000 tenant kullanacak."                          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

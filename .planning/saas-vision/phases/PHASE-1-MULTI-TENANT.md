# Phase 1: Multi-Tenant Altyapı

> **Hedef:** Tek tenant'tan çoklu tenant mimarisine geçiş
> **Önkoşul:** Phase 0 tamamlanmış olmalı
> **Öncelik:** 🔴 Kritik

---

## 📋 Genel Bakış

Phase 1'de:
1. Veri yapısını tenant-isolated hale getiriyoruz
2. Tenant yönetim sistemini kuruyoruz
3. İlk tenant olarak Sade Pastanesi'ni migrate ediyoruz
4. Tenant onboarding flow'u oluşturuyoruz

---

## 🎯 Atomik Görevler

### 1.1 Veri Migration Altyapısı

#### 1.1.1 Migration Script Framework
- [ ] Migration runner oluştur
- [ ] Versiyonlama sistemi
- [ ] Dry-run modu (preview)
- [ ] Rollback mekanizması

```typescript
// Migration script örneği
export const migration_001_create_tenant_structure: Migration = {
  version: '001',
  name: 'create_tenant_structure',

  async up(db) {
    // Yeni yapıyı oluştur
  },

  async down(db) {
    // Geri al
  },

  async verify(db) {
    // Başarılı mı kontrol et
    return true;
  }
};
```

#### 1.1.2 Veri Audit
- [ ] Mevcut collection'lardaki veri sayıları
- [ ] Veri ilişkileri haritası
- [ ] Orphan kayıtları tespit et

#### 1.1.3 Backup Stratejisi
- [ ] Migration öncesi full backup
- [ ] Point-in-time recovery planı
- [ ] Export/import script'leri

---

### 1.2 Tenant Veri Yapısı

#### 1.2.1 Tenant Collection Oluştur
- [ ] `tenants` root collection
- [ ] Tenant document şeması
- [ ] Subcollection yapısı

```typescript
// tenants/{tenantId}
interface TenantDocument {
  id: string;
  name: string;                    // "Sade Pastanesi"
  slug: string;                    // "sade-pastanesi"
  industryModule: string;          // "pastane"
  status: 'active' | 'suspended' | 'trial';
  plan: 'starter' | 'professional' | 'enterprise';
  createdAt: Timestamp;
  config: TenantConfig;
  limits: TenantLimits;
}

// tenants/{tenantId}/products/{productId}
// tenants/{tenantId}/assets/{assetId}
// tenants/{tenantId}/scheduled-slots/{slotId}
// ...
```

#### 1.2.2 Global Collection Oluştur
- [ ] `global/industry-modules/{moduleId}`
- [ ] `global/system-config`
- [ ] `global/pricing-plans`

#### 1.2.3 Admin Collection Oluştur
- [ ] `admin/users/{userId}`
- [ ] `admin/audit-logs/{logId}`

---

### 1.3 Sade Pastanesi Migration

#### 1.3.1 Test Ortamında Deneme
- [ ] Emulator'da migration test
- [ ] Veri bütünlüğü kontrolü
- [ ] Performans ölçümü

#### 1.3.2 Production Migration
- [ ] Maintenance mode aktif et
- [ ] Backup al
- [ ] Migration çalıştır
- [ ] Verification
- [ ] Maintenance mode kapat

**Migration Adımları:**
```
1. tenants/sade-pastanesi document oluştur
2. products → tenants/sade-pastanesi/products kopyala
3. assets → tenants/sade-pastanesi/assets kopyala
4. scheduled-slots → tenants/sade-pastanesi/scheduled-slots kopyala
5. media-queue → tenants/sade-pastanesi/media-queue kopyala
6. ai-rules → tenants/sade-pastanesi/ai-rules kopyala
7. ai-feedback → tenants/sade-pastanesi/ai-feedback kopyala
8. config → tenants/sade-pastanesi/config kopyala
9. Eski collection'ları soft-delete (prefix ekle: _archived_)
```

#### 1.3.3 Kod Güncellemesi
- [ ] Service'lerde collection path'lerini güncelle
- [ ] TenantContext middleware ekle
- [ ] Query'lere tenantId filtresi ekle

---

### 1.4 Tenant Authentication

#### 1.4.1 Firebase Auth Entegrasyonu
- [ ] Custom claims ile tenant ID ekle
- [ ] Token'a tenantId embed et
- [ ] Auth middleware güncelle

```typescript
// Token'a tenant claim ekle
await admin.auth().setCustomUserClaims(uid, {
  tenantId: 'sade-pastanesi',
  role: 'admin'
});
```

#### 1.4.2 Tenant Middleware
- [ ] Her request'te tenant doğrulama
- [ ] Tenant isolation enforce
- [ ] Cross-tenant erişim engelle

```typescript
const tenantMiddleware = async (req, res, next) => {
  const tenantId = req.auth.token.tenantId;

  if (!tenantId) {
    return res.status(403).json({ error: 'No tenant access' });
  }

  req.tenantContext = {
    tenantId,
    tenantPath: `tenants/${tenantId}`
  };

  next();
};
```

#### 1.4.3 Firestore Security Rules
- [ ] Tenant isolation rules
- [ ] Role-based access
- [ ] Admin override rules

---

### 1.5 Super Admin Panel (Temel)

#### 1.5.1 Tenant Listesi
- [ ] Tüm tenant'ları listele
- [ ] Durum göster (active, suspended)
- [ ] Temel metrikleri göster

#### 1.5.2 Tenant Ekleme
- [ ] Manuel tenant oluşturma formu
- [ ] Industry module seçimi
- [ ] Temel config ayarlama
- [ ] Admin kullanıcı davet

#### 1.5.3 Tenant Düzenleme
- [ ] Config güncelleme
- [ ] Status değiştirme
- [ ] Plan değiştirme

---

### 1.6 Tenant Onboarding Flow

#### 1.6.1 Onboarding Wizard
- [ ] Adım 1: İşletme bilgileri
- [ ] Adım 2: Sektör seçimi (industry module)
- [ ] Adım 3: Instagram bağlantısı
- [ ] Adım 4: Telegram bot kurulumu
- [ ] Adım 5: İlk ürün ekleme

#### 1.6.2 Otomatik Setup
- [ ] Varsayılan konfigürasyon oluştur
- [ ] Örnek ürünler ekle (opsiyonel)
- [ ] Welcome tour

#### 1.6.3 Self-Service (İleri Aşama)
- [ ] Signup flow
- [ ] Plan seçimi
- [ ] Ödeme entegrasyonu (Iyzico/Stripe)

---

## ✅ Tamamlanma Kriterleri

Phase 1 tamamlanmış sayılır eğer:

1. **Sade Pastanesi başarıyla migrate edildi**
   - Tüm veriler yeni yapıda
   - Eski collection'lar arşivlendi
   - Sistem normal çalışıyor

2. **Tenant isolation çalışıyor**
   - Bir tenant diğerinin verisine erişemiyor
   - Security rules aktif ve test edilmiş

3. **Super admin en az bir tenant ekleyebilir**
   - Manuel tenant oluşturma çalışıyor
   - Temel konfigürasyon ayarlanabiliyor

4. **En az 1 test tenant oluşturuldu**
   - Demo/test amaçlı ikinci tenant
   - Sistemin çalıştığının kanıtı

---

## 🔄 Checkpoint'ler

### Migration Öncesi
- [ ] Full backup alındı
- [ ] Rollback script'i test edildi
- [ ] Maintenance window belirlendi

### Migration Sonrası
- [ ] Veri bütünlüğü doğrulandı
- [ ] Tüm kritik akışlar test edildi
- [ ] Performance regression yok

---

## ⚠️ Riskler ve Dikkat Edilecekler

| Risk | Etki | Önlem |
|------|------|-------|
| Veri kaybı | 🔴 Kritik | Multiple backup, dry-run |
| Downtime | 🟡 Orta | Maintenance window, hızlı rollback |
| Performance | 🟡 Orta | Index'ler, query optimization |
| Security açığı | 🔴 Kritik | Security rules review, penetration test |

---

## 📝 Notlar

- Bu phase'de Sade Pastanesi ÇALIŞMAYA DEVAM ETMELİ
- Migration sırasında maksimum 1 saat downtime kabul edilebilir
- Her adım geri alınabilir olmalı
- Yeni tenant eklerken mevcut sistemi bozma

---

> **Son Güncelleme:** 2026-01-23
> **Durum:** Phase 0 bekleniyor

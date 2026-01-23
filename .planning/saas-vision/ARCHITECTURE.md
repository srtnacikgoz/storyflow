# Maestro AI - Multi-Tenant Mimari Dökümanı

> **Hedef:** Monolitik MVP'den ölçeklenebilir SaaS'a dönüşüm

---

## 📊 Mevcut Mimari (MVP)

```
┌─────────────────────────────────────────────────────────────┐
│                     MEVCUT YAPI                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Admin     │───▶│   Firebase   │◀───│  Telegram    │   │
│  │   Panel     │    │  Functions   │    │     Bot      │   │
│  │  (React)    │    │              │    │              │   │
│  └─────────────┘    └──────────────┘    └──────────────┘   │
│                            │                                 │
│                            ▼                                 │
│                     ┌──────────────┐                        │
│                     │  Firestore   │                        │
│                     │  (Tek DB)    │                        │
│                     └──────────────┘                        │
│                                                              │
│  Hardcoded: Sade Pastanesi                                  │
│  Single tenant, monolithic                                   │
└─────────────────────────────────────────────────────────────┘
```

### Mevcut Problemler
1. **Tenant izolasyonu yok** - Tüm veriler tek collection'da
2. **Hardcoded konfigürasyonlar** - Senaryolar, renkler, stiller kodda
3. **Tek Instagram hesabı** - Multi-account desteği yok
4. **Telegram bot paylaşımlı** - Her tenant'a özel değil

---

## 🎯 Hedef Mimari (SaaS)

```
┌─────────────────────────────────────────────────────────────────────┐
│                       HEDEF MİMARİ                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    SUPER ADMIN PANEL                         │   │
│  │   • Tenant yönetimi  • Faturalandırma  • Global ayarlar     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌───────────────────────────┼───────────────────────────┐         │
│  │                           │                            │         │
│  ▼                           ▼                            ▼         │
│  ┌─────────┐           ┌─────────┐           ┌─────────┐           │
│  │Tenant A │           │Tenant B │           │Tenant C │           │
│  │Admin    │           │Admin    │           │Admin    │           │
│  │Panel    │           │Panel    │           │Panel    │           │
│  └────┬────┘           └────┬────┘           └────┬────┘           │
│       │                     │                     │                 │
│       └─────────────────────┼─────────────────────┘                 │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    CORE ENGINE                                │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │  │
│  │  │  Scenario  │  │   Image    │  │    Scheduling          │  │  │
│  │  │  Selector  │  │  Generator │  │    Engine              │  │  │
│  │  └────────────┘  └────────────┘  └────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    INDUSTRY MODULES                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │  │
│  │  │ Pastane  │  │  Kahve   │  │  Pizza   │  │ Restoran │     │  │
│  │  │ Module   │  │  Module  │  │  Module  │  │  Module  │     │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    DATA LAYER                                 │  │
│  │                                                               │  │
│  │   tenants/{tenantId}/                                        │  │
│  │   ├── products/                                              │  │
│  │   ├── assets/                                                │  │
│  │   ├── scheduled-slots/                                       │  │
│  │   ├── media-queue/                                           │  │
│  │   ├── ai-rules/                                              │  │
│  │   └── config                                                 │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Veri Modeli Dönüşümü

### Mevcut (Flat)
```
firestore/
├── products/           # Tüm ürünler
├── assets/             # Tüm görseller
├── scheduled-slots/    # Tüm zamanlamalar
├── media-queue/        # Tüm kuyruk
├── ai-rules/           # Tüm kurallar
└── config/             # Tek konfigürasyon
```

### Hedef (Tenant-Isolated)
```
firestore/
├── tenants/
│   ├── {tenantId}/
│   │   ├── products/
│   │   ├── assets/
│   │   ├── scheduled-slots/
│   │   ├── media-queue/
│   │   ├── ai-rules/
│   │   ├── ai-feedback/
│   │   └── config/
│   │       ├── instagram
│   │       ├── telegram
│   │       ├── branding
│   │       └── industry-module
│   │
│   ├── {anotherTenantId}/
│   │   └── ...
│   │
├── global/
│   ├── industry-modules/
│   │   ├── pastane/
│   │   ├── kahve/
│   │   └── pizza/
│   ├── system-config/
│   └── pricing-plans/
│
└── admin/
    ├── users/
    ├── billing/
    └── audit-logs/
```

---

## 🔧 Core Engine Bileşenleri

### 1. Scenario Selector
```typescript
interface ScenarioSelector {
  // Tenant'ın industry module'üne göre senaryo seç
  selectScenario(tenantId: string, context: ProductContext): Scenario;

  // Tenant'ın özel kurallarını uygula
  applyTenantRules(scenario: Scenario, rules: AIRule[]): Scenario;
}
```

### 2. Image Generator
```typescript
interface ImageGenerator {
  // Temel görsel üretim (tüm tenant'lar için)
  generateImage(scenario: Scenario, product: Product): Promise<GeneratedImage>;

  // Tenant branding uygula
  applyBranding(image: GeneratedImage, branding: TenantBranding): Promise<GeneratedImage>;
}
```

### 3. Scheduling Engine
```typescript
interface SchedulingEngine {
  // Tenant'ın time slot'larına göre zamanla
  schedulePost(tenantId: string, image: GeneratedImage): Promise<ScheduledSlot>;

  // Optimal saat hesapla (tenant analytics'e göre)
  calculateOptimalTime(tenantId: string, dayOfWeek: number): TimeSlot;
}
```

---

## 🏭 Industry Module Yapısı

Her sektör modülü şunları içerir:

```typescript
interface IndustryModule {
  id: string;                    // "pastane", "kahve", "pizza"
  name: string;                  // "Pastane/Fırın"

  // Varsayılan senaryolar
  defaultScenarios: Scenario[];

  // Ürün kategorileri
  productCategories: Category[];

  // Varsayılan aksesuar tipleri
  accessoryTypes: AccessoryType[];

  // Varsayılan stiller
  defaultStyles: {
    backdrop: string;            // "off-white marble"
    lighting: string;            // "soft diffused"
    mood: string;                // "warm inviting"
  };

  // Sektöre özel prompt şablonları
  promptTemplates: PromptTemplate[];

  // Varsayılan caption şablonları
  captionTemplates: CaptionTemplate[];
}
```

### Pastane Modülü (Mevcut - Referans)
```typescript
const pastahanModule: IndustryModule = {
  id: "pastane",
  name: "Pastane/Fırın",
  defaultScenarios: [
    { id: "single-hero", name: "Tek Ürün Hero Shot" },
    { id: "lifestyle", name: "Yaşam Tarzı" },
    { id: "group-arrangement", name: "Grup Düzenleme" },
    // ...
  ],
  productCategories: [
    "Pasta", "Kurabiye", "Ekmek", "Börek", "Tatlı"
  ],
  accessoryTypes: [
    { id: "plate", name: "Tabak" },
    { id: "cup", name: "Fincan" },
    { id: "napkin", name: "Peçete" },
    // ...
  ],
  defaultStyles: {
    backdrop: "off-white marble surface",
    lighting: "soft diffused natural light",
    mood: "warm, inviting, artisanal"
  }
};
```

---

## 🔐 Tenant İzolasyonu

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Tenant verilerine erişim
    match /tenants/{tenantId}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.token.tenantId == tenantId;
    }

    // Global modüller - sadece okuma
    match /global/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'super_admin';
    }

    // Admin işlemleri
    match /admin/{document=**} {
      allow read, write: if request.auth.token.role == 'super_admin';
    }
  }
}
```

### API Request Flow
```
Client Request
      │
      ▼
┌─────────────┐
│ Auth Check  │ ─── Token valid? Tenant ID extract
└─────────────┘
      │
      ▼
┌─────────────┐
│ Tenant      │ ─── tenantId'yi request context'e ekle
│ Middleware  │
└─────────────┘
      │
      ▼
┌─────────────┐
│ Service     │ ─── Her query'de tenantId filtresi
│ Layer       │
└─────────────┘
      │
      ▼
┌─────────────┐
│ Firestore   │ ─── /tenants/{tenantId}/...
└─────────────┘
```

---

## 📦 Migration Stratejisi

### Phase 0: Hazırlık
1. Mevcut veriyi analiz et
2. Yeni şema tanımla
3. Migration script'leri yaz

### Phase 1: Soft Migration
1. Yeni tenant yapısı oluştur
2. Mevcut veriyi "sade-pastanesi" tenant'ına kopyala
3. Eski collection'ları read-only yap
4. Yeni yapıya yazma başla

### Phase 2: Hard Migration
1. Tüm okumayı yeni yapıya yönlendir
2. Eski collection'ları arşivle
3. Kod temizliği

### Rollback Planı
Her phase için:
- Önceki state snapshot
- Geri dönüş script'leri
- Max 2 saat içinde rollback garantisi

---

## 🔄 Deployment Model

### Şu an (Monolithic)
```
firebase deploy
└── functions/
└── admin/ (hosting)
```

### Hedef (Multi-Environment)
```
Production
├── Core Engine (Cloud Functions)
├── Admin Panel (Firebase Hosting)
├── Super Admin (Ayrı hosting)
└── Tenant Configs (Firestore)

Staging
├── Test tenant'lar
├── Feature flags
└── Canary deployments
```

---

## 📈 Ölçekleme Notları

### Firestore Limitleri
- 1 MB max document size
- 1 write/second per document
- 500 writes/second per collection

### Çözümler
- Büyük veriler için Cloud Storage
- Write batching
- Subcollection kullanımı

### Cost Optimization
- Firestore reads minimize et
- Cloud Functions cold start'ları azalt
- Image caching stratejisi

---

> **Son Güncelleme:** 2026-01-23
> **Versiyon:** 1.0

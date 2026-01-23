# Phase 0: Temel Hazırlık

> **Hedef:** Multi-tenant dönüşüm için sağlam bir temel oluşturmak
> **Tahmini Süre:** Belirsiz (atomik ilerleyeceğiz)
> **Öncelik:** 🔴 Kritik

---

## 📋 Genel Bakış

Phase 0, SaaS dönüşümünün temelidir. Burada:
1. Mevcut teknik borcu temizliyoruz
2. Konfigürasyon sistemini merkezileştiriyoruz
3. Test altyapısı kuruyoruz
4. Mevcut kodu multi-tenant'a hazırlıyoruz

---

## 🎯 Atomik Görevler

### 0.1 Teknik Borç Temizliği

#### 0.1.1 Hardcoded Değerleri Tespit Et
- [ ] Tüm kodda hardcoded Sade/pastane referanslarını bul
- [ ] Her birini bir listede topla
- [ ] Öncelik sırası belirle (kritik → düşük)

**Kontrol Edilecek Yerler:**
```
functions/src/services/
functions/src/orchestrator/
admin/src/
.claude/references/ORCHESTRATOR.md
```

#### 0.1.2 Konfigürasyon Çıkarma - Senaryolar
- [ ] ORCHESTRATOR.md'deki senaryoları JSON/TS'e dönüştür
- [ ] Firestore'a industry-module olarak kaydet
- [ ] Kod'u Firestore'dan okuyacak şekilde güncelle

**Önce:**
```typescript
// Hardcoded senaryo listesi
const scenarios = [
  { id: "single-hero", ... },
  { id: "lifestyle", ... }
];
```

**Sonra:**
```typescript
// Firestore'dan dinamik okuma
const scenarios = await getIndustryScenarios(industryModule);
```

#### 0.1.3 Konfigürasyon Çıkarma - Stiller
- [ ] Backdrop, lighting, mood gibi değerleri çıkar
- [ ] Industry module config'e taşı
- [ ] Prompt builder'ı dinamik hale getir

#### 0.1.4 Konfigürasyon Çıkarma - Aksesuar Tipleri
- [ ] Plate, cup, napkin gibi tipleri çıkar
- [ ] Industry module'e taşı
- [ ] UI'ı dinamik liste gösterecek şekilde güncelle

---

### 0.2 Merkezi Konfigürasyon Sistemi

#### 0.2.1 Config Service Oluştur
- [ ] `ConfigService` class'ı oluştur
- [ ] Firestore'dan config okuma
- [ ] Caching mekanizması (memory + TTL)
- [ ] Fallback değerleri

```typescript
// Hedef API
const config = await ConfigService.get('sade-pastanesi');
const scenarios = config.industryModule.scenarios;
const styles = config.industryModule.defaultStyles;
```

#### 0.2.2 Config Şeması Tanımla
- [ ] TypeScript interface'leri oluştur
- [ ] Validation rules yaz
- [ ] Migration script hazırla

```typescript
interface TenantConfig {
  id: string;
  name: string;
  industryModule: IndustryModuleId;
  instagram: InstagramConfig;
  telegram: TelegramConfig;
  branding: BrandingConfig;
  features: FeatureFlags;
}
```

#### 0.2.3 Admin Panel Config Sayfası
- [ ] Config görüntüleme sayfası
- [ ] Temel düzenleme (sadece okuma için şimdilik)
- [ ] Config export/import

---

### 0.3 Test Altyapısı

#### 0.3.1 Unit Test Setup
- [ ] Jest/Vitest kurulumu (functions için)
- [ ] Test utilities oluştur
- [ ] Mock helpers yaz

**Test Edilecek Kritik Fonksiyonlar:**
- `selectScenario()`
- `optimizePrompt()`
- `calculateNextSlot()`

#### 0.3.2 Integration Test Setup
- [ ] Firebase emulator konfigürasyonu
- [ ] Test tenant verisi oluştur
- [ ] CI/CD entegrasyonu (opsiyonel)

#### 0.3.3 Smoke Test Suite
- [ ] Kritik akışlar için basit testler
- [ ] Deploy öncesi çalıştırılacak
- [ ] Başarısız olursa deploy engelle

---

### 0.4 Kod Refactoring

#### 0.4.1 Service Layer Temizliği
- [ ] Her service'i gözden geçir
- [ ] Tekrarlayan kodu çıkar
- [ ] Error handling standardize et

#### 0.4.2 TenantContext Hazırlığı
- [ ] `TenantContext` interface tanımla
- [ ] Her service'e tenantId parametre ekle (opsiyonel, default: "sade")
- [ ] Firestore query'lerini hazırla

```typescript
// Şu an
async function getProducts() {
  return db.collection('products').get();
}

// Hazırlık (henüz migrate etmeden)
async function getProducts(tenantId: string = 'sade-pastanesi') {
  // Şimdilik eski collection'ı kullan
  // Phase 1'de değişecek
  return db.collection('products').get();
}
```

#### 0.4.3 API Response Standardizasyonu
- [ ] Tüm API response'ları için standard format
- [ ] Error response formatı
- [ ] Pagination standardı

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    pagination?: PaginationMeta;
    tenantId?: string;
  };
}
```

---

### 0.5 Dokümantasyon

#### 0.5.1 API Dokümantasyonu
- [ ] Mevcut endpoint'leri listele
- [ ] Request/response örnekleri
- [ ] Postman collection oluştur

#### 0.5.2 Veri Modeli Dokümantasyonu
- [ ] Mevcut collection'ları belgele
- [ ] Field açıklamaları
- [ ] İlişkileri çiz

#### 0.5.3 Deployment Dokümantasyonu
- [ ] Mevcut deploy süreci
- [ ] Environment variables listesi
- [ ] Rollback prosedürü

---

## ✅ Tamamlanma Kriterleri

Phase 0 tamamlanmış sayılır eğer:

1. **Hiçbir hardcoded Sade/pastane referansı kalmadı**
   - Tüm değerler config'den okunuyor
   - Default değerler var ama override edilebilir

2. **ConfigService çalışıyor**
   - Firestore'dan config okunabiliyor
   - Caching aktif
   - Fallback'lar çalışıyor

3. **En az 5 kritik fonksiyon için unit test var**
   - Test coverage %50+ (kritik path'ler için)
   - CI'da çalışıyor

4. **Dokümantasyon güncel**
   - API endpoints belgelenmiş
   - Veri modeli belgelenmiş

---

## 🔄 Checkpoint'ler

Her atomik görev sonrası:
1. ✅ Çalışıyor mu? Test et
2. 📝 FEEDBACK.md'ye not ekle (gerekirse)
3. 💾 Git commit at
4. 🔙 Rollback mümkün mü? Kontrol et

---

## ⚠️ Riskler ve Dikkat Edilecekler

| Risk | Etki | Önlem |
|------|------|-------|
| Mevcut sistemi bozma | Yüksek | Her değişiklik sonrası test |
| Scope creep | Orta | Sadece listede olanlara odaklan |
| Over-engineering | Orta | Basit çözümler tercih et |

---

## 📝 Notlar

- Bu phase'de yeni özellik EKLEME
- Sadece mevcut yapıyı düzenle ve hazırla
- Her şey Sade Pastanesi için çalışmaya devam etmeli
- "Çalışıyorsa bozma" ilkesi geçerli

---

> **Son Güncelleme:** 2026-01-23
> **Durum:** Henüz başlanmadı

# Proje Kuralları ve Standartları

> **Son Güncelleme:** 2026-01-09

---

## 📑 İçindekiler

1. [Temel Felsefe (Pragmatik SDUI)](#1-temel-felsefe-pragmatik-sdui)
2. [AI Team Collaboration & Governance](#2-ai-team-collaboration--governance)
3. [Kritik İş Akışı ve Test Standartları](#3-kritik-iş-akışı-ve-test-standartları)
4. [Teknik Mimari (FSD & Migration)](#4-teknik-mimari-fsd--migration)
5. [UI/UX ve DesignOps (Nordic Noir)](#5-uiux-ve-designops-nordic-noir)
6. [Güvenlik ve İzlenebilirlik](#6-güvenlik-ve-izlenebilirlik)
7. [Kod Yazım Standartları](#7-kod-yazım-standartları)
8. [Git & Versiyon Kontrol](#8-git--versiyon-kontrol)
9. [Kurumsal Kimlik](#9-kurumsal-kimlik)
10. [Güncelleme Günlüğü](#10-güncelleme-günlüğü)

---

## 🎯 1. Temel Felsefe (Pragmatik SDUI)

### Kademeli SDUI
İlk aşamada sadece ana sayfa ve kampanya alanları gibi sık değişen yerler SDUI ile yönetilir. Karmaşık iş mantığı içeren ekranlar geleneksel yapıda kalır.

**DO ✅**
- Ana sayfa banner/slider yönetimi için SDUI
- Kampanya kartları için config-driven yaklaşım
- Sık değişen içerikler için backend-controlled UI

**DON'T ❌**
- Karmaşık checkout akışını SDUI ile yönetme
- Kritik iş mantığını config dosyalarına taşıma

### Configuration-First
Bir özellik kodlanmadan önce şeması planlanır. Ancak karmaşıklık, ekip ölçeğiyle doğru orantılı tutulur.

### BFF (Backend-for-Frontend)
İstemciye ham veri yerine, render edilmeye hazır "View Model" gönderilir.

**Örnek:**
```typescript
// ❌ Ham veri
{ productId: 123, price: 100, currency: "TRY" }

// ✅ View Model
{
  displayPrice: "100 ₺",
  formattedName: "Tablet Çikolata (70%)",
  imageUrl: "https://...",
  isAvailable: true
}
```

---

## 🤖 2. AI Team Collaboration & Governance

### Team Structure
- **Claude:** Uygulama geliştirme
- **Gemini:** Denetim & Strateji
- **n8n:** Otomasyon (şimdilik kullanılmıyor)

### Context Management
- Max 5 dosya/prompt
- Büyük işler "chunk"lara bölünür
- Her session başında ilgili dökümanlar okunur

### Hafıza Yönetimi
Her session başında şu dosyalar kontrol edilir:
- `hedefler.md` - Proje hedefleri ve durum
- `GUNLUK.md` - Son yapılan işler
- `FEEDBACK.md` - Aktif bug ve improvement'lar
- `project-rules.md` - Bu dosya

---

## ⚠️ 3. Kritik İş Akışı ve Test Standartları

### Geliştirme Süreci
1. **Fikir & Plan:** AI Mentor ile mimari ve FSD katmanlaması netleştirilir
2. **Test-Driven Development (TDD):** Kritik iş mantığı Vitest ile, UI bileşenleri Storybook ile izole şekilde geliştirilir
3. **Görsel Regresyon:** 1px hassasiyetiyle görsel snapshot testleri yapılır
4. **Onay & Uygula:** AI denetiminden geçen kod, başarı kriterleri sağlandığında merge edilir

### Test Piramidi
```
        /\
       /E2E\          (Az sayıda, kritik akışlar)
      /──────\
     /Integration\    (Orta sayıda, özellik testleri)
    /────────────\
   /  Unit Tests  \   (Çok sayıda, iş mantığı)
  /────────────────\
```

---

## 🛠 4. Teknik Mimari (FSD & Migration)

### Feature-Sliced Design (FSD)
Katmanlar (aşağıdan yukarıya):
1. **shared/** - Ortak UI bileşenleri, utils, hooks
2. **entities/** - İş varlıkları (Product, User, Order)
3. **features/** - Kullanıcı aksiyonları (AddToCart, Login)
4. **widgets/** - Kompozit bileşenler (Header, ProductCard)
5. **pages/** - Sayfa bileşenleri

### Migration Path
Mevcut kodlar "Tombstoning" yöntemiyle kademeli olarak FSD'ye taşınır:

**Adımlar:**
1. Yeni özellikler FSD yapısında yazılır
2. Eski kodlar `@deprecated` ile işaretlenir
3. Kritik refactor ihtiyaçları FEEDBACK.md'ye eklenir
4. Kademeli migration yapılır

### Dosya Limitleri
- **200-500 satır** kuralı esastır
- 500+ satır aşan kodlar hook veya atomik parçalara ayrılır
- Component logic ve UI ayrı dosyalarda tutulur

**Örnek:**
```
ProductDetail.tsx (350 satır) ✅
  ├── useProductData.ts (100 satır)
  ├── ProductInfo.tsx (80 satır)
  └── ProductActions.tsx (120 satır)
```

### Z-Index Standartları
| Katman | Z-Index | Kullanım |
|--------|---------|----------|
| Sticky | 100 | Sticky header, navigation |
| Overlay | 500 | Modal backdrop, overlay |
| Modal | 1000 | Dialog, modal |
| Popover | 1500 | Dropdown, tooltip |
| Toast | 2000 | Notification, snackbar |

---

## 🎨 5. UI/UX ve DesignOps (Nordic Noir)

### Design Tokens
Renk ve boşluklar Figma'dan JSON olarak beslenir (Generated Code).

### Accessibility (a11y)
- **WCAG 2.1** standartları zorunlu
- CI/CD'de otomatik a11y testleri
- Keyboard navigation desteği şart
- Screen reader uyumluluğu

**Checklist:**
- [ ] Tüm butonlar keyboard ile erişilebilir
- [ ] ARIA labels tanımlı
- [ ] Renk kontrastı minimum 4.5:1
- [ ] Focus indicators görünür

### Modern Köşeler (Rounded Corners)
- **Ana elementler:** `rounded-[32px]`
- **Kartlar:** `rounded-2xl` (24px)
- **Butonlar:** `rounded-xl` (12px)
- **Input alanları:** `rounded-lg` (8px)

### Renk Paleti

| Renk | Hex | Kullanım |
|------|-----|----------|
| **Brand Blue** | `#a4d1e8` | Birincil aksiyonlar |
| **Brand Yellow** | `#e7c57d` | Vurgular, highlight |
| **Brand Mustard** | `#d4a945` | Özel teklifler |
| **Brand Green** | `#a4d4bc` | Başarı mesajları |
| **Brand Peach** | `#f3d1c8` | Yumuşak arka planlar |
| **Brand Orange** | `#e59a77` | Uyarılar, CTA |

---

## 🔒 6. Güvenlik ve İzlenebilirlik

### Edge & Security
- A/B testleri Edge seviyesinde çözülür
- Tüm SDUI verileri sanitize edilerek XSS önlenir
- User input her zaman validate edilir
- Sensitive data loglanmaz

### Observability
- **Sentry:** Hata izleme ve raporlama
- **Session Replay:** Kullanıcı deneyimi analizi
- **Performance Monitoring:** Core Web Vitals takibi

### Güvenlik Kuralları
**DO ✅**
- Her user input'u validate et
- Sensitive data encrypt et
- HTTPS zorunlu
- Environment variables kullan

**DON'T ❌**
- API key'leri kodda bırakma
- Console.log ile sensitive data logla
- SQL injection'a açık sorgular
- XSS'e açık HTML rendering

---

## 📝 7. Kod Yazım Standartları

### Naming Conventions

**Dosyalar:**
```
PascalCase.tsx       → React componentleri
camelCase.ts         → Utility, helper fonksiyonlar
kebab-case.css       → Style dosyaları
SCREAMING_CASE.md    → Döküman dosyaları
```

**Değişkenler & Fonksiyonlar:**
```typescript
// ✅ Doğru
const userName = "Ahmet";
const isLoading = false;
const hasAccess = true;

function getUserData() { }
function calculateTotal() { }

// ❌ Yanlış
const UserName = "Ahmet";
const loading = false;
const access = true;

function get_user_data() { }
```

### Türkçe Kullanımı
- **UI metinleri:** Türkçe
- **Kod yorumları:** Türkçe
- **Değişken isimleri:** İngilizce
- **Fonksiyon isimleri:** İngilizce

**Örnek:**
```typescript
// ✅ Doğru
// Kullanıcının sepetindeki ürün sayısını hesaplar
function calculateCartItemCount(cart: Cart): number {
  return cart.items.length;
}

// ❌ Yanlış
function sepettekiUrunSayisi(sepet: Sepet): number {
  return sepet.urunler.length;
}
```

### Error Handling
```typescript
// ✅ Doğru - Özel hata sınıfları
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ✅ Doğru - Try-catch kullanımı
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof ValidationError) {
    showToast('Doğrulama hatası', 'error');
  } else {
    logError(error);
    showToast('Bir hata oluştu', 'error');
  }
}

// ❌ Yanlış - Sessiz hata yutma
try {
  await riskyOperation();
} catch (error) {
  // Hiçbir şey yapma
}
```

### Comment Standartları
```typescript
// ✅ İyi yorum - "Neden" açıklar
// Raf ömrü bitmiş ürünleri otomatik gizliyoruz
// çünkü müşteri yanlışlıkla sipariş vermesin
const visibleProducts = products.filter(p => !p.isExpired);

// ❌ Gereksiz yorum - Kod zaten açık
// Ürünleri filtrele
const filtered = products.filter(p => !p.isExpired);

// ✅ TODO yorumlar - Issue numarası ile
// TODO(#123): Performans optimizasyonu yapılacak
```

---

## 🔄 8. Git & Versiyon Kontrol

### Branch Stratejisi
```
main              → Production branch (korumalı)
  ├── develop     → Development branch
  │    ├── feature/user-auth
  │    ├── feature/payment-gateway
  │    ├── fix/checkout-bug
  │    └── refactor/admin-panel
```

### Branch İsimlendirme
```bash
feature/kısa-açıklama    # Yeni özellik
fix/bug-açıklaması       # Bug fix
refactor/alan-adı        # Refactoring
chore/task-açıklama      # Teknik iş
```

### Commit Mesaj Formatı
```
<type>(<scope>): <subject>

<body> (opsiyonel)

<footer> (opsiyonel)
```

**Type:**
- `feat`: Yeni özellik
- `fix`: Bug düzeltme
- `refactor`: Kod iyileştirme
- `style`: CSS/UI değişiklik
- `docs`: Döküman güncellemesi
- `test`: Test ekleme/düzeltme
- `chore`: Teknik iş (build, config)

**Örnekler:**
```bash
feat(auth): Google ile giriş eklendi

fix(checkout): Misafir ödeme butonu validasyon hatası düzeltildi

refactor(admin): ProductForm 3 componente bölündü
- ProductBasicInfo.tsx
- ProductPricing.tsx
- ProductInventory.tsx

Closes #42
```

### Pull Request Kuralları
1. **Başlık:** Net ve açıklayıcı
2. **Açıklama:** Ne, neden, nasıl
3. **Screenshot:** UI değişiklikleri için zorunlu
4. **Test:** Nasıl test edildi açıklaması
5. **Checklist:** [ ] items ile kontrol listesi

**PR Template:**
```markdown
## 📝 Açıklama
[Ne değişti, neden yapıldı]

## 🎯 Değişiklikler
- [ ] Frontend değişiklik
- [ ] Backend değişiklik
- [ ] Veritabanı migration

## 🧪 Test
[Nasıl test edildi]

## 📸 Screenshot
[UI değişiklikleri için]

## 📌 Notlar
[Ekstra bilgi]
```

---

## 🏢 9. Kurumsal Kimlik

### Şirket Bilgileri
- **Ünvan:** Sade Unlu Mamülleri San ve Tic Ltd Şti
- **Adres:** Yeşilbahçe mah. Çınarlı cd 47/A Muratpaşa Antalya
- **Vergi Dairesi:** Antalya Kurumlar
- **Vergi No:** 7361500827

### İletişim
- **Email:** [Eklenecek]
- **Telefon:** [Eklenecek]
- **Website:** [Eklenecek]

---

## 📜 10. Güncelleme Günlüğü (Changelog)

### [v1.3] - 2026-01-03
**"Pragmatik Uygulama"** güncellemesi
- Kademeli SDUI stratejisi
- Test Piramidi eklendi
- Migration stratejisi detaylandırıldı
- Over-engineering risklerine karşı esneklik sağlandı

### [v1.2] - 2026-01-09
**"Standartlaşma ve Dokümantasyon"** güncellemesi
- İçindekiler tablosu eklendi
- Kod yazım standartları bölümü eklendi
- Git & versiyon kontrol kuralları eklendi
- Naming conventions detaylandırıldı
- Error handling standartları eklendi
- Comment kuralları eklendi
- PR template eklendi
- DO/DON'T örnekleri eklendi
- Z-index standartları tablo haline getirildi
- Renk paleti tablo formatına dönüştürüldü

### [v1.0-1.1] - Önceki
- Temel felsefe tanımlandı
- SDUI, FSD ve AI protokolleri oluşturuldu

---

## 📚 İlgili Dökümanlar

- `hedefler.md` - Proje hedefleri ve roadmap
- `FEEDBACK.md` - Bug ve improvement takibi
- `GUNLUK.md` - Günlük çalışma logları
- `fikirler.md` - Fikir ve konseptler
- `kişiselbağlam.md` - Proje bağlamı

---

> **Not:** Bu dosya projenin "anayasası" niteliğindedir. Tüm ekip üyeleri ve AI araçları bu kurallara uymalıdır.

# Proje Kuralları ve Standartları

> **Son Güncelleme:** 2026-01-09

---

## 📑 İçindekiler

0. [CRUD Bütünlüğü Kuralı (Kritik)](#0-crud-bütünlüğü-kuralı-kritik)
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

## 🔄 0. CRUD Bütünlüğü Kuralı (Kritik)

> **Her yeni özellik veya modül eklendiğinde, CRUD operasyonlarının tamamı düşünülmelidir.**

### Checklist (Yeni Özellik Eklerken)

| Katman | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| **Firestore Rules** | ✓ | ✓ | ✓ | ✓ |
| **Storage Rules** | ✓ (upload) | ✓ (download) | ✓ (overwrite) | ✓ |
| **API Endpoints** | POST | GET | PUT/PATCH | DELETE |
| **Frontend UI** | Add form | List/Detail | Edit form | Delete btn |

### Örnek: Yeni Klasör/Modül Eklerken
```typescript
// ❌ Yanlış - Sadece Firestore'u düşünmek
// orchestrator-assets koleksiyonu eklendi ama...

// ✅ Doğru - Tüm katmanları düşünmek
// 1. Firestore rules → orchestrator-assets için CRUD izinleri
// 2. Storage rules → orchestrator-assets/ klasörü için upload/download izni
// 3. API → CRUD endpointleri (create, list, update, delete)
// 4. Frontend → Asset ekleme, listeleme, düzenleme, silme UI
```

### Sık Unutulan Yerler
- **Firebase Storage rules** (yeni klasör = yeni rule)
- **Firestore indexes** (karmaşık sorgular için)
- **API rate limiting** (yeni endpoint = limit kontrolü)
- **Frontend error states** (CRUD başarısız olursa UI feedback)

---

## 🎯 1. Temel Felsefe

### Configuration-First
Bir özellik kodlanmadan önce şeması planlanır. Config-driven yaklaşım tercih edilir.

> **NOT:** SDUI ve BFF kavramları gelecekte değerlendirilecektir. Şu an proje bu ölçekte değil.

---

## 🤖 2. AI Team Collaboration & Governance

### Team Structure
- **Claude:** Uygulama geliştirme
- **Gemini:** İkinci görüş (opsiyonel, kullanıcı istediğinde)

### Context Management
- Max 5 dosya/prompt
- Büyük işler "chunk"lara bölünür
- Her session başında ilgili dökümanlar okunur

### ⚠️ KRİTİK KURAL: Plan Dışına Çıkmadan Önce Danış
**Claude, planlanan dışında bir yaklaşım keşfederse önce kullanıcıya danışır.**
- Plan dosyasında belirtilen model, API veya yaklaşım değiştirilecekse ÖNCE kullanıcıya sor
- Daha iyi bir yol bulduğunda: "Plan X diyor ama Y daha iyi çünkü [sebep]. Değiştirelim mi?" formatında danış
- "Bu çalışmıyor, ben şunu kullanayım" gibi sessiz kararlar YASAKTIR
- Herhangi bir belirsizlik durumunda kullanıcıya sorulmalı

### Hafıza Yönetimi
Her session başında şu dosyalar kontrol edilir:
- `hedefler.md` - Proje hedefleri ve durum
- `GUNLUK.md` - Son yapılan işler
- `FEEDBACK.md` - Aktif bug ve improvement'lar
- `project-rules.md` - Bu dosya

---

## ⚠️ 3. Kritik İş Akışı

### Geliştirme Süreci
1. **Fikir & Plan:** Mimari netleştirilir
2. **Build Kontrolü:** Her değişiklik sonrası `npm run build` başarılı olmalı
3. **Deploy & Doğrula:** Deploy sonrası gerçek çalışma kontrol edilir

> **NOT:** Test altyapısı (TDD, Vitest, Storybook, görsel regresyon) henüz kurulmamıştır. Gelecek hedeflerden biridir.

---

## 🛠 4. Teknik Mimari

### Mevcut Yapı
```
functions/src/     → Firebase Cloud Functions (TypeScript)
  ├── controllers/ → API endpoint'leri (modüler)
  ├── services/    → İş mantığı servisleri
  ├── orchestrator/→ AI görsel üretim pipeline'ı
  └── types/       → TypeScript tipleri

admin/src/         → Admin Panel (React + Vite + Tailwind)
  ├── pages/       → Sayfa componentleri
  ├── components/  → Paylaşılan componentler
  ├── services/    → API çağrıları
  └── types/       → TypeScript tipleri
```

### Dosya Limitleri
- **200-500 satır** kuralı esastır
- 500+ satır aşan kodlar hook veya atomik parçalara ayrılır

> **NOT:** FSD (Feature-Sliced Design) mimarisi şu an uygulanmamaktadır. Proje büyüdüğünde değerlendirilecektir.

---

## 🎨 5. UI/UX ve DesignOps (Nordic Noir)

### Design Tokens
Renk ve boşluklar Figma'dan JSON olarak beslenir (Generated Code).

### Accessibility (a11y)
> **NOT:** WCAG 2.1 standartları gelecek hedeflerden biridir. Şu an admin paneli tek kullanıcılıdır.

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

## 🔒 6. Güvenlik

### Güvenlik Kuralları
**DO ✅**
- Her user input'u validate et
- Environment variables kullan
- HTTPS zorunlu

**DON'T ❌**
- API key'leri kodda bırakma
- Console.log ile sensitive data logla

> **NOT:** Sentry, Session Replay, A/B testleri henüz kurulmamıştır.

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
Şu an tek branch (`main`) kullanılmaktadır. Doğrudan main'e commit yapılır ve deploy edilir.

> **NOT:** Proje büyüdüğünde develop/feature branch stratejisi değerlendirilecektir.

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

### [v1.4] - 2026-02-08
**"Gerçekçilik"** güncellemesi
- Ölü kurallar temizlendi (FSD, TDD, SDUI, Sentry, A/B, WCAG — henüz uygulanmamış)
- Branch stratejisi gerçek duruma güncellendi (sadece main)
- "Plan Dışına Çıkma Yasağı" → "Önce Danış" olarak yumuşatıldı
- AI Team güncellendi (n8n kaldırıldı, Gemini opsiyonel)
- Mevcut teknik mimari doğru şekilde belgelendi

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

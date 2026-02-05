# Proje Kuralları ve Standartları

> **Son Güncelleme:** 2026-01-20
> **Proje:** Instagram Paylaşım Otomasyonu (Maestro AI)

---

## 📑 İçindekiler

1. [Temel Felsefe](#1-temel-felsefe)
2. [AI Collaboration & Governance](#2-ai-collaboration--governance)
3. [Kritik İş Akışı ve Test Standartları](#3-kritik-iş-akışı-ve-test-standartları)
4. [Teknik Mimari](#4-teknik-mimari)
5. [UI/UX Standartları](#5-uiux-standartları)
6. [Güvenlik ve İzlenebilirlik](#6-güvenlik-ve-izlenebilirlik)
7. [Kod Yazım Standartları](#7-kod-yazım-standartları)
8. [Git & Versiyon Kontrol](#8-git--versiyon-kontrol)
9. [Kurumsal Kimlik](#9-kurumsal-kimlik)
10. [Güncelleme Günlüğü](#10-güncelleme-günlüğü)

---

## 🎯 1. Temel Felsefe

### Configuration-First
Bir özellik kodlanmadan önce şeması planlanır. Orchestrator kuralları `ORCHESTRATOR.md`'de tanımlanır.

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

### Pragmatik Yaklaşım
- Over-engineering'den kaçın
- Çalışan basit çözümler tercih et
- Gerektiğinde refactor et

---

## 🤖 2. AI Collaboration & Governance

### Team Structure
| AI | Rol | Kullanım |
|----|-----|----------|
| **Claude** | Uygulama geliştirme | Kod yazma, debug, refactor |
| **Gemini** | Görsel üretim | Orchestrator pipeline içinde |

### Context Management
- Max 5 dosya/prompt
- Büyük işler "chunk"lara bölünür
- Her session başında ilgili dökümanlar okunur

### Hafıza Yönetimi
Her session başında şu dosyalar kontrol edilir:
- `.claude/rules/` - Tüm kurallar (otomatik yüklenir)
- `.claude/FEEDBACK.md` - Aktif bug ve improvement'lar
- `.planning/ROADMAP.md` - Proje yol haritası

### Kural Hiyerarşisi
1. **Iron-Rules.md** - Mutlak kurallar (güvenlik, dosya sistemi)
2. **KURALLAR.md** - Görsel üretim kuralları
3. **ORCHESTRATOR.md** - AI orchestrator senaryoları
4. **PROJE-KURALLARI.md** - Bu dosya (genel standartlar)
5. **BIREYSEL-ISTEKLER.md** - Kullanıcı tercihleri

---

## ⚠️ 3. Kritik İş Akışı ve Test Standartları

### Geliştirme Süreci
1. **Plan:** Görevi anla, gerekirse sor
2. **Oku:** İlgili dosyaları oku, mevcut yapıyı anla
3. **Yaz:** Kod yaz (placeholder yasak!)
4. **Test:** Build al, hata varsa düzelt
5. **Commit:** Değişiklikleri kaydet

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

### Build Kontrol Listesi
- [ ] `npm run build` başarılı mı?
- [ ] TypeScript hatası var mı?
- [ ] Lint hatası var mı?
- [ ] Gizli bilgi commit edilmedi mi?

---

## 🛠 4. Teknik Mimari

### Proje Yapısı
```
/
├── functions/              # Firebase Cloud Functions (TypeScript)
│   ├── src/
│   │   ├── controllers/    # HTTP endpoint'leri
│   │   ├── services/       # İş mantığı
│   │   ├── orchestrator/   # AI görsel üretim pipeline
│   │   └── types/          # TypeScript tipleri
│   └── package.json
├── admin/                  # Admin Panel (React + Vite)
│   ├── src/
│   │   ├── components/     # UI bileşenleri
│   │   ├── contexts/       # React context'ler
│   │   ├── pages/          # Sayfa bileşenleri
│   │   └── services/       # API çağrıları
│   └── package.json
└── .claude/                # Claude Code konfigürasyonu
    ├── rules/              # Otomatik yüklenen kurallar
    └── hooks/              # Hook scriptleri
```

### Dosya Limitleri
- **200-500 satır** kuralı esastır
- 500+ satır aşan kodlar parçalara ayrılır
- Component logic ve UI ayrı dosyalarda tutulabilir

### Firebase Collections
| Collection | Amaç |
|------------|------|
| `media-queue` | Onay bekleyen görseller |
| `scheduled-slots` | Zamanlanmış paylaşımlar |
| `assets` | Ürün görselleri |
| `products` | Ürün bilgileri |
| `timeslots` | Paylaşım zaman dilimleri |
| `config` | Sistem konfigürasyonu |

---

## 🎨 5. UI/UX Standartları

### Admin Panel (React)
- **Framework:** React + Vite
- **Styling:** Tailwind CSS
- **State:** React Context + hooks

### Renk Paleti (Sade Brand)

| Renk | Kullanım |
|------|----------|
| **Sıcak tonlar** | Ana tema (krem, bej, kahve) |
| **Yeşil** | Başarı mesajları |
| **Kırmızı** | Hata mesajları |
| **Mavi** | Bilgi, linkler |

### Görsel Üretim (KURALLAR.md)
- Image-to-image zorunlu
- Off-white backdrop varsayılan
- Steam/smoke yasak
- Typography koruması kritik

---

## 🔒 6. Güvenlik ve İzlenebilirlik

### Güvenlik Kuralları
**DO ✅**
- Her user input'u validate et
- Sensitive data'yı environment variables'da tut
- Firebase Security Rules kullan
- HTTPS zorunlu

**DON'T ❌**
- API key'leri kodda bırakma
- Console.log ile sensitive data logla
- `.env` dosyalarını commit etme

### Loglama
- Orchestrator her adımı loglar
- Telegram callback'ler loglanır
- Hatalar detaylı kaydedilir

---

## 📝 7. Kod Yazım Standartları

### Naming Conventions

**Dosyalar:**
```
PascalCase.tsx       → React componentleri
camelCase.ts         → Utility, helper, service
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

function get_user_data() { }
```

### Türkçe Kullanımı
- **UI metinleri:** Türkçe
- **Kod yorumları:** Türkçe
- **Değişken isimleri:** İngilizce
- **Fonksiyon isimleri:** İngilizce
- **Commit mesajları:** İngilizce (format)

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
// ✅ Doğru - Try-catch kullanımı
try {
  await riskyOperation();
} catch (error) {
  console.error("[Context] Error:", error);
  // Kullanıcıya uygun mesaj göster
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
// slotId'yi media-queue'dan scheduled-slots'a linklemek için
// Telegram callback'te her iki collection da güncellenebilsin
const photoItem = {
  ...data,
  slotId: result.slotId,
};

// ❌ Gereksiz yorum - Kod zaten açık
// Ürünleri filtrele
const filtered = products.filter(p => !p.isExpired);
```

### CRUD Standartları

**Fonksiyon İsimlendirme:**
```typescript
// ✅ Doğru
getProduct()        // Tekil kayıt getir
getProducts()       // Liste getir
createProduct()     // Yeni kayıt oluştur
updateProduct()     // Kayıt güncelle
deleteProduct()     // Kayıt sil

// ❌ Yanlış
fetchProduct()      // "get" kullan
addProduct()        // "create" kullan
removeProduct()     // "delete" kullan
```

---

## 🔄 8. Git & Versiyon Kontrol

### Branch Stratejisi
```
main              → Production branch
  └── feature/*   → Özellik branch'leri
  └── fix/*       → Bug fix branch'leri
```

### Commit Mesaj Formatı
```
<type>(<scope>): <subject>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Type:**
- `feat`: Yeni özellik
- `fix`: Bug düzeltme
- `refactor`: Kod iyileştirme
- `style`: CSS/UI değişiklik
- `docs`: Döküman güncellemesi
- `chore`: Teknik iş (build, config)

**Örnekler:**
```bash
feat(orchestrator): add slotId linkage for Telegram callbacks

fix(admin): resolve asset deletion not reflecting in UI

refactor(scheduler): extract progress tracking to separate function
```

### Commit Zamanlaması
- Her mantıklı değişiklik sonrası
- Riskli değişiklik öncesi (mevcut durumu kaydet)
- Oturum sonunda

---

## 🏢 9. Kurumsal Kimlik

### Şirket Bilgileri
- **Marka:** Sade / SadeChocolate
- **Ünvan:** Sade Unlu Mamülleri San ve Tic Ltd Şti
- **Adres:** Yeşilbahçe mah. Çınarlı cd 47/A Muratpaşa Antalya
- **Vergi Dairesi:** Antalya Kurumlar
- **Vergi No:** 7361500827

### Marka Estetiği
- Sıcak, davetkar tonlar
- Off-white arka planlar
- Premium, artisanal görünüm
- Koyu/soğuk tonlar yasak

---

## 📜 10. Güncelleme Günlüğü

### [v1.0] - 2026-01-20
- İlk versiyon oluşturuldu
- Instagram Otomasyon projesine adapte edildi
- Firebase/React mimarisi eklendi
- Orchestrator kuralları referans edildi

---

## 📚 İlgili Dökümanlar

| Dosya | İçerik |
|-------|--------|
| `Iron-Rules.md` | Mutlak güvenlik kuralları |
| `KURALLAR.md` | Görsel üretim kuralları |
| `ORCHESTRATOR.md` | AI orchestrator senaryoları |
| `BIREYSEL-ISTEKLER.md` | İletişim tercihleri |
| `.claude/FEEDBACK.md` | Bug ve improvement takibi |
| `.planning/ROADMAP.md` | Proje yol haritası |

---

> **Not:** Bu dosya projenin "anayasası" niteliğindedir. Tüm kurallar `.claude/rules/` klasöründen otomatik yüklenir.

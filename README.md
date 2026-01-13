# Instagram Otomasyon Sistemi - Sade Chocolate

Otomatik Instagram paylaşım sistemi. Her gün belirlenen saatte kuyruktaki fotoğrafları AI ile iyileştirip Instagram'a otomatik paylaşır.

## Özellikler

- ✅ Günlük otomatik Instagram paylaşımı (her gün 09:00)
- ✅ OpenAI Vision ile fotoğraf analizi
- ✅ DALL-E 3 ile profesyonel görsel iyileştirme
- ✅ Firebase Cloud Functions (serverless)
- ✅ Firestore ile kuyruk yönetimi
- ✅ Instagram Graph API entegrasyonu
- ✅ Otomatik token yenileme (60 gün)

## Teknoloji Stack

- **Backend:** Firebase Cloud Functions (Node.js 20, TypeScript)
- **Database:** Firestore
- **Storage:** Firebase Cloud Storage
- **Scheduler:** Google Cloud Pub/Sub Scheduler
- **AI Services:** OpenAI (GPT-4 Vision + DALL-E 3)
- **Social Media:** Instagram Graph API

## Maliyet

**Aylık Tahmini Maliyet:** ~$5.20/ay

- Firebase: ~$2.60
- OpenAI Vision: ~$0.30
- DALL-E 3: ~$2.40

**Maliyet optimizasyonu ile $2.40/ay'a düşürülebilir** (DALL-E ve Vision kaldırılırsa)

## Proje Yapısı

```
instagram-automation/
├── README.md                      # Bu dosya
├── .gitignore                     # Git ignore kuralları
├── .firebaserc                    # Firebase proje config
├── firebase.json                  # Firebase servis config
├── .env.example                   # Environment variables örneği
├── deploy.sh                      # Deployment script
├── .planning/                     # Planlama dokümanları
│   ├── BRIEF.md
│   ├── ROADMAP.md
│   └── phases/
└── functions/                     # Cloud Functions kodu
    ├── package.json
    ├── tsconfig.json
    ├── .eslintrc.js
    └── src/
        ├── index.ts              # Entry point
        ├── config/               # Configuration
        │   ├── index.ts          # Barrel exports
        │   ├── constants.ts      # App constants
        │   ├── firebase.ts       # Firebase Admin SDK
        │   └── environment.ts    # Environment variables
        ├── services/             # External API services
        │   ├── index.ts
        │   ├── instagram.ts      # Instagram Graph API
        │   └── openai.ts         # OpenAI API
        ├── schedulers/           # Cloud Scheduler functions
        │   ├── index.ts
        │   └── dailyPost.ts      # Daily Instagram post
        ├── utils/                # Helper utilities
        │   ├── index.ts
        │   ├── logger.ts
        │   └── validators.ts
        └── types/                # TypeScript definitions
            └── index.ts
```

## Hızlı Başlangıç

### 1. Ön Koşullar

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- Instagram Business Account
- Facebook Developer Account
- OpenAI API Key

### 2. API Kurulumu

Instagram Graph API ve OpenAI API key'lerini almak için:
```bash
# Detaylı rehber için:
cat docs/API_SETUP.md
```

### 3. Firebase Kurulumu

```bash
# Firebase'e giriş yap
firebase login

# Projeyi initialize et
firebase init

# Functions, Firestore, Storage seçin
# TypeScript seçin
# Region: europe-west1
```

### 4. Environment Variables

```bash
firebase functions:config:set \
  openai.api_key="sk-..." \
  instagram.account_id="17841..." \
  instagram.access_token="EAAxx..."
```

### 5. Deploy

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

## Instagram Graph API Kurulumu

### 1. Instagram Business Account Bağlama

1. Instagram hesabınızı Business/Creator Account'a çevirin
2. Instagram ayarlarından bir Facebook Page'e bağlayın
3. [Meta Business Suite](https://business.facebook.com/)'e giriş yapın

### 2. Facebook App Oluşturma

1. [developers.facebook.com/apps](https://developers.facebook.com/apps) adresine gidin
2. "Create App" → "Business" seçin
3. App Name girin (örn: "Sade Patisserie Automation")
4. Products → "Instagram Graph API" ekleyin

### 3. Gerekli İzinler

App'e şu izinleri ekleyin:
- `instagram_basic` - Temel hesap bilgileri
- `instagram_content_publish` - İçerik paylaşma
- `pages_read_engagement` - Sayfa etkileşimi okuma

### 4. Access Token Alma

```bash
# Short-lived token'ı Graph API Explorer'dan alın
# https://developers.facebook.com/tools/explorer

# Long-lived token'a çevirin (60 gün geçerli):
curl "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN"
```

### 5. Account ID Bulma

```bash
# Token ile account ID'yi öğrenin:
curl "https://graph.instagram.com/v18.0/me?fields=id,username&access_token=YOUR_ACCESS_TOKEN"

# Örnek response:
# {"id": "17841234567890123", "username": "sadepatisserie"}
```

### 6. Firebase Config'e Ekleme

```bash
# API key'leri Firebase'e ekleyin:
firebase functions:config:set \
  instagram.account_id="17841234567890123" \
  instagram.access_token="EAAxxxxxxxxx..."

# Config'i kontrol edin:
firebase functions:config:get
```

### 7. Token Test Etme

Deploy sonrası token'ı test edin:
```bash
curl "https://europe-west1-instagram-automation-ad77b.cloudfunctions.net/validateInstagramToken"

# Başarılı response:
# {"success": true, "message": "Token is valid!", "account": {"id": "...", "username": "..."}}
```

### 8. Token Yenileme (60 Günde Bir)

Instagram token'ları 60 gün sonra expire olur! Takvime hatırlatma ekleyin.

```bash
# Mevcut token ile yenile:
curl "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=CURRENT_TOKEN"

# Yeni token'ı Firebase'e ekle:
firebase functions:config:set instagram.access_token="NEW_TOKEN"
firebase deploy --only functions
```

## OpenAI API Kurulumu

### 1. API Key Alma

1. [platform.openai.com](https://platform.openai.com) adresine gidin
2. Settings → API Keys → Create new secret key
3. Key'i güvenli bir yere kaydedin (tekrar görüntülenemez!)

### 2. Billing Setup

- OpenAI API ücretli bir servistir
- Billing → Add payment method ile kredi kartı ekleyin
- Usage limits belirleyin (aylık $10 limit önerilir)

### 3. Firebase Config'e Ekleme

```bash
firebase functions:config:set openai.api_key="sk-proj-..."
```

### 4. Maliyet Tahmini

| Servis | Birim Fiyat | Günlük | Aylık |
|--------|-------------|--------|-------|
| GPT-4 Vision | $0.01/image | $0.01 | ~$0.30 |
| DALL-E 3 HD | $0.08/image | $0.08 | ~$2.40 |
| **Toplam** | | $0.09 | **~$2.70** |

## Test Functions

Deploy sonrası kullanılabilir test fonksiyonları:

### 1. Genel API Durumu
```bash
curl "https://europe-west1-instagram-automation-ad77b.cloudfunctions.net/helloInstagram"
```

### 2. Instagram Token Doğrulama
```bash
curl "https://europe-west1-instagram-automation-ad77b.cloudfunctions.net/validateInstagramToken"
```

### 3. Instagram Test Post
**DİKKAT: Gerçekten Instagram'a paylaşır!**
```bash
curl "https://europe-west1-instagram-automation-ad77b.cloudfunctions.net/testInstagramPost?imageUrl=https://example.com/photo.jpg&caption=Test%20post"
```

### 4. Vision API Analiz Testi
Fotoğrafı analiz eder (~$0.01)
```bash
curl "https://europe-west1-instagram-automation-ad77b.cloudfunctions.net/testVisionAnalysis?imageUrl=https://example.com/photo.jpg&category=chocolate"
```

### 5. Full Pipeline Testi (Vision + DALL-E)
Fotoğrafı analiz edip iyileştirir (~$0.09)
```bash
curl "https://europe-west1-instagram-automation-ad77b.cloudfunctions.net/testImageEnhancement?imageUrl=https://example.com/photo.jpg&category=chocolate&productName=Antep%20F%C4%B1st%C4%B1kl%C4%B1%20%C3%87ikolata"
```

### Desteklenen Kategoriler
- `viennoiserie` - Croissant, pain au chocolat, brioche
- `coffee` - Kahve menüsü
- `chocolate` - Çikolata ürünleri
- `small-desserts` - Macaron, éclair, mini tart
- `slice-cakes` - Dilim pastalar
- `big-cakes` - Büyük pastalar
- `profiterole` - Profiterol (3, 6, 10 top)
- `special-orders` - Özel siparişler

## Dokümantasyon

- 📘 **[API Kurulum Rehberi](docs/API_SETUP.md)** - Instagram ve OpenAI API kurulumu
- 📘 **[Veritabanı Şeması](docs/DATABASE_SCHEMA.md)** - Firestore collection yapısı
- 📘 **[Deployment Rehberi](docs/DEPLOYMENT_GUIDE.md)** - Adım adım deploy
- 📘 **[İş Akışı](docs/WORKFLOW.md)** - Günlük otomatik işlem akışı
- 📘 **[Maliyet Analizi](docs/COST_ANALYSIS.md)** - Detaylı maliyet hesaplaması
- 📘 **[Sorun Giderme](docs/TROUBLESHOOTING.md)** - Yaygın hatalar ve çözümler

## İş Akışı

```
09:00 (Her Gün)
    ↓
Cloud Scheduler → Function Tetikler
    ↓
Firestore'dan Sıradaki Fotoğraf
    ↓
OpenAI Vision → Fotoğraf Analizi
    ↓
DALL-E 3 → Görsel İyileştirme
    ↓
Instagram Graph API → Post Oluştur
    ↓
Firestore → Status Güncelle
    ↓
✅ Paylaşım Tamamlandı
```

## Fotoğraf Ekleme

### Yöntem 1: Firebase Console (Manuel)

1. Firebase Console → Firestore
2. `media-queue` collection → Add document
3. Şu yapıyı kullanın:

```json
{
  "id": "photo-001",
  "filename": "cikolata.jpg",
  "originalUrl": "https://example.com/photo.jpg",
  "caption": "Sade Chocolate - Antep Fıstıklı Praline 🍫✨ #sadechocolate",
  "uploadedAt": 1704067200000,
  "processed": false,
  "status": "pending",
  "scheduledTime": 1704182400000
}
```

### Yöntem 2: Toplu Ekleme (Gelecek)

Cloud Storage `/photos` klasörüne fotoğraf yüklendiğinde otomatik kuyruk oluşturma özelliği eklenecek.

## Güvenlik

- ✅ API key'ler Firebase Environment Config'de güvenli şekilde saklanır
- ✅ Firestore Security Rules: Sadece Cloud Functions erişimi
- ✅ Storage Security Rules: Okuma/yazma yetkisi kısıtlı
- ✅ Token otomatik yenileme (60 günde bir)

## Test Etme

```bash
# Logs izleme
firebase functions:log --only dailyInstagramPost

# Manuel tetikleme (Google Cloud Console'dan)
# Cloud Scheduler → Job seç → "Run Now"
```

## Monitoring

- **Firebase Console:** Functions logs ve performance
- **Google Cloud Console:** Billing ve Scheduler durumu
- **OpenAI Dashboard:** API kullanımı ve maliyet
- **Instagram Insights:** Post performance

## Lisans

Bu proje Sade Chocolate için özel geliştirilmiştir.

## Destek

Sorularınız için:
- [API Kurulum Sorunları](docs/TROUBLESHOOTING.md#api-setup)
- [Deploy Sorunları](docs/TROUBLESHOOTING.md#deployment)
- [Cost İzleme](docs/COST_ANALYSIS.md)

---

**Not:** Production'a geçmeden önce mutlaka test Instagram hesabında deneyin!

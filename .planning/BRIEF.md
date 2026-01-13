# Instagram Otomasyon - Sade Chocolate

## Vizyon

Instagram paylaşımlarını tamamen otomatikleştiren serverless sistem. Her gün belirlenen saatte kuyruktaki fotoğrafları OpenAI ile analiz edip iyileştirerek Instagram'a otomatik paylaşır.

## Mevcut Durum

**Greenfield** - Sıfırdan başlangıç. Sadece dokümantasyon mevcut, kod yazılmamış.

**Mevcut:**
- İstanbul Chocolate dokümantasyonu (instagramOtomasyon.md)
- README.md ile proje tanımı
- Sistem mimarisi tasarımı

**Eksik:**
- Firebase projesi kurulumu
- Cloud Functions kodu
- Instagram Graph API entegrasyonu
- OpenAI API entegrasyonu
- Firestore veritabanı yapısı
- Deployment pipeline

## Teknoloji Stack

**Backend:**
- Firebase Cloud Functions (Node.js 18)
- TypeScript
- Google Cloud Pub/Sub Scheduler

**Database & Storage:**
- Firestore (kuyruk yönetimi)
- Firebase Cloud Storage (görseller)

**External APIs:**
- Instagram Graph API (paylaşım)
- OpenAI GPT-4 Vision (fotoğraf analizi)
- OpenAI DALL-E 3 (görsel iyileştirme)

**Region:** europe-west1 (Belçika)

## Hedefler

### Birincil Hedefler
1. Her gün saat 09:00'da otomatik Instagram paylaşımı
2. AI destekli fotoğraf iyileştirme (DALL-E 3)
3. Kuyruk bazlı paylaşım sistemi
4. Sıfır manuel müdahale gerektirme

### İkincil Hedefler
1. Instagram token otomatik yenileme
2. Hata durumunda bildirim
3. Paylaşım başarı/başarısızlık tracking
4. Maliyet optimizasyonu (~$5/ay)

## Scope

### ✅ Dahil
- Firebase Cloud Functions setup
- TypeScript implementasyonu
- Firestore veritabanı şeması
- Instagram Graph API entegrasyonu
- OpenAI Vision + DALL-E 3 entegrasyonu
- Günlük scheduler (Pub/Sub)
- Token yenileme mekanizması
- Environment configuration
- Error handling ve logging
- Deployment scripts

### ❌ Dahil Değil
- Web dashboard/UI (sadece backend)
- Mobil uygulama
- Fotoğraf upload UI (manuel Firestore ekleme)
- Analytics/reporting dashboard
- Multi-account desteği
- Video paylaşımı (sadece fotoğraf)
- Instagram Stories/Reels otomasyonu

## Kısıtlamalar

**Teknik:**
- Instagram Graph API rate limits (200 requests/user/hour)
- DALL-E 3 generation time (~10-30 saniye)
- Firebase Functions timeout (540 saniye max)
- Cold start latency (~1-3 saniye)

**Finansal:**
- Hedef maliyet: ~$5/ay
  - Firebase: ~$2.60
  - OpenAI Vision: ~$0.30
  - DALL-E 3: ~$2.40

**İş:**
- Instagram Business Account gerekli
- Facebook Developer Account gerekli
- 60 günde bir manual token yenileme (ilk aşamada)

## Başarı Kriterleri

### Fonksiyonel
- ✅ Her gün 09:00'da otomatik tetikleme çalışıyor
- ✅ Kuyruktaki fotoğraflar sırayla işleniyor
- ✅ DALL-E 3 ile görseller iyileştiriliyor
- ✅ Instagram'a başarıyla paylaşılıyor
- ✅ Firestore'da durum güncelleniyor

### Operasyonel
- ✅ %95+ başarı oranı (aylık)
- ✅ <60 saniye toplam işlem süresi (analiz + iyileştirme + paylaşım)
- ✅ Hata durumunda logs'ta açık mesaj
- ✅ Deploy işlemi <5 dakika

### Maliyet
- ✅ Aylık toplam <$10 (hedef $5)
- ✅ Fotoğraf başına <$0.20

## Bağımlılıklar

**Dış Servisler:**
- Firebase project (oluşturulacak)
- Instagram Business Account + API access token
- Facebook Developer App + credentials
- OpenAI API key

**Hesaplar:**
- Google Cloud Platform (Firebase için)
- Meta Business Suite
- OpenAI Platform

## Risk & Mitigasyon

**Risk 1:** Instagram API token süresi dolması (60 gün)
- *Mitigasyon:* Token yenileme sistemi + bildirim

**Risk 2:** DALL-E 3 timeout veya başarısızlık
- *Mitigasyon:* Fallback: Sharp ile basit optimization

**Risk 3:** Firebase maliyet aşımı
- *Mitigasyon:* Cloud Functions quota limits + billing alerts

**Risk 4:** Instagram rate limit
- *Mitigasyon:* Günde 1 paylaşım (limit altında)

## İlk Milestone: v1.0

**Hedef:** Minimum viable automation

**Kapsam:**
1. Firebase Functions temel yapısı
2. Instagram API entegrasyonu
3. OpenAI Vision + DALL-E 3 entegrasyonu
4. Günlük scheduler
5. Firestore kuyruk sistemi
6. Error handling
7. Deployment ve test

**Çıkış Kriteri:** Test Instagram hesabında 7 gün boyunca başarılı otomatik paylaşım.

## Ekip

**Solo Developer:** 1 kişi (Claude + User)
- Backend development
- DevOps/deployment
- API entegrasyonları

## Notlar

- Production'a geçmeden önce test Instagram hesabı ile en az 1 hafta test
- API key'ler Firebase Environment Config'de saklanacak (güvenlik)
- İlk aşamada DALL-E zorunlu (kullanıcı tercihi)
- Token yenileme başlangıçta manuel, v1.1'de otomatik olacak

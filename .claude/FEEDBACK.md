# Proje Geri Bildirimleri ve Hatalar

Bu dosya proje ile ilgili hataları, geri bildirimleri, iyileştirme önerilerini ve yapılacakları içerir.

---

## [BUG-001] Hata Başlığı
- **Kategori:** bug
- **Öncelik:** low / medium / high
- **Durum:** open / in-progress / closed
- **Tarih:** YYYY-MM-DD
- **Açıklama:** Hatanın detaylı açıklaması.

---

## [IMP-001] İyileştirme Başlığı
- **Kategori:** improvement
- **Öncelik:** low / medium / high
- **Durum:** open / in-progress / closed
- **Tarih:** YYYY-MM-DD
- **Açıklama:** İyileştirme önerisinin detayları.

---

## [REFACTOR-001] Refactor Başlığı
- **Kategori:** refactor
- **Öncelik:** low / medium / high
- **Durum:** open / in-progress / closed
- **Tarih:** YYYY-MM-DD
- **Açıklama:** Refactor ihtiyacının açıklaması.
- **Öneri:** Önerilen çözüm adımları.

---

## [TODO-001] Yapılacak İş Başlığı
- **Kategori:** todo
- **Öncelik:** low / medium / high
- **Durum:** open / in-progress / closed
- **Tarih:** YYYY-MM-DD
- **Açıklama:** Yapılacak işin detayları.

---

## [BUG-002] Telegram "Yeniden Oluştur" 6 Görsel Sorunu
- **Kategori:** bug
- **Öncelik:** high
- **Durum:** closed
- **Tarih:** 2026-01-20
- **Çözüm Tarihi:** 2026-01-20
- **Açıklama:** Telegram'a gelen görsel için "yeniden oluştur" denildiğinde 6 tane yeniden görsel oluşturuyor ve hiçbiri paylaşılabilir veya silinebilir değil.
- **Etki:** Kullanıcı deneyimini ciddi şekilde bozuyor
- **Kök Neden:** Race condition - Telegram birden fazla callback gönderdiğinde (hızlı tıklama veya retry) her callback aynı anda `item.status !== "awaiting_approval"` kontrolünü geçiyordu ve paralel `processWithApproval` çağrıları yapılıyordu.
- **Çözüm:**
  1. `queue.ts`'e `tryMarkForRegeneration()` fonksiyonu eklendi - Firestore transaction ile atomic status kontrolü
  2. `telegramController.ts`'de regenerate case güncellendi - ilk callback lock alıyor, sonrakiler reddediliyor
  3. Yeni `approvalStatus: "regenerating"` flag eklendi
- **Dosyalar:**
  - `functions/src/services/queue.ts` (tryMarkForRegeneration eklendi)
  - `functions/src/controllers/telegramController.ts` (regenerate case güncellendi)

---

## [TODO-003] Orchestrator Çeşitlilik Kuralları Endpoint Test
- **Kategori:** todo
- **Öncelik:** medium
- **Durum:** open
- **Tarih:** 2026-01-20
- **Açıklama:** Yeni eklenen çeşitlilik kuralları endpoint'leri test edilmeli:
  - `getVariationConfig`
  - `updateVariationConfig`
  - `getProductionHistory`
  - `getPetUsageStats`
- **Not:** Admin Panel UI sayfası (`/orchestrator-rules`) deploy edildi ama gerçek ortamda test edilmedi

---

## [TODO-004] Özel Senaryo Ekleme Özelliği
- **Kategori:** todo
- **Öncelik:** medium
- **Durum:** open
- **Tarih:** 2026-01-21
- **Açıklama:** Kullanıcının kendi senaryolarını ekleyebilmesi için admin panele özellik eklenmeli.
- **Gereksinimler:**
  1. "Yeni Senaryo Ekle" butonu
  2. Senaryo adı, ID, açıklama alanları
  3. "El var mı?" checkbox
  4. Prompt şablonu yazma alanı (text area)
  5. Firestore'a kayıt (`scenario-prompts` collection)
- **Sayfa:** `/orchestrator-rules`
- **Not:** Mevcut 10 senaryo sabit olarak kod içinde tanımlı. Kullanıcı özel senaryolar ekleyebilmeli.

---

## [TODO-002] functions.config() Migration
- **Kategori:** todo
- **Öncelik:** medium
- **Durum:** open
- **Tarih:** 2026-01-14
- **Açıklama:** Firebase `functions.config()` API Mart 2026'da kaldırılacak. Environment variables için `.env` dosyası veya Secret Manager'a geçiş yapılmalı.
- **Referans:** https://firebase.google.com/docs/functions/config-env#migrate-to-dotenv

---

## [TODO-005] Mekan/Atmosfer Paylaşım Sistemi
- **Kategori:** todo
- **Öncelik:** high
- **Durum:** closed
- **Tarih:** 2026-01-21
- **Çözüm Tarihi:** 2026-01-21
- **Açıklama:** Sürekli ürün görseli yerine pastane atmosferini yansıtan paylaşımlar eklenecek. Vitrin, tezgah, oturma alanı, çiçekler vb. gerçek fotoğraflar kullanılacak. AI görsel üretimi yapılmayacak, sadece caption/hashtag üretilecek.
- **Çözüm:** Interior senaryo sistemi eklendi. 10 yeni interior senaryo (vitrin-sergisi, kruvasan-tezgahi, pastane-ici, oturma-kosesi, cicek-detay, kahve-hazirligi, sabah-acilis, pencere-isigi, raf-zenginligi, detay-cekimi) ve "interior" asset kategorisi eklendi. Orchestrator, interior senaryolarda AI görsel üretimini atlıyor ve doğrudan interior asset kullanıyor.

### Konsept
- Gerçek pastane fotoğrafları doğrudan paylaşım için kullanılacak
- Bu senaryolarda AI görsel üretimi ATLANIR
- Yüklenen fotoğraf olduğu gibi kullanılır
- Sadece caption ve hashtag'ler AI tarafından üretilir

### 1. Backend: Yeni Asset Kategorisi
**Dosya:** `functions/src/orchestrator/types.ts`

Yeni kategori: `interior`

Alt tipler:
- `vitrin` - Vitrin görünümü
- `tezgah` - Ürün tezgahları
- `oturma-alani` - Oturma köşeleri
- `dekorasyon` - Çiçekler, bitkiler, detaylar
- `genel-mekan` - Pastane genel görünümü

### 2. Backend: Yeni Senaryolar (10 adet)
**Dosya:** `functions/src/orchestrator/rulesService.ts` veya Firestore

| ID | Ad | Açıklama |
|----|-----|----------|
| `vitrin-sergisi` | Vitrin Sergisi | Vitrin içi ürün dizilimi |
| `kruvasan-tezgahi` | Kruvasan Tezgahı | Taze kruvasanlar tezgahta |
| `pastane-ici` | Pastane İçi | Genel mekan atmosferi |
| `oturma-kosesi` | Oturma Köşesi | Samimi oturma alanı |
| `cicek-detay` | Çiçek Detay | Dekoratif çiçekler |
| `kahve-hazirligi` | Kahve Hazırlığı | Barista/kahve hazırlama |
| `sabah-acilis` | Sabah Açılış | Günaydın, kapı girişi |
| `pencere-isigi` | Pencere Işığı | Pencere kenarı görünüm |
| `raf-zenginligi` | Raf Zenginliği | Dolu raflar, bolluk |
| `detay-cekimi` | Detay Çekimi | Fincan, peçete, aksesuar |

### 3. Backend: Orchestrator Değişikliği
**Dosya:** `functions/src/orchestrator/orchestrator.ts`

Yeni mantık:
- Senaryo "interior" tipindeyse:
  - AI görsel üretimi (Stage 4) ATLANIR
  - Doğrudan interior asset seçilir ve kullanılır
  - Caption/hashtag hala AI ile üretilir (Stage 6)
  - Telegram onayına gider

### 4. Backend: Varsayılan Tema Ekleme
**Dosya:** `functions/src/orchestrator/types.ts`

```
Yeni tema: "Mekan Tanıtımı"
ID: mekan-tanitimi
Senaryolar: [vitrin-sergisi, kruvasan-tezgahi, pastane-ici, oturma-kosesi, cicek-detay, kahve-hazirligi, sabah-acilis, pencere-isigi, raf-zenginligi, detay-cekimi]
Mood: warm
petAllowed: false
```

### 5. Frontend: Assets Sayfası Güncellemesi
**Dosya:** `admin/src/pages/Assets.tsx`

- Kategori listesine "Interior" eklenir
- Alt tip seçenekleri: vitrin, tezgah, oturma-alani, dekorasyon, genel-mekan

### 6. Frontend: Senaryolar Güncellemesi
**Dosyalar:** `admin/src/pages/Themes.tsx` ve `OrchestratorRules.tsx`

- ALL_SCENARIOS listesine 10 yeni interior senaryo eklenir
- "El var mı" yerine "Interior mi" flag'i eklenir

### Özet Değişiklikler
| Dosya | Değişiklik |
|-------|------------|
| `types.ts` | Interior kategorisi, yeni senaryolar, yeni tema |
| `orchestrator.ts` | Interior senaryo kontrolü, AI atlama mantığı |
| `rulesService.ts` | Yeni senaryoların tanımları |
| `Assets.tsx` | Interior kategori seçeneği |
| `Themes.tsx` | Yeni senaryolar listesi |
| `OrchestratorRules.tsx` | Yeni senaryolar listesi |

### Akış Diyagramı
```
TimeSlotRule (themeId: "mekan-tanitimi")
    ↓
Orchestrator senaryo seç → "vitrin-sergisi"
    ↓
Interior senaryo mu? EVET
    ↓
AI görsel üretimi ATLA
    ↓
Interior asset seç (vitrin kategorisi)
    ↓
Caption üret (AI)
    ↓
Telegram onayına gönder
```

### Ön Koşul
- Kullanıcı gerçek pastane fotoğraflarını Assets sayfasından "Interior" kategorisine yükleyecek

---

## [TODO-006] Instagram İstatistikleri Entegrasyonu
- **Kategori:** todo
- **Öncelik:** medium
- **Durum:** open
- **Tarih:** 2026-01-21
- **Açıklama:** Instagram Graph API ile post/story istatistiklerini çekme ve analiz etme özelliği.

### Gereksinimler
- Business veya Creator hesabı (mevcut ✓)
- Facebook Page'e bağlı olması (mevcut ✓)
- Facebook App (mevcut ✓)
- **Yeni izin gerekli:** `instagram_manage_insights` scope

### Çekilebilecek Veriler

**Post/Story Bazlı:**
- Beğeni sayısı
- Yorum sayısı
- Kaydetme sayısı
- Erişim (reach)
- Gösterim (impressions)
- Paylaşım sayısı

**Hesap Bazlı:**
- Takipçi sayısı değişimi
- Profil ziyaretleri
- Web sitesi tıklamaları
- Demografik veriler (yaş, cinsiyet, konum)
- En aktif saatler/günler

### Kısıtlamalar
- Son 2 yıl verisi çekilebilir
- Story verileri 24 saat sonra erişilebilir, 48 saat sonra silinir
- Rate limit var (saatlik istek sınırı)

### Uygulama Planı
1. Facebook App'e `instagram_manage_insights` izni ekle
2. Token'ı yenile (yeni scope ile)
3. `functions/src/services/instagramInsights.ts` servisi oluştur
4. Endpoint'ler: `getPostInsights`, `getAccountInsights`, `getAudienceData`
5. Admin panele Analytics sayfası ekle veya mevcut Analytics'i genişlet
6. Firestore'da insight verilerini cache'le (rate limit için)

### Kullanım Alanları
- Hangi ürün/senaryo daha çok etkileşim alıyor?
- En iyi paylaşım saatlerini gerçek verilerle belirleme
- Takipçi büyüme analizi
- İçerik stratejisi optimizasyonu

---

## [TODO-007] Prompt Training UI (Admin Panel)
- **Kategori:** todo
- **Öncelik:** low
- **Durum:** open
- **Tarih:** 2026-01-21
- **Açıklama:** Prompt eğitim kurallarını Admin Panel üzerinden yönetme özelliği. Şu an markdown dosyası ile çalışıyor (`.claude/references/PROMPT-EGITIMI.md`), ileride UI'a taşınacak.

### Önerilen UI Yapısı
**Sayfa:** `/prompt-training`

**Tabs:**
1. 📚 Temel Kurallar (readonly - sistem kuralları görüntüleme)
2. ✅ İyi Örnekler (CRUD - başarılı prompt'lar)
3. ❌ Kötü Örnekler (CRUD - başarısız prompt'lar)
4. 👁️ Gözlemlerim (CRUD - kullanıcı notları)
5. 📝 Kişisel Kurallarım (CRUD - özel kurallar)

**Her giriş için form alanları:**
- Başlık
- Tarih (otomatik)
- Kategori (dropdown)
- Açıklama (textarea)
- Prompt (code block)
- Etiketler (çoklu seçim: fincan, tabak, arka plan, vb.)

**Özellikler:**
- Liste görünümü
- Arama ve filtreleme
- Firestore'da saklama (`prompt-training` collection)
- Claude runtime'da okuma

### Avantajları
- Kullanıcı dostu form ile giriş
- Validasyonlu, format hatası olmaz
- Kategorilendirme ve etiketleme
- Mobil erişim imkanı

### Notlar
- Şu an markdown ile çalışıyor, acil değil
- Orchestrator Rules sayfası pattern olarak kullanılabilir

---

## [DECISION-001] Tasarım Kararları ve Gelecek Planları
- **Kategori:** decision
- **Tarih:** 2026-01-14
- **Durum:** documented

### Paylaşım Zamanı (Akıllı Zamanlama)
- **Mevcut:** Sabit saat (09:00) - Demo amaçlı
- **Plan:** Araştırmalar sonucu tespit edilen en ideal saatlere göre dinamik zamanlama
- **Not:** Kısa süre içinde dinamik hale getirilecek

### Caption (Açıklama Metni)
- **Karar:** AI'ye bırakılmayacak, manuel girilecek
- **Gerekçe:** İşletme hesabı için tüm paylaşımların kontrollü olması gerekiyor
- **Risk:** AI caption üretimi işletme için uygunsuz içerik riski taşır

### Tetikleme Mekanizması (Depo/Klasör Mantığı)
- **Karar:** "Klasöre atınca otomatik paylaş" modeli KULLANILMAYACAK
- **Gerekçe:** Klasöre atınca paylaşım = direkt Instagram'a atmakla aynı efor
- **Plan:** Depo mantığı - Görsel havuzu oluşturulacak
  - Görseller bir depoda (klasör/storage) birikecek
  - Sıralı şekilde otomatik seçilecek
  - Belirlenen saatlerde otomatik paylaşılacak
  - Kullanıcı sadece depoyu doldurur, sistem gerisini halleder

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
- **Güncelleme:** 2026-01-25 - İzin alındı ✅
- **Açıklama:** Instagram Graph API ile post/story istatistiklerini çekme ve analiz etme özelliği.

### Gereksinimler
- Business veya Creator hesabı (mevcut ✓)
- Facebook Page'e bağlı olması (mevcut ✓)
- Facebook App (mevcut ✓)
- ~~**Yeni izin gerekli:** `instagram_manage_insights` scope~~ ✅ **Alındı (2026-01-25)**

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

---

## [BUG-003] Instagram Onaylama Hatası - publishToInstagram
- **Kategori:** bug
- **Öncelik:** high
- **Durum:** closed
- **Tarih:** 2026-01-22
- **Çözüm Tarihi:** 2026-01-22
- **Açıklama:** Orchestrator Dashboard'da bir işlemi "Onayla" denildiğinde şu hata alınıyor: `Hata: orchestrator.publishToInstagram is not a function`
- **Kök Neden:** `approveSlot` endpoint'i `orchestrator.publishToInstagram()` çağırıyordu ama bu metot Orchestrator sınıfında tanımlı değildi
- **Çözüm:** approveSlot endpoint'i doğrudan InstagramService kullanacak şekilde düzeltildi (telegramController pattern'i ile tutarlı). pipelineResult'tan imageUrl ve caption alınıp `instagram.createStory()` ile yayınlanıyor
- **Dosya:** `functions/src/controllers/orchestratorController.ts`

---

## [BUG-004] holdingType Çalışmıyor - El Senaryoları Filtrelenmemesi
- **Kategori:** bug
- **Öncelik:** high
- **Durum:** closed
- **Tarih:** 2026-01-22
- **Çözüm Tarihi:** 2026-01-22
- **Açıklama:** Asset'e "Kaşıkla Yenir" veya "Çatalla Yenir" seçilse bile AI hala el ile tutma senaryoları üretiyor.
- **Kök Neden:** Claude'a "EL İÇEREN SENARYO SEÇME!" prompt uyarısı yeterli değildi - tüm senaryolar gönderiliyordu
- **Çözüm:** `selectScenario` fonksiyonunda `canUseHandScenarios === false` durumunda `includesHands: true` olan senaryolar listeden filtreleniyor. Claude'a sadece uygun senaryolar gönderiliyor - artık el senaryosu seçme şansı yok
- **Dosya:** `functions/src/orchestrator/claudeService.ts`

---

## [IMP-002] AI Monitor - Log Gruplandırması
- **Kategori:** improvement
- **Öncelik:** high
- **Durum:** closed
- **Tarih:** 2026-01-22
- **Çözüm Tarihi:** 2026-01-22
- **Açıklama:** AI Monitor sayfasında her pipeline çalışmasının log'ları karışık gösteriliyor. Hangi log hangi pipeline'a ait belli değil.
- **Çözüm:**
  1. Backend: `orchestrator.ts`'de pipelineId oluşturma ve `setPipelineContext()` çağrıları eklendi
  2. Frontend: "Gruplu" / "Liste" görünüm modu toggle'ı eklendi
  3. Gruplandırılmış görünümde her pipeline accordion card olarak gösteriliyor
  4. Pipeline header'ında: ID, tarih, ürün tipi, adım sayısı, toplam süre, token, maliyet
  5. Timeline görünümü ile adımlar sıralı gösteriliyor (Asset → Senaryo → Prompt → Görsel → Kalite Kontrol)
  6. Renk kodlaması: yeşil nokta = başarılı, kırmızı = hata
- **Dosyalar:**
  - `functions/src/orchestrator/orchestrator.ts` (pipelineId eklendi)
  - `admin/src/pages/AIMonitor.tsx` (gruplandırılmış görünüm)

---

## [IMP-003] AI Monitor - Log'dan Feedback/Eğitim Özelliği
- **Kategori:** improvement
- **Öncelik:** medium
- **Durum:** open
- **Tarih:** 2026-01-22
- **Açıklama:** AI Monitor'daki loglardan yola çıkarak düzeltme yapıp AI'yı eğitme imkanı isteniyor.
- **İstenen Özellikler:**
  1. Her log detayında "Sorun Bildir" veya "Düzeltme Ekle" butonu
  2. Buton tıklandığında modal açılsın:
     - Sorun kategorisi seçimi
     - Açıklama alanı
     - "Bu durumda ne yapmalıydı?" açıklaması
  3. Bu feedback'ler `ai-feedback` collection'a kaydedilsin
  4. Claude prompt'larına bu feedback'ler hint olarak eklensin (mevcut sistem var)
- **İlişkili:** Mevcut `FeedbackService` ve `ai-feedback` collection kullanılabilir
- **Dosya:** `admin/src/pages/AIMonitor.tsx`

---

## [IMP-004] Asset - "Elle Tutulabilir mi?" Ayrı Alan
- **Kategori:** improvement
- **Öncelik:** high
- **Durum:** closed
- **Tarih:** 2026-01-22
- **Çözüm Tarihi:** 2026-01-22
- **Açıklama:** Mevcut `holdingType` dropdown'u yetersiz. "Kaşıkla yenir" ≠ "Elle tutulamaz" - bir ürün kaşıkla yenebilir ama aynı zamanda kabı elle tutulabilir.
- **Çözüm:**
  1. **Yeni tipler:** `EatingMethod` tipi eklendi, `HoldingType` deprecated (geriye uyumluluk için tutuldu)
  2. **Yeni alanlar:** Asset interface'ine `eatingMethod` ve `canBeHeldByHand` boolean eklendi
  3. **Form güncellendi:** Assets.tsx'de iki ayrı form alanı:
     - `eatingMethod` dropdown (Elle yenir / Çatalla yenir / Kaşıkla yenir / Yenmez-Servis)
     - `canBeHeldByHand` checkbox (Elle tutulabilir mi?)
  4. **Claude mantığı güncellendi:** `canUseHandScenarios` artık `canBeHeldByHand` boolean'a bakıyor
     - Yeni asset'ler: `canBeHeldByHand` değerine göre
     - Eski asset'ler (geriye uyumluluk): `holdingType === "hand"` ise true
- **Örnek Kullanım:**
  - Tiramisu: eatingMethod="spoon", canBeHeldByHand=false → El senaryoları FİLTRELENİR
  - Puding bardağı: eatingMethod="spoon", canBeHeldByHand=true → El senaryoları KULLANILIR
  - Kurabiye: eatingMethod="hand", canBeHeldByHand=true → El senaryoları KULLANILIR
- **Dosyalar:**
  - `functions/src/orchestrator/types.ts` - EatingMethod type, canBeHeldByHand alan
  - `admin/src/types/index.ts` - Frontend types
  - `admin/src/pages/Assets.tsx` - İki ayrı form alanı
  - `functions/src/orchestrator/claudeService.ts` - canBeHeldByHand bazlı senaryo filtreleme

---

## [IMP-005] "Şimdi Üret" - İç/Dış Mekan Seçimi
- **Kategori:** improvement
- **Öncelik:** medium
- **Durum:** open
- **Tarih:** 2026-01-22
- **Açıklama:** Orchestrator Dashboard'daki "Hemen İçerik Üret" bölümüne iç mekan / dış mekan toggle'ı eklenmeli.
- **Kullanım:** Seçime göre senaryolar filtrelenir:
  - "İç Mekan" → Sadece interior senaryolar
  - "Dış Mekan" → Sadece outdoor/terrace senaryolar
  - "Fark Etmez" → Tümü (varsayılan)
- **Dosyalar:**
  - `admin/src/pages/OrchestratorDashboard.tsx` - Toggle ekleme
  - `admin/src/services/api.ts` - locationPreference parametresi
  - `functions/src/orchestrator/orchestrator.ts` - Senaryo filtreleme

---

## [IMP-006] "Şimdi Üret" - Hava Durumu Seçimi (Faz 2)
- **Kategori:** improvement
- **Öncelik:** low
- **Durum:** open
- **Tarih:** 2026-01-22
- **Açıklama:** Hava durumuna göre senaryo filtreleme. Yağmurlu havada dış mekan güneşli görsel üretmek inandırıcılığı düşürür.
- **Seçenekler:**
  1. **Manuel seçim (basit):** 3 buton - ☀️ Güneşli | 🌥️ Bulutlu | 🌧️ Yağmurlu
  2. **Otomatik API (karmaşık):** OpenWeather API ile konum bazlı hava durumu
- **Öneri:** Manuel seçimle başla, otomatik sonra eklenebilir
- **Etki:** "Yağmurlu" seçilirse → dış mekan senaryoları devre dışı

not: Rules Editor" sayfası   yapılacak

---

## [BUG-005] AI Rules Gemini Prompt'una Gitmiyor
- **Kategori:** bug
- **Öncelik:** high
- **Durum:** closed
- **Tarih:** 2026-01-23
- **Çözüm Tarihi:** 2026-01-23
- **Açıklama:** Kullanıcının AI Rules sayfasından girdiği kurallar (örn: "bardak boş olmasın") Gemini'ye gönderilen prompt'a EKLENMİYOR.
- **İlk Teşhis (YANLIŞ):** Kod incelemesinde `optimizePrompt()`'a kuralların gitmediği düşünüldü.
- **Gerçek Kök Neden:** Firestore composite index eksikti! `ai-rules` collection'ı için `isActive + createdAt` index'i olmadan sorgu **sessizce boş sonuç** döndürüyordu.
- **Kod Kontrolü:** `claudeService.ts` ve `orchestrator.ts`'de kod DOĞRU yapılandırılmıştı - userRules parametresi zaten mevcuttu ve geçiliyordu.
- **Çözüm:**
  1. `firestore.indexes.json`'a `ai-rules` için composite index eklendi
  2. `firebase deploy --only firestore:indexes` ile index deploy edildi
  3. Debug endpoint (`debugFeedbackHints`) eklenerek gerçek veri doğrulandı
- **Öğrenilen Ders:**
  - Firestore composite sorguları index gerektirir
  - Service'ler hataları sessizce yakalayıp boş array döndürüyordu
  - Varsayım yapmak yerine gerçek veriyle doğrulama yapılmalı
- **Dosyalar:**
  - `firestore.indexes.json` (index tanımları)
  - `functions/src/controllers/orchestratorController.ts` (debug endpoint)

---

## [BUG-006] Peçete/Çatal Asset Kategorisi Yüklenmiyor
- **Kategori:** bug
- **Öncelik:** medium
- **Durum:** open
- **Tarih:** 2026-01-23
- **Açıklama:** Kullanıcı peçete ve çatal asset'lerini sisteme yüklemiş ancak orchestrator bunları YÜKLEMEMEKTE.
- **Kök Neden:** `loadAvailableAssets()` fonksiyonunda (orchestrator.ts satır 769-848) `napkins` veya `cutlery` için Firestore sorgusu YOK.
- **Araştırma Gerekli:** Firestore'da bu asset'ler hangi category ve subType altında kaydedilmiş? (props/napkins, furniture/cutlery, vs?)
- **Çözüm:**
  1. Firestore'da mevcut peçete/çatal asset'lerinin yapısını kontrol et
  2. `loadAvailableAssets()` fonksiyonuna uygun sorguyu ekle
  3. `selectAssets()` prompt'una peçete/çatal seçeneği ekle
  4. `optimizePrompt()`'a peçete/çatal bilgisini geç
- **Dosyalar:**
  - `functions/src/orchestrator/orchestrator.ts` (loadAvailableAssets)
  - `functions/src/orchestrator/claudeService.ts` (selectAssets)

---

## [BUG-007] Üst Üste Tabak Sorunu Devam Ediyor
- **Kategori:** bug
- **Öncelik:** medium
- **Durum:** open
- **Tarih:** 2026-01-23
- **Açıklama:** Gemini sürekli üst üste tabak üretiyor. Mevcut statik kural ("Üst üste tabaklar müşteri masasında OLMAZ") yeterli değil.
- **Mevcut Durum:** `claudeService.ts` satır 1007-1009'da system prompt'ta kural var ama:
  - Negatif prompt'a EKLENMİYOR
  - Yeterince vurgulu değil
- **Çözüm:**
  1. `optimizePrompt()` fonksiyonunda negatif prompt'a "stacked plates, multiple plates on top of each other" ekle
  2. System prompt'taki kuralı daha vurgulu hale getir
  3. Opsiyonel: QC (kalite kontrol) adımında stacked plates kontrolü ekle
- **Dosyalar:**
  - `functions/src/orchestrator/claudeService.ts` (optimizePrompt ve evaluateImage)

---

## [BUG-008] Config Sync Hatası - Admin Slider'lar Çalışmıyor
- **Kategori:** bug
- **Öncelik:** high
- **Durum:** closed
- **Tarih:** 2026-01-24
- **Çözüm Tarihi:** 2026-01-24
- **Açıklama:** Admin paneldeki çeşitlilik kuralları slider'ları (scenarioGap, petFrequency vb.) değiştirildiğinde pipeline'a YANSIMIYORLAR.
- **Kök Neden:** İki farklı Firestore collection kullanılıyor:
  - Admin Panel yazıyor → `orchestrator-config/variation-rules`
  - Pipeline okuyor → `global/config/settings/diversity-rules`
- **Etki:** Tüm slider değişiklikleri boşa gidiyor
- **Çözüm:**
  1. `configController.ts` Firestore path'leri düzeltildi (`global/config/settings/diversity-rules`)
  2. `clearConfigCache()` çağrısı eklendi - değişiklikler anında yansır
  3. `configService` üzerinden okuma yapılıyor (cache-enabled)
  4. Defaults artık `defaultData.ts`'den alınıyor (hardcoded değil)
- **Dosyalar:**
  - `functions/src/controllers/orchestrator/configController.ts` (düzeltildi)

---

## [TODO-008] Config Sync & Hardcoded Değerler Planı
- **Kategori:** todo
- **Öncelik:** high
- **Durum:** in-progress (Phase 1-2 tamamlandı)
- **Tarih:** 2026-01-24
- **Açıklama:** Hardcoded değerleri Firestore'a taşıma ve config sync düzeltmesi için kapsamlı plan.
- **Plan Dosyası:** `.planning/CONFIG-SYNC-PLAN.md`

### Phase 1: Collection Sync Düzeltmesi (KRİTİK) ✅
- [x] `configController.ts` path'lerini düzelt (`orchestrator-config` → `global/config/settings`)
- [x] Cache invalidation ekle (config güncellenince `clearConfigCache()`)
- [x] Eski collection'ı temizle (Firebase Console'dan manuel silinebilir: `orchestrator-config/variation-rules`)

### Phase 2: Timeout Config (YENİ) ✅
- [x] Firestore şeması oluştur (`global/config/settings/timeouts`)
- [x] `configService.ts`'e `getTimeouts()` ekle
- [x] Hardcoded timeout'ları değiştir (scheduler.ts, healthController.ts)
- [x] API endpoint'leri ekle (`getTimeoutsConfig`, `updateTimeoutsConfig`)
- [x] Admin API servisine metodlar ekle
- [ ] Admin panele Timeouts sayfası ekle (opsiyonel - API hazır)

### Phase 3: Time-Mood Config UI
- [ ] Admin panele Time-Mood sayfası ekle
- [ ] `updateTimeMoodConfig` endpoint'i ekle

### Phase 4: AI Pricing Config (İsteğe Bağlı)
- [ ] Model fiyatlarını Firestore'a taşı
- [ ] Maliyet raporları dinamik olsun

### Referans
| Phase | Öncelik | Etki |
|-------|---------|------|
| Phase 1 | 🔴 Kritik | Slider'lar çalışır |
| Phase 2 | 🟠 Orta | Timeout'ları yönetim |
| Phase 3 | 🟡 Düşük | Zaman-mood ayarları |
| Phase 4 | 🟢 İsteğe bağlı | Maliyet takibi |

---

## [TODO-009] Instagram Shopping - Ürün Etiketleme
- **Kategori:** todo
- **Öncelik:** medium
- **Durum:** open
- **Tarih:** 2026-01-25
- **Açıklama:** Paylaşımlara otomatik ürün etiketi ekleme. Müşteri görsele tıklayınca ürün bilgisi ve satın alma linki görür.

### Gereksinimler
- ~~`instagram_shopping_tag_products` izni~~ ✅ Alındı (2026-01-25)
- ~~`catalog_management` izni~~ ✅ Alındı (2026-01-25)
- Facebook Commerce Manager kurulumu ❓ Kontrol edilmeli
- Ürün Kataloğu oluşturma ❓ Kontrol edilmeli
- Commerce onayı ❓ Kontrol edilmeli

### Uygulama Planı
1. **Ön Koşullar Kontrolü:**
   - Facebook Commerce Manager aktif mi?
   - Ürün kataloğu var mı?
   - Katalogdaki ürünler Instagram'a bağlı mı?

2. **Backend:**
   - `functions/src/services/instagramShopping.ts` servisi oluştur
   - Katalog ürünlerini çekme: `GET /{catalog-id}/products`
   - Paylaşıma ürün etiketi ekleme: Product tagging API

3. **Asset-Ürün Eşleştirmesi:**
   - Admin panelde asset'e "Katalog Ürün ID" alanı ekle
   - Veya ürün adından otomatik eşleştirme

4. **Orchestrator Entegrasyonu:**
   - Görsel paylaşılırken ilgili ürün ID'si varsa etiketle
   - Caption'a ürün linki ekle

### Akış
```
Görsel üretildi → Asset'in katalog ürünü var mı? → EVET → Etiketi ekle → Paylaş
                                                → HAYIR → Normal paylaş
```

### Referans
- [Instagram Product Tagging API](https://developers.facebook.com/docs/instagram-api/guides/product-tagging)

---

## [TODO-010] Instagram API - Tüm Yeni İzinlerin Kullanımı
- **Kategori:** todo
- **Öncelik:** high
- **Durum:** open
- **Tarih:** 2026-01-25
- **Açıklama:** 2026-01-25 tarihinde alınan tüm yeni Instagram API izinlerinin aktif kullanıma alınması.

### Alınan İzinler ve Kullanım Durumları

| İzin | Durum | Kullanım |
|------|-------|----------|
| `instagram_basic` | ✅ Aktif | Hesap bilgileri |
| `instagram_content_publish` | ✅ Aktif | Görsel paylaşımı |
| `instagram_manage_insights` | ⏳ Bekliyor | TODO-006 kapsamında |
| `instagram_shopping_tag_products` | ⏳ Bekliyor | TODO-009 kapsamında |
| `catalog_management` | ⏳ Bekliyor | TODO-009 kapsamında |
| `pages_show_list` | ✅ Aktif | Sayfa listesi |
| `pages_read_engagement` | ⏳ Bekliyor | TODO-006 kapsamında |
| `business_management` | ✅ Aktif | İşletme yönetimi |

### Öncelik Sırası
1. **İstatistikler (TODO-006)** - En değerli veri kaynağı
2. **Ürün Etiketleme (TODO-009)** - Satış kanalı
3. **Engagement Verileri** - Analitik dashboard

### Token Bilgisi
- **Yenilenme Tarihi:** 2026-01-25
- **Geçerlilik:** 60 gün (Long-lived token)
- **Sonraki Yenileme:** ~2026-03-25
- **Hatırlatma:** Token expire olmadan önce yenileme yapılmalı

---

## [TODO-012] SaaS Business Type Presets - İşletme Tipi Ön Ayarları
- **Kategori:** todo
- **Öncelik:** medium
- **Durum:** open
- **Tarih:** 2026-01-25
- **Açıklama:** Farklı işletme tipleri (cafe, pizzacı, dönerci, bireysel kullanım vb.) için hazır preset sistemleri.

### Konsept
Bu uygulama SaaS'a dönüştüğünde, her işletme tipi için önceden tanımlanmış kurallar ve senaryolar sunulmalı. Kullanıcı "Cafe" seçince:
- Uygun senaryolar otomatik aktif olur
- Renk paleti, ışık tercihleri belirlenir
- Prompt dili sektöre uygun hale gelir
- Negative prompt'lar otomatik eklenir

### Önerilen Preset Tipleri
| Tip | Senaryolar | Özellikler |
|-----|-----------|------------|
| 🥐 Pastane/Fırın | Vitrin, tezgah, sabah ışığı | Sıcak tonlar, ahşap, doğal ışık |
| ☕ Cafe/Kahveci | Barista, masa üstü, latte art | Samimi, trendy, minimal |
| 🍕 Pizzacı | Dilim close-up, fırın çekimi | Dinamik, iştah açıcı |
| 🥙 Dönerci/Fast Food | Servis anı, paket görünümü | Enerjik, canlı renkler |
| 🍪 Cookie Shop | Makro çekim, sıralama | Pastel, şeker renkleri |
| 📸 Bireysel | Selfie, lifestyle | Trend odaklı, deneysel |
| ⚙️ Özel | Kullanıcı tanımlı | Tam özelleştirme |

### Mimari Tasarım (AI Analizlerinden)

**Üç Katmanlı Yapı:**
1. **Ontolojik Katman (Sektör DNA'sı):** İşletme tipine göre en-boy oranları, varsayılan objeler, görsel normlar
2. **Stilistik Katman (Design Tokens):** Renk paleti, tipografi, ışık sıcaklığı, kompozisyon kuralları
3. **Semantik Katman (AI Prompt Wrapper):** Arka planda prompt'ları sektöre göre zenginleştirme

**Operasyonel Ritim Parametreleri:**
- Günün saati → Mesaj tonu değişimi (sabah: "Günaydın", akşam: "İyi akşamlar")
- Marka olgunluğu → Yeni açılan vs köklü işletme farklı dil kullanır
- Müşteri segmenti → İlk ziyaret vs düzenli müşteri farklı CTA'lar

### Veritabanı Şeması (Öneri)
```typescript
interface BusinessPreset {
  id: string;
  name: string;                    // "Artisan Pastane"
  type: BusinessType;              // "bakery"

  // Görsel Kurallar
  visualRules: {
    colorPalette: string[];        // ["#F5E6D3", "#8B4513", ...]
    lightingTemp: "warm" | "neutral" | "cool";
    defaultAspectRatio: "1:1" | "3:4" | "9:16";
    compositionStyle: "flat-lay" | "45-angle" | "profile";
  };

  // AI Prompt Kuralları
  promptRules: {
    styleKeywords: string[];       // ["artisanal", "handcrafted", "cozy"]
    avoidKeywords: string[];       // ["industrial", "commercial"]
    moodModifiers: string[];       // ["warm", "inviting", "premium"]
  };

  // Senaryo Filtreleme
  allowedScenarios: string[];      // Bu işletme tipi için uygun senaryolar
  blockedScenarios: string[];      // Bu tip için uygun olmayan senaryolar

  // Meta
  isDefault: boolean;
  createdAt: number;
}
```

### Firestore Collection
`business-presets`

### Admin Panel UI
**Sayfa:** `/settings` veya yeni `/business-type`

**Akış:**
1. Kullanıcı işletme tipini seçer
2. Sistem ilgili preset'i yükler
3. Kullanıcı özelleştirme yapabilir
4. Tüm üretimler bu kurallara göre yapılır

### Kritik Tasarım Prensibi
> "İyi bir preset sistemi **kısıtlayıcı değil, yönlendirici** olmalıdır."
> Kullanıcı "tasarımcı değilim" demeden profesyonel görsel üretebilmeli.

### Referans
- Canva Sektör Şablonları
- Adobe Firefly Style Presets
- Gemini, Claude, ChatGPT analizleri (2026-01-25)

---

## [TODO-013] Kullanıcı Senaryo Oluşturma - Custom Scenario Builder
- **Kategori:** todo
- **Öncelik:** medium
- **Durum:** open
- **Tarih:** 2026-01-25
- **Açıklama:** Kullanıcının kendi özel senaryolarını oluşturabilmesi için arayüz ve altyapı.

### Konsept
SaaS kullanıcısı mevcut senaryolar yetersiz geldiğinde (örn: "fırın kenarı" senaryosu istiyorsa):
1. Mevcut bir senaryoyu şablon olarak seçer
2. Parametreleri özelleştirir
3. Test üretimi yapar
4. Kendi havuzuna kaydeder

### Özelleştirilebilir Parametreler
| Parametre | Açıklama | Örnek |
|-----------|----------|-------|
| Senaryo Adı | Kullanıcı tanımlı | "Fırın Kenarı" |
| Kompozisyon | Ürün yerleşimi | "Sağda ürün, solda fırın" |
| Arka Plan | Ortam tanımı | "Tuğla fırın, sıcak aydınlatma" |
| El Kullanımı | El var mı? | true/false |
| Işık Yönü | Işık kaynağı | "Sol üst, sıcak" |
| Mood | Atmosfer | "Nostaljik, geleneksel" |
| Negative Prompts | İstenmeyen öğeler | "modern, minimalist" |

### Veritabanı Şeması (Öneri)
```typescript
interface CustomScenario {
  id: string;
  userId: string;                  // Sahibi
  name: string;
  description: string;

  // Prompt şablonu
  promptTemplate: {
    composition: string;
    background: string;
    lighting: string;
    mood: string;
    additionalKeywords: string[];
    negativePrompts: string[];
  };

  // Senaryo özellikleri
  includesHands: boolean;
  defaultHandStyle?: string;
  preferredProducts: string[];     // Bu senaryo için uygun ürün tipleri

  // Test sonuçları
  testGenerations: {
    imageUrl: string;
    score: number;
    timestamp: number;
  }[];

  // Meta
  isActive: boolean;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}
```

### Firestore Collection
`custom-scenarios` (userId ile filtreleme)

### Admin Panel UI
**Sayfa:** `/custom-scenarios`

**Adımlar:**
1. **Şablon Seç:** Mevcut senaryolardan birini başlangıç noktası olarak seç
2. **Özelleştir:** Form ile parametreleri değiştir
3. **Önizle:** Sistem prompt'u göster, kullanıcı anlasın ne üretilecek
4. **Test Et:** Tek görsel üret, sonucu göster
5. **Kaydet:** Kaliteli çıktıysa kendi havuzuna kaydet
6. **Kullan:** Tema'ya veya zaman kuralına bağla

### Güvenlik Önlemleri
- Kullanıcı sadece kendi senaryolarını görebilir
- Admin tüm senaryoları görebilir (moderasyon)
- Prompt injection koruması (zararlı içerik engelleme)
- Rate limiting (spam önleme)

### İlişkili TODO'lar
- TODO-004: Özel Senaryo Ekleme Özelliği (Admin tarafı - bu TODO'nun alt kümesi)
- TODO-012: Business Type Presets (Senaryo şablonları buradan beslenebilir)

### Akış Diyagramı
```
Kullanıcı → Senaryo Oluştur → Şablon Seç → Özelleştir → Test Et → Beğendi mi?
                                                                    ↓ EVET
                                                                  Kaydet
                                                                    ↓
                                                         Tema/Kurala Bağla
                                                                    ↓
                                                        Üretimlerde Kullan
```
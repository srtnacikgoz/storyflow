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

## [TODO-002] functions.config() Migration
- **Kategori:** todo
- **Öncelik:** medium
- **Durum:** open
- **Tarih:** 2026-01-14
- **Açıklama:** Firebase `functions.config()` API Mart 2026'da kaldırılacak. Environment variables için `.env` dosyası veya Secret Manager'a geçiş yapılmalı.
- **Referans:** https://firebase.google.com/docs/functions/config-env#migrate-to-dotenv

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

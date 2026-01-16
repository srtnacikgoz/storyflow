# Roadmap: Instagram Otomasyon - Sade Chocolate

## Overview

Sıfırdan başlayarak Instagram paylaşım otomasyonunu hayata geçiriyoruz. Firebase Cloud Functions üzerinde TypeScript ile serverless bir sistem kuruyoruz. OpenAI ile fotoğraf analiz ve iyileştirme, Instagram Graph API ile otomatik paylaşım yapacak. Her gün 09:00'da tetiklenecek, Firestore'daki kuyruktan fotoğraf alıp işleyip paylaşacak.

## Phases

- [x] **Phase 1: Foundation & Setup** - Firebase projesi, TypeScript yapısı, environment configuration ✅
- [x] **Phase 2: API Integrations** - Instagram Graph API + OpenAI (Vision + DALL-E 3) entegrasyonları ✅
- [x] **Phase 3: Automation Pipeline** - Pub/Sub scheduler, Firestore kuyruk sistemi, ana workflow ✅
- [x] **Phase 4: Production Ready** - Error handling, logging, testing ve deployment ✅
- [x] **Phase 4.5: Admin Panel** - React admin panel, drag-drop upload, AI kullanım takibi ✅
- [x] **Phase 5: Gemini Image Integration** - Gemini img2img, 4 stil varyasyonu, faithfulness kontrolü ✅
- [x] **Phase 6: Human-in-the-Loop (Telegram)** - Paylaşım öncesi Telegram onay sistemi ✅

## Phase Details

### Phase 1: Foundation & Setup
**Goal:** Firebase projesi hazır, TypeScript yapısı kurulu, temel infrastructure çalışıyor
**Depends on:** Nothing (first phase)
**Plans:** 2 plans

Plans:
- [x] 01-01: Firebase projesi kurulumu, Functions initialization, TypeScript config ✅
- [x] 01-02: Environment configuration, secrets management, project structure ✅

### Phase 2: API Integrations
**Goal:** Instagram ve OpenAI API'leri entegre, token management çalışıyor
**Depends on:** Phase 1
**Plans:** 3 plans

Plans:
- [x] 02-01: Instagram Graph API entegrasyonu, authentication, test post ✅
- [x] 02-02: OpenAI Vision API entegrasyonu, fotoğraf analiz fonksiyonu ✅
- [x] 02-03: DALL-E 3 entegrasyonu, görsel iyileştirme fonksiyonu ✅

### Phase 3: Automation Pipeline
**Goal:** Tam otomatik workflow çalışıyor, kuyruk sistemi operasyonel
**Depends on:** Phase 2
**Plans:** 3 plans

Plans:
- [x] 03-01: Firestore kuyruk şeması, CRUD operasyonları ✅
- [x] 03-02: Ana orchestration fonksiyonu (analiz → iyileştirme → paylaşım) ✅
- [x] 03-03: Pub/Sub scheduler kurulumu, günlük tetikleme (09:00) ✅

### Phase 4: Production Ready
**Goal:** Production'a hazır, test edilmiş, deploy edilebilir
**Depends on:** Phase 3
**Plans:** 2 plans

Plans:
- [x] 04-01: Error handling, retry logic, logging infrastructure ✅
- [x] 04-02: Testing (unit + integration), deployment scripts, documentation ✅

### Phase 4.5: Admin Panel
**Goal:** Web tabanlı yönetim paneli, görsel yükleme, AI maliyet takibi
**Depends on:** Phase 4
**Status:** ✅ Tamamlandı (2026-01-14)

Tamamlananlar:
- [x] React + Vite + TypeScript admin panel ✅
- [x] Tailwind CSS ile marka renkleri ✅
- [x] Dashboard (sistem durumu, kuyruk istatistikleri) ✅
- [x] Drag & drop fotoğraf yükleme (Firebase Storage) ✅
- [x] Kuyruk yönetimi sayfası ✅
- [x] AI kullanım ve maliyet takibi ✅
- [x] Long-lived Instagram token (60 gün) ✅

### Phase 5: Gemini Image Integration
**Goal:** DALL-E text-to-image yerine Gemini img2img, profesyonel marka tutarlılığı
**Depends on:** Phase 4.5
**Status:** ✅ Tamamlandı (2026-01-14)
**Plan Dosyası:** `.planning/phases/05-GEMINI-IMAGE-INTEGRATION-PLAN.md`

Tamamlananlar:
- [x] 05-01: GeminiService oluştur (gemini-2.0-flash-exp) ✅
- [x] 05-02: Prompt sistemi (CAFE-PATISSERIE + 4 stil varyasyonu) ✅
- [x] 05-03: Admin panel UI (model seçimi, stil seçimi, faithfulness slider) ✅
- [x] 05-04: processQueue Gemini entegrasyonu ✅
- [x] 05-05: Usage service Gemini maliyet takibi ✅

**Not:** Test için Gemini API key gerekli

### Phase 6: Human-in-the-Loop (Telegram)
**Goal:** Paylaşım öncesi Telegram ile onay alma, hatalı paylaşımları önleme
**Depends on:** Phase 5
**Status:** ✅ Tamamlandı (2026-01-15)
**Plan Dosyası:** `.planning/phases/06-TELEGRAM-HITL-PLAN.md`

Tamamlananlar:
- [x] 06-01: Telegram Bot oluşturma (@BotFather), token yönetimi ✅
- [x] 06-02: TelegramService (Telegraf.js) - mesaj gönderme, inline keyboard ✅
- [x] 06-03: Webhook endpoint - buton callback'lerini işleme ✅
- [x] 06-04: processQueue entegrasyonu - onay bekle → paylaş/iptal ✅
- [x] 06-05: Firestore approval status tracking ✅
- [x] 06-06: Timeout handling (15 dakika default, otomatik iptal) ✅

**Not:** Telegram bot token ve chat ID gerekli (kurulum talimatları aşağıda)

**Akış:**
```
Scheduler tetiklenir
    ↓
Gemini görseli işler
    ↓
Telegram'a önizleme + butonlar gönderilir
    ↓
[✅ Onayla] → Instagram'a paylaş
[❌ Reddet] → İptal, sıradaki görsele geç
```

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Setup | 2/2 | ✅ Completed | 2026-01-12 |
| 2. API Integrations | 3/3 | ✅ Completed | 2026-01-13 |
| 3. Automation Pipeline | 3/3 | ✅ Completed | 2026-01-13 |
| 4. Production Ready | 2/2 | ✅ Completed | 2026-01-13 |
| 4.5. Admin Panel | 7/7 | ✅ Completed | 2026-01-14 |
| 5. Gemini Integration | 5/5 | ✅ Completed | 2026-01-14 |
| 6. Telegram HITL | 6/6 | ✅ Completed | 2026-01-15 |
| 7. Caption Templates | 7/7 | ✅ Completed | 2026-01-15 |
| 8. Best Time to Post | 6/6 | ✅ Completed | 2026-01-15 |
| 9. Analytics Dashboard | 5/5 | ✅ Completed | 2026-01-16 |
| 10. Content Calendar | 6/6 | ✅ Completed | 2026-01-16 |

## Notes

- **Milestone v1.0:** ✅ TAMAMLANDI (2026-01-13)
- **Milestone v1.5 (Admin):** ✅ TAMAMLANDI (2026-01-14)
- **Milestone v2.0 (Gemini):** ✅ TAMAMLANDI (2026-01-14)
- **Milestone v3.0 (Telegram HITL):** ✅ TAMAMLANDI (2026-01-15)
- **Milestone v4.0 (Caption Templates):** ✅ TAMAMLANDI (2026-01-15)
- **Milestone v5.0 (Best Time to Post):** ✅ TAMAMLANDI (2026-01-15)
- **Milestone v5.5 (Analytics Dashboard):** ✅ TAMAMLANDI (2026-01-16)
- **Milestone v6.0 (Content Calendar):** ✅ TAMAMLANDI (2026-01-16)
- **Region:** europe-west1 (Belçika)
- **AI Enhancement:** Gemini 2.0 Flash Experimental (img2img)
- **Cost Estimate:** ~$0/ay (Gemini şimdilik ücretsiz)
- **Token Management:** 60 günlük long-lived token aktif
- **Scheduler:** dailyStoryScheduler - Her gün 09:00 İstanbul saati
- **Admin Panel:** localhost:5173 (React + Vite)
- **Telegram HITL:** Onay sistemi aktif (15 dk timeout)

### Phase 7: Caption Template System
**Goal:** Önceden tanımlı, güncellenebilir caption şablonları
**Depends on:** Phase 6
**Status:** ✅ Tamamlandı (2026-01-15)
**Plan Dosyası:** `.planning/phases/07-CAPTION-TEMPLATE-SYSTEM-PLAN.md`

Tamamlananlar:
- [x] 07-01: Types (CaptionTemplate, TemplateVariable) ✅
- [x] 07-02: CaptionTemplateService (CRUD + render) ✅
- [x] 07-03: API endpoints (getTemplates, create, update, delete, preview) ✅
- [x] 07-04: Seed data (8 varsayılan şablon) ✅
- [x] 07-05: Admin panel Templates sayfası ✅
- [x] 07-06: Upload flow'a entegrasyon ✅
- [x] 07-07: Telegram preview güncelleme ✅

**Şablonlar:**
- Minimal, Sade Klasik, Sade Özel Ürünlerinden
- Mevsimsel, Yeni Ürün, Malzeme Vurgusu
- Özel Gün, Emoji Only

### Phase 8: Best Time to Post (Hibrit Sistem)
**Goal:** Geçmiş paylaşım verilerini analiz ederek optimal zaman önerisi
**Depends on:** Phase 7
**Status:** ✅ Tamamlandı (2026-01-15)
**Plan Dosyası:** `.planning/phases/08-BEST-TIME-TO-POST-PLAN.md`

Tamamlananlar:
- [x] 08-01: Types & Service Altyapısı ✅
- [x] 08-02: Analytics Recording (paylaşım sonrası kayıt) ✅
- [x] 08-03: Scoring Algorithm (hibrit skor hesaplama) ✅
- [x] 08-04: API Endpoints (getBestTimes, getTimeHeatmap) ✅
- [x] 08-05: Admin Panel - Best Times Sayfası ✅
- [x] 08-06: Scheduler Entegrasyonu ✅

**Özellikler:**
- Default araştırma verisi (Sprout Social, Buffer, Later, Hootsuite)
- Geçmiş paylaşım engagement analizi
- Haftalık heatmap görselleştirme
- Confidence level (veri miktarına göre)
- Hibrit skor: araştırma verisi + tarihsel engagement (ağırlıklı ortalama)

**Scheduler:** processScheduledPosts - Her 15 dakikada zamanlanmış postları kontrol eder

**Zamanlama Modları:**
- immediate: Onay sonrası hemen paylaş
- optimal: Araştırma verilerine göre en iyi saatte paylaş
- scheduled: Manuel tarih/saat seçimi

### Phase 9: Analytics Dashboard
**Goal:** Paylaşım istatistikleri, kategori/model/stil dağılımları, trend grafikleri
**Depends on:** Phase 8
**Status:** ✅ Tamamlandı (2026-01-16)

Tamamlananlar:
- [x] 09-01: Types (AnalyticsSummary, CategoryStats, DailyTrend, vb.) ✅
- [x] 09-02: AnalyticsService (Firestore aggregations) ✅
- [x] 09-03: API endpoints (getAnalyticsDashboard, getAnalyticsSummary) ✅
- [x] 09-04: Admin panel Analytics sayfası ✅
- [x] 09-05: Date range filter (today, week, month, all) ✅

**Özellikler:**
- Özet kartlar (toplam paylaşım, haftalık, onay oranı, kuyruk)
- Günlük trend sparkline (son 30 gün)
- Kategori dağılımı (pie legend)
- AI Model kullanımı dağılımı
- Stil tercihleri dağılımı
- Şablon kullanım istatistikleri
- Haftalık gün dağılımı (bar chart)
- Saatlik dağılım (bar chart)

### Phase 10: Content Calendar
**Goal:** Takvim görünümünde paylaşımları yönetme, drag-drop zamanlama
**Depends on:** Phase 9
**Status:** ✅ Tamamlandı (2026-01-16)

Tamamlananlar:
- [x] 10-01: Calendar types (CalendarItem, CalendarHeatmap, CalendarData) ✅
- [x] 10-02: getCalendarData API endpoint ✅
- [x] 10-03: Calendar.tsx sayfası (haftalık görünüm) ✅
- [x] 10-04: Heatmap overlay (Best Times skorları) ✅
- [x] 10-05: Drag-drop rescheduling ✅
- [x] 10-06: Quick schedule modal ✅

**Özellikler:**
- Haftalık takvim görünümü (08:00-22:00)
- Best Times heatmap (yeşil = en iyi zaman)
- Drag-drop ile item'ı başka güne/saate taşıma
- Boş slota tıklayarak pending item seçme
- Hover'da item detayları
- Hafta navigasyonu (önceki/sonraki/bugün)

## What's Next (v7.0 Candidates)

- [ ] Smart Retry Logic (3 deneme)
- [ ] Docker Support
- [ ] Multi-Account Support
- [ ] A/B Testing for Captions

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
- [ ] **Phase 6: Human-in-the-Loop (Telegram)** - Paylaşım öncesi Telegram onay sistemi

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
**Status:** 📋 Planlanıyor
**Plan Dosyası:** `.planning/phases/06-TELEGRAM-HITL-PLAN.md`

Planlar:
- [ ] 06-01: Telegram Bot oluşturma (@BotFather), token yönetimi
- [ ] 06-02: TelegramService (Telegraf.js) - mesaj gönderme, inline keyboard
- [ ] 06-03: Webhook endpoint - buton callback'lerini işleme
- [ ] 06-04: processQueue entegrasyonu - onay bekle → paylaş/iptal
- [ ] 06-05: Firestore approval status tracking
- [ ] 06-06: Timeout handling (X dakika içinde yanıt gelmezse?)

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
| 6. Telegram HITL | 0/6 | 📋 Planned | - |

## Notes

- **Milestone v1.0:** ✅ TAMAMLANDI (2026-01-13)
- **Milestone v1.5 (Admin):** ✅ TAMAMLANDI (2026-01-14)
- **Milestone v2.0 (Gemini):** ✅ TAMAMLANDI (2026-01-14)
- **Milestone v3.0 (Telegram HITL):** 📋 PLANLANIYORUM
- **Region:** europe-west1 (Belçika)
- **AI Enhancement:** Gemini 2.0 Flash Experimental (img2img)
- **Cost Estimate:** ~$0/ay (Gemini şimdilik ücretsiz)
- **Token Management:** 60 günlük long-lived token aktif
- **Scheduler:** dailyStoryScheduler - Her gün 09:00 İstanbul saati
- **Admin Panel:** localhost:5173 (React + Vite)

## What's Next (v4.0 Candidates)

- [ ] Otomatik token refresh
- [ ] Multi-account desteği
- [ ] Analytics dashboard
- [ ] Ek prompt kategorileri (TABLET, BONBON, PACKAGING)
- [ ] Dinamik zamanlama (araştırma bazlı en iyi saatler)
- [ ] Bulk upload (toplu görsel yükleme)

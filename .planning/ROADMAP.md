# Roadmap: Instagram Otomasyon - Sade Chocolate

## Overview

Sıfırdan başlayarak Instagram paylaşım otomasyonunu hayata geçiriyoruz. Firebase Cloud Functions üzerinde TypeScript ile serverless bir sistem kuruyoruz. OpenAI ile fotoğraf analiz ve iyileştirme, Instagram Graph API ile otomatik paylaşım yapacak. Her gün 09:00'da tetiklenecek, Firestore'daki kuyruktan fotoğraf alıp işleyip paylaşacak.

## Phases

- [x] **Phase 1: Foundation & Setup** - Firebase projesi, TypeScript yapısı, environment configuration ✅
- [x] **Phase 2: API Integrations** - Instagram Graph API + OpenAI (Vision + DALL-E 3) entegrasyonları ✅
- [x] **Phase 3: Automation Pipeline** - Pub/Sub scheduler, Firestore kuyruk sistemi, ana workflow ✅
- [x] **Phase 4: Production Ready** - Error handling, logging, testing ve deployment ✅
- [x] **Phase 4.5: Admin Panel** - React admin panel, drag-drop upload, AI kullanım takibi ✅
- [ ] **Phase 5: Gemini Image Integration** - DALL-E'yi Gemini img2img ile değiştir, prompt sistemi 🔜

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
**Status:** 📋 Planlandı - Uygulama Bekliyor
**Plan Dosyası:** `.planning/phases/05-GEMINI-IMAGE-INTEGRATION-PLAN.md`

Yapılacaklar:
- [ ] 05-01: GeminiService oluştur (gemini-3-pro-image + gemini-2.5-flash-image)
- [ ] 05-02: Prompt sistemi (CAFE-PATISSERIE + stil varyasyonları)
- [ ] 05-03: Admin panel UI (model seçimi, stil seçimi, faithfulness slider)
- [ ] 05-04: processQueue Gemini entegrasyonu
- [ ] 05-05: Test ve fine-tuning

**Gereksinimler:**
- Google AI Studio API Key

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Setup | 2/2 | ✅ Completed | 2026-01-12 |
| 2. API Integrations | 3/3 | ✅ Completed | 2026-01-13 |
| 3. Automation Pipeline | 3/3 | ✅ Completed | 2026-01-13 |
| 4. Production Ready | 2/2 | ✅ Completed | 2026-01-13 |
| 4.5. Admin Panel | 7/7 | ✅ Completed | 2026-01-14 |
| 5. Gemini Integration | 0/5 | 📋 Planned | - |

## Notes

- **Milestone v1.0:** ✅ TAMAMLANDI (2026-01-13)
- **Milestone v1.5 (Admin):** ✅ TAMAMLANDI (2026-01-14)
- **Region:** europe-west1 (Belçika)
- **AI Enhancement:** DALL-E 3 → Gemini 3 Pro geçiş planlandı
- **Cost Estimate:** ~$5.30/ay (Firebase + OpenAI) → Gemini ile düşecek
- **Token Management:** 60 günlük long-lived token aktif
- **Scheduler:** dailyStoryScheduler - Her gün 09:00 İstanbul saati
- **Admin Panel:** localhost:5173 (React + Vite)

## What's Next (v2.0 Candidates)

- [ ] **Phase 5: Gemini Integration** - img2img ile profesyonel görsel işleme 🔜
- [ ] Önizleme & onay sistemi (paylaşmadan önce görsel kontrolü)
- [ ] Otomatik token refresh
- [ ] Multi-account desteği
- [ ] Analytics dashboard
- [ ] Ek prompt kategorileri (TABLET, BONBON, PACKAGING)

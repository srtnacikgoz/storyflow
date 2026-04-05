# Roadmap: Sade Storyflow

> Son güncelleme: 2026-03-29

## Güncel Vizyon

Her araç kendi sayfasında bağımsız çalışır, test edilir, feedback alır. Senaryo/otomasyon en son katman — önce parçalar sağlam olmalı. Detaylar: `.claude/VISION.md`

### Aktif Araçlar
- **Poster Üret** ✅ — 8 stil, 6 mood, 5 tipografi, 6 layout, feedback + öğrenme sistemi
- **Fotoğraf İyileştir** ✅ — Arka plan değiştirme, iyileştirme, upscale (geliştirilecek)
- **İçerik Üretici** ✅ — Senaryo bazlı pipeline (karmaşık, basitleştirilecek)

### Yakında — Senaryo Modalını Parçala (Builder / Lab / Learn)

Monolitik İçerik Üretici modalı (32+ state) 3 bağımsız sayfaya bölünüyor. Plan onaylandı, detay: `.claude/plans/stateless-snuggling-firefly.md`

**FAZ 1: Builder** (`/admin/content-builder`)
- Hub & Spoke yapısı — sol menü, sağda blok detayı
- 6 bağımsız blok: Senaryo, Ürün, Sahne, Işık & Atmosfer, Format, Kurallar
- Her blok açılır/kapanır/override edilebilir
- Çıktı: `ContentBuildConfig` objesi → Lab'a gönderilir
- Mevcut OrchestratorDashboard'dan extract (senaryo listesi, asset picker, slot config)

**FAZ 2: Lab** (`/admin/content-lab`)
- Builder'dan config gelir → "Üret" → run kartı oluşur
- Her run: config snapshot, prompt, sonuç, maliyet, süre
- Yan yana karşılaştırma (2 run seç, diff gör)
- "Sadece X'i değiştir" — tek blok override ile yeni run
- Her run'a feedback (rating + kategori + not) verilebilir
- Backend: `contentLabController.ts` + `contentRunService.ts`

**FAZ 3: Learn** (`/admin/content-learn`)
- Feedback Dashboard — kategori bazlı dağılım, trend, en düşük puanlar
- Kural Önerileri — Claude feedback'lerden otomatik kural üretir → admin onaylar/reddeder
- Knowledge Base — onaylı kurallar, aktif/pasif, geçmiş
- Backend: `contentLearningService.ts` (poster learning pattern'i)

**FAZ 4: Dashboard Basitleştirme**
- OrchestratorDashboard → sadece galeri/tarihçe + tetikleme
- Pre-flight modal kaldırılır (Builder'a taşındı)

**FAZ 5: Otomasyon Entegrasyonu**
- Scheduler kayıtlı Builder config'lerini kullanır
- TimeSlotRule'a `buildConfigId` field'ı

### Yakında — Öncelikli
- **Stil Stüdyosu: Gemini Referans Görsel Entegrasyonu** ⭐ — Prompt birleştirme aşamasında sahne + ürün referans görsellerini Gemini API'ye doğrudan gönder (metin prompt'a ek olarak). Gemini 3 Pro 6 obje referansı destekliyor. Sadece prompt'a güvenmek yerine görsel referans ile çok daha tutarlı sonuç. nano-banana-2-skill yaklaşımından ilham. Plan: `generateStudioPrompt` → Gemini `generate_content` çağrısına `referenceImage` + `productImage` base64 ekle.

### Yakında — Diğer
- **Şeffaf Arka Plan + Gölge** — Ürünü izole et, PNG çıktı, her yerde kullan
- **AI Görsel İşleme Araştırması** — Pixury ve benzeri uygulamalar detaylı araştırma

### Planlanan
- **Menu Tasarım Sayfası** — Ürün yerleşimi, açıklama, fiyat, şablonlar, drag-drop, PDF/PNG export
- **Video Özellikleri** — Ürün tanıtım videoları, UGC, Reels/Story
- **Toplu İşleme** — Batch üretim + batch onay
- **Pazarlama Takvimi** — Tatil/kampanya dönemlerine özel otomatik içerik

---

## Milestone: Teknik Bakım

### Phase 24: Model Config Centralization
**Goal:** Tüm hardcoded model string'lerini Firestore-driven hale getir — Admin Panel'den deploy gerektirmeden değiştirilebilir
**Depends on:** —
**Status:** Planlandı
**Zorluk:** Düşük-Orta

Planlar:
- [ ] **24-01: Backend** — SystemSettings tip genişletmesi, visualCriticService/posterLearningService/posterSmartController/enhancementController hardcoded fix, shared.ts + scheduler Firestore entegrasyonu
- [ ] **24-02: Admin Panel** — APISettingsSection'dan model seçimler kaldır, AIModelSection'a 8 model görevi ekle (İçerik, Önizleme, Poster Görsel, Poster Prompt, Poster Analiz, Enhancement Analiz, Visual Critic, Learning)

---

## Milestone: Poster Prompt Studio V2

> **Vizyon:** Sektör standardı bir prompt üretici — görsel parametreler, UX akışı ve marka kişiselleştirmesiyle rakip araçları (Adobe Firefly, Canva AI, Midjourney) geride bırakan bir deneyim.

### Phase 21: Görsel Parametreler
**Goal:** Prompt kalitesini doğrudan etkileyen kamera açısı, ışık, arka plan ve teknik parametreler — Firestore-driven, Admin'den yönetilebilir
**Depends on:** Mevcut Poster sayfası
**Status:** Planlandı
**Zorluk:** Orta

Planlar:
- [ ] **21-01: Kamera/Çekim Açısı** — "flat lay", "45° overhead", "hero shot", "close-up macro" tipi çekim seçenekleri. Firestore `poster-camera-angles` koleksiyonu + Admin UI + seed
- [ ] **21-02: Işık/Aydınlatma Kontrolü** — "doğal gün ışığı", "stüdyo soft box", "golden hour", "neon glow". Firestore `poster-lighting-types` + Admin UI + seed
- [ ] **21-03: Arka Plan/Ortam Seçimi** — "düz beyaz", "ahşap masa", "mermer yüzey", "açık hava". Firestore `poster-backgrounds` + Admin UI + seed
- [ ] **21-04: Negatif Prompt Desteği** — "şunları dahil etme" alanı; model bazlı syntax (Midjourney: `--no`, SD: negative_prompt). UI toggle + prompt'a otomatik ekleme
- [ ] **21-05: Aspect Ratio Genişletme** — 16:9 (YouTube/Facebook), 3:4, 4:3, özel boyut (px girişi). Mevcut Firestore `poster-aspect-ratios` koleksiyonuna eklenir
- [ ] **21-06: Çözünürlük/Kalite Parametreleri** — Model-spesifik teknik ekler: Midjourney (`--q 2 --stylize 750`), DALL-E (`quality: hd`). Seçili modele göre otomatik ekleme, arayüzden fine-tune

### Phase 22: UX & Akış İyileştirmeleri
**Goal:** Üretilen prompt düzenlenebilir, çoklu varyasyon üretilebilir, wizard akışıyla adım adım rehberlik
**Depends on:** Phase 21
**Status:** Planlandı
**Zorluk:** Orta

Planlar:
- [ ] **22-01: Prompt Önizleme/Düzenleme** — Üretilen prompt inline edit edilebilir textarea; değişiklik history (undo/redo); "yeniden üret" butonu değişiklikleri sıfırlamaz
- [ ] **22-02: Varyasyon Üretimi** — Tek tıkla 3 farklı varyasyon üret (farklı kompozisyon/açı/atmosfer yorumu); yan yana önizleme; favoriye kaydet
- [ ] **22-03: Prompt Dili Seçimi** — TR/EN toggle; EN seçilirse İngilizce prompt üretilir (Midjourney/DALL-E için daha iyi sonuç); kullanıcı tercihini localStorage'da hatırla
- [ ] **22-04: Adım Adım Wizard Akış** — Mevcut tek form yerine 4 adım: 1) Ürün & Kategori, 2) Görsel Parametreler, 3) Stil & Atmosfer, 4) Önizleme & Üret; adımlar arası ilerleme bar'ı
- [ ] **22-05: Görsel Referans Önizleme** — Seçilen stil+kamera+ışık kombinasyonuna göre "bu kombinasyon böyle görünür" örnek thumbnail'ları (statik veya AI üretimi); prompt olmadan ne bekleneceği net olsun

### Phase 23: Kişiselleştirme & Hafıza
**Goal:** Marka presetleri, prompt geçmişi ve renk paleti ile araç iş akışına tam entegre olur
**Depends on:** Phase 22
**Status:** Planlandı
**Zorluk:** Orta-Zor

Planlar:
- [ ] **23-01: Renk Paleti Kontrolü** — HEX input veya color picker; "baskın renk" ve "aksan renk" tanımı; prompt'a "color palette: #FF5733, #2C3E50" olarak eklenir; marka presetiyle entegre
- [ ] **23-02: Ürün Kategorisi/Sektör Seçimi** — "Yiyecek & İçecek", "Kozmetik", "Moda", "Teknoloji" vs. Firestore `poster-product-categories` + Admin UI + seed; seçim prompt context'i zenginleştirir, token israfını azaltır
- [ ] **23-03: Prompt Geçmişi & Şablonlar** — Son 50 prompt Firestore'da kullanıcı bazlı kayıtlı; "şablon olarak kaydet" butonu; şablon listesinden hızlı yükle; şablona isim ve tag ver
- [ ] **23-04: Marka Kimliği/Preset Sistemi** — Marka adı, renk paleti, tipografi tercihleri, varsayılan stil/mood bir kez kaydedilir; "Marka Presetlerim" dropdown; yeni poster açılınca otomatik yükle seçeneği; Firestore `brand-presets` koleksiyonu + Admin UI

### Araştırılacak Referanslar
- Pixury (iTunes: id6751626758) — AI ürün fotoğrafı + video
- *(ek referanslar araştırma sonrası eklenecek)*

---

## Eski Fazlar (Tarihsel Kayıt)

## Overview (Orijinal)

Sıfırdan başlayarak Instagram paylaşım otomasyonunu hayata geçiriyoruz. Firebase Cloud Functions üzerinde TypeScript ile serverless bir sistem kuruyoruz. OpenAI ile fotoğraf analiz ve iyileştirme, Instagram Graph API ile otomatik paylaşım yapacak. Her gün 09:00'da tetiklenecek, Firestore'daki kuyruktan fotoğraf alıp işleyip paylaşacak.

## Phases

- [x] **Phase 1: Foundation & Setup** - Firebase projesi, TypeScript yapısı, environment configuration ✅
- [x] **Phase 2: API Integrations** - Instagram Graph API + OpenAI (Vision + DALL-E 3) entegrasyonları ✅
- [x] **Phase 3: Automation Pipeline** - Pub/Sub scheduler, Firestore kuyruk sistemi, ana workflow ✅
- [x] **Phase 4: Production Ready** - Error handling, logging, testing ve deployment ✅
- [x] **Phase 4.5: Admin Panel** - React admin panel, drag-drop upload, AI kullanım takibi ✅
- [x] **Phase 5: Gemini Image Integration** - Gemini img2img, 4 stil varyasyonu, faithfulness kontrolü ✅
- [x] **Phase 6: Human-in-the-Loop (Telegram)** - Paylaşım öncesi Telegram onay sistemi ✅
- [x] **Phase 12: AI Orchestrator** - Uçtan uca görsel üretim pipeline (asset→senaryo→prompt→üretim→QC) ✅
- [x] **Phase 13: Dynamic Categories** - ID-based dinamik kategori sistemi, SaaS hazırlığı ✅
- [ ] **Phase 14: Hava Durumu** - Günlük hava → içerik önerisi entegrasyonu
- [ ] **Phase 15: Yerel Takvim** - Türkiye özel günleri için otomatik tema
- [ ] **Phase 16: Operasyonel Veri** - Stok durumu ↔ içerik motoru bağlantısı
- [ ] **Phase 17: QR Menü Köprüsü** - QR menü analytics → içerik önceliği
- [ ] **Phase 20: Multi-Tenant SaaS** - Çoklu müşteri altyapısı

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
| 11. Photo Prompt Studio | 5/5 | ✅ Completed | 2026-01-16 |
| 12. AI Orchestrator | 9/9 | ✅ Completed | 2026-01-22 |
| 13. Dynamic Categories | 10/10 | ✅ Completed | 2026-01-26 |
| **Dijital Asistan Milestone** | | | |
| 14. Hava Durumu | 0/4 | 📋 Planlandı | - |
| 15. Yerel Takvim | 0/5 | 📋 Planlandı | - |
| 16. Operasyonel Veri | 0/5 | 📋 Planlandı | - |
| 17. QR Menü Köprüsü | 0/4 | 📋 Planlandı | - |
| 18. Multi-AI Provider | 0/5 | 📋 Planlandı | - |
| 19. Video İçerik | 0/5 | 📋 Planlandı | - |
| 20. Multi-Tenant SaaS | 0/6 | 📋 Planlandı | - |
| **Poster Prompt Studio V2 Milestone** | | | |
| 21. Görsel Parametreler | 0/6 | 📋 Planlandı | - |
| 22. UX & Akış İyileştirmeleri | 0/5 | 📋 Planlandı | - |
| 23. Kişiselleştirme & Hafıza | 0/4 | 📋 Planlandı | - |

## Notes

- **Milestone v1.0:** ✅ TAMAMLANDI (2026-01-13)
- **Milestone v1.5 (Admin):** ✅ TAMAMLANDI (2026-01-14)
- **Milestone v2.0 (Gemini):** ✅ TAMAMLANDI (2026-01-14)
- **Milestone v3.0 (Telegram HITL):** ✅ TAMAMLANDI (2026-01-15)
- **Milestone v4.0 (Caption Templates):** ✅ TAMAMLANDI (2026-01-15)
- **Milestone v5.0 (Best Time to Post):** ✅ TAMAMLANDI (2026-01-15)
- **Milestone v5.5 (Analytics Dashboard):** ✅ TAMAMLANDI (2026-01-16)
- **Milestone v6.0 (Content Calendar):** ✅ TAMAMLANDI (2026-01-16)
- **Milestone v6.5 (Photo Prompt Studio):** ✅ TAMAMLANDI (2026-01-16)
- **Milestone v7.0 (AI Orchestrator):** ✅ TAMAMLANDI (2026-01-22)
- **Milestone v8.0 (Dynamic Categories):** ✅ TAMAMLANDI (2026-01-26)
- **Milestone v9.0 (Dijital Asistan):** 📋 PLANLANDI - Phase 14-17
- **Milestone v10.0 (Multi-Provider & Video):** 📋 PLANLANDI - Phase 18-19
- **Milestone v11.0 (SaaS):** 📋 PLANLANDI - Phase 20
- **Milestone v12.0 (Poster Prompt Studio V2):** 📋 PLANLANDI - Phase 21-23
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

### Phase 11: Photo Prompt Studio Integration
**Goal:** İki projeyi birleştirerek uçtan uca otomatik görsel içerik üretim sistemi
**Depends on:** Phase 10
**Status:** ✅ Tamamlandı (2026-01-16)

Tamamlananlar:
- [x] 11-01: Types güncelleme (customPrompt, studioAnalysis) ✅
- [x] 11-02: receivePromptFromStudio API endpoint ✅
- [x] 11-03: processQueue customPrompt desteği ✅
- [x] 11-04: Claude Code Skills (4 skill) ✅
- [x] 11-05: KURALLAR.md entegrasyonu ✅

**Özellikler:**
- Photo Prompt Studio'dan prompt alma API
- Custom prompt ve negative prompt desteği
- Görsel analiz verileri (studioAnalysis)
- 4 Claude Code Skill: photo-orchestrator, visual-analyzer, prompt-writer, instagram-bridge
- KURALLAR.md ile nörogastronomi prensipleri

**API Endpoint:** POST /receivePromptFromStudio
**Auth:** x-api-key header

### Phase 12: AI Orchestrator System
**Goal:** Uçtan uca otomatik görsel üretim pipeline'ı - asset seçimi, senaryo, prompt, üretim, kalite kontrol
**Depends on:** Phase 11
**Status:** ✅ Tamamlandı (2026-01-22)

Tamamlananlar:
- [x] Asset CRUD (ürün, prop, mobilya, ortam, evcil hayvan, aksesuar, interior) ✅
- [x] TimeSlot Rules (zaman dilimi bazlı ürün kuralları) ✅
- [x] Theme & Scenario sistemi (7 senaryo, temalar, el stilleri, kompozisyonlar) ✅
- [x] Pipeline engine (asset seçimi → senaryo → prompt → üretim → QC → Telegram) ✅
- [x] Dashboard istatistikleri ✅
- [x] Çeşitlilik kuralları (gap sistemi, pet frequency, benzersizlik) ✅
- [x] AI Monitor (Claude & Gemini log takibi) ✅
- [x] AI Feedback System (sorun bildirme, kategori bazlı geri bildirim) ✅
- [x] AI Rules System (öğrenme kuralları - do/dont) ✅

### Phase 13: Dynamic Category System
**Goal:** Hardcoded enum yerine dinamik, ID-based kategori sistemi - SaaS hazırlığı
**Depends on:** Phase 12
**Status:** ✅ Tamamlandı (2026-01-26)

Tamamlananlar:
- [x] Dinamik kategori servisi (Firestore tabanlı, cache'li) ✅
- [x] CategorySubType'a `id` field ekleme (format: categoryType_slug) ✅
- [x] ID generation helpers (deterministic + unique) ✅
- [x] ID-based lookup fonksiyonları (getSubTypeById, validateSubTypeId, vb.) ✅
- [x] Migration endpoint'leri (kategoriler, asset'ler, timeslot kuralları) ✅
- [x] loadAvailableAssets() dinamik kategori desteği ✅
- [x] Graceful skip pattern (bilinmeyen kategori = warning, crash değil) ✅
- [x] Ana kategori CRUD API (addMainCategory, updateMainCategory, deleteMainCategory) ✅
- [x] Admin panel: ana kategori ekleme/düzenleme/silme UI ✅
- [x] Migration çalıştırıldı: 35 subtype, 109 asset, 5 timeslot rule ✅

---

## Milestone: Dijital Asistan (SaaS Hazırlık)

> **Vizyon:** "Mağazasını tanıyan dijital asistan" - Sadece içerik üreten değil,
> işletmeyi tanıyan, bağlam anlayan, proaktif öneri sunan bir sistem.

### Phase 14: Hava Durumu Entegrasyonu
**Goal:** Günlük hava durumuna göre içerik önerisi (sıcak→soğuk içecek, soğuk→sıcak çikolata)
**Depends on:** Phase 13
**Status:** Planlandı
**Zorluk:** Kolay

Planlar:
- [ ] Hava durumu API entegrasyonu (OpenWeatherMap veya WeatherAPI)
- [ ] Hava → İçerik teması eşleştirme kuralları
- [ ] Orchestrator pipeline'a hava durumu context ekleme
- [ ] Admin panel: hava durumu kuralları yönetimi

### Phase 15: Yerel Takvim Entegrasyonu
**Goal:** Türkiye'ye özel günler (Ramazan, Kandil, Bayram, Anneler Günü) için otomatik içerik teması
**Depends on:** Phase 14
**Status:** Planlandı
**Zorluk:** Orta

Planlar:
- [ ] Türkiye özel günler veritabanı (dini, milli, ticari)
- [ ] Takvim → Tema eşleştirme sistemi
- [ ] Otomatik tema önerisi (Telegram'a "Yarın Kandil, lokma teması öneriyorum" mesajı)
- [ ] Admin panel: özel gün takvimi yönetimi
- [ ] Mevsimsel ürün rotasyonu (yaz = soğuk tatlılar, kış = sıcak içecekler)

### Phase 16: Operasyonel Veri Entegrasyonu
**Goal:** Stok durumu ile içerik motoru bağlantısı - olmayan ürünü paylaşma
**Depends on:** Phase 15
**Status:** Planlandı
**Zorluk:** Orta-Zor

Planlar:
- [ ] Ürün stok durumu modeli (Firestore: stokta/bitti/az kaldı)
- [ ] Admin panel: günlük stok güncelleme UI (basit toggle)
- [ ] Orchestrator: stok kontrol adımı (bitmiş ürünü seçme)
- [ ] "Az kaldı" ürünleri öne çıkarma stratejisi
- [ ] Telegram bildirim: "Çilekli pasta bitti, alternatif öneriyorum"

### Phase 17: QR Menü Köprüsü
**Goal:** QR menü verileri ile sosyal medya içeriğini birleştirme
**Depends on:** Phase 16
**Status:** Planlandı
**Zorluk:** Zor

Planlar:
- [ ] QR menü tıklama analytics (popüler ürünler)
- [ ] Popüler ürün → İçerik önceliği algoritması
- [ ] Instagram paylaşım → QR menü yönlendirme (bio link, caption CTA)
- [ ] Cross-platform dönüşüm takibi

### Phase 18: Multi-AI Provider
**Goal:** DALL-E, Midjourney ve diğer AI sağlayıcılarını seçilebilir hale getirme
**Depends on:** Phase 13
**Status:** Planlandı
**Zorluk:** Orta

Planlar:
- [ ] AI Provider abstraction layer (interface: generate, cost, capabilities)
- [ ] DALL-E 3 entegrasyonu (OpenAI API)
- [ ] Provider seçimi UI (maliyet/kalite karşılaştırma)
- [ ] A/B testing: aynı prompt ile farklı provider karşılaştırma
- [ ] Maliyet takibi provider bazlı

### Phase 19: Video İçerik Üretimi
**Goal:** Veo3 veya diğer video AI'ları ile kısa video/Reel üretimi
**Depends on:** Phase 18
**Status:** Planlandı (Uzun Vadeli)
**Zorluk:** Zor

Planlar:
- [ ] Video generation API araştırması (Veo3, Sora, Runway)
- [ ] Video pipeline tasarımı (script → görsel → video → müzik)
- [ ] Instagram Reels API entegrasyonu
- [ ] Video kalite kontrol sistemi
- [ ] Maliyet optimizasyonu (video çok daha pahalı)

### Phase 20: Multi-Tenant SaaS Altyapısı
**Goal:** Çoklu müşteri desteği, tenant izolasyonu, onboarding
**Depends on:** Phase 17
**Status:** Planlandı (Uzun Vadeli)
**Zorluk:** Çok Zor

Planlar:
- [ ] Tenant modeli (tenantId, subscription, limits)
- [ ] Firestore Security Rules (tenant izolasyonu)
- [ ] Onboarding akışı (ürün yükleme, marka ayarları)
- [ ] Fiyatlandırma & abonelik sistemi (Stripe/iyzico)
- [ ] Müşteri dashboard'u (self-service admin panel)
- [ ] Blueprint/Template kategoriler (yeni tenant için varsayılanlar)

---

## What's Next (Altyapı İyileştirmeleri)

### 🔒 Güvenlik (Öncelikli)
- [ ] **Firebase Auth + Custom Claims** - Admin panel ve API güvenliği
  - Firebase Authentication entegrasyonu
  - Admin rolü için Custom Claims
  - Functions middleware (auth check)
  - Admin panel login sayfası
  - IAM "allUsers" kaldırılacak (şu an geçici olarak açık)

### 📋 Diğer İyileştirmeler
- [ ] Smart Retry Logic (3 deneme)
- [ ] Docker Support
- [ ] Fractional Indexing (drag-drop sıralama optimizasyonu)
- [ ] Denormalizasyon stratejisi (kategori adını asset'lere gömme)
- [ ] A/B Testing for Captions

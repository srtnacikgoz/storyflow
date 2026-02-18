# UX Kullanıcı Akışı Sürtünme Analizi
**Tarih:** 2026-02-10 | **Agent:** Explore (Sonnet)

---

## Karar Çelişkileri Matrisi

| Karar | Scenarios | Themes | Templates | Dashboard | Sürtünme |
|-------|-----------|--------|-----------|-----------|----------|
| El dahil mi? | ✋ includesHands | — | — | — | YOK |
| Kompozisyon nasıl? | 📐 compositionId | — | 🎨 Slot bazlı | 🎬 Template seç | **KRİTİK** |
| Hangi masa/bardak/tabak? | — | 🪑 preferredTags | 🎨 Slot filterTags | 🎬 Template seç | **KRİTİK** |
| Tema seç | — | 🎨 Oluştur | 🎨 themeId | 🎬 Dropdown | YÜKSEK |
| Senaryo seç | 📝 Oluştur | 🎨 Tema içinde | 🎨 scenarioId | — | **KRİTİK** |
| Köpek izni | — | 🐕 petAllowed | — | — | YOK |
| Aksesuar izni | — | ✨ accessoryAllowed | — | — | YOK |
| Hava/Işık/Atmosfer | — | ☀️ Presetler | — | — | YOK |
| Aspect Ratio | — | — | — | 📐 Dropdown | YOK |

## 3 Kritik Sürtünme

### 1. KOMPOZİSYON KAOSU
Kullanıcı kompozisyonu 3 farklı yerde belirliyor:
- Senaryolar: `compositionId` dropdown
- Templates: Slot bazlı detaylı config
- Dashboard: Template seçimi ile override

### 2. ASSET SEÇİMİ DUBLAJLARI
- Temalar: `preferredTags` (masa, tabak, fincan tag'leri)
- Templates: Slot bazlı `filterTags`
- Ayarlar: `assetConfig` + `slotDefaults`
→ 4 farklı yerde aynı şey!

### 3. SENARYO LABİRENTİ
- Senaryolar: Oluşturma
- Temalar: Tema içinde senaryo seç
- Templates: scenarioId seç
→ Hangisi kazanıyor? Kullanıcı bilmiyor.

## Sürtünme Skorları

| Sayfa | Toplam Karar | Çelişkili | Skor |
|-------|-------------|-----------|------|
| Scenarios | 7 | 2 | ⚠️ ORTA |
| Themes | 11 | 4 | 🔥 YÜKSEK |
| Templates | 4 | 3 | 🔥 ÇOK YÜKSEK |
| Settings | 12 | 2 | ⚠️ ORTA |
| Dashboard | 3 | 2 | 🔥 YÜKSEK |

**Genel:** 🔥 KRİTİK — Kullanıcı aynı şeyi 3-4 yerde yapıyor, hangisinin kazandığını bilmiyor.

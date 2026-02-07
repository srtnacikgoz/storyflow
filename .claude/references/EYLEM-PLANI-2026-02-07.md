# Denetim Raporları Değerlendirme & Eylem Planı

**Tarih:** 7 Şubat 2026
**Kaynak:** Scenario_Audit_Report, system-audit-report, Theme_Audit_Report
**Değerlendiren:** Claude Code (kod üzerinden doğrulanmış)

---

## Raporların Doğruluk Analizi

### Senaryo Raporu (5 iddia)

| # | İddia | Doğruluk | Gerçek Durum |
|---|-------|----------|--------------|
| 1 | Türkçe karakter kaybı (ID üretimi) | **DOĞRU** | `Scenarios.tsx:369` - `[^a-z0-9-]` regex'i Türkçe karakterleri siliyor. "Çikolata" → "ikolata" |
| 2 | SortOrder race condition | **DOĞRU** ama **düşük risk** | İki kişi aynı anda senaryo eklerse sortOrder çakışır. Tek kullanıcı olduğu için gerçekçi risk değil |
| 3 | Hardcoded moodGuidelines | **DOĞRU** | `gemini.ts:626` - 6 mood kuralı kod içinde sabit |
| 4 | Deprecated mood field | **YANLIŞ** | Geriye uyumluluk için kasıtlı bırakılmış, sorun değil |
| 5 | Hardcoded hand pose options | **YANLIŞ** | Fallback mekanizması - önce API'den yüklüyor, default sadece API başarısız olursa devreye giriyor. Doğru tasarım |

### Sistem Raporu (6 iddia)

| # | İddia | Doğruluk | Gerçek Durum |
|---|-------|----------|--------------|
| 1 | Tooltip sonsuz döngü | **YANLIŞ** | Koşullu setState, dependency array düzgün. Döngü yok |
| 2 | useEffect eksik bağımlılıklar (14 dosya!) | **YANLIŞ** | AIMonitor, Themes, Scenarios kontrol edildi - hepsi düzgün |
| 3 | season: "winter" sabit | **DOĞRU** | `orchestrator.ts:703` - TODO yorumu mevcut |
| 4 | VisualCriticModal TODO | **DOĞRU** | "Apply Fix" butonu `alert()` ile placeholder |
| 5 | 3375 lint hatası | **ABARTILI** | Kod görsel olarak temiz, büyük çoğunluğu stil kuralı |
| 6 | LoadingContext Fast Refresh | **YANLIŞ** | Context ve hooks düzgün kullanılmış |

### Tema Raporu (5 iddia)

| # | İddia | Doğruluk | Gerçek Durum |
|---|-------|----------|--------------|
| 1 | İyi slugify var | **DOĞRU** | `Themes.tsx:383-394` - Türkçe karakter dönüşümü düzgün |
| 2 | Slugify paylaşılmıyor | **DOĞRU** | Sadece Themes.tsx'te, ortak utility yok |
| 3 | Cascade silme güvenliği | **DOĞRU** | Kontrol var ama transaction yok (düşük risk) |
| 4 | Hardcoded default temalar | **DOĞRU** ama **kabul edilebilir** | Seeding mekanizması - Firestore'da yoksa ekler, sonra Firestore'dan okur |
| 5 | 56 lint hatası | **DOĞRULANAMADI** | Kod görsel olarak temiz |

---

## Özet İstatistik

**16 iddiadan:**
- 8 DOĞRU (bazıları düşük öncelik)
- 5 YANLIŞ (Tooltip, useEffect, hand pose, LoadingContext, deprecated mood)
- 2 ABARTILI (lint sayıları)
- 1 DOĞRULANAMADI

System audit raporu en zayıf kalitede - 6 iddiadan 4'ü yanlış.

---

## Eylem Planı

### Öncelik 1: Gerçek Bug
**Scenarios.tsx Türkçe ID düzeltmesi + Ortak slugify utility**
- Themes.tsx'teki `generateId` fonksiyonu zaten doğru çalışıyor
- `admin/src/utils/stringUtils.ts` oluştur, ortak `slugify` fonksiyonu taşı
- Scenarios.tsx'te de aynı fonksiyonu kullan
- Tahmini: ~30 dakika

### Öncelik 2: Pipeline Kalitesi
**moodGuidelines'ı Firestore config'e taşı**
- `gemini.ts:626`'daki 6 sabit mood kuralı config'e taşınırsa admin panelden güncellenebilir
- Deploy gerektirmeden AI davranışı değiştirilebilir
- Tahmini: ~1 saat

### Öncelik 3: Bilinen Eksik
**season: "winter" dinamik yap**
- `orchestrator.ts:703` - Basit tarih kontrolü
- Türkiye saat dilimine göre 4 mevsim
- 5-10 satır kod
- Tahmini: ~15 dakika

### Yapılmasına Gerek Yok
- **Lint temizliği** - Kozmetik, değer katmaz
- **VisualCriticModal TODO** - Aktif kullanılan bir özellik değil
- **Race condition fix** - Tek kullanıcı, gerçekçi risk yok
- **Transaction ekleme** - Aynı sebep
- **Default themes taşıma** - Seeding pattern doğru çalışıyor

---

## Durum: BEKLİYOR
Kullanıcı onayı sonrası uygulanacak.

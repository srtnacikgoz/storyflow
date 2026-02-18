# CROSS-DOMAIN ÇATIŞMA ANALİZİ — SENTEZ RAPORU
**Tarih:** 2026-02-10 | **7 Paralel Agent Araştırması**

---

## Araştırma Kapsamı

| # | Rapor | Dosya |
|---|-------|-------|
| 1 | Karar Sahipliği Haritası | `01-karar-haritasi.md` |
| 2 | Senaryo ↔ Tema Çatışmaları | `02-senaryo-tema.md` |
| 3 | Senaryo ↔ Template Çatışmaları | `03-senaryo-template.md` |
| 4 | Tema ↔ Template Çatışmaları | `04-tema-template.md` |
| 5 | Ayarlar ↔ Pipeline Çatışmaları | `05-ayarlar-pipeline.md` |
| 6 | Dashboard Override Zinciri | `06-dashboard-override.md` |
| 7 | UX Sürtünme Analizi | `07-ux-surtunme.md` |

---

## TEK SAYFA ÖZET: 15 Karar, 8 Çakışma

### Temiz Alanlar (Tek Sahip — Çakışma YOK)
| Karar | Sahip |
|-------|-------|
| El pozu (handPose) | Senaryo |
| Pet izni | Tema |
| Aksesuar izni | Tema |
| Hava/Işık/Atmosfer presetleri | Tema |
| Aspect Ratio | Dashboard |
| Rastgele mod | Dashboard |
| El giriş noktası (compositionEntry) | Senaryo |

### Çatışan Alanlar (Birden Fazla Sahip)
| Karar | Sahip 1 | Sahip 2 | Sahip 3 | Tehlike |
|-------|---------|---------|---------|---------|
| **El dahil mi?** | Senaryo includesHands | Template hands slot | — | ÇİFT OTORİTE |
| **Kompozisyon nasıl?** | Senaryo compositionId (eski) | Template slots (yeni) | — | PARALEL SİSTEM |
| **Hangi masa?** | Tema preferredTags | Template filterTags | Fixed asset | 3 KATMAN |
| **Hangi tabak?** | Tema preferredTags | Template filterTags | Fixed asset | 3 KATMAN |
| **Hangi bardak?** | Tema preferredTags | Template filterTags | Fixed asset | 3 KATMAN |
| **Senaryo seçimi** | Tema scenarios[] | Template scenarioId | TimeSlot (deprecated) | 3 YER |
| **Ürün tipi** | Senaryo suggestedProducts | TimeSlot productTypes | Dashboard tetikleme | 3 YER |
| **Aksesuar/dekor** | Tema accessoryAllowed | Template decor slot | — | BYPASS RİSKİ |

---

## EN KRİTİK 5 SORUN

### 1. ATMOSFER ÇİFTE KOMUTAS
Tema structured preset (sunny, warm) + Senaryo serbest metin description (dark, moody) → İKİSİ DE prompt'a ekleniyor → Gemini çelişkili talimat alıyor.

### 2. ESKİ compositionId vs YENİ SLOT SİSTEMİ
İki kompozisyon sistemi paralel çalışıyor, birbirinden habersiz. Senaryo compositionId prompt TEXT'e gider, template slots referans GÖRSELLER seçer.

### 3. ASSET TAG ÇİFTE KOMUTASI
Tema preferredTags PROMPT'a gider (Gemini'ye "mermer masa" der), Template filterTags HAVUZDAN seçim yapar (ahşap masa seçer) → Referans görsel ahşap ama prompt mermer diyor.

### 4. KOMPOZİSYON KAOSU (UX)
Kullanıcı kompozisyonu 3 farklı yerde belirliyor: Senaryolar sayfasında compositionId, Templates sayfasında slot bazlı, Dashboard'da template seçimi ile. Hangisi kazandığını bilmiyor.

### 5. hands SLOT vs includesHands
El kararı iki yerde veriliyor. Template hands slot disabled ama senaryo includesHands=true ise ne olur? Pipeline'da template kazanıyor ama kullanıcıya bu net değil.

---

## İDEAL OTORİTE ZİNCİRİ (Hedef)

```
TEMA → Estetik, atmosfer, hava, ışık, izinler, asset tag tercihleri
SENARYO → Sahne yönü (SADECE fiziksel: el, açı, yerleşim), ürün uyumluluğu
TEMPLATE → Slot konfigürasyonu (hangi asset kategorileri aktif/kapalı)
AYARLAR → Varsayılanlar (template yokken), teknik kurallar
DASHBOARD → Tetikleme, format, override
```

**Kural:** Her karar TEK YERDE verilir. Çakışma varsa biri KALDIRILIR, biri kazanmaz.

---

## NOT: Dashboard Senaryo Seçimi
Dashboard'da manuel senaryo seçimi yok — tema seçimi senaryo havuzunu belirliyor. Bu sorun DEĞİL, bilinçli tasarım kararı.

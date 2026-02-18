# SENARYO ALANLARI — SENTEZ RAPORU
**Tarih:** 2026-02-10 | **7 Paralel Agent Araştırması**

---

## Araştırma Kapsamı

| # | Rapor | Dosya |
|---|-------|-------|
| 1 | Tip Tanımları | `01-tip-tanimlari.md` |
| 2 | Pipeline Akışı | `02-pipeline-akisi.md` |
| 3 | Prompt Builder Etkisi | `03-prompt-builder-etkisi.md` |
| 4 | Filtreleme Mantığı | `04-filtreleme-mantigi.md` |
| 5 | Composition Etkileşimi | `05-composition-etkilesimi.md` |
| 6 | Admin UI | `06-admin-ui.md` |
| 7 | Firestore Veri Kaynağı | `07-firestore-veri-kaynagi.md` |

---

## Alan Durum Tablosu

| Alan | Pipeline | Prompt | UI | Seed | Verdict |
|------|:--------:|:------:|:--:|:----:|---------|
| id | ✅ | — | ✅ | ✅ | Sağlıklı |
| name | ✅ | — | ✅ | ✅ | Sağlıklı |
| description | ✅ | ✅ SCENE DIRECTION | ✅ | ✅ | **EN KRİTİK** |
| includesHands | ✅ | ✅ HANDS bloku | ✅ | ✅ | Sağlıklı |
| suggestedProducts | ✅ filtreleme | ❌ | ✅ | ✅ | Sağlıklı |
| isInterior | ✅ AI bypass | — | ✅ | ✅ | Sağlıklı |
| interiorType | ✅ | — | ✅ | ✅ | Sağlıklı |
| compositionId | ✅ | ✅ (el varsa) | ✅ | ❌ | ⚠️ Eski sistem |
| handPose | ✅ | ✅ preset | ✅ | ❌ | ⚠️ Seed eksik |
| compositionEntry | ✅ | ✅ preset | ✅ | ❌ | ⚠️ Seed eksik |
| isActive | ✅ | — | ✅ | ✅ | Sağlıklı |
| sortOrder | — | — | ✅ | ❌ | Kosmetik |

---

## 4 KRİTİK ÇAKIŞMA

### 1. Eski compositionId vs Yeni Slot Sistemi — PARALEL
- **Eski:** scenario.compositionId → prompt TEXT ("overhead", "close-up")
- **Yeni:** CompositionTemplate.slots → referans GÖRSELLER
- İki sistem birbirinden habersiz
- compositionId prompt'a SADECE el varsa giriyor

### 2. hands Slot vs includesHands — ÇİFT OTORİTE
- Senaryo: `includesHands: boolean`
- Template: `hands` slot enabled/disabled
- Çakışma durumunda net öncelik kuralı yok

### 3. Senaryo Bazlı Negatif Kısıtlama YOK
- Negatif prompt sadece "always" + "hands" kategorileri
- Senaryo "minimal" dese bile yapısal engelleme yok

### 4. Auto-Default Senaryo Bilgisi Kullanmıyor
- Sadece productType bazlı slot varsayılanları
- Senaryo includesHands=true olsa bile hands slot auto-default'ta kontrol edilmiyor

---

## Sorun Olmayan Konular

- **Dashboard'da senaryo seçimi yok** — sorun DEĞİL, tema zaten senaryo belirliyor
- **Dead code yok** — tüm alanlar aktif kullanımda
- **Filtreleme mantığı sağlıklı** — tema → ürün tipi → diversity zinciri çalışıyor
- **Puanlama algoritması** — 4 kriterli, deterministik, token tasarrufu sağlıyor

---

## Düzeltme Öncelikleri (İleride)

1. **Eski compositionId** → ya kaldır ya slot sistemiyle birleştir
2. **hands slot vs includesHands** → tek otorite belirle
3. **Seed data tamamla** → handPose, compositionEntry, compositionId
4. **Senaryo bazlı negatif kısıtlama** → description'a güvenmek yerine yapısal mekanizma

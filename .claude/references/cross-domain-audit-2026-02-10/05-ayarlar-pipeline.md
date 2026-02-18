# Ayarlar ↔ Pipeline Çatışma Analizi
**Tarih:** 2026-02-10 | **Agent:** Explore (Sonnet)

---

## Ayarlar Sayfası Konfigürasyonları

1. **productSlotDefaults** — Ürün tipine göre slot varsayılanları
2. **beverageRules** — İçecek eşleştirme (UI'da YOK)
3. **tagMappings** — İçecek→tag dönüşümü (UI'da YOK)
4. **diversityRules** — Çeşitlilik kuralları (UI'da YOK)
5. **assetSelectionConfig** — Asset zorunluluk kuralları
6. **businessContext** — İşletme bağlamı (prompt)
7. **schedulerEnabled** — Otomatik üretim toggle

## Override Hiyerarşisi

```
Template > Tema preferredTags > Ayarlar (defaults, beverage, diversity)
```

## Çakışmalar

### 1. productSlotDefaults vs CompositionTemplate
- Template seçilince defaults TAM OLARAK EZİLİR
- **Satır:** orchestrator.ts:813

### 2. productSlotDefaults vs Senaryo includesHands
- Senaryo includesHands=true → defaults hands:false EZİLİR
- **Satır:** orchestrator.ts:976

### 3. beverageRules vs Tema preferredTags
- Tema preferredTags varsa beverageRules GÖRMEZDEน GELİNİR
- DOĞRU davranış — kullanıcı tercihi öncelikli

### 4. assetSelectionConfig vs CompositionTemplate
- Template slot'ları assetSelectionConfig'i TAM OVERRIDE eder
- İkisi aynı işi yapıyor

### 5. diversityRules.tableGap KALDIRILMIŞ
- Kod yorumunda: "tema preferredTags yeterli"
- Ama UI'da hâlâ görünüyor olabilir

## Sağlıklı Hiyerarşi (Çakışma Değil, Öncelik)
- Tema preferredTags → beverageRules override (DOĞRU)
- CompositionTemplate → productSlotDefaults override (DOĞRU)
- Senaryo includesHands → productSlotDefaults.hands override (DOĞRU)

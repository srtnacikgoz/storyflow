# Karar Sahipliği Haritası
**Tarih:** 2026-02-10 | **Agent:** Explore (Sonnet)

---

## Genel Karar Tablosu

| Karar | Tema | Senaryo | Template | TimeSlot | Dashboard | Çakışma? | Kim Kazanıyor? |
|-------|------|---------|----------|----------|-----------|----------|----------------|
| **Hangi senaryo?** | ✅ scenarios[] | — | ✅ scenarioId (opt) | ✅ scenarioPreference (deprecated) | ⚙️ Tetikler | ❌ 3 YER | Tema filtrelemesi |
| **El dahil mi?** | — | ✅ includesHands | ✅ slots["hands"] | — | — | ❌ 2 YER | Scenario.includesHands |
| **Hangi el pozu?** | — | ✅ handPose | — | — | — | ✅ TEK | Senaryo |
| **Hangi kompozisyon?** | — | ✅ compositionId | ✅ slots (yeni) | — | — | ❌ 2 YER | Paralel çalışıyor |
| **Hangi ürün tipi?** | — | ✅ suggestedProducts | — | ✅ productTypes | ⚙️ Tema→senaryo→ilk | ❌ 3 YER | Manuel: suggestedProducts[0], Scheduler: TimeSlotRule |
| **Pet dahil mi?** | ✅ petAllowed | — | — | — | — | ✅ TEK | Tema |
| **Aksesuar dahil mi?** | ✅ accessoryAllowed | — | ⚠️ decor slot | — | — | ❌ 2 YER | Tema (ama template bypass edebilir) |
| **Hangi masa?** | ✅ preferredTags.table | — | ✅ slots["surface"] | — | — | ❌ 3 YER | 1.Fixed 2.Template 3.preferredTags |
| **Hangi tabak?** | ✅ preferredTags.plate | — | ✅ slots["dish"] | — | — | ❌ 3 YER | 1.Fixed 2.Template 3.preferredTags |
| **Hangi bardak?** | ✅ preferredTags.cup | — | ✅ slots["drinkware"] | — | — | ❌ 3 YER | 1.Fixed 2.Template 3.preferredTags |
| **Hava durumu?** | ✅ weatherPreset | — | — | — | — | ✅ TEK | Tema |
| **Işık?** | ✅ lightingPreset | — | — | — | — | ✅ TEK | Tema |
| **Atmosfer?** | ✅ atmospherePreset | — | — | — | — | ✅ TEK | Tema |
| **Aspect Ratio?** | — | — | — | — | ✅ Kullanıcı | ✅ TEK | Dashboard |
| **Rastgele mod?** | — | — | — | — | ✅ Toggle | ✅ TEK | Dashboard |

## Özet

- **15 Karar Noktası:** 7 tek yerde (NET), 8 birden fazla yerde (ÇAKIŞMA RİSKİ)
- **En Riskli:** Asset seçimi (3 katman), Senaryo seçimi (3 alan), El kullanımı (2 alan), Kompozisyon (2 sistem paralel)

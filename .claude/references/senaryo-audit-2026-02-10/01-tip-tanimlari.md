# Senaryo Tip Tanımları Araştırması
**Tarih:** 2026-02-10 | **Agent:** Explore (Sonnet)

---

## Scenario Interface — Tüm Alanlar

**Ana Tip Tanımı:** `functions/src/orchestrator/types.ts` (satır 553-578)

| Alan Adı | Tip | Zorunlu/Opsiyonel | Ne İşe Yarıyor | Kullanılıyor mu? |
|----------|-----|-------------------|----------------|------------------|
| **id** | `string` | ✅ Zorunlu | Firestore döküman ID (örn: "zarif-tutma") | ✅ Aktif |
| **name** | `string` | ✅ Zorunlu | Kullanıcıya gösterilen ad | ✅ Aktif |
| **description** | `string` | ✅ Zorunlu | AI'ya sahne yönü (SCENE DIRECTION) verir | ✅ **KRİTİK** (prompt'a eklenir) |
| **includesHands** | `boolean` | ✅ Zorunlu | El içeren senaryo mu? | ✅ Aktif |
| **handPose** | `string?` | ⚠️ Opsiyonel | El pozu ID (cupping, pinching vb.) | ⚠️ Kullanımı belirsiz |
| **compositionEntry** | `string?` | ⚠️ Opsiyonel | El giriş noktası (bottom-right, top-down vb.) | ⚠️ Kullanımı belirsiz |
| **isInterior** | `boolean?` | ⚠️ Opsiyonel | Interior senaryo mu? (AI üretimi atlanır) | ✅ Aktif |
| **interiorType** | `InteriorType?` | ⚠️ Opsiyonel | Interior alt kategorisi (vitrin, tezgah vb.) | ✅ Aktif |
| **suggestedProducts** | `ProductType[]?` | ⚠️ Opsiyonel | Uygun ürün tipleri | ✅ Aktif (filtreleme) |
| **isActive** | `boolean?` | ⚠️ Opsiyonel | Aktif mi? | ✅ Aktif |
| **sortOrder** | `number?` | ⚠️ Opsiyonel | UI sıralama | ✅ UI only |
| **createdAt** | `number?` | ⚠️ Opsiyonel | Oluşturulma timestamp | ✅ Metadata |
| **updatedAt** | `number?` | ⚠️ Opsiyonel | Güncelleme timestamp | ✅ Metadata |
| **compositionId** | `string?` | ⚠️ Opsiyonel | Tekli kompozisyon seçimi (v2.0) | ⚠️ Eski sistem kalıntısı |

## Kritik Bulgular

### DEPRECATION RİSKİ: El/Kompozisyon Alanları
- `handPose`, `compositionEntry`, `compositionId` — seed data'da YOK
- Kod içinde okunuyor ama fallback'lerle çalışıyor
- geminiPromptBuilder.ts:1379-1380 → handPose, compositionEntry okunuyor
- orchestrator.ts:1094 → compositionId yazılıyor
- rulesService.ts:439 → compositionId || "default" fallback

### Alan Grupları
- **Sahne Yönü:** description (EN KRİTİK)
- **Teknik/Filtreleme:** suggestedProducts, isInterior, interiorType
- **El/Kompozisyon (SORUNLU):** includesHands (çalışıyor), handPose, compositionEntry, compositionId (belirsiz)
- **Metadata:** isActive, sortOrder, createdAt, updatedAt

### İlgili Tipler
- `InteriorType`: "vitrin" | "tezgah" | "oturma-alani" | "dekorasyon" | "genel-mekan"
- `ProductType`: "croissants" | "pastas" | "chocolates" | "coffees"
- `FirestoreScenario extends Scenario` (şu anda özdeş)
- `ScenarioSelection` — pipeline sonucu (runtime tipi)
- `Mood` interface — @deprecated (Scenario ile birleştirildi)

### Kullanım İstatistikleri
| Alan | Kod İçinde Kullanım | Seed Data | Risk |
|------|---------------------|-----------|------|
| id, name, description | 20-50+ | ✅ | 🟢 |
| includesHands, suggestedProducts | 10-15+ | ✅ | 🟢 |
| isInterior, interiorType | 5-8 | ✅ | 🟢 |
| handPose, compositionEntry | 2 | ❌ | 🔴 |
| compositionId | 5 | ❌ | 🔴 |
| sortOrder | 3 | ❌ | 🟡 |

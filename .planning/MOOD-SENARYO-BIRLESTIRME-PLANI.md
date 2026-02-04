# Mood + Senaryo Birleştirme Planı

> **Amaç:** İki ayrı kavramı (Mood + Senaryo) tek bir "Senaryo" kavramında birleştirmek
> **Oluşturulma:** 2026-02-04
> **Durum:** 🔴 PLAN AŞAMASINDA

---

## 1. Mevcut Durum Analizi

### 1.1 Mood Yapısı

**Konum:** `moods` Firestore collection
**Interface:** `orchestrator/types.ts:144 - Mood`
**Service:** `services/moodService.ts`
**Controller:** `controllers/moodController.ts`
**UI:** `admin/src/pages/Moods.tsx`

```typescript
interface Mood {
  id: string;
  name: string;
  description: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night" | "any";
  season: "winter" | "spring" | "summer" | "autumn" | "any";
  weather: "sunny" | "cloudy" | "rainy" | "snowy" | "any";
  lightingPrompt: string;
  colorGradePrompt: string;
  geminiPresetId?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### 1.2 Senaryo Yapısı

**Konum:** `global/config.scenarios` array (Firestore)
**Interface:** `orchestrator/types.ts:525 - Scenario`
**Service:** `rulesService.ts` (loadStaticRules içinde)
**Controller:** `controllers/orchestrator/scenarioController.ts`
**UI:** `admin/src/pages/Scenarios.tsx`

```typescript
interface Scenario {
  id: string;
  name: string;
  description: string;
  includesHands: boolean;
  compositionId?: string;
  compositionEntry?: string;
  isInterior?: boolean;
  interiorType?: InteriorType;
  mood?: string; // Mood ID referansı
  handPose?: string;
  compositions?: Array<{ id: string; description: string }>;
}
```

### 1.3 Sorun

```
MOOD                          SENARYO
├── atmosfer bilgisi    ←──── moodId referansı (yönlendirme)
├── ışık bilgisi              ├── el bilgisi
├── renk paleti               ├── kompozisyon
└── zaman/hava durumu         └── açıklama (devre dışı)
```

**Senaryo'nun tek yaptığı:** Mood'a referans + el bilgisi taşımak.
İki kavram gereksiz yere ayrı.

---

## 2. Hedef Yapı

### 2.1 Yeni Senaryo Interface

```typescript
interface Scenario {
  id: string;
  name: string;
  description: string;  // Scene description (AI generated)

  // === ESKİ MOOD ALANLARI ===
  timeOfDay: "morning" | "afternoon" | "evening" | "night" | "any";
  season: "winter" | "spring" | "summer" | "autumn" | "any";
  weather: "sunny" | "cloudy" | "rainy" | "snowy" | "any";
  lightingPrompt: string;
  colorGradePrompt: string;
  geminiPresetId?: string;  // gemini-presets/mood-definitions ile eşleşme

  // === ESKİ SENARYO ALANLARI ===
  includesHands: boolean;
  handPose?: string;        // Hand pose ID
  compositionEntry?: string; // El giriş noktası

  // === İNTERİOR SENARYO ===
  isInterior?: boolean;
  interiorType?: InteriorType;

  // === META ===
  isActive: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;

  // === DEPRECATED ===
  // compositionId - Kullanılmıyordu, kaldırıldı
  // compositions array - Kullanılmıyordu, kaldırıldı
}
```

### 2.2 Firestore Yapısı

```
ÖNCE:
├── moods (collection)
│   └── {moodId} (document)
└── global/config
    └── scenarios (array)

SONRA:
└── scenarios (collection)
    └── {scenarioId} (document)
```

---

## 3. Migration Stratejisi

### Faz 1: Veri Hazırlığı
- [ ] Mevcut mood'ları export et
- [ ] Mevcut senaryoları export et
- [ ] Yeni senaryo formatına dönüştürme script'i yaz

### Faz 2: Backend Değişiklikleri
- [ ] Yeni Scenario interface oluştur (`types.ts`)
- [ ] ScenarioService oluştur (MoodService'i genişlet)
- [ ] Orchestrator'da scenario kullanımını güncelle
- [ ] rulesService'de config.scenarios yerine scenarios collection kullan

### Faz 3: Frontend Değişiklikleri
- [ ] Scenarios.tsx'i güncelle (Mood alanlarını ekle)
- [ ] Moods.tsx'i kaldır veya redirect ekle
- [ ] Sidebar navigasyonunu güncelle

### Faz 4: Firestore Migration
- [ ] Yeni scenarios collection oluştur
- [ ] Mood + Senaryo verilerini birleştir
- [ ] Eski moods collection'ı devre dışı bırak
- [ ] config.scenarios array'ini devre dışı bırak

### Faz 5: Temizlik
- [ ] Eski MoodService'i kaldır
- [ ] Eski moodController'ı kaldır
- [ ] Moods.tsx'i kaldır
- [ ] Gereksiz type'ları kaldır

---

## 4. Etkilenen Dosyalar

### Backend (functions/)
| Dosya | Değişiklik |
|-------|------------|
| `orchestrator/types.ts` | Scenario interface güncelle, Mood interface'i deprecated yap |
| `services/moodService.ts` | → ScenarioService'e dönüştür |
| `controllers/moodController.ts` | Kaldır veya redirect |
| `orchestrator/orchestrator.ts` | Mood referanslarını Scenario'ya çevir |
| `orchestrator/rulesService.ts` | config.scenarios → scenarios collection |
| `orchestrator/geminiPromptBuilder.ts` | Mood → Scenario terminolojisi |
| `controllers/orchestrator/scenarioController.ts` | Genişlet |

### Frontend (admin/)
| Dosya | Değişiklik |
|-------|------------|
| `pages/Scenarios.tsx` | Mood alanlarını ekle, büyük refactor |
| `pages/Moods.tsx` | Kaldır |
| `services/api.ts` | Mood endpoint'lerini kaldır |
| `types/index.ts` | Type güncellemeleri |
| `App.tsx` veya routing | Moods route'unu kaldır |

### Firestore
| Collection | Değişiklik |
|------------|------------|
| `moods` | Deprecated → Sil |
| `global/config.scenarios` | Deprecated → Sil |
| `scenarios` | YENİ - Birleştirilmiş veri |

---

## 5. Risk Analizi

| Risk | Olasılık | Etki | Azaltma |
|------|----------|------|---------|
| Veri kaybı | Düşük | Yüksek | Migration öncesi backup |
| Orchestrator bozulması | Orta | Yüksek | Adım adım geçiş, test |
| UI regression | Orta | Orta | Manuel test |
| Geriye uyumluluk | Yüksek | Orta | Geçiş süreci boyunca eski yapıyı destekle |

---

## 6. Uygulama Sırası

### Adım 1: Types Güncelleme
```
orchestrator/types.ts
├── Yeni Scenario interface
├── Mood interface'e @deprecated ekle
└── ScenarioSelection güncelle
```

### Adım 2: Service Oluşturma
```
services/scenarioService.ts (YENİ)
├── getAllScenarios()
├── getScenarioById()
├── createScenario()
├── updateScenario()
├── deleteScenario()
└── getMatchingScenarios(timeOfDay, season, weather)
```

### Adım 3: Orchestrator Güncelleme
```
orchestrator/orchestrator.ts
├── Mood referanslarını kaldır
├── Scenario'dan atmosfer bilgisi al
└── staticRules.scenarios → scenarioService.getAll()
```

### Adım 4: Admin Panel
```
admin/src/pages/Scenarios.tsx
├── Mood alanlarını forma ekle
├── Validasyon güncelle
└── API çağrılarını güncelle
```

### Adım 5: Migration Script
```
scripts/migrateMoodScenarioMerge.ts
├── Moods'ları oku
├── Senaryoları oku
├── Birleştir (mood bilgisi + senaryo bilgisi)
└── Yeni collection'a yaz
```

### Adım 6: Temizlik
```
Kaldırılacaklar:
├── services/moodService.ts
├── controllers/moodController.ts
├── admin/src/pages/Moods.tsx
└── Firestore: moods collection
```

---

## 7. Geri Dönüş Planı

Eğer birleştirme başarısız olursa:

1. **Commit:** `82e4fcf` - Son çalışan commit
2. `git revert` ile değişiklikleri geri al
3. Firestore backup'tan restore et
4. Eski yapıyla devam et

---

## 8. Test Planı

### Unit Tests
- [ ] ScenarioService CRUD operasyonları
- [ ] Orchestrator senaryo seçimi
- [ ] Prompt builder atmosfer ekleme

### Integration Tests
- [ ] Görsel üretim akışı (end-to-end)
- [ ] Admin panel senaryo yönetimi

### Manual Tests
- [ ] Yeni senaryo oluştur (mood + el bilgisi)
- [ ] Mevcut senaryo düzenle
- [ ] Görsel üret ve atmosferi kontrol et

---

## 9. Checklist (Uygulama Sırası)

### Hazırlık
- [ ] Bu planı oku ve onayla
- [ ] Firestore backup al
- [ ] Git branch oluştur: `refactor/mood-scenario-merge`

### Uygulama
- [x] **Adım 1:** Types güncelle ✅ (2026-02-04)
- [x] **Adım 2:** ScenarioService oluştur ✅ (2026-02-04)
- [x] **Adım 3:** Orchestrator güncelle ✅ (2026-02-04)
- [x] **Adım 4:** Admin Panel güncelle ✅ (2026-02-04)
- [x] **Adım 5:** Migration script oluşturuldu ✅ (2026-02-04) - `scripts/migrateMoodScenarioMerge.ts`
- [x] **Adım 6:** Temizlik (soft deprecation) ✅ (2026-02-04)
  - Sidebar'dan Moods linki kaldırıldı
  - MoodService ve moodController @deprecated olarak işaretlendi
  - Route ve API endpoint'leri geriye uyumluluk için korunuyor
  - Themes.tsx hala mood kullanıyor (ayrı PR'da güncellenecek)

### Doğrulama
- [x] Build başarılı ✅ (backend + admin panel)
- [ ] Test görsel üretimi çalışıyor
- [ ] Admin panel çalışıyor
- [ ] PR oluştur ve merge et

---

## 10. Notlar

### Neden Bu Değişiklik?
- Mood ve Senaryo ayrı olmasının mantığı yok
- Senaryo zaten Mood'a referans veriyor
- Gereksiz karmaşıklık azaltılacak
- SaaS için daha temiz yapı

### Dikkat Edilecekler
- Migration sırasında veri kaybı olmamalı
- Geriye uyumluluk için geçiş süreci planla
- Mevcut üretimler etkilenmemeli

---

## Değişiklik Geçmişi

| Tarih | Değişiklik |
|-------|------------|
| 2026-02-04 | Plan oluşturuldu |
| 2026-02-04 | Adım 1-6 tamamlandı (Implementation complete) |

## 11. Uygulama Özeti (2026-02-04)

### Yapılan Değişiklikler

**Backend (functions/):**
- `orchestrator/types.ts`: Scenario interface'e atmosfer alanları eklendi
- `services/scenarioService.ts`: Yeni birleşik servis oluşturuldu
- `orchestrator/orchestrator.ts`: Senaryo atmosfer fallback mantığı eklendi
- `controllers/orchestrator/scenarioController.ts`: Atmosfer alanları desteklendi
- `services/moodService.ts`: @deprecated işaretlendi
- `controllers/moodController.ts`: @deprecated işaretlendi
- `scripts/migrateMoodScenarioMerge.ts`: Migration script oluşturuldu

**Frontend (admin/):**
- `pages/Scenarios.tsx`: Atmosfer form alanları eklendi
- `components/Sidebar.tsx`: Moods linki kaldırıldı, numaralama güncellendi

### Geriye Uyumluluk
- Eski senaryolar (atmosfer alanları olmayan) çalışmaya devam eder
- Orchestrator atmosfer bilgisini senaryo'dan alır, yoksa eski Mood sistemine fallback yapar
- API endpoint'leri korunuyor

### Sonraki Adımlar (Opsiyonel)
1. Migration script'i çalıştır: `cd functions && npx ts-node src/scripts/migrateMoodScenarioMerge.ts`
2. Themes.tsx'i güncelleyerek mood dropdown'ı scenario'ya çevir
3. Test et ve doğrula
4. Eski moods collection'ı arşivle/sil

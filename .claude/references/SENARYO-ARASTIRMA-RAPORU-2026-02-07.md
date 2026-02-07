# Araştırma Raporu: Senaryo Sistemi Genel İnceleme
> **Tarih:** 7 Şubat 2026
> **Araştırmacı:** Derin Araştırma Ajanı

## Özet
Senaryo sistemi genel olarak sağlam bir mimari üzerine kurulu: Firestore'da saklanıyor, configService cache'i ile okunuyor, tema filtresi + ürün filtresi + Gemini seçimi ile pipeline'a akıyor ve `description` alanı SCENE DIRECTION olarak prompt'a yazılıyor. Ancak **5 kritik eksiklik/uyumsuzluk** tespit edildi.

## Mevcut Durum

### Veri Akışı
```
Firestore (global/scenarios/items/{id})
  → configService.getScenarios() [5dk cache]
    → Orchestrator Stage 2: Tema filtresi → Ürün filtresi → Blok filtresi → Gemini seçimi
      → Stage 3: description → SCENE DIRECTION prompt'a
        → Stage 4: Gemini görsel üretimi
```

### Senaryo Alanları ve Durumu

| Alan | Prompt'a Aktarılıyor? | UI'da Düzenlenebilir? | Not |
|------|----------------------|----------------------|-----|
| `description` | **Evet** (SCENE DIRECTION) | Evet | En kritik alan |
| `includesHands` | Evet (el stili) | Evet | |
| `handPose` | Evet (el detayları) | Evet | |
| `compositionEntry` | Evet (kamera açısı) | Evet | |
| `isInterior` | Evet (AI atlanır) | Evet | |
| `interiorType` | Evet (asset seçimi) | Evet | |
| `suggestedProducts` | Evet (filtre) | Seed'de var, UI'da **YOK** | |
| `suggestedTimeSlots` | **Hayır** (kullanılmıyor) | **YOK** | Dead field |
| `compositionId` (deprecated) | Fallback | Kaldırılmalı | |

### 17 Varsayılan Senaryo

#### El İçeren (4 adet)
| ID | Ad | Açıklama | Ürün | Zaman |
|----|-----|---------|------|-------|
| `zarif-tutma` | Zarif Tutma | Bakımlı el ürün tutuyor. Premium görünüm. | croissants, chocolates | morning, afternoon |
| `kahve-ani` | Kahve Anı | Eller fincan tutuyor, ürün ön planda. Sosyal, paylaşım odaklı. | croissants, pastas | morning, brunch |
| `hediye-acilisi` | Hediye Açılışı | El kutu açıyor. Sürpriz, heyecan anı. | chocolates, pastas | afternoon, evening |
| `ilk-dilim` | İlk Dilim | El çatalla pasta alıyor. İştah açıcı, davetkar. | pastas | afternoon, evening |

#### El İçermeyen (6 adet)
| ID | Ad | Açıklama | Ürün | Zaman |
|----|-----|---------|------|-------|
| `cam-kenari` | Cam Kenarı | Pencere önü, doğal ışık. Aydınlık, ferah atmosfer. | croissants, pastas, coffees | morning, afternoon, golden-hour |
| `mermer-zarafet` | Mermer Zarafet | Mermer yüzey, premium sunum. Lüks, sofistike. | chocolates, pastas | afternoon, evening |
| `kahve-kosesi` | Kahve Köşesi | Rahat köşe, cozy atmosfer. Samimi, ev sıcaklığı. | croissants, pastas, coffees | afternoon, evening |
| `yarim-kaldi` | Yarım Kaldı | Isırık alınmış, yarı dolu fincan. Wabi-sabi, yaşanmışlık. | croissants, chocolates | afternoon, evening |
| `paylasim` | Paylaşım | İki tabak, sosyal an. Birliktelik, paylaşım. | pastas, croissants | brunch, afternoon |
| `paket-servis` | Paket Servis | Kraft torba, takeaway. Pratik, hareket halinde. | croissants, chocolates | morning, afternoon |

#### Ambalaj (3 adet)
| ID | Ad | El? | Ürün |
|----|-----|-----|------|
| `hediye-hazirligi` | Hediye Hazırlığı | Hayır | chocolates, pastas |
| `yolda-atistirma` | Yolda Atıştırma | Evet | croissants, chocolates |
| `kutu-acilis` | Kutu Açılışı | Evet | chocolates, pastas |

#### İç Mekan / Interior (5 adet)
| ID | Ad | interiorType | Not |
|----|-----|-------------|-----|
| `vitrin-sergisi` | Vitrin Sergisi | vitrin | AI üretimi ATLANIR |
| `kruvasan-tezgahi` | Kruvasan Tezgahı | tezgah | AI üretimi ATLANIR |
| `pastane-ici` | Pastane İçi | genel-mekan | AI üretimi ATLANIR |
| `oturma-kosesi` | Oturma Köşesi | oturma-alani | AI üretimi ATLANIR |
| `cicek-detay` | Çiçek Detay | dekorasyon | AI üretimi ATLANIR |

### 6 Varsayılan Tema
| ID | Ad | Senaryolar | Pet | Aksesuar |
|----|-----|-----------|-----|----------|
| `morning-energy` | Sabah Enerjisi | cam-kenari, zarif-tutma, ilk-dilim | Hayır | Hayır |
| `brunch-social` | Brunch Keyfi | kahve-ani, paylasim | Hayır | Evet |
| `afternoon-chill` | Öğleden Sonra Rahatlığı | kahve-kosesi, yarim-kaldi | Evet | Evet |
| `golden-hour` | Altın Saat | cam-kenari, hediye-acilisi | Hayır | Hayır |
| `cozy-night` | Gece Samimiyeti | kahve-kosesi, yarim-kaldi | Evet | Evet |
| `mekan-tanitimi` | Mekan Tanıtımı | 5 interior senaryo | Hayır | Hayır |

---

## Tespit Edilen Sorunlar

### Sorun 1: Tema'da Çoklu Senaryo Desteği Kapalı
- **Kanıt**: `admin/src/pages/Themes.tsx` - Form'da tekil senaryo seçimi (`scenario: string`)
- **Backend**: `Theme.scenarios: string[]` (array)
- **Durum**: Frontend tekil string gönderip `[form.scenario]` array'e çeviriyor
- **Etki**: Bir tema sadece 1 senaryo içerebiliyor. Varsayılan temaların çoğunda 2+ senaryo var ama admin panelden düzenlenemez
- **Şiddet**: Orta

### Sorun 2: Plate ve Cup Tag Tercihleri UI'da Yok
- **Kanıt**: `ThemeSetting.preferredTags` → `{ table?, plate?, cup? }` destekliyor
- **Frontend**: Sadece `table` tag'leri gösteriliyor
- **Etki**: Kullanıcı tabak ve bardak tercihi belirleyemiyor
- **Şiddet**: Orta

### Sorun 3: suggestedProducts UI'da Düzenlenemiyor
- **Kanıt**: `FirestoreScenario.suggestedProducts` alanı var (`types.ts:1310-1314`)
- **Frontend**: Scenarios.tsx'de bu alan form'da gösterilmiyor
- **Etki**: Hangi senaryonun hangi ürünlerle eşleşeceği sadece seed data ile belirlenebiliyor
- **Şiddet**: Düşük (çoğu durumda seed verisi yeterli)

### Sorun 4: suggestedTimeSlots Tamamen Ölü
- **Kanıt**: `FirestoreScenario.suggestedTimeSlots` tanımlı ama pipeline'da **hiçbir yerde** kullanılmıyor
- **Etki**: Zaman dilimi-senaryo eşleşmesi çalışmıyor, senaryo seçimi sadece tema + ürün filtresine bağlı
- **Şiddet**: Düşük (tema sistemi bu ihtiyacı karşılıyor)

### Sorun 5: Deprecated Alanlar Temizlenmedi
- **Kanıt**: `Scenario.compositionId` (deprecated, `types.ts:588`), `Scenario.compositions` array (deprecated, `types.ts:591`)
- **Etki**: Kod karmaşıklığı, fallback mantığı gereksiz yere korunuyor
- **Şiddet**: Düşük

---

## Güçlü Yanlar

1. **description → SCENE DIRECTION zinciri sağlam**: Firestore'dan okunan açıklama, Gemini seçimi, ScenarioSelection, getScenarioPrompt ve buildGeminiPrompt üzerinden kesintisiz prompt'a ulaşıyor
2. **Interior senaryo mantığı temiz**: `isInterior: true` olduğunda AI üretimi atlanıyor, doğrudan gerçek fotoğraf kullanılıyor
3. **Cascade kontrol var**: Tema silerken senaryo bağımlılığı, senaryo silerken tema bağımlılığı kontrol ediliyor
4. **Cache mekanizması çalışıyor**: 5dk TTL, CRUD sonrası otomatik invalidation
5. **AI description üretimi**: Hem senaryo hem tema için Gemini ile otomatik açıklama üretme endpoint'i var

---

## Çözüm Önerileri

### Öneri 1: Tema'da Çoklu Senaryo Seçimi (Önerilen)
- **Dosya**: `admin/src/pages/Themes.tsx`
- **Değişiklik**: Tekil dropdown yerine multi-select checkbox/tag seçimi
- **Risk**: Düşük
- **Yan etki**: Yok - backend zaten array bekliyor

### Öneri 2: Plate/Cup Tag Tercihleri Eklenmesi
- **Dosya**: `admin/src/pages/Themes.tsx`
- **Değişiklik**: Masa tag'leri gibi plate ve cup tag'leri için de multi-select dropdown ekle
- **Risk**: Düşük
- **Yan etki**: Yok - backend ThemeSetting zaten destekliyor

### Öneri 3: suggestedProducts UI'a Eklenmesi
- **Dosya**: `admin/src/pages/Scenarios.tsx`
- **Değişiklik**: Senaryo formuna ürün tipi multi-select ekle
- **Risk**: Düşük

### Öneri 4: suggestedTimeSlots Kararı
- **Seçenek A**: Tamamen kaldır (dead code)
- **Seçenek B**: Pipeline'a ekle (zaman bazlı filtreleme)
- **Risk**: A=Düşük, B=Orta

### Öneri 5: Deprecated Alanları Temizle
- **Dosyalar**: `types.ts`, `orchestrator.ts` (fallback mantığı)
- **Değişiklik**: `compositionId` ve `compositions` array kaldır
- **Risk**: Düşük (geriye uyumluluk kırılabilir, migration gerekli)

---

## Dosya Referansları

| Dosya | Satırlar | İçerik |
|-------|----------|--------|
| `functions/src/orchestrator/types.ts` | 566-592 | Scenario interface |
| `functions/src/orchestrator/types.ts` | 1310-1314 | FirestoreScenario interface |
| `functions/src/orchestrator/types.ts` | 1134-1200 | DEFAULT_THEMES |
| `functions/src/orchestrator/seed/defaultData.ts` | 111-360 | DEFAULT_SCENARIOS (17 adet) |
| `functions/src/services/configService.ts` | 205-217 | getScenarios() |
| `functions/src/services/configService.ts` | 647-723 | getGlobalConfig() (cache) |
| `functions/src/orchestrator/orchestrator.ts` | 937-1050 | Stage 2: Senaryo seçimi |
| `functions/src/orchestrator/orchestrator.ts` | 1773-1838 | getScenarioPrompt() |
| `functions/src/orchestrator/orchestrator.ts` | 2032-2120 | buildDynamicPromptWithGemini() |
| `functions/src/orchestrator/geminiPromptBuilder.ts` | 1195-1211 | scenarioDescription prompt'a yazılması |
| `functions/src/controllers/orchestrator/scenarioController.ts` | 15-378 | Senaryo CRUD endpoint'leri |
| `functions/src/controllers/orchestrator/themeController.ts` | 13-291 | Tema CRUD endpoint'leri |
| `admin/src/pages/Scenarios.tsx` | - | Senaryo yönetim sayfası |
| `admin/src/pages/Themes.tsx` | - | Tema yönetim sayfası |
| `admin/src/types/index.ts` | 619-643 | ThemeSetting, Theme frontend tipleri |

---

## Kontrol Listesi
- [ ] Tema'da çoklu senaryo seçimi UI'ı
- [ ] Plate/Cup tag tercihleri UI'a eklenmesi
- [ ] suggestedProducts düzenlenebilirliği
- [ ] suggestedTimeSlots kararı (kaldır veya aktifleştir)
- [ ] Deprecated alan temizliği
- [ ] **Mevcut değişikliklerin deploy'u (themeController setting fix + beverageType fix)**

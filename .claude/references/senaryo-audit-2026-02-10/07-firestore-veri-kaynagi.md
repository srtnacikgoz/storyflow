# Senaryo Firestore Veri Kaynağı Araştırması
**Tarih:** 2026-02-10 | **Agent:** Explore (Sonnet)

---

## 1. Firestore Collection Path
`global/scenarios/items/{scenarioId}`

## 2. ConfigService Fonksiyonları

### Okuma
| Fonksiyon | Path | Satır | Cache |
|-----------|------|-------|-------|
| getScenarios() | global/scenarios/items (isActive=true) | 209-221 | Yok |
| getGlobalConfig() | Tüm config'ler paralel | 651-727 | 5dk TTL |

### Yazma
| Fonksiyon | Ne Yapıyor | Satır | Cache Temizle |
|-----------|-----------|-------|---------------|
| addScenario() | Yeni senaryo + timestamps | 836-850 | ✅ |
| updateScenario() | Partial update + updatedAt | 816-831 | ✅ |
| deleteScenario() | Hard delete | 855-864 | ✅ |
| seedFirestoreConfig() | DEFAULT_SCENARIOS toplu yükleme | 752-811 | ✅ |

## 3. Validasyonlar (Controller)

**createScenario** (scenarioController.ts:112-214):
- Zorunlu: id, name, description, compositionId
- ID çakışma kontrolü

**deleteScenario** (scenarioController.ts:274-363):
- hardDelete=true → tema cascade kontrolü
- Kullanılıyorsa → 400 error + affectedThemes
- Soft delete (isActive=false) her zaman çalışır

## 4. Default Seed Verileri

**Kaynak:** `functions/src/orchestrator/seed/defaultData.ts`
**Toplam:** 18 senaryo

- El İçeren (4): zarif-tutma, kahve-ani, hediye-acilisi, ilk-dilim
- El İçermeyen (8): cam-kenari, mermer-zarafet, kahve-kosesi, yarim-kaldi, paylasim, paket-servis, hediye-hazirligi, yolda-atistirma, kutu-acilis
- Interior (6): vitrin-sergisi, kruvasan-tezgahi, pastane-ici, oturma-kosesi, cicek-detay

## 5. Collection İlişkileri

| İlişki | Yön | Alan |
|--------|-----|------|
| Theme → Scenario | 1:N referans | theme.scenarios: string[] |
| CompositionTemplate → Scenario | opsiyonel | template.scenarioId?: string |
| Scenario → Composition | zorunlu | scenario.compositionId?: string |
| TimeSlotRule → Theme → Scenario | dolaylı | timeSlotRule.themeId |

## 6. Cache Mekanizması

- Global Config Cache: 5dk TTL (CACHE_TTL = 300000ms)
- Her write'ta `clearConfigCache()` çağrılır
- `getScenarios()` cache KULLANMAZ (direkt DB)

## 7. HTTP Endpoints

| Endpoint | Method | Fonksiyon |
|----------|--------|-----------|
| /listScenarios | GET | Tüm senaryolar (includeInactive query param) |
| /getScenario | GET | Tek senaryo (id query param) |
| /createScenario | POST | Yeni senaryo |
| /updateScenario | PUT/POST | Güncelle |
| /deleteScenario | DELETE | Sil (hardDelete query param) |
| /listHandStyles | GET | El pozları listesi |
| /generateScenarioDescription | POST | AI açıklama üretimi (60s timeout) |

## 8. Migration
- Migration sistemi YOK
- createdAt/updatedAt timestamp'leri var
- Şema versiyonu için global field yok
- types.ts interface değişirse manuel migration gerekir

# Hardcoded Değerler Backlog

> **Oluşturulma:** 2026-01-24
> **Durum:** Referans dokümanı - gerekirse taşınacak

---

## Neden Bu Dosya Var?

Tüm hardcoded değerleri config'e taşımak her zaman mantıklı değil:
- Over-engineering riski
- Bazı değerler kod yapısına bağlı
- Nadiren değişen değerler için gereksiz complexity
- Config'den yanlış değer girilirse sistem çöker

Bu dosya "belki ileride lazım olur" değerlerini takip eder.

---

## ✅ Zaten Config'e Taşınanlar

### System Settings (`global/config/settings/system-settings`)
| Değer | Config Key | Default |
|-------|------------|---------|
| Claude input cost | `claudeInputCostPer1K` | 0.003 |
| Claude output cost | `claudeOutputCostPer1K` | 0.015 |
| Gemini faithfulness | `geminiDefaultFaithfulness` | 0.7 |
| Max feedback for prompt | `maxFeedbackForPrompt` | 10 |
| Stuck warning minutes | `stuckWarningMinutes` | 15 |
| Max logs per query | `maxLogsPerQuery` | 100 |
| Cache TTL minutes | `cacheTTLMinutes` | 5 |

### Timeouts Config (`global/config/pipeline/timeouts`)
| Değer | Config Key | Default |
|-------|------------|---------|
| Telegram approval | `telegramApprovalMinutes` | 60 |
| Processing timeout | `processingTimeoutMinutes` | 120 |
| Fetch timeout | `fetchTimeoutSeconds` | 30 |
| Retry delay | `retryDelayMs` | 5000 |

---

## ⚠️ Backlog - Gerekirse Taşınabilir

### Öncelik: DÜŞÜK - Nadiren Değişir

#### 1. Claude API max_tokens
| Dosya | Satır | Değer | Kullanım |
|-------|-------|-------|----------|
| claudeService.ts | 308 | `1024` | Asset selection response |
| claudeService.ts | 549 | `1024` | Scenario selection response |
| claudeService.ts | 739 | `1024` | Quality control response |
| claudeService.ts | 942 | `1024` | Caption generation response |
| claudeService.ts | 1130 | `2048` | Prompt optimization response |

**Neden hardcoded kalabilir:**
- Bu değerler API'nin doğru çalışması için optimize edilmiş
- Artırmak = maliyet artışı (genelde gereksiz)
- Azaltmak = response kesilme riski

**Ne zaman taşınmalı:**
- Farklı use case'ler için farklı token limitleri gerekirse
- A/B test yapılacaksa

---

#### 2. Görsel İşleme
| Dosya | Değer | Kullanım |
|-------|-------|----------|
| orchestrator.ts:1173 | `2048` | Sharp max image size (px) |
| orchestrator.ts:1290 | `30000` | Image fetch timeout (ms) |
| gemini.ts:173 | `2048` | Image resize max dimension |
| gemini.ts:177 | `quality: 90` | PNG compression quality |

**Neden hardcoded kalabilir:**
- 2048px Instagram için optimal
- 90 quality = görsel kalite/dosya boyutu dengesi
- Değiştirmek nadiren gerekir

**Ne zaman taşınmalı:**
- Farklı platformlar için farklı boyutlar gerekirse
- Storage maliyeti kritik olursa (quality düşürme)

---

#### 3. Scheduler
| Dosya | Değer | Kullanım |
|-------|-------|----------|
| scheduler.ts:182 | `scheduleBuffer = 30` | Tetikleme buffer (dakika) |
| scheduler.ts:415 | `limit = 15` | Üretim geçmişi kayıt sayısı |
| scheduler.ts:428 | `recentCount = 15` | Köpek istatistiği sorgusu |

**Neden hardcoded kalabilir:**
- 30 dakika buffer = güvenli tetikleme
- 15 kayıt = UI'da gösterim için yeterli

---

### Öncelik: ÇOK DÜŞÜK - Değiştirilmemeli

#### 4. Pipeline Stage Sayısı
```typescript
// orchestrator.ts:99
const TOTAL_STAGES = 6;
```

**HARDCODED KALMALI!**
- Bu değer pipeline'daki gerçek stage sayısına bağlı
- Config'den değiştirirsen progress bar yanlış gösterir
- Stage eklenirse/çıkarılırsa kod da değişmeli

---

#### 5. Zaman Dilimi Tanımları
```typescript
// orchestrator.ts:985-989
6-11: morning
11-14: noon
14-17: afternoon
17-20: evening
20-6: night
```

**HARDCODED KALMALI!**
- Business logic'in parçası
- Scenario'lar bu dilimlere göre tasarlanmış
- Değiştirmek = tüm scenario'ları revize etmek

---

## Karar Matrisi

| Değer Türü | Config'e Taşı? | Neden |
|------------|----------------|-------|
| Maliyet etkileyen | ✅ Evet | Runtime'da optimize edilebilir |
| Sık değişen | ✅ Evet | Deploy gerektirmeden değiştir |
| Deneysel/A-B test | ✅ Evet | Hızlı iterasyon |
| Nadiren değişen | ⚠️ Belki | Complexity vs fayda değerlendir |
| Kod yapısına bağlı | ❌ Hayır | Config'den değiştirmek kod kırar |
| Business logic | ❌ Hayır | Değişiklik = büyük refactor |

---

## Güncelleme Günlüğü

| Tarih | Değişiklik |
|-------|------------|
| 2026-01-24 | Dosya oluşturuldu, mevcut durum belgelendi |

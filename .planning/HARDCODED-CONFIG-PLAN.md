# Hardcoded Değerleri Config'e Taşıma - Uygulama Planı

> **Durum:** Kısmen tamamlandı
> **Son Güncelleme:** 2026-01-26
> **Branch:** main

---

## Mevcut Durum Özeti

| # | Parça | Durum | Not |
|---|-------|-------|-----|
| 1 | Type tanımı (`FirestoreSystemSettingsConfig`) | ✅ TAMAM | `types.ts:1452-1471` |
| 2 | `getSystemSettings()` / `updateSystemSettings()` | ✅ TAMAM | `configService.ts:250-280, 830-858` |
| 3 | Backend endpoint'ler (GET/PUT) | ✅ TAMAM | `configController.ts:426-579` |
| 4 | Claude costs (0.003, 0.015) | ✅ TAMAM | `claudeService.ts:72-77` config'den okuyor |
| 5 | Gemini faithfulness (0.7) | ❌ EKSİK | 6 yerde hala hardcoded `0.7` |
| 6 | Max feedback (10) | ✅ TAMAM | `feedbackService.ts:92-94` config'den okuyor |
| 7 | Stuck warning (15 dk) | ✅ TAMAM | `scheduler.ts:469` config'den okuyor |
| 8 | Max logs (100) | ✅ TAMAM | `aiLogService.ts:176` config'den okuyor |
| 9 | Cache TTL (5 dk) | ❌ EKSİK | `configService.ts:46` hala hardcoded |
| 10 | Admin Panel API | ❌ EKSİK | `api.ts`'de method yok |
| 11 | Admin Panel UI | ❌ EKSİK | System Settings sayfası yok |

**Özet:** Backend %90 hazır. 3 eksik kaldı: Gemini faithfulness, Cache TTL, Admin Panel.

---

## Kalan İşler (3 Görev)

### Görev 1: Gemini Faithfulness'ı Config'den Oku

**Sorun:** `0.7` değeri 6 dosyada hardcoded:

| Dosya | Satır | Mevcut Kod |
|-------|-------|------------|
| `functions/src/services/queue.ts` | 56 | `faithfulness: data.faithfulness ?? 0.7` |
| `functions/src/services/queue.ts` | 99 | `faithfulness: (docData.faithfulness as number) ?? 0.7` |
| `functions/src/services/queue.ts` | 660 | `faithfulness: data.faithfulness ?? 0.7` |
| `functions/src/orchestrator/orchestrator.ts` | 1863 | `faithfulness: result.optimizedPrompt?.faithfulness \|\| 0.7` |
| `functions/src/services/telegram.ts` | 155 | `(item.faithfulness \|\| 0.7)` |

**Dikkat:** `orchestrator.ts:293, 543, 607` satırlarındaki `1.0` ve `0.8` değerleri **kasıtlı override** - bunlara dokunma! Sadece `0.7` olan fallback/default değerler config'den okunmalı.

**Yaklaşım:**
```typescript
// queue.ts'de:
import { getSystemSettings } from "./configService";

// Her fonksiyonun başında bir kez oku:
const settings = await getSystemSettings();
const defaultFaithfulness = settings.geminiDefaultFaithfulness;

// Sonra kullan:
faithfulness: data.faithfulness ?? defaultFaithfulness
```

**Dosyalar:**
1. `functions/src/services/queue.ts` - 3 yerde (satır 56, 99, 660)
2. `functions/src/orchestrator/orchestrator.ts` - 1 yerde (satır 1863)
3. `functions/src/services/telegram.ts` - 1 yerde (satır 155)

**Not:** `telegram.ts`'deki kullanım sadece gösterim amaçlı (yüzde hesaplama). Config okumak yerine doğrudan `item.faithfulness || 0.7` bırakılabilir - zaten item'ın kendi değeri var. Ama tutarlılık için config'den okunması daha iyi.

---

### Görev 2: Cache TTL'i Dinamik Yap

**Sorun:** `configService.ts:46` hala hardcoded:
```typescript
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika
```

**Bootstrap Problemi:** Cache TTL'in kendisi config'de. İlk okumada hardcoded kullanmak zorundayız (config henüz yüklenmedi). Sonraki okumalarda config'den gelen değeri kullan.

**Yaklaşım:**
```typescript
// Başlangıç default'u (bootstrap için)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

// Dinamik TTL hesaplama
function getCacheTTL(): number {
  if (systemSettingsCache?.cacheTTLMinutes) {
    return systemSettingsCache.cacheTTLMinutes * 60 * 1000;
  }
  return DEFAULT_CACHE_TTL;
}

// Kullanım (cache check'lerde):
if (configCache && now - cacheTimestamp < getCacheTTL()) {
  return configCache;
}
```

**Dosya:** `functions/src/services/configService.ts`
- Satır 46: `CACHE_TTL` → `DEFAULT_CACHE_TTL` olarak yeniden adlandır
- Satır 254, 318, 531: `CACHE_TTL` → `getCacheTTL()` ile değiştir
- `getCacheTTL()` helper fonksiyonu ekle

---

### Görev 3: Admin Panel - System Settings Sayfası

**3.1 API Service** (`admin/src/services/api.ts`)

İki method ekle:
```typescript
// System Settings
async getSystemSettings(): Promise<SystemSettingsConfig> {
  const result = await this.fetch<{ success: boolean; data: SystemSettingsConfig }>(
    "getSystemSettingsConfig"
  );
  return result.data;
}

async updateSystemSettings(updates: Partial<SystemSettingsConfig>): Promise<SystemSettingsConfig> {
  const result = await this.fetch<{ success: boolean; data: SystemSettingsConfig }>(
    "updateSystemSettingsConfig",
    {
      method: "PUT",
      body: JSON.stringify(updates),
    }
  );
  return result.data;
}
```

**3.2 Types** (`admin/src/types/index.ts`)

```typescript
export interface SystemSettingsConfig {
  claudeInputCostPer1K: number;
  claudeOutputCostPer1K: number;
  geminiDefaultFaithfulness: number;
  maxFeedbackForPrompt: number;
  stuckWarningMinutes: number;
  maxLogsPerQuery: number;
  cacheTTLMinutes: number;
  updatedAt: number;
  updatedBy?: string;
}
```

**3.3 Sayfa** (`admin/src/pages/SystemSettings.tsx`)

Tasarım:
- Başlık: "Sistem Ayarları"
- 3 grup halinde alanlar:
  1. **AI Maliyetleri** - Claude input/output cost
  2. **AI Ayarları** - Gemini faithfulness
  3. **Sistem** - Max feedback, stuck warning, max logs, cache TTL
- Her alanın yanında min/max ve açıklama
- "Kaydet" ve "Varsayılana Dön" butonları
- Başarı/hata toast mesajı

**Validasyon kuralları (frontend):**
| Alan | Min | Max | Tip |
|------|-----|-----|-----|
| claudeInputCostPer1K | 0.001 | 0.1 | number (step 0.001) |
| claudeOutputCostPer1K | 0.001 | 0.5 | number (step 0.001) |
| geminiDefaultFaithfulness | 0.0 | 1.0 | number (step 0.1) |
| maxFeedbackForPrompt | 1 | 50 | integer |
| stuckWarningMinutes | 5 | 60 | integer |
| maxLogsPerQuery | 10 | 500 | integer |
| cacheTTLMinutes | 1 | 60 | integer |

**3.4 Route ve Sidebar**

- `App.tsx`: `/system-settings` route ekle
- `Sidebar.tsx`: "Sistem Ayarları" linki ekle (⚙️ ikon, orchestrator grubunda)

---

## Uygulama Sırası

```
1. Görev 1: Gemini faithfulness (queue.ts, orchestrator.ts, telegram.ts)
2. Görev 2: Cache TTL dinamik (configService.ts)
3. Build kontrol: npm run build (functions/)
4. Görev 3.1-3.2: Admin API + Types
5. Görev 3.3: SystemSettings.tsx sayfası
6. Görev 3.4: Route + Sidebar
7. Build kontrol: npm run build (admin/)
8. Commit + Push
```

---

## Test Planı

### Backend
- [ ] `npm run build` (functions) hatasız
- [ ] Mevcut üretim pipeline kırılmadı (faithfulness değişikliği)

### Admin
- [ ] `npm run build` (admin) hatasız
- [ ] `/system-settings` sayfası açılıyor
- [ ] Mevcut değerler yükleniyor
- [ ] Güncelleme çalışıyor
- [ ] Validasyon çalışıyor (min/max aşılınca hata)

---

## Referans: Mevcut Backend Endpoint'ler

```
GET  /getSystemSettingsConfig     → Mevcut ayarları döndürür
PUT  /updateSystemSettingsConfig  → Ayarları günceller (validasyonlu)
```

Bu endpoint'ler zaten çalışıyor. Admin panel sadece bunları kullanacak.

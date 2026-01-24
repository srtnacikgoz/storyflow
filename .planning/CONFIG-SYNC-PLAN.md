# Config Sync & Hardcoded Değerler Planı

> **Tarih:** 2026-01-24
> **Öncelik:** Yüksek
> **Tahmini Süre:** 2-3 saat

---

## 🎯 Amaç

1. Admin paneldeki config değişikliklerinin pipeline'a yansımasını sağlamak
2. Yüksek öncelikli hardcoded değerleri Firestore'a taşımak
3. Tek kaynak doğruluğu (Single Source of Truth) oluşturmak

---

## 🐛 Mevcut Sorun

```
Admin Panel → orchestrator-config/variation-rules  ← YANLIŞ COLLECTION
Pipeline    → global/config/settings/diversity-rules ← DOĞRU COLLECTION
```

**Sonuç:** Slider değişiklikleri hiçbir işe yaramıyor!

---

## 📍 Firestore Collection Yapısı (Hedef)

```
global/
├── config/
│   └── settings/
│       ├── diversity-rules      ← Çeşitlilik kuralları (gap'ler, frequency'ler)
│       ├── time-mood           ← Zaman-mood eşleştirmeleri
│       ├── weekly-themes       ← Haftalık temalar
│       ├── absolute-rules      ← Mutlak kurallar
│       ├── orchestrator-instructions ← AI talimatları
│       ├── timeouts            ← [YENİ] Timeout ayarları
│       └── ai-pricing          ← [YENİ] AI model fiyatları
├── scenarios/items/{id}
├── hand-styles/items/{id}
└── asset-personalities/items/{id}
```

---

## 📋 Görev Listesi

### Phase 1: Collection Sync Düzeltmesi (Kritik)

- [ ] **1.1** `configController.ts` düzelt
  - `orchestrator-config` → `global/config/settings` olarak değiştir
  - DEFAULT değerleri kaldır (defaultData.ts'den okunacak)
  - Okuma/yazma path'lerini senkronize et

- [ ] **1.2** Cache invalidation ekle
  - Config güncellenince `clearConfigCache()` çağır
  - Admin değişikliği anında yansısın

- [ ] **1.3** Eski collection'ı temizle
  - `orchestrator-config` collection'ını sil (veya migrate et)

### Phase 2: Timeout Config (Yeni)

- [ ] **2.1** Firestore şeması oluştur
  ```typescript
  // global/config/settings/timeouts
  {
    pipelineTimeout: 7200000,      // 2 saat (ms)
    stuckWarning: 900000,          // 15 dk (ms)
    telegramApproval: 900,         // 15 dk (saniye)
    scheduleBuffer: 30,            // 30 dk
    updatedAt: timestamp
  }
  ```

- [ ] **2.2** `configService.ts`'e getTimeouts() ekle

- [ ] **2.3** Hardcoded timeout'ları değiştir:
  - `scheduler.ts:455-456` → getTimeouts() kullan
  - `orchestratorScheduler.ts:43` → getTimeouts() kullan
  - `environment.ts:48` → getTimeouts() kullan

- [ ] **2.4** Admin panele Timeouts sayfası ekle

### Phase 3: Time-Mood Config UI

- [ ] **3.1** Admin panele Time-Mood sayfası ekle
  - Zaman aralıkları düzenlenebilir
  - Mood seçimi dropdown
  - Görsel saat çizelgesi

- [ ] **3.2** API endpoint'leri ekle:
  - `getTimeMoodConfig` (zaten var ama eksik)
  - `updateTimeMoodConfig` (yeni)

### Phase 4: AI Pricing Config (İsteğe Bağlı)

- [ ] **4.1** Firestore şeması:
  ```typescript
  // global/config/settings/ai-pricing
  {
    models: {
      "gemini-2.5-flash-image": 0.01,
      "gemini-3-pro-image-preview": 0.04,
      "claude-sonnet-4": { input: 0.003, output: 0.015 }
    },
    updatedAt: timestamp
  }
  ```

- [ ] **4.2** Maliyet hesaplamalarını dinamik yap

---

## 🔧 Dosya Değişiklikleri

### Backend (functions/src)

| Dosya | Değişiklik |
|-------|------------|
| `controllers/orchestrator/configController.ts` | Collection path düzeltme, cache invalidation |
| `services/configService.ts` | getTimeouts(), updateDiversityRules() ekleme |
| `orchestrator/scheduler.ts` | Hardcoded timeout → getTimeouts() |
| `schedulers/orchestratorScheduler.ts` | Hardcoded → config okuma |
| `config/environment.ts` | approvalTimeout → config |

### Frontend (admin/src)

| Dosya | Değişiklik |
|-------|------------|
| `pages/Settings.tsx` veya yeni `Timeouts.tsx` | Timeout ayarları UI |
| `pages/TimeMood.tsx` (yeni) | Zaman-mood eşleştirme UI |
| `services/api.ts` | Yeni endpoint'ler |

---

## ⚠️ Dikkat Edilecekler

1. **Geriye uyumluluk:** Mevcut değerleri koruyarak migration yap
2. **Cache:** Config değişince cache temizlenmeli
3. **Fallback:** Firestore erişilemezse default değerler kullanılmalı
4. **Validation:** Admin panelden gelen değerler validate edilmeli

---

## 🧪 Test Senaryoları

1. [ ] Admin panelden slider değiştir → Yeni üretimde yansıdığını kontrol et
2. [ ] Timeout değiştir → Pipeline davranışını kontrol et
3. [ ] Firestore erişimi kes → Fallback çalışıyor mu?
4. [ ] Cache TTL geçtikten sonra yeni değerler yükleniyor mu?

---

## 📊 Öncelik Sırası

| # | Görev | Öncelik | Etki |
|---|-------|---------|------|
| 1 | configController path düzeltme | 🔴 Kritik | Slider'lar çalışır |
| 2 | Cache invalidation | 🔴 Kritik | Anında yansıma |
| 3 | Timeout config | 🟠 Orta | Operasyonel esneklik |
| 4 | Time-Mood UI | 🟡 Düşük | Kullanıcı deneyimi |
| 5 | AI Pricing | 🟢 İsteğe bağlı | Maliyet takibi |

---

## 🚀 Başlangıç

Phase 1'den başla - en kritik sorun bu.

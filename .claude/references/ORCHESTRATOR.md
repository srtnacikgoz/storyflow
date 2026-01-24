# Orchestrator Kuralları (Legacy Reference)

> ⚠️ **ÖNEMLİ**: Bu dosya artık sadece **referans ve dokümantasyon** amaçlıdır.
> Tüm kurallar **Firestore**'da saklanmaktadır.
> Değişiklikler için `ConfigService` veya Admin Panel kullanılmalıdır.

---

## 📦 Firestore Yapısı

Tüm orchestrator konfigürasyonu aşağıdaki Firestore yapısında saklanır:

```
global/
├── scenarios/items/{scenarioId}          # Senaryolar
├── hand-styles/items/{styleId}           # El stilleri
├── asset-personalities/items/{assetId}   # Asset kişilikleri
└── config/settings/
    ├── diversity-rules                    # Çeşitlilik kuralları
    ├── time-mood                          # Zaman-mood eşleştirmesi
    ├── weekly-themes                      # Haftalık temalar
    ├── absolute-rules                     # Mutlak kurallar
    └── orchestrator-instructions          # Claude talimatları
```

---

## 🔧 Konfigürasyon Yönetimi

### Seed Data Yükleme (İlk Kurulum)

```typescript
import { seedFirestoreConfig } from "./services/configService";

// İlk kurulumda veya reset için
await seedFirestoreConfig();
```

### Config Okuma

```typescript
import { getGlobalConfig } from "./services/configService";

const config = await getGlobalConfig();
console.log(config.scenarios);        // Senaryolar
console.log(config.handStyles);       // El stilleri
console.log(config.diversityRules);   // Çeşitlilik kuralları
```

### Senaryo Ekleme

```typescript
import { addScenario } from "./services/configService";

await addScenario({
  id: "yeni-senaryo",
  name: "Yeni Senaryo",
  description: "Açıklama",
  includesHands: true,
  compositions: [{ id: "comp-1", description: "Kompozisyon 1" }],
  isActive: true,
});
```

---

## 📋 Senaryo Kategorileri

### El İçeren Senaryolar
- `zarif-tutma` - Bakımlı el ürün tutuyor
- `kahve-ani` - Eller fincan tutuyor, ürün ön planda
- `hediye-acilisi` - El kutu açıyor
- `ilk-dilim` - El çatalla pasta alıyor
- `yolda-atistirma` - Kraft çanta elde (ambalaj)
- `kutu-acilis` - Çikolata kutusu açılış (ambalaj)

### El İçermeyen Senaryolar
- `cam-kenari` - Pencere önü, doğal ışık
- `mermer-zarafet` - Mermer yüzey, premium sunum
- `kahve-kosesi` - Rahat köşe, cozy atmosfer
- `yarim-kaldi` - Isırık alınmış, wabi-sabi
- `paylasim` - İki tabak, sosyal an
- `paket-servis` - Kraft torba, takeaway
- `hediye-hazirligi` - Şık kutu düzeni (ambalaj)

### Interior Senaryolar (AI Atlanır)
- `vitrin-sergisi` - Vitrin görünümü
- `kruvasan-tezgahi` - Tezgah düzeni
- `pastane-ici` - Genel mekan
- `oturma-kosesi` - Oturma alanı
- `cicek-detay` - Dekorasyon detayları

---

## 🎨 El Stilleri

| ID | Açıklama | Oje | Aksesuar |
|----|----------|-----|----------|
| elegant | Şık, minimal | Nude/soft pink | Silver midi ring |
| bohemian | Bohem, doğal | Earth-tone | Stacked rings |
| minimal | Sade, temiz | Yok/şeffaf | Thin gold ring |
| trendy | Trend, modern | French tip | Chunky ring |
| sporty | Sportif, aktif | Yok | Fitness watch |

---

## ⚙️ Çeşitlilik Kuralları

| Kural | Varsayılan | Açıklama |
|-------|------------|----------|
| scenarioGap | 3 | Aynı senaryo min 3 üretim sonra |
| tableGap | 2 | Aynı masa min 2 üretim sonra |
| handStyleGap | 4 | Aynı el stili min 4 üretim sonra |
| productGap | 3 | Aynı ürün min 3 üretim sonra |
| petFrequency | 15 | Köpek her 15 üretimde bir |
| similarityThreshold | 50 | Max %50 benzerlik skoru |

---

## 🚫 Mutlak Kurallar

### Ürün Kuralları
- TEK ÜRÜN: Görselde yalnızca BİR ana ürün
- TEK FİNCAN: Varsa yalnızca BİR kahve fincanı
- TEK TABAK: Yalnızca BİR tabak (paylaşım hariç)
- REFERANS SADIKLIĞI: Ürün tanınabilir olmalı

### Yasak Elementler
- DUPLİKASYON YOK: Aynı üründen birden fazla asla
- BUHAR/DUMAN YOK: Steam, smoke, mist yasak
- KOYU ARKA PLAN YOK: Siyah, koyu gri yasak
- EKLEME YOK: Prompt'ta olmayan obje ekleme yasak

### Kalite Kuralları
- 8K PHOTOREALISTIC: Yüksek kalite
- DOĞAL IŞIK: Yapay flaş yasak
- SICAK TONLAR: Soğuk mavi tonlar yasak

---

## 📂 İlgili Dosyalar

| Dosya | Amaç |
|-------|------|
| `functions/src/services/configService.ts` | Firestore config okuma/yazma |
| `functions/src/orchestrator/rulesService.ts` | Kuralları birleştirme |
| `functions/src/orchestrator/seed/defaultData.ts` | Varsayılan seed data |
| `functions/src/orchestrator/types.ts` | TypeScript tipleri |

---

## 📝 Versiyon Geçmişi

| Versiyon | Tarih | Değişiklik |
|----------|-------|------------|
| 2.0.0 | 2026-01-24 | Config-First mimarisi, Firestore'a taşındı |
| 1.0.0 | 2026-01-20 | İlk versiyon (hardcoded) |

---

> **Not**: Bu dosya artık sadece referans amaçlıdır. Tüm değişiklikler Firestore'dan yapılmalıdır.

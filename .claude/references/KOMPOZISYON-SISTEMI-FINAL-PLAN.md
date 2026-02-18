# Kompozisyon Sistemi Yeniden Tasarımı — Final Plan

> **Tarih:** 2026-02-09
> **Durum:** ONAYLANDI
> **Versiyon:** 1.0

---

## Ana Hedef

**Kullanıcı seçer, AI üretir.** Seçilmeyen hiçbir şey görsele girmez.

Sistem ürün bağımsız, sektör bağımsız, tenant bağımsız çalışır.
Hardcoded kural yok — her şey dinamik ve konfigüre edilebilir.

---

## Model: Geliştirilmiş C (A + B + C)

```
A — Serbest Seçim:  Her slot'u kullanıcı serbestçe açar/kapar/seçer
B — Template:        Hazır kombinasyonlar (sistem veya kullanıcı tanımlı)
C — Preset:          Kullanıcının kendi kaydettiği kombinasyonlar
```

### UI Yapısı

**Modal 1 — Template/Preset Yönetimi** (ayrı iş, üretim yok)
- Template oluştur / düzenle / sil
- İçerik: Tema (opsiyonel) + Senaryo (opsiyonel) + Slot seçimleri
- Kaydet → Firestore'a yaz

**Modal 2 — Şimdi Üret** (üretim işi)
- Seçenek A: Kayıtlı template/preset yükle → slot'lar otomatik dolsun
- Seçenek B: Sıfırdan her slot'u tek tek seç
- İstediğin slot'u değiştir/kapat/aç (override)
- Beğendiysen "Bu kombinasyonu kaydet" → preset olarak sakla
- Üret → pipeline'a SADECE seçilenler girsin

---

## Dinamik Slot Sistemi

Slot'lar hardcoded DEĞİL. Firestore konfigürasyonundan okunur.

### Başlangıç Seed Slot'ları

| Slot Adı | Anahtar | Açıklama |
|----------|---------|----------|
| Yüzey/Masa | `surface` | Ürünün üzerinde durduğu zemin |
| Tabak/Servis | `dish` | Ürünün sunulduğu kap |
| Bardak/İçecek | `drinkware` | İçecek kabı |
| Peçete/Tekstil | `textile` | Kumaş/kağıt peçete, örtü |
| Aksesuar/Dekor | `decor` | Çatal-bıçak, çiçek, mum vb. |
| El Modeli | `hands` | İnsan eli etkileşimi |

### Slot Yapısı (Firestore)

```typescript
interface SlotDefinition {
  key: string;           // "surface", "dish", "drinkware" vb.
  label: string;         // UI'da gösterilecek ad (Türkçe)
  description?: string;  // Açıklama
  isRequired: boolean;   // Bu slot zorunlu mu? (ör. surface genelde zorunlu)
  assetCategory: string; // Assets koleksiyonunda hangi category/subType'a karşılık gelir
  order: number;         // UI sıralaması
  isActive: boolean;     // Tenant bu slot'u kullanıyor mu
}
```

### Her Slot'un 3 Durumu

| Durum | Açıklama | Pipeline'da |
|-------|----------|-------------|
| **Kullanma** | Bu slot görselde yok | Pipeline'dan tamamen çıkar, prompt'a yazılmaz, referans gönderilmez |
| **Seç** | Kullanıcı belirli bir asset seçer | Seçilen asset doğrudan pipeline'a girer |
| **Rastgele** | Filtrelenmiş havuzdan rastgele seçim | Tag/filtre bazlı random seçim yapılır (AI karar vermez) |

### Tenant Yeni Slot Ekleme

Tenant admin panelinden yeni slot tanımlayabilir:
- Kuyumcu: "Kadife Kutu" slot'u ekler → asset yükler → template'lerine dahil eder
- Restoran: "Menü Kartı" slot'u ekler → aynı akış
- Kod değişikliği gerekmez — UI ve pipeline dinamik olarak slot listesinden çalışır

---

## Template ve Preset Veri Modeli

### İki Sahiplik Seviyesi

| Tip | Kim Tanımlar | Nerede Saklanır | Görünürlük |
|-----|-------------|-----------------|------------|
| **System Template** | Platform admini | `global/compositionTemplates/{id}` | Tüm tenant'lar |
| **Tenant Preset** | Kullanıcı | `tenants/{tenantId}/presets/{id}` | Sadece o tenant |

### Template/Preset Şeması

```typescript
interface CompositionTemplate {
  id: string;
  name: string;                    // "Minimalist Çikolata"
  description?: string;

  // Opsiyonel — tema ve senaryo dahil edilebilir
  themeId?: string;                // Bağlı tema (opsiyonel)
  scenarioId?: string;             // Bağlı senaryo (opsiyonel)

  // Slot konfigürasyonu
  slots: Record<string, SlotConfig>;

  // Meta
  type: "system" | "tenant";
  tenantId?: string;               // Sadece tenant preset'leri için
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface SlotConfig {
  state: "disabled" | "manual" | "random";   // Kullanma / Seç / Rastgele
  assetId?: string;                          // manual ise seçilen asset ID
  filterTags?: string[];                     // random ise filtreleme tag'leri
}
```

### Override Takibi

Template yüklendiğinde kullanıcı slot'ları değiştirebilir.
Her slot'ta kaynak bilgisi tutulur:

```typescript
interface SlotSelection {
  slotKey: string;
  state: "disabled" | "manual" | "random";
  assetId?: string;
  source: "template" | "override" | "manual";  // Nereden geldi
}
```

---

## Pipeline Mimarisi

### Tek Veri Kaynağı: `compositionConfig`

```
[Kullanıcı Seçimleri]
        ↓
  loadTemplate(templateId)    ← Template varsa yükle
        ↓
  applyOverrides(userChanges) ← Kullanıcı değişiklikleri üzerine yaz
        ↓
  compositionConfig           ← Pipeline'ın TEK GİRDİSİ
        ↓
  pipeline.run(config)        ← Sadece seçilenlerle üret
```

### compositionConfig Yapısı

```typescript
interface CompositionConfig {
  // Kullanıcının açık seçimleri
  themeId?: string;
  scenarioId?: string;
  slots: Record<string, SlotSelection>;

  // Pipeline meta
  sourceTemplateId?: string;     // Hangi template'ten yüklendi (audit için)
  sourcePresetId?: string;       // Hangi preset'ten yüklendi (audit için)
}
```

### Pipeline Kuralları

1. `compositionConfig.slots` içinde `state: "disabled"` olan slot → pipeline'a GİRMEZ
2. `state: "manual"` olan slot → `assetId` doğrudan kullanılır
3. `state: "random"` olan slot → `filterTags` ile filtrelenmiş havuzdan rastgele seçilir
4. Tema/Senaryo → sadece prompt'un atmosfer/yönetmenlik kısmını etkiler, asset seçimi YAPMAZ
5. Gemini'ye giden prompt'ta sadece aktif slot'ların referans görselleri gönderilir

---

## Tema ve Senaryo Rolü (Daraltılmış)

### Tema
- Belirler: Işık, atmosfer, renk paleti, hava durumu, sıcaklık
- Belirlemez: Hangi asset'ler kullanılacak
- Önerebilir: UI'da "Bu tema için önerilen slot ayarları" gösterilebilir (hints)
- Template'e dahil edilebilir (opsiyonel)

### Senaryo
- Belirler: Kamera açısı, el pozu, kompozisyon yönü, aksiyon tipi
- Belirlemez: Hangi tabak/bardak/masa kullanılacak
- Önerebilir: UI'da "Bu senaryo için önerilen slot ayarları" gösterilebilir (hints)
- Template'e dahil edilebilir (opsiyonel)

### Zorunlu Bağ YOK

Senaryo veya Tema, template'i dikte etmez.
Kullanıcı istediği tema + istediği senaryo + istediği slot kombinasyonunu özgürce seçebilir.

---

## Kaldırılacaklar

| Mevcut Mekanizma | Neden Kalkıyor |
|-----------------|----------------|
| `plateRequired` (ürün bazında) | Kullanıcı seçecek, ürün bazında kural gereksiz |
| `DEFAULT_BEVERAGE_RULES` (ürün → içecek) | Kullanıcı bardak seçecek ve içeceği belirleyecek |
| `DEFAULT_BEVERAGE_TAG_MAPPINGS` | Beverage pipeline kalkıyor |
| `plate.enabled = true` default | Slot durumu kullanıcının seçimine bağlı |
| `gemini.selectAssets()` büyük kısmı | Gemini asset seçmeyecek, sadece "Rastgele" slot'lar için basit random seçim |
| Ürün tipine göre asset kuralları | SaaS'ta ürün tipi bilinemez, kural yazılamaz |

---

## Kırmızı Çizgiler

1. Ürün tipine göre hardcoded kural YAZILMAYACAK
2. Gemini fiziksel gerçeklik kararı VERMEYECEK (tabak gerekli mi, bardak ne olsun)
3. Tema/Senaryo → Template zorunlu bağ OLMAYACAK
4. Bir tenant başka tenant'ın preset'lerini GÖREMEYECEK
5. Seçilmeyen slot pipeline'a GİRMEYECEK (prompt'a yazılmaz, referans gönderilmez)

---

## Geliştirme Yaklaşımı

- Backend ve frontend PARALEL ilerleyecek
- Dinamik slot altyapısı baştan kurulacak (seed slot'larla başlanır)
- Acele yok, doğru yapılacak
- Her aşamada test edilebilir olacak

---

## Loglama

### İlk Sürümden İtibaren
- `compositionConfig` snapshot'ı: Üretim anındaki tam konfigürasyon — debug için kritik

### Sonraki Aşamada
- `sourceOfChoice` alanı: Her slot'un nereden geldiği (template/override/manual/random)
- Regresyon analizi için kullanılacak

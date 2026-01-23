# Phase 2: Sektör Modülleri

> **Hedef:** Farklı gıda sektörleri için özelleştirilmiş modüller
> **Önkoşul:** Phase 1 tamamlanmış olmalı
> **Öncelik:** 🟡 Orta-Yüksek

---

## 📋 Genel Bakış

Phase 2'de:
1. Pastane modülünü referans olarak belgeler ve standartlaştırıyoruz
2. Kahve dükkanı modülünü oluşturuyoruz (en benzer sektör)
3. Pizzacı modülünü oluşturuyoruz (farklı kompozisyon gereksinimleri)
4. Modül sistemi framework'ünü tamamlıyoruz

---

## 🎯 Atomik Görevler

### 2.1 Modül Framework

#### 2.1.1 IndustryModule Interface Finalize
- [ ] TypeScript interface tanımla
- [ ] Validation schema oluştur
- [ ] Default değerler belirle

```typescript
interface IndustryModule {
  // Temel bilgiler
  id: string;
  name: string;
  description: string;
  icon: string;

  // Senaryolar
  scenarios: Scenario[];
  defaultScenarioWeights: Record<string, number>;

  // Ürün yapısı
  productCategories: ProductCategory[];
  accessoryTypes: AccessoryType[];

  // Görsel stiller
  defaultStyles: StyleConfig;
  colorPalette: ColorPalette;

  // Prompt şablonları
  promptTemplates: PromptTemplate[];
  negativePromptAdditions: string[];

  // Caption şablonları
  captionTemplates: CaptionTemplate[];
  defaultHashtags: string[];

  // Kısıtlamalar
  constraints: ModuleConstraints;
}
```

#### 2.1.2 Modül Yükleyici
- [ ] Firestore'dan modül okuma
- [ ] Runtime validation
- [ ] Caching mekanizması
- [ ] Hot-reload desteği (config değişirse)

```typescript
class IndustryModuleLoader {
  async loadModule(moduleId: string): Promise<IndustryModule>;
  async reloadModule(moduleId: string): Promise<void>;
  getLoadedModules(): Map<string, IndustryModule>;
}
```

#### 2.1.3 Modül Admin UI
- [ ] Modül listesi görüntüleme
- [ ] Modül detay sayfası
- [ ] Senaryo düzenleme (super admin)
- [ ] Prompt template düzenleme

---

### 2.2 Pastane Modülü (Referans)

#### 2.2.1 Mevcut Konfigürasyonu Çıkar
- [ ] ORCHESTRATOR.md'den senaryoları parse et
- [ ] Mevcut prompt'lardan stili çıkar
- [ ] Aksesuar listesini belgele

#### 2.2.2 Firestore'a Kaydet
- [ ] `global/industry-modules/pastane` document
- [ ] Tüm senaryolar
- [ ] Tüm stiller
- [ ] Tüm aksesuar tipleri

```typescript
// global/industry-modules/pastane
{
  id: "pastane",
  name: "Pastane / Fırın / Tatlıcı",
  description: "Pasta, kurabiye, ekmek, börek ve tatlı ürünleri için",

  scenarios: [
    {
      id: "single-hero",
      name: "Tek Ürün Hero Shot",
      description: "Tek bir ürünün etkileyici sunumu",
      weight: 30,
      minProducts: 1,
      maxProducts: 1,
      promptTemplate: "{{product}} in hero shot style..."
    },
    // ... diğer senaryolar
  ],

  productCategories: [
    { id: "cake", name: "Pasta", icon: "🎂" },
    { id: "cookie", name: "Kurabiye", icon: "🍪" },
    { id: "bread", name: "Ekmek", icon: "🍞" },
    { id: "pastry", name: "Börek", icon: "🥐" },
    { id: "dessert", name: "Tatlı", icon: "🍰" }
  ],

  accessoryTypes: [
    { id: "plate", name: "Tabak", variants: ["ceramic", "wooden", "slate"] },
    { id: "cup", name: "Fincan", variants: ["coffee", "tea", "espresso"] },
    { id: "napkin", name: "Peçete", variants: ["cloth", "paper"] },
    { id: "cutlery", name: "Çatal-Bıçak", variants: ["silver", "wooden"] }
  ],

  defaultStyles: {
    backdrop: "off-white marble surface with subtle texture",
    lighting: "soft diffused natural light from upper left",
    mood: "warm, inviting, artisanal, premium",
    colorTone: "warm earth tones, cream, beige"
  },

  constraints: {
    noSteam: true,
    noSmoke: true,
    preserveTypography: true,
    maxProductsPerImage: 5
  }
}
```

#### 2.2.3 Kod Entegrasyonu
- [ ] Orchestrator'ı Firestore'dan okuyacak şekilde güncelle
- [ ] Mevcut hardcoded değerleri kaldır
- [ ] Test et - Sade Pastanesi hala çalışıyor olmalı

---

### 2.3 Kahve Dükkanı Modülü

#### 2.3.1 Sektör Araştırması
- [ ] Kahve dükkanı Instagram hesaplarını analiz et
- [ ] Popüler kompozisyon tiplerini belirle
- [ ] Renk paletini çıkar
- [ ] Aksesuar tiplerini listele

**Kahve Dükkanı Özellikleri:**
- Ürünler: Kahve, espresso, latte art, pastalar, sandviçler
- Aksesuarlar: Fincan, bardak, kahve çekirdeği, çuval, gazeteler
- Stil: Sıcak, rahat, hipster-artisan karışımı
- Renk: Kahverengi tonları, krem, pastel

#### 2.3.2 Senaryo Tasarımı
- [ ] 8-10 temel senaryo belirle
- [ ] Her senaryo için prompt template yaz
- [ ] Ağırlıkları belirle

**Önerilen Senaryolar:**
```typescript
const coffeeScenarios = [
  { id: "latte-art-hero", name: "Latte Art Hero", weight: 25 },
  { id: "beans-story", name: "Çekirdek Hikayesi", weight: 15 },
  { id: "cozy-corner", name: "Rahat Köşe", weight: 20 },
  { id: "grab-and-go", name: "Hızlı Kahve", weight: 15 },
  { id: "pastry-pairing", name: "Pasta Eşleşmesi", weight: 20 },
  { id: "seasonal-special", name: "Sezonsal Özel", weight: 5 }
];
```

#### 2.3.3 Modül Oluşturma
- [ ] Firestore document oluştur
- [ ] Tüm konfigürasyonları ekle
- [ ] Caption template'leri yaz
- [ ] Hashtag listesi hazırla

#### 2.3.4 Test
- [ ] Test tenant oluştur (kahve-test)
- [ ] 5-10 görsel üret
- [ ] Kalite değerlendirmesi
- [ ] İterasyon ve iyileştirme

---

### 2.4 Pizzacı Modülü

#### 2.4.1 Sektör Araştırması
- [ ] Pizzacı Instagram hesaplarını analiz et
- [ ] Kompozisyon farklılıklarını belirle (pizza = circular, slice)
- [ ] Renk ve ışık gereksinimlerini çıkar

**Pizzacı Özellikleri:**
- Ürünler: Bütün pizza, dilim, yan ürünler (içecek, salata)
- Aksesuarlar: Pizza tahtası, kürek, bıçak, peçete, baharat
- Stil: Sıcak, dinamik, "az pişmiş" görüntü istenmiyor
- Renk: Domates kırmızısı, mozzarella beyazı, fesleğen yeşili
- Özel: Peynir çekme efekti, buhar (ölçülü)

#### 2.4.2 Senaryo Tasarımı
- [ ] Pizza'ya özel senaryolar
- [ ] Slice vs Whole pizza kompozisyonları
- [ ] Dinamik action shot'lar (kesme, servis)

**Önerilen Senaryolar:**
```typescript
const pizzaScenarios = [
  { id: "whole-pizza-hero", name: "Bütün Pizza Hero", weight: 25 },
  { id: "slice-pull", name: "Dilim Çekme", weight: 20 },
  { id: "pizza-action", name: "Kesim Anı", weight: 15 },
  { id: "ingredient-story", name: "Malzeme Hikayesi", weight: 10 },
  { id: "combo-meal", name: "Kombo Menü", weight: 20 },
  { id: "wood-fire-scene", name: "Odun Fırını Sahnesi", weight: 10 }
];
```

#### 2.4.3 Özel Kısıtlamalar
- [ ] Steam/smoke SINIRLI izin (pizza için doğal)
- [ ] Cheese pull efekti nasıl yönetilecek?
- [ ] Overhead vs angle shot dengeleri

#### 2.4.4 Modül Oluşturma ve Test
- [ ] Firestore document
- [ ] Test tenant
- [ ] Görsel üretim
- [ ] Kalite kontrolü

---

### 2.5 Modül Marketplace (İleri Seviye)

#### 2.5.1 Modül Paketleme
- [ ] Export/import formatı
- [ ] Versiyon kontrolü
- [ ] Dependency management

#### 2.5.2 Modül Katalog
- [ ] Mevcut modüller listesi
- [ ] Modül önizleme
- [ ] Örnek görseller

#### 2.5.3 Özel Modül Desteği
- [ ] Tenant'ın kendi modülünü oluşturması
- [ ] Base module'den türetme
- [ ] A/B test desteği

---

## ✅ Tamamlanma Kriterleri

Phase 2 tamamlanmış sayılır eğer:

1. **Pastane modülü Firestore'da ve çalışıyor**
   - Tüm senaryolar tanımlı
   - Sade Pastanesi bu modülü kullanıyor

2. **Kahve modülü kullanılabilir**
   - En az 6 senaryo
   - Test tenant'ta başarıyla görsel üretildi

3. **Pizzacı modülü kullanılabilir**
   - En az 6 senaryo
   - Test tenant'ta başarıyla görsel üretildi

4. **Modül değiştirme çalışıyor**
   - Bir tenant'ın modülünü değiştirmek mümkün
   - Yeni modülün senaryoları hemen aktif

---

## 🔄 Modül Geliştirme Döngüsü

Her yeni modül için:
```
1. Sektör Araştırması (2-3 saat)
   └── Instagram analizi, renk/stil çıkarma

2. Senaryo Tasarımı (1-2 saat)
   └── 6-10 senaryo, prompt templates

3. Konfigürasyon Oluşturma (1 saat)
   └── Firestore document, aksesuar tipleri

4. Test ve İterasyon (2-4 saat)
   └── 10-20 görsel üret, kalite kontrol

5. Finalize (30 dk)
   └── Dokümantasyon, örnek görseller
```

---

## ⚠️ Riskler ve Dikkat Edilecekler

| Risk | Etki | Önlem |
|------|------|-------|
| Modül kalitesi düşük | 🟡 Orta | Sektör araştırması, iterasyon |
| Prompt uyumsuzluğu | 🟡 Orta | Base template kullan |
| Çok fazla modül | 🟢 Düşük | Talebe göre geliştir |

---

## 📝 Notlar

- Her modül bağımsız test edilebilir olmalı
- Modüller arası kod paylaşımı base class ile
- Yeni modül eklemek mevcut sistemi bozmamalı
- Modül kalitesi > Modül sayısı

---

> **Son Güncelleme:** 2026-01-23
> **Durum:** Phase 1 bekleniyor

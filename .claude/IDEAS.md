# 💡 Fikir Deposu

Bu dosya, oturumlar sırasında ortaya çıkan ancak henüz uygulanmayan fikirleri saklar. İleride referans olarak kullanılabilir.

> **Son Güncelleme:** 2026-01-25
> **Toplam Fikir:** 5

---

## İçindekiler

- [FİKİR-001](#fikir-001-dinamik-kategori-sistemi) - Dinamik Kategori Sistemi
- [FİKİR-002](#fikir-002-senaryo-masa-eşleştirmesi) - Senaryo-Masa Eşleştirmesi
- [FİKİR-003](#fikir-003-kategori-hiyerarşisi) - Kategori Hiyerarşisi
- [FİKİR-004](#fikir-004-kategori-metadata) - Kategori Metadata
- [FİKİR-005](#fikir-005-cross-category-rules) - Cross-Category Rules

---

## [FİKİR-001] Dinamik Kategori Sistemi

- **Tarih:** 2026-01-25
- **Kaynak:** Asset kategorileri tartışması
- **Kategori:** 📈 SaaS Perspektifi
- **Öncelik:** Yüksek
- **Zorluk:** Orta
- **Durum:** Beklemede

### Açıklama
Mevcut `ProductType` enum'ı ("croissant" | "chocolate" | "cookie" | "cake" | "coffee") hardcoded. SaaS'a geçişte her müşteri kendi kategorilerini oluşturmalı.

**Mevcut:**
```typescript
type ProductType = "croissant" | "chocolate" | "cookie" | "cake" | "coffee";
```

**Olması Gereken:**
```typescript
// Firestore: categories collection
interface Category {
  id: string;
  name: string;          // "Kruvasan"
  slug: string;          // "kruvasan"
  description?: string;
  metadata?: {
    defaultMood?: string;
    suggestedTables?: string[];
    colorPalette?: string[];
  };
  isActive: boolean;
  sortOrder: number;
  createdAt: number;
}
```

### Avantajlar
- Kod değişikliği gerektirmez
- Her SaaS müşterisi özelleştirebilir
- Yeni kategori eklemek anlık
- Ölçeklenebilir

### Dezavantajlar/Riskler
- Migration gerektirir
- Mevcut enum referansları güncellenmeli
- Tip güvenliği azalabilir (enum → string)

### İlişkili
- Assets.tsx (kategori seçimi)
- Scenarios (uygun kategoriler)
- Orchestrator (ürün seçimi)
- TODO-012 (SaaS Presets)

---

## [FİKİR-002] Senaryo-Masa Eşleştirmesi

- **Tarih:** 2026-01-25
- **Kaynak:** Masa seçimi tartışması
- **Kategori:** 🔗 Entegrasyon
- **Öncelik:** Yüksek
- **Zorluk:** Kolay
- **Durum:** Beklemede

### Açıklama
Her senaryo için uygun masa tiplerini tanımla. Dış mekan senaryosunda iç mekan masası çıkmasın.

**Masalar:**
1. Beyaz mermer yuvarlak (iç alan)
2. Gri mermer ince uzun (cam önü)
3. Ahşap masa (iç alan)
4. Siyah metal masa (dış alan)

**Eşleştirme:**
```typescript
interface ScenarioTableMapping {
  scenarioId: string;
  allowedTableTypes: string[];  // ["white-marble", "wood"]
  preferredTable?: string;      // Öncelikli masa
}
```

### Avantajlar
- Görsel tutarlılık
- Mantıksal uyum
- Çeşitlilik korunur

### Dezavantajlar/Riskler
- Senaryo tanımlarına alan eklenmeli
- Mevcut senaryolar güncellenmeli

### İlişkili
- orchestrator.ts (selectAssets)
- Scenarios sayfası
- types.ts (Scenario interface)

---

## [FİKİR-003] Kategori Hiyerarşisi

- **Tarih:** 2026-01-25
- **Kaynak:** Dinamik kategori tartışması
- **Kategori:** 🏗️ Mimari
- **Öncelik:** Düşük
- **Zorluk:** Zor
- **Durum:** Beklemede

### Açıklama
"Tatlı > Pasta > Çikolatalı Pasta" şeklinde alt kategoriler.

```typescript
interface Category {
  id: string;
  name: string;
  parentId?: string;  // Üst kategori
  level: number;      // 0: ana, 1: alt, 2: alt-alt
  path: string[];     // ["tatli", "pasta", "cikolatali"]
}
```

### Avantajlar
- Daha organize yapı
- Detaylı filtreleme
- Raporlama kolaylığı

### Dezavantajlar/Riskler
- Karmaşıklık artışı
- UI zorlaşır
- Gereksiz olabilir (YAGNI)

### İlişkili
- FİKİR-001 (Dinamik Kategori)
- Assets sayfası
- Raporlar

---

## [FİKİR-004] Kategori Metadata

- **Tarih:** 2026-01-25
- **Kaynak:** Dinamik kategori tartışması
- **Kategori:** 🔧 Teknik
- **Öncelik:** Orta
- **Zorluk:** Kolay
- **Durum:** Beklemede

### Açıklama
Her kategoriye mood, renk paleti, uygun masalar gibi metadata atama.

```typescript
interface CategoryMetadata {
  defaultMood: "warm" | "cool" | "neutral";
  colorPalette: string[];           // ["#F5E6D3", "#8B4513"]
  suggestedTables: string[];        // ["white-marble", "wood"]
  suggestedLighting: string;        // "soft-morning"
  defaultAspectRatio: "1:1" | "3:4" | "9:16";
}
```

### Avantajlar
- Tutarlı görsel üretim
- Kategori bazlı özelleştirme
- SaaS'ta kolay preset

### Dezavantajlar/Riskler
- Admin UI karmaşıklaşır
- Çok fazla seçenek

### İlişkili
- FİKİR-001 (Dinamik Kategori)
- FİKİR-002 (Masa Eşleştirme)
- TODO-012 (SaaS Presets)

---

## [FİKİR-005] Cross-Category Rules

- **Tarih:** 2026-01-25
- **Kaynak:** Dinamik kategori tartışması
- **Kategori:** 🔗 Entegrasyon
- **Öncelik:** Düşük
- **Zorluk:** Orta
- **Durum:** Beklemede

### Açıklama
"Kahve + Tatlı her zaman birlikte", "Çikolata asla kahveyle değil" gibi kurallar.

```typescript
interface CrossCategoryRule {
  id: string;
  type: "always-together" | "never-together" | "prefer-together";
  categories: string[];  // ["coffee", "dessert"]
  priority: number;
  isActive: boolean;
}
```

### Avantajlar
- Daha gerçekçi kombinasyonlar
- Marka tutarlılığı
- Özelleştirilebilir

### Dezavantajlar/Riskler
- Karmaşıklık
- Edge case'ler
- Çatışan kurallar

### İlişkili
- FİKİR-001 (Dinamik Kategori)
- Orchestrator (asset seçimi)
- AI Rules

---

## 📊 Özet

| ID | Fikir | Kategori | Öncelik | Zorluk |
|----|-------|----------|---------|--------|
| 001 | Dinamik Kategori Sistemi | 📈 SaaS | Yüksek | Orta |
| 002 | Senaryo-Masa Eşleştirmesi | 🔗 Entegrasyon | Yüksek | Kolay |
| 003 | Kategori Hiyerarşisi | 🏗️ Mimari | Düşük | Zor |
| 004 | Kategori Metadata | 🔧 Teknik | Orta | Kolay |
| 005 | Cross-Category Rules | 🔗 Entegrasyon | Düşük | Orta |

---

## Fikir Ekleme Şablonu

Yeni fikir eklerken bu şablonu kullan:

```markdown
## [FİKİR-XXX] Fikir Başlığı

- **Tarih:** YYYY-MM-DD
- **Kaynak:** Hangi iş sırasında ortaya çıktı
- **Kategori:** 🔧/🎨/🏗️/📈/🔗
- **Öncelik:** Düşük/Orta/Yüksek
- **Zorluk:** Kolay/Orta/Zor
- **Durum:** Beklemede/Değerlendiriliyor/Uygulanacak/Reddedildi

### Açıklama
[Detaylı açıklama]

### Avantajlar
- [Avantaj 1]
- [Avantaj 2]

### Dezavantajlar/Riskler
- [Risk 1]
- [Risk 2]

### İlişkili
- [Dosya/TODO/Diğer fikir]
```

---

## Versiyon Geçmişi

| Tarih | Değişiklik |
|-------|------------|
| 2026-01-25 | İlk 5 fikir eklendi |

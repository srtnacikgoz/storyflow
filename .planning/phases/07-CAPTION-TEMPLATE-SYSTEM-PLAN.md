# Phase 7: Caption Template System

## Amaç
Sürpriz caption'ları önlemek için önceden tanımlı, güncellenebilir şablon sistemi.
Kullanıcı görsel yüklerken uygun şablonu seçer, sistem değişkenleri doldurur.

## Tasarım Prensipleri
1. **Güncellenebilir**: Admin panelden şablon CRUD
2. **Esnek**: Değişken sistemi ile dinamik içerik
3. **Kategorize**: Ürün kategorisine göre filtreleme
4. **Önizleme**: Seçim öncesi nasıl görüneceğini gör

---

## Firestore Şeması

### Collection: `caption-templates`

```typescript
interface CaptionTemplate {
  id: string;                    // Auto-generated

  // Temel Bilgiler
  name: string;                  // "Minimal", "Mevsimsel", "Hikaye"
  description: string;           // Admin için açıklama

  // Kategori & Etiketler
  categories: string[];          // ["chocolate", "viennoiserie", "all"]
  tags: string[];                // ["seasonal", "launch", "classic"]

  // Template İçeriği
  template: string;              // "Sade'den {productName}\n{seasonalNote}"
  variables: TemplateVariable[]; // Kullanılabilir değişkenler

  // Ayarlar
  isActive: boolean;             // Aktif/Pasif
  isDefault: boolean;            // Kategori için varsayılan mı?
  priority: number;              // Sıralama (düşük = önce)

  // Meta
  createdAt: number;
  updatedAt: number;
  usageCount: number;            // Kaç kez kullanıldı
}

interface TemplateVariable {
  key: string;                   // "productName"
  label: string;                 // "Ürün Adı"
  type: "text" | "select" | "auto";
  required: boolean;
  defaultValue?: string;
  options?: string[];            // type: "select" için
  autoSource?: string;           // type: "auto" için kaynak field
}
```

### Variable Types

| Type | Açıklama | Örnek |
|------|----------|-------|
| `auto` | Otomatik doldurulur | `{productName}` → Photo.productName |
| `text` | Kullanıcı girer | `{customNote}` → "Özel sipariş" |
| `select` | Listeden seçer | `{season}` → ["İlkbahar", "Yaz", ...] |

---

## Örnek Şablonlar (Seed Data)

### 1. Minimal
```
name: "Minimal"
categories: ["all"]
template: "{productName}"
variables: [
  { key: "productName", type: "auto", autoSource: "productName" }
]
```

### 2. Sade Klasik
```
name: "Sade Klasik"
categories: ["all"]
template: "Sade'den\n{productName}"
variables: [
  { key: "productName", type: "auto", autoSource: "productName" }
]
```

### 3. Malzeme Vurgusu
```
name: "Malzeme Vurgusu"
categories: ["chocolate", "small-desserts", "big-cakes"]
template: "{productName}\n\n{ingredients}"
variables: [
  { key: "productName", type: "auto", autoSource: "productName" },
  { key: "ingredients", type: "text", label: "Ana Malzemeler", required: false }
]
```

### 4. Mevsimsel
```
name: "Mevsimsel"
categories: ["all"]
tags: ["seasonal"]
template: "{seasonEmoji} {season} lezzetleri\n{productName}"
variables: [
  { key: "productName", type: "auto", autoSource: "productName" },
  { key: "season", type: "select", options: ["İlkbahar", "Yaz", "Sonbahar", "Kış"] },
  { key: "seasonEmoji", type: "select", options: ["🌸", "☀️", "🍂", "❄️"] }
]
```

### 5. Yeni Ürün
```
name: "Yeni Ürün Lansmanı"
categories: ["all"]
tags: ["launch"]
template: "Yeni!\n{productName}\n\nSade'de"
variables: [
  { key: "productName", type: "auto", autoSource: "productName" }
]
```

### 6. Hikaye
```
name: "Kısa Hikaye"
categories: ["special-orders", "big-cakes"]
template: "{productName}\n\n{story}"
variables: [
  { key: "productName", type: "auto", autoSource: "productName" },
  { key: "story", type: "text", label: "Hikaye (1-2 cümle)", required: true }
]
```

### 7. Sadece Emoji
```
name: "Emoji Only"
categories: ["all"]
template: "{emoji}"
variables: [
  { key: "emoji", type: "select", options: ["🍫", "🥐", "☕", "🍰", "🎂", "✨"] }
]
```

---

## Akış

### Görsel Yükleme (Admin Panel)
```
1. Görsel seç
2. Kategori seç (chocolate, viennoiserie, ...)
3. Ürün adı gir
4. → Sistem uygun şablonları filtreler
5. Şablon seç (varsayılan önceden seçili)
6. Değişkenleri doldur (varsa)
7. → Önizleme göster
8. Kuyruğa ekle
```

### Telegram Onay
```
📸 Yeni Story Hazır!

🏷️ Ürün: Kestaneli Tart
📁 Kategori: 🍰 Dilim Pasta
📝 Caption: "Sade'den
             Kestaneli Tart"
🎨 Şablon: Sade Klasik

[✅ Onayla] [❌ Reddet] [🔄 Yeniden]
```

---

## API Endpoints

### HTTP Functions
```
GET  /getTemplates?category=chocolate     → Şablonları listele
POST /createTemplate                       → Yeni şablon
PUT  /updateTemplate?id=xxx               → Şablon güncelle
DELETE /deleteTemplate?id=xxx             → Şablon sil
POST /previewCaption                      → Caption önizleme
```

---

## Dosya Yapısı

```
functions/src/
├── types/
│   └── index.ts                 → CaptionTemplate, TemplateVariable
├── services/
│   └── captionTemplate.ts       → CaptionTemplateService
├── index.ts                     → API endpoints
└── seed/
    └── captionTemplates.ts      → Örnek şablonlar

admin/src/
├── pages/
│   └── Templates.tsx            → Şablon yönetim sayfası
├── components/
│   ├── TemplateSelector.tsx     → Şablon seçici
│   ├── TemplateEditor.tsx       → Şablon düzenleyici
│   ├── VariableInput.tsx        → Değişken girişi
│   └── CaptionPreview.tsx       → Önizleme
└── services/
    └── templateApi.ts           → API çağrıları
```

---

## Implementasyon Sırası

1. ✅ Plan oluştur (bu dosya)
2. [ ] Types güncelle (CaptionTemplate, TemplateVariable)
3. [ ] CaptionTemplateService yaz
4. [ ] API endpoints ekle
5. [ ] Seed data fonksiyonu
6. [ ] Admin: Templates.tsx sayfası
7. [ ] Admin: TemplateSelector bileşeni
8. [ ] Upload flow'a entegre et
9. [ ] Telegram preview güncelle
10. [ ] Test & Deploy

---

## Notlar

- Şablonlar Firestore'da saklanır → Admin panelden CRUD
- `usageCount` ile popüler şablonlar takip edilir
- `isDefault` ile kategori bazlı varsayılan belirlenir
- Gelecekte: A/B test için multiple default desteği

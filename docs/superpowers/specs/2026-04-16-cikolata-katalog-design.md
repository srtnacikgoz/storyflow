# Çikolata Katalog Oluşturucu — Tasarım Dokümanı

> **Tarih:** 2026-04-16
> **Amaç:** Çikolata ürünleri için tek ürün kartı ve çoklu grid katalog sayfaları oluşturmak
> **Sayfa:** Mevcut CikolataPoster.tsx (şu an boş placeholder)

---

## Problem

Sade Patisserie'nin çikolata/pralin ürünlerini tanıtan katalog sayfalarına ihtiyaç var. Hem tek ürün hero görseli hem de çoklu ürün grid sayfası üretilecek. Görseller gerçek fotoğraf — AI görsel üretimi yok. Çıktılar hem dijital (Instagram) hem baskı (A4/A5) için kullanılacak.

## Çözüm

Tamamen frontend tabanlı katalog oluşturucu. Backend/AI yok. HTML render + `html-to-image` export. Amerikan Servis ve Kahve Poster ile aynı mimari pattern.

## İki Mod

### Mod 1: Tek Ürün Kartı

Atmosferli bir çikolata tanıtım kartı. Referanstaki gibi — ürün fotoğrafı, isim, açıklama, şık bir çerçevede.

**Kullanıcı girdileri:**
- Fotoğraf yükle (drag-drop veya dosya seç)
- Ürün adı (ör. "Palet Or")
- Açıklama Türkçe (ör. "Kahve infüzyonlu ganaj, bitter çikolata kaplama")
- Açıklama İngilizce (opsiyonel — katalogda iki dil olabilir)
- Stil şablonu seç

**Stil şablonları (3 hazır):**

| Şablon | Arka Plan | Metin Rengi | Font | Karakter |
|--------|-----------|-------------|------|----------|
| **Klasik Koyu** | Koyu kahverengi `#2C1810` | Krem `#F5E6D0` | Serif (Georgia) | Lüks, geleneksel |
| **Minimal Beyaz** | Off-white `#FAFAF8` | Koyu kahve `#3D2B1F` | Sans-serif (Inter) | Modern, temiz |
| **Altın Zarif** | Derin bordo `#4A0E0E` | Altın `#D4AF37` | Serif (Playfair Display) | Premium, hediye kutusu hissi |

**Çıktı formatları:**
- Instagram Post (1080×1080)
- Instagram Story (1080×1920)
- A5 Baskı (1748×2480px, 148×210mm @300dpi)

**Kart layout'u:**
```
┌─────────────────────┐
│                     │
│   [Ürün Fotoğrafı]  │
│   (merkez, %60)     │
│                     │
│   ─── ÜRÜN ADI ───  │
│                     │
│   Açıklama (TR)     │
│   Description (EN)  │
│                     │
│   SADE PATISSERIE   │
└─────────────────────┘
```

### Mod 2: Katalog Grid

Referanstaki "Individual Chocolates" sayfası gibi — birden fazla ürün grid düzeninde.

**Kullanıcı girdileri:**
- Grid şablonu seç
- Her hücre için: fotoğraf yükle + ad + açıklama
- Sayfa başlığı (ör. "Individual Chocolates" / "Bireysel Çikolatalar")
- Alt başlık (opsiyonel, ör. "Chocolats Individuelle")
- Stil şablonu seç (Mod 1 ile aynı 3 şablon)

**Grid şablonları:**

| Şablon | Düzen | Ürün Sayısı | Kullanım |
|--------|-------|-------------|----------|
| **2×1** | 2 sütun, 1 satır | 2 | Karşılaştırma, öne çıkan ikili |
| **2×2** | 2 sütun, 2 satır | 4 | Küçük koleksiyon |
| **3×2** | 3 sütun, 2 satır | 6 | Orta koleksiyon |
| **4×2** | 4 sütun, 2 satır | 8 | Tam katalog sayfası (referans gibi) |

**Çıktı formatları:**
- A4 Yatay (4961×3508px, baskı)
- A4 Dikey (3508×4961px, baskı)
- Instagram Post (1080×1080)
- Instagram Carousel (1080×1350)

**Grid hücre layout'u:**
```
┌───────────┐
│  [Fotoğ]  │
│           │
│  ÜRÜN ADI │
│  açıklama │
│  (TR)     │
│  desc(EN) │
└───────────┘
```

**Sayfa layout'u (4×2 örneği):**
```
┌─────────────────────────────────────┐
│      INDIVIDUAL CHOCOLATES          │
│      Chocolats Individuelle         │
│  ───────────────────────────────    │
│                                     │
│  [Ü1]  [Ü2]  [Ü3]  [Ü4]          │
│  ad     ad    ad     ad             │
│  açık   açık  açık   açık           │
│                                     │
│  [Ü5]  [Ü6]  [Ü7]  [Ü8]          │
│  ad     ad    ad     ad             │
│  açık   açık  açık   açık           │
│                                     │
│         SADE PATISSERIE             │
│              12                     │
└─────────────────────────────────────┘
```

## UI Yapısı

Sayfanın üstünde mod seçimi (tab): **Tek Ürün** | **Katalog Grid**

Her iki modda da:
1. Sol panel — girdi alanları (fotoğraf, metin, stil/grid seçimi)
2. Sağ panel — canlı önizleme
3. Alt — format seç + "PNG İndir" butonu

## Firestore

Oluşturulan katalog config'leri kaydedilecek (tekrar düzenlemek için):

```
cikolataKatalogConfigs/{configId}
├── name: string           // "Pralin Koleksiyonu v1"
├── mode: "single" | "grid"
├── gridTemplate?: string  // "2x2", "4x2" vb.
├── styleTemplate: string  // "klasik-koyu", "minimal-beyaz", "altin-zarif"
├── title?: string         // Sayfa başlığı
├── subtitle?: string
├── items: [
│   {
│     id: string,
│     name: string,
│     descriptionTr: string,
│     descriptionEn?: string,
│     imageUrl?: string     // Eğer Cloud Storage'a yüklendiyse
│   }
│ ]
├── createdAt: timestamp
└── updatedAt: timestamp
```

**Not:** Fotoğraflar büyük dosyalar. İki seçenek:
- Basit: Fotoğraflar sadece localStorage/session'da tutulur, export'a gömülür, Firestore'a yüklenmez
- Gelişmiş: Cloud Storage'a yüklenir, URL kaydedilir

İlk versiyon için **basit yaklaşım** — fotoğraflar session'da, sadece config kaydedilir. Cloud Storage entegrasyonu ileride eklenebilir.

## Teknik Detaylar

**Bağımlılıklar (mevcut):**
- `html-to-image` — PNG export (Amerikan Servis'te zaten kullanılıyor)
- React state — fotoğraflar base64 olarak state'te tutulur

**Yeni bağımlılık:** Yok.

**Dosya yapısı:**
- `admin/src/pages/CikolataPoster.tsx` — mevcut dosya (22 satır placeholder, üzerine yazılacak)
- Sayfa 400 satırı geçerse bileşenlere bölünecek:
  - `admin/src/components/cikolata/SingleCard.tsx`
  - `admin/src/components/cikolata/CatalogGrid.tsx`

**Backend:** Yok. Tamamen frontend.

**Route:** Zaten var — `/admin/poster/cikolata`

**Sidebar:** Zaten var — "Çikolata Poster"

## Kapsam Dışı

- AI görsel üretimi (görseller gerçek fotoğraf)
- Prompt üretimi
- Cloud Storage entegrasyonu (ilk versiyon)
- PDF export (PNG yeterli, ileride eklenebilir)
- Sürükle-bırak ürün sıralama (ilk versiyon basit sıralı liste)

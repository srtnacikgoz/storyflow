# Uygulama Planı: Maestro AI Görsel Felsefesi + Rakip İlhamları
> **Tarih:** 2026-02-08 18:55 (güncelleme: 19:10)
> **Durum:** Uygulanacak

---

## Ana Felsefe: Matthew Vaughn Görsel Dili

Vaughn tarzı opsiyonel bir ayar değil — uygulamanın **görsel DNA'sı**. Her üretimde varsayılan olarak uygulanır. Temalar ve senaryolar bu temel üzerine inşa edilir.

### Vaughn İmza Kuralları (Sabit — Her Prompt'ta)

| Kural | Açıklama | Prompt Talimatı |
|-------|----------|-----------------|
| **Merkez Kompozisyon** | Kaçış çizgileri kadrajın merkezinde birleşir | "Center-converging composition: perspective lines lead toward the main product" |
| **Yüksek Kontrast + Doygun** | Zengin, derin renkler — flat/pastel DEĞİL | "High contrast, saturated colors — golden crust GLOWS, coffee is deep and rich" |
| **Anamorfik His** | Sığ alan derinliği, yumuşak bokeh, hafif flare | "Shallow depth of field, soft bokeh background, gentle highlight bloom from light source" |
| **Kasıtlı Objeler** | Her obje sahnede bir nedenle var | "Every object in frame serves the composition — nothing random or decorative" |
| **Filmsel Kalite** | Stok fotoğraf DEĞİL, film karesi | "Filmic quality: slight warm tone, organic texture, NOT clinical stock photo" |
| **Odaklı Aydınlatma** | Ürün aydınlık, kenarlar loş | "Main light on product, edges slightly darker — subtle natural vignette" |

**Dosya:** `functions/src/orchestrator/geminiPromptBuilder.ts` — sabit blok olarak her prompt'un başına eklenir.

---

## Ek İyileştirmeler (Rakip İlhamları)

### 1. Semantic Anchoring — Ürün Fiziksel Kimlik
**Kaynak:** Pro Photo Playground

Ürünün fiziksel tanımını prompt'a metin olarak ekle. Vaughn'un "kasıtlı obje" felsefesiyle uyumlu — ürün sadece görsel değil, fiziksel özellikleriyle tanınır.

**Yapılacaklar:**
- [ ] `types.ts` → Asset tipine `physicalDescription?: string` ekle
- [ ] `geminiPromptBuilder.ts` → "ÜRÜN KİMLİĞİ" bloğu (doku, parlaklık, renk, şekil)
- [ ] İlk aşamada ürün tipine göre otomatik oluştur

### 2. Atmospheric DNA — Renk Sıcaklığı
**Kaynak:** Pro Photo Playground

Vaughn'un sıcak ton dominantlığı + PPP'nin milimetrik renk sıcaklığı kontrolü.

**Yapılacaklar:**
- [ ] `types.ts` → `ThemeSetting`'e `colorTemperature?: string` ekle
- [ ] Değerler: `"warm-3500K"`, `"warm-5000K"`, `"neutral-5500K"`, `"cool-6500K"`, `"golden-4500K"`
- [ ] `geminiPromptBuilder.ts` → Renk sıcaklığı talimatı

### 3. Baskın Renk (dominantColor)
**Kaynak:** Claid

**Yapılacaklar:**
- [ ] `types.ts` → `ThemeSetting`'e `dominantColor?: string` ekle
- [ ] Değerler: `"warm-brown"`, `"cool-white"`, `"earth-green"`, `"soft-pink"`, `"neutral-gray"`, `"golden"`
- [ ] `gemini.ts` → selectAssets prompt'unda renk uyumu talimatı
- [ ] `geminiPromptBuilder.ts` → Sahne renk tonu talimatı

### 4. Atmosfer → selectAssets Bağlantısı
**Kaynak:** Claid

Şu an atmosfer preset'leri sadece prompt builder'a gidiyor, selectAssets'e gitmiyor.

**Yapılacaklar:**
- [ ] `orchestrator.ts` → selectAssets çağrısına atmosfer preset bilgisini ekle
- [ ] `gemini.ts` → selectAssets system prompt'una atmosfer bağlamı ekle

### 5. Kamera Stili (cameraStyle)
**Kaynak:** Nightjar

Vaughn'un varsayılan açısı 45 derece (klasik sinematik). Tema bazında override edilebilir.

**Yapılacaklar:**
- [ ] `types.ts` → `ThemeSetting`'e `cameraStyle?: string` ekle
- [ ] Değerler: `"overhead-flat"`, `"45-degree"` (varsayılan), `"eye-level"`, `"close-up-macro"`
- [ ] `geminiPromptBuilder.ts` → Kamera açısı talimatı

### 6. Ürün Bütünlüğü Negatif Kuralları
**Kaynak:** Claid + Nightjar + PPP

**Yapılacaklar:**
- [ ] `geminiPromptBuilder.ts` → Negatif kurallar:
  - Ürünü kesme/bölme/parçalama YASAK
  - Ürün rengi/şekli/dokusu referansla aynı kalmalı
  - Ürünü kadraj dışına taşırma

---

## Dosya Haritası

| Dosya | Değişiklik |
|-------|-----------|
| `functions/src/orchestrator/types.ts` | `physicalDescription`, `colorTemperature`, `dominantColor`, `cameraStyle` |
| `functions/src/orchestrator/orchestrator.ts` | atmosfer + dominantColor → selectAssets'e aktar |
| `functions/src/services/gemini.ts` | selectAssets prompt'unda renk + atmosfer + Vaughn bağlamı |
| `functions/src/orchestrator/geminiPromptBuilder.ts` | **Vaughn sabit bloğu** + semantic anchor + renk sıcaklığı + kamera + negatif kurallar |

---

## Sonraki Aşama (Şimdi Değil)
- **Cinematic Transition Synthesis** → Story seti pipeline'ı (çoklu görsel arası semantik köprü)
- **Otomatik stil öğrenme** → Başarılı görselleri analiz edip kural çıkarma
- **Admin UI** → Yeni ThemeSetting alanları için tema formu

---

## Doğrulama
- [ ] `cd functions && npm run build`
- [ ] Deploy → test üretimi
- [ ] Prompt çıktısında Vaughn bloğu + yeni blokları kontrol et
- [ ] Üretilen görselde: merkez kompozisyon, doygun renk, sığ DOF, filmsel his doğrulaması

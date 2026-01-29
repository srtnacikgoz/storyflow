---
name: set-designer
description: Expert logic for scene composition and asset selection. Enforces "Zero Hallucination" policy.
---

# Set Designer Skill (Sahne Tasarımcısı)

> **CORE PHILOSOPHY (ANAYASA): "ZERO HALLUCINATION"**
> 1.  Sistemin elinde görseli (Asset) olmayan hiçbir fiziksel nesne sahneye eklenemez.
> 2.  AI "uydurma" (hallucination) yapamaz. "Altın kaşık çiz" denemez, eğer altın kaşık görseli yoksa.
> 3.  Eksik parça, yanlış parçadan iyidir. Hiç peçete olmaması, yanlış peçete olmasından iyidir.

---

## 1. Asset Taksonomisi (Sınıflandırma)

Varlıklar üç ana gruba ayrılır. Her grubun seçim mantığı farklıdır.

### A. HERO ASSETS (Ana Kahramanlar)
*Sahnenin var olma sebebidir. Zorunludur.*
- **Product:** (Kruvasan, Pasta vb.)
- **Surface:** (Masa, Mermer, Ahşap zemin)

### B. SUPPORT ASSETS (Destekleyiciler)
*Ürünün mantıksal tamamlayıcılarıdır. Akıllı kurallara göre eklenir.*
- **Plate:** Ürün tabak gerektiriyorsa (örn: pasta) zorunlu, gerektirmiyorsa (örn: paketli ürün) yasaktır.
- **Cup/Glass:** Sahneye bir içecek eşlikçisi eklenmişse zorunludur.
- **Saucer (Fincan Tabağı):** Fincan varsa ve fincan türü gerektiriyorsa zorunludur.

### C. PROPS (Dekorlar) - *New & Critical*
*Sahnenin atmosferini belirler. Tamamen opsiyoneldir. Sadece **STOKTA VARSA** kullanılabilir.*
- **Textile:** Peçete (Napkin), Örtü, Runner.
- **Cutlery:** Çatal, Kaşık, Bıçak, Maşa.
- **Decoration:** Vazo, Çiçek, Dergi, Gözlük, Laptop.
- **Ingredients:** Un, Pudra Şekeri, Çikolata Parçaları, Kahve Çekirdeği.

---

## 2. Spatial Logic (Mekansal Mantık & Fizik Kuralları)

AI prompt oluştururken bu fiziksel ilişkileri açıkça belirtmek zorundadır.

### Kural 1: The Host Rule (Tabak-Ürün İlişkisi)
Eğer bir `Plate` ve bir `Product` seçildiyse:
> "The [Product] is placed centered ON TOP OF the [Plate]."

### Kural 2: The Set Rule (Fincan-Altlık İlişkisi)
Eğer bir `Cup` ve bir `Saucer` seçildiyse:
> "The [Cup] sits ON the [Saucer]."

### Kural 3: Layering (Katmanlama)
Eğer bir `Napkin` seçildiyse, senaryo aksini belirtmedikçe:
> "The [Napkin] is placed beside the plate/product naturaly." (Varsayılan: Yanında).
*Özel Durum:* Senaryo "under the plate" diyorsa:
> "The [Napkin] is laid flat UNDER the [Plate]."

---

## 3. Otomasyon & Seçim Mantığı

Orchestrator Scheduler çalışırken şu mantığı izler:

1.  **Önce Envanter Kontrolü:** "Peçete kategorisinde görsel var mı?" -> *Hayır* -> O zaman peçete adımını komple atla.
2.  **Sahne Yoğunluğu (Scene Density):**
    - **Minimal:** Sadece Hero + Support. (0 Prop)
    - **Standard:** +1 Prop (Örn: Sadece Peçete).
    - **Rich:** +2 Prop (Örn: Peçete + Çatal).
3.  **Çakışma Kontrolü:** "Çiçek" seçildiyse "Vazo" da seçilmeli mi? (Bu detaylar ileride eklenebilir).

---

## 4. Prompt Engineering Standartları

Gemini'ye gönderilen prompt şu formatta OLMALIDIR:

❌ **YANLIŞ (Eski):**
"Add a napkin with the exact pattern and colors from the reference assets."
*(Bu cümle yasaklandı çünkü referans yoksa halüsinasyona yol açıyor.)*

✅ **DOĞRU (Yeni):**
"Using the reference image [napkin_01.jpg], place that specific napkin in the scene. Maintain 100% fidelity to the reference pattern. DO NOT generate any other napkin."

---

## 5. Implementasyon Notları (Developer İçin)

1.  **Data Migration:** Mevcut `accessory` kategorisi; `textile`, `cutlery`, `decoration` olarak alt tiplere ayrılmalı.
2.  **UI Update:** Admin panelde toplu asset yükleme yerine, kategori bazlı "Raf" sistemi yapılmalı.
3.  **Gemini Service:** `buildGeminiPrompt` fonksiyonu, `props` dizisini kontrol etmeli. Dizi boşsa, prompt'a "No props, minimalist scene" ibaresi eklenmeli.

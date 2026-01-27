# Görsel Oluşturma Süreci (Pipeline Architecture)

Bu doküman, sistemdeki "Şimdi Üret" (veya planlanmış zaman) butonuna basıldığında tetiklenen uçtan uca üretim sürecini en ince detayına kadar açıklar.

## 0. Başlangıç (Trigger & Pre-Flight Checks)
Süreç `Orchestrator.runPipeline` fonksiyonu ile başlar.
*   **Girdiler:** `activeProductType` (örn: kruvasan), `overrideThemeId` (varsa), `overrideAspectRatio` (örn: 1:1).
*   **Pipeline ID:** Her üretim için benzersiz bir ID oluşturulur (örn: `manual-171543...`).
*   **Maliyet Sayacı:** $0.0000 olarak başlar.

### 0.1. Kural & Konfigürasyon Yükleme
*   `RulesService` üzerinden geçmiş üretimler ve çeşitlilik kuralları (bloklu senaryolar, son kullanılan tabaklar) yüklenir.
*   `configService` üzerinden "Sabit Asset" ayarları (zorunlu mermer masa vb.) kontrol edilir.
*   **Tema Kontrolü:** Eğer seçili tema "Interior Only" ise (sadece mekan fotoğrafı), sonraki AI aşamalarının çoğu atlanır ve doğrudan stok görsel seçilir.

---

## 1. Aşama: Asset Seçimi (`asset_selection`)
AI, veritabanındaki yüzlerce görsel arasından o anki duruma en uygun kombinasyonu seçer.

*   **Sorumlu Fonksiyon:** `gemini.selectAssets`
*   **Kullanılan Model:** `gemini-3-pro-preview` (Text Mode)
*   **Girdiler:**
    *   Ürün Listesi (Aktif olanlar)
    *   Tabak / Fincan / Masa / Aksesuar Listeleri
    *   Zaman Dilimi (Sabah/Öğle/Akşam)
    *   Mood (Tema'dan gelen, örn: "Minimalist Dark")
    *   Yasaklı Listesi (Son 3 günde kullanılanlar)
*   **Karar Mekanizması:**
    *   AI, JSON formatında bir yanıt döndürür.
    *   *"Bu sabah saati için açık renkli mermer masa ve beyaz porselen tabak seçiyorum, çünkü ferah bir algı yaratmak istiyorum."* gibi bir mantık (reasoning) kurar.
    *   **Çıktı:** Seçilen `Product`, `Plate`, `Cup`, `Accessory`, `Table` objeleri.

---

## 2. Aşama: Senaryo Seçimi (`scenario_selection`)
Seçilen objelerin nasıl bir kompozisyonda duracağına karar verilir.

*   **Sorumlu Fonksiyon:** `gemini.selectScenario`
*   **Kullanılan Model:** `gemini-3-pro-preview` (Text Mode)
*   **Girdiler:**
    *   Seçilen Assetler (Stage 1'den gelen)
    *   Senaryo Kütüphanesi (Filtrelenmiş)
    *   Kullanıcı Geri Bildirimleri (Örn: "Daha önce kahveyi çok büyük koydun, yapma")
    *   AI Kuralları (Auto-learning sistemi)
*   **Karar Mekanizması:**
    *   Ürünün boyutuna ve türüne göre en iyi açıyı seçer (örn: Kruvasan için `top-down` veya `45-degree`).
    *   Senaryonun "El içerip içermediğine" (`includesHands`) dikkat eder.
    *   **Çıktı:** `ScenarioID`, `CompositionID`, `LightingPreset` (Işık ayarı).

> **🚦 Kritik Yol Ayrımı:** Eğer seçilen senaryo bir "Interior" (Mekan) senaryosu ise veya tema "Interior Only" ise, sistem **Stage 3, 4 ve 5'i ATLAR**. Direkt olarak stoktaki yüksek kaliteli mekan görselini alır ve Stage 6'ya (Onay) gider.

---

## 3. Aşama: Prompt Optimizasyonu (`prompt_optimization`)
Gemini için mükemmel tarifi (prompt) hazırlama aşamasıdır.

*   **Sorumlu Fonksiyon:** `gemini.optimizePrompt`
*   **İşlem:**
    1.  **Base Prompt İnşası:** Kod tarafında (`geminiPromptBuilder.ts`) matematiksel bir prompt iskeleti oluşturulur.
        *   *Örn: "Professional food photography of [PRODUCT], on [PLATE], on [TABLE]..."*
    2.  **AI Optimizasyonu:** Gemini bu iskeleti alır ve sanatsal detaylar ekler.
        *   *Eklentiler:* Işık yönü (Soft morning light from left), Alan derinliği (f/1.8, bokeh), Renk paleti.
    3.  **Teknik Parametreler:**
        *   `AspectRatio`: Seçilen formata göre (1:1, 3:4, 9:16).
        *   `NegativePrompt`: "deformed, blurry, text, watermark, bad hands..."
*   **Çıktı:** Yaklaşık 100-150 kelimelik, İngilizce, detaylı bir `MainPrompt`.

---

## 4. Aşama: Görsel Üretimi (`image_generation`)
En kritik ve maliyetli aşama. Gemini Vision modeli, referans görsellerden yeni bir görsel "hayal eder".

*   **Sorumlu Fonksiyon:** `gemini.transformImage`
*   **Kullanılan Model:** `gemini-3-pro-image-preview` (Vision yetenekli) veya `imagen-3` (duruma göre).
*   **Girdiler (Multi-Modal):**
    *   **Prompt:** Stage 3'ten gelen metin.
    *   **Referans Görseller (Base64):**
        *   Ürün Fotoğrafı (Zorunlu)
        *   Tabak Fotoğrafı (Varsa)
        *   Masa Dokusu (Varsa)
        *   Fincan / Aksesuar (Varsa)
*   **Süreç:**
    *   Sistem, referans görsellerdeki ürünü alır, seçilen tabak ve masaya "yeni bir ışık ve gölge ile" yerleştirir (Composite Generation).
    *   Ürünün dokusunu korumaya çalışır (`faithfulness` parametresi ile).
*   **Çıktı:** Base64 formatında yeni üretilmiş görsel.

---

## 5. Aşama: Kalite Kontrol (`quality_control`)
Üretilen görselin "Instagram'a layık" olup olmadığını denetleyen yapay zeka jürisi.

*   **Sorumlu Fonksiyon:** `gemini.evaluateImage`
*   **Kullanılan Model:** `gemini-3-pro-preview` (Vision)
*   **Rol:** "Senior Art Director"
*   **Kontrol Kriterleri:**
    1.  **Ürün Bütünlüğü:** Ürün bozulmuş mu? (Kruvasan erimiş mi?)
    2.  **El/Anatomi:** Eğer el varsa, parmak sayısı doğru mu?
    3.  **Kompozisyon:** Tabak kesik mi? Işık doğal mı?
    4.  **Yasaklı Öğeler:** Görselde "text" veya garip artefaktlar var mı?
*   **Karar:**
    *   **Puan:** 10 üzerinden verilir.
    *   **Eşik Değer:** Genelde 7.5 altı "RED" alır.
    *   **Retry:** Eğer reddedilirse, **Prompt'u güncelleyerek** (hatayı düzelterek) Stage 4'e geri dönülür (Max 3 deneme).
*   **Çıktı:** `Passed: true/false`, `Score`, `Critique`.

---

## 6. Aşama: Onay ve Bildirim (`telegram_approval`)
Sonuç başarılıysa insan onayına sunulur.

*   **İşlem:**
    1.  Görsel Firebase Storage'a yüklenir (`storageUrl` alınır).
    2.  Tüm süreç veritabanına `ScheduledSlot` olarak kaydedilir.
    3.  **Telegram Bot:** Admin'e fotoğraflı mesaj atar.
        *   *Mesaj İçeriği:* Görsel, Kullanılan Senaryo, Puan, Onay/Red butonları.
*   **Durum:** Slot statüsü `awaiting_approval` olur.

---

## Özet: Veri Akışı

```text
[Button Click] 
   ⬇
[Load Rules & Config]
   ⬇
[Stage 1: Asset Selection (Gemini Text)] -> {Product, Plate, Table...}
   ⬇
[Stage 2: Scenario Selection (Gemini Text)] -> {Scenario: "Morning Coffee"}
   ⬇
[Stage 3: Prompt Opt (Gemini Text)] -> {Prompt: "Hyper-realistic..."}
   ⬇
[Stage 4: Image Gen (Gemini Vision + Ref Images)] -> {Base64 Image}
   ⬇              ⬆ (Retry Loop)
[Stage 5: Quality Control (Gemini Vision)] --(Fail)--> [Fix Prompt]
   ⬇ (Pass)
[Stage 6: Storage & Telegram]
```

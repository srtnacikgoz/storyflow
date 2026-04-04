# İlham Kaynakları ve Rakip Analizi (Inspiration & Competitors)

Bu doküman, geliştirilen **Instagram Paylaşım Otomasyonu (Storyflow/Sade Chocolate)** projesi için referans alınacak, ilham kaynağı olan ve sektöre yön veren yapay zeka destekli görsel/içerik üretim uygulamalarını listelemek amacıyla oluşturulmuştur. 

Yeni bir özellik ekleneceği zaman ilk olarak buradaki kaynaklar incelenmeli ve karşılaştırma tablosundaki eksiklikler/fırsatlar gözden geçirilmelidir.

---

## 1. İlham Kaynakları (Inspiration Sources)

### 1.1. Pixelcut
*   **Odak Noktası:** E-ticaret ve sosyal medya için yapay zeka destekli fotoğraf düzenleme ve grafik tasarım.
*   **Öne Çıkan "Killer" Özellikler:**
    *   **AI Background Remover & Replacer:** Kusursuz obje dekupesi ve yapay zeka ile arka plan (studio/lifestyle) üretimi.
    *   **AI Shadows:** Ürünün yeni arka plana gerçekçi bir şekilde (havada asılı kalmadan) oturmasını sağlayan yapay gölgelendirme.
    *   **Template-driven Designs:** Önceden tanımlanmış markalama şablonları, özel renk paletleri ve zengin tipografi seçenekleri.
    *   **Magic Eraser:** Fotoğraftaki istenmeyen objeleri (kablo, yabancı cisim vb.) silme ve bağlama uygun şekilde doldurma (generative fill).
    *   **Batch Edit:** Stüdyo kalitesindeki ayarları tek tuşla tüm ürün/fotoğraf kataloğuna uygulama.

### 1.2. Arvin (uaidealabs.mobi / IdeaLabs)
*   **Odak Noktası:** Çoklu AI modellerini (GPT-4o, Claude 3.5, Gemini, DALL-E) tek bir çatı altında birleştiren asistan ve içerik üretim aracı.
*   **Öne Çıkan "Killer" Özellikler:**
    *   **AI Product Photo:** Moda ve ürün fotoğraflarını profesyonel modellere veya lifestyle konseptlere giydirme/yerleştirme.
    *   **Integrated Branding Design:** Yapay zeka ile üretilen görselin üzerine doğrudan marka kimliğini (logo, font, afiş/poster öğeleri) entegre etme.
    *   **AI Ghost Mannequin:** Mankenleri otomatik silip temiz, uçuşan (floating) kıyafet/ürün görünümleri yaratma.
    *   **Multi-Model Orchestration:** Arka planda amaca en uygun modeli (metin için Claude/GPT, görsel için DALL-E/Midjourney/Gemini) dinamik olarak seçme yeteneği.

---

## 2. Özellik Karşılaştırması (Feature Comparison)

Aşağıdaki tablo, mevcut uygulamamızın (Storyflow) referans uygulamalara göre durumunu göstermektedir.

| Özellik / Yetenek                           | Storyflow (Mevcut) | Pixelcut | Arvin (IdeaLabs) |
| :------------------------------------------ | :----------------- | :------- | :--------------- |
| **Zamanlanmış Otomatik Post**               | ✅ Var (Cron/PubSub)| ❌ Yok    | ❌ Yok           |
| **Gemini Vision ile Fotoğraf Analizi**      | ✅ Var             | ✅ Var   | ✅ Var           |
| **Genel AI Fotoğraf İyileştirme (Imagen)**  | ✅ Var             | ✅ Var   | ✅ Var           |
| **Ürün Dekupesi (Background Removal)**      | ❌ Yok             | ✅ Var   | ✅ Var           |
| **Lifestyle AI Arka Plan & Gölgelendirme**  | ❌ Yok             | ✅ Var   | ✅ Var           |
| **İstenmeyen Obje Silme (Magic Eraser)**    | ❌ Yok             | ✅ Var   | ➖ Kısmen        |
| **Akıllı Şablon & Marka Fontu/Logosu Ekleme**| ❌ Yok             | ✅ Var   | ✅ Var           |
| **Tek Fotoğraftan Post/Story/Reels Türetme**| ❌ Yok             | ✅ Var   | ✅ Var           |
| **Çoklu AI Model Orkastrasyonu**            | ➖ Kısmen (Gemini)  | ❌ Yok   | ✅ Var           |

---

## 3. Benimsenen Özellikler Kaydı (Adopted Features Log)

Bu bölüm, yukarıdaki ilham kaynaklarından görüp kendi sistemimize entegre ettiğimiz özellikleri tarihçesiyle kaydetmek içindir.

*   *(Henüz entegre edilen bir spesifik dış özellik kaydı bulunmamaktadır. Gelecekte eklenecek olan "AI Product Studio" ve "Smart Branding Engine" özellikleri geliştirmeleri tamamlandığında buraya eklenecektir.)*

---
> **Not:** Sistem geliştirme döngüsünde (Planning/Brainstorming) bir darbogaza girildiğinde veya yeni vizyon arayışında *öncelikle bu dosya ve içindeki uygulamaların güncel sürümleri/özellikleri analiz edilmelidir.*

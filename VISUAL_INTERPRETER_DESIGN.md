# Visual Interpreter (Görsel Yorumlayıcı) Tasarım Dokümanı

## 1. Konsept Analizi: Nedir?
Kullanıcının talep ettiği sistem, klasik bir "görsel tanıma" sisteminden çok daha fazlasıdır. Bu bir **"Bağlam Farkındalıklı Sanat Yönetmeni"dir (Context-Aware Art Director)**.

Standart bir AI (örneğin Gemini Vision), bir fotoğrafa bakıp *"Burada bir kahve var"* der.
Ancak **Visual Interpreter**, o fotoğrafın arkasındaki **Niyeti (Intent)** ve **Süreci (Process)** bilir.

**Aradaki Fark:**
*   **Standart AI:** "Resimde kırmızı bir araba var."
*   **Visual Interpreter:** "Sen 'Hızlı ve Agresif' bir mood istedin, 'Sinematik Işık' promptu girdin ve referans olarak 'Ferrari' görseli verdin. Ancak çıktıdaki araba 'Oyuncak' gibi duruyor çünkü alan derinliği (depth of field) çok sığ. Bir sonraki denemede `macro shot` yerine `wide angle` promptu kullanmalısın."

## 2. Mimari Karar: Agent mı, Skill mi, MCP mi?

Bu yeteneği sisteme kazandırmak için en doğru yapı **SKILL (Yetenek)** yapısıdır.

### Neden Skill?
*   **Agent (Ajan):** Bir "kimliktir" (Örn: Orchestrator). Bu yorumlama işi, Orchestrator'ın yapması gereken bir **işlevdir**. Yeni bir ajan yaratmak yerine, mevcut ajana bu "Görme ve Eleştirme" yeteneğini kazandırmak daha verimlidir.
*   **MCP:** MCP, dış dünyaya (veritabanı, dosya sistemi, API) bağlanmak içindir. Eğer bu yorumlamayı yapmak için özel bir 3. parti yazılım (örn: çok spesifik bir endüstriyel analiz aracı) kullanmayacaksak, MCP gereksiz bir katmandır. Gemini 1.5 Pro'nun kendisi bu analizi yapabilecek kapasitededir.
*   **Skill:** Tam isabet. `visual-critic` veya `art-director` adında bir skill oluştururuz. Bu skill şunları içerir:
    1.  **Uzman Gözlüğü (System Instructions):** Modele nasıl bakması gerektiğini öğreten yönergeler.
    2.  **Kontrol Listeleri (Checklists):** Işık, Kompozisyon, Sadakat (Faithfulness) kriterleri.
    3.  **Düzeltme Mantığı (Correction Logic):** "Hata A ise, Çözüm B'dir" haritası.

## 3. Çalışma Prensibi (Workflow)

Sistem şu 3 aşamalı **"Reflection Loop"** (Düşünme Döngüsü) ile çalışır:

### Adım 1: Bağlam Toplama (The Context)
Yorumlayıcıya sadece resim verilmez. Şu paket verilir:
*   **Input Assets:** Hangi ürün görseli kullanıldı?
*   **Config:** Hangi Stil (Modern), Hangi Mood (Dark), Hangi Prompt kullanıldı?
*   **Hedef:** Kullanıcı neyi başarmak istiyordu?

### Adım 2: Analiz (The Critique)
Skill devreye girer ve Gemini 1.5 Pro'yu şu rolde çalıştırır:
*"Sen kıdemli bir fotoğrafçısın. Sana hem hedeflediğim spekleri hem de çıkan sonucu veriyorum. Aradaki farkı bul."*

### Adım 3: Reçete (The Prescription)
Sadece hatayı söylemek yetmez. Sistem şunu üretir:
*   **Fix:** "Prompt'taki 'soft light' ifadesini sil, yerine 'hard rim lighting' ekle."
*   **Warning:** "Bu ürün beyaz renkte, seçtiğin 'High Key' stili ürünü patlatıyor. Arka planı koyulaştır."

## 4. Uygulama Planı (Roadmap)

Bu sistemi kurmak için `storyflow/.agent/skills/visual-critic` klasörü oluşturulmalı ve içinde şunlar yer almalı:

1.  **`SKILL.md`**: Yeteneğin ana tanımı ve kuralları.
2.  **`prompts/critique_prompt.md`**: Yapay zekaya eleştiri yapmayı öğreten "meta-prompt".
3.  **`heuristics/common_failures.md`**: Sık yapılan hatalar ve teknik çözümleri veritabanı.

---
**Özet:** Bu bir **Skill** olmalıdır. Mevcut `Orchestrator` ajanımıza, ürettiği işi kontrol etme yeteneği (Self-Correction) kazandıracaktır.

# Visual Interpreter (Görsel Yorumlayıcı) Tasarım Dokümanı

## 1. Konsept Analizi: Nedir?
Kullanıcının talep ettiği sistem, klasik bir "görsel tanıma" sisteminden çok daha fazlasıdır. Bu bir **"Bağlam Farkındalıklı Sanat Yönetmeni"dir (Context-Aware Art Director)**.

Standart bir AI (örneğin Gemini Vision), bir fotoğrafa bakıp *"Burada bir kahve var"* der.
Ancak **Visual Interpreter**, o fotoğrafın arkasındaki **Niyeti (Intent)** ve **Süreci (Process)** bilir.

**Aradaki Fark:**
*   **Standart AI:** "Resimde kırmızı bir araba var."
*   **Visual Interpreter:** "Sen 'Hızlı ve Agresif' bir mood istedin, 'Sinematik Işık' promptu girdin ve referans olarak 'Ferrari' görseli verdin. Ancak çıktıdaki araba 'Oyuncak' gibi duruyor çünkü alan derinliği (depth of field) çok sığ. Bir sonraki denemede `macro shot` yerine `wide angle` promptu kullanmalısın."

## 2. Mimari Karar: Skill Yapısı

Bu yeteneği sisteme kazandırmak için en doğru yapı **SKILL (Yetenek)** yapısıdır.
`visual-critic` adında bir skill oluştururuz. Bu skill şunları içerir:
1.  **Uzman Gözlüğü (System Instructions):** Modele nasıl bakması gerektiğini öğreten yönergeler.
2.  **Kontrol Listeleri (Checklists):** Işık, Kompozisyon, Sadakat (Faithfulness) kriterleri.
3.  **Düzeltme Mantığı (Correction Logic):** "Hata A ise, Çözüm B'dir" haritası.

## 3. Çalışma Prensibi (Workflow)

Sistem, kullanıcı talebi üzerine çalışan bir **"On-Demand Critique"** (İstek Üzerine Eleştiri) modelini benimser.

### Adım 1: Tetikleme (Trigger)
Kullanıcı, üretilen görselin yanındaki **"🔍 Analiz Et (Visual Interpreter)"** butonuna basar.
*   **Neden Manuel:** Maliyet kontrolü ve gereksiz analizleri önlemek için. Sadece kullanıcının "iyileştirmek istediği" görseller analiz edilir.

### Adım 2: Bağlam Toplama (The Context)
Sistem şu paketi hazırlar:
*   **Görsel:** Üretilen içerik.
*   **Hedef:** Mood (Kış Sabahı), Ürün (Kruvasan), Stil (Minimalist).
*   **Orijinal Prompt:** Gemini'ye gönderilen ham komut.

### Adım 3: Analiz ve Reçete
Visual Critic Skilli devreye girer:
1.  **Analiz:** "Mood tuttu mu?", "Işık doğru mu?", "Yapaylık var mı?" sorularını sorar.
2.  **Çıktı:** Kullanıcıya bir rapor sunar ve (varsa) iyileştirilmiş bir prompt önerir.
3.  **Aksiyon:** Kullanıcı "Önerilen Prompt ile Yeniden Üret" butonuna basarak düzeltmeyi uygular.

## 4. Uygulama Planı (Roadmap)

Bu sistemi kurmak için `storyflow/.agent/skills/visual-critic` klasörü oluşturulmalı ve içinde şunlar yer almalı:

1.  **`SKILL.md`**: Yeteneğin ana tanımı ve kuralları.
2.  **`prompts/critique_prompt.md`**: Yapay zekaya eleştiri yapmayı öğreten "meta-prompt".
3.  **`heuristics/common_failures.md`**: Sık yapılan hatalar ve teknik çözümleri veritabanı.

---
**Özet:** Bu bir **Skill** olmalıdır. Mevcut `Orchestrator` ajanımıza, ürettiği işi kontrol etme yeteneği (Self-Correction) kazandıracaktır.

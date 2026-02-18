# Senaryo (Scenario) Modülü Detaylı Denetim Raporu

**Tarih:** 7 Şubat 2026
**Kapsam:** Frontend (Scenarios.tsx), Backend (Controller & Service), AI Entegrasyonu (GeminiService)
**Durum:** Kritik Düzeltmeler ve Mimari İyileştirmeler Gerekiyor

---

## 1. Yönetici Özeti
Senaryo modülü genel olarak çalışır durumda olsa da, **Türkçe karakter desteği**, **veritabanı tutarlılığı** ve **kod mimarisi** açısından riskler barındırmaktadır.

*   **En Kritik Risk:** Senaryo ID'leri oluşturulurken Türkçe karakterlerin silinmesi (örn: "Çay" -> "ay"). Bu durum veri kaybına ve ID çakışmalarına yol açabilir.
*   **Mimari Sorun:** "Mood" ve "Scenario" mantığının kod içine gömülü (hardcoded) olması, bu kuralları güncellemek için her seferinde sistemin yeniden dağıtılmasını (deploy) gerektiriyor.

---

## 2. Tespit Edilen Sorunlar

### 🔴 Kritik Hatalar (Bugs)

1.  **ID Üretiminde Karakter Kaybı (Frontend)**
    *   **Dosya:** `admin/src/pages/Scenarios.tsx` (Satır 369)
    *   **Sorun:** `form.name.toLowerCase().replace(/[^a-z0-9-]/g, "")` kodu sadece İngilizce karakterleri kabul ediyor.
    *   **Örnek:** "Işıklı Oda" ismi, `isikli-oda` yerine `kl-oda` veya `ili-oda` gibi anlamsız ID'lere dönüşüyor. Türkçe karakterlerin (ç, ğ, ı, ö, ş, ü) doğru dönüştürülmesi gerekiyor.

2.  **Yarış Durumu (Race Condition) Riski (Backend)**
    *   **Dosya:** `functions/src/services/scenarioService.ts` (Satır 50-70)
    *   **Sorun:** Yeni senaryo eklerken `sortOrder` hesaplaması için önce tüm senaryoları okuyor. Aynı anda iki kişi senaryo eklerse sıralama karışabilir. Firestore `Transaction` veya `increment` kullanılmalı.

### 🟡 Mimari ve Kod Kalitesi Sorunları

1.  **Hardcoded "İş Mantığı" (Business Logic)**
    *   **Dosya:** `functions/src/services/gemini.ts` (Satır 626)
    *   **Sorun:** `moodGuidelines` nesnesi kodun içinde sabit tanımlı. "Energetic", "Social" gibi modların kurallarını değiştirmek için kod deploy etmek gerekiyor. Bu kurallar veritabanından (Firestore) okunmalı.
    *   **Benzer Durum:** `admin/src/pages/Scenarios.tsx` içinde de `DEFAULT_HAND_POSE_OPTIONS` gibi varsayılan değerler kod içine gömülü.

2.  **Deprecated (Eski) Alan Kullanımı**
    *   **Dosya:** `functions/src/controllers/orchestrator/scenarioController.ts`
    *   **Not:** Kod içinde `mood` alanının v3.0 ile deprecated olduğu belirtilmiş ancak hala işlem görüyor. Bu durum veri şemasında kirlilik yaratıyor.

3.  **Lint ve Format Hataları**
    *   **Genel:** Backend dosyalarında 70+ adet stil hatası (gereksiz boşluklar, satır uzunluğu) mevcut. Okunabilirliği düşürüyor.

---

## 3. İyileştirme Önerileri (Eylem Planı)

### Faz 1: Acil Düzeltmeler (Hemen)
*   [ ] **ID Üretimi Düzeltmesi:** Türkçe karakterleri (ğ->g, ü->u, ş->s...) dönüştüren bir yardımcı fonksiyon (`slugify`) eklenmeli.
*   [ ] **Lint Temizliği:** Scenario controller ve service dosyalarındaki stil hataları otomatik düzeltilmeli (`eslint --fix`).

### Faz 2: Kararlılık (Kısa Vade)
*   [ ] **SortOrder Güvenliği:** Senaryo ekleme işlemi Firestore Transaction içine alınarak sıralama bozuklukları önlenmeli.
*   [ ] **Veri Temizliği:** Veritabanındaki "Deprecated" alanlar (eski mood referansları) temizlenmeli veya migrasyon planlanmalı.

### Faz 3: Mimari (Orta Vade)
*   [ ] **Dinamik Kurallar:** `gemini.ts` içindeki Mood kuralları ve Frontend'deki varsayılan listeler Firestore'da bir `config` koleksiyonuna taşınmalı. Böylece kod deploy etmeden AI davranışları Admin panelinden güncellenebilir.

---

## 4. Sonuç
Senaryo modülü, sistemin "kalbi" niteliğindedir çünkü AI'ya ne çekeceğini o söyler. ID üretimindeki hata, kullanıcı deneyimini doğrudan bozan en görünür sorundur ve öncelikle çözülmelidir.

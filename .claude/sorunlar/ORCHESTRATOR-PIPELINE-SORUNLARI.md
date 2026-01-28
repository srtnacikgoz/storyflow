# Orchestrator Pipeline Sorunları

> **Oluşturma:** 2026-01-28
> **Son Güncelleme:** 2026-01-28
> **Durum:** Aktif araştırma - Çözüm bekleniyor
> **Analiz Kaynağı:** Claude + Gemini ortak analizi

---

## Genel Tespit

**Gemini'nin özeti:**
> "Orchestrator, veriyi sadece taşıyor ama anlamlandırmıyor."

Sistemde zengin veri mevcut (weather, eatingMethod, mood detayları) ancak bu veriler "karar verici" mekanizmaya (Gemini) aktarılmadığı için görsel tutarsızlıklar oluşuyor. Üstelik merkezi GeminiService, nerede çalıştığını bilmediği için tüm logları tek bir potaya eriterek hata ayıklamayı imkansız kılıyor.

---

## SORUN-001: Tema Hava Durumu Bilgisi Prompt'a Aktarılmıyor

- **Öncelik:** KRITIK
- **Durum:** Açık
- **Tespit:** 2026-01-28
- **Etki:** "Kapalı hava" teması seçilse bile güneşli, aydınlık görseller üretiliyor

### Sorunun Tanımı

Tema adı "sabah ilk paylaşımlar kapalı hava" olmasına rağmen, üretilen prompt'ta:
- `"A bright, airy window seat table bathed in natural 5500K light"`
- `"Strong backlighting"`
- `"High contrast, fresh, clean"`

Hiçbir yerde "overcast", "cloudy", "rainy", "kapalı hava" yok.

### Kök Neden Zinciri

| Adım | Ne Oluyor | Sorun |
|------|-----------|-------|
| 1. Theme tipi | `Theme.mood = "energetic"` (string) | Theme tipinde `weather` alanı **YOK**, `moodId` alanı **YOK** |
| 2. Mood sistemi | `Mood.weather = "cloudy"` tanımlı | Ama Theme → Mood bağlantısı **kopuk** |
| 3. Orchestrator | `themeData?.moodId` kontrol ediyor | Theme tipinde moodId yok → her zaman `undefined` |
| 4. Mood filtreleme | `getMatchingMoods(hour, season)` | `weather` parametresi **filtrelemede bile kullanılmıyor** |
| 5. Prompt oluşturma | `mood.geminiAtmosphere` → prompt | `weather` alanı prompt'a **hiçbir zaman enjekte edilmiyor** |
| 6. Weather override | `moodLower.includes("overcast")` | Sadece mood string'inde aranır - Türkçe "kapalı hava" aranmıyor |
| 7. Fallback | `suggestMoodForTime()` çalışıyor | Sabah saati → "Bright and airy, 5500K" default mood seçiliyor |

### Sorunlu Dosyalar

| Dosya | Satır | Sorun |
|-------|-------|-------|
| `orchestrator/types.ts` | 846-859 | Theme tipinde `weather` ve `moodId` alanı yok |
| `orchestrator/orchestrator.ts` | 201 | `themeData?.moodId` hep undefined (alan tanımlı değil) |
| `orchestrator/orchestrator.ts` | 507 | `themeData?.mood` basit string, detaylı mood bilgisi yok |
| `services/moodService.ts` | 70-88 | `getMatchingMoods()` weather'i filtrelemiyor |
| `orchestrator/geminiPromptBuilder.ts` | 499-518 | `weather` alanı prompt'a eklenmiyor |
| `orchestrator/orchestrator.ts` | 1684-1700 | Weather override sadece İngilizce keyword'lere bakıyor |

### Çözüm Yaklaşımı

**Gemini önerisi:** Theme → Mood ontolojik bağını kur. Weather bilgisini lighting ve color grading parametrelerini belirleyen ana değişken olarak kullan.

**Somut adımlar:**
1. `Theme` tipine `moodId` (opsiyonel Mood referansı) ekle
2. Orchestrator'da tema yüklendiğinde ilişkili Mood'un `weather`, `lightingPrompt`, `colorGradePrompt` alanlarını oku
3. Prompt builder'da `Environment Context` bölümü aç, hava durumuna göre teknik direktifler enjekte et
4. `MoodService.getMatchingMoods()` filtrelemesine `weather` parametresini ekle
5. Weather override mekanizmasını Mood'un `weather` alanından da besle

### İlişkili Sorun: Senaryo Atmosfer/Işık Seçenekleri Çelişkisi

**Kullanıcı tespiti:**
> Mood olarak "Yağmurlu Sabah" seçiyorum. Senaryo olarak "Cam Kenarı" seçiyorum. Ama cam kenarı senaryosunun içindeki atmosfer/ruh hali seçeneklerinde kapalı havaya dair hiçbir seçenek yok. Işık stili seçeneklerinde de yok. Otomatik seçtiğim mood ve senaryo birbirine zıt.

**Analiz:** Senaryo içindeki atmosfer ve ışık stili seçenekleri hardcoded enum/liste. Kapalı hava, yağmurlu ortam gibi seçenekler mevcut değil. Mood "yağmurlu" derken senaryo "güneşli pencere ışığı" dayatıyor.

**Karar gerekiyor:** Atmosfer ve ışık stili seçenekleri de CRUD olmalı mı, yoksa mood'dan otomatik inherit mi edilmeli?

**Önerilen yaklaşım:** Mood'dan inherit + senaryo seviyesinde opsiyonel override. Böylece:
- Mood "Yağmurlu Sabah" seçildiğinde → atmosfer otomatik olarak "overcast, soft diffused, cool tones"
- Kullanıcı isterse senaryoda override yapabilir
- Override seçenekleri de CRUD ile yönetilebilir

---

## SORUN-002: Ürün Tipine Uygun Aksesuar Seçimi Yapılmıyor

- **Öncelik:** YÜKSEK
- **Durum:** Açık
- **Tespit:** 2026-01-28
- **Etki:** Kruvasana çatal ekleniyor, elle yenilen ürünlere gereksiz bıçak/çatal konuyor

### Sorunun Tanımı

Üretilen prompt'ta:
> "A silver dessert fork placed elegantly beside the plate"

Kruvasanlar elle yenilir. Çatal gereksiz ve yanlış.

### Kök Neden: 3 Katmanlı Zafiyet

**Katman 1 — Base prompt'ta metin tabanlı şart (kod kontrolü değil)**
- **Dosya:** `orchestrator/orchestrator.ts:1840`
- `"Other hand with utensil taking a bite (if cutlery asset provided)"`
- Bu bir `if` bloğu değil, parantez içi açıklama. AI modeli bunu "uygunsa ekle" diye yorumluyor.

**Katman 2 — Gemini optimizePrompt eatingMethod bilmiyor**
- **Dosya:** `gemini.ts:623-658`
- `optimizePrompt()` fonksiyonuna sadece `product filename`, `scenario name`, `base prompt` gönderiliyor
- `eatingMethod: "hand"` bilgisi **hiç gönderilmiyor**
- Gemini "pastane ürünü = çatal" genel bilgisiyle hareket ediyor

**Katman 3 — eatingMethod tanımlı ama Gemini pipeline'ına aktarılmıyor**
- **Dosya:** `orchestrator/types.ts:1341`
- `croissants: eatingMethodDefault: "hand"` **tanımlı**
- `claudeService.ts:665` — Bu bilgi ClaudeService'de kullanılıyor
- Ama pipeline **Gemini** kullanıyor → bilgi akışı kopuk

### Sorunlu Dosyalar

| Dosya | Satır | Sorun |
|-------|-------|-------|
| `orchestrator/orchestrator.ts` | 1840 | Çatal ifadesi metin tabanlı şart, kod kontrolü değil |
| `gemini.ts` | 623-658 | `optimizePrompt()` eatingMethod bilmiyor |
| `orchestrator/orchestrator.ts` | 1889-1902 | Sadece "kahve-ani" için override var, diğer senaryolar generic prompt kullanıyor |

### Çözüm Yaklaşımı

**Gemini önerisi:** Constraint Injection — eatingMethod bilgisini negatif/pozitif kısıt olarak gönder.

**Somut adımlar:**
1. `optimizePrompt()` fonksiyonuna `eatingMethod` parametresi ekle
2. Prompt'a Physical Logic katmanı ekle:
   - `eatingMethod === "hand"` → "STRICTLY NO CUTLERY. Product is eaten by hand."
   - `eatingMethod === "fork"` → "Include a fork beside the plate."
   - `eatingMethod === "spoon"` → "Include a spoon."
3. Negative prompt'a da eatingMethod bazlı ekleme yap
4. `noHandPrompt` template'indeki parantez içi açıklamayı gerçek kod kontrolüne çevir

---

## SORUN-003: Loglama Stage İsimleri Yanlış (Hepsi "image-generation")

- **Öncelik:** YÜKSEK
- **Durum:** Açık
- **Tespit:** 2026-01-28
- **Etki:** Debug imkansız — hangi adımda ne olduğu anlaşılamıyor, duplike loglar oluşuyor

### Sorunun Tanımı

Pipeline'da 5 farklı Gemini çağrısı hep `"image-generation"` olarak loglanıyor:
- Asset seçimi → "image-generation" (YANLIŞ)
- Senaryo seçimi → "image-generation" (YANLIŞ)
- Prompt optimizasyonu → "image-generation" (YANLIŞ)
- Gerçek görsel üretimi → "image-generation" (DOĞRU)
- Detay logu → "image-generation" (DOĞRU)

### Kök Neden: Çift Katmanlı Loglama

**Ana sorun:** `GeminiService.generateText()` (`gemini.ts:451`) her çağrıldığında kendi içinden `AILogService.logGemini()` çağırıyor. Ve `logGemini()` (`aiLogService.ts:119`) stage'i **hardcoded `"image-generation"`** olarak yazıyor.

| GeminiService Fonksiyonu | İç Çağrı | Loglanan Stage | Doğru Stage |
|--------------------------|----------|----------------|-------------|
| `selectAssets()` | `generateText()` → `logGemini()` | `"image-generation"` | `"asset-selection"` |
| `selectScenario()` | `generateText()` → `logGemini()` | `"image-generation"` | `"scenario-selection"` |
| `optimizePrompt()` | `generateText()` → `logGemini()` | `"image-generation"` | `"prompt-optimization"` |
| `transformImage()` | `logGemini()` | `"image-generation"` | `"image-generation"` ✓ |

Orchestrator ayrıca `logDecision()` ile **doğru stage** bilgisiyle de logluyor → duplike loglar.

### Sorunlu Dosyalar

| Dosya | Satır | Sorun |
|-------|-------|-------|
| `aiLogService.ts` | 119 | `logGemini()` hardcoded `stage: "image-generation"` |
| `aiLogService.ts` | 315 | `logGeminiDetailed()` hardcoded `stage: "image-generation"` |
| `gemini.ts` | 451 | `generateText()` her çağrıda yanlış stage ile log atıyor |
| `gemini.ts` | 340 | `transformImage()` doğru stage ama aynı pattern |

### Çözüm Seçenekleri

**Gemini önerisi:** Contextual Logging — `generateText()` imzasına stage parametresi ekle veya RequestContext üzerinden otomatik stage bilgisi sağla.

**Seçenek A (Basit):** `generateText()` içindeki `logGemini()` çağrılarını kaldır. Orchestrator zaten `logDecision()` ile doğru stage'i logluyor. Duplike loglar biter.

**Seçenek B (Kapsamlı):** `logGemini()` ve `logGeminiDetailed()` metodlarına `stage` parametresi ekle. `GeminiService` metodlarına (`selectAssets`, `selectScenario`, `optimizePrompt`) stage bilgisi geçir.

**Seçenek C (En Temiz):** `GeminiService`'e `currentStage` context property'si ekle. Orchestrator her adımda `gemini.setStage("scenario-selection")` çağırır. İç loglama otomatik olarak doğru stage'i kullanır.

---

## SORUN-004: Eksik Pipeline Logları

- **Öncelik:** ORTA
- **Durum:** Açık
- **Tespit:** 2026-01-28
- **Etki:** Bazı pipeline adımları hiç loglanmıyor, debug eksik kalıyor

### Loglanmayan Adımlar

| Adım | Durum | Detay |
|------|-------|-------|
| `config-snapshot` | Kod var ama bazı çalışmalarda loglanmıyor | Interior theme akışında atlanıyor olabilir |
| `quality-control` | Log çağrısı **hiç yok** kodda | QC yapılıyor ama sonuç kaydedilmiyor |
| `visual-critic` | Metod **tanımlı değil** | Tip tanımında var ama implementasyon yok |
| `content-generation` | Özellik **kaldırılmış** | Caption üretimi pipeline'dan çıkarılmış |
| `prompt-optimization` | Yanlış isimle loglanıyor | `"prompt-building"` olarak kaydediliyor |

### Sorunlu Dosyalar

| Dosya | Sorun |
|-------|-------|
| `orchestrator.ts:992-1036` | Quality control sonucu loglanmıyor |
| `orchestrator.ts:342-478` | Interior theme akışında adımlar loglanmıyor |
| `aiLogService.ts` | `logVisualCritic()` metodu yok |

---

## SORUN-005: image-generation Response Verisi Kaydedilmiyor

- **Öncelik:** ORTA
- **Durum:** Açık
- **Tespit:** 2026-01-28
- **Etki:** Görsel üretildi mi, ne üretildi bilinmiyor. Debug için kritik veri eksik.

### Sorunun Tanımı

`logGeminiDetailed()` çağrısında (`orchestrator.ts:1063-1087`):
- `response` alanı → **gönderilmiyor**
- `responseData` alanı → **gönderilmiyor**
- `outputImageGenerated` → gönderiliyor ama log'da görünmüyor

Gemini'nin gerçek yanıtı (görsel metadata, kalite skoru vb.) log'da yok.

---

## SORUN-006: Telegram Gönderim Hatası Loglanmıyor

- **Öncelik:** ORTA
- **Durum:** Açık
- **Tespit:** 2026-01-28
- **Etki:** Pipeline sonunda Telegram fail olursa, neden fail olduğu bilinmiyor

### Sorunun Tanımı

Önceki pipeline (`vvm08RSqIVsvRCFAsm1R-1769540080756`) Telegram'a görsel göndermedi ama log'da hata kaydı yok. Pipeline kendini "başarılı" zannediyor.

### Potansiyel Kopma Noktaları

| Nokta | Dosya | Risk |
|-------|-------|------|
| `storageUrl` null | `orchestrator.ts:2016-2018` | Görsel Storage'a yüklenmemiş |
| `getSignedUrl()` fail | `orchestrator.ts:2162-2183` | Signed URL oluşturulamıyor |
| Telegram API fail | `telegram.ts:98-125` | Hata fırlatıyor ama pipeline'da handle edilmiyor |

### Çözüm

Telegram gönderim adımı için ayrı bir log stage'i eklenmeli (`"telegram-delivery"` veya benzeri).

---

## SORUN-007: userPrompt Kesilmesi (Truncation)

- **Öncelik:** DÜŞÜK
- **Durum:** Açık
- **Tespit:** 2026-01-28
- **Etki:** Log'larda prompt'un tamamı görünmüyor, debug zorlaşıyor

### Kök Neden

`aiLogService.ts:41-50` — 10.000 karakter limiti var. Gemini prompt'ları bu limiti aşabiliyor.

---

## Yeni Sorunlar Buraya Eklenecek

### Şablon
```markdown
## SORUN-XXX: [Başlık]

- **Öncelik:** KRİTİK / YÜKSEK / ORTA / DÜŞÜK
- **Durum:** Açık / Araştırılıyor / Çözüm Planlandı / Çözüldü
- **Tespit:** YYYY-MM-DD
- **Etki:** [Kullanıcıya/sisteme etkisi]

### Sorunun Tanımı
[Detaylı açıklama]

### Kök Neden
[Teknik analiz]

### Sorunlu Dosyalar
[Dosya:satır listesi]

### Çözüm Yaklaşımı
[Önerilen çözüm adımları]
```

---

## Çözüm Öncelik Sırası

| Sıra | Sorun | Neden Önce |
|------|-------|------------|
| 1 | SORUN-003: Log stage isimleri | Debug'ı düzeltmeden diğer sorunları takip edemeyiz |
| 2 | SORUN-001: Tema hava durumu | En görünür kullanıcı etkisi — görseller tamamen yanlış çıkıyor |
| 3 | SORUN-002: eatingMethod | Görsel kalitesini doğrudan etkiliyor |
| 4 | SORUN-004: Eksik loglar | Observability artırma |
| 5 | SORUN-005: Response verisi | Debug derinliği |
| 6 | SORUN-006: Telegram log | Hata takibi |
| 7 | SORUN-007: Truncation | Kozmetik ama faydalı |

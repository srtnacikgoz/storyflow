# Prompt Pipeline Sorunları

> **Tarih:** 2026-02-02
> **Durum:** Araştırma tamamlandı, çözüm bekleniyor
> **Kritik Bulgu:** Sorun Gemini 3 Pro'nun görsel üretmesi değil - sorun ona gönderilen prompt'lar.

---

## Temel Problem

Asset'ler ve etiketleri sisteme yükleniyor ama prompt pipeline'ı bunları **ciddiye almıyor**. Metin açıklamaları (BUSINESS CONTEXT, MOOD CONTEXT, THEME CONTEXT) görsel referanslarını override ediyor.

Kullanıcı asset'ler ekledi, hepsini etiketledi, ama sistem bu etiketleri görmezden geliyor.

---

## Tespit Edilen Sorunlar

### Sorun 1: userRules content alanı BOŞ

**Dosya:** `orchestrator.ts:362`

**Durum:** AI Kuralları sayfasından eklenen kurallar log'lara `content: ""` olarak düşüyor.

**Detay:** Kod `data.content` okuyor ama AIRule tipinde `content` alanı mevcut değil. Tip tanımında sadece `title` ve `description` var.

**Etki:** Kullanıcının tanımladığı tüm AI kuralları boş olarak işleniyor - hiçbir kural uygulanmıyor.

---

### Sorun 2: BUSINESS CONTEXT hayali ortam yaratıyor

**Dosya:** `geminiPromptBuilder.ts:701-704`

**Durum:** Prompt'a "BUSINESS CONTEXT (MANDATORY)" olarak eklenen metin, Gemini'nin referans görselleri yerine hayali bir dükkan/ortam hayal etmesine neden oluyor.

**Firestore değeri:**
```
"Ground floor artisan patisserie with street-level storefront.
Huge floor-to-ceiling windows overlooking a quiet, tree-lined residential street..."
```

**Etki:**
- isEnabled: true → hayali zemin kat dükkanı
- isEnabled: false → hayali üst kat görünümü (hala yanlış)

**Asıl sorun:** BUSINESS CONTEXT kapatılsa bile diğer metin açıklamaları (THEME CONTEXT, MOOD CONTEXT, SCENARIO CONTEXT) aynı sorunu yaratıyor.

---

### Sorun 3: Mood ID eşleşmiyor - İki farklı sistem

**Dosyalar:**
- `orchestrator.ts:265, 277`
- `geminiPromptBuilder.ts:499`

**Durum:** Sistemde iki farklı mood tanımlama sistemi var ve birbirleriyle konuşmuyorlar.

**Sistem A - Firestore Moods:**
- Collection: `moods`
- ID formatı: Random Firestore ID (`WPjaGbItgXofQ1GhM3xy`)
- Temalar bu ID'leri kullanıyor

**Sistem B - Gemini Presets:**
- Hardcoded + Firestore preset
- ID formatı: Human-readable (`cozy-intimate`, `morning-energy`)
- buildGeminiPrompt() bu ID'leri bekliyor

**Etki:** Mood eşleştirme her zaman `matched: false` dönüyor, fallback'e düşüyor.

---

### Sorun 4: Asset etiketleri prompt'a aktarılmıyor

**Dosyalar:**
- `claudeService.ts:115-120, 1210, 1228`
- `geminiPromptBuilder.ts:700+`

**Durum:** Asset'lere eklenen etiketler (örn: "cheesecake tabağı, pasta tabağı, kruvasan tabağı") final Gemini prompt'unda görünmüyor.

**Zincir:**
1. Etiketler asset'e ekleniyor ✓
2. Claude'a gösteriliyor ✓
3. Claude'a "etiketleri kullan" talimatı YOK ✗
4. Final prompt'a etiketler eklenmiyor ✗

**Etki:** Kullanıcı saatlerce etiket yazıyor ama sistem bunları görmezden geliyor. Pasta tabağı fincan altlığı oluyor.

---

### Sorun 5: interpolatePrompt fonksiyonu DUMMY idi

**Dosya:** `configService.ts:68-71`

**Durum:** Template değişkenleri (`{{moodUpper}}`, `{{userRulesSection}}` vb.) hiç değiştirilmiyordu - fonksiyon sadece `return template;` yapıyordu.

**Etki:** Tüm Prompt Studio template'leri `{{değişken}}` placeholder'larıyla aynen kullanılıyordu.

**Not:** Bu sorun düzeltildi (2026-02-02).

---

### Sorun 6: clearPromptStudioCache fonksiyonu çalışmıyordu

**Dosya:** `configService.ts:64-66`

**Durum:** "Cache Temizle" butonu hiçbir şey yapmıyordu - fonksiyon `// no-op` idi.

**Etki:** Prompt değişiklikleri 5 dakika beklemeden uygulanmıyordu.

**Not:** Bu sorun düzeltildi (2026-02-02).

---

### Sorun 7: Prompt çok uzun ve çelişkili

**Dosya:** `geminiPromptBuilder.ts` (genel)

**Durum:** Final prompt'ta şu bölümler var:
- SCENARIO CONTEXT
- LIGHTING
- BUSINESS CONTEXT (hayali dükkan)
- WEATHER OVERRIDE
- THEME CONTEXT
- MOOD CONTEXT
- TIME OF DAY
- SEASON
- MOOD LIGHTING
- COLOR GRADE
- ASSET RULE

**Etki:** Tüm bu metin açıklamaları birbirleriyle ve görsel referanslarla çelişiyor. Gemini ne yapacağını şaşırıyor.

---

### Sorun 8: GeminiService Prompt Studio template'ini kullanmıyordu

**Dosya:** `gemini.ts:821`

**Durum:** GeminiService kendi hardcoded system prompt'unu kullanıyordu, Prompt Studio template'ini çağırmıyordu.

**Etki:** Prompt Studio'dan yapılan değişiklikler GeminiService'e yansımıyordu.

**Not:** Bu sorun düzeltildi (2026-02-02).

---

## Alternatif Değerlendirme

### OpenCode Zen Kullanımı

**Düşünce:** Görsel üretimi (Gemini 3 Pro) hariç, diğer tüm pipeline adımlarını OpenCode Zen ile yapmak.

**Mevcut API:** OpenCode Zen API key'leri mevcut.

**Potansiyel kullanım alanları:**
- Asset seçimi
- Senaryo seçimi
- Prompt optimizasyonu
- Kalite kontrolü
- İçerik üretimi (caption, hashtag)

**Not:** Bu seçenek değerlendirilecek.

---

## Özet

| # | Sorun | Dosya | Etki Seviyesi |
|---|-------|-------|---------------|
| 1 | userRules content boş | orchestrator.ts:362 | Kritik |
| 2 | BUSINESS CONTEXT hayali ortam | geminiPromptBuilder.ts:701 | Kritik |
| 3 | Mood ID eşleşmiyor | orchestrator.ts + geminiPromptBuilder.ts | Yüksek |
| 4 | Etiketler kullanılmıyor | claudeService.ts + geminiPromptBuilder.ts | Kritik |
| 5 | interpolatePrompt DUMMY | configService.ts | Düzeltildi ✓ |
| 6 | clearPromptStudioCache çalışmıyor | configService.ts | Düzeltildi ✓ |
| 7 | Prompt çok uzun/çelişkili | geminiPromptBuilder.ts | Yüksek |
| 8 | GeminiService template kullanmıyor | gemini.ts | Düzeltildi ✓ |

---

**Son Güncelleme:** 2026-02-02 08:50

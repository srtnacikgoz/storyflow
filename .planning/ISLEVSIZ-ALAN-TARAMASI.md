# İşlevsiz Alan Taraması

> **Başlangıç:** 2026-01-28
> **Durum:** Tarama tamamlandı - Düzeltme bekliyor

---

## Tarama Durumu

| Modal | Durum |
|-------|-------|
| Assets | ✅ Tamamlandı |
| Senaryolar | ✅ Tamamlandı |
| Temalar | ✅ Tamamlandı |
| Zaman Kuralları | ✅ Tamamlandı |
| AI Rules | ✅ Tamamlandı |
| Mood/Lighting | ✅ Tamamlandı |

---

## 1. ASSETS - Düzeltme Kararları

### Çalışır Hale Getir

**Etiketler (tags):**
- Gemini geçişinde kayboldu. Gemini asset selection'a `tags` eklenmeli
- `gemini.ts:515` → `{ id, filename }` yerine `{ id, filename, tags }` olmalı
- Etiketler renk uyumu, stil eşleşmesi ve akıllı seçim için kritik

**usageCount (kullanım sayısı):**
- Gemini geçişinde kayboldu. Rotasyon/çeşitlilik için Gemini'nin bunu görmesi şart
- Az kullanılan asset'lere öncelik vermesi için `{ id, filename, tags, usageCount }` olmalı

### Modaldan Kaldır

**Dominant renkler (dominantColors):**
- Referans açıklamalarında (fincan, peçete) kullanılıyor ama etkisi minimal
- Gemini zaten referans görselin kendisini görüyor - renk bilgisini görseldan alıyor
- Kullanıcıya veri girdirmenin getirisi yok, kafa karıştırıyor
- **Aksiyon:** UI'dan kaldır. Kodda kullanan yerler fallback ile çalışmaya devam eder

**Stil (style):**
- Benzer durum. Senaryo seçiminde geçiyor ama etkisi belirsiz
- Gemini görselden stil anlayabiliyor
- **Aksiyon:** UI'dan kaldır

### Fikir: Serbest Açıklama Alanı

dominantColors ve style yerine tek bir **"Açıklama"** (description) alanı eklenebilir:
- Kullanıcı kendi kelimeleriyle tanımlar: "Altın kenarlı beyaz porselen tabak"
- Bu açıklama Gemini'ye hem seçimde hem referans açıklamasında gönderilir
- Structured data yerine doğal dil → AI için daha faydalı
- Zorunlu değil, isteğe bağlı

---

## 2. SENARYOLAR - Düzeltme Kararları

### Modaldan Kaldır

**mood (senaryo mood):**
- Type'da var (`types.ts:511`) ama UI'da yok, hiçbir yerde set edilmiyor
- Pipeline'da okunuyor gibi görünse de her zaman `undefined` döner
- **Aksiyon:** Type'dan kaldır, tamamen ölü kod

**suggestedProducts (önerilen ürünler):**
- UI'da düzenlenebiliyor, Firestore'a kaydediliyor
- Ama senaryo seçiminde AI'a hiç gönderilmiyor
- **Aksiyon:** UI'dan kaldır VEYA Gemini seçimine hint olarak gönder

### Araştırılacak

**compositions (kompozisyonlar):**
- UI'da çoklu seçim yapılabiliyor, `rulesService.ts:572`'de rastgele bir tanesi seçiliyor
- AMA seçilen kompozisyon ID'si pipeline'da hardcoded map'lerden çözümleniyor
- Kullanıcının seçimi ile hardcoded map eşleşiyor mu doğrulanmalı
- **Aksiyon:** Akışı doğrula - eşleşiyorsa sorun yok, eşleşmiyorsa düzelt

### Çalışanlar
- id, name, description, includesHands, isInterior, interiorType: Tam çalışıyor
- lightingPreset, handPose, compositionEntry: Gemini'ye gidiyor, çalışıyor

---

## 3. TEMALAR - Düzeltme Kararları

### BUG (Acil)

**accessoryAllowed güncelleme kaybı:**
- `themeController.ts:131-155` → `updateTheme` fonksiyonunda `accessoryAllowed` destructure EDİLMEMİŞ
- Create'de var ama update'de YOK
- Kullanıcı temayı düzenlediğinde accessoryAllowed değeri sessizce kaybolur
- **Aksiyon:** `themeController.ts`'de update fonksiyonuna `accessoryAllowed` ekle

### Modaldan Kaldır

**moodId (mood document referansı):**
- Yarım kalmış migrasyon. Type'da var ama hiçbir yerde yazılmıyor
- UI'da yok, controller'da yok, her zaman `mood` string'e düşüyor
- **Aksiyon:** Type'dan kaldır, migrasyon terk edildi

### Çalışır Hale Getir

**description (açıklama) → Gemini'ye gönder:**
- Şu an sadece admin panelde gösterim amaçlı
- Gemini bu açıklamayı senaryo seçimi ve görsel üretiminde kullanabilir
- Gemini'ye ideal format sorulacak, cevaba göre UI placeholder/hint güncellenecek
- **Aksiyon:** description'ı pipeline'da Gemini'ye gönder + UI'da format rehberi ekle

### Yanıltıcı UI Düzeltmesi

**scenarios (senaryo seçimi) → Tekli seçim VEYA kombinasyon desteği:**
- UI çoklu senaryo seçimine izin veriyor (checkbox listesi)
- Kullanıcı "kahve anı + paylaşım" seçince ikisinin birlikte kullanılacağını sanıyor
- Gerçekte Gemini havuzdan tek birini seçiyor, diğerleri kullanılmıyor
- **Aksiyon (iki seçenek):**
  - **A)** Dropdown ile tek senaryo seçimi → kullanıcı ne seçtiyse o çalışır, sürpriz yok
  - **B)** Kombinasyon desteği ekle → seçilen senaryolar birlikte/sırayla kullanılır (karmaşık)
- **Tercih:** Kullanıcı tek senaryo seçimini istiyor (A seçeneği)

### Çalışanlar
- id, name, mood, petAllowed, accessoryAllowed (okuma): Tam çalışıyor

## 4. ZAMAN KURALLARI - Düzeltme Kararları

### Çalışır Hale Getir

**allowPairing + pairingWith (eşleştirme):**
- Type'da tanımlı ama kodda hiçbir yerde okunmuyor
- İstek: kruvasan + kahve birlikte olabilmeli
- `scheduler.ts`'de eşleştirme mantığı yazılmalı
- **Not:** Karmaşık özellik - ayrı bir plan gerektirebilir

### Modaldan Kaldır

**priority (öncelik):**
- UI'da hardcoded `10` gönderiliyor, scheduler'da hiç okunmuyor
- **Aksiyon:** UI'dan kaldır

**productTypes → productType (tekil yap):**
- Dizi olarak tanımlı ama `scheduler.ts:274`'te sadece `[0]` kullanılıyor
- Çoklu seçim gerekmiyor
- **Aksiyon:** Dizi yerine tekil `productType` string olarak sadeleştir

**scenarioPreference (senaryo tercihi - eski):**
- Deprecated alan, hiçbir yerde okunmuyor
- **Aksiyon:** Varsa kaldır

## 5. AI RULES - Tarama Sonucu

**Durum: Tam çalışıyor, sorun yok.**

Tüm alanlar (type, category, title, description, exampleImageUrl, isActive) uçtan uca çalışıyor:
- Kullanıcı kural oluşturur → Firestore'a kaydedilir → Pipeline'da yüklenir → Formatlanır → Gemini'ye gönderilir
- Aktif/pasif filtreleme çalışıyor
- Yapılacak/yapılmayacak ayrımı çalışıyor
- Kategori bazlı gruplama çalışıyor

**Aksiyon:** Yok. Bu modal temiz.

---

## 6. MOOD / LIGHTING - Düzeltme Kararları

> **Not:** Bu modal komple ele alınmalı. Aşağıdaki düzeltmeler tek tek değil, birlikte yapılmalı.

### İşlevsiz Alanlar

**description (açıklama):**
- Kaydediliyor ama pipeline'da hiçbir yerde okunmuyor
- **Aksiyon:** Gemini'ye gönderilecek şekilde pipeline'a ekle

**timeOfDay (zaman dilimi):**
- UI'da seçilebiliyor (morning/afternoon/evening/night/any)
- Firestore'a kaydediliyor, pipeline'da yükleniyor
- AMA prompt'a hiç enjekte edilmiyor - sıfır etkisi var
- **Aksiyon:** İşlevsel hale getir (prompt'a ekle veya koşullu ışık/renk belirle)

**season (mevsim):**
- Aynı durum. UI'da var, kaydediliyor, yükleniyor ama prompt'a gitmiyor
- **Aksiyon:** İşlevsel hale getir

**keywords (anahtar kelimeler):**
- Type tanımında YOK ama kod `moodData?.keywords` okumaya çalışıyor (`orchestrator.ts:219`)
- Tamamen yetim (orphaned) kod
- **Aksiyon:** Orchestrator'daki `keywords` referansını temizle

### Yarım Çalışan Alanlar

**weather (hava durumu):**
- Sadece "güneşli olmayan" durumlar için çalışıyor (cloudy/rainy/snowy → WEATHER OVERRIDE ekleniyor)
- "Güneşli" seçmekle "Her Hava" seçmek arasında sıfır fark var
- **Aksiyon:** Güneşli hava için de pozitif override ekle (sunny → warm sunlight enforce)

**lightingPrompt (ışıklandırma stili):**
- Prompt'a `MOOD LIGHTING:` olarak ekleniyor
- AMA senaryo'nun `lightingPreset`'i ve tema'nın `styleId`'si de ışık talimatı gönderebiliyor
- Çelişki yönetimi yok - Gemini hangisini ciddiye alacağını kendisi seçiyor

**colorGradePrompt (renk & ton):**
- Prompt'a `COLOR GRADE:` olarak ekleniyor
- AMA tema'nın `colors[]` ve `styleId`'si de renk talimatı gönderebiliyor
- Aynı çelişki sorunu

### BUG

**Collection adı uyumsuzluğu:**
- `orchestrator.ts:290` → `collection("user-rules")` okuyor
- Gerçek collection adı `"ai-rules"`
- Config snapshot'ta user rules hiç loglanmıyor (sessizce başarısız)
- **Aksiyon:** Collection adını düzelt

---

## KRİTİK BULGULAR ÖZETİ

### Acil Bug'lar
| # | Bug | Konum | Etki |
|---|-----|-------|------|
| 1 | `accessoryAllowed` tema güncellemede kaybolur | `themeController.ts:131-155` | Aksesuar ayarı sessizce sıfırlanır |
| 2 | Collection adı yanlış (`user-rules` vs `ai-rules`) | `orchestrator.ts:290` | Config snapshot'ta AI rules loglanmıyor |

### İşlevsiz Alanlar (Kullanıcıyı Yanıltıyor)
| # | Alan | Modal | Durum |
|---|------|-------|-------|
| 1 | tags | Assets | Gemini geçişinde kayboldu |
| 2 | usageCount | Assets | Gemini geçişinde kayboldu |
| 3 | dominantColors | Assets | Minimal etki, kaldırılmalı |
| 4 | style | Assets | Minimal etki, kaldırılmalı |
| 5 | mood | Senaryolar | Ölü kod, hiç set edilmiyor |
| 6 | suggestedProducts | Senaryolar | Kaydediliyor ama okunmuyor |
| 7 | allowPairing/pairingWith | Zaman Kuralları | Type'da var, kodda okunmuyor |
| 8 | priority | Zaman Kuralları | Hardcoded 10, okunmuyor |
| 9 | moodId | Temalar | Yarım migrasyon, hiç yazılmıyor |
| 10 | timeOfDay | Mood | Yükleniyor ama prompt'a gitmiyor |
| 11 | season | Mood | Yükleniyor ama prompt'a gitmiyor |
| 12 | keywords | Mood | Type'da yok, kod okumaya çalışıyor |

---

## AYRI PLAN: Pipeline Etki Raporu (Execution Tracing)

> **Bu madde ayrı bir plan olarak ele alınmalıdır. Mevcut tarama ile birlikte yapılmaz.**

Pipeline çalışırken her stage'de tema/mood/senaryo alanlarının hangisinin gerçekten okunup kullanıldığını runtime'da izleyen bir loglama sistemi. AI çağrısı değil, kod yürütme izleme. Her üretimde otomatik rapor:
- `✅ alan X → şurada kullanıldı, şu değer gönderildi`
- `❌ alan Y → hiçbir yerde okunmadı`
- `⚠️ alan Z → okundu ama değeri undefined/boş`

Amaç: İşlevsiz alan taramasının canlı ve sürekli versiyonu.

---

## AYRI PLAN: Prompt Çakışma Mimarisi (Conflict Resolution)

> **Bu madde ayrı bir plan olarak ele alınmalıdır. Mevcut tarama ile birlikte yapılmaz.**
> **Öncelik: Yüksek** - Tüm modal düzeltmeleri yapılsa bile bu sorun devam eder.

**Sorun:** Aynı kavram (ışık, renk, stil) birden fazla modaldan prompt'a ekleniyor, çelişki yönetimi yok.

**Işık bilgisi 4 kaynaktan geliyor:**
1. Mood → lightingPrompt
2. Mood → weather (WEATHER OVERRIDE)
3. Senaryo → lightingPreset
4. Tema → styleId → style.definition

**Renk/ton bilgisi 3 kaynaktan geliyor:**
1. Mood → colorGradePrompt
2. Tema → colors[]
3. Tema → styleId → style.definition

**Sonuç:** Hepsi aynı prompt'a ekleniyor, Gemini hangisini ciddiye alacağını kendisi seçiyor.

**Çözüm yaklaşımı:** Her kavram (ışık, renk, atmosfer) için tek kaynak (single source of truth) belirlenmeli. Diğer yerlerden aynı kavram kaldırılmalı veya hiyerarşi netleştirilmeli.

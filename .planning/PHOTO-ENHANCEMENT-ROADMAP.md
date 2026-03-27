# Photo Enhancement Roadmap — Maestro AI

> **Oluşturulma:** 2026-03-27
> **Durum:** Taslak — Onay bekliyor
> **Amaç:** Gerçek ürün fotoğraflarını AI ile profesyonel kaliteye çıkarma

---

## Vizyon

Mevcut Maestro AI **sıfırdan görsel üretiyor**. Bu roadmap ile ikinci bir mod ekliyoruz:
**"Gerçek fotoğrafını yükle → AI profesyonel kaliteye çıkarsın"**

Pipeline: `Gerçek Fotoğraf → Arka Plan Kaldırma → Enhancement → Upscale → Paylaşıma Hazır`

---

## İlham Kaynakları (Araştırma: 2026-03-27)

| Uygulama | Aldığımız Fikir |
|----------|----------------|
| **FoodGlow.ai** | Before/After dönüşüm konsepti, yemek fotoğrafı odaklı enhancement |
| **Pixora** | Preset tabanlı workflow (prompt yazmadan), malzeme tanıma ile ışık ayarlama |
| **AI Photo Enhancer** | AI upscale + denoise + sharpen tek akışta |
| **VivaVideo** | HD Restore konsepti (düşük kalite → yüksek kalite) |
| **Instories** | Template bazlı hızlı içerik üretimi UX'i |
| **Claid.ai** (ILHAM_KAYNAKLARI #2) | AI background generation, scene placement, doğal gölgelendirme |
| **PPP** (ILHAM_KAYNAKLARI #5) | Semantic Anchoring — ürün fiziksel kimlik tanımı |
| **Atlas Cloud** (ILHAM_KAYNAKLARI #8) | Preview → Final workflow (maliyet optimizasyonu) |
| **GIO** (ILHAM_KAYNAKLARI #6) | Before/After slider UI |

---

## Teknik Kararlar (2026-03-27 kesinleşti)

| Adım | Araç | Maliyet | Gerekçe |
|------|------|---------|---------|
| Arka plan kaldırma | **rembg (U2Net)** — Cloud Function | Ücretsiz (open source) | Gemini kenar hassasiyetinde BG removal yapamaz. rembg çok daha hassas |
| Yeni arka plan + gölge | **Gemini 3.1 Flash Image** | ~$0.10/görsel | İzole ürün PNG → yeni sahne + doğal gölge. Gemini'nin güçlü alanı |
| Photo Enhancement | **Gemini 3.1 Flash Image** | ~$0.10/görsel | Işık/renk/detay iyileştirme. Flash yeterli, Pro gereksiz |
| AI Upscale | **Real-ESRGAN** — Cloud Function | Ücretsiz (open source) | Gemini upscale yapamıyor. 2K/4K çıktı |
| Mimari | **Ayrı pipeline** | — | Mevcut "üretim" akışına dokunma, yeni "iyileştirme" akışı |

**Model tercihi:** Flash ($0.10) > Pro ($0.134). Enhancement'ta çok deneme olacak, Flash yeterli.
Preview→Final: Önce Flash ile preview, beğenilirse opsiyonel Pro ile final.

---

## Faz 1: Temel Altyapı — "Fotoğraf Yükle & Analiz Et"

**Süre tahmini yok — iş bitince biter.**

### 1.1 Admin Panel: Fotoğraf İyileştirme Sayfası
- Yeni sayfa: `/enhance` veya mevcut Assets sayfasına "İyileştir" modu
- Fotoğraf yükleme (drag & drop, tek veya çoklu)
- Yüklenen fotoğrafın önizlemesi
- "İyileştir" butonu

### 1.2 Backend: Enhancement Pipeline Servisi
- `functions/src/services/photoEnhancer.ts` — Ana servis
- Firestore koleksiyonu: `enhancement-jobs` (iş takibi)
- Storage: `enhanced-photos/` bucket'ı

### 1.3 AI Fotoğraf Analizi (Semantic Anchoring — ILHAM #3)
- Gemini'ye fotoğrafı gönder, şunları analiz ettir:
  - Ürün tipi (pasta, kurabiye, ekmek...)
  - Yüzey özellikleri (parlak glaze, mat fondant, pudralı...)
  - Mevcut ışık kalitesi (iyi/orta/kötü)
  - Mevcut arka plan (beyaz, ahşap, karışık...)
  - Kompozisyon notu (1-10)
- Bu analiz sonraki adımlara input olacak

### 1.4 Seed Data
- `enhancement-presets` Firestore koleksiyonu
- Preset'ler: "Stüdyo Beyaz", "Sıcak Ahşap", "Minimal Mermer", "Koyu Dramatik"
- Her preset: arka plan stili, ışık yönü, gölge tipi, renk sıcaklığı

**Çıktı:** Fotoğraf yüklenebilir, AI analiz raporu döner, preset seçilebilir.

---

## Faz 2: Arka Plan Kaldırma + Doğal Gölgelendirme

### 2.1 Background Removal
- Gemini image editing ile arka plan kaldırma
- Prompt: "Remove the background completely, keep only the [product type] with precise edges"
- Şeffaf PNG çıktısı (veya beyaz arka plan)

### 2.2 Yeni Arka Plan Yerleştirme
- Seçilen preset'e göre yeni arka plan:
  - **Stüdyo Beyaz:** Saf beyaz, soft gradient
  - **Sıcak Ahşap:** Ahşap masa dokusu
  - **Minimal Mermer:** Açık mermer yüzey
  - **Koyu Dramatik:** Koyu slate/beton
  - **Tema Uyumlu:** Mevcut tema ayarlarından renk/atmosfer al
- Arka plan seçenekleri Firestore'da (dinamik mimari kuralı)

### 2.3 Doğal Gölgelendirme
- Ürünün altına doğal yumuşak gölge
- Gölge tipi preset'e bağlı:
  - Beyaz arka plan → hafif düşen gölge (drop shadow)
  - Masa yüzeyi → contact shadow + hafif yansıma
  - Dramatik → güçlü yönlü gölge
- Gemini prompt: "Place the product on [surface] with natural soft shadow. The shadow should match the lighting direction and surface material."

**Çıktı:** Ürün temiz arka planda, doğal gölgesiyle profesyonel görünümde.

---

## Faz 3: Photo Enhancement — Işık, Renk, Detay

### 3.1 Otomatik İyileştirme
Gemini'ye fotoğrafı (arka plan değişmiş halini) gönder:
- Işık düzeltme (karanlık bölgeleri aç, parlak bölgeleri dengele)
- Renk zenginleştirme (doygunluk artırma, beyaz dengesi)
- Detay keskinleştirme (texture pop)
- Matthew Vaughn DNA kurallarını uygula (ILHAM_KAYNAKLARI E bölümü):
  - Yüksek kontrast, doygun renkler
  - Sıcak ton
  - Ürüne odaklı aydınlatma

### 3.2 Preset Bazlı Enhancement
- "Doğal" — minimal müdahale, sadece ışık/renk düzeltme
- "Canlı" — doygunluk artırma, kontrast yükseltme
- "Sinematik" — sıcak ton, bokeh, film grain
- "Temiz" — beyaz dengesi düzeltme, minimal işleme
- Preset'ler Firestore'da, Admin Panel'den yönetilebilir

### 3.3 Before/After Karşılaştırma (ILHAM #4 — GIO)
- Admin Panel'de slider ile orijinal vs iyileştirilmiş karşılaştırma
- Kullanıcı sonucu beğenmezse preset değiştirip tekrar deneyebilir

**Çıktı:** Fotoğraf profesyonel ışık/renk kalitesinde, before/after ile görülebilir.

---

## Faz 4: AI Upscale — Kalite Artırma

### 4.1 Real-ESRGAN Cloud Function
- Real-ESRGAN modelini Cloud Function'a deploy et
- Input: Enhanced fotoğraf (1080px)
- Output: 2K (2160px) veya 4K (4320px) — seçilebilir
- Denoise + sharpen + upscale tek geçişte

### 4.2 Kalite Seçenekleri
- **Instagram Optimum** — 1080x1350 (4:5), Instagram feed için ideal
- **Story/Reels** — 1080x1920 (9:16), dikey format
- **Yüksek Kalite** — 2K, baskı/katalog için
- **Poster** — 4K, vitrin posteri için (mevcut poster-mode ile entegre)

### 4.3 Preview → Final Workflow (ILHAM #1 — Atlas Cloud)
- Enhancement adımlarını önce düşük çözünürlükte (512px) yap — hızlı ve ucuz
- Kullanıcı preview'ı onaylayınca → full resolution + upscale
- Maliyet tasarrufu: Beğenilmeyen görseller düşük maliyetle üretilmiş olur

**Çıktı:** Görsel istenilen boyut ve kalitede, paylaşıma veya baskıya hazır.

---

## Faz 5: Pipeline Entegrasyonu + UX Cilalama

### 5.1 İki Modlu Dashboard
- Mevcut: **"Üret"** — Senaryo/Tema ile sıfırdan görsel üretimi
- Yeni: **"İyileştir"** — Gerçek fotoğrafı yükle ve profesyonelleştir
- Tek dashboard'da iki sekme/mod

### 5.2 Toplu İşlem (Batch — ILHAM #5 — Fash)
- Birden fazla fotoğraf yükle → hepsini aynı preset ile iyileştir
- Kuyruk sistemi ile sırayla işle
- İlerleme çubuğu

### 5.3 Sonuç Galerisi
- İyileştirilmiş görseller galeri görünümünde
- Before/After slider her görselde
- İndir (tek/toplu), Kopyala, Paylaşıma ekle butonları
- Telegram'a onay için gönder (mevcut approval workflow)

### 5.4 Mevcut Pipeline ile Köprü
- Sıfırdan üretilen görseller de "İyileştir" akışından geçebilsin
- Upscale + son rötuş → her iki mod'un çıktısı aynı kalite standardında

---

## İlham Kaynakları Dosyası Güncellemesi

Aşağıdaki yeni kaynaklar `RAKIP-VE-ILHAM-KAYNAKLARI.md` dosyasına eklenecek:

### Yeni Eklenecekler (2026-03-27 araştırması)

| # | Kaynak | Aldığımız Fikir | Durum |
|---|--------|----------------|-------|
| 19 | **Instories.app** | AI template + müzik senkronizasyon, brand kit | Gelecek (video modu eklenirse) |
| 20 | **FoodGlow.ai** | Before/After food photo enhancement konsepti | Faz 3'te uygulanacak |
| 21 | **Pixora** | Preset tabanlı workflow, malzeme tanıma ile ışık ayarlama | Faz 1.3 + Faz 3.2'de uygulanacak |
| 22 | **VivaVideo** | HD Restore, image-to-video | Gelecek (video modu eklenirse) |
| 23 | **AI Photo Enhancer (genel)** | Upscale + denoise + sharpen tek akış | Faz 4'te uygulanacak |

---

## Mevcut İlham Kaynakları Eşleştirmesi

Bu roadmap'te kullanılan mevcut ILHAM_KAYNAKLARI öğeleri:

| ILHAM # | Fikir | Bu Roadmap'te Nerede |
|---------|-------|---------------------|
| #1 | Preview → Final workflow (Atlas Cloud) | Faz 4.3 |
| #2 | Baskın renk kontrolü (Claid) | Faz 2.2 (tema uyumlu arka plan) |
| #3 | Semantic Anchoring (PPP) | Faz 1.3 (AI fotoğraf analizi) |
| #4 | Before/After karşılaştırma (GIO) | Faz 3.3 + Faz 5.3 |
| #5 | Batch varyasyon (Fash + GIO) | Faz 5.2 |
| #11 | Ürün bütünlüğü negatif kuralları | Faz 3.1 (enhancement kuralları) |

---

## Öncelik ve Bağımlılıklar

```
Faz 1 (Altyapı) ──→ Faz 2 (Arka Plan) ──→ Faz 3 (Enhancement)
                                                    │
                                                    ↓
                                              Faz 4 (Upscale)
                                                    │
                                                    ↓
                                              Faz 5 (Entegrasyon)
```

Her faz bağımsız olarak test edilebilir ve deploy edilebilir.
Faz 1 olmadan hiçbir şey çalışmaz — temel altyapı.

---

## Riskler

| Risk | Etki | Azaltma |
|------|------|---------|
| Gemini image editing kalitesi yetersiz | Çıktı beklentiyi karşılamaz | Faz 1'de prototipleriz, yetersizse harici API (remove.bg) fallback |
| Real-ESRGAN Cloud Function deploy zorluğu | Upscale çalışmaz | Alternatif: harici upscale API (waifu2x, LetsEnhance API) |
| Gemini safety filter arka plan kaldırmada tetiklenir | İşlem bloklanır | Prompt'larda cinsiyet/vücut terimi yok, sadece ürün odaklı dil |
| Enhancement preset'leri her ürüne uymaz | Tutarsız kalite | Faz 1.3'teki AI analiz ile otomatik preset önerisi |

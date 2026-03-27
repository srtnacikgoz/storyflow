# Rakip ve İlham Kaynakları — Birleşik Referans

> **İlk araştırma:** 2026-02-06
> **Son güncelleme:** 2026-03-07
> **Amaç:** Dış platformlardan alınabilecek fikirler, benchmark'lar ve mimari ilhamlar

---

## A. Doğrudan Rakipler (Ürün Fotoğrafı AI)

### 1. FoodShot AI — foodshot.ai
**Ne yapıyor:** Kafe/restoran için menu-ready fotoğraflar. Pastry, seasonal drinks, limited offers.
**Neden önemli:** Doğrudan rakip/ilham kaynağı.
- %95 photography cost savings iddiası
- 6000+ restoran kullanıyor
- Consistent brand style
- Delivery app entegrasyonu

### 2. Claid.ai — claid.ai
**Ne yapıyor:** AI background generation, scene placement, renk düzeltme. 4K çıktı.
**Aldığımız fikirler:**
- Baskın renk (dominantColor) → ThemeSetting'e eklendi (plan)
- Atmosfer → selectAssets bağlantısı → plan var
- Ürün bütünlüğü negatif kuralları → plan var
**Benchmark:** %19 conversion uplift, %90 maliyet düşüşü

### 3. Flair.ai — flair.ai
**Ne yapıyor:** Drag & drop prop'larla dijital sahne oluşturma, AI ile canlandırma.
**İlham:** Prop/asset sistemi UX pattern'i, scene staging konsepti.

### 4. Nightjar — nightjar.so
**Ne yapıyor:** AI ürün fotoğrafı platformu.
**Aldığımız fikirler:**
- Kamera stili (cameraStyle) → "overhead-flat", "45-degree", "eye-level", "close-up-macro"
- Ürün bütünlüğü negatif kuralları

### 5. Pro Photo Playground (PPP)
**Ne yapıyor:** Profesyonel ürün fotoğrafçılığı AI platformu.
**Aldığımız fikirler:**
- Semantic Anchoring — ürün fiziksel kimlik tanımı (doku, parlaklık, renk, şekil)
- Atmospheric DNA — milimetrik renk sıcaklığı kontrolü (3500K-6500K)

---

## B. AI Görsel Üretim Platformları (2026-03-07 eklenen)

### 6. GIO — gioapp.ai
**Ne yapıyor:** Selfie'den profesyonel portre/headshot üretimi. Kıyafet değiştirme, arka plan değiştirme, güzellik araçları.
**Teknik:** GAN + Style Transfer + Face Detection.
**İş modeli:** ~$350K/ay gelir, 50K aylık indirme. Soft paywall — HD export'ta ücretlendir. Haftalık $5.99.
**Bizim için ilginç:**
- Before/After slider → Dashboard'da orijinal vs üretilen görsel karşılaştırması
- Batch generation → Tek seferde birden fazla varyasyon üretme
- Tema bazlı galeriler → "Epic Portrait", "Neon Light" gibi tematik gruplar
**Almayacağımız:** Portre odaklı, mobil öncelikli.

### 7. Aixio — aixio.ai / aixio.xyz
**Ne yapıyor:** Sketch/doodle tabanlı görsel düzenleme. Çizim yaparak AI'ya "burayı böyle değiştir" deme.
**Teknik:** Aixio Image v1 (özel model), pixel-perfect tutarlılık.
**İş modeli:** Free (30 kredi), Pro $14.99/ay (225 kredi), Power $64.99/ay (1300 kredi).
**Kullanıcı:** 30K+ kullanıcı, %72 profesyonel kreatif.
**Bizim için ilginç:**
- Iterative refinement konsepti → "tekrar üret" yerine "düzelt" seçeneği
- Magic Eraser → istenmeyen obje kaldırma (bloklama sonrası kurtarma stratejisi)
- Sketch-based editing → kullanıcı müdahalesi ile hassas kontrol
**Almayacağımız:** Manuel sketch UI otomasyon felsefemize ters. Ama "AI-guided refinement" pipeline'a sonradan eklenebilir.

### 8. Atlas Cloud — atlascloud.ai
**Ne yapıyor:** 300+ AI modeline tek API üzerinden erişim. Nano Banana Pro ile ürün fotoğrafı.
**Teknik:** Multi-image composition (14 referans: 6 obje + 5 kişi + diğer). Fizik tabanlı prompt (f-stop, focal length, material shader). Chat-based iterative editing.
**Fiyatlandırma:** 2K görsel $0.12, 4K görsel $0.24.
**Bizim için ÇOK ilginç:**
- **Preview → Final workflow**: Önce 1K düşük maliyetli preview, beğenince 2K/4K final. Maliyet %50 düşebilir.
- **Fizik tabanlı ışık params**: f-stop, focal length → prompt template'lerine eklenebilir
- **14 referans görsel desteği**: Biz max 6 gönderiyoruz, potansiyel artış
- **Chat-based iterative editing**: "Işığı biraz daha sıcak yap" → düzeltme
- **Fiyat karşılaştırması**: Atlas $0.12/2K vs Gemini Pro $0.134/2K — neredeyse aynı

### 9. Fash.Studio — fash.studio
**Ne yapıyor:** Flat-lay/manken fotoğrafından AI model üzerinde giyim görseli. Moda markalarına özel.
**Teknik:** Özel AI modeller, virtual try-on, batch generation.
**İddialar:** %90 maliyet düşüşü, 10x hızlı, %50 satış artışı, %200 reklam performansı.
**Bizim için ilginç:**
- **Batch generation**: Yüzlerce görsel tek seferde → "bu ürünün 5 farklı senaryoda görselleri"
- **A/B testing**: Farklı stil kombinasyonlarını test edip dönüşüm ölçme
- **Preset prompt'lar**: "Outfit Check", "Runway Walk" → bizim senaryo sistemine benzer
- **4 adımlı basit akış**: Upload → Pick → Get → Video — sadelik prensibi
**Almayacağımız:** Virtual try-on (bizim ürünler giyim değil), AI insan modeli.

---

## C. Teknik Araçlar ve Mimari İlhamlar

### 10. ComfyUI Scene Composer
**Ne yapıyor:** Node-based random procedural generation ile sahne oluşturma.
**İlham:** Senaryo/kompozisyon modüler yapısı, sahne komponentlerini ayrı node'lar olarak tanımlama.

### 11. n8n Telegram Approval Workflow
**Ne yapıyor:** Text/voice → AI prompt refinement → Gemini image generation → Telegram approval → Social media publish.
**İlham:** Neredeyse aynı konsept — referans mimari. Feedback loop mantığı.

### 12. LangGraph
**Ne yapıyor:** Stateful, multi-agent uygulamalar. Graph-based workflow.
**İlham:** Orchestrator'ı daha sofistike hale getirmek, agent'lar arası iletişim.

### 13. Banks / PromptOps / TensorZero
**Ne yapıyor:** Prompt template versiyonlama, A/B testing, centralized prompt management.
**İlham:** Prompt iteration workflow, git-native versiyonlama.

### 14. ConsisLoRA
**Ne yapıyor:** İki aşamalı eğitim — content-consistent LoRA + style LoRA.
**İlham:** Tema bazlı stil tutarlılığı, brand-consistent görseller.

### 15. FlavorGraph / KitcheNette
**Ne yapıyor:** 1M+ tarif ve 1500 flavor molecule'den food graph. Yiyecek eşleştirme skorlama.
**İlham:** Beverage rules için veri tabanlı eşleştirme, ürün-prop skor mantığı.

### 16. Shopify Product Taxonomy
**Ne yapıyor:** 25+ dikey, 1000+ kategori, 600+ attribute ile standart ürün sınıflandırması.
**İlham:** Asset tag sistemi için referans, attribute-value ilişkileri.

### 17. Grule / Matcher Rule Engines
**Ne yapıyor:** Rule bazlı karar verme, dimension-based matching, 78μs response.
**İlham:** Asset scoring, "Bu senaryo için hangi tabak en uygun?" sorusu.

### 18. AGFSync / Awesome Evaluation
**Ne yapıyor:** VLM ile image quality assessment (style, coherence, aesthetics).
**İlham:** Üretilen görsellerin otomatik kalite kontrolü, feedback loop.

---

## B2. Fotoğraf İyileştirme & Enhancement Platformları (2026-03-27 eklenen)

### 19. Instories.app — instories.com
**Ne yapıyor:** Ürün fotoğrafından AI ile scroll-stopping reels üretimi. 5000+ şablon, müzik senkronizasyonu, kinetic typography.
**Teknik:** AI Smart-Crop (yatay→dikey), AI Background Remover, AI Music Sync, Brand Kit.
**İş modeli:** Free (filigranli) / Pro ~$12/ay / Yıllık ~$60.
**Bizim için ilginç:**
- Template bazlı hızlı içerik üretimi UX pattern'i
- Brand Kit — logo analizi ile uyumlu renk paleti önerisi
**Almayacağımız:** Video/reel odaklı (şimdilik). Gelecekte video modu eklenirse tekrar değerlendirilecek.

### 20. FoodGlow.ai — foodglow.ai
**Ne yapıyor:** Restoran/kafe yemek fotoğraflarını AI ile profesyonel kaliteye çıkarma. Before/After dönüşüm.
**Teknik:** ML tabanlı renk, ışık, sunum iyileştirme. Saniyeler içinde sonuç.
**Hedef kitle:** Restoranlar, kafeler, delivery platformları.
**Bizim için ilginç:**
- Before/After konsepti → Faz 3.3'te uygulanacak
- Yemek fotoğrafı odaklı enhancement → doğrudan bizim alan
**Pazar notu:** Nispeten küçük/yeni ürün. FoodShot AI ve MenuPhotoAI daha yerleşik.

### 21. Pixora — usepixora.com
**Ne yapıyor:** AI Product Studio. Ham ürün fotoğrafı → 60 saniyede stüdyo kalitesinde görsel. Prompt gerektirmeyen preset tabanlı.
**Teknik:** Malzeme tanıma (mat, parlak, cam, metal → fizik tabanlı ışık simülasyonu), adaptif stüdyo aydınlatması, bağlamsal sahne uygunluğu.
**İş modeli:** $9.90/ay (2000 kredi), free 100 kredi.
**Bizim için ÇOK ilginç:**
- **Preset tabanlı workflow** → Faz 1.4 ve Faz 3.2'de uygulanacak
- **Malzeme tanıma ile ışık ayarlama** → Faz 1.3 Semantic Anchoring ile birleştirilecek
- **60 saniye vaat** → hız odaklı UX
**Kategori preset'leri:** Fashion, Beauty, Food, Home & Living, Electronics.

### 22. VivaVideo — vivavideo.tv
**Ne yapıyor:** AI destekli video/görsel editörü. Image-to-video, text-to-video, HD Restore, auto captions.
**Teknik:** Gen-AI image-to-video (parallax, kamera hareketi, VFX), AI Enhancer (denoise, sharpen, 4K upscale).
**Bizim için ilginç:**
- **HD Restore** konsepti → düşük kalite fotoğrafı kurtarma
- **Image-to-Video** → gelecekte video modu eklenirse referans
**Almayacağımız:** Video editörü şimdilik kapsam dışı.

### 23. AI Photo Enhancer (Genel Kategori)
**Pazar liderleri:** Remini (portre), Magnific AI (premium upscale), LetsEnhance (e-ticaret), Claid.ai (ürün), Topaz (masaüstü).
**Bizim için ilginç:**
- **Upscale + denoise + sharpen tek akış** → Faz 4'te Real-ESRGAN ile uygulanacak
- **Claid.ai API** → otomasyon pipeline'ına entegre edilebilecek en yakın rakip (zaten ILHAM #2)
- **LetsEnhance batch processing** → Faz 5.2 toplu işlem için referans

---

## D. Sentez: Projemize Alınabilecek Fikirler (Öncelik Sırasıyla)

| # | Fikir | Kaynak | Fayda | Karmaşıklık | Durum |
|---|-------|--------|-------|-------------|-------|
| 1 | **Preview → Final workflow** | Atlas Cloud | Maliyet %50 düşer (1K ucuz, 2K sadece onaylanan) | Orta | Bekliyor |
| 2 | **Fizik tabanlı ışık params** | Atlas + PPP | f-stop, focal length, renk sıcaklığı → gerçekçilik artışı | Düşük | Kısmi (renk sıcaklığı planlandı) |
| 3 | **Semantic Anchoring** | PPP | Ürün fiziksel kimlik tanımı prompt'a ekleme | Düşük | Planlandı |
| 4 | **Before/After karşılaştırma** | GIO | Dashboard'da orijinal vs üretilen slider | Düşük | Bekliyor |
| 5 | **Batch varyasyon** | Fash + GIO | Bir ürün için 3-5 farklı senaryo/stil tek seferde | Orta | Bekliyor |
| 6 | **Baskın renk kontrolü** | Claid | Tema bazlı renk tonu yönlendirme | Düşük | Planlandı |
| 7 | **Kamera stili** | Nightjar | overhead, 45-derece, eye-level, macro seçimi | Düşük | Planlandı |
| 8 | **Atmosfer → asset seçimi bağ** | Claid | Atmosfer preset'i asset seçimini etkilesin | Orta | Planlandı |
| 9 | **A/B test analytics** | Fash | Hangi senaryo/tema/stil daha iyi engagement alıyor | Yüksek | Bekliyor |
| 10 | **Iterative refinement** | Aixio + Atlas | Üretilen görseli "düzelt" ile iyileştirme | Yüksek | Bekliyor |
| 11 | **Ürün bütünlüğü negatif kuralları** | Claid + Nightjar + PPP | Ürünü kesme/bölme/renk değiştirme YASAK | Düşük | Planlandı |
| 12 | **Otomatik kalite skorlama** | AGFSync | Üretilen görsel kalitesini AI ile puanlama | Yüksek | Bekliyor |
| 13 | **Arka plan kaldırma + doğal gölge** | Pixora + Claid | Ürünü izole et, temiz arka plan + gölge | Orta | Roadmap Faz 2 |
| 14 | **Photo Enhancement pipeline** | FoodGlow + Pixora + AI Enhancers | Gerçek fotoğrafı AI ile profesyonel kaliteye çıkar | Orta | Roadmap Faz 3 |
| 15 | **AI Upscale (Real-ESRGAN)** | AI Enhancers + VivaVideo | 1080px → 2K/4K kalite artırma | Orta | Roadmap Faz 4 |
| 16 | **Preset bazlı enhancement** | Pixora | Prompt yazmadan, hazır stil seçimiyle iyileştirme | Düşük | Roadmap Faz 3.2 |
| 17 | **Toplu fotoğraf iyileştirme (batch)** | LetsEnhance + Fash | Birden fazla fotoğrafı aynı preset ile işle | Orta | Roadmap Faz 5.2 |

---

## E. Matthew Vaughn Görsel DNA (Sabit Kurallar)

Tüm üretimde varsayılan olarak uygulanan sinematik kurallar:

| Kural | Prompt Talimatı |
|-------|-----------------|
| Merkez Kompozisyon | Center-converging composition: perspective lines lead toward the main product |
| Yüksek Kontrast + Doygun | High contrast, saturated colors — golden crust GLOWS, coffee is deep and rich |
| Anamorfik His | Shallow depth of field, soft bokeh background, gentle highlight bloom |
| Kasıtlı Objeler | Every object in frame serves the composition — nothing random or decorative |
| Filmsel Kalite | Filmic quality: slight warm tone, organic texture, NOT clinical stock photo |
| Odaklı Aydınlatma | Main light on product, edges slightly darker — subtle natural vignette |

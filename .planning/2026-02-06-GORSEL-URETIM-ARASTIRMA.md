# Görsel Üretim Sistemleri Araştırma Raporu

**Tarih:** 2026-02-06
**Durum:** Araştırma Tamamlandı

---

## 1. ComfyUI Workflow Sistemleri

### ComfyUI Scene Composer
- **Link:** github.com/mus-taches/comfyui-scene-composer
- **Ne yapıyor:** Random procedural generation ile sahne oluşturma. Node-based sistem ile sahne elementleri arasında ilişkiler tanımlama.
- **Bizim için ne işe yarar:**
  - Senaryo/kompozisyon sistemimize çok benzer bir yaklaşım
  - Sahne komponentlerini ayrı node'lar olarak tanımlama fikri
  - Prompt çıktısını string olarak formatlama mantığı
- **Teknik:** Node çıktısı direkt conditioning'e bağlanabiliyor, modular yapı

### ComfyUI Workspace Manager
- **Link:** github.com/11cafe/comfyui-workspace-manager
- **Ne yapıyor:** Workflow versiyonlama, model yönetimi, image generation history takibi
- **Bizim için ne işe yarar:**
  - Prompt template versiyonlama için ilham
  - Generation history tracking mantığı

### Product Photography ComfyUI Workflow'ları
- **Link:** OpenArt Professional Product Photography
- **Ne yapıyor:** Segment Anything + ControlNet + IPAdapter kombinasyonu ile profesyonel ürün fotoğrafçılığı
- **Bizim için ne işe yarar:**
  - Ürün izolasyonu ve sahneye yerleştirme teknikleri
  - Relighting ile 3D görünüm sağlama
  - RGB mask ile sahne elementi kontrolü
- **Teknik:** Denoise 0.2-0.3 e-commerce için optimal, ICLight entegrasyonu

---

## 2. Prompt Template ve Versiyonlama Sistemleri

### Banks (Jinja-based Prompt Language)
- **Link:** github.com/masci/banks
- **Ne yapıyor:** Jinja tabanlı prompt dili. Prompt'lara metadata ekleme, versiyonlama first-class citizen.
- **Bizim için ne işe yarar:**
  - Prompt template sistemimizi geliştirmek için
  - Metadata ile prompt yönetimi (tema, senaryo bilgileri)
- **Teknik:** Jinja2 syntax, Python

### PromptOps
- **Link:** github.com/llmhq-hub/promptops
- **Ne yapıyor:** Git-native prompt yönetimi ve test framework'u. Otomatik versiyonlama, semantic version detection.
- **Bizim için ne işe yarar:**
  - Prompt değişikliklerini track etme
  - A/B test altyapısı
- **Teknik:** Git hooks, zero-manual versioning

### TensorZero
- **Link:** tensorzero.com/docs/gateway/guides/prompt-templates-schemas
- **Ne yapıyor:** Prompt template ve schema yönetimi, A/B testing, uygulama kodundan prompt'ları ayırma
- **Bizim için ne işe yarar:**
  - Prompt iteration workflow'u
  - Centralized prompt management

---

## 3. Ürün-Asset Eşleştirme ve Taxonomy Sistemleri

### Shopify Product Taxonomy
- **Link:** github.com/Shopify/product-taxonomy
- **Ne yapıyor:** 25+ dikey, 1000+ kategori, 600+ attribute ile standart ürün sınıflandırması
- **Bizim için ne işe yarar:**
  - Asset kategorileme sistemi için referans
  - Attribute-value ilişkileri (tabak tipleri, bardak tipleri vb.)
  - Pastane/kafe ürünleri için alt kategori yapısı
- **Teknik:** JSON/YAML distribution files, open-source

### FlavorGraph
- **Link:** github.com/lamypark/FlavorGraph
- **Ne yapıyor:** 1M+ tarif ve 1500 flavor molecule'den food graph oluşturma. Kimyasal bağlam ile yiyecek eşleştirme.
- **Bizim için ne işe yarar:**
  - Beverage rules sistemimiz için: "cheesecake → latte" gibi eşleşmeleri veri tabanlı yapmak
  - Food-food ilişkileri öğrenme
- **Teknik:** PyTorch, node2vec, 8K node, 147K edge

### KitcheNette
- **Link:** github.com/dmis-lab/KitcheNette
- **Ne yapıyor:** Siamese neural network ile yiyecek eşleştirme skorları. 300K annotated pairing.
- **Bizim için ne işe yarar:**
  - Ürün-prop eşleştirme skorlama mantığı
  - "Bu pasta hangi tabakla iyi gider?" sorusuna veri tabanlı cevap
- **Teknik:** Siamese networks, scoring output

---

## 4. Rule Engine ve Scoring Sistemleri

### Grule Rule Engine
- **Link:** github.com/hyperjumptech/grule-rule-engine
- **Ne yapıyor:** Go'da rule engine. Transaction bazlı skor oluşturma, sınıflandırma.
- **Bizim için ne işe yarar:**
  - Asset scoring sistemimiz için: "Bu senaryo için hangi tabak en uygun?"
  - Rule bazlı karar verme
- **Teknik:** Go, declarative rules

### Matcher (High-Performance Rule Matching)
- **Link:** github.com/Fabricates/Matcher
- **Ne yapıyor:** Dynamic dimensions, multiple match types, forest-based indexing. 78μs response time, 12K QPS.
- **Bizim için ne işe yarar:**
  - Çok sayıda asset arasından hızlı eşleştirme
  - Dimension-based matching (renk, stil, boyut)
  - Automatic weight calculation
- **Teknik:** Go, dimension weights, forest indexing

---

## 5. Human-in-the-Loop ve Approval Workflow'ları

### n8n: AI Photo Pipeline with Telegram Approval
- **Link:** n8n.io/workflows/11138
- **Ne yapıyor:** Telegram'dan text/voice → AI prompt refinement → Gemini image generation → Approval → Social media publish
- **Bizim için ne işe yarar:**
  - TAM bizim sistemimize benziyor!
  - Gemini entegrasyonu
  - Telegram approval flow
  - Multi-platform publish
- **Teknik:** n8n workflow, Gemini API

### n8n: Human-in-the-Loop X Posts
- **Link:** n8n.io/workflows/5625
- **Ne yapıyor:** AI draft → Telegram'a gönder → Approval/revision feedback → Publish veya revise
- **Bizim için ne işe yarar:**
  - Feedback loop mantığı
  - Revision request handling

---

## 6. Multi-Agent Orchestration (LangGraph)

### LangGraph Framework
- **Link:** langchain.com/langgraph
- **Ne yapıyor:** Stateful, multi-agent uygulamalar. Graph-based workflow, cycles ve conditionals desteği.
- **Bizim için ne işe yarar:**
  - Orchestrator'ımızı daha sofistike hale getirmek
  - Agent'lar arası iletişim (prompt builder agent, asset selector agent, validator agent)
  - Parallel execution, subgraph'lar
- **Teknik:** Python, state management, graph workflows

---

## 7. Style Consistency ve LoRA

### ConsisLoRA
- **Link:** arxiv.org/html/2503.10614v1
- **Ne yapıyor:** İki aşamalı eğitim: önce content-consistent LoRA, sonra style LoRA (content fixed).
- **Bizim için ne işe yarar:**
  - Tema bazlı stil tutarlılığı
  - Brand-consistent görüntüler
- **Teknik:** Two-step LoRA training

### Brand-Specific LoRA Training
- **Ne yapıyor:** Marka product photography'si için LoRA eğitimi. Background, lighting, styling tutarlılığı.
- **Bizim için ne işe yarar:**
  - Pastane/kafe markası için tutarlı stil
  - Tema'ları LoRA olarak eğitmek
- **Teknik:** 50-75 steps per image, UNet LR 1e-4 to 5e-4

---

## 8. Image Quality Assessment

### Awesome Evaluation of Visual Generation
- **Link:** github.com/ziqihuangg/Awesome-Evaluation-of-Visual-Generation
- **Ne yapıyor:** Visual generation evaluation metrics, models, systems koleksiyonu
- **Bizim için ne işe yarar:**
  - Üretilen görsellerin kalite kontrolü
  - Automatic quality scoring
- **Teknik:** AGIQA-3k, ImageReward, ArtScore

### AGFSync Framework
- **Link:** arxiv.org/abs/2403.13352
- **Ne yapıyor:** VLM ile image quality assessment (style, coherence, aesthetics). AI-driven feedback loop.
- **Bizim için ne işe yarar:**
  - Görsel kalite otomatik değerlendirme
  - Feedback loop ile model iyileştirme
- **Teknik:** DPO (Direct Preference Optimization)

---

## 9. E-Commerce AI Photography Platformları (Rakipler)

### FoodShot AI
- **Link:** foodshot.ai
- **Ne yapıyor:** Kafe/restoran için menu-ready fotolar. Pastry, seasonal drinks, limited offers.
- **Bizim için ne işe yarar:**
  - DOĞRUDAN rakip/ilham kaynağı
  - %95 photography cost savings iddiası
  - 6000+ restoran kullanıyor
- **Özellik:** Consistent brand style, delivery app integration

### Flair.ai
- **Link:** flair.ai
- **Ne yapıyor:** Drag & drop props ile dijital sahne oluşturma, AI ile canlandırma
- **Bizim için ne işe yarar:**
  - Prop/asset sistemi UX ilhamı
  - Scene staging konsepti

### Claid.ai
- **Link:** claid.ai
- **Ne yapıyor:** AI background generation, scene placement, color correction
- **Bizim için ne işe yarar:**
  - %19 conversion uplift, %90 maliyet düşüşü rakamları
  - Benchmark

---

## Özet: Öncelik Sıralaması

| # | Proje/Yaklaşım | Bizim Sistemle İlişkisi |
|---|----------------|------------------------|
| **1** | n8n Telegram Approval Workflow | Neredeyse aynı konsept - referans mimari |
| **2** | ComfyUI Scene Composer | Senaryo/kompozisyon modüler yapısına ilham |
| **3** | FlavorGraph / KitcheNette | Beverage rules için veri tabanlı eşleştirme |
| **4** | Shopify Product Taxonomy | Asset tag sistemi için standart |
| **5** | Banks / PromptOps | Prompt template versiyonlama |
| **6** | Grule / Matcher | Asset scoring rule engine |
| **7** | LangGraph | Orchestrator geliştirme |
| **8** | ConsisLoRA | Tema bazlı stil tutarlılığı |
| **9** | AGFSync | Kalite kontrol feedback loop |
| **10** | FoodShot AI | Ticari rakip/benchmark |

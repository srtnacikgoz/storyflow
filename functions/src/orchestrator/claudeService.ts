/**
 * Claude AI Service
 * Full Orchestrator için Claude entegrasyonu
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlock } from "@anthropic-ai/sdk/resources/messages";
import {
  Asset,
  AssetSelection,
  ScenarioSelection,
  QualityControlResult,
  ContentPackage,
  ClaudeResponse,
  ProductType,
  EffectiveRules,
  HandStyleId,
} from "./types";

// Lazy load Anthropic SDK
let anthropicClient: Anthropic | null = null;

/**
 * Claude Service
 */
export class ClaudeService {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "claude-sonnet-4-20250514") {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Lazy client initialization
   */
  private getClient(): Anthropic {
    if (!anthropicClient) {
      anthropicClient = new Anthropic({ apiKey: this.apiKey });
    }
    return anthropicClient;
  }

  /**
   * Token maliyeti hesapla (yaklaşık)
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Claude Sonnet 4 fiyatlandırması (yaklaşık)
    const inputCost = (inputTokens / 1000) * 0.003;
    const outputCost = (outputTokens / 1000) * 0.015;
    return inputCost + outputCost;
  }

  // ==========================================
  // 1. ASSET SELECTION
  // ==========================================

  /**
   * En uygun asset kombinasyonunu seç (genişletilmiş - tüm asset tipleri)
   */
  async selectAssets(
    productType: ProductType,
    availableAssets: {
      products: Asset[];
      plates: Asset[];
      cups: Asset[];
      tables: Asset[];
      decor: Asset[];
      pets: Asset[];
      environments: Asset[];
    },
    timeOfDay: string,
    mood: string,
    effectiveRules?: EffectiveRules
  ): Promise<ClaudeResponse<AssetSelection>> {
    const client = this.getClient();

    // Köpek dahil edilmeli mi?
    const shouldIncludePet = effectiveRules?.shouldIncludePet || false;
    const blockedTables = effectiveRules?.blockedTables || [];

    const systemPrompt = `Sen bir görsel içerik direktörüsün. Sade Patisserie için Instagram içerikleri hazırlıyorsun.

Görevin: Verilen asset listelerinden en uyumlu kombinasyonu seç.

Seçim kriterleri:
1. RENK UYUMU: Ürün, tabak ve masa renkleri uyumlu olmalı
2. STİL TUTARLILIĞI: Modern/rustic/minimal tarzlar karışmamalı
3. ZAMAN UYUMU: Sabah için aydınlık, akşam için sıcak tonlar
4. KULLANIM ROTASYONU: Az kullanılmış asset'lere öncelik ver
5. ÇEŞİTLİLİK: ${blockedTables.length > 0 ? `Bu masaları SEÇME (son kullanılmış): ${blockedTables.join(", ")}` : "Masaları rotasyonla kullan"}
6. KÖPEK: ${shouldIncludePet ? "Bu sefer KÖPEK DAHİL ET (uygun senaryo için)" : "Köpek dahil etme"}
7. DEKORASYON: Cozy senaryolarda bitki veya kitap eklenebilir

JSON formatında yanıt ver.`;

    const userPrompt = `
Ürün tipi: ${productType}
Zaman: ${timeOfDay}
Mood: ${mood}
${shouldIncludePet ? "⭐ KÖPEK DAHİL ET (15 üretimdir köpek yok)" : ""}

MEVCUT ASSET'LER:

ÜRÜNLER:
${JSON.stringify(availableAssets.products.map((a: Asset) => ({
      id: a.id,
      filename: a.filename,
      colors: a.visualProperties?.dominantColors,
      style: a.visualProperties?.style,
      usageCount: a.usageCount,
      tags: a.tags
    })), null, 2)}

TABAKLAR:
${JSON.stringify(availableAssets.plates.map((a: Asset) => ({
      id: a.id,
      filename: a.filename,
      colors: a.visualProperties?.dominantColors,
      material: a.visualProperties?.material,
      style: a.visualProperties?.style,
      usageCount: a.usageCount
    })), null, 2)}

FİNCANLAR:
${JSON.stringify(availableAssets.cups.map((a: Asset) => ({
      id: a.id,
      filename: a.filename,
      colors: a.visualProperties?.dominantColors,
      style: a.visualProperties?.style,
      usageCount: a.usageCount
    })), null, 2)}

MASALAR:
${JSON.stringify(availableAssets.tables.map((a: Asset) => ({
      id: a.id,
      filename: a.filename,
      material: a.visualProperties?.material,
      style: a.visualProperties?.style,
      usageCount: a.usageCount
    })), null, 2)}

DEKORASYON (bitki, kitap, vb.):
${JSON.stringify(availableAssets.decor.map((a: Asset) => ({
      id: a.id,
      filename: a.filename,
      style: a.visualProperties?.style,
      tags: a.tags,
      usageCount: a.usageCount
    })), null, 2)}

EVCİL HAYVANLAR:
${JSON.stringify(availableAssets.pets.map((a: Asset) => ({
      id: a.id,
      filename: a.filename,
      tags: a.tags,
      usageCount: a.usageCount
    })), null, 2)}

MEKAN/ORTAM:
${JSON.stringify(availableAssets.environments.map((a: Asset) => ({
      id: a.id,
      filename: a.filename,
      tags: a.tags,
      usageCount: a.usageCount
    })), null, 2)}

Yanıt formatı:
{
  "productId": "...",
  "plateId": "..." veya null,
  "cupId": "..." veya null,
  "tableId": "..." veya null,
  "decorId": "..." veya null,
  "petId": "..." veya null (${shouldIncludePet ? "KÖPEK SEÇ!" : "null bırak"}),
  "environmentId": "..." veya null,
  "reasoning": "Seçim gerekçesi...",
  "petReason": "${shouldIncludePet ? "Neden bu köpek seçildi..." : "Neden köpek dahil edilmedi..."}"
}`;

    try {
      const response = await client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const textContent = response.content.find((c: ContentBlock) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("Claude yanıtında metin bulunamadı");
      }

      // JSON parse
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Claude yanıtında JSON bulunamadı");
      }

      const selection = JSON.parse(jsonMatch[0]);

      // Asset'leri bul (genişletilmiş)
      const product = availableAssets.products.find((a: Asset) => a.id === selection.productId);
      const plate = selection.plateId ? availableAssets.plates.find((a: Asset) => a.id === selection.plateId) : undefined;
      const cup = selection.cupId ? availableAssets.cups.find((a: Asset) => a.id === selection.cupId) : undefined;
      const table = selection.tableId ? availableAssets.tables.find((a: Asset) => a.id === selection.tableId) : undefined;
      const decor = selection.decorId ? availableAssets.decor.find((a: Asset) => a.id === selection.decorId) : undefined;
      const pet = selection.petId ? availableAssets.pets.find((a: Asset) => a.id === selection.petId) : undefined;
      const environment = selection.environmentId ? availableAssets.environments.find((a: Asset) => a.id === selection.environmentId) : undefined;

      if (!product) {
        throw new Error("Seçilen ürün bulunamadı");
      }

      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

      return {
        success: true,
        data: {
          product,
          plate,
          cup,
          table,
          decor,
          pet,
          environment,
          selectionReasoning: selection.reasoning,
          includesPet: !!pet,
          petReason: selection.petReason,
        },
        tokensUsed,
        cost: this.calculateCost(response.usage.input_tokens, response.usage.output_tokens),
      };
    } catch (error) {
      console.error("[ClaudeService] Asset selection error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        tokensUsed: 0,
        cost: 0,
      };
    }
  }

  // ==========================================
  // 2. SCENARIO SELECTION
  // ==========================================

  /**
   * En uygun senaryoyu seç (çeşitlilik kuralları ile)
   */
  async selectScenario(
    productType: ProductType,
    timeOfDay: string,
    selectedAssets: AssetSelection,
    availableScenarios: Array<{ id: string; name: string; description: string; includesHands: boolean }>,
    effectiveRules?: EffectiveRules
  ): Promise<ClaudeResponse<ScenarioSelection>> {
    const client = this.getClient();

    // Çeşitlilik kurallarını al
    const blockedHandStyles = effectiveRules?.blockedHandStyles || [];
    const blockedCompositions = effectiveRules?.blockedCompositions || [];
    const handStyles = effectiveRules?.staticRules.handStyles || [];
    const shouldIncludePet = effectiveRules?.shouldIncludePet || false;

    // Kullanılabilir el stilleri (bloklanmamış olanlar)
    const availableHandStyles = handStyles.filter(hs => !blockedHandStyles.includes(hs.id));

    const systemPrompt = `Sen bir içerik stratejistisin. Instagram için en etkili senaryoyu seçiyorsun.

Seçim kriterleri:
1. ÜRÜN UYUMU: Senaryo ürün tipine uygun olmalı
2. ZAMAN UYUMU: Sabah senaryoları sabah için, akşam senaryoları akşam için
3. ASSET UYUMU: Seçilen masa/tabak/fincan senaryoya uymalı
4. ÇEŞİTLİLİK: Son paylaşımlardan FARKLI senaryo ve kompozisyon seç
5. ETKİLEŞİM: Yüksek etkileşim potansiyeli olan senaryolar öncelikli
6. KÖPEK: ${shouldIncludePet ? "Köpek dahil edildi, KÖPEK UYUMLU senaryo seç (kahve-kosesi, yarim-kaldi, cam-kenari)" : "Köpek yok, herhangi senaryo uygun"}

ÖNEMLİ ÇEŞİTLİLİK KURALLARI:
- ${blockedHandStyles.length > 0 ? `Bu el stillerini KULLANMA (son kullanılmış): ${blockedHandStyles.join(", ")}` : "Tüm el stilleri kullanılabilir"}
- ${blockedCompositions.length > 0 ? `Bu kompozisyonları KULLANMA (son kullanılmış): ${blockedCompositions.join(", ")}` : "Tüm kompozisyonlar kullanılabilir"}

JSON formatında yanıt ver.`;

    const userPrompt = `
Ürün: ${productType}
Zaman: ${timeOfDay}
${shouldIncludePet ? "⭐ KÖPEK SEÇİLDİ - Köpek uyumlu senaryo seç!" : ""}

Seçilen Asset'ler:
- Ürün: ${selectedAssets.product.filename} (stil: ${selectedAssets.product.visualProperties?.style})
- Tabak: ${selectedAssets.plate?.filename || "yok"}
- Fincan: ${selectedAssets.cup?.filename || "yok"}
- Masa: ${selectedAssets.table?.filename} (malzeme: ${selectedAssets.table?.visualProperties?.material})
- Dekorasyon: ${selectedAssets.decor?.filename || "yok"}
- Köpek: ${selectedAssets.pet?.filename || "yok"}

MEVCUT SENARYOLAR:
${JSON.stringify(availableScenarios, null, 2)}

KULLANILABILIR EL STİLLERİ (el içeren senaryo seçersen bunlardan birini seç):
${JSON.stringify(availableHandStyles.map(hs => ({
  id: hs.id,
  name: hs.name,
  description: hs.description,
  nailPolish: hs.nailPolish,
  accessories: hs.accessories
})), null, 2)}

Yanıt formatı:
{
  "scenarioId": "...",
  "reasoning": "Neden bu senaryo...",
  "handStyle": "${availableHandStyles.length > 0 ? availableHandStyles.map(h => h.id).join('" | "') : "null"}" veya null (el yoksa),
  "compositionId": "bottom-right | bottom-left | top-corner | center-hold | product-front | overhead | ..." (senaryo varyantı),
  "compositionNotes": "Kompozisyon için özel notlar..."
}`;

    try {
      const response = await client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const textContent = response.content.find((c: ContentBlock) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("Claude yanıtında metin bulunamadı");
      }

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Claude yanıtında JSON bulunamadı");
      }

      const selection = JSON.parse(jsonMatch[0]);
      const scenario = availableScenarios.find(s => s.id === selection.scenarioId);

      if (!scenario) {
        throw new Error("Seçilen senaryo bulunamadı");
      }

      // El stili detaylarını bul (varsa)
      const selectedHandStyle = selection.handStyle
        ? handStyles.find(hs => hs.id === selection.handStyle)
        : undefined;

      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

      return {
        success: true,
        data: {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          reasoning: selection.reasoning,
          includesHands: scenario.includesHands,
          handStyle: selection.handStyle as HandStyleId || undefined,
          handStyleDetails: selectedHandStyle,
          compositionId: selection.compositionId || "default",
          composition: selection.compositionNotes,
        },
        tokensUsed,
        cost: this.calculateCost(response.usage.input_tokens, response.usage.output_tokens),
      };
    } catch (error) {
      console.error("[ClaudeService] Scenario selection error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        tokensUsed: 0,
        cost: 0,
      };
    }
  }

  // ==========================================
  // 3. QUALITY CONTROL
  // ==========================================

  /**
   * Üretilen görseli değerlendir (duplikasyon kontrolü dahil)
   */
  async evaluateImage(
    imageBase64: string,
    mimeType: string,
    expectedScenario: ScenarioSelection,
    originalProduct: Asset
  ): Promise<ClaudeResponse<QualityControlResult>> {
    const client = this.getClient();

    const systemPrompt = `Sen bir görsel kalite kontrol uzmanısın. Üretilen görseli değerlendir.

Değerlendirme kriterleri (her biri 1-10):
1. ÜRÜN DOĞRULUĞU: Orijinal ürüne ne kadar sadık?
2. KOMPOZİSYON: Çerçeveleme, denge, boşluk kullanımı
3. IŞIK: Doğal mı, sıcak mı, Instagram'a uygun mu?
4. GERÇEKÇİLİK: Yapay görünüyor mu, gerçek fotoğraf gibi mi?
5. INSTAGRAM HAZIRLIĞI: Direkt paylaşılabilir mi?

⚠️ KRİTİK DUPLİKASYON KONTROLÜ:
- Görselde BİRDEN FAZLA AYNI ÜRÜN var mı? (2 kruvasan, 2 pasta, vb.)
- Görselde BİRDEN FAZLA FİNCAN/BARDAK var mı?
- Görselde BİRDEN FAZLA TABAK var mı?

Duplikasyon tespit edilirse: overallScore = 0, shouldRegenerate = true

Minimum geçme skoru: 7/10 (ortalama)

JSON formatında yanıt ver.`;

    const userPrompt = `
Beklenen senaryo: ${expectedScenario.scenarioName}
Kompozisyon: ${expectedScenario.composition}
El var mı: ${expectedScenario.includesHands ? "Evet - " + expectedScenario.handStyle : "Hayır"}

Orijinal ürün: ${originalProduct.filename}
Ürün renkleri: ${originalProduct.visualProperties?.dominantColors?.join(", ")}

⚠️ ÖNCELİKLİ KONTROL - DUPLİKASYON:
1. Görselde kaç adet ana ürün (pasta/kruvasan/çikolata) var? (SADECE 1 OLMALI)
2. Görselde kaç adet kahve fincanı/bardak var? (SADECE 1 OLMALI veya HİÇ)
3. Görselde kaç adet tabak var? (SADECE 1 OLMALI)

Eğer herhangi birinden birden fazla varsa, bu KRİTİK HATA'dır!

Görseli değerlendir ve JSON formatında yanıt ver:
{
  "productAccuracy": 1-10,
  "composition": 1-10,
  "lighting": 1-10,
  "realism": 1-10,
  "instagramReadiness": 1-10,
  "overallScore": 1-10 (duplikasyon varsa 0),
  "duplicateCheck": {
    "productCount": sayı (1 olmalı),
    "cupCount": sayı (0 veya 1 olmalı),
    "plateCount": sayı (1 olmalı),
    "hasDuplication": true/false
  },
  "feedback": "Genel değerlendirme...",
  "issues": ["sorun1", "sorun2"] veya [],
  "shouldRegenerate": true/false (duplikasyon varsa MUTLAKA true),
  "regenerationHints": "Eğer yeniden üretilecekse, ne değişmeli... (duplikasyon varsa: ONLY ONE product, ONLY ONE cup)"
}`;

    try {
      const response = await client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                media_type: mimeType as any,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        }],
      });

      const textContent = response.content.find((c: ContentBlock) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("Claude yanıtında metin bulunamadı");
      }

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Claude yanıtında JSON bulunamadı");
      }

      const evaluation = JSON.parse(jsonMatch[0]);
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

      // Duplikasyon kontrolü
      const hasDuplication = evaluation.duplicateCheck?.hasDuplication ||
        (evaluation.duplicateCheck?.productCount > 1) ||
        (evaluation.duplicateCheck?.cupCount > 1) ||
        (evaluation.duplicateCheck?.plateCount > 1);

      // Duplikasyon varsa otomatik olarak fail et
      const finalScore = hasDuplication ? 0 : evaluation.overallScore;
      const shouldRegenerate = hasDuplication || evaluation.shouldRegenerate;

      // Duplikasyon uyarısını issues'a ekle
      const issues = [...(evaluation.issues || [])];
      if (hasDuplication) {
        if (evaluation.duplicateCheck?.productCount > 1) {
          issues.unshift(`KRİTİK: ${evaluation.duplicateCheck.productCount} adet ürün tespit edildi (1 olmalı)`);
        }
        if (evaluation.duplicateCheck?.cupCount > 1) {
          issues.unshift(`KRİTİK: ${evaluation.duplicateCheck.cupCount} adet fincan tespit edildi (max 1 olmalı)`);
        }
        if (evaluation.duplicateCheck?.plateCount > 1) {
          issues.unshift(`KRİTİK: ${evaluation.duplicateCheck.plateCount} adet tabak tespit edildi (1 olmalı)`);
        }
      }

      // Regeneration hints güncelle
      let regenerationHints = evaluation.regenerationHints || "";
      if (hasDuplication && !regenerationHints.includes("ONLY ONE")) {
        regenerationHints = "CRITICAL: ONLY ONE product, ONLY ONE cup, ONLY ONE plate. NO duplicates. " + regenerationHints;
      }

      console.log(`[ClaudeService] QC Result - Score: ${finalScore}, Duplication: ${hasDuplication}, Regenerate: ${shouldRegenerate}`);

      return {
        success: true,
        data: {
          passed: finalScore >= 7 && !hasDuplication,
          score: finalScore,
          evaluation: {
            productAccuracy: evaluation.productAccuracy,
            composition: evaluation.composition,
            lighting: evaluation.lighting,
            realism: evaluation.realism,
            instagramReadiness: evaluation.instagramReadiness,
          },
          feedback: hasDuplication
            ? `DUPLİKASYON TESPİT EDİLDİ! ${evaluation.feedback}`
            : evaluation.feedback,
          improvementSuggestions: issues,
          shouldRegenerate,
          regenerationHints,
        },
        tokensUsed,
        cost: this.calculateCost(response.usage.input_tokens, response.usage.output_tokens),
      };
    } catch (error) {
      console.error("[ClaudeService] Quality control error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        tokensUsed: 0,
        cost: 0,
      };
    }
  }

  // ==========================================
  // 4. CAPTION & CONTENT GENERATION
  // ==========================================

  /**
   * Caption ve hashtag oluştur
   */
  async generateContent(
    productType: ProductType,
    scenario: ScenarioSelection,
    timeOfDay: string
  ): Promise<ClaudeResponse<ContentPackage>> {
    const client = this.getClient();

    const systemPrompt = `Sen Sade Patisserie'nin sosyal medya yazarısın.

Marka tonu:
- Samimi ama profesyonel
- Türkçe, günlük dil
- Emoji kullanımı minimal ve zarif
- Çağrı içeren ama baskıcı olmayan

Caption kuralları:
- Maximum 150 karakter
- İlk satır dikkat çekici
- Lokasyon ipucu verebilir (Antalya)
- Ürün adı geçebilir ama zorunlu değil

Hashtag kuralları:
- 5-8 hashtag
- #sadepatisserie her zaman dahil
- #antalya veya #antalyacafe dahil
- Ürüne özel hashtagler
- Trend hashtagler

JSON formatında yanıt ver.`;

    const userPrompt = `
Ürün: ${productType}
Senaryo: ${scenario.scenarioName}
Zaman: ${timeOfDay}
El var mı: ${scenario.includesHands ? "Evet" : "Hayır"}

3 farklı caption alternatifi ve hashtag listesi oluştur:
{
  "captions": [
    "caption 1...",
    "caption 2...",
    "caption 3..."
  ],
  "hashtags": ["#sadepatisserie", "#antalya", ...]
}`;

    try {
      const response = await client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const textContent = response.content.find((c: ContentBlock) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("Claude yanıtında metin bulunamadı");
      }

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Claude yanıtında JSON bulunamadı");
      }

      const content = JSON.parse(jsonMatch[0]);
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

      return {
        success: true,
        data: {
          caption: content.captions[0],
          captionAlternatives: content.captions.slice(1),
          hashtags: content.hashtags,
          // musicSuggestion kaldırıldı
          generatedAt: Date.now(),
        },
        tokensUsed,
        cost: this.calculateCost(response.usage.input_tokens, response.usage.output_tokens),
      };
    } catch (error) {
      console.error("[ClaudeService] Content generation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        tokensUsed: 0,
        cost: 0,
      };
    }
  }

  // ==========================================
  // 5. PROMPT OPTIMIZATION
  // ==========================================

  /**
   * Senaryo prompt'unu optimize et
   */
  async optimizePrompt(
    basePrompt: string,
    scenario: ScenarioSelection,
    assets: AssetSelection
  ): Promise<ClaudeResponse<{ optimizedPrompt: string; negativePrompt: string; customizations: string[] }>> {
    const client = this.getClient();

    const systemPrompt = `Sen bir AI görsel üretimi uzmanısın. Gemini Pro için prompt optimize ediyorsun.

Optimizasyon kuralları:
1. Asset özelliklerini prompt'a dahil et (renk, malzeme, stil)
2. Senaryo gereksinimlerini güçlendir
3. ZORUNLU KURAL: Referans assetler ve senaryo dışında HİÇBİR EŞYA (abajur, vazo, çiçek, sandalye vb.) EKLEME. Minimalist kal.
4. Sadece "Asset" listesinde verilen eşyaları kullan.
5. Negative prompt'u güçlendir (özellikle "lampshade", "vase", "flowers", "clutter" ekle).

Kısa ve etkili ol.`;

    const userPrompt = `
BASE PROMPT:
${basePrompt}

SENARYO:
${scenario.scenarioName}
Kompozisyon: ${scenario.composition}
El stili: ${scenario.handStyle || "yok"}

ASSET'LER:
- Ürün renkleri: ${assets.product.visualProperties?.dominantColors?.join(", ")}
- Tabak: ${assets.plate?.visualProperties?.material || "belirtilmemiş"}
- Masa: ${assets.table?.visualProperties?.material || "belirtilmemiş"}, ${assets.table?.visualProperties?.style || ""}

Prompt'u optimize et:
{
  "optimizedPrompt": "...",
  "negativePrompt": "...",
  "customizations": ["eklenen detay 1", "eklenen detay 2"]
}`;

    try {
      const response = await client.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const textContent = response.content.find((c: ContentBlock) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("Claude yanıtında metin bulunamadı");
      }

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Claude yanıtında JSON bulunamadı");
      }

      const result = JSON.parse(jsonMatch[0]);
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

      return {
        success: true,
        data: {
          optimizedPrompt: result.optimizedPrompt,
          negativePrompt: result.negativePrompt,
          customizations: result.customizations,
        },
        tokensUsed,
        cost: this.calculateCost(response.usage.input_tokens, response.usage.output_tokens),
      };
    } catch (error) {
      console.error("[ClaudeService] Prompt optimization error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        tokensUsed: 0,
        cost: 0,
      };
    }
  }
}

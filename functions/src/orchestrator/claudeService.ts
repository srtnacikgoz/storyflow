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
import { getCompactTrainingContext } from "./promptTrainingService";
import { AILogService } from "../services/aiLogService";
import { AILogStage } from "../types";
import { getSystemSettings } from "../services/configService";

// Lazy load Anthropic SDK
let anthropicClient: Anthropic | null = null;

/**
 * Claude Service
 */
export class ClaudeService {
  private apiKey: string;
  private model: string;

  // Pipeline context for logging
  private pipelineContext: {
    pipelineId?: string;
    slotId?: string;
    productType?: string;
  } = {};

  constructor(apiKey: string, model: string = "claude-sonnet-4-20250514") {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Pipeline context'i ayarla (loglama için)
   */
  setPipelineContext(context: {
    pipelineId?: string;
    slotId?: string;
    productType?: string;
  }): void {
    this.pipelineContext = context;
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
   * Token maliyeti hesapla (config'den okunan değerlerle)
   * Maliyet oranları runtime'da değiştirilebilir
   */
  private async calculateCost(inputTokens: number, outputTokens: number): Promise<number> {
    const settings = await getSystemSettings();
    const inputCost = (inputTokens / 1000) * settings.claudeInputCostPer1K;
    const outputCost = (outputTokens / 1000) * settings.claudeOutputCostPer1K;
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
      accessories: Asset[];
      napkins: Asset[];
      cutlery: Asset[];
    },
    timeOfDay: string,
    mood: string,
    effectiveRules?: EffectiveRules
  ): Promise<ClaudeResponse<AssetSelection>> {
    const client = this.getClient();

    // Çeşitlilik kurallarını çıkar
    const shouldIncludePet = effectiveRules?.shouldIncludePet || false;
    let blockedTables = effectiveRules?.blockedTables || [];
    let blockedProducts = effectiveRules?.blockedProducts || [];
    let blockedPlates = effectiveRules?.blockedPlates || [];
    let blockedCups = effectiveRules?.blockedCups || [];

    // Bloklamadan sonra seçenek kalıp kalmadığını kontrol et
    // Kalmazsa bloklama yapma (edge case: tek ürün var ve o da bloklu)
    const availableProductIds = availableAssets.products.map((a: Asset) => a.id);
    const remainingProducts = availableProductIds.filter(id => !blockedProducts.includes(id));
    if (remainingProducts.length === 0 && availableProductIds.length > 0) {
      console.log(`[ClaudeService] Tüm ürünler bloklu, bloklama kaldırılıyor. Bloklu: [${blockedProducts.join(", ")}], Mevcut: [${availableProductIds.join(", ")}]`);
      blockedProducts = [];
    }

    // Aynı kontrolü tabak, fincan ve masa için de yap
    const availablePlateIds = availableAssets.plates.map((a: Asset) => a.id);
    const remainingPlates = availablePlateIds.filter(id => !blockedPlates.includes(id));
    if (remainingPlates.length === 0 && availablePlateIds.length > 0) {
      console.log(`[ClaudeService] Tüm tabaklar bloklu, bloklama kaldırılıyor.`);
      blockedPlates = [];
    }

    const availableCupIds = availableAssets.cups.map((a: Asset) => a.id);
    const remainingCups = availableCupIds.filter(id => !blockedCups.includes(id));
    if (remainingCups.length === 0 && availableCupIds.length > 0) {
      console.log(`[ClaudeService] Tüm fincanlar bloklu, bloklama kaldırılıyor.`);
      blockedCups = [];
    }

    const availableTableIds = availableAssets.tables.map((a: Asset) => a.id);
    const remainingTables = availableTableIds.filter(id => !blockedTables.includes(id));
    if (remainingTables.length === 0 && availableTableIds.length > 0) {
      console.log(`[ClaudeService] Tüm masalar bloklu, bloklama kaldırılıyor.`);
      blockedTables = [];
    }

    // Mood bazlı asset seçim kuralları
    const moodGuidelines: Record<string, string> = {
      energetic: "PARLAK ve CANLI renkler seç. Mermer masalar, metal çatallar tercih et. Taze meyveli ürünlerle uyumlu.",
      social: "ÇOKLU ürün yerleşimine uygun geniş tabaklar. İki fincan seçilebilir. Paylaşım atmosferi.",
      relaxed: "MİNİMAL seçim. Tek ürün odaklı, az aksesuar. Yumuşak, pastel tonlar. Sakin his.",
      warm: "SICAK TONLAR: Ahşap masalar, kahverengi/turuncu detaylar. Çikolatalı/karamelli ürünlerle uyumlu.",
      cozy: "SAMİMİ his: Seramik fincanlar, tekstil peçete dahil et. Yakın, ev sıcaklığı.",
      balanced: "DENGELI ve NÖTR: Standart sunum, off-white tonlar, simetrik düzen.",
    };
    const moodRule = moodGuidelines[mood] || moodGuidelines.balanced;

    const systemPrompt = `Sen bir görsel içerik direktörüsün. Sade Patisserie için Instagram içerikleri hazırlıyorsun.

Görevin: Verilen asset listelerinden en uyumlu kombinasyonu seç.

🎨 MOOD KURALI (${mood.toUpperCase()}):
${moodRule}

Seçim kriterleri:
1. RENK UYUMU: Ürün, tabak ve masa renkleri uyumlu olmalı
2. STİL TUTARLILIĞI: Modern/rustic/minimal tarzlar karışmamalı
3. MOOD UYUMU: Yukarıdaki mood kuralına göre asset seç
4. KULLANIM ROTASYONU: Az kullanılmış asset'lere öncelik ver

${[
      blockedProducts.length > 0 ? `⚠️ BLOKLANMIŞ ÜRÜNLER (SEÇME): ${blockedProducts.join(", ")}` : "",
      blockedPlates.length > 0 ? `⚠️ BLOKLANMIŞ TABAKLAR (SEÇME): ${blockedPlates.join(", ")}` : "",
      blockedCups.length > 0 ? `⚠️ BLOKLANMIŞ FİNCANLAR (SEÇME): ${blockedCups.join(", ")}` : "",
      blockedTables.length > 0 ? `⚠️ BLOKLANMIŞ MASALAR (SEÇME): ${blockedTables.join(", ")}` : "",
    ].filter(Boolean).join("\n")}

5. KÖPEK: ${shouldIncludePet ? "Bu sefer KÖPEK DAHİL ET (listeden seç)" : "Köpek dahil etme"}
6. DEKORASYON: Listede varsa uygun dekorasyon seçilebilir
7. AKSESUAR: Listede varsa uygun aksesuar seçilebilir (opsiyonel)
8. FİNCAN: Seramik/cam tercih et, karton bardak seçme
9. PEÇETE: Listede varsa seçilebilir (opsiyonel)
10. ÇATAL-BIÇAK: Listede varsa seçilebilir, ürün yeme şekline uygun olmalı

⚠️ SADECE LİSTEDE OLAN ASSET'LERİ SEÇ - hayal etme, uydurma!

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
      material: a.visualProperties?.material,
      style: a.visualProperties?.style,
      usageCount: a.usageCount,
      tags: a.tags
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

AKSESUARLAR (telefon, çanta, anahtar, kitap vb. - gerçekçi pastane deneyimi için):
${availableAssets.accessories.length > 0 ? JSON.stringify(availableAssets.accessories.map((a: Asset) => ({
      id: a.id,
      filename: a.filename,
      subType: a.subType,
      tags: a.tags,
      usageCount: a.usageCount
    })), null, 2) : "YOK (aksesuar asset'i eklenmemiş)"}

PEÇETELER (masa süslemesi için):
${availableAssets.napkins.length > 0 ? JSON.stringify(availableAssets.napkins.map((a: Asset) => ({
      id: a.id,
      filename: a.filename,
      colors: a.visualProperties?.dominantColors,
      material: a.visualProperties?.material,
      usageCount: a.usageCount
    })), null, 2) : "YOK (peçete asset'i eklenmemiş)"}

ÇATAL-BIÇAK (servis için):
${availableAssets.cutlery.length > 0 ? JSON.stringify(availableAssets.cutlery.map((a: Asset) => ({
      id: a.id,
      filename: a.filename,
      material: a.visualProperties?.material,
      style: a.visualProperties?.style,
      usageCount: a.usageCount
    })), null, 2) : "YOK (çatal-bıçak asset'i eklenmemiş)"}

⚠️ ÖNEMLİ: productId ZORUNLUDUR - yukarıdaki ÜRÜNLER listesinden bir ID seçmelisin!

Yanıt formatı (SADECE JSON, başka açıklama yazma):
{
  "productId": "ZORUNLU - ÜRÜNLER listesindeki id'lerden birini yaz",
  "plateId": "id veya null",
  "cupId": "id veya null",
  "tableId": "id veya null",
  "decorId": "id veya null",
  "petId": "${shouldIncludePet ? "KÖPEK SEÇ - PETS listesinden id" : "null"}",
  "environmentId": "id veya null",
  "accessoryId": "id veya null (sahneye uygunsa AKSESUARLAR listesinden seç)",
  "napkinId": "id veya null (sofra düzeni için PEÇETELER listesinden seç)",
  "cutleryId": "id veya null (servis için ÇATAL-BIÇAK listesinden seç)",
  "reasoning": "Seçim gerekçesi",
  "petReason": "${shouldIncludePet ? "Köpek seçim nedeni" : "Köpek neden dahil edilmedi"}",
  "accessoryReason": "Aksesuar neden dahil edildi/edilmedi"
}`;

    const startTime = Date.now();

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
      let product = availableAssets.products.find((a: Asset) => a.id === selection.productId);

      // Fallback: Claude geçersiz ID döndürdüyse ve ürün varsa, ilkini kullan
      if (!product && availableAssets.products.length > 0) {
        console.warn(`[ClaudeService] Claude geçersiz productId döndürdü: ${selection.productId}. İlk ürün kullanılıyor.`);
        product = availableAssets.products[0];
      }

      const plate = selection.plateId ? availableAssets.plates.find((a: Asset) => a.id === selection.plateId) : undefined;
      const cup = selection.cupId ? availableAssets.cups.find((a: Asset) => a.id === selection.cupId) : undefined;
      const table = selection.tableId ? availableAssets.tables.find((a: Asset) => a.id === selection.tableId) : undefined;
      const decor = selection.decorId ? availableAssets.decor.find((a: Asset) => a.id === selection.decorId) : undefined;
      const pet = selection.petId ? availableAssets.pets.find((a: Asset) => a.id === selection.petId) : undefined;
      const environment = selection.environmentId ? availableAssets.environments.find((a: Asset) => a.id === selection.environmentId) : undefined;
      const accessory = selection.accessoryId ? availableAssets.accessories.find((a: Asset) => a.id === selection.accessoryId) : undefined;
      const napkin = selection.napkinId ? availableAssets.napkins.find((a: Asset) => a.id === selection.napkinId) : undefined;
      const cutlery = selection.cutleryId ? availableAssets.cutlery.find((a: Asset) => a.id === selection.cutleryId) : undefined;

      if (!product) {
        // Detaylı hata logu - Claude'un ne döndürdüğünü vs mevcut ID'leri göster
        const availableIds = availableAssets.products.map((a: Asset) => a.id);
        console.error(`[ClaudeService] Product mismatch - Claude returned: "${selection.productId}", Available IDs: [${availableIds.join(", ")}]`);
        console.error(`[ClaudeService] Full Claude response: ${JSON.stringify(selection)}`);
        throw new Error(`Seçilen ürün bulunamadı. Claude ID: ${selection.productId}, Mevcut: ${availableIds.join(", ")}`);
      }

      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
      const cost = await this.calculateCost(response.usage.input_tokens, response.usage.output_tokens);
      const durationMs = Date.now() - startTime;

      // AI Log kaydet
      await AILogService.logClaude("asset-selection" as AILogStage, {
        model: this.model,
        systemPrompt,
        userPrompt,
        response: textContent.text,
        responseData: selection,
        status: "success",
        tokensUsed,
        cost,
        durationMs,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
        productType: productType,
      });

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
          accessory,
          napkin,
          cutlery,
          selectionReasoning: selection.reasoning,
          includesPet: !!pet,
          petReason: selection.petReason,
          includesAccessory: !!accessory,
          accessoryReason: selection.accessoryReason,
        },
        tokensUsed,
        cost,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error("[ClaudeService] Asset selection error:", error);

      // Hata logla
      await AILogService.logClaude("asset-selection" as AILogStage, {
        model: this.model,
        systemPrompt,
        userPrompt,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
        productType: productType,
      });

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
    effectiveRules?: EffectiveRules,
    feedbackHints?: string // Kullanıcı geri bildirimlerinden elde edilen ipuçları
  ): Promise<ClaudeResponse<ScenarioSelection>> {
    // Erken hata kontrolü: Hiç senaryo yoksa hemen hata döndür
    if (!availableScenarios || availableScenarios.length === 0) {
      console.error("[ClaudeService] HATA: selectScenario'ya boş senaryo listesi gönderildi!");
      return {
        success: false,
        error: "Senaryo listesi boş. Lütfen sistemde en az bir senaryo tanımlı olduğundan emin olun.",
        tokensUsed: 0,
        cost: 0,
      };
    }

    const client = this.getClient();

    // Çeşitlilik kurallarını al
    const blockedHandStyles = effectiveRules?.blockedHandStyles || [];
    const blockedCompositions = effectiveRules?.blockedCompositions || [];
    const handStyles = effectiveRules?.staticRules.handStyles || [];
    const shouldIncludePet = effectiveRules?.shouldIncludePet || false;

    // Kullanılabilir el stilleri (bloklanmamış olanlar)
    const availableHandStyles = handStyles.filter(hs => !blockedHandStyles.includes(hs.id));

    // Ürünün elle tutulup tutulamayacağını belirle - el senaryoları için kritik
    // Yeni sistem: canBeHeldByHand boolean alanı
    // Eski sistem (geriye uyumluluk): holdingType === "hand" ise true
    const canUseHandScenarios = selectedAssets.product.canBeHeldByHand !== undefined
      ? selectedAssets.product.canBeHeldByHand
      : (selectedAssets.product.holdingType === "hand" || selectedAssets.product.eatingMethod === "hand");

    // Yeme şekli (servis şekli) - prompt mesajlarında kullanılır
    const productEatingMethod = selectedAssets.product.eatingMethod
      || selectedAssets.product.holdingType
      || "hand";

    // KRİTİK: Eğer el senaryoları kullanılamıyorsa, el içeren senaryoları listeden çıkar
    // Claude'a sadece uygun senaryoları gönder - "seçme" demek yerine listeden kaldır
    let filteredScenarios = availableScenarios;
    if (!canUseHandScenarios) {
      const nonHandScenarios = availableScenarios.filter(s => !s.includesHands);

      // Eğer filtreleme sonrası senaryo kalmazsa, TÜM senaryoları kullan (fallback)
      if (nonHandScenarios.length === 0) {
        console.warn(`[ClaudeService] UYARI: Elle tutulamayan ürün için el içermeyen senaryo bulunamadı. Tüm senaryolar kullanılacak.`);
        console.warn(`[ClaudeService] Ürün: ${selectedAssets.product.filename}, canBeHeldByHand: ${selectedAssets.product.canBeHeldByHand}, eatingMethod: ${productEatingMethod}`);
        // filteredScenarios = availableScenarios olarak kalır (değişiklik yok)
      } else {
        filteredScenarios = nonHandScenarios;
        console.log(`[ClaudeService] Hand scenarios filtered - canBeHeldByHand: ${selectedAssets.product.canBeHeldByHand}, eatingMethod: ${productEatingMethod}, original: ${availableScenarios.length}, filtered: ${filteredScenarios.length}`);
      }
    }

    const systemPrompt = `Sen bir içerik stratejistisin. Instagram için en etkili senaryoyu seçiyorsun.

Seçim kriterleri:
1. ÜRÜN UYUMU: Senaryo ürün tipine uygun olmalı
2. ZAMAN UYUMU: Sabah senaryoları sabah için, akşam senaryoları akşam için
3. ASSET UYUMU: Seçilen masa/tabak/fincan senaryoya uymalı
4. ÇEŞİTLİLİK: Son paylaşımlardan FARKLI senaryo ve kompozisyon seç
5. ETKİLEŞİM: Yüksek etkileşim potansiyeli olan senaryolar öncelikli
6. KÖPEK: ${shouldIncludePet ? "Köpek dahil edildi, KÖPEK UYUMLU senaryo seç (kahve-kosesi, yarim-kaldi, cam-kenari)" : "Köpek yok, herhangi senaryo uygun"}
7. TUTMA ŞEKLİ: ${canUseHandScenarios
      ? "Bu ürün elle tutulabilir - el içeren senaryolar uygundur"
      : `⚠️ KRİTİK: Bu ürün elle tutulamaz (yeme şekli: ${productEatingMethod}) - EL İÇEREN SENARYO SEÇME! Sadece tabakta/servis halinde gösterilmeli.`}

ÖNEMLİ ÇEŞİTLİLİK KURALLARI:
- ${blockedHandStyles.length > 0 ? `Bu el stillerini KULLANMA (son kullanılmış): ${blockedHandStyles.join(", ")}` : "Tüm el stilleri kullanılabilir"}
- ${blockedCompositions.length > 0 ? `Bu kompozisyonları KULLANMA (son kullanılmış): ${blockedCompositions.join(", ")}` : "Tüm kompozisyonlar kullanılabilir"}
${feedbackHints || ""}

JSON formatında yanıt ver.`;

    const userPrompt = `
Ürün: ${productType}
Zaman: ${timeOfDay}
${shouldIncludePet ? "⭐ KÖPEK SEÇİLDİ - Köpek uyumlu senaryo seç!" : ""}

Seçilen Asset'ler:
- Ürün: ${selectedAssets.product.filename} (stil: ${selectedAssets.product.visualProperties?.style}, yeme: ${productEatingMethod}, elle tutulabilir: ${canUseHandScenarios ? "evet" : "hayır"})
- Tabak: ${selectedAssets.plate?.filename || "yok"}
- Fincan: ${selectedAssets.cup?.filename || "yok"}
- Masa: ${selectedAssets.table?.filename} (malzeme: ${selectedAssets.table?.visualProperties?.material})
- Dekorasyon: ${selectedAssets.decor?.filename || "yok"}
- Köpek: ${selectedAssets.pet?.filename || "yok"}
- Aksesuar: ${selectedAssets.accessory ? `${selectedAssets.accessory.subType} - ${selectedAssets.accessory.filename}` : "yok"}

${!canUseHandScenarios ? `⚠️ UYARI: Bu ürün elle tutulamaz (yeme şekli: ${productEatingMethod}) - ${productEatingMethod === "fork" ? "Çatalla" : productEatingMethod === "fork-knife" ? "Çatal-bıçakla" : productEatingMethod === "spoon" ? "Kaşıkla" : "Dokunmadan"} servis edilmeli.` : ""}

MEVCUT SENARYOLAR:
${JSON.stringify(filteredScenarios, null, 2)}

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

    const startTime = Date.now();

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

      // Önce filteredScenarios'da ara (Claude'a gönderilen liste)
      let scenario = filteredScenarios.find(s => s.id === selection.scenarioId);

      // Bulunamazsa, benzer ID ile ara (yazım hatası toleransı)
      if (!scenario) {
        const similarScenario = filteredScenarios.find(s =>
          s.id.toLowerCase() === selection.scenarioId?.toLowerCase() ||
          s.name.toLowerCase().includes(selection.scenarioId?.toLowerCase() || "")
        );
        if (similarScenario) {
          console.warn(`[ClaudeService] Senaryo ID düzeltildi: "${selection.scenarioId}" -> "${similarScenario.id}"`);
          scenario = similarScenario;
        }
      }

      // Hala bulunamazsa, FALLBACK: filteredScenarios'un ilkini seç
      if (!scenario) {
        const availableIds = filteredScenarios.map(s => s.id).join(", ");
        console.error(`[ClaudeService] Claude geçersiz senaryo ID döndürdü: "${selection.scenarioId}". Mevcut ID'ler: ${availableIds}`);

        if (filteredScenarios.length > 0) {
          scenario = filteredScenarios[0];
          console.warn(`[ClaudeService] FALLBACK: İlk senaryo seçildi: "${scenario.id}"`);
        } else {
          throw new Error(`Senaryo bulunamadı. Claude'un seçtiği: "${selection.scenarioId}", Mevcut: ${availableIds}`);
        }
      }

      // El stili detaylarını bul (varsa)
      const selectedHandStyle = selection.handStyle
        ? handStyles.find(hs => hs.id === selection.handStyle)
        : undefined;

      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
      const cost = await this.calculateCost(response.usage.input_tokens, response.usage.output_tokens);
      const durationMs = Date.now() - startTime;

      // AI Log kaydet
      await AILogService.logClaude("scenario-selection" as AILogStage, {
        model: this.model,
        systemPrompt,
        userPrompt,
        response: textContent.text,
        responseData: selection,
        status: "success",
        tokensUsed,
        cost,
        durationMs,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
        productType: productType,
      });

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
        cost,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error("[ClaudeService] Scenario selection error:", error);

      // Hata logla
      await AILogService.logClaude("scenario-selection" as AILogStage, {
        model: this.model,
        systemPrompt,
        userPrompt,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
        productType: productType,
      });

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

⚠️ ÖNCELİKLİ KONTROL - DUPLİKASYON VE ÜST ÜSTE TABAK:
1. Görselde kaç adet ana ürün (pasta/kruvasan/çikolata) var? (SADECE 1 OLMALI)
2. Görselde kaç adet kahve fincanı/bardak var? (SADECE 1 OLMALI veya HİÇ)
3. Görselde kaç adet tabak var? (SADECE 1 OLMALI)
4. ⚠️ KRİTİK: Tabaklar ÜST ÜSTE yığılı mı? (Müşteri masasında üst üste tabak KESİNLİKLE OLMAMALI!)
   - Birden fazla tabak varsa: YAN YANA mı, yoksa ÜST ÜSTE mi?
   - Üst üste tabak = KRİTİK HATA, shouldRegenerate = true

Eğer herhangi birinden birden fazla varsa VEYA tabaklar üst üste ise, bu KRİTİK HATA'dır!

Görseli değerlendir ve JSON formatında yanıt ver:
{
  "productAccuracy": 1-10,
  "composition": 1-10,
  "lighting": 1-10,
  "realism": 1-10,
  "instagramReadiness": 1-10,
  "overallScore": 1-10 (duplikasyon veya stacked plates varsa 0),
  "duplicateCheck": {
    "productCount": sayı (1 olmalı),
    "cupCount": sayı (0 veya 1 olmalı),
    "plateCount": sayı (1 olmalı),
    "hasStackedPlates": true/false (TABAKLAR ÜST ÜSTE Mİ?),
    "hasDuplication": true/false
  },
  "feedback": "Genel değerlendirme...",
  "issues": ["sorun1", "sorun2"] veya [],
  "shouldRegenerate": true/false (duplikasyon veya stacked plates varsa MUTLAKA true),
  "regenerationHints": "Eğer yeniden üretilecekse, ne değişmeli... (stacked plates varsa: NEVER stack plates, plates must be SIDE BY SIDE only)"
}`;

    const startTime = Date.now();

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
      const cost = await this.calculateCost(response.usage.input_tokens, response.usage.output_tokens);
      const durationMs = Date.now() - startTime;

      // Duplikasyon ve stacked plates kontrolü
      const hasDuplication = evaluation.duplicateCheck?.hasDuplication ||
        (evaluation.duplicateCheck?.productCount > 1) ||
        (evaluation.duplicateCheck?.cupCount > 1) ||
        (evaluation.duplicateCheck?.plateCount > 1);

      // Stacked plates kontrolü (üst üste tabak)
      const hasStackedPlates = evaluation.duplicateCheck?.hasStackedPlates === true;

      // Duplikasyon veya stacked plates varsa otomatik olarak fail et
      const hasCriticalIssue = hasDuplication || hasStackedPlates;
      const finalScore = hasCriticalIssue ? 0 : evaluation.overallScore;
      const shouldRegenerate = hasCriticalIssue || evaluation.shouldRegenerate;

      // Kritik sorunları issues'a ekle
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

      // Stacked plates uyarısı
      if (hasStackedPlates) {
        issues.unshift("KRİTİK: ÜST ÜSTE TABAK tespit edildi! Müşteri masasında tabaklar üst üste OLAMAZ.");
      }

      // Regeneration hints güncelle
      let regenerationHints = evaluation.regenerationHints || "";
      if (hasDuplication && !regenerationHints.includes("ONLY ONE")) {
        regenerationHints = "CRITICAL: ONLY ONE product, ONLY ONE cup, ONLY ONE plate. NO duplicates. " + regenerationHints;
      }
      if (hasStackedPlates && !regenerationHints.includes("stacked plates")) {
        regenerationHints = "CRITICAL: NEVER stack plates - plates must be SIDE BY SIDE only, not on top of each other. " + regenerationHints;
      }

      console.log(`[ClaudeService] QC Result - Score: ${finalScore}, Duplication: ${hasDuplication}, StackedPlates: ${hasStackedPlates}, Regenerate: ${shouldRegenerate}`);

      // AI Log kaydet
      await AILogService.logClaude("quality-control" as AILogStage, {
        model: this.model,
        systemPrompt,
        userPrompt,
        response: textContent.text,
        responseData: evaluation,
        status: "success",
        tokensUsed,
        cost,
        durationMs,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
        productType: this.pipelineContext.productType,
      });

      return {
        success: true,
        data: {
          passed: finalScore >= 7 && !hasCriticalIssue,
          score: finalScore,
          evaluation: {
            productAccuracy: evaluation.productAccuracy,
            composition: evaluation.composition,
            lighting: evaluation.lighting,
            realism: evaluation.realism,
            instagramReadiness: evaluation.instagramReadiness,
          },
          feedback: hasCriticalIssue
            ? `${hasStackedPlates ? "ÜST ÜSTE TABAK TESPİT EDİLDİ! " : ""}${hasDuplication ? "DUPLİKASYON TESPİT EDİLDİ! " : ""}${evaluation.feedback}`
            : evaluation.feedback,
          improvementSuggestions: issues,
          shouldRegenerate,
          regenerationHints,
        },
        tokensUsed,
        cost,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error("[ClaudeService] Quality control error:", error);

      // Hata logla
      await AILogService.logClaude("quality-control" as AILogStage, {
        model: this.model,
        systemPrompt,
        userPrompt,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
        productType: this.pipelineContext.productType,
      });

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

    const startTime = Date.now();

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
      const cost = await this.calculateCost(response.usage.input_tokens, response.usage.output_tokens);
      const durationMs = Date.now() - startTime;

      // AI Log kaydet
      await AILogService.logClaude("content-generation" as AILogStage, {
        model: this.model,
        systemPrompt,
        userPrompt,
        response: textContent.text,
        responseData: content,
        status: "success",
        tokensUsed,
        cost,
        durationMs,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
        productType: productType,
      });

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
        cost,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error("[ClaudeService] Content generation error:", error);

      // Hata logla
      await AILogService.logClaude("content-generation" as AILogStage, {
        model: this.model,
        systemPrompt,
        userPrompt,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
        productType: productType,
      });

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
    assets: AssetSelection,
    userRules?: string // Kullanıcının AI Rules sayfasından tanımladığı kurallar
  ): Promise<ClaudeResponse<{ optimizedPrompt: string; negativePrompt: string; customizations: string[] }>> {
    const client = this.getClient();

    // Eğitim kurallarını yükle
    const trainingContext = getCompactTrainingContext();

    // ═══════════════════════════════════════════════════════════════════════════
    // GEMİNİ TERMİNOLOJİSİ İLE OPTİMİZASYON
    // ═══════════════════════════════════════════════════════════════════════════
    const systemPrompt = `Sen Gemini için prompt optimize eden bir uzmansın. Gemini-native terminoloji kullan.

${trainingContext}

## GEMİNİ TERMİNOLOJİSİ REHBERİ

### IŞIK TERİMLERİ (Gemini anlıyor):
- "soft diffused natural light" - yumuşak doğal ışık
- "dramatic side-lighting at 45 degrees" - 45 derece yan ışık
- "warm backlighting with golden rim" - altın arka ışık
- "rim lighting with soft fill" - kenar vurgulu ışık
- "subsurface scattering" - yarı saydam yüzeylerde ışık geçişi
- "specular highlights" - parlak yansımalar

### RENK SICAKLIĞI (Kelvin):
- 3000K: Sıcak, samimi (akşam, cozy)
- 3200K: Altın saat, nostaljik
- 3500K: Sıcak-nötr geçiş
- 5000K: Nötr gün ışığı
- 5500K: Parlak sabah ışığı

### EL TERİMLERİ (Gemini anlıyor):
- "cupping" - kavrama, koruyucu tutma
- "pinching" - iki parmakla tutma
- "cradling" - avuçta taşıma
- "presenting" - açık avuçla sunma
- "breaking" - kırma, ayırma hareketi
- "dipping" - batırma hareketi

### DOKU TERİMLERİ (Ürün bazlı):
- Pasta: "golden-brown laminated layers", "honeycomb crumb structure"
- Çikolata: "glossy tempered surface", "mirror-like sheen"
- Tart: "caramelized sugar shell", "crème brûlée torched top"

## PROMPT KURALLARI (75-150 kelime hedef)

1. SADECE asset listesindeki objeleri kullan
2. Asset listesinde YOKSA prompt'a EKLEME:
   - Cutlery yok → kaşık/çatal/bıçak yazma
   - Napkin yok → peçete yazma
   - Cup yok → fincan/bardak yazma
3. Masa/tabak için tarif uydurma, referans görsele güven
4. Atmosfer için Gemini ışık terminolojisi kullan
5. Tekil tabak, üst üste değil

## PROMPT YAPISI
- Context: Instagram lifestyle photo (9:16)
- Composition: Sadece mevcut asset'lerin pozisyonları
- Atmosphere: Gemini ışık terimleri + renk sıcaklığı + f/2.0 shallow DOF
- Hands: Gemini el pozisyon terimleri (varsa)
- Constraint: 100% fidelity to references

## NEGATİVE PROMPT FORMAT
- "Avoid: [term1], [term2]" formatı (--no yerine)
- Her zaman: stacked plates, steam, smoke, duplicates

ASLA asset listesinde olmayan obje ekleme!
${userRules ? `\n## KULLANICI KURALLARI\n${userRules}` : ""}`;

    // Asset bilgilerini [N] tagging formatında hazırla
    // RADİKAL SADELEŞTİRME v2.0: Sadece mevcut bilgileri kullan, varsayım yapma!
    const assetList: string[] = [];

    // Helper: Bilgileri birleştir, boşları atla
    const buildAssetDesc = (parts: (string | undefined)[]): string =>
      parts.filter(Boolean).join(" ").trim();

    assetList.push(`[1] Product`); // Referans görsel yeterli

    if (assets.plate) {
      const plateDesc = buildAssetDesc([
        assets.plate.visualProperties?.material,
        assets.plate.visualProperties?.dominantColors?.join(", ")
      ]);
      assetList.push(`[${assetList.length + 1}] Plate${plateDesc ? `: ${plateDesc}` : ""}`);
    }
    if (assets.table) {
      const tableDesc = buildAssetDesc([
        assets.table.visualProperties?.material,
        assets.table.visualProperties?.style
      ]);
      assetList.push(`[${assetList.length + 1}] Table${tableDesc ? `: ${tableDesc}` : ""}`);
    }
    if (assets.cup) {
      const cupDesc = buildAssetDesc([
        assets.cup.visualProperties?.dominantColors?.join(", "),
        assets.cup.visualProperties?.material
      ]);
      assetList.push(`[${assetList.length + 1}] Cup${cupDesc ? `: ${cupDesc}` : ""}`);
    }
    if (assets.napkin) {
      const napkinDesc = buildAssetDesc([
        assets.napkin.visualProperties?.dominantColors?.join(", "),
        assets.napkin.visualProperties?.material
      ]);
      assetList.push(`[${assetList.length + 1}] Napkin${napkinDesc ? `: ${napkinDesc}` : ""}`);
    }
    if (assets.cutlery) {
      const cutleryDesc = buildAssetDesc([
        assets.cutlery.visualProperties?.material,
        assets.cutlery.visualProperties?.style
      ]);
      assetList.push(`[${assetList.length + 1}] Cutlery${cutleryDesc ? `: ${cutleryDesc}` : ""}`);
    }
    if (assets.accessory) {
      assetList.push(`[${assetList.length + 1}] Accessory: ${assets.accessory.subType}`);
    }
    if (assets.environment) {
      assetList.push(`[${assetList.length + 1}] Environment`);
    }

    const userPrompt = `
BASE: ${basePrompt}

SCENARIO: ${scenario.scenarioName}
Composition: ${scenario.composition}
${scenario.handStyle ? `Hand: ${scenario.handStyle}` : ""}

ASSETS (use only these):
${assetList.join("\n")}

Optimize prompt (75-150 words, positive language):
{
  "optimizedPrompt": "...",
  "negativePrompt": "...",
  "customizations": ["eklenen detay 1", "eklenen detay 2"]
}`;

    const startTime = Date.now();

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
      const cost = await this.calculateCost(response.usage.input_tokens, response.usage.output_tokens);
      const durationMs = Date.now() - startTime;

      // AI Log kaydet
      await AILogService.logClaude("prompt-optimization" as AILogStage, {
        model: this.model,
        systemPrompt,
        userPrompt,
        response: textContent.text,
        responseData: result,
        status: "success",
        tokensUsed,
        cost,
        durationMs,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
        productType: this.pipelineContext.productType,
      });

      // Negatif prompt'a zorunlu kuralları ekle (stacked plates, etc.)
      const mandatoryNegatives = [
        "stacked plates",
        "plates on top of each other",
        "piled plates",
        "multiple stacked dishes",
      ];

      // Mevcut negatif prompt'a zorunlu negatifleri ekle (yoksa)
      let enhancedNegativePrompt = result.negativePrompt || "";
      for (const negative of mandatoryNegatives) {
        if (!enhancedNegativePrompt.toLowerCase().includes(negative.toLowerCase())) {
          enhancedNegativePrompt = enhancedNegativePrompt
            ? `${enhancedNegativePrompt}, ${negative}`
            : negative;
        }
      }

      return {
        success: true,
        data: {
          optimizedPrompt: result.optimizedPrompt,
          negativePrompt: enhancedNegativePrompt,
          customizations: result.customizations,
        },
        tokensUsed,
        cost,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error("[ClaudeService] Prompt optimization error:", error);

      // Hata logla
      await AILogService.logClaude("prompt-optimization" as AILogStage, {
        model: this.model,
        systemPrompt,
        userPrompt,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
        productType: this.pipelineContext.productType,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        tokensUsed: 0,
        cost: 0,
      };
    }
  }
}

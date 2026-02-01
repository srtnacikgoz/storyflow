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
  FirestoreFixedAssetsConfig,
} from "./types";
import { getCompactTrainingContext } from "./promptTrainingService";
import { AILogService } from "../services/aiLogService";
import { AILogStage } from "../types";
import { getSystemSettings, getPromptTemplate, interpolatePrompt } from "../services/configService";

// Lazy load Anthropic SDK
let anthropicClient: Anthropic | null = null;

// ==========================================
// OBJECT IDENTITY HELPER
// ==========================================
// Formül: [Type] + [Geometry/Shape] + [Material/Texture] + [Functional Detail]
// Gemini'ye net, belirsizliksiz asset tanımı verir.
// Serbest metin yerine enum label'ları kullanılır.

/**
 * Asset için Object Identity açıklaması oluşturur
 * Kategori bazlı farklı özellikler birleştirilir
 *
 * Örnek çıktılar:
 * - Table: "circular marble tabletop on pedestal base"
 * - Cup: "espresso cup, white ceramic"
 * - Cutlery: "dessert fork, silver metal"
 * - Plate: "dessert plate, white porcelain"
 */
function buildAssetIdentity(asset: Asset, assetRole: string): string {
  const vp = asset.visualProperties;
  if (!vp) return assetRole;

  const parts: string[] = [];

  switch (assetRole.toLowerCase()) {
    case "table": {
      // [Geometry] + [Material] + "tabletop" + [Base]
      if (vp.tableTopShape) {
        parts.push(vp.tableTopShape);
      }
      if (vp.material) parts.push(vp.material);
      parts.push("tabletop");
      if (vp.tableBaseType) {
        parts.push(`on ${vp.tableBaseType} base`);
      }
      break;
    }
    case "cup": {
      // [CupType label] + [Color] + [Material]
      if (vp.cupType) {
        // İngilizce enum değerini okunabilir hale getir: "espresso-cup" → "espresso cup"
        parts.push(vp.cupType.replace(/-/g, " "));
      }
      if (vp.dominantColors?.length) {
        parts.push(vp.dominantColors[0]);
      }
      if (vp.material) parts.push(vp.material);
      break;
    }
    case "cutlery": {
      // [CutleryType label] + [Material]
      if (vp.cutleryType) {
        parts.push(vp.cutleryType.replace(/-/g, " "));
      }
      if (vp.material) parts.push(vp.material);
      break;
    }
    case "plate": {
      // [PlateType label] + [Color] + [Material]
      if (vp.plateType) {
        parts.push(vp.plateType.replace(/-/g, " "));
      }
      if (vp.dominantColors?.length) {
        parts.push(vp.dominantColors[0]);
      }
      if (vp.material) parts.push(vp.material);
      break;
    }
    case "napkin": {
      // [Color] + [Material] + "napkin"
      if (vp.dominantColors?.length) {
        parts.push(vp.dominantColors[0]);
      }
      if (vp.material) parts.push(vp.material);
      break;
    }
    default: {
      // Genel fallback: material + style
      if (vp.material) parts.push(vp.material);
      if (vp.style) parts.push(vp.style);
      break;
    }
  }

  // Boş parçaları filtrele ve birleştir
  const identity = parts.filter(Boolean).join(" ").trim();

  // Etiket bilgisini kontekst olarak ekle (Gemini'nin doğru içerik üretmesi için)
  if (asset.tags && asset.tags.length > 0) {
    const tagsStr = asset.tags.join(", ");
    return identity
      ? `${identity} [tags: ${tagsStr}]`
      : `${assetRole} [tags: ${tagsStr}]`;
  }

  return identity || assetRole;
}

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
    effectiveRules?: EffectiveRules,
    fixedAssets?: FirestoreFixedAssetsConfig
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

    // Config'den system prompt template'ini al (fallback: hardcoded)
    const assetSelectionTemplate = await getPromptTemplate("asset-selection");

    // Template değişkenleri hazırla
    const blockedAssetsSection = [
      blockedProducts.length > 0 ? `⚠️ BLOKLANMIŞ ÜRÜNLER (SEÇME): ${blockedProducts.join(", ")}` : "",
      blockedPlates.length > 0 ? `⚠️ BLOKLANMIŞ TABAKLAR (SEÇME): ${blockedPlates.join(", ")}` : "",
      blockedCups.length > 0 ? `⚠️ BLOKLANMIŞ FİNCANLAR (SEÇME): ${blockedCups.join(", ")}` : "",
      blockedTables.length > 0 ? `⚠️ BLOKLANMIŞ MASALAR (SEÇME): ${blockedTables.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    const petInstruction = shouldIncludePet ? "Bu sefer KÖPEK DAHİL ET (listeden seç)" : "Köpek dahil etme";

    const systemPrompt = interpolatePrompt(assetSelectionTemplate.systemPrompt, {
      moodUpper: mood.toUpperCase(),
      moodRule,
      blockedAssetsSection,
      petInstruction,
    });

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
      usageCount: a.usageCount,
      tags: a.tags
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
      usageCount: a.usageCount,
      tags: a.tags
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
      usageCount: a.usageCount,
      tags: a.tags
    })), null, 2) : "YOK (peçete asset'i eklenmemiş)"}

ÇATAL-BIÇAK (servis için):
${availableAssets.cutlery.length > 0 ? JSON.stringify(availableAssets.cutlery.map((a: Asset) => ({
      id: a.id,
      filename: a.filename,
      material: a.visualProperties?.material,
      style: a.visualProperties?.style,
      usageCount: a.usageCount,
      tags: a.tags
    })), null, 2) : "YOK (çatal-bıçak asset'i eklenmemiş)"}

🏷️ ETİKET (TAGS) KULLANIMI: Asset'lerdeki "tags" kısa keyword'lerdir ve o asset'in kullanım amacını belirtir. Etiketleri mood ve ürün tipi ile eşleştir. Örn: çay temalı üretim → "tea" etiketli bardak; cheesecake sunumu → "cheesecake" etiketli tabak; hediye konsepti → "gift" etiketli kutu tercih et.

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

      // Claude'un seçimlerini al
      let plate = selection.plateId ? availableAssets.plates.find((a: Asset) => a.id === selection.plateId) : undefined;
      let cup = selection.cupId ? availableAssets.cups.find((a: Asset) => a.id === selection.cupId) : undefined;
      let table = selection.tableId ? availableAssets.tables.find((a: Asset) => a.id === selection.tableId) : undefined;
      const decor = selection.decorId ? availableAssets.decor.find((a: Asset) => a.id === selection.decorId) : undefined;

      // SABİT ASSET OVERRIDE
      // "Mermer masa sabit, üzerindekiler serbest" kullanım senaryosu
      if (fixedAssets?.isEnabled) {
        // Sabit masa
        if (fixedAssets.fixedTableId) {
          const fixedTable = availableAssets.tables.find((a: Asset) => a.id === fixedAssets.fixedTableId);
          if (fixedTable) {
            console.log(`[ClaudeService] 🔒 SABİT MASA: ${fixedTable.id} (Claude: ${selection.tableId || "seçmedi"} → Fixed: ${fixedAssets.fixedTableId})`);
            table = fixedTable;
          } else {
            console.warn(`[ClaudeService] ⚠️ Sabit masa ID geçersiz: ${fixedAssets.fixedTableId} - mevcut asset'lerde bulunamadı`);
          }
        }

        // Sabit tabak (opsiyonel)
        if (fixedAssets.fixedPlateId) {
          const fixedPlate = availableAssets.plates.find((a: Asset) => a.id === fixedAssets.fixedPlateId);
          if (fixedPlate) {
            console.log(`[ClaudeService] 🔒 SABİT TABAK: ${fixedPlate.id}`);
            plate = fixedPlate;
          }
        }

        // Sabit fincan (opsiyonel)
        if (fixedAssets.fixedCupId) {
          const fixedCup = availableAssets.cups.find((a: Asset) => a.id === fixedAssets.fixedCupId);
          if (fixedCup) {
            console.log(`[ClaudeService] 🔒 SABİT FİNCAN: ${fixedCup.id}`);
            cup = fixedCup;
          }
        }
      }
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

      // KRİTİK: Eğer filtreleme sonrası senaryo kalmazsa, HATA döndür (FALLBACK YOK!)
      // Kullanıcı tercihi: Yanlış içerik üretmektense hiç üretmemek daha iyi
      if (nonHandScenarios.length === 0) {
        const scenarioNames = availableScenarios.map(s => `${s.id} (hands: ${s.includesHands})`).join(", ");
        const errorMsg = `TEMA KISITLAMASI: Elle tutulamayan ürün (${selectedAssets.product.filename}) için tema senaryolarında el içermeyen seçenek yok. Tema senaryoları: [${scenarioNames}]. Çözüm: Temaya el içermeyen senaryo ekleyin VEYA ürünün "canBeHeldByHand" özelliğini true yapın.`;
        console.error(`[ClaudeService] ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
          tokensUsed: 0,
          cost: 0,
        };
      } else {
        filteredScenarios = nonHandScenarios;
        console.log(`[ClaudeService] Hand scenarios filtered - canBeHeldByHand: ${selectedAssets.product.canBeHeldByHand}, eatingMethod: ${productEatingMethod}, original: ${availableScenarios.length}, filtered: ${filteredScenarios.length}`);
      }
    }

    // Config'den system prompt template'ini al (fallback: hardcoded)
    const scenarioSelectionTemplate = await getPromptTemplate("scenario-selection");

    // Template değişkenleri hazırla
    const scenarioPetInstruction = shouldIncludePet
      ? "Köpek dahil edildi, KÖPEK UYUMLU senaryo seç (kahve-kosesi, yarim-kaldi, cam-kenari)"
      : "Köpek yok, herhangi senaryo uygun";

    const holdingInstruction = canUseHandScenarios
      ? "Bu ürün elle tutulabilir - el içeren senaryolar uygundur"
      : `⚠️ KRİTİK: Bu ürün elle tutulamaz (yeme şekli: ${productEatingMethod}) - EL İÇEREN SENARYO SEÇME! Sadece tabakta/servis halinde gösterilmeli.`;

    const blockedHandStylesRule = blockedHandStyles.length > 0
      ? `Bu el stillerini KULLANMA (son kullanılmış): ${blockedHandStyles.join(", ")}`
      : "Tüm el stilleri kullanılabilir";

    const blockedCompositionsRule = blockedCompositions.length > 0
      ? `Bu kompozisyonları KULLANMA (son kullanılmış): ${blockedCompositions.join(", ")}`
      : "Tüm kompozisyonlar kullanılabilir";

    const systemPrompt = interpolatePrompt(scenarioSelectionTemplate.systemPrompt, {
      petInstruction: scenarioPetInstruction,
      holdingInstruction,
      blockedHandStylesRule,
      blockedCompositionsRule,
      feedbackHints: feedbackHints || "",
    });

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

      // KRİTİK: Hala bulunamazsa, HATA döndür (FALLBACK YOK!)
      // Kullanıcı tercihi: Yanlış senaryo ile üretmektense üretmemek daha iyi
      if (!scenario) {
        const availableIds = filteredScenarios.map(s => s.id).join(", ");
        const errorMsg = `GEÇERSİZ SENARYO: Claude'un döndürdüğü senaryo ID "${selection.scenarioId}" tema listesinde bulunamadı. Mevcut tema senaryoları: [${availableIds}]. Bu bir AI yanıt hatası - pipeline durduruldu.`;
        console.error(`[ClaudeService] ${errorMsg}`);

        const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
        const cost = await this.calculateCost(response.usage.input_tokens, response.usage.output_tokens);
        const durationMs = Date.now() - startTime;

        // Hata logla
        await AILogService.logClaude("scenario-selection" as AILogStage, {
          model: this.model,
          systemPrompt,
          userPrompt,
          response: textContent.text,
          responseData: selection,
          status: "error",
          error: errorMsg,
          tokensUsed,
          cost,
          durationMs,
          pipelineId: this.pipelineContext.pipelineId,
          slotId: this.pipelineContext.slotId,
          productType: productType,
        });

        return {
          success: false,
          error: errorMsg,
          tokensUsed,
          cost,
        };
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
          scenarioDescription: scenario.description, // KRİTİK: Gemini'ye ortam bilgisi için
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

    // Config'den system prompt template'ini al (fallback: hardcoded)
    // QC prompt'u tamamen statik - template değişken yok
    const qcTemplate = await getPromptTemplate("quality-control");
    const systemPrompt = qcTemplate.systemPrompt;

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

    // Config'den system prompt template'ini al (fallback: hardcoded)
    // Content generation prompt'u tamamen statik - template değişken yok
    const contentTemplate = await getPromptTemplate("content-generation");
    const systemPrompt = contentTemplate.systemPrompt;

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
    // Config'den system prompt template'ini al (fallback: hardcoded)
    const optimizationTemplate = await getPromptTemplate("prompt-optimization");

    // Template değişkenleri hazırla
    const userRulesSection = userRules ? `\n## KULLANICI KURALLARI\n${userRules}` : "";

    const systemPrompt = interpolatePrompt(optimizationTemplate.systemPrompt, {
      trainingContext,
      userRulesSection,
    });

    // Asset bilgilerini [N] tagging formatında hazırla
    // OBJECT IDENTITY v1.0: Enum tabanlı net tanımlar → Gemini belirsizliğe düşmez
    const assetList: string[] = [];

    assetList.push(`[1] Product`); // Referans görsel yeterli

    if (assets.plate) {
      const plateIdentity = buildAssetIdentity(assets.plate, "plate");
      assetList.push(`[${assetList.length + 1}] Plate: ${plateIdentity}`);
    }
    if (assets.table) {
      const tableIdentity = buildAssetIdentity(assets.table, "table");
      assetList.push(`[${assetList.length + 1}] Table: ${tableIdentity}`);
    }
    if (assets.cup) {
      const cupIdentity = buildAssetIdentity(assets.cup, "cup");
      assetList.push(`[${assetList.length + 1}] Cup: ${cupIdentity}`);
    }
    if (assets.napkin) {
      const napkinIdentity = buildAssetIdentity(assets.napkin, "napkin");
      assetList.push(`[${assetList.length + 1}] Napkin: ${napkinIdentity}`);
    }
    if (assets.cutlery) {
      const cutleryIdentity = buildAssetIdentity(assets.cutlery, "cutlery");
      assetList.push(`[${assetList.length + 1}] Cutlery: ${cutleryIdentity}`);
    }
    if (assets.accessory) {
      const accTags = assets.accessory.tags?.length ? ` [tags: ${assets.accessory.tags.join(", ")}]` : "";
      assetList.push(`[${assetList.length + 1}] Accessory: ${assets.accessory.subType}${accTags}`);
    }
    if (assets.environment) {
      const envTags = assets.environment.tags?.length ? ` [tags: ${assets.environment.tags.join(", ")}]` : "";
      assetList.push(`[${assetList.length + 1}] Environment${envTags}`);
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

  /**
   * Senaryo Açıklaması Üret (AI Scenario Writer)
   * Claude kullanarak, sahne odaklı, atmosferik senaryo açıklaması üretir.
   *
   * Mood'dan farklı olarak burada "sahne" ve "an" tarif edilir:
   * - Mood: Işık, renk, atmosfer (what the scene FEELS like)
   * - Senaryo: Ne oluyor, el ne yapıyor, kamera nerede (what is HAPPENING)
   */
  async generateScenarioDescription(params: {
    scenarioName: string;
    includesHands: boolean;
    handPose?: string;
    compositions: string[];
    compositionEntry?: string;
  }): Promise<ClaudeResponse<{ description: string }>> {
    const client = this.getClient();
    const startTime = Date.now();

    // Hand pose Türkçe karşılıkları
    const handPoseNames: Record<string, string> = {
      "cupping": "kavrama (fincanı iki elle saran)",
      "pinching": "tutma (parmak uçlarıyla zarif tutma)",
      "cradling": "kucaklama (alttan destekleyerek taşıma)",
      "presenting": "sunma (açık avuçla gösterme)",
      "breaking": "kırma (parçalayarak iç dokuyu gösterme)",
      "dipping": "batırma (kahveye/sosa batırma anı)",
    };

    // Composition entry Türkçe karşılıkları
    const entryNames: Record<string, string> = {
      "bottom-right": "sağ alt köşeden",
      "bottom-left": "sol alt köşeden",
      "right-side": "sağ kenardan",
      "top-down": "yukarıdan (kuşbakışı)",
    };

    const systemPrompt = `Sen profesyonel bir yiyecek fotoğrafçısı ve sahne yönetmenisin.
Görevin, bir AI görsel üreticisi için "SAHNE AÇIKLAMASI" yazmak.

ÖNEMLİ KURALLAR:
1. DİL: Türkçe yaz ama teknik terimler İngilizce kalabilir.
2. UZUNLUK: 40-70 kelime. Kısa ve öz.
3. ODAK: Sahnede NE OLUYOR? El ne yapıyor? Ürün nasıl konumlanmış?
4. YASAKLAR:
   - Işık/aydınlatma tarifi YAPMA (bu Mood'un işi)
   - Renk paleti YAPMA (bu Mood'un işi)
   - Hava durumu/mevsim YAPMA (bu Mood'un işi)
5. YALNIZCA tarif et:
   - Sahnenin "anı" (kırılma anı, yudumlama anı, sunma anı)
   - El varsa: zarif, feminen, bakımlı tırnaklar, doğal ten
   - Kompozisyon (ürün nerede, kamera açısı)
   - Duygu/his (samimi, şık, rahat, premium)

ÇIKTI: Sadece açıklama metnini yaz. Tırnak işareti, "İşte açıklama:" gibi ön ekler YAZMA.`;

    const handInfo = params.includesHands
      ? `
El Pozu: ${params.handPose ? handPoseNames[params.handPose] || params.handPose : "Belirtilmemiş"}
El Giriş Noktası: ${params.compositionEntry ? entryNames[params.compositionEntry] || params.compositionEntry : "Belirtilmemiş"}`
      : "El YOK - Sadece ürün odaklı kompozisyon";

    const userPrompt = `Senaryo Adı: ${params.scenarioName}
El İçeriyor mu: ${params.includesHands ? "EVET" : "HAYIR"}
${handInfo}
Kompozisyon Türleri: ${params.compositions.join(", ")}

Bu senaryo için sahne açıklaması yaz:`;

    try {
      const response = await client.messages.create({
        model: this.model,
        max_tokens: 300,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: userPrompt,
        }],
      });

      const textContent = response.content.find((c: ContentBlock) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("Claude yanıtında metin bulunamadı");
      }

      const description = textContent.text.trim();
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
      const cost = await this.calculateCost(response.usage.input_tokens, response.usage.output_tokens);
      const durationMs = Date.now() - startTime;

      // Loglama
      await AILogService.logClaude("scenario-description-generation" as AILogStage, {
        model: this.model,
        systemPrompt,
        userPrompt,
        response: description,
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
        data: { description },
        tokensUsed,
        cost,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error("[ClaudeService] Scenario description generation error:", error);

      await AILogService.logClaude("scenario-description-generation" as AILogStage, {
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

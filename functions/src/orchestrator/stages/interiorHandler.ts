/**
 * Interior Handler
 * Interior senaryo akışını yönetir
 *
 * Interior senaryolarda AI görsel üretimi ATLANIR,
 * mevcut pastane fotoğrafları doğrudan kullanılır.
 */

import {
  Asset,
  AssetSelection,
  PipelineResult,
  PipelineStatus,
  Scenario,
  GeneratedImage,
  QualityControlResult,
} from "../types";

export interface InteriorHandlerParams {
  interiorAssets: Asset[];
  scenario: Scenario;
  overrideAspectRatio?: string;
}

export interface InteriorResult {
  assetSelection: AssetSelection;
  generatedImage: GeneratedImage;
  qualityControl: QualityControlResult;
  optimizedPrompt: {
    mainPrompt: string;
    negativePrompt: string;
    customizations: string[];
    aspectRatio: string;
    faithfulness: number;
  };
}

/**
 * Interior asset seç (interiorType'a göre filtreleme)
 */
export function selectInteriorAsset(
  interiorAssets: Asset[],
  interiorType?: string
): Asset | null {
  if (!interiorAssets || interiorAssets.length === 0) {
    return null;
  }

  // interiorType belirtilmişse filtrele
  if (interiorType) {
    const filtered = interiorAssets.filter(
      (asset) => asset.subType === interiorType
    );
    if (filtered.length > 0) {
      // usageCount'a göre sırala (düşükten yükseğe - çeşitlilik için)
      filtered.sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0));
      return filtered[0];
    }
  }

  // Tip belirtilmemiş veya eşleşme yoksa, tüm interior'lardan seç
  // usageCount'a göre sırala
  const sorted = [...interiorAssets].sort(
    (a, b) => (a.usageCount || 0) - (b.usageCount || 0)
  );
  return sorted[0];
}

/**
 * Interior senaryosu için result objelerini oluştur
 * Bu fonksiyon hem interior-only tema hem de normal akıştaki interior senaryo için kullanılır
 */
export function buildInteriorResult(
  selectedInterior: Asset,
  scenario: Scenario,
  overrideAspectRatio?: string
): InteriorResult {
  // Asset Selection
  const assetSelection: AssetSelection = {
    product: selectedInterior, // Interior asset'i product yerine kullan (tip uyumu için)
    interior: selectedInterior,
    isInteriorScenario: true,
    includesPet: false,
    selectionReasoning: `Interior senaryo: ${scenario.name} - AI üretimi atlandı, mevcut fotoğraf kullanıldı`,
  };

  // Generated Image (AI üretimi yok, mevcut fotoğraf)
  const generatedImage: GeneratedImage = {
    imageBase64: "", // Interior için base64 gerekmiyor, storageUrl yeterli
    mimeType: "image/jpeg",
    model: "interior-asset", // AI modeli kullanılmadı
    cost: 0,
    generatedAt: Date.now(),
    attemptNumber: 0,
    storageUrl: selectedInterior.storageUrl,
  };

  // Quality Control (Gerçek fotoğraf - otomatik geçer)
  const qualityControl: QualityControlResult = {
    passed: true,
    score: 10,
    evaluation: {
      productAccuracy: 10,
      composition: 10,
      lighting: 10,
      realism: 10,
      instagramReadiness: 10,
    },
    feedback: "Interior asset - Real photo, no AI generation needed",
    shouldRegenerate: false,
  };

  // Optimized Prompt (Interior için minimal)
  const optimizedPrompt = {
    mainPrompt: `Interior photo: ${selectedInterior.filename}`,
    negativePrompt: "",
    customizations: [],
    aspectRatio: overrideAspectRatio || "9:16",
    faithfulness: 1.0, // Gerçek fotoğraf olduğu için 1.0
  };

  return {
    assetSelection,
    generatedImage,
    qualityControl,
    optimizedPrompt,
  };
}

/**
 * Interior senaryosu için stage'leri tamamla
 * completedStages array'ine gerekli stage'leri ekler
 */
export function markInteriorStagesComplete(
  status: PipelineStatus,
  includeAssetSelection: boolean = true
): void {
  if (includeAssetSelection) {
    status.completedStages.push("asset_selection");
    status.completedStages.push("scenario_selection");
  }
  status.completedStages.push("prompt_optimization");
  status.completedStages.push("image_generation");
  status.completedStages.push("quality_control");
}

/**
 * Scenario selection result oluştur (interior için)
 */
export function buildInteriorScenarioSelection(scenario: Scenario): {
  scenarioId: string;
  scenarioName: string;
  scenarioDescription: string;
  reasoning: string;
  includesHands: boolean;
  compositionId: string;
  composition: string;
  isInterior: boolean;
  interiorType?: string;
} {
  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    scenarioDescription: scenario.description || "Interior mekan görseli",
    reasoning: `Interior senaryo seçildi: ${scenario.name} - Mevcut pastane fotoğrafı kullanılacak`,
    includesHands: false,
    compositionId: "interior-default",
    composition: "Interior mekan görseli - AI üretimi yok",
    isInterior: true,
    interiorType: scenario.interiorType,
  };
}

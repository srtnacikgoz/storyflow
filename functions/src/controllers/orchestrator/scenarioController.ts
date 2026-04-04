/**
 * Scenario Controller
 * Senaryo CRUD işlemleri
 */

import { createHttpFunction, db, errorResponse, getConfig } from "./shared";
import { getScenarios, addScenario, updateScenario, getSystemSettings, getSlotDefinitions } from "../../services/configService";
import { FirestoreScenario } from "../../orchestrator/types";
import { GeminiService } from "../../services/gemini";
import { buildGeminiPrompt } from "../../orchestrator/geminiPromptBuilder";
import { loadImageAsBase64 } from "../../orchestrator/helpers/imageUtils";
import { getStorage } from "firebase-admin/storage";

/**
 * Tüm senaryoları listele
 * GET /listScenarios?includeInactive=true
 */
export const listScenarios = createHttpFunction(async (req, res) => {
  // includeInactive=true ise pasif senaryoları da getir
  const includeInactive = req.query?.includeInactive === "true";

  let scenarios: FirestoreScenario[];
  if (includeInactive) {
    // Tüm senaryoları getir (aktif + pasif)
    const snapshot = await db
      .collection("global")
      .doc("scenarios")
      .collection("items")
      .get();
    scenarios = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FirestoreScenario[];
  } else {
    scenarios = await getScenarios();
  }

  // Kategorilere ayır
  const standardScenarios = scenarios.filter((s) => !s.isInterior);
  const interiorScenarios = scenarios.filter((s) => s.isInterior);

  res.json({
    success: true,
    data: {
      all: scenarios,
      byCategory: {
        standard: standardScenarios,
        interior: interiorScenarios,
      },
      total: scenarios.length,
    },
  });
});

/**
 * Tek senaryo getir
 * GET /getScenario?id=xxx
 */
export const getScenario = createHttpFunction(async (req, res) => {
  const scenarioId = req.query?.id as string;

  if (!scenarioId) {
    res.status(400).json({
      success: false,
      error: "id is required",
    });
    return;
  }

  const doc = await db
    .collection("global")
    .doc("scenarios")
    .collection("items")
    .doc(scenarioId)
    .get();

  if (!doc.exists) {
    res.status(404).json({
      success: false,
      error: "Scenario not found",
    });
    return;
  }

  res.json({
    success: true,
    data: { id: doc.id, ...doc.data() },
  });
});

/**
 * Yeni senaryo oluştur
 * POST /createScenario
 */
export const createScenario = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const {
    id,
    name,
    description,
    compositionId,
    compositionEntry,
    isInterior,
    interiorType,
    suggestedProducts,
    mood, // Deprecated: v3.0'da senaryo kendi atmosfer bilgisini taşıyor

    // v3.0: Atmosfer alanları (Mood + Scenario birleşik)
    timeOfDay,
    season,
    weather,
    lightingPrompt,
    colorGradePrompt,
    geminiPresetId,

    // v4.0: Sahne ayarları (Tema'dan taşındı)
    setting,
    petAllowed,
    accessoryAllowed,
    accessoryOptions,

    // v4.1: Slot konfigürasyonu (CompositionTemplates'den taşındı)
    compositionSlots,

    // v5.0: Patlatılmış görünüm
    isExplodedView,
    explodedViewDescription,
  } = req.body;

  // Validasyon
  if (!id || !name || !description) {
    res.status(400).json({
      success: false,
      error: "id, name, and description are required",
    });
    return;
  }

  if (!compositionId) {
    res.status(400).json({
      success: false,
      error: "compositionId is required",
    });
    return;
  }

  // ID zaten var mı kontrol et
  const existing = await db
    .collection("global")
    .doc("scenarios")
    .collection("items")
    .doc(id)
    .get();

  if (existing.exists) {
    res.status(400).json({
      success: false,
      error: "Scenario with this ID already exists",
    });
    return;
  }

  // Senaryo oluştur - undefined değerleri Firestore'a gönderme
  const scenario: Omit<FirestoreScenario, "createdAt" | "updatedAt"> = {
    id,
    name,
    description,
    compositionId,
    isActive: true,
    isInterior: isInterior ?? false,
    // Opsiyonel alanları sadece tanımlı ise ekle
    ...(compositionEntry !== undefined && { compositionEntry }),
    ...(interiorType !== undefined && { interiorType }),
    ...(suggestedProducts !== undefined && { suggestedProducts }),
    ...(mood !== undefined && { mood }),

    // v3.0: Atmosfer alanları (Mood + Scenario birleşik)
    ...(timeOfDay !== undefined && { timeOfDay }),
    ...(season !== undefined && { season }),
    ...(weather !== undefined && { weather }),
    ...(lightingPrompt !== undefined && { lightingPrompt }),
    ...(colorGradePrompt !== undefined && { colorGradePrompt }),
    ...(geminiPresetId !== undefined && { geminiPresetId }),

    // v4.0: Sahne ayarları (Tema'dan taşındı)
    ...(setting !== undefined && { setting }),
    ...(petAllowed !== undefined && { petAllowed }),
    ...(accessoryAllowed !== undefined && { accessoryAllowed }),
    ...(accessoryOptions !== undefined && { accessoryOptions }),

    // v4.1: Slot konfigürasyonu (CompositionTemplates'den taşındı)
    ...(compositionSlots !== undefined && { compositionSlots }),

    // v5.0: Patlatılmış görünüm
    ...(isExplodedView !== undefined && { isExplodedView }),
    ...(explodedViewDescription !== undefined && { explodedViewDescription }),
  };

  await addScenario(scenario);

  res.json({
    success: true,
    message: "Scenario created successfully",
    data: scenario,
  });
});

/**
 * Senaryo güncelle
 * PUT /updateScenario
 */
export const updateScenarioEndpoint = createHttpFunction(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use PUT or POST" });
    return;
  }

  const { id, ...updates } = req.body;

  if (!id) {
    res.status(400).json({
      success: false,
      error: "id is required",
    });
    return;
  }

  // Senaryo var mı kontrol et
  const existing = await db
    .collection("global")
    .doc("scenarios")
    .collection("items")
    .doc(id)
    .get();

  if (!existing.exists) {
    res.status(404).json({
      success: false,
      error: "Scenario not found",
    });
    return;
  }

  await updateScenario(id, updates);

  res.json({
    success: true,
    message: "Scenario updated successfully",
  });
});

/**
 * Senaryo sil (soft delete)
 * DELETE /deleteScenario?id=xxx
 * Not: Temalarda kullanılan senaryolar kalıcı silinemez (cascade kontrolü)
 */
export const deleteScenarioEndpoint = createHttpFunction(async (req, res) => {
  const scenarioId = (req.query?.id || req.body?.id) as string;
  const hardDelete = req.query?.hardDelete === "true" || req.body?.hardDelete === true;

  if (!scenarioId) {
    res.status(400).json({
      success: false,
      error: "id is required",
    });
    return;
  }

  // Senaryo var mı kontrol et
  const existing = await db
    .collection("global")
    .doc("scenarios")
    .collection("items")
    .doc(scenarioId)
    .get();

  if (!existing.exists) {
    res.status(404).json({
      success: false,
      error: "Scenario not found",
    });
    return;
  }

  if (hardDelete) {
    // Kalıcı silme
    await db
      .collection("global")
      .doc("scenarios")
      .collection("items")
      .doc(scenarioId)
      .delete();
  } else {
    // Soft delete - isActive: false (bu her zaman çalışır)
    await updateScenario(scenarioId, { isActive: false });
  }

  res.json({
    success: true,
    message: hardDelete ? "Scenario permanently deleted" : "Scenario deactivated",
  });
});

/**
 * Senaryo açıklaması yazma system prompt'u
 * GeminiService.generateScenarioDescription ile aynı kurallar
 */
function getScenarioWriterSystemPrompt(params: {
  scenarioName: string;
  compositions: string[];
  compositionEntry?: string;
}): { systemPrompt: string; userPrompt: string } {
  const { scenarioName, compositions, compositionEntry } = params;
  const handInfo = `\nHand Style: No hands in scene`;

  const systemPrompt = `You are an expert Food Photography Director for a high-end pastry/cafe brand.
Your task is to write a "Scene Description" that tells the AI image generator WHAT IS HAPPENING in the scene.

RULES:
1. LANGUAGE: English ONLY.
2. LENGTH: Concise (40-60 words).
3. FOCUS ONLY ON:
   - The "moment" being captured (breaking, sipping, presenting, etc.)
   - Hand positioning and gesture (if hands are included)
   - Product placement and camera angle
   - Emotional feeling (intimate, elegant, cozy, premium)
4. DO NOT DESCRIBE:
   - Lighting (that's the Mood's job)
   - Color palette (that's the Mood's job)
   - Weather/atmosphere (that's the Mood's job)
5. HAND RULES (if hands included):
   - Describe hands as: elegant, feminine, well-manicured nails, natural skin tone
   - Focus on the ACTION the hands are performing
6. PRODUCT REFERENCE RULE (CRITICAL):
 - DO NOT describe the product's appearance (color, texture, shape, specific type)
 - Simply refer to it as "the product", "the pastry", or "the item"
 - The AI image generator will use the reference image for exact product details
 - WRONG: "A golden, flaky croissant is captured..."
 - CORRECT: "The pastry is captured..." or "The product is elegantly presented..."
7. PROP & SURFACE RULE (CRITICAL):
 - DO NOT specify materials, colors, or styles for surfaces, tableware, or accessories
 - DO NOT write "rustic wooden table", "marble counter", "ceramic plate", "linen napkin", etc.
 - Use GENERIC references: "the table", "a plate", "a cup", "a napkin", "a small vase"
 - The pipeline selects specific assets separately — your description must not conflict with them
 - WRONG: "placed on a rustic wooden table with a ceramic cup of coffee"
 - CORRECT: "placed on the table with a cup of coffee beside it"
8. ACCESSORY RULE:
 - You may mention the PRESENCE of accessories (cup, napkin, flowers, cutlery) but NOT their material or style
 - Focus on SPATIAL ARRANGEMENT, not object descriptions
9. OUTPUT: Return ONLY the description. No quotes, no prefixes like "Here is:".`;

  const userPrompt = `Scenario Name: ${scenarioName}
Compositions: ${compositions.join(", ")}${handInfo}${compositionEntry ? `\nEntry Point: ${compositionEntry}` : ""}

Write the scene description:`;

  return { systemPrompt, userPrompt };
}

/**
 * AI ile senaryo açıklaması üret (Multi-provider: Gemini, Claude)
 * POST /generateScenarioDescription
 * Body: { scenarioName, compositions, compositionEntry? }
 */
export const generateScenarioDescription = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const {
    scenarioName,
    compositions,
    compositionEntry,
  } = req.body;

  // Validasyon
  if (!scenarioName) {
    res.status(400).json({
      success: false,
      error: "scenarioName is required",
    });
    return;
  }

  if (!compositions || !Array.isArray(compositions) || compositions.length === 0) {
    res.status(400).json({
      success: false,
      error: "At least one composition is required",
    });
    return;
  }

  // Model seçimini Firestore'dan oku
  const systemSettings = await getSystemSettings();
  const writerModel = systemSettings?.scenarioWriterModel || "none";

  if (writerModel === "none") {
    res.status(400).json({
      success: false,
      error: "Senaryo yazıcı modeli seçilmemiş. Ayarlar > Senaryo Yazıcı Modeli'nden bir model seçin.",
    });
    return;
  }

  let text: string;
  let cost = 0;

  if (writerModel.startsWith("claude-")) {
    // Claude ile üret (Anthropic SDK)
    const anthropicApiKey = systemSettings?.anthropicApiKey;
    if (!anthropicApiKey) {
      res.status(400).json({
        success: false,
        error: "Anthropic API key tanımlı değil. Ayarlar > Prompt Optimizer bölümünden API key girin.",
      });
      return;
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const { systemPrompt, userPrompt } = getScenarioWriterSystemPrompt({
      scenarioName, compositions, compositionEntry,
    });

    const result = await anthropic.messages.create({
      model: writerModel,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    text = result.content
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map(block => block.text)
      .join("")
      .trim();

    // Maliyet tahmini (input + output tokens)
    const inputTokens = result.usage?.input_tokens || 0;
    const outputTokens = result.usage?.output_tokens || 0;
    const isHaiku = writerModel.includes("haiku");
    cost = isHaiku
      ? (inputTokens * 0.001 + outputTokens * 0.005) / 1000
      : (inputTokens * 0.003 + outputTokens * 0.015) / 1000;
  } else {
    // Gemini ile üret (varsayılan)
    const config = await getConfig();
    const geminiService = new GeminiService({
      apiKey: config.gemini.apiKey,
      imageModel: writerModel.startsWith("gemini-") ? writerModel as any : undefined,
    });
    const result = await geminiService.generateScenarioDescription({
      scenarioName,
      includesHands: false,
      compositions,
      compositionEntry,
    });
    text = result.text;
    cost = result.cost;
  }

  res.json({
    success: true,
    data: {
      description: text,
      cost,
      model: writerModel,
    },
  });
}, { timeoutSeconds: 60 });

/**
 * AI Sahne Önizleme — Dashboard pre-flight modal'dan 4 varyasyon üret
 * POST /generateScenePreview
 * Body: { scenarioId, compositionConfig?, productOverrideId?, aspectRatio? }
 * Referans asset'ler (masa, tabak, bardak) dahil edilir — Gemini gerçek objeleri görür
 */
export const generateScenePreview = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const {
    scenarioId,
    compositionConfig,
    productOverrideId,
    aspectRatio,
    previewCount: rawPreviewCount,
  } = req.body;

  // Preview sayısı: 1, 2 veya 4 (varsayılan: 4)
  const previewCount = [1, 2, 4].includes(Number(rawPreviewCount)) ? Number(rawPreviewCount) : 4;

  // Validasyon
  if (!scenarioId) {
    res.status(400).json({
      success: false,
      error: "scenarioId zorunludur",
    });
    return;
  }

  // 1. Senaryo yükle
  const scenarioDoc = await db
    .collection("global")
    .doc("scenarios")
    .collection("items")
    .doc(scenarioId)
    .get();

  if (!scenarioDoc.exists) {
    res.status(404).json({
      success: false,
      error: `Senaryo bulunamadı: ${scenarioId}`,
    });
    return;
  }

  const scenario = { id: scenarioDoc.id, ...scenarioDoc.data() } as FirestoreScenario;

  // 2. Ürün seçimi
  const suggestedProducts = scenario.suggestedProducts || [];
  let productAssetDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  if (productOverrideId) {
    // Manuel override — bulunamazsa hata ver (sessiz fallback yasak)
    const overrideDoc = await db.collection("assets").doc(productOverrideId).get();
    if (!overrideDoc.exists) {
      res.status(404).json({
        success: false,
        error: `Seçilen ürün asset'i bulunamadı: ${productOverrideId}. Asset silinmiş veya ID hatalı olabilir.`,
      });
      return;
    }
    productAssetDoc = overrideDoc as any;
  }

  if (!productAssetDoc) {
    // suggestedProducts'tan rastgele seç
    const productsQuery = db
      .collection("assets")
      .where("category", "==", "products")
      .where("isActive", "==", true);

    const assetsSnapshot = await productsQuery.get();
    const matchingAssets = suggestedProducts.length > 0
      ? assetsSnapshot.docs.filter((doc) => suggestedProducts.includes(doc.data().subType))
      : assetsSnapshot.docs;

    if (matchingAssets.length === 0) {
      res.status(400).json({
        success: false,
        error: `Aktif ürün asset'i bulunamadı. Önce Asset Havuzuna ürün ekleyin.`,
      });
      return;
    }

    productAssetDoc = matchingAssets[Math.floor(Math.random() * matchingAssets.length)];
  }

  const productData = productAssetDoc!.data()!;
  const storage = getStorage();
  const productImageBase64 = await loadImageAsBase64({ id: productAssetDoc!.id, ...productData } as any, storage);

  // 3. Referans asset'leri seç ve yükle (slot bazlı)
  const referenceImages: Array<{ base64: string; mimeType: string; label: string; description?: string; tags?: string[] }> = [];

  // compositionConfig'den slot'ları çöz
  const slots = compositionConfig?.slots || {};
  const disabledSlotKeys: string[] = [];

  // Slot tanımlarını yükle (cache'li, doğru path: global/config/settings/slot-definitions)
  const slotDefsConfig = await getSlotDefinitions();
  const slotDefs = slotDefsConfig.slots;

  for (const slotDef of slotDefs.filter(s => s.isActive)) {
    const slotKey = slotDef.key;
    const slotOverride = slots[slotKey];

    // Disabled slot
    if (slotOverride?.state === "disabled") {
      disabledSlotKeys.push(slotKey);
      continue;
    }

    let slotAssetId: string | undefined;

    if (slotOverride?.state === "manual" && slotOverride.assetId) {
      // Manuel override
      slotAssetId = slotOverride.assetId;
    } else {
      // Otomatik seç — kategoriden rastgele aktif asset
      let slotQuery = db
        .collection("assets")
        .where("category", "==", slotDef.assetCategory)
        .where("isActive", "==", true) as FirebaseFirestore.Query;
      // assetSubType tanımlıysa filtrele (cups gibi geniş kategorilerde undefined olabilir)
      if (slotDef.assetSubType) {
        slotQuery = slotQuery.where("subType", "==", slotDef.assetSubType);
      }
      const slotAssetsSnap = await slotQuery.limit(5).get();

      if (slotAssetsSnap.docs.length > 0) {
        const randomDoc = slotAssetsSnap.docs[Math.floor(Math.random() * slotAssetsSnap.docs.length)];
        slotAssetId = randomDoc.id;
      }
    }

    if (slotAssetId) {
      try {
        const slotAssetDoc = await db.collection("assets").doc(slotAssetId).get();
        if (slotAssetDoc.exists) {
          const slotAssetData = slotAssetDoc.data()!;
          const base64 = await loadImageAsBase64({ id: slotAssetDoc.id, ...slotAssetData } as any, storage);
          referenceImages.push({
            base64,
            mimeType: "image/png",
            label: slotKey,
            tags: slotAssetData.tags || [],
          });
        }
      } catch (err) {
        console.warn(`[generateScenePreview] Slot "${slotKey}" asset yüklenemedi:`, err);
      }
    }
  }

  console.log(`[generateScenePreview] ${referenceImages.length} referans görsel yüklendi`);

  // 4. Prompt oluştur
  const promptResult = await buildGeminiPrompt({
    compositionId: scenario.compositionId,
    scenarioDescription: scenario.description,
    productType: productData.subType,
    timeOfDay: "morning",
    themeSetting: scenario.setting,
    accessoryAllowed: scenario.accessoryAllowed ?? false,
    accessoryOptions: scenario.accessoryOptions,
    shallowDepthOfField: (scenario as any).shallowDepthOfField ?? false,
    includesHands: (scenario as any).includesHands ?? false,
    disabledSlotKeys: disabledSlotKeys.length > 0 ? disabledSlotKeys : undefined,
    isExplodedView: scenario.isExplodedView ?? false,
    explodedViewDescription: scenario.explodedViewDescription,
  });

  // 5. Flash model ile 4 paralel varyasyon (referans görseller dahil)
  const config = await getConfig();
  const previewGemini = new GeminiService({
    apiKey: config.gemini.apiKey,
    imageModel: "gemini-3.1-flash-image-preview",
  });

  // Pipeline context ayarla — AI logları orphan kalmasın
  previewGemini.setPipelineContext({
    slotId: `preview-${scenarioId}`,
    productType: productData.subType,
  });

  const allVariationHints = [
    "",
    " Slightly closer framing, emphasizing product texture.",
    " Slightly wider framing, showing more of the surrounding scene.",
    " Subtle angle shift, different perspective on the same moment.",
  ];
  const variationHints = allVariationHints.slice(0, previewCount);

  console.log(`[generateScenePreview] ${previewCount} varyasyon üretilecek`);

  const results = await Promise.allSettled(
    variationHints.map((hint) =>
      previewGemini.transformImage(productImageBase64, "image/png", {
        prompt: promptResult.mainPrompt + hint,
        negativePrompt: promptResult.negativePrompt,
        faithfulness: 0.5,
        aspectRatio: (aspectRatio as any) || "1:1",
        referenceImages,
        disabledSlotKeys: disabledSlotKeys.length > 0 ? disabledSlotKeys : undefined,
      })
    )
  );

  // 6. Sonuçları formatla + maliyet hesapla
  let totalPreviewCost = 0;
  const previews = results.map((r) => {
    if (r.status === "fulfilled") {
      totalPreviewCost += r.value.cost || 0;
      return { imageBase64: r.value.imageBase64, mimeType: r.value.mimeType, cost: r.value.cost };
    }
    return null;
  });

  const successCount = previews.filter((p) => p !== null).length;
  console.log(`[generateScenePreview] ${successCount}/4 varyasyon başarılı, ürün: ${productData.filename}, referans: ${referenceImages.length}, toplam maliyet: $${totalPreviewCost.toFixed(4)}`);

  res.json({
    success: true,
    data: {
      previews,
      productUsed: { id: productAssetDoc!.id, filename: productData.filename },
      successCount,
      totalPreviewCost,
      costPerPreview: successCount > 0 ? totalPreviewCost / successCount : 0,
    },
  });
}, { timeoutSeconds: 120, memory: "1GiB" });

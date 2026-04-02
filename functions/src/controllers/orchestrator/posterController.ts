/**
 * Poster Controller
 * Stil + mood + aspect ratio bazlı profesyonel poster üretimi
 * 4 varyasyon desteği: Claude 1x → Gemini Nx paralel → Sharp overlay Nx
 */

import { createHttpFunction, errorResponse, db, getConfig } from "./shared";
import { getSystemSettings, clearConfigCache } from "../../services/configService";
import { GeminiService } from "../../services/gemini";
import { getPosterStyleById, getPosterMoodById, getPosterAspectRatioById, getPosterTypographyById, getPosterLayoutById } from "../../services/config/posterConfig";
import { getGlobalRules } from "../../services/posterLearningService";
import { overlayText } from "../../services/posterTextOverlay";
import { getStorage } from "firebase-admin/storage";
// Lazy imports
const getPosterPromptBuilder = () => import("../../orchestrator/posterSkillPrompt");

/**
 * Poster üret — 1-4 varyasyon desteği
 * POST /generatePoster
 */
export const generatePoster = createHttpFunction(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  // ═══ LOG SİSTEMİ ═══
  const logs: Array<{ ts: number; phase: string; level: string; message: string; data?: any }> = [];
  const t0 = Date.now();
  const log = (phase: string, message: string, data?: any, level = "info") => {
    const entry = { ts: Date.now() - t0, phase, level, message, data };
    logs.push(entry);
    const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "✓";
    console.log(`[Poster] ${prefix} ${phase} | ${message}`);
  };

  const {
    productImageBase64,
    productImageUrl,
    productMimeType,
    styleId = "bold-minimal",
    moodId = "warm---intimate",
    aspectRatioId = "2-3",
    typographyId,
    layoutId,
    title,
    subtitle,
    price,
    additionalNotes,
    variationCount = 1,
  } = req.body;

  const count = Math.min(4, Math.max(1, Number(variationCount)));

  log("INIT", "Poster üretimi başladı", {
    styleId, moodId, aspectRatioId, typographyId: typographyId || "otomatik",
    layoutId: layoutId || "otomatik", variationCount: count,
    title: title || "(AI üretecek)", subtitle: subtitle || "(AI üretecek)",
    price: price || "(yok)", additionalNotes: additionalNotes || "(yok)",
    imageSource: productImageBase64 ? "base64 upload" : productImageUrl ? "URL" : "YOK",
  });

  // Validasyon
  if (!productImageBase64 && !productImageUrl) {
    log("INIT", "Ürün görseli eksik", undefined, "error");
    res.status(400).json({ success: false, error: "Ürün görseli gerekli.", logs });
    return;
  }

  // System settings
  clearConfigCache();
  const systemSettings = await getSystemSettings();
  const anthropicApiKey = systemSettings?.anthropicApiKey;
  const posterModel = (systemSettings as any)?.posterImageModel || systemSettings?.posterModel || "gemini-2.5-flash-image";
  const isGeminiModel = posterModel.startsWith("google/") || posterModel.startsWith("gemini-") || !posterModel.includes("/");

  log("CONFIG", "System settings yüklendi", {
    posterImageModel: posterModel,
    provider: isGeminiModel ? "Google Gemini (direkt)" : "OpenRouter",
    anthropicKey: anthropicApiKey ? `●●●●${anthropicApiKey.slice(-4)}` : "YOK",
    openRouterKey: (systemSettings as any)?.openRouterApiKey ? `●●●●${((systemSettings as any).openRouterApiKey as string).slice(-4)}` : "YOK",
    preferredProvider: (systemSettings as any)?.preferredProvider || "belirtilmemiş",
  });

  if (!anthropicApiKey) {
    log("CONFIG", "Anthropic API key tanımlı değil", undefined, "error");
    res.status(400).json({ success: false, error: "Anthropic API key tanımlı değil.", logs });
    return;
  }

  // Gemini API key
  const config = await getConfig();
  const geminiApiKey = config.gemini.apiKey;
  log("CONFIG", "Gemini API key", { status: geminiApiKey ? "mevcut" : "YOK" });

  // Firestore config yükle
  const configStart = Date.now();
  const [style, mood, aspectRatio, typography, layout] = await Promise.all([
    getPosterStyleById(styleId),
    getPosterMoodById(moodId),
    getPosterAspectRatioById(aspectRatioId),
    typographyId ? getPosterTypographyById(typographyId) : Promise.resolve(null),
    layoutId ? getPosterLayoutById(layoutId) : Promise.resolve(null),
  ]);

  log("CONFIG", "Firestore poster config yüklendi", {
    süre: `${Date.now() - configStart}ms`,
    stil: style?.name || "bulunamadı",
    mood: mood?.name || "bulunamadı",
    ratio: aspectRatio ? `${aspectRatio.width}:${aspectRatio.height} (${aspectRatio.label})` : "bulunamadı",
    tipografi: typography?.name || "otomatik",
    yerleşim: layout?.name || "otomatik",
  });

  // Görsel hazırla
  let imageBase64 = productImageBase64;
  let imageMimeType = productMimeType || "image/jpeg";

  if (!imageBase64 && productImageUrl) {
    const fetchStart = Date.now();
    const fetchResponse = await fetch(productImageUrl);
    const buffer = await fetchResponse.arrayBuffer();
    imageBase64 = Buffer.from(buffer).toString("base64");
    imageMimeType = fetchResponse.headers.get("content-type") || "image/jpeg";
    log("CONFIG", "Görsel URL'den indirildi", { süre: `${Date.now() - fetchStart}ms`, mimeType: imageMimeType });
  }

  const imageSizeKB = Math.round((imageBase64.length * 3 / 4) / 1024);
  log("CONFIG", "Ürün görseli hazır", { boyut: `${imageSizeKB} KB`, mimeType: imageMimeType });

  // ═══════════════════════════════════════════
  // FAZ 1: Claude — prompt üretimi
  // ═══════════════════════════════════════════
  log("FAZ-1", "Claude prompt üretimi başlıyor", { model: "claude-haiku-4-5-20251001" });
  const faz1Start = Date.now();

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });
  const { buildPosterSystemPrompt, buildPosterUserMessage, parsePosterResponse } = await getPosterPromptBuilder();
  const globalRulesData = await getGlobalRules();

  const systemPrompt = buildPosterSystemPrompt(style, mood, aspectRatio, globalRulesData.rules, typography, layout);
  const userMessage = buildPosterUserMessage({
    styleName: style.name,
    moodName: mood.name,
    aspectRatioLabel: aspectRatio.label,
    additionalNotes,
  });

  log("FAZ-1", "System prompt hazırlandı", {
    uzunluk: `${systemPrompt.length} karakter`,
    globalKuralSayısı: globalRulesData.rules?.length || 0,
  });

  const claudeResult = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: imageMimeType as any, data: imageBase64 } },
      { type: "text", text: userMessage },
    ]}],
  });

  const fullResponse = claudeResult.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map(b => b.text).join("").trim();

  const claudeInputTokens = claudeResult.usage?.input_tokens || 0;
  const claudeOutputTokens = claudeResult.usage?.output_tokens || 0;
  const claudeCost = (claudeInputTokens * 0.001 + claudeOutputTokens * 0.005) / 1000;
  const faz1Duration = Date.now() - faz1Start;

  if (!fullResponse) {
    log("FAZ-1", "Claude boş yanıt döndü", { stop_reason: claudeResult.stop_reason }, "error");
    res.status(500).json({ success: false, error: "Claude prompt üretemedi.", logs });
    return;
  }

  const { analysis, prompt: geminiPrompt } = parsePosterResponse(fullResponse);

  log("FAZ-1", "Claude prompt üretimi tamamlandı", {
    süre: `${faz1Duration}ms`,
    inputTokens: claudeInputTokens,
    outputTokens: claudeOutputTokens,
    maliyet: `$${claudeCost.toFixed(6)}`,
    stopReason: claudeResult.stop_reason,
    promptUzunluk: `${geminiPrompt.length} karakter`,
    analizUzunluk: `${analysis.length} karakter`,
  });

  log("FAZ-1", "Ürün analizi", { analiz: analysis });
  log("FAZ-1", "Üretilen prompt", { prompt: geminiPrompt });

  // ═══════════════════════════════════════════
  // FAZ 2: Görsel üretim
  // ═══════════════════════════════════════════
  const ratioStr = `${aspectRatio.width}:${aspectRatio.height}`;
  log("FAZ-2", "Görsel üretim başlıyor", {
    model: posterModel,
    provider: isGeminiModel ? "Gemini SDK" : "OpenRouter",
    varyasyonSayısı: count,
    aspectRatio: ratioStr,
  });
  const faz2Start = Date.now();

  let imageResults: ({ imageBase64: string; mimeType: string; cost: number } | null)[];

  if (isGeminiModel) {
    const geminiModelId = posterModel.replace(/^google\//, "");
    log("FAZ-2", "Gemini SDK kullanılıyor", { modelId: geminiModelId, apiKeyPrefix: `${geminiApiKey?.substring(0, 8)}...` });
    const geminiService = new GeminiService({ apiKey: geminiApiKey || "" });
    imageResults = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        geminiService.generatePoster({
          productImageBase64: imageBase64,
          productMimeType: imageMimeType,
          prompt: geminiPrompt,
          model: geminiModelId,
          aspectRatio: ratioStr,
        }).then(r => {
          log("FAZ-2", `Varyasyon ${i + 1} başarılı`, { maliyet: `$${r.cost.toFixed(4)}`, mimeType: r.mimeType, boyut: `${Math.round((r.imageBase64.length * 3 / 4) / 1024)} KB` });
          return r;
        }).catch(err => {
          log("FAZ-2", `Varyasyon ${i + 1} HATA`, { hata: err.message }, "error");
          return null;
        })
      )
    );
  } else {
    const { generateImageViaOpenRouter } = await import("../../services/openRouterService");
    const openRouterKey = (systemSettings as any)?.openRouterApiKey;
    if (!openRouterKey) {
      log("FAZ-2", "OpenRouter API key tanımlı değil", undefined, "error");
      res.status(400).json({ success: false, error: "OpenRouter API key tanımlı değil.", logs });
      return;
    }
    log("FAZ-2", "OpenRouter kullanılıyor", { model: posterModel });
    imageResults = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        generateImageViaOpenRouter({
          apiKey: openRouterKey,
          model: posterModel,
          prompt: geminiPrompt,
          referenceImageBase64: imageBase64,
          referenceImageMimeType: imageMimeType,
          aspectRatio: ratioStr,
        }).then(r => {
          log("FAZ-2", `Varyasyon ${i + 1} başarılı`, { maliyet: `$${r.cost.toFixed(4)}`, mimeType: r.mimeType, boyut: `${Math.round((r.imageBase64.length * 3 / 4) / 1024)} KB` });
          return r;
        }).catch(err => {
          log("FAZ-2", `Varyasyon ${i + 1} HATA`, { hata: err.message }, "error");
          return null;
        })
      )
    );
  }
  const successfulResults = imageResults.filter(r => r !== null);
  const faz2Duration = Date.now() - faz2Start;

  log("FAZ-2", "Görsel üretim tamamlandı", {
    süre: `${faz2Duration}ms`,
    başarılı: successfulResults.length,
    başarısız: count - successfulResults.length,
    toplam: count,
  });

  if (successfulResults.length === 0) {
    log("FAZ-2", "Hiçbir varyasyon üretilemedi", undefined, "error");
    res.status(500).json({ success: false, error: "Hiçbir varyasyon üretilemedi.", logs });
    return;
  }

  // ═══════════════════════════════════════════
  // FAZ 3: Sharp text overlay
  // ═══════════════════════════════════════════
  const moodColors = (mood as any).typographyColors || undefined;
  const overlayTitle = title || analysis.split(".")[0] || undefined;

  log("FAZ-3", "Text overlay başlıyor", {
    başlık: overlayTitle || "(yok)",
    altBaşlık: subtitle || "(yok)",
    fiyat: price || "(yok)",
    tipografi: typographyId || "otomatik",
    yerleşim: layoutId || "otomatik",
    moodRenkleri: moodColors ? "var" : "varsayılan",
  });
  const faz3Start = Date.now();

  const overlayPromises = successfulResults.map((r, i) =>
    overlayText({
      imageBuffer: Buffer.from(r!.imageBase64, "base64"),
      width: 0,
      height: 0,
      title: overlayTitle,
      subtitle: subtitle || undefined,
      price: price || undefined,
      typographyId: typographyId || undefined,
      layoutId: layoutId || undefined,
      colors: moodColors,
    }).then(result => {
      log("FAZ-3", `Overlay ${i + 1} tamamlandı`, { boyut: `${Math.round(result.buffer.length / 1024)} KB` });
      return result;
    }).catch(err => {
      log("FAZ-3", `Overlay ${i + 1} HATA`, { hata: err.message }, "error");
      return null;
    })
  );

  const overlayResults = await Promise.all(overlayPromises);
  const faz3Duration = Date.now() - faz3Start;
  log("FAZ-3", "Text overlay tamamlandı", { süre: `${faz3Duration}ms` });

  // ═══════════════════════════════════════════
  // FAZ 4: Storage + Galeri
  // ═══════════════════════════════════════════
  log("FAZ-4", "Storage yükleme ve galeri kaydı başlıyor");
  const faz4Start = Date.now();
  const timestamp = Date.now();
  const bucket = getStorage().bucket();
  let totalGeminiCost = 0;

  const variations = await Promise.all(
    overlayResults.map(async (overlay, i) => {
      if (!overlay) return null;

      const fileName = `posters/poster_${styleId}_${timestamp}_v${i + 1}.png`;
      const file = bucket.file(fileName);
      await file.save(overlay.buffer, {
        metadata: { contentType: "image/png", metadata: { styleId, moodId, variation: String(i + 1) } },
      });
      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      const geminiCost = successfulResults[i]?.cost || 0;
      totalGeminiCost += geminiCost;

      const galleryId = `poster_${timestamp}_v${i + 1}`;
      await db.collection("global/posters/items").doc(galleryId).set({
        posterUrl: publicUrl,
        styleId, moodId, aspectRatioId,
        title: overlayTitle || "Poster",
        subtitle: subtitle || "",
        generatedPrompt: geminiPrompt,
        productAnalysis: analysis,
        cost: { claude: claudeCost / count, gemini: geminiCost, total: (claudeCost / count) + geminiCost },
        model: posterModel,
        createdAt: timestamp,
        variationIndex: i + 1,
      });

      log("FAZ-4", `Varyasyon ${i + 1} kaydedildi`, {
        galleryId,
        dosya: fileName,
        posterUrl: publicUrl,
        maliyet: { claude: `$${(claudeCost / count).toFixed(4)}`, görsel: `$${geminiCost.toFixed(4)}` },
      });

      return {
        posterUrl: publicUrl,
        posterBase64: overlay.buffer.toString("base64"),
        galleryId,
        variationIndex: i + 1,
      };
    })
  );

  const successfulVariations = variations.filter(v => v !== null);
  const faz4Duration = Date.now() - faz4Start;
  log("FAZ-4", "Storage ve galeri kaydı tamamlandı", { süre: `${faz4Duration}ms` });

  // ═══════════════════════════════════════════
  // ÖZET
  // ═══════════════════════════════════════════
  const totalDuration = Date.now() - t0;
  log("ÖZET", "Poster üretimi tamamlandı", {
    toplamSüre: `${(totalDuration / 1000).toFixed(1)}sn`,
    fazSüreleri: {
      "Faz 1 (Claude prompt)": `${(faz1Duration / 1000).toFixed(1)}sn`,
      "Faz 2 (Görsel üretim)": `${(faz2Duration / 1000).toFixed(1)}sn`,
      "Faz 3 (Text overlay)": `${(faz3Duration / 1000).toFixed(1)}sn`,
      "Faz 4 (Storage/Galeri)": `${(faz4Duration / 1000).toFixed(1)}sn`,
    },
    maliyet: {
      claude: `$${claudeCost.toFixed(4)}`,
      görsel: `$${totalGeminiCost.toFixed(4)}`,
      toplam: `$${(claudeCost + totalGeminiCost).toFixed(4)}`,
    },
    model: posterModel,
    başarılıVaryasyon: `${successfulVariations.length}/${count}`,
  });

  res.json({
    success: true,
    data: {
      variations: successfulVariations,
      generatedPrompt: geminiPrompt,
      productAnalysis: analysis,
      cost: { claude: claudeCost, gemini: totalGeminiCost, total: claudeCost + totalGeminiCost },
      count: successfulVariations.length,
      logs,
    },
  });
}, { timeoutSeconds: 300, memory: "1GiB" });

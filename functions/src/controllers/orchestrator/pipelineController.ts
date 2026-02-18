/**
 * Pipeline Controller
 * Pipeline tetikleme ve scheduler işlemleri
 */

import { functions, db, getCors, REGION, getOrchestratorConfig, errorResponse } from "./shared";
import { type Query } from "firebase-admin/firestore";
import { clearConfigCache } from "../../services/configService";
import * as categoryService from "../../services/categoryService";
import { OrchestratorScheduler } from "../../orchestrator/scheduler";
import {
  ProductType,
  CompositionConfig,
  WEATHER_PRESETS,
  LIGHTING_PRESETS,
  ATMOSPHERE_PRESETS,
  SlotDefinition,
} from "../../orchestrator/types";

const TIMEZONE = "Europe/Istanbul";

/**
 * Scheduler'ı manuel tetikle (test için)
 */
export const triggerOrchestratorScheduler = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const config = await getOrchestratorConfig();
        const scheduler = new OrchestratorScheduler(config);

        const result = await scheduler.checkAndTrigger();

        response.json({
          success: true,
          data: result,
        });
      } catch (error) {
        errorResponse(response, error, "triggerOrchestratorScheduler");
      }
    });
  });

/**
 * Belirli bir kural için pipeline başlat
 */
export const triggerOrchestratorPipeline = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const ruleId = request.query.ruleId as string || request.body?.ruleId;

        if (!ruleId) {
          response.status(400).json({
            success: false,
            error: "Missing required parameter: ruleId",
          });
          return;
        }

        const config = await getOrchestratorConfig();
        const scheduler = new OrchestratorScheduler(config);

        const slotId = await scheduler.triggerManually(ruleId);

        response.json({
          success: true,
          message: "Pipeline triggered",
          slotId,
        });
      } catch (error) {
        errorResponse(response, error, "triggerOrchestratorPipeline");
      }
    });
  });

/**
 * Hemen içerik üret (productType opsiyonel — yoksa senaryodan otomatik belirlenir)
 */
export const orchestratorGenerateNow = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const { productType, scenarioId, themeId, aspectRatio, isRandomMode, compositionConfig } = request.body as {
          productType?: ProductType;
          scenarioId?: string;
          themeId?: string; // Deprecated: geriye uyumluluk
          aspectRatio?: "1:1" | "3:4" | "9:16";
          isRandomMode?: boolean;
          compositionConfig?: CompositionConfig;
        };

        // scenarioId öncelikli, yoksa eski themeId'yi kullan (geriye uyumluluk)
        const effectiveScenarioId = scenarioId || themeId;

        // Manuel üretimde her zaman güncel config kullan (kullanıcı az önce düzenlemiş olabilir)
        clearConfigCache();
        const config = await getOrchestratorConfig();
        const scheduler = new OrchestratorScheduler(config);

        // Pipeline tamamlanana kadar bekle (productType opsiyonel — auto mod)
        const result = await scheduler.generateNow(effectiveScenarioId, aspectRatio, productType, isRandomMode, compositionConfig);

        if (result.success) {
          response.json({
            success: true,
            message: "Generation completed",
            slotId: result.slotId,
            duration: result.duration,
          });
        } else {
          response.status(500).json({
            success: false,
            error: result.error || "Pipeline failed",
            slotId: result.slotId,
            duration: result.duration,
          });
        }
      } catch (error) {
        errorResponse(response, error, "orchestratorGenerateNow");
      }
    });
  });

/**
 * Telegram bildirimini tekrar gönder (manuel tetikleme)
 */
export const orchestratorResendTelegram = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 60 })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const { slotId } = request.body as { slotId: string };

        if (!slotId) {
          response.status(400).json({
            success: false,
            error: "slotId is required",
          });
          return;
        }

        // Slot'u getir
        const slotDoc = await db.collection("scheduled-slots").doc(slotId).get();
        if (!slotDoc.exists) {
          response.status(404).json({ success: false, error: "Slot not found" });
          return;
        }

        const slot = slotDoc.data();
        if (!slot?.pipelineResult) {
          response.status(400).json({ success: false, error: "Slot does not have pipeline result" });
          return;
        }

        // Config ve Orchestrator başlat
        const config = await getOrchestratorConfig();
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Orchestrator } = require("../../orchestrator/orchestrator");
        const orchestrator = new Orchestrator(config);

        const messageId = await orchestrator.sendTelegramApproval(slot.pipelineResult);

        // Slot'u güncelle
        await db.collection("scheduled-slots").doc(slotId).update({
          telegramMessageId: messageId,
          updatedAt: Date.now(),
        });

        response.json({
          success: true,
          message: "Telegram notification resent",
          messageId,
        });
      } catch (error) {
        errorResponse(response, error, "orchestratorResendTelegram");
      }
    });
  });

/**
 * Pre-flight validation — pipeline çalıştırmadan önce kontrolleri yap
 * Hafif endpoint: senaryo + ürün uyumluluğu kontrol eder
 */
export const validateBeforeGenerate = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        // scenarioId öncelikli, yoksa eski themeId'yi kabul et (geriye uyumluluk)
        const scenarioId = (request.query.scenarioId || request.query.themeId) as string | undefined;

        const warnings: Array<{ type: "info" | "warning" | "error"; message: string }> = [];

        if (!scenarioId) {
          warnings.push({ type: "info", message: "Senaryo seçilmedi — rastgele senaryo kullanılacak" });
          response.json({ success: true, warnings, canProceed: true });
          return;
        }

        // Global config'den senaryoları al (forceRefresh: kullanıcı az önce güncellemiş olabilir)
        const { getGlobalConfig, ensureConfigInitialized } = await import("../../services/configService");
        await ensureConfigInitialized();
        const globalConfig = await getGlobalConfig(true);
        const allScenarios = globalConfig.scenarios || [];

        // 1. Senaryoyu bul
        const selectedScenario = allScenarios.find((s: any) => s.id === scenarioId) as any;
        if (!selectedScenario) {
          warnings.push({ type: "error", message: `Senaryo bulunamadı: ${scenarioId}` });
          response.json({ success: true, warnings, canProceed: false });
          return;
        }

        // 2. suggestedProducts kontrolü → productType belirlenebilir mi?
        let determinedProductType: string | null = null;
        if (selectedScenario.suggestedProducts && selectedScenario.suggestedProducts.length > 0) {
          determinedProductType = selectedScenario.suggestedProducts[0];
        } else {
          warnings.push({ type: "warning", message: "Senaryo'da önerilen ürün tipi tanımlı değil — ilk aktif kategoriden seçilecek" });
        }

        // Asset preview tipi
        interface AssetPreviewInfo {
          id: string;
          filename: string;
          url: string;
          tags: string[];
        }

        // En düşük usageCount'lu asset'i seç
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pickPreview = (docs: Array<{ id: string; data: () => any }>): AssetPreviewInfo | undefined => {
          if (docs.length === 0) return undefined;
          const sorted = [...docs].sort((a, b) => (a.data().usageCount || 0) - (b.data().usageCount || 0));
          const d = sorted[0].data();
          return {
            id: sorted[0].id,
            filename: d.filename || d.originalFilename || "",
            url: d.cloudinaryUrl || d.storageUrl || d.thumbnailUrl || "",
            tags: d.tags || [],
          };
        };

        // 3. O productType için ürün asset'i var mı?
        let productCount = 0;
        let productPreview: AssetPreviewInfo | undefined;
        if (determinedProductType) {
          const productAssets = await db.collection("assets")
            .where("category", "==", "products")
            .where("subType", "==", determinedProductType)
            .where("isActive", "==", true)
            .limit(50)
            .get();
          productCount = productAssets.size;
          productPreview = pickPreview(productAssets.docs);
          if (productAssets.empty) {
            warnings.push({ type: "error", message: `"${determinedProductType}" için aktif ürün görseli yok — Assets sayfasından ekleyin` });
          }
        }

        // 4. Asset sayıları — compositionSlots + slot tanımları (dinamik)
        const compositionSlots = selectedScenario.compositionSlots as Record<string, { state: string; filterTags?: string[] }> | undefined;
        const oldPreferredTags = selectedScenario.setting?.preferredTags as { table?: string[]; plate?: string[]; cup?: string[] } | undefined;

        // Slot tanımlarını yükle
        const { getSlotDefinitions } = await import("../../services/configService");
        const slotDefsConfig = await getSlotDefinitions();
        const activeSlots = slotDefsConfig.slots.filter((s: SlotDefinition) => s.isActive);

        // Eski preferredTags → assetFieldName bazlı map (geriye uyumluluk)
        const oldTagsByField: Record<string, string[] | undefined> = {};
        if (oldPreferredTags) {
          oldTagsByField["table"] = oldPreferredTags.table;
          oldTagsByField["plate"] = oldPreferredTags.plate;
          oldTagsByField["cup"] = oldPreferredTags.cup;
        }

        // Etiket eşleşme detayı
        interface MatchDetails {
          bestScore: string;
          matchedTags: string[];
          missedTags: string[];
          bestAsset?: AssetPreviewInfo;
        }

        const countAssetsWithPreferred = async (
          category: string,
          subType: string | undefined,
          tagList?: string[],
          label?: string,
          slotKey?: string
        ): Promise<{ total: number; preferred: number; preview?: AssetPreviewInfo; matchDetails?: MatchDetails; resolvedCategory?: string }> => {
          // Kademeli arama: en spesifikten en genişe
          let assetsQuery: FirebaseFirestore.QuerySnapshot;
          let resolvedCategory = category;

          // 1. Adım: Kategori + SubType (en spesifik)
          if (subType) {
            assetsQuery = await db.collection("assets")
              .where("isActive", "==", true)
              .where("category", "==", category)
              .where("subType", "==", subType)
              .limit(100)
              .get();

            // SubType eşleşmezse sadece kategori ile dene — AMA subType varsa
            // üst kategori çok geniş olabilir (ör: "props" 27 asset döner: kutu+çatal+peçete).
            // Bu yüzden subType varken sadece-kategori denemesi yapma, doğrudan fallback'a geç.
          } else {
            assetsQuery = await db.collection("assets")
              .where("isActive", "==", true)
              .where("category", "==", category)
              .limit(100)
              .get();
          }

          // 2. Adım: Hâlâ boşsa dinamik kategorilerden ara (linkedSlotKey + isim eşleştirme)
          if (assetsQuery.empty && label) {
            try {
              const catConfig = await categoryService.getCategories();
              const categories = catConfig.categories.filter(c => !c.isDeleted);

              // linkedSlotKey ile bağlı kategoriyi bul
              const linkedCat = slotKey ? categories.find(c => c.linkedSlotKey === slotKey) : undefined;
              if (linkedCat) {
                assetsQuery = await db.collection("assets")
                  .where("category", "==", linkedCat.type)
                  .where("isActive", "==", true)
                  .limit(100)
                  .get();
                if (!assetsQuery.empty) {
                  resolvedCategory = linkedCat.type;
                }
              }

              // Hâlâ boşsa isim eşleştirme
              if (assetsQuery.empty) {
                const keywords = label.toLowerCase().split(/[\s\/\-]+/).filter(w => w.length > 2);
                for (const cat of categories) {
                  const catName = cat.displayName.toLowerCase();
                  if (keywords.some(kw => catName.includes(kw))) {
                    const fallbackSnap = await db.collection("assets")
                      .where("category", "==", cat.type)
                      .where("isActive", "==", true)
                      .limit(100)
                      .get();
                    if (!fallbackSnap.empty) {
                      assetsQuery = fallbackSnap;
                      resolvedCategory = cat.type;
                      break;
                    }
                  }
                }
              }
            } catch (err) {
              console.warn(`[Preflight] Slot fallback hatası:`, err);
            }
          }
          const total = assetsQuery.size;
          if (!tagList || tagList.length === 0 || tagList.includes("__none__")) {
            return { total, preferred: 0, preview: pickPreview(assetsQuery.docs), resolvedCategory };
          }

          // Skor bazlı eşleşme: her asset için kaç etiket eşleşiyor
          // Çift yönlü: "portakal" ↔ "portakal suyu" her iki yönde eşleşir
          const tagMatches = (assetTag: string, filterTag: string): boolean => {
            const a = assetTag.toLowerCase();
            const f = filterTag.toLowerCase();
            return a.includes(f) || f.includes(a);
          };

          const scored = assetsQuery.docs
            .filter(doc => {
              const tags: string[] = doc.data().tags || [];
              return tags.length > 0;
            })
            .map(doc => {
              const data = doc.data();
              // Asset tag'leri + subType slug'ı (tire→boşluk) implicit tag olarak ekle
              const tags: string[] = [...(data.tags || [])];
              if (data.subType) {
                tags.push(data.subType.replace(/-/g, " "));
              }
              const matched = tagList.filter(pt =>
                tags.some(t => tagMatches(t, pt))
              );
              return { doc, matchCount: matched.length, matchedTags: matched };
            })
            .filter(item => item.matchCount > 0)
            .sort((a, b) => {
              if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
              return (a.doc.data().usageCount || 0) - (b.doc.data().usageCount || 0);
            });

          const preferred = scored.length;

          // En iyi eşleşen asset'in detayları
          let matchDetails: MatchDetails | undefined;
          if (scored.length > 0) {
            const best = scored[0];
            const bestData = best.doc.data();
            const missedTags = tagList.filter(pt =>
              !best.matchedTags.includes(pt)
            );
            matchDetails = {
              bestScore: `${best.matchCount}/${tagList.length}`,
              matchedTags: best.matchedTags,
              missedTags,
              bestAsset: {
                id: best.doc.id,
                filename: bestData.filename || bestData.originalFilename || "",
                url: bestData.cloudinaryUrl || bestData.storageUrl || bestData.thumbnailUrl || "",
                tags: bestData.tags || [],
              },
            };
          } else {
            matchDetails = {
              bestScore: `0/${tagList.length}`,
              matchedTags: [],
              missedTags: tagList,
            };
          }

          if (preferred === 0 && label) {
            warnings.push({ type: "warning", message: `Senaryo'da ${label} tercihi "${tagList.join(", ")}" ama eşleşen asset yok` });
          }
          // Preview: en iyi etiket eşleşmesi varsa onu göster, yoksa en az kullanılandan
          const preview = matchDetails?.bestAsset || pickPreview(scored.length > 0 ? scored.map(s => s.doc) : assetsQuery.docs);
          return { total, preferred, preview, matchDetails, resolvedCategory };
        };

        // Dinamik slot istatistikleri
        const slotStats: Record<string, { total: number; preferred: number; label: string; disabled?: boolean; preview?: AssetPreviewInfo; matchDetails?: MatchDetails; order: number; category?: string; subType?: string }> = {};

        await Promise.all(activeSlots.map(async (slot: SlotDefinition) => {
          const slotConfig = compositionSlots?.[slot.key];
          const isDisabled = slotConfig?.state === "disabled";

          if (isDisabled) {
            slotStats[slot.key] = { total: 0, preferred: 0, label: slot.label, disabled: true, order: slot.order, category: slot.assetCategory, subType: slot.assetSubType };
            return;
          }

          // Tag'leri belirle: compositionSlots > eski preferredTags > boş
          let tagList: string[] | undefined;
          if (slotConfig?.filterTags?.length) {
            tagList = slotConfig.filterTags;
          } else if (oldTagsByField[slot.assetFieldName]?.length) {
            tagList = oldTagsByField[slot.assetFieldName];
          }

          const stats = await countAssetsWithPreferred(
            slot.assetCategory,
            slot.assetSubType,
            tagList,
            slot.label,
            slot.key
          );
          slotStats[slot.key] = { ...stats, label: slot.label, order: slot.order, category: stats.resolvedCategory || slot.assetCategory, subType: slot.assetSubType };
        }));

        // Geriye uyumluluk: preferredTags objesini hala oluştur (scenario bilgisi için)
        const preferredTags: { table?: string[]; plate?: string[]; cup?: string[] } = {};
        for (const slot of activeSlots) {
          const slotConfig = compositionSlots?.[slot.key];
          const fieldName = slot.assetFieldName as "table" | "plate" | "cup";
          if (fieldName === "table" || fieldName === "plate" || fieldName === "cup") {
            if (slotConfig?.state === "disabled") {
              preferredTags[fieldName] = ["__none__"];
            } else if (slotConfig?.filterTags?.length) {
              preferredTags[fieldName] = slotConfig.filterTags;
            } else if (oldTagsByField[fieldName]?.length) {
              preferredTags[fieldName] = oldTagsByField[fieldName];
            }
          }
        }

        // 5. Preset label'larını çöz
        const resolvePreset = <T extends { id: string; labelTr: string }>(
          presets: readonly T[],
          id?: string
        ): string | undefined => {
          if (!id) return undefined;
          return presets.find(p => p.id === id)?.labelTr;
        };

        // PreFlightData oluştur
        const preFlightData = {
          scenario: {
            name: selectedScenario.name,
            description: selectedScenario.description || "",
            suggestedProducts: selectedScenario.suggestedProducts || [],
            compositionId: selectedScenario.compositionId,
            includesHands: selectedScenario.includesHands ?? true,
            preferredTags: Object.keys(preferredTags).length > 0 ? preferredTags : undefined,
            compositionSlots: compositionSlots || undefined,
            presets: {
              weather: resolvePreset(WEATHER_PRESETS, selectedScenario.setting?.weatherPreset),
              lighting: resolvePreset(LIGHTING_PRESETS, selectedScenario.setting?.lightingPreset),
              atmosphere: resolvePreset(ATMOSPHERE_PRESETS, selectedScenario.setting?.atmospherePreset),
            },
            petAllowed: selectedScenario.petAllowed || false,
            accessoryAllowed: selectedScenario.accessoryAllowed || false,
          },
          assets: {
            products: { total: productCount, preview: productPreview },
            // Eski sabit alanlar — geriye uyumluluk (frontend geçiş sürecinde her ikisi de gönderiliyor)
            tables: slotStats["surface"] || { total: 0, preferred: 0 },
            plates: slotStats["dish"] || { total: 0, preferred: 0 },
            cups: slotStats["drinkware"] || { total: 0, preferred: 0 },
            // Dinamik slot istatistikleri
            slots: slotStats,
          },
          // beverage rules kaldırıldı — içecek seçimi artık etiket bazlı
        };

        const hasError = warnings.some(w => w.type === "error");
        response.json({
          success: true,
          warnings,
          canProceed: !hasError,
          preFlightData,
        });
      } catch (error) {
        errorResponse(response, error, "validateBeforeGenerate");
      }
    });
  });

/**
 * Asset Tag Audit — Tüm aktif asset'lerin etiket dağılımını çıkar
 * Firestore'daki veri kalitesini kontrol etmek için
 */
export const assetTagAudit = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        // Tüm aktif asset'leri çek
        const assetsSnap = await db.collection("assets")
          .where("isActive", "==", true)
          .get();

        // Kategori + subType bazlı gruplama
        const audit: Record<string, {
          category: string;
          subType: string;
          total: number;
          tagged: number;
          untagged: number;
          tagDistribution: Record<string, number>;
          untaggedAssets: Array<{ id: string; filename: string }>;
        }> = {};

        assetsSnap.docs.forEach(doc => {
          const data = doc.data();
          const key = `${data.category}/${data.subType}`;
          if (!audit[key]) {
            audit[key] = {
              category: data.category,
              subType: data.subType,
              total: 0,
              tagged: 0,
              untagged: 0,
              tagDistribution: {},
              untaggedAssets: [],
            };
          }
          const entry = audit[key];
          entry.total++;

          const tags: string[] = data.tags || [];
          if (tags.length > 0) {
            entry.tagged++;
            tags.forEach(tag => {
              entry.tagDistribution[tag] = (entry.tagDistribution[tag] || 0) + 1;
            });
          } else {
            entry.untagged++;
            entry.untaggedAssets.push({
              id: doc.id,
              filename: data.filename || data.originalFilename || doc.id,
            });
          }
        });

        // Tag dağılımını sırala (en yaygın → en az)
        const sortedAudit = Object.values(audit).map(entry => ({
          ...entry,
          topTags: Object.entries(entry.tagDistribution)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([tag, count]) => ({ tag, count })),
        }));

        // Opsiyonel: Senaryodaki etiketlerle karşılaştır
        const scenarioId = request.query.scenarioId as string | undefined;
        let scenarioComparison: Record<string, { slotTags: string[]; matchingAssets: number; totalAssets: number }> | undefined;

        if (scenarioId) {
          const { getGlobalConfig, ensureConfigInitialized, getSlotDefinitions: getSlotDefs } = await import("../../services/configService");
          await ensureConfigInitialized();
          const globalConfig = await getGlobalConfig(true);
          const scenario = (globalConfig.scenarios || []).find((s: any) => s.id === scenarioId) as any;
          if (scenario?.compositionSlots) {
            scenarioComparison = {};
            // Slot tanımlarından dinamik category mapping oluştur
            const slotDefsForAudit = await getSlotDefs();
            const slotToCategory: Record<string, { category: string; subType?: string }> = {};
            for (const slot of slotDefsForAudit.slots.filter((s: SlotDefinition) => s.isActive)) {
              slotToCategory[slot.key] = { category: slot.assetCategory, subType: slot.assetSubType };
            }
            for (const [slotKey, slotConfig] of Object.entries(scenario.compositionSlots)) {
              const sc = slotConfig as { state: string; filterTags?: string[] };
              if (sc.filterTags && sc.filterTags.length > 0 && slotToCategory[slotKey]) {
                const { category, subType } = slotToCategory[slotKey];
                const key = subType ? `${category}/${subType}` : category;
                const entry = audit[key];
                // Gerçek eşleşme: etiketlerin asset'lerde olup olmadığını kontrol et
                const matchingDocs = assetsSnap.docs.filter(doc => {
                  const d = doc.data();
                  if (!d.isActive) return false;
                  if (subType && d.subType !== subType) return false;
                  if (!subType && d.category !== category) return false;
                  const tags: string[] = d.tags || [];
                  return sc.filterTags!.some(ft =>
                    tags.some(t => t.toLowerCase().includes(ft.toLowerCase()))
                  );
                });
                scenarioComparison[slotKey] = {
                  slotTags: sc.filterTags,
                  matchingAssets: matchingDocs.length,
                  totalAssets: entry?.total || 0,
                };
              }
            }
          }
        }

        response.json({
          success: true,
          totalAssets: assetsSnap.size,
          audit: sortedAudit,
          scenarioComparison,
        });
      } catch (error) {
        errorResponse(response, error, "assetTagAudit");
      }
    });
  });

/**
 * Orchestrator Scheduler - Otomatik Zaman Kuralı İşleyici
 * Her 15 dakikada bir çalışır ve time-slot-rules'daki aktif kuralları kontrol eder.
 */
export const orchestratorScheduledTrigger = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .pubsub.schedule("*/15 * * * *")
  .timeZone(TIMEZONE)
  .onRun(async () => {
    console.log("[OrchestratorScheduler] Running automatic check...");

    try {
      const config = await getOrchestratorConfig();
      const scheduler = new OrchestratorScheduler(config);

      const result = await scheduler.checkAndTrigger();

      console.log("[OrchestratorScheduler] Result:", JSON.stringify(result));

      if (result.errors.length > 0) {
        console.error("[OrchestratorScheduler] Errors:", result.errors);
      }

      return null;
    } catch (error) {
      console.error("[OrchestratorScheduler] Fatal error:", error);
      throw error;
    }
  });

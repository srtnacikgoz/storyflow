/**
 * Migration Controller
 * Firebase Storage → Cloudinary migration işlemleri
 *
 * URL-Based Upload Yaklaşımı:
 * - Base64'e çevirmiyoruz (gereksiz overhead)
 * - Firebase URL'i doğrudan Cloudinary'ye gönderiyoruz
 * - Cloudinary, URL'den indirip kendi storage'ına kaydediyor
 *
 * Throttling:
 * - p-limit ile concurrent upload sayısı sınırlanıyor
 * - Rate limit (429) hatalarında exponential backoff
 */

import { functions, db, getCors, REGION, errorResponse } from "./shared";
import { Asset } from "../../orchestrator/types";
import {
  cloudinarySecrets,
  uploadUrlToCloudinary,
  generateCloudinaryPublicId,
  withRetry,
} from "../../config/cloudinary";

// p-limit ES module olarak import edilemeyebilir, dynamic import kullanıyoruz
// Alternatif olarak runtime'da kontrol ediyoruz

/**
 * Migration sonuç tipleri
 */
interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
  skipped: number;
  errors: Array<{ assetId: string; error: string }>;
}

interface MigrationSummary {
  status: "success" | "partial" | "failed";
  result: MigrationResult;
  dryRun: boolean;
  duration: number;
}

/**
 * Migration durumu sorgula
 *
 * GET /orchestrator/migration/status
 * Response: { pending, migrated, failed, total }
 */
export const getMigrationStatus = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        // Tüm asset'leri say
        const assetsSnapshot = await db.collection("assets").get();
        const assets = assetsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Array<Asset & { id: string }>;

        const status = {
          total: assets.length,
          pending: assets.filter(a => !a.migrationStatus || a.migrationStatus === "pending").length,
          migrated: assets.filter(a => a.migrationStatus === "migrated").length,
          failed: assets.filter(a => a.migrationStatus === "failed").length,
        };

        response.json({
          success: true,
          data: status,
        });
      } catch (error) {
        errorResponse(response, error, "getMigrationStatus");
      }
    });
  });

/**
 * Migration çalıştır
 *
 * POST /orchestrator/migration/run
 * Query params:
 *   - batchSize: number (default: 10)
 *   - dryRun: boolean (default: false)
 *   - retryFailed: boolean (default: false) - Sadece failed olanları tekrar dene
 *
 * Response: MigrationSummary
 */
export const runCloudinaryMigration = functions
  .region(REGION)
  .runWith({
    secrets: cloudinarySecrets,
    timeoutSeconds: 540, // 9 dakika
    memory: "512MB",
  })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const startTime = Date.now();
        const batchSize = parseInt(request.query.batchSize as string) || 10;
        const dryRun = request.query.dryRun === "true";
        const retryFailed = request.query.retryFailed === "true";

        console.log(`[Migration] Starting with batchSize=${batchSize}, dryRun=${dryRun}, retryFailed=${retryFailed}`);

        // Migration edilecek asset'leri bul
        let query: FirebaseFirestore.Query = db.collection("assets");

        if (retryFailed) {
          // Sadece failed olanları al
          query = query.where("migrationStatus", "==", "failed");
        }

        const assetsSnapshot = await query.limit(batchSize).get();
        const assets = assetsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Asset & { id: string }))
          .filter(asset => {
            // Zaten migrated olanları atla (retryFailed değilse)
            if (!retryFailed && asset.migrationStatus === "migrated") {
              return false;
            }
            // storageUrl'i olmayanları atla
            if (!asset.storageUrl) {
              return false;
            }
            return true;
          });

        console.log(`[Migration] Found ${assets.length} assets to migrate`);

        const result: MigrationResult = {
          total: assets.length,
          migrated: 0,
          failed: 0,
          skipped: 0,
          errors: [],
        };

        if (dryRun) {
          // Dry run - sadece sayıları döndür
          console.log(`[Migration] Dry run completed, would migrate ${assets.length} assets`);
          response.json({
            success: true,
            data: {
              status: "success",
              result,
              dryRun: true,
              duration: Date.now() - startTime,
            } as MigrationSummary,
          });
          return;
        }

        // p-limit yerine basit sıralı işlem (ES module import sorunu)
        // Concurrent upload için native Promise.all kullanılabilir ama
        // rate limit riskini azaltmak için sıralı işlem daha güvenli
        const CONCURRENT_LIMIT = 5;
        const chunks: Array<Array<Asset & { id: string }>> = [];

        for (let i = 0; i < assets.length; i += CONCURRENT_LIMIT) {
          chunks.push(assets.slice(i, i + CONCURRENT_LIMIT));
        }

        for (const chunk of chunks) {
          // Chunk içindeki asset'leri paralel işle
          const chunkResults = await Promise.allSettled(
            chunk.map(async (asset) => {
              try {
                console.log(`[Migration] Processing asset: ${asset.id} (${asset.filename})`);

                // Cloudinary public ID oluştur
                const publicId = generateCloudinaryPublicId(
                  asset.category,
                  asset.subType,
                  asset.filename
                );

                // URL-based upload (retry wrapper ile)
                const uploadResult = await withRetry(
                  () => uploadUrlToCloudinary(asset.storageUrl, publicId),
                  3
                );

                if (!uploadResult.success) {
                  throw new Error(uploadResult.error || "Upload failed");
                }

                // Firestore'u güncelle
                await db.collection("assets").doc(asset.id).update({
                  cloudinaryPublicId: uploadResult.publicId,
                  cloudinaryUrl: uploadResult.url,
                  cloudinaryVersion: uploadResult.version,
                  migrationStatus: "migrated",
                  migratedAt: Date.now(),
                  updatedAt: Date.now(),
                });

                console.log(`[Migration] Success: ${asset.id} → ${uploadResult.publicId}`);
                result.migrated++;
              } catch (error) {
                console.error(`[Migration] Failed: ${asset.id}`, error);

                // Hata durumunu Firestore'a kaydet
                try {
                  await db.collection("assets").doc(asset.id).update({
                    migrationStatus: "failed",
                    updatedAt: Date.now(),
                  });
                } catch (updateError) {
                  console.error(`[Migration] Failed to update status for ${asset.id}`, updateError);
                }

                result.failed++;
                result.errors.push({
                  assetId: asset.id,
                  error: error instanceof Error ? error.message : "Unknown error",
                });
              }
            })
          );

          // Chunk sonuçlarını logla
          const successCount = chunkResults.filter(r => r.status === "fulfilled").length;
          console.log(`[Migration] Chunk completed: ${successCount}/${chunk.length} successful`);

          // Chunk'lar arası kısa bekleme (rate limit koruması)
          if (chunks.indexOf(chunk) < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        const duration = Date.now() - startTime;
        const status = result.failed === 0 ? "success" : result.migrated > 0 ? "partial" : "failed";

        console.log(`[Migration] Completed in ${duration}ms: ${result.migrated} migrated, ${result.failed} failed`);

        response.json({
          success: true,
          data: {
            status,
            result,
            dryRun: false,
            duration,
          } as MigrationSummary,
        });
      } catch (error) {
        errorResponse(response, error, "runCloudinaryMigration");
      }
    });
  });

/**
 * Tek bir asset'i migrate et (test/debug için)
 *
 * POST /orchestrator/migration/single
 * Body: { assetId: string }
 */
export const migrateSingleAsset = functions
  .region(REGION)
  .runWith({
    secrets: cloudinarySecrets,
    timeoutSeconds: 120,
    memory: "256MB",
  })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const { assetId } = request.body;

        if (!assetId) {
          response.status(400).json({
            success: false,
            error: "Missing required field: assetId",
          });
          return;
        }

        // Asset'i getir
        const assetDoc = await db.collection("assets").doc(assetId).get();

        if (!assetDoc.exists) {
          response.status(404).json({
            success: false,
            error: `Asset not found: ${assetId}`,
          });
          return;
        }

        const asset = { id: assetDoc.id, ...assetDoc.data() } as Asset & { id: string };

        if (!asset.storageUrl) {
          response.status(400).json({
            success: false,
            error: "Asset has no storageUrl",
          });
          return;
        }

        console.log(`[Migration] Single asset migration: ${asset.id} (${asset.filename})`);

        // Cloudinary public ID oluştur
        const publicId = generateCloudinaryPublicId(
          asset.category,
          asset.subType,
          asset.filename
        );

        // URL-based upload
        const uploadResult = await withRetry(
          () => uploadUrlToCloudinary(asset.storageUrl, publicId),
          3
        );

        if (!uploadResult.success) {
          // Hata durumunu kaydet
          await db.collection("assets").doc(asset.id).update({
            migrationStatus: "failed",
            updatedAt: Date.now(),
          });

          response.status(500).json({
            success: false,
            error: uploadResult.error,
          });
          return;
        }

        // Firestore'u güncelle
        await db.collection("assets").doc(asset.id).update({
          cloudinaryPublicId: uploadResult.publicId,
          cloudinaryUrl: uploadResult.url,
          cloudinaryVersion: uploadResult.version,
          migrationStatus: "migrated",
          migratedAt: Date.now(),
          updatedAt: Date.now(),
        });

        console.log(`[Migration] Single asset success: ${asset.id} → ${uploadResult.publicId}`);

        response.json({
          success: true,
          data: {
            assetId: asset.id,
            cloudinaryPublicId: uploadResult.publicId,
            cloudinaryUrl: uploadResult.url,
          },
        });
      } catch (error) {
        errorResponse(response, error, "migrateSingleAsset");
      }
    });
  });

/**
 * Migration'ı sıfırla (test için)
 * Tüm asset'lerin migration durumunu "pending" yapar
 *
 * POST /orchestrator/migration/reset
 * Query: confirm=true (güvenlik için)
 */
export const resetMigration = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        if (request.query.confirm !== "true") {
          response.status(400).json({
            success: false,
            error: "Add ?confirm=true to reset migration status",
          });
          return;
        }

        console.log("[Migration] Resetting migration status for all assets...");

        // Tüm asset'leri al
        const assetsSnapshot = await db.collection("assets").get();
        let resetCount = 0;

        // Batch update
        const batch = db.batch();
        const BATCH_LIMIT = 500;
        let currentBatch = 0;

        for (const doc of assetsSnapshot.docs) {
          batch.update(doc.ref, {
            migrationStatus: "pending",
            cloudinaryPublicId: null,
            cloudinaryUrl: null,
            cloudinaryVersion: null,
            migratedAt: null,
            updatedAt: Date.now(),
          });
          resetCount++;
          currentBatch++;

          // Batch limitine ulaştıysak commit et
          if (currentBatch >= BATCH_LIMIT) {
            await batch.commit();
            currentBatch = 0;
          }
        }

        // Kalan batch'i commit et
        if (currentBatch > 0) {
          await batch.commit();
        }

        console.log(`[Migration] Reset completed: ${resetCount} assets`);

        response.json({
          success: true,
          data: {
            reset: resetCount,
          },
        });
      } catch (error) {
        errorResponse(response, error, "resetMigration");
      }
    });
  });

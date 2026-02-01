/**
 * Asset Controller
 * Asset CRUD işlemleri
 *
 * Cloudinary Migration:
 * - uploadAssetToCloudinary: Yeni asset'leri Cloudinary'ye yükler
 * - Eski Firebase Storage asset'leri hala desteklenir (fallback)
 */

import { functions, db, getCors, REGION, errorResponse } from "./shared";
import { Asset, AssetCategory } from "../../orchestrator/types";
import {
  cloudinarySecrets,
  generateCloudinaryPublicId,
  uploadBase64ToCloudinary,
} from "../../config/cloudinary";

/**
 * Tüm asset'leri listele
 */
export const listAssets = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const { category, subType, isActive } = request.query;

        let query: FirebaseFirestore.Query = db.collection("assets");

        if (category) {
          query = query.where("category", "==", category);
        }
        if (subType) {
          query = query.where("subType", "==", subType);
        }
        if (isActive !== undefined) {
          query = query.where("isActive", "==", isActive === "true");
        }

        const snapshot = await query.orderBy("createdAt", "desc").get();
        const assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        response.json({
          success: true,
          data: assets,
          count: assets.length,
        });
      } catch (error) {
        errorResponse(response, error, "listAssets");
      }
    });
  });

/**
 * Yeni asset ekle
 */
export const createAsset = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const assetData: Omit<Asset, "id"> = {
          ...request.body,
          usageCount: 0,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const docRef = await db.collection("assets").add(assetData);

        response.status(201).json({
          success: true,
          data: { id: docRef.id, ...assetData },
        });
      } catch (error) {
        errorResponse(response, error, "createAsset");
      }
    });
  });

/**
 * Asset güncelle
 */
export const updateAsset = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "PUT" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use PUT or POST" });
          return;
        }

        const id = request.query.id as string || request.body?.id;

        if (!id) {
          response.status(400).json({
            success: false,
            error: "Missing required parameter: id",
          });
          return;
        }

        const updates = {
          ...request.body,
          id: undefined,
          updatedAt: Date.now(),
        };
        delete updates.id;

        await db.collection("assets").doc(id).update(updates);

        response.json({
          success: true,
          message: "Asset updated",
        });
      } catch (error) {
        errorResponse(response, error, "updateAsset");
      }
    });
  });

/**
 * Asset sil (soft delete)
 */
export const deleteAsset = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "DELETE" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use DELETE or POST" });
          return;
        }

        const id = request.query.id as string || request.body?.id;

        if (!id) {
          response.status(400).json({
            success: false,
            error: "Missing required parameter: id",
          });
          return;
        }

        await db.collection("assets").doc(id).update({
          isActive: false,
          updatedAt: Date.now(),
        });

        response.json({
          success: true,
          message: "Asset deactivated",
        });
      } catch (error) {
        errorResponse(response, error, "deleteAsset");
      }
    });
  });

/**
 * Asset'i Cloudinary'ye yükle (yeni upload'lar için)
 *
 * POST /orchestrator/assets/upload-cloudinary
 * Body: {
 *   base64Image: string,  // Base64 encoded görsel (data:image... prefix'i olmadan)
 *   filename: string,
 *   category: AssetCategory,
 *   subType: string,
 *   tags?: string[],
 *   visualProperties?: object,
 *   eatingMethod?: string,
 *   canBeHeldByHand?: boolean
 * }
 *
 * Neden base64?
 * - Yeni upload'lar kullanıcının tarayıcısından geliyor
 * - Dosya henüz hiçbir yerde yok (Firebase'de bile)
 * - Migration'da URL-based upload kullanılıyor (dosya zaten Firebase'de)
 */
export const uploadAssetToCloudinary = functions
  .region(REGION)
  .runWith({
    secrets: cloudinarySecrets,
    timeoutSeconds: 300,
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

        const {
          base64Image,
          filename,
          category,
          subType,
          tags = [],
          visualProperties,
          eatingMethod,
          canBeHeldByHand,
        } = request.body;

        // Validation
        if (!base64Image || !filename || !category || !subType) {
          response.status(400).json({
            success: false,
            error: "Missing required fields: base64Image, filename, category, subType",
          });
          return;
        }

        console.log(`[Cloudinary Upload] Starting upload for ${filename} (${category}/${subType})`);

        // 1. Cloudinary public ID oluştur
        const publicId = generateCloudinaryPublicId(category, subType, filename);

        // 2. Cloudinary'ye yükle
        const uploadResult = await uploadBase64ToCloudinary(base64Image, publicId);

        if (!uploadResult.success) {
          console.error(`[Cloudinary Upload] Failed:`, uploadResult.error);
          response.status(500).json({
            success: false,
            error: `Cloudinary upload failed: ${uploadResult.error}`,
          });
          return;
        }

        console.log(`[Cloudinary Upload] Success: ${uploadResult.publicId}`);

        // 3. Firestore'a kaydet
        const assetData: Omit<Asset, "id"> = {
          category: category as AssetCategory,
          subType,
          filename,
          // Firebase Storage alanları boş (Cloudinary kullanılıyor)
          storageUrl: "",
          thumbnailUrl: undefined,
          // Cloudinary alanları
          cloudinaryPublicId: uploadResult.publicId,
          cloudinaryUrl: uploadResult.url,
          cloudinaryVersion: uploadResult.version,
          migrationStatus: "migrated", // Yeni upload'lar zaten Cloudinary'de
          migratedAt: Date.now(),
          // Diğer alanlar
          visualProperties,
          eatingMethod,
          canBeHeldByHand,
          tags,
          usageCount: 0,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const docRef = await db.collection("assets").add(assetData);

        console.log(`[Cloudinary Upload] Asset saved to Firestore: ${docRef.id}`);

        response.status(201).json({
          success: true,
          data: {
            id: docRef.id,
            ...assetData,
          },
        });
      } catch (error) {
        errorResponse(response, error, "uploadAssetToCloudinary");
      }
    });
  });

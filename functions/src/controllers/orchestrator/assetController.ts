/**
 * Asset Controller
 * Asset CRUD işlemleri
 */

import { functions, db, getCors, REGION, errorResponse } from "./shared";
import { Asset } from "../../orchestrator/types";

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

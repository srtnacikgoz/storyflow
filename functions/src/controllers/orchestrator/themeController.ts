/**
 * Theme Controller
 * Tema CRUD işlemleri
 */

import { functions, db, getCors, REGION, errorResponse } from "./shared";
import { Theme, DEFAULT_THEMES } from "../../orchestrator/types";

/**
 * Tüm temaları listele
 * Firestore'daki temalar + varsayılan temalar birleştirilir
 */
export const listThemes = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        // Firestore'daki temaları al
        const snapshot = await db.collection("themes").orderBy("name").get();
        const firestoreThemes: Theme[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Theme[];

        // Varsayılan temaları kontrol et ve eksik olanları ekle
        const existingIds = firestoreThemes.map((t) => t.id);
        const missingDefaults = DEFAULT_THEMES.filter((dt) => !existingIds.includes(dt.id));

        // Eksik varsayılan temaları Firestore'a ekle
        const batch = db.batch();
        const now = Date.now();
        for (const theme of missingDefaults) {
          const ref = db.collection("themes").doc(theme.id);
          batch.set(ref, {
            ...theme,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (missingDefaults.length > 0) {
          await batch.commit();
          console.log(`[listThemes] Added ${missingDefaults.length} default themes`);
        }

        // Tüm temaları birleştir ve döndür
        const allThemes = [
          ...firestoreThemes,
          ...missingDefaults.map((t) => ({ ...t, createdAt: now, updatedAt: now })),
        ].sort((a, b) => a.name.localeCompare(b.name, "tr"));

        response.json({ success: true, data: allThemes });
      } catch (error) {
        errorResponse(response, error, "listThemes");
      }
    });
  });

/**
 * Yeni tema oluştur
 */
export const createTheme = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const { id, name, description, scenarios, petAllowed, accessoryAllowed, accessoryOptions, setting } = request.body;

        if (!id || !name || !scenarios || scenarios.length === 0) {
          response.status(400).json({
            success: false,
            error: "id, name, and scenarios are required",
          });
          return;
        }

        // ID benzersiz mi kontrol et
        const existingDoc = await db.collection("themes").doc(id).get();
        if (existingDoc.exists) {
          response.status(400).json({
            success: false,
            error: "Bu ID zaten kullanılıyor",
          });
          return;
        }

        const now = Date.now();
        const theme: Theme = {
          id,
          name,
          description: description || "",
          scenarios,
          petAllowed: petAllowed || false,
          accessoryAllowed: accessoryAllowed || false,
          ...(accessoryOptions?.length ? { accessoryOptions } : {}),
          ...(setting ? { setting } : {}),
          createdAt: now,
          updatedAt: now,
          isDefault: false,
        };

        await db.collection("themes").doc(id).set(theme);

        console.log(`[createTheme] Created theme: ${id}`);
        response.json({ success: true, data: theme });
      } catch (error) {
        errorResponse(response, error, "createTheme");
      }
    });
  });

/**
 * Tema güncelle
 */
export const updateTheme = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "PUT" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use PUT or POST" });
          return;
        }

        const { id, name, description, scenarios, petAllowed, accessoryAllowed, accessoryOptions, setting } = request.body;

        if (!id) {
          response.status(400).json({ success: false, error: "id is required" });
          return;
        }

        const docRef = db.collection("themes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          response.status(404).json({ success: false, error: "Theme not found" });
          return;
        }

        const updateData: Partial<Theme> = {
          updatedAt: Date.now(),
        };

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (scenarios !== undefined) updateData.scenarios = scenarios;
        if (petAllowed !== undefined) updateData.petAllowed = petAllowed;
        if (accessoryAllowed !== undefined) updateData.accessoryAllowed = accessoryAllowed;
        if (accessoryOptions !== undefined) updateData.accessoryOptions = accessoryOptions;
        if (setting !== undefined) updateData.setting = setting;

        await docRef.update(updateData);

        const updated = await docRef.get();
        console.log(`[updateTheme] Updated theme: ${id}`);
        response.json({ success: true, data: { id, ...updated.data() } });
      } catch (error) {
        errorResponse(response, error, "updateTheme");
      }
    });
  });

/**
 * Tema sil
 * Not: Varsayılan temalar silinemez
 * Not: TimeSlot'larda kullanılan temalar silinemez (cascade kontrolü)
 */
export const deleteTheme = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "DELETE" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use DELETE or POST" });
          return;
        }

        const id = request.body.id || request.query.id;

        if (!id) {
          response.status(400).json({ success: false, error: "id is required" });
          return;
        }

        const docRef = db.collection("themes").doc(id as string);
        const doc = await docRef.get();

        if (!doc.exists) {
          response.status(404).json({ success: false, error: "Theme not found" });
          return;
        }

        const theme = doc.data() as Theme;
        if (theme.isDefault) {
          response.status(400).json({
            success: false,
            error: "Varsayılan temalar silinemez",
          });
          return;
        }

        // CASCADE KONTROLÜ: Bu temayı kullanan TimeSlot'ları kontrol et
        const timeSlotsUsingTheme = await db
          .collection("time-slot-rules")
          .where("themeId", "==", id)
          .get();

        if (!timeSlotsUsingTheme.empty) {
          // TimeSlot isimlerini al
          const affectedTimeSlots = timeSlotsUsingTheme.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || `${data.startHour}:00 - ${data.endHour}:00`,
            };
          });

          console.log(`[deleteTheme] Theme ${id} is used by ${affectedTimeSlots.length} time slots`);

          response.status(400).json({
            success: false,
            error: `Bu tema ${affectedTimeSlots.length} zaman diliminde kullanılıyor. Önce bu zaman dilimlerinden temayı kaldırın.`,
            affectedTimeSlots,
            code: "THEME_IN_USE",
          });
          return;
        }

        await docRef.delete();

        console.log(`[deleteTheme] Deleted theme: ${id}`);
        response.json({ success: true, message: "Theme deleted" });
      } catch (error) {
        errorResponse(response, error, "deleteTheme");
      }
    });
  });

/**
 * AI Tema Açıklaması Üret
 * Gemini kullanarak profesyonel tema açıklaması oluşturur.
 */
export const generateThemeDescription = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const { themeName, keywords } = request.body;

        if (!themeName) {
          response.status(400).json({ success: false, error: "themeName is required" });
          return;
        }

        // Gemini Service'i başlat
        const { GeminiService } = await import("../../services/gemini");
        const { getConfig } = await import("../../config/environment");

        // API Key'i config'den al
        const config = getConfig();
        if (!config.gemini.apiKey) {
          response.status(500).json({ success: false, error: "Gemini API key not configured" });
          return;
        }

        const gemini = new GeminiService({
          apiKey: config.gemini.apiKey,
          // Modeller varsayılan olarak serviste tanımlı
        });

        console.log(`[generateThemeDescription] Generating for: ${themeName}`);
        const result = await gemini.generateThemeDescription(themeName, keywords);

        response.json({ success: true, data: { description: result.text, cost: result.cost } });
      } catch (error) {
        errorResponse(response, error, "generateThemeDescription");
      }
    });
  });

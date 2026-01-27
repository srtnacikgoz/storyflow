import { functions, getCors, REGION, errorResponse } from "./orchestrator/shared";
import { MoodService } from "../services/moodService";
import { Mood } from "../orchestrator/types";

const moodService = new MoodService();

/**
 * Mood Listesini Getir
 */
export const getMoods = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                const activeOnly = request.query.activeOnly === "true";
                const moods = await moodService.getAllMoods(activeOnly);
                response.json({ success: true, moods });
            } catch (error) {
                errorResponse(response, error, "getMoods");
            }
        });
    });

/**
 * Mood Detayı Getir
 */
export const getMood = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                const id = request.query.id as string || request.body?.id;
                if (!id) {
                    response.status(400).json({ success: false, error: "ID gerekli" });
                    return;
                }

                const mood = await moodService.getMoodById(id);
                response.json({ success: true, mood });
            } catch (error) {
                errorResponse(response, error, "getMood");
            }
        });
    });

/**
 * Yeni Mood Ekle
 */
export const createMood = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                if (request.method !== "POST") {
                    response.status(405).json({ success: false, error: "Use POST" });
                    return;
                }

                const data = request.body;

                // Validasyon
                if (!data.name || !data.lightingPrompt) {
                    response.status(400).json({ success: false, error: "Zorunlu alanlar eksik" });
                    return;
                }

                const moodData = data as Omit<Mood, "id" | "createdAt" | "updatedAt">;
                const newMood = await moodService.createMood(moodData);

                response.status(201).json({ success: true, mood: newMood });
            } catch (error) {
                errorResponse(response, error, "createMood");
            }
        });
    });

/**
 * Mood Güncelle
 */
export const updateMood = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                // PUT veya POST destekle
                if (request.method !== "PUT" && request.method !== "POST") {
                    response.status(405).json({ success: false, error: "Use PUT or POST" });
                    return;
                }

                const data = request.body;
                const id = request.query.id as string || data.id;

                if (!id) {
                    response.status(400).json({ success: false, error: "ID gerekli" });
                    return;
                }

                // ID'yi body'den ayır
                const { id: _, ...updateData } = data;

                await moodService.updateMood(id, updateData);
                response.json({ success: true });
            } catch (error) {
                errorResponse(response, error, "updateMood");
            }
        });
    });

/**
 * Mood Sil
 */
export const deleteMood = functions
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
                    response.status(400).json({ success: false, error: "ID gerekli" });
                    return;
                }

                await moodService.deleteMood(id);
                response.json({ success: true });
            } catch (error) {
                errorResponse(response, error, "deleteMood");
            }
        });
    });

/**
 * Varsayılan Moodları Yükle (Seed)
 */
export const seedMoods = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                if (request.method !== "POST") {
                    response.status(405).json({ success: false, error: "Use POST" });
                    return;
                }

                const result = await moodService.seedDefaults();
                response.json({ success: true, ...result });
            } catch (error) {
                errorResponse(response, error, "seedMoods");
            }
        });
    });

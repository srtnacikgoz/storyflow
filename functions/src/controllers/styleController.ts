import { functions, getCors, REGION, errorResponse } from "./orchestrator/shared";
import { StyleService } from "../services/styleService";
import { Style } from "../orchestrator/types";

const styleService = new StyleService();

/**
 * Stil Listesini Getir
 */
export const getStyles = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                const activeOnly = request.query.activeOnly === "true";
                const styles = await styleService.getAllStyles(activeOnly);
                response.json({ success: true, styles });
            } catch (error) {
                errorResponse(response, error, "getStyles");
            }
        });
    });

/**
 * Stil Detayı Getir
 */
export const getStyle = functions
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

                const style = await styleService.getStyleById(id);
                response.json({ success: true, style });
            } catch (error) {
                errorResponse(response, error, "getStyle");
            }
        });
    });

/**
 * Yeni Stil Ekle
 */
export const createStyle = functions
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
                if (!data.id || !data.displayName) {
                    response.status(400).json({ success: false, error: "ID ve Görünen Ad gereklidir" });
                    return;
                }

                const styleData = data as Omit<Style, "createdAt" | "updatedAt">;

                // Varsayılan değerler
                if (styleData.isActive === undefined) styleData.isActive = true;
                if (styleData.order === undefined) styleData.order = 99;

                const newStyle = await styleService.createStyle(styleData);

                response.status(201).json({ success: true, style: newStyle });
            } catch (error) {
                errorResponse(response, error, "createStyle");
            }
        });
    });

/**
 * Stil Güncelle
 */
export const updateStyle = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
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

                await styleService.updateStyle(id, updateData);
                response.json({ success: true });
            } catch (error) {
                errorResponse(response, error, "updateStyle");
            }
        });
    });

/**
 * Stil Sil
 */
export const deleteStyle = functions
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

                await styleService.deleteStyle(id);
                response.json({ success: true });
            } catch (error) {
                errorResponse(response, error, "deleteStyle");
            }
        });
    });

/**
 * Varsayılan Stilleri Yükle (Seed)
 */
export const seedStyles = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                if (request.method !== "POST") {
                    response.status(405).json({ success: false, error: "Use POST" });
                    return;
                }

                const result = await styleService.seedDefaults();
                response.json({ success: true, ...result });
            } catch (error) {
                errorResponse(response, error, "seedStyles");
            }
        });
    });

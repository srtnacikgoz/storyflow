import * as functions from "firebase-functions";
import {
    getCors,
    getQueueService,
    getTimeScoreService,
    getProcessNextItem,
    getProcessWithApproval,
    isTelegramConfiguredLazy,
} from "../lib/serviceFactory";

const REGION = "europe-west1";

// Get Queue Stats
export const getQueueStats = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                const QueueService = await getQueueService();
                const queue = new QueueService();
                const stats = await queue.getStats();

                response.json({ success: true, stats });
            } catch (error) {
                console.error("[getQueueStats] Error:", error);
                response.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

// Add to Queue
export const addToQueue = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                if (request.method !== "POST") {
                    response.status(405).json({ success: false, error: "Use POST" });
                    return;
                }

                const {
                    originalUrl, productCategory, productName, caption,
                    aiModel, styleVariant, faithfulness,
                    captionTemplateId, captionTemplateName, captionVariables,
                    // Scheduling alanları
                    schedulingMode, scheduledFor, skipApproval,
                } = request.body;

                if (!originalUrl) {
                    response.status(400).json({
                        success: false,
                        error: "Missing required field: originalUrl",
                    });
                    return;
                }

                // Optimal mod ise en iyi zamanı hesapla
                let finalScheduledFor = scheduledFor;
                let scheduledDayHour: string | undefined;

                if (schedulingMode === "optimal") {
                    const TimeScoreService = await getTimeScoreService();
                    const timeService = new TimeScoreService();
                    const bestTime = await timeService.getBestTimeForToday();

                    if (bestTime) {
                        // Bugün için en iyi saat
                        const now = new Date();
                        const scheduled = new Date(now);
                        scheduled.setHours(bestTime.hour, 0, 0, 0);

                        // Eğer saat geçtiyse yarına ayarla
                        if (scheduled <= now) {
                            scheduled.setDate(scheduled.getDate() + 1);
                        }

                        finalScheduledFor = scheduled.getTime();
                        scheduledDayHour = `${bestTime.dayIndex}_${bestTime.hour}`;
                    }
                }

                const QueueService = await getQueueService();
                const queue = new QueueService();
                const photo = await queue.addToQueue({
                    originalUrl,
                    productCategory: productCategory || "chocolate",
                    productName,
                    caption: caption || "",
                    filename: originalUrl.split("/").pop() || "photo.jpg",
                    aiModel: aiModel || "gemini-flash",
                    styleVariant: styleVariant || "lifestyle-moments",
                    faithfulness: faithfulness ?? 0.7,
                    // Caption template alanları
                    captionTemplateId,
                    captionTemplateName,
                    captionVariables,
                    // Scheduling alanları
                    schedulingMode: schedulingMode || "immediate",
                    scheduledFor: finalScheduledFor,
                    scheduledDayHour,
                    // Onay ayarı
                    skipApproval: skipApproval || false,
                });

                response.json({
                    success: true,
                    message: "Added to queue",
                    photo: {
                        id: photo.id,
                        originalUrl: photo.originalUrl,
                        productCategory: photo.productCategory,
                        status: photo.status,
                        schedulingMode: photo.schedulingMode,
                        scheduledFor: photo.scheduledFor,
                        scheduledDayHour: photo.scheduledDayHour,
                    },
                });
            } catch (error) {
                console.error("[addToQueue] Error:", error);
                response.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

// Get Pending Items
export const getPendingItems = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                const QueueService = await getQueueService();
                const queue = new QueueService();
                const items = await queue.getAllPending();

                response.json({
                    success: true,
                    count: items.length,
                    items: items.map((item) => ({
                        id: item.id,
                        originalUrl: item.originalUrl,
                        productCategory: item.productCategory,
                        productName: item.productName,
                        status: item.status,
                        uploadedAt: new Date(item.uploadedAt).toISOString(),
                        // AI Enhancement
                        aiModel: item.aiModel,
                        styleVariant: item.styleVariant,
                        faithfulness: item.faithfulness,
                        // Caption
                        caption: item.caption,
                        captionTemplateId: item.captionTemplateId,
                        captionTemplateName: item.captionTemplateName,
                        // Scheduling
                        schedulingMode: item.schedulingMode,
                        scheduledFor: item.scheduledFor,
                    })),
                });
            } catch (error) {
                console.error("[getPendingItems] Error:", error);
                response.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

// Get Completed Items (Archive)
export const getCompletedItems = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                const limit = parseInt(request.query.limit as string) || 50;
                const QueueService = await getQueueService();
                const queue = new QueueService();
                const items = await queue.getCompletedItems(limit);

                response.json({
                    success: true,
                    count: items.length,
                    items: items.map((item) => ({
                        id: item.id,
                        originalUrl: item.originalUrl,
                        enhancedUrl: item.enhancedUrl,
                        productCategory: item.productCategory,
                        productName: item.productName,
                        caption: item.caption,
                        aiModel: item.aiModel,
                        styleVariant: item.styleVariant,
                        faithfulness: item.faithfulness,
                        isEnhanced: item.isEnhanced,
                        storyId: item.igPostId,
                        uploadedAt: new Date(item.uploadedAt).toISOString(),
                    })),
                });
            } catch (error) {
                console.error("[getCompletedItems] Error:", error);
                response.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

// Process Queue Item (Manual Trigger)
export const processQueueItem = functions
    .region(REGION)
    .runWith({ timeoutSeconds: 300, memory: "512MB" })
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                const skipEnhancement = request.query.skipEnhancement === "true";
                const itemId = request.query.itemId as string | undefined;

                console.log("[processQueueItem] Starting...");

                const processNextItem = await getProcessNextItem();
                const result = await processNextItem({ skipEnhancement, itemId });

                if (result.skipped) {
                    response.json({ success: true, skipped: true, reason: result.skipReason });
                    return;
                }

                if (!result.success) {
                    response.status(500).json({
                        success: false, error: result.error, itemId: result.itemId,
                    });
                    return;
                }

                response.json({
                    success: true,
                    message: "Story posted successfully!",
                    itemId: result.itemId,
                    storyId: result.storyId,
                    enhanced: !!result.enhancedUrl,
                });
            } catch (error) {
                console.error("[processQueueItem] Error:", error);
                response.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

// Process Queue with Approval (Manual Trigger)
export const processQueueWithApproval = functions
    .region(REGION)
    .runWith({ timeoutSeconds: 300, memory: "512MB" })
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                const telegramConfigured = await isTelegramConfiguredLazy();
                if (!telegramConfigured) {
                    response.status(400).json({
                        success: false,
                        error: "Telegram not configured. Use processQueueItem instead.",
                    });
                    return;
                }

                const skipEnhancement = request.query.skipEnhancement === "true";
                const itemId = request.query.itemId as string | undefined;

                console.log("[processQueueWithApproval] Starting...");

                const processWithApproval = await getProcessWithApproval();
                const result = await processWithApproval({ skipEnhancement, itemId });

                if (result.skipped) {
                    response.json({
                        success: true,
                        skipped: true,
                        reason: result.skipReason,
                    });
                    return;
                }

                if (!result.success) {
                    response.status(500).json({
                        success: false,
                        error: result.error,
                        itemId: result.itemId,
                    });
                    return;
                }

                response.json({
                    success: true,
                    message: "Telegram'a onay için gönderildi",
                    itemId: result.itemId,
                    awaitingApproval: true,
                });
            } catch (error) {
                console.error("[processQueueWithApproval] Error:", error);
                response.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

// Delete Queue Item
export const deleteQueueItem = functions
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

                const QueueService = await getQueueService();
                const queue = new QueueService();

                // Önce item'ın var olduğunu kontrol et
                const item = await queue.getById(id);
                if (!item) {
                    response.status(404).json({
                        success: false,
                        error: "Item not found",
                    });
                    return;
                }

                // Processing veya awaiting_approval durumundaysa silme
                const nonDeletableStatuses = ["processing", "awaiting_approval"];
                if (nonDeletableStatuses.includes(item.status)) {
                    response.status(400).json({
                        success: false,
                        error: `Bu öğe silinemez. Mevcut durum: ${item.status}`,
                    });
                    return;
                }

                await queue.delete(id);

                response.json({
                    success: true,
                    message: "Item deleted",
                    id,
                });
            } catch (error) {
                console.error("[deleteQueueItem] Error:", error);
                response.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

// Update Queue Item
export const updateQueueItem = functions
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

                const {
                    productName, productCategory, caption,
                    aiModel, styleVariant, faithfulness,
                    captionTemplateId, captionTemplateName, captionVariables,
                    schedulingMode, scheduledFor, scheduledDayHour, skipApproval,
                } = request.body;

                const QueueService = await getQueueService();
                const queue = new QueueService();

                const updatedItem = await queue.update(id, {
                    productName,
                    productCategory,
                    caption,
                    aiModel,
                    styleVariant,
                    faithfulness,
                    captionTemplateId,
                    captionTemplateName,
                    captionVariables,
                    schedulingMode,
                    scheduledFor,
                    scheduledDayHour,
                    skipApproval,
                });

                if (!updatedItem) {
                    response.status(404).json({
                        success: false,
                        error: "Item not found",
                    });
                    return;
                }

                response.json({
                    success: true,
                    message: "Item updated",
                    item: updatedItem,
                });
            } catch (error) {
                console.error("[updateQueueItem] Error:", error);
                const statusCode = error instanceof Error &&
                    error.message.includes("düzenlenemez") ? 400 : 500;
                response.status(statusCode).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

// Get Queue Item by ID
export const getQueueItem = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                const id = request.query.id as string;

                if (!id) {
                    response.status(400).json({
                        success: false,
                        error: "Missing required parameter: id",
                    });
                    return;
                }

                const QueueService = await getQueueService();
                const queue = new QueueService();
                const item = await queue.getById(id);

                if (!item) {
                    response.status(404).json({
                        success: false,
                        error: "Item not found",
                    });
                    return;
                }

                response.json({
                    success: true,
                    item,
                });
            } catch (error) {
                console.error("[getQueueItem] Error:", error);
                response.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

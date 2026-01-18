"use strict";
/**
 * Storyflow API Functions - Lightweight CRUD & Query endpoints
 * Bu codebase sadece veritabanı okuma/yazma işlemleri içerir
 * Sharp, Gemini gibi ağır bağımlılıklar YOK - hızlı cold start
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCalendarData = exports.getAnalyticsSummary = exports.getAnalyticsDashboard = exports.updateEngagementMetrics = exports.getPostAnalyticsStats = exports.getBestTimeToday = exports.getBestTimes = exports.seedTemplates = exports.previewCaption = exports.deleteTemplate = exports.updateTemplate = exports.createTemplate = exports.getTemplate = exports.getTemplates = exports.deleteQueueItem = exports.getQueueItem = exports.getCompletedItems = exports.getPendingItems = exports.getUsageStats = exports.getQueueStats = void 0;
const functions = __importStar(require("firebase-functions"));
// Constants
const REGION = "europe-west1";
// Runtime options - Light functions use less memory
const RUNTIME_OPTS = {
    timeoutSeconds: 60,
    memory: "512MB",
};
// ==========================================
// LAZY LOADERS
// ==========================================
let firebaseInitialized = false;
async function initFirebase() {
    if (!firebaseInitialized) {
        await Promise.resolve().then(() => __importStar(require("./config/firebase")));
        firebaseInitialized = true;
    }
}
async function getCors() {
    const cors = (await Promise.resolve().then(() => __importStar(require("cors")))).default;
    return cors({ origin: true });
}
async function getQueueService() {
    await initFirebase();
    const { QueueService } = await Promise.resolve().then(() => __importStar(require("./services/queue")));
    return QueueService;
}
async function getUsageService() {
    await initFirebase();
    const { UsageService } = await Promise.resolve().then(() => __importStar(require("./services/usage")));
    return UsageService;
}
async function getCaptionTemplateService() {
    await initFirebase();
    const { CaptionTemplateService } = await Promise.resolve().then(() => __importStar(require("./services/captionTemplate")));
    return CaptionTemplateService;
}
async function getTimeScoreService() {
    await initFirebase();
    const { TimeScoreService } = await Promise.resolve().then(() => __importStar(require("./services/timeScore")));
    return TimeScoreService;
}
async function getAnalyticsService() {
    await initFirebase();
    const { AnalyticsService } = await Promise.resolve().then(() => __importStar(require("./services/analytics")));
    return AnalyticsService;
}
// ==========================================
// QUEUE READ API
// ==========================================
// Get Queue Stats
exports.getQueueStats = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            const QueueService = await getQueueService();
            const queue = new QueueService();
            const stats = await queue.getStats();
            response.json({ success: true, stats });
        }
        catch (error) {
            console.error("[getQueueStats] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// Get AI Usage Stats
exports.getUsageStats = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            const UsageService = await getUsageService();
            const usage = new UsageService();
            const stats = await usage.getStats();
            const recentUsage = await usage.getRecentUsage(20);
            response.json({ success: true, stats, recent: recentUsage });
        }
        catch (error) {
            console.error("[getUsageStats] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// Get Pending Items
exports.getPendingItems = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
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
                    aiModel: item.aiModel,
                    styleVariant: item.styleVariant,
                    faithfulness: item.faithfulness,
                    caption: item.caption,
                    captionTemplateId: item.captionTemplateId,
                    captionTemplateName: item.captionTemplateName,
                    schedulingMode: item.schedulingMode,
                    scheduledFor: item.scheduledFor,
                })),
            });
        }
        catch (error) {
            console.error("[getPendingItems] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// Get Completed Items (Archive)
exports.getCompletedItems = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            const limit = parseInt(request.query.limit) || 50;
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
        }
        catch (error) {
            console.error("[getCompletedItems] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// Get Queue Item by ID
exports.getQueueItem = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            const id = request.query.id;
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
        }
        catch (error) {
            console.error("[getQueueItem] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// Delete Queue Item
exports.deleteQueueItem = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            if (request.method !== "DELETE" && request.method !== "POST") {
                response.status(405).json({ success: false, error: "Use DELETE or POST" });
                return;
            }
            const id = request.query.id || request.body?.id;
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
        }
        catch (error) {
            console.error("[deleteQueueItem] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// ==========================================
// CAPTION TEMPLATE API
// ==========================================
// Get Templates (filtered by category)
exports.getTemplates = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            const category = request.query.category;
            const includeInactive = request.query.includeInactive === "true";
            const CaptionTemplateService = await getCaptionTemplateService();
            const service = new CaptionTemplateService();
            let templates;
            if (includeInactive) {
                templates = await service.getAllAdmin();
            }
            else {
                templates = await service.getAll(category);
            }
            response.json({
                success: true,
                count: templates.length,
                templates,
            });
        }
        catch (error) {
            console.error("[getTemplates] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// Get Template by ID
exports.getTemplate = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            const id = request.query.id;
            if (!id) {
                response.status(400).json({
                    success: false,
                    error: "Missing required parameter: id",
                });
                return;
            }
            const CaptionTemplateService = await getCaptionTemplateService();
            const service = new CaptionTemplateService();
            const template = await service.getById(id);
            if (!template) {
                response.status(404).json({
                    success: false,
                    error: "Template not found",
                });
                return;
            }
            response.json({ success: true, template });
        }
        catch (error) {
            console.error("[getTemplate] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// Create Template
exports.createTemplate = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            if (request.method !== "POST") {
                response.status(405).json({ success: false, error: "Use POST" });
                return;
            }
            const CaptionTemplateService = await getCaptionTemplateService();
            const service = new CaptionTemplateService();
            const errors = service.validateInput(request.body);
            if (errors.length > 0) {
                response.status(400).json({
                    success: false,
                    errors,
                });
                return;
            }
            const template = await service.create(request.body);
            response.json({
                success: true,
                message: "Template created",
                template,
            });
        }
        catch (error) {
            console.error("[createTemplate] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// Update Template
exports.updateTemplate = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            if (request.method !== "PUT" && request.method !== "POST") {
                response.status(405).json({ success: false, error: "Use PUT or POST" });
                return;
            }
            const id = request.query.id;
            if (!id) {
                response.status(400).json({
                    success: false,
                    error: "Missing required parameter: id",
                });
                return;
            }
            const CaptionTemplateService = await getCaptionTemplateService();
            const service = new CaptionTemplateService();
            const template = await service.update(id, request.body);
            if (!template) {
                response.status(404).json({
                    success: false,
                    error: "Template not found",
                });
                return;
            }
            response.json({
                success: true,
                message: "Template updated",
                template,
            });
        }
        catch (error) {
            console.error("[updateTemplate] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// Delete Template
exports.deleteTemplate = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            if (request.method !== "DELETE" && request.method !== "POST") {
                response.status(405).json({ success: false, error: "Use DELETE or POST" });
                return;
            }
            const id = request.query.id;
            if (!id) {
                response.status(400).json({
                    success: false,
                    error: "Missing required parameter: id",
                });
                return;
            }
            const CaptionTemplateService = await getCaptionTemplateService();
            const service = new CaptionTemplateService();
            const deleted = await service.delete(id);
            if (!deleted) {
                response.status(404).json({
                    success: false,
                    error: "Template not found",
                });
                return;
            }
            response.json({
                success: true,
                message: "Template deleted",
            });
        }
        catch (error) {
            console.error("[deleteTemplate] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// Preview Caption (render template with values)
exports.previewCaption = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            if (request.method !== "POST") {
                response.status(405).json({ success: false, error: "Use POST" });
                return;
            }
            const { templateId, values, photoContext } = request.body;
            if (!templateId) {
                response.status(400).json({
                    success: false,
                    error: "Missing required field: templateId",
                });
                return;
            }
            const CaptionTemplateService = await getCaptionTemplateService();
            const service = new CaptionTemplateService();
            const result = await service.previewCaption(templateId, values || {}, photoContext || {});
            if (!result) {
                response.status(404).json({
                    success: false,
                    error: "Template not found",
                });
                return;
            }
            response.json({
                success: true,
                preview: result,
            });
        }
        catch (error) {
            console.error("[previewCaption] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// Seed Default Templates
exports.seedTemplates = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            const CaptionTemplateService = await getCaptionTemplateService();
            const service = new CaptionTemplateService();
            const count = await service.seedDefaultTemplates();
            response.json({
                success: true,
                message: count > 0 ? `Seeded ${count} templates` : "Templates already exist",
                count,
            });
        }
        catch (error) {
            console.error("[seedTemplates] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// ==========================================
// BEST TIME TO POST API
// ==========================================
// Get Best Times (recommendations + heatmap)
exports.getBestTimes = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            const count = parseInt(request.query.count) || 5;
            const TimeScoreService = await getTimeScoreService();
            const service = new TimeScoreService();
            const result = await service.getBestTimes(count);
            response.json({
                success: true,
                ...result,
            });
        }
        catch (error) {
            console.error("[getBestTimes] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// Get Best Time for Today
exports.getBestTimeToday = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            const TimeScoreService = await getTimeScoreService();
            const service = new TimeScoreService();
            const result = await service.getBestTimeForToday();
            if (!result) {
                response.json({
                    success: true,
                    recommendation: null,
                    message: "Bugün için önerilecek saat kalmadı",
                });
                return;
            }
            response.json({
                success: true,
                recommendation: result,
            });
        }
        catch (error) {
            console.error("[getBestTimeToday] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// Get Post Analytics Stats
exports.getPostAnalyticsStats = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            const TimeScoreService = await getTimeScoreService();
            const service = new TimeScoreService();
            const stats = await service.getStats();
            response.json({
                success: true,
                stats,
            });
        }
        catch (error) {
            console.error("[getPostAnalyticsStats] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// Update Engagement Metrics (manuel güncelleme için)
exports.updateEngagementMetrics = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            if (request.method !== "POST") {
                response.status(405).json({ success: false, error: "Use POST" });
                return;
            }
            const { analyticsId, impressions, reach, likes, comments, saves, shares } = request.body;
            if (!analyticsId) {
                response.status(400).json({
                    success: false,
                    error: "Missing required field: analyticsId",
                });
                return;
            }
            const TimeScoreService = await getTimeScoreService();
            const service = new TimeScoreService();
            await service.updateEngagement(analyticsId, {
                impressions,
                reach,
                likes,
                comments,
                saves,
                shares,
            });
            response.json({
                success: true,
                message: "Engagement metrics updated",
            });
        }
        catch (error) {
            console.error("[updateEngagementMetrics] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// ==========================================
// ANALYTICS DASHBOARD API
// ==========================================
// Get Full Analytics Dashboard
exports.getAnalyticsDashboard = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            const range = request.query.range || "all";
            const validRanges = ["today", "week", "month", "all"];
            if (!validRanges.includes(range)) {
                response.status(400).json({
                    success: false,
                    error: `Invalid range. Valid: ${validRanges.join(", ")}`,
                });
                return;
            }
            const AnalyticsService = await getAnalyticsService();
            const analytics = new AnalyticsService();
            const dashboard = await analytics.getDashboard(range);
            response.json({
                success: true,
                range,
                ...dashboard,
            });
        }
        catch (error) {
            console.error("[getAnalyticsDashboard] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// Get Analytics Summary Only
exports.getAnalyticsSummary = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            const AnalyticsService = await getAnalyticsService();
            const analytics = new AnalyticsService();
            const summary = await analytics.getSummary();
            response.json({
                success: true,
                summary,
            });
        }
        catch (error) {
            console.error("[getAnalyticsSummary] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
// ==========================================
// CONTENT CALENDAR API
// ==========================================
// Get Calendar Data (scheduled items + pending items + heatmap)
exports.getCalendarData = functions
    .region(REGION)
    .runWith(RUNTIME_OPTS)
    .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
        try {
            await initFirebase();
            const startParam = request.query.start;
            const endParam = request.query.end;
            const startTimestamp = startParam ? parseInt(startParam) : Date.now();
            const endTimestamp = endParam ?
                parseInt(endParam) :
                startTimestamp + (7 * 24 * 60 * 60 * 1000);
            const QueueService = await getQueueService();
            const queueService = new QueueService();
            const TimeScoreService = await getTimeScoreService();
            const timeScoreService = new TimeScoreService();
            const allScheduled = await queueService.getScheduledPosts();
            const scheduledItems = allScheduled.filter((item) => {
                if (!item.scheduledFor)
                    return false;
                return item.scheduledFor >= startTimestamp && item.scheduledFor <= endTimestamp;
            });
            const pendingItems = await queueService.getAllPending();
            const unscheduledItems = pendingItems.filter((item) => !item.scheduledFor);
            const bestTimesResult = await timeScoreService.getBestTimes(5);
            response.json({
                success: true,
                range: {
                    start: new Date(startTimestamp).toISOString(),
                    end: new Date(endTimestamp).toISOString(),
                },
                scheduledItems: scheduledItems.map((item) => ({
                    id: item.id,
                    originalUrl: item.originalUrl,
                    enhancedUrl: item.enhancedUrl,
                    productName: item.productName,
                    productCategory: item.productCategory,
                    caption: item.caption,
                    scheduledFor: item.scheduledFor,
                    schedulingMode: item.schedulingMode,
                    status: item.status,
                    approvalStatus: item.approvalStatus,
                })),
                unscheduledItems: unscheduledItems.map((item) => ({
                    id: item.id,
                    originalUrl: item.originalUrl,
                    productName: item.productName,
                    productCategory: item.productCategory,
                    status: item.status,
                })),
                bestTimes: bestTimesResult,
            });
        }
        catch (error) {
            console.error("[getCalendarData] Error:", error);
            response.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
});
//# sourceMappingURL=index.js.map
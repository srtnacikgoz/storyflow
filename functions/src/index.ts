/**
 * Instagram Automation Cloud Functions
 *
 * Entry point for all Cloud Functions
 */

import * as functions from "firebase-functions";
import cors from "cors";
// Initialize Firebase Admin SDK first
import "./config/firebase";
import {REGION, TIMEZONE} from "./config/constants";
import {getConfig} from "./config/environment";
import {
  InstagramService,
  InstagramApiError,
  QueueService,
  UsageService,
} from "./services";
// processNextItem: Dynamic import - startup timeout önlemi
// firebase-admin/storage ve diğer ağır modüller sadece kullanılınca yüklenir

/**
 * Lazy loader for processNextItem
 * Startup timeout'unu önlemek için scheduler modülü ilk kullanımda yüklenir
 */
async function getProcessNextItem() {
  const {processNextItem} = await import("./schedulers");
  return processNextItem;
}

// CORS middleware - tüm origin'lere izin ver
const corsHandler = cors({origin: true});

// Test function - Hello Instagram
export const helloInstagram = functions
  .region(REGION)
  .https.onRequest((request, response) => {
    response.json({
      status: "ready",
      message: "Instagram Automation API",
      timestamp: new Date().toISOString(),
    });
  });

/**
 * Test Instagram Story
 * HTTP trigger for testing Instagram Story API integration
 *
 * Usage:
 * GET ?imageUrl=https://example.com/photo.jpg
 *
 * Note: Image URL must be publicly accessible
 * Recommended dimensions: 1080x1920 (9:16 aspect ratio)
 */
export const testInstagramStory = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    try {
      // Get image URL from query params
      const imageUrl = request.query.imageUrl as string;
      const caption = (request.query.caption as string) ||
        "Test story from Sade Patisserie automation";

      if (!imageUrl) {
        response.status(400).json({
          success: false,
          error: "Missing required parameter: imageUrl",
          usage: "GET ?imageUrl=https://example.com/photo.jpg",
          note: "Recommended: 1080x1920 (9:16) image for Stories",
        });
        return;
      }

      // Validate URL format
      try {
        new URL(imageUrl);
      } catch {
        response.status(400).json({
          success: false,
          error: "Invalid imageUrl format. Must be a valid URL.",
        });
        return;
      }

      // Get config
      const config = getConfig();

      // Create Instagram service instance
      const instagram = new InstagramService(
        config.instagram.accountId,
        config.instagram.accessToken
      );

      // Create story
      console.log("[testInstagramStory] Creating Instagram story...");
      const story = await instagram.createStory(imageUrl, caption);

      response.json({
        success: true,
        message: "Story created successfully!",
        story: {
          id: story.id,
          imageUrl: story.imageUrl,
          timestamp: new Date(story.timestamp).toISOString(),
        },
        note: "Story will be visible for 24 hours",
      });
    } catch (error) {
      console.error("[testInstagramStory] Error:", error);

      if (error instanceof InstagramApiError) {
        response.status(error.statusCode || 500).json({
          success: false,
          error: error.message,
          errorCode: error.errorCode,
        });
        return;
      }

      // Config errors (missing API keys)
      if (error instanceof Error && error.message.includes("Missing required")) {
        response.status(500).json({
          success: false,
          error: error.message,
          hint: "Set config: firebase functions:config:set instagram.account_id=... instagram.access_token=...",
        });
        return;
      }

      response.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

// Legacy alias for backwards compatibility
export const testInstagramPost = testInstagramStory;

/**
 * Validate Instagram Token
 * Quick check to verify Instagram API access
 */
export const validateInstagramToken = functions
  .region(REGION)
  .https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
      try {
        const config = getConfig();

        const instagram = new InstagramService(
          config.instagram.accountId,
          config.instagram.accessToken
        );

        const account = await instagram.validateToken();

        response.json({
          success: true,
          message: "Token is valid!",
          account: {
            id: account.id,
            name: account.name,
          },
        });
      } catch (error) {
        console.error("[validateInstagramToken] Error:", error);

        if (error instanceof InstagramApiError) {
          response.status(error.statusCode || 401).json({
            success: false,
            error: error.message,
            errorCode: error.errorCode,
          });
          return;
        }

        if (error instanceof Error && error.message.includes("Missing required")) {
          response.status(500).json({
            success: false,
            error: error.message,
            hint: "Set config with: firebase functions:config:set instagram.account_id=... instagram.access_token=...",
          });
          return;
        }

        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Get Queue Stats
 * HTTP trigger to view queue statistics
 */
export const getQueueStats = functions
  .region(REGION)
  .https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
      try {
        const queue = new QueueService();
        const stats = await queue.getStats();

        response.json({
          success: true,
          stats: stats,
        });
      } catch (error) {
        console.error("[getQueueStats] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Get AI Usage Stats
 * HTTP trigger to view AI API usage and costs
 */
export const getUsageStats = functions
  .region(REGION)
  .https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
      try {
        const usage = new UsageService();
        const stats = await usage.getStats();
        const recentUsage = await usage.getRecentUsage(20);

        response.json({
          success: true,
          stats,
          recent: recentUsage,
        });
      } catch (error) {
        console.error("[getUsageStats] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Add to Queue
 * HTTP trigger to add item to media queue
 *
 * Usage:
 * POST with JSON body:
 * {
 *   "originalUrl": "https://example.com/photo.jpg",
 *   "productCategory": "chocolate",
 *   "productName": "Bitter Çikolata",
 *   "caption": "Optional caption",
 *   "aiModel": "gemini-flash",
 *   "styleVariant": "lifestyle-moments",
 *   "faithfulness": 0.7
 * }
 */
export const addToQueue = functions
  .region(REGION)
  .https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({
            success: false,
            error: "Method not allowed. Use POST.",
          });
          return;
        }

        const {
          originalUrl,
          productCategory,
          productName,
          caption,
          aiModel,
          styleVariant,
          faithfulness,
        } = request.body;

        if (!originalUrl) {
          response.status(400).json({
            success: false,
            error: "Missing required field: originalUrl",
          });
          return;
        }

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
        });

        response.json({
          success: true,
          message: "Added to queue",
          photo: {
            id: photo.id,
            originalUrl: photo.originalUrl,
            productCategory: photo.productCategory,
            status: photo.status,
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

/**
 * Get Pending Items
 * HTTP trigger to view pending queue items
 */
export const getPendingItems = functions
  .region(REGION)
  .https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
      try {
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

/**
 * Get Completed Items (Archive)
 * HTTP trigger to view completed/posted queue items
 * Shows original, enhanced URLs and captions for verification
 */
export const getCompletedItems = functions
  .region(REGION)
  .https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
      try {
        const limit = parseInt(request.query.limit as string) || 50;
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

/**
 * Process Queue Item (Manual Trigger)
 * HTTP trigger to manually process next item in queue
 *
 * Usage:
 * GET - Process next pending item with AI enhancement
 * GET ?skipEnhancement=true - Skip AI, use original image
 * GET ?itemId=xxx - Process specific item
 */
export const processQueueItem = functions
  .region(REGION)
  .runWith({timeoutSeconds: 300, memory: "512MB"})
  .https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
      try {
        const skipEnhancement = request.query.skipEnhancement === "true";
        const itemId = request.query.itemId as string | undefined;

        console.log("[processQueueItem] Starting...");
        console.log("[processQueueItem] Skip enhancement:", skipEnhancement);
        console.log("[processQueueItem] Item ID:", itemId || "next pending");

        // Lazy load processNextItem
        const processNextItem = await getProcessNextItem();
        const result = await processNextItem({
          skipEnhancement,
          itemId,
        });

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

/**
 * Daily Story Scheduler
 * Pub/Sub scheduled function - runs daily at 09:00 Istanbul time
 *
 * Processes the next pending item in queue and posts to Instagram
 */
export const dailyStoryScheduler = functions
  .region(REGION)
  .runWith({timeoutSeconds: 300, memory: "512MB"})
  .pubsub.schedule("0 9 * * *") // Every day at 09:00
  .timeZone(TIMEZONE) // Europe/Istanbul
  .onRun(async () => {
    console.log("[Scheduler] Daily story scheduler triggered");
    console.log("[Scheduler] Time:", new Date().toISOString());

    try {
      // Lazy load processNextItem
      const processNextItem = await getProcessNextItem();
      const result = await processNextItem({
        skipEnhancement: false, // AI enhancement açık
      });

      if (result.skipped) {
        console.log("[Scheduler] Skipped:", result.skipReason);
        return;
      }

      if (!result.success) {
        console.error("[Scheduler] Failed:", result.error);
        return;
      }

      console.log("[Scheduler] Success! Story ID:", result.storyId);
    } catch (error) {
      console.error("[Scheduler] Error:", error);
    }
  });

/**
 * Health Check / System Status
 * Returns overall system health and API status
 */
export const healthCheck = functions
  .region(REGION)
  .https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
      const startTime = Date.now();
      const checks: Record<string, {status: string; message?: string}> = {};

      // Check Instagram API
      try {
        const config = getConfig();
        const instagram = new InstagramService(
          config.instagram.accountId,
          config.instagram.accessToken
        );
        await instagram.validateToken();
        checks.instagram = {status: "ok"};
      } catch (error) {
        checks.instagram = {
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        };
      }

      // Check Queue
      try {
        const queue = new QueueService();
        const stats = await queue.getStats();
        checks.queue = {
          status: "ok",
          message: `${stats.pending} pending, ${stats.completed} completed`,
        };
      } catch (error) {
        checks.queue = {
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        };
      }

      // Overall status
      const allOk = Object.values(checks).every((c) => c.status === "ok");
      const duration = Date.now() - startTime;

      response.json({
        status: allOk ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        checks,
        version: "1.0.0",
      });
    });
  });

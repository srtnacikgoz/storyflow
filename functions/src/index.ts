/**
 * Instagram Automation Cloud Functions
 * Entry point - Full lazy loading for fast deployment
 */

import * as functions from "firebase-functions";

// Constants (lightweight - no lazy loading needed)
const REGION = "europe-west1";
const TIMEZONE = "Europe/Istanbul";

// ==========================================
// LAZY LOADERS
// ==========================================

let firebaseInitialized = false;
async function initFirebase() {
  if (!firebaseInitialized) {
    await import("./config/firebase");
    firebaseInitialized = true;
  }
}

async function getCors() {
  const cors = (await import("cors")).default;
  return cors({origin: true});
}

async function getInstagramService() {
  await initFirebase();
  const {InstagramService} = await import("./services/instagram");
  return InstagramService;
}

async function getQueueService() {
  await initFirebase();
  const {QueueService} = await import("./services/queue");
  return QueueService;
}

async function getUsageService() {
  await initFirebase();
  const {UsageService} = await import("./services/usage");
  return UsageService;
}

async function getConfig() {
  const {getConfig} = await import("./config/environment");
  return getConfig();
}

async function getTelegramConfigLazy() {
  const {getTelegramConfig} = await import("./config/environment");
  return getTelegramConfig();
}

async function isTelegramConfiguredLazy() {
  const {isTelegramConfigured} = await import("./config/environment");
  return isTelegramConfigured();
}

async function getProcessNextItem() {
  await initFirebase();
  const {processNextItem} = await import("./schedulers");
  return processNextItem;
}

async function getTelegramService() {
  const {TelegramService} = await import("./services/telegram");
  return TelegramService;
}

async function getProcessWithApproval() {
  await initFirebase();
  const {processWithApproval} = await import("./schedulers/processQueue");
  return processWithApproval;
}

async function getTimeScoreService() {
  await initFirebase();
  const {TimeScoreService} = await import("./services/timeScore");
  return TimeScoreService;
}

// ==========================================
// HTTP FUNCTIONS
// ==========================================

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

// Test Instagram Story
export const testInstagramStory = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    try {
      const imageUrl = request.query.imageUrl as string;
      const caption = (request.query.caption as string) ||
        "Test story from Sade Patisserie automation";

      if (!imageUrl) {
        response.status(400).json({
          success: false,
          error: "Missing required parameter: imageUrl",
        });
        return;
      }

      try {
        new URL(imageUrl);
      } catch {
        response.status(400).json({
          success: false,
          error: "Invalid imageUrl format",
        });
        return;
      }

      const config = await getConfig();
      const InstagramService = await getInstagramService();
      const instagram = new InstagramService(
        config.instagram.accountId,
        config.instagram.accessToken
      );

      const story = await instagram.createStory(imageUrl, caption);

      response.json({
        success: true,
        message: "Story created successfully!",
        story: {
          id: story.id,
          imageUrl: story.imageUrl,
          timestamp: new Date(story.timestamp).toISOString(),
        },
      });
    } catch (error) {
      console.error("[testInstagramStory] Error:", error);
      response.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

export const testInstagramPost = testInstagramStory;

// Validate Instagram Token
export const validateInstagramToken = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const config = await getConfig();
        const InstagramService = await getInstagramService();
        const instagram = new InstagramService(
          config.instagram.accountId,
          config.instagram.accessToken
        );

        const account = await instagram.validateToken();

        response.json({
          success: true,
          message: "Token is valid!",
          account: {id: account.id, name: account.name},
        });
      } catch (error) {
        console.error("[validateInstagramToken] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

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

        response.json({success: true, stats});
      } catch (error) {
        console.error("[getQueueStats] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// Get AI Usage Stats
export const getUsageStats = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const UsageService = await getUsageService();
        const usage = new UsageService();
        const stats = await usage.getStats();
        const recentUsage = await usage.getRecentUsage(20);

        response.json({success: true, stats, recent: recentUsage});
      } catch (error) {
        console.error("[getUsageStats] Error:", error);
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
          response.status(405).json({success: false, error: "Use POST"});
          return;
        }

        const {
          originalUrl, productCategory, productName, caption,
          aiModel, styleVariant, faithfulness,
          captionTemplateId, captionTemplateName, captionVariables,
          // Scheduling alanları
          schedulingMode, scheduledFor,
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
  .runWith({timeoutSeconds: 300, memory: "512MB"})
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const skipEnhancement = request.query.skipEnhancement === "true";
        const itemId = request.query.itemId as string | undefined;

        console.log("[processQueueItem] Starting...");

        const processNextItem = await getProcessNextItem();
        const result = await processNextItem({skipEnhancement, itemId});

        if (result.skipped) {
          response.json({success: true, skipped: true, reason: result.skipReason});
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

// Health Check
export const healthCheck = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      const startTime = Date.now();
      const checks: Record<string, {status: string; message?: string}> = {};

      // Check Instagram
      try {
        const config = await getConfig();
        const InstagramService = await getInstagramService();
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
        const QueueService = await getQueueService();
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

      // Check Telegram
      const telegramConfigured = await isTelegramConfiguredLazy();
      checks.telegram = {
        status: telegramConfigured ? "ok" : "not_configured",
        message: telegramConfigured ? "Bot configured" : "Not configured",
      };

      const allOk = Object.values(checks).every((c) =>
        c.status === "ok" || c.status === "not_configured"
      );
      const duration = Date.now() - startTime;

      response.json({
        status: allOk ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        checks,
        version: "3.0.0",
      });
    });
  });

// ==========================================
// SCHEDULER FUNCTIONS
// ==========================================

// Daily Story Scheduler (09:00 Istanbul)
export const dailyStoryScheduler = functions
  .region(REGION)
  .runWith({timeoutSeconds: 300, memory: "512MB"})
  .pubsub.schedule("0 9 * * *")
  .timeZone(TIMEZONE)
  .onRun(async () => {
    console.log("[Scheduler] Daily story scheduler triggered");

    try {
      const processNextItem = await getProcessNextItem();
      const result = await processNextItem({skipEnhancement: false});

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

// ==========================================
// TELEGRAM WEBHOOK & APPROVAL FUNCTIONS
// ==========================================

// Telegram Webhook Handler
export const telegramWebhook = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).json({error: "Method not allowed"});
      return;
    }

    try {
      const telegramConfigured = await isTelegramConfiguredLazy();
      if (!telegramConfigured) {
        console.error("[Telegram Webhook] Telegram not configured");
        response.status(500).json({error: "Telegram not configured"});
        return;
      }

      const telegramConfig = await getTelegramConfigLazy();
      const update = request.body;

      console.log("[Telegram Webhook] Received update:", JSON.stringify(update));

      if (!update.callback_query) {
        console.log("[Telegram Webhook] Not a callback query, ignoring");
        response.status(200).json({ok: true});
        return;
      }

      const callbackQuery = update.callback_query;
      const callbackData = callbackQuery.data;
      const fromChatId = callbackQuery.message?.chat?.id?.toString();

      // Chat ID validation (security)
      if (fromChatId !== telegramConfig.chatId) {
        console.warn("[Telegram Webhook] Unauthorized chat ID:", fromChatId);
        response.status(403).json({error: "Unauthorized"});
        return;
      }

      // Parse callback data
      const TelegramService = await getTelegramService();
      const parsed = TelegramService.parseCallback(callbackData);

      if (!parsed) {
        console.error("[Telegram Webhook] Invalid callback data:", callbackData);
        response.status(400).json({error: "Invalid callback data"});
        return;
      }

      console.log("[Telegram Webhook] Parsed callback:", parsed);

      const QueueService = await getQueueService();
      const queue = new QueueService();
      const telegram = new TelegramService(telegramConfig);

      const item = await queue.getById(parsed.itemId);

      if (!item) {
        console.error("[Telegram Webhook] Item not found:", parsed.itemId);
        await telegram.sendError("Görsel bulunamadı", parsed.itemId);
        response.status(404).json({error: "Item not found"});
        return;
      }

      if (item.status !== "awaiting_approval") {
        console.log("[Telegram Webhook] Item already processed:", item.status);
        response.status(200).json({ok: true, message: "Already processed"});
        return;
      }

      // Process action
      switch (parsed.action) {
      case "approve": {
        console.log("[Telegram Webhook] Approving item:", parsed.itemId);

        await queue.markAsApproved(parsed.itemId);

        // Scheduling kontrolü
        const schedulingMode = item.schedulingMode || "immediate";
        const scheduledFor = item.scheduledFor;

        // Eğer zamanlanmış paylaşım ise
        if ((schedulingMode === "scheduled" || schedulingMode === "optimal") && scheduledFor) {
          // Zamanlanmış olarak işaretle
          await queue.markAsScheduled(parsed.itemId, scheduledFor);

          // Telegram'a bilgi gönder
          const scheduledDate = new Date(scheduledFor);
          const formattedDate = scheduledDate.toLocaleDateString("tr-TR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          });

          await telegram.sendScheduledConfirmation(parsed.itemId, formattedDate);

          if (item.telegramMessageId) {
            await telegram.updateApprovalMessage(item.telegramMessageId, "approved");
          }

          console.log("[Telegram Webhook] Post scheduled for:", formattedDate);
          break;
        }

        // Hemen paylaş (immediate mode)
        const config = await getConfig();
        const InstagramService = await getInstagramService();
        const instagram = new InstagramService(
          config.instagram.accountId,
          config.instagram.accessToken
        );

        const imageUrl = item.enhancedUrl || item.originalUrl;
        const caption = item.caption || item.productName || "Sade Patisserie";

        try {
          const story = await instagram.createStory(imageUrl, caption);
          await queue.markAsCompleted(parsed.itemId, imageUrl, story.id);
          await telegram.sendConfirmation(true, parsed.itemId, story.id);

          if (item.telegramMessageId) {
            await telegram.updateApprovalMessage(item.telegramMessageId, "approved");
          }

          // Best Time to Post - Analitik kaydı
          try {
            const TimeScoreService = await getTimeScoreService();
            const timeScore = new TimeScoreService();
            await timeScore.recordPost(parsed.itemId, story.id, Date.now());
            console.log("[Telegram Webhook] Post analytics recorded");
          } catch (analyticsError) {
            // Analytics hatası ana akışı etkilemesin
            console.error("[Telegram Webhook] Analytics recording failed:", analyticsError);
          }

          console.log("[Telegram Webhook] Story posted:", story.id);
        } catch (instagramError) {
          console.error("[Telegram Webhook] Instagram post failed:", instagramError);
          await queue.markAsFailed(
            parsed.itemId,
            instagramError instanceof Error ? instagramError.message : "Instagram error"
          );
          await telegram.sendError(
            instagramError instanceof Error ? instagramError.message : "Instagram hatası",
            parsed.itemId
          );
        }
        break;
      }

      case "reject": {
        console.log("[Telegram Webhook] Rejecting item:", parsed.itemId);

        await queue.markAsRejected(parsed.itemId);
        await telegram.sendConfirmation(false, parsed.itemId);

        if (item.telegramMessageId) {
          await telegram.updateApprovalMessage(item.telegramMessageId, "rejected");
        }
        break;
      }

      case "regenerate": {
        console.log("[Telegram Webhook] Regenerating item:", parsed.itemId);

        // Eski mesajı güncelle
        if (item.telegramMessageId) {
          await telegram.updateApprovalMessage(item.telegramMessageId, "regenerate");
        }

        // Item'ı yeniden işleme için hazırla
        await queue.markForRegeneration(parsed.itemId);

        // Otomatik yeniden işle
        try {
          const processWithApproval = await getProcessWithApproval();
          const result = await processWithApproval({
            skipEnhancement: false,
            itemId: parsed.itemId,
          });

          if (result.success) {
            console.log("[Telegram Webhook] Regeneration started:", parsed.itemId);
            // Yeni görsel Telegram'a gönderildi, kullanıcı yeni onay bekleyecek
          } else {
            await telegram.sendError(
              result.error || "Yeniden oluşturma başarısız",
              parsed.itemId
            );
          }
        } catch (regenError) {
          console.error("[Telegram Webhook] Regeneration failed:", regenError);
          await telegram.sendError(
            regenError instanceof Error ? regenError.message : "Yeniden oluşturma hatası",
            parsed.itemId
          );
        }
        break;
      }
      }

      // Answer callback query
      try {
        const answerText = parsed.action === "approve" ? "✅ Onaylandı!" :
          parsed.action === "reject" ? "❌ Reddedildi" : "🔄 Yeniden oluşturuluyor...";
        await telegram.answerCallbackQuery(callbackQuery.id, answerText);
      } catch (answerError) {
        console.log("[Telegram Webhook] Could not answer callback:", answerError);
      }

      response.status(200).json({ok: true, action: parsed.action});
    } catch (error) {
      console.error("[Telegram Webhook] Error:", error);
      response.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

// Approval Timeout Checker (every 5 minutes)
export const checkApprovalTimeouts = functions
  .region(REGION)
  .pubsub.schedule("*/5 * * * *")
  .timeZone(TIMEZONE)
  .onRun(async () => {
    console.log("[Timeout Checker] Running...");

    const telegramConfigured = await isTelegramConfiguredLazy();
    if (!telegramConfigured) {
      console.log("[Timeout Checker] Telegram not configured, skipping");
      return;
    }

    try {
      const telegramConfig = await getTelegramConfigLazy();
      const QueueService = await getQueueService();
      const TelegramService = await getTelegramService();

      const queue = new QueueService();
      const telegram = new TelegramService(telegramConfig);

      const timedOutItems = await queue.getTimedOutItems(telegramConfig.approvalTimeout);

      console.log("[Timeout Checker] Found timed out items:", timedOutItems.length);

      for (const item of timedOutItems) {
        console.log("[Timeout Checker] Processing timeout for:", item.id);

        await queue.markAsTimeout(item.id);
        await telegram.sendTimeoutNotification(item.id);

        if (item.telegramMessageId) {
          await telegram.updateApprovalMessage(item.telegramMessageId, "rejected");
        }
      }

      console.log("[Timeout Checker] Complete");
    } catch (error) {
      console.error("[Timeout Checker] Error:", error);
    }
  });

// ==========================================
// SCHEDULED POST PROCESSOR
// Her 15 dakikada zamanlanmış postları kontrol et
// ==========================================
export const processScheduledPosts = functions
  .region(REGION)
  .pubsub.schedule("*/15 * * * *")
  .timeZone(TIMEZONE)
  .onRun(async () => {
    console.log("[Scheduled Processor] Running...");

    try {
      const QueueService = await getQueueService();
      const queue = new QueueService();

      // Zamanı gelmiş postları al
      const duePosts = await queue.getDueScheduledPosts();

      if (duePosts.length === 0) {
        console.log("[Scheduled Processor] No due posts found");
        return;
      }

      console.log("[Scheduled Processor] Found due posts:", duePosts.length);

      const config = await getConfig();
      const InstagramService = await getInstagramService();
      const instagram = new InstagramService(
        config.instagram.accountId,
        config.instagram.accessToken
      );

      // Telegram bildirimi için
      let telegram: InstanceType<Awaited<ReturnType<typeof getTelegramService>>> | null = null;
      const telegramConfigured = await isTelegramConfiguredLazy();
      if (telegramConfigured) {
        const telegramConfig = await getTelegramConfigLazy();
        const TelegramService = await getTelegramService();
        telegram = new TelegramService(telegramConfig);
      }

      for (const post of duePosts) {
        console.log("[Scheduled Processor] Processing:", post.id);

        try {
          const imageUrl = post.enhancedUrl || post.originalUrl;
          const caption = post.caption || post.productName || "Sade Patisserie";

          const story = await instagram.createStory(imageUrl, caption);
          await queue.markAsCompleted(post.id, imageUrl, story.id);

          // Analitik kaydı
          try {
            const TimeScoreService = await getTimeScoreService();
            const timeScore = new TimeScoreService();
            await timeScore.recordPost(post.id, story.id, Date.now());
          } catch (analyticsError) {
            console.error("[Scheduled Processor] Analytics error:", analyticsError);
          }

          // Telegram bildirimi
          if (telegram) {
            await telegram.sendConfirmation(true, post.id, story.id);
          }

          console.log("[Scheduled Processor] Posted:", post.id, "->", story.id);
        } catch (postError) {
          console.error("[Scheduled Processor] Post failed:", post.id, postError);
          await queue.markAsFailed(
            post.id,
            postError instanceof Error ? postError.message : "Unknown error"
          );

          if (telegram) {
            await telegram.sendError(
              postError instanceof Error ? postError.message : "Zamanlanmış paylaşım hatası",
              post.id
            );
          }
        }
      }

      console.log("[Scheduled Processor] Complete");
    } catch (error) {
      console.error("[Scheduled Processor] Error:", error);
    }
  });

// Process Queue with Approval (Manual Trigger)
export const processQueueWithApproval = functions
  .region(REGION)
  .runWith({timeoutSeconds: 300, memory: "512MB"})
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
        const result = await processWithApproval({skipEnhancement, itemId});

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

// ==========================================
// CAPTION TEMPLATE API (Phase 7)
// ==========================================

// Lazy loader for CaptionTemplateService
async function getCaptionTemplateService() {
  await initFirebase();
  const {CaptionTemplateService} = await import("./services/captionTemplate");
  return CaptionTemplateService;
}

// Get Templates (filtered by category)
export const getTemplates = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const category = request.query.category as string | undefined;
        const includeInactive = request.query.includeInactive === "true";

        const CaptionTemplateService = await getCaptionTemplateService();
        const service = new CaptionTemplateService();

        let templates;
        if (includeInactive) {
          templates = await service.getAllAdmin();
        } else {
          templates = await service.getAll(category as never);
        }

        response.json({
          success: true,
          count: templates.length,
          templates,
        });
      } catch (error) {
        console.error("[getTemplates] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// Get Template by ID
export const getTemplate = functions
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

        response.json({success: true, template});
      } catch (error) {
        console.error("[getTemplate] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// Create Template
export const createTemplate = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({success: false, error: "Use POST"});
          return;
        }

        const CaptionTemplateService = await getCaptionTemplateService();
        const service = new CaptionTemplateService();

        // Validate input
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
      } catch (error) {
        console.error("[createTemplate] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// Update Template
export const updateTemplate = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "PUT" && request.method !== "POST") {
          response.status(405).json({success: false, error: "Use PUT or POST"});
          return;
        }

        const id = request.query.id as string;
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
      } catch (error) {
        console.error("[updateTemplate] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// Delete Template
export const deleteTemplate = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "DELETE" && request.method !== "POST") {
          response.status(405).json({success: false, error: "Use DELETE or POST"});
          return;
        }

        const id = request.query.id as string;
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
      } catch (error) {
        console.error("[deleteTemplate] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// Preview Caption (render template with values)
export const previewCaption = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({success: false, error: "Use POST"});
          return;
        }

        const {templateId, values, photoContext} = request.body;

        if (!templateId) {
          response.status(400).json({
            success: false,
            error: "Missing required field: templateId",
          });
          return;
        }

        const CaptionTemplateService = await getCaptionTemplateService();
        const service = new CaptionTemplateService();
        const result = await service.previewCaption(
          templateId,
          values || {},
          photoContext || {}
        );

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
      } catch (error) {
        console.error("[previewCaption] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// Seed Default Templates
export const seedTemplates = functions
  .region(REGION)
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
      } catch (error) {
        console.error("[seedTemplates] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// ==========================================
// QUEUE CRUD API
// ==========================================

// Delete Queue Item
export const deleteQueueItem = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "DELETE" && request.method !== "POST") {
          response.status(405).json({success: false, error: "Use DELETE or POST"});
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
          response.status(405).json({success: false, error: "Use PUT or POST"});
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
          schedulingMode, scheduledFor, scheduledDayHour,
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

// ==========================================
// BEST TIME TO POST API (Phase 8)
// ==========================================

// Get Best Times (recommendations + heatmap)
export const getBestTimes = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const count = parseInt(request.query.count as string) || 5;

        const TimeScoreService = await getTimeScoreService();
        const service = new TimeScoreService();
        const result = await service.getBestTimes(count);

        response.json({
          success: true,
          ...result,
        });
      } catch (error) {
        console.error("[getBestTimes] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// Get Best Time for Today
export const getBestTimeToday = functions
  .region(REGION)
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
      } catch (error) {
        console.error("[getBestTimeToday] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// Get Post Analytics Stats
export const getPostAnalyticsStats = functions
  .region(REGION)
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
      } catch (error) {
        console.error("[getPostAnalyticsStats] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// Update Engagement Metrics (manuel güncelleme için)
export const updateEngagementMetrics = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({success: false, error: "Use POST"});
          return;
        }

        const {analyticsId, impressions, reach, likes, comments, saves, shares} =
          request.body;

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
      } catch (error) {
        console.error("[updateEngagementMetrics] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// ==========================================
// ANALYTICS DASHBOARD API (Phase 9)
// ==========================================

// Lazy load Analytics Service
const getAnalyticsService = async () => {
  await initFirebase();
  const {AnalyticsService} = await import("./services/analytics");
  return AnalyticsService;
};

// Get Full Analytics Dashboard
export const getAnalyticsDashboard = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const range = (request.query.range as string) || "all";
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
        const dashboard = await analytics.getDashboard(range as "today" | "week" | "month" | "all");

        response.json({
          success: true,
          range,
          ...dashboard,
        });
      } catch (error) {
        console.error("[getAnalyticsDashboard] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// Get Analytics Summary Only
export const getAnalyticsSummary = functions
  .region(REGION)
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
      } catch (error) {
        console.error("[getAnalyticsSummary] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// ==========================================
// CONTENT CALENDAR API (Phase 10)
// ==========================================

// Get Calendar Data (scheduled items + pending items + heatmap)
export const getCalendarData = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        await initFirebase();

        // Query parameters
        const startParam = request.query.start as string;
        const endParam = request.query.end as string;

        const startTimestamp = startParam ? parseInt(startParam) : Date.now();
        const endTimestamp = endParam ?
          parseInt(endParam) :
          startTimestamp + (7 * 24 * 60 * 60 * 1000); // Default: 1 hafta

        // Firestore queries
        const QueueService = await getQueueService();
        const queueService = new QueueService();
        const TimeScoreService = await getTimeScoreService();
        const timeScoreService = new TimeScoreService();

        // Zamanlanmış item'ları çek
        const allScheduled = await queueService.getScheduledPosts();
        const scheduledItems = allScheduled.filter((item) => {
          if (!item.scheduledFor) return false;
          return item.scheduledFor >= startTimestamp && item.scheduledFor <= endTimestamp;
        });

        // Pending item'ları çek (quick schedule için)
        const allPending = await queueService.getAllPending();
        const pendingItems = allPending.filter((item) => !item.scheduledFor);

        // Heatmap verisini al
        const bestTimes = await timeScoreService.getBestTimes(24);

        // Response formatla
        const formatItem = (item: {
          id: string;
          originalUrl: string;
          productName?: string;
          productCategory: string;
          caption: string;
          scheduledFor?: number;
          schedulingMode: string;
          status: string;
        }) => ({
          id: item.id,
          originalUrl: item.originalUrl,
          productName: item.productName,
          productCategory: item.productCategory,
          caption: item.caption,
          scheduledFor: item.scheduledFor,
          schedulingMode: item.schedulingMode,
          status: item.status,
        });

        response.json({
          success: true,
          items: scheduledItems.map(formatItem),
          pendingItems: pendingItems.slice(0, 20).map(formatItem),
          heatmap: bestTimes.heatmap,
        });
      } catch (error) {
        console.error("[getCalendarData] Error:", error);
        response.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

// ==========================================
// PHOTO PROMPT STUDIO API (Phase 11)
// ==========================================

// Receive Prompt from Photo Prompt Studio
export const receivePromptFromStudio = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      // Sadece POST kabul et
      if (request.method !== "POST") {
        response.status(405).json({
          success: false,
          message: "Method not allowed",
          error: "Only POST requests are accepted",
        });
        return;
      }

      // API Key kontrolü
      const apiKey = request.headers["x-api-key"] as string;
      const validApiKey = process.env.PROMPT_STUDIO_API_KEY ||
        functions.config().promptstudio?.api_key ||
        "dev-api-key-change-in-production";

      if (!apiKey || apiKey !== validApiKey) {
        console.warn("[PromptStudio] Invalid API key attempt");
        response.status(401).json({
          success: false,
          message: "Unauthorized",
          error: "Invalid or missing API key",
        });
        return;
      }

      try {
        await initFirebase();
        const {getFirestore, FieldValue} = await import("firebase-admin/firestore");
        const db = getFirestore();

        const data = request.body;

        // Zorunlu alan kontrolü
        if (!data.imageUrl) {
          response.status(400).json({
            success: false,
            message: "Validation error",
            error: "Missing required field: imageUrl",
          });
          return;
        }

        if (!data.prompt?.main) {
          response.status(400).json({
            success: false,
            message: "Validation error",
            error: "Missing required field: prompt.main",
          });
          return;
        }

        // Varsayılan değerler
        const category = data.settings?.category || "small-desserts";
        const styleVariant = data.settings?.styleVariant || "pure-minimal";
        const faithfulness = data.settings?.faithfulness ?? 0.7;
        const schedulingMode = data.settings?.schedulingMode || "optimal";

        const now = Date.now();

        // Dosya adını URL'den çıkar
        const urlParts = data.imageUrl.split("/");
        const filename = urlParts[urlParts.length - 1].split("?")[0] || `studio-${now}.jpg`;

        const docData = {
          // Temel bilgiler
          filename,
          originalUrl: data.imageUrl,
          productName: data.productName || data.analysis?.productType || "Photo Prompt Studio",
          productCategory: category,
          caption: "",

          // Photo Prompt Studio özel alanları
          source: "photo-prompt-studio",
          customPrompt: data.prompt.main,
          customNegativePrompt: data.prompt.negative || null,
          promptPlatform: data.prompt.platform || "gemini",
          promptFormat: data.prompt.format || "9:16",
          studioAnalysis: data.analysis || null,
          notes: data.notes || null,

          // AI ayarları
          aiModel: "gemini-flash",
          styleVariant,
          faithfulness,
          isEnhanced: false,

          // Caption template
          captionTemplateId: data.settings?.captionTemplateId || null,

          // Zamanlama
          schedulingMode,
          scheduledFor: data.settings?.scheduledTime
            ? new Date(data.settings.scheduledTime).getTime()
            : null,

          // Durum
          status: "pending",
          processed: false,
          approvalStatus: "none",

          // Timestamps
          uploadedAt: now,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection("media-queue").add(docData);

        console.log(`[PromptStudio] New item added: ${docRef.id}`);
        console.log(`[PromptStudio] Source: photo-prompt-studio`);
        console.log(`[PromptStudio] Product: ${docData.productName}`);

        response.status(201).json({
          success: true,
          message: "Prompt received and queued successfully",
          itemId: docRef.id,
          status: "pending",
        });
      } catch (error) {
        console.error("[PromptStudio] Error:", error);
        response.status(500).json({
          success: false,
          message: "Internal server error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

/**
 * Queue Processor - Orchestration Function
 * Instagram Automation - Sade Patisserie
 *
 * Main workflow:
 * 1. Get next pending item from queue
 * 2. (Optional) Enhance with Gemini img2img
 * 3. Post to Instagram as Story
 * 4. Update queue status
 */

import {Photo} from "../types";
import {QueueService, InstagramService, UsageService} from "../services";
// GeminiService: Dynamic import - startup timeout önlemi
// import {GeminiService} from "../services/gemini"; -- KULLANILMIYOR
import {getConfig} from "../config/environment";
import {buildPrompt} from "../prompts";
import {getStorage} from "firebase-admin/storage";
// Node 20+ built-in fetch kullanılıyor - node-fetch'e gerek yok

// Gemini lazy loader - sadece kullanıldığında yüklenir
async function getGeminiService() {
  const {GeminiService} = await import("../services/gemini");
  return GeminiService;
}

/**
 * Process options
 */
export interface ProcessOptions {
  /** Skip AI enhancement, use original image */
  skipEnhancement?: boolean;
  /** Specific item ID to process (instead of next pending) */
  itemId?: string;
}

/**
 * Process result
 */
export interface ProcessResult {
  success: boolean;
  itemId?: string;
  storyId?: string;
  enhancedUrl?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Process next item in queue
 * Main orchestration function
 *
 * @param {ProcessOptions} options - Processing options
 * @return {Promise<ProcessResult>} Process result
 */
export async function processNextItem(
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  const config = getConfig();
  const queue = new QueueService();

  console.log("[Orchestrator] Starting queue processing...");

  try {
    // Step 1: Get item to process
    let item: Photo | null;

    if (options.itemId) {
      item = await queue.getById(options.itemId);
      if (!item) {
        return {
          success: false,
          error: `Item not found: ${options.itemId}`,
        };
      }
      if (item.status !== "pending") {
        return {
          success: false,
          skipped: true,
          skipReason: `Item status is ${item.status}, not pending`,
        };
      }
    } else {
      item = await queue.getNextPending();
    }

    if (!item) {
      console.log("[Orchestrator] No pending items in queue");
      return {
        success: true,
        skipped: true,
        skipReason: "No pending items in queue",
      };
    }

    console.log("[Orchestrator] Processing item:", item.id);
    console.log("[Orchestrator] Category:", item.productCategory);
    console.log("[Orchestrator] Product:", item.productName || "N/A");

    // Step 2: Mark as processing
    await queue.markAsProcessing(item.id);

    // Step 3: Determine final image URL
    let finalImageUrl = item.originalUrl;
    let isEnhanced = false;
    let enhancementError: string | undefined;

    // AI enhancement logic
    const shouldEnhance = !options.skipEnhancement && item.aiModel !== "none";

    if (shouldEnhance) {
      try {
        console.log("[Orchestrator] Starting Gemini enhancement...");
        console.log("[Orchestrator] Model:", item.aiModel);
        console.log("[Orchestrator] Style:", item.styleVariant);
        console.log("[Orchestrator] Faithfulness:", item.faithfulness);

        // Model seçimi: gemini-flash → gemini-2.5-flash-image, gemini-pro → gemini-3-pro-image-preview
        const modelMap: Record<string, "gemini-2.5-flash-image" | "gemini-3-pro-image-preview"> = {
          "gemini-flash": "gemini-2.5-flash-image",
          "gemini-pro": "gemini-3-pro-image-preview",
        };
        const selectedModel = modelMap[item.aiModel] || "gemini-2.5-flash-image";

        // GeminiService'i dynamic import ile yükle (startup timeout önlemi)
        const GeminiServiceClass = await getGeminiService();
        const gemini = new GeminiServiceClass({
          apiKey: config.gemini.apiKey,
          model: selectedModel,
        });

        const usage = new UsageService();

        // Download original image
        console.log("[Orchestrator] Downloading original image...");
        const imageResponse = await fetch(item.originalUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const base64Image = imageBuffer.toString("base64");

        // Determine mime type
        const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

        // Build prompt - Photo Prompt Studio'dan geliyorsa customPrompt kullan
        let prompt: string;
        let negativePrompt: string;

        if (item.customPrompt) {
          // Photo Prompt Studio'dan gelen custom prompt
          console.log("[Orchestrator] Using custom prompt from Photo Prompt Studio");
          prompt = item.customPrompt;
          negativePrompt = item.customNegativePrompt || "";
        } else {
          // Varsayılan prompt builder
          const builtPrompt = buildPrompt(
            item.productCategory,
            item.styleVariant,
            item.productName
          );
          prompt = builtPrompt.prompt;
          negativePrompt = builtPrompt.negativePrompt;
        }

        // Transform with Gemini
        console.log("[Orchestrator] Transforming with Gemini...");

        // Gemini desteklenen aspect ratio'lar: 1:1, 9:16, 16:9, 4:3, 3:4
        // 4:5 desteklenmiyor, en yakın alternatif 3:4
        const aspectRatioMap: Record<string, "1:1" | "9:16" | "16:9" | "4:3" | "3:4"> = {
          "1:1": "1:1",
          "4:5": "3:4", // Instagram feed -> en yakın alternatif
          "9:16": "9:16",
          "16:9": "16:9",
          "4:3": "4:3",
          "3:4": "3:4",
        };
        const mappedAspectRatio = aspectRatioMap[item.promptFormat || "9:16"] || "9:16";

        const result = await gemini.transformImage(base64Image, contentType, {
          prompt,
          negativePrompt,
          faithfulness: item.faithfulness,
          aspectRatio: mappedAspectRatio,
          // Caption varsa görsele yazı olarak ekle
          textOverlay: item.caption || undefined,
        });

        // Upload enhanced image to Firebase Storage
        console.log("[Orchestrator] Uploading enhanced image...");
        const bucket = getStorage().bucket();
        const enhancedPath = `enhanced/${item.id}_${Date.now()}.png`;
        const file = bucket.file(enhancedPath);

        await file.save(Buffer.from(result.imageBase64, "base64"), {
          metadata: {
            contentType: result.mimeType,
          },
        });

        // Make file public and get URL
        await file.makePublic();
        finalImageUrl = `https://storage.googleapis.com/${bucket.name}/${enhancedPath}`;

        // Log usage - model tipini de gönder
        const usageModelType = item.aiModel === "gemini-pro" ? "gemini-pro" : "gemini-flash";
        await usage.logGeminiUsage(item.id, result.cost, usageModelType);

        isEnhanced = true;
        console.log("[Orchestrator] Gemini enhancement complete");
      } catch (error) {
        console.error("[Orchestrator] Gemini enhancement failed:", error);
        console.log("[Orchestrator] Falling back to original image");
        enhancementError = error instanceof Error ? error.message : "Unknown error";
        // Continue with original image if enhancement fails
      }
    } else {
      console.log("[Orchestrator] Skipping enhancement, using original image");
    }

    // Update enhancement status in queue
    if (shouldEnhance) {
      try {
        await queue.updateEnhancementStatus(item.id, isEnhanced, enhancementError);
      } catch (updateError) {
        console.error("[Orchestrator] Failed to update enhancement status:", updateError);
      }
    }

    // Step 4: Post to Instagram
    console.log("[Orchestrator] Posting story to Instagram...");

    const instagram = new InstagramService(
      config.instagram.accountId,
      config.instagram.accessToken
    );

    const story = await instagram.createStory(
      finalImageUrl,
      item.caption || item.productName || "Sade Patisserie"
    );

    console.log("[Orchestrator] Story posted:", story.id);

    // Step 5: Update queue status
    await queue.markAsCompleted(item.id, finalImageUrl, story.id);

    console.log("[Orchestrator] Process complete!");

    return {
      success: true,
      itemId: item.id,
      storyId: story.id,
      enhancedUrl: finalImageUrl !== item.originalUrl ? finalImageUrl : undefined,
    };
  } catch (error) {
    console.error("[Orchestrator] Process failed:", error);

    // Try to mark item as failed if we have an ID
    if (options.itemId) {
      try {
        await queue.markAsFailed(
          options.itemId,
          error instanceof Error ? error.message : "Unknown error"
        );
      } catch (updateError) {
        console.error("[Orchestrator] Failed to update status:", updateError);
      }
    }

    return {
      success: false,
      itemId: options.itemId,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process all pending items
 * Processes items one by one until queue is empty
 *
 * @param {ProcessOptions} options - Processing options
 * @return {Promise<object>} Summary of processing
 */
export async function processAllPending(
  options: ProcessOptions = {}
): Promise<{
  processed: number;
  failed: number;
  results: ProcessResult[];
}> {
  const results: ProcessResult[] = [];
  let processed = 0;
  let failed = 0;

  console.log("[Orchestrator] Processing all pending items...");

  // Process items one by one
  while (true) {
    const result = await processNextItem(options);

    if (result.skipped && result.skipReason === "No pending items in queue") {
      break;
    }

    results.push(result);

    if (result.success && !result.skipped) {
      processed++;
    } else if (!result.success) {
      failed++;
    }

    // Small delay between items to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  console.log(`[Orchestrator] Complete: ${processed} processed, ${failed} failed`);

  return {
    processed,
    failed,
    results,
  };
}

// ==========================================
// TELEGRAM APPROVAL WORKFLOW (Phase 6)
// ==========================================

/**
 * Process result for approval workflow
 */
export interface ApprovalProcessResult {
  success: boolean;
  itemId?: string;
  enhancedUrl?: string;
  telegramMessageId?: number;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Process next item and send to Telegram for approval
 * Does NOT post to Instagram - that happens after user approval
 *
 * @param {ProcessOptions} options - Processing options
 * @return {Promise<ApprovalProcessResult>} Process result
 */
export async function processWithApproval(
  options: ProcessOptions = {}
): Promise<ApprovalProcessResult> {
  const config = getConfig();
  const queue = new QueueService();

  console.log("[Orchestrator] Starting approval workflow...");

  try {
    // Step 1: Get item to process
    let item: Photo | null;

    if (options.itemId) {
      item = await queue.getById(options.itemId);
      if (!item) {
        return {
          success: false,
          error: `Item not found: ${options.itemId}`,
        };
      }
      if (item.status !== "pending") {
        return {
          success: false,
          skipped: true,
          skipReason: `Item status is ${item.status}, not pending`,
        };
      }
    } else {
      item = await queue.getNextPending();
    }

    if (!item) {
      console.log("[Orchestrator] No pending items in queue");
      return {
        success: true,
        skipped: true,
        skipReason: "No pending items in queue",
      };
    }

    console.log("[Orchestrator] Processing item for approval:", item.id);
    console.log("[Orchestrator] Category:", item.productCategory);

    // Step 2: Mark as processing
    await queue.markAsProcessing(item.id);

    // Step 3: Determine final image URL (with optional enhancement)
    let finalImageUrl = item.originalUrl;
    let isEnhanced = false;
    let enhancementError: string | undefined;

    const shouldEnhance = !options.skipEnhancement && item.aiModel !== "none";

    if (shouldEnhance) {
      try {
        console.log("[Orchestrator] Starting Gemini enhancement...");

        const modelMap: Record<string, "gemini-2.5-flash-image" | "gemini-3-pro-image-preview"> = {
          "gemini-flash": "gemini-2.5-flash-image",
          "gemini-pro": "gemini-3-pro-image-preview",
        };
        const selectedModel = modelMap[item.aiModel] || "gemini-2.5-flash-image";

        const GeminiServiceClass = await getGeminiService();
        const gemini = new GeminiServiceClass({
          apiKey: config.gemini.apiKey,
          model: selectedModel,
        });

        const usage = new UsageService();

        // Download original image
        const imageResponse = await fetch(item.originalUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const base64Image = imageBuffer.toString("base64");
        const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

        // Build prompt - Photo Prompt Studio'dan geliyorsa customPrompt kullan
        let prompt: string;
        let negativePrompt: string;

        if (item.customPrompt) {
          // Photo Prompt Studio'dan gelen custom prompt
          console.log("[Orchestrator] Using custom prompt from Photo Prompt Studio");
          prompt = item.customPrompt;
          negativePrompt = item.customNegativePrompt || "";
        } else {
          // Varsayılan prompt builder
          const builtPrompt = buildPrompt(
            item.productCategory,
            item.styleVariant,
            item.productName
          );
          prompt = builtPrompt.prompt;
          negativePrompt = builtPrompt.negativePrompt;
        }

        // Transform with Gemini
        console.log("[Orchestrator] Transforming with Gemini...");

        // Gemini desteklenen aspect ratio'lar: 1:1, 9:16, 16:9, 4:3, 3:4
        // 4:5 desteklenmiyor, en yakın alternatif 3:4
        const aspectRatioMap2: Record<string, "1:1" | "9:16" | "16:9" | "4:3" | "3:4"> = {
          "1:1": "1:1",
          "4:5": "3:4", // Instagram feed -> en yakın alternatif
          "9:16": "9:16",
          "16:9": "16:9",
          "4:3": "4:3",
          "3:4": "3:4",
        };
        const mappedAspectRatio2 = aspectRatioMap2[item.promptFormat || "9:16"] || "9:16";

        const result = await gemini.transformImage(base64Image, contentType, {
          prompt,
          negativePrompt,
          faithfulness: item.faithfulness,
          aspectRatio: mappedAspectRatio2,
          textOverlay: item.caption || undefined,
        });

        // Upload enhanced image to Firebase Storage
        const bucket = getStorage().bucket();
        const enhancedPath = `enhanced/${item.id}_${Date.now()}.png`;
        const file = bucket.file(enhancedPath);

        await file.save(Buffer.from(result.imageBase64, "base64"), {
          metadata: {contentType: result.mimeType},
        });

        await file.makePublic();
        finalImageUrl = `https://storage.googleapis.com/${bucket.name}/${enhancedPath}`;

        // Log usage
        const usageModelType = item.aiModel === "gemini-pro" ? "gemini-pro" : "gemini-flash";
        await usage.logGeminiUsage(item.id, result.cost, usageModelType);

        isEnhanced = true;
        console.log("[Orchestrator] Gemini enhancement complete");
      } catch (error) {
        console.error("[Orchestrator] Gemini enhancement failed:", error);
        enhancementError = error instanceof Error ? error.message : "Unknown error";
        // Continue with original image
      }
    }

    // Update enhancement status
    if (shouldEnhance) {
      await queue.updateEnhancementStatus(item.id, isEnhanced, enhancementError);
    }

    // Step 4: Send to Telegram for approval (instead of posting to Instagram)
    console.log("[Orchestrator] Sending to Telegram for approval...");

    // Lazy import TelegramService
    const {TelegramService} = await import("../services/telegram");
    const {getTelegramConfig} = await import("../config/environment");

    const telegramConfig = getTelegramConfig();
    const telegram = new TelegramService(telegramConfig);

    // Update item with enhanced URL before sending to Telegram
    const itemForApproval: Photo = {
      ...item,
      enhancedUrl: isEnhanced ? finalImageUrl : undefined,
    };

    const telegramMessageId = await telegram.sendApprovalRequest(
      itemForApproval,
      finalImageUrl
    );

    // Step 5: Mark as awaiting approval
    await queue.markAsAwaitingApproval(
      item.id,
      telegramMessageId,
      isEnhanced ? finalImageUrl : undefined
    );

    console.log("[Orchestrator] Sent to Telegram, awaiting approval");

    return {
      success: true,
      itemId: item.id,
      enhancedUrl: isEnhanced ? finalImageUrl : undefined,
      telegramMessageId,
    };
  } catch (error) {
    console.error("[Orchestrator] Approval workflow failed:", error);

    if (options.itemId) {
      try {
        await queue.markAsFailed(
          options.itemId,
          error instanceof Error ? error.message : "Unknown error"
        );
      } catch (updateError) {
        console.error("[Orchestrator] Failed to update status:", updateError);
      }
    }

    return {
      success: false,
      itemId: options.itemId,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Queue Processor - Orchestration Function
 * Instagram Automation - Sade Patisserie
 *
 * Main workflow:
 * 1. Get next pending item from queue
 * 2. (Optional) Analyze with Vision API
 * 3. (Optional) Enhance with DALL-E 3
 * 4. Post to Instagram as Story
 * 5. Update queue status
 */

import {Photo} from "../types";
import {QueueService, InstagramService, OpenAIService} from "../services";
import {getConfig} from "../config/environment";

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

    if (!options.skipEnhancement && item.productCategory) {
      try {
        console.log("[Orchestrator] Starting AI enhancement...");

        const openai = new OpenAIService(config.openai.apiKey);

        // Analyze original photo
        console.log("[Orchestrator] Step 3a: Vision analysis...");
        const analysis = await openai.analyzePhoto(
          item.originalUrl,
          item.productCategory
        );

        // Enhance with DALL-E
        console.log("[Orchestrator] Step 3b: DALL-E enhancement...");
        const enhanced = await openai.enhancePhoto(
          analysis.analysis,
          item.productCategory,
          item.productName
        );

        finalImageUrl = enhanced.url;
        console.log("[Orchestrator] Enhancement complete");
      } catch (enhanceError) {
        console.error("[Orchestrator] Enhancement failed:", enhanceError);
        console.log("[Orchestrator] Falling back to original image");
        // Continue with original image if enhancement fails
      }
    } else {
      console.log("[Orchestrator] Skipping enhancement, using original image");
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

import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { getConfig } from "../lib/serviceFactory";
import { OrchestratorScheduler as SchedulerClass } from "../orchestrator/scheduler";
import { OrchestratorConfig } from "../orchestrator/types";

const claudeApiKey = defineSecret("CLAUDE_API_KEY");

/**
 * Orchestrator Scheduler
 * Runs every 15 minutes to:
 * 1. Check for active TimeSlotRules and trigger content generation (if optimal time)
 * 2. Check for stuck/timed-out jobs and mark them as failed
 */
export const orchestratorScheduler = onSchedule(
    {
        schedule: "*/15 * * * *", // Every 15 minutes
        timeZone: "Europe/Istanbul",
        region: "europe-west1",
        retryCount: 3,
        memory: "1GiB", // Using 1GB to be safe with image processing if needed
        secrets: [claudeApiKey],
        timeoutSeconds: 540, // 9 minutes max
    },
    async (event) => {
        console.log("⏰ Orchestrator Scheduler triggered:", new Date().toISOString());

        try {
            // 1. Prepare Configuration
            const config = await getConfig();

            const orchestratorConfig: OrchestratorConfig = {
                claudeApiKey: claudeApiKey.value(),
                claudeModel: "claude-sonnet-4-20250514", // Hardcoded model preference
                geminiApiKey: config.gemini.apiKey,
                geminiModel: "gemini-3-pro-image-preview",
                qualityThreshold: 7,
                maxRetries: 3,
                telegramBotToken: config.telegram?.botToken || "",
                telegramChatId: config.telegram?.chatId || "",
                approvalTimeout: config.telegram?.approvalTimeout || 60,
                timezone: "Europe/Istanbul",
                scheduleBuffer: 30, // 30 mins buffer for optimal time triggering
            };

            const scheduler = new SchedulerClass(orchestratorConfig);

            // 2. Check & Trigger New Slots
            // This uses TimeScoreService to find the "active" window for any rule
            console.log("🔍 Checking for triggerable rules...");
            const triggerResult = await scheduler.checkAndTrigger();
            console.log(`✅ Trigger Results: ${triggerResult.triggered} triggered, ${triggerResult.skipped} skipped.`);
            if (triggerResult.errors.length > 0) {
                console.error("⚠️ Trigger Errors:", triggerResult.errors);
            }

            // 3. Check for Stuck/Stale Slots
            console.log("🔄 Checking for stuck pipelines...");
            const stuckResult = await scheduler.checkStuckSlots();
            console.log(`🧹 Stuck Slots: ${stuckResult.recovered} recovered (logged), ${stuckResult.failed} marked as failed.`);

            console.log("🏁 Scheduler finished successfully.");

        } catch (error) {
            console.error("❌ Orchestrator Scheduler Fatal Error:", error);
        }
    }
);

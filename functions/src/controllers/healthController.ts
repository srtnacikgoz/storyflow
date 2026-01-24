import * as functions from "firebase-functions";
import {
    getCors,
    getConfig,
    getInstagramService,
    getQueueService,
    isTelegramConfiguredLazy,
} from "../lib/serviceFactory";
import { getTimeouts } from "../services/configService";

const REGION = "europe-west1";
const TIMEZONE = "Europe/Istanbul";

// Health Check
export const healthCheck = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            const startTime = Date.now();
            const checks: Record<string, { status: string; message?: string }> = {};

            // Check Instagram
            try {
                const config = await getConfig();
                const InstagramService = await getInstagramService();
                const instagram = new InstagramService(
                    config.instagram.accountId,
                    config.instagram.accessToken
                );
                await instagram.validateToken();
                checks.instagram = { status: "ok" };
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
            const { getTelegramConfigLazy, getTelegramService } = await import("../lib/serviceFactory");
            const telegramConfig = await getTelegramConfigLazy();
            const QueueService = await getQueueService();
            const TelegramService = await getTelegramService();

            const queue = new QueueService();
            const telegram = new TelegramService(telegramConfig);

            // Timeout değerini Firestore config'den al (runtime'da değiştirilebilir)
            const timeoutConfig = await getTimeouts();
            const approvalTimeoutMinutes = timeoutConfig.telegramApprovalMinutes;

            console.log(`[Timeout Checker] Using approval timeout: ${approvalTimeoutMinutes} minutes`);
            const timedOutItems = await queue.getTimedOutItems(approvalTimeoutMinutes);

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

import * as functions from "firebase-functions";
import {
    isTelegramConfiguredLazy,
    getTelegramConfigLazy,
    getTelegramService,
    getQueueService,
    getProcessWithApproval,
    getConfig,
    getInstagramService,
    getTimeScoreService,
} from "../lib/serviceFactory";

const REGION = "europe-west1";

// Telegram Webhook Handler
export const telegramWebhook = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        if (request.method !== "POST") {
            response.status(405).json({ error: "Method not allowed" });
            return;
        }

        try {
            const telegramConfigured = await isTelegramConfiguredLazy();
            if (!telegramConfigured) {
                console.error("[Telegram Webhook] Telegram not configured");
                response.status(500).json({ error: "Telegram not configured" });
                return;
            }

            const telegramConfig = await getTelegramConfigLazy();
            const update = request.body;

            console.log("[Telegram Webhook] Received update:", JSON.stringify(update));

            if (!update.callback_query) {
                console.log("[Telegram Webhook] Not a callback query, ignoring");
                response.status(200).json({ ok: true });
                return;
            }

            const callbackQuery = update.callback_query;
            const callbackData = callbackQuery.data;
            const fromChatId = callbackQuery.message?.chat?.id?.toString();

            // Chat ID validation (security)
            if (fromChatId !== telegramConfig.chatId) {
                console.warn("[Telegram Webhook] Unauthorized chat ID:", fromChatId);
                response.status(403).json({ error: "Unauthorized" });
                return;
            }

            // Parse callback data
            const TelegramService = await getTelegramService();
            const parsed = TelegramService.parseCallback(callbackData);

            if (!parsed) {
                console.error("[Telegram Webhook] Invalid callback data:", callbackData);
                response.status(400).json({ error: "Invalid callback data" });
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
                response.status(404).json({ error: "Item not found" });
                return;
            }

            if (item.status !== "awaiting_approval") {
                console.log("[Telegram Webhook] Item already processed:", item.status);
                response.status(200).json({ ok: true, message: "Already processed" });
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

            response.status(200).json({ ok: true, action: parsed.action });
        } catch (error) {
            console.error("[Telegram Webhook] Error:", error);
            response.status(500).json({
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });

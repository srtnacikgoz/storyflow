import * as functions from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
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

            console.log(`[Telegram Webhook] Looking for item: ${parsed.itemId} in queue`);
            let item = await queue.getById(parsed.itemId);

            if (!item) {
                console.error("[Telegram Webhook] Item via QueueService not found:", parsed.itemId);

                // FALLBACK: Check 'photos' collection (legacy support)
                try {
                    const db = await import("firebase-admin/firestore").then(m => m.getFirestore());
                    const legacyDoc = await db.collection("photos").doc(parsed.itemId).get();
                    if (legacyDoc.exists) {
                        console.log("[Telegram Webhook] FOUND in legacy 'photos' collection!");
                        // We found it, but QueueService can't handle it. We need to handle it manually or migration.
                        // For now, let's just error but log it was found there.
                        await telegram.sendError("Hata: Görsel eski koleksiyonda (photos) kaldı. Lütfen yeniden oluşturun.", parsed.itemId);
                        response.status(404).json({ error: "Item in legacy collection" });
                        return;
                    } else {
                        console.log("[Telegram Webhook] Not found in legacy 'photos' either.");
                    }
                } catch (e) {
                    console.error("[Telegram Webhook] Fallback check failed:", e);
                }

                await telegram.sendError(`Görsel bulunamadı (ID: ${parsed.itemId})`, parsed.itemId);
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

                        // Orchestrator scheduled-slots güncellemesi
                        // slotId varsa, scheduled-slots koleksiyonundaki durumu da güncelle
                        console.log("[Telegram Webhook] 🔍 Checking slotId for scheduled-slots update:", {
                            slotId: item.slotId,
                            slotIdType: typeof item.slotId,
                            slotIdTruthy: !!item.slotId,
                            itemKeys: Object.keys(item),
                        });
                        if (item.slotId) {
                            try {
                                const db = getFirestore();
                                await db.collection("scheduled-slots").doc(item.slotId).update({
                                    status: "published",
                                    igPostId: story.id,
                                    completedAt: Date.now(),
                                    updatedAt: Date.now(),
                                    "pipelineResult.approvalStatus": "approved",
                                    "pipelineResult.publishedAt": Date.now(),
                                    "pipelineResult.instagramPostId": story.id,
                                });
                                console.log("[Telegram Webhook] scheduled-slots updated:", item.slotId);
                            } catch (slotError) {
                                // Slot güncelleme hatası ana akışı etkilemesin
                                console.error("[Telegram Webhook] scheduled-slots update failed:", slotError);
                            }
                        } else {
                            // slotId yoksa uyarı logla - bu durum sorun teşkil edebilir
                            console.warn("[Telegram Webhook] ⚠️ Item has no slotId, scheduled-slots will NOT be updated!", {
                                itemId: parsed.itemId,
                                productName: item.productName,
                                source: item.source,
                            });
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

                        // Orchestrator scheduled-slots hata güncellemesi
                        if (item.slotId) {
                            try {
                                const db = getFirestore();
                                await db.collection("scheduled-slots").doc(item.slotId).update({
                                    status: "failed",
                                    error: instagramError instanceof Error ? instagramError.message : "Instagram error",
                                    failedAt: Date.now(),
                                    updatedAt: Date.now(),
                                });
                                console.log("[Telegram Webhook] scheduled-slots failed:", item.slotId);
                            } catch (slotError) {
                                console.error("[Telegram Webhook] scheduled-slots fail update failed:", slotError);
                            }
                        }
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

                    // Orchestrator scheduled-slots güncellemesi
                    console.log("[Telegram Webhook] 🔍 Checking slotId for rejection:", {
                        slotId: item.slotId,
                        slotIdType: typeof item.slotId,
                        slotIdTruthy: !!item.slotId,
                    });
                    if (item.slotId) {
                        try {
                            const db = getFirestore();
                            await db.collection("scheduled-slots").doc(item.slotId).update({
                                status: "failed",
                                error: "Kullanıcı tarafından reddedildi",
                                rejectedAt: Date.now(),
                                updatedAt: Date.now(),
                                "pipelineResult.approvalStatus": "rejected",
                                "pipelineResult.approvalRespondedAt": Date.now(),
                            });
                            console.log("[Telegram Webhook] scheduled-slots rejected:", item.slotId);
                        } catch (slotError) {
                            console.error("[Telegram Webhook] scheduled-slots reject update failed:", slotError);
                        }
                    } else {
                        console.warn("[Telegram Webhook] ⚠️ Item has no slotId for rejection!", {
                            itemId: parsed.itemId,
                        });
                    }
                    break;
                }

                case "regenerate": {
                    console.log("[Telegram Webhook] Regenerating item:", parsed.itemId);

                    // ATOMIC LOCK: Race condition önleme
                    // Birden fazla callback aynı anda gelirse sadece ilki işlenir
                    const lockAcquired = await queue.tryMarkForRegeneration(parsed.itemId);

                    if (!lockAcquired) {
                        console.log("[Telegram Webhook] Regeneration already in progress, skipping duplicate:", parsed.itemId);
                        // Telegram'a hemen yanıt ver - duplicate callback
                        response.status(200).json({ ok: true, message: "Already regenerating" });
                        return;
                    }

                    // Eski mesajı güncelle (lock alındıktan sonra)
                    if (item.telegramMessageId) {
                        await telegram.updateApprovalMessage(item.telegramMessageId, "regenerate");
                    }

                    // Otomatik yeniden işle
                    try {
                        const processWithApproval = await getProcessWithApproval();
                        const result = await processWithApproval({
                            skipEnhancement: false,
                            itemId: parsed.itemId,
                        });

                        if (result.success) {
                            console.log("[Telegram Webhook] Regeneration completed:", parsed.itemId);
                            // Yeni görsel Telegram'a gönderildi, kullanıcı yeni onay bekleyecek
                        } else {
                            console.error("[Telegram Webhook] Regeneration failed:", result.error);
                            await telegram.sendError(
                                result.error || "Yeniden oluşturma başarısız",
                                parsed.itemId
                            );
                        }
                    } catch (regenError) {
                        console.error("[Telegram Webhook] Regeneration error:", regenError);
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

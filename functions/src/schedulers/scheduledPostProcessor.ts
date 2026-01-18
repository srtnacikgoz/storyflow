import * as functions from "firebase-functions";
import {
    getQueueService,
    getConfig,
    getInstagramService,
    isTelegramConfiguredLazy,
    getTelegramConfigLazy,
    getTelegramService,
    getGeminiService,
    getTimeScoreService,
} from "../lib/serviceFactory";

const REGION = "europe-west1";
const TIMEZONE = "Europe/Istanbul";

// Zamanı gelen postları: Gemini ile işle → skipApproval'a göre paylaş veya onay bekle
// ==========================================
export const processScheduledPosts = functions
    .region(REGION)
    .runWith({ timeoutSeconds: 540, memory: "1GB" })
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

            // Telegram için
            let telegram: InstanceType<Awaited<ReturnType<typeof getTelegramService>>> | null = null;
            const telegramConfigured = await isTelegramConfiguredLazy();
            if (telegramConfigured) {
                const telegramConfig = await getTelegramConfigLazy();
                const TelegramService = await getTelegramService();
                telegram = new TelegramService(telegramConfig);
            }

            // Gemini için
            const GeminiService = await getGeminiService();
            const gemini = new GeminiService({ apiKey: config.gemini.apiKey });

            // Storage için
            const { getStorage } = await import("firebase-admin/storage");

            for (const post of duePosts) {
                console.log("[Scheduled Processor] Processing:", post.id);

                try {
                    let imageUrl = post.enhancedUrl || "";
                    const skipEnhancement = post.aiModel === "none";

                    // 1. Gemini ile işleme (eğer henüz işlenmemişse ve AI açıksa)
                    if (!post.enhancedUrl && !skipEnhancement) {
                        console.log("[Scheduled Processor] Enhancing with Gemini...");

                        // Görseli indir
                        const imageResponse = await fetch(post.originalUrl);
                        if (!imageResponse.ok) {
                            throw new Error(`Failed to fetch image: ${imageResponse.status}`);
                        }
                        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
                        const base64Image = imageBuffer.toString("base64");
                        const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

                        // Prompt oluştur
                        const { buildPrompt } = await import("../prompts");
                        let prompt: string;
                        let negativePrompt: string;

                        if (post.customPrompt) {
                            prompt = post.customPrompt;
                            negativePrompt = post.customNegativePrompt || "";
                        } else {
                            const builtPrompt = buildPrompt(
                                post.productCategory,
                                post.styleVariant,
                                post.productName
                            );
                            prompt = builtPrompt.prompt;
                            negativePrompt = builtPrompt.negativePrompt;
                        }

                        // Aspect ratio mapping
                        const aspectRatioMap: Record<string, "1:1" | "9:16" | "16:9" | "4:3" | "3:4"> = {
                            "1:1": "1:1", "4:5": "3:4", "9:16": "9:16", "16:9": "16:9", "4:3": "4:3", "3:4": "3:4",
                        };
                        const aspectRatio = aspectRatioMap[post.promptFormat || "9:16"] || "9:16";

                        // Gemini ile işle
                        const result = await gemini.transformImage(base64Image, contentType, {
                            prompt,
                            negativePrompt,
                            faithfulness: post.faithfulness,
                            aspectRatio,
                        });

                        // Firebase Storage'a yükle
                        const bucket = getStorage().bucket();
                        const enhancedPath = `enhanced/${post.id}_${Date.now()}.png`;
                        const file = bucket.file(enhancedPath);

                        await file.save(Buffer.from(result.imageBase64, "base64"), {
                            metadata: { contentType: result.mimeType },
                        });

                        await file.makePublic();
                        imageUrl = `https://storage.googleapis.com/${bucket.name}/${enhancedPath}`;

                        // Enhanced URL'i kaydet
                        await queue.update(post.id, {
                            enhancedUrl: imageUrl,
                            isEnhanced: true,
                        });

                        console.log("[Scheduled Processor] Enhanced successfully");
                    } else if (!post.enhancedUrl && skipEnhancement) {
                        imageUrl = post.originalUrl;
                    }

                    // 2. skipApproval kontrolü
                    const skipApproval = post.skipApproval === true;

                    if (skipApproval) {
                        // Onaysız direkt paylaş
                        console.log("[Scheduled Processor] Posting directly (skipApproval=true)");

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

                        // Telegram bildirim (paylaşıldı)
                        if (telegram) {
                            await telegram.sendConfirmation(true, post.id, story.id);
                        }

                        console.log("[Scheduled Processor] Posted:", post.id, "->", story.id);
                    } else {
                        // Telegram onayı gerekli
                        console.log("[Scheduled Processor] Sending to Telegram for approval");

                        if (!telegram) {
                            console.warn("[Scheduled Processor] Telegram not configured, skipping approval");
                            continue;
                        }

                        // Onay mesajı gönder - post objesini ve enhanced URL'i gönder
                        // Önce post'u güncelleyelim ki caption vs. doğru olsun
                        const updatedPost = {
                            ...post,
                            enhancedUrl: imageUrl,
                            caption: post.caption || post.productName || "Sade Patisserie",
                        };

                        const messageId = await telegram.sendApprovalRequest(updatedPost, imageUrl);

                        // Durumu güncelle - telegramWebhook "awaiting_approval" bekliyor
                        await queue.update(post.id, {
                            status: "awaiting_approval",
                            approvalStatus: "awaiting",
                            approvalRequestedAt: Date.now(),
                            telegramMessageId: messageId,
                            enhancedUrl: imageUrl,
                        });

                        console.log("[Scheduled Processor] Approval request sent:", post.id);
                    }
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

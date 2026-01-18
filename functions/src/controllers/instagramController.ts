import * as functions from "firebase-functions";
import { getCors, getConfig, getInstagramService } from "../lib/serviceFactory";

const REGION = "europe-west1";

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
                    account: { id: account.id, name: account.name },
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

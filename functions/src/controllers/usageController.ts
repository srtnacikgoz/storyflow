import * as functions from "firebase-functions";
import { getCors, getUsageService } from "../lib/serviceFactory";

const REGION = "europe-west1";

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

                response.json({ success: true, stats, recent: recentUsage });
            } catch (error) {
                console.error("[getUsageStats] Error:", error);
                response.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

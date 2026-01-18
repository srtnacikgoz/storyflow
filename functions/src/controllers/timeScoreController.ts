import * as functions from "firebase-functions";
import { getCors, getTimeScoreService } from "../lib/serviceFactory";

const REGION = "europe-west1";

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

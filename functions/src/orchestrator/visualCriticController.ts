import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { VisualCriticService } from "../services/visualCriticService";
import { AILogService } from "../services/aiLogService";
import { getStorage } from "firebase-admin/storage";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

/**
 * Helper: Storage URL'den Base64 indir
 */
async function downloadImageAsBase64(storageUrl: string): Promise<{ base64: string; mimeType: string }> {
    try {
        const bucket = getStorage().bucket();
        let filePath = storageUrl;

        if (storageUrl.startsWith("gs://")) {
            const parts = storageUrl.split("/");
            filePath = parts.slice(3).join("/"); // gs://bucket/path/to/file
        } else if (storageUrl.startsWith("http")) {
            // HTTP(S) URL -> Direkt fetch
            const response = await fetch(storageUrl);
            if (!response.ok) throw new Error(`HTTP fetch failed: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            return {
                base64: buffer.toString("base64"),
                mimeType: response.headers.get("content-type") || "image/png"
            };
        }

        const [file] = await bucket.file(filePath).download();
        const [metadata] = await bucket.file(filePath).getMetadata();

        return {
            base64: file.toString("base64"),
            mimeType: metadata.contentType || "image/png"
        };
    } catch (error) {
        console.error("Image download error:", error);
        throw new Error("Image could not be downloaded from storage");
    }
}

/**
 * Görsel Analiz Endpoint'i (On-Demand) - HTTP Request
 */
export const analyzeImage = onRequest(
    {
        region: "europe-west1",
        cors: true,
        secrets: [geminiApiKey],
        timeoutSeconds: 60,
        memory: "1GiB"
    },
    async (req, res) => {
        // CORS Headers (preflight)
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }

        if (req.method !== "POST") {
            res.status(405).json({ success: false, error: "Method not allowed" });
            return;
        }

        try {
            const { imagePath, prompt, mood, product, pipelineId } = req.body;

            if (!imagePath || !prompt) {
                res.status(400).json({ success: false, error: "Missing imagePath or prompt" });
                return;
            }

            console.log(`[VisualCriticController] Analyzing image: ${imagePath}`);
            if (pipelineId) {
                console.log(`[VisualCriticController] Pipeline ID provided: ${pipelineId}, fetching context...`);
            }

            // 1. Load Image
            const { base64, mimeType } = await downloadImageAsBase64(imagePath);

            // 2. Fetch Pipeline Context (Asynchronously to avoid blocking image download, but we need it for service)
            let pipelineContext = null;
            if (pipelineId) {
                try {
                    pipelineContext = await AILogService.getPipelineContext(pipelineId);
                } catch (e) {
                    console.warn("[VisualCriticController] Failed to fetch pipeline context:", e);
                }
            }

            // 3. Initialize Service
            const service = new VisualCriticService(geminiApiKey.value());

            // 4. Call Service
            const result = await service.critiqueImage({
                imageBase64: base64,
                mimeType: mimeType,
                originalPrompt: prompt,
                intendedMood: mood || "General",
                productName: product || "Unknown Product",
                pipelineId: pipelineId,
                pipelineContext: pipelineContext // Pass context
            });

            if (!result.success || !result.data) {
                res.status(500).json({ success: false, error: result.error || "Analysis failed" });
                return;
            }

            // 5. Return Result
            res.status(200).json({ success: true, data: result.data });

        } catch (error) {
            console.error("[VisualCriticController] Error:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Analysis failed"
            });
        }
    }
);

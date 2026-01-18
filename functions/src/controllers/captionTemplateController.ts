import * as functions from "firebase-functions";
import { getCors, getCaptionTemplateService } from "../lib/serviceFactory";

const REGION = "europe-west1";

// Get Templates (filtered by category)
export const getTemplates = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                const category = request.query.category as string | undefined;
                const includeInactive = request.query.includeInactive === "true";

                const CaptionTemplateService = await getCaptionTemplateService();
                const service = new CaptionTemplateService();

                let templates;
                if (includeInactive) {
                    templates = await service.getAllAdmin();
                } else {
                    templates = await service.getAll(category as never);
                }

                response.json({
                    success: true,
                    count: templates.length,
                    templates,
                });
            } catch (error) {
                console.error("[getTemplates] Error:", error);
                response.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

// Get Template by ID
export const getTemplate = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                const id = request.query.id as string;

                if (!id) {
                    response.status(400).json({
                        success: false,
                        error: "Missing required parameter: id",
                    });
                    return;
                }

                const CaptionTemplateService = await getCaptionTemplateService();
                const service = new CaptionTemplateService();
                const template = await service.getById(id);

                if (!template) {
                    response.status(404).json({
                        success: false,
                        error: "Template not found",
                    });
                    return;
                }

                response.json({ success: true, template });
            } catch (error) {
                console.error("[getTemplate] Error:", error);
                response.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

// Create Template
export const createTemplate = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                if (request.method !== "POST") {
                    response.status(405).json({ success: false, error: "Use POST" });
                    return;
                }

                const CaptionTemplateService = await getCaptionTemplateService();
                const service = new CaptionTemplateService();

                // Validate input
                const errors = service.validateInput(request.body);
                if (errors.length > 0) {
                    response.status(400).json({
                        success: false,
                        errors,
                    });
                    return;
                }

                const template = await service.create(request.body);

                response.json({
                    success: true,
                    message: "Template created",
                    template,
                });
            } catch (error) {
                console.error("[createTemplate] Error:", error);
                response.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

// Update Template
export const updateTemplate = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                if (request.method !== "PUT" && request.method !== "POST") {
                    response.status(405).json({ success: false, error: "Use PUT or POST" });
                    return;
                }

                const id = request.query.id as string;
                if (!id) {
                    response.status(400).json({
                        success: false,
                        error: "Missing required parameter: id",
                    });
                    return;
                }

                const CaptionTemplateService = await getCaptionTemplateService();
                const service = new CaptionTemplateService();
                const template = await service.update(id, request.body);

                if (!template) {
                    response.status(404).json({
                        success: false,
                        error: "Template not found",
                    });
                    return;
                }

                response.json({
                    success: true,
                    message: "Template updated",
                    template,
                });
            } catch (error) {
                console.error("[updateTemplate] Error:", error);
                response.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

// Delete Template
export const deleteTemplate = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                if (request.method !== "DELETE" && request.method !== "POST") {
                    response.status(405).json({ success: false, error: "Use DELETE or POST" });
                    return;
                }

                const id = request.query.id as string;
                if (!id) {
                    response.status(400).json({
                        success: false,
                        error: "Missing required parameter: id",
                    });
                    return;
                }

                const CaptionTemplateService = await getCaptionTemplateService();
                const service = new CaptionTemplateService();
                const deleted = await service.delete(id);

                if (!deleted) {
                    response.status(404).json({
                        success: false,
                        error: "Template not found",
                    });
                    return;
                }

                response.json({
                    success: true,
                    message: "Template deleted",
                });
            } catch (error) {
                console.error("[deleteTemplate] Error:", error);
                response.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

// Preview Caption (render template with values)
export const previewCaption = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                if (request.method !== "POST") {
                    response.status(405).json({ success: false, error: "Use POST" });
                    return;
                }

                const { templateId, values, photoContext } = request.body;

                if (!templateId) {
                    response.status(400).json({
                        success: false,
                        error: "Missing required field: templateId",
                    });
                    return;
                }

                const CaptionTemplateService = await getCaptionTemplateService();
                const service = new CaptionTemplateService();
                const result = await service.previewCaption(
                    templateId,
                    values || {},
                    photoContext || {}
                );

                if (!result) {
                    response.status(404).json({
                        success: false,
                        error: "Template not found",
                    });
                    return;
                }

                response.json({
                    success: true,
                    preview: result,
                });
            } catch (error) {
                console.error("[previewCaption] Error:", error);
                response.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

// Seed Default Templates
export const seedTemplates = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
        const corsHandler = await getCors();
        corsHandler(request, response, async () => {
            try {
                const CaptionTemplateService = await getCaptionTemplateService();
                const service = new CaptionTemplateService();
                const count = await service.seedDefaultTemplates();

                response.json({
                    success: true,
                    message: count > 0 ? `Seeded ${count} templates` : "Templates already exist",
                    count,
                });
            } catch (error) {
                console.error("[seedTemplates] Error:", error);
                response.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    });

/**
 * Instagram Automation Cloud Functions
 * Entry point - Modularized & Refactored
 */

import "./config/firebase"; // Initialize Firebase Admin immediately

// Export Controllers
export * from "./controllers/instagramController";
export * from "./controllers/queueController";
export * from "./controllers/usageController";
export * from "./controllers/telegramController";
export * from "./controllers/healthController";
export * from "./controllers/captionTemplateController";
export * from "./controllers/timeScoreController";
export * from "./controllers/orchestratorController";

// Export Schedulers

export * from "./schedulers/scheduledPostProcessor"; // Yeni oluşturulan scheduler

/**
 * Instagram Automation Cloud Functions
 * Entry point - Modularized & Refactored
 */

import "./config/firebase"; // Initialize Firebase Admin immediately

// Export Controllers
export * from "./controllers/instagramController";
export * from "./controllers/telegramController";
export * from "./controllers/healthController";
export * from "./controllers/captionTemplateController";
export * from "./controllers/orchestratorController";
export * from "./controllers/aiLogController";
// Visual Critic - orchestratorController üzerinden export ediliyor
export * from "./controllers/styleController";
export * from "./controllers/carouselController";
export * from "./controllers/carouselFrameworkController";
export * from "./controllers/coffeeMenuController";

// Enhancement & Upscale Controllers
export {
  listEnhancementPresets,
  createEnhancementPreset,
  updateEnhancementPreset,
  deleteEnhancementPreset,
  seedEnhancementPresets,
  listEnhancementJobs,
  createEnhancementJob,
  getEnhancementJob,
  analyzePhoto,
  enhancePhoto,
  listEnhancementStyles,
  seedEnhancementStyles,
  listUpscaleOptions,
  upscaleImage,
} from "./controllers/orchestrator";

// Export Schedulers
export * from "./schedulers/scheduledPostProcessor"; // Mevcut scheduler (Paylaşım)
export * from "./schedulers/orchestratorScheduler"; // YENİ: Üretim Scheduler'ı

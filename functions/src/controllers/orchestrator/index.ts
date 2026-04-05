/**
 * Orchestrator Controllers - Export Hub
 * Tüm orchestrator controller'larını tek noktadan export eder
 */

// Asset Controller
export {
  listAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  uploadAssetToCloudinary, // Cloudinary upload endpoint
} from "./assetController";

// TimeSlot Controller
export {
  listTimeSlotRules,
  createTimeSlotRule,
  updateTimeSlotRule,
  deleteTimeSlotRule,
} from "./timeslotController";

// Theme Controller
export {
  listThemes,
  createTheme,
  updateTheme,
  deleteTheme,
  generateThemeDescription, // AI Writer
} from "./themeController";

// Scenario Controller
export {
  listScenarios,
  getScenario,
  createScenario,
  updateScenarioEndpoint,
  deleteScenarioEndpoint,
  generateScenarioDescription, // AI Writer
  generateScenePreview, // Sahne Önizleme (4 varyasyon)
} from "./scenarioController";

// Pipeline Controller
export {
  triggerOrchestratorScheduler,
  triggerOrchestratorPipeline,
  orchestratorGenerateNow,
  orchestratorResendTelegram,
  orchestratorScheduledTrigger,
  validateBeforeGenerate,
  assetTagAudit,
} from "./pipelineController";

// Slot Controller
export {
  listScheduledSlots,
  getScheduledSlot,
  listPipelineResults,
  getSlotDetail,
  deleteScheduledSlot,
  retrySlot,
  approveSlot,
  rejectSlot,
  updateSlotStatus,
  batchUpdateSlotStatus,
  updateSlotCaption,
  cancelSlotPipeline,
} from "./slotController";

// Dashboard Controller
export {
  getOrchestratorDashboardStats,
  loadDashboardData,
  getSetupStatus,
} from "./dashboardController";

// Config Controller
export {
  getVariationConfig,
  updateVariationConfig,
  getProductionHistory,
  getPetUsageStats,
  seedOrchestratorConfig,
  seedGeminiTerminology,
  getGeminiPresets,
  getTimeoutsConfig,
  updateTimeoutsConfig,
  getSystemSettingsConfig,
  updateSystemSettingsConfig,
  getFixedAssetsConfig,
  updateFixedAssetsConfig,
  // Business Context (SaaS uyumlu)
  getBusinessContextConfig,
  updateBusinessContextConfig,
  // Asset Selection Config
  getAssetSelectionConfigEndpoint,
  updateAssetSelectionConfigEndpoint,
  // Product Slot Defaults
  getProductSlotDefaultsEndpoint,
  updateProductSlotDefaultsEndpoint,
  // Hand Styles — configController'dan taşındı, standalone endpoint olarak kaldı
  // getLandingHeroConfig — configController'dan taşındı, standalone endpoint olarak kaldı
  // Prompt Studio
  getPromptStudioConfig,
  getPromptTemplateById,
  updatePromptTemplateEndpoint,
  revertPromptTemplateEndpoint,
  clearPromptStudioCacheEndpoint,
} from "./configController";

// Feedback Controller
export {
  createFeedback,
  getFeedbackBySlot,
  getFeedbackStats,
  debugFeedbackHints,
} from "./feedbackController";

// AI Rules Controller
export {
  listAIRules,
  createAIRule,
  updateAIRule,
  deleteAIRule,
  getAIRulesStats,
} from "./aiRulesController";

// Category Controller
export {
  getCategories,
  getCategoryByType,
  getSubTypeSlugs,
  getAllProductSlugs,
  getCategorySummary,
  addSubType,
  updateSubType,
  deactivateSubType,
  activateSubType,
  deleteSubType,
  reorderSubTypes,
  seedCategories,
  clearCache as clearCategoriesCache,
  getDisplayName as getCategoryDisplayName,
  // Main category endpoints
  addMainCategory,
  updateMainCategory,
  deleteMainCategory,
  // v2 ID-based endpoints
  getSubTypeById,
  getSubTypeIds,
  getSubTypeIdBySlug,
  validateSubTypeId,
  // Migration endpoints
  migrateCategoriesToIdBased,
  migrateAssetsToIdBased,
  migrateTimeSlotRulesToIdBased,
  runFullMigration,
} from "./categoryController";

// Rule Engine Controller
export {
  getRuleEngineConfigEndpoint,
  updateRuleEngineConfigEndpoint,
  listPatronRules,
  getPatronRule,
  createPatronRule,
  updatePatronRule,
  deletePatronRule,
} from "./ruleEngineController";

// Stats Controller
export {
  getQueueStats,
  getUsageStats,
} from "./statsController";

// Migration Controller (Cloudinary)
export {
  getMigrationStatus,
  runCloudinaryMigration,
  migrateSingleAsset,
  resetMigration,
} from "./migrationController";

// Composition Controller (Dinamik Slot Sistemi)
export {
  getSlotDefinitionsEndpoint,
  updateSlotDefinitionsEndpoint,
  listCompositionTemplates,
  getCompositionTemplateById,
  createCompositionTemplateEndpoint,
  updateCompositionTemplateEndpoint,
  deleteCompositionTemplateEndpoint,
} from "./compositionController";

// Ideas Controller (Fikir Defteri)
export {
  listIdeas,
  createIdea,
  updateIdea,
  deleteIdea,
} from "./ideasController";

// Model Registry Controller
export {
  seedModelRegistry,
  listTextModels,
  listImageModels,
} from "./modelRegistryController";

// Poster Smart Controller (kombinasyon kontrol + stil CRUD + görsel analiz)
export {
  checkPosterCombination,
  updatePosterStyle,
  createPosterStyle,
  deletePosterStyle,
  analyzePosterDesign,
  generatePosterPrompt,
} from "./posterSmartController";

// Poster Image Controller (Gemini doğrudan görsel üretimi)
export { generatePosterImage } from "./posterImageController";

// Poster Config Controller (seed + listeleme + galeri + feedback + öğrenme)
export {
  seedPosterConfig,
  listPosterStyles,
  listPosterMoods,
  createPosterMood,
  updatePosterMood,
  deletePosterMood,
  listPosterAspectRatios,
  listPosterTypographies,
  listPosterLayouts,
  listCameraAngles,
  listLightingTypes,
  listBackgrounds,
  listPosterGallery,
  deletePosterGalleryItem,
  submitPosterFeedback,
  getPosterGlobalRules,
  updatePosterGlobalRules,
  triggerPosterLearning,
} from "./posterConfigController";

// Enhancement Controller (Fotoğraf İyileştirme)
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
} from "./enhancementController";

// Upscale Controller (Faz 4)
export {
  listUpscaleOptions,
  upscaleImage,
} from "./upscaleController";

// Style Studio Controller v2 (Stil Stüdyosu)
export {
  listVisualStandards,
  createVisualStandard,
  updateVisualStandard,
  deleteVisualStandard,
  analyzeVisualStyle,
  analyzeProductImage,
  generateStudioPrompt,
  seedVisualStandards,
} from "./styleStudioController";

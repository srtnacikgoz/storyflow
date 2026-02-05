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
  listHandStyles,
  generateScenarioDescription, // AI Writer
} from "./scenarioController";

// Pipeline Controller
export {
  triggerOrchestratorScheduler,
  triggerOrchestratorPipeline,
  orchestratorGenerateNow,
  orchestratorResendTelegram,
  orchestratorScheduledTrigger,
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
  // Prompt Studio
  // getPromptStudioConfig,
  // getPromptTemplateById,
  // updatePromptTemplateEndpoint,
  // revertPromptTemplateEndpoint,
  // clearPromptStudioCacheEndpoint,
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

// Tag Schema Controller
export {
  listTagSchemas,
  getTagSchema,
  updateTagSchema,
  addTagOption,
  removeTagOption,
  autoTagAsset,
} from "./tagSchemaController";

// Migration Controller (Cloudinary)
export {
  getMigrationStatus,
  runCloudinaryMigration,
  migrateSingleAsset,
  resetMigration,
} from "./migrationController";

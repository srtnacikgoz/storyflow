/**
 * Orchestrator Controller - Export Hub
 *
 * Bu dosya artık sadece export hub görevi görür.
 * Tüm controller'lar ./orchestrator/ klasöründe modüler olarak tanımlanmıştır.
 *
 * Modüller:
 * - assetController.ts      → Asset CRUD
 * - timeslotController.ts   → TimeSlot Rules CRUD
 * - themeController.ts      → Theme CRUD
 * - scenarioController.ts   → Scenario CRUD + HandStyles
 * - pipelineController.ts   → Pipeline triggers & scheduler
 * - slotController.ts       → Scheduled slot operations
 * - dashboardController.ts  → Dashboard statistics
 * - configController.ts     → Variation config & seed
 * - feedbackController.ts   → Feedback operations
 * - aiRulesController.ts    → AI Rules CRUD
 */

export {
  // Visual Critic


  // Asset Controller
  listAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  uploadAssetToCloudinary, // Cloudinary upload endpoint

  // TimeSlot Controller
  listTimeSlotRules,
  createTimeSlotRule,
  updateTimeSlotRule,
  deleteTimeSlotRule,

  // Theme Controller
  listThemes,
  createTheme,
  updateTheme,
  deleteTheme,
  generateThemeDescription,

  // Scenario Controller
  listScenarios,
  getScenario,
  createScenario,
  updateScenarioEndpoint,
  deleteScenarioEndpoint,
  listHandStyles,
  generateScenarioDescription,

  // Pipeline Controller
  triggerOrchestratorScheduler,
  triggerOrchestratorPipeline,
  orchestratorGenerateNow,
  orchestratorResendTelegram,
  orchestratorScheduledTrigger,

  // Slot Controller
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

  // Dashboard Controller
  getOrchestratorDashboardStats,
  loadDashboardData,
  getSetupStatus,

  // Config Controller
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
  // Business Context
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

  // Feedback Controller
  createFeedback,
  getFeedbackBySlot,
  getFeedbackStats,
  debugFeedbackHints,

  // AI Rules Controller
  listAIRules,
  createAIRule,
  updateAIRule,
  deleteAIRule,
  getAIRulesStats,

  // Category Controller
  getCategories,
  getCategoryByType,
  getSubTypeSlugs,
  getAllProductSlugs,
  getCategorySummary,
  addSubType,
  updateSubType,
  deactivateSubType,
  activateSubType,
  reorderSubTypes,
  seedCategories,
  clearCategoriesCache,
  getCategoryDisplayName,
  // Main Category Controller (v2)
  addMainCategory,
  updateMainCategory,
  deleteMainCategory,
  // ID-based endpoints (v2)
  getSubTypeById,
  getSubTypeIds,
  getSubTypeIdBySlug,
  validateSubTypeId,
  // Migration endpoints
  migrateTimeSlotRulesToIdBased,
  runFullMigration,

  // Rule Engine Endpoints
  getRuleEngineConfigEndpoint,
  updateRuleEngineConfigEndpoint,
  listPatronRules,
  getPatronRule,
  createPatronRule,
  updatePatronRule,
  deletePatronRule,

  // Stats Controller
  getQueueStats,
  getUsageStats,

  // Migration Controller (Cloudinary)
  getMigrationStatus,
  runCloudinaryMigration,
  migrateSingleAsset,
  resetMigration,
} from "./orchestrator";

// Direct export for Visual Critic (to avoid export issues)
export { analyzeImage } from "../orchestrator/visualCriticController";

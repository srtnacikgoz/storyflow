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
 * - configController.ts     → Variation config
 * - feedbackController.ts   → Feedback operations
 * - aiRulesController.ts    → AI Rules CRUD
 */

export {
  // Asset Controller
  listAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  uploadAssetToCloudinary,

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
  generateScenarioDescription,

  // Pipeline Controller
  triggerOrchestratorScheduler,
  triggerOrchestratorPipeline,
  orchestratorGenerateNow,
  orchestratorResendTelegram,
  orchestratorScheduledTrigger,
  validateBeforeGenerate,
  assetTagAudit,

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
  cancelSlotPipeline,

  // Dashboard Controller
  getOrchestratorDashboardStats,
  loadDashboardData,
  getSetupStatus,

  // Config Controller
  getVariationConfig,
  updateVariationConfig,
  getProductionHistory,
  getPetUsageStats,
  getGeminiPresets,
  getTimeoutsConfig,
  updateTimeoutsConfig,
  getSystemSettingsConfig,
  updateSystemSettingsConfig,
  getFixedAssetsConfig,
  updateFixedAssetsConfig,
  getBusinessContextConfig,
  updateBusinessContextConfig,
  getAssetSelectionConfigEndpoint,
  updateAssetSelectionConfigEndpoint,
  getProductSlotDefaultsEndpoint,
  updateProductSlotDefaultsEndpoint,

  // Feedback Controller
  createFeedback,
  getFeedbackBySlot,
  getFeedbackStats,

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
  deleteSubType,
  reorderSubTypes,
  clearCategoriesCache,
  getCategoryDisplayName,
  addMainCategory,
  updateMainCategory,
  deleteMainCategory,
  getSubTypeById,
  getSubTypeIds,
  getSubTypeIdBySlug,
  validateSubTypeId,

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

  // Prompt Studio Controller
  getPromptStudioConfig,
  getPromptTemplateById,
  updatePromptTemplateEndpoint,
  revertPromptTemplateEndpoint,
  clearPromptStudioCacheEndpoint,

  // Composition Controller (Dinamik Slot Sistemi)
  getSlotDefinitionsEndpoint,
  updateSlotDefinitionsEndpoint,
  listCompositionTemplates,
  getCompositionTemplateById,
  createCompositionTemplateEndpoint,
  updateCompositionTemplateEndpoint,
  deleteCompositionTemplateEndpoint,

  // Seed
  seedGeminiTerminology,
} from "./orchestrator";

// Visual Critic
export { analyzeImage } from "../orchestrator/visualCriticController";

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
  // Asset Controller
  listAssets,
  createAsset,
  updateAsset,
  deleteAsset,

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

  // Scenario Controller
  listScenarios,
  getScenario,
  createScenario,
  updateScenarioEndpoint,
  deleteScenarioEndpoint,
  listHandStyles,

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
} from "./orchestrator";

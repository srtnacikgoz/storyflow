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
} from "./themeController";

// Scenario Controller
export {
  listScenarios,
  getScenario,
  createScenario,
  updateScenarioEndpoint,
  deleteScenarioEndpoint,
  listHandStyles,
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
} from "./slotController";

// Dashboard Controller
export {
  getOrchestratorDashboardStats,
} from "./dashboardController";

// Config Controller
export {
  getVariationConfig,
  updateVariationConfig,
  getProductionHistory,
  getPetUsageStats,
  seedOrchestratorConfig,
  getTimeoutsConfig,
  updateTimeoutsConfig,
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

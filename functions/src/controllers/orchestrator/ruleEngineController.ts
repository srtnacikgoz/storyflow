/**
 * Rule Engine Controller
 * Rule Engine config ve Patron Rule CRUD işlemleri
 */

import { createHttpFunction } from "./shared";
import {
    getRuleEngineConfig,
    updateRuleEngineConfig,
} from "../../services/configService";
import { RulesService } from "../../orchestrator/rulesService";

// Service instance
const rulesService = new RulesService();

// ==========================================
// CONFIG ENDPOINTS
// ==========================================

export const getRuleEngineConfigEndpoint = createHttpFunction(async (request, response) => {
  const config = await getRuleEngineConfig();
  response.json({ success: true, data: config });
});

export const updateRuleEngineConfigEndpoint = createHttpFunction(async (request, response) => {
  if (request.method !== "PUT" && request.method !== "POST") {
    response.status(405).json({ success: false, error: "Use PUT or POST" });
    return;
  }

  const updates = request.body;
  await updateRuleEngineConfig(updates);

  // Return updated config
  const config = await getRuleEngineConfig();
  response.json({ success: true, data: config });
});

// ==========================================
// PATRON RULE CRUD
// ==========================================

export const listPatronRules = createHttpFunction(async (request, response) => {
  const includeInactive = request.query.includeInactive === "true";
  const rules = await rulesService.listPatronRules(includeInactive);
  response.json({ success: true, data: rules });
});

export const getPatronRule = createHttpFunction(async (request, response) => {
  const id = request.query.id as string;
  if (!id) {
    response.status(400).json({ success: false, error: "id is required" });
    return;
  }

  const rule = await rulesService.getPatronRule(id);
  if (!rule) {
    response.status(404).json({ success: false, error: "Rule not found" });
    return;
  }

  response.json({ success: true, data: rule });
});

export const createPatronRule = createHttpFunction(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).json({ success: false, error: "Use POST" });
    return;
  }

  const ruleData = request.body;
  // Basic validation
  if (!ruleData.name || !ruleData.condition || !ruleData.action) {
    response.status(400).json({ success: false, error: "Missing required fields (name, condition, action)" });
    return;
  }

  const newRule = await rulesService.createPatronRule(ruleData);
  response.json({ success: true, data: newRule });
});

export const updatePatronRule = createHttpFunction(async (request, response) => {
  if (request.method !== "PUT" && request.method !== "POST") {
    response.status(405).json({ success: false, error: "Use PUT or POST" });
    return;
  }

  const { id, ...updates } = request.body;
  if (!id) {
    response.status(400).json({ success: false, error: "id is required" });
    return;
  }

  await rulesService.updatePatronRule(id, updates);
  const updatedRule = await rulesService.getPatronRule(id);

  response.json({ success: true, data: updatedRule });
});

export const deletePatronRule = createHttpFunction(async (request, response) => {
  if (request.method !== "DELETE" && request.method !== "POST") {
    response.status(405).json({ success: false, error: "Use DELETE or POST" });
    return;
  }

  const id = request.body.id || request.query.id;
  if (!id) {
    response.status(400).json({ success: false, error: "id is required" });
    return;
  }

  await rulesService.deletePatronRule(id as string);
  response.json({ success: true, message: "Rule deleted" });
});

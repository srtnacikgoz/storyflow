/**
 * Shared utilities for Orchestrator Controllers
 * Ortak bağımlılıklar ve yardımcı fonksiyonlar
 */

import * as functions from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { getFirestore } from "firebase-admin/firestore";
import { getCors, getConfig } from "../../lib/serviceFactory";
import { OrchestratorConfig } from "../../orchestrator/types";

// Region sabiti
export const REGION = "europe-west1";

// Firestore instance
export const db = getFirestore();

// Firebase Secret tanımı
export const claudeApiKey = defineSecret("CLAUDE_API_KEY");

// CORS handler'ı export et
export { getCors, getConfig };

// Functions modülünü export et
export { functions };

/**
 * Orchestrator config'i oluştur
 */
export async function getOrchestratorConfig(claudeKey?: string): Promise<OrchestratorConfig> {
  const config = await getConfig();

  return {
    claudeApiKey: claudeKey || claudeApiKey.value() || "",
    claudeModel: "claude-sonnet-4-20250514",
    geminiApiKey: config.gemini.apiKey,
    geminiModel: "gemini-3-pro-image-preview",
    qualityThreshold: 7,
    maxRetries: 3,
    telegramBotToken: config.telegram?.botToken || "",
    telegramChatId: config.telegram?.chatId || "",
    approvalTimeout: config.telegram?.approvalTimeout || 60,
    timezone: "Europe/Istanbul",
    scheduleBuffer: 30,
  };
}

/**
 * Standart hata response helper
 */
export function errorResponse(
  response: functions.Response,
  error: unknown,
  functionName: string,
  statusCode = 500
) {
  console.error(`[${functionName}] Error:`, error);
  response.status(statusCode).json({
    success: false,
    error: error instanceof Error ? error.message : "Unknown error",
  });
}

/**
 * Standart success response helper
 */
export function successResponse<T>(
  response: functions.Response,
  data: T,
  statusCode = 200
) {
  response.status(statusCode).json({
    success: true,
    ...data,
  });
}

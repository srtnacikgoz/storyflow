/**
 * Shared utilities for Orchestrator Controllers
 * v2 (2nd gen) + v1 (1st gen) uyumluluk katmanı
 */

import * as functions from "firebase-functions";
import { onRequest, HttpsOptions } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore } from "firebase-admin/firestore";
import { getCors, getConfig } from "../../lib/serviceFactory";
import { getSystemSettings } from "../../services/configService";
import { OrchestratorConfig } from "../../orchestrator/types";
import type { Request, Response } from "express";

// Region sabiti
export const REGION = "europe-west1";

// Firestore instance
export const db = getFirestore();

// Firebase Secret tanımları
export const reveApiKey = defineSecret("REVE_API_KEY");
export const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

// CORS handler'ı export et
export { getCors, getConfig };

// Functions modülünü export et (geriye uyumluluk için)
export { functions };

/**
 * Client-disconnect'te abort edilen AbortSignal üretir.
 *
 * Cloud Run gen 2 altında Express req'inin 'close' event'i, client
 * bağlantıyı kestiğinde (fetch abort edildiğinde) fırlar. Bu signal
 * SDK çağrılarına (Anthropic, Gemini) veya fetch'e verildiğinde,
 * client durdurunca upstream API çağrısı da gerçekten iptal edilir —
 * yani token harcanmaya devam etmez (Level 2 cancel).
 *
 * Kullanım:
 *   const signal = createAbortSignal(req);
 *   await anthropic.messages.create({...}, { signal });
 *   await fetch(url, { ..., signal });
 *   await geminiModel.generateContent(parts, { signal });
 */
export function createAbortSignal(req: Request, res?: import("express").Response): AbortSignal {
  const controller = new AbortController();
  // res.on("close") kullan — req.on("close") Cloud Run'da false positive tetikliyor
  const target = res || req;
  target.on("close", () => {
    if (!controller.signal.aborted) {
      controller.abort(new Error("Client disconnected"));
    }
  });
  return controller.signal;
}

/**
 * AbortError mı kontrol eder — SDK'lar farklı yolla fırlatır:
 * - Anthropic SDK: APIUserAbortError veya error.name === "AbortError"
 * - Gemini SDK: error.name === "AbortError"
 * - fetch: error.name === "AbortError"
 */
export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; message?: string };
  return e.name === "AbortError" || e.message === "Client disconnected" ||
    (e.message?.includes("aborted") ?? false);
}

/**
 * v2 HTTP fonksiyon oluşturucu — CORS dahil
 * 1st gen pattern'i: functions.region(REGION).https.onRequest(...)
 * 2nd gen pattern: createHttpFunction(handler) veya createHttpFunction(options, handler)
 */
export function createHttpFunction(
  handler: (req: Request, res: Response) => Promise<void>,
  options?: Partial<HttpsOptions>
) {
  return onRequest(
    {
      region: REGION,
      memory: "256MiB",
      timeoutSeconds: 60,
      cors: true,
      secrets: [geminiApiKeySecret],
      ...options,
    },
    async (req, res) => {
      try {
        await handler(req, res);
      } catch (error) {
        // Client abort edildiyse sessizce çık — zaten kimse dinlemiyor,
        // 500 cevabı yazmaya çalışmak "cannot set headers after sent" hatası verebilir.
        if (isAbortError(error)) {
          console.log("[v2 Handler] Client disconnected, request aborted");
          return;
        }
        console.error("[v2 Handler Error]:", error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }
  );
}

/**
 * Orchestrator config'i oluştur
 */
export async function getOrchestratorConfig(): Promise<OrchestratorConfig> {
  const config = await getConfig();
  const systemSettings = await getSystemSettings();

  // Reve API key'i secret'tan al (yoksa boş string)
  let reveKey = "";
  try {
    reveKey = reveApiKey.value() || "";
  } catch {
    console.log("[Config] REVE_API_KEY not configured, using Gemini for image generation");
  }

  const imageProvider: "gemini" | "reve" = reveKey ? "reve" : "gemini";

  if (!systemSettings?.imageModel) {
    throw new Error("Görsel üretim modeli Firestore'da tanımlı değil (Ayarlar > AI Model Seçimi)");
  }

  return {
    geminiApiKey: config.gemini.apiKey,
    geminiModel: systemSettings.imageModel,
    reveApiKey: reveKey || undefined,
    reveVersion: "latest",
    imageProvider,
    qualityThreshold: 7,
    maxRetries: 3,
    telegramBotToken: config.telegram?.botToken || "",
    telegramChatId: config.telegram?.chatId || "",
    approvalTimeout: config.telegram?.approvalTimeout || 60,
    timezone: "Europe/Istanbul",
    scheduleBuffer: 30,
    promptOptimizerModel: systemSettings?.promptOptimizerModel || "none",
    anthropicApiKey: systemSettings?.anthropicApiKey || undefined,
    openaiApiKey: systemSettings?.openaiApiKey || undefined,
    openaiBaseUrl: systemSettings?.openaiBaseUrl || undefined,
  };
}

/**
 * Standart hata response helper
 */
export function errorResponse(
  response: Response | functions.Response,
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
  response: Response | functions.Response,
  data: T,
  statusCode = 200
) {
  response.status(statusCode).json({
    success: true,
    ...data,
  });
}

/**
 * Environment Configuration
 *
 * Reads environment variables from:
 * 1. process.env (v2 functions, Cloud Run)
 * 2. Firebase Functions config (v1 functions - deprecated)
 *
 * V2 Migration: March 2026'ya kadar tamamlanmalı
 */

import * as functions from "firebase-functions";
import {Config, TelegramConfig} from "../types";

/**
 * Get config value from process.env or functions.config()
 * @param envKey - process.env key (e.g., "INSTAGRAM_ACCOUNT_ID")
 * @param configPath - functions.config() path (e.g., ["instagram", "account_id"])
 */
function getConfigValue(envKey: string, configPath: string[]): string | undefined {
  // Önce process.env'den dene
  if (process.env[envKey]) {
    return process.env[envKey];
  }

  // Sonra functions.config()'dan dene (v1)
  try {
    const config = functions.config();
    let value: unknown = config;
    for (const key of configPath) {
      value = (value as Record<string, unknown>)?.[key];
    }
    return value as string | undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get application configuration from Firebase Functions config
 *
 * @return {Config} Application configuration
 * @throws {Error} If required configuration is missing
 */
export function getConfig(): Config {
  const instagramAccountId = getConfigValue("INSTAGRAM_ACCOUNT_ID", ["instagram", "account_id"]);
  const instagramAccessToken = getConfigValue("INSTAGRAM_ACCESS_TOKEN", ["instagram", "access_token"]);
  const geminiApiKey = getConfigValue("GEMINI_API_KEY", ["gemini", "api_key"]);

  // Validate required configurations
  if (!instagramAccountId) {
    throw new Error("Missing required config: INSTAGRAM_ACCOUNT_ID or instagram.account_id");
  }

  if (!instagramAccessToken) {
    throw new Error("Missing required config: INSTAGRAM_ACCESS_TOKEN or instagram.access_token");
  }

  if (!geminiApiKey) {
    throw new Error("Missing required config: GEMINI_API_KEY or gemini.api_key");
  }

  // Build config object
  const appConfig: Config = {
    instagram: {
      accountId: instagramAccountId,
      accessToken: instagramAccessToken,
    },
    gemini: {
      apiKey: geminiApiKey,
    },
  };

  // Telegram config (opsiyonel)
  const telegramBotToken = getConfigValue("TELEGRAM_BOT_TOKEN", ["telegram", "bot_token"]);
  const telegramChatId = getConfigValue("TELEGRAM_CHAT_ID", ["telegram", "chat_id"]);
  const telegramApprovalTimeout = getConfigValue("TELEGRAM_APPROVAL_TIMEOUT", ["telegram", "approval_timeout"]);

  if (telegramBotToken && telegramChatId) {
    appConfig.telegram = {
      botToken: telegramBotToken,
      chatId: telegramChatId,
      approvalTimeout: parseInt(telegramApprovalTimeout || "15", 10),
    };
  }

  return appConfig;
}

/**
 * Get Telegram configuration
 * Throws if Telegram is not configured
 *
 * @return {TelegramConfig} Telegram configuration
 * @throws {Error} If Telegram configuration is missing
 */
export function getTelegramConfig(): TelegramConfig {
  const botToken = getConfigValue("TELEGRAM_BOT_TOKEN", ["telegram", "bot_token"]);
  const chatId = getConfigValue("TELEGRAM_CHAT_ID", ["telegram", "chat_id"]);
  const approvalTimeout = getConfigValue("TELEGRAM_APPROVAL_TIMEOUT", ["telegram", "approval_timeout"]);

  if (!botToken) {
    throw new Error("Missing required config: TELEGRAM_BOT_TOKEN or telegram.bot_token");
  }

  if (!chatId) {
    throw new Error("Missing required config: TELEGRAM_CHAT_ID or telegram.chat_id");
  }

  return {
    botToken,
    chatId,
    approvalTimeout: parseInt(approvalTimeout || "15", 10),
  };
}

/**
 * Check if Telegram is configured
 * @return {boolean} True if Telegram config exists
 */
export function isTelegramConfigured(): boolean {
  const botToken = getConfigValue("TELEGRAM_BOT_TOKEN", ["telegram", "bot_token"]);
  const chatId = getConfigValue("TELEGRAM_CHAT_ID", ["telegram", "chat_id"]);
  return !!(botToken && chatId);
}

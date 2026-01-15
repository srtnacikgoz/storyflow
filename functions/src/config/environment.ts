/**
 * Environment Configuration
 *
 * Reads environment variables from Firebase Functions config
 */

import * as functions from "firebase-functions";
import {Config, TelegramConfig} from "../types";

/**
 * Get application configuration from Firebase Functions config
 *
 * @return {Config} Application configuration
 * @throws {Error} If required configuration is missing
 */
export function getConfig(): Config {
  const config = functions.config();

  // Validate required configurations
  if (!config.instagram?.account_id) {
    throw new Error("Missing required config: instagram.account_id");
  }

  if (!config.instagram?.access_token) {
    throw new Error("Missing required config: instagram.access_token");
  }

  if (!config.gemini?.api_key) {
    throw new Error("Missing required config: gemini.api_key");
  }

  // Build config object
  const appConfig: Config = {
    instagram: {
      accountId: config.instagram.account_id,
      accessToken: config.instagram.access_token,
    },
    gemini: {
      apiKey: config.gemini.api_key,
    },
  };

  // Telegram config (opsiyonel)
  if (config.telegram?.bot_token && config.telegram?.chat_id) {
    appConfig.telegram = {
      botToken: config.telegram.bot_token,
      chatId: config.telegram.chat_id,
      approvalTimeout: parseInt(config.telegram?.approval_timeout || "15", 10),
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
  const config = functions.config();

  if (!config.telegram?.bot_token) {
    throw new Error("Missing required config: telegram.bot_token");
  }

  if (!config.telegram?.chat_id) {
    throw new Error("Missing required config: telegram.chat_id");
  }

  return {
    botToken: config.telegram.bot_token,
    chatId: config.telegram.chat_id,
    approvalTimeout: parseInt(config.telegram?.approval_timeout || "15", 10),
  };
}

/**
 * Check if Telegram is configured
 * @return {boolean} True if Telegram config exists
 */
export function isTelegramConfigured(): boolean {
  const config = functions.config();
  return !!(config.telegram?.bot_token && config.telegram?.chat_id);
}

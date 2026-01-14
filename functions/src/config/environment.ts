/**
 * Environment Configuration
 *
 * Reads environment variables from Firebase Functions config
 */

import * as functions from "firebase-functions";
import {Config} from "../types";

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

  return {
    instagram: {
      accountId: config.instagram.account_id,
      accessToken: config.instagram.access_token,
    },
    gemini: {
      apiKey: config.gemini.api_key,
    },
  };
}

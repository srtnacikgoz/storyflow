"use strict";
/**
 * Environment Configuration
 *
 * Reads environment variables from Firebase Functions config
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.getTelegramConfig = getTelegramConfig;
exports.isTelegramConfigured = isTelegramConfigured;
const functions = __importStar(require("firebase-functions"));
/**
 * Get application configuration from Firebase Functions config
 *
 * @return {Config} Application configuration
 * @throws {Error} If required configuration is missing
 */
function getConfig() {
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
    const appConfig = {
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
function getTelegramConfig() {
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
function isTelegramConfigured() {
    const config = functions.config();
    return !!(config.telegram?.bot_token && config.telegram?.chat_id);
}
//# sourceMappingURL=environment.js.map
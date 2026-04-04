/**
 * Config Service — Barrel Export
 * Tüm config modüllerini tek noktadan dışa aktarır.
 * Mevcut import'lar (`from "../services/configService"`) değişmeden çalışır.
 *
 * Modüller:
 * - configCache: CACHE_TTL, getDb, clearConfigCache
 * - orchestratorConfig: getGlobalConfig + tüm get fonksiyonları
 * - configUpdaters: tüm update fonksiyonları
 * - promptStudio: prompt template CRUD
 * - compositionConfig: slot definitions + composition templates
 * - handStylesConfig: el stilleri CRUD + DEFAULT_HAND_STYLES
 * - scenarioCrud: senaryo add/update/delete
 * - configSeed: seed + init fonksiyonları
 */

export { CACHE_TTL, clearConfigCache } from "./config/configCache";
export * from "./config/orchestratorConfig";
export * from "./config/configUpdaters";
export * from "./config/promptStudio";
export * from "./config/compositionConfig";
export * from "./config/handStylesConfig";
export * from "./config/scenarioCrud";
export * from "./config/configSeed";

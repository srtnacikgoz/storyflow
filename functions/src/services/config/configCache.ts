/**
 * Config Cache — Ortak cache yardımcıları
 * Tüm config modülleri bu dosyadan CACHE_TTL, getDb ve clearConfigCache kullanır.
 */

import * as admin from "firebase-admin";

// Cache süresi (5 dakika)
export const CACHE_TTL = 5 * 60 * 1000;

// Firestore referansı
export function getDb() {
  return admin.firestore();
}

// Registry: her modül kendi cache temizleme fonksiyonunu kaydeder
const clearFunctions: (() => void)[] = [];

export function registerCacheClear(fn: () => void): void {
  clearFunctions.push(fn);
}

/**
 * Tüm config cache'lerini temizler
 * Her modül registerCacheClear ile kendi temizleme fonksiyonunu kaydeder
 */
export function clearConfigCache(): void {
  clearFunctions.forEach((fn) => fn());
  console.log("[ConfigService] All caches cleared");
}

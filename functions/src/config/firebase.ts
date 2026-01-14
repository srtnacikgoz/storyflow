/**
 * Firebase Admin SDK Configuration
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export Firestore database instance
export const db = admin.firestore();

// Storage: Lazy loading kullanılıyor - startup timeout önlemi
// processQueue.ts'de getStorage() ile kullanılır
// export const storage = admin.storage(); -- KULLANILMIYOR

// Export Firebase Admin namespace
export {admin};

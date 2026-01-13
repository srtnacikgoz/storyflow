/**
 * Firebase Admin SDK Configuration
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export Firestore database instance
export const db = admin.firestore();

// Export Firebase Storage instance
export const storage = admin.storage();

// Export Firebase Admin namespace
export {admin};

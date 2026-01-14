import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// Firebase configuration
// Bu değerler Firebase Console > Project Settings > Your apps > Web app'tan alınır
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemo", // Geçici
  authDomain: "instagram-automation-ad77b.firebaseapp.com",
  projectId: "instagram-automation-ad77b",
  storageBucket: "instagram-automation-ad77b.firebasestorage.app",
  messagingSenderId: "523576970272",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Storage
export const storage = getStorage(app);

export default app;

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminAuth: any = null;

export function getAdminAuth() {
  if (adminAuth) return adminAuth;

  // Expect the service account JSON string in env var FIREBASE_SERVICE_ACCOUNT
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    console.warn("FIREBASE_SERVICE_ACCOUNT env var not set - Firebase admin auth disabled");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);

    if (!getApps().length) {
      initializeApp({
        credential: cert(serviceAccount),
        // Optional: databaseURL, storageBucket, etc.
      });
    }

    adminAuth = getAuth();
    return adminAuth;
  } catch (error) {
    console.error("Failed to initialize Firebase admin:", error);
    return null;
  }
}

export { adminAuth };


// Initialize Firebase client SDK (Vite project – uses VITE_ prefix)
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Prevent re-initialization on HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Kick off Google sign-in via redirect (avoids COOP popup issues).
 * The page will navigate away – call `handleGoogleRedirectResult` on mount
 * to pick up the result when the user lands back.
 */
export async function signInWithGoogle(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}

/**
 * Call this once on app mount (e.g. in sign-in route's useEffect).
 * Returns the ID token if we just came back from a Google redirect, or null otherwise.
 */
export async function handleGoogleRedirectResult(): Promise<string | null> {
  const result = await getRedirectResult(auth);
  if (!result) return null;
  return result.user.getIdToken();
}

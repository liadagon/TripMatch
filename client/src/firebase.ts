import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserSessionPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
  signOut,
  type Auth,
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

const requiredConfigKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "appId",
] as const;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let sessionPersistencePromise: Promise<void> | null = null;

function getMissingConfigKeys() {
  return requiredConfigKeys.filter((key) => !firebaseConfig[key]);
}

function getFirebaseApp() {
  const missingKeys = getMissingConfigKeys();

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Firebase config values: ${missingKeys.join(", ")}. Add them to your Vite .env file.`,
    );
  }

  if (!app) {
    app = initializeApp(firebaseConfig);
  }

  return app;
}

export function getFirebaseAuth() {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }

  return auth;
}

export function ensureFirebaseSessionPersistence() {
  if (!sessionPersistencePromise) {
    sessionPersistencePromise = setPersistence(
      getFirebaseAuth(),
      browserSessionPersistence,
    ).catch((error) => {
      sessionPersistencePromise = null;
      throw error;
    });
  }

  return sessionPersistencePromise;
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function signInWithGoogle() {
  let user;

  try {
    await ensureFirebaseSessionPersistence();
    const result = await signInWithPopup(getFirebaseAuth(), googleProvider);
    user = result.user;
  } catch (error) {
    console.error("[Google auth] Popup sign-in failed", {
      code: getErrorCode(error),
      message: getErrorMessage(error),
    });
    throw error;
  }

  try {
    const idToken = await user.getIdToken();
    return { idToken };
  } catch (error) {
    console.error("[Google auth] Firebase ID token creation failed", {
      code: getErrorCode(error),
      message: getErrorMessage(error),
    });
    throw error;
  }
}

export async function signOutFromFirebase() {
  await signOut(getFirebaseAuth());
}

function getErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
export function getGoogleAuthErrorMessage(error: unknown) {
  const code = getErrorCode(error) ?? "";

  const message = error instanceof Error ? error.message : "";
  const suffix = code ? `\n\nקוד שגיאה: ${code}` : "";

  if (message.includes("Missing Firebase config values")) {
    return "חסר קובץ .env עם הגדרות Firebase. צריך למלא את ערכי VITE_FIREBASE_* ולהפעיל מחדש את שרת הפיתוח.";
  }

  if (code === "auth/configuration-not-found") {
    return `צריך להפעיל Firebase Authentication בפרויקט הזה, ואז להפעיל את Google כספק התחברות.${suffix}`;
  }

  if (code === "auth/operation-not-allowed") {
    return `Google Sign-In לא מופעל ב-Firebase Authentication. צריך להפעיל את Google כספק התחברות.${suffix}`;
  }

  if (code === "auth/unauthorized-domain") {
    return `הדומיין localhost לא מורשה ב-Firebase Authentication. צריך להוסיף את localhost ל-Authorized domains.${suffix}`;
  }

  if (code === "auth/invalid-api-key") {
    return `מפתח Firebase API לא תקין. צריך לבדוק שהערכים ב-.env הועתקו בדיוק מה-Firebase web app config.${suffix}`;
  }

  if (code === "auth/network-request-failed") {
    return `הדפדפן לא הצליח להגיע ל-Firebase. בדקי חיבור אינטרנט, חסימת רשת או תוסף שחוסם בקשות.${suffix}`;
  }

  if (code === "auth/popup-blocked") {
    return `הדפדפן חסם את חלון ההתחברות של Google. צריך לאפשר popups לאתר הזה.${suffix}`;
  }

  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return `חלון ההתחברות נסגר לפני השלמת התהליך.${suffix}`;
  }

  return `לא הצלחנו להתחבר עם Google. בדקי את הגדרות Firebase ונסי שוב.${suffix}`;
}

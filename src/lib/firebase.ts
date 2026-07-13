import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

// Firebase config is provided via environment variables (see .env.example).
// It is never committed to the repository — set these in your local .env
// file and in the deploy environment (e.g. GitHub Actions secrets).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || undefined,
};

const isPlaceholderConfig = !firebaseConfig.apiKey || !firebaseConfig.projectId;

let app = null;
let initializedAuth = null;
let initializedDb = null;

if (!isPlaceholderConfig) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

if (app) {
  try {
    initializedAuth = getAuth(app);
  } catch (error) {
    console.error("Firebase Auth initialization failed:", error);
  }
}

if (app) {
  try {
    initializedDb = getFirestore(app, firebaseConfig.firestoreDatabaseId as string);
  } catch (error) {
    console.error("Firebase Firestore initialization failed:", error);
  }
}

const fallbackAuth = {
  currentUser: null,
  onAuthStateChanged: (callback: (user: null) => void) => {
    callback(null);
    return () => undefined;
  },
  signOut: async () => {},
  languageCode: undefined,
} as any;

const fallbackDb = {} as any;

export const auth = initializedAuth ?? fallbackAuth;
export const db = initializedDb ?? fallbackDb;

// Validate Connection to Firestore on boot
async function testConnection() {
  if (isPlaceholderConfig) {
    console.info("Firebase is not configured. Copy .env.example to .env and set your Firebase project credentials.");
    return;
  }

  if (!initializedDb || !initializedAuth) {
    console.warn("Firebase is not fully initialized. Skipping Firestore connection test.");
    return;
  }

  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration. Client is offline.");
    }
  }
}

testConnection();

// Structured Error Handler for Firestore permission failures
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error Detailed Object: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

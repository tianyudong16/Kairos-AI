import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  type User,
} from 'firebase/auth';
import {
  doc,
  Firestore,
  getDoc,
  getFirestore,
} from 'firebase/firestore';

type PublicFirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

function readConfig(): PublicFirebaseConfig | null {
  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<
    string,
    string | undefined
  >;
  const apiKey = env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim() || '';
  const authDomain = env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || '';
  const projectId =
    env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() || 'kairos-ai-13e53';
  const appId = env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim() || '';
  if (!apiKey || !authDomain || !appId) return null;
  return { apiKey, authDomain, projectId, appId };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function isFirebaseConfigured() {
  return Boolean(readConfig());
}

export function getFirebaseApp() {
  if (app) return app;
  const config = readConfig();
  if (!config) {
    throw new Error(
      'Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, and EXPO_PUBLIC_FIREBASE_APP_ID to `.env` (Project settings → Your apps → Web app).'
    );
  }
  app = getApps().length ? getApp() : initializeApp(config);
  return app;
}

export function getFirebaseAuth() {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  return auth;
}

export function getFirestoreDb() {
  if (db) return db;
  db = getFirestore(getFirebaseApp());
  return db;
}

/** Sign in (or create) a Firebase Auth user for this Kairos account. */
export async function ensureFirebaseUser(email: string, password: string): Promise<User> {
  const firebaseAuth = getFirebaseAuth();
  const trimmed = email.trim().toLowerCase();
  try {
    const cred = await signInWithEmailAndPassword(firebaseAuth, trimmed, password);
    return cred.user;
  } catch (err: any) {
    const code = err?.code as string | undefined;
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      try {
        const created = await createUserWithEmailAndPassword(
          firebaseAuth,
          trimmed,
          password
        );
        return created.user;
      } catch (createErr: any) {
        if (createErr?.code === 'auth/email-already-in-use') {
          const again = await signInWithEmailAndPassword(
            firebaseAuth,
            trimmed,
            password
          );
          return again.user;
        }
        throw createErr;
      }
    }
    throw err;
  }
}

export async function readGoogleConnectionDoc(uid: string) {
  const snap = await getDoc(
    doc(getFirestoreDb(), 'users', uid, 'calendarConnections', 'google')
  );
  if (!snap.exists()) return null;
  return snap.data() as Record<string, unknown>;
}

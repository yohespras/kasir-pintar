import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
// CRITICAL: Initialize Firestore with the exact database ID provisioned for this project
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Error translation helper for Firebase Auth
export function formatFirebaseAuthError(error: any): string {
  if (!error) return 'Terjadi kesalahan autentikasi.';
  const code = error.code || '';
  if (code === 'auth/popup-blocked') {
    return 'Jendela popup Google diblokir oleh browser. Harap izinkan popup di pengaturan browser Anda.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Jendela masuk Google ditutup sebelum selesai. Silakan coba lagi.';
  }
  if (code === 'auth/unauthorized-domain') {
    return `Domain ini belum terdaftar di Firebase Authorized Domains. Anda tetap dapat masuk menggunakan PIN / Akun Kasir secara offline.`;
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'Permintaan popup sebelumnya dibatalkan. Silakan klik sekali lagi.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Koneksi jaringan terputus. Menggunakan mode offline.';
  }
  return error.message || 'Gagal masuk dengan Google.';
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notification:', JSON.stringify(errInfo));
  return errInfo;
}

// Test Firestore connection on startup
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client offline, local cache is active.');
    }
  }
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses Google dari Firebase');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

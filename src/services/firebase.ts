import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  setDoc,
  getDocFromServer,
  onSnapshot,
  SnapshotMetadata
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { AppState, isPaymentMode, Profile, PaymentMode } from "../types";

// Mode emulator untuk pengembangan lokal (`npm run dev:emulator`). Hanya aktif di `vite dev`
// (import.meta.env.DEV), jadi build produksi tidak pernah bisa terhubung ke emulator.
// Memakai proyek demo dan database default supaya tidak menyentuh proyek Firebase sungguhan.
const USE_EMULATOR = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";

// Initialize Firebase App
const app = initializeApp(USE_EMULATOR ? { ...firebaseConfig, projectId: "demo-growbang" } : firebaseConfig);

// CRITICAL: The app will break without this line
export const db = getFirestore(app, USE_EMULATOR ? "(default)" : firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

if (USE_EMULATOR) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Firestore Error Handling Specification from SKILL.md
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write"
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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// CRITICAL CONSTRAINT: Test connection on app boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firebase is offline. App will use local storage mode.");
    }
    return false;
  }
}

// Authentication Actions
export async function syncUserProfileDoc(user: User, customDisplayName?: string): Promise<void> {
  try {
    const userRef = doc(db, "users", user.uid);
    const resolvedName = customDisplayName || user.displayName || "";
    await setDoc(
      userRef,
      {
        id: user.uid,
        email: user.email || "",
        displayName: resolvedName,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Failed to sync user profile document:", error);
  }
}

export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      await syncUserProfileDoc(result.user);
    }
    return result.user;
  } catch (error: any) {
    console.warn("Google Sign-In note:", error?.code || error?.message);
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    if (result.user) {
      await syncUserProfileDoc(result.user);
    }
    return result.user;
  } catch (error: any) {
    console.warn("Email Sign-In note:", error?.code || error?.message);
    throw error;
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (result.user) {
      if (displayName.trim()) {
        await updateProfile(result.user, { displayName: displayName.trim() });
      }
      await syncUserProfileDoc(result.user, displayName.trim());
    }
    return result.user;
  } catch (error: any) {
    console.warn("Email Sign-Up note:", error?.code || error?.message);
    throw error;
  }
}

export async function logoutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.warn("Sign-Out note:", error?.code || error?.message);
    throw error;
  }
}

export function formatAuthErrorMessage(error: any): string {
  const code = error?.code || "";
  switch (code) {
    case "auth/email-already-in-use":
      return "Email ini sudah terdaftar. Pilih tab Masuk, lalu isi kata sandi Anda.";
    case "auth/invalid-email":
      return "Format alamat email tidak valid. Periksa kembali penulisan email Anda.";
    case "auth/weak-password":
      return "Kata sandi terlalu pendek. Masukkan minimal 6 karakter demi keamanan akun.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/user-not-found":
      return "Email atau kata sandi belum cocok. Belum punya akun? Pilih tab Daftar.";
    case "auth/popup-closed-by-user":
      return "Jendela masuk Google ditutup sebelum selesai.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan gagal. Tunggu sebentar, lalu coba lagi.";
    case "auth/network-request-failed":
      return "Koneksi internet bermasalah. Periksa jaringan Anda dan coba lagi.";
    default:
      console.warn("[auth]", error);
      return "Proses masuk belum berhasil. Coba lagi.";
  }
}

export function onAuthUserChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Cloud Synchronization for Immunization App State
export async function saveStateToCloud(userId: string, state: AppState): Promise<void> {
  const path = `users/${userId}/appData/current`;
  try {
    const docRef = doc(db, "users", userId, "appData", "current");
    const payload: {
      ownerId: string;
      schemaVersion: number;
      profiles: Profile[];
      updatedAt: string;
      activeProfileId?: string;
      paymentMode?: PaymentMode;
    } = {
      ownerId: userId,
      schemaVersion: Number(state.schemaVersion) || 1,
      profiles: state.profiles,
      updatedAt: new Date().toISOString()
    };
    if (typeof state.activeProfileId === 'string' && state.activeProfileId.length > 0) {
      payload.activeProfileId = state.activeProfileId;
    }
    if (isPaymentMode(state.paymentMode)) {
      payload.paymentMode = state.paymentMode;
    }
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadStateFromCloud(userId: string): Promise<AppState | null> {
  const path = `users/${userId}/appData/current`;
  try {
    const docRef = doc(db, "users", userId, "appData", "current");
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      const paymentMode = isPaymentMode(data.paymentMode) ? data.paymentMode : undefined;
      if (Array.isArray(data.profiles) && data.profiles.length > 0) {
        return {
          schemaVersion: data.schemaVersion || 1,
          profiles: data.profiles,
          activeProfileId: data.activeProfileId || data.profiles[0].id,
          paymentMode
        };
      } else if (paymentMode) {
        return {
          schemaVersion: data.schemaVersion || 1,
          profiles: [],
          activeProfileId: "",
          paymentMode
        };
      }
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeToCloudState(
  userId: string,
  onData: (state: AppState | null, metadata: SnapshotMetadata) => void,
  onError?: (err: Error) => void
) {
  const path = `users/${userId}/appData/current`;
  const docRef = doc(db, "users", userId, "appData", "current");

  return onSnapshot(
    docRef,
    (snapshot) => {
      const metadata = snapshot.metadata;
      if (snapshot.exists()) {
        const data = snapshot.data();
        const paymentMode = isPaymentMode(data.paymentMode) ? data.paymentMode : undefined;
        if (Array.isArray(data.profiles) && data.profiles.length > 0) {
          onData({
            schemaVersion: data.schemaVersion || 1,
            profiles: data.profiles,
            activeProfileId: data.activeProfileId || data.profiles[0].id,
            paymentMode
          }, metadata);
          return;
        } else if (paymentMode) {
          onData({
            schemaVersion: data.schemaVersion || 1,
            profiles: [],
            activeProfileId: "",
            paymentMode
          }, metadata);
          return;
        }
      }
      onData(null, metadata);
    },
    (error) => {
      if (onError) {
        try {
          handleFirestoreError(error, OperationType.GET, path);
        } catch (e: any) {
          onError(e);
        }
      } else {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  );
}

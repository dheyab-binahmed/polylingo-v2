import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
} from "firebase/auth";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredConfigKeys = ["apiKey", "authDomain", "projectId", "appId"];
const missingConfigKeys = requiredConfigKeys.filter((key) => !firebaseConfig[key]);
if (missingConfigKeys.length > 0) {
  console.warn(
    `Firebase config is missing: ${missingConfigKeys.join(", ")}. Check VITE_FIREBASE_* env vars.`,
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Configure Google auth provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("profile");
googleProvider.addScope("email");

function serializeFirebaseUser(user) {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || "User",
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
  };
}

async function buildFirebaseSession(user, forceRefresh = false) {
  const idToken = await user.getIdToken(forceRefresh);
  return {
    idToken,
    user: serializeFirebaseUser(user),
  };
}

export const signInWithEmail = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return buildFirebaseSession(result.user);
};

export const createEmailAccount = async ({
  email,
  password,
  displayName,
}) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(result.user, { displayName });
    await result.user.reload();
  }
  await sendEmailVerification(result.user).catch((error) => {
    console.warn("Could not send Firebase verification email:", error);
  });
  return buildFirebaseSession(result.user, true);
};

/**
 * Open a Google sign-in popup and return { idToken, user } on success.
 */
export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return buildFirebaseSession(result.user);
};

/**
 * Call on app load to pick up the result of a Google redirect sign-in.
 * Returns: { idToken, user } or null if no redirect was pending.
 */
export const getGoogleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    return buildFirebaseSession(result.user);
  } catch (error) {
    console.error("Google redirect result error:", error);
    throw error;
  }
};

/**
 * Sign out from Firebase
 */
export const firebaseSignOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
};

/**
 * Listen to auth state changes
 * Useful for session restoration
 */
export const onFirebaseAuthStateChanged = (callback) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      callback(await buildFirebaseSession(firebaseUser));
    } else {
      callback(null);
    }
  });
};

export const getCurrentFirebaseSession = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        unsubscribe();
        if (!firebaseUser) {
          resolve(null);
          return;
        }
        try {
          resolve(await buildFirebaseSession(firebaseUser));
        } catch (error) {
          reject(error);
        }
      },
      reject,
    );
  });
};

export const sendFirebasePasswordReset = (email) => {
  return sendPasswordResetEmail(auth, email);
};

export const verifyFirebasePasswordResetCode = (code) => {
  return verifyPasswordResetCode(auth, code);
};

export const confirmFirebasePasswordReset = (code, newPassword) => {
  return confirmPasswordReset(auth, code, newPassword);
};

export const applyFirebaseActionCode = (code) => {
  return applyActionCode(auth, code);
};

export default app;

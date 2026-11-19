import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  authBusy: boolean;
  authError: string | null;
  authNotice: string | null;
  isVerifiedIdentity: boolean;
  signInWithGoogle: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
  clearAuthMessages: () => void;
  clearAuthError: () => void;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

function checkVerifiedIdentity(user: User | null): boolean {
  if (!user) return false;
  return Boolean(user.emailVerified || user.email);
}

function formatAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const rawMessage = error instanceof Error ? error.message : String(error);

  switch (code) {
    case 'auth/unauthorized-domain':
      return 'This app domain is not added in Firebase Console -> Authentication -> Settings -> Authorized domains yet.';
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Please wait a few minutes before trying again.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site and tap Sign In with Gmail again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Gmail sign-in popup was closed before completing. Tap Continue with Gmail to try again.';
    case 'auth/operation-not-allowed':
      return 'Google Sign-In is not enabled in Firebase Console -> Authentication -> Sign-in method.';
    default:
      return rawMessage || 'Gmail authentication failed. Please try again.';
  }
}

async function syncUserProfile(user: User) {
  const path = `users/${user.uid}/profile/info`;
  const ref = doc(db, 'users', user.uid, 'profile', 'info');

  const fallbackName =
    user.displayName || user.email?.split('@')[0] || 'Nepal Patro User';
  const displayName = fallbackName.slice(0, 100);
  const email = (user.email || '').slice(0, 254);
  const photoURL = (user.photoURL || '').slice(0, 512);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        displayName,
        email,
        phoneNumber: '',
        photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName,
        email,
        photoURL,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const isVerifiedIdentity = checkVerifiedIdentity(user);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (checkVerifiedIdentity(nextUser) && nextUser) {
        void syncUserProfile(nextUser).catch((err) => {
          console.error(err);
        });
      }
    });
    return unsub;
  }, []);

  const clearAuthMessages = useCallback(() => {
    setAuthError(null);
    setAuthNotice(null);
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (checkVerifiedIdentity(cred.user)) {
        setAuthNotice('Signed in securely with your Gmail account.');
        return true;
      }
      return false;
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setAuthError(formatAuthError(error));
      }
      return false;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      await signOut(auth);
    } catch (error) {
      setAuthError(formatAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  }, []);

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authReady,
        authBusy,
        authError,
        authNotice,
        isVerifiedIdentity,
        signInWithGoogle,
        signOutUser,
        clearAuthMessages,
        clearAuthError,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase(): FirebaseContextValue {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used inside FirebaseProvider');
  }
  return ctx;
}

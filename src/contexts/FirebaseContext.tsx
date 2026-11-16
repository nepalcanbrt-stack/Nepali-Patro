import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ConfirmationResult,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  RecaptchaVerifier,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
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
  needsEmailVerification: boolean;
  phoneOtpSent: boolean;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<boolean>;
  resendVerificationEmail: () => Promise<void>;
  refreshUserSession: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  sendPhoneOtp: (phoneE164: string, recaptchaContainerId: string) => Promise<boolean>;
  verifyPhoneOtp: (code: string) => Promise<boolean>;
  resetPhoneOtp: () => void;
  signOutUser: () => Promise<void>;
  clearAuthMessages: () => void;
  clearAuthError: () => void;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

function checkVerifiedIdentity(user: User | null): boolean {
  if (!user) return false;
  const hasVerifiedEmail = Boolean(user.emailVerified);
  const hasVerifiedPhone = Boolean(user.phoneNumber && user.phoneNumber.trim().length >= 7);
  return hasVerifiedEmail || hasVerifiedPhone;
}

function formatAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const rawMessage = error instanceof Error ? error.message : String(error);

  switch (code) {
    case 'auth/operation-not-allowed':
      return 'This sign-in provider is not enabled yet in Firebase Console -> Authentication -> Sign-in method. Please enable Email/Password or Phone Sign-In there, or use Google (Gmail) Sign-In right now.';
    case 'auth/unauthorized-domain':
      return 'This app domain is not added in Firebase Console -> Authentication -> Settings -> Authorized domains yet.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid Gmail or email address.';
    case 'auth/invalid-phone-number':
      return 'Please enter a valid mobile number with country code (for example +97798XXXXXXXX).';
    case 'auth/invalid-verification-code':
      return 'Invalid 6-digit SMS verification code. Please check the code and try again.';
    case 'auth/code-expired':
      return 'The verification code expired. Please request a new SMS OTP.';
    case 'auth/too-many-requests':
      return 'Too many verification attempts. Please wait a few minutes before trying again.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked. Allow popups in your browser or sign in using Email & Password or Mobile OTP.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in popup was closed before completing. Tap Continue with Google (Gmail) to try again.';
    case 'auth/captcha-check-failed':
      return 'Security verification failed. Please retry phone verification.';
    default:
      return rawMessage || 'Authentication failed. Please try again.';
  }
}

async function syncUserProfile(user: User) {
  const path = `users/${user.uid}/profile/info`;
  const ref = doc(db, 'users', user.uid, 'profile', 'info');

  const fallbackName =
    user.displayName ||
    user.email?.split('@')[0] ||
    (user.phoneNumber ? `Patro ${user.phoneNumber.slice(-4)}` : 'Nepal Patro User');
  const displayName = fallbackName.slice(0, 100);
  const email = (user.email || '').slice(0, 254);
  const phoneNumber = (user.phoneNumber || '').slice(0, 24);
  const photoURL = (user.photoURL || '').slice(0, 512);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        displayName,
        email,
        phoneNumber,
        photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName,
        email,
        phoneNumber,
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
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [, setSessionTick] = useState(0);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const isVerifiedIdentity = checkVerifiedIdentity(user);
  const needsEmailVerification = Boolean(user && !isVerifiedIdentity && user.email);

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

  useEffect(() => {
    return () => {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
    };
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
        setAuthNotice('Signed in securely with Google.');
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

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!cred.user.emailVerified) {
        setAuthNotice('Account found, but your email is not verified yet. Please check your inbox and click the verification link, then tap "I Have Verified".');
        return false;
      }
      setAuthNotice('Signed in securely.');
      return true;
    } catch (error) {
      setAuthError(formatAuthError(error));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      setAuthBusy(true);
      setAuthError(null);
      setAuthNotice(null);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim().slice(0, 100) });
        }
        await sendEmailVerification(cred.user);
        setAuthNotice(
          `Verification link sent to ${email.trim()}. Verify your inbox to activate private cloud sync.`
        );
        return true;
      } catch (error) {
        setAuthError(formatAuthError(error));
        return false;
      } finally {
        setAuthBusy(false);
      }
    },
    []
  );

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) return;
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      await sendEmailVerification(auth.currentUser);
      setAuthNotice(`Verification email re-sent to ${auth.currentUser.email}.`);
    } catch (error) {
      setAuthError(formatAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const refreshUserSession = useCallback(async () => {
    if (!auth.currentUser) return;
    setAuthBusy(true);
    setAuthError(null);
    try {
      await reload(auth.currentUser);
      const refreshed = auth.currentUser;
      setUser(refreshed);
      setSessionTick((t) => t + 1);
      if (refreshed && checkVerifiedIdentity(refreshed)) {
        await syncUserProfile(refreshed);
        setAuthNotice('Email verified! Private cloud sync is now active.');
      } else {
        setAuthError('Email is still unverified. Click the link in your inbox and try again.');
      }
    } catch (error) {
      setAuthError(formatAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setAuthNotice(`Password reset link sent to ${email.trim()}.`);
      return true;
    } catch (error) {
      setAuthError(formatAuthError(error));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const sendPhoneOtp = useCallback(
    async (phoneE164: string, recaptchaContainerId: string) => {
      setAuthBusy(true);
      setAuthError(null);
      setAuthNotice(null);
      try {
        if (recaptchaRef.current) {
          recaptchaRef.current.clear();
          recaptchaRef.current = null;
        }
        const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
          size: 'invisible',
        });
        recaptchaRef.current = verifier;
        const confirmation = await signInWithPhoneNumber(auth, phoneE164.trim(), verifier);
        confirmationRef.current = confirmation;
        setPhoneOtpSent(true);
        setAuthNotice(`6-digit SMS code sent to ${phoneE164.trim()}.`);
        return true;
      } catch (error) {
        if (recaptchaRef.current) {
          recaptchaRef.current.clear();
          recaptchaRef.current = null;
        }
        setPhoneOtpSent(false);
        setAuthError(formatAuthError(error));
        return false;
      } finally {
        setAuthBusy(false);
      }
    },
    []
  );

  const verifyPhoneOtp = useCallback(async (code: string) => {
    if (!confirmationRef.current) {
      setAuthError('Please request an SMS verification code first.');
      return false;
    }
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      await confirmationRef.current.confirm(code.trim());
      confirmationRef.current = null;
      setPhoneOtpSent(false);
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
      setAuthNotice('Mobile number verified. Signed in securely.');
      return true;
    } catch (error) {
      setAuthError(formatAuthError(error));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const resetPhoneOtp = useCallback(() => {
    confirmationRef.current = null;
    setPhoneOtpSent(false);
    setAuthError(null);
    setAuthNotice(null);
    if (recaptchaRef.current) {
      recaptchaRef.current.clear();
      recaptchaRef.current = null;
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    confirmationRef.current = null;
    setPhoneOtpSent(false);
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
        needsEmailVerification,
        phoneOtpSent,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resendVerificationEmail,
        refreshUserSession,
        sendPasswordReset,
        sendPhoneOtp,
        verifyPhoneOtp,
        resetPhoneOtp,
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

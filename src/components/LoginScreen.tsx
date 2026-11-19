import { motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Lock,
  LogOut,
  ShieldCheck,
  Unlock,
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';
import { useFirebase } from '../contexts/FirebaseContext';
import { IconThemeId } from '../types/theme';
import { PatroThemedIcon } from './NepaliIcons';

interface LoginScreenProps {
  iconTheme: IconThemeId;
  privateLockEnabled: boolean;
  onTogglePrivateLock: (enabled: boolean) => void;
  onDone: () => void;
}

export function LoginScreen({
  iconTheme,
  privateLockEnabled,
  onTogglePrivateLock,
  onDone,
}: LoginScreenProps) {
  const {
    user,
    authBusy,
    authError,
    authNotice,
    isVerifiedIdentity,
    signInWithGoogle,
    signOutUser,
    clearAuthMessages,
  } = useFirebase();

  const consoleSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;
  const isAuthorizedDomainError = Boolean(authError && authError.includes('Authorized domains'));

  const handleGoogleSignIn = async () => {
    const ok = await signInWithGoogle();
    if (ok) onDone();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-2xl space-y-5 pb-10"
    >
      {/* Top Back Bar (hidden only when Private Lock is active and user is not verified yet) */}
      {!(privateLockEnabled && !isVerifiedIdentity) && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDone}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-accent)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Patro
          </button>
          <span className="text-xs font-semibold text-[var(--accent-secondary)] flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            Single-System Gmail Auth
          </span>
        </div>
      )}

      {/* Main Private Gmail Login / Account Card */}
      <section
        style={{ boxShadow: 'var(--card-shadow)' }}
        className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden"
      >
        {/* Header Gradient Strip */}
        <div
          style={{
            backgroundImage: 'linear-gradient(135deg, var(--hero-from), var(--hero-via), var(--hero-to))',
          }}
          className="px-6 py-6 text-white"
        >
          <div className="flex items-center gap-3.5">
            <img
              src="./pwa-192x192.png"
              alt="Nepal Patro icon"
              referrerPolicy="no-referrer"
              className="h-12 w-12 rounded-2xl object-cover shadow-md border border-[#FDE68A]/50 shrink-0"
            />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                नेपाल पात्रो · Gmail Account Sync
              </p>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">
                {isVerifiedIdentity ? 'Gmail Account Connected' : 'Sign In with Gmail'}
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-white/85 mt-3 leading-relaxed">
            One-tap sign-in with your Gmail account. Your personal notes, Rashifal preference, and themes stay securely synced to your private account.
          </p>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Status / Error / Notice Banners */}
          {authError && (
            <div className="p-3.5 rounded-2xl bg-[var(--holiday-soft-bg)] border border-[var(--holiday-border)] text-xs font-medium text-[var(--holiday-soft-text)] space-y-3">
              <div className="flex items-start justify-between gap-3">
                <span className="leading-relaxed">{authError}</span>
                <button
                  type="button"
                  onClick={clearAuthMessages}
                  className="font-bold underline shrink-0 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              {isAuthorizedDomainError && (
                <a
                  href={consoleSettingsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--holiday-border)] text-xs font-bold text-[var(--holiday-soft-text)] hover:border-[var(--accent-primary)] whitespace-nowrap shrink-0 transition-colors"
                >
                  Open Firebase Console (Authorized domains)
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

          {authNotice && (
            <div className="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] dark:bg-emerald-950/50 dark:border-emerald-700/60 text-xs font-semibold text-[#065F46] dark:text-emerald-200 flex items-start justify-between gap-3">
              <span className="leading-relaxed">{authNotice}</span>
              <button
                type="button"
                onClick={clearAuthMessages}
                className="font-bold underline shrink-0 cursor-pointer"
              >
                OK
              </button>
            </div>
          )}

          {isVerifiedIdentity && user ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-accent)]">
                <div className="flex items-center gap-3 min-w-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Gmail Account'}
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-full object-cover border border-[var(--border-accent)] shrink-0"
                    />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft-bg)] text-[var(--accent-soft-text)] shrink-0">
                      <PatroThemedIcon name="lock" iconTheme={iconTheme} className="h-6 w-6" />
                    </span>
                  )}

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate flex items-center gap-1.5">
                      {user.displayName || 'Gmail User'}
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {user.email}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">
                      Gmail Private Cloud Sync Active
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void signOutUser()}
                  disabled={authBusy}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-secondary)] shrink-0 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>

              {/* Private App Lock Setting */}
              <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)]">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft-bg)] text-[var(--accent-soft-text)] shrink-0">
                    {privateLockEnabled ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      Require Gmail Sign-In on Open (Private Lock)
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Keep your calendar, notes, and personal Rashifal locked behind your Gmail account.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={privateLockEnabled}
                  onClick={() => onTogglePrivateLock(!privateLockEnabled)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    privateLockEnabled
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {privateLockEnabled ? 'Locked' : 'Off'}
                </button>
              </div>

              <button
                type="button"
                onClick={onDone}
                className="w-full h-12 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-sm font-bold text-white transition-colors cursor-pointer"
              >
                Continue to Nepal Patro
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Single-System 1-Tap Gmail Sign-In */}
              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                disabled={authBusy}
                className="w-full h-13 px-4 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white flex items-center justify-center gap-3 text-sm font-bold shadow-sm transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#EA4335] font-extrabold text-sm shadow-xs shrink-0">
                  G
                </span>
                <span className="truncate">
                  {authBusy ? 'Connecting Gmail...' : 'Continue with Gmail (Google)'}
                </span>
              </button>

              {!(privateLockEnabled && !isVerifiedIdentity) && (
                <div className="pt-3 border-t border-[var(--border-soft)] flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
                  <span>Use calendar offline without Gmail cloud sync</span>
                  <button
                    type="button"
                    onClick={onDone}
                    className="font-bold text-[var(--accent-link)] hover:underline cursor-pointer"
                  >
                    Use Local Only
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Private Security Summary Footer */}
      <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
          <p className="font-bold text-[var(--text-primary)]">Owner-Only Gmail Vault</p>
          <p className="mt-0.5">
            Protected by strict Firestore security rules (`request.auth.uid == userId`). All Panchang, Rashifal, Converter, and Weather guidance run locally on your device.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

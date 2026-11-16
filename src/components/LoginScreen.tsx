import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  Smartphone,
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

type AuthTab = 'gmail' | 'phone';

const COUNTRY_CODES = [
  { code: '+977', label: 'Nepal (+977)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+1', label: 'USA / Canada (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+971', label: 'UAE (+971)' },
];

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
  } = useFirebase();

  const [tab, setTab] = useState<AuthTab>('gmail');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Email / Gmail form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Phone OTP form state
  const [countryCode, setCountryCode] = useState('+977');
  const [localPhone, setLocalPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const consoleProvidersUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`;
  const consoleSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;
  const isProviderSetupError = Boolean(authError && authError.includes('Sign-in method'));
  const isAuthorizedDomainError = Boolean(authError && authError.includes('Authorized domains'));

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (isRegisterMode) {
      await signUpWithEmail(email, password, displayName);
    } else {
      const ok = await signInWithEmail(email, password);
      if (ok) onDone();
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = localPhone.replace(/[^\d]/g, '');
    if (digits.length < 7) return;
    const formattedE164 = localPhone.trim().startsWith('+')
      ? localPhone.trim().replace(/[^\d+]/g, '')
      : `${countryCode}${digits.replace(/^0+/, '')}`;
    await sendPhoneOtp(formattedE164, 'nepal-patro-recaptcha');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length < 4) return;
    const ok = await verifyPhoneOtp(otpCode);
    if (ok) onDone();
  };

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
      {/* reCAPTCHA container required for Firebase Phone SMS Auth */}
      <div id="nepal-patro-recaptcha" />

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
            Private Vault · Zero Third-Party APIs
          </span>
        </div>
      )}

      {/* Main Private Login / Account Card */}
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
                नेपाल पात्रो · Private Account
              </p>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">
                {isVerifiedIdentity ? 'Private Account Verified' : 'Sign In to Your Private Patro'}
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-white/85 mt-3 leading-relaxed">
            Easy, protected sign-in with your Gmail account or mobile number. All notes, Rashi settings, and themes stay strictly private to your own account with zero third-party tracking.
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
              {(isProviderSetupError || isAuthorizedDomainError) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {isProviderSetupError && (
                    <button
                      type="button"
                      onClick={() => void handleGoogleSignIn()}
                      disabled={authBusy}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      Use Google Sign-In Instead
                    </button>
                  )}
                  <a
                    href={isAuthorizedDomainError ? consoleSettingsUrl : consoleProvidersUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--holiday-border)] text-xs font-bold text-[var(--holiday-soft-text)] hover:border-[var(--accent-primary)] whitespace-nowrap shrink-0 transition-colors"
                  >
                    Open Firebase Console ({isAuthorizedDomainError ? 'Authorized domains' : 'Sign-in method'})
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
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

          {/* CASE 1: Email Verification Pending Gate */}
          {needsEmailVerification && user && (
            <div className="p-5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-accent)] space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                <Mail className="h-4.5 w-4.5 text-[var(--accent-secondary)]" />
                Verify Your Email to Unlock Sync
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                We sent a verification link to <strong>{user.email}</strong>. Open the link in your inbox, then tap the refresh button below.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => void refreshUserSession()}
                  disabled={authBusy}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[var(--accent-primary)] text-xs font-semibold text-white hover:bg-[var(--accent-primary-hover)] transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  I Have Verified
                </button>
                <button
                  type="button"
                  onClick={() => void resendVerificationEmail()}
                  disabled={authBusy}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
                >
                  Resend Email
                </button>
                <button
                  type="button"
                  onClick={() => void signOutUser()}
                  disabled={authBusy}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold text-[var(--holiday-soft-text)] cursor-pointer"
                >
                  Switch Account
                </button>
              </div>
            </div>
          )}

          {/* CASE 2: Verified Signed-In Account Summary */}
          {isVerifiedIdentity && user ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-accent)]">
                <div className="flex items-center gap-3 min-w-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Account'}
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
                      {user.displayName || 'Private User'}
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {user.email || user.phoneNumber}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">
                      Owner-Only Encrypted Cloud Sync Active
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
                      Require Sign-In on Open (Private Lock)
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Keep your calendar, notes, and personal Rashifal locked behind your account for private use.
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
            /* CASE 3: Unauthenticated Login Flow (Gmail/Google + Mobile Number OTP) */
            <div className="space-y-5">
              {/* Quick 1-Tap Google (Gmail) Sign-In */}
              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                disabled={authBusy}
                className="w-full h-12 px-4 rounded-2xl bg-[var(--bg-surface-soft)] hover:bg-[var(--accent-soft-bg)] border border-[var(--border-accent)] flex items-center justify-center gap-3 text-sm font-bold text-[var(--text-primary)] transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#EA4335] font-extrabold text-sm shadow-xs border border-black/10 shrink-0">
                  G
                </span>
                <span className="truncate">
                  {authBusy ? 'Connecting...' : 'Sign In with Google (Gmail) · Ready Now'}
                </span>
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--border-soft)]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Or Sign In With
                </span>
                <div className="h-px flex-1 bg-[var(--border-soft)]" />
              </div>

              {/* Method Switcher: Email & Password vs Mobile Number OTP */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-soft)]">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('gmail');
                      clearAuthMessages();
                    }}
                    className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                      tab === 'gmail'
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    Email & Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('phone');
                      clearAuthMessages();
                    }}
                    className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                      tab === 'phone'
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Smartphone className="h-4 w-4 shrink-0" />
                    Mobile Number OTP
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
                  Google (Gmail) works right away. Email & Password and Mobile OTP require enabling them once in{' '}
                  <a
                    href={consoleProvidersUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--accent-link)] hover:underline inline-flex items-center gap-0.5"
                  >
                    Firebase Console
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  .
                </p>
              </div>

              {tab === 'gmail' ? (
                <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                  {isRegisterMode && (
                    <div>
                      <label htmlFor="login-name" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                        Your Name
                      </label>
                      <input
                        id="login-name"
                        type="text"
                        required
                        maxLength={100}
                        placeholder="e.g., Aarav Sharma"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="login-email" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Gmail or Email Address
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="name@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="login-password" className="block text-xs font-semibold text-[var(--text-secondary)]">
                        Password
                      </label>
                      {!isRegisterMode && (
                        <button
                          type="button"
                          onClick={() => {
                            if (email.trim()) {
                              void sendPasswordReset(email);
                            }
                          }}
                          className="text-[11px] font-semibold text-[var(--accent-link)] hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      id="login-password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authBusy}
                    className="w-full h-11 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-sm font-bold text-white transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <KeyRound className="h-4 w-4" />
                    {authBusy
                      ? 'Please wait...'
                      : isRegisterMode
                      ? 'Create Private Account'
                      : 'Sign In with Email'}
                  </button>

                  <p className="text-center text-xs text-[var(--text-muted)]">
                    {isRegisterMode ? 'Already have an account?' : 'First time using email sign-in?'}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode((prev) => !prev);
                        clearAuthMessages();
                      }}
                      className="font-bold text-[var(--accent-link)] hover:underline cursor-pointer"
                    >
                      {isRegisterMode ? 'Sign in instead' : 'Create private account'}
                    </button>
                  </p>
                </form>
              ) : !phoneOtpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-3.5">
                  <div>
                    <label htmlFor="login-phone" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Mobile Number (SMS OTP Verification)
                    </label>
                    <div className="flex gap-2">
                      <select
                        aria-label="Country dial code"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="h-11 px-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <input
                        id="login-phone"
                        type="tel"
                        required
                        autoComplete="tel-national"
                        placeholder="98XXXXXXXX"
                        value={localPhone}
                        onChange={(e) => setLocalPhone(e.target.value)}
                        className="flex-1 h-11 px-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authBusy}
                    className="w-full h-11 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-sm font-bold text-white transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    {authBusy ? 'Sending OTP...' : 'Send 6-Digit SMS Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                  <div>
                    <label htmlFor="login-otp" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Enter 6-Digit Verification Code
                    </label>
                    <input
                      id="login-otp"
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={8}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-center text-lg font-bold tracking-[0.25em] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
                    />
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpCode('');
                        resetPhoneOtp();
                      }}
                      className="h-11 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer"
                    >
                      Change Number
                    </button>
                    <button
                      type="submit"
                      disabled={authBusy}
                      className="flex-1 h-11 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-sm font-bold text-white transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {authBusy ? 'Verifying...' : 'Verify & Sign In'}
                    </button>
                  </div>
                </form>
              )}

              {!(privateLockEnabled && !isVerifiedIdentity) && (
                <div className="pt-2 border-t border-[var(--border-soft)] flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
                  <span>Or continue offline without cloud sync</span>
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
          <p className="font-bold text-[var(--text-primary)]">Full Private Security Architecture</p>
          <p className="mt-0.5">
            Protected by strict Firestore rules requiring verified Gmail/Email or verified SMS Phone OTP ownership (`request.auth.uid == userId`). All Panchang, Rashifal, and Nepal climate guidance run locally with zero third-party APIs.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

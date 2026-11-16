import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Cloud,
  Lock,
  LogIn,
  LogOut,
  Palette,
  Sparkles,
  Unlock,
  X,
} from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { IconThemeId, THEME_PALETTES, ThemeId } from '../types/theme';
import { PatroThemedIcon } from './NepaliIcons';

interface SettingsModalProps {
  isOpen: boolean;
  activeTheme: ThemeId;
  activeIconTheme: IconThemeId;
  useDevanagariNums: boolean;
  preferredRashi: string;
  privateLockEnabled: boolean;
  onSelectTheme: (theme: ThemeId) => void;
  onSelectIconTheme: (iconTheme: IconThemeId) => void;
  onToggleDevanagariNums: () => void;
  onSelectRashi: (rashiId: string) => void;
  onTogglePrivateLock: (enabled: boolean) => void;
  onOpenLogin: () => void;
  onClose: () => void;
}

const RASHI_OPTIONS = [
  { id: 'mesha', label: 'मेष · Mesha (Aries)' },
  { id: 'vrishabha', label: 'वृष · Vrishabha (Taurus)' },
  { id: 'mithuna', label: 'मिथुन · Mithuna (Gemini)' },
  { id: 'karkata', label: 'कर्कट · Karkata (Cancer)' },
  { id: 'simha', label: 'सिंह · Simha (Leo)' },
  { id: 'kanya', label: 'कन्या · Kanya (Virgo)' },
  { id: 'tula', label: 'तुला · Tula (Libra)' },
  { id: 'vrishchika', label: 'वृश्चिक · Vrishchika (Scorpio)' },
  { id: 'dhanu', label: 'धनु · Dhanu (Sagittarius)' },
  { id: 'makara', label: 'मकर · Makara (Capricorn)' },
  { id: 'kumbha', label: 'कुम्भ · Kumbha (Aquarius)' },
  { id: 'meena', label: 'मीन · Meena (Pisces)' },
];

export function SettingsModal({
  isOpen,
  activeTheme,
  activeIconTheme,
  useDevanagariNums,
  preferredRashi,
  privateLockEnabled,
  onSelectTheme,
  onSelectIconTheme,
  onToggleDevanagariNums,
  onSelectRashi,
  onTogglePrivateLock,
  onOpenLogin,
  onClose,
}: SettingsModalProps) {
  const { user, authBusy, isVerifiedIdentity, signOutUser } = useFirebase();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-2xl"
          >
            <div className="sm:hidden w-10 h-1.5 bg-[var(--border-accent)]/60 rounded-full mx-auto mt-3" />

            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-3 bg-[var(--bg-surface)] border-b border-[var(--border-soft)]">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft-bg)] text-[var(--accent-soft-text)]">
                  <Palette className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h2 id="settings-modal-title" className="text-lg font-bold text-[var(--text-primary)]">
                    App Settings <span className="font-devanagari text-[var(--accent-secondary)]">· सेटिङ्स</span>
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Nepali icon style, color themes, security lock & sync
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close settings"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-surface-soft)] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Nepali Cultural Icon Theme Switcher */}
              <section aria-labelledby="icon-theme-heading">
                <div className="flex items-center justify-between mb-3">
                  <h3 id="icon-theme-heading" className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[var(--accent-secondary)]" />
                    Icon Theme · आइकन शैली
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      {
                        id: 'nepali-cultural',
                        title: 'Nepali Cultural Style',
                        subtitleNe: 'नेपाली सांस्कृतिक शैली',
                        desc: 'Pagoda temple, Patro scroll, Mangal Kalash & Brass Diyo icons',
                      },
                      {
                        id: 'classic',
                        title: 'Classic Minimal',
                        subtitleNe: 'साधारण आधुनिक शैली',
                        desc: 'Clean geometric outline icons across navigation & quick actions',
                      },
                    ] as const
                  ).map((opt) => {
                    const isSelected = activeIconTheme === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onSelectIconTheme(opt.id)}
                        aria-pressed={isSelected}
                        className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--accent-soft-bg)] border-[var(--accent-primary)] shadow-sm'
                            : 'bg-[var(--bg-surface-soft)] border-[var(--border-subtle)] hover:border-[var(--border-accent)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 text-[var(--accent-secondary)]">
                            <PatroThemedIcon name="home" iconTheme={opt.id} className="h-4.5 w-4.5" />
                            <PatroThemedIcon name="calendar" iconTheme={opt.id} className="h-4.5 w-4.5" />
                            <PatroThemedIcon name="kalash" iconTheme={opt.id} className="h-4.5 w-4.5" />
                            <PatroThemedIcon name="festivals" iconTheme={opt.id} className="h-4.5 w-4.5" />
                          </div>
                          {isSelected && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white">
                              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-[var(--text-primary)]">{opt.title}</p>
                        <p className="font-devanagari text-xs font-semibold text-[var(--accent-secondary)]">
                          {opt.subtitleNe}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-snug">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Color Palette Theme Switcher */}
              <section aria-labelledby="theme-section-heading" className="pt-4 border-t border-[var(--border-soft)]">
                <div className="flex items-center justify-between mb-3">
                  <h3 id="theme-section-heading" className="text-sm font-bold text-[var(--text-primary)]">
                    Color Palette Theme
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">
                    {isVerifiedIdentity ? 'Synced to your account' : 'Saved on this device'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {THEME_PALETTES.map((palette) => {
                    const isSelected = activeTheme === palette.id;
                    return (
                      <button
                        key={palette.id}
                        type="button"
                        onClick={() => onSelectTheme(palette.id)}
                        aria-pressed={isSelected}
                        className={`group relative text-left p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-link)] ${
                          isSelected
                            ? 'bg-[var(--accent-soft-bg)] border-[var(--accent-primary)] shadow-sm'
                            : 'bg-[var(--bg-surface-soft)] border-[var(--border-subtle)] hover:border-[var(--border-accent)]'
                        }`}
                      >
                        <div
                          className="h-9 w-full rounded-xl mb-2.5 p-1.5 flex items-center justify-between border border-black/10"
                          style={{ background: palette.swatches.pillGradient }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-5 w-5 rounded-full border border-black/15"
                              style={{ backgroundColor: palette.swatches.canvas }}
                            />
                            <span
                              className="h-5 w-5 rounded-full border border-black/15"
                              style={{ backgroundColor: palette.swatches.primary }}
                            />
                            <span
                              className="h-5 w-5 rounded-full border border-black/15"
                              style={{ backgroundColor: palette.swatches.secondary }}
                            />
                          </div>

                          {isSelected && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white">
                              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                          {palette.nameEn}
                        </p>
                        <p className="font-devanagari text-xs font-semibold text-[var(--accent-secondary)] mt-0.5">
                          {palette.nameNe} {palette.isDark ? '· Dark' : '· Light'}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-snug">
                          {palette.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Calendar & Rashifal Preferences */}
              <section className="space-y-3 pt-4 border-t border-[var(--border-soft)]">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Calendar & Panchang Preferences
                </h3>

                <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)]">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      Devanagari Calendar Numerals
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Display dates in Nepali script (१, २, ३) on the monthly grid
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={useDevanagariNums}
                    onClick={onToggleDevanagariNums}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      useDevanagariNums
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    {useDevanagariNums ? '१२३ Active' : '123 Active'}
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)]">
                  <label
                    htmlFor="settings-rashi-select"
                    className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5"
                  >
                    Default Rashifal Sign
                  </label>
                  <select
                    id="settings-rashi-select"
                    value={preferredRashi}
                    onChange={(e) => onSelectRashi(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
                  >
                    {RASHI_OPTIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              {/* Private Account & Security Lock */}
              <section className="space-y-3 pt-4 border-t border-[var(--border-soft)]">
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)]">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Cloud className="h-4 w-4 text-[var(--accent-link)]" />
                      {isVerifiedIdentity ? 'Private Account Active' : 'Gmail & Phone Sign-In'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {isVerifiedIdentity && user
                        ? `Signed in as ${user.email || user.phoneNumber || user.displayName}`
                        : 'Sign in with Gmail or Mobile OTP for private cloud backup'}
                    </p>
                  </div>

                  {isVerifiedIdentity && user ? (
                    <button
                      type="button"
                      onClick={() => void signOutUser()}
                      disabled={authBusy}
                      className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-secondary)] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenLogin();
                      }}
                      className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-[var(--accent-primary)] text-xs font-semibold text-white hover:bg-[var(--accent-primary-hover)] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Open Login
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {privateLockEnabled ? (
                      <Lock className="h-4 w-4 text-[var(--accent-secondary)] shrink-0" />
                    ) : (
                      <Unlock className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Private App Lock
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Require Gmail or Phone verification before opening calendar
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
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

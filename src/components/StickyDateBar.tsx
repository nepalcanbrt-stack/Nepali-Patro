import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, Check, ChevronRight, Copy, Settings, X } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { NepalTimeState } from '../hooks/useNepalTime';
import { AppScreen } from '../types/app';
import { IconThemeId } from '../types/theme';
import { triggerHapticImpact, triggerHapticSuccess } from '../utils/haptics';
import {
  formatAdDateFull,
  formatBsDateEn,
  formatBsDateNe,
  getWeekdayNameNe,
  toDevanagari,
} from '../utils/nepaliDate';
import { PATRO_SPRING_SNAPPY } from '../utils/motionVariants';
import { PatroThemedIcon } from './NepaliIcons';

interface StickyDateBarProps {
  nepalTime: NepalTimeState;
  activeScreen: AppScreen;
  iconTheme: IconThemeId;
  unreadAlertsCount: number;
  hasLiveUpdate: boolean;
  onNavigate: (screen: AppScreen) => void;
  onOpenTodayInCalendar: () => void;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  onOpenLogin: () => void;
}

const NAV_ITEMS: Array<{ id: AppScreen; labelNe: string; labelEn: string }> = [
  { id: 'home', labelNe: 'गृह', labelEn: 'Home' },
  { id: 'calendar', labelNe: 'पात्रो', labelEn: 'Calendar' },
  { id: 'panchang', labelNe: 'पञ्चाङ्ग', labelEn: 'Panchang' },
  { id: 'converter', labelNe: 'रूपान्तरण', labelEn: 'Converter' },
  { id: 'festivals', labelNe: 'चाडपर्व', labelEn: 'Festivals' },
  { id: 'sanctuary', labelNe: '३डी मन्दिर', labelEn: '3D Stupa' },
];

const LONG_PRESS_DELAY_MS = 450;

async function copyDateText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback to execCommand below
    }
  }
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
  return false;
}

export const StickyDateBar = memo(function StickyDateBar({
  nepalTime,
  activeScreen,
  iconTheme,
  unreadAlertsCount,
  hasLiveUpdate,
  onNavigate,
  onOpenTodayInCalendar,
  onOpenNotifications,
  onOpenSettings,
  onOpenLogin,
}: StickyDateBarProps) {
  const { user, isVerifiedIdentity } = useFirebase();
  const { todayBs, todayAd } = nepalTime;
  const bsDayText = toDevanagari(todayBs.day);

  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isHoldingPress, setIsHoldingPress] = useState(false);

  const pillContainerRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const pressStartRef = useRef<{ x: number; y: number } | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pressStartRef.current = null;
    setIsHoldingPress(false);
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Dismiss quick Copy popover on Escape or outside tap
  useEffect(() => {
    if (!copyMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCopyMenuOpen(false);
      }
    };
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (
        pillContainerRef.current &&
        e.target instanceof Node &&
        !pillContainerRef.current.contains(e.target)
      ) {
        setCopyMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDownOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [copyMenuOpen]);

  const openCopyPopoverWithHaptics = useCallback(() => {
    longPressTriggeredRef.current = true;
    setIsHoldingPress(false);
    setCopied(false);
    setCopyMenuOpen(true);
    void triggerHapticImpact('medium');
  }, []);

  const handleDatePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    pressStartRef.current = { x: e.clientX, y: e.clientY };
    setIsHoldingPress(true);

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      openCopyPopoverWithHaptics();
    }, LONG_PRESS_DELAY_MS);
  };

  const handleDatePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pressStartRef.current) return;
    const dist = Math.hypot(
      e.clientX - pressStartRef.current.x,
      e.clientY - pressStartRef.current.y
    );
    if (dist > 10) {
      clearLongPressTimer();
    }
  };

  const handleDateClick = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (copyMenuOpen) {
      setCopyMenuOpen(false);
      return;
    }
    onOpenTodayInCalendar();
  };

  const handleDateContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    clearLongPressTimer();
    openCopyPopoverWithHaptics();
  };

  const handleCopyCurrentDate = async () => {
    const formatted = `${formatBsDateNe(todayBs)} (${formatBsDateEn(todayBs)}) · ${formatAdDateFull(
      todayAd
    )} · ${getWeekdayNameNe(todayBs.weekday)}`;
    const ok = await copyDateText(formatted);
    if (ok) {
      setCopied(true);
      void triggerHapticSuccess();
      window.setTimeout(() => {
        setCopyMenuOpen(false);
        setCopied(false);
      }, 1100);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full px-3 pt-[max(0.625rem,env(safe-area-inset-top))] pb-1.5 sm:px-6 pointer-events-none">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-2 sm:gap-3 pointer-events-auto">
        {/* Floating Themed Date Pill — Always Displays Only Today's Nepali BS Day Number */}
        <div ref={pillContainerRef} className="relative shrink-0">
          <button
            type="button"
            onPointerDown={handleDatePointerDown}
            onPointerMove={handleDatePointerMove}
            onPointerUp={clearLongPressTimer}
            onPointerCancel={clearLongPressTimer}
            onPointerLeave={clearLongPressTimer}
            onClick={handleDateClick}
            onContextMenu={handleDateContextMenu}
            aria-label={`Today's Nepali date is ${bsDayText}. Tap to open full calendar, or long-press to copy date.`}
            aria-expanded={copyMenuOpen}
            style={{
              backgroundImage: 'var(--pill-bg)',
              borderColor: copyMenuOpen ? 'var(--accent-primary)' : 'var(--pill-border)',
              boxShadow: 'var(--card-shadow)',
            }}
            className={`group min-w-0 flex items-center justify-between gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-2 rounded-full backdrop-blur-md border hover:border-[var(--border-accent)] transition-all duration-200 cursor-pointer select-none touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-link)] ${
              isHoldingPress ? 'scale-[0.95]' : 'active:scale-[0.99]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                style={{
                  backgroundColor: 'var(--pill-icon-bg)',
                  borderColor: 'var(--pill-icon-border)',
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--accent-secondary)] shadow-xs border"
              >
                <PatroThemedIcon name="calendar" iconTheme={iconTheme} className="h-4.5 w-4.5" strokeWidth={2.1} />
              </span>

              <span className="font-devanagari text-lg sm:text-xl font-extrabold tracking-tight text-[var(--text-primary)] leading-none tabular-nums whitespace-nowrap">
                {bsDayText}
              </span>
            </div>

            <span
              style={{ backgroundColor: 'var(--pill-icon-bg)' }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--pill-sub)] group-hover:translate-x-0.5 transition-transform"
            >
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>

          {/* Long-Press Quick Copy-to-Clipboard Popover */}
          <AnimatePresence>
            {copyMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={PATRO_SPRING_SNAPPY}
                role="dialog"
                aria-label="Quick copy current date"
                className="absolute left-0 top-full mt-2 z-50 w-72 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-accent)] shadow-2xl p-3 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-devanagari text-xs font-bold text-[var(--text-primary)] truncate">
                      {formatBsDateNe(todayBs)} · {getWeekdayNameNe(todayBs.weekday)}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                      {formatBsDateEn(todayBs)} · {formatAdDateFull(todayAd)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCopyMenuOpen(false)}
                    aria-label="Close copy menu"
                    className="h-7 w-7 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)] hover:text-[var(--text-primary)] shrink-0 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void handleCopyCurrentDate()}
                  className={`w-full h-10 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 shrink-0" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 shrink-0" />
                      <span>Copy Current Date</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop Integrated Navigation Rail + Account & Settings Triggers */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <nav
            aria-label="Primary navigation"
            style={{ boxShadow: 'var(--card-shadow)' }}
            className="hidden lg:flex items-center gap-1 p-1.5 rounded-full bg-[var(--bg-nav)] backdrop-blur-md border border-[var(--border-subtle)]"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`relative px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-link)] ${
                    isActive
                      ? 'text-white'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="desktop-nav-pill"
                      transition={PATRO_SPRING_SNAPPY}
                      className="absolute inset-0 rounded-full bg-[var(--accent-primary)] shadow-xs"
                    />
                  )}
                  <span className="relative z-10">{item.labelEn}</span>
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onOpenLogin}
            aria-label={isVerifiedIdentity ? 'Manage Gmail account' : 'Sign in with Gmail'}
            title={isVerifiedIdentity ? `Signed in (${user?.email})` : 'Gmail Sign-In'}
            style={{ boxShadow: 'var(--card-shadow)' }}
            className={`min-h-[44px] min-w-[44px] px-2.5 flex items-center justify-center gap-1.5 rounded-full backdrop-blur-md border transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-link)] ${
              activeScreen === 'login'
                ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                : isVerifiedIdentity
                ? 'bg-[var(--bg-nav)] text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:border-[var(--border-accent)]'
                : 'bg-[var(--bg-nav)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--border-accent)] hover:text-[var(--accent-link)]'
            }`}
          >
            <PatroThemedIcon name="lock" iconTheme={iconTheme} className="h-4.5 w-4.5 shrink-0" />
            <span className="hidden md:inline text-xs font-semibold whitespace-nowrap">
              {isVerifiedIdentity ? 'Account' : 'Gmail Sign In'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label={
              unreadAlertsCount > 0
                ? `Open notifications (${unreadAlertsCount} unread)`
                : 'Open notifications and live updates'
            }
            title={hasLiveUpdate ? 'Live update & alerts available' : 'Alerts & Live Updates'}
            style={{ boxShadow: 'var(--card-shadow)' }}
            className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-[var(--bg-nav)] backdrop-blur-md border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--border-accent)] hover:text-[var(--accent-link)] active:scale-[0.97] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-link)]"
          >
            <Bell className="h-4.5 w-4.5" />
            {(unreadAlertsCount > 0 || hasLiveUpdate) && (
              <span
                className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold text-white flex items-center justify-center shadow-xs ${
                  hasLiveUpdate ? 'bg-amber-600' : 'bg-[#BE123C]'
                }`}
              >
                {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount || '!'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open app settings, icon themes, and color themes"
            title="Settings & Themes"
            style={{ boxShadow: 'var(--card-shadow)' }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-[var(--bg-nav)] backdrop-blur-md border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--border-accent)] hover:text-[var(--accent-link)] active:scale-[0.97] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-link)]"
          >
            <Settings className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
});

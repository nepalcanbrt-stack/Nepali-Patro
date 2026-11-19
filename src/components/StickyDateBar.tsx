import { memo } from 'react';
import { motion } from 'motion/react';
import { Bell, ChevronRight, Settings } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { NepalTimeState } from '../hooks/useNepalTime';
import { AppScreen } from '../types/app';
import { IconThemeId } from '../types/theme';
import { toDevanagari } from '../utils/nepaliDate';
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
  const { todayBs } = nepalTime;
  const bsDayText = toDevanagari(todayBs.day);

  return (
    <header className="sticky top-0 z-40 w-full px-3 pt-[max(0.625rem,env(safe-area-inset-top))] pb-1.5 sm:px-6 pointer-events-none">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-2 sm:gap-3 pointer-events-auto">
        {/* Floating Themed Date Pill — Always Displays Only Today's Nepali BS Day Number */}
        <button
          type="button"
          onClick={onOpenTodayInCalendar}
          aria-label={`Today's Nepali date is ${bsDayText}. Tap to open full calendar.`}
          style={{
            backgroundImage: 'var(--pill-bg)',
            borderColor: 'var(--pill-border)',
            boxShadow: 'var(--card-shadow)',
          }}
          className="group min-w-0 flex items-center justify-between gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-2 rounded-full backdrop-blur-md border hover:border-[var(--border-accent)] active:scale-[0.99] transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-link)]"
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

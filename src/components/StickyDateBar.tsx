import { Calendar, ChevronRight, Settings } from 'lucide-react';
import {
  formatAdDateShort,
  formatBsDateNe,
  getWeekdayNameNe,
} from '../utils/nepaliDate';
import { NepalTimeState } from '../hooks/useNepalTime';
import { AppScreen } from '../types/app';

interface StickyDateBarProps {
  nepalTime: NepalTimeState;
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  onOpenTodayInCalendar: () => void;
  onOpenSettings: () => void;
}

const NAV_ITEMS: Array<{ id: AppScreen; labelNe: string; labelEn: string }> = [
  { id: 'home', labelNe: 'गृह', labelEn: 'Home' },
  { id: 'calendar', labelNe: 'पात्रो', labelEn: 'Calendar' },
  { id: 'panchang', labelNe: 'पञ्चाङ्ग', labelEn: 'Panchang' },
  { id: 'converter', labelNe: 'रूपान्तरण', labelEn: 'Converter' },
  { id: 'festivals', labelNe: 'चाडपर्व', labelEn: 'Festivals' },
];

export function StickyDateBar({
  nepalTime,
  activeScreen,
  onNavigate,
  onOpenTodayInCalendar,
  onOpenSettings,
}: StickyDateBarProps) {
  const { todayBs, todayAd, panchang, timeFormatted } = nepalTime;
  const bsDateText = formatBsDateNe(todayBs);
  const weekdayNe = getWeekdayNameNe(todayBs.weekday);
  const adDateText = formatAdDateShort(todayAd);

  return (
    <header className="sticky top-0 z-40 w-full px-3 pt-2.5 pb-1.5 sm:px-6 pointer-events-none">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-2 sm:gap-4 pointer-events-auto">
        {/* Floating Themed Date Pill — Always Visible Across All Screens */}
        <button
          type="button"
          onClick={onOpenTodayInCalendar}
          aria-label={`Today is ${bsDateText}, ${weekdayNe}, ${panchang.fullTithiNe}, ${adDateText}. Tap to open full calendar.`}
          style={{
            backgroundImage: 'var(--pill-bg)',
            borderColor: 'var(--pill-border)',
            boxShadow: 'var(--card-shadow)',
          }}
          className="group flex-1 lg:flex-initial lg:min-w-[390px] min-w-0 flex items-center justify-between gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-2 rounded-full backdrop-blur-md border hover:border-[var(--border-accent)] active:scale-[0.99] transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-link)]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              style={{
                backgroundColor: 'var(--pill-icon-bg)',
                borderColor: 'var(--pill-icon-border)',
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--accent-secondary)] shadow-xs border"
            >
              <Calendar className="h-4.5 w-4.5" strokeWidth={2.2} />
            </span>

            <div className="min-w-0 text-left">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-devanagari text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] leading-tight whitespace-nowrap">
                  {bsDateText}
                </span>
                <span className="hidden sm:inline text-xs font-medium text-[var(--pill-sub)] whitespace-nowrap">
                  {adDateText}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[var(--text-secondary)] truncate">
                <span className="font-devanagari font-semibold text-[var(--accent-secondary)] whitespace-nowrap">
                  {weekdayNe}
                </span>
                <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
                <span className="font-devanagari truncate">{panchang.fullTithiNe}</span>
                <span className="sm:hidden text-[var(--text-muted)]" aria-hidden="true">·</span>
                <span className="sm:hidden tabular-nums font-medium text-[var(--text-secondary)] whitespace-nowrap">
                  {adDateText}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            <span className="hidden sm:inline-block text-[11px] font-medium tabular-nums text-[var(--pill-sub)]">
              {timeFormatted} NST
            </span>
            <span
              style={{ backgroundColor: 'var(--pill-icon-bg)' }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--pill-sub)] group-hover:translate-x-0.5 transition-transform"
            >
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </button>

        {/* Desktop Integrated Navigation Rail + Settings Trigger */}
        <div className="flex items-center gap-2 shrink-0">
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
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-link)] ${
                    isActive
                      ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]'
                  }`}
                >
                  {item.labelEn}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open app settings and color themes"
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
}

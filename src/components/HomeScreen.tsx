import { useMemo } from 'react';
import {
  ArrowLeftRight,
  CalendarDays,
  ChevronRight,
  Clock,
  Cloud,
  Compass,
  LogIn,
  LogOut,
  Moon,
  Palette,
  Plus,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Trash2,
} from 'lucide-react';
import himalayanDawnHero from '../assets/images/himalayan_dawn_hero_1794569026444.jpg';
import { useFirebase } from '../contexts/FirebaseContext';
import {
  BS_MONTHS_EN,
  BS_MONTHS_NE,
  FestivalEvent,
  NEPALI_FESTIVALS,
} from '../data/bsCalendarData';
import { NepalTimeState } from '../hooks/useNepalTime';
import { AppScreen, UserNote } from '../types/app';
import {
  bsToAdParts,
  diffBsDays,
  formatAdDateFull,
  formatAdDateShort,
  formatBsDateNe,
  getNepalSambatYear,
  getWeekdayNameEn,
  getWeekdayNameNe,
  parseBsKey,
  toDevanagari,
} from '../utils/nepaliDate';

interface HomeScreenProps {
  nepalTime: NepalTimeState;
  notes: UserNote[];
  isCloudSynced: boolean;
  onNavigate: (screen: AppScreen) => void;
  onJumpToBsDate: (bs: { year: number; month: number; day: number }) => void;
  onOpenNoteModal: (bs?: { year: number; month: number; day: number }) => void;
  onDeleteNote: (id: string) => void;
  onOpenSettings: () => void;
}

interface ResolvedFestival extends FestivalEvent {
  resolvedYear: number;
  daysUntil: number;
  adFormatted: string;
}

export function HomeScreen({
  nepalTime,
  notes,
  isCloudSynced,
  onNavigate,
  onJumpToBsDate,
  onOpenNoteModal,
  onDeleteNote,
  onOpenSettings,
}: HomeScreenProps) {
  const { user, authBusy, authError, signInWithGoogle, signOutUser, clearAuthError } = useFirebase();
  const { todayBs, todayAd, panchang, timeFormatted } = nepalTime;
  const nepalSambat = getNepalSambatYear(todayBs.year, todayBs.month);

  // Compute upcoming festivals relative to Today in Nepal
  const upcomingFestivals = useMemo<ResolvedFestival[]>(() => {
    const resolved: ResolvedFestival[] = [];
    for (const fest of NEPALI_FESTIVALS) {
      const candidateYears = fest.bsYear
        ? [fest.bsYear]
        : [todayBs.year, todayBs.year + 1];

      for (const yr of candidateYears) {
        const delta = diffBsDays(todayBs, { year: yr, month: fest.bsMonth, day: fest.bsDay });
        if (delta >= 0) {
          const ad = bsToAdParts(yr, fest.bsMonth, fest.bsDay);
          resolved.push({
            ...fest,
            resolvedYear: yr,
            daysUntil: delta,
            adFormatted: formatAdDateShort(ad),
          });
          break;
        }
      }
    }
    return resolved.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [todayBs]);

  const countdownFestivals = upcomingFestivals.slice(0, 4);
  const upcomingList = upcomingFestivals.slice(0, 6);

  // Upcoming user notes sorted chronologically
  const upcomingNotes = useMemo(() => {
    return notes
      .map((n) => {
        const parsed = parseBsKey(n.bsKey);
        const daysUntil = diffBsDays(todayBs, parsed);
        return { ...n, parsed, daysUntil };
      })
      .filter((n) => n.daysUntil >= -1)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 4);
  }, [notes, todayBs]);

  const quickActions = [
    {
      id: 'calendar',
      label: 'Full Calendar',
      labelNe: 'पूर्ण पात्रो',
      icon: CalendarDays,
      tint: 'bg-[#FCE7F3] text-[#9F1239] dark:bg-[#4C1329] dark:text-[#FDA4AF]',
      onClick: () => onNavigate('calendar'),
    },
    {
      id: 'converter',
      label: 'BS ↔ AD',
      labelNe: 'मिति रूपान्तरण',
      icon: ArrowLeftRight,
      tint: 'bg-[#EDE9FE] text-[#5B21B6] dark:bg-[#322157] dark:text-[#DDD6FE]',
      onClick: () => onNavigate('converter'),
    },
    {
      id: 'panchang',
      label: 'Panchang',
      labelNe: 'पञ्चाङ्ग',
      icon: Compass,
      tint: 'bg-[#FEF3C7] text-[#B45309] dark:bg-[#451A03] dark:text-[#FCD34D]',
      onClick: () => onNavigate('panchang'),
    },
    {
      id: 'festivals',
      label: 'Festivals',
      labelNe: 'चाडपर्व',
      icon: Sparkles,
      tint: 'bg-[#E0E7FF] text-[#3730A3] dark:bg-[#1E1B4B] dark:text-[#C7D2FE]',
      onClick: () => onNavigate('festivals'),
    },
    {
      id: 'note',
      label: 'Add Note',
      labelNe: 'टिपोट थप्नुहोस्',
      icon: Plus,
      tint: 'bg-[#DCFCE7] text-[#166534] dark:bg-[#064E3B] dark:text-[#6EE7B7]',
      onClick: () => onOpenNoteModal(todayBs),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* HERO CULTURAL SECTION WITH HIMALAYAN BACKGROUND & LARGE CIRCULAR NEPALI DATE DISPLAY */}
      <section
        style={{
          backgroundImage: 'linear-gradient(135deg, var(--hero-from), var(--hero-via), var(--hero-to))',
          boxShadow: 'var(--card-shadow)',
        }}
        className="relative overflow-hidden rounded-3xl border border-[var(--border-subtle)]"
      >
        {/* Himalayan Background Artwork with Measured Contrast Scrim */}
        <img
          src={himalayanDawnHero}
          alt="Himalayan peaks of Annapurna and Machhapuchhre at dawn over Kathmandu Valley"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-80"
        />
        <div
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(to bottom, color-mix(in srgb, var(--hero-from) 75%, transparent), color-mix(in srgb, var(--hero-via) 55%, transparent), color-mix(in srgb, var(--hero-from) 88%, transparent))',
          }}
          className="absolute inset-0"
        />

        <div className="relative z-10 px-5 py-6 sm:px-8 sm:py-8">
          {/* Top Brand Lockup inside Hero */}
          <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
            <div>
              <p className="text-xs font-medium tracking-wide text-white/85">
                Nepal Standard Time · {timeFormatted}
              </p>
              <h1 className="font-devanagari text-2xl sm:text-3xl font-bold text-white tracking-tight mt-0.5">
                नेपाल पात्रो <span className="font-display font-semibold text-[#FBCFE8]">· Nepal Patro</span>
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <Palette className="h-3.5 w-3.5" />
                Themes
              </button>

              {user ? (
                <div className="inline-flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User profile'}
                      referrerPolicy="no-referrer"
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <Cloud className="h-4 w-4 text-[#FBCFE8]" />
                  )}
                  <span className="text-xs font-semibold max-w-[110px] truncate">
                    {user.displayName?.split(' ')[0] || 'Synced'}
                  </span>
                  <button
                    type="button"
                    onClick={signOutUser}
                    disabled={authBusy}
                    aria-label="Sign out"
                    title="Sign out"
                    className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  disabled={authBusy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  {authBusy ? 'Signing in...' : 'Cloud Sync'}
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigate('panchang')}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <Compass className="h-4 w-4" />
                Today’s Panchang
              </button>
            </div>
          </div>

          {authError && (
            <div className="mb-4 px-4 py-2.5 rounded-2xl bg-[#9F1239]/90 border border-[#FECDD3]/40 text-xs text-white flex items-center justify-between gap-3">
              <span>{authError}</span>
              <button type="button" onClick={clearAuthError} className="font-bold underline cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* Centerpiece Layout: Large Circular Nepali Date Display + Cultural Context */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 flex justify-center">
              <button
                type="button"
                onClick={() => onJumpToBsDate(todayBs)}
                aria-label="Open today in full calendar"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, var(--bg-surface), var(--bg-surface-soft))',
                }}
                className="group relative flex flex-col items-center justify-center w-60 h-60 sm:w-68 sm:h-68 rounded-full text-[var(--text-primary)] shadow-[0_20px_50px_-12px_rgba(15,8,35,0.55)] border-4 border-white/60 dark:border-[var(--border-accent)]/70 hover:scale-[1.02] active:scale-[0.99] transition-transform duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                {/* Inner decorative lotus-inspired hairline ring */}
                <span
                  aria-hidden="true"
                  className="absolute inset-2.5 rounded-full border border-dashed border-[var(--border-accent)] pointer-events-none"
                />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--accent-secondary)]">
                  {BS_MONTHS_EN[todayBs.month - 1]} {todayBs.year} BS
                </span>
                <span className="font-devanagari text-7xl sm:text-8xl font-extrabold leading-none tracking-tight text-[var(--text-primary)] my-1 tabular-nums">
                  {toDevanagari(todayBs.day)}
                </span>
                <span className="font-devanagari text-lg sm:text-xl font-bold text-[var(--accent-link)]">
                  {BS_MONTHS_NE[todayBs.month - 1]} {toDevanagari(todayBs.year)}
                </span>
                <span className="mt-1 text-xs font-medium text-[var(--text-secondary)] font-devanagari">
                  {getWeekdayNameNe(todayBs.weekday)} · {panchang.fullTithiNe}
                </span>
                <span className="mt-1 text-[11px] font-semibold text-[var(--text-muted)] tabular-nums">
                  {formatAdDateFull(todayAd)}
                </span>
              </button>
            </div>

            {/* Right Cultural Overview & Key Timings */}
            <div className="lg:col-span-7 space-y-4 text-white">
              <div>
                <p className="text-xs font-medium text-[#FBCFE8]">
                  नेपाल संवत् {toDevanagari(nepalSambat)} · {panchang.seasonNe} ({panchang.seasonEn})
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-1 text-balance">
                  {getWeekdayNameEn(todayAd.weekday)}, {formatAdDateFull(todayAd)}
                </h2>
                <p className="text-sm text-white/90 mt-1.5 max-w-xl leading-relaxed">
                  {panchang.pakshaNe} ({panchang.pakshaEn}) · {panchang.nakshatraNe} ({panchang.nakshatraEn}) Nakshatra · Moon in {panchang.chandraRashiEn}.
                </p>
              </div>

              {/* Sun, Moon & Auspicious Highlights Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                <div className="rounded-2xl bg-white/12 backdrop-blur-md border border-white/18 px-3.5 py-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#FBCFE8]">
                    <Sunrise className="h-3.5 w-3.5" />
                    <span>Sunrise · सूर्योदय</span>
                  </div>
                  <p className="mt-1 text-sm font-bold tabular-nums text-white">{panchang.sunrise}</p>
                </div>

                <div className="rounded-2xl bg-white/12 backdrop-blur-md border border-white/18 px-3.5 py-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#FBCFE8]">
                    <Sunset className="h-3.5 w-3.5" />
                    <span>Sunset · सूर्यास्त</span>
                  </div>
                  <p className="mt-1 text-sm font-bold tabular-nums text-white">{panchang.sunset}</p>
                </div>

                <div className="col-span-2 sm:col-span-1 rounded-2xl bg-white/12 backdrop-blur-md border border-white/18 px-3.5 py-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#FDE68A]">
                    <Sun className="h-3.5 w-3.5" />
                    <span>Abhijit Muhurat</span>
                  </div>
                  <p className="mt-1 text-sm font-bold tabular-nums text-white">{panchang.abhijitMuhurat}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ACTION BUTTONS */}
      <section aria-label="Quick actions">
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                style={{ boxShadow: 'var(--card-shadow)' }}
                className="group min-h-[78px] flex flex-col items-center justify-center gap-1.5 p-2 sm:p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-accent)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-link)]"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.tint}`}>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-primary)] text-center leading-tight whitespace-nowrap truncate max-w-full">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* MAIN 2-COLUMN CONTENT GRID (Mobile stacked, Desktop 12-col split) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): Today's Panchang Card + Upcoming Events */}
        <div className="lg:col-span-7 space-y-6">
          {/* TODAY'S PANCHANG CARD */}
          <section
            style={{ boxShadow: 'var(--card-shadow)' }}
            className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--border-soft)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Today’s Panchang <span className="font-devanagari text-[var(--accent-secondary)]">· आजको पञ्चाङ्ग</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Kathmandu Astronomical Ephemeris · {formatBsDateNe(todayBs)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('panchang')}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[var(--bg-surface-soft)] hover:bg-[var(--accent-soft-bg)] text-xs font-semibold text-[var(--accent-soft-text)] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                Full Details
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 pt-4">
              <div>
                <p className="text-[11px] font-medium text-[var(--text-muted)]">Tithi · तिथि</p>
                <p className="font-devanagari text-sm font-bold text-[var(--text-primary)] mt-0.5">
                  {panchang.fullTithiNe}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{panchang.tithiEn}</p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-[var(--text-muted)]">Nakshatra · नक्षत्र</p>
                <p className="font-devanagari text-sm font-bold text-[var(--text-primary)] mt-0.5">
                  {panchang.nakshatraNe}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{panchang.nakshatraEn}</p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-[var(--text-muted)]">Yoga · योग</p>
                <p className="font-devanagari text-sm font-bold text-[var(--text-primary)] mt-0.5">
                  {panchang.yogaNe}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{panchang.yogaEn}</p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-[var(--text-muted)]">Karana · करण</p>
                <p className="font-devanagari text-sm font-bold text-[var(--text-primary)] mt-0.5">
                  {panchang.karanaNe}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{panchang.karanaEn}</p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-[var(--text-muted)]">Moon Sign · चन्द्र राशि</p>
                <p className="font-devanagari text-sm font-bold text-[var(--text-primary)] mt-0.5">
                  {panchang.chandraRashiNe}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{panchang.moonIllumination}% Illuminated</p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-[var(--text-muted)]">Rahu Kaal · राहुकाल</p>
                <p className="text-sm font-bold text-[var(--accent-secondary)] mt-0.5 tabular-nums">
                  {panchang.rahuKaal}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Avoid new starts</p>
              </div>
            </div>
          </section>

          {/* UPCOMING EVENTS & PERSONAL NOTES */}
          <section
            style={{ boxShadow: 'var(--card-shadow)' }}
            className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--border-soft)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Upcoming Events <span className="font-devanagari text-[var(--accent-secondary)]">· आगामी कार्यक्रम</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Public holidays, Ekadashi observances, and your saved notes
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenNoteModal(todayBs)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Note
              </button>
            </div>

            <div className="divide-y divide-[var(--border-soft)]">
              {upcomingList.map((event) => (
                <button
                  key={`${event.id}-${event.resolvedYear}`}
                  type="button"
                  onClick={() =>
                    onJumpToBsDate({
                      year: event.resolvedYear,
                      month: event.bsMonth,
                      day: event.bsDay,
                    })
                  }
                  className="w-full min-h-[64px] flex items-center justify-between gap-3 py-3.5 text-left hover:bg-[var(--bg-surface-soft)] -mx-2 px-2 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl shrink-0 ${
                        event.isPublicHoliday
                          ? 'bg-[var(--holiday-soft-bg)] text-[var(--holiday-soft-text)]'
                          : 'bg-[var(--accent-soft-bg)] text-[var(--accent-soft-text)]'
                      }`}
                    >
                      <span className="font-devanagari text-base font-bold leading-none">
                        {toDevanagari(event.bsDay)}
                      </span>
                      <span className="font-devanagari text-[10px] font-semibold mt-0.5">
                        {BS_MONTHS_NE[event.bsMonth - 1]}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="font-devanagari text-sm font-bold text-[var(--text-primary)] truncate">
                        {event.titleNe}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        {event.titleEn} · {event.adFormatted}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-[var(--accent-link)] whitespace-nowrap">
                      {event.daysUntil === 0
                        ? 'Today'
                        : event.daysUntil === 1
                        ? 'Tomorrow'
                        : `In ${event.daysUntil} days`}
                    </span>
                    {event.isPublicHoliday && (
                      <p className="text-[11px] font-medium text-[var(--accent-secondary)]">Public Holiday</p>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {upcomingNotes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--border-soft)]">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <h3 className="text-xs font-semibold text-[var(--text-secondary)]">
                    Your Personal Notes {isCloudSynced ? '· Synced to Cloud' : '· Saved Locally'}
                  </h3>
                  {!user && (
                    <button
                      type="button"
                      onClick={signInWithGoogle}
                      className="text-[11px] font-semibold text-[var(--accent-link)] hover:underline cursor-pointer"
                    >
                      Sign in with Google to sync
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {upcomingNotes.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)]"
                    >
                      <button
                        type="button"
                        onClick={() => onJumpToBsDate(n.parsed)}
                        className="min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{n.title}</p>
                        <p className="text-xs text-[var(--text-muted)] font-devanagari">
                          {formatBsDateNe(n.parsed)}
                          {n.time ? ` · ${n.time}` : ''}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(n.id)}
                        aria-label={`Delete ${n.title}`}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--holiday-soft-text)] hover:bg-[var(--holiday-soft-bg)] transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN (5 cols): Festival Countdown Cards + Moon & Time Snapshot */}
        <div className="lg:col-span-5 space-y-6">
          <section
            style={{ boxShadow: 'var(--card-shadow)' }}
            className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--border-soft)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Festival Countdowns
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  आगामी प्रमुख चाडपर्वहरू
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('festivals')}
                className="text-xs font-semibold text-[var(--accent-link)] hover:underline whitespace-nowrap cursor-pointer"
              >
                See All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 pt-4">
              {countdownFestivals.map((fest, idx) => (
                <button
                  key={fest.id}
                  type="button"
                  onClick={() =>
                    onJumpToBsDate({
                      year: fest.resolvedYear,
                      month: fest.bsMonth,
                      day: fest.bsDay,
                    })
                  }
                  style={
                    idx === 0
                      ? {
                          backgroundImage:
                            'linear-gradient(135deg, var(--card-highlight-from), var(--card-highlight-via), var(--card-highlight-to))',
                        }
                      : undefined
                  }
                  className={`group w-full text-left p-4 rounded-2xl border transition-all duration-150 cursor-pointer ${
                    idx === 0
                      ? 'border-[var(--border-accent)] hover:border-[var(--accent-link)]'
                      : 'bg-[var(--bg-surface-soft)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-accent)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--pill-sub)]">
                        {BS_MONTHS_EN[fest.bsMonth - 1]} {fest.bsDay}, {fest.resolvedYear} BS · {fest.adFormatted}
                      </p>
                      <h3 className="font-devanagari text-base font-bold text-[var(--text-primary)] mt-1 truncate">
                        {fest.titleNe}
                      </h3>
                      <p className="text-xs font-medium text-[var(--text-secondary)] truncate">{fest.titleEn}</p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="font-devanagari text-xl font-extrabold text-[var(--accent-secondary)] tabular-nums block leading-none">
                        {fest.daysUntil === 0 ? 'आज' : toDevanagari(fest.daysUntil)}
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                        {fest.daysUntil === 0 ? 'Today' : fest.daysUntil === 1 ? 'day left' : 'days left'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2 line-clamp-2 leading-relaxed">
                    {fest.description}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* Lunar & Auspicious Timing Snapshot */}
          <section
            style={{
              backgroundImage:
                'linear-gradient(135deg, var(--card-highlight-from), var(--card-highlight-via), var(--card-highlight-to))',
            }}
            className="rounded-3xl border border-[var(--border-accent)] p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--bg-surface)] text-[var(--accent-link)] border border-[var(--border-accent)]">
                  <Moon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Lunar Phase & Muhurat</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{panchang.moonPhaseLabel}</p>
                </div>
              </div>
              <span className="text-sm font-bold tabular-nums text-[var(--accent-soft-text)]">
                {panchang.moonIllumination}%
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-accent)]/50">
                <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[var(--accent-link)]" />
                  Abhijit Muhurat (Auspicious)
                </span>
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">{panchang.abhijitMuhurat}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-accent)]/50">
                <span className="text-[var(--text-secondary)]">Yamaganda Kaal</span>
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">{panchang.yamaganda}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[var(--text-secondary)]">Gulika Kaal</span>
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">{panchang.gulikaKaal}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

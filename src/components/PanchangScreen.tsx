import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Moon,
  ShieldAlert,
  Star,
  Sun,
  Sunrise,
  Sunset,
} from 'lucide-react';
import { NepalTimeState } from '../hooks/useNepalTime';
import {
  addDaysToBs,
  BsDate,
  bsToAdParts,
  formatAdDateFull,
  formatBsDateNe,
  getNepalSambatYear,
  getWeekdayNameEn,
  getWeekdayNameNe,
  toDevanagari,
} from '../utils/nepaliDate';
import { calculatePanchang, getDailyRashifal } from '../utils/panchang';

interface PanchangScreenProps {
  nepalTime: NepalTimeState;
  preferredRashi: string;
  onSelectRashi: (rashiId: string) => void;
  onJumpToBsDate: (bs: { year: number; month: number; day: number }) => void;
}

export function PanchangScreen({
  nepalTime,
  preferredRashi,
  onSelectRashi,
  onJumpToBsDate,
}: PanchangScreenProps) {
  const [activeBs, setActiveBs] = useState<BsDate>(nepalTime.todayBs);

  const details = useMemo(() => {
    const ad = bsToAdParts(activeBs.year, activeBs.month, activeBs.day);
    const panchang = calculatePanchang(ad.year, ad.month, ad.day, ad.weekday);
    const rashifal = getDailyRashifal(ad.year, ad.month, ad.day);
    const nepalSambat = getNepalSambatYear(activeBs.year, activeBs.month);
    return { ad, panchang, rashifal, nepalSambat };
  }, [activeBs]);

  const activeRashi =
    details.rashifal.find((r) => r.id === preferredRashi) ?? details.rashifal[0];

  const handleStepDay = (delta: number) => {
    setActiveBs((prev) => addDaysToBs(prev, delta));
  };

  const isToday =
    activeBs.year === nepalTime.todayBs.year &&
    activeBs.month === nepalTime.todayBs.month &&
    activeBs.day === nepalTime.todayBs.day;

  const { panchang, ad, nepalSambat } = details;

  return (
    <div className="space-y-6 pb-8">
      {/* Date Navigation Header */}
      <section
        style={{ boxShadow: 'var(--card-shadow)' }}
        className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleStepDay(-1)}
              aria-label="Previous day"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--accent-soft-bg)] transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div>
              <h1 className="font-devanagari text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                {formatBsDateNe(activeBs)} · {getWeekdayNameNe(ad.weekday)}
              </h1>
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                {getWeekdayNameEn(ad.weekday)}, {formatAdDateFull(ad)} · नेपाल संवत् {toDevanagari(nepalSambat)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleStepDay(1)}
              aria-label="Next day"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--accent-soft-bg)] transition-colors cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isToday && (
              <button
                type="button"
                onClick={() => setActiveBs(nepalTime.todayBs)}
                className="h-11 px-4 rounded-xl bg-[var(--bg-surface-soft)] hover:bg-[var(--accent-soft-bg)] text-xs font-semibold text-[var(--accent-soft-text)] whitespace-nowrap transition-colors cursor-pointer"
              >
                Back to Today
              </button>
            )}
            <button
              type="button"
              onClick={() => onJumpToBsDate(activeBs)}
              className="h-11 px-4 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-xs font-semibold text-white whitespace-nowrap transition-colors cursor-pointer"
            >
              View in Calendar
            </button>
          </div>
        </div>
      </section>

      {/* Main Panchang & Muhurat 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 5-Limb Panchang & Sun/Moon Card */}
        <section
          style={{ boxShadow: 'var(--card-shadow)' }}
          className="lg:col-span-7 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-6"
        >
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--border-soft)]">
            <div className="flex items-center gap-3">
              <span
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, var(--card-highlight-from), var(--card-highlight-via))',
                }}
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-[var(--accent-secondary)] border border-[var(--border-accent)]"
              >
                <Compass className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Panchang Ephemeris · पञ्चाङ्ग</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {panchang.seasonNe} ({panchang.seasonEn}) · Kathmandu Coordinates
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-soft)]">
              <span className="text-[11px] font-medium text-[var(--text-muted)]">Tithi · तिथि</span>
              <p className="font-devanagari text-base font-bold text-[var(--text-primary)] mt-1">
                {panchang.fullTithiNe}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{panchang.tithiEn}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-soft)]">
              <span className="text-[11px] font-medium text-[var(--text-muted)]">Paksha · पक्ष</span>
              <p className="font-devanagari text-base font-bold text-[var(--text-primary)] mt-1">
                {panchang.pakshaNe}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{panchang.pakshaEn}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-soft)]">
              <span className="text-[11px] font-medium text-[var(--text-muted)]">Nakshatra · नक्षत्र</span>
              <p className="font-devanagari text-base font-bold text-[var(--text-primary)] mt-1">
                {panchang.nakshatraNe}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{panchang.nakshatraEn}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-soft)]">
              <span className="text-[11px] font-medium text-[var(--text-muted)]">Yoga · योग</span>
              <p className="font-devanagari text-base font-bold text-[var(--text-primary)] mt-1">
                {panchang.yogaNe}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{panchang.yogaEn}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-soft)]">
              <span className="text-[11px] font-medium text-[var(--text-muted)]">Karana · करण</span>
              <p className="font-devanagari text-base font-bold text-[var(--text-primary)] mt-1">
                {panchang.karanaNe}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{panchang.karanaEn}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-soft)]">
              <span className="text-[11px] font-medium text-[var(--text-muted)]">Moon Sign · चन्द्र राशि</span>
              <p className="font-devanagari text-base font-bold text-[var(--text-primary)] mt-1">
                {panchang.chandraRashiNe}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{panchang.chandraRashiEn}</p>
            </div>
          </div>

          {/* Sunrise / Sunset & Lunar Illumination */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] dark:bg-amber-950/40 dark:border-amber-800/60">
              <Sunrise className="h-5 w-5 text-[#B45309] dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-[11px] font-medium text-[#92400E] dark:text-amber-300">Sunrise · सूर्योदय</p>
                <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{panchang.sunrise}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--holiday-soft-bg)] border border-[var(--holiday-border)]">
              <Sunset className="h-5 w-5 text-[var(--holiday-soft-text)] shrink-0" />
              <div>
                <p className="text-[11px] font-medium text-[var(--holiday-soft-text)]">Sunset · सूर्यास्त</p>
                <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{panchang.sunset}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--accent-soft-bg)] border border-[var(--border-accent)]">
              <Moon className="h-5 w-5 text-[var(--accent-soft-text)] shrink-0" />
              <div>
                <p className="text-[11px] font-medium text-[var(--accent-soft-text)]">Lunar Phase</p>
                <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                  {panchang.moonIllumination}% · {panchang.moonPhaseLabel.split(' ')[0]}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Muhurat & Timings Card */}
        <section
          style={{ boxShadow: 'var(--card-shadow)' }}
          className="lg:col-span-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-soft)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#B45309] dark:bg-amber-950/60 dark:text-amber-300">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Shubha & Ashubha Kaal</h2>
              <p className="text-xs text-[var(--text-muted)]">Auspicious and cautionary windows</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] dark:bg-emerald-950/40 dark:border-emerald-800/60 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#065F46] dark:text-emerald-300 flex items-center gap-1.5">
                  <Sun className="h-3.5 w-3.5" /> Abhijit Muhurat (Auspicious)
                </p>
                <p className="text-[11px] text-[#047857] dark:text-emerald-400 mt-0.5">Best window for starting important work</p>
              </div>
              <span className="text-sm font-bold text-[#065F46] dark:text-emerald-200 tabular-nums whitespace-nowrap">
                {panchang.abhijitMuhurat}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--holiday-soft-bg)] border border-[var(--holiday-border)] flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[var(--holiday-soft-text)] flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" /> Rahu Kaal (Cautionary)
                </p>
                <p className="text-[11px] text-[var(--holiday-soft-text)] opacity-90 mt-0.5">Avoid launching new ceremonies or travel</p>
              </div>
              <span className="text-sm font-bold text-[var(--holiday-soft-text)] tabular-nums whitespace-nowrap">
                {panchang.rahuKaal}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-soft)] flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--text-secondary)]">Yamaganda Kaal</span>
              <span className="font-bold text-[var(--text-primary)] tabular-nums">{panchang.yamaganda}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-soft)] flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--text-secondary)]">Gulika Kaal</span>
              <span className="font-bold text-[var(--text-primary)] tabular-nums">{panchang.gulikaKaal}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-soft)] flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--text-secondary)]">Solar Transit (सूर्य राशि)</span>
              <span className="font-devanagari font-bold text-[var(--text-primary)]">{panchang.suryaRashiNe}</span>
            </div>
          </div>
        </section>
      </div>

      {/* DAILY RASHIFAL (12 ZODIAC SIGNS) */}
      <section
        style={{ boxShadow: 'var(--card-shadow)' }}
        className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[var(--border-soft)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Daily Rashifal <span className="font-devanagari text-[var(--accent-secondary)]">· दैनिक राशिफल</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Select your Nepali Rashi to view today’s guidance
            </p>
          </div>
          <span className="text-xs font-medium text-[var(--pill-sub)]">
            {formatBsDateNe(activeBs)}
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2 pt-4">
          {details.rashifal.map((r) => {
            const isSelected = r.id === activeRashi.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelectRashi(r.id)}
                style={
                  isSelected
                    ? {
                        backgroundImage:
                          'linear-gradient(135deg, var(--card-highlight-from), var(--card-highlight-via))',
                      }
                    : undefined
                }
                className={`min-h-[68px] flex flex-col items-center justify-center p-2 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--accent-link)] shadow-xs'
                    : 'bg-[var(--bg-surface-soft)] border-[var(--border-soft)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-accent)]'
                }`}
              >
                <span className="text-lg leading-none mb-1">{r.symbol}</span>
                <span className="font-devanagari text-xs font-bold text-[var(--text-primary)]">{r.nameNe}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Rashi Forecast Card */}
        <div
          style={{
            backgroundImage:
              'linear-gradient(135deg, var(--card-highlight-from), var(--card-highlight-via), var(--card-highlight-to))',
          }}
          className="mt-5 p-5 rounded-2xl border border-[var(--border-accent)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bg-surface)] text-2xl border border-[var(--border-accent)]">
                {activeRashi.symbol}
              </span>
              <div>
                <h3 className="font-devanagari text-lg font-bold text-[var(--text-primary)]">
                  {activeRashi.nameNe} · <span className="font-display text-base">{activeRashi.nameEn}</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Element: {activeRashi.element} · Lucky Color: {activeRashi.luckyColor} · Lucky Number: {activeRashi.luckyNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1" aria-label={`Favorability ${activeRashi.rating} out of 5`}>
              {Array.from({ length: 5 }, (_, idx) => (
                <Star
                  key={idx}
                  className={`h-4 w-4 ${
                    idx < activeRashi.rating
                      ? 'text-amber-500 fill-amber-400'
                      : 'text-[var(--border-subtle)]'
                  }`}
                />
              ))}
            </div>
          </div>

          <p className="text-sm text-[var(--text-primary)] leading-relaxed mt-2">
            {activeRashi.prediction}
          </p>
        </div>
      </section>
    </div>
  );
}

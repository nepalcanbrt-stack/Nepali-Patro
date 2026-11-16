import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, Compass, RefreshCw, Sparkles, Star } from 'lucide-react';
import { BsDate, formatBsDateNe } from '../utils/nepaliDate';
import {
  getDailyRashifal,
  resolvePrivateDailyRashifal,
} from '../utils/panchang';

interface DailyRashifalCardProps {
  preferredRashi: string;
  todayAd: { year: number; month: number; day: number };
  todayBs: BsDate;
  onSelectRashi: (rashiId: string) => void;
  onViewAllRashis: () => void;
}

export function DailyRashifalCard({
  preferredRashi,
  todayAd,
  todayBs,
  onSelectRashi,
  onViewAllRashis,
}: DailyRashifalCardProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const allRashis = useMemo(
    () => getDailyRashifal(todayAd.year, todayAd.month, todayAd.day),
    [todayAd.year, todayAd.month, todayAd.day]
  );

  const forecast = useMemo(
    () => resolvePrivateDailyRashifal(preferredRashi, todayAd.year, todayAd.month, todayAd.day),
    // refreshTick gives instant visual feedback when user clicks refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preferredRashi, todayAd.year, todayAd.month, todayAd.day, refreshTick]
  );

  return (
    <section
      style={{
        boxShadow: 'var(--card-shadow)',
        backgroundImage:
          'linear-gradient(155deg, var(--card-highlight-from), var(--bg-surface) 48%, var(--bg-surface))',
      }}
      aria-label="Daily Rashifal Horoscope"
      className="rounded-3xl border border-[var(--border-accent)] p-5 sm:p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[var(--border-soft)]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--bg-surface)] text-2xl border border-[var(--border-accent)] shadow-xs">
            {forecast.symbol}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight">
              Daily Rashifal <span className="font-devanagari text-[var(--accent-secondary)]">· आजको राशिफल</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
              Saved Rashi: <strong className="font-devanagari text-[var(--text-primary)]">{forecast.nameNe}</strong> ({forecast.nameEn}) · {formatBsDateNe(todayBs)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="h-10 px-3 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--accent-soft-bg)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--accent-soft-text)] transition-colors cursor-pointer"
          >
            {showPicker ? 'Done' : 'Change Rashi'}
          </button>

          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            aria-label="Refresh daily horoscope"
            title="Refresh daily horoscope"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--accent-soft-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expandable Inline Rashi Preference Switcher */}
      <AnimatePresence initial={false}>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 p-2.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)]"
          >
            {allRashis.map((r) => {
              const selected = r.id === forecast.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onSelectRashi(r.id);
                    setShowPicker(false);
                  }}
                  className={`min-h-[54px] flex flex-col items-center justify-center p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                    selected
                      ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white shadow-xs'
                      : 'bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)] hover:border-[var(--border-accent)]'
                  }`}
                >
                  <span className="text-base leading-none">{r.symbol}</span>
                  <span className="font-devanagari text-[11px] font-bold mt-1 leading-none">
                    {r.nameNe}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Forecast Body */}
      <motion.div
        key={`${forecast.id}-${refreshTick}`}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.16 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent-link)]" />
            <span className="font-semibold text-[var(--text-primary)]">{forecast.focusArea}</span>
            <span aria-hidden="true">·</span>
            <span>{forecast.element} Element</span>
            <span aria-hidden="true">·</span>
            <span className="text-[var(--text-muted)]">Nepal Panchang</span>
          </div>

          <div className="flex items-center gap-0.5" aria-label={`Favorability ${forecast.rating} out of 5`}>
            {Array.from({ length: 5 }, (_, idx) => (
              <Star
                key={idx}
                className={`h-3.5 w-3.5 ${
                  idx < forecast.rating
                    ? 'text-amber-500 fill-amber-400'
                    : 'text-[var(--border-subtle)]'
                }`}
              />
            ))}
          </div>
        </div>

        <p className="font-devanagari text-sm font-semibold text-[var(--text-primary)] leading-relaxed">
          {forecast.predictionNe}
        </p>
        <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] leading-relaxed">
          {forecast.prediction}
        </p>

        {/* Quick Auspicious Guidance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="p-2.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-soft)]">
            <p className="text-[10px] font-medium text-[var(--text-muted)]">Lucky Color</p>
            <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">{forecast.luckyColor}</p>
          </div>
          <div className="p-2.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-soft)]">
            <p className="text-[10px] font-medium text-[var(--text-muted)]">Lucky Number</p>
            <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">
              {forecast.luckyNumber}
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-soft)]">
            <p className="text-[10px] font-medium text-[var(--text-muted)]">Best Direction</p>
            <p className="font-devanagari text-xs font-bold text-[var(--text-primary)] mt-0.5 truncate">
              {forecast.luckyDirection}
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-soft)]">
            <p className="text-[10px] font-medium text-[var(--text-muted)]">Shubha Time</p>
            <p className="text-[11px] font-bold text-[var(--text-primary)] mt-0.5 tabular-nums truncate">
              {forecast.luckyTime}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Footer Link */}
      <div className="pt-2 border-t border-[var(--border-soft)] flex items-center justify-between gap-3">
        <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
          <Compass className="h-3.5 w-3.5 text-[var(--accent-link)]" />
          Private offline Jyotish guidance
        </span>
        <button
          type="button"
          onClick={onViewAllRashis}
          className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent-link)] hover:underline cursor-pointer"
        >
          View All 12 Rashis
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sunrise,
  Sunset,
  Trash2,
} from 'lucide-react';
import {
  AD_MONTHS_SHORT,
  BS_END_YEAR,
  BS_MONTHS_EN,
  BS_MONTHS_NE,
  BS_START_YEAR,
  FestivalEvent,
  NEPALI_FESTIVALS,
  WEEKDAYS_EN_SHORT,
  WEEKDAYS_NE_SHORT,
} from '../data/bsCalendarData';
import { NepalTimeState } from '../hooks/useNepalTime';
import { UserNote } from '../types/app';
import {
  PATRO_EASE,
  PATRO_SPRING_SNAPPY,
  staggerCardVariants,
  staggerContainerVariants,
} from '../utils/motionVariants';
import {
  bsToAdParts,
  bsToKey,
  formatAdDateFull,
  formatBsDateNe,
  getDaysInBsMonth,
  getWeekdayNameNe,
  toDevanagari,
} from '../utils/nepaliDate';
import { calculatePanchang } from '../utils/panchang';

interface CalendarScreenProps {
  nepalTime: NepalTimeState;
  selectedBs: { year: number; month: number; day: number };
  viewYear: number;
  viewMonth: number;
  useDevanagariNums: boolean;
  onToggleDevanagariNums: () => void;
  onSelectBs: (bs: { year: number; month: number; day: number }) => void;
  onChangeMonth: (year: number, month: number) => void;
  notes: UserNote[];
  onOpenNoteModal: (bs: { year: number; month: number; day: number }) => void;
  onDeleteNote: (id: string) => void;
}

type CalendarFilter = 'all' | 'festivals' | 'holidays' | 'notes';

export function CalendarScreen({
  nepalTime,
  selectedBs,
  viewYear,
  viewMonth,
  useDevanagariNums,
  onToggleDevanagariNums,
  onSelectBs,
  onChangeMonth,
  notes,
  onOpenNoteModal,
  onDeleteNote,
}: CalendarScreenProps) {
  const [filter, setFilter] = useState<CalendarFilter>('all');

  const { todayBs } = nepalTime;
  const daysInMonth = getDaysInBsMonth(viewYear, viewMonth);

  // Build month cells
  const calendarGrid = useMemo(() => {
    const firstAd = bsToAdParts(viewYear, viewMonth, 1);
    const startWeekday = firstAd.weekday; // 0 (Sun)..6 (Sat)
    const cells: Array<{
      bsDay: number;
      weekday: number;
      adYear: number;
      adMonth: number;
      adDay: number;
      tithiShort: string;
      events: FestivalEvent[];
      dayNotes: UserNote[];
      isHoliday: boolean;
      isToday: boolean;
      isSelected: boolean;
    } | null> = [];

    for (let i = 0; i < startWeekday; i++) cells.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const ad = bsToAdParts(viewYear, viewMonth, d);
      const panchang = calculatePanchang(ad.year, ad.month, ad.day, ad.weekday);
      const key = bsToKey(viewYear, viewMonth, d);

      const events = NEPALI_FESTIVALS.filter(
        (f) =>
          f.bsMonth === viewMonth &&
          f.bsDay === d &&
          (f.bsYear === undefined || f.bsYear === viewYear)
      );
      const dayNotes = notes.filter((n) => n.bsKey === key);
      const isHoliday = ad.weekday === 6 || events.some((e) => e.isPublicHoliday);

      cells.push({
        bsDay: d,
        weekday: ad.weekday,
        adYear: ad.year,
        adMonth: ad.month,
        adDay: ad.day,
        tithiShort: panchang.tithiNe,
        events,
        dayNotes,
        isHoliday,
        isToday:
          todayBs.year === viewYear && todayBs.month === viewMonth && todayBs.day === d,
        isSelected:
          selectedBs.year === viewYear &&
          selectedBs.month === viewMonth &&
          selectedBs.day === d,
      });
    }
    return cells;
  }, [viewYear, viewMonth, daysInMonth, notes, todayBs, selectedBs]);

  // English month span caption (e.g., Kartik / Mangsir -> Oct/Nov 2026)
  const adSpanLabel = useMemo(() => {
    const first = bsToAdParts(viewYear, viewMonth, 1);
    const last = bsToAdParts(viewYear, viewMonth, daysInMonth);
    if (first.month === last.month && first.year === last.year) {
      return `${AD_MONTHS_SHORT[first.month - 1]} ${first.year}`;
    }
    if (first.year === last.year) {
      return `${AD_MONTHS_SHORT[first.month - 1]} / ${AD_MONTHS_SHORT[last.month - 1]} ${first.year}`;
    }
    return `${AD_MONTHS_SHORT[first.month - 1]} ${first.year} – ${AD_MONTHS_SHORT[last.month - 1]} ${last.year}`;
  }, [viewYear, viewMonth, daysInMonth]);

  // Selected Day Details
  const selectedDetails = useMemo(() => {
    const ad = bsToAdParts(selectedBs.year, selectedBs.month, selectedBs.day);
    const panchang = calculatePanchang(ad.year, ad.month, ad.day, ad.weekday);
    const events = NEPALI_FESTIVALS.filter(
      (f) =>
        f.bsMonth === selectedBs.month &&
        f.bsDay === selectedBs.day &&
        (f.bsYear === undefined || f.bsYear === selectedBs.year)
    );
    const dayNotes = notes.filter(
      (n) => n.bsKey === bsToKey(selectedBs.year, selectedBs.month, selectedBs.day)
    );
    return { ad, panchang, events, dayNotes };
  }, [selectedBs, notes]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      if (viewYear > BS_START_YEAR) onChangeMonth(viewYear - 1, 12);
    } else {
      onChangeMonth(viewYear, viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      if (viewYear < BS_END_YEAR) onChangeMonth(viewYear + 1, 1);
    } else {
      onChangeMonth(viewYear, viewMonth + 1);
    }
  };

  const handleJumpToday = () => {
    onChangeMonth(todayBs.year, todayBs.month);
    onSelectBs({ year: todayBs.year, month: todayBs.month, day: todayBs.day });
  };

  const monthFestivals = useMemo(() => {
    return NEPALI_FESTIVALS.filter(
      (f) => f.bsMonth === viewMonth && (f.bsYear === undefined || f.bsYear === viewYear)
    ).sort((a, b) => a.bsDay - b.bsDay);
  }, [viewYear, viewMonth]);

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 pb-8"
    >
      {/* Calendar Header Controls */}
      <motion.section
        variants={staggerCardVariants}
        style={{ boxShadow: 'var(--card-shadow)' }}
        className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--accent-soft-bg)] active:scale-[0.94] transition-all cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="text-center sm:text-left px-2">
              <h1 className="font-devanagari text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                {BS_MONTHS_NE[viewMonth - 1]} {toDevanagari(viewYear)}
                <span className="font-display text-base sm:text-lg font-semibold text-[var(--text-muted)] ml-2">
                  {BS_MONTHS_EN[viewMonth - 1]}
                </span>
              </h1>
              <p className="text-xs font-medium text-[var(--pill-sub)]">{adSpanLabel}</p>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--accent-soft-bg)] active:scale-[0.94] transition-all cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <select
              aria-label="Select Bikram Sambat Year"
              value={viewYear}
              onChange={(e) => onChangeMonth(Number(e.target.value), viewMonth)}
              className="h-11 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
            >
              {Array.from({ length: BS_END_YEAR - BS_START_YEAR + 1 }, (_, i) => BS_START_YEAR + i).map(
                (y) => (
                  <option key={y} value={y}>
                    {y} BS
                  </option>
                )
              )}
            </select>

            <select
              aria-label="Select Bikram Sambat Month"
              value={viewMonth}
              onChange={(e) => onChangeMonth(viewYear, Number(e.target.value))}
              className="h-11 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
            >
              {BS_MONTHS_EN.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {BS_MONTHS_NE[idx]} ({m})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onToggleDevanagariNums}
              className="h-11 px-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] hover:bg-[var(--accent-soft-bg)] text-xs font-semibold text-[var(--accent-link)] whitespace-nowrap transition-colors cursor-pointer"
            >
              {useDevanagariNums ? '१२३ → 123' : '123 → १२३'}
            </button>

            <button
              type="button"
              onClick={handleJumpToday}
              className="h-11 px-4 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-xs font-semibold text-white whitespace-nowrap transition-colors cursor-pointer"
            >
              आज · Today
            </button>
          </div>
        </div>

        {/* Highlight Filter Segmented Tabs */}
        <div className="mt-4 pt-3 border-t border-[var(--border-soft)] flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface-soft)]">
            {(
              [
                ['all', 'All Days'],
                ['festivals', 'Festivals'],
                ['holidays', 'Holidays'],
                ['notes', 'My Notes'],
              ] as const
            ).map(([val, label]) => {
              const isActive = filter === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFilter(val)}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap active:scale-[0.97] transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="calendar-filter-pill"
                      transition={PATRO_SPRING_SNAPPY}
                      className="absolute inset-0 rounded-lg bg-[var(--bg-surface)] shadow-xs"
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-secondary)]" /> Holiday / Saturday
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-link)]" /> Event / Note
            </span>
          </div>
        </div>
      </motion.section>

      {/* CALENDAR GRID + SELECTED DAY INSPECTOR */}
      <motion.div
        variants={staggerCardVariants}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* Monthly Grid (8 cols on desktop) */}
        <section
          style={{ boxShadow: 'var(--card-shadow)' }}
          className="lg:col-span-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 sm:p-5"
        >
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 pb-2 mb-2 border-b border-[var(--border-soft)]">
            {WEEKDAYS_NE_SHORT.map((wNe, idx) => (
              <div key={wNe} className="text-center py-1">
                <span
                  className={`block font-devanagari text-xs sm:text-sm font-bold ${
                    idx === 6 ? 'text-[var(--accent-secondary)]' : 'text-[var(--text-primary)]'
                  }`}
                >
                  {wNe}
                </span>
                <span className="block text-[10px] font-medium text-[var(--text-muted)]">
                  {WEEKDAYS_EN_SHORT[idx]}
                </span>
              </div>
            ))}
          </div>

          {/* Days Matrix */}
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            initial={{ opacity: 0.35, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: PATRO_EASE }}
            className="grid grid-cols-7 gap-1 sm:gap-2"
          >
            {calendarGrid.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="min-h-[62px] sm:min-h-[82px]" />;
              }

              const matchesFilter =
                filter === 'all' ||
                (filter === 'festivals' && cell.events.length > 0) ||
                (filter === 'holidays' && cell.isHoliday) ||
                (filter === 'notes' && cell.dayNotes.length > 0);

              const hasEvents = cell.events.length > 0;
              const hasNotes = cell.dayNotes.length > 0;

              return (
                <button
                  key={cell.bsDay}
                  type="button"
                  onClick={() =>
                    onSelectBs({ year: viewYear, month: viewMonth, day: cell.bsDay })
                  }
                  style={
                    cell.isSelected
                      ? {
                          backgroundImage:
                            'linear-gradient(135deg, var(--card-highlight-from), var(--card-highlight-via))',
                        }
                      : undefined
                  }
                  className={`relative min-h-[62px] sm:min-h-[82px] flex flex-col justify-between p-1.5 sm:p-2 rounded-2xl border text-left transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-link)] ${
                    cell.isSelected
                      ? 'border-[var(--accent-link)] shadow-sm'
                      : cell.isToday
                      ? 'bg-[var(--holiday-soft-bg)] border-[var(--holiday-border)]'
                      : 'bg-[var(--bg-surface-soft)]/70 border-[var(--border-soft)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-accent)]'
                  } ${!matchesFilter ? 'opacity-35' : 'opacity-100'}`}
                >
                  <div className="flex items-start justify-between w-full gap-1">
                    <span
                      className={`font-devanagari text-base sm:text-xl font-bold leading-none tabular-nums ${
                        cell.isHoliday
                          ? 'text-[var(--holiday-soft-text)]'
                          : cell.isSelected
                          ? 'text-[var(--accent-link)]'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {useDevanagariNums ? toDevanagari(cell.bsDay) : cell.bsDay}
                    </span>

                    <span className="text-[10px] font-medium text-[var(--text-muted)] tabular-nums leading-none">
                      {cell.adDay}
                    </span>
                  </div>

                  {/* Tithi / Festival Preview */}
                  <div className="mt-1 space-y-0.5 min-w-0">
                    {hasEvents ? (
                      <p
                        className={`font-devanagari text-[9px] sm:text-[10px] truncate ${
                          cell.events.some((e) => e.category === 'ekadashi')
                            ? 'font-extrabold text-[#B45309] dark:text-amber-300'
                            : 'font-semibold text-[var(--accent-secondary)]'
                        }`}
                      >
                        {cell.events[0].titleNe}
                      </p>
                    ) : (
                      <p className="hidden sm:block font-devanagari text-[10px] text-[var(--text-muted)] truncate">
                        {cell.tithiShort}
                      </p>
                    )}

                    <div className="flex items-center gap-1 pt-0.5">
                      {cell.isToday && (
                        <span className="text-[9px] font-bold text-[var(--accent-secondary)] uppercase tracking-tight">
                          Today
                        </span>
                      )}
                      {hasNotes && (
                        <span
                          aria-label="Has personal note"
                          className="h-1.5 w-1.5 rounded-full bg-[var(--accent-link)]"
                        />
                      )}
                      {hasEvents && !cell.isToday && (
                        <span
                          aria-label="Has festival"
                          className="h-1.5 w-1.5 rounded-full bg-[var(--accent-secondary)] sm:hidden"
                        />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </motion.div>
        </section>

        {/* Selected Day Details Panel (4 cols on desktop) */}
        <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
          <div
            style={{ boxShadow: 'var(--card-shadow)' }}
            className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5"
          >
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[var(--border-soft)]">
              <div>
                <p className="text-xs font-semibold text-[var(--pill-sub)]">
                  {formatAdDateFull(selectedDetails.ad)}
                </p>
                <h2 className="font-devanagari text-2xl font-bold text-[var(--text-primary)] mt-0.5">
                  {formatBsDateNe(selectedBs)}
                </h2>
                <p className="font-devanagari text-sm font-semibold text-[var(--accent-secondary)]">
                  {getWeekdayNameNe(selectedDetails.ad.weekday)} · {selectedDetails.panchang.fullTithiNe}
                </p>
              </div>
              <span
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, var(--card-highlight-from), var(--card-highlight-via))',
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[var(--accent-link)] border border-[var(--border-accent)]"
              >
                <CalendarIcon className="h-5 w-5" />
              </span>
            </div>

            {/* Day Panchang Snapshot */}
            <div className="grid grid-cols-2 gap-3 py-4 border-b border-[var(--border-soft)] text-xs">
              <div>
                <span className="text-[var(--text-muted)] block">Nakshatra</span>
                <span className="font-devanagari font-bold text-[var(--text-primary)]">
                  {selectedDetails.panchang.nakshatraNe} ({selectedDetails.panchang.nakshatraEn})
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block">Yoga / Karana</span>
                <span className="font-devanagari font-bold text-[var(--text-primary)]">
                  {selectedDetails.panchang.yogaNe} · {selectedDetails.panchang.karanaNe}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sunrise className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                  {selectedDetails.panchang.sunrise}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sunset className="h-3.5 w-3.5 text-[var(--accent-secondary)]" />
                <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                  {selectedDetails.panchang.sunset}
                </span>
              </div>
            </div>

            {/* Festivals on Selected Day */}
            {selectedDetails.events.length > 0 && (
              <div className="py-4 border-b border-[var(--border-soft)] space-y-2">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Observances & Holidays</h3>
                {selectedDetails.events.map((ev) => {
                  const isEkadashi = ev.category === 'ekadashi';
                  return (
                    <div
                      key={ev.id}
                      className={`p-3 rounded-2xl border ${
                        isEkadashi
                          ? 'bg-[#FFFBEB] border-[#F59E0B]/45 dark:bg-amber-950/50 dark:border-amber-500/40'
                          : 'bg-[var(--holiday-soft-bg)] border-[var(--holiday-border)]'
                      }`}
                    >
                      <p
                        className={`font-devanagari ${
                          isEkadashi
                            ? 'text-base font-extrabold text-[#92400E] dark:text-amber-200'
                            : 'text-sm font-bold text-[var(--holiday-soft-text)]'
                        }`}
                      >
                        {ev.titleNe}
                      </p>
                      <p
                        className={`text-xs ${
                          isEkadashi
                            ? 'font-bold text-[var(--text-primary)]'
                            : 'font-medium text-[var(--text-primary)]'
                        }`}
                      >
                        {ev.titleEn}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{ev.description}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Personal Notes on Selected Day */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)]">
                  Personal Notes ({selectedDetails.dayNotes.length})
                </h3>
                <button
                  type="button"
                  onClick={() => onOpenNoteModal(selectedBs)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-xs font-semibold text-white hover:bg-[var(--accent-primary-hover)] transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Note
                </button>
              </div>

              {selectedDetails.dayNotes.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-3 text-center bg-[var(--bg-surface-soft)] rounded-2xl border border-dashed border-[var(--border-subtle)]">
                  No personal notes on this date yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedDetails.dayNotes.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start justify-between gap-2 p-3 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{n.title}</p>
                        {n.time && <p className="text-[11px] font-medium text-[var(--accent-link)]">{n.time}</p>}
                        {n.note && <p className="text-xs text-[var(--text-secondary)] mt-1">{n.note}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(n.id)}
                        aria-label={`Delete ${n.title}`}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--holiday-soft-text)] hover:bg-[var(--holiday-soft-bg)] transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Month Holidays Summary List */}
          {monthFestivals.length > 0 && (
            <div className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">
                {BS_MONTHS_EN[viewMonth - 1]} Festivals & Holidays
              </h3>
              <div className="space-y-2">
                {monthFestivals.map((f) => {
                  const isEkadashi = f.category === 'ekadashi';
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onSelectBs({ year: viewYear, month: viewMonth, day: f.bsDay })}
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-[var(--bg-surface-soft)] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p
                          className={`font-devanagari text-xs truncate ${
                            isEkadashi
                              ? 'font-extrabold text-[#B45309] dark:text-amber-300'
                              : 'font-bold text-[var(--text-primary)]'
                          }`}
                        >
                          {toDevanagari(f.bsDay)} {BS_MONTHS_NE[viewMonth - 1]} · {f.titleNe}
                        </p>
                        <p
                          className={`text-[11px] truncate ${
                            isEkadashi ? 'font-bold text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {f.titleEn}
                        </p>
                      </div>
                      {f.isPublicHoliday && (
                        <span className="text-[10px] font-semibold text-[var(--accent-secondary)] whitespace-nowrap">
                          Holiday
                        </span>
                      )}
                      {isEkadashi && (
                        <span className="text-[10px] font-extrabold text-[#B45309] dark:text-amber-300 whitespace-nowrap">
                          Ekadashi
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </motion.div>
    </motion.div>
  );
}

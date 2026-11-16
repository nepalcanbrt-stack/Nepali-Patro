import { useMemo, useState } from 'react';
import { CalendarDays, Cloud, LogIn, Plus, Search, Trash2 } from 'lucide-react';
import festivalLampsHero from '../assets/images/nepali_festival_lamps_1794569026377.jpg';
import { useFirebase } from '../contexts/FirebaseContext';
import { BS_MONTHS_EN, BS_MONTHS_NE, NEPALI_FESTIVALS } from '../data/bsCalendarData';
import { NepalTimeState } from '../hooks/useNepalTime';
import { UserNote } from '../types/app';
import {
  bsToAdParts,
  diffBsDays,
  formatAdDateShort,
  formatBsDateNe,
  parseBsKey,
  toDevanagari,
} from '../utils/nepaliDate';

interface FestivalsScreenProps {
  nepalTime: NepalTimeState;
  notes: UserNote[];
  isCloudSynced: boolean;
  onJumpToBsDate: (bs: { year: number; month: number; day: number }) => void;
  onOpenNoteModal: (bs?: { year: number; month: number; day: number }) => void;
  onDeleteNote: (id: string) => void;
  onOpenLogin: () => void;
}

type CategoryTab = 'all' | 'holiday' | 'festival' | 'ekadashi' | 'notes';

export function FestivalsScreen({
  nepalTime,
  notes,
  isCloudSynced,
  onJumpToBsDate,
  onOpenNoteModal,
  onDeleteNote,
  onOpenLogin,
}: FestivalsScreenProps) {
  const { authBusy, isVerifiedIdentity } = useFirebase();
  const { todayBs } = nepalTime;
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<CategoryTab>('all');

  const resolvedFestivals = useMemo(() => {
    return NEPALI_FESTIVALS.map((f) => {
      const candidateYears = f.bsYear ? [f.bsYear] : [todayBs.year, todayBs.year + 1];
      let chosenYear = candidateYears[0];
      let daysUntil = diffBsDays(todayBs, {
        year: chosenYear,
        month: f.bsMonth,
        day: f.bsDay,
      });
      if (!f.bsYear && daysUntil < 0) {
        chosenYear = todayBs.year + 1;
        daysUntil = diffBsDays(todayBs, {
          year: chosenYear,
          month: f.bsMonth,
          day: f.bsDay,
        });
      }
      const ad = bsToAdParts(chosenYear, f.bsMonth, f.bsDay);
      return {
        ...f,
        resolvedYear: chosenYear,
        daysUntil,
        adFormatted: formatAdDateShort(ad),
      };
    }).sort((a, b) => {
      // Upcoming first, then past in year
      if (a.daysUntil >= 0 && b.daysUntil >= 0) return a.daysUntil - b.daysUntil;
      if (a.daysUntil >= 0) return -1;
      if (b.daysUntil >= 0) return 1;
      return b.daysUntil - a.daysUntil;
    });
  }, [todayBs]);

  const filteredFestivals = useMemo(() => {
    if (tab === 'notes') return [];
    const q = search.trim().toLowerCase();
    return resolvedFestivals.filter((f) => {
      const matchesTab =
        tab === 'all' ||
        (tab === 'holiday' && f.isPublicHoliday) ||
        (tab === 'festival' && f.category === 'festival') ||
        (tab === 'ekadashi' && (f.category === 'ekadashi' || f.category === 'observance'));
      const matchesSearch =
        !q ||
        f.titleEn.toLowerCase().includes(q) ||
        f.titleNe.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [resolvedFestivals, tab, search]);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter(
      (n) =>
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.note.toLowerCase().includes(q)
    );
  }, [notes, search]);

  return (
    <div className="space-y-6 pb-8">
      {/* Cultural Banner Header */}
      <section
        style={{
          backgroundImage: 'linear-gradient(to right, var(--hero-from), var(--hero-to))',
          boxShadow: 'var(--card-shadow)',
        }}
        className="relative overflow-hidden rounded-3xl border border-[var(--border-subtle)]"
      >
        <img
          src={festivalLampsHero}
          alt="Traditional Nepali brass diyo lamps and marigold garlands at twilight"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-75"
        />
        <div
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(to right, color-mix(in srgb, var(--hero-from) 88%, transparent), color-mix(in srgb, var(--hero-via) 70%, transparent), color-mix(in srgb, var(--hero-from) 55%, transparent))',
          }}
          className="absolute inset-0"
        />
        <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#FBCFE8]">
              Bikram Sambat {toDevanagari(todayBs.year)} · Cultural Calendar
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Nepali Festivals & Holidays
            </h1>
            <p className="text-sm text-white/90 mt-1 max-w-xl">
              Explore upcoming national holidays, cultural jatras, Ekadashi observances, and manage your personal notes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenNoteModal(todayBs)}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-white text-[#1E1B2E] text-xs font-bold hover:bg-white/90 whitespace-nowrap shrink-0 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Personal Event
          </button>
        </div>
      </section>

      {/* Search & Category Filter Controls */}
      <section
        style={{ boxShadow: 'var(--card-shadow)' }}
        className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Dashain, Tihar, Lhosar, Holiday..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface-soft)] overflow-x-auto no-scrollbar">
            {(
              [
                ['all', 'All'],
                ['holiday', 'Public Holidays'],
                ['festival', 'Festivals'],
                ['ekadashi', 'Ekadashi & Vrat'],
                ['notes', `My Notes (${notes.length})`],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setTab(val)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  tab === val
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Personal Notes Section when My Notes selected or searching */}
      {(tab === 'notes' || (tab === 'all' && filteredNotes.length > 0)) && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              Personal Notes & Reminders ({filteredNotes.length})
              {isCloudSynced && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-soft-text)]">
                  <Cloud className="h-3.5 w-3.5" /> Synced
                </span>
              )}
            </h2>
            {!isVerifiedIdentity && (
              <button
                type="button"
                onClick={onOpenLogin}
                disabled={authBusy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-surface-soft)] hover:bg-[var(--accent-soft-bg)] text-xs font-semibold text-[var(--accent-link)] transition-colors cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign in (Gmail / Phone) to Sync
              </button>
            )}
          </div>

          {filteredNotes.length === 0 ? (
            <div className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-8 text-center">
              <p className="text-sm text-[var(--text-muted)]">No personal notes match your view yet.</p>
              <button
                type="button"
                onClick={() => onOpenNoteModal(todayBs)}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-xs font-semibold text-white cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Create First Note
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredNotes.map((n) => {
                const parsed = parseBsKey(n.bsKey);
                return (
                  <div
                    key={n.id}
                    className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 flex items-start justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => onJumpToBsDate(parsed)}
                      className="min-w-0 text-left flex-1 cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-[var(--accent-link)] font-devanagari">
                        {formatBsDateNe(parsed)}
                        {n.time ? ` · ${n.time}` : ''}
                      </p>
                      <h3 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{n.title}</h3>
                      {n.note && <p className="text-xs text-[var(--text-secondary)] mt-1">{n.note}</p>}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(n.id)}
                      aria-label={`Delete ${n.title}`}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--holiday-soft-text)] hover:bg-[var(--holiday-soft-bg)] transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Festivals Directory Grid */}
      {tab !== 'notes' && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFestivals.map((fest) => {
            const isEkadashi = fest.category === 'ekadashi';
            return (
              <button
                key={`${fest.id}-${fest.resolvedYear}`}
                type="button"
                onClick={() =>
                  onJumpToBsDate({
                    year: fest.resolvedYear,
                    month: fest.bsMonth,
                    day: fest.bsDay,
                  })
                }
                style={{ boxShadow: 'var(--card-shadow)' }}
                className={`group text-left rounded-3xl bg-[var(--bg-surface)] border p-5 transition-all cursor-pointer flex items-start gap-4 ${
                  isEkadashi
                    ? 'border-[#F59E0B]/45 hover:border-[#D97706]'
                    : 'border-[var(--border-subtle)] hover:border-[var(--border-accent)]'
                }`}
              >
                <div
                  className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl shrink-0 ${
                    fest.isPublicHoliday
                      ? 'bg-[var(--holiday-soft-bg)] text-[var(--holiday-soft-text)]'
                      : isEkadashi
                      ? 'bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]/40 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-500/40'
                      : 'bg-[var(--accent-soft-bg)] text-[var(--accent-soft-text)]'
                  }`}
                >
                  <span className="font-devanagari text-xl font-extrabold leading-none tabular-nums">
                    {toDevanagari(fest.bsDay)}
                  </span>
                  <span className="font-devanagari text-[11px] font-bold mt-1">
                    {BS_MONTHS_NE[fest.bsMonth - 1]}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3
                        className={`font-devanagari text-base truncate ${
                          isEkadashi
                            ? 'font-extrabold text-[#B45309] dark:text-amber-300'
                            : 'font-bold text-[var(--text-primary)]'
                        }`}
                      >
                        {fest.titleNe}
                      </h3>
                      <p
                        className={`text-xs truncate ${
                          isEkadashi
                            ? 'font-bold text-[var(--text-primary)]'
                            : 'font-semibold text-[var(--text-secondary)]'
                        }`}
                      >
                        {fest.titleEn}
                      </p>
                    </div>

                    <span className="text-xs font-bold text-[var(--pill-sub)] whitespace-nowrap shrink-0 tabular-nums">
                      {fest.daysUntil === 0
                        ? 'Today'
                        : fest.daysUntil > 0
                        ? `${fest.daysUntil}d left`
                        : `${Math.abs(fest.daysUntil)}d ago`}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-muted)] mt-2 line-clamp-2 leading-relaxed">
                    {fest.description}
                  </p>

                  <div className="mt-2.5 flex items-center gap-2 text-[11px] text-[var(--text-secondary)] flex-wrap">
                    <CalendarDays className="h-3.5 w-3.5 text-[var(--accent-link)]" />
                    <span>
                      {BS_MONTHS_EN[fest.bsMonth - 1]} {fest.bsDay}, {fest.resolvedYear} BS · {fest.adFormatted}
                    </span>
                    {fest.isPublicHoliday && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-[var(--accent-secondary)]">Public Holiday</span>
                      </>
                    )}
                    {isEkadashi && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-extrabold text-[#B45309] dark:text-amber-300">
                          एकादशी व्रत · Ekadashi
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}

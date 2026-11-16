import { useMemo, useState } from 'react';
import { ArrowLeftRight, Calendar, Copy, Check } from 'lucide-react';
import {
  BS_END_YEAR,
  BS_MONTHS_EN,
  BS_MONTHS_NE,
  BS_START_YEAR,
} from '../data/bsCalendarData';
import { NepalTimeState } from '../hooks/useNepalTime';
import {
  adPartsToBs,
  bsToAdParts,
  diffBsDays,
  formatAdDateFull,
  formatBsDateEn,
  formatBsDateNe,
  getDaysInBsMonth,
  getNepalSambatYear,
  getWeekdayNameEn,
  getWeekdayNameNe,
  toDevanagari,
} from '../utils/nepaliDate';
import { calculatePanchang } from '../utils/panchang';

interface ConverterScreenProps {
  nepalTime: NepalTimeState;
  onJumpToBsDate: (bs: { year: number; month: number; day: number }) => void;
}

export function ConverterScreen({ nepalTime, onJumpToBsDate }: ConverterScreenProps) {
  const { todayBs, todayAd } = nepalTime;
  const [mode, setMode] = useState<'bs-to-ad' | 'ad-to-bs'>('bs-to-ad');
  const [copied, setCopied] = useState(false);

  // BS input state
  const [bsYear, setBsYear] = useState(todayBs.year);
  const [bsMonth, setBsMonth] = useState(todayBs.month);
  const [bsDay, setBsDay] = useState(todayBs.day);

  // AD input state (YYYY-MM-DD)
  const initialAdIso = `${todayAd.year}-${String(todayAd.month).padStart(2, '0')}-${String(
    todayAd.day
  ).padStart(2, '0')}`;
  const [adIso, setAdIso] = useState(initialAdIso);

  const maxBsDays = getDaysInBsMonth(bsYear, bsMonth);
  const safeBsDay = Math.min(bsDay, maxBsDays);

  const result = useMemo(() => {
    if (mode === 'bs-to-ad') {
      const ad = bsToAdParts(bsYear, bsMonth, safeBsDay);
      const bs = { year: bsYear, month: bsMonth, day: safeBsDay, weekday: ad.weekday };
      const panchang = calculatePanchang(ad.year, ad.month, ad.day, ad.weekday);
      return { bs, ad, panchang };
    }

    const parts = adIso.split('-').map(Number);
    const y = parts[0] || todayAd.year;
    const m = parts[1] || todayAd.month;
    const d = parts[2] || todayAd.day;
    const clampedYear = Math.min(Math.max(y, 1944), 2033);
    const bs = adPartsToBs(clampedYear, m, d);
    const ad = { year: clampedYear, month: m, day: d, weekday: bs.weekday };
    const panchang = calculatePanchang(ad.year, ad.month, ad.day, ad.weekday);
    return { bs, ad, panchang };
  }, [mode, bsYear, bsMonth, safeBsDay, adIso, todayAd]);

  const daysFromToday = diffBsDays(todayBs, result.bs);
  const nepalSambat = getNepalSambatYear(result.bs.year, result.bs.month);

  const handleCopyResult = async () => {
    const summary = `${formatBsDateNe(result.bs)} (${formatBsDateEn(result.bs)}) = ${formatAdDateFull(
      result.ad
    )} · ${getWeekdayNameNe(result.ad.weekday)} · ${result.panchang.fullTithiNe}`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <section
        style={{ boxShadow: 'var(--card-shadow)' }}
        className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-soft)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              Date Converter <span className="font-devanagari text-[var(--accent-secondary)]">· मिति रूपान्तरण</span>
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Accurate Bikram Sambat (2000–2090 BS) ↔ Gregorian (1943–2033 AD) conversion
            </p>
          </div>

          <div className="inline-flex items-center p-1 rounded-xl bg-[var(--bg-surface-soft)] self-start">
            <button
              type="button"
              onClick={() => setMode('bs-to-ad')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                mode === 'bs-to-ad'
                  ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              BS → AD
            </button>
            <button
              type="button"
              onClick={() => setMode('ad-to-bs')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                mode === 'ad-to-bs'
                  ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              AD → BS
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 items-stretch">
          {/* Input Panel */}
          <div className="lg:col-span-6 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)] p-5 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-[var(--accent-link)]">
                  {mode === 'bs-to-ad' ? 'Enter Bikram Sambat (BS) Date' : 'Enter Gregorian (AD) Date'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setBsYear(todayBs.year);
                    setBsMonth(todayBs.month);
                    setBsDay(todayBs.day);
                    setAdIso(initialAdIso);
                  }}
                  className="text-xs font-semibold text-[var(--accent-secondary)] hover:underline cursor-pointer"
                >
                  Reset to Today
                </button>
              </div>

              {mode === 'bs-to-ad' ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="conv-bs-year" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      BS Year
                    </label>
                    <select
                      id="conv-bs-year"
                      value={bsYear}
                      onChange={(e) => setBsYear(Number(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
                    >
                      {Array.from(
                        { length: BS_END_YEAR - BS_START_YEAR + 1 },
                        (_, i) => BS_START_YEAR + i
                      ).map((y) => (
                        <option key={y} value={y}>
                          {y} ({toDevanagari(y)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="conv-bs-month" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Month
                    </label>
                    <select
                      id="conv-bs-month"
                      value={bsMonth}
                      onChange={(e) => setBsMonth(Number(e.target.value))}
                      className="w-full h-12 px-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
                    >
                      {BS_MONTHS_EN.map((m, idx) => (
                        <option key={m} value={idx + 1}>
                          {BS_MONTHS_NE[idx]} ({m})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="conv-bs-day" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Day
                    </label>
                    <select
                      id="conv-bs-day"
                      value={safeBsDay}
                      onChange={(e) => setBsDay(Number(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
                    >
                      {Array.from({ length: maxBsDays }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d} ({toDevanagari(d)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="conv-ad-date" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Select Gregorian Date (1944–2033)
                  </label>
                  <input
                    id="conv-ad-date"
                    type="date"
                    min="1944-01-01"
                    max="2033-12-31"
                    value={adIso}
                    onChange={(e) => setAdIso(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Distance from Today</span>
              <span className="font-bold text-[var(--text-primary)] tabular-nums">
                {daysFromToday === 0
                  ? 'Today'
                  : daysFromToday > 0
                  ? `${daysFromToday.toLocaleString()} days ahead`
                  : `${Math.abs(daysFromToday).toLocaleString()} days ago`}
              </span>
            </div>
          </div>

          {/* Converted Result Card */}
          <div
            style={{
              backgroundImage:
                'linear-gradient(135deg, var(--card-highlight-from), var(--card-highlight-via), var(--card-highlight-to))',
            }}
            className="lg:col-span-6 rounded-2xl border border-[var(--border-accent)] p-5 sm:p-6 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[var(--pill-sub)] flex items-center gap-1.5">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  {mode === 'bs-to-ad' ? 'Converted Gregorian (AD) Date' : 'Converted Bikram Sambat (BS) Date'}
                </span>
                <span className="text-xs font-semibold text-[var(--accent-secondary)] font-devanagari">
                  {getWeekdayNameNe(result.ad.weekday)}
                </span>
              </div>

              <div className="mt-4">
                <p className="font-devanagari text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] leading-tight">
                  {formatBsDateNe(result.bs)}
                </p>
                <p className="text-base font-bold text-[var(--accent-link)] mt-1">
                  {formatAdDateFull(result.ad)} · {getWeekdayNameEn(result.ad.weekday)}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {formatBsDateEn(result.bs)} · नेपाल संवत् {toDevanagari(nepalSambat)}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border-accent)]/60 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[var(--text-muted)] block">Tithi on Date</span>
                  <span className="font-devanagari font-bold text-[var(--text-primary)]">
                    {result.panchang.fullTithiNe}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Nakshatra</span>
                  <span className="font-devanagari font-bold text-[var(--text-primary)]">
                    {result.panchang.nakshatraNe} ({result.panchang.nakshatraEn})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() =>
                  onJumpToBsDate({
                    year: result.bs.year,
                    month: result.bs.month,
                    day: result.bs.day,
                  })
                }
                className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <Calendar className="h-4 w-4" />
                Open in Calendar
              </button>
              <button
                type="button"
                onClick={handleCopyResult}
                className="h-11 px-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-accent)] hover:bg-[var(--bg-surface-soft)] text-xs font-semibold text-[var(--accent-link)] transition-colors cursor-pointer"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import {
  AD_MONTHS_FULL,
  AD_MONTHS_SHORT,
  BS_END_YEAR,
  BS_MONTH_DAYS,
  BS_MONTHS_EN,
  BS_MONTHS_NE,
  BS_START_YEAR,
  WEEKDAYS_EN,
  WEEKDAYS_EN_SHORT,
  WEEKDAYS_NE,
  WEEKDAYS_NE_SHORT,
} from '../data/bsCalendarData';

export interface BsDate {
  year: number;
  month: number; // 1..12
  day: number;   // 1..32
  weekday: number; // 0 (Sunday) .. 6 (Saturday)
}

export interface AdDateParts {
  year: number;
  month: number; // 1..12
  day: number;   // 1..31
  weekday: number; // 0..6
}

// Reference epoch: BS 2000-01-01 = AD 1943-04-14 (Wednesday, weekday 3)
const EPOCH_AD_UTC_MS = Date.UTC(1943, 3, 14);
const MS_PER_DAY = 86_400_000;
// Nepal Standard Time offset: UTC + 5 hours 45 minutes
const NST_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function toDevanagari(input: number | string): string {
  return String(input).replace(/\d/g, (d) => DEVANAGARI_DIGITS[Number(d)] ?? d);
}

export function getDaysInBsMonth(bsYear: number, bsMonth: number): number {
  const row = BS_MONTH_DAYS[bsYear];
  if (!row) return 30;
  return row[bsMonth - 1] ?? 30;
}

export function getNepalNow(referenceMs: number = Date.now()): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  weekday: number;
  utcMidnightMs: number;
} {
  const shifted = new Date(referenceMs + NST_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  return {
    year,
    month,
    day,
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds(),
    weekday: shifted.getUTCDay(),
    utcMidnightMs: Date.UTC(year, month - 1, day),
  };
}

export function getMsUntilNepalMidnight(referenceMs: number = Date.now()): number {
  const shifted = new Date(referenceMs + NST_OFFSET_MS);
  const elapsedTodayMs =
    shifted.getUTCHours() * 3_600_000 +
    shifted.getUTCMinutes() * 60_000 +
    shifted.getUTCSeconds() * 1_000 +
    shifted.getUTCMilliseconds();
  return Math.max(1000, MS_PER_DAY - elapsedTodayMs + 250);
}

export function adPartsToBs(adYear: number, adMonth: number, adDay: number): BsDate {
  const targetUtcMs = Date.UTC(adYear, adMonth - 1, adDay);
  let remainingDays = Math.round((targetUtcMs - EPOCH_AD_UTC_MS) / MS_PER_DAY);
  const weekday = new Date(targetUtcMs).getUTCDay();

  if (remainingDays < 0) {
    return { year: BS_START_YEAR, month: 1, day: 1, weekday };
  }

  for (let year = BS_START_YEAR; year <= BS_END_YEAR; year++) {
    const months = BS_MONTH_DAYS[year];
    for (let m = 0; m < 12; m++) {
      const daysInMonth = months[m];
      if (remainingDays < daysInMonth) {
        return {
          year,
          month: m + 1,
          day: remainingDays + 1,
          weekday,
        };
      }
      remainingDays -= daysInMonth;
    }
  }

  return { year: BS_END_YEAR, month: 12, day: 30, weekday };
}

export function bsToAdParts(bsYear: number, bsMonth: number, bsDay: number): AdDateParts {
  const clampedYear = Math.min(Math.max(bsYear, BS_START_YEAR), BS_END_YEAR);
  const clampedMonth = Math.min(Math.max(bsMonth, 1), 12);
  let totalDays = 0;

  for (let y = BS_START_YEAR; y < clampedYear; y++) {
    const months = BS_MONTH_DAYS[y];
    for (let m = 0; m < 12; m++) totalDays += months[m];
  }

  const currentMonths = BS_MONTH_DAYS[clampedYear];
  for (let m = 0; m < clampedMonth - 1; m++) {
    totalDays += currentMonths[m];
  }
  const maxDay = currentMonths[clampedMonth - 1];
  const clampedDay = Math.min(Math.max(bsDay, 1), maxDay);
  totalDays += clampedDay - 1;

  const adDate = new Date(EPOCH_AD_UTC_MS + totalDays * MS_PER_DAY);
  return {
    year: adDate.getUTCFullYear(),
    month: adDate.getUTCMonth() + 1,
    day: adDate.getUTCDate(),
    weekday: adDate.getUTCDay(),
  };
}

export function bsToKey(bsYear: number, bsMonth: number, bsDay: number): string {
  return `${bsYear}-${String(bsMonth).padStart(2, '0')}-${String(bsDay).padStart(2, '0')}`;
}

export function parseBsKey(key: string): { year: number; month: number; day: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { year: y, month: m, day: d };
}

export function diffBsDays(a: { year: number; month: number; day: number }, b: { year: number; month: number; day: number }): number {
  const adA = bsToAdParts(a.year, a.month, a.day);
  const adB = bsToAdParts(b.year, b.month, b.day);
  const msA = Date.UTC(adA.year, adA.month - 1, adA.day);
  const msB = Date.UTC(adB.year, adB.month - 1, adB.day);
  return Math.round((msB - msA) / MS_PER_DAY);
}

export function addDaysToBs(bs: { year: number; month: number; day: number }, deltaDays: number): BsDate {
  const ad = bsToAdParts(bs.year, bs.month, bs.day);
  const nextUtc = new Date(Date.UTC(ad.year, ad.month - 1, ad.day) + deltaDays * MS_PER_DAY);
  return adPartsToBs(nextUtc.getUTCFullYear(), nextUtc.getUTCMonth() + 1, nextUtc.getUTCDate());
}

export function formatBsDateNe(bs: { year: number; month: number; day: number }): string {
  return `${toDevanagari(bs.day)} ${BS_MONTHS_NE[bs.month - 1]} ${toDevanagari(bs.year)}`;
}

export function formatBsDateEn(bs: { year: number; month: number; day: number }): string {
  return `${BS_MONTHS_EN[bs.month - 1]} ${bs.day}, ${bs.year}`;
}

export function formatAdDateShort(ad: { year: number; month: number; day: number }): string {
  return `${AD_MONTHS_SHORT[ad.month - 1]} ${ad.day}, ${ad.year}`;
}

export function formatAdDateFull(ad: { year: number; month: number; day: number }): string {
  return `${ad.day} ${AD_MONTHS_FULL[ad.month - 1]} ${ad.year}`;
}

export function getWeekdayNameNe(weekday: number): string {
  return WEEKDAYS_NE[weekday] ?? WEEKDAYS_NE[0];
}

export function getWeekdayNameNeShort(weekday: number): string {
  return WEEKDAYS_NE_SHORT[weekday] ?? WEEKDAYS_NE_SHORT[0];
}

export function getWeekdayNameEn(weekday: number): string {
  return WEEKDAYS_EN[weekday] ?? WEEKDAYS_EN[0];
}

export function getWeekdayNameEnShort(weekday: number): string {
  return WEEKDAYS_EN_SHORT[weekday] ?? WEEKDAYS_EN_SHORT[0];
}

export function getNepalSambatYear(bsYear: number, bsMonth: number): number {
  // Nepal Sambat 1147 begins in Kartik/Mangsir 2083 BS (~month 7/8)
  const base = bsYear - 937;
  return bsMonth >= 8 ? base + 1 : base;
}

export function formatNepalClock(hours: number, minutes: number): string {
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
}

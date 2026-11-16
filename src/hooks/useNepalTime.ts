import { useEffect, useMemo, useState } from 'react';
import {
  adPartsToBs,
  BsDate,
  formatNepalClock,
  getMsUntilNepalMidnight,
  getNepalNow,
} from '../utils/nepaliDate';
import { calculatePanchang, PanchangData } from '../utils/panchang';

export interface NepalTimeState {
  todayBs: BsDate;
  todayAd: { year: number; month: number; day: number; weekday: number };
  panchang: PanchangData;
  timeFormatted: string;
  hours: number;
  minutes: number;
}

export function useNepalTime(): NepalTimeState {
  const [tick, setTick] = useState<number>(() => Date.now());

  useEffect(() => {
    let midnightTimeoutId: ReturnType<typeof setTimeout> | undefined;
    let minuteIntervalId: ReturnType<typeof setInterval> | undefined;

    const scheduleMidnightRefresh = () => {
      const msUntilMidnight = getMsUntilNepalMidnight(Date.now());
      midnightTimeoutId = setTimeout(() => {
        setTick(Date.now());
        scheduleMidnightRefresh();
      }, msUntilMidnight);
    };

    scheduleMidnightRefresh();

    // Update clock every 30s so time stays fresh and catches any drift
    minuteIntervalId = setInterval(() => {
      setTick(Date.now());
    }, 30_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setTick(Date.now());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (midnightTimeoutId) clearTimeout(midnightTimeoutId);
      if (minuteIntervalId) clearInterval(minuteIntervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return useMemo(() => {
    const nst = getNepalNow(tick);
    const todayBs = adPartsToBs(nst.year, nst.month, nst.day);
    const panchang = calculatePanchang(nst.year, nst.month, nst.day, nst.weekday);

    return {
      todayBs,
      todayAd: {
        year: nst.year,
        month: nst.month,
        day: nst.day,
        weekday: nst.weekday,
      },
      panchang,
      timeFormatted: formatNepalClock(nst.hours, nst.minutes),
      hours: nst.hours,
      minutes: nst.minutes,
    };
  }, [tick]);
}

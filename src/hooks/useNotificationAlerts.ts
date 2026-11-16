import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NEPALI_FESTIVALS } from '../data/bsCalendarData';
import { UserNote } from '../types/app';
import { bsToKey, diffBsDays, formatBsDateNe, toDevanagari } from '../utils/nepaliDate';
import { evaluateSubhaSaait } from '../utils/panchang';
import { LiveVersionInfo } from './useLiveUpdates';
import { NepalTimeState } from './useNepalTime';
import { NepalWeatherData } from './useNepalWeather';

export type AlertCategory = 'update' | 'weather' | 'festival' | 'note' | 'saait';

export interface AppNotificationAlert {
  id: string;
  category: AlertCategory;
  severity: 'critical' | 'warning' | 'info' | 'success';
  titleEn: string;
  titleNe: string;
  body: string;
  timestampLabel: string;
  actionLabel?: string;
  actionType?: 'update' | 'calendar' | 'festivals' | 'home';
  targetBs?: { year: number; month: number; day: number };
  read: boolean;
}

export interface NotificationPrefs {
  browserNotifications: boolean;
  weatherAlerts: boolean;
  festivalAlerts: boolean;
  noteReminders: boolean;
  saaitAlerts: boolean;
  liveUpdateAlerts: boolean;
}

const PREFS_KEY = 'nepal_patro_notif_prefs_v1';
const STATE_KEY = 'nepal_patro_notif_state_v1';

const DEFAULT_PREFS: NotificationPrefs = {
  browserNotifications: true,
  weatherAlerts: true,
  festivalAlerts: true,
  noteReminders: true,
  saaitAlerts: true,
  liveUpdateAlerts: true,
};

interface PersistedNotifState {
  readIds: string[];
  dismissedIds: string[];
  dispatchedToastIds: string[];
}

function readStoredPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
      return {
        browserNotifications:
          typeof parsed.browserNotifications === 'boolean'
            ? parsed.browserNotifications
            : DEFAULT_PREFS.browserNotifications,
        weatherAlerts:
          typeof parsed.weatherAlerts === 'boolean'
            ? parsed.weatherAlerts
            : DEFAULT_PREFS.weatherAlerts,
        festivalAlerts:
          typeof parsed.festivalAlerts === 'boolean'
            ? parsed.festivalAlerts
            : DEFAULT_PREFS.festivalAlerts,
        noteReminders:
          typeof parsed.noteReminders === 'boolean'
            ? parsed.noteReminders
            : DEFAULT_PREFS.noteReminders,
        saaitAlerts:
          typeof parsed.saaitAlerts === 'boolean'
            ? parsed.saaitAlerts
            : DEFAULT_PREFS.saaitAlerts,
        liveUpdateAlerts:
          typeof parsed.liveUpdateAlerts === 'boolean'
            ? parsed.liveUpdateAlerts
            : DEFAULT_PREFS.liveUpdateAlerts,
      };
    }
  } catch {
    // Ignore storage error
  }
  return DEFAULT_PREFS;
}

function readStoredState(): PersistedNotifState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedNotifState>;
      return {
        readIds: Array.isArray(parsed.readIds) ? parsed.readIds.slice(-100) : [],
        dismissedIds: Array.isArray(parsed.dismissedIds) ? parsed.dismissedIds.slice(-100) : [],
        dispatchedToastIds: Array.isArray(parsed.dispatchedToastIds)
          ? parsed.dispatchedToastIds.slice(-100)
          : [],
      };
    }
  } catch {
    // Ignore storage error
  }
  return { readIds: [], dismissedIds: [], dispatchedToastIds: [] };
}

function parseTimeTo24h(raw?: string): string | null {
  if (!raw) return null;
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) {
    return null;
  }
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'pm' && hour !== 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
  } else if (hour < 0 || hour > 23) {
    return null;
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getBrowserPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

async function showNativeOrWebNotification(title: string, body: string, tag: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          tag,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
        });
        return;
      }
    }
    new Notification(title, {
      body,
      tag,
      icon: '/pwa-192x192.png',
    });
  } catch {
    // Fallback ignored if OS blocks notifications in current frame
  }
}

interface UseNotificationAlertsParams {
  nepalTime: NepalTimeState;
  weather: NepalWeatherData;
  notes: UserNote[];
  hasUpdateAvailable: boolean;
  latestVersionInfo: LiveVersionInfo;
}

export function useNotificationAlerts({
  nepalTime,
  weather,
  notes,
  hasUpdateAvailable,
  latestVersionInfo,
}: UseNotificationAlertsParams) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => readStoredPrefs());
  const [notifState, setNotifState] = useState<PersistedNotifState>(() => readStoredState());
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getBrowserPermission()
  );
  const [activeToast, setActiveToast] = useState<AppNotificationAlert | null>(null);
  const lastBootToastRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage error
    }
  }, [prefs]);

  useEffect(() => {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(notifState));
    } catch {
      // Ignore storage error
    }
  }, [notifState]);

  const updatePref = useCallback(<K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return 'unsupported' as const;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        setPrefs((prev) => ({ ...prev, browserNotifications: true }));
      }
      return result;
    } catch {
      return getBrowserPermission();
    }
  }, []);

  const sendTestNotification = useCallback(async () => {
    let currentPerm = getBrowserPermission();
    if (currentPerm === 'default') {
      currentPerm = await requestPermission();
    }
    const testAlert: AppNotificationAlert = {
      id: `test-alert-${Date.now()}`,
      category: 'festival',
      severity: 'info',
      titleEn: 'Nepal Patro Alert Active',
      titleNe: 'नेपाल पात्रो सूचना सक्रिय छ',
      body: `${formatBsDateNe(nepalTime.todayBs)} · ${nepalTime.panchang.fullTithiNe} · Alerts ready for weather, Ekadashi & updates.`,
      timestampLabel: `${nepalTime.timeFormatted} NST`,
      actionLabel: 'View Calendar',
      actionType: 'calendar',
      targetBs: nepalTime.todayBs,
      read: false,
    };
    setActiveToast(testAlert);
    if (currentPerm === 'granted') {
      await showNativeOrWebNotification(
        `${testAlert.titleNe} · ${testAlert.titleEn}`,
        testAlert.body,
        'nepal-patro-test'
      );
    }
    return currentPerm;
  }, [nepalTime, requestPermission]);

  // Build real, live-evaluated notification list
  const alerts = useMemo<AppNotificationAlert[]>(() => {
    const todayKey = bsToKey(nepalTime.todayBs.year, nepalTime.todayBs.month, nepalTime.todayBs.day);
    const items: AppNotificationAlert[] = [];

    // 1. Live Update Alert
    if (prefs.liveUpdateAlerts && hasUpdateAvailable) {
      items.push({
        id: `live-update-${latestVersionInfo.buildId}`,
        category: 'update',
        severity: 'warning',
        titleEn: 'Live App Update Ready',
        titleNe: 'नयाँ लाइभ अपडेट तयार छ',
        body: `Build ${latestVersionInfo.buildId} is deployed. Tap Update Now to load the latest Nepal Patro features.`,
        timestampLabel: 'Live Deploy',
        actionLabel: 'Update Now',
        actionType: 'update',
        read: false,
      });
    }

    // 2. Weather Threshold Alerts (38°C+ Heat, <10°C Cold, Rain)
    if (prefs.weatherAlerts) {
      if (weather.alerts.isHeatAlert) {
        items.push({
          id: `weather-heat-${weather.locationNameEn.toLowerCase()}-${weather.preset}-${todayKey}`,
          category: 'weather',
          severity: 'critical',
          titleEn: `Extreme Heat Alert (${weather.temperature}°C)`,
          titleNe: `अत्यधिक गर्मी (${toDevanagari(38)}°C+ चेतावनी)`,
          body: `${weather.locationNameEn}: Peak ${Math.max(weather.temperature, weather.todayMax)}°C today. Stay hydrated & avoid midday sun.`,
          timestampLabel: weather.locationNameEn,
          actionLabel: 'Weather Details',
          actionType: 'home',
          read: false,
        });
      }

      if (weather.alerts.isColdAlert) {
        items.push({
          id: `weather-cold-${weather.locationNameEn.toLowerCase()}-${weather.preset}-${todayKey}`,
          category: 'weather',
          severity: 'warning',
          titleEn: `Cold Wave Alert (${weather.temperature}°C)`,
          titleNe: `शितलहर चेतावनी (${toDevanagari(10)}°C भन्दा कम)`,
          body: `${weather.locationNameEn}: Low ${Math.min(weather.temperature, weather.todayMin)}°C detected. Wear warm morning & evening layers.`,
          timestampLabel: weather.locationNameEn,
          actionLabel: 'Weather Details',
          actionType: 'home',
          read: false,
        });
      }

      if (weather.alerts.isRainingAlert) {
        items.push({
          id: `weather-rain-${weather.locationNameEn.toLowerCase()}-${weather.preset}-${todayKey}`,
          category: 'weather',
          severity: 'info',
          titleEn: weather.alerts.isActiveRainNow ? 'Raining Now Alert' : 'Rain Forecast Alert',
          titleNe: weather.alerts.isActiveRainNow ? 'वर्षा भइरहेको छ' : 'वर्षाको सम्भावना',
          body: `${weather.locationNameEn}: ${weather.precipProbability}% rain chance${weather.precipitationMm > 0 ? ` (${weather.precipitationMm} mm)` : ''}. Carry an umbrella.`,
          timestampLabel: weather.locationNameEn,
          actionLabel: 'Weather Details',
          actionType: 'home',
          read: false,
        });
      }
    }

    // 3. Today & Tomorrow Festivals / Ekadashi / Public Holidays
    if (prefs.festivalAlerts) {
      for (const fest of NEPALI_FESTIVALS) {
        const candidateYears = fest.bsYear
          ? [fest.bsYear]
          : [nepalTime.todayBs.year, nepalTime.todayBs.year + 1];

        for (const yr of candidateYears) {
          const delta = diffBsDays(nepalTime.todayBs, {
            year: yr,
            month: fest.bsMonth,
            day: fest.bsDay,
          });
          if (delta === 0 || delta === 1) {
            const isToday = delta === 0;
            items.push({
              id: `fest-${fest.id}-${yr}-${delta}`,
              category: 'festival',
              severity: fest.category === 'ekadashi' || fest.isPublicHoliday ? 'warning' : 'info',
              titleEn: `${isToday ? 'Today' : 'Tomorrow'}: ${fest.titleEn}`,
              titleNe: `${isToday ? 'आज' : 'भोलि'}: ${fest.titleNe}`,
              body: fest.description,
              timestampLabel: isToday ? 'Today · आज' : 'Tomorrow · भोलि',
              actionLabel: 'Open Date',
              actionType: 'calendar',
              targetBs: { year: yr, month: fest.bsMonth, day: fest.bsDay },
              read: false,
            });
            break;
          }
        }
      }
    }

    // 4. Personal Notes & Scheduled Reminders for Today
    if (prefs.noteReminders) {
      const hhmmNow = `${String(nepalTime.hours).padStart(2, '0')}:${String(nepalTime.minutes).padStart(2, '0')}`;
      for (const n of notes) {
        if (n.bsKey === todayKey) {
          const normalizedTime = parseTimeTo24h(n.time);
          const timeDueNow = Boolean(normalizedTime && normalizedTime === hhmmNow);
          items.push({
            id: `note-${n.id}-${todayKey}`,
            category: 'note',
            severity: timeDueNow ? 'critical' : 'info',
            titleEn: timeDueNow ? `Reminder Now: ${n.title}` : `Today’s Note: ${n.title}`,
            titleNe: timeDueNow ? 'अहिलेको रिमाइन्डर' : 'आजको व्यक्तिगत टिपोट',
            body: n.note || (n.time ? `Scheduled for ${n.time} NST` : 'Saved for today in your Patro.'),
            timestampLabel: n.time ? `${n.time} NST` : 'Today',
            actionLabel: 'View Note',
            actionType: 'calendar',
            targetBs: nepalTime.todayBs,
            read: false,
          });
        }
      }
    }

    // 5. Subha Saait & Rahu Kaal Status
    if (prefs.saaitAlerts) {
      const saait = evaluateSubhaSaait(
        nepalTime.todayBs,
        nepalTime.panchang,
        nepalTime.hours,
        nepalTime.minutes
      );
      if (saait.inRahuKaal) {
        items.push({
          id: `rahu-kaal-${todayKey}-${nepalTime.panchang.rahuKaal}`,
          category: 'saait',
          severity: 'warning',
          titleEn: 'Rahu Kaal Active Now',
          titleNe: 'अहिले राहुकाल चलिरहेको छ',
          body: `Avoid starting major new ventures during ${nepalTime.panchang.rahuKaal}. Next Subha Saait: ${saait.windowEn}.`,
          timestampLabel: `${nepalTime.timeFormatted} NST`,
          actionLabel: 'View Panchang',
          actionType: 'home',
          read: false,
        });
      } else if (saait.isNowActive) {
        items.push({
          id: `subha-saait-active-${todayKey}`,
          category: 'saait',
          severity: 'success',
          titleEn: 'Subha Saait Active Now',
          titleNe: 'अहिले शुभ साइत सक्रिय छ',
          body: `${saait.windowEn} (${saait.windowNe}) — ${saait.reason}`,
          timestampLabel: `${nepalTime.timeFormatted} NST`,
          actionLabel: 'View Panchang',
          actionType: 'home',
          read: false,
        });
      }
    }

    const dismissedSet = new Set(notifState.dismissedIds);
    const readSet = new Set(notifState.readIds);

    return items
      .filter((item) => !dismissedSet.has(item.id))
      .map((item) => ({
        ...item,
        read: readSet.has(item.id),
      }));
  }, [
    nepalTime,
    weather,
    notes,
    hasUpdateAvailable,
    latestVersionInfo.buildId,
    prefs,
    notifState.dismissedIds,
    notifState.readIds,
  ]);

  // Auto-surface floating toast + OS notification for newly triggered high-priority alerts
  useEffect(() => {
    const candidate = alerts.find(
      (a) =>
        !a.read &&
        (a.category === 'update' ||
          a.severity === 'critical' ||
          a.category === 'weather') &&
        !notifState.dispatchedToastIds.includes(a.id)
    );

    if (!candidate || lastBootToastRef.current === candidate.id) return;
    lastBootToastRef.current = candidate.id;

    setActiveToast(candidate);
    setNotifState((prev) => ({
      ...prev,
      dispatchedToastIds: [...prev.dispatchedToastIds.slice(-90), candidate.id],
    }));

    if (prefs.browserNotifications && permission === 'granted') {
      void showNativeOrWebNotification(
        `${candidate.titleNe} · ${candidate.titleEn}`,
        candidate.body,
        candidate.id
      );
    }
  }, [alerts, notifState.dispatchedToastIds, prefs.browserNotifications, permission]);

  const markAsRead = useCallback((id: string) => {
    setNotifState((prev) => ({
      ...prev,
      readIds: prev.readIds.includes(id) ? prev.readIds : [...prev.readIds.slice(-90), id],
    }));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifState((prev) => ({
      ...prev,
      readIds: Array.from(new Set([...prev.readIds, ...alerts.map((a) => a.id)])).slice(-120),
    }));
  }, [alerts]);

  const dismissAlert = useCallback((id: string) => {
    setNotifState((prev) => ({
      ...prev,
      dismissedIds: prev.dismissedIds.includes(id)
        ? prev.dismissedIds
        : [...prev.dismissedIds.slice(-90), id],
    }));
    setActiveToast((curr) => (curr?.id === id ? null : curr));
  }, []);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);

  return {
    alerts,
    unreadCount,
    prefs,
    permission,
    activeToast,
    updatePref,
    requestPermission,
    sendTestNotification,
    markAsRead,
    markAllRead,
    dismissAlert,
    dismissToast,
  };
}

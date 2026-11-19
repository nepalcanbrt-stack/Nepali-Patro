import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export interface LiveVersionInfo {
  appName: string;
  version: string;
  buildId: string;
  builtAt: string;
  startedAt?: string;
  releaseChannel?: 'production' | 'development';
  serverTimeMs?: number;
}

export type LiveStreamStatus = 'live' | 'connecting' | 'reconnecting' | 'offline' | 'native';
export type AutoRefreshIntervalSec = 0 | 10 | 15 | 30 | 60;

export const AUTO_REFRESH_OPTIONS: Array<{
  value: AutoRefreshIntervalSec;
  label: string;
  shortLabel: string;
}> = [
  { value: 10, label: '10 sec', shortLabel: '10s' },
  { value: 15, label: '15 sec', shortLabel: '15s' },
  { value: 30, label: '30 sec', shortLabel: '30s' },
  { value: 60, label: '60 sec', shortLabel: '60s' },
  { value: 0, label: 'Off (Manual)', shortLabel: 'Off' },
];

const AUTO_REFRESH_STORAGE_KEY = 'nepal_patro_auto_refresh_sec_v1';

function readStoredRefreshSec(): AutoRefreshIntervalSec {
  try {
    const raw = localStorage.getItem(AUTO_REFRESH_STORAGE_KEY);
    const num = Number(raw);
    if (num === 0 || num === 10 || num === 15 || num === 30 || num === 60) {
      return num;
    }
  } catch {
    // Ignore storage error
  }
  return 15;
}

function detectNativeCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function useLiveUpdates() {
  const isNativeCapacitor = detectNativeCapacitor();
  const [swNeedRefresh, setSwNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [serverUpdateAvailable, setServerUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [autoRefreshIntervalSec, setAutoRefreshIntervalSecState] =
    useState<AutoRefreshIntervalSec>(() => readStoredRefreshSec());
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastAutoRefreshAt, setLastAutoRefreshAt] = useState<number | null>(() => Date.now());
  const [streamStatus, setStreamStatus] = useState<LiveStreamStatus>(
    isNativeCapacitor ? 'native' : 'connecting'
  );

  const clientBuildId = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : '1.0.0';
  const clientVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

  const baselineBuildIdRef = useRef<string | null>(null);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updateSwFnRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const checkingRef = useRef(false);
  const [latestVersionInfo, setLatestVersionInfo] = useState<LiveVersionInfo>({
    appName: 'Nepal Patro',
    version: clientVersion,
    buildId: clientBuildId,
    builtAt: typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : '',
  });

  const setAutoRefreshIntervalSec = useCallback((sec: AutoRefreshIntervalSec) => {
    setAutoRefreshIntervalSecState(sec);
    try {
      localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, String(sec));
    } catch {
      // Ignore storage error
    }
  }, []);

  // 1. Register PWA Service Worker on Web (skip inside Capacitor native APK WebView)
  useEffect(() => {
    if (isNativeCapacitor || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setSwNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (registration) {
          swRegistrationRef.current = registration;
        }
      },
    });
    updateSwFnRef.current = updateSW;
  }, [isNativeCapacitor]);

  const evaluateServerVersion = useCallback((incoming: LiveVersionInfo) => {
    if (!incoming?.buildId) return;
    setLatestVersionInfo(incoming);
    setLastCheckedAt(Date.now());

    if (!baselineBuildIdRef.current) {
      baselineBuildIdRef.current = incoming.buildId;
      return;
    }

    if (incoming.buildId !== baselineBuildIdRef.current) {
      setServerUpdateAvailable(true);
    }
  }, []);

  // 2. Real-Time SSE Live Stream (/api/live-events) for instant deploy/restart detection
  useEffect(() => {
    if (isNativeCapacitor || typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return;
    }

    if (!navigator.onLine) {
      setStreamStatus('offline');
    }

    let eventSource: EventSource | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      if (!navigator.onLine) {
        setStreamStatus('offline');
        return;
      }
      setStreamStatus((prev) => (prev === 'reconnecting' ? 'reconnecting' : 'connecting'));
      eventSource = new EventSource('/api/live-events');

      eventSource.addEventListener('version', (evt) => {
        try {
          const parsed = JSON.parse((evt as MessageEvent).data) as LiveVersionInfo;
          setStreamStatus('live');
          evaluateServerVersion(parsed);
        } catch {
          // Ignore malformed frame
        }
      });

      eventSource.addEventListener('heartbeat', (evt) => {
        try {
          const parsed = JSON.parse((evt as MessageEvent).data) as { buildId?: string };
          setStreamStatus('live');
          setLastCheckedAt(Date.now());
          if (
            parsed.buildId &&
            baselineBuildIdRef.current &&
            parsed.buildId !== baselineBuildIdRef.current
          ) {
            setServerUpdateAvailable(true);
          }
        } catch {
          // Ignore malformed frame
        }
      });

      eventSource.onerror = () => {
        if (!navigator.onLine) {
          setStreamStatus('offline');
        } else {
          setStreamStatus('reconnecting');
        }
      };
    };

    connect();

    const handleOnline = () => {
      eventSource?.close();
      connect();
    };
    const handleOffline = () => {
      setStreamStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      closed = true;
      eventSource?.close();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isNativeCapacitor, evaluateServerVersion]);

  const checkForUpdates = useCallback(
    async (silent = false) => {
      setRefreshTick((t) => t + 1);
      setLastAutoRefreshAt(Date.now());

      if (isNativeCapacitor || checkingRef.current) return false;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return false;

      checkingRef.current = true;
      if (!silent) setIsChecking(true);
      let foundUpdate = false;
      try {
        if (!silent && swRegistrationRef.current) {
          await swRegistrationRef.current.update();
        }
        const res = await fetch(`/api/version?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as LiveVersionInfo & { ok?: boolean };
          if (data.buildId) {
            if (baselineBuildIdRef.current && data.buildId !== baselineBuildIdRef.current) {
              foundUpdate = true;
            }
            evaluateServerVersion(data);
          }
        }
      } catch {
        // Offline or unreachable
      } finally {
        setLastCheckedAt(Date.now());
        checkingRef.current = false;
        if (!silent) setIsChecking(false);
      }
      return foundUpdate || swNeedRefresh || serverUpdateAvailable;
    },
    [isNativeCapacitor, evaluateServerVersion, swNeedRefresh, serverUpdateAvailable]
  );

  // 3. Configurable Auto-Refresh Timer (10s / 15s / 30s / 60s / Off)
  useEffect(() => {
    if (autoRefreshIntervalSec <= 0) return;

    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      void checkForUpdates(true);
    }, autoRefreshIntervalSec * 1000);

    return () => window.clearInterval(timer);
  }, [autoRefreshIntervalSec, checkForUpdates]);

  const applyLiveUpdate = useCallback(async () => {
    if (swNeedRefresh && updateSwFnRef.current) {
      await updateSwFnRef.current(true);
    }
    window.location.reload();
  }, [swNeedRefresh]);

  const hasUpdateAvailable = swNeedRefresh || serverUpdateAvailable;

  return {
    currentVersion: clientVersion,
    currentBuildId: clientBuildId,
    latestVersionInfo,
    swNeedRefresh,
    serverUpdateAvailable,
    hasUpdateAvailable,
    offlineReady,
    isChecking,
    isNativeCapacitor,
    streamStatus,
    lastCheckedAt,
    autoRefreshIntervalSec,
    refreshTick,
    lastAutoRefreshAt,
    setAutoRefreshIntervalSec,
    checkForUpdates,
    applyLiveUpdate,
  };
}

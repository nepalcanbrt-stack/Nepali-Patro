/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { DayNotificationBar } from './components/DayNotificationBar';
import { HomeScreen } from './components/HomeScreen';
import { NotificationToast } from './components/NotificationToast';
import { OfflineIndicator } from './components/OfflineIndicator';
import { StickyDateBar } from './components/StickyDateBar';
import { useFirebase } from './contexts/FirebaseContext';
import { useLiveUpdates } from './hooks/useLiveUpdates';
import { useNepalTime } from './hooks/useNepalTime';
import { useNepalWeather } from './hooks/useNepalWeather';
import { AppNotificationAlert, useNotificationAlerts } from './hooks/useNotificationAlerts';
import { SWIPE_SCREEN_ORDER, useSwipeNavigation } from './hooks/useSwipeNavigation';
import { useUserEvents } from './hooks/useUserEvents';
import { useUserPreferences } from './hooks/useUserPreferences';
import { AppScreen } from './types/app';
import { PATRO_SPRING_SNAPPY, screenSlideVariants } from './utils/motionVariants';
import { playNotificationChime } from './utils/notificationSound';

// Code-split heavy and secondary screens/modals for fast initial render & smaller first bundle
const CalendarScreen = lazy(() =>
  import('./components/CalendarScreen').then((m) => ({ default: m.CalendarScreen }))
);
const PanchangScreen = lazy(() =>
  import('./components/PanchangScreen').then((m) => ({ default: m.PanchangScreen }))
);
const ConverterScreen = lazy(() =>
  import('./components/ConverterScreen').then((m) => ({ default: m.ConverterScreen }))
);
const FestivalsScreen = lazy(() =>
  import('./components/FestivalsScreen').then((m) => ({ default: m.FestivalsScreen }))
);
const LoginScreen = lazy(() =>
  import('./components/LoginScreen').then((m) => ({ default: m.LoginScreen }))
);
const Patro3DSceneScreen = lazy(() =>
  import('./components/Patro3DSceneScreen').then((m) => ({ default: m.Patro3DSceneScreen }))
);
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const NotificationCenterModal = lazy(() =>
  import('./components/NotificationCenterModal').then((m) => ({
    default: m.NotificationCenterModal,
  }))
);
const NoteModal = lazy(() =>
  import('./components/NoteModal').then((m) => ({ default: m.NoteModal }))
);

function ScreenLoadingFallback() {
  return (
    <div className="space-y-4 py-6 animate-pulse" aria-busy="true" aria-label="Loading screen">
      <div className="h-24 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]" />
      <div className="h-56 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]" />
    </div>
  );
}

export default function App() {
  const { authReady, isVerifiedIdentity } = useFirebase();
  const liveUpdates = useLiveUpdates();
  const nepalTime = useNepalTime(liveUpdates.refreshTick);
  const weatherState = useNepalWeather(liveUpdates.refreshTick);
  const { notes, isCloudSynced, addNote, deleteNote } = useUserEvents();
  const {
    preferredRashi,
    useDevanagariNums,
    theme,
    iconTheme,
    privateLockEnabled,
    setPrivateLockEnabled,
    updatePreferences,
  } = useUserPreferences();

  const notificationAlerts = useNotificationAlerts({
    nepalTime,
    weather: weatherState.weather,
    notes,
    hasUpdateAvailable: liveUpdates.hasUpdateAvailable,
    latestVersionInfo: liveUpdates.latestVersionInfo,
  });

  const [activeScreen, setActiveScreen] = useState<AppScreen>('home');
  const [navDirection, setNavDirection] = useState<number>(0);
  const [viewYear, setViewYear] = useState<number>(() => nepalTime.todayBs.year);
  const [viewMonth, setViewMonth] = useState<number>(() => nepalTime.todayBs.month);
  const [selectedBs, setSelectedBs] = useState<{ year: number; month: number; day: number }>(() => ({
    year: nepalTime.todayBs.year,
    month: nepalTime.todayBs.month,
    day: nepalTime.todayBs.day,
  }));

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalDate, setNoteModalDate] = useState<{ year: number; month: number; day: number }>({
    year: nepalTime.todayBs.year,
    month: nepalTime.todayBs.month,
    day: nepalTime.todayBs.day,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const isLockedOut = Boolean(privateLockEnabled && authReady && !isVerifiedIdentity);
  const effectiveScreen: AppScreen = isLockedOut ? 'login' : activeScreen;
  const anyModalOpen = noteModalOpen || settingsOpen || notificationsOpen;

  const handleNavigate = useCallback(
    (screen: AppScreen, explicitDirection?: number) => {
      if (isLockedOut && screen !== 'login') {
        setNavDirection(0);
        setActiveScreen('login');
        return;
      }
      setActiveScreen((prev) => {
        if (prev === screen) return prev;
        if (typeof explicitDirection === 'number') {
          setNavDirection(explicitDirection);
        } else {
          const prevIdx = SWIPE_SCREEN_ORDER.indexOf(prev);
          const nextIdx = SWIPE_SCREEN_ORDER.indexOf(screen);
          setNavDirection(
            prevIdx !== -1 && nextIdx !== -1 ? (nextIdx > prevIdx ? 1 : -1) : 0
          );
        }
        return screen;
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [isLockedOut]
  );

  const { dragOffsetX, preview, swipeHandlers } = useSwipeNavigation({
    activeScreen: effectiveScreen,
    disabled: isLockedOut || anyModalOpen || effectiveScreen === 'sanctuary',
    onNavigate: (screen, direction) => handleNavigate(screen, direction),
  });

  useEffect(() => {
    if (isLockedOut || anyModalOpen || effectiveScreen === 'sanctuary') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      const idx = SWIPE_SCREEN_ORDER.indexOf(effectiveScreen);
      if (idx === -1) return;
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const next = SWIPE_SCREEN_ORDER[idx + delta];
      if (next) {
        e.preventDefault();
        handleNavigate(next, delta);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLockedOut, anyModalOpen, effectiveScreen, handleNavigate]);

  const handleOpenTodayInCalendar = useCallback(() => {
    if (isLockedOut) {
      setNavDirection(0);
      setActiveScreen('login');
      return;
    }
    setViewYear(nepalTime.todayBs.year);
    setViewMonth(nepalTime.todayBs.month);
    setSelectedBs({
      year: nepalTime.todayBs.year,
      month: nepalTime.todayBs.month,
      day: nepalTime.todayBs.day,
    });
    handleNavigate('calendar');
  }, [isLockedOut, nepalTime.todayBs, handleNavigate]);

  const handleJumpToBsDate = useCallback(
    (bs: { year: number; month: number; day: number }) => {
      if (isLockedOut) {
        setNavDirection(0);
        setActiveScreen('login');
        return;
      }
      setViewYear(bs.year);
      setViewMonth(bs.month);
      setSelectedBs(bs);
      handleNavigate('calendar');
    },
    [isLockedOut, handleNavigate]
  );

  const handleOpenNoteModal = useCallback(
    (bs?: { year: number; month: number; day: number }) => {
      if (isLockedOut) {
        setNavDirection(0);
        setActiveScreen('login');
        return;
      }
      setNoteModalDate(
        bs ?? {
          year: nepalTime.todayBs.year,
          month: nepalTime.todayBs.month,
          day: nepalTime.todayBs.day,
        }
      );
      setNoteModalOpen(true);
    },
    [isLockedOut, nepalTime.todayBs]
  );

  const handleAlertAction = useCallback(
    (alert: AppNotificationAlert) => {
      notificationAlerts.markAsRead(alert.id);
      notificationAlerts.dismissToast();
      setNotificationsOpen(false);
      if (alert.actionType === 'update') {
        void liveUpdates.applyLiveUpdate();
      } else if (alert.actionType === 'calendar') {
        handleJumpToBsDate(alert.targetBs ?? nepalTime.todayBs);
      } else if (alert.actionType === 'festivals') {
        handleNavigate('festivals');
      } else {
        handleNavigate('home');
      }
    },
    [notificationAlerts, liveUpdates, handleJumpToBsDate, handleNavigate, nepalTime.todayBs]
  );

  const handleToggleSound = useCallback(() => {
    const next = !notificationAlerts.prefs.soundEnabled;
    notificationAlerts.updatePref('soundEnabled', next);
    if (next) {
      void playNotificationChime('success', true);
    }
  }, [notificationAlerts]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col transition-colors duration-200">
        {/* Persistent Floating Themed Sticky Date Bar Across All Screens */}
        <StickyDateBar
          nepalTime={nepalTime}
          activeScreen={effectiveScreen}
          iconTheme={iconTheme}
          unreadAlertsCount={notificationAlerts.unreadCount}
          hasLiveUpdate={liveUpdates.hasUpdateAvailable}
          onNavigate={handleNavigate}
          onOpenTodayInCalendar={handleOpenTodayInCalendar}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenLogin={() => handleNavigate('login')}
        />

        {/* Main Content Container with Tactile Horizontal Swipe Navigation */}
        <main
          {...swipeHandlers}
          className="relative flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 pt-2 pb-24 lg:pb-12 touch-pan-y overflow-x-clip space-y-3"
        >
          {/* Day Notification Bar + Configurable Auto-Refresh (10s/15s/30s/60s/Off) + Sound Toggle */}
          {!isLockedOut &&
            effectiveScreen !== 'sanctuary' &&
            notificationAlerts.prefs.dayNotificationEnabled && (
              <DayNotificationBar
                nepalTime={nepalTime}
                alerts={notificationAlerts.alerts}
                unreadCount={notificationAlerts.unreadCount}
                autoRefreshIntervalSec={liveUpdates.autoRefreshIntervalSec}
                isCheckingUpdates={liveUpdates.isChecking}
                streamStatus={liveUpdates.streamStatus}
                hasUpdateAvailable={liveUpdates.hasUpdateAvailable}
                soundEnabled={notificationAlerts.prefs.soundEnabled}
                onChangeAutoRefresh={liveUpdates.setAutoRefreshIntervalSec}
                onManualRefresh={() => {
                  void liveUpdates.checkForUpdates(false);
                }}
                onToggleSound={handleToggleSound}
                onOpenNotifications={() => setNotificationsOpen(true)}
              />
            )}

          {/* Floating Edge Swipe Direction Indicator */}
          <AnimatePresence>
            {preview && (
              <motion.div
                key={`swipe-cue-${preview.side}-${preview.screen}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: Math.max(0.35, preview.progress),
                  scale: 0.94 + preview.progress * 0.06,
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.12 }}
                aria-hidden="true"
                className={`fixed top-1/2 -translate-y-1/2 z-30 pointer-events-none flex items-center gap-1.5 px-3 py-2 rounded-full bg-[var(--accent-primary)] text-white text-xs font-bold shadow-xl border border-white/25 ${
                  preview.side === 'left' ? 'left-3' : 'right-3'
                }`}
              >
                {preview.side === 'left' && <ChevronLeft className="h-4 w-4 shrink-0" />}
                <span className="whitespace-nowrap">{preview.label}</span>
                {preview.side === 'right' && <ChevronRight className="h-4 w-4 shrink-0" />}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            animate={{ x: dragOffsetX }}
            transition={
              dragOffsetX === 0
                ? PATRO_SPRING_SNAPPY
                : { type: 'tween', duration: 0 }
            }
          >
            <Suspense fallback={<ScreenLoadingFallback />}>
              <AnimatePresence mode="wait" custom={navDirection}>
                <motion.div
                  key={effectiveScreen}
                  custom={navDirection}
                  variants={screenSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  {effectiveScreen === 'login' && (
                    <LoginScreen
                      iconTheme={iconTheme}
                      privateLockEnabled={privateLockEnabled}
                      onTogglePrivateLock={setPrivateLockEnabled}
                      onDone={() => {
                        if (!privateLockEnabled || isVerifiedIdentity) {
                          setNavDirection(1);
                          setActiveScreen('home');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                    />
                  )}

                  {effectiveScreen === 'home' && (
                    <HomeScreen
                      nepalTime={nepalTime}
                      weatherState={weatherState}
                      notes={notes}
                      isCloudSynced={isCloudSynced}
                      preferredRashi={preferredRashi}
                      iconTheme={iconTheme}
                      onSelectRashi={(rashiId) => void updatePreferences({ preferredRashi: rashiId })}
                      onNavigate={handleNavigate}
                      onJumpToBsDate={handleJumpToBsDate}
                      onOpenNoteModal={handleOpenNoteModal}
                      onDeleteNote={(id) => void deleteNote(id)}
                      onOpenSettings={() => setSettingsOpen(true)}
                      onOpenNotifications={() => setNotificationsOpen(true)}
                      onOpenLogin={() => handleNavigate('login')}
                    />
                  )}

                  {effectiveScreen === 'calendar' && (
                    <CalendarScreen
                      nepalTime={nepalTime}
                      selectedBs={selectedBs}
                      viewYear={viewYear}
                      viewMonth={viewMonth}
                      useDevanagariNums={useDevanagariNums}
                      onToggleDevanagariNums={() =>
                        void updatePreferences({ useDevanagariNums: !useDevanagariNums })
                      }
                      onSelectBs={setSelectedBs}
                      onChangeMonth={(y, m) => {
                        setViewYear(y);
                        setViewMonth(m);
                      }}
                      notes={notes}
                      onOpenNoteModal={handleOpenNoteModal}
                      onDeleteNote={(id) => void deleteNote(id)}
                    />
                  )}

                  {effectiveScreen === 'panchang' && (
                    <PanchangScreen
                      nepalTime={nepalTime}
                      preferredRashi={preferredRashi}
                      iconTheme={iconTheme}
                      onSelectRashi={(rashiId) => void updatePreferences({ preferredRashi: rashiId })}
                      onJumpToBsDate={handleJumpToBsDate}
                    />
                  )}

                  {effectiveScreen === 'converter' && (
                    <ConverterScreen
                      nepalTime={nepalTime}
                      onJumpToBsDate={handleJumpToBsDate}
                    />
                  )}

                  {effectiveScreen === 'festivals' && (
                    <FestivalsScreen
                      nepalTime={nepalTime}
                      notes={notes}
                      isCloudSynced={isCloudSynced}
                      onJumpToBsDate={handleJumpToBsDate}
                      onOpenNoteModal={handleOpenNoteModal}
                      onDeleteNote={(id) => void deleteNote(id)}
                      onOpenLogin={() => handleNavigate('login')}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </motion.div>
        </main>

        {/* Full-Viewport Three.js 3D Sacred Sanctuary Overlay (Lazy-loaded) */}
        {effectiveScreen === 'sanctuary' && (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <Patro3DSceneScreen
              nepalTime={nepalTime}
              onBack={() => handleNavigate('home')}
            />
          </Suspense>
        )}

        {/* Mobile Thumb-Zone Bottom Tab Bar */}
        {!isLockedOut && effectiveScreen !== 'sanctuary' && (
          <BottomNav
            activeScreen={effectiveScreen}
            iconTheme={iconTheme}
            onNavigate={handleNavigate}
          />
        )}

        {/* Lazy-Loaded Modals */}
        <Suspense fallback={null}>
          <NoteModal
            isOpen={noteModalOpen}
            initialBsDate={noteModalDate}
            onClose={() => setNoteModalOpen(false)}
            onSave={addNote}
          />

          <SettingsModal
            isOpen={settingsOpen}
            activeTheme={theme}
            activeIconTheme={iconTheme}
            useDevanagariNums={useDevanagariNums}
            preferredRashi={preferredRashi}
            privateLockEnabled={privateLockEnabled}
            unreadAlertsCount={notificationAlerts.unreadCount}
            hasLiveUpdate={liveUpdates.hasUpdateAvailable}
            autoRefreshIntervalSec={liveUpdates.autoRefreshIntervalSec}
            soundEnabled={notificationAlerts.prefs.soundEnabled}
            dayNotificationEnabled={notificationAlerts.prefs.dayNotificationEnabled}
            onSelectTheme={(t) => void updatePreferences({ theme: t })}
            onSelectIconTheme={(it) => void updatePreferences({ iconTheme: it })}
            onToggleDevanagariNums={() =>
              void updatePreferences({ useDevanagariNums: !useDevanagariNums })
            }
            onSelectRashi={(r) => void updatePreferences({ preferredRashi: r })}
            onTogglePrivateLock={setPrivateLockEnabled}
            onChangeAutoRefresh={liveUpdates.setAutoRefreshIntervalSec}
            onToggleSound={handleToggleSound}
            onToggleDayNotification={() =>
              notificationAlerts.updatePref(
                'dayNotificationEnabled',
                !notificationAlerts.prefs.dayNotificationEnabled
              )
            }
            onPlayTestSound={notificationAlerts.playTestSound}
            onOpenNotifications={() => setNotificationsOpen(true)}
            onOpenLogin={() => handleNavigate('login')}
            onClose={() => setSettingsOpen(false)}
          />

          <NotificationCenterModal
            isOpen={notificationsOpen}
            alerts={notificationAlerts.alerts}
            unreadCount={notificationAlerts.unreadCount}
            prefs={notificationAlerts.prefs}
            permission={notificationAlerts.permission}
            currentBuildId={liveUpdates.currentBuildId}
            latestVersionInfo={liveUpdates.latestVersionInfo}
            hasUpdateAvailable={liveUpdates.hasUpdateAvailable}
            isCheckingUpdates={liveUpdates.isChecking}
            isNativeCapacitor={liveUpdates.isNativeCapacitor}
            streamStatus={liveUpdates.streamStatus}
            autoRefreshIntervalSec={liveUpdates.autoRefreshIntervalSec}
            onChangeAutoRefresh={liveUpdates.setAutoRefreshIntervalSec}
            onUpdatePref={notificationAlerts.updatePref}
            onRequestPermission={notificationAlerts.requestPermission}
            onPlayTestSound={notificationAlerts.playTestSound}
            onSendTestNotification={notificationAlerts.sendTestNotification}
            onCheckForUpdates={() => liveUpdates.checkForUpdates(false)}
            onApplyLiveUpdate={liveUpdates.applyLiveUpdate}
            onAlertAction={handleAlertAction}
            onMarkRead={notificationAlerts.markAsRead}
            onMarkAllRead={notificationAlerts.markAllRead}
            onDismissAlert={notificationAlerts.dismissAlert}
            onClose={() => setNotificationsOpen(false)}
          />
        </Suspense>

        {/* Live Toast Notification Banner */}
        <NotificationToast
          alert={notificationAlerts.activeToast}
          onAction={handleAlertAction}
          onDismiss={notificationAlerts.dismissToast}
        />

        {/* Offline Connectivity Pill */}
        <OfflineIndicator />
      </div>
    </MotionConfig>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { BottomNav } from './components/BottomNav';
import { CalendarScreen } from './components/CalendarScreen';
import { ConverterScreen } from './components/ConverterScreen';
import { FestivalsScreen } from './components/FestivalsScreen';
import { HomeScreen } from './components/HomeScreen';
import { LoginScreen } from './components/LoginScreen';
import { NoteModal } from './components/NoteModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { NotificationToast } from './components/NotificationToast';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PanchangScreen } from './components/PanchangScreen';
import { Patro3DSceneScreen } from './components/Patro3DSceneScreen';
import { PatroAssistantScreen } from './components/PatroAssistantScreen';
import { SettingsModal } from './components/SettingsModal';
import { StickyDateBar } from './components/StickyDateBar';
import { useFirebase } from './contexts/FirebaseContext';
import { useLiveUpdates } from './hooks/useLiveUpdates';
import { useNepalTime } from './hooks/useNepalTime';
import { useNepalWeather } from './hooks/useNepalWeather';
import { AppNotificationAlert, useNotificationAlerts } from './hooks/useNotificationAlerts';
import { useUserEvents } from './hooks/useUserEvents';
import { useUserPreferences } from './hooks/useUserPreferences';
import { AppScreen } from './types/app';

export default function App() {
  const { authReady, isVerifiedIdentity } = useFirebase();
  const nepalTime = useNepalTime();
  const weatherState = useNepalWeather();
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

  const liveUpdates = useLiveUpdates();
  const notificationAlerts = useNotificationAlerts({
    nepalTime,
    weather: weatherState.weather,
    notes,
    hasUpdateAvailable: liveUpdates.hasUpdateAvailable,
    latestVersionInfo: liveUpdates.latestVersionInfo,
  });

  const [activeScreen, setActiveScreen] = useState<AppScreen>('home');
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

  const handleNavigate = useCallback(
    (screen: AppScreen) => {
      if (isLockedOut && screen !== 'login') {
        setActiveScreen('login');
        return;
      }
      setActiveScreen(screen);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [isLockedOut]
  );

  const handleOpenTodayInCalendar = useCallback(() => {
    if (isLockedOut) {
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
    setActiveScreen('calendar');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isLockedOut, nepalTime.todayBs]);

  const handleJumpToBsDate = useCallback(
    (bs: { year: number; month: number; day: number }) => {
      if (isLockedOut) {
        setActiveScreen('login');
        return;
      }
      setViewYear(bs.year);
      setViewMonth(bs.month);
      setSelectedBs(bs);
      setActiveScreen('calendar');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [isLockedOut]
  );

  const handleOpenNoteModal = useCallback(
    (bs?: { year: number; month: number; day: number }) => {
      if (isLockedOut) {
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

        {/* Main Content Container (Mobile-First, Expands Cleanly to Multi-Column Desktop) */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 pt-3 pb-24 lg:pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={effectiveScreen}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            >
              {effectiveScreen === 'login' && (
                <LoginScreen
                  iconTheme={iconTheme}
                  privateLockEnabled={privateLockEnabled}
                  onTogglePrivateLock={setPrivateLockEnabled}
                  onDone={() => {
                    if (!privateLockEnabled || isVerifiedIdentity) {
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

              {effectiveScreen === 'assistant' && (
                <PatroAssistantScreen
                  nepalTime={nepalTime}
                  preferredRashi={preferredRashi}
                  iconTheme={iconTheme}
                  onAddNote={addNote}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Full-Viewport Three.js 3D Sacred Sanctuary Overlay */}
        {effectiveScreen === 'sanctuary' && (
          <Patro3DSceneScreen
            nepalTime={nepalTime}
            onBack={() => handleNavigate('home')}
          />
        )}

        {/* Mobile Thumb-Zone Bottom Tab Bar */}
        {!isLockedOut && effectiveScreen !== 'sanctuary' && (
          <BottomNav
            activeScreen={effectiveScreen}
            iconTheme={iconTheme}
            onNavigate={handleNavigate}
          />
        )}

        {/* Personal Note Creation Modal */}
        <NoteModal
          isOpen={noteModalOpen}
          initialBsDate={noteModalDate}
          onClose={() => setNoteModalOpen(false)}
          onSave={addNote}
        />

        {/* App Settings & Aesthetic Theme Switcher Modal */}
        <SettingsModal
          isOpen={settingsOpen}
          activeTheme={theme}
          activeIconTheme={iconTheme}
          useDevanagariNums={useDevanagariNums}
          preferredRashi={preferredRashi}
          privateLockEnabled={privateLockEnabled}
          unreadAlertsCount={notificationAlerts.unreadCount}
          hasLiveUpdate={liveUpdates.hasUpdateAvailable}
          onSelectTheme={(t) => void updatePreferences({ theme: t })}
          onSelectIconTheme={(it) => void updatePreferences({ iconTheme: it })}
          onToggleDevanagariNums={() =>
            void updatePreferences({ useDevanagariNums: !useDevanagariNums })
          }
          onSelectRashi={(r) => void updatePreferences({ preferredRashi: r })}
          onTogglePrivateLock={setPrivateLockEnabled}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onOpenLogin={() => handleNavigate('login')}
          onClose={() => setSettingsOpen(false)}
        />

        {/* Notification Alert & Live Update Center Modal */}
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
          onUpdatePref={notificationAlerts.updatePref}
          onRequestPermission={notificationAlerts.requestPermission}
          onSendTestNotification={notificationAlerts.sendTestNotification}
          onCheckForUpdates={liveUpdates.checkForUpdates}
          onApplyLiveUpdate={liveUpdates.applyLiveUpdate}
          onAlertAction={handleAlertAction}
          onMarkRead={notificationAlerts.markAsRead}
          onMarkAllRead={notificationAlerts.markAllRead}
          onDismissAlert={notificationAlerts.dismissAlert}
          onClose={() => setNotificationsOpen(false)}
        />

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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BottomNav } from './components/BottomNav';
import { CalendarScreen } from './components/CalendarScreen';
import { ConverterScreen } from './components/ConverterScreen';
import { FestivalsScreen } from './components/FestivalsScreen';
import { HomeScreen } from './components/HomeScreen';
import { NoteModal } from './components/NoteModal';
import { PanchangScreen } from './components/PanchangScreen';
import { SettingsModal } from './components/SettingsModal';
import { StickyDateBar } from './components/StickyDateBar';
import { useNepalTime } from './hooks/useNepalTime';
import { useUserEvents } from './hooks/useUserEvents';
import { useUserPreferences } from './hooks/useUserPreferences';
import { AppScreen } from './types/app';

export default function App() {
  const nepalTime = useNepalTime();
  const { notes, isCloudSynced, addNote, deleteNote } = useUserEvents();
  const { preferredRashi, useDevanagariNums, theme, updatePreferences } = useUserPreferences();

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

  const handleNavigate = useCallback((screen: AppScreen) => {
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenTodayInCalendar = useCallback(() => {
    setViewYear(nepalTime.todayBs.year);
    setViewMonth(nepalTime.todayBs.month);
    setSelectedBs({
      year: nepalTime.todayBs.year,
      month: nepalTime.todayBs.month,
      day: nepalTime.todayBs.day,
    });
    setActiveScreen('calendar');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [nepalTime.todayBs]);

  const handleJumpToBsDate = useCallback(
    (bs: { year: number; month: number; day: number }) => {
      setViewYear(bs.year);
      setViewMonth(bs.month);
      setSelectedBs(bs);
      setActiveScreen('calendar');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const handleOpenNoteModal = useCallback(
    (bs?: { year: number; month: number; day: number }) => {
      setNoteModalDate(
        bs ?? {
          year: nepalTime.todayBs.year,
          month: nepalTime.todayBs.month,
          day: nepalTime.todayBs.day,
        }
      );
      setNoteModalOpen(true);
    },
    [nepalTime.todayBs]
  );

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col transition-colors duration-200">
      {/* Persistent Floating Themed Sticky Date Bar Across All Screens */}
      <StickyDateBar
        nepalTime={nepalTime}
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        onOpenTodayInCalendar={handleOpenTodayInCalendar}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main Content Container (Mobile-First, Expands Cleanly to Multi-Column Desktop) */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 pt-3 pb-24 lg:pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeScreen === 'home' && (
              <HomeScreen
                nepalTime={nepalTime}
                notes={notes}
                isCloudSynced={isCloudSynced}
                onNavigate={handleNavigate}
                onJumpToBsDate={handleJumpToBsDate}
                onOpenNoteModal={handleOpenNoteModal}
                onDeleteNote={(id) => void deleteNote(id)}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            )}

            {activeScreen === 'calendar' && (
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

            {activeScreen === 'panchang' && (
              <PanchangScreen
                nepalTime={nepalTime}
                preferredRashi={preferredRashi}
                onSelectRashi={(rashiId) => void updatePreferences({ preferredRashi: rashiId })}
                onJumpToBsDate={handleJumpToBsDate}
              />
            )}

            {activeScreen === 'converter' && (
              <ConverterScreen
                nepalTime={nepalTime}
                onJumpToBsDate={handleJumpToBsDate}
              />
            )}

            {activeScreen === 'festivals' && (
              <FestivalsScreen
                nepalTime={nepalTime}
                notes={notes}
                isCloudSynced={isCloudSynced}
                onJumpToBsDate={handleJumpToBsDate}
                onOpenNoteModal={handleOpenNoteModal}
                onDeleteNote={(id) => void deleteNote(id)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Thumb-Zone Bottom Tab Bar */}
      <BottomNav activeScreen={activeScreen} onNavigate={handleNavigate} />

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
        useDevanagariNums={useDevanagariNums}
        preferredRashi={preferredRashi}
        onSelectTheme={(t) => void updatePreferences({ theme: t })}
        onToggleDevanagariNums={() =>
          void updatePreferences({ useDevanagariNums: !useDevanagariNums })
        }
        onSelectRashi={(r) => void updatePreferences({ preferredRashi: r })}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

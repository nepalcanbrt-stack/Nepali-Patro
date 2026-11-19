import { memo, useState } from 'react';
import { motion } from 'motion/react';
import {
  BellRing,
  CalendarCheck2,
  RefreshCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  AUTO_REFRESH_OPTIONS,
  AutoRefreshIntervalSec,
  LiveStreamStatus,
} from '../hooks/useLiveUpdates';
import { NepalTimeState } from '../hooks/useNepalTime';
import { AppNotificationAlert } from '../hooks/useNotificationAlerts';
import {
  formatBsDateNe,
  getWeekdayNameEn,
  getWeekdayNameNe,
} from '../utils/nepaliDate';
import { evaluateSubhaSaait } from '../utils/panchang';
import { PATRO_EASE } from '../utils/motionVariants';

interface DayNotificationBarProps {
  nepalTime: NepalTimeState;
  alerts: AppNotificationAlert[];
  unreadCount: number;
  autoRefreshIntervalSec: AutoRefreshIntervalSec;
  isCheckingUpdates: boolean;
  streamStatus: LiveStreamStatus;
  hasUpdateAvailable: boolean;
  soundEnabled: boolean;
  onChangeAutoRefresh: (sec: AutoRefreshIntervalSec) => void;
  onManualRefresh: () => void;
  onToggleSound: () => void;
  onOpenNotifications: () => void;
}

export const DayNotificationBar = memo(function DayNotificationBar({
  nepalTime,
  alerts,
  unreadCount,
  autoRefreshIntervalSec,
  isCheckingUpdates,
  streamStatus,
  hasUpdateAvailable,
  soundEnabled,
  onChangeAutoRefresh,
  onManualRefresh,
  onToggleSound,
  onOpenNotifications,
}: DayNotificationBarProps) {
  const [pulseKey, setPulseKey] = useState(0);

  const weekdayNe = getWeekdayNameNe(nepalTime.todayBs.weekday);
  const weekdayEn = getWeekdayNameEn(nepalTime.todayAd.weekday);
  const saait = evaluateSubhaSaait(
    nepalTime.todayBs,
    nepalTime.panchang,
    nepalTime.hours,
    nepalTime.minutes
  );

  const priorityAlert =
    alerts.find((a) => a.category === 'update') ??
    alerts.find((a) => a.severity === 'critical') ??
    alerts.find((a) => a.category === 'weather') ??
    alerts.find((a) => a.category === 'festival') ??
    alerts.find((a) => a.category === 'note');

  const dayHeadlineNe = priorityAlert
    ? priorityAlert.titleNe
    : `${weekdayNe} · ${formatBsDateNe(nepalTime.todayBs)}`;
  const daySubline = priorityAlert
    ? `${weekdayEn} · ${priorityAlert.titleEn}`
    : `${nepalTime.panchang.fullTithiNe} · ${
        saait.inRahuKaal ? 'राहुकाल सावधान' : `शुभ साइत ${saait.windowEn}`
      }`;

  const handleManualTap = () => {
    setPulseKey((k) => k + 1);
    onManualRefresh();
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: PATRO_EASE }}
      aria-label="Day notification and auto-refresh bar"
      style={{
        boxShadow: 'var(--card-shadow)',
        backgroundImage:
          hasUpdateAvailable || priorityAlert?.severity === 'critical'
            ? 'linear-gradient(135deg, var(--card-highlight-from), var(--bg-surface))'
            : undefined,
      }}
      className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-3 py-2 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5"
    >
      {/* Left: Day Notification Summary */}
      <button
        type="button"
        onClick={onOpenNotifications}
        className="flex items-center gap-2.5 min-w-0 flex-1 text-left group cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-link)] rounded-xl"
      >
        <span
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
            hasUpdateAvailable || priorityAlert?.severity === 'critical'
              ? 'bg-[#FFE4E6] text-[#BE123C] border-[#FDA4AF] dark:bg-[#4C0519] dark:text-[#FDA4AF] dark:border-[#FB7185]/40'
              : 'bg-[var(--accent-soft-bg)] text-[var(--accent-soft-text)] border-[var(--border-accent)]'
          }`}
        >
          {priorityAlert ? (
            <BellRing className="h-4 w-4" />
          ) : (
            <CalendarCheck2 className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#BE123C] ring-2 ring-[var(--bg-surface)]" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--bg-surface-soft)] border border-[var(--border-soft)] text-[var(--accent-secondary)] shrink-0">
              {weekdayEn.slice(0, 3)}
            </span>
            <p className="font-devanagari text-xs sm:text-[13px] font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-link)] transition-colors">
              {dayHeadlineNe}
            </p>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5 tabular-nums">
            {daySubline}
          </p>
        </div>
      </button>

      {/* Right: Auto-Refresh Interval Selector (10s/15s/30s/60s/Off), Manual Refresh & Sound Toggle */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div
          className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-1.5 rounded-xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)]"
          title="Live auto-refresh interval"
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full shrink-0 ${
              autoRefreshIntervalSec > 0 && streamStatus !== 'offline'
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-[var(--text-muted)]/50'
            }`}
          />
          <label htmlFor="day-bar-refresh-select" className="text-[10px] font-bold text-[var(--text-muted)] whitespace-nowrap hidden sm:inline">
            Auto
          </label>
          <select
            id="day-bar-refresh-select"
            aria-label="Auto refresh interval"
            value={autoRefreshIntervalSec}
            onChange={(e) =>
              onChangeAutoRefresh(Number(e.target.value) as AutoRefreshIntervalSec)
            }
            className="bg-transparent text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer pr-1"
          >
            {AUTO_REFRESH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.shortLabel}
              </option>
            ))}
          </select>
        </div>

        <button
          key={pulseKey}
          type="button"
          onClick={handleManualTap}
          aria-label="Refresh Patro & live status now"
          title="Refresh now"
          className="h-9 w-9 flex items-center justify-center rounded-xl bg-[var(--bg-surface-soft)] hover:bg-[var(--accent-soft-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
        </button>

        <button
          type="button"
          onClick={onToggleSound}
          aria-pressed={soundEnabled}
          aria-label={soundEnabled ? 'Mute auto notification sound' : 'Enable auto notification sound'}
          title={soundEnabled ? 'Auto Sound: On' : 'Auto Sound: Off'}
          className={`h-9 w-9 flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
            soundEnabled
              ? 'bg-[var(--accent-soft-bg)] border-[var(--border-accent)] text-[var(--accent-soft-text)]'
              : 'bg-[var(--bg-surface-soft)] border-[var(--border-subtle)] text-[var(--text-muted)]'
          }`}
        >
          {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        </button>
      </div>
    </motion.section>
  );
});

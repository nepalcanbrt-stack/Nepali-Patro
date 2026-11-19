import { useEffect } from 'react';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import {
  AlertTriangle,
  Bell,
  BellRing,
  Calendar,
  Check,
  CheckCheck,
  CloudRain,
  DownloadCloud,
  RefreshCw,
  Sparkles,
  Timer,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  AUTO_REFRESH_OPTIONS,
  AutoRefreshIntervalSec,
  LiveStreamStatus,
  LiveVersionInfo,
} from '../hooks/useLiveUpdates';
import { AppNotificationAlert, NotificationPrefs } from '../hooks/useNotificationAlerts';
import {
  modalBackdropVariants,
  modalSheetVariants,
  PATRO_SPRING_SNAPPY,
} from '../utils/motionVariants';

interface NotificationCenterModalProps {
  isOpen: boolean;
  alerts: AppNotificationAlert[];
  unreadCount: number;
  prefs: NotificationPrefs;
  permission: NotificationPermission | 'unsupported';
  currentBuildId: string;
  latestVersionInfo: LiveVersionInfo;
  hasUpdateAvailable: boolean;
  isCheckingUpdates: boolean;
  isNativeCapacitor: boolean;
  streamStatus: LiveStreamStatus;
  autoRefreshIntervalSec: AutoRefreshIntervalSec;
  onChangeAutoRefresh: (sec: AutoRefreshIntervalSec) => void;
  onUpdatePref: <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => void;
  onRequestPermission: () => Promise<NotificationPermission | 'unsupported'>;
  onPlayTestSound: () => Promise<boolean>;
  onSendTestNotification: () => Promise<NotificationPermission | 'unsupported'>;
  onCheckForUpdates: () => Promise<boolean>;
  onApplyLiveUpdate: () => Promise<void>;
  onAlertAction: (alert: AppNotificationAlert) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismissAlert: (id: string) => void;
  onClose: () => void;
}

export function NotificationCenterModal({
  isOpen,
  alerts,
  unreadCount,
  prefs,
  permission,
  currentBuildId,
  latestVersionInfo,
  hasUpdateAvailable,
  isCheckingUpdates,
  isNativeCapacitor,
  streamStatus,
  autoRefreshIntervalSec,
  onChangeAutoRefresh,
  onUpdatePref,
  onRequestPermission,
  onPlayTestSound,
  onSendTestNotification,
  onCheckForUpdates,
  onApplyLiveUpdate,
  onAlertAction,
  onMarkRead,
  onMarkAllRead,
  onDismissAlert,
  onClose,
}: NotificationCenterModalProps) {
  const dragControls = useDragControls();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const renderIcon = (alert: AppNotificationAlert) => {
    if (alert.category === 'update') return DownloadCloud;
    if (alert.category === 'weather') return alert.severity === 'info' ? CloudRain : AlertTriangle;
    if (alert.category === 'festival') return Sparkles;
    if (alert.category === 'note' || alert.category === 'day') return Calendar;
    return Bell;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={modalBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-center-title"
        >
          <motion.div
            variants={modalSheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 260 }}
            dragElastic={{ top: 0.04, bottom: 0.36 }}
            dragSnapToOrigin
            transition={PATRO_SPRING_SNAPPY}
            onDragEnd={(_event, info) => {
              if (info.offset.y > 84 || info.velocity.y > 420) {
                onClose();
              }
            }}
            className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-2xl"
          >
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="sm:hidden pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
            >
              <div className="w-10 h-1.5 bg-[var(--border-accent)]/60 rounded-full mx-auto" />
            </div>

            {/* Sticky Header */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-3 bg-[var(--bg-surface)] border-b border-[var(--border-soft)] touch-none"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft-bg)] text-[var(--accent-soft-text)]">
                  <BellRing className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h2 id="notification-center-title" className="text-lg font-bold text-[var(--text-primary)]">
                    Alerts, Sound &amp; Auto-Refresh{' '}
                    <span className="font-devanagari text-[var(--accent-secondary)]">· सूचना</span>
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    {unreadCount > 0
                      ? `${unreadCount} active unread alert${unreadCount > 1 ? 's' : ''}`
                      : 'All Patro alerts & live updates reviewed'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onClose}
                aria-label="Close notifications"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-surface-soft)] active:scale-[0.94] transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Live Deploy & Auto-Refresh Interval Card */}
              <section
                aria-label="Live update and auto-refresh controls"
                className={`p-4 rounded-2xl border space-y-3.5 ${
                  hasUpdateAvailable
                    ? 'bg-[#FFFBEB] border-[#F59E0B]/60 dark:bg-amber-950/40 dark:border-amber-600/50'
                    : 'bg-[var(--bg-surface-soft)] border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <DownloadCloud className="h-4 w-4 text-[var(--accent-secondary)] shrink-0" />
                      {hasUpdateAvailable
                        ? 'New Live Update Ready · नयाँ अपडेट तयार'
                        : isNativeCapacitor
                        ? 'Android APK Live Build'
                        : streamStatus === 'live'
                        ? 'Live Auto-Update Active'
                        : streamStatus === 'offline'
                        ? 'Offline Cached Build'
                        : 'Connecting Live Stream'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 break-all">
                      Current: <span className="font-semibold text-[var(--text-secondary)]">{currentBuildId}</span>
                      {hasUpdateAvailable && latestVersionInfo.buildId !== currentBuildId
                        ? ` → Latest: ${latestVersionInfo.buildId}`
                        : ''}
                    </p>
                  </div>

                  {hasUpdateAvailable ? (
                    <button
                      type="button"
                      onClick={() => void onApplyLiveUpdate()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-xs font-bold text-white whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Update Now
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void onCheckForUpdates()}
                      disabled={isCheckingUpdates}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-accent)] text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${isCheckingUpdates ? 'animate-spin' : ''}`}
                      />
                      Refresh Now
                    </button>
                  )}
                </div>

                {/* Auto Refresh Speed Picker (10s / 15s / 30s / 60s / Off) */}
                <div className="pt-3 border-t border-[var(--border-soft)] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Timer className="h-3.5 w-3.5 text-[var(--accent-link)]" />
                      Auto Refresh Interval
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                      {autoRefreshIntervalSec === 0 ? 'Manual only' : `Every ${autoRefreshIntervalSec}s`}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {AUTO_REFRESH_OPTIONS.map((opt) => {
                      const active = autoRefreshIntervalSec === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => onChangeAutoRefresh(opt.value)}
                          aria-pressed={active}
                          className={`h-9 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            active
                              ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white shadow-xs'
                              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-accent)]'
                          }`}
                        >
                          {opt.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Notification Sound, Day Bar & Device Permission */}
              <section className="p-4 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      {prefs.soundEnabled ? (
                        <Volume2 className="h-4 w-4 text-[var(--accent-secondary)]" />
                      ) : (
                        <VolumeX className="h-4 w-4 text-[var(--text-muted)]" />
                      )}
                      Auto Notification Sound &amp; Popups
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {permission === 'granted'
                        ? 'Temple chime & OS alerts active'
                        : permission === 'denied'
                        ? 'OS popups blocked — chime & in-app alerts active'
                        : 'Play chime automatically when new alerts trigger'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => void onPlayTestSound()}
                      className="px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-accent)] text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap cursor-pointer"
                    >
                      Test Sound
                    </button>
                    {permission === 'default' ? (
                      <button
                        type="button"
                        onClick={() => void onRequestPermission()}
                        className="px-3 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-xs font-bold text-white whitespace-nowrap cursor-pointer"
                      >
                        Enable
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void onSendTestNotification()}
                        className="px-3 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-xs font-bold text-white whitespace-nowrap cursor-pointer"
                      >
                        Test Alert
                      </button>
                    )}
                  </div>
                </div>

                {/* Alert Category Toggles */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-soft)]">
                  {(
                    [
                      { key: 'dayNotificationEnabled', label: 'Day Notification Bar' },
                      { key: 'soundEnabled', label: 'Auto Alert Sound' },
                      { key: 'weatherAlerts', label: 'Weather (38°C+ / <10°C / Rain)' },
                      { key: 'festivalAlerts', label: 'Festivals & Ekadashi' },
                      { key: 'noteReminders', label: 'Personal Notes & Puja' },
                      { key: 'saaitAlerts', label: 'Subha Saait & Rahu Kaal' },
                      { key: 'liveUpdateAlerts', label: 'Live App Updates' },
                      { key: 'browserNotifications', label: 'Device OS Popups' },
                    ] as const
                  ).map((item) => {
                    const active = prefs[item.key];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        role="switch"
                        aria-checked={active}
                        onClick={() => onUpdatePref(item.key, !active)}
                        className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border text-[11px] font-semibold text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-[var(--accent-soft-bg)] border-[var(--border-accent)] text-[var(--text-primary)]'
                            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                            active
                              ? 'bg-[var(--accent-primary)] text-white'
                              : 'border border-[var(--border-subtle)]'
                          }`}
                        >
                          {active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Alert Feed */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Active Alerts ({alerts.length})
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllRead}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-link)] hover:underline cursor-pointer"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                {alerts.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)] text-center">
                    <Bell className="h-6 w-6 mx-auto text-[var(--text-muted)] mb-2" />
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      No pending alerts right now
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Day summaries, weather thresholds, Ekadashi/festivals, scheduled notes, and live deploys appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {alerts.map((alert) => {
                      const Icon = renderIcon(alert);
                      const badgeStyle =
                        alert.severity === 'critical'
                          ? 'bg-[#FFE4E6] text-[#BE123C] dark:bg-[#4C0519] dark:text-[#FDA4AF]'
                          : alert.severity === 'warning'
                          ? 'bg-[#FEF3C7] text-[#B45309] dark:bg-[#451A03] dark:text-[#FCD34D]'
                          : alert.severity === 'success'
                          ? 'bg-[#DCFCE7] text-[#15803D] dark:bg-[#064E3B] dark:text-[#6EE7B7]'
                          : 'bg-[var(--accent-soft-bg)] text-[var(--accent-soft-text)]';

                      return (
                        <div
                          key={alert.id}
                          className={`p-3.5 rounded-2xl border transition-colors ${
                            alert.read
                              ? 'bg-[var(--bg-surface-soft)]/70 border-[var(--border-subtle)] opacity-80'
                              : 'bg-[var(--bg-surface-soft)] border-[var(--border-accent)]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${badgeStyle}`}
                            >
                              <Icon className="h-4.5 w-4.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-devanagari text-xs font-bold text-[var(--accent-secondary)]">
                                    {alert.titleNe}
                                  </p>
                                  <p className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                                    {alert.titleEn}
                                  </p>
                                </div>
                                <span className="text-[10px] font-semibold text-[var(--text-muted)] whitespace-nowrap shrink-0">
                                  {alert.timestampLabel}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                                {alert.body}
                              </p>
                              <div className="flex items-center justify-between gap-2 mt-2.5">
                                <div className="flex items-center gap-2">
                                  {alert.actionLabel && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onMarkRead(alert.id);
                                        onAlertAction(alert);
                                      }}
                                      className="px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[11px] font-bold text-white transition-colors cursor-pointer"
                                    >
                                      {alert.actionLabel}
                                    </button>
                                  )}
                                  {!alert.read && (
                                    <button
                                      type="button"
                                      onClick={() => onMarkRead(alert.id)}
                                      className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                                    >
                                      Mark Read
                                    </button>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onDismissAlert(alert.id)}
                                  aria-label={`Dismiss ${alert.titleEn}`}
                                  className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--holiday-soft-text)] hover:bg-[var(--holiday-soft-bg)] transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

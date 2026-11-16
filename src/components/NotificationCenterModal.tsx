import { AnimatePresence, motion } from 'motion/react';
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
  Trash2,
  X,
} from 'lucide-react';
import { LiveStreamStatus, LiveVersionInfo } from '../hooks/useLiveUpdates';
import { AppNotificationAlert, NotificationPrefs } from '../hooks/useNotificationAlerts';

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
  onUpdatePref: <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => void;
  onRequestPermission: () => Promise<NotificationPermission | 'unsupported'>;
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
  onUpdatePref,
  onRequestPermission,
  onSendTestNotification,
  onCheckForUpdates,
  onApplyLiveUpdate,
  onAlertAction,
  onMarkRead,
  onMarkAllRead,
  onDismissAlert,
  onClose,
}: NotificationCenterModalProps) {
  const renderIcon = (alert: AppNotificationAlert) => {
    if (alert.category === 'update') return DownloadCloud;
    if (alert.category === 'weather') return alert.severity === 'info' ? CloudRain : AlertTriangle;
    if (alert.category === 'festival') return Sparkles;
    if (alert.category === 'note') return Calendar;
    return Bell;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-center-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-2xl"
          >
            <div className="sm:hidden w-10 h-1.5 bg-[var(--border-accent)]/60 rounded-full mx-auto mt-3" />

            {/* Sticky Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-3 bg-[var(--bg-surface)] border-b border-[var(--border-soft)]">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft-bg)] text-[var(--accent-soft-text)]">
                  <BellRing className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h2 id="notification-center-title" className="text-lg font-bold text-[var(--text-primary)]">
                    Alerts &amp; Live Updates{' '}
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
                onClick={onClose}
                aria-label="Close notifications"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-surface-soft)] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Live Deploy & App Update Card */}
              <section
                aria-label="Live update status"
                className={`p-4 rounded-2xl border ${
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
                    !isNativeCapacitor && (
                      <button
                        type="button"
                        onClick={() => void onCheckForUpdates()}
                        disabled={isCheckingUpdates}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-accent)] text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${isCheckingUpdates ? 'animate-spin' : ''}`}
                        />
                        Check Live
                      </button>
                    )
                  )}
                </div>
              </section>

              {/* Device Notification Permission & Test Trigger */}
              <section className="p-4 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      Device Notification Alerts
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {permission === 'granted'
                        ? 'Allowed on this device for weather, festivals & live updates'
                        : permission === 'denied'
                        ? 'Blocked in browser settings — in-app alerts remain active'
                        : permission === 'unsupported'
                        ? 'OS push unavailable here — in-app toast alerts active'
                        : 'Allow device notifications for instant weather & reminder alerts'}
                    </p>
                  </div>

                  {permission === 'default' ? (
                    <button
                      type="button"
                      onClick={() => void onRequestPermission()}
                      className="px-3.5 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-xs font-bold text-white whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Enable
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void onSendTestNotification()}
                      className="px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-accent)] text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Test Alert
                    </button>
                  )}
                </div>

                {/* Alert Category Toggles */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-soft)]">
                  {(
                    [
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
                      Weather thresholds, today’s Ekadashi/festivals, scheduled notes, and live deploys appear here automatically.
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

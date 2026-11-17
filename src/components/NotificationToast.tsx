import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Bell,
  CloudRain,
  DownloadCloud,
  Sparkles,
  X,
} from 'lucide-react';
import { AppNotificationAlert } from '../hooks/useNotificationAlerts';
import { PATRO_SPRING_SNAPPY } from '../utils/motionVariants';

interface NotificationToastProps {
  alert: AppNotificationAlert | null;
  onAction: (alert: AppNotificationAlert) => void;
  onDismiss: () => void;
}

export function NotificationToast({ alert, onAction, onDismiss }: NotificationToastProps) {
  const getIcon = (a: AppNotificationAlert) => {
    if (a.category === 'update') return DownloadCloud;
    if (a.category === 'weather') return a.severity === 'info' ? CloudRain : AlertTriangle;
    if (a.category === 'festival' || a.category === 'saait') return Sparkles;
    return Bell;
  };

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.96 }}
          transition={PATRO_SPRING_SNAPPY}
          drag="x"
          dragConstraints={{ left: -140, right: 200 }}
          dragElastic={0.28}
          dragSnapToOrigin
          onDragEnd={(_e, info) => {
            if (Math.abs(info.offset.x) > 72 || Math.abs(info.velocity.x) > 420) {
              onDismiss();
            }
          }}
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 right-3.5 sm:right-6 z-50 w-[calc(100%-1.75rem)] max-w-sm rounded-2xl bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-accent)] shadow-2xl p-3.5 cursor-grab active:cursor-grabbing"
        >
          {(() => {
            const Icon = getIcon(alert);
            const toneClass =
              alert.severity === 'critical'
                ? 'bg-[#FFE4E6] text-[#BE123C] dark:bg-[#4C0519] dark:text-[#FDA4AF]'
                : alert.severity === 'warning'
                ? 'bg-[#FEF3C7] text-[#B45309] dark:bg-[#451A03] dark:text-[#FCD34D]'
                : alert.severity === 'success'
                ? 'bg-[#DCFCE7] text-[#15803D] dark:bg-[#064E3B] dark:text-[#6EE7B7]'
                : 'bg-[var(--accent-soft-bg)] text-[var(--accent-soft-text)]';

            return (
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-devanagari text-xs font-bold text-[var(--accent-secondary)] truncate">
                        {alert.titleNe}
                      </p>
                      <p className="text-xs font-extrabold text-[var(--text-primary)] truncate">
                        {alert.titleEn}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onDismiss}
                      aria-label="Dismiss notification"
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)] active:scale-[0.94] transition-all cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-snug line-clamp-2">
                    {alert.body}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-2.5">
                    <span className="text-[10px] font-medium text-[var(--text-muted)]">
                      {alert.timestampLabel}
                    </span>
                    {alert.actionLabel && (
                      <button
                        type="button"
                        onClick={() => onAction(alert)}
                        className="px-2.5 py-1 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] active:scale-[0.97] text-[11px] font-bold text-white transition-all cursor-pointer"
                      >
                        {alert.actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

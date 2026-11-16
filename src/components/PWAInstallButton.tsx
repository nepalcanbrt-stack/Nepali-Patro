import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors cursor-pointer'
            : 'inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer'
        }
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        Install App (PWA)
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-accent)] transition-colors cursor-pointer"
        >
          <Smartphone className="h-3.5 w-3.5 text-[var(--accent-link)]" />
          Install on iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] p-5 shadow-2xl">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-base font-bold">Install on iPhone / iPad</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install instructions"
                  className="p-1.5 rounded-full hover:bg-[var(--bg-surface-soft)] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                1. Tap the <strong>Share</strong> icon in Safari’s toolbar.
                <br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
                <br />
                3. Nepal Patro will open fullscreen with offline support &amp; live updates.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-[var(--accent-primary)] py-2.5 text-xs font-bold text-white hover:bg-[var(--accent-primary-hover)] transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

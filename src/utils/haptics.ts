import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export type HapticImpactLevel = 'light' | 'medium' | 'heavy';

/**
 * Triggers native Capacitor haptic impact on Android/iOS when available,
 * falling back cleanly to Web Vibration API on supported browsers.
 */
export async function triggerHapticImpact(level: HapticImpactLevel = 'medium'): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const style =
        level === 'heavy'
          ? ImpactStyle.Heavy
          : level === 'light'
          ? ImpactStyle.Light
          : ImpactStyle.Medium;
      await Haptics.impact({ style });
      return;
    }
  } catch {
    // Fall back to browser vibration API
  }

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(level === 'heavy' ? 35 : level === 'light' ? 14 : 24);
    } catch {
      // Ignore blocked vibration in restricted frames
    }
  }
}

/**
 * Triggers a crisp two-pulse haptic confirmation after completing an action (e.g. Copy to Clipboard).
 */
export async function triggerHapticSuccess(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({ type: NotificationType.Success });
      return;
    }
  } catch {
    // Fall back to browser vibration API
  }

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate([14, 28, 18]);
    } catch {
      // Ignore blocked vibration
    }
  }
}

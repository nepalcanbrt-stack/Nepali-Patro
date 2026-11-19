/**
 * Web Audio API Notification & Chime Synthesizer for Nepal Patro.
 * Zero external audio file dependencies — works 100% offline in PWA & Capacitor WebView.
 */

export type ChimeSeverity = 'info' | 'warning' | 'critical' | 'success';

let sharedAudioCtx: AudioContext | null = null;
let unlockListenersAttached = false;
let audioUnlocked = false;
let lastChimeAt = 0;

function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function getOrCreateAudioContext(): AudioContext | null {
  const AudioCtx = getAudioContextClass();
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  return sharedAudioCtx;
}

/**
 * Unlocks Web Audio on the user's first pointer/key gesture so subsequent
 * automatic notifications can play chimes smoothly without browser restrictions.
 */
export function attachAudioUnlockListeners(): () => void {
  if (typeof window === 'undefined' || unlockListenersAttached) {
    return () => {};
  }
  unlockListenersAttached = true;

  const unlock = () => {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => {
        audioUnlocked = true;
      }).catch(() => {});
    } else {
      audioUnlocked = true;
    }
    if (audioUnlocked) {
      cleanup();
    }
  };

  const cleanup = () => {
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
    window.removeEventListener('touchstart', unlock, true);
    unlockListenersAttached = false;
  };

  window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  window.addEventListener('keydown', unlock, { capture: true, passive: true });
  window.addEventListener('touchstart', unlock, { capture: true, passive: true });

  return cleanup;
}

function scheduleTone(
  ctx: AudioContext,
  freqHz: number,
  startTime: number,
  durationSec: number,
  peakGain: number,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqHz, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + durationSec + 0.02);
}

/**
 * Plays a gentle, distinctive Nepali temple-chime / bell tone for notifications.
 * Includes a short 800ms cooldown to prevent overlapping bursts.
 */
export async function playNotificationChime(
  severity: ChimeSeverity = 'info',
  force = false
): Promise<boolean> {
  const nowMs = Date.now();
  if (!force && nowMs - lastChimeAt < 800) {
    return false;
  }

  const ctx = getOrCreateAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (ctx.state !== 'running') {
      return false;
    }
    audioUnlocked = true;
    lastChimeAt = nowMs;

    const now = ctx.currentTime + 0.01;

    if (severity === 'critical') {
      // Crisp double brass bell chime (G5 -> C6 -> G5)
      scheduleTone(ctx, 783.99, now, 0.22, 0.14, 'triangle');
      scheduleTone(ctx, 1046.5, now + 0.12, 0.3, 0.15, 'sine');
      scheduleTone(ctx, 1567.98, now + 0.12, 0.26, 0.05, 'sine');
    } else if (severity === 'warning') {
      // Resonant singing-bowl chime (E5 -> B5)
      scheduleTone(ctx, 659.25, now, 0.28, 0.12, 'sine');
      scheduleTone(ctx, 987.77, now + 0.14, 0.38, 0.13, 'sine');
      scheduleTone(ctx, 1318.5, now + 0.14, 0.3, 0.04, 'triangle');
    } else if (severity === 'success') {
      // Auspicious upward harmonic (C5 -> E5 -> G5)
      scheduleTone(ctx, 523.25, now, 0.18, 0.1, 'sine');
      scheduleTone(ctx, 659.25, now + 0.09, 0.2, 0.11, 'sine');
      scheduleTone(ctx, 783.99, now + 0.18, 0.34, 0.12, 'sine');
    } else {
      // Soft daily Patro chime (A5 -> E6)
      scheduleTone(ctx, 880, now, 0.22, 0.09, 'sine');
      scheduleTone(ctx, 1318.51, now + 0.1, 0.32, 0.1, 'sine');
    }
    return true;
  } catch {
    return false;
  }
}

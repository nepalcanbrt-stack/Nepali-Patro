import React, { useCallback, useRef, useState } from 'react';
import { AppScreen } from '../types/app';

export const SWIPE_SCREEN_ORDER: AppScreen[] = [
  'home',
  'calendar',
  'panchang',
  'converter',
  'festivals',
  'assistant',
];

export const SCREEN_LABELS: Record<AppScreen, { en: string; ne: string }> = {
  home: { en: 'Home', ne: 'गृह' },
  calendar: { en: 'Patro', ne: 'पात्रो' },
  panchang: { en: 'Panchang', ne: 'पञ्चाङ्ग' },
  converter: { en: 'Converter', ne: 'रूपान्तरण' },
  festivals: { en: 'Festivals', ne: 'चाडपर्व' },
  assistant: { en: 'AI Guide', ne: 'ज्योतिष AI' },
  sanctuary: { en: '3D Stupa', ne: '३डी मन्दिर' },
  login: { en: 'Account', ne: 'खाता' },
};

export interface SwipePreview {
  screen: AppScreen;
  label: string;
  labelNe: string;
  side: 'left' | 'right';
  progress: number;
}

interface UseSwipeNavigationOptions {
  activeScreen: AppScreen;
  disabled: boolean;
  onNavigate: (screen: AppScreen, direction: number) => void;
}

function isInteractiveOrScrollableTarget(startTarget: EventTarget | null): boolean {
  if (!(startTarget instanceof Element)) return false;
  if (
    startTarget.closest(
      'input, textarea, select, option, [contenteditable="true"], [data-no-swipe="true"], [role="dialog"]'
    )
  ) {
    return true;
  }

  let el: Element | null = startTarget;
  while (el && el !== document.body) {
    if (el instanceof HTMLElement) {
      const style = window.getComputedStyle(el);
      const overflowX = style.overflowX;
      if (
        (overflowX === 'auto' || overflowX === 'scroll') &&
        el.scrollWidth > el.clientWidth + 6
      ) {
        return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

export function useSwipeNavigation({
  activeScreen,
  disabled,
  onNavigate,
}: UseSwipeNavigationOptions) {
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [preview, setPreview] = useState<SwipePreview | null>(null);

  const gestureRef = useRef<{
    active: boolean;
    lockedAxis: 'none' | 'x' | 'y';
    startX: number;
    startY: number;
    startTime: number;
    lastDx: number;
  }>({
    active: false,
    lockedAxis: 'none',
    startX: 0,
    startY: 0,
    startTime: 0,
    lastDx: 0,
  });

  const currentIdx = SWIPE_SCREEN_ORDER.indexOf(activeScreen);
  const isSwipeableScreen = currentIdx !== -1 && !disabled;

  const resetGesture = useCallback(() => {
    gestureRef.current.active = false;
    gestureRef.current.lockedAxis = 'none';
    gestureRef.current.lastDx = 0;
    setDragOffsetX(0);
    setPreview(null);
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (!isSwipeableScreen || e.touches.length !== 1) {
        resetGesture();
        return;
      }
      if (isInteractiveOrScrollableTarget(e.target)) {
        resetGesture();
        return;
      }

      const touch = e.touches[0];
      gestureRef.current = {
        active: true,
        lockedAxis: 'none',
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: performance.now(),
        lastDx: 0,
      };
    },
    [isSwipeableScreen, resetGesture]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      const g = gestureRef.current;
      if (!g.active || !isSwipeableScreen || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const dx = touch.clientX - g.startX;
      const dy = touch.clientY - g.startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (g.lockedAxis === 'none') {
        if (absDx < 12 && absDy < 12) return;
        if (absDx > absDy * 1.35) {
          g.lockedAxis = 'x';
        } else {
          g.lockedAxis = 'y';
          g.active = false;
          return;
        }
      }

      if (g.lockedAxis !== 'x') return;

      g.lastDx = dx;
      const targetIdx = dx < 0 ? currentIdx + 1 : currentIdx - 1;
      const hasTarget = targetIdx >= 0 && targetIdx < SWIPE_SCREEN_ORDER.length;

      // Smooth rubber-band damping (subtle resistance at edges)
      const damped = hasTarget
        ? Math.max(-52, Math.min(52, dx * 0.34))
        : Math.max(-16, Math.min(16, dx * 0.14));

      setDragOffsetX(damped);

      if (hasTarget && absDx > 18) {
        const targetScreen = SWIPE_SCREEN_ORDER[targetIdx];
        const labels = SCREEN_LABELS[targetScreen];
        setPreview({
          screen: targetScreen,
          label: labels.en,
          labelNe: labels.ne,
          side: dx < 0 ? 'right' : 'left',
          progress: Math.min(1, absDx / 72),
        });
      } else {
        setPreview(null);
      }
    },
    [currentIdx, isSwipeableScreen]
  );

  const onTouchEnd = useCallback(() => {
    const g = gestureRef.current;
    if (!g.active || g.lockedAxis !== 'x' || !isSwipeableScreen) {
      resetGesture();
      return;
    }

    const dx = g.lastDx;
    const elapsedMs = Math.max(1, performance.now() - g.startTime);
    const velocityX = Math.abs(dx) / elapsedMs;
    const shouldNavigate = Math.abs(dx) >= 58 || (velocityX >= 0.36 && Math.abs(dx) >= 28);

    if (shouldNavigate) {
      const direction = dx < 0 ? 1 : -1;
      const nextIdx = currentIdx + direction;
      if (nextIdx >= 0 && nextIdx < SWIPE_SCREEN_ORDER.length) {
        onNavigate(SWIPE_SCREEN_ORDER[nextIdx], direction);
      }
    }

    resetGesture();
  }, [currentIdx, isSwipeableScreen, onNavigate, resetGesture]);

  return {
    dragOffsetX,
    preview,
    swipeHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: resetGesture,
    },
  };
}

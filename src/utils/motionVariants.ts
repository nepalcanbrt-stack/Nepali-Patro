import { Variants } from 'motion/react';

export const PATRO_EASE = [0.16, 1, 0.3, 1] as const;

export const PATRO_SPRING_SNAPPY = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.8,
} as const;

export const PATRO_SPRING_GENTLE = {
  type: 'spring',
  stiffness: 320,
  damping: 30,
  mass: 0.88,
} as const;

export const screenSlideVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction === 0 ? 0 : direction > 0 ? 28 : -28,
    y: direction === 0 ? 6 : 0,
  }),
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      x: PATRO_SPRING_GENTLE,
      y: PATRO_SPRING_GENTLE,
      opacity: { duration: 0.16, ease: 'easeOut' },
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction === 0 ? 0 : direction > 0 ? -24 : 24,
    y: direction === 0 ? -4 : 0,
    transition: {
      x: { duration: 0.14, ease: PATRO_EASE },
      y: { duration: 0.14, ease: PATRO_EASE },
      opacity: { duration: 0.12, ease: 'easeIn' },
    },
  }),
};

export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

export const modalSheetVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 28,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      y: PATRO_SPRING_SNAPPY,
      scale: PATRO_SPRING_SNAPPY,
      opacity: { duration: 0.16, ease: 'easeOut' },
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.97,
    transition: {
      duration: 0.15,
      ease: PATRO_EASE,
    },
  },
};

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.02,
    },
  },
};

export const staggerCardVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: PATRO_EASE,
    },
  },
};

export const staggerSubGridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.028,
      delayChildren: 0.03,
    },
  },
};

export const staggerTileVariants: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.18,
      ease: PATRO_EASE,
    },
  },
};

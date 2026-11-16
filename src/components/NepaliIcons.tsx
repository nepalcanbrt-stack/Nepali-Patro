import React from 'react';
import {
  ArrowLeftRight,
  Box,
  CalendarDays,
  Compass,
  Home,
  Mic,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { IconThemeId } from '../types/theme';

interface IconProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Multi-tiered Newari Pagoda temple with Gajur spire (Home)
 */
export function NepaliTempleHomeIcon({ className = 'h-5 w-5', strokeWidth = 1.9 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Gajur finial */}
      <path d="M12 2.2v2" />
      <circle cx="12" cy="2" r="0.6" fill="currentColor" stroke="none" />
      {/* Upper pagoda roof */}
      <path d="M7.5 7.5 12 4.2l4.5 3.3H7.5Z" />
      {/* Middle pagoda roof */}
      <path d="M5 12 12 7.5 19 12H5Z" />
      {/* Temple sanctum pillars & base plinth */}
      <path d="M7 12v8" />
      <path d="M17 12v8" />
      <path d="M10.2 20v-4.2a1.8 1.8 0 0 1 3.6 0V20" />
      <path d="M4 20h16" />
    </svg>
  );
}

/**
 * Nepali Patro calendar frame with Surya-Chandra crest (Calendar)
 */
export function NepaliPatroCalendarIcon({ className = 'h-5 w-5', strokeWidth = 1.9 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
      <path d="M8 2.8v3.2M16 2.8v3.2M3.5 9.2h17" />
      {/* Crescent Moon & Sun dot symbolizing Nepal Patro */}
      <path d="M9.5 13.6a2.8 2.8 0 0 0 5 0" />
      <circle cx="12" cy="16.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Ashtamangala / Nakshatra Chakra Mandala (Panchang)
 */
export function NepaliPanchangCompassIcon({ className = 'h-5 w-5', strokeWidth = 1.85 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 3.5v6.3M12 14.2v6.3M3.5 12h6.3M14.2 12h6.3" />
      <path d="M6 6l4.4 4.4M13.6 13.6 18 18M18 6l-4.4 4.4M10.4 13.6 6 18" />
    </svg>
  );
}

/**
 * Surya-Chandra Solar/Lunar Converter Emblem (BS <-> AD Converter)
 */
export function NepaliConverterIcon({ className = 'h-5 w-5', strokeWidth = 1.9 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Surya (top-left) */}
      <circle cx="7.5" cy="8" r="2.6" />
      <path d="M7.5 3.6v.9M7.5 11.5v.9M3.1 8h.9M11 8h.9" />
      {/* Chandra crescent (bottom-right) */}
      <path d="M18.6 14.5a3.4 3.4 0 1 1-3.4-3.4 2.6 2.6 0 0 0 3.4 3.4Z" />
      {/* Bidirectional arrows */}
      <path d="M14.5 5.5h4.2l-1.5-1.5M9.5 18.5H5.3l1.5 1.5" />
    </svg>
  );
}

/**
 * Brass Diyo Oil Lamp with Sacred Flame (Festivals)
 */
export function NepaliDiyoFestivalIcon({ className = 'h-5 w-5', strokeWidth = 1.9 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Flame */}
      <path d="M12 3.2c1.8 2.2 2.7 3.8 2.7 5.2a2.7 2.7 0 0 1-5.4 0c0-1.4.9-3 2.7-5.2Z" />
      {/* Brass Diyo bowl */}
      <path d="M4.2 13.5h15.6c-.7 3.1-3.5 5-7.8 5s-7.1-1.9-7.8-5Z" />
      {/* Base stand */}
      <path d="M9.5 18.5 8.5 21h7l-1-2.5" />
    </svg>
  );
}

/**
 * Sacred Mangal Kalash with Coconut & Mango Leaves (Subha Saait / Auspicious Badge)
 */
export function NepaliKalashIcon({ className = 'h-5 w-5', strokeWidth = 1.9 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Mango leaves / coconut top */}
      <path d="M12 3.5c-1.5 1.2-2.2 2.4-2 3.8h4c.2-1.4-.5-2.6-2-3.8Z" />
      <path d="M7.2 6.5c1.5.2 2.6.9 3.3 2M16.8 6.5c-1.5.2-2.6.9-3.3 2" />
      {/* Neck */}
      <path d="M9 8.8h6" />
      {/* Pot belly */}
      <path d="M9.2 8.8C7 10.6 6.2 13.2 7 15.8c.7 2.1 2.7 3.4 5 3.4s4.3-1.3 5-3.4c.8-2.6 0-5.2-2.2-7" />
      {/* Base */}
      <path d="M8.5 20.5h7" />
      {/* Swastika/bindi center dot */}
      <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Dhaka Diamond Pattern Emblem (Note / Cultural Badge)
 */
export function NepaliDhakaMotifIcon({ className = 'h-5 w-5', strokeWidth = 1.9 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3 21 12l-9 9-9-9 9-9Z" />
      <path d="M12 7.5 16.5 12 12 16.5 7.5 12 12 7.5Z" />
      <path d="M12 10v4M10 12h4" />
    </svg>
  );
}

/**
 * Private Vault Shield with Nepali Chandra-Surya crest
 */
export function NepaliAccountLockIcon({ className = 'h-5 w-5', strokeWidth = 1.9 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3 4.8 6v5.7c0 4.6 3.1 8.4 7.2 9.5 4.1-1.1 7.2-4.9 7.2-9.5V6L12 3Z" />
      <path d="M9.6 11.4a2.4 2.4 0 1 0 4.8 0v-1a2.4 2.4 0 1 0-4.8 0v1Z" />
      <path d="M10.4 15.2h3.2" />
    </svg>
  );
}

/**
 * Sacred Mahachaitya Stupa Silhouette (3D Sanctuary)
 */
export function NepaliStupaSanctuaryIcon({ className = 'h-5 w-5', strokeWidth = 1.9 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.4v2.1" />
      <path d="M9.6 7.5h4.8L12 4.5 9.6 7.5Z" />
      <rect x="9.5" y="7.5" width="5" height="3.2" rx="0.6" />
      <path d="M6.2 17a5.8 5.8 0 0 1 11.6 0" />
      <path d="M4 20.5h16M5.2 17h13.6" />
    </svg>
  );
}

/**
 * Jyotish Voice & Star Emblem (Patro AI)
 */
export function NepaliJyotishAiIcon({ className = 'h-5 w-5', strokeWidth = 1.9 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3.2 14.3 9.7 20.8 12l-6.5 2.3L12 20.8l-2.3-6.5L3.2 12l6.5-2.3L12 3.2Z" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export type PatroIconName =
  | 'home'
  | 'calendar'
  | 'panchang'
  | 'converter'
  | 'festivals'
  | 'kalash'
  | 'note'
  | 'lock'
  | 'assistant'
  | 'sanctuary';

export function PatroThemedIcon({
  name,
  iconTheme,
  className = 'h-5 w-5',
  strokeWidth = 2,
}: {
  name: PatroIconName;
  iconTheme: IconThemeId;
  className?: string;
  strokeWidth?: number;
}) {
  if (iconTheme === 'nepali-cultural') {
    switch (name) {
      case 'home':
        return <NepaliTempleHomeIcon className={className} strokeWidth={strokeWidth} />;
      case 'calendar':
        return <NepaliPatroCalendarIcon className={className} strokeWidth={strokeWidth} />;
      case 'panchang':
        return <NepaliPanchangCompassIcon className={className} strokeWidth={strokeWidth} />;
      case 'converter':
        return <NepaliConverterIcon className={className} strokeWidth={strokeWidth} />;
      case 'festivals':
        return <NepaliDiyoFestivalIcon className={className} strokeWidth={strokeWidth} />;
      case 'kalash':
        return <NepaliKalashIcon className={className} strokeWidth={strokeWidth} />;
      case 'note':
        return <NepaliDhakaMotifIcon className={className} strokeWidth={strokeWidth} />;
      case 'lock':
        return <NepaliAccountLockIcon className={className} strokeWidth={strokeWidth} />;
      case 'assistant':
        return <NepaliJyotishAiIcon className={className} strokeWidth={strokeWidth} />;
      case 'sanctuary':
        return <NepaliStupaSanctuaryIcon className={className} strokeWidth={strokeWidth} />;
    }
  }

  switch (name) {
    case 'home':
      return <Home className={className} strokeWidth={strokeWidth} />;
    case 'calendar':
      return <CalendarDays className={className} strokeWidth={strokeWidth} />;
    case 'panchang':
      return <Compass className={className} strokeWidth={strokeWidth} />;
    case 'converter':
      return <ArrowLeftRight className={className} strokeWidth={strokeWidth} />;
    case 'festivals':
      return <Sparkles className={className} strokeWidth={strokeWidth} />;
    case 'kalash':
      return <Sparkles className={className} strokeWidth={strokeWidth} />;
    case 'note':
      return <PlusCircle className={className} strokeWidth={strokeWidth} />;
    case 'lock':
      return <UserCheck className={className} strokeWidth={strokeWidth} />;
    case 'assistant':
      return <Mic className={className} strokeWidth={strokeWidth} />;
    case 'sanctuary':
      return <Box className={className} strokeWidth={strokeWidth} />;
  }
}

export function SecurityCrestIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return <ShieldCheck className={className} />;
}

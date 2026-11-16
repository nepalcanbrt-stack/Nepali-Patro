export type ThemeId =
  | 'lavender-dawn'
  | 'himalayan-sunrise'
  | 'ancient-parchment'
  | 'deep-temple-purple'
  | 'nepali-dhaka';

export type IconThemeId = 'nepali-cultural' | 'classic';

export interface ThemePaletteMeta {
  id: ThemeId;
  nameEn: string;
  nameNe: string;
  description: string;
  isDark: boolean;
  swatches: {
    canvas: string;
    surface: string;
    primary: string;
    secondary: string;
    pillGradient: string;
  };
}

export const THEME_PALETTES: ThemePaletteMeta[] = [
  {
    id: 'lavender-dawn',
    nameEn: 'Lavender Dawn',
    nameNe: 'लाली गुराँस',
    description: 'Default soft lavender & rose-pink palette with plum typography.',
    isDark: false,
    swatches: {
      canvas: '#FAF8FC',
      surface: '#FFFFFF',
      primary: '#4C1D95',
      secondary: '#9F1239',
      pillGradient: 'linear-gradient(90deg, #F3E8FF, #FCE7F3)',
    },
  },
  {
    id: 'nepali-dhaka',
    nameEn: 'Nepali Dhaka & Gold',
    nameNe: 'नेपाली ढाका र स्वर्ण',
    description: 'Traditional Palpali Dhaka crimson, Newari temple brass gold & snow cream.',
    isDark: false,
    swatches: {
      canvas: '#FDF7F5',
      surface: '#FFFFFF',
      primary: '#9F1239',
      secondary: '#B45309',
      pillGradient: 'linear-gradient(90deg, #FFE4E6, #FEF3C7)',
    },
  },
  {
    id: 'himalayan-sunrise',
    nameEn: 'Himalayan Sunrise',
    nameNe: 'हिमाली सूर्योदय',
    description: 'Warm saffron, apricot dawn glow, and deep espresso ink.',
    isDark: false,
    swatches: {
      canvas: '#FDF9F3',
      surface: '#FFFFFF',
      primary: '#C2410C',
      secondary: '#B45309',
      pillGradient: 'linear-gradient(90deg, #FFEDD5, #FEF3C7)',
    },
  },
  {
    id: 'ancient-parchment',
    nameEn: 'Ancient Parchment',
    nameNe: 'प्राचीन ताडपत्र',
    description: 'Textured Lokta paper cream, antique bronze, and vermilion.',
    isDark: false,
    swatches: {
      canvas: '#F6F1E7',
      surface: '#FCF9F2',
      primary: '#881337',
      secondary: '#78350F',
      pillGradient: 'linear-gradient(90deg, #F3E8D6, #EFE3CE)',
    },
  },
  {
    id: 'deep-temple-purple',
    nameEn: 'Deep Temple Purple',
    nameNe: 'रात्रि मन्दिर',
    description: 'Nocturnal aubergine dark mode with luminous violet & rose accents.',
    isDark: true,
    swatches: {
      canvas: '#110B1F',
      surface: '#1C1330',
      primary: '#A855F7',
      secondary: '#FB7185',
      pillGradient: 'linear-gradient(90deg, #2E1065, #4A154B)',
    },
  },
];

export const VALID_THEME_IDS: ThemeId[] = THEME_PALETTES.map((t) => t.id);

export function isValidThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && VALID_THEME_IDS.includes(value as ThemeId);
}

export function isValidIconThemeId(value: unknown): value is IconThemeId {
  return value === 'nepali-cultural' || value === 'classic';
}

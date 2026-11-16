import { AppScreen } from '../types/app';
import { IconThemeId } from '../types/theme';
import { PatroIconName, PatroThemedIcon } from './NepaliIcons';

interface BottomNavProps {
  activeScreen: AppScreen;
  iconTheme: IconThemeId;
  onNavigate: (screen: AppScreen) => void;
}

const TABS: Array<{
  id: AppScreen;
  label: string;
  labelNe: string;
  iconName: PatroIconName;
}> = [
  { id: 'home', label: 'Home', labelNe: 'गृह', iconName: 'home' },
  { id: 'calendar', label: 'Patro', labelNe: 'पात्रो', iconName: 'calendar' },
  { id: 'panchang', label: 'Panchang', labelNe: 'पञ्चाङ्ग', iconName: 'panchang' },
  { id: 'assistant', label: 'AI Guide', labelNe: 'सहायक', iconName: 'assistant' },
  { id: 'sanctuary', label: '3D Stupa', labelNe: '३डी', iconName: 'sanctuary' },
  { id: 'festivals', label: 'Festivals', labelNe: 'चाडपर्व', iconName: 'festivals' },
];

export function BottomNav({ activeScreen, iconTheme, onNavigate }: BottomNavProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      style={{ boxShadow: '0 -6px 24px -12px rgba(0,0,0,0.18)' }}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-nav)] backdrop-blur-md border-t border-[var(--border-subtle)] pb-safe"
    >
      <div className="grid grid-cols-6 items-center h-15 max-w-lg mx-auto px-0.5">
        {TABS.map((tab) => {
          const isActive = activeScreen === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-link)] ${
                isActive
                  ? 'text-[var(--accent-secondary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span
                className={`flex items-center justify-center px-3 py-1 rounded-full transition-colors ${
                  isActive ? 'bg-[var(--holiday-soft-bg)] text-[var(--accent-secondary)]' : 'bg-transparent'
                }`}
              >
                <PatroThemedIcon
                  name={tab.iconName}
                  iconTheme={iconTheme}
                  className="h-[19px] w-[19px]"
                  strokeWidth={isActive ? 2.3 : 1.85}
                />
              </span>
              <span className="text-[10px] font-semibold tracking-tight leading-none whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

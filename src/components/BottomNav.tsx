import { ArrowLeftRight, CalendarDays, Compass, Home, Sparkles } from 'lucide-react';
import { AppScreen } from '../types/app';

interface BottomNavProps {
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

const TABS: Array<{
  id: AppScreen;
  label: string;
  labelNe: string;
  icon: typeof Home;
}> = [
  { id: 'home', label: 'Home', labelNe: 'गृह', icon: Home },
  { id: 'calendar', label: 'Calendar', labelNe: 'पात्रो', icon: CalendarDays },
  { id: 'panchang', label: 'Panchang', labelNe: 'पञ्चाङ्ग', icon: Compass },
  { id: 'converter', label: 'Convert', labelNe: 'मिति', icon: ArrowLeftRight },
  { id: 'festivals', label: 'Festivals', labelNe: 'चाडपर्व', icon: Sparkles },
];

export function BottomNav({ activeScreen, onNavigate }: BottomNavProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      style={{ boxShadow: '0 -6px 24px -12px rgba(0,0,0,0.18)' }}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-nav)] backdrop-blur-md border-t border-[var(--border-subtle)] pb-safe"
    >
      <div className="grid grid-cols-5 items-center h-15 max-w-lg mx-auto px-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
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
                <Icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.4 : 1.9} />
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

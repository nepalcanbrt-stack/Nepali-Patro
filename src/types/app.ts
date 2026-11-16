export type AppScreen = 'home' | 'calendar' | 'panchang' | 'converter' | 'festivals';

export interface UserNote {
  id: string;
  bsKey: string; // YYYY-MM-DD in BS
  title: string;
  note: string;
  time?: string;
  category: 'personal' | 'puja' | 'birthday' | 'reminder';
  createdAt: number;
}

export type DailyPulseEntry = {
  id: string;
  date: string; // ISO format YYYY-MM-DD
  mood: number; // 1-5
  stress: number; // 1-5
  energy: number; // 1-5
  reflection?: string;
  createdAt: string;
};

export type ReflectionHistoryFilter = '7d' | '30d' | 'all';

import type { DailyPulseEntry, ReflectionHistoryFilter } from './types';

const STORAGE_KEY = 'mindpulse_daily_entries';

const clampScale = (value: number) => Math.min(5, Math.max(1, Math.round(value)));

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const parseEntries = (raw: string | null): DailyPulseEntry[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry): entry is DailyPulseEntry => {
        if (!entry || typeof entry !== 'object') return false;
        const candidate = entry as Partial<DailyPulseEntry>;
        return (
          typeof candidate.id === 'string' &&
          typeof candidate.date === 'string' &&
          typeof candidate.mood === 'number' &&
          typeof candidate.stress === 'number' &&
          typeof candidate.energy === 'number' &&
          typeof candidate.createdAt === 'string'
        );
      })
      .map((entry) => ({
        ...entry,
        mood: clampScale(entry.mood),
        stress: clampScale(entry.stress),
        energy: clampScale(entry.energy),
        reflection: entry.reflection?.slice(0, 200).trim() || undefined,
      }));
  } catch {
    return [];
  }
};

const safeGetStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const sortDescByCreatedAt = (entries: DailyPulseEntry[]) =>
  [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

export const getDailyEntries = (): DailyPulseEntry[] => {
  if (typeof window === 'undefined') return [];

  const storage = safeGetStorage();
  if (!storage) return [];

  return sortDescByCreatedAt(parseEntries(storage.getItem(STORAGE_KEY)));
};

const writeEntries = (entries: DailyPulseEntry[]) => {
  const storage = safeGetStorage();
  if (!storage) return;

  storage.setItem(STORAGE_KEY, JSON.stringify(sortDescByCreatedAt(entries)));
};

export const getTodayEntry = (): DailyPulseEntry | null => {
  const todayKey = toDateKey(new Date());
  return getDailyEntries().find((entry) => entry.date === todayKey) ?? null;
};

export const saveDailyEntry = (entry: DailyPulseEntry): void => {
  const existing = getDailyEntries();
  const next = existing.filter((item) => item.date !== entry.date);
  next.push({
    ...entry,
    mood: clampScale(entry.mood),
    stress: clampScale(entry.stress),
    energy: clampScale(entry.energy),
    reflection: entry.reflection?.slice(0, 200).trim() || undefined,
  });

  writeEntries(next);
};

export const createDailyEntry = (payload: {
  mood: number;
  stress: number;
  energy: number;
  reflection?: string;
}): DailyPulseEntry => {
  const now = new Date();

  return {
    id: `pulse-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    date: toDateKey(now),
    mood: clampScale(payload.mood),
    stress: clampScale(payload.stress),
    energy: clampScale(payload.energy),
    reflection: payload.reflection?.slice(0, 200).trim() || undefined,
    createdAt: now.toISOString(),
  };
};

export const calculateSubjectiveScore = (entry: Pick<DailyPulseEntry, 'mood' | 'stress' | 'energy'>): number => {
  const raw = (entry.mood * 0.4 + (6 - entry.stress) * 0.3 + entry.energy * 0.3) * 20;
  return Math.round(Math.max(0, Math.min(100, raw)));
};

export const filterEntries = (
  entries: DailyPulseEntry[],
  filter: ReflectionHistoryFilter
): DailyPulseEntry[] => {
  if (filter === 'all') return entries;

  const days = filter === '7d' ? 7 : 30;
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - days);

  return entries.filter((entry) => new Date(entry.createdAt).getTime() >= cutoff.getTime());
};

export const moodMeta = {
  1: { emoji: '😞', label: 'Very Low' },
  2: { emoji: '🙁', label: 'Low' },
  3: { emoji: '😐', label: 'Neutral' },
  4: { emoji: '🙂', label: 'Good' },
  5: { emoji: '😄', label: 'Excellent' },
} as const;

export { STORAGE_KEY as DAILY_PULSE_STORAGE_KEY };

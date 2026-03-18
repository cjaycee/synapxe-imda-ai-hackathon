import type { DailyPulseEntry, ReflectionHistoryFilter } from './types';

const STORAGE_KEY = 'mindpulse_daily_entries';

// Pre-seeded reflection history for demo walkthroughs (all before 18 Mar 2026).
const DEMO_REFLECTION_ENTRIES: DailyPulseEntry[] = [
  {
    id: 'demo-2026-03-17',
    date: '2026-03-17',
    mood: 4,
    stress: 2,
    energy: 4,
    reflection: 'Closed key tasks before standup and felt focused throughout the afternoon.',
    createdAt: '2026-03-17T16:20:00.000Z',
  },
  {
    id: 'demo-2026-03-16',
    date: '2026-03-16',
    mood: 3,
    stress: 3,
    energy: 3,
    reflection: 'Meetings were dense, but a short break helped me reset before evening work.',
    createdAt: '2026-03-16T18:05:00.000Z',
  },
  {
    id: 'demo-2026-03-14',
    date: '2026-03-14',
    mood: 5,
    stress: 1,
    energy: 5,
    reflection: 'Weekend recharge day. Walked outdoors and felt mentally clear at night.',
    createdAt: '2026-03-14T13:47:00.000Z',
  },
  {
    id: 'demo-2026-03-12',
    date: '2026-03-12',
    mood: 2,
    stress: 4,
    energy: 2,
    reflection: 'Long day with tight deadlines, but I wrapped up with a calming routine.',
    createdAt: '2026-03-12T22:10:00.000Z',
  },
  {
    id: 'demo-2026-03-11',
    date: '2026-03-11',
    mood: 4,
    stress: 2,
    energy: 4,
    reflection: 'Felt steady and confident after preparing earlier than usual this morning.',
    createdAt: '2026-03-11T17:31:00.000Z',
  },
  {
    id: 'demo-2026-03-08',
    date: '2026-03-08',
    mood: 3,
    stress: 3,
    energy: 3,
    reflection: 'Balanced day overall; taking short pauses prevented afternoon fatigue.',
    createdAt: '2026-03-08T20:44:00.000Z',
  },
  {
    id: 'demo-2026-03-04',
    date: '2026-03-04',
    mood: 2,
    stress: 4,
    energy: 2,
    reflection: 'Felt overloaded by back-to-back items and need better pacing tomorrow.',
    createdAt: '2026-03-04T19:18:00.000Z',
  },
  {
    id: 'demo-2026-02-28',
    date: '2026-02-28',
    mood: 4,
    stress: 2,
    energy: 4,
    reflection: 'Good momentum today. A focused work block made the evening more relaxed.',
    createdAt: '2026-02-28T18:02:00.000Z',
  },
  {
    id: 'demo-2026-02-24',
    date: '2026-02-24',
    mood: 3,
    stress: 3,
    energy: 3,
    reflection: 'Neutral day, but hydration and a short stretch improved my concentration.',
    createdAt: '2026-02-24T17:26:00.000Z',
  },
  {
    id: 'demo-2026-02-20',
    date: '2026-02-20',
    mood: 4,
    stress: 2,
    energy: 4,
    reflection: 'Strong start to the cycle with clear priorities and less decision fatigue.',
    createdAt: '2026-02-20T16:11:00.000Z',
  },
];

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

const getStoredEntries = (): DailyPulseEntry[] => {
  if (typeof window === 'undefined') return [];

  const storage = safeGetStorage();
  if (!storage) return [];

  return sortDescByCreatedAt(parseEntries(storage.getItem(STORAGE_KEY)));
};

const mergeWithDemoEntries = (entries: DailyPulseEntry[]): DailyPulseEntry[] => {
  const existingDates = new Set(entries.map((entry) => entry.date));
  const demoEntries = DEMO_REFLECTION_ENTRIES.filter(
    (entry) => !existingDates.has(entry.date)
  );

  return sortDescByCreatedAt([...entries, ...demoEntries]);
};

export const getDailyEntries = (): DailyPulseEntry[] => {
  return mergeWithDemoEntries(getStoredEntries());
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
  const existing = getStoredEntries();
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

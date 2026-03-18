import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { cn } from './ui/utils';
import {
  calculateSubjectiveScore,
  createDailyEntry,
  filterEntries,
  getDailyEntries,
  getTodayEntry,
  moodMeta,
  saveDailyEntry,
} from '../../lib/dailyPulse/storage';
import type { DailyPulseEntry, ReflectionHistoryFilter } from '../../lib/dailyPulse/types';

interface DailyPulseCheckInProps {
  onSubjectiveScoreChange?: (score: number) => void;
}

const moodLevels = [1, 2, 3, 4, 5] as const;

const historyFilterOptions: Array<{ value: ReflectionHistoryFilter; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All' },
];

const formatEntryDate = (entry: DailyPulseEntry) =>
  new Date(`${entry.date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export function DailyPulseCheckIn({ onSubjectiveScoreChange }: DailyPulseCheckInProps) {
  const [mood, setMood] = useState<number>(3);
  const [stress, setStress] = useState<number>(3);
  const [energy, setEnergy] = useState<number>(3);
  const [reflection, setReflection] = useState('');

  const [entries, setEntries] = useState<DailyPulseEntry[]>([]);
  const [todayEntry, setTodayEntry] = useState<DailyPulseEntry | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<ReflectionHistoryFilter>('7d');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const loadedEntries = getDailyEntries();
    const loadedToday = getTodayEntry();

    setEntries(loadedEntries);
    setTodayEntry(loadedToday);

    if (loadedToday) {
      onSubjectiveScoreChange?.(calculateSubjectiveScore(loadedToday));
    }
  }, [onSubjectiveScoreChange]);

  const filteredEntries = useMemo(
    () => filterEntries(entries, historyFilter),
    [entries, historyFilter]
  );

  const reflectionChars = reflection.length;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const existingToday = getTodayEntry();
    if (existingToday) {
      setTodayEntry(existingToday);
      setEntries(getDailyEntries());
      setSubmitError('Today\'s check-in is already completed.');
      return;
    }

    const entry = createDailyEntry({
      mood,
      stress,
      energy,
      reflection,
    });

    saveDailyEntry(entry);

    const nextEntries = getDailyEntries();
    setEntries(nextEntries);
    setTodayEntry(entry);
    setSubmitError(null);

    onSubjectiveScoreChange?.(calculateSubjectiveScore(entry));
  };

  return (
    <>
      <Card className="overflow-hidden border border-emerald-100 bg-white shadow-sm">
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Daily Pulse Check-In</h3>
              <p className="mt-1 text-sm text-gray-500">
                One short self-reflection per day to capture how you are really feeling.
              </p>
            </div>
            <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
              <CalendarDays className="h-3 w-3" />
              Daily
            </Badge>
          </div>

          {todayEntry ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-sm font-semibold">Today's Check-In Completed</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
                    <p className="text-xs text-gray-500">Mood</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {moodMeta[todayEntry.mood as keyof typeof moodMeta].emoji}{' '}
                      {moodMeta[todayEntry.mood as keyof typeof moodMeta].label}
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
                    <p className="text-xs text-gray-500">Stress</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">{todayEntry.stress}/5</p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
                    <p className="text-xs text-gray-500">Energy</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">{todayEntry.energy}/5</p>
                  </div>
                </div>

                {todayEntry.reflection && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-white px-3 py-2">
                    <p className="text-xs text-gray-500">Reflection</p>
                    <p className="mt-1 text-sm text-gray-700">{todayEntry.reflection}</p>
                  </div>
                )}
              </div>

              <Button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                View Reflection History
              </Button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-800">How is your mood right now?</p>
                <div className="grid grid-cols-5 gap-2">
                  {moodLevels.map((level) => {
                    const selected = mood === level;
                    const meta = moodMeta[level];

                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setMood(level)}
                        className={cn(
                          'rounded-lg border px-2 py-3 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                          selected
                            ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/50'
                        )}
                      >
                        <div className="text-xl">{meta.emoji}</div>
                        <p className="mt-1 text-[11px] font-medium text-gray-700">{meta.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">Stress</p>
                    <Badge className="bg-white text-gray-700 hover:bg-white">{stress}/5</Badge>
                  </div>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[stress]}
                    onValueChange={(values) => setStress(values[0] ?? stress)}
                  />
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">Energy</p>
                    <Badge className="bg-white text-gray-700 hover:bg-white">{energy}/5</Badge>
                  </div>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[energy]}
                    onValueChange={(values) => setEnergy(values[0] ?? energy)}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">Reflection (optional)</p>
                  <span className="text-xs text-gray-500">{reflectionChars}/200</span>
                </div>
                <Textarea
                  value={reflection}
                  onChange={(event) => setReflection(event.target.value.slice(0, 200))}
                  placeholder="What influenced your day most?"
                  className="min-h-24 bg-white"
                />
              </div>

              {submitError && (
                <p className="text-sm text-rose-600" role="alert">
                  {submitError}
                </p>
              )}

              <Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Sparkles className="h-4 w-4" />
                Submit Daily Check-In
              </Button>
            </form>
          )}

          <div className="mt-5 flex items-start gap-3 rounded-lg border border-teal-200 bg-teal-50 p-4">
            <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-700" />
            <p className="text-xs text-teal-800">
              <span className="font-semibold">Privacy Protected:</span> Daily reflections are stored locally on your device.
            </p>
          </div>
        </div>
      </Card>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Reflection History</DialogTitle>
            <DialogDescription>
              Your Daily Pulse entries are shown in reverse chronological order.
            </DialogDescription>
          </DialogHeader>

          <div className="mb-3 flex flex-wrap gap-2">
            {historyFilterOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={historyFilter === option.value ? 'default' : 'outline'}
                onClick={() => setHistoryFilter(option.value)}
                className={cn(
                  historyFilter === option.value &&
                  'bg-emerald-600 text-white hover:bg-emerald-700'
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {filteredEntries.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-sm text-gray-500">
                No entries found for this filter.
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const moodInfo = moodMeta[entry.mood as keyof typeof moodMeta];
                return (
                  <div key={entry.id} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900">{formatEntryDate(entry)}</p>
                      <Badge className="border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-50">
                        {moodInfo.emoji} {moodInfo.label}
                      </Badge>
                    </div>

                    <div className="mb-2 grid gap-2 text-sm text-gray-600 sm:grid-cols-3">
                      <p>Stress: {entry.stress}/5</p>
                      <p>Energy: {entry.energy}/5</p>
                      <p>Score: {calculateSubjectiveScore(entry)}/100</p>
                    </div>

                    {entry.reflection && (
                      <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                        {entry.reflection}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

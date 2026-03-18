import { useMemo, useState } from 'react';
import { CloudSun, Moon, Activity, Eye, LucideIcon } from 'lucide-react';
import { DashboardNav } from './components/DashboardNav';
import { HealthScoreHero } from './components/HealthScoreHero';
import { HealthModuleCard } from './components/HealthModuleCard';
import { FacialTrackingLogs } from './components/FacialTrackingLogs';
import { AIHealthAssistant } from './components/AIHealthAssistant';
import { VisualSignalsDialog } from './components/VisualSignalsDialog';
import { SleepActivityDialog, type SleepScoreUpdate } from './components/SleepActivityDialog';
import { EnvironmentDialog, type EnvironmentalSimulationPayload } from './components/EnvironmentDialog';
import { ActivityWellbeingDialog, ActivityScoreUpdate } from './components/ActivityWellbeingDialog';
import { buildHealthContext } from '../lib/sealion/contextBuilder';
import type { EnvironmentalContext, SleepContext, VisualContext } from '../lib/sealion/types';

interface VisualReadings {
  dominantEmotion: string | null;
  emotionConfidence: number;
  stressLevel: number;
  hasFace: boolean;
  avgScore1Min?: number;
}

interface HealthModule {
  id: string;
  title: string;
  icon: LucideIcon;
  score: number;
  subtitle: string;
  enabled: boolean;
  trend: 'up' | 'down' | 'stable';
  accentColor: string;
}

const OVERALL_SCORE_WEIGHTS: Record<string, number> = {
  visual: 0.18,
  activity: 0.32,
  sleep: 0.27,
  environmental: 0.23,
};

export default function App() {
  const [modules, setModules] = useState<HealthModule[]>([
    {
      id: 'visual',
      title: 'Visual Signals',
      icon: Eye,
      score: 78,
      subtitle: 'Mild stress detected',
      enabled: true,
      trend: 'stable',
      accentColor: 'bg-gradient-to-br from-purple-500 to-violet-600',
    },
    {
      id: 'activity',
      title: 'Acitivity Wellbeing',
      icon: Activity,
      score: 70,
      subtitle: 'Physical activity and posture summary',
      enabled: true,
      trend: 'stable',
      accentColor: 'bg-gradient-to-br from-pink-500 to-purple-600',
    },
    {
      id: 'sleep',
      title: 'Sleep Readings',
      icon: Moon,
      score: 72,
      subtitle: 'Sleep quality and patterns',
      enabled: true,
      trend: 'down',
      accentColor: 'bg-gradient-to-br from-indigo-500 to-blue-500',
    },
    {
      id: 'environmental',
      title: 'Environmental Context',
      icon: CloudSun,
      score: 76,
      subtitle: 'Monitoring ambient context factors',
      enabled: true,
      trend: 'stable',
      accentColor: 'bg-gradient-to-br from-emerald-500 to-cyan-500',
    },
  ]);

  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [visualContext, setVisualContext] = useState<VisualContext | null>(null);
  const [sleepContext, setSleepContext] = useState<SleepContext | null>(null);
  const [environmentalContext, setEnvironmentalContext] = useState<EnvironmentalContext | null>(null);

  const overallMentalHealthScore = useMemo(() => {
    const { weightedSum, weightTotal } = modules.reduce(
      (acc, module) => {
        const weight = OVERALL_SCORE_WEIGHTS[module.id] ?? 0;
        return {
          weightedSum: acc.weightedSum + module.score * weight,
          weightTotal: acc.weightTotal + weight,
        };
      },
      { weightedSum: 0, weightTotal: 0 }
    );

    if (weightTotal === 0) return 0;

    const weightedAverage = weightedSum / weightTotal;
    return Math.round(Math.max(0, Math.min(100, weightedAverage)));
  }, [modules]);

  const healthContext = useMemo(
    () =>
      buildHealthContext({
        modules: modules.map(({ id, title, score, subtitle, enabled, trend }) => ({
          id,
          title,
          score,
          subtitle,
          enabled,
          trend,
        })),
        visual: visualContext,
        sleep: sleepContext,
        environmental: environmentalContext,
      }),
    [environmentalContext, modules, sleepContext, visualContext]
  );

  const updateVisualSignalsScore = ({
    dominantEmotion,
    emotionConfidence,
    stressLevel,
    hasFace,
    avgScore1Min,
  }: VisualReadings) => {
    setVisualContext({
      dominantEmotion,
      emotionConfidence,
      stressLevel,
      hasFace,
      avgScore1Min,
    });

    setModules((prev) =>
      prev.map((module) => {
        if (module.id !== 'visual') return module;

        if (!module.enabled) {
          return {
            ...module,
            // subtitle: 'Tracking paused',
            trend: 'stable',
          };
        }

        if (!hasFace || !dominantEmotion) {
          return {
            ...module,
            subtitle: 'Scanning for face signal',
            trend: 'stable',
          };
        }

        // Only update the main score and trend if we have a new 1-min average (throttled to 1 min)
        let nextScore = module.score;
        let nextTrend = module.trend;

        if (avgScore1Min != null) {
          const targetScore = Math.max(20, Math.min(100, avgScore1Min));
          nextScore = targetScore;
          nextTrend = nextScore > module.score ? 'up' : nextScore < module.score ? 'down' : 'stable';
        }

        const subtitle = `${dominantEmotion[0].toUpperCase()}${dominantEmotion.slice(1)} · Stress ${stressLevel}% · Conf ${Math.round(emotionConfidence * 100)}%`;

        return {
          ...module,
          score: nextScore,
          subtitle,
          trend: nextTrend,
        };
      })
    );
  };

  const updateSleepActivityScore = ({
    predictedScore,
    confidence,
    reading,
  }: SleepScoreUpdate) => {
    setSleepContext({
      predictedScore,
      confidence,
      reading,
    });

    setModules((prev) =>
      prev.map((module) => {
        if (module.id !== 'sleep') return module;

        if (!module.enabled) {
          return {
            ...module,
            // subtitle: 'Tracking paused',
            trend: 'stable',
          };
        }

        const boundedTarget = Math.max(20, Math.min(100, Math.round(predictedScore)));
        const nextScore = boundedTarget;
        const nextTrend: 'up' | 'down' | 'stable' =
          nextScore > module.score ? 'up' : nextScore < module.score ? 'down' : 'stable';

        const subtitle = `HR ${reading.heartRateBpm} bpm · ${reading.timeAsleepHours.toFixed(1)}h asleep · ${reading.movementsPerHour.toFixed(0)} mov/hr · Conf ${Math.round(confidence * 100)}%`;

        return {
          ...module,
          score: nextScore,
          subtitle,
          trend: nextTrend,
        };
      })
    );
  };
  const updateActivityScore = ({
    predictedScore,
    features,
  }: ActivityScoreUpdate) => {
    setModules((prev) =>
      prev.map((module) => {
        if (module.id !== 'activity') return module;

        if (!module.enabled) {
          return {
            ...module,
            // subtitle: 'Tracking paused',
            trend: 'stable',
          };
        }

        const boundedTarget = Math.max(0, Math.min(100, Math.round(predictedScore)));
        const nextScore = boundedTarget;
        const nextTrend: 'up' | 'down' | 'stable' =
          nextScore > module.score ? 'up' : nextScore < module.score ? 'down' : 'stable';

        const subtitle = `Steps ${features.totalSteps} · HR ${features.meanHr.toFixed(1)} bpm · Active ${(features.activeSecondsFraction * 100).toFixed(1)}%`;

        return {
          ...module,
          score: nextScore,
          subtitle,
          trend: nextTrend,
        };
      })
    );
  };

  const toggleModule = (id: string) => {
    setModules((prev) =>
      prev.map((module) =>
        module.id === id ? { ...module, enabled: !module.enabled } : module
      )
    );
  };

  const updateEnvironmentalModule = ({
    score,
    trend,
    subtitle,
  }: EnvironmentalSimulationPayload) => {
    setEnvironmentalContext({
      score,
      trend,
      subtitle,
    });

    setModules((prev) =>
      prev.map((module) => {
        if (module.id !== 'environmental') return module;

        if (!module.enabled) {
          return {
            ...module,
            // subtitle: 'Tracking paused',
            trend: 'stable',
          };
        }

        return {
          ...module,
          score,
          trend,
          subtitle,
        };
      })
    );
  };

  const getModule = (id: string) => modules.find((m) => m.id === id)!;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />

      <main className="mx-auto max-w-[1400px] p-6">
        <div className="mb-8">
          <HealthScoreHero score={overallMentalHealthScore} />
        </div>

        {/* Health Modules Grid */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Health Tracking Modules</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {modules.map((module) => (
              <HealthModuleCard
                key={module.id}
                title={module.title}
                icon={module.icon}
                score={module.score}
                subtitle={module.subtitle}
                isEnabled={module.enabled}
                onToggle={() => toggleModule(module.id)}
                onViewDetails={() => setOpenDialog(module.id)}
                trend={module.trend}
                accentColor={module.accentColor}
              />
            ))}
          </div>
        </div>

        {/* Bottom Section: Facial Tracking & AI Assistant */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FacialTrackingLogs />
          </div>
          <div className="lg:col-span-1">
            <AIHealthAssistant healthContext={healthContext} />
          </div>
        </div>
      </main>

      {/* ── Module Detail Dialogs ───────────────────── */}
      <VisualSignalsDialog
        open={openDialog === 'visual'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        isEnabled={getModule('visual').enabled}
        onToggle={() => toggleModule('visual')}
        onReadingsChange={updateVisualSignalsScore}
      />

      <SleepActivityDialog
        open={openDialog === 'sleep'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        isEnabled={getModule('sleep').enabled}
        currentScore={getModule('sleep').score}
        onToggle={() => toggleModule('sleep')}
        onScoreUpdate={updateSleepActivityScore}
      />

      <EnvironmentDialog
        open={openDialog === 'environmental'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        isEnabled={getModule('environmental').enabled}
        onToggle={() => toggleModule('environmental')}
        onSimulationUpdate={updateEnvironmentalModule}
      />

      <ActivityWellbeingDialog
        open={openDialog === 'activity'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        isEnabled={getModule('activity').enabled}
        currentScore={getModule('activity').score}
        onToggle={() => toggleModule('activity')}
        onScoreUpdate={updateActivityScore}
      />
    </div>
  );
}

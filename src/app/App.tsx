import { useState } from 'react';
import { CloudSun, Moon, Activity, Eye, LucideIcon } from 'lucide-react';
import { DashboardNav } from './components/DashboardNav';
import { HealthScoreHero } from './components/HealthScoreHero';
import { HealthModuleCard } from './components/HealthModuleCard';
import { FacialTrackingLogs } from './components/FacialTrackingLogs';
import { AIHealthAssistant } from './components/AIHealthAssistant';
import { VisualSignalsDialog } from './components/VisualSignalsDialog';
import { PhysiologicalSignalsDialog } from './components/PhysiologicalSignalsDialog';
import { SleepActivityDialog, type SleepScoreUpdate } from './components/SleepActivityDialog';
import {
    EnvironmentDialog,
    type EnvironmentalSimulationPayload,
} from './components/EnvironmentDialog';

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
            id: 'physiological',
            title: 'Physiological Signals',
            icon: Activity,
            score: 85,
            subtitle: 'Heart rate and respiration stable',
            enabled: true,
            trend: 'up',
            accentColor: 'bg-gradient-to-br from-teal-500 to-cyan-500',
        },
        {
            id: 'sleep',
            title: 'Sleep & Activity',
            icon: Moon,
            score: 72,
            subtitle: 'Sleep quality below weekly average',
            enabled: false,
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

    const updateVisualSignalsScore = ({
        dominantEmotion,
        emotionConfidence,
        stressLevel,
        hasFace,
        avgScore1Min,
    }: VisualReadings) => {
        setModules((prev) =>
            prev.map((module) => {
                if (module.id !== 'visual') return module;

                if (!module.enabled) {
                    return {
                        ...module,
                        subtitle: 'Tracking paused',
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

                // Use the 1-min rolling average as the score when available,
                // otherwise fall back to the instantaneous weighted formula.
                let targetScore: number;
                if (avgScore1Min != null) {
                    targetScore = Math.max(20, Math.min(100, avgScore1Min));
                } else {
                    const positive = new Set(['happy', 'surprised']);
                    const neutral = new Set(['neutral']);

                    let emotionPenalty = 14;
                    if (positive.has(dominantEmotion)) emotionPenalty = 0;
                    else if (neutral.has(dominantEmotion)) emotionPenalty = 7;

                    targetScore = Math.max(
                        20,
                        Math.min(100, Math.round(100 - stressLevel * 0.6 - emotionPenalty))
                    );
                }

                const nextScore = Math.round(module.score * 0.72 + targetScore * 0.28);
                const nextTrend: 'up' | 'down' | 'stable' =
                    nextScore > module.score ? 'up' : nextScore < module.score ? 'down' : 'stable';

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
        setModules((prev) =>
            prev.map((module) => {
                if (module.id !== 'sleep') return module;

                if (!module.enabled) {
                    return {
                        ...module,
                        subtitle: 'Tracking paused',
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

    const toggleModule = (id: string) => {
        setModules((prev) =>
            prev.map((module) =>
                module.id === id ? { ...module, enabled: !module.enabled } : module
            )
        );
    };

    const connectSleepWearable = () => {
        setModules((prev) =>
            prev.map((module) =>
                module.id === 'sleep'
                    ? {
                        ...module,
                        subtitle: 'Wearable connected (mock)',
                    }
                    : module
            )
        );
    };

    const updateEnvironmentalModule = ({
        score,
        trend,
        subtitle,
    }: EnvironmentalSimulationPayload) => {
        setModules((prev) =>
            prev.map((module) => {
                if (module.id !== 'environmental') return module;

                if (!module.enabled) {
                    return {
                        ...module,
                        subtitle: 'Tracking paused',
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
                    <HealthScoreHero />
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
                                topActionLabel={module.id === 'sleep' ? 'Connect to Wearable' : undefined}
                                onTopActionClick={module.id === 'sleep' ? connectSleepWearable : undefined}
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
                        <AIHealthAssistant />
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

            <PhysiologicalSignalsDialog
                open={openDialog === 'physiological'}
                onOpenChange={(open) => !open && setOpenDialog(null)}
                isEnabled={getModule('physiological').enabled}
                onToggle={() => toggleModule('physiological')}
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
        </div>
    );
}

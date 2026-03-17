import {
  type HealthContextInput,
  type HealthContextPayload,
  type ModuleSnapshot,
} from './types';

const round = (value: number, precision = 1) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const normalizeModule = (module: ModuleSnapshot): ModuleSnapshot => ({
  id: module.id,
  title: module.title,
  score: Math.max(0, Math.min(100, Math.round(module.score))),
  subtitle: module.subtitle.slice(0, 180),
  enabled: module.enabled,
  trend: module.trend,
});

export function buildHealthContext(input: HealthContextInput): HealthContextPayload {
  const modules = input.modules.map(normalizeModule);
  const enabledModules = modules.filter((module) => module.enabled);

  const overallScore =
    enabledModules.length > 0
      ? Math.round(
          enabledModules.reduce((sum, module) => sum + module.score, 0) / enabledModules.length
        )
      : Math.round(modules.reduce((sum, module) => sum + module.score, 0) / Math.max(modules.length, 1));

  return {
    timestamp: new Date().toISOString(),
    overallScore,
    modules,
    visual: input.visual
      ? {
          ...input.visual,
          emotionConfidence: round(input.visual.emotionConfidence, 2),
          stressLevel: Math.max(0, Math.min(100, Math.round(input.visual.stressLevel))),
          avgScore1Min:
            input.visual.avgScore1Min == null
              ? undefined
              : Math.max(0, Math.min(100, Math.round(input.visual.avgScore1Min))),
        }
      : null,
    sleep: input.sleep
      ? {
          predictedScore: Math.max(0, Math.min(100, Math.round(input.sleep.predictedScore))),
          confidence: round(input.sleep.confidence, 2),
          reading: {
            heartRateBpm: Math.round(input.sleep.reading.heartRateBpm),
            timeAsleepHours: round(input.sleep.reading.timeAsleepHours, 1),
            movementsPerHour: round(input.sleep.reading.movementsPerHour, 1),
          },
        }
      : null,
    environmental: input.environmental
      ? {
          score: Math.max(0, Math.min(100, Math.round(input.environmental.score))),
          trend: input.environmental.trend,
          subtitle: input.environmental.subtitle.slice(0, 180),
        }
      : null,
  };
}

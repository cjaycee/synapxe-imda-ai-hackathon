import {
  CloudSun,
  Thermometer,
  Volume2,
  Wind,
  FileText,
  Download,
  PauseCircle,
  Trash2,
} from "lucide-react";
import { predictEnvScore } from "../../lib/env/envLinearModel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import {
  ModuleDialogBase,
  MetricCard,
  TrendChartSection,
  InsightsCard,
} from "./ModuleDialogBase";

interface EnvironmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEnabled: boolean;
  onToggle: () => void;
  onSimulationUpdate?: (payload: EnvironmentalSimulationPayload) => void;
}

export interface EnvironmentalSimulationPayload {
  score: number;
  trend: "up" | "down" | "stable";
  subtitle: string;
}

type TrendDirection = "up" | "down" | "stable";
type Quality = "good" | "ok" | "warning" | "bad";

interface WeatherProfile {
  label: string;
  penalty: number;     // precipitation proxy used by regression baseline
  moodEffect: number; // contextual mood impact: positive = uplifting, negative = dampening
}

interface EnvironmentalFactors {
  temperatureC: number;
  noiseDb: number;
  airQualityAqi: number;
  weather: WeatherProfile;
}

interface EnvironmentalSimulationState {
  factors: EnvironmentalFactors;
  score: number;
  trend: TrendDirection;
  scoreSeries: number[];
}

type MockScenario = "bad" | "good" | "moderate";

const weatherProfiles: WeatherProfile[] = [
  { label: "Sunny", penalty: 0, moodEffect: 3.5 }, // bright clear skies – mood lift
  { label: "Clear", penalty: 0, moodEffect: 1 },  // pleasant – mild mood lift
  { label: "Cloudy", penalty: 2, moodEffect: -1 }, // slightly dampening
  { label: "Rain", penalty: 5, moodEffect: -2.5 }, // moderate impact
  { label: "Storm", penalty: 12, moodEffect: -4.5 }, // severe but short-lived
  { label: "Haze", penalty: 8, moodEffect: -7 }, // lingers, worst for mental health
];

const chartLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const randomBetween = (min: number, max: number, decimals = 0) => {
  const scale = 10 ** decimals;
  const value = Math.random() * (max - min) + min;
  return Math.round(value * scale) / scale;
};

const pickRandom = <T,>(values: T[]) =>
  values[Math.floor(Math.random() * values.length)];

const generateRandomFactors = (): EnvironmentalFactors => ({
  temperatureC: randomBetween(19, 34, 1),
  noiseDb: randomBetween(28, 82, 1),
  airQualityAqi: Math.round(randomBetween(18, 230)),
  weather: pickRandom(weatherProfiles),
});

const predictEnvironmentalScore = (factors: EnvironmentalFactors) =>
  predictEnvScore({
    temperatureC: factors.temperatureC,
    noiseDb: factors.noiseDb,
    airQualityAqi: factors.airQualityAqi,
    weatherPenalty: factors.weather.penalty,
    weatherMoodEffect: factors.weather.moodEffect,
  });

const mockScenarioOrder: MockScenario[] = ["bad", "good", "moderate"];

const weatherByScenario: Record<MockScenario, WeatherProfile[]> = {
  bad: weatherProfiles.filter((weather) => weather.moodEffect <= -2.5),
  good: weatherProfiles.filter((weather) => weather.moodEffect >= 1),
  moderate: weatherProfiles.filter(
    (weather) => weather.moodEffect > -2.5 && weather.moodEffect < 1
  ),
};

const mockScenarioTargets: Record<MockScenario, { min: number; max: number; target: number }> = {
  bad: { min: 25, max: 52, target: 40 },
  good: { min: 80, max: 98, target: 90 },
  moderate: { min: 58, max: 75, target: 66 },
};

const randomFactorsByScenario = (scenario: MockScenario): EnvironmentalFactors => {
  switch (scenario) {
    case "bad":
      return {
        temperatureC: randomBetween(31.5, 34, 1),
        noiseDb: randomBetween(68, 82, 1),
        airQualityAqi: Math.round(randomBetween(125, 230)),
        weather: pickRandom(weatherByScenario.bad),
      };
    case "good":
      return {
        temperatureC: randomBetween(22, 27, 1),
        noiseDb: randomBetween(28, 42, 1),
        airQualityAqi: Math.round(randomBetween(18, 45)),
        weather: pickRandom(weatherByScenario.good),
      };
    case "moderate":
      return {
        temperatureC: randomBetween(26.5, 30.5, 1),
        noiseDb: randomBetween(50, 64, 1),
        airQualityAqi: Math.round(randomBetween(68, 118)),
        weather: pickRandom(weatherByScenario.moderate),
      };
  }
};

const generateScenarioFactors = (scenario: MockScenario): EnvironmentalFactors => {
  const { min, max, target } = mockScenarioTargets[scenario];
  let closestCandidate = randomFactorsByScenario(scenario);
  let closestDistance = Math.abs(
    predictEnvironmentalScore(closestCandidate) - target
  );

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = randomFactorsByScenario(scenario);
    const score = predictEnvironmentalScore(candidate);

    if (score >= min && score <= max) {
      return candidate;
    }

    const distance = Math.abs(score - target);
    if (distance < closestDistance) {
      closestCandidate = candidate;
      closestDistance = distance;
    }
  }

  return closestCandidate;
};

const getScoreColor = (score: number) => {
  if (score >= 85) return "#059669";
  if (score >= 70) return "#0891b2";
  if (score >= 55) return "#d97706";
  return "#dc2626";
};

const qualityTrend = (quality: Quality): TrendDirection => {
  if (quality === "good") return "up";
  if (quality === "warning" || quality === "bad") return "down";
  return "stable";
};

const qualityBadgeClass = (quality: Quality) => {
  if (quality === "good") return "bg-green-100 text-green-700 border-green-200";
  if (quality === "ok") return "bg-amber-100 text-amber-700 border-amber-200";
  if (quality === "warning") return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
};

const getTemperatureStatus = (value: number) => {
  if (value >= 22 && value <= 29) return { label: "Tropical comfort", quality: "good" as Quality };
  if (value >= 20 && value <= 32) return { label: "Warm but typical", quality: "ok" as Quality };
  if (value >= 17 && value < 20) return { label: "Cooler than typical", quality: "ok" as Quality };
  if (value < 17) return { label: "Too cool", quality: "bad" as Quality };
  return { label: "Heat load", quality: "bad" as Quality };
};

const getNoiseStatus = (value: number) => {
  if (value <= 40) return { label: "Peaceful", quality: "good" as Quality };
  if (value <= 55) return { label: "Manageable", quality: "ok" as Quality };
  if (value <= 70) return { label: "Irritation", quality: "warning" as Quality };
  return { label: "Stress Trigger", quality: "bad" as Quality };
};

const getAirStatus = (value: number) => {
  if (value <= 50) return { label: "Good", quality: "good" as Quality };
  if (value <= 100) return { label: "Moderate", quality: "ok" as Quality };
  if (value <= 150) return { label: "Slight Irritation", quality: "warning" as Quality };
  if (value <= 200) return { label: "Unhealthy", quality: "bad" as Quality };
  if (value <= 300) return { label: "Very Unhealthy", quality: "bad" as Quality };
  return { label: "Hazardous", quality: "bad" as Quality };
};

const getWeatherStatus = (weather: WeatherProfile) => {
  if (weather.moodEffect >= 3) return { label: "Uplifting", quality: "good" as Quality };
  if (weather.moodEffect >= 0) return { label: "Favourable", quality: "good" as Quality };
  if (weather.moodEffect >= -3) return { label: "Neutral", quality: "ok" as Quality };
  if (weather.moodEffect >= -5) return { label: "Dampening", quality: "warning" as Quality };
  return { label: "Disruptive", quality: "bad" as Quality };
};

const buildSubtitle = (factors: EnvironmentalFactors) =>
  `${factors.weather.label} | ${Math.round(factors.temperatureC)}C | AQI ${factors.airQualityAqi}`;

export function EnvironmentDialog({
  open,
  onOpenChange,
  isEnabled,
  onToggle,
  onSimulationUpdate,
}: EnvironmentDialogProps) {
  const [simulation, setSimulation] = useState<EnvironmentalSimulationState>(() => {
    const seedFactors = generateRandomFactors();
    const seedScore = predictEnvironmentalScore(seedFactors);

    return {
      factors: seedFactors,
      score: seedScore,
      trend: "stable",
      scoreSeries: chartLabels.map(() =>
        clamp(seedScore + randomBetween(-8, 8), 25, 98)
      ),
    };
  });

  const onSimulationUpdateRef = useRef(onSimulationUpdate);
  const simulationRef = useRef(simulation);
  const mockScenarioIndexRef = useRef(0);

  useEffect(() => {
    onSimulationUpdateRef.current = onSimulationUpdate;
  }, [onSimulationUpdate]);

  const applyFactorUpdate = useCallback((nextFactors: EnvironmentalFactors) => {
    if (!isEnabled) return;

    const prev = simulationRef.current;
    const nextScore = predictEnvironmentalScore(nextFactors);
    const nextTrend: TrendDirection =
      nextScore > prev.score ? "up" : nextScore < prev.score ? "down" : "stable";

    const nextState: EnvironmentalSimulationState = {
      factors: nextFactors,
      score: nextScore,
      trend: nextTrend,
      scoreSeries: [...prev.scoreSeries.slice(1), nextScore],
    };

    simulationRef.current = nextState;
    setSimulation(nextState);

    onSimulationUpdateRef.current?.({
      score: nextScore,
      trend: nextTrend,
      subtitle: buildSubtitle(nextFactors),
    });
  }, [isEnabled]);

  const refreshFactor = useCallback((key: keyof EnvironmentalFactors) => {
    if (!isEnabled) return;

    const nextFactors = { ...simulationRef.current.factors };

    switch (key) {
      case "temperatureC":
        nextFactors.temperatureC = randomBetween(19, 34, 1);
        break;
      case "noiseDb":
        nextFactors.noiseDb = randomBetween(28, 82, 1);
        break;
      case "airQualityAqi":
        nextFactors.airQualityAqi = Math.round(randomBetween(18, 230));
        break;
      case "weather":
        nextFactors.weather = pickRandom(weatherProfiles);
        break;
    }

    applyFactorUpdate(nextFactors);
  }, [applyFactorUpdate, isEnabled]);

  const handleGenerateMockEnvironment = useCallback(() => {
    const scenario =
      mockScenarioOrder[mockScenarioIndexRef.current % mockScenarioOrder.length];
    const scenarioFactors = generateScenarioFactors(scenario);
    mockScenarioIndexRef.current += 1;
    applyFactorUpdate(scenarioFactors);
  }, [applyFactorUpdate]);

  useEffect(() => {
    if (isEnabled) return;

    onSimulationUpdateRef.current?.({
      score: simulation.score,
      trend: "stable",
      subtitle: "Tracking paused",
    });
  }, [isEnabled, simulation.score]);

  const chartData = useMemo(
    () =>
      simulation.scoreSeries.map((value, index) => ({
        day: chartLabels[index],
        value,
      })),
    [simulation.scoreSeries]
  );

  const temperatureStatus = getTemperatureStatus(simulation.factors.temperatureC);
  const noiseStatus = getNoiseStatus(simulation.factors.noiseDb);
  const airStatus = getAirStatus(simulation.factors.airQualityAqi);
  const weatherStatus = getWeatherStatus(simulation.factors.weather);

  const canGenerate = isEnabled;

  return (
    <ModuleDialogBase
      open={open}
      onOpenChange={onOpenChange}
      icon={CloudSun}
      title="Environmental Context"
      description="Passive monitoring of temperature, noise, air quality, and weather influences on mental wellbeing"
      headerGradient="bg-gradient-to-r from-emerald-600 to-cyan-600"
      isEnabled={isEnabled}
      onToggle={onToggle}
      privacyNote="Environmental context is estimated from local sensors, optional smart home integrations, and public weather APIs. This demo uses synthetic random input values to simulate model scoring."
      footerActions={[
        { label: "View Env Logs", icon: FileText },
        { label: "Export Dataset", icon: Download },
        { label: "Delete Context Data", icon: Trash2, danger: true },
      ]}
    >
      <Card className="bg-white p-4 shadow-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Mock Environment Input Generator</h3>
            <p className="mt-1 text-xs text-gray-500">
              Hybrid mode samples a real CSV row and applies jitter before model inference.
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              Temp: {simulation.factors.temperatureC.toFixed(1)} C | Noise: {simulation.factors.noiseDb.toFixed(1)} dB | AQI: {simulation.factors.airQualityAqi} | Weather: {simulation.factors.weather.label}
            </p>
          </div>
          <Button
            onClick={handleGenerateMockEnvironment}
            disabled={!canGenerate}
            className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isEnabled ? "Generate Mock Environment" : "Tracking Paused"}
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([
          {
            factorKey: "temperatureC" as keyof EnvironmentalFactors,
            metric: {
              label: "Temperature",
              value: simulation.factors.temperatureC.toFixed(1),
              unit: "C",
              icon: Thermometer,
              trend: qualityTrend(temperatureStatus.quality),
              trendLabel: temperatureStatus.label,
              accentClass: "border-l-emerald-400",
              iconBg: "bg-emerald-50",
              iconColor: "text-emerald-600",
              statusBadge: { text: temperatureStatus.label, className: qualityBadgeClass(temperatureStatus.quality) },
            },
          },
          {
            factorKey: "noiseDb" as keyof EnvironmentalFactors,
            metric: {
              label: "Noise Level",
              value: simulation.factors.noiseDb.toFixed(1),
              unit: "dB",
              icon: Volume2,
              trend: qualityTrend(noiseStatus.quality),
              trendLabel: noiseStatus.label,
              accentClass: "border-l-orange-400",
              iconBg: "bg-orange-50",
              iconColor: "text-orange-600",
              statusBadge: { text: noiseStatus.label, className: qualityBadgeClass(noiseStatus.quality) },
            },
          },
          {
            factorKey: "airQualityAqi" as keyof EnvironmentalFactors,
            metric: {
              label: "Air Quality",
              value: `${simulation.factors.airQualityAqi}`,
              unit: "AQI",
              icon: Wind,
              trend: qualityTrend(airStatus.quality),
              trendLabel: airStatus.label,
              accentClass: "border-l-cyan-400",
              iconBg: "bg-cyan-50",
              iconColor: "text-cyan-600",
              statusBadge: { text: airStatus.label, className: qualityBadgeClass(airStatus.quality) },
            },
          },
          {
            factorKey: "weather" as keyof EnvironmentalFactors,
            metric: {
              label: "Weather Context",
              value: simulation.factors.weather.label,
              icon: CloudSun,
              trend: qualityTrend(weatherStatus.quality),
              trendLabel: weatherStatus.label,
              accentClass: "border-l-sky-400",
              iconBg: "bg-sky-50",
              iconColor: "text-sky-600",
              statusBadge: { text: weatherStatus.label, className: qualityBadgeClass(weatherStatus.quality) },
            },
          },
        ] as { factorKey: keyof EnvironmentalFactors; metric: Parameters<typeof MetricCard>[0]["metric"] }[]).map(({ factorKey, metric }) => (
          <button
            key={metric.label}
            type="button"
            disabled={!isEnabled}
            onClick={() => refreshFactor(factorKey)}
            className="text-left transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            title={isEnabled ? `Click to refresh ${metric.label}` : "Enable module to interact"}
          >
            <MetricCard metric={metric} />
          </button>
        ))}
      </div>

      <TrendChartSection
        data={chartData}
        title="Recent Environmental Wellbeing Trend"
        chartColor={getScoreColor(simulation.score)}
        yLabel="Score"
        yDomain={[20, 100]}
      />

      <InsightsCard
        accentBg="bg-emerald-50"
        accentBorder="border-emerald-100"
        accentTitle="text-emerald-700"
        bulletColor="bg-emerald-400"
        badge={
          simulation.trend === "up"
            ? "Improving"
            : simulation.trend === "down"
              ? "Declining"
              : "Stable"
        }
        insights={[
          {
            text: `Current weather is ${simulation.factors.weather.label}.${simulation.factors.weather.moodEffect > 0
              ? " Bright conditions are giving a small mood lift."
              : simulation.factors.weather.moodEffect < -4
                ? " Conditions are notably dampening wellbeing."
                : ""
              }`,
          },
          {
            text:
              simulation.factors.noiseDb > 65
                ? `Noise is ${simulation.factors.noiseDb.toFixed(1)} dB, which is likely to elevate cognitive load and emotional reactivity.`
                : `Noise is ${simulation.factors.noiseDb.toFixed(1)} dB, which is within a calmer range for sustained focus.`,
          },
          {
            text: `Demo score is ${simulation.score}/100. Use the top generator for a full refresh or click any metric card to refresh a single sensor reading in real time.`,
          },
        ]}
      />

    </ModuleDialogBase>
  );
}

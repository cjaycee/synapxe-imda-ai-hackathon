import {
    CloudSun,
    Thermometer,
    Sun,
    Volume2,
    Wind,
    FileText,
    Download,
    PauseCircle,
    Trash2,
} from "lucide-react";
import { predictEnvScore } from "../models/env_module/envLinearModel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import {
    ModuleDialogBase,
    ScoreCircle,
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
type Quality = "good" | "ok" | "bad";

interface WeatherProfile {
    label: string;
    penalty: number;     // precipitation proxy used by regression baseline
    moodEffect: number; // contextual mood impact: positive = uplifting, negative = dampening
}

interface EnvironmentalFactors {
    temperatureC: number;
    lightLux: number;
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
    lightLux: Math.round(randomBetween(80, 1200)),
    noiseDb: randomBetween(28, 82, 1),
    airQualityAqi: Math.round(randomBetween(18, 165)),
    weather: pickRandom(weatherProfiles),
});

const predictEnvironmentalScore = (factors: EnvironmentalFactors) =>
    predictEnvScore({
        temperatureC: factors.temperatureC,
        noiseDb: factors.noiseDb,
        airQualityAqi: factors.airQualityAqi,
        weatherPenalty: factors.weather.penalty,
        weatherMoodEffect: factors.weather.moodEffect,
        lightLux: factors.lightLux,
    });

const getScoreLabel = (score: number) => {
    if (score >= 85) return "Supportive";
    if (score >= 70) return "Balanced";
    if (score >= 55) return "Watchlist";
    return "Disruptive";
};

const getScoreBadgeClass = (score: number) => {
    if (score >= 85) return "bg-green-100 text-green-700 border-green-200";
    if (score >= 70) return "bg-cyan-100 text-cyan-700 border-cyan-200";
    if (score >= 55) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-rose-100 text-rose-700 border-rose-200";
};

const getScoreColor = (score: number) => {
    if (score >= 85) return "#059669";
    if (score >= 70) return "#0891b2";
    if (score >= 55) return "#d97706";
    return "#dc2626";
};

const qualityTrend = (quality: Quality): TrendDirection => {
    if (quality === "good") return "up";
    if (quality === "bad") return "down";
    return "stable";
};

const qualityBadgeClass = (quality: Quality) => {
    if (quality === "good") return "bg-green-100 text-green-700 border-green-200";
    if (quality === "ok") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-rose-100 text-rose-700 border-rose-200";
};

const getTemperatureStatus = (value: number) => {
    if (value >= 22 && value <= 29) return { label: "Tropical comfort", quality: "good" as Quality };
    if (value >= 20 && value <= 32) return { label: "Warm but typical", quality: "ok" as Quality };
    if (value >= 17 && value < 20) return { label: "Cooler than typical", quality: "ok" as Quality };
    if (value < 17) return { label: "Too cool", quality: "bad" as Quality };
    return { label: "Heat load", quality: "bad" as Quality };
};

const getLightStatus = (value: number) => {
    if (value >= 250 && value <= 700) return { label: "Regulated", quality: "good" as Quality };
    if (value >= 150 && value <= 950) return { label: "Suboptimal", quality: "ok" as Quality };
    return { label: "Disruptive", quality: "bad" as Quality };
};

const getNoiseStatus = (value: number) => {
    if (value <= 48) return { label: "Calm", quality: "good" as Quality };
    if (value <= 63) return { label: "Manageable", quality: "ok" as Quality };
    return { label: "Stress trigger", quality: "bad" as Quality };
};

const getAirStatus = (value: number) => {
    if (value <= 50) return { label: "Healthy", quality: "good" as Quality };
    if (value <= 100) return { label: "Moderate", quality: "ok" as Quality };
    return { label: "Irritant risk", quality: "bad" as Quality };
};

const getWeatherStatus = (weather: WeatherProfile) => {
    if (weather.moodEffect >= 3) return { label: "Uplifting", quality: "good" as Quality };
    if (weather.moodEffect >= 0) return { label: "Favourable", quality: "good" as Quality };
    if (weather.moodEffect >= -3) return { label: "Neutral", quality: "ok" as Quality };
    if (weather.moodEffect >= -5) return { label: "Dampening", quality: "ok" as Quality };
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

    const previousScoreRef = useRef(simulation.score);
    const onSimulationUpdateRef = useRef(onSimulationUpdate);
    const simulationRef = useRef(simulation);

    useEffect(() => {
        onSimulationUpdateRef.current = onSimulationUpdate;
    }, [onSimulationUpdate]);

    const refreshFactor = useCallback((key: keyof EnvironmentalFactors) => {
        if (!isEnabled) return;
        const prev = simulationRef.current;
        const newFactors = { ...prev.factors };

        switch (key) {
            case "temperatureC": newFactors.temperatureC = randomBetween(19, 34, 1); break;
            case "lightLux": newFactors.lightLux = Math.round(randomBetween(80, 1200)); break;
            case "noiseDb": newFactors.noiseDb = randomBetween(28, 82, 1); break;
            case "airQualityAqi": newFactors.airQualityAqi = Math.round(randomBetween(18, 165)); break;
            case "weather": newFactors.weather = pickRandom(weatherProfiles); break;
        }

        const nextScore = predictEnvironmentalScore(newFactors);
        const nextTrend: TrendDirection =
            nextScore > prev.score ? "up" : nextScore < prev.score ? "down" : "stable";

        previousScoreRef.current = nextScore;

        const nextState: EnvironmentalSimulationState = {
            factors: newFactors,
            score: nextScore,
            trend: nextTrend,
            scoreSeries: [...prev.scoreSeries.slice(1), nextScore],
        };

        simulationRef.current = nextState;
        setSimulation(nextState);

        onSimulationUpdateRef.current?.({
            score: nextScore,
            trend: nextTrend,
            subtitle: buildSubtitle(newFactors),
        });
    }, [isEnabled]);

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

    const scoreLabel = getScoreLabel(simulation.score);
    const scoreBadgeClass = getScoreBadgeClass(simulation.score);
    const temperatureStatus = getTemperatureStatus(simulation.factors.temperatureC);
    const lightStatus = getLightStatus(simulation.factors.lightLux);
    const noiseStatus = getNoiseStatus(simulation.factors.noiseDb);
    const airStatus = getAirStatus(simulation.factors.airQualityAqi);
    const weatherStatus = getWeatherStatus(simulation.factors.weather);

    const activeStressors = [
        simulation.factors.noiseDb > 65 ? "high noise" : null,
        simulation.factors.airQualityAqi > 100 ? "poor air quality" : null,
        simulation.factors.lightLux < 160 || simulation.factors.lightLux > 950
            ? "lighting imbalance"
            : null,
        simulation.factors.temperatureC > 30 ? "heat" : null,
        simulation.factors.weather.moodEffect <= -4.5 ? "weather volatility" : null,
    ].filter(Boolean) as string[];

    const summaryText =
        activeStressors.length === 0
            ? "Ambient context is currently supportive for emotional stability. The demo model is receiving random sensor values and returns a stable wellbeing score."
            : `The model detected ${activeStressors.join(", ")} as probable environmental stressors. Score is reduced until these factors return to safer ranges.`;

    return (
        <ModuleDialogBase
            open={open}
            onOpenChange={onOpenChange}
            icon={CloudSun}
            title="Environmental Context"
            description="Passive monitoring of temperature, light, noise, air quality, and weather influences on mental wellbeing"
            headerGradient="bg-gradient-to-r from-emerald-600 to-cyan-600"
            isEnabled={isEnabled}
            onToggle={onToggle}
            privacyNote="Environmental context is estimated from local sensors, optional smart home integrations, and public weather APIs. This demo uses synthetic random input values to simulate model scoring."
            footerActions={[
                { label: "View Env Logs", icon: FileText },
                { label: "Export Dataset", icon: Download },
                { label: "Pause Monitoring", icon: PauseCircle },
                { label: "Delete Context Data", icon: Trash2, danger: true },
            ]}
        >
            <Card className="bg-white p-5 shadow-none">
                <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
                    <ScoreCircle
                        score={simulation.score}
                        color={getScoreColor(simulation.score)}
                        label={scoreLabel}
                    />
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-base font-semibold text-gray-900">
                                Environmental Wellbeing Score
                            </h3>
                            <Badge className={`${scoreBadgeClass} text-xs`}>
                                {scoreLabel} Context
                            </Badge>
                            {/* <Badge variant="outline" className="text-[10px] text-gray-500">
                                Demo model | Random inputs
                            </Badge> */}
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed">{summaryText}</p>
                        <div className="mt-3 flex flex-wrap gap-3">
                            {[
                                {
                                    label: "Temp",
                                    val: `${simulation.factors.temperatureC.toFixed(1)} C`,
                                    color: "text-emerald-600",
                                },
                                {
                                    label: "Noise",
                                    val: `${simulation.factors.noiseDb.toFixed(1)} dB`,
                                    color: "text-orange-600",
                                },
                                {
                                    label: "AQI",
                                    val: `${simulation.factors.airQualityAqi}`,
                                    color: "text-cyan-700",
                                },
                                {
                                    label: "Weather",
                                    val: simulation.factors.weather.label,
                                    color: "text-sky-600",
                                },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center gap-1.5">
                                    <span className={`text-sm font-semibold ${item.color}`}>
                                        {item.val}
                                    </span>
                                    <span className="text-xs text-gray-400">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
                        factorKey: "lightLux" as keyof EnvironmentalFactors,
                        metric: {
                            label: "Light Exposure",
                            value: `${simulation.factors.lightLux}`,
                            unit: "lux",
                            icon: Sun,
                            trend: qualityTrend(lightStatus.quality),
                            trendLabel: lightStatus.label,
                            accentClass: "border-l-amber-400",
                            iconBg: "bg-amber-50",
                            iconColor: "text-amber-600",
                            statusBadge: { text: lightStatus.label, className: qualityBadgeClass(lightStatus.quality) },
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
                        text: `Demo score is ${simulation.score}/100. Click any metric card to refresh that sensor reading and watch the score recalculate in real time.`,
                    },
                ]}
            />

        </ModuleDialogBase>
    );
}

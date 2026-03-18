import {
  ActivityFeatures,
  predictMentalWellbeing,
} from "../../lib/activity/activityLinearModel";
import {
  ModuleDialogBase,
  ScoreCircle,
  MetricCard,
  TrendChartSection,
  InsightsCard,
} from "./ModuleDialogBase";
import { useMemo, useState } from "react";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import {
  BarChart2,
  HeartPulse,
  Footprints,
  Clock,
  Star,
  FileText,
  Download,
  PauseCircle,
  Trash2,
} from "lucide-react";

interface ActivityWellbeingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEnabled: boolean;
  currentScore: number;
  onToggle: () => void;
  onScoreUpdate?: (payload: ActivityScoreUpdate) => void;
}

export interface ActivityScoreUpdate {
  predictedScore: number;
  features: ActivityFeatures;
}

const DEFAULT_FEATURES: ActivityFeatures = {
  observedHours: 19,
  totalSteps: 12000,
  meanStepsPerSecond: 0.18,
  activeSecondsFraction: 0.16,
  standingFraction: 0.33,
  sittingFraction: 0.31,
  lyingFraction: 0.14,
  offFraction: 0.22,
  meanHr: 75,
  stdHr: 16,
  minHr: 24,
  maxHr: 210,
  meanVectorMagnitude: 35,
  stdVectorMagnitude: 67,
  axis1Std: 38,
  axis2Std: 41,
  axis3Std: 41,
};

export function ActivityWellbeingDialog({
  open,
  onOpenChange,
  isEnabled,
  currentScore,
  onToggle,
  onScoreUpdate,
}: ActivityWellbeingDialogProps) {
  const [features, setFeatures] = useState<ActivityFeatures>(DEFAULT_FEATURES);
  const [score, setScore] = useState(currentScore);
  const [aiSummary, setAiSummary] = useState(
    "Generate a mock activity profile to run the local model and score today's mental wellbeing."
  );
  const [trendData, setTrendData] = useState([
    { day: "Mon", value: 72 },
    { day: "Tue", value: 68 },
    { day: "Wed", value: 65 },
    { day: "Thu", value: 70 },
    { day: "Fri", value: 61 },
    { day: "Sat", value: 68 },
    { day: "Sun", value: 74 },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);

  const prediction = useMemo(() => predictMentalWellbeing(features), [features]);
  const qualityLabel = useMemo(() => {
    switch (prediction.band) {
      case "excellent":
        return "Excellent";
      case "good":
        return "Good";
      case "moderate":
        return "Fair";
      case "low":
        return "Low";
      default:
        return "Very Low";
    }
  }, [prediction.band]);

  const scoreBadgeClass = useMemo(() => {
    switch (prediction.band) {
      case "excellent":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
      case "good":
        return "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100";
      case "moderate":
        return "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100";
      default:
        return "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100";
    }
  }, [prediction.band]);

  const canGenerate = isEnabled && !isGenerating;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    try {
      // For demo: jitter features slightly for mock generation
      const nextFeatures: ActivityFeatures = {
        ...features,
        totalSteps: Math.round(features.totalSteps + (Math.random() - 0.5) * 1000),
        meanHr: features.meanHr + (Math.random() - 0.5) * 2,
        stdHr: features.stdHr + (Math.random() - 0.5) * 1,
        meanStepsPerSecond: features.meanStepsPerSecond + (Math.random() - 0.5) * 0.01,
        activeSecondsFraction: features.activeSecondsFraction + (Math.random() - 0.5) * 0.01,
      };
      const pred = predictMentalWellbeing(nextFeatures);

      setFeatures(nextFeatures);
      setScore(pred.score);
      setAiSummary(
        `Predicted wellbeing score is ${pred.score}/100 (${qualityLabel}) based on today's activity profile.`
      );
      setTrendData((prev) => {
        const next = [
          ...prev,
          {
            day: new Date().toLocaleDateString("en-US", { weekday: "short" }),
            value: pred.score,
          },
        ];
        return next.slice(-7);
      });

      onScoreUpdate?.({
        predictedScore: pred.score,
        features: nextFeatures,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ModuleDialogBase
      open={open}
      onOpenChange={onOpenChange}
      icon={BarChart2}
      title="Activity & Wellbeing"
      description="Physical activity, posture, and heart rate tracking for mental wellbeing"
      headerGradient="bg-gradient-to-r from-pink-600 to-purple-600"
      isEnabled={isEnabled}
      onToggle={onToggle}
      headerAction={{
        label: "Connect to Wearable",
      }}
      footerActions={[
        {
          label: isGenerating ? "Generating..." : "Generate Mock Activity",
          icon: Star,
          onClick: handleGenerate,
        },
        { label: "View Activity Logs", icon: FileText },
        { label: "Export Report", icon: Download },
        { label: "Pause Tracking", icon: PauseCircle },
        { label: "Delete Activity Data", icon: Trash2, danger: true },
      ]}
    >
      <Card className="bg-white p-4 shadow-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Mock Activity Input Generator</h3>
            <p className="mt-1 text-xs text-gray-500">
              Hybrid mode samples a real input and applies jitter before model inference.
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              Steps: {features.totalSteps}, HR: {features.meanHr.toFixed(1)} bpm, Active: {(features.activeSecondsFraction * 100).toFixed(1)}%
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="bg-pink-600 text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isGenerating ? "Generating..." : "Generate Mock Activity"}
          </Button>
        </div>
      </Card>

      {/* ── Score Summary ───────────────────────────── */}
      <Card className="bg-white p-5 shadow-none">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <ScoreCircle score={prediction.score} color="#ec4899" label={qualityLabel} />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-base font-semibold text-gray-900">
                Mental Wellbeing Score
              </h3>
              <Badge className={`${scoreBadgeClass} text-xs`}>
                {qualityLabel} Activity
              </Badge>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              {aiSummary}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {[
                {
                  label: "Predicted",
                  val: `${prediction.score} / 100`,
                  color: "text-pink-600",
                },
                {
                  label: "Steps",
                  val: `${features.totalSteps}`,
                  color: "text-blue-600",
                },
                {
                  label: "Mean HR",
                  val: `${features.meanHr.toFixed(1)} bpm`,
                  color: "text-rose-600",
                },
                {
                  label: "Active %",
                  val: `${(features.activeSecondsFraction * 100).toFixed(1)}%`,
                  color: "text-purple-600",
                },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className={`text-sm font-semibold ${s.color}`}>
                    {s.val}
                  </span>
                  <span className="text-xs text-gray-400">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Metric Cards ────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          metric={{
            label: "Predicted Score",
            value: `${prediction.score}`,
            unit: "/ 100",
            icon: Star,
            trend: prediction.score >= 60 ? "up" : "down",
            trendLabel: qualityLabel,
            accentClass: "border-l-pink-400",
            iconBg: "bg-pink-50",
            iconColor: "text-pink-600",
            statusBadge: {
              text: qualityLabel,
              className:
                prediction.score >= 60
                  ? "bg-blue-100 text-blue-700 border-blue-200"
                  : "bg-amber-100 text-amber-700 border-amber-200",
            },
          }}
        />
        <MetricCard
          metric={{
            label: "Steps",
            value: `${features.totalSteps}`,
            unit: "",
            icon: Footprints,
            trend: features.totalSteps >= 10000 ? "up" : "down",
            trendLabel:
              features.totalSteps >= 10000
                ? "Active"
                : "Below target",
            accentClass: "border-l-blue-400",
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
          }}
        />
        <MetricCard
          metric={{
            label: "Mean HR",
            value: `${features.meanHr.toFixed(1)}`,
            unit: "bpm",
            icon: HeartPulse,
            trend: features.meanHr >= 60 && features.meanHr <= 90 ? "up" : "down",
            trendLabel:
              features.meanHr >= 60 && features.meanHr <= 90
                ? "Normal"
                : "Out of range",
            accentClass: "border-l-rose-400",
            iconBg: "bg-rose-50",
            iconColor: "text-rose-600",
          }}
        />
        <MetricCard
          metric={{
            label: "Active %",
            value: `${(features.activeSecondsFraction * 100).toFixed(1)}`,
            unit: "%",
            icon: Clock,
            trend: features.activeSecondsFraction >= 0.15 ? "up" : "down",
            trendLabel:
              features.activeSecondsFraction >= 0.15
                ? "Good"
                : "Low",
            accentClass: "border-l-purple-400",
            iconBg: "bg-purple-50",
            iconColor: "text-purple-600",
          }}
        />
      </div>

      {/* ── Trend Chart ─────────────────────────────── */}
      <TrendChartSection
        data={trendData}
        title="7-Day Activity Wellbeing Trend"
        chartColor="#ec4899"
        yLabel="Score"
        yDomain={[0, 100]}
      />

      {/* ── AI Insights ─────────────────────────────── */}
      <InsightsCard
        accentBg="bg-pink-50"
        accentBorder="border-pink-100"
        accentTitle="text-pink-700"
        bulletColor="bg-pink-400"
        insights={[
          {
            text: `Model predicts a wellbeing score of ${prediction.score}/100 based on current activity features.`,
          },
          {
            text:
              features.totalSteps >= 10000
                ? "Step count is above the recommended daily target."
                : "Step count is below the recommended daily target.",
          },
          {
            text:
              features.meanHr >= 60 && features.meanHr <= 90
                ? "Mean heart rate is within the normal range."
                : "Mean heart rate is outside the normal range.",
          },
          {
            text:
              features.activeSecondsFraction >= 0.15
                ? "Active time is good."
                : "Active time is low; try to move more during the day.",
          },
        ]}
      />
    </ModuleDialogBase>
  );
}
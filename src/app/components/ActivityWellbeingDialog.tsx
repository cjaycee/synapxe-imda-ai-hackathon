import {
  ActivityFeatures,
  predictMentalWellbeing,
} from "../../lib/activity/activityLinearModel";
import {
  ModuleDialogBase,
  MetricCard,
  TrendChartSection,
  InsightsCard,
} from "./ModuleDialogBase";
import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import {
  BarChart2,
  HeartPulse,
  Footprints,
  Clock,
  Sparkles,
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
      title="Physiological Signals"
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
          icon: Sparkles,
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

      {/* ── Metric Cards ────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        title="7-Day Physiological Signals Trend"
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
            text: "Model updated physiological readings from the latest activity feature set.",
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
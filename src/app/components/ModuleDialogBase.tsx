"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { LucideIcon, X, Lock, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

/* ──────────────────────────────────────────────
   SHARED SUB-COMPONENTS
─────────────────────────────────────────────── */

export interface ChartDataPoint {
  day: string;
  value: number;
}

export interface MetricCardData {
  label: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "stable";
  trendLabel?: string;
  accentClass: string; // border-l-purple-400 etc.
  iconBg: string; // bg-purple-100
  iconColor: string; // text-purple-600
  statusBadge?: { text: string; className: string };
}

export interface InsightItem {
  text: string;
}

export interface FooterAction {
  label: string;
  icon: LucideIcon;
  danger?: boolean;
  onClick?: () => void;
}

/* Score Circle */
export function ScoreCircle({
  score,
  color,
  label,
}: {
  score: number;
  color: string;
  label: string;
}) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} stroke="#e5e7eb" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{score}</span>
        <span className="text-xs text-gray-400">/ 100</span>
        <span className="mt-0.5 text-[10px] font-medium text-gray-500 text-center leading-tight px-1">{label}</span>
      </div>
    </div>
  );
}

/* Metric Card */
export function MetricCard({ metric }: { metric: MetricCardData }) {
  const TrendIcon =
    metric.trend === "up"
      ? TrendingUp
      : metric.trend === "down"
      ? TrendingDown
      : Minus;
  const trendColor =
    metric.trend === "up"
      ? "text-green-500"
      : metric.trend === "down"
      ? "text-red-400"
      : "text-gray-400";

  return (
    <Card
      className={`p-4 border-l-4 bg-white ${metric.accentClass} shadow-none`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${metric.iconBg}`}
        >
          <metric.icon className={`h-4 w-4 ${metric.iconColor}`} />
        </div>
        {metric.statusBadge ? (
          <Badge className={`text-[10px] px-1.5 py-0 ${metric.statusBadge.className}`}>
            {metric.statusBadge.text}
          </Badge>
        ) : metric.trend ? (
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        ) : null}
      </div>
      <p className="text-xs text-gray-500 mb-1">{metric.label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-gray-900">{metric.value}</span>
        {metric.unit && (
          <span className="text-xs text-gray-400">{metric.unit}</span>
        )}
      </div>
      {metric.trendLabel && (
        <p className={`text-[11px] mt-1 ${trendColor}`}>{metric.trendLabel}</p>
      )}
    </Card>
  );
}

/* Trend Chart Section */
export function TrendChartSection({
  data,
  title,
  chartColor,
  yLabel,
  yDomain,
}: {
  data: ChartDataPoint[];
  title: string;
  chartColor: string;
  yLabel?: string;
  yDomain?: [number, number];
}) {
  // Generate stable unique ID for gradient to avoid duplicate keys
  const rawId = React.useId();
  const uniqueId = rawId.replace(/:/g, '');
  const gradientId = `grad${uniqueId}`;

  return (
    <Card className="p-5 bg-white shadow-none">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <Badge variant="outline" className="text-[10px] text-gray-500">
          Last 7 Days
        </Badge>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            domain={yDomain}
            label={
              yLabel
                ? { value: yLabel, angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#9ca3af" } }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={chartColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={{ fill: chartColor, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: chartColor }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

/* Insights Card */
export function InsightsCard({
  insights,
  accentBg,
  accentBorder,
  accentTitle,
  bulletColor,
  badge,
}: {
  insights: InsightItem[];
  accentBg: string;
  accentBorder: string;
  accentTitle: string;
  bulletColor: string;
  badge?: string;
}) {
  return (
    <Card className={`p-5 border ${accentBorder} ${accentBg} shadow-none`}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className={`h-4 w-4 ${accentTitle}`} />
        <h3 className={`text-sm font-semibold ${accentTitle}`}>AI Insights</h3>
        {badge && (
          <Badge className={`text-[10px] px-1.5 py-0 ${accentBg} ${accentTitle} ${accentBorder}`}>
            {badge}
          </Badge>
        )}
      </div>
      <ul className="space-y-2">
        {insights.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${bulletColor}`} />
            {item.text}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ──────────────────────────────────────────────
   BASE DIALOG SHELL
─────────────────────────────────────────────── */

interface ModuleDialogBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: LucideIcon;
  title: string;
  description: string;
  headerGradient: string;
  isEnabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  footerActions: FooterAction[];
  privacyNote?: string;
  headerAction?: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
  };
}

export function ModuleDialogBase({
  open,
  onOpenChange,
  icon: Icon,
  title,
  description,
  headerGradient,
  isEnabled,
  onToggle,
  children,
  footerActions,
  privacyNote = "All health data is processed locally on your device and never transmitted without your explicit consent.",
  headerAction,
}: ModuleDialogBaseProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200" />
        <DialogPrimitive.Content
          className="fixed top-1/2 left-1/2 z-50 flex w-full max-w-4xl max-h-[90vh] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl overflow-hidden shadow-2xl bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
          style={{ width: "calc(100% - 2rem)" }}
        >
          {/* ── Header ─────────────────────────────────── */}
          <div className={`${headerGradient} relative shrink-0 px-6 py-5`}>
            <div className="flex items-center justify-between pr-10">
              {/* Left: icon + title */}
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogPrimitive.Title asChild>
                    <h2 className="text-lg font-semibold leading-tight text-white">
                      {title}
                    </h2>
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description asChild>
                    <p className="mt-0.5 text-xs text-white/65 leading-relaxed">
                      {description}
                    </p>
                  </DialogPrimitive.Description>
                </div>
              </div>

              {/* Right: badge + toggle */}
              <div className="flex items-center gap-3">
                {headerAction ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={headerAction.onClick}
                    disabled={headerAction.disabled}
                    className="h-7 border-white/30 bg-white/10 px-2.5 text-[11px] text-white hover:bg-white/25 hover:text-white"
                  >
                    {headerAction.label}
                  </Button>
                ) : null}
                <Badge
                  className={
                    isEnabled
                      ? "border-green-300/40 bg-green-400/25 text-white hover:bg-green-400/25 text-xs"
                      : "border-gray-300/40 bg-gray-400/25 text-white hover:bg-gray-400/25 text-xs"
                  }
                >
                  <span
                    className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                      isEnabled ? "animate-pulse bg-green-300" : "bg-gray-300"
                    }`}
                  />
                  {isEnabled ? "Active" : "Paused"}
                </Badge>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={onToggle}
                  className="data-[state=checked]:bg-white/40 data-[state=unchecked]:bg-white/20 border-white/30 shrink-0"
                />
              </div>
            </div>

            {/* Close button */}
            <DialogPrimitive.Close className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 ring-1 ring-white/20 transition-all hover:bg-white/25 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* ── Scrollable Body ─────────────────────────── */}
          <div className="flex-1 overflow-y-auto bg-gray-50/60 p-6">
            <div className="space-y-5">{children}</div>
          </div>

          {/* ── Privacy Footer ──────────────────────────── */}
          <div className="shrink-0 border-t bg-white px-6 py-2.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <Lock className="mt-px h-3 w-3 shrink-0 text-gray-400" />
                <p className="text-[10px] leading-snug text-gray-500">
                  {privacyNote}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {footerActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    className={
                      action.danger
                        ? "h-7 border-red-200 px-3 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700"
                        : "h-7 px-3 text-[11px] text-gray-600 hover:text-gray-800"
                    }
                    onClick={action.onClick}
                  >
                    <action.icon className="mr-1 h-3 w-3" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
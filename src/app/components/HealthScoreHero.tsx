import { useEffect, useRef, useState } from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface HealthScoreHeroProps {
  score: number;
}

export function HealthScoreHero({ score }: HealthScoreHeroProps) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const previousScoreRef = useRef(clampedScore);
  const [lastScoreDelta, setLastScoreDelta] = useState(0);
  const maxScore = 100;
  const percentage = (clampedScore / maxScore) * 100;
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    const previousScore = previousScoreRef.current;
    if (clampedScore !== previousScore) {
      setLastScoreDelta(clampedScore - previousScore);
      previousScoreRef.current = clampedScore;
    }
  }, [clampedScore]);

  const deltaMeta =
    lastScoreDelta > 0
      ? {
        icon: TrendingUp,
        className: 'text-emerald-600',
        label: `+${lastScoreDelta} from previous`,
      }
      : lastScoreDelta < 0
        ? {
          icon: TrendingDown,
          className: 'text-rose-600',
          label: `${lastScoreDelta} from previous`,
        }
        : {
          icon: Minus,
          className: 'text-gray-600',
          label: 'No change from previous',
        };
  const DeltaIcon = deltaMeta.icon;

  const statusBadge =
    clampedScore >= 80
      ? {
        label: 'Excellent',
        className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
      }
      : clampedScore >= 65
        ? {
          label: 'Good & Stable',
          className: 'bg-green-100 text-green-700 hover:bg-green-100',
        }
        : clampedScore >= 60
          ? {
            label: 'Needs Attention',
            className: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
          }
          : {
            label: 'At Risk',
            className: 'bg-rose-100 text-rose-700 hover:bg-rose-100',
          };
  const insightOptions =
    clampedScore >= 80
      ? [
        'Your recovery profile is strong, with low stress carry-over and steady day-to-day regulation. Keep your current routine and protect sleep consistency to maintain momentum.',
        'Signals indicate excellent balance between activity demand and overnight recovery. Continue your evening wind-down habits to preserve this level.',
      ]
      : clampedScore >= 65
        ? [
          'Your indicators are generally stable, with manageable stress and fair recovery capacity. Improving sleep duration by even 30 to 45 minutes could lift resilience further.',
          'Current patterns show good baseline wellbeing with occasional stress spikes. A more consistent bedtime and brief daytime movement breaks should improve stability.',
        ]
        : clampedScore >= 60
          ? [
            'Recent readings suggest uneven recovery and rising mental load on busy days. Prioritize a fixed wind-down time and shorter high-intensity blocks to reduce strain.',
            'Your profile shows moderate strain with fluctuating stress response across the day. Focus on hydration, regular meals, and consistent sleep timing to rebalance.',
          ]
          : [
            'Current signals point to sustained stress pressure and limited recovery quality. Reduce nonessential load and prioritize rest-focused routines over performance goals this week.',
            'Your recent pattern indicates elevated strain with low reserve. Start with gentle movement, earlier sleep, and short breathing resets to stabilize baseline wellbeing.',
          ];
  const aiInsight = insightOptions[clampedScore % insightOptions.length];

  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <div className="bg-gradient-to-br from-teal-50 via-blue-50 to-cyan-50 p-8">
        <div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-between">
          {/* Left Section: Score Visualization */}
          <div className="flex flex-col items-center gap-4 lg:flex-row lg:gap-8">
            <div className="relative">
              <svg className="h-40 w-40 -rotate-90 transform">
                {/* Background circle */}
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="url(#gradient)"
                  strokeWidth="10"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-gray-900">{clampedScore}</span>
                <span className="text-sm text-gray-500">/ {maxScore}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-center lg:text-left">
              <h2 className="text-2xl font-semibold text-gray-900">Overall MindPulse Score</h2>
              <div className="flex items-center gap-2">
                <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                <div className={`flex items-center gap-1 text-sm ${deltaMeta.className}`}>
                  <DeltaIcon className="h-4 w-4" />
                  <span className="font-medium">{deltaMeta.label}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section: AI Summary */}
          <div className="max-w-md rounded-xl bg-white/80 p-6 shadow-sm backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-teal-500"></div>
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                AI Health Summary
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-700">
              {aiInsight}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

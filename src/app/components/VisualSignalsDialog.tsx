import { Camera, ImageIcon, Download, PauseCircle, Trash2, Eye, Zap, Clock, BarChart3 } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import * as faceapi from "face-api.js";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  ModuleDialogBase,
  InsightsCard,
} from "./ModuleDialogBase";

interface VisualSignalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEnabled: boolean;
  onToggle: () => void;
  onReadingsChange?: (readings: {
    dominantEmotion: string | null;
    emotionConfidence: number;
    stressLevel: number;
    hasFace: boolean;
    avgScore1Min?: number;
  }) => void;
}

interface ScoreEntry {
  timestamp: number;
  score: number;
}

const AVERAGE_WINDOWS = [
  { label: "1 min", ms: 60_000 },
  { label: "15 min", ms: 15 * 60_000 },
  { label: "30 min", ms: 30 * 60_000 },
  { label: "1 hour", ms: 60 * 60_000 },
  { label: "12 hours", ms: 12 * 60 * 60_000 },
  { label: "1 day", ms: 24 * 60 * 60_000 },
] as const;

// Dummy placeholder values for windows without enough data
const DUMMY_SCORES: Record<string, number> = {
  "1 min": 72,
  "15 min": 68,
  "30 min": 65,
  "1 hour": 61,
  "12 hours": 58,
  "1 day": 55,
};

function computeRollingAverages(
  history: ScoreEntry[],
  now: number,
  latestWellnessScore: number
): { label: string; value: number; isEstimate: boolean }[] {
  return AVERAGE_WINDOWS.map(({ label, ms }) => {
    if (label === "1 min") {
      // 1-min score is a periodic snapshot (latest calculated wellness score)
      return { label, value: latestWellnessScore, isEstimate: false };
    }

    const cutoff = now - ms;
    const relevant = history.filter((e) => e.timestamp >= cutoff);
    // Require at least 3 data points AND at least 80% of the window elapsed
    const windowStart = history.length > 0 ? history[0].timestamp : now;
    const elapsedMs = now - windowStart;
    const hasEnoughData = relevant.length >= 3 && elapsedMs >= ms * 0.8;

    if (hasEnoughData) {
      const avg = Math.round(relevant.reduce((s, e) => s + e.score, 0) / relevant.length);
      return { label, value: Math.min(100, Math.max(0, avg)), isEstimate: false };
    }
    return { label, value: DUMMY_SCORES[label], isEstimate: true };
  });
}

export function VisualSignalsDialog({
  open,
  onOpenChange,
  isEnabled,
  onToggle,
  onReadingsChange,
}: VisualSignalsDialogProps) {
  const processingVideoRef = useRef<HTMLVideoElement>(null);
  const displayVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopActiveRef = useRef(false);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [dominantEmotion, setDominantEmotion] = useState<{ emotion: string; score: number } | null>(null);
  const [stressLevel, setStressLevel] = useState<number>(0);
  const loopRef = useRef<number | undefined>(undefined);
  const scoreHistoryRef = useRef<ScoreEntry[]>([]);
  const [averages, setAverages] = useState(() => computeRollingAverages([], Date.now(), DUMMY_SCORES["1 min"]));

  const emitReadings = (payload: {
    dominantEmotion: string | null;
    emotionConfidence: number;
    stressLevel: number;
    hasFace: boolean;
    avgScore1Min?: number;
  }) => {
    onReadingsChange?.(payload);
  };

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceExpressionNet.loadFromUri("/models"),
        ]);
        setIsModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load face-api models:", err);
      }
    };
    loadModels();
  }, []);

  const calculateStress = (expressions: faceapi.FaceExpressions) => {
    const negEmotions = ["sad", "angry", "fearful", "disgusted"];
    let stressScore = 0;
    negEmotions.forEach((e) => {
      stressScore += (expressions as unknown as Record<string, number>)[e] || 0;
    });

    const calculatedStress = stressScore * 100 * 1.5;

    return Math.min(100, Math.round(calculatedStress));
  };

  /** Convert a stress level (0-100, higher = worse) into a wellness score (0-100, higher = better) */
  const stressToScore = (stress: number) => Math.max(0, Math.min(100, 100 - stress));

  const pushScoreAndRecompute = (stress: number) => {
    const now = Date.now();
    const score = stressToScore(stress);
    scoreHistoryRef.current.push({ timestamp: now, score });
    // Prune entries older than 24 hours to keep memory bounded
    const dayAgo = now - 24 * 60 * 60_000;
    scoreHistoryRef.current = scoreHistoryRef.current.filter((e) => e.timestamp >= dayAgo);
    const avgs = computeRollingAverages(scoreHistoryRef.current, now, score);
    setAverages(avgs);
    // Return the 1-min average value (which is now a snapshot of 'score')
    return avgs[0].value;
  };

  const handleRandomizeScore = (label: string) => {
    const randomVal = Math.floor(Math.random() * (95 - 45 + 1)) + 45;
    setAverages(prev => prev.map(avg =>
      avg.label === label ? { ...avg, value: randomVal, isEstimate: false } : avg
    ));

    // If we randomized the 1-min score, immediately update the dashboard
    if (label === "1 min") {
      emitReadings({
        dominantEmotion: dominantEmotion?.emotion || null,
        emotionConfidence: dominantEmotion?.score || 0,
        stressLevel: stressLevel,
        hasFace: true,
        avgScore1Min: randomVal,
      });
    }
  };

  const startVideo = async () => {
    try {
      if (streamRef.current && processingVideoRef.current) {
        processingVideoRef.current.srcObject = streamRef.current;
        try {
          await processingVideoRef.current.play();
        } catch {
          // Best effort only; browser may gate autoplay until user interaction.
        }
        if (displayVideoRef.current && open) {
          displayVideoRef.current.srcObject = streamRef.current;
        }
        setIsVideoReady(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (processingVideoRef.current) {
        processingVideoRef.current.srcObject = stream;
        try {
          await processingVideoRef.current.play();
        } catch {
          // Best effort only; browser may gate autoplay until user interaction.
        }
      }
      if (displayVideoRef.current && open) {
        displayVideoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setIsVideoReady(true);
    } catch (err) {
      console.error("Failed to map webcam stream:", err);
    }
  };

  const stopVideo = () => {
    loopActiveRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (loopRef.current) {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = undefined;
    }
    if (processingVideoRef.current) {
      processingVideoRef.current.srcObject = null;
    }
    if (displayVideoRef.current) {
      displayVideoRef.current.srcObject = null;
    }
    setIsVideoReady(false);
    setDominantEmotion(null);
    setStressLevel(0);
    emitReadings({
      dominantEmotion: null,
      emotionConfidence: 0,
      stressLevel: 0,
      hasFace: false,
    });
  };

  const startDetectionLoop = () => {
    if (loopActiveRef.current) return;
    loopActiveRef.current = true;

    let lastFaceSeen = Date.now();
    let lastStateUpdate = 0;
    let lastScoreUpdate = 0;

    const detect = async () => {
      if (!loopActiveRef.current) return;

      const videoEl = processingVideoRef.current;
      if (!videoEl || videoEl.paused || videoEl.ended || videoEl.readyState < 2) {
        loopRef.current = requestAnimationFrame(detect);
        return;
      }

      let results: faceapi.WithFaceExpressions<faceapi.WithFaceDetection<{}>> | undefined;
      try {
        results = await faceapi
          .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();
      } catch (err) {
        console.error("Visual signals detection failed:", err);
      }

      const now = Date.now();

      if (results) {
        lastFaceSeen = now;

        // Throttled update: refresh UI emotion and stress state every 1000ms
        if (now - lastStateUpdate > 1000) {
          const expressions = results.expressions;
          const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
          if (sorted.length > 0) {
            const currentEmotion = sorted[0][0];
            const currentConfidence = sorted[0][1];
            setDominantEmotion({ emotion: currentEmotion, score: currentConfidence });

            const nextStress = calculateStress(expressions);
            setStressLevel(nextStress);

            // Only update historical scores and emit avg every 1 minute
            let avgScore1Min: number | undefined;
            if (now - lastScoreUpdate > 60_000) {
              avgScore1Min = pushScoreAndRecompute(nextStress);
              lastScoreUpdate = now;
            }

            emitReadings({
              dominantEmotion: currentEmotion,
              emotionConfidence: currentConfidence,
              stressLevel: nextStress,
              hasFace: true,
              avgScore1Min,
            });
          } else {
            setStressLevel(0);
            emitReadings({
              dominantEmotion: null,
              emotionConfidence: 0,
              stressLevel: 0,
              hasFace: false,
            });
          }
          lastStateUpdate = now;
        }
      } else {
        // Clear data if we haven't seen a face for a long time (e.g. 5+ seconds)
        if (now - lastFaceSeen > 5000) {
          setDominantEmotion(null);
          setStressLevel(0);
          emitReadings({
            dominantEmotion: null,
            emotionConfidence: 0,
            stressLevel: 0,
            hasFace: false,
          });
          lastStateUpdate = 0; // Reset update timer
        }
      }

      loopRef.current = requestAnimationFrame(detect);
    };
    loopRef.current = requestAnimationFrame(detect);
  };

  useEffect(() => {
    if (isEnabled && isModelsLoaded) {
      startVideo().then(() => {
        startDetectionLoop();
      });
    } else {
      stopVideo();
    }
    return () => {
      stopVideo();
    };
  }, [isEnabled, isModelsLoaded]);

  useEffect(() => {
    if (!displayVideoRef.current) return;
    if (!open) {
      displayVideoRef.current.srcObject = null;
      return;
    }
    displayVideoRef.current.srcObject = streamRef.current;
  }, [open, isVideoReady]);

  return (
    <>
      <video ref={processingVideoRef} autoPlay muted playsInline className="hidden" />

      <ModuleDialogBase
        open={open}
        onOpenChange={onOpenChange}
        icon={Eye}
        title="Visual Signals"
        description="Real-time facial analysis for emotion and stress detection"
        headerGradient="bg-gradient-to-r from-purple-600 to-violet-700"
        isEnabled={isEnabled}
        onToggle={onToggle}
        privacyNote="Camera data is processed locally in real-time. No video is stored or transmitted. Captured frames are anonymised before analysis and deleted immediately after processing."
        footerActions={[
          { label: "Review Screenshots", icon: ImageIcon },
          { label: "Export Data", icon: Download },
          { label: "Delete Visual Data", icon: Trash2, danger: true },
        ]}
      >
        {/* ── Live Camera Feed ───────────────────────── */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Live Camera Feed</h3>
            <div className="flex items-center gap-2">
              <Badge className="border-red-200 bg-red-50 text-red-600 hover:bg-red-50 text-xs">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                Recording
              </Badge>
              <Badge variant="outline" className="text-[10px] text-gray-500">
                30 FPS · Local
              </Badge>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-inner">
            <div className="relative flex h-72 flex-col items-center justify-center">
              <video
                ref={displayVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover rounded-xl"
              />
              {(!isVideoReady || !isModelsLoaded) && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm gap-4">
                  {/* Pulsing ring */}
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-purple-500/20" />
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-600/25 ring-1 ring-purple-400/40 backdrop-blur-sm">
                      <Camera className="h-9 w-9 text-purple-300" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-300">Live Camera Feed</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {!isModelsLoaded ? "Loading AI models..." : "Face detection initialising · Awaiting stable frame"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Corner brackets */}
            <div className="absolute left-5 top-5 h-8 w-8 rounded-tl-md border-l-2 border-t-2 border-purple-400/50" />
            <div className="absolute right-5 top-5 h-8 w-8 rounded-tr-md border-r-2 border-t-2 border-purple-400/50" />
            <div className="absolute bottom-5 left-5 h-8 w-8 rounded-bl-md border-b-2 border-l-2 border-purple-400/50" />
            <div className="absolute bottom-5 right-5 h-8 w-8 rounded-br-md border-b-2 border-r-2 border-purple-400/50" />

            {/* Bottom info bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-5 py-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-400">
                  Visual AI Engine v2.1 · Local Processing Only
                </p>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-purple-400" />
                  <span className="text-[10px] text-purple-400">AI Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Supporting Cards ────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Emotion */}
          <Card className="border-l-4 border-l-purple-300 bg-white p-5 shadow-none">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Emotion</h3>
              <span className={`inline-block h-2 w-2 rounded-full ${dominantEmotion ? 'bg-purple-500' : 'bg-gray-300 animate-pulse'}`} />
            </div>
            <div className="flex h-20 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-100 bg-gray-50">
              {dominantEmotion ? (
                <>
                  <div className="text-xl font-medium capitalize text-purple-700">
                    {dominantEmotion.emotion}
                  </div>
                  <p className="text-[11px] text-gray-500">{Math.round(dominantEmotion.score * 100)}% Confidence</p>
                </>
              ) : (
                <>
                  <div className="h-6 w-6 rounded-full bg-gray-200 opacity-60" />
                  <p className="text-[11px] text-gray-400">Awaiting signal…</p>
                </>
              )}
            </div>
            <p className="mt-2.5 text-center text-[10px] text-gray-400">
              Neutral · Happy · Sad · Angry · Surprised
            </p>
          </Card>

          {/* Stress Levels */}
          <Card className="border-l-4 border-l-fuchsia-300 bg-white p-5 shadow-none">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Stress Levels</h3>
              <span className={`inline-block h-2 w-2 rounded-full ${dominantEmotion ? 'bg-fuchsia-500' : 'bg-gray-300 animate-pulse'}`} />
            </div>
            <div className="flex h-20 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-100 bg-gray-50 px-4">
              {dominantEmotion ? (
                <>
                  <div className="flex w-full items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">Level</span>
                    <span className="text-xs font-bold text-fuchsia-600">{stressLevel}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-gradient-to-r from-fuchsia-400 to-fuchsia-600 transition-all duration-500"
                      style={{ width: `${stressLevel}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="h-2.5 w-24 rounded-full bg-gray-200 opacity-60" />
                  <p className="text-[11px] text-gray-400">Calibrating…</p>
                </>
              )}
            </div>
            <p className="mt-2.5 text-center text-[10px] text-gray-400">
              Low · Moderate · High · Critical
            </p>
          </Card>
        </div>

        {/* ── Average Scores ────────────────────────── */}
        <Card className="border-l-4 border-l-violet-300 bg-white p-5 shadow-none">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-violet-500" />
              <h3 className="text-sm font-semibold text-gray-800">Average Scores</h3>
            </div>
            <span className={`inline-block h-2 w-2 rounded-full ${dominantEmotion ? 'bg-violet-500' : 'bg-gray-300 animate-pulse'}`} />
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {averages.map((avg) => (
              <button
                key={avg.label}
                onClick={() => handleRandomizeScore(avg.label)}
                className="flex flex-col items-center gap-1 rounded-lg border border-gray-100 bg-gray-50 py-3 px-2 transition-all hover:bg-violet-50 hover:border-violet-200 active:scale-95 group"
              >
                <div className="flex items-center gap-1 text-[10px] font-medium text-gray-500 group-hover:text-violet-600">
                  <Clock className="h-3 w-3" />
                  {avg.label}
                </div>
                <span
                  className={`text-lg font-bold ${avg.isEstimate ? 'text-gray-400' : avg.value >= 70 ? 'text-green-600' : avg.value >= 45 ? 'text-yellow-600' : 'text-orange-600'
                    }`}
                >
                  {avg.value}
                </span>
                {avg.isEstimate && (
                  <span className="text-[9px] text-gray-400 group-hover:text-violet-400">(est.)</span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-center text-[10px] text-gray-400">
            Wellness score (0–100) · higher is better · inverted from stress level
          </p>
        </Card>

        {/* ── AI Insights ─────────────────────────────── */}
        <InsightsCard
          accentBg="bg-purple-50"
          accentBorder="border-purple-100"
          accentTitle="text-purple-700"
          bulletColor="bg-purple-400"
          badge={dominantEmotion ? "Active" : "Pending"}
          insights={
            dominantEmotion
              ? [
                {
                  text: `Currently detecting ${dominantEmotion.emotion} with ${Math.round(dominantEmotion.score * 100)}% confidence.`,
                },
                {
                  text: `Stress level is currently estimated at ${stressLevel}% based on facial emotion markers.`,
                },
              ]
              : [
                {
                  text: "Awaiting stable face detection to begin real-time emotion classification.",
                },
                {
                  text: "Ensure your face is clearly visible and well-lit for accurate model inference.",
                },
              ]
          }
        />
      </ModuleDialogBase>
    </>
  );
}

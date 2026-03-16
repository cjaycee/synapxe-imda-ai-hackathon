import { Camera, ImageIcon, Download, PauseCircle, Trash2, Eye, Zap, Heart } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  YAxis,
} from "recharts";
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
  }) => void;
}

interface RppgPoint {
  t: number;
  v: number;
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

  // ── rPPG State ──────────────────────────────────
  const rppgCanvasRef = useRef<HTMLCanvasElement>(null);
  const rppgBufferRef = useRef<{ time: number; value: number }[]>([]);
  const [rppgData, setRppgData] = useState<RppgPoint[]>([]);
  const [bpm, setBpm] = useState<number | null>(null);

  const emitReadings = useCallback((payload: {
    dominantEmotion: string | null;
    emotionConfidence: number;
    stressLevel: number;
    hasFace: boolean;
  }) => {
    onReadingsChange?.(payload);
  }, [onReadingsChange]);

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

  const calculateStress = (expressions: faceapi.FaceExpressions, currentBpm: number | null) => {
    const negEmotions = ["sad", "angry", "fearful", "disgusted"];
    let stressScore = 0;
    negEmotions.forEach((e) => {
      stressScore += (expressions as unknown as Record<string, number>)[e] || 0;
    });
    
    let calculatedStress = stressScore * 100 * 1.5;

    // Apply BPM-based stress multiplier when heart rate is elevated
    if (currentBpm !== null && currentBpm > 85) {
      calculatedStress *= 1.3;
    }
    
    return Math.min(100, Math.round(calculatedStress));
  };

  // ── rPPG Processing ─────────────────────────────
  const processRPPG = useCallback((videoEl: HTMLVideoElement, box: faceapi.Box) => {
    const canvas = rppgCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Use the detected face bounding box (clamped to video dimensions)
    const sx = Math.max(0, Math.round(box.x));
    const sy = Math.max(0, Math.round(box.y));
    const sw = Math.min(Math.round(box.width), videoEl.videoWidth - sx);
    const sh = Math.min(Math.round(box.height), videoEl.videoHeight - sy);

    if (sw <= 0 || sh <= 0) return;

    canvas.width = sw;
    canvas.height = sh;
    ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, sw, sh);

    let imageData: ImageData;
    try {
      imageData = ctx.getImageData(0, 0, sw, sh);
    } catch {
      return;
    }

    // Average green channel intensity
    const data = imageData.data;
    let greenSum = 0;
    const pixelCount = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      greenSum += data[i + 1]; // Green channel
    }
    const avgGreen = greenSum / pixelCount;

    const now = performance.now();
    const buffer = rppgBufferRef.current;
    buffer.push({ time: now, value: avgGreen });

    // Keep last 150 samples for BPM calculation
    if (buffer.length > 150) {
      buffer.splice(0, buffer.length - 150);
    }

    // Update chart data (last 60 points)
    const displaySlice = buffer.slice(-60);
    setRppgData(displaySlice.map((p, i) => ({ t: i, v: p.value })));

    // ── BPM Estimation via Peak Detection ────────
    if (buffer.length >= 30) {
      // Use last ~5 seconds of data
      const recentBuffer = buffer.slice(-120);
      const values = recentBuffer.map((p) => p.value);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;

      // Count zero-crossings above the mean (rising edges = peaks)
      let peaks = 0;
      for (let i = 1; i < values.length; i++) {
        if (values[i - 1] < mean && values[i] >= mean) {
          peaks++;
        }
      }

      // Time span in seconds
      const timeSpanMs = recentBuffer[recentBuffer.length - 1].time - recentBuffer[0].time;
      const timeSpanS = timeSpanMs / 1000;

      if (timeSpanS > 1) {
        const estimatedBpm = Math.round((peaks / timeSpanS) * 60);
        // Clamp to physiologically reasonable range
        if (estimatedBpm >= 40 && estimatedBpm <= 180) {
          setBpm(estimatedBpm);
        }
      }
    }
  }, []);

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
    setBpm(null);
    setRppgData([]);
    rppgBufferRef.current = [];
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

        // ── rPPG: runs every frame for smooth graph ──
        processRPPG(videoEl, results.detection.box);

        // Throttled update: refresh UI emotion and stress state every 500ms
        if (now - lastStateUpdate > 500) {
          const expressions = results.expressions;
          const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
          if (sorted.length > 0) {
            setDominantEmotion({ emotion: sorted[0][0], score: sorted[0][1] });
            const nextStress = calculateStress(expressions, bpm);
            setStressLevel(nextStress);
            emitReadings({
              dominantEmotion: sorted[0][0],
              emotionConfidence: sorted[0][1],
              stressLevel: nextStress,
              hasFace: true,
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
          setBpm(null);
          setRppgData([]);
          rppgBufferRef.current = [];
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

  // ── Determine rPPG signal range for chart ──────
  const rppgMin = rppgData.length > 0 ? Math.min(...rppgData.map((d) => d.v)) : 0;
  const rppgMax = rppgData.length > 0 ? Math.max(...rppgData.map((d) => d.v)) : 1;
  const rppgPad = (rppgMax - rppgMin) * 0.15 || 1;

  return (
    <>
      <video ref={processingVideoRef} autoPlay muted playsInline className="hidden" />
      <canvas ref={rppgCanvasRef} className="hidden" />

      <ModuleDialogBase
        open={open}
        onOpenChange={onOpenChange}
        icon={Eye}
        title="Visual Signals"
        description="Real-time facial analysis for emotion, stress & heart rate detection"
        headerGradient="bg-gradient-to-r from-purple-600 to-violet-700"
        isEnabled={isEnabled}
        onToggle={onToggle}
        privacyNote="Camera data is processed locally in real-time. No video is stored or transmitted. Captured frames are anonymised before analysis and deleted immediately after processing."
        footerActions={[
          { label: "Review Screenshots", icon: ImageIcon },
          { label: "Export Data", icon: Download },
          { label: "Pause Tracking", icon: PauseCircle },
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
      <div className="grid gap-4 sm:grid-cols-3">
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

        {/* ── Heart Rate (rPPG) ──────────────────────── */}
        <Card className="border-l-4 border-l-rose-300 bg-white p-5 shadow-none">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Heart Rate</h3>
            <div className="flex items-center gap-1.5">
              {bpm !== null && (
                <Badge className="border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-50 text-[10px] px-1.5 py-0">
                  rPPG
                </Badge>
              )}
              <span className={`inline-block h-2 w-2 rounded-full ${bpm !== null ? 'bg-rose-500 animate-pulse' : 'bg-gray-300 animate-pulse'}`} />
            </div>
          </div>

          {rppgData.length > 5 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-100 bg-gray-50 overflow-hidden">
              {/* BPM Display */}
              <div className="flex items-center justify-center gap-2 pt-2 pb-0.5">
                <Heart className="h-4 w-4 text-rose-500" style={{ animation: bpm ? `pulse ${60 / bpm}s ease-in-out infinite` : undefined }} />
                <span className="text-2xl font-bold text-rose-600">{bpm ?? "—"}</span>
                <span className="text-[11px] text-gray-400 self-end mb-0.5">BPM</span>
              </div>
              {/* Live graph */}
              <div className="h-16 w-full px-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rppgData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <defs>
                      <linearGradient id="rppgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <YAxis domain={[rppgMin - rppgPad, rppgMax + rppgPad]} hide />
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="#f43f5e"
                      strokeWidth={1.5}
                      fill="url(#rppgGrad)"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="flex h-20 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-100 bg-gray-50">
              <Heart className="h-6 w-6 text-gray-300 opacity-60" />
              <p className="text-[11px] text-gray-400">Calibrating pulse…</p>
            </div>
          )}
          <p className="mt-2.5 text-center text-[10px] text-gray-400">
            Remote Photoplethysmography · Green Channel
          </p>
        </Card>
      </div>

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
                  text: `Stress level is currently estimated at ${stressLevel}% based on facial emotion markers${bpm !== null && bpm > 85 ? ' and elevated heart rate' : ''}.`,
                },
                ...(bpm !== null
                  ? [
                      {
                        text: `Heart rate estimated at ${bpm} BPM via rPPG green-channel analysis.`,
                      },
                    ]
                  : []),
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

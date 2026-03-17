export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: Exclude<Role, 'system'>;
  content: string;
  createdAt: number;
}

export interface ModuleSnapshot {
  id: string;
  title: string;
  score: number;
  subtitle: string;
  enabled: boolean;
  trend: 'up' | 'down' | 'stable';
}

export interface VisualContext {
  dominantEmotion: string | null;
  emotionConfidence: number;
  stressLevel: number;
  hasFace: boolean;
  avgScore1Min?: number;
}

export interface SleepContext {
  predictedScore: number;
  confidence: number;
  reading: {
    heartRateBpm: number;
    timeAsleepHours: number;
    movementsPerHour: number;
  };
}

export interface EnvironmentalContext {
  score: number;
  trend: 'up' | 'down' | 'stable';
  subtitle: string;
}

export interface HealthContextInput {
  modules: ModuleSnapshot[];
  visual: VisualContext | null;
  sleep: SleepContext | null;
  environmental: EnvironmentalContext | null;
}

export interface HealthContextPayload {
  timestamp: string;
  overallScore: number;
  modules: ModuleSnapshot[];
  visual: VisualContext | null;
  sleep: SleepContext | null;
  environmental: EnvironmentalContext | null;
}

export interface GuardrailDecision {
  allowed: boolean;
  userMessage: string;
}

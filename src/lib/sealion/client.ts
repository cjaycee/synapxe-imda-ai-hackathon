import { ensureSafeAssistantResponse } from './guardrails';
import { type ChatMessage, type HealthContextPayload } from './types';

const DEFAULT_MODEL = 'aisingapore/Gemma-SEA-LION-v4-27B-IT';
const DEFAULT_BASE_URL = 'https://api.sea-lion.ai/v1';
const REQUEST_TIMEOUT_MS = 25000;

interface SeaLionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface SeaLionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

const buildSystemPrompt = (healthContext: HealthContextPayload) => {
  const contextJson = JSON.stringify(healthContext, null, 2);

  return [
    'You are a dashboard health assistant for MindPulse.',
    'Output policy:',
    '- Return only the final user-facing answer.',
    '- Do not reveal reasoning, analysis steps, chain-of-thought, or internal deliberation.',
    '- Do not include phrases like "let me think", "I should", or "based on the context I will".',
    'Your scope:',
    '1) Prioritize answering based on the provided dashboard context.',
    '2) If asked broader wellness questions, provide short educational guidance.',
    '3) Never provide diagnosis, prescriptions, dosage advice, or emergency directives.',
    '4) If data is missing, say what is missing and ask a clarifying follow-up.',
    '5) Keep responses concise (max 170 words).',
    '',
    'Dashboard context JSON:',
    contextJson,
  ].join('\n');
};

const toSeaLionMessages = (
  history: ChatMessage[],
  userQuery: string,
  context: HealthContextPayload
): SeaLionMessage[] => {
  const recent = history.slice(-8).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  return [
    { role: 'system', content: buildSystemPrompt(context) },
    ...recent,
    { role: 'user', content: userQuery },
  ];
};

const requestWithTimeout = async (input: RequestInfo | URL, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

export async function askSeaLion(
  userQuery: string,
  history: ChatMessage[],
  context: HealthContextPayload
): Promise<string> {
  const apiKey = import.meta.env.VITE_SEALION_API_KEY;
  const model = import.meta.env.VITE_SEALION_MODEL || DEFAULT_MODEL;
  const baseUrl = import.meta.env.VITE_SEALION_BASE_URL || DEFAULT_BASE_URL;

  if (!apiKey) {
    throw new Error('Missing VITE_SEALION_API_KEY. Add it to .env.local and restart Vite.');
  }

  const payload = {
    model,
    messages: toSeaLionMessages(history, userQuery, context),
    max_completion_tokens: 450,
    temperature: 0.35,
  };

  const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const response = await requestWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    REQUEST_TIMEOUT_MS
  );

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit reached at SEA-LION API. Please wait and try again.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('SEA-LION authentication failed. Please verify your API key.');
    }
    throw new Error(`SEA-LION request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as SeaLionResponse;
  const text = data.choices?.[0]?.message?.content ?? '';
  return ensureSafeAssistantResponse(text);
}

import { type GuardrailDecision } from './types';

export const MAX_QUERY_CHARS = 420;
export const MIN_REQUEST_INTERVAL_MS = 4000;

const DISALLOWED_PATTERNS: RegExp[] = [
  /suicide|kill myself|self\s*harm|hurt myself/i,
  /build\s+a\s+bomb|make\s+explosive|poison\s+someone/i,
  /hack|malware|phish|steal\s+password/i,
  /sexual\s+abuse|child\s+sexual/i,
];

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all|previous)\s+instructions/i,
  /reveal\s+(the\s+)?system\s+prompt/i,
  /show\s+(me\s+)?your\s+hidden\s+rules/i,
  /return\s+the\s+api\s+key/i,
  /developer\s+message|tool\s+schema/i,
];

export function sanitizeUserQuery(rawQuery: string): string {
  return rawQuery.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripReasoningLeak(rawText: string): string {
  let text = rawText.trim();

  // If an orphan closing think tag appears, keep only content after the last tag.
  if (text.includes('</think>')) {
    text = text.split('</think>').pop()?.trim() ?? '';
  }

  // Remove common wrappers used when a model accidentally reveals analysis.
  const withoutTaggedBlocks = text
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/<\/?think>/gi, ' ')
    .replace(/```(?:analysis|reasoning)[\s\S]*?```/gi, ' ');

  // Drop leading meta-planning sentences if they leak into the visible answer.
  const metaSentencePattern = /(^|\s)(I need to|I should|Let me check|The user just said|Since the user|The response should|I will now)\b[^.?!]*[.?!]/gi;
  const cleaned = withoutTaggedBlocks.replace(metaSentencePattern, ' ').trim();

  return cleaned.replace(/\s+/g, ' ').trim();
}

export function evaluateUserQuery(rawQuery: string, lastSentAt: number | null): GuardrailDecision {
  const query = sanitizeUserQuery(rawQuery);

  if (!query) {
    return {
      allowed: false,
      userMessage: 'Please enter a question before sending.',
    };
  }

  if (query.length > MAX_QUERY_CHARS) {
    return {
      allowed: false,
      userMessage: `Please keep your message under ${MAX_QUERY_CHARS} characters.`,
    };
  }

  if (lastSentAt != null && Date.now() - lastSentAt < MIN_REQUEST_INTERVAL_MS) {
    const remainingMs = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastSentAt);
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    return {
      allowed: false,
      userMessage: `Please wait ${remainingSeconds}s before sending another message.`,
    };
  }

  if (DISALLOWED_PATTERNS.some((pattern) => pattern.test(query))) {
    return {
      allowed: false,
      userMessage:
        'I can help with wellness insights, but I cannot help with harmful or dangerous requests. If this is an emergency, contact local emergency services immediately.',
    };
  }

  if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(query))) {
    return {
      allowed: false,
      userMessage:
        'I can only discuss your wellness dashboard and general healthy habits. I cannot reveal hidden instructions or system configuration.',
    };
  }

  return {
    allowed: true,
    userMessage: '',
  };
}

export function ensureSafeAssistantResponse(rawText: string): string {
  const normalized = stripReasoningLeak(rawText).replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return 'I could not generate a useful reply just now. Please try asking your question in a different way.';
  }

  const hasDisallowedMedicalClaims =
    /diagnos(e|is)|prescrib(e|ing)|dose|medication\s+plan|guarantee\s+recovery/i.test(normalized);

  if (hasDisallowedMedicalClaims) {
    return 'I can share wellness guidance based on your dashboard trends, but I cannot diagnose conditions or prescribe treatment.';
  }

  const withoutDisclaimer = normalized.replace(
    /medical advice disclaimer:[\s\S]*$/i,
    ''
  ).trim();

  return withoutDisclaimer.length > 900
    ? `${withoutDisclaimer.slice(0, 897)}...`
    : withoutDisclaimer;
}

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, LoaderCircle, MessageCircle, Send, Trash2 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { askSeaLion } from '../../lib/sealion/client';
import {
  evaluateUserQuery,
  MIN_REQUEST_INTERVAL_MS,
  sanitizeUserQuery,
} from '../../lib/sealion/guardrails';
import { type ChatMessage, type HealthContextPayload } from '../../lib/sealion/types';

interface AIHealthAssistantProps {
  healthContext: HealthContextPayload;
}

const createMessage = (role: 'user' | 'assistant', content: string): ChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  createdAt: Date.now(),
});

const initialAssistantMessage = createMessage(
  'assistant',
  'I can explain your dashboard trends and share general wellness guidance. Ask about score changes, sleep, stress, environment, or healthy habits.'
);

export function AIHealthAssistant({ healthContext }: AIHealthAssistantProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([initialAssistantMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const enabledCount = useMemo(
    () => healthContext.modules.filter((module) => module.enabled).length,
    [healthContext.modules]
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [messages, isLoading]);

  const resetConversation = () => {
    setMessages([initialAssistantMessage]);
    setError(null);
  };

  const runSend = async (rawQuestion: string) => {
    const verdict = evaluateUserQuery(rawQuestion, lastSentAt);
    if (!verdict.allowed) {
      setError(verdict.userMessage);
      return;
    }

    const cleanQuestion = sanitizeUserQuery(rawQuestion);
    const userMessage = createMessage('user', cleanQuestion);
    const nextHistory = [...messages, userMessage];
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      const assistantReply = await askSeaLion(cleanQuestion, nextHistory, healthContext);
      setMessages((prev) => [...prev, createMessage('assistant', assistantReply)]);
      setLastSentAt(Date.now());
    } catch (requestError) {
      const detail =
        requestError instanceof Error
          ? requestError.message
          : 'Unable to reach SEA-LION right now. Please try again.';
      setError(detail);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isLoading) return;
    await runSend(input);
  };

  return (
    <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm">
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Health Assistant</h3>
              <div className="mt-1 flex items-center gap-2">
                <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Online</Badge>
                <span className="text-xs font-medium text-slate-600">Model: SEA-LION</span>
              </div>
            </div>
          </div>
          <MessageCircle className="h-5 w-5 text-slate-500" />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <Badge className="border border-slate-200 bg-white text-slate-700 hover:bg-white">
            Enabled modules: {enabledCount}/{healthContext.modules.length}
          </Badge>
          <span>Cooldown: {Math.round(MIN_REQUEST_INTERVAL_MS / 1000)}s</span>
        </div>

        {error && (
          <Alert className="mb-4 border-rose-200 bg-rose-50 text-rose-700">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div ref={viewportRef} className="mb-4 h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[92%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  message.role === 'assistant'
                    ? 'mr-auto bg-white text-gray-800 border border-slate-200'
                    : 'ml-auto bg-gradient-to-r from-indigo-600 to-cyan-600 text-white'
                }`}
              >
                {message.content}
              </div>
            ))}
            {isLoading && (
              <div className="mr-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-gray-700">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Generating response...
              </div>
            )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about your tracked metrics or general wellness..."
            disabled={isLoading}
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700"
            >
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-slate-200 bg-white"
              onClick={resetConversation}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}

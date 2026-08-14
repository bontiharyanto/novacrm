'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, FileText, History, MessageSquare, Mic, Plus } from 'lucide-react';
import { AssistantMarkdown } from '@/components/assistant/assistant-markdown';
import { NovaMark } from '@/components/brand/nova-mark';
import { useI18n } from '@/components/layout/preferences-provider';
import { loadAssistantThread } from '@/lib/assistant/threads';
import type { AssistantMessage, AssistantThread, AssistantThreadSummary } from '@/lib/assistant/schema';
import { formatRelativeId } from '@/lib/utils/dates';
import { cn } from '@/lib/utils';

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speechCtor(): (new () => SpeechRec) | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { webkitSpeechRecognition?: new () => SpeechRec; SpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function AssistantChat({
  firstName,
  initialThread,
  initialThreads,
}: {
  firstName: string;
  initialThread: AssistantThread | null;
  initialThreads: AssistantThreadSummary[];
}) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<'chat' | 'history'>('chat');
  const [threadId, setThreadId] = useState<string | null>(initialThread?.id ?? null);
  const [messages, setMessages] = useState<AssistantMessage[]>(initialThread?.messages ?? []);
  const [threads, setThreads] = useState<AssistantThreadSummary[]>(initialThreads);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [activeChip, setActiveChip] = useState<string>('incidents');
  const [canVoice, setCanVoice] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanVoice(Boolean(speechCtor()));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const chips = [
    { id: 'incidents', label: t.assistant.categories.incidents, prompt: t.assistant.prompts.incidents },
    { id: 'sla', label: t.assistant.categories.sla, prompt: t.assistant.prompts.sla },
    { id: 'aging', label: t.assistant.categories.aging, prompt: t.assistant.prompts.aging },
    { id: 'cab', label: t.assistant.categories.cab, prompt: t.assistant.prompts.cab },
    { id: 'assets', label: t.assistant.categories.assets, prompt: t.assistant.prompts.assets },
  ];

  function startNew() {
    setThreadId(null);
    setMessages([]);
    setError('');
    setTab('chat');
  }

  async function openThread(id: string) {
    if (id === threadId) {
      setTab('chat');
      return;
    }
    const result = await loadAssistantThread(id);
    if (result.error || !result.data) {
      setError(result.error ?? 'Thread not found');
      return;
    }
    setThreadId(result.data.id);
    setMessages(result.data.messages);
    setTab('chat');
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setTab('chat');
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setInput('');
    setBusy(true);
    setError('');
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next, threadId }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error) {
      setError(payload.error ?? 'Assistant failed.');
      setBusy(false);
      return;
    }
    const reply = payload.data.content as string;
    const savedId = (payload.data.threadId as string | null) ?? threadId;
    const withReply = [...next, { role: 'assistant' as const, content: reply }];
    setMessages(withReply);
    if (savedId) {
      const title = next.find((item) => item.role === 'user')?.content.slice(0, 80) ?? t.nav.assistant;
      setThreadId(savedId);
      setThreads((current) =>
        [
          { id: savedId, title, updatedAt: new Date().toISOString(), messageCount: withReply.length },
          ...current.filter((item) => item.id !== savedId),
        ].slice(0, 30),
      );
    }
    setBusy(false);
  }

  function toggleVoice() {
    const Ctor = speechCtor();
    if (!Ctor) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = locale === 'id' ? 'id-ID' : 'en-US';
    rec.interimResults = false;
    rec.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) setInput((current) => (current ? `${current} ${transcript}` : transcript));
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  const greeting = t.assistant.hello.replace('{{name}}', firstName || 'there');
  const showHome = tab === 'chat' && messages.length === 0 && !busy;

  return (
    <div className="flex h-[calc(100dvh-3.55rem)] flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 md:px-8">
        <div className="inline-flex rounded-full border border-zinc-800 bg-zinc-900 p-0.5">
          <button
            type="button"
            onClick={() => setTab('chat')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition-colors',
              tab === 'chat' ? 'bg-zinc-800 text-zinc-50 shadow-sm' : 'text-zinc-500 hover:text-zinc-200',
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {t.assistant.chat}
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition-colors',
              tab === 'history' ? 'bg-zinc-800 text-zinc-50 shadow-sm' : 'text-zinc-500 hover:text-zinc-200',
            )}
          >
            <History className="h-3.5 w-3.5" />
            {t.assistant.history}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/reports"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
            aria-label={t.nav.reports}
          >
            <FileText className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.assistant.newChat}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'history' ? (
          <div className="nova-scroll mx-auto w-full max-w-xl flex-1 space-y-2 overflow-y-auto px-4 pb-8">
            {threads.length === 0 ? (
              <p className="pt-16 text-center text-sm text-zinc-500">{t.assistant.emptyHistory}</p>
            ) : null}
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => void openThread(thread.id)}
                className={cn(
                  'w-full rounded-xl border px-4 py-3 text-left hover:border-zinc-700',
                  thread.id === threadId
                    ? 'border-blue-500/30 bg-blue-500/10'
                    : 'border-zinc-800 bg-zinc-900',
                )}
              >
                <p className="truncate text-sm text-zinc-50">{thread.title}</p>
                <p className="mt-1 text-[12px] text-zinc-500">
                  {t.assistant.messageCount.replace('{{n}}', String(thread.messageCount))}
                  {' · '}
                  {formatRelativeId(thread.updatedAt, locale)}
                </p>
              </button>
            ))}
          </div>
        ) : showHome ? (
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 pb-4">
            <NovaMark size={64} />
            <h1 className="mt-7 text-[1.75rem] font-semibold tracking-tight text-zinc-50">{greeting}</h1>
            <p className="mt-1.5 text-sm text-zinc-500">{t.assistant.help}</p>
            <button
              type="button"
              onClick={() => void send(t.assistant.prompts.triage)}
              className="mt-10 inline-flex items-center gap-2 text-sm text-blue-400 transition-colors hover:text-blue-300"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              {t.assistant.quickAction}
            </button>
            <div className="mt-7 flex w-full justify-center gap-2 overflow-x-auto pb-1">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setActiveChip(chip.id);
                    void send(chip.prompt);
                  }}
                  className={cn(
                    'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors',
                    activeChip === chip.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="nova-scroll mx-auto w-full max-w-2xl flex-1 space-y-3 overflow-y-auto px-4 pb-6">
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6',
                  item.role === 'user'
                    ? 'ml-auto bg-blue-600 text-white'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-200',
                )}
              >
                {item.role === 'assistant' ? <AssistantMarkdown text={item.content} /> : item.content}
              </div>
            ))}
            {busy ? <p className="text-xs text-zinc-500">{t.assistant.thinking}</p> : null}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="px-4 pb-5 md:px-8">
        {error ? (
          <p className="mx-auto mb-2 max-w-2xl text-center text-sm text-rose-400">
            {error}{' '}
            {error.includes('not connected') ? (
              <Link href="/settings" className="text-blue-400 hover:underline">
                {t.nav.integrations}
              </Link>
            ) : null}
          </p>
        ) : null}
        <form
          className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <textarea
            value={input}
            rows={1}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder={t.assistant.placeholder}
            className="max-h-32 min-h-[48px] flex-1 resize-none bg-transparent py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
          />
          {canVoice ? (
            <button
              type="button"
              onClick={toggleVoice}
              aria-label={t.assistant.voice}
              className={cn(
                'mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 hover:text-zinc-50',
                listening && 'border-blue-500 bg-blue-500/15 text-blue-400',
              )}
            >
              <Mic className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="submit"
            disabled={busy || input.trim().length < 2}
            className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
            aria-label={t.assistant.send}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
        <p className="mx-auto mt-2.5 max-w-2xl text-center text-[11px] text-zinc-500">{t.assistant.disclaimer}</p>
      </div>
    </div>
  );
}

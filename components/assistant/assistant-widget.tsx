'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowUp, BookOpen, CalendarClock, ClipboardList, History, Maximize2, Menu, ShieldCheck, Sparkles, X } from 'lucide-react';
import { AssistantMarkdown } from '@/components/assistant/assistant-markdown';
import { NovaMark } from '@/components/brand/nova-mark';
import { useI18n } from '@/components/layout/preferences-provider';
import { listAssistantThreadSummaries, loadAssistantThread } from '@/lib/assistant/threads';
import type { AssistantMessage, AssistantThreadSummary } from '@/lib/assistant/schema';
import type { PortalTicketSuggestion } from '@/lib/assistant/portal-suggestions';
import { formatRelativeId } from '@/lib/utils/dates';
import { emitTicketsChanged } from '@/lib/tickets/events';
import { cn } from '@/lib/utils';

const DESK_FEATURES = [
  { key: 'desk' as const, icon: ClipboardList, promptKey: 'triage' as const },
  { key: 'sla' as const, icon: ShieldCheck, promptKey: 'sla' as const },
  { key: 'review' as const, icon: CalendarClock, promptKey: 'aging' as const },
];

const PORTAL_FEATURES = [
  { key: 'tickets' as const, icon: ClipboardList, promptKey: 'tickets' as const },
  { key: 'waiting' as const, icon: AlertCircle, promptKey: 'waiting' as const },
  { key: 'catalog' as const, icon: BookOpen, promptKey: 'catalog' as const },
];

export function AskAiButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-[color:color-mix(in_srgb,var(--accent)_45%,transparent)] text-[13px] text-zinc-200 transition-colors hover:bg-zinc-900 sm:w-auto sm:px-2.5"
      aria-label={t.nav.askAi}
    >
      <Sparkles className="h-3.5 w-3.5 nova-accent-icon" />
      <span className="hidden sm:inline">{t.nav.askAi}</span>
    </button>
  );
}

export function AssistantWidget({
  open,
  onOpenChange,
  hidden,
  variant = 'desk',
}: {
  firstName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hidden?: boolean;
  variant?: 'desk' | 'portal';
}) {
  const { t, locale } = useI18n();
  const [view, setView] = useState<'home' | 'chat' | 'history'>('home');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [threads, setThreads] = useState<AssistantThreadSummary[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<PortalTicketSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(variant === 'portal');
  const [proposal, setProposal] = useState<{ type: string; title: string; description: string } | null>(null);
  const [detailTemplate, setDetailTemplate] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy, view]);

  useEffect(() => {
    if (variant !== 'portal' || !open) return;
    void fetch(`/api/assistant/suggestions?locale=${locale}`)
      .then((response) => response.json())
      .then((payload) => {
        if (Array.isArray(payload.data)) setSuggestions(payload.data);
      })
      .catch(() => undefined);
  }, [variant, open, locale]);

  if (hidden) return null;

  async function loadHistory() {
    const result = await listAssistantThreadSummaries();
    if (!result.error) setThreads(result.data);
  }

  function resetHome() {
    setView('home');
    setThreadId(null);
    setMessages([]);
    setError('');
    setInput('');
    setShowSuggestions(variant === 'portal');
    setProposal(null);
    setDetailTemplate('');
    sessionStorage.removeItem('novacrm_assistant_thread_portal');
    sessionStorage.removeItem('novacrm_assistant_thread_desk');
  }

  function closeWidget() {
    resetHome();
    onOpenChange(false);
  }

  async function openHistory() {
    setView('history');
    await loadHistory();
  }

  async function openThread(id: string) {
    const result = await loadAssistantThread(id);
    if (result.error || !result.data) {
      setError(result.error ?? 'Thread not found');
      return;
    }
    setThreadId(result.data.id);
    setMessages(result.data.messages);
    setView('chat');
    setShowSuggestions(false);
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setView('chat');
    setInput('');
    setBusy(true);
    setError('');
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next, threadId: variant === 'portal' ? null : threadId, locale }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error) {
      setError(payload.error ?? 'Assistant failed.');
      setBusy(false);
      return;
    }
    const reply = payload.data.content as string;
    const savedId = (payload.data.threadId as string | null) ?? threadId;
    setShowSuggestions(variant === 'portal' && Boolean(payload.data.intake) && !payload.data.proposal);
    setProposal(payload.data.proposal ?? null);
    const template = typeof payload.data.detailTemplate === 'string' ? payload.data.detailTemplate : '';
    setDetailTemplate(template);
    if (template) setInput(template);
    if (payload.data.ticketId) {
      emitTicketsChanged();
      setProposal(null);
    }
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

  return (
    <>
      {open ? null : (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="nova-accent-btn fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-[60] flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg md:bottom-6 md:right-6"
          aria-label={t.nav.askAi}
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}
      {open ? (
        <div
          className={cn(
            'z-[60] flex flex-col overflow-hidden border-zinc-800 bg-zinc-950',
            variant === 'portal'
              ? 'fixed inset-y-0 right-0 h-dvh w-full border-l sm:w-[400px]'
              : 'fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] h-[min(85dvh,640px)] w-auto rounded-2xl border shadow-2xl sm:inset-x-auto sm:right-4 sm:h-[min(640px,calc(100dvh-5.5rem))] sm:w-[min(400px,calc(100vw-2rem))] md:bottom-6 md:right-6',
          )}
        >
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-800 px-3">
            {variant === 'desk' ? (
            <button
              type="button"
              onClick={() => void (view === 'history' ? setView(messages.length ? 'chat' : 'home') : openHistory())}
              className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
              aria-label={t.assistant.history}
            >
              {view === 'history' ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            ) : (
              <span className="w-8" />
            )}
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
              <NovaMark size={22} />
              <p className="truncate text-[13px] font-medium text-zinc-100">Nova Agent</p>
            </div>
            {variant === 'desk' ? (
              <a
                href="/assistant"
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
                aria-label={t.assistant.expand}
                onClick={() => onOpenChange(false)}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={closeWidget}
              className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
              aria-label={t.assistant.close}
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            {view === 'history' ? (
              <div className="nova-scroll flex-1 space-y-2 overflow-y-auto p-3">
                <button
                  type="button"
                  onClick={resetHome}
                  className="w-full rounded-lg border border-zinc-800 px-3 py-2 text-left text-[13px] text-zinc-300 hover:border-zinc-700"
                >
                  {t.assistant.newChat}
                </button>
                {threads.length === 0 ? (
                  <p className="pt-8 text-center text-sm text-zinc-500">{t.assistant.emptyHistory}</p>
                ) : null}
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => void openThread(thread.id)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-left hover:border-zinc-700"
                  >
                    <p className="truncate text-[13px] text-zinc-50">{thread.title}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {t.assistant.messageCount.replace('{{n}}', String(thread.messageCount))}
                      {' · '}
                      {formatRelativeId(thread.updatedAt, locale)}
                    </p>
                  </button>
                ))}
              </div>
            ) : view === 'home' ? (
              <div className="nova-scroll flex-1 overflow-y-auto px-5 py-6">
                <div className="flex flex-col items-center text-center">
                  <NovaMark size={56} />
                  <h2 className="mt-5 text-xl font-semibold tracking-tight text-zinc-50">{t.assistant.meet}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {variant === 'portal' ? t.assistant.meetBodyPortal : t.assistant.meetBody}
                  </p>
                </div>
                <p className="mt-7 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600">
                  {t.assistant.featuresTitle}
                </p>
                <ul className="mt-3 space-y-2.5">
                  {(variant === 'portal' ? PORTAL_FEATURES : DESK_FEATURES).map((feature) => {
                    const Icon = feature.icon;
                    const copy =
                      variant === 'portal' && feature.key in t.assistant.featuresPortal
                        ? t.assistant.featuresPortal[feature.key as keyof typeof t.assistant.featuresPortal]
                        : t.assistant.features[feature.key as keyof typeof t.assistant.features];
                    const prompt =
                      variant === 'portal' && feature.promptKey in t.assistant.promptsPortal
                        ? t.assistant.promptsPortal[feature.promptKey as keyof typeof t.assistant.promptsPortal]
                        : t.assistant.prompts[feature.promptKey as keyof typeof t.assistant.prompts];
                    return (
                      <li key={feature.key}>
                        <button
                          type="button"
                          onClick={() => {
                            if (variant === 'portal' && feature.key === 'catalog') {
                              setView('chat');
                              setShowSuggestions(true);
                              return;
                            }
                            void send(prompt);
                          }}
                          className="flex w-full items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-left hover:border-zinc-700"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)]">
                            <Icon className="h-4 w-4 nova-accent-icon" />
                          </span>
                          <span>
                            <span className="block text-[13px] font-medium text-zinc-100">{copy.title}</span>
                            <span className="mt-0.5 block text-[12px] leading-5 text-zinc-500">{copy.body}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="nova-scroll flex min-h-0 flex-1 flex-col space-y-2.5 overflow-y-auto px-3 py-3">
                {messages.length === 0 && variant === 'portal' && suggestions.length > 0 ? (
                  <div className="flex h-full flex-col justify-end pb-1">
                    <p className="text-[13px] font-medium text-zinc-200">{t.assistant.suggestTitle}</p>
                    <p className="mt-0.5 text-[12px] text-zinc-500">{t.assistant.suggestHint}</p>
                    <SuggestionChips
                      items={suggestions}
                      disabled={busy}
                      onPick={(prompt) => void send(prompt)}
                    />
                    <p className="mt-3 text-[12px] leading-5 text-zinc-500">{t.assistant.suggestOther}</p>
                  </div>
                ) : null}
                {messages.map((item, index) => (
                  <div
                    key={`${item.role}-${index}`}
                    className={cn(
                      'max-w-[90%] rounded-2xl px-3 py-2 text-[13px] leading-5',
                      item.role === 'user'
                        ? 'ml-auto nova-accent-btn text-white'
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

          <div className="shrink-0 border-t border-zinc-800 p-3">
            {error ? <p className="mb-2 text-center text-[12px] text-rose-400">{error}</p> : null}
            {view === 'home' ? (
              <button
                type="button"
                onClick={() => {
                  setView('chat');
                  setShowSuggestions(variant === 'portal');
                }}
                className="nova-accent-btn flex h-10 w-full items-center justify-center rounded-lg text-[13px] font-medium text-white"
              >
                {t.assistant.startChat}
              </button>
            ) : view === 'chat' ? (
              <div className="space-y-2">
                {variant === 'portal' && detailTemplate && !proposal && !busy ? (
                  <button
                    type="button"
                    onClick={() => setInput(detailTemplate)}
                    className="flex h-9 w-full items-center justify-center rounded-lg border border-zinc-800 text-[13px] text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-50"
                  >
                    {t.assistant.fillTemplate}
                  </button>
                ) : null}
                {variant === 'portal' && proposal && !busy ? (
                  <button
                    type="button"
                    onClick={() => void send(t.assistant.confirmTicket)}
                    className="nova-accent-btn flex h-10 w-full items-center justify-center rounded-lg text-[13px] font-medium text-white"
                  >
                    {t.assistant.confirmTicket}
                  </button>
                ) : null}
                {variant === 'portal' && showSuggestions && messages.length > 0 && suggestions.length > 0 ? (
                  <SuggestionChips
                    items={suggestions}
                    disabled={busy}
                    onPick={(prompt) => void send(prompt)}
                  />
                ) : null}
              <form
                className="flex items-end gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send();
                }}
              >
                <textarea
                  value={input}
                  rows={Math.min(6, Math.max(1, input.split('\n').length))}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                  placeholder={variant === 'portal' ? t.assistant.placeholderPortal : t.assistant.placeholder}
                  className="max-h-24 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-500"
                />
                <button
                  type="submit"
                  disabled={busy || input.trim().length < 2}
                  className="nova-accent-btn mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
                  aria-label={t.assistant.send}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
              </form>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void openHistory()}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-800 text-[13px] text-zinc-400"
              >
                <History className="h-3.5 w-3.5" />
                {t.assistant.history}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function SuggestionChips({
  items,
  disabled,
  onPick,
}: {
  items: PortalTicketSuggestion[];
  disabled?: boolean;
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((item) =>
        item.href ? (
          <Link
            key={item.id}
            href={item.href}
            className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[12px] text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-50"
          >
            {item.label}
          </Link>
        ) : (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(item.prompt)}
            className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[12px] text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-50 disabled:opacity-40"
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}

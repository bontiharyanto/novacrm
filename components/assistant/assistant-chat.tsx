'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setInput('');
    setBusy(true);
    setError('');
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error) {
      setError(payload.error ?? 'Assistant failed.');
      setBusy(false);
      return;
    }
    setMessages([...next, { role: 'assistant', content: payload.data.content }]);
    setBusy(false);
  }

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col p-6">
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Operations</p>
          <h1 className="text-2xl font-semibold text-white">Assistant</h1>
          <p className="mt-1 text-sm text-zinc-500">ITSM Q&A over the last 7 days of the active account.</p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-zinc-500">Ask about open work, SLA, or aging tickets.</p>
          ) : (
            messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`max-w-[80%] rounded-lg border px-3 py-2 text-sm ${
                  item.role === 'user'
                    ? 'ml-auto border-blue-500/30 bg-blue-500/10 text-zinc-100'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-200'
                }`}
              >
                {item.content}
              </div>
            ))
          )}
          {busy ? <p className="text-xs text-zinc-500">Thinking…</p> : null}
        </div>

        {error ? (
          <p className="mt-3 text-sm text-rose-400">
            {error}{' '}
            {error.includes('not connected') ? (
              <Link href="/settings" className="text-blue-300 hover:underline">
                Open Integrations
              </Link>
            ) : null}
          </p>
        ) : null}

        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="What is breaching SLA?"
            className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          <Button type="submit" disabled={busy || input.trim().length < 2}>
            Send
          </Button>
        </form>
      </div>

      <aside className="space-y-4 border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Try</p>
            {['What needs triage now?', 'Which tickets are aging?', 'Summarize SLA risk this week.'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => void send(item)}
                className="block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-left text-sm text-zinc-300 hover:border-zinc-700"
              >
                {item}
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-4 text-sm leading-6 text-zinc-400">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Scope</p>
            <p>Uses the AI key from Integrations. Numbers come from Reports, not from the model inventing counts.</p>
            <p>It will not change tickets. Recommend next steps only.</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

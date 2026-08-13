'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { HubIntegrations, IntegrationKind } from '@/lib/integrations/types';
import { AI_PROVIDERS, DEFAULT_EMAIL_FROM, GROQ_MODELS, matchAiProvider } from '@/lib/integrations/types';
import { formatRelativeId } from '@/lib/utils/dates';
import { Select } from '@/components/ui/select';
import { useI18n } from '@/components/layout/preferences-provider';

const KINDS: Array<{ id: IntegrationKind; label: string; hint: string }> = [
  { id: 'ai', label: 'AI', hint: 'Groq free / Gemini / Ollama' },
  { id: 'telegram', label: 'Telegram', hint: 'Bot API' },
  { id: 'whatsapp', label: 'WhatsApp', hint: 'Fonnte / Wabot' },
  { id: 'email', label: 'Email', hint: 'Resend or Mailpit' },
  { id: 'webhook', label: 'Other', hint: 'Alert / email / generic inbound' },
];

function statusOf(item?: { configured?: boolean; lastOk?: boolean | null }) {
  if (item?.lastOk === true) return { tone: 'success' as const, label: 'connected' };
  if (item?.lastOk === false) return { tone: 'danger' as const, label: 'failed' };
  if (item?.configured) return { tone: 'info' as const, label: 'saved' };
  return { tone: 'neutral' as const, label: 'not set' };
}

export function IntegrationsSettings() {
  const { t, locale } = useI18n();
  const [hub, setHub] = useState<HubIntegrations | null>(null);
  const [kind, setKind] = useState<IntegrationKind>('ai');
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  useEffect(() => {
    void fetch('/api/settings/integrations')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.data) setHub(payload.data);
      });
  }, []);

  useEffect(() => {
    if (!hub) return;
    if (kind === 'ai') {
      setValues({ baseUrl: hub.ai.baseUrl, apiKey: hub.ai.apiKey, model: hub.ai.model });
    } else if (kind === 'whatsapp') {
      setValues({ apiKey: hub.whatsapp.apiKey });
    } else if (kind === 'telegram') {
      setValues({ botToken: hub.telegram.botToken, chatId: hub.telegram.chatId });
    } else if (kind === 'email') {
      setValues({ apiKey: hub.email.apiKey, from: hub.email.from });
    } else {
      setValues({
        alertSecret: hub.webhook.alertSecret,
        emailSecret: hub.webhook.emailSecret,
        genericSecret: hub.webhook.genericSecret,
      });
    }
    setMessage('');
  }, [hub, kind]);

  async function save() {
    setBusy(true);
    const response = await fetch('/api/settings/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, values }),
    });
    const payload = await response.json();
    if (payload.data) setHub(payload.data);
    setMessage(payload.error ?? 'Saved.');
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    const response = await fetch('/api/settings/integrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, values }),
    });
    const payload = await response.json();
    setMessage(payload.data?.message ?? payload.error ?? 'Test failed.');
    const refresh = await fetch('/api/settings/integrations').then((item) => item.json());
    if (refresh.data) setHub(refresh.data);
    setBusy(false);
  }

  if (!hub) {
    return (
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-[480px] w-full" />
        <Skeleton className="h-[480px] w-full" />
      </div>
    );
  }

  const current = hub[kind === 'webhook' ? 'webhook' : kind];
  const badge = statusOf(current);
  const testedAt = 'lastTestedAt' in current ? current.lastTestedAt : null;

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5 p-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{t.integrations.kicker}</p>
          <h1 className="text-2xl font-semibold text-zinc-50">{t.integrations.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t.integrations.subtitle}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {KINDS.map((item) => {
            const row = hub[item.id === 'webhook' ? 'webhook' : item.id];
            const state = statusOf(row);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setKind(item.id)}
                className={`rounded-xl border px-3 py-3 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 ${
                  kind === item.id ? 'border-blue-500/40 bg-blue-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-50">{item.label}</p>
                  <Badge tone={state.tone}>{state.label}</Badge>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">{item.hint}</p>
              </button>
            );
          })}
        </div>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-zinc-50">{KINDS.find((item) => item.id === kind)?.label}</p>
              <Badge tone={badge.tone}>{badge.label}</Badge>
            </div>

            {kind === 'ai' ? (
              <>
                <div className="space-y-1.5">
                  <Label>Provider</Label>
                  <Select
                    value={matchAiProvider(values.baseUrl).id}
                    onChange={(event) => {
                      const provider = AI_PROVIDERS.find((item) => item.id === event.target.value) ?? AI_PROVIDERS[0];
                      setValues((current) => ({
                        ...current,
                        baseUrl: provider.baseUrl,
                        model: provider.model,
                        apiKey: provider.id === 'ollama' ? current.apiKey || 'ollama' : current.apiKey,
                      }));
                    }}
                  >
                    {AI_PROVIDERS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                  <p className="text-[11px] text-zinc-500">{matchAiProvider(values.baseUrl).hint}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>API key</Label>
                  <Input
                    type="password"
                    value={values.apiKey ?? ''}
                    onChange={(event) => setValues((current) => ({ ...current, apiKey: event.target.value }))}
                    placeholder={matchAiProvider(values.baseUrl).keyPlaceholder}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Model</Label>
                  {matchAiProvider(values.baseUrl).id === 'groq' ? (
                    <Select
                      value={GROQ_MODELS.some((item) => item === values.model) ? values.model : GROQ_MODELS[0]}
                      onChange={(event) => setValues((current) => ({ ...current, model: event.target.value }))}
                      className="font-mono"
                    >
                      {GROQ_MODELS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      value={values.model ?? ''}
                      onChange={(event) => setValues((current) => ({ ...current, model: event.target.value }))}
                      className="font-mono"
                    />
                  )}
                </div>
                <p className="font-mono text-[11px] text-zinc-500">{values.baseUrl}</p>
              </>
            ) : null}

            {kind === 'whatsapp' ? (
              <div className="space-y-1.5">
                <Label>API key</Label>
                <Input
                  type="password"
                  value={values.apiKey ?? ''}
                  onChange={(event) => setValues((current) => ({ ...current, apiKey: event.target.value }))}
                  placeholder="Fonnte token"
                />
              </div>
            ) : null}

            {kind === 'telegram' ? (
              <>
                <div className="space-y-1.5">
                  <Label>Bot token</Label>
                  <Input
                    type="password"
                    value={values.botToken ?? ''}
                    onChange={(event) => setValues((current) => ({ ...current, botToken: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Chat ID</Label>
                  <Input
                    value={values.chatId ?? ''}
                    onChange={(event) => setValues((current) => ({ ...current, chatId: event.target.value }))}
                    placeholder="-100..."
                    className="font-mono"
                  />
                </div>
              </>
            ) : null}

            {kind === 'email' ? (
              <>
                <div className="space-y-1.5">
                  <Label>API key (Resend)</Label>
                  <Input
                    type="password"
                    value={values.apiKey ?? ''}
                    onChange={(event) => setValues((current) => ({ ...current, apiKey: event.target.value }))}
                    placeholder="Optional on laptop — Mailpit is used"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>From</Label>
                  <Input
                    value={values.from ?? ''}
                    onChange={(event) => setValues((current) => ({ ...current, from: event.target.value }))}
                    placeholder={DEFAULT_EMAIL_FROM}
                  />
                </div>
              </>
            ) : null}

            {kind === 'webhook' ? (
              <>
                <div className="space-y-1.5">
                  <Label>Alert secret</Label>
                  <Input
                    type="password"
                    value={values.alertSecret ?? ''}
                    onChange={(event) => setValues((current) => ({ ...current, alertSecret: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email inbound secret</Label>
                  <Input
                    type="password"
                    value={values.emailSecret ?? ''}
                    onChange={(event) => setValues((current) => ({ ...current, emailSecret: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Generic secret</Label>
                  <Input
                    type="password"
                    value={values.genericSecret ?? ''}
                    onChange={(event) => setValues((current) => ({ ...current, genericSecret: event.target.value }))}
                  />
                </div>
              </>
            ) : null}

            {testedAt ? (
              <p className="text-[11px] text-zinc-500">
                Last test {formatRelativeId(testedAt, locale)}
                {current.lastError ? ` · ${current.lastError}` : ''}
              </p>
            ) : null}

            {message ? <p className="text-sm text-zinc-300">{message}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void save()}>
                {busy ? t.integrations.working : t.integrations.save}
              </Button>
              <Button size="sm" disabled={busy} onClick={() => void test()}>
                {t.integrations.test}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4 border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="space-y-3 p-4 text-sm leading-6 text-zinc-400">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">How to test</p>
            {kind === 'ai' ? (
              <p>
                Default is <span className="text-zinc-200">Groq (free)</span> — no credit card. Use a{' '}
                <span className="font-mono text-zinc-200">gsk_</span> key from{' '}
                <span className="font-mono text-zinc-200">console.groq.com</span>. Model must be Groq (for example{' '}
                <span className="font-mono text-zinc-200">llama-3.1-8b-instant</span>), not OpenAI{' '}
                <span className="font-mono text-zinc-200">gpt-4o-mini</span>.
              </p>
            ) : null}
            {kind === 'telegram' ? <p>Runs getMe on the bot token. If Chat ID is set, also sends a test message.</p> : null}
            {kind === 'whatsapp' ? <p>Sends a test to the admin phone on the profile, or a placeholder if empty.</p> : null}
            {kind === 'email' ? <p>Sends to your login email. On this laptop that lands in Mailpit.</p> : null}
            {kind === 'webhook' ? (
              <p>Stores secrets used by inbound routes. Env secrets still work as fallback.</p>
            ) : null}
          </CardContent>
        </Card>
        {kind === 'webhook' ? (
          <Card>
            <CardContent className="space-y-2 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Inbound URLs</p>
              {[
                ['Alerts', `${origin}/api/webhooks/alerts`],
                ['Email', `${origin}/api/webhooks/email`],
                ['Generic', `${origin}/api/webhooks/generic`],
                ['WhatsApp', `${origin}/api/webhooks/whatsapp`],
                ['Telegram', `${origin}/api/webhooks/telegram`],
              ].map(([label, url]) => (
                <div key={label}>
                  <p className="text-[11px] text-zinc-500">{label}</p>
                  <p className="break-all font-mono text-[11px] text-zinc-300">{url}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
        {kind === 'ai' ? (
          <Card>
            <CardContent className="space-y-2 p-4 text-sm text-zinc-400">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">After connect</p>
              <p>
                Open <span className="text-zinc-200">Assistant</span> in the sidebar. It reads the last 7 days of
                tickets for the active account.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </aside>
    </div>
  );
}

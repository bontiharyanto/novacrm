'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AI_PROVIDERS, DEFAULT_EMAIL_FROM, GROQ_MODELS, matchAiProvider } from '@/lib/integrations/types';
import type { IntegrationCatalog, PluginField } from '@/lib/integrations/plugin-schema';
import { formatRelativeId } from '@/lib/utils/dates';
import { useI18n } from '@/components/layout/preferences-provider';

const NEW_SLUG = '__new__';

function statusOf(item?: { configured?: boolean; lastOk?: boolean | null }) {
  if (item?.lastOk === true) return { tone: 'success' as const, label: 'connected' };
  if (item?.lastOk === false) return { tone: 'danger' as const, label: 'failed' };
  if (item?.configured) return { tone: 'info' as const, label: 'saved' };
  return { tone: 'neutral' as const, label: 'not set' };
}

export function IntegrationsSettings() {
  const { t, locale } = useI18n();
  const [catalog, setCatalog] = useState<IntegrationCatalog | null>(null);
  const [slug, setSlug] = useState('ai');
  const [values, setValues] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState({ label: '', hint: '', category: 'other' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const plugins = useMemo(() => catalog?.plugins ?? [], [catalog]);
  const current = useMemo(() => plugins.find((item) => item.slug === slug) ?? plugins[0] ?? null, [plugins, slug]);
  const adding = slug === NEW_SLUG;

  useEffect(() => {
    void fetch('/api/settings/integrations')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.data) {
          setCatalog(payload.data);
          const first = (payload.data as IntegrationCatalog).plugins[0]?.slug;
          if (first) setSlug(first);
        }
      });
  }, []);

  useEffect(() => {
    if (!current || adding) return;
    setValues(current.values);
    setMessage('');
  }, [current, adding]);

  async function save() {
    if (!current) return;
    setBusy(true);
    const response = await fetch('/api/settings/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: current.slug, values }),
    });
    const payload = await response.json();
    if (payload.data) setCatalog(payload.data);
    setMessage(payload.error ?? 'Saved.');
    setBusy(false);
  }

  async function test() {
    if (!current) return;
    setBusy(true);
    const response = await fetch('/api/settings/integrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: current.slug, values }),
    });
    const payload = await response.json();
    setMessage(payload.data?.message ?? payload.error ?? 'Test failed.');
    const refresh = await fetch('/api/settings/integrations').then((item) => item.json());
    if (refresh.data) setCatalog(refresh.data);
    setBusy(false);
  }

  async function addPlugin() {
    setBusy(true);
    const response = await fetch('/api/settings/integrations/plugins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    const payload = await response.json();
    if (payload.data) {
      setCatalog(payload.data);
      setSlug(typeof payload.slug === 'string' ? payload.slug : NEW_SLUG);
      setDraft({ label: '', hint: '', category: 'other' });
      setMessage(payload.error ?? t.integrations.pluginAdded);
    } else {
      setMessage(payload.error ?? t.integrations.failed);
    }
    setBusy(false);
  }

  async function removePlugin() {
    if (!current?.tenantId) return;
    setBusy(true);
    const response = await fetch(`/api/settings/integrations/plugins?id=${current.id}`, { method: 'DELETE' });
    const payload = await response.json();
    if (payload.data) {
      setCatalog(payload.data);
      setSlug((payload.data as IntegrationCatalog).plugins[0]?.slug ?? NEW_SLUG);
    }
    setMessage(payload.error ?? t.integrations.pluginRemoved);
    setBusy(false);
  }

  if (!catalog) {
    return (
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-[480px] w-full" />
        <Skeleton className="h-[480px] w-full" />
      </div>
    );
  }

  const badge = statusOf(current ?? undefined);
  const testedAt = current?.lastTestedAt ?? null;

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5 p-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{t.integrations.kicker}</p>
          <h1 className="text-2xl font-semibold text-zinc-50">{t.integrations.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t.integrations.subtitle}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {plugins.map((item) => {
            const state = statusOf(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSlug(item.slug)}
                className={`rounded-xl border px-3 py-3 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 ${
                  slug === item.slug ? 'border-blue-500/40 bg-blue-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
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
          <button
            type="button"
            onClick={() => {
              setSlug(NEW_SLUG);
              setMessage('');
            }}
            className={`rounded-xl border border-dashed px-3 py-3 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 ${
              adding ? 'border-blue-500/40 bg-blue-500/10' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-50">
              <Plus className="h-3.5 w-3.5 text-blue-400" />
              {t.integrations.addPlugin}
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">{t.integrations.addPluginHint}</p>
          </button>
        </div>

        <Card>
          <CardContent className="space-y-4 p-5">
            {adding ? (
              <>
                <p className="text-sm font-medium text-zinc-50">{t.integrations.addPlugin}</p>
                <div className="space-y-1.5">
                  <Label>{t.integrations.pluginLabel}</Label>
                  <Input
                    value={draft.label}
                    onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, label: event.target.value }))}
                    placeholder="ServiceNow"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.integrations.pluginHint}</Label>
                  <Input
                    value={draft.hint}
                    onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, hint: event.target.value }))}
                    placeholder="REST API"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.integrations.pluginCategory}</Label>
                  <Select
                    value={draft.category}
                    onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, category: event.target.value }))}
                  >
                    <option value="identity">{t.integrations.categories.identity}</option>
                    <option value="mail">{t.integrations.categories.mail}</option>
                    <option value="itsm">{t.integrations.categories.itsm}</option>
                    <option value="chat">{t.integrations.categories.chat}</option>
                    <option value="crm">{t.integrations.categories.crm}</option>
                    <option value="other">{t.integrations.categories.other}</option>
                  </Select>
                </div>
                {message ? <p className="text-sm text-zinc-300">{message}</p> : null}
                <Button size="sm" disabled={busy || draft.label.trim().length < 2} onClick={() => void addPlugin()}>
                  {busy ? t.integrations.working : t.integrations.addPlugin}
                </Button>
              </>
            ) : current ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-50">{current.label}</p>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </div>

                {current.uiVariant === 'ai' ? (
                  <AiFields values={values} setValues={setValues} />
                ) : (
                  <FieldList
                    fields={current.fields}
                    values={values}
                    setValues={setValues}
                    emailFallback={current.slug === 'email'}
                  />
                )}

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
                  {current.tenantId ? (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => void removePlugin()}>
                      {t.integrations.removePlugin}
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-400">{t.integrations.empty}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4 border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="space-y-3 p-4 text-sm leading-6 text-zinc-400">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.integrations.howToTest}</p>
            <p>
              {adding
                ? t.integrations.addPluginHelp
                : current?.helpTest || t.integrations.genericHelp}
            </p>
          </CardContent>
        </Card>
        {current?.uiVariant === 'webhook' && !adding ? (
          <Card>
            <CardContent className="space-y-2 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.integrations.inboundUrls}</p>
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
        {current?.helpAfter && !adding ? (
          <Card>
            <CardContent className="space-y-2 p-4 text-sm text-zinc-400">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.integrations.afterConnect}</p>
              <p>{current.helpAfter}</p>
            </CardContent>
          </Card>
        ) : null}
      </aside>
    </div>
  );
}

function FieldList({
  fields,
  values,
  setValues,
  emailFallback,
}: {
  fields: PluginField[];
  values: Record<string, string>;
  setValues: (next: (current: Record<string, string>) => Record<string, string>) => void;
  emailFallback: boolean;
}) {
  return (
    <>
      {fields.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <Label>{field.label}</Label>
          {field.type === 'textarea' ? (
            <Textarea
              rows={5}
              value={values[field.key] ?? ''}
              onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
              placeholder={field.placeholder}
              className="font-mono text-xs"
            />
          ) : (
            <Input
              type={field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text'}
              value={values[field.key] ?? ''}
              onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
              placeholder={
                field.key === 'from' && emailFallback ? DEFAULT_EMAIL_FROM : field.placeholder
              }
              className={field.type === 'url' || field.key.toLowerCase().includes('id') ? 'font-mono' : undefined}
            />
          )}
        </div>
      ))}
    </>
  );
}

function AiFields({
  values,
  setValues,
}: {
  values: Record<string, string>;
  setValues: (next: (current: Record<string, string>) => Record<string, string>) => void;
}) {
  const provider = matchAiProvider(values.baseUrl);
  return (
    <>
      <div className="space-y-1.5">
        <Label>Provider</Label>
        <Select
          value={provider.id}
          onChange={(event) => {
            const next = AI_PROVIDERS.find((item) => item.id === event.target.value) ?? AI_PROVIDERS[0];
            setValues((current) => ({
              ...current,
              baseUrl: next.baseUrl,
              model: next.model,
              apiKey: next.id === 'ollama' ? current.apiKey || 'ollama' : current.apiKey,
            }));
          }}
        >
          {AI_PROVIDERS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
        <p className="text-[11px] text-zinc-500">{provider.hint}</p>
      </div>
      <div className="space-y-1.5">
        <Label>API key</Label>
        <Input
          type="password"
          value={values.apiKey ?? ''}
          onChange={(event) => setValues((current) => ({ ...current, apiKey: event.target.value }))}
          placeholder={provider.keyPlaceholder}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Model</Label>
        {provider.id === 'groq' ? (
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
  );
}

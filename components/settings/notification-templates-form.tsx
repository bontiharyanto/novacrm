'use client';

import { useMemo, useState } from 'react';
import { getDictionary } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/components/layout/preferences-provider';
import {
  defaultNotificationCopy,
  lineForEvent,
  mergeNotificationCopy,
  TEMPLATE_PLACEHOLDERS,
  type NotificationCopy,
  type StoredNotificationTemplates,
  type TypeTemplateOverride,
} from '@/lib/notifications/copy';
import { getNotificationTemplateEditor } from '@/lib/settings/notification-templates';
import { renderTemplate } from '@/lib/notifications/render';
import {
  resetNotificationTemplates,
  saveNotificationTemplates,
} from '@/lib/settings/notification-templates';
import { suggestNotificationTemplates } from '@/lib/settings/notification-template-ai';
import type { Locale } from '@/lib/preferences';
import type { TicketType } from '@/lib/tickets/process';

type Tab = 'shared' | TicketType;

const TABS: Tab[] = ['shared', 'incident', 'problem', 'request', 'change'];

const SHARED_FIELDS: Array<{ key: keyof NotificationCopy; rows: number }> = [
  { key: 'hello', rows: 1 },
  { key: 'created', rows: 3 },
  { key: 'statusChanged', rows: 3 },
  { key: 'commentAdded', rows: 2 },
  { key: 'assigned', rows: 2 },
  { key: 'csat', rows: 2 },
  { key: 'viewDetails', rows: 2 },
  { key: 'subjectCreated', rows: 1 },
  { key: 'subjectStatus', rows: 1 },
  { key: 'subjectComment', rows: 1 },
  { key: 'subjectAssigned', rows: 1 },
  { key: 'openTicket', rows: 1 },
  { key: 'rateTicket', rows: 1 },
  { key: 'telegramFallback', rows: 3 },
  { key: 'whatsappFallback', rows: 2 },
];

export function NotificationTemplatesForm({
  initialLocale,
  initialStored,
  initialPublicUrl = '',
}: {
  initialLocale: Locale;
  initialStored: StoredNotificationTemplates;
  initialPublicUrl?: string;
}) {
  const { t } = useI18n();
  const copy = t.notificationTemplates;
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [stored, setStored] = useState<StoredNotificationTemplates>(initialStored);
  const [publicUrl, setPublicUrl] = useState(initialPublicUrl);
  const [tab, setTab] = useState<Tab>('shared');
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [message, setMessage] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiTemplates, setAiTemplates] = useState<StoredNotificationTemplates | null>(null);
  const [aiModel, setAiModel] = useState('');

  const defaults = useMemo(() => defaultNotificationCopy(locale), [locale]);
  const merged = useMemo(() => mergeNotificationCopy(defaults, stored), [defaults, stored]);
  const labels = useMemo(() => getDictionary(locale), [locale]);

  const preview = useMemo(() => {
    const type = tab === 'shared' ? 'incident' : tab;
    const typeLabel = labels.tickets.type[type];
    const statusLabel = labels.tickets.stage[type].resolved;
    const line = lineForEvent(merged, 'ticket.status_change', type);
    const base = publicUrl.replace(/\/$/, '') || 'https://desk.example';
    const detailUrl = `${base}/portal/ticket`;
    const csat = renderTemplate(merged.csat, { url: detailUrl });
    return renderTemplate(`${merged.hello} ${line}${merged.viewDetails}`, {
      name: 'Budi',
      number: 'INC-1042',
      type: typeLabel,
      status: statusLabel,
      title: locale === 'en' ? 'VPN will not connect' : 'VPN tidak connect',
      message: '',
      csat,
      url: detailUrl,
      assignee: 'Sari',
    });
  }, [merged, tab, labels, publicUrl, locale]);

  async function loadLocale(next: Locale) {
    if (next === locale) return;
    setSaving(true);
    setLocale(next);
    setStored({});
    setAiSummary('');
    setAiTemplates(null);
    const result = await getNotificationTemplateEditor(next);
    setSaving(false);
    if (result.error || !result.data) {
      setMessage(result.error ?? copy.loadFailed);
      return;
    }
    setStored(result.data.stored);
    setMessage('');
  }

  function setShared(key: keyof NotificationCopy, value: string) {
    setStored((prev) => ({ ...prev, [key]: value }));
  }

  function setTypeField(type: TicketType, key: keyof TypeTemplateOverride, value: string) {
    setStored((prev) => ({
      ...prev,
      byType: {
        ...prev.byType,
        [type]: { ...prev.byType?.[type], [key]: value },
      },
    }));
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{copy.kicker}</p>
        <h1 className="text-2xl font-semibold text-zinc-50">{copy.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">{copy.subtitle}</p>
        <p className="mt-2 font-mono text-[11px] text-zinc-600">{TEMPLATE_PLACEHOLDERS.join('  ')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{copy.publicUrl}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-500">{copy.publicUrlHint}</p>
          <div className="space-y-1.5">
            <Label htmlFor="public-url">{copy.publicUrl}</Label>
            <Input
              id="public-url"
              type="url"
              inputMode="url"
              value={publicUrl}
              placeholder={copy.publicUrlPlaceholder}
              onChange={(event) => setPublicUrl(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{copy.aiTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-500">{copy.aiHint}</p>
          {aiSummary ? (
            <div className="space-y-2">
              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{aiSummary}</p>
              {aiModel ? <p className="font-mono text-[11px] text-zinc-600">{aiModel}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-zinc-600">{copy.aiEmpty}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={saving || suggesting}
              onClick={() => {
                void (async () => {
                  setSuggesting(true);
                  const result = await suggestNotificationTemplates(locale, stored);
                  setSuggesting(false);
                  if (result.error || !result.data) {
                    setMessage(result.error ?? copy.loadFailed);
                    return;
                  }
                  setAiSummary(result.data.summary);
                  setAiTemplates(result.data.templates);
                  setAiModel(result.data.model ?? '');
                  setMessage('');
                })();
              }}
            >
              {suggesting ? copy.aiRunning : copy.aiRun}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving || suggesting || !aiTemplates}
              onClick={() => {
                if (!aiTemplates) return;
                setStored(aiTemplates);
                setMessage(copy.aiApplied);
              }}
            >
              {copy.aiApply}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(['id', 'en'] as Locale[]).map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={locale === item ? 'default' : 'outline'}
            disabled={saving}
            onClick={() => void loadLocale(item)}
          >
            {item === 'id' ? 'Bahasa Indonesia' : 'English'}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={tab === item ? 'default' : 'outline'}
            onClick={() => setTab(item)}
          >
            {item === 'shared' ? copy.shared : labels.tickets.type[item]}
          </Button>
        ))}
      </div>

      {tab === 'shared' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{copy.shared}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {SHARED_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key}>{copy.fields[field.key]}</Label>
                <Textarea
                  id={field.key}
                  rows={field.rows}
                  value={stored[field.key] || defaults[field.key]}
                  placeholder={defaults[field.key]}
                  onChange={(event) => setShared(field.key, event.target.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{copy.typeOverride} · {labels.tickets.type[tab]}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-zinc-500">{copy.typeOverrideHint}</p>
            {(['created', 'statusChanged', 'commentAdded'] as const).map((key) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`${tab}-${key}`}>{copy.fields[key]}</Label>
                <Textarea
                  id={`${tab}-${key}`}
                  rows={3}
                  value={stored.byType?.[tab]?.[key] ?? ''}
                  placeholder={defaults[key]}
                  onChange={(event) => setTypeField(tab, key, event.target.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{copy.preview}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">{preview}</p>
        </CardContent>
      </Card>

      {message ? <p className="text-sm text-zinc-400">{message}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={saving}
          onClick={() => {
            void (async () => {
              setSaving(true);
              const result = await saveNotificationTemplates(locale, stored, publicUrl);
              setSaving(false);
              setMessage(result.error ?? copy.saved);
              if (result.data) {
                setStored(result.data.stored);
                setPublicUrl(result.data.publicUrl);
              }
            })();
          }}
        >
          {copy.save}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => {
            void (async () => {
              setSaving(true);
              const result = await resetNotificationTemplates(locale);
              setSaving(false);
              setMessage(result.error ?? copy.resetDone);
              if (result.data) setStored(result.data.stored);
            })();
          }}
        >
          {copy.reset}
        </Button>
      </div>
    </div>
  );
}

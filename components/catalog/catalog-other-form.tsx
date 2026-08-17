'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { AssistantMarkdown } from '@/components/assistant/assistant-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { useI18n } from '@/components/layout/preferences-provider';
import type { AssistantMessage } from '@/lib/assistant/schema';
import { formatIssueFromForm, SYMPTOM_CHIPS } from '@/lib/assistant/portal-details';
import { emitTicketsChanged } from '@/lib/tickets/events';
import { cn } from '@/lib/utils';
import { PdpConsentField } from '@/components/shared/pdp-consent-field';
import { usePrivacyEnabled } from '@/components/portal/privacy-module';

type Proposal = { type: string; title: string; description: string };

export function CatalogOtherForm({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const privacyEnabled = usePrivacyEnabled();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [impact, setImpact] = useState('');
  const [contact, setContact] = useState('');
  const [details, setDetails] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [review, setReview] = useState('');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [consented, setConsented] = useState(false);

  const complete =
    title.trim().length >= 8 &&
    location.trim().length >= 3 &&
    impact.trim().length >= 2 &&
    contact.trim().length >= 8;
  const canSubmit = complete && (!privacyEnabled || consented) && !busy && !ticketId;

  async function submitTicket() {
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    const issue = formatIssueFromForm({ title, location, impact, contact, details });
    const response = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim().slice(0, 200),
        description: issue,
        type: 'incident',
        status: 'open',
        priority: 'medium',
        requesterPhone: contact.trim(),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.data?.id) {
      const message = payload.error ?? t.portal.submitFailed;
      setError(message);
      toastError(message);
      setBusy(false);
      return;
    }
    emitTicketsChanged();
    toastSuccess(t.tickets.created);
    router.push(`/portal/${payload.data.id}`);
  }

  async function callAssistant(next: AssistantMessage[]) {
    setBusy(true);
    setError('');
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next, threadId: null }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error) {
      const message = payload.error ?? t.portal.submitFailed;
      setError(message);
      toastError(message);
      setBusy(false);
      return;
    }
    const reply = String(payload.data?.content ?? '');
    setMessages([...next, { role: 'assistant', content: reply }]);
    setReview(reply);
    setProposal(payload.data?.proposal ?? null);
    if (payload.data?.ticketId) {
      setTicketId(payload.data.ticketId);
      setProposal(null);
      emitTicketsChanged();
      toastSuccess(t.tickets.created);
      router.push(`/portal/${payload.data.ticketId}`);
    }
    setBusy(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitTicket();
  }

  async function startReview() {
    if (!canSubmit) return;
    const issue = formatIssueFromForm({ title, location, impact, contact, details });
    await callAssistant([{ role: 'user', content: issue }]);
  }

  async function handleApprove() {
    if (!proposal || busy) return;
    await callAssistant([...messages, { role: 'user', content: t.assistant.confirmTicket }]);
  }

  function handleEdit() {
    setMessages([]);
    setReview('');
    setProposal(null);
    setError('');
  }

  return (
    <div className={cn('nova-surface rounded-xl border p-5 md:p-6', className)}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950">
          <Sparkles className="h-4 w-4 nova-accent-icon" />
        </span>
        <div>
          <h2 className="text-sm font-medium text-zinc-50">{t.catalog.notInList}</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">{t.catalog.notInListHint}</p>
        </div>
      </div>

      {review ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-[13px] leading-5 text-zinc-200">
            <AssistantMarkdown text={review} />
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            {proposal && !ticketId ? (
              <Button type="button" disabled={busy} onClick={() => void handleApprove()}>
                {busy ? t.assistant.thinking : t.assistant.confirmTicket}
              </Button>
            ) : null}
            {!ticketId ? (
              <Button type="button" variant="ghost" disabled={busy} onClick={handleEdit}>
                {t.catalog.editIssue}
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="catalog-other-title">{t.catalog.fieldSymptom}</Label>
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOM_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setTitle(chip.prompt)}
                  className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
                    title === chip.prompt
                      ? 'nova-accent-chip'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <Input
              id="catalog-other-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t.catalog.fieldSymptomHint}
              required
              autoFocus={!compact}
              className="h-11 text-base"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="catalog-other-location">{t.catalog.fieldLocation}</Label>
              <Input
                id="catalog-other-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder={t.catalog.fieldLocationHint}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catalog-other-impact">{t.catalog.fieldImpact}</Label>
              <Input
                id="catalog-other-impact"
                value={impact}
                onChange={(event) => setImpact(event.target.value)}
                placeholder={t.catalog.fieldImpactHint}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="catalog-other-contact">{t.catalog.fieldContact}</Label>
            <Input
              id="catalog-other-contact"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder={t.catalog.fieldContactHint}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="catalog-other-details">{t.catalog.fieldNotes}</Label>
            <Textarea
              id="catalog-other-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder={t.portal.detailsPlaceholder}
              rows={compact ? 4 : 6}
            />
          </div>
          {privacyEnabled ? (
            <PdpConsentField
              variant="capture"
              checked={consented}
              onChange={setConsented}
              privacyHref="/portal/privacy"
            />
          ) : null}
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!canSubmit}>
              {busy ? t.portal.submitting : t.portal.submitRequest}
            </Button>
            <Button type="button" variant="ghost" disabled={!canSubmit} onClick={() => void startReview()}>
              {busy ? t.catalog.reviewing : t.catalog.reviewWithAi}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

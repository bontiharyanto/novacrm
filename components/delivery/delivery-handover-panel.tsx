'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ClipboardCheck, RotateCcw, Send, ShieldCheck, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/components/layout/preferences-provider';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import type {
  DeliveryHandover,
  DeliveryHandoverStatus,
  DeliveryProjectStatus,
} from '@/lib/delivery/schema';

function statusTone(status: DeliveryHandoverStatus): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'accepted' || status === 'accepted_with_conditions') return 'success';
  if (status === 'under_review') return 'info';
  if (status === 'rejected') return 'danger';
  if (status === 'in_progress') return 'warning';
  return 'neutral';
}

export function DeliveryHandoverPanel({
  projectId,
  projectStatus,
  canManageChecklist,
  canAccept,
}: {
  projectId: string;
  projectStatus?: DeliveryProjectStatus;
  canManageChecklist: boolean;
  canAccept: boolean;
}) {
  const { t } = useI18n();
  const [handover, setHandover] = useState<DeliveryHandover | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [closing, setClosing] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const response = await fetch(`/api/delivery/projects/${projectId}/handover`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    setHandover(payload.data ?? null);
    if (payload.error && payload.error !== 'Handover record is not available') setMessage(payload.error);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('delivery_handovers', load);
  useRealtimeTable('delivery_handover_items', load);
  useRealtimeTable('delivery_handover_reviews', load);

  async function updateItem(itemId: string, completed: boolean) {
    setSavingItem(itemId);
    setMessage('');
    const response = await fetch(`/api/delivery/projects/${projectId}/handover`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, completed }),
    });
    const payload = await response.json().catch(() => ({}));
    if (payload.error) setMessage(payload.error);
    else setHandover(payload.data ?? null);
    setSavingItem('');
  }

  async function review(action: 'submit' | 'accept' | 'accept_with_conditions' | 'reject') {
    setSavingReview(true);
    setMessage('');
    const response = await fetch(`/api/delivery/projects/${projectId}/handover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes: reviewNotes }),
    });
    const payload = await response.json().catch(() => ({}));
    if (payload.error) setMessage(payload.error);
    else {
      setHandover(payload.data ?? null);
      setReviewNotes('');
    }
    setSavingReview(false);
  }

  async function closeProject() {
    setClosing(true);
    setMessage('');
    const response = await fetch(`/api/delivery/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    const payload = await response.json().catch(() => ({}));
    if (payload.error) setMessage(payload.error);
    else await load();
    setClosing(false);
  }

  if (loading) {
    return <section className="nova-surface rounded-xl border p-5 text-sm text-zinc-500">{t.common.deliveryHandoverLoading}</section>;
  }
  if (!handover) return null;

  const canSubmit =
    canManageChecklist &&
    handover.readinessScore === 100 &&
    handover.blockers.length === 0 &&
    ['not_started', 'in_progress', 'rejected'].includes(handover.status);
  const canReview = canAccept && handover.status === 'under_review';
  const canEditChecklist = canManageChecklist && !['accepted', 'accepted_with_conditions'].includes(handover.status);
  const canClose =
    canManageChecklist &&
    projectStatus !== 'completed' &&
    projectStatus !== 'cancelled' &&
    ['accepted', 'accepted_with_conditions'].includes(handover.status) &&
    Boolean(handover.hypercareEnd && handover.hypercareEnd <= new Date().toISOString().slice(0, 10));

  return (
    <section className="nova-surface rounded-xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-lg border border-blue-500/30 bg-blue-500/10 p-2 text-blue-300">
            <ClipboardCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.common.deliveryHandoverTitle}</p>
            <p className="mt-1 text-sm text-zinc-300">{t.common.deliveryHandoverSubtitle}</p>
          </div>
        </div>
        <Badge tone={statusTone(handover.status)}>{t.common.deliveryHandoverStatus[handover.status]}</Badge>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold text-zinc-50">{handover.progress}%</p>
          <p className="text-xs text-zinc-500">
            {handover.completedCount}/{handover.requiredCount} {t.common.deliveryHandoverChecklist}
          </p>
        </div>
        <div className="h-2 min-w-48 flex-1 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${handover.progress}%` }} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{t.common.deliveryHandoverReadiness}</p>
          <p className="mt-1 text-xl font-semibold text-blue-200">{handover.readinessScore}%</p>
        </div>
        <div className={`rounded-lg border p-3 ${
          handover.blockers.length ? 'border-rose-500/20 bg-rose-500/5' : 'border-emerald-500/20 bg-emerald-500/5'
        }`}>
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{t.common.deliveryHandoverBlockers}</p>
          <p className={`mt-1 text-xl font-semibold ${handover.blockers.length ? 'text-rose-200' : 'text-emerald-200'}`}>
            {handover.blockers.length}
          </p>
        </div>
      </div>

      <div className={`mt-4 rounded-lg border p-3 ${
        handover.blockers.length ? 'border-rose-500/20 bg-rose-500/5' : 'border-emerald-500/20 bg-emerald-500/5'
      }`}>
        <p className="text-xs text-zinc-300">
          {handover.blockers.length ? t.common.deliveryHandoverBlockerHint : t.common.deliveryHandoverNoBlockers}
        </p>
        {handover.blockers.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-rose-200">
            {handover.blockers.slice(0, 8).map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        ) : null}
        {handover.blockerActivityCount > 0 ? (
          <p className="mt-2 text-[11px] text-amber-300">
            {t.common.deliveryHandoverActivityBlockers.replace('{{count}}', String(handover.blockerActivityCount))}
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-2 md:grid-cols-2">
        {handover.items.map((item) => (
          <label
            key={item.id}
            className={`flex gap-3 rounded-lg border p-3 transition-colors ${
              item.completed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-950/40'
            } ${canEditChecklist ? 'cursor-pointer hover:border-zinc-700' : ''}`}
          >
            <input
              type="checkbox"
              checked={item.completed}
              disabled={!canEditChecklist || savingItem === item.id}
              onChange={(event) => void updateItem(item.id, event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-500"
            />
            <span className="min-w-0">
              <span className={`block text-sm ${item.completed ? 'text-emerald-200' : 'text-zinc-200'}`}>{item.title}</span>
              {item.required ? <span className="mt-1 block text-[11px] text-zinc-600">{t.common.deliveryHandoverRequired}</span> : null}
            </span>
          </label>
        ))}
      </div>

      {canSubmit ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
          <p className="text-xs text-zinc-400">{t.common.deliveryHandoverSubmitHint}</p>
          <Button size="sm" disabled={savingReview} onClick={() => void review('submit')}>
            <Send className="h-3.5 w-3.5" /> {t.common.deliveryHandoverSubmit}
          </Button>
        </div>
      ) : null}

      {canReview ? (
        <div className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-sm text-amber-200">
            <ShieldCheck className="h-4 w-4" /> {t.common.deliveryHandoverOperationsReview}
          </div>
          <Textarea
            value={reviewNotes}
            onChange={(event) => setReviewNotes(event.target.value)}
            placeholder={t.common.deliveryHandoverReviewPlaceholder}
            className="mt-3 min-h-20 text-xs"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" disabled={savingReview} onClick={() => void review('accept')}>
              <Check className="h-3.5 w-3.5" /> {t.common.deliveryHandoverAccept}
            </Button>
            <Button size="sm" variant="outline" disabled={savingReview} onClick={() => void review('accept_with_conditions')}>
              <ShieldCheck className="h-3.5 w-3.5" /> {t.common.deliveryHandoverConditional}
            </Button>
            <Button size="sm" variant="ghost" disabled={savingReview} onClick={() => void review('reject')}>
              <X className="h-3.5 w-3.5" /> {t.common.deliveryHandoverReject}
            </Button>
          </div>
        </div>
      ) : null}

      {handover.operationalAcceptedAt ? (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {t.common.deliveryHandoverAcceptedBy} {handover.operationalAcceptedByName ?? '—'} · {t.common.deliveryHandoverHypercare}:{' '}
            {handover.hypercareStart ?? '—'} → {handover.hypercareEnd ?? '—'}
          </p>
        </div>
      ) : null}

      {canClose ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-xs text-emerald-200">{t.common.deliveryHandoverCloseHint}</p>
          <Button size="sm" disabled={closing} onClick={() => void closeProject()}>
            <Check className="h-3.5 w-3.5" /> {t.common.deliveryHandoverClose}
          </Button>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-xs text-rose-300">{message}</p> : null}

      {handover.reviews.length ? (
        <details className="mt-5 border-t border-zinc-800 pt-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300">
            <RotateCcw className="h-3.5 w-3.5" /> {t.common.deliveryHandoverHistory} ({handover.reviews.length})
          </summary>
          <div className="mt-3 space-y-2">
            {handover.reviews.map((reviewItem) => (
              <div key={reviewItem.id} className="rounded-lg border border-zinc-800 p-3 text-xs">
                <div className="flex flex-wrap justify-between gap-2 text-zinc-400">
                  <span>{t.common.deliveryHandoverAction[reviewItem.action]}</span>
                  <span>{reviewItem.reviewerName ?? '—'} · {new Date(reviewItem.createdAt).toLocaleString()}</span>
                </div>
                {reviewItem.notes ? <p className="mt-2 leading-5 text-zinc-500">{reviewItem.notes}</p> : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

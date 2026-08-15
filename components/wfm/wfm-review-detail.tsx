'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WfmNav } from '@/components/wfm/wfm-nav';
import { useI18n } from '@/components/layout/preferences-provider';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { acknowledgeStaffReview, generateStaffReviewAi } from '@/lib/reviews/actions';
import type { StaffReview, StaffReviewStatus } from '@/lib/reviews/schema';
import { ReviewAiPanel } from '@/components/wfm/wfm-review-ai';

const statusTone: Record<StaffReviewStatus, 'neutral' | 'info' | 'success'> = {
  draft: 'neutral',
  submitted: 'info',
  acknowledged: 'success',
};

export function WfmReviewDetail({
  review,
  userId,
  canEditDraft,
  canRefreshAi,
}: {
  review: StaffReview;
  userId: string;
  canEditDraft: boolean;
  canRefreshAi: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [aiPending, setAiPending] = useState(false);
  const refresh = useCallback(() => router.refresh(), [router]);
  useRealtimeTable('staff_reviews', refresh);

  const statusLabel: Record<StaffReviewStatus, string> = {
    draft: t.wfm.reviewStatusDraft,
    submitted: t.wfm.reviewStatusSubmitted,
    acknowledged: t.wfm.reviewStatusAcknowledged,
  };

  const canAcknowledge = review.status === 'submitted' && review.subjectId === userId;
  const scores = [
    [t.wfm.reviewQuality, review.quality],
    [t.wfm.reviewSla, review.slaDiscipline],
    [t.wfm.reviewTeamwork, review.teamwork],
    [t.wfm.reviewOwnership, review.ownership],
  ] as const;

  async function acknowledge() {
    setPending(true);
    setError(null);
    const result = await acknowledgeStaffReview(review.id);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6 p-6">
      <WfmNav />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-medium text-zinc-50">{review.subjectName}</p>
              <p className="mt-1 font-mono text-xs text-zinc-500">
                {review.periodStart} → {review.periodEnd} · {t.wfm.reviewer} {review.reviewerName}
              </p>
            </div>
            <Badge tone={statusTone[review.status]}>{statusLabel[review.status]}</Badge>
          </div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">{t.wfm.reviewHuman}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {scores.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                <p className="mt-1 font-mono text-xl text-zinc-50">{value}</p>
              </div>
            ))}
          </div>
          {review.comment ? (
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">{t.wfm.reviewComment}</p>
              <p className="mt-1 text-sm leading-6 text-zinc-300">{review.comment}</p>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {review.strengths ? (
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">{t.wfm.reviewStrengths}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-300">{review.strengths}</p>
              </div>
            ) : null}
            {review.improvements ? (
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">{t.wfm.reviewImprovements}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-300">{review.improvements}</p>
              </div>
            ) : null}
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            {canAcknowledge ? (
              <Button size="sm" disabled={pending} onClick={() => void acknowledge()}>
                {t.wfm.reviewAcknowledge}
              </Button>
            ) : null}
            {canEditDraft && review.status === 'draft' ? (
              <Button size="sm" variant="outline" onClick={() => router.push(`/wfm/reviews/${review.id}/edit`)}>
                {t.wfm.reviewEdit}
              </Button>
            ) : null}
            {canRefreshAi ? (
              <Button
                size="sm"
                variant="outline"
                disabled={pending || aiPending}
                onClick={() => {
                  setAiPending(true);
                  setError(null);
                  void generateStaffReviewAi(review.id).then((result) => {
                    setAiPending(false);
                    if (result.error) setError(result.error);
                    else router.refresh();
                  });
                }}
              >
                {aiPending ? t.wfm.reviewAiRunning : t.wfm.reviewAiRefresh}
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => router.push('/wfm/reviews')}>
              {t.common.close}
            </Button>
          </div>
        </section>
        <aside className="space-y-4 rounded-xl border border-zinc-800 p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.wfm.reviewSnapshot}</p>
          {review.snapshot ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">{t.wfm.reviewClosed}</dt>
                <dd className="font-mono text-zinc-200">{review.snapshot.ticketsClosed}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">{t.wfm.reviewCsat}</dt>
                <dd className="font-mono text-zinc-200">
                  {review.snapshot.csatAvg ?? '—'}
                  {review.snapshot.csatCount ? ` (${review.snapshot.csatCount})` : ''}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">{t.wfm.reviewBreaches}</dt>
                <dd className="font-mono text-zinc-200">{review.snapshot.slaBreaches}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-zinc-500">{t.wfm.reviewSnapshotEmpty}</p>
          )}
          <div className="border-t border-zinc-800 pt-4">
            <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.wfm.reviewAi}</p>
            {review.aiAssessment ? (
              <ReviewAiPanel assessment={review.aiAssessment} />
            ) : (
              <p className="text-sm text-zinc-500">{t.wfm.reviewAiEmpty}</p>
            )}
            <p className="mt-3 text-xs leading-5 text-zinc-600">{t.wfm.reviewAiHint}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

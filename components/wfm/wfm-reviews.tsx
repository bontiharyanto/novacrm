'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WfmNav } from '@/components/wfm/wfm-nav';
import { useI18n } from '@/components/layout/preferences-provider';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import type { StaffReview, StaffReviewStatus } from '@/lib/reviews/schema';

const statusTone: Record<StaffReviewStatus, 'neutral' | 'info' | 'success'> = {
  draft: 'neutral',
  submitted: 'info',
  acknowledged: 'success',
};

function average(review: StaffReview) {
  return ((review.quality + review.slaDiscipline + review.teamwork + review.ownership) / 4).toFixed(1);
}

export function WfmReviews({
  reviews,
  canCreate,
}: {
  reviews: StaffReview[];
  canCreate: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  useRealtimeTable('staff_reviews', refresh);

  const statusLabel: Record<StaffReviewStatus, string> = {
    draft: t.wfm.reviewStatusDraft,
    submitted: t.wfm.reviewStatusSubmitted,
    acknowledged: t.wfm.reviewStatusAcknowledged,
  };

  return (
    <div className="space-y-6 p-6">
      <WfmNav />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">{t.wfm.reviewHint}</p>
        {canCreate ? (
          <Button size="sm" onClick={() => router.push('/wfm/reviews/new')}>
            {t.wfm.reviewNew}
          </Button>
        ) : null}
      </div>
      {reviews.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
          {t.wfm.reviewEmpty}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">{t.wfm.reviewSubject}</th>
                <th className="px-3 py-2 font-medium">{t.wfm.reviewPeriod}</th>
                <th className="px-3 py-2 font-medium">{t.wfm.reviewer}</th>
                <th className="px-3 py-2 font-medium">{t.wfm.reviewAvg}</th>
                <th className="px-3 py-2 font-medium">{t.wfm.reviewAi}</th>
                <th className="px-3 py-2 font-medium">{t.wfm.status}</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id} className="border-b border-zinc-800/80 last:border-0">
                  <td className="px-3 py-2.5">
                    <Link href={`/wfm/reviews/${review.id}`} className="text-zinc-50 hover:text-blue-300">
                      {review.subjectName}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">
                    {review.periodStart} → {review.periodEnd}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">{review.reviewerName}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-zinc-200">{average(review)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-sky-300">
                    {review.aiAssessment
                      ? (
                          (review.aiAssessment.quality +
                            review.aiAssessment.slaDiscipline +
                            review.aiAssessment.teamwork +
                            review.aiAssessment.ownership) /
                          4
                        ).toFixed(1)
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={statusTone[review.status]}>{statusLabel[review.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

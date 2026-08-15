'use client';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/components/layout/preferences-provider';
import type { StaffReviewAiAssessment } from '@/lib/reviews/schema';

export function ReviewAiPanel({
  assessment,
  compact,
}: {
  assessment: StaffReviewAiAssessment;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const scores = [
    [t.wfm.reviewQuality, assessment.quality],
    [t.wfm.reviewSla, assessment.slaDiscipline],
    [t.wfm.reviewTeamwork, assessment.teamwork],
    [t.wfm.reviewOwnership, assessment.ownership],
  ] as const;
  const avg = ((assessment.quality + assessment.slaDiscipline + assessment.teamwork + assessment.ownership) / 4).toFixed(1);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={assessment.source === 'ai' ? 'info' : 'neutral'}>
          {assessment.source === 'ai' ? t.wfm.reviewAiSource : t.wfm.reviewAiFallback}
        </Badge>
        <span className="font-mono text-xs text-zinc-400">
          {t.wfm.reviewAvg} {avg}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {scores.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{label}</p>
            <p className="mt-0.5 font-mono text-lg text-sky-300">{value}</p>
          </div>
        ))}
      </div>
      {compact ? null : (
        <>
          {assessment.comment ? <p className="text-sm leading-6 text-zinc-300">{assessment.comment}</p> : null}
          {assessment.strengths ? (
            <p className="text-xs leading-5 text-zinc-500">
              <span className="text-zinc-400">{t.wfm.reviewStrengths}. </span>
              {assessment.strengths}
            </p>
          ) : null}
          {assessment.improvements ? (
            <p className="text-xs leading-5 text-zinc-500">
              <span className="text-zinc-400">{t.wfm.reviewImprovements}. </span>
              {assessment.improvements}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

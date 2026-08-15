'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { WfmNav } from '@/components/wfm/wfm-nav';
import { useI18n } from '@/components/layout/preferences-provider';
import { createStaffReview, suggestStaffReviewAi, updateStaffReview } from '@/lib/reviews/actions';
import type { StaffReview, StaffReviewAiAssessment } from '@/lib/reviews/schema';
import { ReviewAiPanel } from '@/components/wfm/wfm-review-ai';

function monthStart() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const scores = [1, 2, 3, 4, 5];

export function WfmReviewForm({
  staff,
  reviewerId,
  review,
}: {
  staff: Array<{ id: string; fullName: string }>;
  reviewerId: string;
  review?: StaffReview;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const candidates = staff.filter((agent) => agent.id !== reviewerId);
  const [subjectId, setSubjectId] = useState(review?.subjectId ?? candidates[0]?.id ?? '');
  const [periodStart, setPeriodStart] = useState(review?.periodStart ?? monthStart());
  const [periodEnd, setPeriodEnd] = useState(review?.periodEnd ?? today());
  const [quality, setQuality] = useState(review?.quality ?? 3);
  const [slaDiscipline, setSlaDiscipline] = useState(review?.slaDiscipline ?? 3);
  const [teamwork, setTeamwork] = useState(review?.teamwork ?? 3);
  const [ownership, setOwnership] = useState(review?.ownership ?? 3);
  const [comment, setComment] = useState(review?.comment ?? '');
  const [strengths, setStrengths] = useState(review?.strengths ?? '');
  const [improvements, setImprovements] = useState(review?.improvements ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [aiPending, setAiPending] = useState(false);
  const [aiAssessment, setAiAssessment] = useState<StaffReviewAiAssessment | undefined>(review?.aiAssessment);

  async function askAi() {
    setAiPending(true);
    setError(null);
    const result = await suggestStaffReviewAi({ subjectId, periodStart, periodEnd });
    setAiPending(false);
    if (result.error || !result.data) {
      setError(result.error ?? t.common.saveFailed);
      return;
    }
    setAiAssessment(result.data);
  }

  function applyAi() {
    if (!aiAssessment) return;
    setQuality(aiAssessment.quality);
    setSlaDiscipline(aiAssessment.slaDiscipline);
    setTeamwork(aiAssessment.teamwork);
    setOwnership(aiAssessment.ownership);
    if (aiAssessment.comment) setComment(aiAssessment.comment);
    if (aiAssessment.strengths) setStrengths(aiAssessment.strengths);
    if (aiAssessment.improvements) setImprovements(aiAssessment.improvements);
  }

  async function save(submit: boolean) {
    setPending(true);
    setError(null);
    const payload = {
      subjectId,
      periodStart,
      periodEnd,
      quality,
      slaDiscipline,
      teamwork,
      ownership,
      comment: comment || undefined,
      strengths: strengths || undefined,
      improvements: improvements || undefined,
      submit,
      aiAssessment,
    };
    const result = review
      ? await updateStaffReview(review.id, payload)
      : await createStaffReview(payload);
    setPending(false);
    if (result.error || !result.data) {
      setError(result.error ?? t.common.saveFailed);
      return;
    }
    router.push(`/wfm/reviews/${result.data.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6 p-6">
      <WfmNav />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t.wfm.reviewSubject}</Label>
              <Select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
                {candidates.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.fullName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.wfm.reviewFrom}</Label>
                <Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.wfm.reviewTo}</Label>
                <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {(
              [
                [t.wfm.reviewQuality, quality, setQuality],
                [t.wfm.reviewSla, slaDiscipline, setSlaDiscipline],
                [t.wfm.reviewTeamwork, teamwork, setTeamwork],
                [t.wfm.reviewOwnership, ownership, setOwnership],
              ] as const
            ).map(([label, value, setValue]) => (
              <div key={label} className="space-y-1.5">
                <Label>{label}</Label>
                <Select value={String(value)} onChange={(event) => setValue(Number(event.target.value))}>
                  {scores.map((score) => (
                    <option key={score} value={score}>
                      {score}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>{t.wfm.reviewComment}</Label>
            <Textarea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t.wfm.reviewStrengths}</Label>
              <Textarea rows={3} value={strengths} onChange={(event) => setStrengths(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.wfm.reviewImprovements}</Label>
              <Textarea rows={3} value={improvements} onChange={(event) => setImprovements(event.target.value)} />
            </div>
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={pending} onClick={() => void save(false)}>
              {t.wfm.reviewDraft}
            </Button>
            <Button size="sm" disabled={pending} onClick={() => void save(true)}>
              {t.wfm.reviewSubmit}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => router.push('/wfm/reviews')}>
              {t.common.cancel}
            </Button>
          </div>
        </section>
        <aside className="space-y-4 rounded-xl border border-zinc-800 px-4 py-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.wfm.reviewAi}</p>
          {aiAssessment ? <ReviewAiPanel assessment={aiAssessment} /> : <p className="text-sm text-zinc-500">{t.wfm.reviewAiEmpty}</p>}
          <p className="text-xs leading-5 text-zinc-600">{t.wfm.reviewAiHint}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={pending || aiPending || !subjectId} onClick={() => void askAi()}>
              {aiPending ? t.wfm.reviewAiRunning : t.wfm.reviewAiAsk}
            </Button>
            {aiAssessment ? (
              <Button size="sm" variant="ghost" disabled={pending || aiPending} onClick={applyAi}>
                {t.wfm.reviewAiApply}
              </Button>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

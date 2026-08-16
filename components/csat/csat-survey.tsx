'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type CsatResponse, type CsatScore } from '@/lib/csat/schema';
import { submitTicketCsat } from '@/lib/csat/actions';
import { useI18n } from '@/components/layout/preferences-provider';
import { cn } from '@/lib/utils';

export function CsatSurvey({
  ticketId,
  status,
  canSubmit,
  initial,
  required = false,
  remaining = 0,
  nextTicketId,
}: {
  ticketId: string;
  status: string;
  canSubmit: boolean;
  initial?: CsatResponse | null;
  required?: boolean;
  remaining?: number;
  nextTicketId?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const eligible = status === 'resolved' || status === 'closed';
  const [score, setScore] = useState<CsatScore | null>(initial?.score ?? null);
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [saved, setSaved] = useState<CsatResponse | null>(initial ?? null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const labels = t.portal.csatScore as Record<CsatScore, string>;

  if (!eligible && !saved) return null;

  async function submit() {
    if (!score) return;
    setPending(true);
    setError('');
    const result = await submitTicketCsat({ ticketId, score, comment: comment.trim() || undefined });
    setPending(false);
    if (result.error || !result.data) {
      setError(result.error ?? t.portal.csatError);
      return;
    }
    setSaved(result.data);
    router.refresh();
    router.replace(nextTicketId ? `/portal/${nextTicketId}?rate=1` : '/portal');
  }

  return (
    <Card className={cn(required && !saved && 'border-amber-500/40 bg-amber-500/5')}>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-sm text-zinc-200">
            {required && !saved ? t.portal.csatRequiredTitle : t.portal.csatTitle}
          </CardTitle>
          {required && !saved ? <Badge tone="warning">{t.portal.csatRequired}</Badge> : null}
        </div>
        {required && !saved ? (
          <p className="text-xs leading-5 text-zinc-500">{t.portal.csatRequiredBody}</p>
        ) : null}
        {required && !saved && remaining > 0 ? (
          <p className="text-xs text-amber-300/90">
            {t.portal.csatRequiredMore.replace('{{count}}', String(remaining))}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {saved ? (
          <div>
            <p className="text-sm text-zinc-50">
              {saved.score}/5 · {labels[saved.score]}
            </p>
            {saved.comment ? <p className="mt-1 text-xs text-zinc-500">{saved.comment}</p> : null}
          </div>
        ) : canSubmit ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {([1, 2, 3, 4, 5] as CsatScore[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScore(value)}
                  className={cn(
                    'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ease-out hover:-translate-y-0.5',
                    score === value
                      ? 'border-blue-500 bg-blue-500/15 text-blue-200'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                  )}
                >
                  {value} · {labels[value]}
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={2}
              maxLength={500}
              placeholder={t.portal.csatComment}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
            />
            <Button type="button" size="sm" disabled={!score || pending} onClick={() => void submit()}>
              {pending ? t.portal.csatSaving : t.portal.csatSubmit}
            </Button>
            {error ? <p className="text-xs text-rose-400">{error}</p> : null}
          </>
        ) : (
          <p className="text-sm text-zinc-500">{t.portal.csatWaiting}</p>
        )}
      </CardContent>
    </Card>
  );
}

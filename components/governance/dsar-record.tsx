'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { GovernanceNav } from '@/components/governance/governance-nav';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { DSAR_STAGES, DSAR_TYPES, type DataSubjectRequest, type DsarStatus } from '@/lib/governance/schema';
import { getDsarSla, slaCountdown, slaLabel, slaTone } from '@/lib/governance/flow';
import { formatRelativeId } from '@/lib/utils/dates';
import { cn } from '@/lib/utils';

export function DsarRecord({ requestId }: { requestId: string }) {
  const [row, setRow] = useState<DataSubjectRequest | null>(null);
  const [resolution, setResolution] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/governance/requests/${requestId}`);
    const payload = await response.json();
    const next = payload.data as DataSubjectRequest | null;
    setRow(next);
    if (next?.resolution) setResolution(next.resolution);
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('data_subject_requests', load);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/governance/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await load();
    setSaving(false);
  }

  if (!row) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const sla = getDsarSla(row.dueDate, row.status);
  const stages = [...DSAR_STAGES, { status: 'rejected' as DsarStatus, label: 'Rejected' }];

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/governance/requests" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> DSAR
          </Link>
          <h1 className="mt-1 font-mono text-2xl font-semibold text-white">{row.number}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={slaTone(sla)}>{slaLabel(sla, 'dsar')}</Badge>
          <GovernanceNav />
        </div>
      </div>

      <ol className="flex flex-wrap gap-1">
        {stages.map((stage) => (
          <li key={stage.status}>
            <button
              type="button"
              disabled={saving}
              onClick={() => void patch({ status: stage.status })}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ease-out hover:-translate-y-0.5',
                row.status === stage.status
                  ? 'border-blue-500/40 bg-blue-500/15 text-blue-200'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-200',
              )}
            >
              {stage.label}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Subject</p>
              <p className="mt-1 text-lg text-white">{row.subjectName}</p>
              <p className="text-sm text-zinc-500">{row.subjectEmail ?? 'No email'} · {row.subjectPhone ?? 'No phone'}</p>
            </div>
            <p className="whitespace-pre-wrap text-sm text-zinc-300">{row.description || 'No additional detail.'}</p>
            <div>
              <Label htmlFor="resolution">Resolution notes</Label>
              <Textarea
                id="resolution"
                className="mt-1.5 min-h-32"
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => void patch({ resolution })}>
                Save notes
              </Button>
              <Button type="button" disabled={saving} onClick={() => void patch({ status: 'completed', resolution })}>
                Complete
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardContent className="space-y-3 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Record</p>
            <p className="text-sm text-zinc-300">{DSAR_TYPES.find((item) => item.id === row.requestType)?.label}</p>
            <p className="text-xs text-zinc-500">Due {slaCountdown(row.dueDate)}</p>
            <p className="text-xs text-zinc-500">Opened {formatRelativeId(row.createdAt)}</p>
            <p className="text-xs text-zinc-500">Owner {row.assignedName ?? 'Unassigned'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

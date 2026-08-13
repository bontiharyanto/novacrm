'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { displayTicketNumber, stageLabel } from '@/lib/tickets/process';
import { cabQueue } from '@/lib/cab/flow';
import type { TicketRecord } from '@/lib/tickets/mappers';
import { CabCalendar } from '@/components/cab/cab-calendar';

const QUEUES = [
  { id: 'review', label: 'CAB review' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'implement', label: 'Implement' },
  { id: 'draft', label: 'Draft' },
] as const;

const riskTone: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

export function CabBoard() {
  const [changes, setChanges] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch('/api/cab');
    const payload = await response.json();
    setChanges(payload.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('tickets', load);
  useRealtimeTable('cab_approvals', load);

  const grouped = useMemo(() => {
    const buckets: Record<string, TicketRecord[]> = { review: [], scheduled: [], implement: [], draft: [] };
    for (const change of changes) {
      const queue = cabQueue(change.status);
      if (buckets[queue]) buckets[queue].push(change);
    }
    return buckets;
  }, [changes]);

  const emergency = changes.filter((item) => item.changeType === 'emergency' && item.status !== 'closed').length;

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Change enablement</p>
          <h1 className="text-2xl font-semibold text-zinc-50">CAB</h1>
        </div>
        <Link
          href="/tickets/new?type=change"
          className="inline-flex items-center rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-500"
        >
          New change
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: 'In CAB', value: grouped.review.length },
          { label: 'Scheduled', value: grouped.scheduled.length },
          { label: 'Emergency', value: emergency, danger: true },
          { label: 'Changes', value: changes.length },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{stat.label}</p>
              <p className={`mt-1 text-xl font-semibold ${stat.danger ? 'text-rose-400' : 'text-zinc-50'}`}>
                {loading ? '—' : stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-4">
          {QUEUES.map((queue) => (
            <div key={queue.id} className="rounded-xl border border-zinc-800 bg-zinc-950">
              <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{queue.label}</p>
                <span className="font-mono text-[11px] text-zinc-500">{grouped[queue.id].length}</span>
              </div>
              <div className="space-y-2 p-2">
                {grouped[queue.id].length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-zinc-600">Empty</p>
                ) : (
                  grouped[queue.id].map((change) => (
                    <Link
                      key={change.id}
                      href={`/cab/${change.id}`}
                      className="block rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
                    >
                      <p className="font-mono text-[11px] text-zinc-500">{displayTicketNumber(change.number, change.id)}</p>
                      <p className="mt-0.5 text-sm text-zinc-50">{change.title}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge tone={change.changeType === 'emergency' ? 'danger' : 'info'}>
                          {change.changeType ?? 'normal'}
                        </Badge>
                        <Badge tone={riskTone[change.riskLevel ?? 'medium']}>{change.riskLevel ?? change.priority}</Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-500">{stageLabel('change', change.status)}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CabCalendar changes={changes} />
    </div>
  );
}

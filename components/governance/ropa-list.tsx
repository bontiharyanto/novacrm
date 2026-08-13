'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GovernanceNav } from '@/components/governance/governance-nav';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { LAWFUL_BASES, type ProcessingActivity } from '@/lib/governance/schema';

const statusTone: Record<ProcessingActivity['status'], 'neutral' | 'success' | 'warning'> = {
  draft: 'neutral',
  active: 'success',
  retired: 'warning',
};

export function RopaList() {
  const [rows, setRows] = useState<ProcessingActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch('/api/governance/ropa');
    const payload = await response.json();
    setRows(payload.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('processing_activities', load);

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Pasal 16</p>
          <h1 className="text-2xl font-semibold text-white">Record of processing</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GovernanceNav />
          <Link
            href="/governance/ropa/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" /> New activity
          </Link>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : (
        <Card>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-zinc-500">No processing activities yet.</p>
            ) : (
              <div className="overflow-hidden">
                <div className="grid grid-cols-[7rem_minmax(0,1fr)_9rem_5rem_4.5rem] gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                  <span>Number</span>
                  <span>Activity</span>
                  <span>Basis</span>
                  <span>Retention</span>
                  <span>Status</span>
                </div>
                {rows.map((row) => (
                  <Link
                    key={row.id}
                    href={`/governance/ropa/${row.id}`}
                    className="grid grid-cols-[7rem_minmax(0,1fr)_9rem_5rem_4.5rem] items-center gap-3 border-b border-zinc-800/80 px-4 py-2.5 last:border-b-0 hover:bg-zinc-900/80"
                  >
                    <span className="font-mono text-[11px] text-zinc-500">{row.number}</span>
                    <span className="min-w-0">
                      <p className="truncate text-sm text-white">{row.name}</p>
                      <p className="truncate text-xs text-zinc-500">{row.purpose}</p>
                    </span>
                    <span className="text-xs text-zinc-400">
                      {LAWFUL_BASES.find((item) => item.id === row.lawfulBasis)?.label}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">{row.retentionDays}d</span>
                    <Badge tone={statusTone[row.status]}>{row.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

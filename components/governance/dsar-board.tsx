'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GovernanceNav } from '@/components/governance/governance-nav';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { DSAR_STAGES, DSAR_TYPES, type DataSubjectRequest } from '@/lib/governance/schema';
import { getDsarSla, slaCountdown, slaLabel, slaTone } from '@/lib/governance/flow';

export function DsarBoard() {
  const [rows, setRows] = useState<DataSubjectRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch('/api/governance/requests');
    const payload = await response.json();
    setRows(payload.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('data_subject_requests', load);

  const columns = [...DSAR_STAGES, { status: 'rejected' as const, label: 'Rejected' }];

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Data subject rights · 30 days</p>
          <h1 className="text-2xl font-semibold text-zinc-50">DSAR queue</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GovernanceNav />
          <Link
            href="/governance/requests/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" /> Log request
          </Link>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {columns.map((column) => {
            const items = rows.filter((row) => row.status === column.status);
            return (
              <Card key={column.status}>
                <CardContent className="p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{column.label}</p>
                    <span className="font-mono text-[11px] text-zinc-600">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 ? <p className="py-4 text-xs text-zinc-600">Empty</p> : null}
                    {items.map((row) => {
                      const sla = getDsarSla(row.dueDate, row.status);
                      return (
                        <Link
                          key={row.id}
                          href={`/governance/requests/${row.id}`}
                          className="block rounded-lg border border-zinc-800 p-2.5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
                        >
                          <p className="truncate text-sm text-zinc-50">{row.subjectName}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{row.number}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge tone="info">{DSAR_TYPES.find((item) => item.id === row.requestType)?.label}</Badge>
                            <Badge tone={slaTone(sla)}>{slaLabel(sla, 'dsar')}</Badge>
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-600">{slaCountdown(row.dueDate)}</p>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

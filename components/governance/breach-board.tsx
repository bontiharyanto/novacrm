'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GovernanceNav } from '@/components/governance/governance-nav';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { BREACH_STAGES, type DataBreach } from '@/lib/governance/schema';
import { getBreachDeadline, getBreachNotifySla, slaCountdown, slaLabel, slaTone } from '@/lib/governance/flow';

const severityTone: Record<DataBreach['severity'], 'neutral' | 'warning' | 'danger'> = {
  low: 'neutral',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

export function BreachBoard() {
  const [rows, setRows] = useState<DataBreach[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch('/api/governance/breaches');
    const payload = await response.json();
    setRows(payload.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('data_breaches', load);

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Personal data breach · 72 hours</p>
          <h1 className="text-2xl font-semibold text-zinc-50">Breach register</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GovernanceNav />
          <Link
            href="/governance/breaches/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" /> Log breach
          </Link>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-4">
          {BREACH_STAGES.map((column) => {
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
                      const sla = getBreachNotifySla(row.discoveredAt, row.status, row.notifyAuthority);
                      return (
                        <Link
                          key={row.id}
                          href={`/governance/breaches/${row.id}`}
                          className="block rounded-lg border border-zinc-800 p-2.5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
                        >
                          <p className="truncate text-sm text-zinc-50">{row.title}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{row.number}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge tone={severityTone[row.severity]}>{row.severity}</Badge>
                            <Badge tone={slaTone(sla)}>{slaLabel(sla, 'breach')}</Badge>
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-600">
                            Authority {slaCountdown(getBreachDeadline(row.discoveredAt))}
                          </p>
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

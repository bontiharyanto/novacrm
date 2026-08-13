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
import { BREACH_STAGES, DATA_CATEGORIES, type BreachStatus, type DataBreach } from '@/lib/governance/schema';
import { getBreachDeadline, getBreachNotifySla, slaCountdown, slaLabel, slaTone } from '@/lib/governance/flow';
import { formatRelativeId } from '@/lib/utils/dates';
import { cn } from '@/lib/utils';

export function BreachRecord({ breachId }: { breachId: string }) {
  const [row, setRow] = useState<DataBreach | null>(null);
  const [containment, setContainment] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/governance/breaches/${breachId}`);
    const payload = await response.json();
    const next = payload.data as DataBreach | null;
    setRow(next);
    if (next?.containment) setContainment(next.containment);
  }, [breachId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('data_breaches', load);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/governance/breaches/${breachId}`, {
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

  const sla = getBreachNotifySla(row.discoveredAt, row.status, row.notifyAuthority);

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/governance/breaches" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> Breach register
          </Link>
          <h1 className="mt-1 font-mono text-2xl font-semibold text-white">{row.number}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={slaTone(sla)}>{slaLabel(sla, 'breach')}</Badge>
          <GovernanceNav />
        </div>
      </div>

      <ol className="flex flex-wrap gap-1">
        {BREACH_STAGES.map((stage) => (
          <li key={stage.status}>
            <button
              type="button"
              disabled={saving}
              onClick={() => void patch({ status: stage.status as BreachStatus })}
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
              <p className="text-lg text-white">{row.title}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{row.description || 'No description.'}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {row.dataCategories.map((id) => (
                <Badge key={id} tone="neutral">
                  {DATA_CATEGORIES.find((item) => item.id === id)?.label ?? id}
                </Badge>
              ))}
            </div>
            <div>
              <Label htmlFor="containment">Containment</Label>
              <Textarea
                id="containment"
                className="mt-1.5 min-h-28"
                value={containment}
                onChange={(event) => setContainment(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => void patch({ containment })}>
                Save containment
              </Button>
              <Button type="button" disabled={saving} onClick={() => void patch({ status: 'notified', containment })}>
                Mark notified
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardContent className="space-y-3 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Clock</p>
            <p className="text-sm text-zinc-300">Discovered {formatRelativeId(row.discoveredAt)}</p>
            <p className="text-sm text-zinc-300">Authority due {slaCountdown(getBreachDeadline(row.discoveredAt))}</p>
            <p className="text-sm text-zinc-300">Notified {row.notifiedAt ? formatRelativeId(row.notifiedAt) : '—'}</p>
            <p className="text-sm text-zinc-300">{row.affectedCount} people</p>
            <p className="text-xs text-zinc-600">
              {row.notifyAuthority ? 'Authority notification required' : 'Authority notification not required'}
              {row.notifySubjects ? ' · subjects will be informed' : ''}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

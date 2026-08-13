'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { DSAR_TYPES, type DataSubjectRequest } from '@/lib/governance/schema';
import { getDsarSla, slaCountdown, slaLabel, slaTone } from '@/lib/governance/flow';
import { formatRelativeId } from '@/lib/utils/dates';

export function PortalPrivacyDetail({ requestId }: { requestId: string }) {
  const [row, setRow] = useState<DataSubjectRequest | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/governance/requests/${requestId}`);
    const payload = await response.json();
    setRow(payload.data);
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('data_subject_requests', load);

  if (!row) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const sla = getDsarSla(row.dueDate, row.status);

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <div>
        <Link href="/portal/privacy" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
          <ArrowLeft className="h-3.5 w-3.5" /> Privacy
        </Link>
        <h1 className="mt-1 font-mono text-2xl font-semibold text-white">{row.number}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-zinc-400">{DSAR_TYPES.find((item) => item.id === row.requestType)?.label}</p>
            <p className="whitespace-pre-wrap text-sm text-zinc-300">{row.description || 'No additional detail.'}</p>
            {row.resolution ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Response</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{row.resolution}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardContent className="space-y-3 p-5">
            <Badge tone={slaTone(sla)}>{slaLabel(sla, 'dsar')}</Badge>
            <p className="text-sm capitalize text-zinc-300">{row.status.replace('_', ' ')}</p>
            <p className="text-xs text-zinc-500">Opened {formatRelativeId(row.createdAt)}</p>
            <p className="text-xs text-zinc-500">Due {slaCountdown(row.dueDate)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

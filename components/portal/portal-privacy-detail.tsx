'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { useI18n } from '@/components/layout/preferences-provider';
import { DSAR_TYPES, type DataSubjectRequest } from '@/lib/governance/schema';
import { getDsarSla, slaCountdown, slaLabel, slaTone } from '@/lib/governance/flow';
import { formatRelativeId } from '@/lib/utils/dates';

export function PortalPrivacyDetail({ requestId }: { requestId: string }) {
  const { t, locale } = useI18n();
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
      <div className="mx-auto max-w-6xl space-y-4 p-4 pb-safe md:p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const sla = getDsarSla(row.dueDate, row.status);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-safe md:p-8">
      <div>
        <Link href="/portal/privacy" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
          <ArrowLeft className="h-3.5 w-3.5" /> {t.portal.privacy}
        </Link>
        <p className="mt-3 font-mono text-[12px] text-zinc-600">{row.number}</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-zinc-50">
          {DSAR_TYPES.find((item) => item.id === row.requestType)?.label}
        </h1>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <section className="space-y-4 nova-surface rounded-xl border p-5 lg:col-span-8">
          <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">
            {row.description || t.portal.noAdditionalDetail}
          </p>
          {row.resolution ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.portal.response}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{row.resolution}</p>
            </div>
          ) : null}
        </section>
        <aside className="space-y-3 nova-surface rounded-xl border p-5 lg:col-span-4">
          <Badge tone={slaTone(sla)}>{slaLabel(sla, 'dsar')}</Badge>
          <p className="text-sm capitalize text-zinc-300">{row.status.replace('_', ' ')}</p>
          <p className="text-xs text-zinc-500">
            {t.portal.opened.replace('{{time}}', formatRelativeId(row.createdAt, locale))}
          </p>
          <p className="text-xs text-zinc-500">{t.portal.dueOn.replace('{{time}}', slaCountdown(row.dueDate))}</p>
        </aside>
      </div>
    </div>
  );
}

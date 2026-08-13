'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { DSAR_TYPES, type DataSubjectRequest, type PrivacySettings } from '@/lib/governance/schema';
import { getDsarSla, slaTone } from '@/lib/governance/flow';
import { formatRelativeId } from '@/lib/utils/dates';

export function PortalPrivacy() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [requests, setRequests] = useState<DataSubjectRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [notice, list] = await Promise.all([
      fetch('/api/governance/settings').then((response) => response.json()),
      fetch('/api/governance/requests').then((response) => response.json()),
    ]);
    setSettings(notice.data);
    setRequests(list.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('data_subject_requests', load);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">UU PDP</p>
          <h1 className="text-2xl font-semibold text-zinc-50">Privacy</h1>
        </div>
        <Link
          href="/portal/privacy/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-500"
        >
          <Plus className="h-3.5 w-3.5" /> Submit a rights request
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-400" />
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Privacy notice</p>
            </div>
            {settings?.isPublished ? (
              <>
                <h2 className="text-lg font-semibold text-zinc-50">{settings.noticeTitle || 'Privacy notice'}</h2>
                <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">{settings.noticeBody}</p>
              </>
            ) : (
              <p className="py-8 text-sm text-zinc-500">The controller has not published a privacy notice yet.</p>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardContent className="space-y-3 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Controller</p>
            <p className="text-sm text-zinc-50">{settings?.controllerName ?? '—'}</p>
            <p className="text-xs text-zinc-500">{settings?.controllerAddress}</p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Data protection officer</p>
            <p className="text-sm text-zinc-50">{settings?.dpoName ?? '—'}</p>
            <p className="text-xs text-zinc-500">{settings?.dpoEmail}</p>
            <p className="text-xs text-zinc-500">{settings?.dpoPhone}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">My requests</p>
          {requests.length === 0 ? (
            <p className="text-sm text-zinc-500">You have not submitted a rights request.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-800">
              {requests.map((row) => {
                const sla = getDsarSla(row.dueDate, row.status);
                return (
                  <Link
                    key={row.id}
                    href={`/portal/privacy/${row.id}`}
                    className="flex items-center justify-between gap-3 border-b border-zinc-800/80 px-3 py-2 last:border-b-0 hover:bg-zinc-900/80"
                  >
                    <div>
                      <p className="text-sm text-zinc-50">{DSAR_TYPES.find((item) => item.id === row.requestType)?.label}</p>
                      <p className="font-mono text-[11px] text-zinc-500">
                        {row.number} · {formatRelativeId(row.createdAt)}
                      </p>
                    </div>
                    <Badge tone={slaTone(sla)}>{row.status}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

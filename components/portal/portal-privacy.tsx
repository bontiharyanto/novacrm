'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { useI18n } from '@/components/layout/preferences-provider';
import { DSAR_TYPES, type DataSubjectRequest, type PrivacySettings } from '@/lib/governance/schema';
import { getDsarSla, slaTone } from '@/lib/governance/flow';
import { formatRelativeId } from '@/lib/utils/dates';

export function PortalPrivacy() {
  const { t, locale } = useI18n();
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
      <div className="mx-auto max-w-6xl space-y-4 p-4 pb-safe md:p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 pb-safe md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-zinc-50">{t.portal.privacy}</h1>
          <p className="mt-1.5 text-sm text-zinc-500">{t.portal.privacyKicker}</p>
        </div>
        <Link
          href="/portal/privacy/new"
          className="nova-accent-btn inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-white transition-all duration-200 ease-out hover:-translate-y-px"
        >
          <Plus className="h-3.5 w-3.5" /> {t.portal.submitRights}
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <section className="overflow-hidden nova-surface rounded-xl border p-5 lg:col-span-8">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 nova-accent-icon" />
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.portal.privacyNotice}</p>
          </div>
          {settings?.isPublished ? (
            <>
              <h2 className="mt-3 text-lg font-semibold tracking-tight text-zinc-50">
                {settings.noticeTitle || t.portal.privacyNotice}
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{settings.noticeBody}</p>
            </>
          ) : (
            <p className="py-8 text-sm text-zinc-500">{t.portal.privacyUnpublished}</p>
          )}
        </section>
        <section className="overflow-hidden nova-surface rounded-xl border p-5 lg:col-span-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.portal.controller}</p>
          <p className="mt-2 text-sm text-zinc-50">{settings?.controllerName ?? '—'}</p>
          <p className="mt-1 text-xs text-zinc-500">{settings?.controllerAddress}</p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.portal.dpo}</p>
          <p className="mt-2 text-sm text-zinc-50">{settings?.dpoName ?? '—'}</p>
          <p className="mt-1 text-xs text-zinc-500">{settings?.dpoEmail}</p>
          <p className="text-xs text-zinc-500">{settings?.dpoPhone}</p>
        </section>
      </div>

      <section className="overflow-hidden nova-surface rounded-xl border">
        <div className="border-b border-zinc-800 px-5 py-3">
          <p className="text-[13px] font-medium text-zinc-200">{t.portal.myRequests}</p>
        </div>
        {requests.length === 0 ? (
          <p className="px-5 py-10 text-sm text-zinc-500">{t.portal.noRequests}</p>
        ) : (
          requests.map((row) => {
            const sla = getDsarSla(row.dueDate, row.status);
            return (
              <Link
                key={row.id}
                href={`/portal/privacy/${row.id}`}
                className="flex items-center justify-between gap-3 border-b border-zinc-800/70 px-5 py-3.5 last:border-b-0 transition-colors hover:bg-zinc-900/80"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-50">
                    {DSAR_TYPES.find((item) => item.id === row.requestType)?.label}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-zinc-600">
                    {row.number} · {formatRelativeId(row.createdAt, locale)}
                  </p>
                </div>
                <Badge tone={slaTone(sla)}>{row.status}</Badge>
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}

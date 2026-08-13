'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GovernanceNav } from '@/components/governance/governance-nav';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import type { GovernanceSnapshot } from '@/lib/governance/schema';
import { DSAR_TYPES } from '@/lib/governance/schema';
import { getBreachDeadline, getBreachNotifySla, getDsarSla, slaLabel, slaTone } from '@/lib/governance/flow';
import { formatRelativeId } from '@/lib/utils/dates';

export function GovernanceDashboard() {
  const [data, setData] = useState<GovernanceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch('/api/governance');
    const payload = await response.json();
    setData(payload.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('data_subject_requests', load);
  useRealtimeTable('data_breaches', load);
  useRealtimeTable('processing_activities', load);
  useRealtimeTable('privacy_settings', load);

  if (loading || !data) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const kpis = [
    { label: 'Notice', value: data.settings?.isPublished ? 'Live' : 'Draft', href: '/governance/settings', warn: !data.settings?.isPublished },
    { label: 'DPO', value: data.settings?.dpoName ? 'Assigned' : 'Missing', href: '/governance/settings', warn: !data.settings?.dpoName },
    { label: 'RoPA active', value: data.ropaActive, href: '/governance/ropa' },
    { label: 'DSAR open', value: data.dsarOpen, href: '/governance/requests' },
    { label: 'DSAR overdue', value: data.dsarBreached, href: '/governance/requests', danger: true },
    { label: '72h risk', value: data.breachNotifyRisk, href: '/governance/breaches', danger: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-5 p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">UU PDP · Law 27/2022</p>
          <h1 className="text-2xl font-semibold text-zinc-50">Governance</h1>
        </div>
        <GovernanceNav />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((item) => (
          <Link key={item.label} href={item.href}>
            <Card className="transition-all duration-200 ease-out hover:-translate-y-0.5">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{item.label}</p>
                <p
                  className={`mt-1 text-xl font-semibold ${
                    item.danger && Number(item.value) > 0 ? 'text-rose-400' : item.warn ? 'text-amber-400' : 'text-zinc-50'
                  }`}
                >
                  {item.value}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Open data subject requests</p>
              <Link href="/governance/requests" className="text-xs text-zinc-500 hover:text-zinc-200">
                All DSAR
              </Link>
            </div>
            {data.openRequests.length === 0 ? (
              <p className="py-8 text-sm text-zinc-500">No open rights requests.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-zinc-800">
                {data.openRequests.map((row) => {
                  const sla = getDsarSla(row.dueDate, row.status);
                  return (
                    <Link
                      key={row.id}
                      href={`/governance/requests/${row.id}`}
                      className="flex items-center justify-between gap-3 border-b border-zinc-800/80 px-3 py-2 last:border-b-0 hover:bg-zinc-900/80"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-50">{row.subjectName}</p>
                        <p className="font-mono text-[11px] text-zinc-500">
                          {row.number} · {DSAR_TYPES.find((item) => item.id === row.requestType)?.label}
                        </p>
                      </div>
                      <Badge tone={slaTone(sla)}>{slaLabel(sla, 'dsar')}</Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-5">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Breach clock</p>
              <Link href="/governance/breaches" className="text-xs text-zinc-500 hover:text-zinc-200">
                Register
              </Link>
            </div>
            {data.openBreaches.length === 0 ? (
              <p className="py-8 text-sm text-zinc-500">No open breaches.</p>
            ) : (
              <div className="space-y-2">
                {data.openBreaches.map((row) => {
                  const sla = getBreachNotifySla(row.discoveredAt, row.status, row.notifyAuthority);
                  return (
                    <Link
                      key={row.id}
                      href={`/governance/breaches/${row.id}`}
                      className="block rounded-lg border border-zinc-800 px-3 py-2 hover:bg-zinc-900/80"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm text-zinc-50">{row.title}</p>
                        <Badge tone={slaTone(sla)}>{slaLabel(sla, 'breach')}</Badge>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-zinc-500">
                        {row.number} · notify {formatRelativeId(getBreachDeadline(row.discoveredAt))}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

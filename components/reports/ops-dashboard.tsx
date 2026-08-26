'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendChart, VolumeBars } from '@/components/reports/report-charts';
import { DistributionList } from '@/components/reports/distribution-list';
import { TypeBadge } from '@/components/tickets/type-badge';
import { UsageWarnBanner } from '@/components/settings/usage-settings';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import type { ReportSnapshot } from '@/lib/reports/schema';
import type { TenantMeterSnapshot } from '@/lib/tenants/meter-view';
import { formatDurationMinutes } from '@/lib/reports/labels';
import { formatRelativeId } from '@/lib/utils/dates';
import { isTicketType } from '@/lib/tickets/process';

export function OpsDashboard() {
  const [report, setReport] = useState<ReportSnapshot | null>(null);
  const [meter, setMeter] = useState<TenantMeterSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [reportRes, meterRes] = await Promise.all([
      fetch('/api/reports?range=7'),
      fetch('/api/tenants/meter'),
    ]);
    const reportPayload = await reportRes.json();
    const meterPayload = await meterRes.json().catch(() => ({}));
    setReport(reportPayload.data);
    setMeter(meterPayload.data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('tickets', load);

  if (loading || !report) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const kpis = [
    { label: 'Open', value: report.kpis.open, href: '/tickets' },
    { label: 'Unassigned', value: report.kpis.unassigned, href: '/tickets?queue=unassigned' },
    { label: 'SLA breached', value: report.kpis.slaBreached, href: '/tickets', danger: true },
    { label: 'CAB review', value: report.kpis.cabReview, href: '/cab' },
    { label: 'Warranty risk', value: report.kpis.warrantySoon, href: '/assets' },
    { label: 'Catalog live', value: report.kpis.catalogPublished, href: '/catalog' },
    { label: 'FRT', value: formatDurationMinutes(report.kpis.frtMinutes), href: '/reports' },
    { label: 'MTTR', value: formatDurationMinutes(report.kpis.mttrMinutes), href: '/reports' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-5 p-6"
    >
      {meter ? <UsageWarnBanner snapshot={meter} /> : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Operations</p>
          <h1 className="text-2xl font-semibold text-zinc-50">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Last 7 days · updated {formatRelativeId(report.generatedAt)}</p>
        </div>
        <Link
          href="/reports"
          className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700 hover:text-zinc-50"
        >
          Open reports
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((item) => (
          <Link key={item.label} href={item.href}>
            <Card className="transition-all duration-200 ease-out hover:-translate-y-0.5">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{item.label}</p>
                <p className={`mt-1 text-xl font-semibold ${item.danger && Number(item.value) > 0 ? 'text-rose-400' : 'text-zinc-50'}`}>
                  {item.value}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Volume · 7 days</p>
              <div className="flex gap-3 text-[11px] text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Opened
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Closed
                </span>
              </div>
            </div>
            <TrendChart data={report.trend} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardContent className="p-4">
            <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">By process</p>
            <VolumeBars data={report.byType} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent className="p-4">
            <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">Aging open tickets</p>
            {report.aging.length === 0 ? (
              <p className="text-sm text-zinc-500">No tickets older than 2 days.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-zinc-800">
                {report.aging.map((row) => (
                  <Link
                    key={row.id}
                    href={row.type === 'change' ? `/cab/${row.id}` : `/tickets/${row.id}`}
                    className="flex items-center justify-between gap-3 border-b border-zinc-800/80 px-3 py-2 last:border-b-0 hover:bg-zinc-900/80"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isTicketType(row.type) ? <TypeBadge type={row.type} /> : null}
                        <p className="truncate text-sm text-zinc-50">{row.title}</p>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{row.number}</p>
                    </div>
                    <Badge tone={row.ageDays >= 5 ? 'danger' : 'warning'}>{row.ageDays}d</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Load</p>
            <DistributionList rows={report.assignees} empty="No assignees in range." />
            {report.kpis.emergencyChanges > 0 ? (
              <Link href="/cab" className="block text-xs text-rose-300 hover:text-rose-200">
                {report.kpis.emergencyChanges} emergency change open
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { subDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendChart, VolumeBars } from '@/components/reports/report-charts';
import { ReportPreview } from '@/components/reports/report-preview';
import { DistributionList } from '@/components/reports/distribution-list';
import { TypeBadge } from '@/components/tickets/type-badge';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import type { ReportExportFormat, ReportPreset, ReportSnapshot } from '@/lib/reports/schema';
import {
  closedInRange,
  exportFilename,
  formatDurationMinutes,
  formatLabels,
  formatReportPeriod,
  openedInRange,
} from '@/lib/reports/labels';
import { formatDay, parseReportPeriod, REPORT_MAX_DAYS, reportSearchParams } from '@/lib/reports/period';
import { formatRelativeId } from '@/lib/utils/dates';
import { isTicketType } from '@/lib/tickets/process';
import { cn } from '@/lib/utils';

const RANGES: Array<{ id: ReportPreset; label: string }> = [
  { id: 7, label: '7 days' },
  { id: 30, label: '30 days' },
  { id: 90, label: '90 days' },
  { id: 'custom', label: 'Custom' },
];

const FORMATS: ReportExportFormat[] = ['csv', 'xlsx', 'pdf'];
const WFM_FORMATS: Array<Exclude<ReportExportFormat, 'pdf'>> = ['csv', 'xlsx'];

type ReportKind = 'tickets' | 'workforce';

export function ReportsPage({ canWorkforce = false }: { canWorkforce?: boolean }) {
  const [kind, setKind] = useState<ReportKind>('tickets');
  const [preset, setPreset] = useState<ReportPreset>(30);
  const [from, setFrom] = useState(() => formatDay(subDays(new Date(), 29)));
  const [to, setTo] = useState(() => formatDay(new Date()));
  const [format, setFormat] = useState<ReportExportFormat>('xlsx');
  const [report, setReport] = useState<ReportSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [reviewedKey, setReviewedKey] = useState('');

  const period = parseReportPeriod(preset === 'custom' ? { from, to } : { range: preset });
  const todayKey = formatDay(new Date());
  const minKey = formatDay(subDays(new Date(), REPORT_MAX_DAYS - 1));

  const load = useCallback(async () => {
    if (kind === 'workforce') {
      setLoading(false);
      return;
    }
    const query = reportSearchParams({ preset, from, to });
    if (!query) return;
    const response = await fetch(`/api/reports?${query}`);
    const payload = await response.json();
    setReport(payload.data);
    setLoading(false);
  }, [kind, preset, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('tickets', load);

  function resetPreview() {
    setShowPreview(false);
    setReviewedKey('');
  }

  function changeKind(next: ReportKind) {
    if (next === kind) return;
    resetPreview();
    if (next === 'workforce' && format === 'pdf') setFormat('xlsx');
    setKind(next);
  }

  function changePreset(next: ReportPreset) {
    if (next === preset) return;
    resetPreview();
    if (next === 'custom' && report) {
      setFrom(report.periodStart);
      setTo(report.periodEnd);
    }
    setPreset(next);
  }

  function changeDates(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    resetPreview();
  }

  function changeFormat(next: ReportExportFormat) {
    if (next === format) return;
    setFormat(next);
    setShowPreview(false);
    setReviewedKey('');
  }

  async function download() {
    setExporting(true);
    try {
      const query =
        kind === 'workforce'
          ? reportSearchParams({ preset, from, to, format, kind: 'workforce' })
          : report
            ? `from=${report.periodStart}&to=${report.periodEnd}&format=${format}`
            : '';
      if (!query) return;
      const response = await fetch(`/api/reports/export?${query}`);
      if (!response.ok) return;
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const periodLabel = kind === 'workforce' ? `${period.startKey}-${period.endKey}` : `${report?.periodStart}-${report?.periodEnd}`;
      link.download =
        kind === 'workforce'
          ? `novacrm-wfm-${period.startKey.replace(/-/g, '')}-${period.endKey.replace(/-/g, '')}.${format === 'xlsx' ? 'xlsx' : format}`
          : report
            ? exportFilename(report, format)
            : `novacrm-ops-${periodLabel}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const reviewed = reviewedKey === `${period.startKey}:${period.endKey}:${format}`;
  const stale = kind === 'workforce' ? false : !report || report.periodStart !== period.startKey || report.periodEnd !== period.endKey;
  const formats = kind === 'workforce' ? WFM_FORMATS : FORMATS;
  const periodQuery = reportSearchParams({ preset, from, to });
  const canExport = kind === 'workforce' ? Boolean(periodQuery) && !exporting : Boolean(report) && reviewed && !exporting;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-5 p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-200">
            Operations
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-50">Reports</h1>
          {kind === 'workforce' ? (
            <p className="mt-1 text-sm text-zinc-500">Coverage gaps and clock-in vs roster — export only, no preview</p>
          ) : report && !stale ? (
            <p className="mt-1 text-sm text-zinc-500">
              {formatReportPeriod(report)}
              <span className="mx-2 text-zinc-700">·</span>
              Updated {formatRelativeId(report.generatedAt)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">Service desk volume, SLA, and aging</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canWorkforce ? (
            <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
              {(
                [
                  { id: 'tickets' as const, label: 'Tickets' },
                  { id: 'workforce' as const, label: 'Workforce' },
                ]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeKind(item.id)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out',
                    kind === item.id ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
          <Link
            href="/settings/reports"
            className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700 hover:text-zinc-50"
          >
            Daily email
          </Link>
          <Link
            href="/assistant"
            className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700 hover:text-zinc-50"
          >
            Ask assistant
          </Link>
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
            {RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => changePreset(item.id)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out',
                  preset === item.id ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          {preset === 'custom' ? (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={from}
                min={minKey}
                max={to < todayKey ? to : todayKey}
                onChange={(event) => {
                  if (!event.target.value) return;
                  changeDates(event.target.value, to);
                }}
                className="h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200 [color-scheme:dark] outline-none focus:border-blue-500"
                aria-label="From date"
              />
              <span className="text-xs text-zinc-600">–</span>
              <input
                type="date"
                value={to}
                min={from || minKey}
                max={todayKey}
                onChange={(event) => {
                  if (!event.target.value) return;
                  changeDates(from, event.target.value);
                }}
                className="h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200 [color-scheme:dark] outline-none focus:border-blue-500"
                aria-label="To date"
              />
            </div>
          ) : null}
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
            {formats.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => changeFormat(item)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out',
                  format === item ? 'bg-blue-500/15 text-blue-200' : 'text-zinc-400 hover:text-zinc-200',
                )}
              >
                {formatLabels[item]}
              </button>
            ))}
          </div>
          {kind === 'tickets' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowPreview(true);
                setReviewedKey(`${period.startKey}:${period.endKey}:${format}`);
              }}
              disabled={!report || stale}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={() => void download()} disabled={!canExport}>
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      {kind === 'workforce' ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-zinc-200">Export coverage and clock-in for {period.startKey} – {period.endKey}</p>
            <p className="text-sm leading-relaxed text-zinc-500">
              Excel has two sheets: <span className="text-zinc-300">Coverage gaps</span> (group × day with nobody on roster,
              including weekends when the shift is Mon–Fri) and <span className="text-zinc-300">Clock-in vs roster</span>.
              CSV is one file with a <span className="font-mono text-xs text-zinc-400">sheet</span> column. Groups with no
              roster in the window are omitted. The gap list is long by design — open the file; there is no on-screen preview.
            </p>
          </CardContent>
        </Card>
      ) : loading && !report ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : !report || stale ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <>
          <div className="flex items-center gap-2">
            {reviewed ? (
              <Badge tone="success">{formatLabels[format]} ready to export</Badge>
            ) : (
              <Badge tone="neutral">Preview {formatLabels[format]} before export</Badge>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Opened', value: openedInRange(report), hint: `${report.rangeDays}-day intake` },
              { label: 'Closed', value: closedInRange(report), hint: 'Resolved in window' },
              { label: 'Open now', value: report.kpis.open, hint: `${report.kpis.unassigned} unassigned` },
              {
                label: 'SLA breached',
                value: report.kpis.slaBreached,
                hint: `${report.kpis.slaRisk} at risk`,
                danger: true,
              },
              {
                label: 'FRT',
                value: formatDurationMinutes(report.kpis.frtMinutes),
                hint: 'Avg first staff response',
              },
              {
                label: 'MTTR',
                value: formatDurationMinutes(report.kpis.mttrMinutes),
                hint: 'Avg open → resolved',
              },
              {
                label: 'Backlog 7d+',
                value: report.kpis.backlogAging,
                hint: 'Open longer than a week',
                danger: true,
              },
              {
                label: 'OLA/UC breached',
                value: report.kpis.ucBreached,
                hint: 'Vendor / principal clock',
                danger: true,
              },
              {
                label: 'CSAT',
                value: report.kpis.csatCount ? report.kpis.csatAverage.toFixed(1) : '—',
                hint: report.kpis.csatCount ? `${report.kpis.csatCount} ratings` : 'No ratings yet',
              },
            ].map((item) => (
              <Card key={item.label} className="transition-all duration-200 ease-out hover:-translate-y-0.5">
                <CardContent className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{item.label}</p>
                  <p className={`mt-1 text-2xl font-semibold ${item.danger && Number(item.value) > 0 ? 'text-rose-400' : 'text-zinc-50'}`}>
                    {item.value}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-600">{item.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {showPreview ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-zinc-500">
                  Review the {formatLabels[format]} file for {formatReportPeriod(report)}, then export.
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                  Back to report
                </Button>
              </div>
              <ReportPreview report={report} format={format} />
            </div>
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-12">
                <Card className="lg:col-span-8">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Intake vs closed</p>
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
                    <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">Process mix</p>
                    <VolumeBars data={report.byType} />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-3 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">Status</p>
                    <DistributionList rows={report.byStatus} empty="No status movement in range." />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">Priority</p>
                    <DistributionList rows={report.byPriority} empty="No priority mix in range." />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">Hold / wait</p>
                    <DistributionList rows={report.byHoldReason} empty="No paused tickets." />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">Group scorecard</p>
                    <DistributionList rows={report.byGroup} empty="No open tickets on groups." />
                    {report.kpis.emergencyChanges > 0 ? (
                      <Link href="/cab" className="mt-3 block text-xs text-rose-300 hover:text-rose-200">
                        {report.kpis.emergencyChanges} emergency change open
                      </Link>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Vendor / UC queue</p>
                    <p className="text-[11px] text-zinc-600">Open tickets on vendor or principal groups</p>
                  </div>
                  {report.byVendor.length === 0 && report.byUc.length === 0 ? (
                    <p className="py-6 text-sm text-zinc-500">No open vendor or UC-backed tickets.</p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-zinc-800">
                      <div className="grid grid-cols-[minmax(0,1.4fr)_5.5rem_minmax(0,1fr)_4rem_5.5rem_5.5rem_5.5rem] gap-3 border-b border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                        <span>Vendor</span>
                        <span>Party</span>
                        <span>Contract</span>
                        <span className="text-right">Open</span>
                        <span className="text-right">Breach</span>
                        <span className="text-right">Queue</span>
                        <span className="text-right">Credit</span>
                      </div>
                      {(report.byVendor.length > 0 ? report.byVendor : report.byUc).map((row) => (
                        <div
                          key={row.id}
                          className="grid grid-cols-[minmax(0,1.4fr)_5.5rem_minmax(0,1fr)_4rem_5.5rem_5.5rem_5.5rem] items-center gap-3 border-b border-zinc-800/80 px-3 py-2 last:border-b-0"
                        >
                          <span className="truncate text-sm text-zinc-50">{row.label}</span>
                          <span className="text-xs capitalize text-zinc-500">{row.partyKind}</span>
                          <span className="truncate text-xs text-zinc-500">{row.contractName ?? '—'}</span>
                          <span className="text-right font-mono text-xs text-zinc-200">{row.open}</span>
                          <span className={`text-right font-mono text-xs ${row.olaBreached > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                            {row.olaBreached}
                          </span>
                          <span className="text-right font-mono text-xs text-zinc-400">
                            {formatDurationMinutes(row.avgQueueMinutes)}
                          </span>
                          <span className={`text-right font-mono text-xs ${row.creditMinutes > 0 ? 'text-amber-300' : 'text-zinc-500'}`}>
                            {formatDurationMinutes(row.creditMinutes)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-3 lg:grid-cols-12">
                <Card className="lg:col-span-8">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Aging open tickets</p>
                      <p className="text-[11px] text-zinc-600">Older than 2 days</p>
                    </div>
                    {report.aging.length === 0 ? (
                      <p className="py-8 text-sm text-zinc-500">No tickets older than 2 days.</p>
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-zinc-800">
                        <div className="grid grid-cols-[7.5rem_minmax(0,1fr)_5.5rem_4rem] gap-3 border-b border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                          <span>Number</span>
                          <span>Title</span>
                          <span>Owner</span>
                          <span className="text-right">Age</span>
                        </div>
                        {report.aging.map((row) => (
                          <Link
                            key={row.id}
                            href={row.type === 'change' ? `/cab/${row.id}` : `/tickets/${row.id}`}
                            className="grid grid-cols-[7.5rem_minmax(0,1fr)_5.5rem_4rem] items-center gap-3 border-b border-zinc-800/80 px-3 py-2 last:border-b-0 transition-all duration-200 ease-out hover:bg-zinc-900/80"
                          >
                            <span className="font-mono text-[11px] text-zinc-500">{row.number}</span>
                            <span className="flex min-w-0 items-center gap-2">
                              {isTicketType(row.type) ? <TypeBadge type={row.type} /> : null}
                              <span className="truncate text-sm text-zinc-50">{row.title}</span>
                            </span>
                            <span className="truncate text-xs text-zinc-500">{row.assigneeName ?? 'Unassigned'}</span>
                            <span className="text-right">
                              <Badge tone={row.ageDays >= 5 ? 'danger' : 'warning'}>{row.ageDays}d</Badge>
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="lg:col-span-4">
                  <CardContent className="space-y-3 p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Signals</p>
                    {[
                      { label: 'Unassigned', value: report.kpis.unassigned, href: '/tickets?queue=unassigned' },
                      { label: 'SLA risk', value: report.kpis.slaRisk, href: '/tickets' },
                      { label: 'CAB review', value: report.kpis.cabReview, href: '/cab' },
                      { label: 'Warranty risk', value: report.kpis.warrantySoon, href: '/assets' },
                      { label: 'Catalog live', value: report.kpis.catalogPublished, href: '/catalog' },
                    ].map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center justify-between rounded-md px-1 py-1 text-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-zinc-800/60"
                      >
                        <span className="text-zinc-400">{item.label}</span>
                        <span className="font-mono text-zinc-200">{item.value}</span>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </motion.div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BookOpen, CheckCircle2, CircleDot, Clock, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TypeBadge } from '@/components/tickets/type-badge';
import { Badge } from '@/components/ui/badge';
import { formatRelativeId } from '@/lib/utils/dates';
import { useI18n } from '@/components/layout/preferences-provider';
import { localizedStage } from '@/lib/i18n/labels';
import { displayTicketNumber, isTicketType } from '@/lib/tickets/process';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { cn } from '@/lib/utils';
import type { TicketStatus } from '@/lib/tickets/schema';

type TicketItem = {
  id: string;
  number?: string;
  title: string;
  type?: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt?: string;
};

type FilterKey = 'all' | 'open' | 'waiting' | 'done';

const statusTone: Record<TicketStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  open: 'info',
  in_progress: 'warning',
  waiting: 'info',
  hold: 'warning',
  resolved: 'success',
  closed: 'neutral',
};

function bucket(status: TicketStatus): Exclude<FilterKey, 'all'> {
  if (status === 'waiting') return 'waiting';
  if (status === 'resolved' || status === 'closed') return 'done';
  return 'open';
}

function greetingKey(hour: number) {
  if (hour < 11) return 'greetingMorning' as const;
  if (hour < 15) return 'greetingAfternoon' as const;
  if (hour < 18) return 'greetingEvening' as const;
  return 'greetingNight' as const;
}

export function PortalHome({ firstName }: { firstName: string }) {
  const { t, locale } = useI18n();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');

  const loadTickets = useCallback(async () => {
    const response = await fetch('/api/tickets');
    const payload = await response.json().catch(() => ({ data: [] }));
    setTickets(payload.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useRealtimeTable('tickets', loadTickets);

  const counts = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        acc[bucket(ticket.status)] += 1;
        return acc;
      },
      { open: 0, waiting: 0, done: 0 },
    );
  }, [tickets]);

  const waiting = useMemo(
    () => tickets.filter((ticket) => ticket.status === 'waiting'),
    [tickets],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tickets
      .filter((ticket) => (filter === 'all' ? true : bucket(ticket.status) === filter))
      .filter((ticket) => {
        if (!needle) return true;
        const number = displayTicketNumber(ticket.number, ticket.id).toLowerCase();
        return ticket.title.toLowerCase().includes(needle) || number.includes(needle);
      })
      .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
  }, [tickets, filter, query]);

  const greeting = t.portal[greetingKey(new Date().getHours())].replace('{{name}}', firstName || t.brand.portal);

  const stats: Array<{ key: FilterKey; label: string; hint: string; value: number; className: string; icon: typeof CircleDot }> = [
    { key: 'open', label: t.portal.open, hint: t.portal.openHint, value: counts.open, className: 'text-sky-400', icon: CircleDot },
    { key: 'waiting', label: t.portal.waitingOnYou, hint: t.portal.waitingHint, value: counts.waiting, className: 'text-amber-400', icon: Clock },
    { key: 'done', label: t.portal.done, hint: t.portal.doneHint, value: counts.done, className: 'text-emerald-400', icon: CheckCircle2 },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-safe md:p-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{t.brand.portal}</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-50">{greeting}</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">{t.portal.homeSubtitle}</p>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const active = filter === stat.key;
            return (
              <button
                key={stat.key}
                type="button"
                onClick={() => setFilter(active ? 'all' : stat.key)}
                className={cn(
                  'rounded-xl border bg-zinc-900 p-4 text-left transition-all duration-200 ease-out hover:-translate-y-0.5',
                  active ? 'border-zinc-600' : 'border-zinc-800 hover:border-zinc-700',
                )}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-[11px] uppercase tracking-[0.16em] ${stat.className}`}>{stat.label}</p>
                  <Icon className={`h-3.5 w-3.5 ${stat.className}`} />
                </div>
                <p className="mt-2 font-mono text-2xl font-semibold text-zinc-50">{stat.value}</p>
                <p className="mt-1 text-[11px] text-zinc-500">{stat.hint}</p>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/portal/catalog"
          className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
        >
          <BookOpen className="h-4 w-4 text-zinc-400" />
          {t.portal.catalog}
        </Link>
        <Link
          href="/portal/new?type=incident"
          className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
        >
          <AlertTriangle className="h-4 w-4 text-rose-400" />
          {t.portal.reportIncident}
        </Link>
        <Link
          href="/portal/new?type=request"
          className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
        >
          <Plus className="h-4 w-4 nova-accent-icon" />
          {t.portal.submitRequest}
        </Link>
      </div>

      {!loading && waiting.length > 0 && filter !== 'waiting' ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-amber-400">{t.portal.needsYou}</p>
                <p className="mt-1 text-sm text-zinc-400">{t.portal.waitingHint}</p>
              </div>
              <button
                type="button"
                onClick={() => setFilter('waiting')}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                {t.portal.viewAll}
              </button>
            </div>
            <div className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
              {waiting.slice(0, 3).map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} locale={locale} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-medium text-zinc-200">{t.portal.myTickets}</h2>
            {filter !== 'all' ? (
              <button type="button" onClick={() => setFilter('all')} className="mt-1 text-xs text-zinc-500 hover:text-zinc-300">
                {t.portal.showAll}
              </button>
            ) : null}
          </div>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.portal.searchTickets}
            className="sm:max-w-xs"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-zinc-400">{t.portal.empty}</p>
              <Link href="/portal/catalog" className="mt-3 inline-flex text-sm text-blue-300 hover:text-blue-200">
                {t.portal.openCatalog}
              </Link>
            </CardContent>
          </Card>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-zinc-400">{t.portal.noMatch}</CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            {visible.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TicketRow({ ticket, locale }: { ticket: TicketItem; locale: 'en' | 'id' }) {
  const { t } = useI18n();
  const type = isTicketType(ticket.type) ? ticket.type : 'incident';
  return (
    <Link
      href={`/portal/${ticket.id}`}
      className="flex flex-col gap-2 border-b border-zinc-800/80 px-4 py-3 transition-colors last:border-b-0 hover:bg-zinc-900/80 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-zinc-50">{ticket.title}</p>
        <p className="mt-0.5 font-mono text-xs text-zinc-500">{displayTicketNumber(ticket.number, ticket.id)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <TypeBadge type={type} />
          <Badge tone={statusTone[ticket.status]}>{localizedStage(t, type, ticket.status)}</Badge>
        </div>
        <p className="text-[11px] text-zinc-500">{formatRelativeId(ticket.updatedAt ?? ticket.createdAt, locale)}</p>
      </div>
    </Link>
  );
}

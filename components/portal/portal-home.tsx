'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, CircleDot, Clock, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TypeBadge } from '@/components/tickets/type-badge';
import { Badge } from '@/components/ui/badge';
import { formatRelativeId } from '@/lib/utils/dates';
import { useI18n } from '@/components/layout/preferences-provider';
import { PortalConsentBanner } from '@/components/portal/portal-consent-banner';
import { usePrivacyEnabled } from '@/components/portal/privacy-module';
import { localizedStage } from '@/lib/i18n/labels';
import { displayTicketNumber, isTicketType } from '@/lib/tickets/process';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { TICKETS_CHANGED_EVENT } from '@/lib/tickets/events';
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
  const privacyEnabled = usePrivacyEnabled();
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

  useEffect(() => {
    const refresh = () => void loadTickets();
    window.addEventListener(TICKETS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(TICKETS_CHANGED_EVENT, refresh);
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

  const stats: Array<{ key: FilterKey; label: string; hint: string; value: number; bar: string; valueClass: string; icon: typeof CircleDot }> = [
    { key: 'open', label: t.portal.open, hint: t.portal.openHint, value: counts.open, bar: 'bg-sky-500', valueClass: 'text-sky-400', icon: CircleDot },
    { key: 'waiting', label: t.portal.waitingOnYou, hint: t.portal.waitingHint, value: counts.waiting, bar: 'bg-amber-500', valueClass: 'text-amber-400', icon: Clock },
    { key: 'done', label: t.portal.done, hint: t.portal.doneHint, value: counts.done, bar: 'bg-emerald-500', valueClass: 'text-emerald-400', icon: CheckCircle2 },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 pb-safe md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-[28px] font-semibold tracking-tight text-zinc-50">{greeting}</h1>
          <p className="mt-1.5 text-sm leading-6 text-zinc-500">{t.portal.homeSubtitle}</p>
        </div>
        <Link
          href="/portal/new?type=incident"
          className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-200"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
          {t.portal.reportIncident}
        </Link>
      </div>

      {privacyEnabled ? <PortalConsentBanner variant="home" /> : null}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-[88px] w-full" />
          <Skeleton className="h-[88px] w-full" />
          <Skeleton className="h-[88px] w-full" />
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
                  'nova-surface relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 ease-out hover:-translate-y-0.5',
                  active ? 'border-zinc-500' : 'hover:border-zinc-500',
                )}
              >
                <span className={cn('absolute inset-x-0 top-0 h-0.5', stat.bar)} />
                <div className="flex items-center justify-between text-zinc-400">
                  <p className="text-[11px] uppercase tracking-[0.16em]">{stat.label}</p>
                  <Icon className={cn('h-3.5 w-3.5', stat.valueClass)} />
                </div>
                <p className={cn('mt-2 font-mono text-2xl font-semibold tracking-tight', stat.valueClass)}>{stat.value}</p>
                <p className="mt-1 text-[11px] text-zinc-500">{stat.hint}</p>
              </button>
            );
          })}
        </div>
      )}

      {!loading && waiting.length > 0 && filter !== 'waiting' ? (
        <div className="overflow-hidden rounded-xl border border-amber-500/35 bg-amber-500/[0.08]">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-amber-400">{t.portal.needsYou}</p>
              <p className="mt-0.5 text-[13px] text-zinc-500">{t.portal.waitingHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setFilter('waiting')}
              className="text-[12px] text-zinc-400 transition-colors hover:text-zinc-200"
            >
              {t.portal.viewAll}
            </button>
          </div>
          <div className="border-t border-zinc-800/80">
            {waiting.slice(0, 3).map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} locale={locale} />
            ))}
          </div>
        </div>
      ) : null}

      <section className="nova-surface overflow-hidden rounded-xl border">
        <div className="flex flex-col gap-3 border-b border-zinc-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[13px] font-medium text-zinc-200">{t.portal.myTickets}</h2>
            {filter !== 'all' ? (
              <button type="button" onClick={() => setFilter('all')} className="text-[12px] text-zinc-500 hover:text-zinc-300">
                {t.portal.showAll}
              </button>
            ) : null}
          </div>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.portal.searchTickets}
              className="h-8 bg-zinc-950 pl-8 text-[13px]"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-px p-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="text-sm text-zinc-400">{t.portal.empty}</p>
            <Link href="/portal/catalog" className="mt-3 inline-flex text-[13px] text-zinc-300 underline-offset-4 hover:underline">
              {t.portal.openCatalog}
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-500">{t.portal.noMatch}</p>
        ) : (
          visible.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} locale={locale} />)
        )}
      </section>
    </div>
  );
}

function TicketRow({ ticket, locale }: { ticket: TicketItem; locale: 'en' | 'id' }) {
  const { t } = useI18n();
  const type = isTicketType(ticket.type) ? ticket.type : 'incident';
  return (
    <Link
      href={`/portal/${ticket.id}`}
      className="flex flex-col gap-2 border-b border-zinc-800 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-zinc-800/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-zinc-50">{ticket.title}</p>
        <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{displayTicketNumber(ticket.number, ticket.id)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
        <div className="flex items-center gap-1.5">
          <TypeBadge type={type} />
          <Badge tone={statusTone[ticket.status]}>{localizedStage(t, type, ticket.status)}</Badge>
        </div>
        <p className="text-[11px] text-zinc-500">{formatRelativeId(ticket.updatedAt ?? ticket.createdAt, locale)}</p>
      </div>
    </Link>
  );
}

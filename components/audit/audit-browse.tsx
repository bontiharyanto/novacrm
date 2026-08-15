'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import type { TicketAuditEvent } from '@/lib/tickets/audit-types';
import { formatRelativeId } from '@/lib/utils/dates';

export function AuditBrowse() {
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState<TicketAuditEvent[]>([]);

  const load = useCallback(async () => {
    const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
    const response = await fetch(`/api/audit${suffix}`);
    const payload = await response.json().catch(() => ({}));
    setEvents(payload.data ?? []);
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  useRealtimeTable('ticket_audit_events', load);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-5 p-6"
    >
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Overview</p>
        <h1 className="text-2xl font-semibold text-zinc-50">Audit</h1>
        <p className="mt-1 text-sm text-zinc-500">Who changed a ticket field, and when. Last 200 events.</p>
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search number, actor, field" />
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Ticket</th>
              <th className="px-3 py-2 font-medium">Actor</th>
              <th className="px-3 py-2 font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-zinc-500">
                  No audit events yet. Change a ticket status or group first.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} className="border-b border-zinc-800/80">
                  <td className="px-3 py-2.5 text-xs text-zinc-500">{formatRelativeId(event.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/tickets/${event.ticketId}`} className="font-mono text-xs text-blue-300 hover:text-blue-200">
                      {event.ticketNumber ?? event.ticketId.slice(0, 8)}
                    </Link>
                    {event.ticketTitle ? <p className="truncate text-[11px] text-zinc-500">{event.ticketTitle}</p> : null}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">{event.actorName ?? 'System'}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-zinc-200">
                      {event.action}
                      {event.field ? ` · ${event.field}` : ''}
                    </p>
                    {event.field ? (
                      <p className="font-mono text-[11px] text-zinc-500">
                        {event.oldValue || '—'} → {event.newValue || '—'}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

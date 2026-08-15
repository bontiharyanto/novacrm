'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { formatRelativeId } from '@/lib/utils/dates';
import type { TicketAuditEvent } from '@/lib/tickets/audit-types';

export function TicketAudit({ ticketId }: { ticketId: string }) {
  const [events, setEvents] = useState<TicketAuditEvent[]>([]);

  const load = useCallback(async () => {
    const response = await fetch(`/api/tickets/${ticketId}/audit`);
    const payload = await response.json().catch(() => ({}));
    setEvents(payload.data ?? []);
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('ticket_audit_events', load);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm text-zinc-400">
          Audit
          <Link href="/audit" className="text-[11px] font-normal text-blue-300 hover:text-blue-200">
            All events
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.length === 0 ? (
          <p className="text-sm text-zinc-500">No field changes recorded yet.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="border-b border-zinc-800/80 pb-2 last:border-0 last:pb-0">
              <p className="text-xs text-zinc-300">
                <span className="text-zinc-50">{event.actorName ?? 'System'}</span>
                {' · '}
                {event.action}
                {event.field ? ` · ${event.field}` : ''}
              </p>
              {event.field ? (
                <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
                  {event.oldValue || '—'} → {event.newValue || '—'}
                </p>
              ) : null}
              <p className="text-[11px] text-zinc-600">{formatRelativeId(event.createdAt)}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

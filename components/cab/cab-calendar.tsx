'use client';

import Link from 'next/link';
import { addDays, format, startOfWeek } from 'date-fns';
import { id } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { displayTicketNumber } from '@/lib/tickets/process';
import type { TicketRecord } from '@/lib/tickets/mappers';

export function CabCalendar({ changes }: { changes: TicketRecord[] }) {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));

  function itemsFor(day: Date) {
    const key = format(day, 'yyyy-MM-dd');
    return changes.filter((change) => {
      if (!change.plannedStart) return false;
      return format(new Date(change.plannedStart), 'yyyy-MM-dd') === key;
    });
  }

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Change calendar</p>
        <div className="mt-3 grid gap-2 md:grid-cols-7">
          {days.map((day) => {
            const items = itemsFor(day);
            return (
              <div key={day.toISOString()} className="min-h-[120px] rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                <p className="text-[11px] text-zinc-500">{format(day, 'EEE d', { locale: id })}</p>
                <div className="mt-2 space-y-1">
                  {items.map((change) => (
                    <Link
                      key={change.id}
                      href={`/cab/${change.id}`}
                      className="block truncate rounded border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-[11px] text-zinc-200 hover:border-blue-500/40"
                    >
                      {displayTicketNumber(change.number, change.id)}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

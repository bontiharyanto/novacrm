import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatDurationMinutes } from '@/lib/reports/labels';
import type { UcCredit } from '@/lib/uc/credits';

export function UcCreditList({ credits }: { credits: UcCredit[] }) {
  const openMinutes = credits.filter((row) => row.status === 'open').reduce((sum, row) => sum + row.creditMinutes, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Service credits</p>
        <p className="font-mono text-xs text-zinc-400">{formatDurationMinutes(openMinutes)} open</p>
      </div>
      {credits.length === 0 ? (
        <p className="rounded-lg border border-zinc-800 px-3 py-6 text-center text-sm text-zinc-500">
          No OLA/UC breach credits yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          {credits.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 border-b border-zinc-800/80 px-3 py-2.5 last:border-b-0"
            >
              <div className="min-w-0">
                <Link href={`/tickets/${row.ticketId}`} className="truncate text-sm text-zinc-50 hover:text-blue-200">
                  {row.ticketNumber ?? row.ticketId.slice(0, 8)} · {row.ticketTitle ?? 'Ticket'}
                </Link>
                {row.amountNote ? <p className="mt-0.5 truncate text-[11px] text-zinc-500">{row.amountNote}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-xs text-zinc-300">{formatDurationMinutes(row.creditMinutes)}</span>
                <Badge tone={row.status === 'open' ? 'warning' : row.status === 'applied' ? 'success' : 'neutral'}>
                  {row.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

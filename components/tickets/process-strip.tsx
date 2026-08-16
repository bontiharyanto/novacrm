'use client';

import { cn } from '@/lib/utils';
import { useI18n } from '@/components/layout/preferences-provider';
import { localizedStage } from '@/lib/i18n/labels';
import { processStages, type TicketType } from '@/lib/tickets/process';
import type { TicketStatus } from '@/lib/tickets/schema';

export function ProcessStrip({
  type,
  status,
  onSelect,
}: {
  type: TicketType;
  status: TicketStatus;
  onSelect?: (status: TicketStatus) => void;
}) {
  const { t } = useI18n();
  const stages = processStages[type];
  const currentIndex = Math.max(0, stages.findIndex((stage) => stage.status === status));

  return (
    <ol className="flex flex-wrap gap-1">
      {stages.map((stage, index) => {
        const current = stage.status === status;
        const done = index < currentIndex;
        const interactive = Boolean(onSelect);
        return (
          <li key={stage.status}>
            <button
              type="button"
              disabled={!interactive}
              onClick={() => onSelect?.(stage.status)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide transition-all duration-200 ease-out',
                current && 'nova-accent-chip',
                done && !current && 'border-zinc-700 bg-zinc-800 text-zinc-300',
                !current && !done && 'border-zinc-800 bg-zinc-950 text-zinc-500',
                interactive && 'hover:-translate-y-0.5 hover:border-zinc-600',
                !interactive && 'cursor-default',
              )}
            >
              {localizedStage(t, type, stage.status)}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

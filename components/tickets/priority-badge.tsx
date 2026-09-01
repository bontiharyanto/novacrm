'use client';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/components/layout/preferences-provider';
import { ticketPriorityDotClass, ticketPriorityTone } from '@/lib/tickets/badge-tones';
import type { TicketPriority } from '@/lib/tickets/schema';
import { cn } from '@/lib/utils';

export function PriorityBadge({
  priority,
  showDot = false,
  className,
}: {
  priority: TicketPriority;
  showDot?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const label = t.tickets.priority[priority];

  if (!showDot) {
    return (
      <Badge tone={ticketPriorityTone[priority]} className={className}>
        {label}
      </Badge>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn('h-1.5 w-1.5 shrink-0 rounded-full', ticketPriorityDotClass[priority])}
        aria-hidden
      />
      <Badge tone={ticketPriorityTone[priority]}>{label}</Badge>
    </span>
  );
}

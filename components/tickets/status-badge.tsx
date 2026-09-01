'use client';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/components/layout/preferences-provider';
import { localizedStage } from '@/lib/i18n/labels';
import { ticketStatusTone } from '@/lib/tickets/badge-tones';
import type { TicketType } from '@/lib/tickets/process';
import type { TicketStatus } from '@/lib/tickets/schema';

export function StatusBadge({
  status,
  type,
  className,
}: {
  status: TicketStatus;
  type?: TicketType | string | null;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <Badge tone={ticketStatusTone[status]} className={className}>
      {localizedStage(t, type, status)}
    </Badge>
  );
}

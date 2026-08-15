'use client';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/components/layout/preferences-provider';
import { localizedType } from '@/lib/i18n/labels';
import { ticketTypeMeta, type TicketType } from '@/lib/tickets/process';

export function TypeBadge({ type }: { type: TicketType }) {
  const { t } = useI18n();
  const meta = ticketTypeMeta[type];
  return <Badge tone={meta.tone}>{localizedType(t, type)}</Badge>;
}

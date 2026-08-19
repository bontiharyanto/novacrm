'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/components/layout/preferences-provider';
import type { TicketStatus } from '@/lib/tickets/schema';

export type MajorOption = { id: string; number: string; title: string; status: string };
export type ChildTicket = { id: string; number: string; title: string; status: TicketStatus };

export function TicketMajor({
  canBeParent,
  canBeChild,
  parentTicketId,
  parentNumber,
  parentTitle,
  childTickets,
  parents,
  linkableChildren,
  disabled,
  onParentId,
  onSaveParent,
  onLinkChild,
}: {
  canBeParent: boolean;
  canBeChild: boolean;
  parentTicketId?: string;
  parentNumber?: string;
  parentTitle?: string;
  childTickets: ChildTicket[];
  parents: MajorOption[];
  linkableChildren: MajorOption[];
  disabled?: boolean;
  onParentId: (id: string) => void;
  onSaveParent: () => void;
  onLinkChild: (childId: string) => void;
}) {
  const { t } = useI18n();
  const isParent = childTickets.length > 0;
  const showParentPicker = canBeChild && !isParent;
  const showChildren = canBeParent && !parentTicketId;

  if (!showParentPicker && !showChildren) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t.tickets.majorIncident}</p>
      <p className="text-[11px] leading-5 text-zinc-500">{t.tickets.majorHint}</p>

      {showParentPicker ? (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t.tickets.parentTicket}</p>
          <Select value={parentTicketId ?? ''} onChange={(event) => onParentId(event.target.value)}>
            <option value="">{t.tickets.none}</option>
            {parents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.number} · {item.title}
              </option>
            ))}
          </Select>
          <Button size="sm" variant="outline" className="w-full" disabled={disabled} onClick={onSaveParent}>
            {t.tickets.saveParent}
          </Button>
          {parentNumber ? (
            <p className="text-xs text-zinc-400">
              <Link href={`/tickets/${parentTicketId}`} className="font-mono text-blue-300 hover:text-blue-200">
                {parentNumber}
              </Link>
              {parentTitle ? ` · ${parentTitle}` : ''}
            </p>
          ) : null}
        </div>
      ) : null}

      {showChildren ? (
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t.tickets.childTickets}</p>
          {childTickets.length === 0 ? (
            <p className="mt-1 text-xs text-zinc-500">{t.tickets.noneLinked}</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {childTickets.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/tickets/${item.id}`}
                    className="flex items-center justify-between text-xs text-blue-300 hover:text-blue-200"
                  >
                    <span className="truncate font-mono">{item.number}</span>
                    <Badge tone="neutral">{item.status.replace('_', ' ')}</Badge>
                  </Link>
                  <p className="truncate text-[11px] text-zinc-500">{item.title}</p>
                </li>
              ))}
            </ul>
          )}
          <Select
            className="mt-2"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) onLinkChild(event.target.value);
              event.target.value = '';
            }}
          >
            <option value="">{t.tickets.linkChild}</option>
            {linkableChildren.map((item) => (
              <option key={item.id} value={item.id}>
                {item.number} · {item.title}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
    </div>
  );
}

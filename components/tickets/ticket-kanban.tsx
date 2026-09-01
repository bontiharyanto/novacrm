'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TypeBadge } from '@/components/tickets/type-badge';
import { StatusBadge } from '@/components/tickets/status-badge';
import { PriorityBadge } from '@/components/tickets/priority-badge';
import { SlaBadge } from '@/components/tickets/sla-badge';
import { PendingBadge } from '@/components/tickets/pending-badge';
import { formatRelativeId } from '@/lib/utils/dates';
import { useI18n } from '@/components/layout/preferences-provider';
import { localizedStage } from '@/lib/i18n/labels';
import { displayTicketNumber, type TicketType } from '@/lib/tickets/process';
import type { TicketPendingReason, TicketStatus } from '@/lib/tickets/schema';

export type KanbanTicket = {
  id: string;
  number?: string;
  title: string;
  description: string;
  type?: TicketType;
  status: TicketStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requesterName: string;
  createdAt: string;
  dueDate?: string;
  slaResponseAt?: string;
  slaResolveBy?: string;
  slaRespondedAt?: string;
  slaPausedAt?: string;
  slaResponseMinutes?: number;
  slaResolveMinutes?: number;
  pendingReason?: TicketPendingReason;
  pendingNote?: string;
  comments: Array<{ id: string; author: string; comment: string; createdAt: string }>;
  accountName?: string;
  accountCode?: string;
};

const columns: Array<{ key: TicketStatus; label: string }> = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'hold', label: 'Hold' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

function TicketCard({ ticket, isOverlay }: { ticket: KanbanTicket; isOverlay?: boolean }) {
  const { t } = useI18n();
  return (
    <motion.div
      transition={{ duration: 0.2, ease: 'easeOut' }}
      whileHover={isOverlay ? undefined : { y: -2 }}
      className={isOverlay ? 'cursor-grabbing' : undefined}
    >
      <Card className="border-zinc-800 bg-zinc-950/70">
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="font-mono text-base">{displayTicketNumber(ticket.number, ticket.id)}</CardTitle>
            <StatusBadge status={ticket.status} type={ticket.type} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-3 text-sm text-zinc-300">
          <p className="font-medium text-zinc-50">{ticket.title}</p>
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={ticket.type ?? 'incident'} />
            <PriorityBadge priority={ticket.priority} showDot />
            {ticket.accountCode || ticket.accountName ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                {ticket.accountCode || ticket.accountName}
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>{ticket.requesterName}</span>
            <span>{formatRelativeId(ticket.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>{ticket.comments.length} comments</span>
          </div>
          <SlaBadge
            dueDate={ticket.dueDate}
            status={ticket.status}
            slaResponseAt={ticket.slaResponseAt}
            slaResolveBy={ticket.slaResolveBy}
            slaRespondedAt={ticket.slaRespondedAt}
            slaPausedAt={ticket.slaPausedAt}
            slaResponseMinutes={ticket.slaResponseMinutes}
            slaResolveMinutes={ticket.slaResolveMinutes}
          />
          <PendingBadge reason={ticket.pendingReason} note={ticket.pendingNote} />
          {!isOverlay && (
            <Link
              href={`/tickets/${ticket.id}`}
              className="nova-accent-chip inline-flex rounded-md border px-2.5 py-1.5 text-xs font-medium hover:opacity-90"
            >
              {t.tickets.view}
            </Link>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DraggableTicket({ ticket }: { ticket: KanbanTicket }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticket.id,
    data: { status: ticket.status },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      className="cursor-grab active:cursor-grabbing"
      {...listeners}
      {...attributes}
    >
      <TicketCard ticket={ticket} />
    </div>
  );
}

function DroppableColumn({
  column,
  tickets,
}: {
  column: (typeof columns)[number];
  tickets: KanbanTicket[];
}) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[240px] rounded-xl border p-3 ${
        isOver ? 'nova-accent-drop' : 'border-zinc-800 bg-zinc-900/60'
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium uppercase tracking-[0.15em] text-zinc-300">
          {localizedStage(t, 'incident', column.key)}
        </h3>
        <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300">{tickets.length}</span>
      </div>
      <div className="space-y-3">
        {tickets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-950/50 p-4 text-xs text-zinc-500">
            Drop tickets here
          </div>
        ) : (
          tickets.map((ticket) => <DraggableTicket key={ticket.id} ticket={ticket} />)
        )}
      </div>
    </div>
  );
}

export function TicketKanban({
  tickets,
  onStatusChange,
}: {
  tickets: KanbanTicket[];
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const activeTicket = useMemo(() => tickets.find((ticket) => ticket.id === activeId) ?? null, [tickets, activeId]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const nextStatus = String(over.id) as TicketStatus;
    if (!columns.some((column) => column.key === nextStatus)) return;

    const ticket = tickets.find((item) => item.id === String(active.id));
    if (!ticket || ticket.status === nextStatus) return;
    onStatusChange(ticket.id, nextStatus);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {columns.map((column) => (
          <DroppableColumn
            key={column.key}
            column={column}
            tickets={tickets.filter((ticket) => ticket.status === column.key)}
          />
        ))}
      </div>
      <DragOverlay>{activeTicket ? <TicketCard ticket={activeTicket} isOverlay /> : null}</DragOverlay>
    </DndContext>
  );
}

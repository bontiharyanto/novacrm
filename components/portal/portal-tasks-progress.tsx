'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/components/layout/preferences-provider';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import type { TicketTask } from '@/lib/tickets/tasks-schema';

/** Read-only fulfillment progress for the customer portal. */
export function PortalTasksProgress({ ticketId }: { ticketId: string }) {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<TicketTask[]>([]);
  const [sequential, setSequential] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/tickets/${ticketId}/tasks`);
    const payload = await response.json().catch(() => ({}));
    setTasks(payload.data ?? []);
    setSequential(Boolean(payload.sequential));
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('ticket_tasks', load);

  if (tasks.length === 0) return null;

  const done = tasks.filter((row) => row.status === 'done').length;
  const current = tasks.find((row) => row.status === 'open' || row.status === 'in_progress');

  return (
    <section className="nova-surface overflow-hidden rounded-xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.tickets.tasks.title}</p>
        <div className="flex items-center gap-2">
          {sequential ? <Badge tone="info">{t.tickets.tasks.sequential}</Badge> : null}
          <Badge tone={done === tasks.length ? 'success' : 'neutral'}>
            {t.tickets.tasks.progress.replace('{{done}}', String(done)).replace('{{total}}', String(tasks.length))}
          </Badge>
        </div>
      </div>
      <ol className="mt-4 space-y-2">
        {tasks.map((task) => {
          const active = current?.id === task.id;
          return (
            <li
              key={task.id}
              className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 ${
                active ? 'border-zinc-600 bg-zinc-900/80' : 'border-zinc-800/80'
              }`}
            >
              <div className="min-w-0">
                <p className={`text-sm ${task.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                  {task.title}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-zinc-600">{task.number}</p>
              </div>
              <Badge
                tone={
                  task.status === 'done'
                    ? 'success'
                    : task.status === 'in_progress'
                      ? 'info'
                      : task.status === 'cancelled'
                        ? 'neutral'
                        : 'warning'
                }
              >
                {t.tickets.tasks.status[task.status]}
              </Badge>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[11px] leading-4 text-zinc-600">{t.portal.tasksReadOnlyHint}</p>
    </section>
  );
}

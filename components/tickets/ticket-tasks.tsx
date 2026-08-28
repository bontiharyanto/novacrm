'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useI18n } from '@/components/layout/preferences-provider';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { formatRelativeId } from '@/lib/utils/dates';
import {
  taskTypesForTicketType,
  type TicketTask,
  type TicketTaskStatus,
  type TicketTaskType,
} from '@/lib/tickets/tasks-schema';
import type { TicketType } from '@/lib/tickets/schema';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { TaskActivityThread } from '@/components/tickets/task-activity-thread';

type GroupOption = { id: string; name: string };
type AgentOption = { id: string; fullName: string };

function statusTone(status: TicketTaskStatus): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'done') return 'success';
  if (status === 'in_progress') return 'info';
  if (status === 'cancelled') return 'neutral';
  return 'warning';
}

export function TicketTasksPanel({
  ticketId,
  ticketType,
  accountId,
  groups,
  embedded = false,
  onStatsChange,
}: {
  ticketId: string;
  ticketType: TicketType;
  accountId?: string;
  groups: GroupOption[];
  /** Render without outer Card — for use inside a parent tab panel. */
  embedded?: boolean;
  onStatsChange?: (stats: { total: number; done: number; sequential: boolean }) => void;
}) {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<TicketTask[]>([]);
  const [sequential, setSequential] = useState(false);
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<TicketTaskType>(taskTypesForTicketType(ticketType)[0] ?? 'other');
  const [groupId, setGroupId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [activityTaskId, setActivityTaskId] = useState<string | null>(null);

  const typeOptions = useMemo(() => taskTypesForTicketType(ticketType), [ticketType]);
  const doneCount = tasks.filter((row) => row.status === 'done').length;

  const load = useCallback(async () => {
    const response = await fetch(`/api/tickets/${ticketId}/tasks`);
    const payload = await response.json().catch(() => ({}));
    setTasks(payload.data ?? []);
    setSequential(Boolean(payload.sequential));
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    onStatsChange?.({ total: tasks.length, done: doneCount, sequential });
    // Intentionally omit onStatsChange to avoid re-render loops from inline parent callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length, doneCount, sequential]);

  useRealtimeTable('ticket_tasks', load);

  useEffect(() => {
    if (!accountId) {
      setAgents([]);
      return;
    }
    const query = new URLSearchParams({ accountId });
    if (groupId) query.set('groupId', groupId);
    void fetch(`/api/agents?${query}`)
      .then((response) => response.json())
      .then((payload) => setAgents(payload.data ?? []))
      .catch(() => setAgents([]));
  }, [accountId, groupId]);

  async function patchTask(taskId: string, body: Record<string, unknown>) {
    setBusy(true);
    const response = await fetch(`/api/tickets/${ticketId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      toastError(payload.error ?? t.tickets.tasks.updateFailed);
      setBusy(false);
      return;
    }
    toastSuccess(t.tickets.tasks.updated);
    setBusy(false);
    await load();
  }

  async function addTask() {
    if (!title.trim()) return;
    setBusy(true);
    const response = await fetch(`/api/tickets/${ticketId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        taskType,
        groupId: groupId || null,
        assigneeId: assigneeId || null,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      toastError(payload.error ?? t.tickets.tasks.createFailed);
      setBusy(false);
      return;
    }
    setTitle('');
    toastSuccess(t.tickets.tasks.created);
    setBusy(false);
    await load();
  }

  function typeLabel(value: TicketTaskType) {
    return t.tickets.tasks.types[value] ?? value;
  }

  function statusLabel(value: TicketTaskStatus) {
    return t.tickets.tasks.status[value] ?? value;
  }

  const badges = (
    <div className="flex items-center gap-2">
      {sequential ? (
        <Badge tone="info">{t.tickets.tasks.sequential}</Badge>
      ) : (
        <Badge tone="neutral">{t.tickets.tasks.parallel}</Badge>
      )}
      <Badge tone={doneCount === tasks.length && tasks.length > 0 ? 'success' : 'neutral'}>
        {t.tickets.tasks.progress.replace('{{done}}', String(doneCount)).replace('{{total}}', String(tasks.length))}
      </Badge>
    </div>
  );

  const body = (
    <div className="space-y-4">
      {embedded ? <div className="flex justify-end">{badges}</div> : null}
      {tasks.length === 0 ? (
        <p className="text-sm text-zinc-500">{t.tickets.tasks.empty}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <div className="hidden grid-cols-[88px_minmax(0,1.4fr)_100px_120px_120px_100px_88px] gap-2 border-b border-zinc-800 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500 md:grid">
            <span>{t.tickets.tasks.colNumber}</span>
            <span>{t.tickets.tasks.colTitle}</span>
            <span>{t.tickets.tasks.colStatus}</span>
            <span>{t.tickets.tasks.colGroup}</span>
            <span>{t.tickets.tasks.colOwner}</span>
            <span>{t.tickets.tasks.colType}</span>
            <span>{t.tickets.tasks.colActions}</span>
          </div>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="grid gap-2 border-b border-zinc-800/80 px-3 py-2.5 last:border-b-0 md:grid-cols-[88px_minmax(0,1.4fr)_100px_120px_120px_100px_88px] md:items-center"
            >
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500">
                {task.locked ? <Lock className="h-3 w-3 text-amber-400" /> : null}
                {task.number}
              </div>
              <div>
                <p className="text-sm text-zinc-100">{task.title}</p>
                {(task.startedAt || task.completedAt) && (
                  <p className="mt-0.5 text-[11px] text-zinc-600">
                    {task.startedAt ? formatRelativeId(task.startedAt) : '—'}
                    {' → '}
                    {task.completedAt ? formatRelativeId(task.completedAt) : '—'}
                  </p>
                )}
              </div>
              <Badge tone={statusTone(task.status)}>{statusLabel(task.status)}</Badge>
              <p className="truncate text-xs text-zinc-400">{task.groupName ?? '—'}</p>
              <p className="truncate text-xs text-zinc-400">{task.assigneeName ?? '—'}</p>
              <p className="truncate text-xs text-zinc-500">{typeLabel(task.taskType)}</p>
              <div className="flex flex-wrap gap-1">
                {task.status === 'open' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || task.locked}
                    onClick={() => void patchTask(task.id, { status: 'in_progress' })}
                  >
                    {t.tickets.tasks.start}
                  </Button>
                ) : null}
                {task.status === 'in_progress' ? (
                  <Button
                    size="sm"
                    disabled={busy || task.locked}
                    onClick={() => void patchTask(task.id, { status: 'done' })}
                  >
                    {t.tickets.tasks.complete}
                  </Button>
                ) : null}
                {task.status !== 'done' && task.status !== 'cancelled' ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void patchTask(task.id, { status: 'cancelled' })}
                  >
                    {t.tickets.tasks.cancel}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setActivityTaskId((current) => (current === task.id ? null : task.id))}
                >
                  <MessageSquare className="mr-1 h-3.5 w-3.5" />
                  {t.tickets.tasks.activities}
                </Button>
              </div>
              {activityTaskId === task.id ? <TaskActivityThread ticketId={ticketId} taskId={task.id} /> : null}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t.tickets.tasks.add}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="task-title">{t.tickets.tasks.colTitle}</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t.tickets.tasks.titlePlaceholder}
            />
          </div>
          <div className="space-y-1">
            <Label>{t.tickets.tasks.colType}</Label>
            <Select value={taskType} onChange={(event) => setTaskType(event.target.value as TicketTaskType)}>
              {typeOptions.map((value) => (
                <option key={value} value={value}>
                  {typeLabel(value)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t.tickets.tasks.colGroup}</Label>
            <Select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              <option value="">{t.tickets.none}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>{t.tickets.tasks.colOwner}</Label>
            <Select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
              <option value="">{t.tickets.none}</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.fullName}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <Button size="sm" disabled={busy || !title.trim()} onClick={() => void addTask()}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {t.tickets.tasks.add}
        </Button>
      </div>
    </div>
  );

  if (embedded) return body;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm text-zinc-400">{t.tickets.tasks.title}</CardTitle>
          {badges}
        </div>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

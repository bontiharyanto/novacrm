'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useI18n } from '@/components/layout/preferences-provider';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { formatRelativeId } from '@/lib/utils/dates';
import { toastError, toastSuccess } from '@/components/ui/toast';
import type { TaskActivity, TaskActivityKind } from '@/lib/tickets/task-activities-schema';

export function TaskActivityThread({
  ticketId,
  taskId,
  readOnly = false,
}: {
  ticketId: string;
  taskId: string;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<TaskActivityKind>('progress');
  const [customerVisible, setCustomerVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/tickets/${ticketId}/tasks/${taskId}/activities`);
    const payload = await response.json().catch(() => ({}));
    setActivities(payload.data ?? []);
  }, [taskId, ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('task_activities', load);

  async function addActivity() {
    if (!body.trim()) return;
    setBusy(true);
    const response = await fetch(`/api/tickets/${ticketId}/tasks/${taskId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, body, customerVisible }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      toastError(payload.error ?? t.tickets.tasks.activityError);
    } else {
      setBody('');
      setCustomerVisible(false);
      toastSuccess(t.tickets.tasks.activityCreated);
      await load();
    }
    setBusy(false);
  }

  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 sm:col-span-7">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        <MessageSquare className="h-3.5 w-3.5" />
        {t.tickets.tasks.activities}
      </div>
      {activities.length ? (
        <ol className="mt-3 space-y-2">
          {activities.map((activity) => (
            <li key={activity.id} className="border-l border-zinc-700 pl-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                <Badge tone="neutral">{t.tickets.tasks.activityKind[activity.kind]}</Badge>
                <span>{activity.actorName ?? t.common.system}</span>
                <span>{formatRelativeId(activity.createdAt)}</span>
                {activity.customerVisible ? <Badge tone="success">{t.tickets.tasks.visibleToCustomer}</Badge> : null}
              </div>
              <p className="mt-1 text-xs leading-5 text-zinc-300">{activity.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-xs text-zinc-600">{t.tickets.tasks.noActivities}</p>
      )}
      {!readOnly ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
          <Select value={kind} onChange={(event) => setKind(event.target.value as TaskActivityKind)} className="h-9 text-xs">
            {(['progress', 'comment', 'blocker', 'decision', 'handover'] as const).map((value) => (
              <option key={value} value={value}>{t.tickets.tasks.activityKind[value]}</option>
            ))}
          </Select>
          <Input value={body} onChange={(event) => setBody(event.target.value)} placeholder={t.tickets.tasks.activityPlaceholder} className="h-9 text-xs" />
          <Button size="sm" disabled={busy || !body.trim()} onClick={() => void addActivity()}>
            <Send className="mr-1 h-3.5 w-3.5" /> {t.tickets.tasks.addActivity}
          </Button>
          <label className="flex items-center gap-2 text-[11px] text-zinc-500 sm:col-span-3">
            <input type="checkbox" checked={customerVisible} onChange={(event) => setCustomerVisible(event.target.checked)} />
            {t.tickets.tasks.visibleToCustomer}
          </label>
        </div>
      ) : null}
    </div>
  );
}

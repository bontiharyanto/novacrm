'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, MessageSquare, Send } from 'lucide-react';
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
  canPublishActivity = false,
}: {
  ticketId: string;
  taskId: string;
  readOnly?: boolean;
  canPublishActivity?: boolean;
}) {
  const { t } = useI18n();
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<TaskActivityKind>('progress');
  const [customerVisible, setCustomerVisible] = useState(false);
  const [kindFilter, setKindFilter] = useState<'all' | TaskActivityKind>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'internal' | 'customer'>('all');
  const [activityWindow, setActivityWindow] = useState<'all' | '7' | '30'>('all');
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

  const filteredActivities = useMemo(() => {
    const cutoff = activityWindow === 'all'
      ? 0
      : Date.now() - Number(activityWindow) * 24 * 60 * 60 * 1000;
    return activities.filter((activity) => {
      if (kindFilter !== 'all' && activity.kind !== kindFilter) return false;
      if (visibilityFilter === 'internal' && activity.customerVisible) return false;
      if (visibilityFilter === 'customer' && !activity.customerVisible) return false;
      if (cutoff && new Date(activity.createdAt).getTime() < cutoff) return false;
      return true;
    });
  }, [activities, activityWindow, kindFilter, visibilityFilter]);

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
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
          <Filter className="h-3 w-3" /> {t.tickets.tasks.activityFilters}
        </span>
        <Select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as typeof kindFilter)} className="h-7 w-auto min-w-32 px-2 py-0 text-[11px] leading-7">
          <option value="all">{t.tickets.tasks.allActivityKinds}</option>
          {(['progress', 'comment', 'blocker', 'decision', 'status_change', 'handover'] as const).map((value) => (
            <option key={value} value={value}>{t.tickets.tasks.activityKind[value]}</option>
          ))}
        </Select>
        <Select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as typeof visibilityFilter)} className="h-7 w-auto min-w-28 px-2 py-0 text-[11px] leading-7">
          <option value="all">{t.tickets.tasks.allVisibility}</option>
          <option value="internal">{t.tickets.tasks.internalVisibility}</option>
          <option value="customer">{t.tickets.tasks.customerVisibility}</option>
        </Select>
        <Select value={activityWindow} onChange={(event) => setActivityWindow(event.target.value as typeof activityWindow)} className="h-7 w-auto min-w-24 px-2 py-0 text-[11px] leading-7">
          <option value="all">{t.tickets.tasks.allTime}</option>
          <option value="7">{t.tickets.tasks.last7Days}</option>
          <option value="30">{t.tickets.tasks.last30Days}</option>
        </Select>
      </div>
      {filteredActivities.length ? (
        <ol className="mt-3 space-y-2">
          {filteredActivities.map((activity) => (
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
          {canPublishActivity ? (
            <label className="flex items-center gap-2 text-[11px] text-zinc-500 sm:col-span-3">
              <input type="checkbox" checked={customerVisible} onChange={(event) => setCustomerVisible(event.target.checked)} />
              {t.tickets.tasks.visibleToCustomer}
            </label>
          ) : (
            <span className="text-[11px] text-zinc-600 sm:col-span-3">{t.tickets.tasks.internalOnly}</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

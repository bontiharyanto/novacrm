'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { formatRelativeId } from '@/lib/utils/dates';
import { WORKFLOW_ACTIONS, WORKFLOW_EVENTS, type WorkflowRule, type WorkflowRun } from '@/lib/workflows/schema';
import { useI18n } from '@/components/layout/preferences-provider';
import { toastError, toastSuccess } from '@/components/ui/toast';

export function WorkflowDashboard({ canDelete = false }: { canDelete?: boolean }) {
  const { t } = useI18n();
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<WorkflowRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/workflows');
    const payload = await response.json();
    setRules(payload.data ?? []);
    setRuns(payload.runs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('workflow_rules', load);
  useRealtimeTable('workflow_runs', load);

  async function toggle(rule: WorkflowRule) {
    await fetch(`/api/workflows/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    await load();
  }

  async function remove() {
    if (!pending) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/workflows/${pending.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toastError(payload.error ?? t.workflow.deleteFailed);
        return;
      }
      setPending(null);
      await load();
      toastSuccess(t.workflow.deleted);
    } catch {
      toastError(t.workflow.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Automation</p>
          <h1 className="text-2xl font-semibold text-zinc-50">Workflows</h1>
        </div>
        <Link
          href="/workflows/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-500"
        >
          <Plus className="h-3.5 w-3.5" /> New flow
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: 'Flows', value: rules.length },
          { label: 'Active', value: rules.filter((rule) => rule.isActive).length },
          { label: 'Runs', value: runs.length },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{stat.label}</p>
              <p className="mt-1 text-xl font-semibold text-zinc-50">{loading ? '—' : stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          {rules.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">No flows yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Then</th>
                  <th className="px-3 py-2 font-medium">Level</th>
                  <th className="px-3 py-2 font-medium">State</th>
                  <th className="px-3 py-2 font-medium">Opened</th>
                  {canDelete ? <th className="px-3 py-2 font-medium" /> : null}
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="border-b border-zinc-800/80 hover:bg-zinc-900/80">
                    <td className="px-3 py-2.5">
                      <Link href={`/workflows/${rule.id}`} className="text-zinc-50 hover:text-blue-200">
                        {rule.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300">
                      {WORKFLOW_EVENTS.find((item) => item.id === rule.event)?.label ?? rule.event}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300">
                      {WORKFLOW_ACTIONS.find((item) => item.id === rule.action)?.label ?? rule.action}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={rule.complexity === 'complex' ? 'warning' : rule.complexity === 'normal' ? 'info' : 'neutral'}>
                        {rule.complexity}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => void toggle(rule)}>
                        <Badge tone={rule.isActive ? 'success' : 'neutral'}>{rule.isActive ? 'active' : 'off'}</Badge>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500">{formatRelativeId(rule.createdAt)}</td>
                    {canDelete ? (
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setPending(rule)}
                          className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-rose-300"
                          aria-label={t.workflow.delete}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Dialog open={Boolean(pending)} title={t.workflow.deleteTitle} onClose={() => (deleting ? undefined : setPending(null))}>
        <div className="space-y-4">
          <p className="text-sm leading-6 text-zinc-400">{t.workflow.deleteHint}</p>
          {pending ? <p className="text-sm font-medium text-zinc-100">{pending.name}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={deleting} onClick={() => setPending(null)}>
              {t.common.cancel}
            </Button>
            <Button type="button" disabled={deleting} onClick={() => void remove()}>
              {deleting ? t.workflow.saving : t.workflow.delete}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Circle, Clock3, ExternalLink, LockKeyhole } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/components/layout/preferences-provider';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import type {
  DeliveryAssignmentUser,
  DeliveryPhaseStatus,
  DeliveryProject,
} from '@/lib/delivery/schema';
import { DeliveryHandoverPanel } from '@/components/delivery/delivery-handover-panel';
import { TicketTasksPanel } from '@/components/tickets/ticket-tasks';

function statusTone(status: DeliveryPhaseStatus): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'blocked') return 'danger';
  if (status === 'in_progress') return 'info';
  if (status === 'cancelled') return 'neutral';
  return 'warning';
}

function healthTone(health: DeliveryProject['phases'][number]['health']): 'success' | 'warning' | 'danger' {
  if (health === 'blocked') return 'danger';
  if (health === 'at_risk') return 'warning';
  return 'success';
}

function phaseIcon(status: DeliveryPhaseStatus) {
  if (status === 'completed') return Check;
  if (status === 'in_progress') return Clock3;
  return Circle;
}

export function DeliveryProjectDetail({
  projectId,
  readOnly = false,
  canManagePhases = !readOnly,
  canCreateWorkOrder = !readOnly,
  canManageHandover = !readOnly,
  canAcceptHandover = false,
  canCreateTaskActivity = false,
  canManageTasks = false,
  canPublishActivity = false,
  canManageAssignments = false,
  assignmentOptions = { pm: [], dco: [] },
}: {
  projectId: string;
  readOnly?: boolean;
  canManagePhases?: boolean;
  canCreateWorkOrder?: boolean;
  canManageHandover?: boolean;
  canAcceptHandover?: boolean;
  canCreateTaskActivity?: boolean;
  canManageTasks?: boolean;
  canPublishActivity?: boolean;
  canManageAssignments?: boolean;
  assignmentOptions?: {
    pm: DeliveryAssignmentUser[];
    dco: DeliveryAssignmentUser[];
  };
}) {
  const { t } = useI18n();
  const [project, setProject] = useState<DeliveryProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPhase, setSavingPhase] = useState('');
  const [workOrderTitle, setWorkOrderTitle] = useState('');
  const [savingWorkOrder, setSavingWorkOrder] = useState(false);
  const [workOrderMessage, setWorkOrderMessage] = useState('');
  const [assignmentPmId, setAssignmentPmId] = useState('');
  const [assignmentDcoId, setAssignmentDcoId] = useState('');
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState('');

  const load = useCallback(async () => {
    const response = await fetch(`/api/delivery/projects/${projectId}`);
    const payload = await response.json().catch(() => ({}));
    const nextProject = (payload.data ?? null) as DeliveryProject | null;
    setProject(nextProject);
    setAssignmentPmId(nextProject?.pmId ?? '');
    setAssignmentDcoId(nextProject?.dcoId ?? '');
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('delivery_projects', load);
  useRealtimeTable('delivery_phases', load);

  async function updatePhase(phaseId: string, status: DeliveryPhaseStatus) {
    setSavingPhase(phaseId);
    await fetch(`/api/delivery/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phaseId, status }),
    });
    await load();
    setSavingPhase('');
  }

  async function createWorkOrder() {
    if (!workOrderTitle.trim()) return;
    setSavingWorkOrder(true);
    setWorkOrderMessage('');
    try {
      const response = await fetch(`/api/delivery/projects/${projectId}/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: workOrderTitle }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setWorkOrderMessage(payload.error ?? t.common.deliveryWorkOrderFailed);
        return;
      }
      setWorkOrderTitle('');
      setWorkOrderMessage(t.common.deliveryWorkOrderCreated);
      await load();
    } catch {
      setWorkOrderMessage(t.common.deliveryWorkOrderFailed);
    } finally {
      setSavingWorkOrder(false);
    }
  }

  async function saveAssignments() {
    if (!project) return;
    setSavingAssignments(true);
    setAssignmentMessage('');
    try {
      const response = await fetch(`/api/delivery/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pmId: assignmentPmId || null,
          dcoId: assignmentDcoId || null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAssignmentMessage(payload.error ?? t.common.deliveryAssignmentFailed);
        return;
      }
      setProject(payload.data ?? project);
      setAssignmentMessage(t.common.deliveryAssignmentSaved);
    } catch {
      setAssignmentMessage(t.common.deliveryAssignmentFailed);
    } finally {
      setSavingAssignments(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-4 pb-safe md:p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-6xl p-4 text-sm text-zinc-500 md:p-8">
        {t.common.deliveryEmpty}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-safe md:p-8">
      <Link href={readOnly ? '/portal/projects' : '/delivery'} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
        <ArrowLeft className="h-3.5 w-3.5" /> {readOnly ? t.portal.home : t.nav.delivery}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] text-zinc-600">{project.externalProvider} · {project.externalId}</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-zinc-50">{project.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">{project.accountName}</p>
        </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">
              {project.executionMode === 'sequential' ? t.tickets.tasks.sequential : t.tickets.tasks.parallel}
            </Badge>
            <Badge tone={statusTone(project.status)}>{t.common.deliveryStatus[project.status]}</Badge>
          </div>
      </div>

      <section className="nova-surface rounded-xl border p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.common.deliveryProgress}</p>
            <p className="mt-1 text-3xl font-semibold text-zinc-50">{project.progress}%</p>
          </div>
          <p className="max-w-md text-right text-xs leading-5 text-zinc-500">
            {readOnly ? t.common.deliveryReadOnly : project.description || t.common.deliverySubtitle}
          </p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${project.progress}%` }} />
        </div>
      </section>

      <section className="nova-surface rounded-xl border p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.tickets.tasks.title}</p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-100">{t.tickets.tasks.activityPanelTitle}</h2>
          </div>
          <p className="max-w-md text-right text-xs leading-5 text-zinc-500">
            {t.tickets.tasks.activityPanelHint}
          </p>
        </div>
        <div className="mt-4 space-y-4">
          {project.workOrders.filter((order) => order.ticketId).length ? (
            project.workOrders
              .filter((order) => order.ticketId)
              .map((order) => (
                <div key={order.id} className="rounded-lg border border-zinc-800 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-[11px] text-zinc-500">{order.number}</p>
                      <p className="mt-1 text-sm font-medium text-zinc-100">{order.title}</p>
                    </div>
                    <Link
                      href={readOnly ? `/portal/${order.ticketId}` : `/tickets/${order.ticketId}`}
                      className="text-xs text-zinc-500 hover:text-zinc-200"
                    >
                      {t.tickets.view}
                    </Link>
                  </div>
                  <TicketTasksPanel
                    ticketId={order.ticketId as string}
                    ticketType="request"
                    accountId={project.accountId}
                    groups={[]}
                    embedded
                    canEditTasks={canManageTasks}
                    canCreateActivity={canCreateTaskActivity}
                    canPublishActivity={canPublishActivity}
                  />
                </div>
              ))
          ) : (
            <p className="text-sm text-zinc-500">{t.common.deliveryNoWorkOrders}</p>
          )}
        </div>
      </section>

      {!readOnly ? (
        <DeliveryHandoverPanel
          projectId={projectId}
          projectStatus={project.status}
          canManageChecklist={canManageHandover}
          canAccept={canAcceptHandover}
        />
      ) : null}

      <div className={`grid gap-6 ${readOnly ? '' : 'lg:grid-cols-[minmax(0,1fr)_280px]'}`}>
        <section className="nova-surface rounded-xl border p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.common.deliveryPhases}</p>
            {readOnly ? <LockKeyhole className="h-3.5 w-3.5 text-zinc-600" aria-label={t.common.deliveryReadOnly} /> : null}
          </div>
          <ol className="mt-5 space-y-2">
            {project.phases.map((phase, index) => {
              const Icon = phaseIcon(phase.status);
              return (
                <li key={phase.id} className="relative flex gap-3 pb-3 last:pb-0">
                  {index < project.phases.length - 1 ? (
                    <span className="absolute left-[7px] top-5 h-[calc(100%-8px)] w-px bg-zinc-800" />
                  ) : null}
                  <span className={`relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                    phase.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className={`min-w-0 flex-1 rounded-lg border border-zinc-800/80 border-l-2 px-3 py-2.5 ${
                    phase.status === 'completed'
                      ? 'border-l-emerald-500/70'
                      : phase.status === 'in_progress'
                        ? 'border-l-blue-500/70'
                        : phase.status === 'blocked'
                          ? 'border-l-rose-500/70'
                          : 'border-l-zinc-700'
                  }`}>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(132px,160px)] sm:items-center">
                      <div className="min-w-0">
                        <p className="text-sm leading-5 text-zinc-100">{phase.title}</p>
                        <Badge
                          tone={healthTone(phase.health)}
                          className="mt-1"
                          title={t.common.deliveryPhaseHealthReason[phase.healthReason]}
                        >
                          {t.common.deliveryPhaseHealth[phase.health]}
                        </Badge>
                      </div>
                      {readOnly || !canManagePhases ? (
                        <Badge tone={statusTone(phase.status)}>{t.common.deliveryStatus[phase.status]}</Badge>
                      ) : (
                        <Select
                          value={phase.status}
                          disabled={savingPhase === phase.id}
                          onChange={(event) => void updatePhase(phase.id, event.target.value as DeliveryPhaseStatus)}
                          className="h-9 w-full min-w-[132px] px-2.5 py-1 text-xs"
                        >
                          {(['planned', 'in_progress', 'blocked', 'completed', 'cancelled'] as const).map((value) => (
                            <option key={value} value={value}>{t.common.deliveryStatus[value]}</option>
                          ))}
                        </Select>
                      )}
                    </div>
                    {phase.plannedStart || phase.plannedEnd ? (
                      <p className="mt-1 text-[11px] text-zinc-600">{phase.plannedStart ?? '—'} → {phase.plannedEnd ?? '—'}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {!readOnly ? <aside className="space-y-4">
          <section className="nova-surface rounded-xl border p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.common.deliveryPeople}</p>
            {canManageAssignments ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs leading-5 text-zinc-500">{t.common.deliveryAssignmentHint}</p>
                <div className="grid gap-3">
                  <label className="space-y-1.5">
                    <span className="text-[11px] text-zinc-600">{t.common.deliveryPm}</span>
                    <Select value={assignmentPmId} onChange={(event) => setAssignmentPmId(event.target.value)}>
                      <option value="">{t.common.deliveryUnassigned}</option>
                      {assignmentOptions.pm.map((user) => (
                        <option key={user.id} value={user.id}>{user.fullName}</option>
                      ))}
                    </Select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] text-zinc-600">{t.common.deliveryDco}</span>
                    <Select value={assignmentDcoId} onChange={(event) => setAssignmentDcoId(event.target.value)}>
                      <option value="">{t.common.deliveryUnassigned}</option>
                      {assignmentOptions.dco.map((user) => (
                        <option key={user.id} value={user.id}>{user.fullName}</option>
                      ))}
                    </Select>
                  </label>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-zinc-500">{assignmentMessage}</span>
                  <Button size="sm" disabled={savingAssignments} onClick={() => void saveAssignments()}>
                    {t.common.deliveryAssignmentSave}
                  </Button>
                </div>
              </div>
            ) : (
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-[11px] text-zinc-600">{t.common.deliveryPm}</dt>
                  <dd className="mt-1 text-zinc-100">{project.pmName ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-zinc-600">{t.common.deliveryDco}</dt>
                  <dd className="mt-1 text-zinc-100">{project.dcoName ?? '—'}</dd>
                </div>
              </dl>
            )}
          </section>
          {!readOnly && canCreateWorkOrder ? (
            <section className="nova-surface rounded-xl border p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.common.deliveryCreateWorkOrder}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-600">{t.common.deliveryCreateWorkOrderHint}</p>
              <div className="mt-3 flex gap-2">
                <Input
                  value={workOrderTitle}
                  onChange={(event) => setWorkOrderTitle(event.target.value)}
                  placeholder={t.common.deliveryWorkOrderTitle}
                  className="h-9 text-xs"
                />
                <Button size="sm" disabled={savingWorkOrder || !workOrderTitle.trim()} onClick={() => void createWorkOrder()}>
                  {t.common.new}
                </Button>
              </div>
              {workOrderMessage ? <p className="mt-2 text-xs text-zinc-400">{workOrderMessage}</p> : null}
            </section>
          ) : null}
          <section className="nova-surface rounded-xl border p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.common.deliveryWorkOrders}</p>
            {project.workOrders.length ? (
              <div className="mt-3 space-y-2">
                {project.workOrders.map((order) => (
                  <div key={order.id} className="rounded-lg border border-zinc-800 p-3">
                    <p className="font-mono text-[11px] text-zinc-500">{order.number}</p>
                    <p className="mt-1 text-sm text-zinc-100">{order.title}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Badge tone={statusTone(order.status)}>{t.common.deliveryStatus[order.status]}</Badge>
                      {order.ticketId ? <Link href={readOnly ? `/portal/${order.ticketId}` : `/tickets/${order.ticketId}`} className="text-zinc-500 hover:text-zinc-200"><ExternalLink className="h-3.5 w-3.5" /></Link> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="mt-3 text-xs text-zinc-600">{t.common.deliveryNoWorkOrders}</p>}
          </section>
        </aside> : null}
      </div>
    </div>
  );
}

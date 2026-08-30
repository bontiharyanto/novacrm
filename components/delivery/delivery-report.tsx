'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  GitBranch,
  ListTodo,
  RefreshCw,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/components/layout/preferences-provider';
import { formatRelativeId } from '@/lib/utils/dates';
import type { DeliveryReportData, DeliveryReportProject } from '@/lib/delivery/report';

function statusTone(status: string): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'completed' || status === 'accepted' || status === 'accepted_with_conditions' || status === 'done') {
    return 'success';
  }
  if (status === 'blocked' || status === 'rejected') return 'danger';
  if (status === 'in_progress' || status === 'under_review') return 'info';
  if (status === 'cancelled') return 'neutral';
  return 'warning';
}

function riskTone(project: DeliveryReportProject) {
  if (project.status === 'blocked' || project.blockedPhases > 0) return 'danger';
  if (project.overdueTasks > 0 || project.overduePhases > 0 || project.unassignedTasks > 0) return 'warning';
  return 'success';
}

export function DeliveryReport({ initialData }: { initialData: DeliveryReportData | null }) {
  const { t } = useI18n();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const response = await fetch('/api/delivery/reports', { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? t.common.deliveryEmpty);
      setLoading(false);
      return;
    }
    setData(payload.data ?? null);
    setLoading(false);
  }, [t.common.deliveryEmpty]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return <div className="mx-auto max-w-7xl p-4 text-sm text-zinc-500 md:p-8">{t.common.loading}</div>;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl space-y-3 p-4 md:p-8">
        <p className="text-sm text-zinc-400">{error || t.common.deliveryReportNoProjects}</p>
        <Link href="/delivery/dashboard" className="text-sm text-blue-300 hover:text-blue-200">
          {t.common.deliveryCommandCenter}
        </Link>
      </div>
    );
  }

  const metrics = [
    { label: t.common.deliveryProjectsCount, value: data.metrics.totalProjects, icon: ListTodo, tone: 'text-zinc-100' },
    { label: t.common.deliveryAverageProgress, value: `${data.metrics.averageProgress}%`, icon: CheckCircle2, tone: 'text-blue-300' },
    { label: t.common.deliveryOpenWorkOrders, value: data.metrics.openWorkOrders, icon: GitBranch, tone: 'text-blue-300' },
    { label: t.common.deliveryOverdueTasks, value: data.metrics.overdueTasks, icon: CalendarClock, tone: 'text-amber-300' },
    { label: t.common.deliveryReportHandoverPending, value: data.metrics.handoversPending, icon: ShieldCheck, tone: 'text-rose-300' },
    { label: t.common.deliveryReportHypercareProjects, value: data.metrics.hypercareProjects, icon: Timer, tone: 'text-emerald-300' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-safe md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/delivery/dashboard" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> {t.common.deliveryCommandCenter}
          </Link>
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-zinc-500">{t.common.delivery}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">{t.common.deliveryReportTitle}</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">{t.common.deliveryReportSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100"
        >
          <RefreshCw className="h-3.5 w-3.5" /> {t.common.refresh}
        </button>
      </header>

      {error ? <p className="rounded-md border border-rose-900/60 bg-rose-950/20 px-3 py-2 text-xs text-rose-300">{error}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="nova-surface rounded-xl border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{metric.label}</p>
                <Icon className={`h-4 w-4 ${metric.tone}`} />
              </div>
              <p className={`mt-3 text-2xl font-semibold ${metric.tone}`}>{metric.value}</p>
            </div>
          );
        })}
      </section>

      <section className="nova-surface overflow-hidden rounded-xl border">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-medium text-zinc-100">{t.common.deliveryPortfolioProjects}</h2>
          <p className="mt-1 text-xs text-zinc-600">{t.common.deliveryPortfolioProjectsHint}</p>
        </div>
        {data.projects.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-500">{t.common.deliveryReportNoProjects}</p>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {data.projects.map((project) => (
              <div key={project.id} className="px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/delivery/${project.id}`} className="text-sm font-medium text-zinc-100 hover:text-blue-300">
                      {project.name}
                    </Link>
                    <p className="mt-1 text-xs text-zinc-600">{project.accountName ?? t.common.account}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(project.status)}>{t.common.deliveryStatus[project.status as keyof typeof t.common.deliveryStatus] ?? project.status}</Badge>
                    <Badge tone={riskTone(project)}>{project.progress}%</Badge>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-xs text-zinc-500 sm:grid-cols-4">
                  <span>{project.completedTasks}/{project.taskCount} {t.common.deliveryTasks}</span>
                  <span>{project.openTasks} {t.common.deliveryOpenTasks}</span>
                  <span>{project.workOrders.length} {t.common.deliveryWorkOrders}</span>
                  <span>{project.plannedEnd ? `${t.common.deliveryDue}: ${project.plannedEnd}` : t.common.deliveryUnassignedTasks}</span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${project.progress}%` }} />
                </div>
                <div className="mt-4 overflow-x-auto">
                  <div className="min-w-[680px] rounded-lg border border-zinc-800">
                    <div className="grid grid-cols-[minmax(220px,1.6fr)_120px_100px_100px_100px] gap-2 border-b border-zinc-800 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                      <span>{t.common.deliveryReportPhaseBreakdown}</span>
                      <span>{t.common.deliveryPhase}</span>
                      <span>{t.common.deliveryTasks}</span>
                      <span>{t.common.deliveryOverdueTasks}</span>
                      <span>{t.common.deliveryProgress}</span>
                    </div>
                    {project.phases.map((phase) => (
                      <div key={phase.id} className="grid grid-cols-[minmax(220px,1.6fr)_120px_100px_100px_100px] gap-2 border-b border-zinc-800/80 px-3 py-2 text-xs last:border-b-0">
                        <span className="truncate text-zinc-300">{phase.title}</span>
                        <span><Badge tone={statusTone(phase.status)}>{t.common.deliveryStatus[phase.status as keyof typeof t.common.deliveryStatus] ?? phase.status}</Badge></span>
                        <span className="text-zinc-500">{phase.completedTasks}/{phase.taskCount}</span>
                        <span className={phase.overdueTasks ? 'text-amber-300' : 'text-zinc-500'}>{phase.overdueTasks}</span>
                        <span className="text-zinc-500">{percentageLabel(phase.completedTasks, phase.taskCount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span>{t.common.deliveryHandoverTitle}:</span>
                  <Badge tone={statusTone(project.handoverStatus ?? 'not_started')}>
                    {project.handoverStatus
                      ? t.common.deliveryHandoverStatus[project.handoverStatus as keyof typeof t.common.deliveryHandoverStatus] ?? project.handoverStatus
                      : t.common.deliveryReportHandoverNotStarted}
                  </Badge>
                  {project.handoverProgress !== undefined ? <span>{project.handoverProgress}%</span> : null}
                  {project.hypercareEnd ? <span>{t.common.deliveryHandoverHypercare}: {project.hypercareEnd}</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="nova-surface overflow-hidden rounded-xl border">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-5 py-4">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <h2 className="text-sm font-medium text-zinc-100">{t.common.deliveryReportOverdueQueue}</h2>
          </div>
          {data.overdueTasks.length === 0 ? (
            <p className="px-5 py-8 text-sm text-zinc-500">{t.common.deliveryReportNoOverdue}</p>
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {data.overdueTasks.map((task) => (
                <Link key={task.id} href={`/delivery/${task.projectId}`} className="block px-5 py-3 transition-colors hover:bg-zinc-900/70">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-zinc-200">{task.title}</p>
                    <Badge tone={statusTone(task.status)}>{task.status}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-600">{task.projectName}{task.workOrderNumber ? ` · ${task.workOrderNumber}` : ''} · {task.plannedEnd}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="nova-surface overflow-hidden rounded-xl border">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="text-sm font-medium text-zinc-100">{t.common.deliveryReportActivityFeed}</h2>
          </div>
          {data.recentActivities.length === 0 ? (
            <p className="px-5 py-8 text-sm text-zinc-500">{t.common.deliveryReportNoActivity}</p>
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {data.recentActivities.map((activity) => (
                <Link key={activity.id} href={`/delivery/${activity.projectId}`} className="block px-5 py-3 transition-colors hover:bg-zinc-900/70">
                  <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.1em] text-zinc-600">
                    <span>{activity.kind}</span>
                    <span>{formatRelativeId(activity.createdAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-300">{activity.body}</p>
                  <p className="mt-1 text-[11px] text-zinc-600">{activity.projectName} · {activity.taskTitle} · {activity.actorName ?? t.common.system}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function percentageLabel(done: number, total: number) {
  return total > 0 ? `${Math.round((done / total) * 100)}%` : '—';
}

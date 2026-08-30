'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  GitBranch,
  ListTodo,
  RefreshCw,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/components/layout/preferences-provider';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { formatRelativeId } from '@/lib/utils/dates';
import type { DeliveryDashboardData, DeliveryDashboardProject } from '@/lib/delivery/dashboard';

type DashboardView = 'portfolio' | 'execution';

function statusTone(status: string): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'blocked') return 'danger';
  if (status === 'in_progress') return 'info';
  if (status === 'cancelled') return 'neutral';
  return 'warning';
}

function projectRisk(project: DeliveryDashboardProject) {
  if (project.status === 'blocked' || project.blockedPhases > 0) return 'critical';
  if (project.overdueTasks > 0 || project.unassignedTasks > 0 || project.blockerCount > 0) return 'at_risk';
  return 'on_track';
}

export function DeliveryCommandCenter({
  initialData,
  view,
}: {
  initialData: DeliveryDashboardData | null;
  view: DashboardView;
}) {
  const { t } = useI18n();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const portfolio = view === 'portfolio';

  const load = useCallback(async () => {
    const response = await fetch('/api/delivery/dashboard', { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json().catch(() => ({}));
    setData(payload.data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('delivery_projects', load);
  useRealtimeTable('delivery_phases', load);
  useRealtimeTable('ticket_tasks', load);
  useRealtimeTable('task_activities', load);

  const projects = useMemo(() => {
    if (!data) return [];
    return [...data.projects].sort((a, b) => {
      if (portfolio) return b.progress - a.progress;
      return (
        b.overdueTasks - a.overdueTasks ||
        b.blockedPhases - a.blockedPhases ||
        b.unassignedTasks - a.unassignedTasks
      );
    });
  }, [data, portfolio]);

  if (loading && !data) {
    return <div className="mx-auto max-w-7xl p-4 text-sm text-zinc-500 md:p-8">{t.common.loading}</div>;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl space-y-3 p-4 md:p-8">
        <p className="text-sm text-zinc-400">{t.common.deliveryEmpty}</p>
        <Link href="/delivery" className="text-sm text-blue-300 hover:text-blue-200">
          {t.common.delivery}
        </Link>
      </div>
    );
  }

  const metrics = portfolio
    ? [
        { label: t.common.deliveryProjectsCount, value: data.metrics.totalProjects, icon: BriefcaseBusiness, tone: 'text-zinc-100' },
        { label: t.common.deliveryAverageProgress, value: `${data.metrics.averageProgress}%`, icon: CircleDashed, tone: 'text-blue-300' },
        { label: t.common.deliveryAtRisk, value: data.metrics.atRiskProjects, icon: AlertTriangle, tone: 'text-amber-300' },
        { label: t.common.deliveryBlocked, value: data.metrics.blockedProjects, icon: AlertTriangle, tone: 'text-rose-300' },
        { label: t.common.deliveryCompleted, value: data.metrics.completedProjects, icon: CheckCircle2, tone: 'text-emerald-300' },
      ]
    : [
        { label: t.common.deliveryOpenWorkOrders, value: data.metrics.openWorkOrders, icon: BriefcaseBusiness, tone: 'text-blue-300' },
        { label: t.common.deliveryBlockedWorkOrders, value: data.metrics.blockedWorkOrders, icon: AlertTriangle, tone: 'text-rose-300' },
        { label: t.common.deliveryOpenTasks, value: data.metrics.openTasks, icon: ListTodo, tone: 'text-zinc-100' },
        { label: t.common.deliveryOverdueTasks, value: data.metrics.overdueTasks, icon: CalendarClock, tone: 'text-amber-300' },
        { label: t.common.deliveryUnassignedTasks, value: data.metrics.unassignedTasks, icon: UserRound, tone: 'text-amber-300' },
        { label: t.common.deliveryBlockedDependencies, value: data.metrics.blockedDependencies, icon: GitBranch, tone: 'text-rose-300' },
        { label: t.common.deliveryActiveBlockers, value: data.metrics.activeBlockers, icon: AlertTriangle, tone: 'text-rose-300' },
      ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-safe md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{t.common.deliveryCommandCenter}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
            {portfolio ? t.common.deliveryPortfolioTitle : t.common.deliveryExecutionTitle}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            {portfolio ? t.common.deliveryPortfolioSubtitle : t.common.deliveryExecutionSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/delivery"
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100"
          >
                {t.common.delivery}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t.common.refresh}
          </button>
        </div>
      </header>

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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="nova-surface overflow-hidden rounded-xl border">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
            <div>
              <h2 className="text-sm font-medium text-zinc-100">
                {portfolio ? t.common.deliveryPortfolioProjects : t.common.deliveryActionRequired}
              </h2>
              <p className="mt-1 text-xs text-zinc-600">
                {portfolio ? t.common.deliveryPortfolioProjectsHint : t.common.deliveryExecutionQueueHint}
              </p>
            </div>
            <Badge tone={portfolio ? 'info' : 'warning'}>{projects.length}</Badge>
          </div>
          {projects.length === 0 ? (
            <p className="px-5 py-8 text-sm text-zinc-500">{t.common.deliveryEmpty}</p>
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {projects.map((project) => {
                const risk = projectRisk(project);
                return (
                  <Link
                    key={project.id}
                    href={`/delivery/${project.id}`}
                    className="block px-5 py-4 transition-colors hover:bg-zinc-900/70"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-100">{project.name}</p>
                        <p className="mt-1 truncate text-xs text-zinc-600">{project.accountName ?? t.common.account}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={statusTone(project.status)}>
                          {t.common.deliveryStatus[project.status as keyof typeof t.common.deliveryStatus] ?? project.status}
                        </Badge>
                        <span className="text-sm font-semibold text-zinc-200">{project.progress}%</span>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${project.progress}%` }} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                      <span>{project.completedPhases}/{project.phaseCount} {t.common.deliveryPhases}</span>
                      <span>{project.openWorkOrders}/{project.workOrderCount} {t.common.deliveryWorkOrders}</span>
                      <span>{project.openTasks}/{project.taskCount} {t.common.deliveryTasks}</span>
                      {project.plannedEnd ? <span>{t.common.deliveryDue}: {project.plannedEnd}</span> : null}
                      {risk !== 'on_track' ? (
                        <span className={risk === 'critical' ? 'text-rose-300' : 'text-amber-300'}>
                          {risk === 'critical' ? t.common.deliveryCritical : t.common.deliveryAtRisk}
                        </span>
                      ) : null}
                    </div>
                    {!portfolio &&
                    (project.overdueTasks > 0 ||
                      project.overduePhases > 0 ||
                      project.unassignedTasks > 0 ||
                      project.blockedPhases > 0 ||
                      project.blockerCount > 0) ? (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                        {project.overdueTasks > 0 ? <span className="text-amber-300">{project.overdueTasks} {t.common.deliveryOverdueTasks}</span> : null}
                        {project.overduePhases > 0 ? <span className="text-amber-300">{project.overduePhases} {t.common.deliveryOverduePhases}</span> : null}
                        {project.unassignedTasks > 0 ? <span>{project.unassignedTasks} {t.common.deliveryUnassignedTasks}</span> : null}
                        {project.blockedPhases > 0 ? <span className="text-rose-300">{project.blockedPhases} {t.common.deliveryBlockedPhases}</span> : null}
                        {project.blockerCount > 0 ? <span className="text-rose-300">{project.blockerCount} {t.common.deliveryActiveBlockers}</span> : null}
                      </div>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <aside className="nova-surface rounded-xl border">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-5 py-4">
            <Activity className="h-4 w-4 text-blue-300" />
            <div>
              <h2 className="text-sm font-medium text-zinc-100">{t.common.deliveryRecentActivity}</h2>
              <p className="mt-1 text-xs text-zinc-600">{t.common.deliveryRecentActivityHint}</p>
            </div>
          </div>
          {data.recentActivities.length === 0 ? (
            <p className="px-5 py-8 text-sm text-zinc-500">{t.common.deliveryNoRecentActivity}</p>
          ) : (
            <ol className="divide-y divide-zinc-800/80">
              {data.recentActivities.map((activity) => (
                <li key={activity.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.1em] text-zinc-600">
                    <span>{activity.kind}</span>
                    <span>{formatRelativeId(activity.createdAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-300">{activity.body}</p>
                  <p className="mt-1 text-[11px] text-zinc-600">{activity.actorName ?? t.common.system}</p>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </section>
    </div>
  );
}

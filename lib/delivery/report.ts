import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';
import { getSessionProfile } from '@/lib/auth/session';
import { listDeliveryProjects } from '@/lib/delivery/actions';
import { isCustomerRole } from '@/lib/rbac/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { DeliveryPhaseHealth, DeliveryPhaseHealthReason } from '@/lib/delivery/health';

type ReportTaskRow = {
  id: string;
  ticket_id: string;
  delivery_project_id?: string | null;
  delivery_phase_id?: string | null;
  number: string;
  title: string;
  status: string;
  assignee_id?: string | null;
  updated_at: string;
};

type ReportActivityRow = {
  id: string;
  task_id: string;
  actor_id?: string | null;
  kind: string;
  body: string;
  created_at: string;
};

type ReportHandoverRow = {
  project_id: string;
  status: string;
  hypercare_end?: string | null;
};

type ReportHandoverItemRow = {
  project_id: string;
  required: boolean;
  completed: boolean;
};

type ReportSnapshotRow = {
  project_id: string;
  snapshot_date: string;
  progress: number;
  status: string;
};

export type DeliveryReportPhase = {
  id: string;
  title: string;
  status: string;
  health: DeliveryPhaseHealth;
  healthReason: DeliveryPhaseHealthReason;
  plannedEnd?: string;
  taskCount: number;
  completedTasks: number;
  openTasks: number;
  overdueTasks: number;
};

export type DeliveryReportWorkOrder = {
  id: string;
  number: string;
  title: string;
  status: string;
  ticketId?: string;
  taskCount: number;
  completedTasks: number;
  openTasks: number;
};

export type DeliveryReportProject = {
  id: string;
  name: string;
  accountName?: string;
  status: string;
  progress: number;
  plannedEnd?: string;
  phaseCount: number;
  completedPhases: number;
  blockedPhases: number;
  overduePhases: number;
  taskCount: number;
  completedTasks: number;
  openTasks: number;
  overdueTasks: number;
  unassignedTasks: number;
  phases: DeliveryReportPhase[];
  workOrders: DeliveryReportWorkOrder[];
  handoverStatus?: string;
  handoverProgress?: number;
  hypercareEnd?: string;
};

export type DeliveryReportActivity = {
  id: string;
  projectId: string;
  projectName: string;
  workOrderNumber?: string;
  taskId: string;
  taskTitle: string;
  actorName?: string;
  kind: string;
  body: string;
  createdAt: string;
};

export type DeliveryReportOverdueTask = {
  id: string;
  projectId: string;
  projectName: string;
  workOrderNumber?: string;
  title: string;
  status: string;
  plannedEnd: string;
  assigneeName?: string;
};

export type DeliveryReportProgressSnapshot = {
  projectId: string;
  projectName: string;
  snapshotDate: string;
  progress: number;
  status: string;
};

export type DeliveryReportData = {
  generatedAt: string;
  filters: {
    projectId?: string;
    from?: string;
    to?: string;
  };
  metrics: {
    totalProjects: number;
    averageProgress: number;
    openWorkOrders: number;
    openTasks: number;
    overdueTasks: number;
    blockedPhases: number;
    unassignedTasks: number;
    handoversPending: number;
    hypercareProjects: number;
  };
  projects: DeliveryReportProject[];
  overdueTasks: DeliveryReportOverdueTask[];
  recentActivities: DeliveryReportActivity[];
  progressHistory: DeliveryReportProgressSnapshot[];
};

function isTerminal(status: string) {
  return status === 'done' || status === 'cancelled' || status === 'completed';
}

function percentage(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

export type DeliveryReportFilters = {
  projectId?: string;
  from?: string;
  to?: string;
};

function isValidDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseDeliveryReportFilters(input: DeliveryReportFilters): {
  data: Required<Pick<DeliveryReportFilters, 'from' | 'to'>> & Omit<DeliveryReportFilters, 'from' | 'to'>;
  error: string | null;
} {
  const projectId = input.projectId?.trim() || undefined;
  const from = input.from?.trim() || undefined;
  const to = input.to?.trim() || undefined;
  if (from && !isValidDate(from)) return { data: { projectId, from: '', to: '' }, error: 'from must be a valid date' };
  if (to && !isValidDate(to)) return { data: { projectId, from: '', to: '' }, error: 'to must be a valid date' };
  if (from && to && from > to) return { data: { projectId, from: '', to: '' }, error: 'from must be before or equal to to' };
  return { data: { projectId, from: from ?? '', to: to ?? '' }, error: null };
}

function toExclusiveDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

function offsetDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function getDeliveryReport(filters: DeliveryReportFilters = {}): Promise<DeliveryReportData | null> {
  const session = await getSessionProfile();
  if (
    !session ||
    isCustomerRole(session.profile.role) ||
    !(await canAccessConfiguredCapability('read', 'DeliveryReport'))
  ) {
    return null;
  }

  const parsedFilters = parseDeliveryReportFilters(filters);
  if (parsedFilters.error) return null;
  const normalizedFilters = {
    projectId: parsedFilters.data.projectId,
    from: parsedFilters.data.from || undefined,
    to: parsedFilters.data.to || undefined,
  };
  const allProjects = await listDeliveryProjects();
  const projects = normalizedFilters.projectId
    ? allProjects.filter((project) => project.id === normalizedFilters.projectId)
    : allProjects;
  const client = await createSupabaseServerClient();
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const ticketProjectMap = new Map(
    projects.flatMap((project) =>
      project.workOrders
        .filter((order) => order.ticketId)
        .map((order) => [order.ticketId as string, { projectId: project.id, order }] as const),
    ),
  );
  const ticketIds = Array.from(ticketProjectMap.keys());
  const projectIds = projects.map((project) => project.id);
  const reportToday = new Date().toISOString().slice(0, 10);
  const historyTo = normalizedFilters.to ?? reportToday;
  const historyFrom = normalizedFilters.from ?? offsetDate(historyTo, -90);

  const tasksResult = ticketIds.length
    ? await client
        .from('ticket_tasks')
        .select('id, ticket_id, delivery_project_id, delivery_phase_id, number, title, status, assignee_id, updated_at')
        .in('ticket_id', ticketIds)
        .eq('tenant_id', session.profile.tenantId)
    : { data: [], error: null };
  const allTasks = (tasksResult.data ?? []) as ReportTaskRow[];
  const tasks = allTasks.filter((task) => {
    if (normalizedFilters.from && task.updated_at < `${normalizedFilters.from}T00:00:00.000Z`) return false;
    if (normalizedFilters.to && task.updated_at >= toExclusiveDate(normalizedFilters.to)) return false;
    return true;
  });
  const taskIds = allTasks.map((task) => task.id);

  const activitiesPromise = taskIds.length
    ? (() => {
        let query = client
          .from('task_activities')
          .select('id, task_id, actor_id, kind, body, created_at')
          .in('task_id', taskIds)
          .eq('tenant_id', session.profile.tenantId);
        if (normalizedFilters.from) query = query.gte('created_at', `${normalizedFilters.from}T00:00:00.000Z`);
        if (normalizedFilters.to) query = query.lt('created_at', toExclusiveDate(normalizedFilters.to));
        return query.order('created_at', { ascending: false }).limit(20);
      })()
    : Promise.resolve({ data: [], error: null });

  const [activitiesResult, handoversResult, handoverItemsResult, snapshotsResult] = await Promise.all([
    activitiesPromise,
    projectIds.length
      ? client
          .from('delivery_handovers')
          .select('project_id, status, hypercare_end')
          .in('project_id', projectIds)
          .eq('tenant_id', session.profile.tenantId)
      : Promise.resolve({ data: [], error: null }),
    projectIds.length
      ? client
          .from('delivery_handover_items')
          .select('project_id, required, completed')
          .in('project_id', projectIds)
          .eq('tenant_id', session.profile.tenantId)
      : Promise.resolve({ data: [], error: null }),
    projectIds.length
      ? client
          .from('delivery_project_snapshots')
          .select('project_id, snapshot_date, progress, status')
          .in('project_id', projectIds)
          .eq('tenant_id', session.profile.tenantId)
          .gte('snapshot_date', historyFrom)
          .lte('snapshot_date', historyTo)
          .order('snapshot_date', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const activities = (activitiesResult.data ?? []) as ReportActivityRow[];
  const handovers = new Map(
    ((handoversResult.data ?? []) as ReportHandoverRow[]).map((handover) => [handover.project_id, handover]),
  );
  const handoverProgress = new Map<string, { completed: number; required: number }>();
  for (const item of (handoverItemsResult.data ?? []) as ReportHandoverItemRow[]) {
    const current = handoverProgress.get(item.project_id) ?? { completed: 0, required: 0 };
    if (item.required) current.required += 1;
    if (item.required && item.completed) current.completed += 1;
    handoverProgress.set(item.project_id, current);
  }

  const assigneeIds = Array.from(new Set(tasks.map((task) => task.assignee_id).filter(Boolean))) as string[];
  const actorIds = Array.from(new Set(activities.map((activity) => activity.actor_id).filter(Boolean))) as string[];
  const profileIds = Array.from(new Set([...assigneeIds, ...actorIds]));
  const profilesResult = profileIds.length
    ? await client.from('profiles').select('id, full_name').in('id', profileIds).eq('tenant_id', session.profile.tenantId)
    : { data: [] as Array<{ id: string; full_name: string }> };
  const profileNames = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]));

  const taskProjectMap = new Map<string, string>();
  const tasksByProject = new Map<string, ReportTaskRow[]>();
  const includedTaskIds = new Set(tasks.map((task) => task.id));
  for (const task of allTasks) {
    const projectId =
      (task.delivery_project_id && projectMap.has(task.delivery_project_id) ? task.delivery_project_id : undefined) ??
      ticketProjectMap.get(task.ticket_id)?.projectId;
    if (!projectId) continue;
    taskProjectMap.set(task.id, projectId);
    if (!includedTaskIds.has(task.id)) continue;
    const list = tasksByProject.get(projectId) ?? [];
    list.push(task);
    tasksByProject.set(projectId, list);
  }

  const today = normalizedFilters.to ?? reportToday;
  const overdueTasks: DeliveryReportOverdueTask[] = [];
  const reportProjects = projects.map((project) => {
    const projectTasks = tasksByProject.get(project.id) ?? [];
    const phaseRows = project.phases.map((phase) => {
      const phaseTasks = projectTasks.filter((task) => task.delivery_phase_id === phase.id);
      const overdue = phaseTasks.filter((task) => Boolean(phase.plannedEnd && phase.plannedEnd < today && !isTerminal(task.status)));
      overdue.forEach((task) => {
        overdueTasks.push({
          id: task.id,
          projectId: project.id,
          projectName: project.name,
          workOrderNumber: ticketProjectMap.get(task.ticket_id)?.order.number,
          title: task.title,
          status: task.status,
          plannedEnd: phase.plannedEnd as string,
          assigneeName: task.assignee_id ? profileNames.get(task.assignee_id) : undefined,
        });
      });
      return {
        id: phase.id,
        title: phase.title,
        status: phase.status,
        health: phase.health,
        healthReason: phase.healthReason,
        plannedEnd: phase.plannedEnd,
        taskCount: phaseTasks.length,
        completedTasks: phaseTasks.filter((task) => isTerminal(task.status)).length,
        openTasks: phaseTasks.filter((task) => !isTerminal(task.status)).length,
        overdueTasks: overdue.length,
      };
    });
    const handover = handovers.get(project.id);
    const handoverCounts = handoverProgress.get(project.id);
    const projectWorkOrders = project.workOrders.map((order) => {
      const orderTasks = projectTasks.filter((task) => task.ticket_id === order.ticketId);
      return {
        id: order.id,
        number: order.number,
        title: order.title,
        status: order.status,
        ticketId: order.ticketId,
        taskCount: orderTasks.length,
        completedTasks: orderTasks.filter((task) => isTerminal(task.status)).length,
        openTasks: orderTasks.filter((task) => !isTerminal(task.status)).length,
      };
    });
    const completedTasks = projectTasks.filter((task) => isTerminal(task.status)).length;
    const openTasks = projectTasks.length - completedTasks;

    return {
      id: project.id,
      name: project.name,
      accountName: project.accountName,
      status: project.status,
      progress: project.progress,
      plannedEnd: project.plannedEnd,
      phaseCount: project.phases.length,
      completedPhases: project.phases.filter((phase) => isTerminal(phase.status)).length,
      blockedPhases: project.phases.filter((phase) => phase.status === 'blocked').length,
      overduePhases: project.phases.filter(
        (phase) => Boolean(phase.plannedEnd && phase.plannedEnd < today && !isTerminal(phase.status)),
      ).length,
      taskCount: projectTasks.length,
      completedTasks,
      openTasks,
      overdueTasks: phaseRows.reduce((sum, phase) => sum + phase.overdueTasks, 0),
      unassignedTasks: projectTasks.filter((task) => !task.assignee_id && !isTerminal(task.status)).length,
      phases: phaseRows,
      workOrders: projectWorkOrders,
      handoverStatus: handover?.status,
      handoverProgress: handoverCounts ? percentage(handoverCounts.completed, handoverCounts.required) : undefined,
      hypercareEnd: handover?.hypercare_end ?? undefined,
    };
  });

  const projectNameById = new Map(reportProjects.map((project) => [project.id, project.name]));
  const progressHistory = ((snapshotsResult.data ?? []) as ReportSnapshotRow[])
    .filter((snapshot) => projectNameById.has(snapshot.project_id))
    .map((snapshot) => ({
      projectId: snapshot.project_id,
      projectName: projectNameById.get(snapshot.project_id) as string,
      snapshotDate: snapshot.snapshot_date,
      progress: Number(snapshot.progress),
      status: snapshot.status,
    }));
  const recentActivities = activities
    .filter((activity) => taskProjectMap.has(activity.task_id))
    .map((activity) => {
      const projectId = taskProjectMap.get(activity.task_id) as string;
      const task = allTasks.find((row) => row.id === activity.task_id);
      const ticketContext = task ? ticketProjectMap.get(task.ticket_id) : undefined;
      return {
        id: activity.id,
        projectId,
        projectName: projectNameById.get(projectId) ?? 'Delivery project',
        workOrderNumber: ticketContext?.order.number,
        taskId: activity.task_id,
        taskTitle: task?.title ?? 'Task',
        actorName: activity.actor_id ? profileNames.get(activity.actor_id) : undefined,
        kind: activity.kind,
        body: activity.body,
        createdAt: activity.created_at,
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    filters: normalizedFilters,
    metrics: {
      totalProjects: reportProjects.length,
      averageProgress: reportProjects.length
        ? Math.round(reportProjects.reduce((sum, project) => sum + project.progress, 0) / reportProjects.length)
        : 0,
      openWorkOrders: reportProjects.reduce(
        (sum, project) => sum + project.workOrders.filter((order) => !isTerminal(order.status)).length,
        0,
      ),
      openTasks: reportProjects.reduce((sum, project) => sum + project.openTasks, 0),
      overdueTasks: reportProjects.reduce((sum, project) => sum + project.overdueTasks, 0),
      blockedPhases: reportProjects.reduce((sum, project) => sum + project.blockedPhases, 0),
      unassignedTasks: reportProjects.reduce((sum, project) => sum + project.unassignedTasks, 0),
      handoversPending: reportProjects.filter(
        (project) => !['accepted', 'accepted_with_conditions'].includes(project.handoverStatus ?? 'not_started'),
      ).length,
      hypercareProjects: reportProjects.filter(
        (project) => Boolean(project.hypercareEnd && project.hypercareEnd >= today),
      ).length,
    },
    projects: reportProjects,
    overdueTasks: overdueTasks.sort((a, b) => a.plannedEnd.localeCompare(b.plannedEnd)).slice(0, 20),
    recentActivities: recentActivities.slice(0, 20),
    progressHistory,
  };
}

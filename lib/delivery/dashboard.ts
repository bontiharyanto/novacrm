'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { listDeliveryProjects } from '@/lib/delivery/actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type DashboardTaskRow = {
  id: string;
  ticket_id: string;
  delivery_phase_id?: string | null;
  title: string;
  status: string;
  assignee_id?: string | null;
  updated_at: string;
};

type DashboardDependencyRow = {
  predecessor_task_id: string;
  successor_task_id: string;
};

type DashboardActivityRow = {
  id: string;
  task_id: string;
  actor_id?: string | null;
  kind: string;
  body: string;
  created_at: string;
};

export type DeliveryDashboardProject = {
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
  workOrderCount: number;
  openWorkOrders: number;
  taskCount: number;
  openTasks: number;
  overdueTasks: number;
  unassignedTasks: number;
};

export type DeliveryDashboardActivity = {
  id: string;
  taskId: string;
  actorName?: string;
  kind: string;
  body: string;
  createdAt: string;
};

export type DeliveryDashboardData = {
  generatedAt: string;
  metrics: {
    totalProjects: number;
    averageProgress: number;
    blockedProjects: number;
    atRiskProjects: number;
    completedProjects: number;
    openWorkOrders: number;
    blockedWorkOrders: number;
    openTasks: number;
    overdueTasks: number;
    unassignedTasks: number;
    blockedDependencies: number;
  };
  projects: DeliveryDashboardProject[];
  recentActivities: DeliveryDashboardActivity[];
};

function isTerminal(status: string) {
  return status === 'done' || status === 'cancelled' || status === 'completed';
}

export async function getDeliveryDashboard(): Promise<DeliveryDashboardData | null> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'DeliveryProject')) return null;

  const projects = await listDeliveryProjects();
  const client = await createSupabaseServerClient();
  const workOrders = projects.flatMap((project) => project.workOrders);
  const ticketIds = Array.from(new Set(workOrders.map((order) => order.ticketId).filter(Boolean))) as string[];

  const tasksResult = ticketIds.length
    ? await client
        .from('ticket_tasks')
        .select('id, ticket_id, delivery_phase_id, title, status, assignee_id, updated_at')
        .in('ticket_id', ticketIds)
        .eq('tenant_id', session.profile.tenantId)
    : { data: [], error: null };
  const tasks = (tasksResult.data ?? []) as DashboardTaskRow[];
  const taskIds = tasks.map((task) => task.id);

  const [dependenciesResult, activitiesResult] = await Promise.all([
    taskIds.length
      ? client
          .from('task_dependencies')
          .select('predecessor_task_id, successor_task_id')
          .in('successor_task_id', taskIds)
          .eq('tenant_id', session.profile.tenantId)
      : Promise.resolve({ data: [], error: null }),
    taskIds.length
      ? client
          .from('task_activities')
          .select('id, task_id, actor_id, kind, body, created_at')
          .in('task_id', taskIds)
          .eq('tenant_id', session.profile.tenantId)
          .order('created_at', { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const dependencies = (dependenciesResult.data ?? []) as DashboardDependencyRow[];
  const activities = (activitiesResult.data ?? []) as DashboardActivityRow[];
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const phaseMap = new Map(projects.flatMap((project) => project.phases).map((phase) => [phase.id, phase]));
  const today = new Date().toISOString().slice(0, 10);
  const blockedDependencies = dependencies.filter((dependency) => {
    const predecessor = taskMap.get(dependency.predecessor_task_id);
    return predecessor ? !isTerminal(predecessor.status) : false;
  }).length;

  const projectRows = projects.map((project) => {
    const projectTasks = project.workOrders.flatMap((order) =>
      order.ticketId ? tasks.filter((task) => task.ticket_id === order.ticketId) : [],
    );
    const overdueTasks = projectTasks.filter((task) => {
      const phase = task.delivery_phase_id ? phaseMap.get(task.delivery_phase_id) : undefined;
      return Boolean(phase?.plannedEnd && phase.plannedEnd < today && !isTerminal(task.status));
    }).length;
    const blockedPhases = project.phases.filter((phase) => phase.status === 'blocked').length;
    const overduePhases = project.phases.filter(
      (phase) => Boolean(phase.plannedEnd && phase.plannedEnd < today && !isTerminal(phase.status)),
    ).length;
    const openWorkOrders = project.workOrders.filter((order) => !isTerminal(order.status)).length;
    const openTasks = projectTasks.filter((task) => !isTerminal(task.status)).length;

    return {
      id: project.id,
      name: project.name,
      accountName: project.accountName,
      status: project.status,
      progress: project.progress,
      plannedEnd: project.plannedEnd,
      phaseCount: project.phases.length,
      completedPhases: project.phases.filter((phase) => isTerminal(phase.status)).length,
      blockedPhases,
      overduePhases,
      workOrderCount: project.workOrders.length,
      openWorkOrders,
      taskCount: projectTasks.length,
      openTasks,
      overdueTasks,
      unassignedTasks: projectTasks.filter((task) => !task.assignee_id && !isTerminal(task.status)).length,
    };
  });

  const actorIds = Array.from(new Set(activities.map((activity) => activity.actor_id).filter(Boolean))) as string[];
  const actorResult = actorIds.length
    ? await client.from('profiles').select('id, full_name').in('id', actorIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  const actorNames = new Map((actorResult.data ?? []).map((actor) => [actor.id, actor.full_name]));

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      totalProjects: projectRows.length,
      averageProgress: projectRows.length
        ? Math.round(projectRows.reduce((sum, project) => sum + project.progress, 0) / projectRows.length)
        : 0,
      blockedProjects: projectRows.filter((project) => project.status === 'blocked' || project.blockedPhases > 0).length,
      atRiskProjects: projectRows.filter(
        (project) =>
          project.status === 'blocked' ||
          project.overdueTasks > 0 ||
          project.overduePhases > 0 ||
          (project.progress < 50 && project.openTasks > 0),
      ).length,
      completedProjects: projectRows.filter((project) => project.status === 'completed').length,
      openWorkOrders: projectRows.reduce((sum, project) => sum + project.openWorkOrders, 0),
      blockedWorkOrders: workOrders.filter((order) => order.status === 'blocked').length,
      openTasks: projectRows.reduce((sum, project) => sum + project.openTasks, 0),
      overdueTasks: projectRows.reduce((sum, project) => sum + project.overdueTasks, 0),
      unassignedTasks: projectRows.reduce((sum, project) => sum + project.unassignedTasks, 0),
      blockedDependencies,
    },
    projects: projectRows,
    recentActivities: activities.map((activity) => ({
      id: activity.id,
      taskId: activity.task_id,
      actorName: activity.actor_id ? actorNames.get(activity.actor_id) : undefined,
      kind: activity.kind,
      body: activity.body,
      createdAt: activity.created_at,
    })),
  };
}

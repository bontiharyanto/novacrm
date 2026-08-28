'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTicketById } from '@/lib/tickets/actions';
import {
  taskActivityCreateSchema,
  taskDependencyCreateSchema,
  type TaskActivity,
  type TaskDependency,
} from '@/lib/tickets/task-activities-schema';

type ActivityRow = {
  id: string;
  tenant_id: string;
  task_id: string;
  actor_id?: string | null;
  kind: TaskActivity['kind'];
  body: string;
  status_from?: string | null;
  status_to?: string | null;
  customer_visible: boolean;
  created_at: string;
  created_by?: string | null;
  actor_name?: string | null;
};

type DependencyRow = {
  id: string;
  tenant_id: string;
  predecessor_task_id: string;
  successor_task_id: string;
  dependency_type: 'finish_to_start';
  created_at: string;
  created_by?: string | null;
};

function mapActivity(row: ActivityRow): TaskActivity {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    taskId: row.task_id,
    actorId: row.actor_id ?? undefined,
    actorName: row.actor_name ?? undefined,
    kind: row.kind,
    body: row.body,
    statusFrom: row.status_from ?? undefined,
    statusTo: row.status_to ?? undefined,
    customerVisible: row.customer_visible,
    createdAt: row.created_at,
    createdBy: row.created_by ?? undefined,
  };
}

function mapDependency(row: DependencyRow): TaskDependency {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    predecessorTaskId: row.predecessor_task_id,
    successorTaskId: row.successor_task_id,
    dependencyType: row.dependency_type,
    createdAt: row.created_at,
    createdBy: row.created_by ?? undefined,
  };
}

async function assertTaskInTicket(ticketId: string, taskId: string) {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return { ticket: null, session: null, client: null, error: 'Ticket not found' };
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return { ticket: null, session: null, client: null, error: 'Unauthorized' };
  }
  const client = await createSupabaseServerClient();
  const task = await client
    .from('ticket_tasks')
    .select('id')
    .eq('id', taskId)
    .eq('ticket_id', ticketId)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();
  if (task.error || !task.data) return { ticket: null, session: null, client: null, error: 'Task not found' };
  return { ticket, session, client, error: null };
}

export async function listTaskActivities(ticketId: string, taskId: string) {
  const access = await assertTaskInTicket(ticketId, taskId);
  if (!access.client || !access.session) return { data: [], error: access.error };
  const result = await access.client
    .from('task_activities')
    .select('*')
    .eq('task_id', taskId)
    .eq('tenant_id', access.session.profile.tenantId)
    .order('created_at', { ascending: false });
  if (result.error) return { data: [], error: result.error.message };
  const actorIds = Array.from(new Set((result.data ?? []).map((row) => row.actor_id).filter(Boolean)));
  const profiles = actorIds.length
    ? await access.client.from('profiles').select('id, full_name').in('id', actorIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  const names = new Map((profiles.data ?? []).map((row) => [row.id, row.full_name]));
  return {
    data: (result.data ?? []).map((row) => mapActivity({
      ...(row as ActivityRow),
      actor_name: row.actor_id ? names.get(row.actor_id) : null,
    })),
    error: null,
  };
}

export async function createTaskActivity(ticketId: string, taskId: string, input: unknown) {
  const parsed = taskActivityCreateSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid activity' };
  const access = await assertTaskInTicket(ticketId, taskId);
  if (!access.client || !access.session) return { data: null, error: access.error };
  if (!canRole(access.session.profile.role, 'create', 'TaskActivity')) {
    return { data: null, error: 'Unauthorized' };
  }
  const result = await access.client
    .from('task_activities')
    .insert({
      tenant_id: access.session.profile.tenantId,
      task_id: taskId,
      actor_id: access.session.userId,
      kind: parsed.data.kind,
      body: parsed.data.body,
      status_from: parsed.data.statusFrom ?? null,
      status_to: parsed.data.statusTo ?? null,
      customer_visible: parsed.data.customerVisible,
      created_by: access.session.userId,
    })
    .select('*')
    .single();
  if (result.error || !result.data) return { data: null, error: result.error?.message ?? 'Unable to create activity' };
  return { data: mapActivity(result.data as ActivityRow), error: null };
}

export async function listTaskDependencies(ticketId: string, taskId: string) {
  const access = await assertTaskInTicket(ticketId, taskId);
  if (!access.client || !access.session) return { data: [], error: access.error };
  if (!canRole(access.session.profile.role, 'read', 'TaskDependency')) {
    return { data: [], error: 'Unauthorized' };
  }
  const result = await access.client
    .from('task_dependencies')
    .select('*')
    .eq('successor_task_id', taskId)
    .eq('tenant_id', access.session.profile.tenantId)
    .order('created_at');
  if (result.error) return { data: [], error: result.error.message };
  return { data: (result.data ?? []).map((row) => mapDependency(row as DependencyRow)), error: null };
}

export async function createTaskDependency(ticketId: string, successorTaskId: string, input: unknown) {
  const parsed = taskDependencyCreateSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid dependency' };
  const access = await assertTaskInTicket(ticketId, successorTaskId);
  if (!access.client || !access.session) return { data: null, error: access.error };
  if (!canRole(access.session.profile.role, 'create', 'TaskDependency')) {
    return { data: null, error: 'Unauthorized' };
  }
  const predecessor = await access.client
    .from('ticket_tasks')
    .select('id')
    .eq('id', parsed.data.predecessorTaskId)
    .eq('ticket_id', ticketId)
    .eq('tenant_id', access.session.profile.tenantId)
    .maybeSingle();
  if (predecessor.error || !predecessor.data) return { data: null, error: 'Predecessor task not found' };
  const result = await access.client
    .from('task_dependencies')
    .insert({
      tenant_id: access.session.profile.tenantId,
      predecessor_task_id: parsed.data.predecessorTaskId,
      successor_task_id: successorTaskId,
      dependency_type: parsed.data.dependencyType,
      created_by: access.session.userId,
    })
    .select('*')
    .single();
  if (result.error || !result.data) return { data: null, error: result.error?.message ?? 'Unable to create dependency' };
  return { data: mapDependency(result.data as DependencyRow), error: null };
}

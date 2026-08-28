'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { getTicketById } from '@/lib/tickets/actions';
import { createTaskActivity } from '@/lib/tickets/task-activities-actions';
import {
  DEFAULT_CHANGE_STEPS,
  isTaskTerminal,
  parseFulfillmentSteps,
  ticketTaskCreateSchema,
  ticketTaskUpdateSchema,
  type CatalogFulfillmentStep,
  type TicketTask,
  type TicketTaskStatus,
  type TicketTaskType,
} from '@/lib/tickets/tasks-schema';

type TaskRow = {
  id: string;
  tenant_id: string;
  ticket_id: string;
  number: string;
  title: string;
  task_type: string;
  status: string;
  group_id?: string | null;
  assignee_id?: string | null;
  sort_order: number;
  started_at?: string | null;
  completed_at?: string | null;
  customer_visible?: boolean | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  group_name?: string | null;
  assignee_name?: string | null;
};

function mapTask(row: TaskRow, locked = false): TicketTask {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    ticketId: row.ticket_id,
    number: row.number,
    title: row.title,
    taskType: row.task_type as TicketTaskType,
    status: row.status as TicketTaskStatus,
    groupId: row.group_id ?? undefined,
    groupName: row.group_name ?? undefined,
    assigneeId: row.assignee_id ?? undefined,
    assigneeName: row.assignee_name ?? undefined,
    sortOrder: row.sort_order,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    customerVisible: row.customer_visible ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by ?? undefined,
    locked,
  };
}

function withLocked(tasks: TicketTask[], sequential: boolean): TicketTask[] {
  if (!sequential) return tasks.map((task) => ({ ...task, locked: false }));
  const sorted = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  let blocking = false;
  return sorted.map((task) => {
    if (isTaskTerminal(task.status)) {
      return { ...task, locked: false };
    }
    const locked = blocking;
    if (!blocking) blocking = true;
    return { ...task, locked };
  });
}

async function hydrateTasks(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: TaskRow[],
  sequential: boolean,
) {
  const groupIds = Array.from(new Set(rows.map((row) => row.group_id).filter(Boolean))) as string[];
  const assigneeIds = Array.from(new Set(rows.map((row) => row.assignee_id).filter(Boolean))) as string[];
  const [{ data: groups }, { data: profiles }] = await Promise.all([
    groupIds.length
      ? supabase.from('assignment_groups').select('id, name').in('id', groupIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    assigneeIds.length
      ? supabase.from('profiles').select('id, full_name').in('id', assigneeIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> }),
  ]);
  const groupMap = new Map((groups ?? []).map((row) => [row.id, row.name]));
  const nameMap = new Map((profiles ?? []).map((row) => [row.id, row.full_name]));
  const mapped = rows.map((row) =>
    mapTask({
      ...row,
      group_name: row.group_id ? groupMap.get(row.group_id) ?? null : null,
      assignee_name: row.assignee_id ? nameMap.get(row.assignee_id) ?? null : null,
    }),
  );
  return withLocked(mapped, sequential);
}

export async function listTicketTasks(ticketId: string) {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return { data: [] as TicketTask[], sequential: false, error: null as string | null };

  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return { data: [] as TicketTask[], sequential: false, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('ticket_tasks')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .eq('ticket_id', ticketId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return { data: [] as TicketTask[], sequential: ticket.taskSequential ?? false, error: error.message };
  const tasks = await hydrateTasks(supabase, (data ?? []) as TaskRow[], ticket.taskSequential ?? false);
  return { data: tasks, sequential: ticket.taskSequential ?? false, error: null };
}

function assertSequentialAllowed(tasks: TicketTask[], taskId: string, nextStatus: TicketTaskStatus) {
  const target = tasks.find((row) => row.id === taskId);
  if (!target) return 'Task not found';
  if (nextStatus === 'cancelled' || nextStatus === 'open') return null;
  const priors = tasks.filter((row) => row.sortOrder < target.sortOrder);
  const blocked = priors.find((row) => !isTaskTerminal(row.status));
  if (blocked) {
    return `Sequential pipeline: complete “${blocked.title}” (${blocked.number}) first.`;
  }
  return null;
}

export async function createTicketTask(ticketId: string, input: unknown) {
  const parsedResult = ticketTaskCreateSchema.safeParse(input);
  if (!parsedResult.success) {
    return { data: null, error: parsedResult.error.issues[0]?.message ?? 'Invalid task' };
  }
  const parsed = parsedResult.data;
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Ticket')) {
    return { data: null, error: 'Unauthorized' };
  }

  const ticket = await getTicketById(ticketId);
  if (!ticket) return { data: null, error: 'Ticket not found' };

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('ticket_tasks')
    .select('sort_order')
    .eq('ticket_id', ticketId)
    .eq('tenant_id', session.profile.tenantId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const sortOrder = parsed.sortOrder ?? ((existing?.[0]?.sort_order ?? -1) + 1);

  if (ticket.taskSequential) {
    const listed = await listTicketTasks(ticketId);
    const openEarlier = listed.data.some((row) => !isTaskTerminal(row.status));
    if (openEarlier && sortOrder <= Math.max(...listed.data.map((row) => row.sortOrder), -1)) {
      // allow append at end only when sequential
    }
  }

  const { data, error } = await supabase
    .from('ticket_tasks')
    .insert({
      tenant_id: session.profile.tenantId,
      ticket_id: ticketId,
      title: parsed.title,
      task_type: parsed.taskType,
      status: 'open',
      group_id: parsed.groupId ?? null,
      assignee_id: parsed.assigneeId ?? null,
      sort_order: sortOrder,
      created_by: session.userId,
    })
    .select('*')
    .single();

  if (error || !data) return { data: null, error: error?.message ?? 'Unable to create task' };
  const [task] = await hydrateTasks(supabase, [data as TaskRow], ticket.taskSequential ?? false);
  return { data: task, error: null };
}

export async function updateTicketTask(ticketId: string, taskId: string, input: unknown) {
  const parsedResult = ticketTaskUpdateSchema.safeParse(input);
  if (!parsedResult.success) {
    return { data: null, error: parsedResult.error.issues[0]?.message ?? 'Invalid task' };
  }
  const parsed = parsedResult.data;
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Ticket')) {
    return { data: null, error: 'Unauthorized' };
  }

  const ticket = await getTicketById(ticketId);
  if (!ticket) return { data: null, error: 'Ticket not found' };

  const listed = await listTicketTasks(ticketId);
  const supabase = await createSupabaseServerClient();
  if (parsed.status && ticket.taskSequential) {
    const gate = assertSequentialAllowed(listed.data, taskId, parsed.status);
    if (gate) return { data: null, error: gate };
  }
  if (parsed.status && (parsed.status === 'in_progress' || parsed.status === 'done')) {
    const dependencies = await supabase
      .from('task_dependencies')
      .select('predecessor_task_id')
      .eq('successor_task_id', taskId)
      .eq('tenant_id', session.profile.tenantId);
    const predecessorIds = (dependencies.data ?? []).map((row) => row.predecessor_task_id as string);
    const blockedBy = listed.data.find((row) => predecessorIds.includes(row.id) && !isTaskTerminal(row.status));
    if (blockedBy) {
      return { data: null, error: `This task depends on ${blockedBy.number} (${blockedBy.title}) first.` };
    }
  }

  const patch: Record<string, unknown> = {};
  if (parsed.title !== undefined) patch.title = parsed.title;
  if (parsed.taskType !== undefined) patch.task_type = parsed.taskType;
  if (parsed.groupId !== undefined) patch.group_id = parsed.groupId;
  if (parsed.assigneeId !== undefined) patch.assignee_id = parsed.assigneeId;
  if (parsed.sortOrder !== undefined) patch.sort_order = parsed.sortOrder;
  if (parsed.status !== undefined) {
    patch.status = parsed.status;
    if (parsed.status === 'in_progress') {
      const current = listed.data.find((row) => row.id === taskId);
      if (!current?.startedAt) patch.started_at = new Date().toISOString();
      patch.completed_at = null;
    }
    if (parsed.status === 'done') {
      const current = listed.data.find((row) => row.id === taskId);
      if (!current?.startedAt) patch.started_at = new Date().toISOString();
      patch.completed_at = new Date().toISOString();
    }
    if (parsed.status === 'open') {
      patch.started_at = null;
      patch.completed_at = null;
    }
    if (parsed.status === 'cancelled') {
      patch.completed_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('ticket_tasks')
    .update(patch)
    .eq('id', taskId)
    .eq('ticket_id', ticketId)
    .eq('tenant_id', session.profile.tenantId)
    .select('*')
    .single();

  if (error || !data) return { data: null, error: error?.message ?? 'Unable to update task' };
  if (parsed.status) {
    const current = listed.data.find((row) => row.id === taskId);
    void createTaskActivity(ticketId, taskId, {
      kind: 'status_change',
      body: `Task status changed from ${current?.status ?? 'unknown'} to ${parsed.status}.`,
      statusFrom: current?.status,
      statusTo: parsed.status,
      customerVisible: false,
    }).catch(() => undefined);
  }
  const [task] = await hydrateTasks(supabase, [data as TaskRow], ticket.taskSequential ?? false);
  return { data: task, error: null };
}

export async function deleteTicketTask(ticketId: string, taskId: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Ticket')) {
    return { data: null, error: 'Unauthorized' };
  }
  if (!['admin', 'manager', 'supervisor', 'superadmin'].includes(session.profile.role)) {
    return { data: null, error: 'Only supervisors can delete tasks' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('ticket_tasks')
    .delete()
    .eq('id', taskId)
    .eq('ticket_id', ticketId)
    .eq('tenant_id', session.profile.tenantId);

  if (error) return { data: null, error: error.message };
  return { data: { id: taskId }, error: null };
}

export async function seedTicketTasksFromSteps(input: {
  tenantId: string;
  ticketId: string;
  createdBy?: string | null;
  steps: CatalogFulfillmentStep[];
  sequential: boolean;
  groupId?: string | null;
}) {
  if (!input.steps.length) return;

  const client = hasServiceRole() ? createSupabaseAdminClient() : await createSupabaseServerClient();
  await client
    .from('tickets')
    .update({ task_sequential: input.sequential })
    .eq('id', input.ticketId)
    .eq('tenant_id', input.tenantId);

  const rows = input.steps.map((step, index) => ({
    tenant_id: input.tenantId,
    ticket_id: input.ticketId,
    title: step.title,
    task_type: step.taskType,
    status: 'open',
    group_id: input.groupId ?? null,
    sort_order: step.sortOrder ?? index,
    created_by: input.createdBy ?? null,
  }));

  await client.from('ticket_tasks').insert(rows);
}

/** Called after ticket insert when catalog/change templates apply. */
export async function maybeCreateTasksForNewTicket(ticket: {
  id: string;
  tenantId: string;
  type: string;
  catalogItemId?: string;
  groupId?: string;
  createdBy?: string;
}) {
  try {
    const client = hasServiceRole() ? createSupabaseAdminClient() : await createSupabaseServerClient();

    if (ticket.catalogItemId) {
      const { data: item } = await client
        .from('catalog_items')
        .select('fulfillment_steps, fulfillment_sequential')
        .eq('id', ticket.catalogItemId)
        .eq('tenant_id', ticket.tenantId)
        .maybeSingle();
      const steps = parseFulfillmentSteps(item?.fulfillment_steps);
      if (steps.length) {
        await seedTicketTasksFromSteps({
          tenantId: ticket.tenantId,
          ticketId: ticket.id,
          createdBy: ticket.createdBy,
          steps,
          sequential: item?.fulfillment_sequential !== false,
          groupId: ticket.groupId,
        });
        return;
      }
    }

    if (ticket.type === 'change') {
      await seedTicketTasksFromSteps({
        tenantId: ticket.tenantId,
        ticketId: ticket.id,
        createdBy: ticket.createdBy,
        steps: DEFAULT_CHANGE_STEPS,
        sequential: true,
        groupId: ticket.groupId,
      });
    }
  } catch {
    // Task seeding must not fail ticket create.
  }
}

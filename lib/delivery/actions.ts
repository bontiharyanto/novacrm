'use server';

import { requireAccountId } from '@/lib/accounts/scope';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { isCustomerRole } from '@/lib/rbac/roles';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createTicket } from '@/lib/tickets/actions';
import { pushDeliveryEvent } from '@/lib/delivery/integration';
import {
  deliveryPhaseUpdateSchema,
  deliveryProjectInputSchema,
  deliveryProjectUpdateSchema,
  deliveryWorkOrderInputSchema,
  type DeliveryPhase,
  type DeliveryPhaseStatus,
  type DeliveryProject,
  type DeliveryWebhookPayload,
} from '@/lib/delivery/schema';
import {
  calculateDeliveryProgress,
  deriveProjectStatus,
  STANDARD_DELIVERY_PHASES,
} from '@/lib/delivery/templates';

type ProjectRow = {
  id: string;
  tenant_id: string;
  account_id: string;
  external_provider: string;
  external_id: string;
  name: string;
  description: string;
  status: DeliveryProject['status'];
  execution_mode: DeliveryProject['executionMode'];
  pm_id?: string | null;
  dco_id?: string | null;
  planned_start?: string | null;
  planned_end?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
};

type PhaseRow = {
  id: string;
  project_id: string;
  work_order_id?: string | null;
  phase_key: string;
  title: string;
  status: DeliveryPhaseStatus;
  sort_order: number;
  customer_visible: boolean;
  planned_start?: string | null;
  planned_end?: string | null;
  completed_at?: string | null;
};

type WorkOrderRow = {
  id: string;
  project_id: string;
  ticket_id?: string | null;
  external_provider: string;
  external_id: string;
  number: string;
  title: string;
  status: DeliveryPhaseStatus;
};

function mapPhase(row: PhaseRow): DeliveryPhase {
  return {
    id: row.id,
    projectId: row.project_id,
    workOrderId: row.work_order_id ?? undefined,
    phaseKey: row.phase_key,
    title: row.title,
    status: row.status,
    sortOrder: row.sort_order,
    customerVisible: row.customer_visible,
    plannedStart: row.planned_start ?? undefined,
    plannedEnd: row.planned_end ?? undefined,
    completedAt: row.completed_at ?? undefined,
  };
}

async function hydrateProjects(
  client: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: ProjectRow[],
  customerOnly = false,
) {
  if (!rows.length) return [] as DeliveryProject[];
  const projectIds = rows.map((row) => row.id);
  const accountIds = rows.map((row) => row.account_id);
  const [phasesResult, ordersResult, accountsResult, profilesResult] = await Promise.all([
    client.from('delivery_phases').select('*').in('project_id', projectIds).order('sort_order'),
    client.from('delivery_work_orders').select('*').in('project_id', projectIds).order('created_at'),
    client.from('accounts').select('id, name').in('id', accountIds),
    client.from('profiles').select('id, full_name').in('id', rows.flatMap((row) => [row.pm_id, row.dco_id]).filter(Boolean)),
  ]);
  const phaseMap = new Map<string, DeliveryPhase[]>();
  for (const raw of (phasesResult.data ?? []) as PhaseRow[]) {
    if (customerOnly && !raw.customer_visible) continue;
    const list = phaseMap.get(raw.project_id) ?? [];
    list.push(mapPhase(raw));
    phaseMap.set(raw.project_id, list);
  }
  const orderMap = new Map<string, WorkOrderRow[]>();
  for (const raw of (ordersResult.data ?? []) as WorkOrderRow[]) {
    const list = orderMap.get(raw.project_id) ?? [];
    list.push(raw);
    orderMap.set(raw.project_id, list);
  }
  const accountMap = new Map((accountsResult.data ?? []).map((row) => [row.id, row.name]));
  const profileMap = new Map((profilesResult.data ?? []).map((row) => [row.id, row.full_name]));

  return rows.map((row) => {
    const phases = phaseMap.get(row.id) ?? [];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      accountId: row.account_id,
      accountName: accountMap.get(row.account_id),
      externalProvider: row.external_provider,
      externalId: row.external_id,
      name: row.name,
      description: row.description,
      status: row.status,
      executionMode: row.execution_mode,
      pmId: row.pm_id ?? undefined,
      pmName: row.pm_id ? profileMap.get(row.pm_id) : undefined,
      dcoId: row.dco_id ?? undefined,
      dcoName: row.dco_id ? profileMap.get(row.dco_id) : undefined,
      plannedStart: row.planned_start ?? undefined,
      plannedEnd: row.planned_end ?? undefined,
      completedAt: row.completed_at ?? undefined,
      progress: calculateDeliveryProgress(phases),
      phases,
      workOrders: (orderMap.get(row.id) ?? []).map((order) => ({
        id: order.id,
        projectId: order.project_id,
        ticketId: order.ticket_id ?? undefined,
        externalProvider: order.external_provider,
        externalId: order.external_id,
        number: order.number,
        title: order.title,
        status: order.status,
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } satisfies DeliveryProject;
  });
}

async function getReadableProjectsQuery() {
  const session = await getSessionProfile();
  if (
    !session ||
    (!isCustomerRole(session.profile.role) && !canRole(session.profile.role, 'read', 'DeliveryProject'))
  ) {
    return { session: null, client: null, accountId: null, error: 'Unauthorized' as string | null };
  }
  const client = await createSupabaseServerClient();
  const requested = await requireAccountId(session);
  return {
    session,
    client,
    accountId: requested.accountId,
    error: requested.error,
  };
}

export async function listDeliveryProjects() {
  const { session, client, accountId, error } = await getReadableProjectsQuery();
  if (!session || !client || error) return [];
  let query = client
    .from('delivery_projects')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .order('updated_at', { ascending: false });
  if (accountId) query = query.eq('account_id', accountId);
  const result = await query;
  return hydrateProjects(client, (result.data ?? []) as ProjectRow[], isCustomerRole(session.profile.role));
}

export async function getDeliveryProject(projectId: string) {
  const { session, client, accountId, error } = await getReadableProjectsQuery();
  if (!session || !client || error) return { data: null, error: error ?? 'Unauthorized' };
  let query = client
    .from('delivery_projects')
    .select('*')
    .eq('id', projectId)
    .eq('tenant_id', session.profile.tenantId);
  if (accountId) query = query.eq('account_id', accountId);
  const result = await query.maybeSingle();
  if (result.error || !result.data) return { data: null, error: result.error?.message ?? 'Project not found' };
  const [project] = await hydrateProjects(client, [result.data as ProjectRow], isCustomerRole(session.profile.role));
  return { data: project ?? null, error: null };
}

export async function createDeliveryProject(input: unknown) {
  const parsed = deliveryProjectInputSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid delivery project' };
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'DeliveryProject')) {
    return { data: null, error: 'Unauthorized' };
  }
  const client = await createSupabaseServerClient();
  const values = parsed.data;
  const { data, error } = await client
    .from('delivery_projects')
    .insert({
      tenant_id: session.profile.tenantId,
      account_id: values.accountId,
      external_provider: values.externalProvider,
      external_id: values.externalId,
      name: values.name,
      description: values.description,
      status: values.status,
      execution_mode: values.executionMode,
      pm_id: values.pmId ?? null,
      dco_id: values.dcoId ?? null,
      planned_start: values.plannedStart ?? null,
      planned_end: values.plannedEnd ?? null,
      created_by: session.userId,
    })
    .select('*')
    .single();
  if (error || !data) return { data: null, error: error?.message ?? 'Unable to create project' };
  const phases = STANDARD_DELIVERY_PHASES.map((phase) => ({
    tenant_id: session.profile.tenantId,
    project_id: data.id,
    phase_key: phase.key,
    title: phase.title,
    sort_order: phase.sortOrder,
    customer_visible: phase.customerVisible,
    created_by: session.userId,
  }));
  const phaseResult = await client.from('delivery_phases').insert(phases);
  if (phaseResult.error) return { data: null, error: phaseResult.error.message };
  const [project] = await hydrateProjects(client, [data as ProjectRow]);
  return { data: project ?? null, error: null };
}

export async function updateDeliveryProject(projectId: string, input: unknown) {
  const parsed = deliveryProjectUpdateSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid project update' };
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'DeliveryProject')) {
    return { data: null, error: 'Unauthorized' };
  }
  const client = await createSupabaseServerClient();
  if (parsed.data.status === 'completed') {
    const handover = await client
      .from('delivery_handovers')
      .select('status, hypercare_end')
      .eq('project_id', projectId)
      .eq('tenant_id', session.profile.tenantId)
      .maybeSingle();
    const hypercareComplete = !handover.data?.hypercare_end || handover.data.hypercare_end <= new Date().toISOString().slice(0, 10);
    if (
      handover.error ||
      !handover.data ||
      !['accepted', 'accepted_with_conditions'].includes(handover.data.status) ||
      !hypercareComplete
    ) {
      return { data: null, error: 'Project can only be closed after Operations acceptance and hypercare completion.' };
    }
  }
  const patch: Record<string, unknown> = {};
  const values = parsed.data;
  if (values.name !== undefined) patch.name = values.name;
  if (values.description !== undefined) patch.description = values.description;
  if (values.status !== undefined) patch.status = values.status;
  if (values.executionMode !== undefined) patch.execution_mode = values.executionMode;
  if (values.pmId !== undefined) patch.pm_id = values.pmId ?? null;
  if (values.dcoId !== undefined) patch.dco_id = values.dcoId ?? null;
  if (values.plannedStart !== undefined) patch.planned_start = values.plannedStart;
  if (values.plannedEnd !== undefined) patch.planned_end = values.plannedEnd;
  const result = await client
    .from('delivery_projects')
    .update(patch)
    .eq('id', projectId)
    .eq('tenant_id', session.profile.tenantId)
    .select('*')
    .single();
  if (result.error || !result.data) return { data: null, error: result.error?.message ?? 'Unable to update project' };
  const [project] = await hydrateProjects(client, [result.data as ProjectRow]);
  return { data: project ?? null, error: null };
}

export async function updateDeliveryPhase(projectId: string, phaseId: string, input: unknown) {
  const parsed = deliveryPhaseUpdateSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid phase update' };
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'DeliveryPhase')) {
    return { data: null, error: 'Unauthorized' };
  }
  const patch: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) {
    patch.status = parsed.data.status;
    patch.completed_at = parsed.data.status === 'completed' || parsed.data.status === 'cancelled' ? new Date().toISOString() : null;
  }
  if (parsed.data.customerVisible !== undefined) patch.customer_visible = parsed.data.customerVisible;
  if (parsed.data.plannedStart !== undefined) patch.planned_start = parsed.data.plannedStart;
  if (parsed.data.plannedEnd !== undefined) patch.planned_end = parsed.data.plannedEnd;
  const client = await createSupabaseServerClient();
  const result = await client
    .from('delivery_phases')
    .update(patch)
    .eq('id', phaseId)
    .eq('project_id', projectId)
    .eq('tenant_id', session.profile.tenantId)
    .select('*')
    .single();
  if (result.error || !result.data) return { data: null, error: result.error?.message ?? 'Unable to update phase' };

  const phasesResult = await client.from('delivery_phases').select('status').eq('project_id', projectId);
  const status = deriveProjectStatus((phasesResult.data ?? []) as Array<{ status: DeliveryPhaseStatus }>);
  const handoverResult = await client
    .from('delivery_handovers')
    .select('status')
    .eq('project_id', projectId)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();
  const handoverAccepted = ['accepted', 'accepted_with_conditions'].includes(handoverResult.data?.status ?? '');
  const effectiveStatus = status === 'completed' && !handoverAccepted ? 'in_progress' : status;
  const taskStatus =
    parsed.data.status === 'completed' || parsed.data.status === 'cancelled'
      ? 'done'
      : parsed.data.status === 'in_progress'
        ? 'in_progress'
        : 'open';
  if (parsed.data.status) {
    const linkedTasks = await client
      .from('ticket_tasks')
      .select('id')
      .eq('delivery_phase_id', phaseId)
      .eq('tenant_id', session.profile.tenantId);
    await client
      .from('ticket_tasks')
      .update({
        status: taskStatus,
        started_at: taskStatus === 'in_progress' || taskStatus === 'done' ? new Date().toISOString() : null,
        completed_at: taskStatus === 'done' ? new Date().toISOString() : null,
      })
      .eq('delivery_phase_id', phaseId)
      .eq('tenant_id', session.profile.tenantId);
    if (linkedTasks.data?.length) {
      await client.from('task_activities').insert(
        linkedTasks.data.map((task) => ({
          tenant_id: session.profile.tenantId,
          task_id: task.id,
          actor_id: session.userId,
          kind: 'status_change',
          body: `Delivery phase changed to ${parsed.data.status}.`,
          status_to: parsed.data.status,
          customer_visible: Boolean(result.data.customer_visible),
          created_by: session.userId,
        })),
      );
    }
  }
  await client
    .from('delivery_projects')
    .update({ status: effectiveStatus, completed_at: effectiveStatus === 'completed' ? new Date().toISOString() : null })
    .eq('id', projectId)
    .eq('tenant_id', session.profile.tenantId);
  void pushDeliveryEvent({
    tenantId: session.profile.tenantId,
    provider: 'work_order_crm',
    eventType: 'phase.updated',
    projectId,
    idempotencyKey: `phase.updated:${phaseId}:${parsed.data.status ?? 'visibility'}`,
    payload: { phaseId, status: parsed.data.status, customerVisible: parsed.data.customerVisible },
  }).catch(() => undefined);
  return { data: mapPhase(result.data as PhaseRow), error: null };
}

export async function createDeliveryWorkOrder(projectId: string, input: unknown) {
  const parsed = deliveryWorkOrderInputSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid work order' };
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'DeliveryWorkOrder')) {
    return { data: null, error: 'Unauthorized' };
  }
  const project = await getDeliveryProject(projectId);
  if (!project.data) return { data: null, error: project.error ?? 'Project not found' };

  const ticket = await createTicket({
    accountId: project.data.accountId,
    title: parsed.data.title,
    description: parsed.data.description || `Delivery work order for ${project.data.name}`,
    type: 'request',
    status: 'open',
    priority: 'medium',
    category: 'delivery',
    requesterName: project.data.accountName ?? session.profile.fullName,
  });
  if (ticket.error || !ticket.data) return { data: null, error: ticket.error ?? 'Unable to create delivery request' };

  const client = await createSupabaseServerClient();
  await client
    .from('tickets')
    .update({ task_sequential: project.data.executionMode === 'sequential' })
    .eq('id', ticket.data.id)
    .eq('tenant_id', session.profile.tenantId);
  await client
    .from('tickets')
    .update({ delivery_project_id: projectId })
    .eq('id', ticket.data.id)
    .eq('tenant_id', session.profile.tenantId);
  const result = await client
    .from('delivery_work_orders')
    .insert({
      tenant_id: session.profile.tenantId,
      project_id: projectId,
      ticket_id: ticket.data.id,
      external_provider: 'novacrm',
      external_id: `NOVACRM-${ticket.data.id}`,
      number: ticket.data.number,
      title: parsed.data.title,
      status: 'open',
      created_by: session.userId,
    })
    .select('*')
    .single();
  if (result.error || !result.data) return { data: null, error: result.error?.message ?? 'Unable to create work order' };
  const taskTypeByPhase: Record<string, string> = {
    feasibility: 'feasibility',
    allocate: 'allocate',
    install: 'install',
    provision: 'provision',
    test: 'test',
    validate: 'validate_ci',
    handover: 'handover',
  };
  const taskResult = await client.from('ticket_tasks').insert(
    project.data.phases.map((phase) => ({
      tenant_id: session.profile.tenantId,
      ticket_id: ticket.data.id,
      delivery_project_id: projectId,
      delivery_phase_id: phase.id,
      title: phase.title,
      customer_title: phase.title,
      customer_visible: phase.customerVisible,
      task_type: taskTypeByPhase[phase.phaseKey] ?? 'fulfillment_other',
      status: phase.status === 'completed' || phase.status === 'cancelled'
        ? 'done'
        : phase.status === 'in_progress'
          ? 'in_progress'
          : 'open',
      sort_order: phase.sortOrder,
      created_by: session.userId,
    })),
  ).select('id, delivery_phase_id');
  if (taskResult.error) return { data: null, error: taskResult.error.message };
  const taskRows = (taskResult.data ?? []) as Array<{ id: string; delivery_phase_id: string }>;
  if (taskRows.length) {
    await client.from('task_activities').insert(
      taskRows.map((task) => ({
        tenant_id: session.profile.tenantId,
        task_id: task.id,
        actor_id: session.userId,
        kind: 'progress',
        body: 'Task created from the delivery phase template.',
        customer_visible: false,
        created_by: session.userId,
      })),
    );
  }
  if (project.data.executionMode === 'sequential') {
    const phaseOrder = new Map(project.data.phases.map((phase) => [phase.id, phase.sortOrder]));
    const sortedTasks = [...taskRows].sort((a, b) => (phaseOrder.get(a.delivery_phase_id) ?? 0) - (phaseOrder.get(b.delivery_phase_id) ?? 0));
    if (sortedTasks.length > 1) {
      await client.from('task_dependencies').insert(
        sortedTasks.slice(1).map((task, index) => ({
          tenant_id: session.profile.tenantId,
          predecessor_task_id: sortedTasks[index].id,
          successor_task_id: task.id,
          dependency_type: 'finish_to_start',
          created_by: session.userId,
        })),
      );
    }
  }
  void pushDeliveryEvent({
    tenantId: session.profile.tenantId,
    provider: 'work_order_crm',
    eventType: 'work_order.created',
    projectId,
    idempotencyKey: `work_order.created:${ticket.data.id}`,
    payload: { ticketId: ticket.data.id, number: ticket.data.number, title: parsed.data.title },
  }).catch(() => undefined);
  return { data: result.data, error: null };
}

export async function ingestDeliveryWebhook(
  tenantId: string,
  provider: string,
  payload: DeliveryWebhookPayload,
) {
  const client = createSupabaseAdminClient();
  const idempotencyKey = `${payload.eventType}:${payload.eventId}`;
  const event = await client
    .from('integration_events')
    .insert({
      tenant_id: tenantId,
      provider,
      direction: 'inbound',
      event_type: payload.eventType,
      external_event_id: payload.eventId,
      idempotency_key: idempotencyKey,
      payload,
      status: 'processing',
      attempts: 1,
    })
    .select('id')
    .maybeSingle();
  if (event.error?.code === '23505') return { data: { duplicate: true }, error: null };
  if (event.error) return { data: null, error: event.error.message };

  try {
    let accountId = payload.project.accountId;
    if (!accountId && payload.project.accountExternalId) {
      const accountResult = await client
        .from('accounts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('external_provider', provider)
        .eq('external_id', payload.project.accountExternalId)
        .maybeSingle();
      accountId = accountResult.data?.id as string | undefined;
    }
    if (!accountId) throw new Error('Account mapping is required before accepting this delivery project');
    const projectResult = await client
      .from('delivery_projects')
      .upsert({
        tenant_id: tenantId,
        account_id: accountId,
        external_provider: provider,
        external_id: payload.project.externalId,
        name: payload.project.name,
        description: payload.project.description ?? '',
        status: payload.project.status ?? 'planned',
        execution_mode: payload.project.executionMode ?? 'sequential',
        planned_start: payload.project.plannedStart ?? null,
        planned_end: payload.project.plannedEnd ?? null,
        source_payload: payload,
      }, { onConflict: 'tenant_id,external_provider,external_id' })
      .select('*')
      .single();
    if (projectResult.error || !projectResult.data) throw new Error(projectResult.error?.message ?? 'Project upsert failed');
    const projectId = projectResult.data.id as string;
    if (payload.phases?.length) {
      await client.from('delivery_phases').upsert(
        payload.phases.map((phase, index) => ({
          tenant_id: tenantId,
          project_id: projectId,
          phase_key: phase.key,
          title: phase.title,
          status: phase.status ?? 'planned',
          sort_order: phase.sortOrder ?? index,
          customer_visible: phase.customerVisible ?? true,
          planned_start: phase.plannedStart ?? null,
          planned_end: phase.plannedEnd ?? null,
          source_payload: phase,
        })),
        { onConflict: 'project_id,phase_key' },
      );
    }
    if (payload.workOrder) {
      await client.from('delivery_work_orders').upsert({
        tenant_id: tenantId,
        project_id: projectId,
        external_provider: provider,
        external_id: payload.workOrder.externalId,
        number: payload.workOrder.number,
        title: payload.workOrder.title,
        status: payload.workOrder.status ?? 'open',
        source_payload: payload.workOrder,
      }, { onConflict: 'tenant_id,external_provider,external_id' });
    }
    if (event.data?.id) {
      await client.from('integration_events').update({
        status: 'processed',
        processed_at: new Date().toISOString(),
      }).eq('id', event.data.id);
    }
    return { data: { projectId }, error: null };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Webhook processing failed';
    if (event.data?.id) {
      await client.from('integration_events').update({ status: 'failed', last_error: message }).eq('id', event.data.id);
    }
    return { data: null, error: message };
  }
}

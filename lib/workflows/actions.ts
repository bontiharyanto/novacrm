'use server';

import { workflowSchema, workflowUpdateSchema, type WorkflowRule, type WorkflowRun } from '@/lib/workflows/schema';
import {
  definitionFromLegacy,
  emptyDefinition,
  eventFromDefinition,
  primaryActionFromDefinition,
  complexityFromDefinition,
} from '@/lib/workflows/graph';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { enqueueWorkflow } from '@/lib/queue/workflow.queue';
import type { TicketRecord } from '@/lib/tickets/mappers';

type WorkflowRow = {
  id: string;
  tenant_id: string;
  name: string;
  event: WorkflowRule['event'];
  action: WorkflowRule['action'];
  target?: string | null;
  is_active?: boolean | null;
  definition?: WorkflowRule['definition'] | null;
  created_at: string;
};

function mapRule(row: WorkflowRow): WorkflowRule {
  const definition =
    row.definition && row.definition.nodes?.length
      ? row.definition
      : definitionFromLegacy(row.event, row.action, row.target ?? undefined);
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    event: eventFromDefinition(definition, row.event),
    action: primaryActionFromDefinition(definition, row.action),
    target: row.target ?? undefined,
    isActive: row.is_active !== false,
    complexity: complexityFromDefinition(definition),
    definition,
    createdAt: row.created_at,
  };
}

export async function listWorkflowRules() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Workflow')) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('workflow_rules')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapRule(row as WorkflowRow));
}

export async function getWorkflowById(ruleId: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Workflow')) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('workflow_rules')
    .select('*')
    .eq('id', ruleId)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();

  return data ? mapRule(data as WorkflowRow) : null;
}

export async function listWorkflowRuns(ruleId?: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Workflow')) {
    return [] as WorkflowRun[];
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('workflow_runs')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .order('created_at', { ascending: false })
    .limit(12);
  if (ruleId) query = query.eq('rule_id', ruleId);

  const { data } = await query;
  return (data ?? []).map((row) => ({
    id: row.id,
    ruleId: row.rule_id ?? undefined,
    ticketId: row.ticket_id ?? undefined,
    event: row.event,
    status: row.status,
    result: (row.result ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  }));
}

export async function createWorkflowRule(input: unknown) {
  const parsed = workflowSchema.parse(input);
  const session = await getSessionProfile();

  if (!session || !canRole(session.profile.role, 'create', 'Workflow')) {
    return { data: null, error: 'Unauthorized' };
  }

  const definition = parsed.definition ?? emptyDefinition();
  const event = eventFromDefinition(definition, parsed.event);
  const action = primaryActionFromDefinition(definition, parsed.action);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('workflow_rules')
    .insert({
      tenant_id: session.profile.tenantId,
      name: parsed.name,
      event,
      action,
      target: parsed.target ?? null,
      is_active: parsed.isActive ?? true,
      definition,
      created_by: session.userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create workflow' };
  }

  return { data: mapRule(data as WorkflowRow), error: null };
}

export async function updateWorkflowRule(ruleId: string, input: unknown) {
  const parsed = workflowUpdateSchema.parse(input);
  const session = await getSessionProfile();

  if (!session || !canRole(session.profile.role, 'update', 'Workflow')) {
    return { data: null, error: 'Unauthorized' };
  }

  const patch: Record<string, unknown> = {};
  if (parsed.name !== undefined) patch.name = parsed.name;
  if (parsed.isActive !== undefined) patch.is_active = parsed.isActive;
  if (parsed.target !== undefined) patch.target = parsed.target;
  if (parsed.definition) {
    patch.definition = parsed.definition;
    patch.event = eventFromDefinition(parsed.definition);
    patch.action = primaryActionFromDefinition(parsed.definition);
  }
  if (parsed.event && !parsed.definition) patch.event = parsed.event;
  if (parsed.action && !parsed.definition) patch.action = parsed.action;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('workflow_rules')
    .update(patch)
    .eq('id', ruleId)
    .eq('tenant_id', session.profile.tenantId)
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to update workflow' };
  }

  return { data: mapRule(data as WorkflowRow), error: null };
}

export async function evaluateWorkflow(
  event: WorkflowRule['event'],
  context: Record<string, unknown>,
  ticket?: TicketRecord,
) {
  const tenantId = typeof context.tenantId === 'string' ? context.tenantId : ticket?.tenantId;
  const ticketId = typeof context.ticketId === 'string' ? context.ticketId : ticket?.id;
  if (!tenantId || !ticketId) {
    return { data: [], error: null };
  }

  try {
    const { createSupabaseAdminClient, hasServiceRole } = await import('@/lib/supabase/admin');
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    const supabase = hasServiceRole() ? createSupabaseAdminClient() : await createSupabaseServerClient();
    const { data } = await supabase
      .from('workflow_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('event', event)
      .eq('is_active', true);

    const rules = (data ?? []).map((row) => mapRule(row as WorkflowRow));
    const queued = [];
    for (const rule of rules) {
      const result = await enqueueWorkflow({
        tenantId,
        ruleId: rule.id,
        ruleName: rule.name,
        event,
        ticketId,
        ticket: ticket
          ? {
              id: ticket.id,
              number: ticket.number,
              title: ticket.title,
              type: ticket.type,
              status: ticket.status,
              priority: ticket.priority,
              accountId: ticket.accountId,
              requesterName: ticket.requesterName,
              requesterEmail: ticket.requesterEmail,
              requesterPhone: ticket.requesterPhone,
              assigneeId: ticket.assigneeId,
              assigneeName: ticket.assigneeName,
              assigneeChatId: ticket.assigneeChatId,
              category: ticket.category,
            }
          : { id: ticketId, title: String(context.title ?? 'Ticket'), status: String(context.status ?? 'open'), category: typeof context.category === 'string' ? context.category : undefined },
      });
      queued.push({ ruleId: rule.id, name: rule.name, queued: result.ok });
    }
    return { data: queued, error: null };
  } catch {
    return { data: [], error: null };
  }
}

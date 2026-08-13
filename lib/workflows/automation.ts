'use server';

import { z } from 'zod';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type WorkflowEvent = 'ticket.create' | 'ticket.status_change' | 'ticket.comment_add';

export type WorkflowRule = {
  id: string;
  name: string;
  event: WorkflowEvent;
  action: 'send_email' | 'assign' | 'change_status' | 'create_asset';
  target?: string;
  createdAt: string;
};

const workflowSchema = z.object({
  name: z.string().min(1).max(200),
  event: z.enum(['ticket.create', 'ticket.status_change', 'ticket.comment_add']),
  action: z.enum(['send_email', 'assign', 'change_status', 'create_asset']),
  target: z.string().optional(),
});

type WorkflowRow = {
  id: string;
  name: string;
  event: WorkflowEvent;
  action: WorkflowRule['action'];
  target?: string | null;
  created_at: string;
};

function mapRule(row: WorkflowRow): WorkflowRule {
  return {
    id: row.id,
    name: row.name,
    event: row.event,
    action: row.action,
    target: row.target ?? undefined,
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

export async function createWorkflowRule(input: unknown) {
  const parsed = workflowSchema.parse(input);
  const session = await getSessionProfile();

  if (!session || !canRole(session.profile.role, 'create', 'Workflow')) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('workflow_rules')
    .insert({
      tenant_id: session.profile.tenantId,
      name: parsed.name,
      event: parsed.event,
      action: parsed.action,
      target: parsed.target,
      created_by: session.userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create workflow rule' };
  }

  return { data: mapRule(data as WorkflowRow), error: null };
}

export async function evaluateWorkflow(event: WorkflowEvent, context: Record<string, unknown>) {
  const tenantId = typeof context.tenantId === 'string' ? context.tenantId : null;
  if (!tenantId) {
    return { data: [], error: null };
  }

  try {
    const { createSupabaseAdminClient, hasServiceRole } = await import('@/lib/supabase/admin');
    const supabase = hasServiceRole() ? createSupabaseAdminClient() : await createSupabaseServerClient();
    const { data } = await supabase
      .from('workflow_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('event', event)
      .eq('is_active', true);

    return {
      data: (data ?? []).map((rule) => ({
        ruleId: rule.id,
        name: rule.name,
        action: rule.action,
        target: rule.target,
        context,
      })),
      error: null,
    };
  } catch {
    return { data: [], error: null };
  }
}

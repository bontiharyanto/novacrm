export type WorkflowEvent =
  | 'ticket.create'
  | 'ticket.status_change'
  | 'ticket.comment_add';

export type WorkflowRule = {
  id: string;
  name: string;
  event: WorkflowEvent;
  action: 'send_email' | 'assign' | 'change_status' | 'create_asset';
  target?: string;
  createdAt: string;
};

const rules: WorkflowRule[] = [
  {
    id: 'wf-1',
    name: 'Auto acknowledge new ticket',
    event: 'ticket.create',
    action: 'send_email',
    target: 'requester',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'wf-2',
    name: 'Escalate high priority',
    event: 'ticket.status_change',
    action: 'assign',
    target: 'ops-team',
    createdAt: new Date().toISOString(),
  },
];

export async function listWorkflowRules() {
  return rules;
}

export async function createWorkflowRule(input: unknown) {
  const payload = input as Partial<WorkflowRule> & { name?: string; event?: WorkflowEvent; action?: WorkflowRule['action'] };

  const rule: WorkflowRule = {
    id: `WF-${Date.now()}`,
    name: payload.name || 'New workflow rule',
    event: payload.event || 'ticket.create',
    action: payload.action || 'send_email',
    target: payload.target,
    createdAt: new Date().toISOString(),
  };

  rules.push(rule);
  return { data: rule, error: null };
}

export async function evaluateWorkflow(event: WorkflowEvent, context: Record<string, unknown>) {
  const matches = rules.filter((rule) => rule.event === event);

  return {
    data: matches.map((rule) => ({
      ruleId: rule.id,
      name: rule.name,
      action: rule.action,
      target: rule.target,
      context,
    })),
    error: null,
  };
}

import type {
  WorkflowAction,
  WorkflowComplexity,
  WorkflowDefinition,
  WorkflowEvent,
  WorkflowNode,
  WorkflowTicketContext,
} from '@/lib/workflows/schema';
import { WORKFLOW_EVENTS } from '@/lib/workflows/schema';

const EVENT_IDS = new Set(WORKFLOW_EVENTS.map((item) => item.id));

export function emptyDefinition(): WorkflowDefinition {
  return definitionFromLegacy('ticket.create', 'send_email', 'requester');
}

export function definitionFromLegacy(
  event: WorkflowEvent,
  action: WorkflowAction,
  target?: string,
): WorkflowDefinition {
  return {
    nodes: [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 80, y: 160 },
        data: { event, label: event },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 380, y: 160 },
        data: { action, target, label: action },
      },
    ],
    edges: [{ id: 'e1', source: 'trigger', target: 'action-1' }],
  };
}

export function eventFromDefinition(definition: WorkflowDefinition, fallback: WorkflowEvent = 'ticket.create'): WorkflowEvent {
  const trigger = definition.nodes.find((node) => node.type === 'trigger');
  const event = trigger?.data.event;
  if (event && EVENT_IDS.has(event)) return event;
  return fallback;
}

export function primaryActionFromDefinition(definition: WorkflowDefinition, fallback: WorkflowAction = 'send_email') {
  const actions = orderedActionNodes(definition, eventFromDefinition(definition));
  return actions[0]?.data.action ?? fallback;
}

export function complexityFromDefinition(definition: WorkflowDefinition): WorkflowComplexity {
  const conditions = definition.nodes.filter((node) => node.type === 'condition').length;
  const actions = definition.nodes.filter((node) => node.type === 'action').length;
  if (conditions > 0) return 'complex';
  if (actions >= 3) return 'normal';
  return 'standard';
}

function evaluateCondition(node: WorkflowNode, ticket: WorkflowTicketContext) {
  const field = node.data.condition ?? 'priority';
  const expected = (node.data.matchValue ?? node.data.matchPriority ?? '').trim();
  if (!expected) return true;
  const actual =
    field === 'priority'
      ? ticket.priority
      : field === 'type'
        ? ticket.type
        : field === 'status'
          ? ticket.status
          : ticket.category;
  return actual === expected;
}

export function orderedActionNodes(
  definition: WorkflowDefinition,
  event: WorkflowEvent,
  ticket: WorkflowTicketContext = {},
): WorkflowNode[] {
  const trigger = definition.nodes.find((node) => node.type === 'trigger' && (node.data.event ?? event) === event);
  if (!trigger) return [];

  const outgoing = new Map<string, Array<{ target: string; handle?: string }>>();
  for (const edge of definition.edges) {
    const list = outgoing.get(edge.source) ?? [];
    list.push({ target: edge.target, handle: edge.sourceHandle });
    outgoing.set(edge.source, list);
  }

  const ordered: WorkflowNode[] = [];
  const seen = new Set<string>();
  const queue = [...(outgoing.get(trigger.id) ?? []).map((item) => item.target)];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = definition.nodes.find((item) => item.id === id);
    if (!node) continue;

    if (node.type === 'action' && node.data.action) {
      ordered.push(node);
      for (const next of outgoing.get(id) ?? []) queue.push(next.target);
      continue;
    }

    if (node.type === 'condition') {
      const pass = evaluateCondition(node, ticket);
      const wanted = pass ? 'yes' : 'no';
      const branches = outgoing.get(id) ?? [];
      const matched = branches.filter((item) => (item.handle || 'yes') === wanted);
      const next = matched.length > 0 ? matched : branches;
      for (const item of next) queue.push(item.target);
    }
  }

  return ordered;
}

export function triggerMatches(
  definition: WorkflowDefinition,
  event: WorkflowEvent,
  ticket: WorkflowTicketContext,
) {
  const trigger = definition.nodes.find((node) => node.type === 'trigger');
  if (!trigger) return false;
  if ((trigger.data.event ?? event) !== event) return false;
  if (trigger.data.matchPriority && trigger.data.matchPriority !== ticket.priority) return false;
  if (trigger.data.matchType && trigger.data.matchType !== ticket.type) return false;
  if (trigger.data.matchCategory && trigger.data.matchCategory !== ticket.category) return false;
  return true;
}

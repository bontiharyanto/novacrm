import type { CiEdge, CiGraphNode } from '@/lib/cmdb/graph';

/** Failure propagates along outbound edges of these types. */
export const OUTBOUND_IMPACT_RELATIONS = new Set(['connects', 'protects', 'hosts']);

/** Dependents are impacted via inbound edges of these types when the root CI fails. */
export const INBOUND_IMPACT_RELATIONS = new Set(['depends_on', 'uses', 'runs_on', 'hosted_on']);

/** Network-style links — traverse in both directions. */
export const BIDIRECTIONAL_IMPACT_RELATIONS = new Set(['connects']);

export function normalizeRelationType(type: string) {
  return type.trim().toLowerCase().replace(/\s+/g, '_');
}

export function canTraverseOutbound(type: string) {
  const norm = normalizeRelationType(type);
  return OUTBOUND_IMPACT_RELATIONS.has(norm) || BIDIRECTIONAL_IMPACT_RELATIONS.has(norm);
}

export function canTraverseInbound(type: string) {
  const norm = normalizeRelationType(type);
  return INBOUND_IMPACT_RELATIONS.has(norm) || BIDIRECTIONAL_IMPACT_RELATIONS.has(norm);
}

/**
 * Directed impact expansion from a failed root CI.
 * Unlike undirected BFS, respects relation semantics (depends_on, uses, connects, …).
 */
export function expandCiImpact(
  rootId: string,
  byId: Map<string, CiGraphNode>,
  outbound: Map<string, CiEdge[]>,
  inbound: Map<string, CiEdge[]>,
): Set<string> {
  const seen = new Set<string>();
  if (!byId.has(rootId)) return seen;

  const queue = [rootId];
  seen.add(rootId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of outbound.get(current) ?? []) {
      if (!canTraverseOutbound(edge.type)) continue;
      if (!seen.has(edge.targetId) && byId.has(edge.targetId)) {
        seen.add(edge.targetId);
        queue.push(edge.targetId);
      }
    }
    for (const edge of inbound.get(current) ?? []) {
      if (!canTraverseInbound(edge.type)) continue;
      if (!seen.has(edge.sourceId) && byId.has(edge.sourceId)) {
        seen.add(edge.sourceId);
        queue.push(edge.sourceId);
      }
    }
  }

  return seen;
}

export function relationImpactLabel(type: string) {
  const norm = normalizeRelationType(type);
  if (OUTBOUND_IMPACT_RELATIONS.has(norm)) return 'downstream';
  if (INBOUND_IMPACT_RELATIONS.has(norm)) return 'dependent';
  if (BIDIRECTIONAL_IMPACT_RELATIONS.has(norm)) return 'network';
  return 'none';
}

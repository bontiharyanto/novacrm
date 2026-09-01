export type CiGraphNode = {
  id: string;
  name: string;
  type: string;
  asset_id?: string | null;
  attributes?: Record<string, unknown> | null;
  relations?: Array<{ targetId: string; type: string }> | null;
};

export type CiEdge = { sourceId: string; targetId: string; type: string };

export function buildCiGraph(items: CiGraphNode[]) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const inbound = new Map<string, string[]>();
  const inboundEdges = new Map<string, CiEdge[]>();
  const outboundEdges = new Map<string, CiEdge[]>();

  for (const item of items) {
    for (const relation of item.relations ?? []) {
      if (!byId.has(relation.targetId)) continue;
      const edge: CiEdge = { sourceId: item.id, targetId: relation.targetId, type: relation.type };
      const outList = outboundEdges.get(item.id) ?? [];
      outList.push(edge);
      outboundEdges.set(item.id, outList);
      const inList = inboundEdges.get(relation.targetId) ?? [];
      inList.push(edge);
      inboundEdges.set(relation.targetId, inList);
      const legacy = inbound.get(relation.targetId) ?? [];
      legacy.push(item.id);
      inbound.set(relation.targetId, legacy);
    }
  }

  return { byId, inbound, inboundEdges, outboundEdges };
}

/** Undirected reachability — used for CMDB explorer / broad impact view. */
export function expandCiReach(
  rootId: string,
  byId: Map<string, CiGraphNode>,
  inbound: Map<string, string[]>,
): Set<string> {
  const seen = new Set<string>();
  if (!byId.has(rootId)) return seen;

  const queue = [rootId];
  seen.add(rootId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = byId.get(current);
    for (const relation of node?.relations ?? []) {
      if (!seen.has(relation.targetId) && byId.has(relation.targetId)) {
        seen.add(relation.targetId);
        queue.push(relation.targetId);
      }
    }
    for (const sourceId of inbound.get(current) ?? []) {
      if (!seen.has(sourceId)) {
        seen.add(sourceId);
        queue.push(sourceId);
      }
    }
  }

  return seen;
}

export function ciMatchesLocation(
  ci: CiGraphNode,
  location: string,
  assets?: Array<{ id: string; name: string; location?: string | null }>,
): boolean {
  const hay = location.trim().toLowerCase();
  if (hay.length < 2) return false;

  const parts = [ci.name, String(ci.attributes?.site ?? ''), String(ci.attributes?.floor ?? '')].join(' ').toLowerCase();
  if (parts.includes(hay)) return true;

  const words = hay.split(/[\s,/_-]+/).filter((word) => word.length > 2);
  if (words.some((word) => parts.includes(word))) return true;

  if (ci.asset_id && assets) {
    const asset = assets.find((row) => row.id === ci.asset_id);
    const assetHay = `${asset?.name ?? ''} ${asset?.location ?? ''}`.toLowerCase();
    if (assetHay.includes(hay) || words.some((word) => assetHay.includes(word))) return true;
  }

  return false;
}

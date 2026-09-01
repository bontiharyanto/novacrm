import { expandCiImpact } from '@/lib/cmdb/impact-rules';
import { buildCiGraph, ciMatchesLocation, type CiEdge, type CiGraphNode } from '@/lib/cmdb/graph';
import {
  estateIpsInAffectedSubnets,
  ipMatchesAffectedSubnets,
  type IpSegmentRef,
} from '@/lib/cmdb/ip-match';
import { displayTicketNumber } from '@/lib/tickets/process';
import type { SupabaseClient } from '@supabase/supabase-js';

export const ACTIVE_MAJOR_STATUSES = ['open', 'in_progress', 'waiting', 'hold'] as const;

export type MajorRow = {
  id: string;
  number?: string | null;
  title: string;
  status: string;
  cmdb_item_id?: string | null;
  asset_id?: string | null;
};

export type MajorImpactContext = {
  items: CiGraphNode[];
  byId: Map<string, CiGraphNode>;
  inbound: Map<string, string[]>;
  inboundEdges: Map<string, CiEdge[]>;
  outboundEdges: Map<string, CiEdge[]>;
  estateCiIds: Set<string>;
  estateAssetIds: Set<string>;
  assetRows: Array<{ id: string; name: string; location?: string | null }>;
  ipSegments: IpSegmentRef[];
  parentIds: Set<string>;
  majors: MajorRow[];
};

export async function loadMajorImpactContext(
  client: SupabaseClient,
  tenantId: string,
  accountId: string,
): Promise<MajorImpactContext> {
  const [{ data: ciRows }, { data: assetRows }, { data: childLinks }, { data: majors }, { data: segmentRows }] =
    await Promise.all([
      client
        .from('cmdb_items')
        .select('id, name, type, asset_id, attributes, relations')
        .eq('tenant_id', tenantId)
        .eq('account_id', accountId),
      client
        .from('assets')
        .select('id, name, location')
        .eq('tenant_id', tenantId)
        .eq('account_id', accountId)
        .neq('status', 'retired'),
      client
        .from('tickets')
        .select('parent_ticket_id')
        .eq('tenant_id', tenantId)
        .eq('account_id', accountId)
        .not('parent_ticket_id', 'is', null),
      client
        .from('tickets')
        .select('id, number, title, status, cmdb_item_id, asset_id')
        .eq('tenant_id', tenantId)
        .eq('account_id', accountId)
        .eq('type', 'incident')
        .is('parent_ticket_id', null)
        .in('status', [...ACTIVE_MAJOR_STATUSES]),
      client
        .from('ip_segments')
        .select('cidr, cmdb_item_id')
        .eq('tenant_id', tenantId)
        .eq('account_id', accountId),
    ]);

  const items = (ciRows ?? []) as CiGraphNode[];
  const { byId, inbound, inboundEdges, outboundEdges } = buildCiGraph(items);
  const estateCiIds = new Set(items.map((item) => item.id));
  const estateAssetIds = new Set<string>();

  for (const asset of assetRows ?? []) {
    estateAssetIds.add(asset.id);
  }
  for (const item of items) {
    if (item.asset_id) estateAssetIds.add(item.asset_id);
  }

  return {
    items,
    byId,
    inbound,
    inboundEdges,
    outboundEdges,
    estateCiIds,
    estateAssetIds,
    assetRows: assetRows ?? [],
    ipSegments: (segmentRows ?? []) as IpSegmentRef[],
    parentIds: new Set(
      (childLinks ?? []).map((row) => row.parent_ticket_id).filter((id): id is string => Boolean(id)),
    ),
    majors: (majors ?? []) as MajorRow[],
  };
}

export function resolveRootCiId(major: MajorRow, items: CiGraphNode[]): string | undefined {
  if (major.cmdb_item_id) return major.cmdb_item_id;
  if (!major.asset_id) return undefined;
  return items.find((item) => item.asset_id === major.asset_id)?.id;
}

export function expandMajorImpact(rootId: string, ctx: MajorImpactContext): Set<string> {
  return expandCiImpact(rootId, ctx.byId, ctx.outboundEdges, ctx.inboundEdges);
}

export function hasCiOverlap(
  affected: Set<string>,
  estateCiIds: Set<string>,
  items: CiGraphNode[],
  estateAssetIds: Set<string>,
) {
  for (const ciId of Array.from(estateCiIds)) {
    if (affected.has(ciId)) return true;
  }
  for (const item of items) {
    if (item.asset_id && affected.has(item.id) && estateAssetIds.has(item.asset_id)) {
      return true;
    }
  }
  return false;
}

export type MajorMatchInput = {
  location?: string;
  site?: string;
  clientIp?: string;
  linkedParentIds?: Set<string>;
};

export type MajorMatchReason = 'ci_overlap' | 'location' | 'child_ticket' | 'site' | 'ip_subnet';

export type MajorMatch = {
  id: string;
  number: string;
  title: string;
  status: string;
  cmdbItemId?: string;
  cmdbItemName?: string;
  matchReason: MajorMatchReason;
};

export function matchMajorsForAccount(ctx: MajorImpactContext, input: MajorMatchInput): MajorMatch[] {
  const locationNeedle = [input.location, input.site]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value && value.length >= 2));

  const results: MajorMatch[] = [];
  const seen = new Set<string>();

  for (const major of ctx.majors) {
    const isParent = ctx.parentIds.has(major.id);
    if (!isParent && !major.cmdb_item_id) continue;

    if (input.linkedParentIds?.has(major.id)) {
      results.push(toMajorMatch(major, ctx.byId, major.cmdb_item_id ?? undefined, 'child_ticket'));
      seen.add(major.id);
      continue;
    }

    const rootCiId = resolveRootCiId(major, ctx.items);
    if (!rootCiId) continue;

    const affected = expandMajorImpact(rootCiId, ctx);
    let matchReason: MajorMatchReason | null = null;

    if (hasCiOverlap(affected, ctx.estateCiIds, ctx.items, ctx.estateAssetIds)) {
      matchReason = 'ci_overlap';
    } else if (
      ipMatchesAffectedSubnets(input.clientIp, affected, ctx.ipSegments) ||
      estateIpsInAffectedSubnets(ctx.items, affected, ctx.ipSegments)
    ) {
      matchReason = 'ip_subnet';
    } else if (locationNeedle.length > 0) {
      const locationHit = locationNeedle.some((needle) => {
        if (major.title.toLowerCase().includes(needle)) return true;
        return Array.from(affected).some((ciId) => {
          const ci = ctx.byId.get(ciId);
          return ci ? ciMatchesLocation(ci, needle, ctx.assetRows) : false;
        });
      });
      if (locationHit) {
        matchReason = input.site && locationNeedle.includes(input.site.trim().toLowerCase()) ? 'site' : 'location';
      }
    }

    if (matchReason && !seen.has(major.id)) {
      results.push(toMajorMatch(major, ctx.byId, rootCiId, matchReason));
      seen.add(major.id);
    }
  }

  return results.sort((a, b) => a.title.localeCompare(b.title));
}

function toMajorMatch(
  major: MajorRow,
  byId: Map<string, CiGraphNode>,
  rootCiId: string | undefined,
  matchReason: MajorMatchReason,
): MajorMatch {
  const rootCi = rootCiId ? byId.get(rootCiId) : undefined;
  return {
    id: major.id,
    number: displayTicketNumber(major.number ?? undefined, major.id),
    title: major.title,
    status: major.status,
    cmdbItemId: rootCiId,
    cmdbItemName: rootCi?.name,
    matchReason,
  };
}

export function isActiveMajorParent(ctx: MajorImpactContext, ticketId: string, cmdbItemId?: string | null) {
  return Boolean(cmdbItemId) || ctx.parentIds.has(ticketId);
}

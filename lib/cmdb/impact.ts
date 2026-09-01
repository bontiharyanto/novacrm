'use server';

import { buildCiGraph, type CiGraphNode } from '@/lib/cmdb/graph';
import { expandCiImpact } from '@/lib/cmdb/impact-rules';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CmdbImpact = {
  relatedCis: Array<{ id: string; name: string; type: string }>;
  assets: Array<{ id: string; name: string; assetTag: string }>;
  tickets: Array<{ id: string; number?: string; title: string; status: string }>;
};

export async function getCmdbImpact(itemId: string): Promise<CmdbImpact> {
  const empty: CmdbImpact = { relatedCis: [], assets: [], tickets: [] };
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Cmdb')) {
    return empty;
  }

  const supabase = await createSupabaseServerClient();
  const { data: source } = await supabase
    .from('cmdb_items')
    .select('id, account_id')
    .eq('id', itemId)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();

  if (!source) return empty;

  const { data } = await supabase
    .from('cmdb_items')
    .select('id, name, type, asset_id, relations')
    .eq('tenant_id', session.profile.tenantId)
    .eq('account_id', source.account_id);

  const items = (data ?? []) as CiGraphNode[];

  const { byId, inboundEdges, outboundEdges } = buildCiGraph(items);
  if (!byId.has(itemId)) return empty;

  const seen = expandCiImpact(itemId, byId, outboundEdges, inboundEdges);
  const related = Array.from(seen)
    .filter((id) => id !== itemId)
    .map((id) => byId.get(id)!);
  const assetIds = Array.from(
    new Set(
      [byId.get(itemId)?.asset_id, ...related.map((item) => item.asset_id)].filter((id): id is string => Boolean(id)),
    ),
  );

  const assets =
    assetIds.length > 0
      ? ((
          await supabase.from('assets').select('id, name, asset_tag').eq('tenant_id', session.profile.tenantId).in('id', assetIds)
        ).data ?? [])
      : [];

  const tickets =
    assetIds.length > 0
      ? ((
          await supabase
            .from('tickets')
            .select('id, number, title, status')
            .eq('tenant_id', session.profile.tenantId)
            .in('asset_id', assetIds)
            .in('status', ['open', 'in_progress', 'waiting', 'hold'])
            .order('created_at', { ascending: false })
            .limit(20)
        ).data ?? [])
      : [];

  return {
    relatedCis: related.map((item) => ({ id: item.id, name: item.name, type: item.type })),
    assets: assets.map((asset) => ({ id: asset.id, name: asset.name, assetTag: asset.asset_tag })),
    tickets: tickets.map((ticket) => ({
      id: ticket.id,
      number: ticket.number ?? undefined,
      title: ticket.title,
      status: ticket.status,
    })),
  };
}

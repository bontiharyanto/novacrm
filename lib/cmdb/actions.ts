'use server';

import { cmdbSchema, type CmdbItem } from '@/lib/cmdb/schema';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type CmdbRow = {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  asset_id?: string | null;
  attributes?: Record<string, string> | null;
  relations?: Array<{ targetId: string; type: string }> | null;
  created_at: string;
};

function mapCmdb(row: CmdbRow): CmdbItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    type: row.type,
    assetId: row.asset_id ?? undefined,
    attributes: row.attributes ?? {},
    relations: row.relations ?? [],
    createdAt: row.created_at,
  };
}

export async function listCmdbItems() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Cmdb')) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cmdb_items')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapCmdb(row as CmdbRow));
}

export async function createCmdbItem(input: unknown) {
  const parsed = cmdbSchema.parse(input);
  const session = await getSessionProfile();

  if (!session || !canRole(session.profile.role, 'create', 'Cmdb')) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cmdb_items')
    .insert({
      tenant_id: session.profile.tenantId,
      name: parsed.name,
      type: parsed.type,
      asset_id: parsed.assetId ?? null,
      attributes: parsed.attributes ?? { owner: 'operations' },
      relations: parsed.relations ?? [],
      created_by: session.userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create CMDB item' };
  }

  return { data: mapCmdb(data as CmdbRow), error: null };
}

export async function getCmdbById(itemId: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Cmdb')) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('cmdb_items')
    .select('*')
    .eq('id', itemId)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();

  return data ? mapCmdb(data as CmdbRow) : null;
}

'use server';

import { ciClassSchema, cmdbSchema, cmdbUpdateSchema, ipSegmentSchema, type CmdbItem, type IpSegment } from '@/lib/cmdb/schema';
import { DEFAULT_CI_CLASSES, type CiClass } from '@/lib/cmdb/classes';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAccountId } from '@/lib/accounts/scope';

type CmdbRow = {
  id: string;
  tenant_id: string;
  account_id: string;
  name: string;
  type: string;
  asset_id?: string | null;
  attributes?: Record<string, string> | null;
  relations?: Array<{ targetId: string; type: string }> | null;
  created_at: string;
};

function mapCmdb(row: CmdbRow, assets?: Map<string, { name: string; asset_tag: string }>): CmdbItem {
  const asset = row.asset_id ? assets?.get(row.asset_id) : undefined;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    accountId: row.account_id,
    name: row.name,
    type: row.type,
    assetId: row.asset_id ?? undefined,
    assetName: asset?.name,
    assetTag: asset?.asset_tag,
    attributes: row.attributes ?? {},
    relations: row.relations ?? [],
    segments: [],
    createdAt: row.created_at,
  };
}

type SegmentRow = {
  id: string;
  account_id: string;
  cmdb_item_id?: string | null;
  name: string;
  cidr: string;
  vlan?: number | null;
  gateway?: string | null;
  purpose: string;
};

function mapSegment(row: SegmentRow): IpSegment {
  return {
    id: row.id,
    accountId: row.account_id,
    cmdbItemId: row.cmdb_item_id ?? undefined,
    name: row.name,
    cidr: String(row.cidr),
    vlan: row.vlan ?? undefined,
    gateway: row.gateway ? String(row.gateway) : undefined,
    purpose: row.purpose,
  };
}

async function withAssets(rows: CmdbRow[]) {
  const ids = rows.map((row) => row.asset_id).filter((id): id is string => Boolean(id));
  const supabase = await createSupabaseServerClient();
  const accountIds = Array.from(new Set(rows.map((row) => row.account_id)));
  const [{ data: assets }, { data: segments }] = await Promise.all([
    ids.length === 0
      ? Promise.resolve({ data: [] })
      : supabase.from('assets').select('id, name, asset_tag').in('id', ids),
    accountIds.length === 0
      ? Promise.resolve({ data: [] })
      : supabase.from('ip_segments').select('id, account_id, cmdb_item_id, name, cidr, vlan, gateway, purpose').in('account_id', accountIds),
  ]);
  const assetMap = new Map((assets ?? []).map((asset) => [asset.id, asset]));
  const byCi = new Map<string, IpSegment[]>();
  for (const row of (segments ?? []) as SegmentRow[]) {
    if (!row.cmdb_item_id) continue;
    const list = byCi.get(row.cmdb_item_id) ?? [];
    list.push(mapSegment(row));
    byCi.set(row.cmdb_item_id, list);
  }
  return rows.map((row) => {
    const item = mapCmdb(row, assetMap);
    item.segments = byCi.get(row.id) ?? [];
    return item;
  });
}

export async function listCmdbItems() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Cmdb')) {
    return [];
  }

  const scoped = await requireAccountId(session);
  const supabase = await createSupabaseServerClient();
  let query = supabase.from('cmdb_items').select('*').eq('tenant_id', session.profile.tenantId).order('created_at', { ascending: false });
  if (scoped.accountId) {
    query = query.eq('account_id', scoped.accountId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return withAssets(data as CmdbRow[]);
}

export async function createCmdbItem(input: unknown) {
  const parsedResult = cmdbSchema.safeParse(input);
  if (!parsedResult.success) {
    return { data: null, error: parsedResult.error.issues[0]?.message ?? 'Invalid CI' };
  }
  const parsed = parsedResult.data;
  const session = await getSessionProfile();

  if (!session || !canRole(session.profile.role, 'create', 'Cmdb')) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const scoped = await requireAccountId(session, parsed.accountId);
  if (!scoped.accountId) {
    return { data: null, error: scoped.error ?? 'Select an account' };
  }
  const { data, error } = await supabase
    .from('cmdb_items')
    .insert({
      tenant_id: session.profile.tenantId,
      account_id: scoped.accountId,
      name: parsed.name,
      type: parsed.type,
      asset_id: parsed.assetId ?? null,
      attributes: parsed.attributes ?? {},
      relations: parsed.relations ?? [],
      created_by: session.userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create CMDB item' };
  }

  if (parsed.segment) {
    const segmentResult = await createIpSegment({
      ...parsed.segment,
      cmdbItemId: data.id,
    });
    if (segmentResult.error) {
      return { data: null, error: segmentResult.error };
    }
  }

  const item = (await getCmdbById(data.id)) ?? (await withAssets([data as CmdbRow]))[0];
  if (!item?.id) {
    return { data: null, error: 'CI was created but could not be loaded' };
  }
  return { data: item, error: null };
}

export async function updateCmdbItem(itemId: string, input: unknown) {
  const parsed = cmdbUpdateSchema.parse(input);
  const session = await getSessionProfile();

  if (!session || !canRole(session.profile.role, 'update', 'Cmdb')) {
    return { data: null, error: 'Unauthorized' };
  }

  const patch: Record<string, unknown> = {};
  if (parsed.name !== undefined) patch.name = parsed.name;
  if (parsed.type !== undefined) patch.type = parsed.type;
  if (parsed.assetId !== undefined) patch.asset_id = parsed.assetId || null;
  if (parsed.attributes !== undefined) patch.attributes = parsed.attributes;
  if (parsed.relations !== undefined) patch.relations = parsed.relations;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cmdb_items')
    .update(patch)
    .eq('id', itemId)
    .eq('tenant_id', session.profile.tenantId)
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to update CI' };
  }

  const [item] = await withAssets([data as CmdbRow]);
  return { data: item, error: null };
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

  if (!data) return null;
  const [item] = await withAssets([data as CmdbRow]);
  return item;
}

export async function createIpSegment(input: unknown) {
  const parsedResult = ipSegmentSchema.safeParse(input);
  if (!parsedResult.success) {
    return { data: null, error: parsedResult.error.issues[0]?.message ?? 'Invalid segment' };
  }
  const parsed = parsedResult.data;
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Cmdb')) {
    return { data: null, error: 'Unauthorized' };
  }

  const scoped = await requireAccountId(session);
  if (!scoped.accountId) return { data: null, error: scoped.error ?? 'Select an account' };

  const supabase = await createSupabaseServerClient();
  if (parsed.cmdbItemId) {
    const { data: ci } = await supabase
      .from('cmdb_items')
      .select('id, account_id')
      .eq('id', parsed.cmdbItemId)
      .eq('tenant_id', session.profile.tenantId)
      .eq('account_id', scoped.accountId)
      .maybeSingle();
    if (!ci) return { data: null, error: 'CI not found in this account' };
  }

  const { data, error } = await supabase
    .from('ip_segments')
    .insert({
      tenant_id: session.profile.tenantId,
      account_id: scoped.accountId,
      cmdb_item_id: parsed.cmdbItemId ?? null,
      name: parsed.name ?? parsed.cidr,
      cidr: parsed.cidr,
      vlan: parsed.vlan ?? null,
      gateway: parsed.gateway ?? null,
      purpose: parsed.purpose ?? 'user',
      created_by: session.userId,
    })
    .select('id, account_id, cmdb_item_id, name, cidr, vlan, gateway, purpose')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create IP segment' };
  }
  return { data: mapSegment(data as SegmentRow), error: null };
}

function slugifyClass(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'custom'
  );
}

export async function listCiClasses(): Promise<CiClass[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Cmdb')) {
    return DEFAULT_CI_CLASSES;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('ci_classes')
    .select('id, group_key, slug, label, hint, is_system')
    .eq('tenant_id', session.profile.tenantId)
    .order('sort_order', { ascending: true });
  if (error || !data || data.length === 0) return DEFAULT_CI_CLASSES;
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    label: row.label,
    hint: row.hint ?? '',
    groupKey: row.group_key as CiClass['groupKey'],
    isSystem: row.is_system,
  }));
}

export async function createCiClass(input: unknown) {
  const parsedResult = ciClassSchema.safeParse(input);
  if (!parsedResult.success) {
    return { data: null, error: parsedResult.error.issues[0]?.message ?? 'Invalid class' };
  }
  const parsed = parsedResult.data;
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Cmdb')) {
    return { data: null, error: 'Unauthorized' };
  }
  const slug = slugifyClass(parsed.label);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('ci_classes')
    .insert({
      tenant_id: session.profile.tenantId,
      group_key: parsed.groupKey,
      slug,
      label: parsed.label,
      hint: parsed.hint ?? '',
      sort_order: 200,
      is_system: false,
      created_by: session.userId,
    })
    .select('id, group_key, slug, label, hint, is_system')
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to add CI type' };
  }
  return {
    data: {
      id: data.id,
      slug: data.slug,
      label: data.label,
      hint: data.hint ?? '',
      groupKey: data.group_key as CiClass['groupKey'],
      isSystem: data.is_system,
    } satisfies CiClass,
    error: null,
  };
}

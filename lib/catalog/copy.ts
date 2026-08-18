'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
const TENANT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CatalogCopySource = {
  id: string;
  name: string;
  slug: string;
  categories: number;
  sets: number;
  items: number;
};

export type CatalogCopyResult = {
  categoriesCreated: number;
  setsCreated: number;
  itemsCreated: number;
  categoriesReused: number;
  setsReused: number;
  itemsSkipped: number;
};

async function requireSuperadmin() {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== 'superadmin') {
    return { session: null, error: 'Unauthorized' as const };
  }
  if (!hasServiceRole()) {
    return { session: null, error: 'Service role is not configured' as const };
  }
  return { session, error: null };
}

export async function listCatalogCopySources(): Promise<CatalogCopySource[]> {
  const gate = await requireSuperadmin();
  if (gate.error || !gate.session) return [];

  const admin = createSupabaseAdminClient();
  const currentId = gate.session.profile.tenantId;
  const { data: tenants } = await admin.from('tenants').select('id, name, slug').neq('id', currentId).order('name');
  if (!tenants?.length) return [];

  const ids = tenants.map((row) => row.id as string);
  const [{ data: categories }, { data: sets }, { data: items }] = await Promise.all([
    admin.from('catalog_categories').select('tenant_id').in('tenant_id', ids),
    admin.from('catalog_variable_sets').select('tenant_id').in('tenant_id', ids),
    admin.from('catalog_items').select('tenant_id').in('tenant_id', ids),
  ]);

  const countBy = (rows: Array<{ tenant_id: string }> | null) => {
    const map = new Map<string, number>();
    for (const row of rows ?? []) map.set(row.tenant_id, (map.get(row.tenant_id) ?? 0) + 1);
    return map;
  };
  const categoryCount = countBy(categories);
  const setCount = countBy(sets);
  const itemCount = countBy(items);

  return tenants
    .map((row) => ({
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      categories: categoryCount.get(row.id as string) ?? 0,
      sets: setCount.get(row.id as string) ?? 0,
      items: itemCount.get(row.id as string) ?? 0,
    }))
    .filter((row) => row.categories + row.sets + row.items > 0);
}

export async function copyCatalogFromTenant(sourceTenantId: string) {
  const gate = await requireSuperadmin();
  if (gate.error || !gate.session) return { data: null, error: gate.error ?? 'Unauthorized' };

  if (!TENANT_ID.test(sourceTenantId)) return { data: null, error: 'Invalid tenant' };

  const destTenantId = gate.session.profile.tenantId;
  if (sourceTenantId === destTenantId) return { data: null, error: 'Choose a different tenant.' };

  const admin = createSupabaseAdminClient();
  const { data: source } = await admin.from('tenants').select('id').eq('id', sourceTenantId).maybeSingle();
  if (!source) return { data: null, error: 'Source tenant was not found.' };

  const [{ data: sourceCategories }, { data: sourceSets }, { data: sourceItems }, { data: destCategories }, { data: destSets }, { data: destItems }] =
    await Promise.all([
      admin.from('catalog_categories').select('*').eq('tenant_id', sourceTenantId).order('sort_order'),
      admin.from('catalog_variable_sets').select('*').eq('tenant_id', sourceTenantId).order('name'),
      admin.from('catalog_items').select('*').eq('tenant_id', sourceTenantId).order('name'),
      admin.from('catalog_categories').select('id, slug').eq('tenant_id', destTenantId),
      admin.from('catalog_variable_sets').select('id, name').eq('tenant_id', destTenantId),
      admin.from('catalog_items').select('id, slug').eq('tenant_id', destTenantId),
    ]);

  const categoryBySlug = new Map((destCategories ?? []).map((row) => [String(row.slug), String(row.id)]));
  const setByName = new Map((destSets ?? []).map((row) => [String(row.name).trim().toLowerCase(), String(row.id)]));
  const itemSlugs = new Set((destItems ?? []).map((row) => String(row.slug)));

  const result: CatalogCopyResult = {
    categoriesCreated: 0,
    setsCreated: 0,
    itemsCreated: 0,
    categoriesReused: 0,
    setsReused: 0,
    itemsSkipped: 0,
  };

  const categoryMap = new Map<string, string>();
  for (const row of sourceCategories ?? []) {
    const existing = categoryBySlug.get(String(row.slug));
    if (existing) {
      categoryMap.set(String(row.id), existing);
      result.categoriesReused += 1;
      continue;
    }
    const { data: created, error } = await admin
      .from('catalog_categories')
      .insert({
        tenant_id: destTenantId,
        name: row.name,
        slug: row.slug,
        description: row.description,
        sort_order: row.sort_order,
        is_active: row.is_active,
        created_by: gate.session.userId,
      })
      .select('id')
      .maybeSingle();
    if (error || !created) return { data: null, error: error?.message ?? 'Unable to copy a category' };
    categoryMap.set(String(row.id), created.id);
    categoryBySlug.set(String(row.slug), created.id);
    result.categoriesCreated += 1;
  }

  const setMap = new Map<string, string>();
  for (const row of sourceSets ?? []) {
    const key = String(row.name).trim().toLowerCase();
    const existing = setByName.get(key);
    if (existing) {
      setMap.set(String(row.id), existing);
      result.setsReused += 1;
      continue;
    }
    const { data: created, error } = await admin
      .from('catalog_variable_sets')
      .insert({
        tenant_id: destTenantId,
        name: row.name,
        description: row.description,
        variables: row.variables ?? [],
        created_by: gate.session.userId,
      })
      .select('id')
      .maybeSingle();
    if (error || !created) return { data: null, error: error?.message ?? 'Unable to copy a variable set' };
    setMap.set(String(row.id), created.id);
    setByName.set(key, created.id);
    result.setsCreated += 1;
  }

  for (const row of sourceItems ?? []) {
    if (itemSlugs.has(String(row.slug))) {
      result.itemsSkipped += 1;
      continue;
    }
    const { error } = await admin.from('catalog_items').insert({
      tenant_id: destTenantId,
      category_id: row.category_id ? categoryMap.get(String(row.category_id)) ?? null : null,
      variable_set_id: row.variable_set_id ? setMap.get(String(row.variable_set_id)) ?? null : null,
      name: row.name,
      slug: row.slug,
      short_description: row.short_description,
      description: row.description,
      icon: row.icon,
      ticket_type: row.ticket_type,
      priority: row.priority,
      variables: row.variables ?? [],
      is_active: row.is_active,
      created_by: gate.session.userId,
    });
    if (error) return { data: null, error: error.message };
    itemSlugs.add(String(row.slug));
    result.itemsCreated += 1;
  }

  return { data: result, error: null };
}

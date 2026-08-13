'use server';

import {
  catalogCategorySchema,
  catalogItemSchema,
  catalogItemUpdateSchema,
  catalogRequestSchema,
  catalogVariableSetSchema,
  catalogVariableSetUpdateSchema,
  type CatalogCategory,
  type CatalogItem,
  type CatalogVariableSet,
} from '@/lib/catalog/schema';
import { formatAnswers, mergeVariables, missingRequired, parseVariables, slugify } from '@/lib/catalog/variables';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createTicket } from '@/lib/tickets/actions';

type CategoryRow = {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
};

type SetRow = {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  variables: unknown;
  created_at: string;
};

type ItemRow = {
  id: string;
  tenant_id: string;
  category_id?: string | null;
  variable_set_id?: string | null;
  name: string;
  slug: string;
  short_description?: string | null;
  description?: string | null;
  icon: string;
  ticket_type: CatalogItem['ticketType'];
  priority: CatalogItem['priority'];
  variables: unknown;
  is_active: boolean;
  created_at: string;
};

function mapCategory(row: CategoryRow): CatalogCategory {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

function mapSet(row: SetRow): CatalogVariableSet {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description ?? undefined,
    variables: parseVariables(row.variables),
    createdAt: row.created_at,
  };
}

function mapItem(row: ItemRow, categories: CatalogCategory[], sets: CatalogVariableSet[]): CatalogItem {
  const category = categories.find((item) => item.id === row.category_id);
  const set = sets.find((item) => item.id === row.variable_set_id);
  const variables = parseVariables(row.variables);
  return {
    id: row.id,
    tenantId: row.tenant_id,
    categoryId: row.category_id ?? undefined,
    categoryName: category?.name,
    variableSetId: row.variable_set_id ?? undefined,
    variableSetName: set?.name,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description ?? undefined,
    description: row.description ?? undefined,
    icon: row.icon,
    ticketType: row.ticket_type,
    priority: row.priority,
    variables,
    mergedVariables: mergeVariables(set?.variables, variables),
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

async function loadSetsAndCategories(tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: categories }, { data: sets }] = await Promise.all([
    supabase.from('catalog_categories').select('*').eq('tenant_id', tenantId).order('sort_order'),
    supabase.from('catalog_variable_sets').select('*').eq('tenant_id', tenantId).order('name'),
  ]);
  return {
    categories: (categories ?? []).map((row) => mapCategory(row as CategoryRow)),
    sets: (sets ?? []).map((row) => mapSet(row as SetRow)),
  };
}

export async function listCatalogCategories() {
  const session = await getSessionProfile();
  if (!session) return [] as CatalogCategory[];
  const { categories } = await loadSetsAndCategories(session.profile.tenantId);
  if (canRole(session.profile.role, 'read', 'Catalog')) return categories;
  return categories.filter((item) => item.isActive);
}

export async function listCatalogVariableSets() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Catalog')) {
    return [] as CatalogVariableSet[];
  }
  const { sets } = await loadSetsAndCategories(session.profile.tenantId);
  return sets;
}

export async function getCatalogVariableSet(setId: string) {
  const sets = await listCatalogVariableSets();
  return sets.find((item) => item.id === setId) ?? null;
}

export async function listCatalogItems() {
  const session = await getSessionProfile();
  if (!session) return [] as CatalogItem[];

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('catalog_items')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .order('name');
  if (!canRole(session.profile.role, 'read', 'Catalog')) {
    query = query.eq('is_active', true);
  }
  const { data, error } = await query;
  if (error || !data) return [];
  const { categories, sets } = await loadSetsAndCategories(session.profile.tenantId);
  return data.map((row) => mapItem(row as ItemRow, categories, sets));
}

export async function getCatalogItem(itemId: string) {
  const items = await listCatalogItems();
  return items.find((item) => item.id === itemId) ?? null;
}

export async function createCatalogCategory(input: unknown) {
  const parsed = catalogCategorySchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Catalog')) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('catalog_categories')
    .insert({
      tenant_id: session.profile.tenantId,
      name: parsed.name,
      slug: parsed.slug?.trim() || slugify(parsed.name),
      description: parsed.description ?? null,
      sort_order: parsed.sortOrder ?? 0,
      is_active: parsed.isActive ?? true,
      created_by: session.userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create category' };
  }
  return { data: mapCategory(data as CategoryRow), error: null };
}

export async function createCatalogVariableSet(input: unknown) {
  const parsed = catalogVariableSetSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Catalog')) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('catalog_variable_sets')
    .insert({
      tenant_id: session.profile.tenantId,
      name: parsed.name,
      description: parsed.description ?? null,
      variables: parsed.variables,
      created_by: session.userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create variable set' };
  }
  return { data: mapSet(data as SetRow), error: null };
}

export async function updateCatalogVariableSet(setId: string, input: unknown) {
  const parsed = catalogVariableSetUpdateSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Catalog')) {
    return { data: null, error: 'Unauthorized' };
  }

  const patch: Record<string, unknown> = {};
  if (parsed.name !== undefined) patch.name = parsed.name;
  if (parsed.description !== undefined) patch.description = parsed.description;
  if (parsed.variables !== undefined) patch.variables = parsed.variables;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('catalog_variable_sets')
    .update(patch)
    .eq('id', setId)
    .eq('tenant_id', session.profile.tenantId)
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to update variable set' };
  }
  return { data: mapSet(data as SetRow), error: null };
}

export async function createCatalogItem(input: unknown) {
  const parsed = catalogItemSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Catalog')) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('catalog_items')
    .insert({
      tenant_id: session.profile.tenantId,
      category_id: parsed.categoryId ?? null,
      variable_set_id: parsed.variableSetId ?? null,
      name: parsed.name,
      slug: parsed.slug?.trim() || slugify(parsed.name),
      short_description: parsed.shortDescription ?? null,
      description: parsed.description ?? null,
      icon: parsed.icon ?? 'clipboard',
      ticket_type: parsed.ticketType,
      priority: parsed.priority,
      variables: parsed.variables,
      is_active: parsed.isActive ?? true,
      created_by: session.userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create catalog item' };
  }
  const { categories, sets } = await loadSetsAndCategories(session.profile.tenantId);
  return { data: mapItem(data as ItemRow, categories, sets), error: null };
}

export async function updateCatalogItem(itemId: string, input: unknown) {
  const parsed = catalogItemUpdateSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Catalog')) {
    return { data: null, error: 'Unauthorized' };
  }

  const patch: Record<string, unknown> = {};
  if (parsed.name !== undefined) patch.name = parsed.name;
  if (parsed.slug !== undefined) patch.slug = parsed.slug;
  if (parsed.shortDescription !== undefined) patch.short_description = parsed.shortDescription;
  if (parsed.description !== undefined) patch.description = parsed.description;
  if (parsed.icon !== undefined) patch.icon = parsed.icon;
  if (parsed.categoryId !== undefined) patch.category_id = parsed.categoryId;
  if (parsed.variableSetId !== undefined) patch.variable_set_id = parsed.variableSetId;
  if (parsed.ticketType !== undefined) patch.ticket_type = parsed.ticketType;
  if (parsed.priority !== undefined) patch.priority = parsed.priority;
  if (parsed.variables !== undefined) patch.variables = parsed.variables;
  if (parsed.isActive !== undefined) patch.is_active = parsed.isActive;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('catalog_items')
    .update(patch)
    .eq('id', itemId)
    .eq('tenant_id', session.profile.tenantId)
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to update catalog item' };
  }
  const { categories, sets } = await loadSetsAndCategories(session.profile.tenantId);
  return { data: mapItem(data as ItemRow, categories, sets), error: null };
}

export async function submitCatalogRequest(itemId: string, input: unknown) {
  const parsed = catalogRequestSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Ticket')) {
    return { data: null, error: 'Unauthorized' };
  }

  const item = await getCatalogItem(itemId);
  if (!item || !item.isActive) {
    return { data: null, error: 'Catalog item is not available' };
  }

  const missing = missingRequired(item.mergedVariables, parsed.answers);
  if (missing.length > 0) {
    return { data: null, error: `Required: ${missing.join(', ')}` };
  }

  const answers: Record<string, string> = {};
  for (const variable of item.mergedVariables) {
    const value = parsed.answers[variable.key];
    answers[variable.key] = value == null ? '' : String(value);
  }

  const details = formatAnswers(item.mergedVariables, parsed.answers);
  const description = [item.description, details].filter(Boolean).join('\n\n');

  return createTicket({
    title: item.name,
    description: description || item.shortDescription || item.name,
    type: item.ticketType,
    status: 'open',
    priority: item.priority,
    category: item.categoryName ?? item.slug,
    catalogItemId: item.id,
    catalogAnswers: answers,
    requesterName: session.profile.fullName,
    requesterEmail: session.profile.email,
  });
}

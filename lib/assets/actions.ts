'use server';

import { assetMovementSchema, assetSchema, assetTypeCatalogSchema, assetUpdateSchema, type AssetMovement, type AssetRecord } from '@/lib/assets/schema';
import { DEFAULT_ASSET_TYPES, type AssetTypeOption } from '@/lib/assets/types';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAccountId } from '@/lib/accounts/scope';
import { formatZodError } from '@/lib/validation/zod-error';

type AssetRow = {
  id: string;
  tenant_id: string;
  account_id: string;
  name: string;
  asset_tag: string;
  type: AssetRecord['type'];
  brand?: string | null;
  model?: string | null;
  serial?: string | null;
  purchase_date?: string | null;
  warranty_expiry?: string | null;
  cost?: number | string | null;
  useful_life_months?: number | null;
  residual_value?: number | string | null;
  status: AssetRecord['status'];
  location?: string | null;
  assigned_to?: string | null;
  replaced_by_id?: string | null;
  notes?: { text?: string } | string | null;
  created_at: string;
  updated_at?: string | null;
};

function mapAsset(row: AssetRow): AssetRecord {
  const notes = typeof row.notes === 'string' ? row.notes : row.notes?.text;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    accountId: row.account_id,
    name: row.name,
    assetTag: row.asset_tag,
    type: row.type,
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    serial: row.serial ?? undefined,
    purchaseDate: row.purchase_date ?? undefined,
    warrantyExpiry: row.warranty_expiry ?? undefined,
    cost: row.cost == null ? undefined : Number(row.cost),
    usefulLifeMonths: row.useful_life_months ?? 36,
    residualValue: row.residual_value == null ? 0 : Number(row.residual_value),
    status: row.status,
    location: row.location ?? undefined,
    assignedTo: row.assigned_to ?? undefined,
    notes,
    replacedById: row.replaced_by_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

function toRow(
  parsed: ReturnType<typeof assetSchema.parse>,
  tenantId: string,
  accountId: string,
  userId: string,
  assetTag: string,
) {
  return {
    tenant_id: tenantId,
    account_id: accountId,
    name: parsed.name,
    asset_tag: assetTag,
    type: parsed.type,
    brand: parsed.brand ?? null,
    model: parsed.model ?? null,
    serial: parsed.serial ?? null,
    purchase_date: parsed.purchaseDate || null,
    warranty_expiry: parsed.warrantyExpiry || null,
    cost: parsed.cost ?? null,
    useful_life_months: parsed.usefulLifeMonths ?? 36,
    residual_value: parsed.residualValue ?? 0,
    status: parsed.status,
    location: parsed.location ?? null,
    assigned_to: parsed.assignedTo ?? null,
    notes: { text: parsed.notes ?? '' },
    created_by: userId,
  };
}

function makeTag(index = 0) {
  const suffix = `${Date.now().toString(36)}${index}`.slice(-6).toUpperCase();
  return `AST-${suffix}`;
}

export async function listAssets(accountId?: string | null) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Asset')) {
    return [];
  }

  const scoped = await requireAccountId(session, accountId);
  if (accountId && !scoped.accountId) return [];

  const supabase = await createSupabaseServerClient();
  let query = supabase.from('assets').select('*').eq('tenant_id', session.profile.tenantId).order('created_at', { ascending: false });
  if (scoped.accountId) {
    query = query.eq('account_id', scoped.accountId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapAsset(row as AssetRow));
}

export async function createAsset(input: unknown) {
  const parsedResult = assetSchema.safeParse(input);
  if (!parsedResult.success) {
    return { data: null, error: formatZodError(parsedResult.error) };
  }
  const parsed = parsedResult.data;
  const session = await getSessionProfile();

  if (!session || !canRole(session.profile.role, 'create', 'Asset')) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const scoped = await requireAccountId(session, parsed.accountId);
  if (!scoped.accountId) {
    return { data: null, error: scoped.error ?? 'Select an account' };
  }
  const accountId = scoped.accountId;
  const assetTag = parsed.assetTag?.trim() || makeTag();

  const { data, error } = await supabase
    .from('assets')
    .insert(toRow(parsed, session.profile.tenantId, accountId, session.userId, assetTag))
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create asset' };
  }

  return { data: mapAsset(data as AssetRow), error: null };
}

export async function updateAsset(assetId: string, input: unknown) {
  const parsed = assetUpdateSchema.parse(input);
  const session = await getSessionProfile();

  if (!session || !canRole(session.profile.role, 'update', 'Asset')) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const patch: Record<string, unknown> = {};
  if (parsed.name !== undefined) patch.name = parsed.name;
  if (parsed.type !== undefined) patch.type = parsed.type;
  if (parsed.status !== undefined) patch.status = parsed.status;
  if (parsed.brand !== undefined) patch.brand = parsed.brand;
  if (parsed.model !== undefined) patch.model = parsed.model;
  if (parsed.serial !== undefined) patch.serial = parsed.serial;
  if (parsed.purchaseDate !== undefined) patch.purchase_date = parsed.purchaseDate || null;
  if (parsed.warrantyExpiry !== undefined) patch.warranty_expiry = parsed.warrantyExpiry || null;
  if (parsed.cost !== undefined) patch.cost = parsed.cost;
  if (parsed.usefulLifeMonths !== undefined) patch.useful_life_months = parsed.usefulLifeMonths;
  if (parsed.residualValue !== undefined) patch.residual_value = parsed.residualValue;
  if (parsed.location !== undefined) patch.location = parsed.location;
  if (parsed.assignedTo !== undefined) patch.assigned_to = parsed.assignedTo;
  if (parsed.replacedById !== undefined) patch.replaced_by_id = parsed.replacedById;
  if (parsed.notes !== undefined) patch.notes = { text: parsed.notes };

  const { data, error } = await supabase
    .from('assets')
    .update(patch)
    .eq('id', assetId)
    .eq('tenant_id', session.profile.tenantId)
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to update asset' };
  }

  return { data: mapAsset(data as AssetRow), error: null };
}

export async function getAssetById(assetId: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Asset')) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();

  return data ? mapAsset(data as AssetRow) : null;
}

export async function importAssets(rows: unknown[]) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Asset')) {
    return { data: null, error: 'Unauthorized' };
  }

  const parsed: ReturnType<typeof assetSchema.parse>[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const result = assetSchema.safeParse(rows[index]);
    if (!result.success) {
      return { data: null, error: `Row ${index + 1}: ${result.error.issues[0]?.message ?? 'invalid'}` };
    }
    parsed.push(result.data);
  }

  const supabase = await createSupabaseServerClient();
  const scoped = await requireAccountId(session);
  if (!scoped.accountId) {
    return { data: null, error: scoped.error ?? 'Select an account' };
  }
  const accountId = scoped.accountId;
  const payload = parsed.map((item, index) =>
    toRow(item, session.profile.tenantId, accountId, session.userId, item.assetTag?.trim() || makeTag(index)),
  );

  const { data, error } = await supabase.from('assets').insert(payload).select('*');
  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data ?? []).map((row) => mapAsset(row as AssetRow)), error: null };
}

type MovementRow = {
  id: string;
  asset_id: string;
  event_type: AssetMovement['eventType'];
  from_location?: string | null;
  to_location?: string | null;
  from_assignee?: string | null;
  to_assignee?: string | null;
  from_status?: string | null;
  to_status?: string | null;
  related_asset_id?: string | null;
  note?: string | null;
  created_at: string;
};

function mapMovement(
  row: MovementRow,
  related?: { id: string; name: string; asset_tag: string } | null,
): AssetMovement {
  return {
    id: row.id,
    assetId: row.asset_id,
    eventType: row.event_type,
    fromLocation: row.from_location ?? undefined,
    toLocation: row.to_location ?? undefined,
    fromAssignee: row.from_assignee ?? undefined,
    toAssignee: row.to_assignee ?? undefined,
    fromStatus: row.from_status ?? undefined,
    toStatus: row.to_status ?? undefined,
    relatedAssetId: row.related_asset_id ?? undefined,
    relatedAssetName: related?.name,
    relatedAssetTag: related?.asset_tag,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listAssetMovements(assetId: string): Promise<AssetMovement[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Asset')) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('asset_movements')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .eq('asset_id', assetId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const relatedIds = Array.from(
    new Set(
      data
        .map((row) => (row as MovementRow).related_asset_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const relatedMap = new Map<string, { id: string; name: string; asset_tag: string }>();
  if (relatedIds.length > 0) {
    const { data: related } = await supabase
      .from('assets')
      .select('id, name, asset_tag')
      .eq('tenant_id', session.profile.tenantId)
      .in('id', relatedIds);
    for (const item of related ?? []) {
      relatedMap.set(item.id, item);
    }
  }

  return data.map((row) => {
    const movement = row as MovementRow;
    return mapMovement(movement, movement.related_asset_id ? relatedMap.get(movement.related_asset_id) : null);
  });
}

async function attachMovementNote(assetId: string, note?: string) {
  if (!note) return;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('asset_movements')
    .select('id')
    .eq('asset_id', assetId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return;
  await supabase.from('asset_movements').update({ note }).eq('id', data.id);
}

export async function recordAssetMovement(assetId: string, input: unknown) {
  const parsed = assetMovementSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Asset')) {
    return { data: null, error: 'Unauthorized' };
  }

  if (parsed.eventType === 'replace') {
    if (!parsed.replacementId) {
      return { data: null, error: 'Replacement asset is required' };
    }
    return replaceAsset(assetId, { replacementId: parsed.replacementId, note: parsed.note });
  }

  const current = await getAssetById(assetId);
  if (!current) {
    return { data: null, error: 'Asset not found' };
  }

  const patch: Record<string, unknown> = {};
  if (parsed.eventType === 'move') {
    if (!parsed.location?.trim()) {
      return { data: null, error: 'New location is required' };
    }
    patch.location = parsed.location.trim();
  } else if (parsed.eventType === 'transfer') {
    if (!parsed.assignedTo?.trim()) {
      return { data: null, error: 'New assignee is required' };
    }
    patch.assigned_to = parsed.assignedTo.trim();
  } else if (parsed.eventType === 'status') {
    return { data: null, error: 'Use the status field to change status' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('assets')
    .update(patch)
    .eq('id', assetId)
    .eq('tenant_id', session.profile.tenantId)
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to record movement' };
  }

  await attachMovementNote(assetId, parsed.note);
  const movements = await listAssetMovements(assetId);
  return { data: { asset: mapAsset(data as AssetRow), movements }, error: null };
}

export async function replaceAsset(
  assetId: string,
  input: { replacementId: string; note?: string },
) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Asset')) {
    return { data: null, error: 'Unauthorized' };
  }
  if (input.replacementId === assetId) {
    return { data: null, error: 'Replacement must be a different asset' };
  }

  const current = await getAssetById(assetId);
  const replacement = await getAssetById(input.replacementId);
  if (!current || !replacement) {
    return { data: null, error: 'Asset not found' };
  }
  if (current.accountId !== replacement.accountId) {
    return { data: null, error: 'Replacement must belong to the same account' };
  }
  if (replacement.status === 'retired') {
    return { data: null, error: 'Replacement asset is already retired' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('assets')
    .update({ status: 'retired', replaced_by_id: input.replacementId })
    .eq('id', assetId)
    .eq('tenant_id', session.profile.tenantId)
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to replace asset' };
  }

  const inherit: Record<string, unknown> = {};
  if (!replacement.location && current.location) inherit.location = current.location;
  if (!replacement.assignedTo && current.assignedTo) inherit.assigned_to = current.assignedTo;
  if (Object.keys(inherit).length > 0) {
    await supabase
      .from('assets')
      .update(inherit)
      .eq('id', input.replacementId)
      .eq('tenant_id', session.profile.tenantId);
  }

  await attachMovementNote(assetId, input.note);
  const movements = await listAssetMovements(assetId);
  return { data: { asset: mapAsset(data as AssetRow), movements }, error: null };
}

function slugifyAssetType(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'custom'
  );
}

export async function listAssetTypes(): Promise<AssetTypeOption[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Asset')) {
    return DEFAULT_ASSET_TYPES;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('asset_types')
    .select('id, slug, label, is_system')
    .eq('tenant_id', session.profile.tenantId)
    .order('sort_order', { ascending: true });
  if (error || !data || data.length === 0) return DEFAULT_ASSET_TYPES;
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    label: row.label,
    isSystem: row.is_system,
  }));
}

export async function createAssetType(input: unknown) {
  const parsedResult = assetTypeCatalogSchema.safeParse(input);
  if (!parsedResult.success) {
    return { data: null, error: parsedResult.error.issues[0]?.message ?? 'Invalid type' };
  }
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Asset')) {
    return { data: null, error: 'Unauthorized' };
  }
  const slug = slugifyAssetType(parsedResult.data.label);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('asset_types')
    .insert({
      tenant_id: session.profile.tenantId,
      slug,
      label: parsedResult.data.label,
      sort_order: 200,
      is_system: false,
      created_by: session.userId,
    })
    .select('id, slug, label, is_system')
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to add asset type' };
  }
  return {
    data: {
      id: data.id,
      slug: data.slug,
      label: data.label,
      isSystem: data.is_system,
    } satisfies AssetTypeOption,
    error: null,
  };
}

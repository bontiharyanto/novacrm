'use server';

import { assetSchema, type AssetRecord } from '@/lib/assets/schema';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type AssetRow = {
  id: string;
  tenant_id: string;
  name: string;
  asset_tag: string;
  type: AssetRecord['type'];
  brand?: string | null;
  model?: string | null;
  serial?: string | null;
  purchase_date?: string | null;
  cost?: number | string | null;
  status: AssetRecord['status'];
  location?: string | null;
  assigned_to?: string | null;
  notes?: { text?: string } | string | null;
  created_at: string;
};

function mapAsset(row: AssetRow): AssetRecord {
  const notes = typeof row.notes === 'string' ? row.notes : row.notes?.text;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    assetTag: row.asset_tag,
    type: row.type,
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    serial: row.serial ?? undefined,
    purchaseDate: row.purchase_date ?? undefined,
    cost: row.cost == null ? undefined : Number(row.cost),
    status: row.status,
    location: row.location ?? undefined,
    assignedTo: row.assigned_to ?? undefined,
    notes,
    createdAt: row.created_at,
  };
}

export async function listAssets() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Asset')) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapAsset(row as AssetRow));
}

export async function createAsset(input: unknown) {
  const parsed = assetSchema.parse(input);
  const session = await getSessionProfile();

  if (!session || !canRole(session.profile.role, 'create', 'Asset')) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const assetTag = `AST-${Date.now().toString().slice(-6)}`;

  const { data, error } = await supabase
    .from('assets')
    .insert({
      tenant_id: session.profile.tenantId,
      name: parsed.name,
      asset_tag: assetTag,
      type: parsed.type,
      brand: parsed.brand,
      model: parsed.model,
      serial: parsed.serial,
      purchase_date: parsed.purchaseDate || null,
      cost: parsed.cost ?? null,
      status: parsed.status,
      location: parsed.location,
      assigned_to: parsed.assignedTo,
      notes: { text: parsed.notes ?? '' },
      created_by: session.userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create asset' };
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

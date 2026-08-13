import { NextRequest, NextResponse } from 'next/server';
import { getAssetById, listAssetMovements, updateAsset } from '@/lib/assets/actions';
import { requireApiUser } from '@/lib/api/require-user';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth/session';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('read', 'Asset');
  if (auth.error) return auth.error;

  const asset = await getAssetById(params.id);
  if (!asset) {
    return NextResponse.json({ data: null, error: 'Asset not found' }, { status: 404 });
  }

  const session = await getSessionProfile();
  const supabase = await createSupabaseServerClient();
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, number, title, type, status, priority, created_at')
    .eq('tenant_id', session?.profile.tenantId)
    .eq('asset_id', params.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: cis } = await supabase
    .from('cmdb_items')
    .select('id, name, type')
    .eq('tenant_id', session?.profile.tenantId)
    .eq('asset_id', params.id);

  const movements = await listAssetMovements(params.id);

  let replacedBy: { id: string; name: string; assetTag: string } | null = null;
  if (asset.replacedById) {
    const { data: replacement } = await supabase
      .from('assets')
      .select('id, name, asset_tag')
      .eq('id', asset.replacedById)
      .maybeSingle();
    if (replacement) {
      replacedBy = { id: replacement.id, name: replacement.name, assetTag: replacement.asset_tag };
    }
  }

  return NextResponse.json({
    data: {
      ...asset,
      tickets: tickets ?? [],
      configurationItems: cis ?? [],
      movements,
      replacedBy,
    },
    error: null,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('update', 'Asset');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = await updateAsset(params.id, body);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to update asset' },
      { status: 500 },
    );
  }
}

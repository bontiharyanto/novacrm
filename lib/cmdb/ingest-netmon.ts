import { z } from 'zod';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';

const uuidSchema = z.string().uuid();

const ciSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(200),
  type: z.string().trim().min(1).max(80).default('hardware'),
  assetTag: z.string().trim().max(40).optional(),
  serial: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  owner: z.string().trim().max(120).optional(),
  status: z.string().trim().max(40).optional(),
});

const deviceSchema = z.object({
  hostname: z.string().trim().max(120).optional(),
  ip: z.string().trim().max(80).optional(),
});

const payloadSchema = z.object({
  source: z.string().optional(),
  op: z.enum(['upsert', 'retire', 'ping']).default('upsert'),
  fingerprint: z.string().trim().min(4).max(180).optional(),
  accountId: z.preprocess((value) => {
    if (value == null || value === '') return undefined;
    return value;
  }, uuidSchema.optional()),
  ci: ciSchema.optional(),
  device: deviceSchema.optional(),
});

type AssetRow = { id: string; asset_tag: string; status: string };
type CmdbRow = { id: string; asset_id: string | null; attributes: Record<string, string> | null };

function asAttrs(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (item == null) continue;
    out[key] = String(item);
  }
  return out;
}

function mapAssetType(ciType: string) {
  const raw = ciType.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['network', 'switch', 'firewall', 'router', 'circuit', 'cctv', 'nvr', 'ap'].includes(raw)) return 'network';
  if (raw === 'printer') return 'printer';
  if (['laptop', 'endpoint', 'pc', 'workstation'].includes(raw)) return 'laptop';
  if (['mobile', 'phone'].includes(raw)) return 'mobile';
  if (raw === 'server' || raw === 'vm' || raw === 'host') return 'server';
  if (/^[a-z0-9_]{1,40}$/.test(raw)) return raw === 'hardware' || raw === 'software' || raw === 'license' || raw === 'site' ? 'server' : raw;
  return 'server';
}

function mapAssetStatus(status?: string, retired = false) {
  if (retired) return 'retired';
  const value = (status ?? '').toLowerCase();
  if (value === 'retired') return 'retired';
  if (value === 'maintenance') return 'in_repair';
  return 'active';
}

function tagOf(ciId: string, assetTag?: string) {
  const fromCi = assetTag?.trim().replace(/\s+/g, '-').slice(0, 40);
  if (fromCi) return fromCi;
  return `NETMON-${ciId}`.slice(0, 40);
}

function fingerprintOf(input: z.infer<typeof payloadSchema>) {
  if (input.fingerprint?.trim()) return input.fingerprint.trim().slice(0, 180);
  if (input.ci?.id) return `netmon:${input.ci.id}`;
  return '';
}

async function resolveAccountId(tenantId: string, requested?: string) {
  const supabase = createSupabaseAdminClient();
  if (requested) {
    const { data } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', requested)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!data?.id) return { accountId: null as string | null, error: 'NovaCRM account not found for this tenant' };
    return { accountId: data.id, error: null };
  }
  const { data } = await supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('type', 'internal')
    .maybeSingle();
  if (!data?.id) return { accountId: null as string | null, error: 'NovaCRM Internal account is missing' };
  return { accountId: data.id, error: null };
}

async function findCiByFingerprint(tenantId: string, fingerprint: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('cmdb_items')
    .select('id, asset_id, attributes')
    .eq('tenant_id', tenantId)
    .contains('attributes', { fingerprint, source: 'NETMON' })
    .limit(1)
    .maybeSingle();
  return (data as CmdbRow | null) ?? null;
}

async function findAssetByTag(tenantId: string, assetTag: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('assets')
    .select('id, asset_tag, status')
    .eq('tenant_id', tenantId)
    .eq('asset_tag', assetTag)
    .maybeSingle();
  return (data as AssetRow | null) ?? null;
}

function notesText(ci: z.infer<typeof ciSchema>, device?: z.infer<typeof deviceSchema>, status?: string) {
  const lines = ['Synced from NETMON CMDB.'];
  if (device?.hostname || device?.ip) {
    lines.push(`Device: ${[device.hostname, device.ip].filter(Boolean).join(' · ')}`);
  }
  if ((status ?? ci.status) === 'outage') lines.push('NETMON status: outage.');
  return lines.join(' ');
}

export async function ingestNetmonCmdb(tenantId: string, raw: unknown) {
  if (!hasServiceRole()) {
    return { data: null, error: 'Service role is required for CMDB ingest', status: 500 };
  }

  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid CMDB payload', status: 400 };
  }

  const input = parsed.data;
  if (input.op === 'ping') {
    return { data: { ok: true, channel: 'cmdb' }, error: null, status: 200 };
  }

  const fingerprint = fingerprintOf(input);
  if (!fingerprint || !input.ci) {
    return { data: null, error: 'fingerprint and ci are required', status: 400 };
  }

  const account = await resolveAccountId(tenantId, input.accountId);
  if (!account.accountId) {
    return { data: null, error: account.error ?? 'Select an account', status: 400 };
  }

  const supabase = createSupabaseAdminClient();
  const existingCi = await findCiByFingerprint(tenantId, fingerprint);
  const preferredTag = tagOf(input.ci.id, input.ci.assetTag);
  let asset = existingCi?.asset_id
    ? ((
        await supabase.from('assets').select('id, asset_tag, status').eq('id', existingCi.asset_id).maybeSingle()
      ).data as AssetRow | null)
    : null;

  if (!asset) {
    const byTag = await findAssetByTag(tenantId, preferredTag);
    if (byTag) asset = byTag;
  }

  let assetTag = preferredTag;
  if (asset && asset.asset_tag !== preferredTag) {
    assetTag = asset.asset_tag;
  } else if (!asset) {
    const clash = await findAssetByTag(tenantId, preferredTag);
    if (clash) assetTag = `NETMON-${input.ci.id}`.slice(0, 40);
  }

  const assetStatus = mapAssetStatus(input.ci.status, input.op === 'retire');
  const assetType = mapAssetType(input.ci.type);
  const attributes: Record<string, string> = {
    source: 'NETMON',
    fingerprint,
    netmonCiId: input.ci.id,
    serial: input.ci.serial ?? '',
    location: input.ci.location ?? '',
    owner: input.ci.owner ?? '',
    status: input.op === 'retire' ? 'retired' : (input.ci.status ?? 'in_service'),
    hostname: input.device?.hostname ?? '',
    ip: input.device?.ip ?? '',
  };

  if (input.op === 'retire') {
    if (!existingCi && !asset) {
      return { data: { skipped: true, fingerprint }, error: null, status: 200 };
    }
    if (asset) {
      await supabase
        .from('assets')
        .update({
          status: 'retired',
          notes: { text: notesText(input.ci, input.device, 'retired') },
          updated_at: new Date().toISOString(),
        })
        .eq('id', asset.id)
        .eq('tenant_id', tenantId);
    }
    if (existingCi) {
      await supabase
        .from('cmdb_items')
        .update({
          attributes: { ...asAttrs(existingCi.attributes), ...attributes, status: 'retired' },
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCi.id)
        .eq('tenant_id', tenantId);
    }
    return {
      data: {
        assetId: asset?.id ?? null,
        ciId: existingCi?.id ?? null,
        assetTag: asset?.asset_tag ?? assetTag,
        retired: true,
      },
      error: null,
      status: 200,
    };
  }

  const assetFields = {
    tenant_id: tenantId,
    account_id: account.accountId,
    name: input.ci.name,
    asset_tag: assetTag,
    type: assetType,
    serial: input.ci.serial ?? null,
    status: assetStatus,
    location: input.ci.location ?? null,
    assigned_to: input.ci.owner ?? null,
    notes: { text: notesText(input.ci, input.device, input.ci.status) },
    updated_at: new Date().toISOString(),
  };

  if (asset) {
    const { error } = await supabase.from('assets').update(assetFields).eq('id', asset.id).eq('tenant_id', tenantId);
    if (error) return { data: null, error: error.message, status: 400 };
  } else {
    const { data, error } = await supabase.from('assets').insert(assetFields).select('id, asset_tag, status').single();
    if (error || !data) return { data: null, error: error?.message ?? 'Unable to create asset', status: 400 };
    asset = data as AssetRow;
  }

  const ciFields = {
    tenant_id: tenantId,
    account_id: account.accountId,
    asset_id: asset.id,
    name: input.ci.name,
    type: input.ci.type.slice(0, 80),
    attributes,
    updated_at: new Date().toISOString(),
  };

  if (existingCi) {
    const { error } = await supabase.from('cmdb_items').update(ciFields).eq('id', existingCi.id).eq('tenant_id', tenantId);
    if (error) return { data: null, error: error.message, status: 400 };
    return { data: { assetId: asset.id, ciId: existingCi.id, assetTag: asset.asset_tag }, error: null, status: 200 };
  }

  const { data: created, error } = await supabase.from('cmdb_items').insert({ ...ciFields, relations: [] }).select('id').single();
  if (error || !created) return { data: null, error: error?.message ?? 'Unable to create CI', status: 400 };
  return { data: { assetId: asset.id, ciId: created.id, assetTag: asset.asset_tag }, error: null, status: 200 };
}

import { accountSchema } from '@/lib/accounts/schema';
import { getAccountScope } from '@/lib/accounts/scope';
import { assetSchema } from '@/lib/assets/schema';
import { getSessionProfile } from '@/lib/auth/session';
import { cidrSchema, ipv4Schema } from '@/lib/cmdb/schema';
import {
  IMPORT_CATALOG,
  getImportEntity,
  isImportKind,
  type ImportKind,
  type ImportPreview,
  type ImportPreviewRow,
} from '@/lib/import/catalog';
import { IMPORT_MAX_ROWS, pick } from '@/lib/import/parse';
import { canRole, type Actions, type Subjects } from '@/lib/rbac/ability';
import { hasServiceRole } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ticketPrioritySchema, ticketStatusSchema, ticketTypeSchema } from '@/lib/tickets/schema';
import { createUserSchema } from '@/lib/users/schema';

type AccountRef = { id: string; type: string; name: string; slug: string; code?: string | null };

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'account';
}

function mask(row: Record<string, string>) {
  const next = { ...row };
  if (next.password) next.password = '••••••••';
  return next;
}

function valuesFor(row: Record<string, string>) {
  const values: Record<string, string> = {};
  for (const entity of IMPORT_CATALOG) {
    for (const column of entity.columns) {
      if (!(column.key in values)) values[column.key] = pick(row, column.key);
    }
  }
  return mask(values);
}

function findAccount(accounts: AccountRef[], token: string, fallbackId?: string | null) {
  const needle = token.trim().toLowerCase();
  if (needle) {
    return (
      accounts.find((item) => (item.code ?? '').toLowerCase() === needle) ??
      accounts.find((item) => item.slug.toLowerCase() === needle) ??
      accounts.find((item) => item.name.toLowerCase() === needle) ??
      null
    );
  }
  return accounts.find((item) => item.id === fallbackId) ?? null;
}

function permissionFor(kind: ImportKind): { action: Actions; subject: Subjects } {
  if (kind === 'accounts') return { action: 'create', subject: 'Account' };
  if (kind === 'users') return { action: 'create', subject: 'User' };
  if (kind === 'assets') return { action: 'create', subject: 'Asset' };
  if (kind === 'tickets') return { action: 'create', subject: 'Ticket' };
  return { action: 'create', subject: 'Cmdb' };
}

function finish(kind: ImportKind, previewRows: ImportPreviewRow[]): ImportPreview {
  const entity = getImportEntity(kind);
  const errorCount = previewRows.filter((item) => item.action === 'error').length;
  return {
    total: previewRows.length,
    createCount: previewRows.filter((item) => item.action === 'create').length,
    updateCount: previewRows.filter((item) => item.action === 'update').length,
    errorCount,
    canCommit: previewRows.length > 0 && errorCount === 0,
    columns: entity?.columns.map((column) => column.key) ?? [],
    rows: previewRows,
  };
}

export async function previewBulkImport(
  kind: string,
  rows: Record<string, string>[],
): Promise<{ data: ImportPreview | null; error: string | null }> {
  if (!isImportKind(kind)) return { data: null, error: 'Unknown import type.' };
  if (rows.length === 0) return { data: null, error: 'File has no data rows.' };
  if (rows.length > IMPORT_MAX_ROWS) return { data: null, error: `Limit is ${IMPORT_MAX_ROWS} rows per file.` };

  const session = await getSessionProfile();
  const perm = permissionFor(kind);
  if (!session || !canRole(session.profile.role, perm.action, perm.subject)) {
    return { data: null, error: 'Unauthorized' };
  }

  const scope = await getAccountScope(session);
  const supabase = await createSupabaseServerClient();
  const { data: accountRows } = await supabase
    .from('accounts')
    .select('id, type, name, slug, code')
    .eq('tenant_id', session.profile.tenantId);
  const accounts = (accountRows ?? []) as AccountRef[];
  const fallbackAccountId = scope.account?.id ?? null;
  const tenantId = session.profile.tenantId;

  if (kind === 'accounts') return { data: finish(kind, await previewAccounts(rows, tenantId)), error: null };
  if (kind === 'users') return { data: finish(kind, await previewUsers(rows, accounts, fallbackAccountId, tenantId)), error: null };
  if (kind === 'assets') return { data: finish(kind, await previewAssets(rows, accounts, fallbackAccountId, tenantId)), error: null };
  if (kind === 'cmdb') return { data: finish(kind, await previewCmdb(rows, accounts, fallbackAccountId, tenantId)), error: null };
  if (kind === 'ip_segments') return { data: finish(kind, await previewSegments(rows, accounts, fallbackAccountId, tenantId)), error: null };
  return { data: finish(kind, await previewTickets(rows, accounts, fallbackAccountId, tenantId)), error: null };
}

async function previewAccounts(rows: Record<string, string>[], tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase.from('accounts').select('id, slug, code, type').eq('tenant_id', tenantId);
  const bySlug = new Set((existing ?? []).map((row) => String(row.slug).toLowerCase()));
  const byCode = new Set((existing ?? []).filter((row) => row.code).map((row) => String(row.code).toLowerCase()));
  const internal = new Set(
    (existing ?? []).filter((row) => row.type === 'internal').flatMap((row) => [String(row.slug).toLowerCase(), String(row.code ?? '').toLowerCase()]),
  );
  const seen = new Set<string>();
  const preview: ImportPreviewRow[] = [];

  rows.forEach((row, index) => {
    const values = valuesFor(row);
    const parsed = accountSchema.safeParse({
      name: pick(row, 'name'),
      code: pick(row, 'code') || undefined,
      slug: pick(row, 'slug') || undefined,
      status: pick(row, 'status') || 'active',
      type: 'customer',
    });
    if (!parsed.success) {
      preview.push({ row: index + 2, action: 'error', values, message: parsed.error.issues[0]?.message ?? 'Invalid account' });
      return;
    }
    const slug = (parsed.data.slug?.trim() || slugify(parsed.data.name)).toLowerCase();
    const code = parsed.data.code?.toLowerCase();
    const key = code || slug;
    if (internal.has(slug) || (code && internal.has(code))) {
      preview.push({ row: index + 2, action: 'error', values, message: 'Cannot overwrite the Internal account' });
      return;
    }
    if (seen.has(key)) {
      preview.push({ row: index + 2, action: 'error', values, message: 'Duplicate account key in this file' });
      return;
    }
    seen.add(key);
    const exists = bySlug.has(slug) || (code ? byCode.has(code) : false);
    preview.push({ row: index + 2, action: exists ? 'update' : 'create', values });
  });
  return preview;
}

async function previewUsers(rows: Record<string, string>[], accounts: AccountRef[], fallbackAccountId: string | null, tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase.from('profiles').select('email').eq('tenant_id', tenantId);
  const emails = new Set((existing ?? []).map((row) => String(row.email ?? '').toLowerCase()));
  const seen = new Set<string>();
  const preview: ImportPreviewRow[] = [];

  rows.forEach((row, index) => {
    const values = valuesFor(row);
    const account = findAccount(accounts, pick(row, 'accountCode', 'account', 'slug'), fallbackAccountId);
    if (!account) {
      preview.push({ row: index + 2, action: 'error', values, message: 'Account not found. Set accountCode.' });
      return;
    }
    const email = pick(row, 'email').toLowerCase();
    const password = pick(row, 'password');
    const parsed = createUserSchema.safeParse({
      fullName: pick(row, 'fullName', 'name'),
      email,
      phone: pick(row, 'phone') || undefined,
      role: pick(row, 'role') || 'agent',
      password: password || 'ChangeMe!2026',
      accountId: account.id,
    });
    if (!parsed.success) {
      preview.push({ row: index + 2, action: 'error', values, message: parsed.error.issues[0]?.message ?? 'Invalid user' });
      return;
    }
    if (parsed.data.role === 'customer' && account.type === 'internal') {
      preview.push({ row: index + 2, action: 'error', values, message: 'Portal users must join a customer account' });
      return;
    }
    if (seen.has(email)) {
      preview.push({ row: index + 2, action: 'error', values, message: 'Duplicate email in this file' });
      return;
    }
    seen.add(email);
    const exists = emails.has(email);
    if (!exists && password.length < 8) {
      preview.push({ row: index + 2, action: 'error', values, message: 'password is required for new users (min 8)' });
      return;
    }
    if (!exists && !hasServiceRole()) {
      preview.push({ row: index + 2, action: 'error', values, message: 'Service role is not configured. Cannot create logins.' });
      return;
    }
    preview.push({ row: index + 2, action: exists ? 'update' : 'create', values });
  });
  return preview;
}

async function previewAssets(rows: Record<string, string>[], accounts: AccountRef[], fallbackAccountId: string | null, tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase.from('assets').select('asset_tag').eq('tenant_id', tenantId);
  const tags = new Set((existing ?? []).map((row) => String(row.asset_tag).toUpperCase()));
  const seen = new Set<string>();
  const preview: ImportPreviewRow[] = [];

  rows.forEach((row, index) => {
    const values = valuesFor(row);
    const account = findAccount(accounts, pick(row, 'accountCode', 'account'), fallbackAccountId);
    if (!account) {
      preview.push({ row: index + 2, action: 'error', values, message: 'Account not found. Set accountCode.' });
      return;
    }
    const parsed = assetSchema.safeParse({
      name: pick(row, 'name'),
      assetTag: pick(row, 'assetTag', 'tag'),
      type: pick(row, 'type') || 'laptop',
      status: pick(row, 'status') || 'active',
      brand: pick(row, 'brand') || undefined,
      model: pick(row, 'model') || undefined,
      serial: pick(row, 'serial') || undefined,
      purchaseDate: pick(row, 'purchaseDate') || undefined,
      warrantyExpiry: pick(row, 'warrantyExpiry', 'warranty') || undefined,
      cost: pick(row, 'cost') || undefined,
      location: pick(row, 'location') || undefined,
      assignedTo: pick(row, 'assignedTo', 'assigned') || undefined,
      notes: pick(row, 'notes') || undefined,
      accountId: account.id,
    });
    if (!parsed.success) {
      preview.push({ row: index + 2, action: 'error', values, message: parsed.error.issues[0]?.message ?? 'Invalid asset' });
      return;
    }
    const tag = parsed.data.assetTag?.trim().toUpperCase();
    if (!tag) {
      preview.push({ row: index + 2, action: 'error', values, message: 'assetTag is required' });
      return;
    }
    if (seen.has(tag)) {
      preview.push({ row: index + 2, action: 'error', values, message: 'Duplicate assetTag in this file' });
      return;
    }
    seen.add(tag);
    preview.push({ row: index + 2, action: tags.has(tag) ? 'update' : 'create', values });
  });
  return preview;
}

async function previewCmdb(rows: Record<string, string>[], accounts: AccountRef[], fallbackAccountId: string | null, tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: items }, { data: assets }] = await Promise.all([
    supabase.from('cmdb_items').select('name, type, account_id').eq('tenant_id', tenantId),
    supabase.from('assets').select('asset_tag, account_id').eq('tenant_id', tenantId),
  ]);
  const ciKey = (accountId: string, name: string, type: string) => `${accountId}:${name.trim().toLowerCase()}:${type.trim().toLowerCase()}`;
  const existing = new Set((items ?? []).map((row) => ciKey(row.account_id, row.name, row.type)));
  const assetByTag = new Map((assets ?? []).map((row) => [String(row.asset_tag).toUpperCase(), row]));
  const seen = new Set<string>();
  const preview: ImportPreviewRow[] = [];

  rows.forEach((row, index) => {
    const values = valuesFor(row);
    const account = findAccount(accounts, pick(row, 'accountCode', 'account'), fallbackAccountId);
    if (!account) {
      preview.push({ row: index + 2, action: 'error', values, message: 'Account not found. Set accountCode.' });
      return;
    }
    const name = pick(row, 'name');
    const type = pick(row, 'type') || 'service';
    if (!name) {
      preview.push({ row: index + 2, action: 'error', values, message: 'name is required' });
      return;
    }
    const tag = pick(row, 'assetTag', 'tag').toUpperCase();
    const asset = tag ? assetByTag.get(tag) : undefined;
    if (tag && !asset) {
      preview.push({ row: index + 2, action: 'error', values, message: `Asset ${tag} not found` });
      return;
    }
    if (asset && asset.account_id !== account.id) {
      preview.push({ row: index + 2, action: 'error', values, message: `Asset ${tag} belongs to another account` });
      return;
    }
    const key = ciKey(account.id, name, type);
    if (seen.has(key)) {
      preview.push({ row: index + 2, action: 'error', values, message: 'Duplicate CI in this file' });
      return;
    }
    seen.add(key);
    preview.push({ row: index + 2, action: existing.has(key) ? 'update' : 'create', values });
  });
  return preview;
}

async function previewSegments(rows: Record<string, string>[], accounts: AccountRef[], fallbackAccountId: string | null, tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: existing }, { data: cis }] = await Promise.all([
    supabase.from('ip_segments').select('account_id, cidr').eq('tenant_id', tenantId),
    supabase.from('cmdb_items').select('id, name, account_id').eq('tenant_id', tenantId),
  ]);
  const byCidr = new Set((existing ?? []).map((row) => `${row.account_id}:${String(row.cidr)}`));
  const ciByName = new Set((cis ?? []).map((row) => `${row.account_id}:${String(row.name).toLowerCase()}`));
  const seen = new Set<string>();
  const preview: ImportPreviewRow[] = [];

  rows.forEach((row, index) => {
    const values = valuesFor(row);
    const account = findAccount(accounts, pick(row, 'accountCode', 'account'), fallbackAccountId);
    if (!account) {
      preview.push({ row: index + 2, action: 'error', values, message: 'Account not found. Set accountCode.' });
      return;
    }
    const cidr = cidrSchema.safeParse(pick(row, 'cidr'));
    if (!cidr.success) {
      preview.push({ row: index + 2, action: 'error', values, message: cidr.error.issues[0]?.message ?? 'Invalid CIDR' });
      return;
    }
    const gatewayRaw = pick(row, 'gateway');
    if (gatewayRaw && !ipv4Schema.safeParse(gatewayRaw).success) {
      preview.push({ row: index + 2, action: 'error', values, message: 'Invalid gateway' });
      return;
    }
    const vlanRaw = pick(row, 'vlan');
    const vlan = vlanRaw ? Number(vlanRaw) : undefined;
    if (vlanRaw && (!Number.isInteger(vlan) || (vlan ?? 0) < 1 || (vlan ?? 0) > 4094)) {
      preview.push({ row: index + 2, action: 'error', values, message: 'VLAN must be 1–4094' });
      return;
    }
    const ciName = pick(row, 'ciName', 'ci');
    if (ciName && !ciByName.has(`${account.id}:${ciName.toLowerCase()}`)) {
      preview.push({ row: index + 2, action: 'error', values, message: `CI ${ciName} not found in this account` });
      return;
    }
    const key = `${account.id}:${cidr.data}`;
    if (seen.has(key)) {
      preview.push({ row: index + 2, action: 'error', values, message: 'Duplicate CIDR in this file' });
      return;
    }
    seen.add(key);
    preview.push({ row: index + 2, action: byCidr.has(key) ? 'update' : 'create', values });
  });
  return preview;
}

async function previewTickets(rows: Record<string, string>[], accounts: AccountRef[], fallbackAccountId: string | null, tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: assets } = await supabase.from('assets').select('asset_tag').eq('tenant_id', tenantId);
  const tags = new Set((assets ?? []).map((row) => String(row.asset_tag).toUpperCase()));
  const preview: ImportPreviewRow[] = [];

  rows.forEach((row, index) => {
    const values = valuesFor(row);
    const account = findAccount(accounts, pick(row, 'accountCode', 'account'), fallbackAccountId);
    if (!account) {
      preview.push({ row: index + 2, action: 'error', values, message: 'Account not found. Set accountCode.' });
      return;
    }
    const title = pick(row, 'title');
    if (title.length < 3) {
      preview.push({ row: index + 2, action: 'error', values, message: 'title must be at least 3 characters' });
      return;
    }
    const type = ticketTypeSchema.safeParse(pick(row, 'type') || 'incident');
    const priority = ticketPrioritySchema.safeParse(pick(row, 'priority') || 'medium');
    const status = ticketStatusSchema.safeParse(pick(row, 'status') || 'open');
    if (!type.success || !priority.success || !status.success) {
      preview.push({ row: index + 2, action: 'error', values, message: 'Invalid type, priority, or status' });
      return;
    }
    const tag = pick(row, 'assetTag', 'tag').toUpperCase();
    if (tag && !tags.has(tag)) {
      preview.push({ row: index + 2, action: 'error', values, message: `Asset ${tag} not found` });
      return;
    }
    preview.push({ row: index + 2, action: 'create', values });
  });
  return preview;
}

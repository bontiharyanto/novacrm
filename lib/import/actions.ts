import { accountSchema } from '@/lib/accounts/schema';
import { getAccountScope } from '@/lib/accounts/scope';
import { assetSchema } from '@/lib/assets/schema';
import { getSessionProfile } from '@/lib/auth/session';
import { cidrSchema, ipv4Schema } from '@/lib/cmdb/schema';
import { isImportKind, type ImportKind, type ImportResult } from '@/lib/import/catalog';
import { IMPORT_MAX_ROWS, pick } from '@/lib/import/parse';
import { canRole, type Actions, type Subjects } from '@/lib/rbac/ability';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { snapshotSla } from '@/lib/sla/engine';
import { textToDescription } from '@/lib/tickets/mappers';
import { ticketPrioritySchema, ticketStatusSchema, ticketTypeSchema } from '@/lib/tickets/schema';
import { createUserSchema } from '@/lib/users/schema';
import { normalizePhone, safeNotificationText } from '@/lib/notifications/helpers';
import { isStaffRole } from '@/lib/rbac/roles';
import { assertAccountQuota, assertAgentQuota, assertTicketQuota } from '@/lib/tenants/meter';

type AccountRef = { id: string; type: string; name: string; slug: string; code?: string | null; status: string };

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'account';
}

function emptyResult(): ImportResult {
  return { created: 0, updated: 0, skipped: 0, errors: [] };
}

function findAccount(accounts: AccountRef[], token: string, fallbackId?: string | null) {
  const needle = token.trim().toLowerCase();
  if (needle) {
    const match =
      accounts.find((item) => (item.code ?? '').toLowerCase() === needle) ??
      accounts.find((item) => item.slug.toLowerCase() === needle) ??
      accounts.find((item) => item.name.toLowerCase() === needle);
    if (match) return match;
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

export async function runBulkImport(kind: string, rows: Record<string, string>[]): Promise<{ data: ImportResult | null; error: string | null }> {
  if (!isImportKind(kind)) {
    return { data: null, error: 'Unknown import type.' };
  }
  if (rows.length === 0) {
    return { data: null, error: 'File has no data rows.' };
  }
  if (rows.length > IMPORT_MAX_ROWS) {
    return { data: null, error: `Limit is ${IMPORT_MAX_ROWS} rows per file.` };
  }

  const session = await getSessionProfile();
  const perm = permissionFor(kind);
  if (!session || !canRole(session.profile.role, perm.action, perm.subject)) {
    return { data: null, error: 'Unauthorized' };
  }

  const scope = await getAccountScope(session);
  const supabase = await createSupabaseServerClient();
  const { data: accountRows } = await supabase
    .from('accounts')
    .select('id, type, name, slug, code, status')
    .eq('tenant_id', session.profile.tenantId);
  const accounts = (accountRows ?? []) as AccountRef[];
  const fallbackAccountId = scope.account?.id ?? null;

  if (kind === 'accounts') return { data: await importAccounts(rows, session.profile.tenantId, session.userId), error: null };
  if (kind === 'users') return { data: await importUsers(rows, accounts, fallbackAccountId, session.profile.tenantId, session.userId), error: null };
  if (kind === 'assets') return { data: await importAssets(rows, accounts, fallbackAccountId, session.profile.tenantId, session.userId), error: null };
  if (kind === 'cmdb') return { data: await importCmdb(rows, accounts, fallbackAccountId, session.profile.tenantId, session.userId), error: null };
  if (kind === 'ip_segments') return { data: await importSegments(rows, accounts, fallbackAccountId, session.profile.tenantId, session.userId), error: null };
  return { data: await importTickets(rows, accounts, fallbackAccountId, session.profile.tenantId, session.userId, session.profile.fullName, session.profile.email), error: null };
}

async function importAccounts(rows: Record<string, string>[], tenantId: string, userId: string) {
  const result = emptyResult();
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase.from('accounts').select('id, slug, code, type').eq('tenant_id', tenantId);
  const bySlug = new Map((existing ?? []).map((row) => [String(row.slug).toLowerCase(), row]));
  const byCode = new Map(
    (existing ?? []).filter((row) => row.code).map((row) => [String(row.code).toLowerCase(), row]),
  );

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] ?? {};
    const parsed = accountSchema.safeParse({
      name: pick(row, 'name'),
      code: pick(row, 'code') || undefined,
      slug: pick(row, 'slug') || undefined,
      status: pick(row, 'status') || 'active',
      type: 'customer',
    });
    if (!parsed.success) {
      result.errors.push({ row: index + 2, message: parsed.error.issues[0]?.message ?? 'Invalid account' });
      continue;
    }
    const slug = parsed.data.slug?.trim() || slugify(parsed.data.name);
    const code = parsed.data.code?.toUpperCase();
    const found = (code ? byCode.get(code.toLowerCase()) : undefined) ?? bySlug.get(slug.toLowerCase());
    if (found?.type === 'internal') {
      result.errors.push({ row: index + 2, message: 'Cannot overwrite the Internal account' });
      continue;
    }
    if (found) {
      const { error } = await supabase
        .from('accounts')
        .update({ name: parsed.data.name.trim(), slug, code: code ?? null, status: parsed.data.status })
        .eq('id', found.id)
        .eq('tenant_id', tenantId);
      if (error) {
        result.errors.push({ row: index + 2, message: error.message });
        continue;
      }
      result.updated += 1;
      continue;
    }
    const quotaError = await assertAccountQuota(tenantId);
    if (quotaError) {
      result.errors.push({ row: index + 2, message: quotaError });
      continue;
    }
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        tenant_id: tenantId,
        type: 'customer',
        name: parsed.data.name.trim(),
        slug,
        code: code ?? null,
        status: parsed.data.status,
        created_by: userId,
      })
      .select('id, slug, code, type')
      .single();
    if (error || !data) {
      result.errors.push({ row: index + 2, message: error?.message ?? 'Unable to create account' });
      continue;
    }
    await supabase.from('account_members').insert({
      tenant_id: tenantId,
      account_id: data.id,
      user_id: userId,
      role: 'owner',
      created_by: userId,
    });
    bySlug.set(String(data.slug).toLowerCase(), data);
    if (data.code) byCode.set(String(data.code).toLowerCase(), data);
    result.created += 1;
  }
  return result;
}

async function importUsers(
  rows: Record<string, string>[],
  accounts: AccountRef[],
  fallbackAccountId: string | null,
  tenantId: string,
  userId: string,
) {
  const result = emptyResult();
  if (!hasServiceRole()) {
    result.errors.push({ row: 0, message: 'Service role is not configured. Cannot create logins.' });
    return result;
  }
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] ?? {};
    const account = findAccount(accounts, pick(row, 'accountCode', 'account', 'slug'), fallbackAccountId);
    if (!account) {
      result.errors.push({ row: index + 2, message: 'Account not found. Set accountCode.' });
      continue;
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
      result.errors.push({ row: index + 2, message: parsed.error.issues[0]?.message ?? 'Invalid user' });
      continue;
    }
    if (parsed.data.role === 'customer' && account.type === 'internal') {
      result.errors.push({ row: index + 2, message: 'Portal users must join a customer account' });
      continue;
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('email', parsed.data.email)
      .maybeSingle();

    if (!existing && password.length < 8) {
      result.errors.push({ row: index + 2, message: 'password is required for new users (min 8)' });
      continue;
    }

    if (existing) {
      const { data: current } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', existing.id)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (isStaffRole(parsed.data.role) && current && !isStaffRole(current.role)) {
        const quotaError = await assertAgentQuota(tenantId);
        if (quotaError) {
          result.errors.push({ row: index + 2, message: quotaError });
          continue;
        }
      }
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: parsed.data.fullName,
          phone: parsed.data.phone ?? null,
          role: parsed.data.role,
        })
        .eq('id', existing.id)
        .eq('tenant_id', tenantId);
      if (error) {
        result.errors.push({ row: index + 2, message: error.message });
        continue;
      }
      result.updated += 1;
      continue;
    }

    if (isStaffRole(parsed.data.role)) {
      const quotaError = await assertAgentQuota(tenantId);
      if (quotaError) {
        result.errors.push({ row: index + 2, message: quotaError });
        continue;
      }
    }

    const created = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.data.fullName,
        role: parsed.data.role,
        tenant_id: tenantId,
      },
    });
    if (created.error || !created.data.user) {
      result.errors.push({ row: index + 2, message: created.error?.message ?? 'Unable to create login' });
      continue;
    }
    const newId = created.data.user.id;
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        role: parsed.data.role,
        created_by: userId,
      })
      .eq('id', newId)
      .eq('tenant_id', tenantId);
    if (profileError) {
      await admin.auth.admin.deleteUser(newId);
      result.errors.push({ row: index + 2, message: profileError.message });
      continue;
    }
    const memberRole = parsed.data.role === 'customer' ? 'portal' : 'member';
    const accountIds = new Set<string>([account.id]);
    if (parsed.data.role !== 'customer') {
      const internal = accounts.find((item) => item.type === 'internal');
      if (internal) accountIds.add(internal.id);
    }
    const { error: memberError } = await supabase.from('account_members').insert(
      Array.from(accountIds).map((accountId) => ({
        tenant_id: tenantId,
        account_id: accountId,
        user_id: newId,
        role: memberRole,
        created_by: userId,
      })),
    );
    if (memberError) {
      await admin.auth.admin.deleteUser(newId);
      result.errors.push({ row: index + 2, message: memberError.message });
      continue;
    }
    result.created += 1;
  }
  return result;
}

async function importAssets(
  rows: Record<string, string>[],
  accounts: AccountRef[],
  fallbackAccountId: string | null,
  tenantId: string,
  userId: string,
) {
  const result = emptyResult();
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase.from('assets').select('id, asset_tag').eq('tenant_id', tenantId);
  const byTag = new Map((existing ?? []).map((row) => [String(row.asset_tag).toUpperCase(), row.id as string]));

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] ?? {};
    const account = findAccount(accounts, pick(row, 'accountCode', 'account'), fallbackAccountId);
    if (!account) {
      result.errors.push({ row: index + 2, message: 'Account not found. Set accountCode.' });
      continue;
    }
    const parsed = assetSchema.safeParse({
      name: pick(row, 'name'),
      assetTag: pick(row, 'assetTag', 'tag'),
      type: pick(row, 'type') || 'laptop',
      status: pick(row, 'status') || 'active',
      brand: pick(row, 'brand') || undefined,
      model: pick(row, 'model') || undefined,
      serial: pick(row, 'serial') || undefined,
      purchaseDate: pick(row, 'purchaseDate', 'purchasedate') || undefined,
      warrantyExpiry: pick(row, 'warrantyExpiry', 'warranty') || undefined,
      cost: pick(row, 'cost') || undefined,
      location: pick(row, 'location') || undefined,
      assignedTo: pick(row, 'assignedTo', 'assigned') || undefined,
      notes: pick(row, 'notes') || undefined,
      accountId: account.id,
    });
    if (!parsed.success) {
      result.errors.push({ row: index + 2, message: parsed.error.issues[0]?.message ?? 'Invalid asset' });
      continue;
    }
    const tag = parsed.data.assetTag?.trim().toUpperCase();
    if (!tag) {
      result.errors.push({ row: index + 2, message: 'assetTag is required' });
      continue;
    }
    const payload = {
      tenant_id: tenantId,
      account_id: account.id,
      name: parsed.data.name,
      asset_tag: tag,
      type: parsed.data.type,
      brand: parsed.data.brand ?? null,
      model: parsed.data.model ?? null,
      serial: parsed.data.serial ?? null,
      purchase_date: parsed.data.purchaseDate || null,
      warranty_expiry: parsed.data.warrantyExpiry || null,
      cost: parsed.data.cost ?? null,
      useful_life_months: parsed.data.usefulLifeMonths ?? 36,
      residual_value: parsed.data.residualValue ?? 0,
      status: parsed.data.status,
      location: parsed.data.location ?? null,
      assigned_to: parsed.data.assignedTo ?? null,
      notes: { text: parsed.data.notes ?? '' },
      created_by: userId,
    };
    const existingId = byTag.get(tag);
    if (existingId) {
      const { error } = await supabase.from('assets').update(payload).eq('id', existingId).eq('tenant_id', tenantId);
      if (error) {
        result.errors.push({ row: index + 2, message: error.message });
        continue;
      }
      result.updated += 1;
      continue;
    }
    const { data, error } = await supabase.from('assets').insert(payload).select('id, asset_tag').single();
    if (error || !data) {
      result.errors.push({ row: index + 2, message: error?.message ?? 'Unable to create asset' });
      continue;
    }
    byTag.set(String(data.asset_tag).toUpperCase(), data.id);
    result.created += 1;
  }
  return result;
}

async function importCmdb(
  rows: Record<string, string>[],
  accounts: AccountRef[],
  fallbackAccountId: string | null,
  tenantId: string,
  userId: string,
) {
  const result = emptyResult();
  const supabase = await createSupabaseServerClient();
  const { data: items } = await supabase.from('cmdb_items').select('id, name, type, account_id').eq('tenant_id', tenantId);
  const { data: assets } = await supabase.from('assets').select('id, asset_tag, account_id').eq('tenant_id', tenantId);
  const ciKey = (accountId: string, name: string, type: string) =>
    `${accountId}:${name.trim().toLowerCase()}:${type.trim().toLowerCase()}`;
  const byKey = new Map((items ?? []).map((row) => [ciKey(row.account_id, row.name, row.type), row.id as string]));
  const assetByTag = new Map((assets ?? []).map((row) => [String(row.asset_tag).toUpperCase(), row]));

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] ?? {};
    const account = findAccount(accounts, pick(row, 'accountCode', 'account'), fallbackAccountId);
    if (!account) {
      result.errors.push({ row: index + 2, message: 'Account not found. Set accountCode.' });
      continue;
    }
    const name = pick(row, 'name');
    const type = pick(row, 'type') || 'service';
    if (!name) {
      result.errors.push({ row: index + 2, message: 'name is required' });
      continue;
    }
    const tag = pick(row, 'assetTag', 'tag').toUpperCase();
    const asset = tag ? assetByTag.get(tag) : undefined;
    if (tag && !asset) {
      result.errors.push({ row: index + 2, message: `Asset ${tag} not found` });
      continue;
    }
    if (asset && asset.account_id !== account.id) {
      result.errors.push({ row: index + 2, message: `Asset ${tag} belongs to another account` });
      continue;
    }
    const attributes: Record<string, string> = {};
    const environment = pick(row, 'environment');
    const owner = pick(row, 'owner');
    if (environment) attributes.environment = environment;
    if (owner) attributes.owner = owner;
    const payload = {
      tenant_id: tenantId,
      account_id: account.id,
      name,
      type,
      asset_id: asset?.id ?? null,
      attributes,
      created_by: userId,
    };
    const existingId = byKey.get(ciKey(account.id, name, type));
    if (existingId) {
      const { error } = await supabase.from('cmdb_items').update(payload).eq('id', existingId).eq('tenant_id', tenantId);
      if (error) {
        result.errors.push({ row: index + 2, message: error.message });
        continue;
      }
      result.updated += 1;
      continue;
    }
    const { data, error } = await supabase.from('cmdb_items').insert({ ...payload, relations: [] }).select('id, name, type, account_id').single();
    if (error || !data) {
      result.errors.push({ row: index + 2, message: error?.message ?? 'Unable to create CI' });
      continue;
    }
    byKey.set(ciKey(data.account_id, data.name, data.type), data.id);
    result.created += 1;
  }
  return result;
}

async function importSegments(
  rows: Record<string, string>[],
  accounts: AccountRef[],
  fallbackAccountId: string | null,
  tenantId: string,
  userId: string,
) {
  const result = emptyResult();
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase.from('ip_segments').select('id, account_id, cidr').eq('tenant_id', tenantId);
  const { data: cis } = await supabase.from('cmdb_items').select('id, name, account_id').eq('tenant_id', tenantId);
  const byCidr = new Map((existing ?? []).map((row) => [`${row.account_id}:${String(row.cidr)}`, row.id as string]));
  const ciByName = new Map((cis ?? []).map((row) => [`${row.account_id}:${String(row.name).toLowerCase()}`, row.id as string]));

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] ?? {};
    const account = findAccount(accounts, pick(row, 'accountCode', 'account'), fallbackAccountId);
    if (!account) {
      result.errors.push({ row: index + 2, message: 'Account not found. Set accountCode.' });
      continue;
    }
    const cidrValue = pick(row, 'cidr');
    const cidr = cidrSchema.safeParse(cidrValue);
    if (!cidr.success) {
      result.errors.push({ row: index + 2, message: cidr.error.issues[0]?.message ?? 'Invalid CIDR' });
      continue;
    }
    const gatewayRaw = pick(row, 'gateway');
    if (gatewayRaw) {
      const gateway = ipv4Schema.safeParse(gatewayRaw);
      if (!gateway.success) {
        result.errors.push({ row: index + 2, message: 'Invalid gateway' });
        continue;
      }
    }
    const vlanRaw = pick(row, 'vlan');
    const vlan = vlanRaw ? Number(vlanRaw) : undefined;
    if (vlanRaw && (!Number.isInteger(vlan) || (vlan ?? 0) < 1 || (vlan ?? 0) > 4094)) {
      result.errors.push({ row: index + 2, message: 'VLAN must be 1–4094' });
      continue;
    }
    const ciName = pick(row, 'ciName', 'ci');
    const cmdbItemId = ciName ? ciByName.get(`${account.id}:${ciName.toLowerCase()}`) : undefined;
    if (ciName && !cmdbItemId) {
      result.errors.push({ row: index + 2, message: `CI ${ciName} not found in this account` });
      continue;
    }
    const payload = {
      tenant_id: tenantId,
      account_id: account.id,
      cmdb_item_id: cmdbItemId ?? null,
      name: pick(row, 'name') || cidr.data,
      cidr: cidr.data,
      vlan: vlan ?? null,
      gateway: gatewayRaw || null,
      purpose: pick(row, 'purpose') || 'user',
      created_by: userId,
    };
    const existingId = byCidr.get(`${account.id}:${cidr.data}`);
    if (existingId) {
      const { error } = await supabase.from('ip_segments').update(payload).eq('id', existingId).eq('tenant_id', tenantId);
      if (error) {
        result.errors.push({ row: index + 2, message: error.message });
        continue;
      }
      result.updated += 1;
      continue;
    }
    const { data, error } = await supabase.from('ip_segments').insert(payload).select('id, account_id, cidr').single();
    if (error || !data) {
      result.errors.push({ row: index + 2, message: error?.message ?? 'Unable to create segment' });
      continue;
    }
    byCidr.set(`${data.account_id}:${data.cidr}`, data.id);
    result.created += 1;
  }
  return result;
}

async function importTickets(
  rows: Record<string, string>[],
  accounts: AccountRef[],
  fallbackAccountId: string | null,
  tenantId: string,
  userId: string,
  actorName: string,
  actorEmail?: string,
) {
  const result = emptyResult();
  const supabase = await createSupabaseServerClient();
  const { data: profiles } = await supabase.from('profiles').select('id, email').eq('tenant_id', tenantId);
  const { data: assets } = await supabase.from('assets').select('id, asset_tag, account_id').eq('tenant_id', tenantId);
  const profileByEmail = new Map((profiles ?? []).map((row) => [String(row.email ?? '').toLowerCase(), row.id as string]));
  const assetByTag = new Map((assets ?? []).map((row) => [String(row.asset_tag).toUpperCase(), row]));

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] ?? {};
    const account = findAccount(accounts, pick(row, 'accountCode', 'account'), fallbackAccountId);
    if (!account) {
      result.errors.push({ row: index + 2, message: 'Account not found. Set accountCode.' });
      continue;
    }
    const title = pick(row, 'title');
    if (title.length < 3) {
      result.errors.push({ row: index + 2, message: 'title must be at least 3 characters' });
      continue;
    }
    const type = ticketTypeSchema.safeParse(pick(row, 'type') || 'incident');
    const priority = ticketPrioritySchema.safeParse(pick(row, 'priority') || 'medium');
    const status = ticketStatusSchema.safeParse(pick(row, 'status') || 'open');
    if (!type.success || !priority.success || !status.success) {
      result.errors.push({ row: index + 2, message: 'Invalid type, priority, or status' });
      continue;
    }
    const requesterEmail = pick(row, 'requesterEmail', 'email').toLowerCase();
    const tag = pick(row, 'assetTag', 'tag').toUpperCase();
    const asset = tag ? assetByTag.get(tag) : undefined;
    if (tag && !asset) {
      result.errors.push({ row: index + 2, message: `Asset ${tag} not found` });
      continue;
    }
    const sla = await snapshotSla(supabase, {
      tenantId,
      accountId: account.id,
      type: type.data,
      priority: priority.data,
      status: status.data,
      assigned: false,
    });
    const quotaError = await assertTicketQuota(tenantId);
    if (quotaError) {
      result.errors.push({ row: index + 2, message: quotaError });
      continue;
    }
    const { error } = await supabase.from('tickets').insert({
      tenant_id: tenantId,
      account_id: account.id,
      title,
      description: textToDescription(pick(row, 'description')),
      type: type.data,
      status: status.data,
      priority: priority.data,
      ...sla,
      requester_id: requesterEmail ? profileByEmail.get(requesterEmail) ?? null : null,
      requester_name: safeNotificationText(pick(row, 'requesterName', 'requester') || 'Customer', actorName),
      requester_email: requesterEmail || actorEmail,
      requester_phone: normalizePhone(pick(row, 'requesterPhone', 'phone')) || null,
      asset_id: asset?.id ?? null,
      category: pick(row, 'category') || null,
      created_by: userId,
    });
    if (error) {
      result.errors.push({ row: index + 2, message: error.message });
      continue;
    }
    result.created += 1;
  }
  return result;
}

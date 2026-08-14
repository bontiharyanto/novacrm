'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { sendEmail, getMailpitUrl } from '@/lib/integrations/email';
import { sendTelegram } from '@/lib/integrations/telegram';
import { sendWhatsApp } from '@/lib/integrations/whatsapp';
import { pingAi } from '@/lib/integrations/ai';
import { isMaskedSecret, maskSecret } from '@/lib/utils/secrets';
import {
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  DEFAULT_EMAIL_FROM,
  resolveAiSettings,
  type HubIntegrations,
} from '@/lib/integrations/types';
import {
  createPluginSchema,
  isBuiltinKind,
  pluginFieldSchema,
  pluginTestSpecSchema,
  slugifyPlugin,
  type IntegrationCatalog,
  type PluginCard,
  type PluginField,
  type PluginTestSpec,
} from '@/lib/integrations/plugin-schema';
import { pingPluginHttp, pluginHasRequired } from '@/lib/integrations/plugin-test';

function asRecord(config: unknown) {
  return (config ?? {}) as Record<string, string | undefined>;
}

const EMPTY: HubIntegrations = {
  ai: {
    baseUrl: DEFAULT_AI_BASE_URL,
    apiKey: '',
    model: DEFAULT_AI_MODEL,
    configured: false,
  },
  whatsapp: { apiKey: '', configured: false },
  telegram: { botToken: '', chatId: '', configured: false },
  email: { apiKey: '', from: DEFAULT_EMAIL_FROM, configured: false },
  webhook: { alertSecret: '', emailSecret: '', genericSecret: '', configured: false },
};

function statusOf(row?: { last_ok?: boolean | null; last_error?: string | null; last_tested_at?: string | null }) {
  return {
    lastOk: row?.last_ok ?? null,
    lastError: row?.last_error ?? null,
    lastTestedAt: row?.last_tested_at ?? null,
  };
}

export async function getIntegrationHub(): Promise<HubIntegrations> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'NotificationSettings')) {
    return EMPTY;
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: channels }, { data: integrations }] = await Promise.all([
    supabase.from('notification_channels').select('*').eq('tenant_id', session.profile.tenantId),
    supabase.from('integrations').select('*').eq('tenant_id', session.profile.tenantId),
  ]);

  const next: HubIntegrations = structuredClone(EMPTY);

  for (const row of channels ?? []) {
    const config = asRecord(row.config);
    const tested = statusOf(row);
    if (row.type === 'whatsapp') {
      next.whatsapp = { apiKey: maskSecret(config.apiKey), configured: Boolean(config.apiKey), ...tested };
    }
    if (row.type === 'telegram') {
      next.telegram = {
        botToken: maskSecret(config.botToken),
        chatId: config.chatId ?? '',
        configured: Boolean(config.botToken),
        ...tested,
      };
    }
    if (row.type === 'email') {
      next.email = {
        apiKey: maskSecret(config.apiKey),
        from: config.from ?? DEFAULT_EMAIL_FROM,
        configured: Boolean(config.apiKey) || Boolean(process.env.SMTP_HOST),
        ...tested,
      };
    }
  }

  for (const row of integrations ?? []) {
    const config = asRecord(row.config);
    const tested = statusOf(row);
    if (row.kind === 'ai') {
      const resolved = resolveAiSettings({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
      });
      next.ai = {
        baseUrl: resolved.baseUrl,
        apiKey: maskSecret(config.apiKey),
        model: resolved.model,
        configured: Boolean(config.apiKey),
        ...tested,
      };
    }
    if (row.kind === 'webhook') {
      next.webhook = {
        alertSecret: maskSecret(config.alertSecret),
        emailSecret: maskSecret(config.emailSecret),
        genericSecret: maskSecret(config.genericSecret),
        configured: Boolean(config.alertSecret || config.emailSecret || config.genericSecret),
        ...tested,
      };
    }
  }

  return next;
}

async function mergeJson(
  table: 'notification_channels' | 'integrations',
  match: Record<string, string>,
  incoming: Record<string, string | undefined>,
) {
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase.from(table).select('id, config').match(match).maybeSingle();
  const current = asRecord(existing?.config);
  const next = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (!value || isMaskedSecret(value)) continue;
    next[key] = value;
  }
  return { id: existing?.id as string | undefined, config: next };
}

async function recordTest(
  table: 'notification_channels' | 'integrations',
  id: string | undefined,
  insert: Record<string, unknown>,
  result: { ok: boolean; error?: string; message?: string },
) {
  const supabase = await createSupabaseServerClient();
  const patch = {
    ...insert,
    last_tested_at: new Date().toISOString(),
    last_ok: result.ok,
    last_error: result.ok ? null : result.error ?? 'failed',
  };
  if (id) {
    await supabase.from(table).update(patch).eq('id', id);
  } else {
    await supabase.from(table).insert(patch);
  }
}

const CHANNEL_KINDS = new Set(['whatsapp', 'telegram', 'email']);

function parseFields(value: unknown): PluginField[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = pluginFieldSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

function parseTestSpec(value: unknown): PluginTestSpec {
  const parsed = pluginTestSpecSchema.safeParse(value ?? { kind: 'save' });
  return parsed.success ? parsed.data : { kind: 'save' };
}

function maskedValues(fields: PluginField[], config: Record<string, string | undefined>) {
  const values: Record<string, string> = {};
  for (const field of fields) {
    const raw = config[field.key] ?? '';
    values[field.key] = field.secret || field.type === 'password' ? maskSecret(raw) : String(raw);
  }
  return values;
}

function isConfigured(fields: PluginField[], config: Record<string, string | undefined>, extras?: boolean) {
  if (extras) return true;
  if (fields.length === 0) return Object.values(config).some(Boolean);
  const required = fields.filter((field) => field.required);
  if (required.length > 0) return required.every((field) => Boolean(config[field.key]));
  return fields.some((field) => Boolean(config[field.key]));
}

const CUSTOM_FIELDS: PluginField[] = [
  { key: 'baseUrl', label: 'Base URL', type: 'url' },
  { key: 'apiKey', label: 'API key', type: 'password', secret: true, required: true },
];

export async function saveIntegration(kind: string, values: Record<string, string | undefined>) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'NotificationSettings')) {
    return { data: null, error: 'Unauthorized' };
  }
  const tenantId = session.profile.tenantId;

  if (kind === 'ai' || kind === 'webhook') {
    const incoming =
      kind === 'ai'
        ? (() => {
            const resolved = resolveAiSettings({
              apiKey: isMaskedSecret(values.apiKey) ? undefined : values.apiKey,
              baseUrl: values.baseUrl,
              model: values.model,
            });
            return { baseUrl: resolved.baseUrl, apiKey: resolved.apiKey, model: resolved.model };
          })()
        : { alertSecret: values.alertSecret, emailSecret: values.emailSecret, genericSecret: values.genericSecret };
    const merged = await mergeJson('integrations', { tenant_id: tenantId, kind }, incoming);
    const supabase = await createSupabaseServerClient();
    const payload: Record<string, unknown> = {
      tenant_id: tenantId,
      kind,
      config: merged.config,
      is_active: true,
      created_by: session.userId,
    };
    if (merged.id) payload.id = merged.id;
    const { error } = await supabase.from('integrations').upsert(payload, { onConflict: 'tenant_id,kind' });
    if (error) return { data: null, error: error.message };
    return { data: await getIntegrationCatalog(), error: null };
  }

  if (CHANNEL_KINDS.has(kind)) {
    const incoming =
      kind === 'whatsapp'
        ? { apiKey: values.apiKey }
        : kind === 'telegram'
          ? { botToken: values.botToken, chatId: values.chatId }
          : { apiKey: values.apiKey, from: values.from };
    const merged = await mergeJson('notification_channels', { tenant_id: tenantId, type: kind }, incoming);
    const supabase = await createSupabaseServerClient();
    const payload: Record<string, unknown> = {
      tenant_id: tenantId,
      type: kind,
      config: merged.config,
      is_active: true,
      created_by: session.userId,
    };
    if (merged.id) payload.id = merged.id;
    const { error } = await supabase.from('notification_channels').upsert(payload, { onConflict: 'tenant_id,type' });
    if (error) return { data: null, error: error.message };
    return { data: await getIntegrationCatalog(), error: null };
  }

  const plugin = await loadPluginRow(kind);
  if (!plugin) return { data: null, error: 'Unknown plugin' };
  const incoming: Record<string, string | undefined> = {};
  for (const field of plugin.fields) {
    incoming[field.key] = values[field.key];
  }
  const merged = await mergeJson('integrations', { tenant_id: tenantId, kind }, incoming);
  const supabase = await createSupabaseServerClient();
  const payload: Record<string, unknown> = {
    tenant_id: tenantId,
    kind,
    config: merged.config,
    is_active: true,
    created_by: session.userId,
  };
  if (merged.id) payload.id = merged.id;
  const { error } = await supabase.from('integrations').upsert(payload, { onConflict: 'tenant_id,kind' });
  if (error) return { data: null, error: error.message };
  return { data: await getIntegrationCatalog(), error: null };
}

async function resolveSecret(stored: string | undefined, incoming?: string) {
  if (incoming && !isMaskedSecret(incoming)) return incoming;
  return stored;
}

export async function testIntegration(kind: string, values: Record<string, string | undefined>) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'NotificationSettings')) {
    return { ok: false, error: 'Unauthorized' };
  }

  const hub = await getIntegrationHub();
  const supabase = await createSupabaseServerClient();
  const tenantId = session.profile.tenantId;

  if (kind === 'ai') {
    const { data: row } = await supabase
      .from('integrations')
      .select('id, config')
      .eq('tenant_id', tenantId)
      .eq('kind', 'ai')
      .maybeSingle();
    const config = asRecord(row?.config);
    const apiKey = await resolveSecret(config.apiKey, values.apiKey);
    const resolved = resolveAiSettings({
      apiKey,
      baseUrl: values.baseUrl || config.baseUrl,
      model: values.model || config.model,
    });
    if (!resolved.apiKey) return { ok: false, error: 'AI API key is required.' };
    const result = await pingAi(resolved);
    await recordTest(
      'integrations',
      row?.id,
      {
        tenant_id: tenantId,
        kind: 'ai',
        config: { ...config, baseUrl: resolved.baseUrl, apiKey: resolved.apiKey, model: resolved.model },
        is_active: true,
        created_by: session.userId,
      },
      result,
    );
    return result;
  }

  if (kind === 'webhook') {
    const { data: row } = await supabase
      .from('integrations')
      .select('id, config')
      .eq('tenant_id', tenantId)
      .eq('kind', 'webhook')
      .maybeSingle();
    const config = asRecord(row?.config);
    const alertSecret = (await resolveSecret(config.alertSecret, values.alertSecret)) || '';
    const emailSecret = (await resolveSecret(config.emailSecret, values.emailSecret)) || '';
    const genericSecret = (await resolveSecret(config.genericSecret, values.genericSecret)) || '';
    const ok = [alertSecret, emailSecret, genericSecret].some((item) => item.length >= 8);
    const result = ok
      ? { ok: true, message: 'Webhook secrets saved. Use the curl examples in the side panel.' }
      : { ok: false, error: 'Enter at least one secret (8+ characters).' };
    await recordTest(
      'integrations',
      row?.id,
      {
        tenant_id: tenantId,
        kind: 'webhook',
        config: { ...config, alertSecret, emailSecret, genericSecret },
        is_active: true,
        created_by: session.userId,
      },
      result,
    );
    return result;
  }

  if (!CHANNEL_KINDS.has(kind)) {
    return testPluginConnection(kind, values, session.profile.tenantId, session.userId);
  }

  const { data: row } = await supabase
    .from('notification_channels')
    .select('id, config')
    .eq('tenant_id', tenantId)
    .eq('type', kind)
    .maybeSingle();
  const config = asRecord(row?.config);

  let result: { ok: boolean; error?: string; message?: string };

  if (kind === 'whatsapp') {
    const apiKey = await resolveSecret(config.apiKey, values.apiKey);
    if (!apiKey) result = { ok: false, error: 'WhatsApp API key is required.' };
    else {
      const sent = await sendWhatsApp(session.profile.phone || '6281234567890', 'NovaCRM test: WhatsApp channel OK.', { apiKey });
      result = sent.ok ? { ok: true, message: 'WhatsApp connected. Test message sent.' } : { ok: false, error: sent.error };
    }
  } else if (kind === 'telegram') {
    const botToken = await resolveSecret(config.botToken, values.botToken);
    const chatId = values.chatId || config.chatId || hub.telegram.chatId;
    if (!botToken) result = { ok: false, error: 'Telegram bot token is required.' };
    else {
      const me = await fetch(`https://api.telegram.org/bot${botToken}/getMe`).then((r) => r.json()).catch(() => ({}));
      if (!me?.ok) {
        result = { ok: false, error: me?.description ?? 'Telegram getMe failed. Token invalid.' };
      } else if (chatId) {
        const sent = await sendTelegram(chatId, 'NovaCRM test: Telegram channel OK.', { botToken });
        result = sent.ok
          ? { ok: true, message: `Telegram connected as @${me.result?.username ?? 'bot'}. Test sent.` }
          : { ok: false, error: sent.error };
      } else {
        result = { ok: true, message: `Telegram bot @${me.result?.username ?? 'bot'} is valid. Add a chat ID to send tests.` };
      }
    }
  } else {
    const apiKey = await resolveSecret(config.apiKey, values.apiKey);
    const from = values.from || config.from || DEFAULT_EMAIL_FROM;
    const to = session.profile.email;
    if (!to) result = { ok: false, error: 'Admin email is required for the email test.' };
    else {
      const sent = await sendEmail(to, 'NovaCRM test', '<p>Email channel OK.</p>', {
        apiKey: apiKey || process.env.RESEND_API_KEY,
        from,
      });
      result = sent.ok
        ? {
            ok: true,
            message: sent.via === 'smtp' ? `Email connected via Mailpit (${to}). ${getMailpitUrl()}` : `Email connected. Test sent to ${to}.`,
          }
        : { ok: false, error: sent.error };
    }
  }

  await recordTest(
    'notification_channels',
    row?.id,
    { tenant_id: tenantId, type: kind, config: row?.config ?? {}, is_active: true, created_by: session.userId },
    result,
  );
  return result;
}

export async function getAiConfigForTenant(tenantId: string) {
  const envKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  const envBase = process.env.GROQ_API_KEY
    ? 'https://api.groq.com/openai/v1'
    : process.env.GEMINI_API_KEY
      ? 'https://generativelanguage.googleapis.com/v1beta/openai'
      : process.env.OPENAI_API_KEY
        ? 'https://api.openai.com/v1'
        : DEFAULT_AI_BASE_URL;
  const envModel = process.env.GROQ_API_KEY
    ? DEFAULT_AI_MODEL
    : process.env.GEMINI_API_KEY
      ? 'gemini-2.0-flash'
      : DEFAULT_AI_MODEL;

  if (!hasServiceRole()) {
    return envKey ? { apiKey: envKey, baseUrl: envBase, model: envModel } : null;
  }
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('integrations')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('kind', 'ai')
    .maybeSingle();
  const config = asRecord(data?.config);
  const apiKey = config.apiKey || envKey;
  if (!apiKey) return null;
  return resolveAiSettings({
    apiKey,
    baseUrl: config.baseUrl || envBase,
    model: config.model || envModel,
  });
}

export async function getWebhookSecretFromDb(kind: 'alert' | 'email' | 'generic' | 'whatsapp' | 'telegram') {
  if (!hasServiceRole()) return undefined;
  const tenantId = process.env.WEBHOOK_TENANT_ID;
  if (!tenantId) return undefined;
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('integrations')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('kind', 'webhook')
    .maybeSingle();
  const config = asRecord(data?.config);
  if (kind === 'alert') return config.alertSecret;
  if (kind === 'email') return config.emailSecret;
  if (kind === 'generic') return config.genericSecret;
  return undefined;
}

async function loadPluginRow(slug: string) {
  const session = await getSessionProfile();
  if (!session) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('integration_plugins')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .or(`tenant_id.is.null,tenant_id.eq.${session.profile.tenantId}`)
    .order('tenant_id', { ascending: false, nullsFirst: false })
    .limit(2);
  const rows = data ?? [];
  const row = rows.find((item) => item.tenant_id === session.profile.tenantId) ?? rows.find((item) => !item.tenant_id);
  if (!row) return null;
  return {
    id: row.id as string,
    slug: row.slug as string,
    fields: parseFields(row.fields),
    testSpec: parseTestSpec(row.test_spec),
    tenantId: (row.tenant_id as string | null) ?? null,
  };
}

async function testPluginConnection(
  slug: string,
  values: Record<string, string | undefined>,
  tenantId: string,
  userId: string,
) {
  const plugin = await loadPluginRow(slug);
  if (!plugin) return { ok: false, error: 'Unknown plugin' };
  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from('integrations')
    .select('id, config')
    .eq('tenant_id', tenantId)
    .eq('kind', slug)
    .maybeSingle();
  const stored = asRecord(row?.config);
  const resolved: Record<string, string> = {};
  for (const field of plugin.fields) {
    const next = await resolveSecret(stored[field.key], values[field.key]);
    resolved[field.key] = next ?? '';
  }
  let result: { ok: boolean; error?: string; message?: string };
  if (plugin.testSpec.kind === 'http') {
    result = await pingPluginHttp(plugin.testSpec, plugin.fields, resolved);
  } else if (!pluginHasRequired(plugin.fields, resolved)) {
    result = { ok: false, error: 'Fill the required fields, then test again.' };
  } else {
    result = { ok: true, message: 'Credentials saved. This plugin validates on save.' };
  }
  await recordTest(
    'integrations',
    row?.id,
    {
      tenant_id: tenantId,
      kind: slug,
      config: { ...stored, ...resolved },
      is_active: true,
      created_by: userId,
    },
    result,
  );
  return result;
}

export async function getIntegrationCatalog(): Promise<IntegrationCatalog> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'NotificationSettings')) {
    return { plugins: [] };
  }

  const supabase = await createSupabaseServerClient();
  const tenantId = session.profile.tenantId;
  const [{ data: pluginRows, error: pluginError }, { data: channels }, { data: integrations }] = await Promise.all([
    supabase
      .from('integration_plugins')
      .select('*')
      .eq('is_active', true)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .order('sort_order', { ascending: true }),
    supabase.from('notification_channels').select('*').eq('tenant_id', tenantId),
    supabase.from('integrations').select('*').eq('tenant_id', tenantId),
  ]);

  if (pluginError || !pluginRows?.length) {
    return { plugins: [] };
  }

  const channelByType = new Map((channels ?? []).map((row) => [row.type as string, row]));
  const integrationByKind = new Map((integrations ?? []).map((row) => [row.kind as string, row]));
  const seen = new Set<string>();
  const plugins: PluginCard[] = [];

  for (const row of pluginRows) {
    const slug = row.slug as string;
    if (seen.has(slug) && row.tenant_id) {
      const index = plugins.findIndex((item) => item.slug === slug && !item.tenantId);
      if (index >= 0) plugins.splice(index, 1);
    }
    if (seen.has(slug) && !row.tenant_id) continue;
    seen.add(slug);

    const fields =
      slug === 'ai'
        ? [
            { key: 'baseUrl', label: 'Base URL', type: 'url' as const },
            { key: 'apiKey', label: 'API key', type: 'password' as const, secret: true },
            { key: 'model', label: 'Model', type: 'text' as const },
          ]
        : parseFields(row.fields);
    const storedRow = CHANNEL_KINDS.has(slug) ? channelByType.get(slug) : integrationByKind.get(slug);
    const config = asRecord(storedRow?.config);
    const tested = statusOf(storedRow);
    const uiVariant = row.ui_variant === 'ai' || row.ui_variant === 'webhook' ? row.ui_variant : 'fields';
    plugins.push({
      id: row.id as string,
      slug,
      label: row.label as string,
      hint: row.hint as string,
      category: (row.category as PluginCard['category']) ?? 'other',
      uiVariant,
      fields,
      helpTest: row.help_test as string,
      helpAfter: row.help_after as string,
      testSpec: parseTestSpec(row.test_spec),
      tenantId: (row.tenant_id as string | null) ?? null,
      sortOrder: Number(row.sort_order) || 100,
      configured:
        slug === 'email'
          ? isConfigured(fields, config, Boolean(process.env.SMTP_HOST))
          : isConfigured(fields, config),
      lastOk: tested.lastOk,
      lastError: tested.lastError,
      lastTestedAt: tested.lastTestedAt,
      values: maskedValues(fields, config),
    });
  }

  plugins.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  return { plugins };
}

export async function createIntegrationPlugin(input: unknown) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'NotificationSettings')) {
    return { data: null, error: 'Unauthorized' };
  }
  const parsed = createPluginSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid plugin' };

  let slug = parsed.data.slug ?? slugifyPlugin(parsed.data.label);
  if (isBuiltinKind(slug)) {
    slug = `${slug}_custom`;
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('integration_plugins')
    .select('id')
    .eq('slug', slug)
    .or(`tenant_id.is.null,tenant_id.eq.${session.profile.tenantId}`)
    .limit(1);
  if (existing?.length) {
    slug = `${slug}_${String(Date.now()).slice(-4)}`;
  }

  const { error } = await supabase.from('integration_plugins').insert({
    tenant_id: session.profile.tenantId,
    slug,
    label: parsed.data.label.trim(),
    hint: parsed.data.hint?.trim() || 'Custom plugin',
    category: parsed.data.category,
    ui_variant: 'fields',
    fields: CUSTOM_FIELDS,
    help_test: 'Save required fields, then Test connection. Custom plugins validate locally (no outbound HTTP).',
    help_after: 'Credentials stay in this tenant. Wire a workflow action when you are ready to call the provider.',
    test_spec: { kind: 'save' },
    sort_order: 200,
    is_active: true,
    created_by: session.userId,
  });
  if (error) return { data: null, error: error.message };
  return { data: await getIntegrationCatalog(), error: null, slug };
}

export async function deleteIntegrationPlugin(id: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'NotificationSettings')) {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from('integration_plugins')
    .select('id, slug, tenant_id')
    .eq('id', id)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();
  if (!row) return { data: null, error: 'Only tenant plugins can be removed' };
  await supabase.from('integrations').delete().eq('tenant_id', session.profile.tenantId).eq('kind', row.slug);
  const { error } = await supabase.from('integration_plugins').delete().eq('id', id);
  if (error) return { data: null, error: error.message };
  return { data: await getIntegrationCatalog(), error: null };
}

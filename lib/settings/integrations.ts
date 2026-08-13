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
  type IntegrationKind,
} from '@/lib/integrations/types';

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

export async function saveIntegration(kind: IntegrationKind, values: Record<string, string | undefined>) {
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
    return { data: await getIntegrationHub(), error: null };
  }

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
  return { data: await getIntegrationHub(), error: null };
}

async function resolveSecret(stored: string | undefined, incoming?: string) {
  if (incoming && !isMaskedSecret(incoming)) return incoming;
  return stored;
}

export async function testIntegration(kind: IntegrationKind, values: Record<string, string | undefined>) {
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

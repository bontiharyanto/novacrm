'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendEmail, getMailpitUrl } from '@/lib/integrations/email';
import { sendTelegram } from '@/lib/integrations/telegram';
import { sendWhatsApp } from '@/lib/integrations/whatsapp';
import { appendNotificationLog } from '@/lib/notifications/logs';
import { isMaskedSecret, maskSecret } from '@/lib/utils/secrets';
import type { NotificationChannelType } from '@/lib/notifications/types';

export type NotificationSettings = {
  whatsappApiKey: string;
  telegramBotToken: string;
  telegramChatId: string;
  emailApiKey: string;
  emailFrom: string;
  whatsappConfigured?: boolean;
  telegramConfigured?: boolean;
  emailConfigured?: boolean;
};

const EMPTY_SETTINGS: NotificationSettings = {
  whatsappApiKey: '',
  telegramBotToken: '',
  telegramChatId: '',
  emailApiKey: '',
  emailFrom: 'NovaCRM <no-reply@novacrm.app>',
};

function asRecord(config: unknown) {
  return (config ?? {}) as Record<string, string | undefined>;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'NotificationSettings')) {
    return EMPTY_SETTINGS;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('notification_channels')
    .select('*')
    .eq('tenant_id', session.profile.tenantId);

  const next = { ...EMPTY_SETTINGS };

  for (const row of data ?? []) {
    const config = asRecord(row.config);
    if (row.type === 'whatsapp') {
      next.whatsappApiKey = maskSecret(config.apiKey);
      next.whatsappConfigured = Boolean(config.apiKey);
    }
    if (row.type === 'telegram') {
      next.telegramBotToken = maskSecret(config.botToken);
      next.telegramChatId = config.chatId ?? '';
      next.telegramConfigured = Boolean(config.botToken);
    }
    if (row.type === 'email') {
      next.emailApiKey = maskSecret(config.apiKey);
      next.emailFrom = config.from ?? next.emailFrom;
      next.emailConfigured = Boolean(config.apiKey);
    }
  }

  return next;
}

async function mergeChannelConfig(
  tenantId: string,
  type: NotificationChannelType,
  incoming: Record<string, string | undefined>,
) {
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('notification_channels')
    .select('id, config')
    .eq('tenant_id', tenantId)
    .eq('type', type)
    .maybeSingle();

  const current = asRecord(existing?.config);
  const next = { ...current };

  for (const [key, value] of Object.entries(incoming)) {
    if (!value || isMaskedSecret(value)) continue;
    next[key] = value;
  }

  return { id: existing?.id, config: next };
}

export async function saveNotificationSettings(input: Partial<NotificationSettings>): Promise<NotificationSettings | { error: string }> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'NotificationSettings')) {
    return { error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const tenantId = session.profile.tenantId;

  const channels: Array<{ type: NotificationChannelType; incoming: Record<string, string | undefined> }> = [
    { type: 'whatsapp', incoming: { apiKey: input.whatsappApiKey } },
    { type: 'telegram', incoming: { botToken: input.telegramBotToken, chatId: input.telegramChatId } },
    { type: 'email', incoming: { apiKey: input.emailApiKey, from: input.emailFrom } },
  ];

  for (const channel of channels) {
    const merged = await mergeChannelConfig(tenantId, channel.type, channel.incoming);
    const payload: Record<string, unknown> = {
      tenant_id: tenantId,
      type: channel.type,
      config: merged.config,
      is_active: true,
      created_by: session.userId,
    };
    if (merged.id) {
      payload.id = merged.id;
    }
    await supabase.from('notification_channels').upsert(payload, { onConflict: 'tenant_id,type' });
  }

  return getNotificationSettings();
}

export async function testNotificationChannel(
  channel: NotificationChannelType,
  values: Partial<NotificationSettings>,
) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'NotificationSettings')) {
    return { ok: false, error: 'Unauthorized' };
  }

  const stored = await getNotificationSettings();
  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from('notification_channels')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .eq('type', channel)
    .maybeSingle();

  const config = asRecord(rows?.config);

  if (channel === 'whatsapp') {
    const apiKey = isMaskedSecret(values.whatsappApiKey) ? config.apiKey : values.whatsappApiKey;
    if (!apiKey) return { ok: false, error: 'WhatsApp API key is required.' };
    const result = await sendWhatsApp(session.profile.phone || '6281234567890', 'NovaCRM test: WhatsApp channel OK.', { apiKey });
    return result.ok
      ? { ok: true, message: 'WhatsApp test terkirim.' }
      : { ok: false, error: result.error ?? 'WhatsApp test failed.' };
  }

  if (channel === 'telegram') {
    const botToken = isMaskedSecret(values.telegramBotToken) ? config.botToken : values.telegramBotToken;
    const chatId = values.telegramChatId || config.chatId;
    if (!botToken || !chatId) return { ok: false, error: 'Telegram bot token and chat id are required.' };
    const result = await sendTelegram(chatId, 'NovaCRM test: Telegram channel OK.', { botToken });
    return result.ok
      ? { ok: true, message: 'Telegram test terkirim.' }
      : { ok: false, error: result.error ?? 'Telegram test failed.' };
  }

  const apiKey = isMaskedSecret(values.emailApiKey) ? config.apiKey : values.emailApiKey;
  const from = values.emailFrom || config.from || stored.emailFrom;
  const to = session.profile.email;
  if (!to) return { ok: false, error: 'Admin email is required for test send.' };
  const result = await sendEmail(to, 'NovaCRM test', '<p>Email channel OK. Notifications will use this From address.</p>', {
    apiKey: apiKey || process.env.RESEND_API_KEY,
    from,
  });
  await appendNotificationLog({
    tenantId: session.profile.tenantId,
    channel: 'email',
    recipient: to,
    subject: result.dryRun ? '[DEV] NovaCRM test' : 'NovaCRM test',
    body: 'Email channel OK.',
    status: result.ok ? (result.dryRun ? 'queued' : 'sent') : 'failed',
    createdBy: session.userId,
  });
  if (!result.ok) {
    return { ok: false, error: result.error ?? 'Email test failed.' };
  }
  if (result.via === 'smtp') {
    return {
      ok: true,
      message: `Terkirim ke Mailpit (${to}). Buka ${getMailpitUrl()}`,
    };
  }
  return {
    ok: true,
    message: result.dryRun
      ? `Logged locally to ${to}. Add a Resend API key to deliver for real.`
      : `Email test sent to ${to}.`,
  };
}

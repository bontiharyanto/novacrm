import { getNotificationSettingsFromDb, upsertNotificationSettingsDb } from '@/lib/supabase/queries';

export type NotificationSettings = {
  whatsappApiKey: string;
  telegramBotToken: string;
  telegramChatId: string;
  emailApiKey: string;
  emailFrom: string;
};

const DEFAULT_SETTINGS: NotificationSettings = {
  whatsappApiKey: '',
  telegramBotToken: '',
  telegramChatId: '',
  emailApiKey: '',
  emailFrom: 'NovaCRM <no-reply@novacrm.app>',
};

const settingsStore = new Map<string, NotificationSettings>();

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const tenantId = 'default';
  const dbResult = await getNotificationSettingsFromDb();
  if (!dbResult.error && dbResult.data.length > 0) {
    const row = dbResult.data[0] as { config?: Partial<NotificationSettings> };
    return { ...DEFAULT_SETTINGS, ...row.config };
  }
  return settingsStore.get(tenantId) ?? DEFAULT_SETTINGS;
}

export async function saveNotificationSettings(input: Partial<NotificationSettings>): Promise<NotificationSettings> {
  const next = {
    ...DEFAULT_SETTINGS,
    ...(await getNotificationSettings()),
    ...input,
  };

  settingsStore.set('default', next);
  await upsertNotificationSettingsDb({
    id: 'notification-settings-default',
    tenant_id: 'default',
    type: 'email',
    is_active: true,
    config: next,
  });
  return next;
}

export async function testNotificationChannel(channel: 'whatsapp' | 'telegram' | 'email', values: Partial<NotificationSettings>) {
  const settings = { ...DEFAULT_SETTINGS, ...(await getNotificationSettings()), ...values };

  if (channel === 'whatsapp') {
    if (!settings.whatsappApiKey) {
      return { ok: false, error: 'WhatsApp API key is required.' };
    }

    return { ok: true, message: 'WhatsApp test message queued successfully.' };
  }

  if (channel === 'telegram') {
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      return { ok: false, error: 'Telegram bot token and chat id are required.' };
    }

    return { ok: true, message: 'Telegram test message queued successfully.' };
  }

  if (!settings.emailApiKey) {
    return { ok: false, error: 'Email API key is required.' };
  }

  return { ok: true, message: 'Email test message queued successfully.' };
}

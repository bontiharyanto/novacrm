import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/integrations/email';
import { sendTelegram } from '@/lib/integrations/telegram';
import { sendWhatsApp } from '@/lib/integrations/whatsapp';
import { appendNotificationLog } from '@/lib/notifications/logs';
import type { NotificationChannelRow, NotificationJobPayload } from '@/lib/notifications/types';

async function loadActiveChannels(tenantId: string): Promise<NotificationChannelRow[]> {
  if (!hasServiceRole()) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('notification_channels')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  return (data ?? []) as NotificationChannelRow[];
}

export async function processNotificationJob(payload: NotificationJobPayload) {
  const {
    tenantId,
    event,
    requesterEmail,
    requesterPhone,
    assigneeChatId,
    title,
    status,
    requesterName = 'Customer',
    assigneeName = 'Agent',
    message,
  } = payload;

  if (!tenantId) {
    return { ok: false, error: 'tenantId is required' };
  }

  const storedChannels = await loadActiveChannels(tenantId);
  const channels =
    storedChannels.length > 0
      ? storedChannels
      : ([
          { type: 'email', config: { apiKey: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM }, is_active: true },
          { type: 'telegram', config: { botToken: process.env.TELEGRAM_BOT_TOKEN, chatId: assigneeChatId }, is_active: true },
          { type: 'whatsapp', config: { apiKey: process.env.FONNTE_API_KEY ?? process.env.WHATSAPP_API_KEY, target: requesterPhone }, is_active: true },
        ] as NotificationChannelRow[]);

  const results: Array<{ channel: string; ok: boolean; error?: string }> = [];

  for (const channel of channels) {
    try {
      if (channel.type === 'email' && requesterEmail) {
        const subject = `${title ?? 'Ticket'} • ${status ?? 'Update'}`;
        const html = `<p>Halo ${requesterName},</p><p>${message ?? event}</p><p><strong>Status:</strong> ${status ?? 'Update'}</p>`;
        const result = await sendEmail(requesterEmail, subject, html, {
          apiKey: channel.config.apiKey,
          from: channel.config.from,
        });
        results.push({ channel: 'email', ok: Boolean(result.ok), error: result.error });
        await appendNotificationLog({
          tenantId,
          channel: 'email',
          recipient: requesterEmail,
          subject,
          body: html,
          status: result.ok ? 'sent' : 'failed',
          ticketId: payload.ticketId,
        });
        continue;
      }

      if (channel.type === 'telegram') {
        const chatId = channel.config.chatId ?? assigneeChatId;
        if (!chatId) continue;
        const text = message ?? `Ticket update: ${title ?? 'New Ticket'}\nStatus: ${status ?? 'updated'}\nAssigned: ${assigneeName}`;
        const result = await sendTelegram(chatId, text, { botToken: channel.config.botToken });
        results.push({ channel: 'telegram', ok: Boolean(result.ok), error: result.error });
        await appendNotificationLog({
          tenantId,
          channel: 'telegram',
          recipient: String(chatId),
          subject: `Ticket ${title ?? 'update'}`,
          body: text,
          status: result.ok ? 'sent' : 'failed',
          ticketId: payload.ticketId,
        });
        continue;
      }

      if (channel.type === 'whatsapp') {
        const target = channel.config.target ?? requesterPhone;
        if (!target) continue;
        const text = message ?? `Halo ${requesterName}, tiket ${title ?? 'baru'} status: ${status ?? 'updated'}`;
        const result = await sendWhatsApp(target, text, { apiKey: channel.config.apiKey });
        results.push({ channel: 'whatsapp', ok: Boolean(result.ok), error: result.error });
        await appendNotificationLog({
          tenantId,
          channel: 'whatsapp',
          recipient: String(target),
          subject: `Ticket ${title ?? 'update'}`,
          body: text,
          status: result.ok ? 'sent' : 'failed',
          ticketId: payload.ticketId,
        });
      }
    } catch (error) {
      results.push({
        channel: String(channel.type),
        ok: false,
        error: error instanceof Error ? error.message : 'notification processing error',
      });
    }
  }

  return { ok: results.some((item) => item.ok) || results.length === 0, results };
}

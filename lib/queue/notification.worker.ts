export type NotificationJobPayload = {
  tenantId: string;
  event: 'ticket.create' | 'ticket.status_change' | 'ticket.comment_add';
  ticketId?: string;
  requesterId?: string;
  assigneeId?: string;
  title?: string;
  status?: string;
  requesterName?: string;
  assigneeName?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  assigneeChatId?: string;
  message?: string;
};

type NotificationQueueLike = {
  add: (name: string, payload: NotificationJobPayload) => Promise<{
    ok: boolean;
    id: string;
    name: string;
    data: NotificationJobPayload;
  }>;
};

type NotificationWorkerLike = {
  on: (event: string, handler: (...args: unknown[]) => void) => {
    event: string;
    handler: (...args: unknown[]) => void;
  };
};

export function createNotificationQueue(): NotificationQueueLike {
  return {
    add: async (name: string, payload: NotificationJobPayload) => ({
      ok: true,
      id: `mock-job-${Date.now()}`,
      name,
      data: payload,
    }),
  };
}

export function createNotificationWorker(): NotificationWorkerLike {
  return {
    on: (event: string, handler: (...args: unknown[]) => void) => ({ event, handler }),
  };
}

export async function processNotificationJob(payload: NotificationJobPayload) {
  const { tenantId, event, requesterEmail, requesterPhone, assigneeChatId, title, status, requesterName = 'Customer', assigneeName = 'Agent' } = payload;

  if (!tenantId) {
    return { ok: false, error: 'tenantId is required' };
  }

  const channels = [
    { type: 'email', config: { apiKey: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM } },
    { type: 'telegram', config: { botToken: process.env.TELEGRAM_BOT_TOKEN, chatId: assigneeChatId } },
    { type: 'whatsapp', config: { apiKey: process.env.FONNTE_API_KEY, target: requesterPhone } },
  ];

  const results: Array<{ channel: string; ok: boolean; error?: string }> = [];

  for (const channel of channels) {
    try {
      if (channel.type === 'email' && requesterEmail) {
        const { sendEmail } = await import('../integrations/email');
        const { appendNotificationLog } = await import('../notifications/logs');
        const subject = `${title ?? 'Ticket'} • ${status ?? 'Update'}`;
        const html = `<p>Halo ${requesterName},</p><p>${event} sedang berlangsung.</p><p><strong>Status:</strong> ${status ?? 'Update'}</p>`;
        const result = await sendEmail(requesterEmail, subject, html, { apiKey: channel.config.apiKey, from: channel.config.from });
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

      if (channel.type === 'telegram' && channel.config.chatId) {
        const { sendTelegram } = await import('../integrations/telegram');
        const { appendNotificationLog } = await import('../notifications/logs');
        const message = `Ticket update: ${title ?? 'New Ticket'}\nStatus: ${status ?? 'updated'}\nAssigned: ${assigneeName}`;
        const result = await sendTelegram(channel.config.chatId, message);
        results.push({ channel: 'telegram', ok: Boolean(result.ok), error: result.error });
        await appendNotificationLog({
          tenantId,
          channel: 'telegram',
          recipient: String(channel.config.chatId),
          subject: `Ticket ${title ?? 'update'}`,
          body: message,
          status: result.ok ? 'sent' : 'failed',
          ticketId: payload.ticketId,
        });
        continue;
      }

      if (channel.type === 'whatsapp' && channel.config.target) {
        const { sendWhatsApp } = await import('../integrations/whatsapp');
        const { appendNotificationLog } = await import('../notifications/logs');
        const message = `Halo ${requesterName}, tiket ${title ?? 'baru'} status: ${status ?? 'updated'}`;
        const result = await sendWhatsApp(channel.config.target, message);
        results.push({ channel: 'whatsapp', ok: Boolean(result.ok), error: result.error });
        await appendNotificationLog({
          tenantId,
          channel: 'whatsapp',
          recipient: String(channel.config.target),
          subject: `Ticket ${title ?? 'update'}`,
          body: message,
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

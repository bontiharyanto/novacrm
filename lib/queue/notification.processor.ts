import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/integrations/email';
import { sendTelegram } from '@/lib/integrations/telegram';
import { sendWhatsApp } from '@/lib/integrations/whatsapp';
import { appendNotificationLog } from '@/lib/notifications/logs';
import {
  buildTicketEmailHtml,
  buildTicketEmailSubject,
  portalPermalink,
  ticketPermalink,
} from '@/lib/notifications/email-template';
import { getMergedNotificationCopy } from '@/lib/notifications/copy-load';
import { resolveNotificationLocale } from '@/lib/notifications/locale';
import { loadTenantPublicUrl } from '@/lib/notifications/public-url';
import { renderTemplate } from '@/lib/notifications/templates';
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

function emailRecipients(payload: NotificationJobPayload) {
  const emails =
    payload.event === 'ticket.assign'
      ? [payload.assigneeEmail]
      : [payload.requesterEmail, payload.assigneeEmail];
  return emails.filter((value, index): value is string => Boolean(value) && emails.indexOf(value) === index);
}

export async function processNotificationJob(payload: NotificationJobPayload) {
  const {
    tenantId,
    event,
    requesterPhone,
    assigneePhone,
    assigneeChatId,
    title,
    status,
    requesterName = 'Customer',
    assigneeName = 'Agent',
    message,
    number,
    type,
    ticketId,
  } = payload;

  if (!tenantId) {
    return { ok: false, error: 'tenantId is required' };
  }

  const storedChannels = await loadActiveChannels(tenantId);
  const channels =
    storedChannels.length > 0
      ? storedChannels
      : ([
          {
            type: 'email',
            config: { apiKey: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM },
            is_active: true,
          },
        ] as NotificationChannelRow[]);

  const results: Array<{ channel: string; ok: boolean; error?: string }> = [];
  const locale = resolveNotificationLocale(payload.locale);
  const copy = await getMergedNotificationCopy(tenantId, locale);
  const publicUrl = await loadTenantPublicUrl(tenantId);
  const displayNumber = number || ticketId?.slice(0, 8) || 'Ticket';
  const displayTitle = title ?? 'Ticket update';
  const displayStatus = status ?? 'updated';

  for (const channel of channels) {
    try {
      if (channel.type === 'email') {
        const recipients = emailRecipients(payload);
        if (recipients.length === 0) continue;

        const subject = buildTicketEmailSubject({
          event,
          number: displayNumber,
          title: displayTitle,
          status: displayStatus,
          type,
          locale,
          copy,
        });
        const resolved = displayStatus === 'resolved' || displayStatus === 'closed';

        for (const recipient of recipients) {
          const forRequester = recipient === payload.requesterEmail;
          const ticketUrl = ticketId
            ? forRequester
              ? portalPermalink(ticketId, publicUrl)
              : ticketPermalink(ticketId, publicUrl)
            : getFallbackUrl(forRequester, publicUrl);
          const html = buildTicketEmailHtml({
            number: displayNumber,
            title: displayTitle,
            type,
            status: displayStatus,
            name: forRequester ? requesterName : assigneeName,
            message: message ?? event,
            ticketUrl,
            ctaLabel: forRequester && resolved ? copy.rateTicket : copy.openTicket,
            locale,
            copy,
          });
          const result = await sendEmail(recipient, subject, html, {
            apiKey: channel.config.apiKey || process.env.RESEND_API_KEY,
            from: channel.config.from || process.env.EMAIL_FROM,
          });
          results.push({ channel: 'email', ok: Boolean(result.ok), error: result.error });
          await appendNotificationLog({
            tenantId,
            channel: 'email',
            recipient,
            subject: result.dryRun ? `[DEV] ${subject}` : subject,
            body: html,
            status: result.ok ? (result.dryRun ? 'queued' : 'sent') : 'failed',
            ticketId,
          });
        }
        continue;
      }

      if (channel.type === 'telegram') {
        const botToken = channel.config.botToken || process.env.TELEGRAM_BOT_TOKEN;
        const targets = new Set<string>();
        if (assigneeChatId) targets.add(String(assigneeChatId));
        if (event !== 'ticket.assign' && channel.config.chatId) {
          targets.add(String(channel.config.chatId));
        }
        if (!botToken || targets.size === 0) continue;
        const detailUrl = ticketId
          ? event === 'ticket.assign'
            ? ticketPermalink(ticketId, publicUrl)
            : portalPermalink(ticketId, publicUrl)
          : publicUrl;
        const text =
          message ??
          renderTemplate(copy.telegramFallback, {
            number: displayNumber,
            title: displayTitle,
            status: displayStatus,
            assignee: assigneeName,
            url: detailUrl,
          });
        for (const chatId of Array.from(targets)) {
          const result = await sendTelegram(chatId, text, { botToken });
          results.push({ channel: 'telegram', ok: Boolean(result.ok), error: result.error });
          await appendNotificationLog({
            tenantId,
            channel: 'telegram',
            recipient: chatId,
            subject: displayNumber,
            body: text,
            status: result.ok ? 'sent' : 'failed',
            ticketId,
          });
        }
        continue;
      }

      if (channel.type === 'whatsapp') {
        const apiKey = channel.config.apiKey || process.env.FONNTE_API_KEY || process.env.WHATSAPP_API_KEY;
        const targets = new Set<string>();
        if (assigneePhone) targets.add(String(assigneePhone));
        if (event !== 'ticket.assign') {
          if (requesterPhone) targets.add(String(requesterPhone));
          if (channel.config.target) targets.add(String(channel.config.target));
        }
        if (!apiKey || targets.size === 0) continue;
        const detailUrl = ticketId
          ? event === 'ticket.assign'
            ? ticketPermalink(ticketId, publicUrl)
            : portalPermalink(ticketId, publicUrl)
          : publicUrl;
        const text =
          message ??
          renderTemplate(copy.whatsappFallback, {
            name: event === 'ticket.assign' ? assigneeName : requesterName,
            number: displayNumber,
            status: displayStatus,
            url: detailUrl,
          });
        for (const target of Array.from(targets)) {
          const result = await sendWhatsApp(target, text, { apiKey });
          results.push({ channel: 'whatsapp', ok: Boolean(result.ok), error: result.error });
          await appendNotificationLog({
            tenantId,
            channel: 'whatsapp',
            recipient: target,
            subject: displayNumber,
            body: text,
            status: result.ok ? 'sent' : 'failed',
            ticketId,
          });
        }
      }
    } catch (error) {
      results.push({
        channel: String(channel.type),
        ok: false,
        error: error instanceof Error ? error.message : 'notification processing error',
      });
    }
  }

  if (results.length === 0) {
    return { ok: true, results, error: null };
  }

  return {
    ok: results.some((item) => item.ok),
    results,
    error: results.find((item) => !item.ok)?.error,
  };
}

function getFallbackUrl(forPortal = false, baseUrl?: string) {
  const base = (baseUrl || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
  return `${base}${forPortal ? '/portal' : '/tickets'}`;
}

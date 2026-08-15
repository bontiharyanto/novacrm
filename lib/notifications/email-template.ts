import { dictionaryFor, localizedStage, localizedType } from '@/lib/i18n/labels';
import { notificationCopy, resolveNotificationLocale } from '@/lib/notifications/locale';
import { renderTemplate } from '@/lib/notifications/templates';
import type { Locale } from '@/lib/preferences';
import type { TicketStatus } from '@/lib/tickets/schema';

export function getAppUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000')
  );
}

export function ticketPermalink(ticketId: string) {
  const base = getAppUrl().replace(/\/$/, '');
  return base ? `${base}/tickets/${ticketId}` : `/tickets/${ticketId}`;
}

export function portalPermalink(ticketId: string) {
  const base = getAppUrl().replace(/\/$/, '');
  return base ? `${base}/portal/${ticketId}` : `/portal/${ticketId}`;
}

export function buildTicketEmailSubject(input: {
  event: 'ticket.create' | 'ticket.status_change' | 'ticket.comment_add';
  number: string;
  title: string;
  status: string;
  type?: string;
  locale?: Locale | string | null;
}) {
  const locale = resolveNotificationLocale(input.locale);
  const t = dictionaryFor(locale);
  const copy = notificationCopy(locale);
  const statusLabel = localizedStage(t, input.type, input.status as TicketStatus);
  const template =
    input.event === 'ticket.create'
      ? copy.subjectCreated
      : input.event === 'ticket.comment_add'
        ? copy.subjectComment
        : copy.subjectStatus;
  return renderTemplate(template, { number: input.number, title: input.title, status: statusLabel });
}

export function buildTicketEmailHtml(input: {
  number: string;
  title: string;
  type?: string;
  status: string;
  name: string;
  message: string;
  ticketUrl: string;
  ctaLabel?: string;
  locale?: Locale | string | null;
}) {
  const locale = resolveNotificationLocale(input.locale);
  const t = dictionaryFor(locale);
  const copy = notificationCopy(locale);
  const typeLabel = localizedType(t, input.type);
  const statusLabel = localizedStage(t, input.type, input.status as TicketStatus);
  const cta = input.ctaLabel ?? copy.openTicket;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#09090b;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#09090b;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#18181b;border:1px solid #27272a;border-radius:12px;">
            <tr>
              <td style="padding:24px 28px 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#60a5fa;">NovaCRM</td>
            </tr>
            <tr>
              <td style="padding:0 28px 4px;font-family:ui-monospace,Menlo,monospace;font-size:13px;color:#93c5fd;">${escapeHtml(input.number)}</td>
            </tr>
            <tr>
              <td style="padding:0 28px 16px;font-size:20px;font-weight:600;color:#fafafa;">${escapeHtml(input.title)}</td>
            </tr>
            <tr>
              <td style="padding:0 28px 20px;">
                <span style="display:inline-block;margin-right:8px;padding:4px 8px;border-radius:999px;background:#27272a;color:#d4d4d8;font-size:11px;">${escapeHtml(typeLabel)}</span>
                <span style="display:inline-block;padding:4px 8px;border-radius:999px;background:#1d4ed8;color:#dbeafe;font-size:11px;">${escapeHtml(statusLabel)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 20px;font-size:14px;line-height:1.6;color:#d4d4d8;">
                ${escapeHtml(input.message)}
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <a href="${escapeHtml(input.ticketUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 14px;border-radius:8px;">${escapeHtml(cta)}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

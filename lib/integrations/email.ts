import { getMailpitUrl, parseSmtpSettings, sendSmtpEmail, type SmtpSettings } from '@/lib/integrations/smtp';

export type EmailSendResult = {
  ok: boolean;
  id?: string;
  error?: string;
  dryRun?: boolean;
  via?: 'resend' | 'smtp' | 'dev';
};

export function allowEmailDevSink() {
  if (process.env.EMAIL_DEV_SINK === 'true') return true;
  if (process.env.EMAIL_DEV_SINK === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options?: { apiKey?: string; from?: string; smtp?: SmtpSettings | null },
): Promise<EmailSendResult> {
  try {
    const apiKey = options?.apiKey ?? process.env.RESEND_API_KEY;
    const smtp = options?.smtp ?? parseSmtpSettings(null);
    const from = options?.from ?? smtp?.from ?? process.env.EMAIL_FROM ?? 'NovaCRM <no-reply@novacrm.app>';

    if (apiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          ok: false,
          error: payload?.message ?? `Email request failed with status ${response.status}`,
        };
      }
      return { ok: true, id: payload?.id, via: 'resend' };
    }

    if (smtp?.host && smtp.port) {
      const result = await sendSmtpEmail(to, subject, html, { ...smtp, from });
      if (result.ok) {
        return { ok: true, id: result.id, via: 'smtp' };
      }
      if (!allowEmailDevSink()) {
        return { ok: false, error: result.error };
      }
    }

    if (allowEmailDevSink()) {
      console.info(`[email:dev] ${from} -> ${to} · ${subject}`);
      return { ok: true, id: 'dev-sink', dryRun: true, via: 'dev' };
    }

    return { ok: false, error: 'Email is not configured. Add Resend on Email, or host/port on SMTP.' };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown email error',
    };
  }
}

export { getMailpitUrl };

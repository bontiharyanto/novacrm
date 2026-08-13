import { getMailpitUrl, getSmtpConfig, sendSmtpEmail } from '@/lib/integrations/smtp';

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
  options?: { apiKey?: string; from?: string },
): Promise<EmailSendResult> {
  try {
    const apiKey = options?.apiKey ?? process.env.RESEND_API_KEY;
    const from = options?.from ?? process.env.EMAIL_FROM ?? 'NovaCRM <no-reply@novacrm.app>';
    const smtp = getSmtpConfig();

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

    if (smtp.host && smtp.port) {
      const result = await sendSmtpEmail(to, subject, html, { from, host: smtp.host, port: smtp.port });
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

    return { ok: false, error: 'RESEND_API_KEY is not configured.' };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown email error',
    };
  }
}

export { getMailpitUrl };

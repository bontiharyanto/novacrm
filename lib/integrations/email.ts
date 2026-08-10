export type EmailSendResult = {
  ok: boolean;
  id?: string;
  error?: string;
};

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options?: { apiKey?: string; from?: string; }
): Promise<EmailSendResult> {
  try {
    const apiKey = options?.apiKey ?? process.env.RESEND_API_KEY;
    const from = options?.from ?? process.env.EMAIL_FROM ?? 'NovaCRM <no-reply@novacrm.app>';

    if (!apiKey) {
      return { ok: false, error: 'RESEND_API_KEY is not configured.' };
    }

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

    return {
      ok: true,
      id: payload?.id,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown email error',
    };
  }
}

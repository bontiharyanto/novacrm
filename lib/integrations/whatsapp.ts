export type WhatsAppSendResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

export async function sendWhatsApp(
  to: string,
  message: string,
  options?: { apiKey?: string; baseUrl?: string; }
): Promise<WhatsAppSendResult> {
  try {
    const apiKey = options?.apiKey ?? process.env.FONNTE_API_KEY ?? process.env.WHATSAPP_API_KEY;
    const baseUrl = options?.baseUrl ?? process.env.WHATSAPP_API_BASE_URL ?? 'https://api.fonnte.com';

    if (!apiKey) {
      return { ok: false, error: 'WHATSAPP_API_KEY is not configured.' };
    }

    const response = await fetch(`${baseUrl}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        target: to,
        message,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        error: payload?.message ?? `WhatsApp request failed with status ${response.status}`,
      };
    }

    return {
      ok: true,
      messageId: payload?.messageId ?? payload?.id ?? `${Date.now()}`,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown WhatsApp error',
    };
  }
}

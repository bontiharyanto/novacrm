export type TelegramSendResult = {
  ok: boolean;
  messageId?: number;
  error?: string;
};

export async function sendTelegram(
  chatId: string,
  message: string,
  options?: { botToken?: string; baseUrl?: string; }
): Promise<TelegramSendResult> {
  try {
    const botToken = options?.botToken ?? process.env.TELEGRAM_BOT_TOKEN;
    const baseUrl = options?.baseUrl ?? process.env.TELEGRAM_API_BASE_URL ?? 'https://api.telegram.org';

    if (!botToken) {
      return { ok: false, error: 'TELEGRAM_BOT_TOKEN is not configured.' };
    }

    const response = await fetch(`${baseUrl}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        error: payload?.description ?? `Telegram request failed with status ${response.status}`,
      };
    }

    return {
      ok: true,
      messageId: payload?.result?.message_id,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown Telegram error',
    };
  }
}

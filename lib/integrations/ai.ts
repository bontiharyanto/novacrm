import { resolveAiSettings } from '@/lib/integrations/types';

export async function pingAi(input: { apiKey: string; baseUrl?: string; model?: string }) {
  const resolved = resolveAiSettings(input);
  const base = resolved.baseUrl.replace(/\/$/, '');
  const key = resolved.apiKey;
  const model = resolved.model;
  if (!key) return { ok: false, error: 'AI API key is required.' };

  try {
    const models = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (models.ok) {
      return { ok: true, message: `Connected to ${base}. Model ${model} ready.` };
    }

    const chat = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });
    if (chat.ok) {
      return { ok: true, message: `Connected to ${base}. Model ${model} ready.` };
    }
    const payload = await chat.json().catch(() => ({}));
    const message =
      typeof payload?.error?.message === 'string'
        ? payload.error.message
        : `AI provider returned ${chat.status || models.status}`;
    return { ok: false, error: message };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to reach AI provider' };
  }
}

export async function completeAiChat(input: {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}) {
  const resolved = resolveAiSettings(input);
  const base = resolved.baseUrl.replace(/\/$/, '');
  const model = resolved.model;
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
        Authorization: `Bearer ${resolved.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: input.messages,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error?.message === 'string' ? payload.error.message : `AI request failed (${response.status})`;
    return { ok: false as const, error: message };
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    return { ok: false as const, error: 'AI returned an empty reply' };
  }
  return { ok: true as const, content: content.trim() };
}

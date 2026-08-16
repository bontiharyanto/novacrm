import type { AssistantMessage } from '@/lib/assistant/schema';

const CREATE_INTENT =
  /(buat(kan)?|open|buka|create|submit|kirim|minta).{0,24}(tiket|ticket|request|reques|permintaan|insiden|incident)|tolong buatkan|(open|buat)\s+request/i;

export type PortalIntake =
  | { kind: 'create'; type: 'incident' | 'request'; title: string; description: string }
  | { kind: 'ask'; type: 'incident' | 'request' };

function inferType(text: string): 'incident' | 'request' {
  if (/(insiden|incident|gangguan|rusak|putus|down|error|tidak connect|tidak bisa)/i.test(text)) {
    return 'incident';
  }
  if (/(request|reques|permintaan|akses|reset|password|katalog)/i.test(text)) {
    return 'request';
  }
  return 'request';
}

export function stripCreateIntent(text: string) {
  return text
    .replace(/\b(tolong|bisa|mohon|please|can you|could you)\b/gi, ' ')
    .replace(
      /(buat(kan)?|open|buka|create|submit|kirim|minta)\s*(sebuah|a|an)?\s*(reques[t]?|request)?\s*(tiket|ticket|permintaan|insiden|incident)?/gi,
      ' ',
    )
    .replace(/[:\-?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolvePortalIntake(messages: AssistantMessage[]): PortalIntake | null {
  const users = messages.filter((item) => item.role === 'user').map((item) => item.content.trim()).filter(Boolean);
  const last = users[users.length - 1] ?? '';
  if (!last) return null;

  const lastIntent = CREATE_INTENT.test(last);
  const lastTitle = stripCreateIntent(last);
  const type = inferType(last);

  if (lastIntent && lastTitle.length >= 3) {
    return { kind: 'create', type, title: lastTitle.slice(0, 200), description: last };
  }

  if (lastIntent) {
    return { kind: 'ask', type };
  }

  const previous = users[users.length - 2] ?? '';
  if (previous && CREATE_INTENT.test(previous) && stripCreateIntent(previous).length < 3 && last.length >= 3) {
    return { kind: 'create', type: inferType(`${previous} ${last}`), title: last.slice(0, 200), description: last };
  }

  return null;
}

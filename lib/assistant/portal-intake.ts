import type { AssistantMessage } from '@/lib/assistant/schema';
import { hasCompleteDetails, hasSymptom } from '@/lib/assistant/portal-details';

const CREATE_INTENT =
  /\b(buatkan|tolong buat(kan)?|please create|create a ticket|open a ticket|buka tiket|buat tiket|submit (a )?(ticket|request))\b/i;

function isConfirmIntent(text: string) {
  const trimmed = text.trim();
  return (
    /^(ya|iya|ok|oke|yes|y|setuju|confirm)$/i.test(trimmed) ||
    /^(ya|iya|yes|ok|oke).{0,24}\b(buat(kan)?( saja)?( tiketnya)?|create( the)? ticket|setuju|confirm)\b/i.test(
      trimmed,
    ) ||
    /^(buat saja|buatkan saja|silakan buat|__confirm_ticket__)$/i.test(trimmed)
  );
}

const STATUS_QUERY =
  /(status|bagaimana|how (are|is)|where is|tiket saya|my tickets?|menunggu saya|waiting on me|yang menunggu)/i;

const META_UTTERANCE =
  /(bahasa indonesia|bahasa inggris|bahasa english|bisa bahasa|pakai bahasa|gunakan bahasa|ganti bahasa|speak (in )?(indonesian|english|bahasa)|(in|use) (indonesian|english)|terima kasih|thank you|\bthanks\b|^(halo|hello|hai|hi)\b)/i;

const NOT_AN_ISSUE =
  /(tidak ada( di| dalam)? (daftar|list|katalog)|ga ada( di (daftar|list))?|nggak ada( di (daftar|list))?|not in the list|none of (these|them)|yang lain|lainnya|something else|^other$)/i;

const REJECT_CI =
  /(tidak ada di ci|bukan ci|ci (itu|tersebut|tsb)|bukan (aset|ci) (itu|tersebut|tsb)|not (in )?(those|that) (ci|asset))/i;

const CATALOG_QUERY =
  /(katalog|catalog|daftar (layanan|item)|service catalog)/i;

const QUESTION =
  /^(apa|apakah|bagaimana|gimana|how|what|where|why|kapan|siapa|bisa\b|minta\b|tolong\b|info\b|list\b|daftar\b)/i;

export type PortalIntake =
  | { kind: 'propose'; type: 'incident' | 'request'; title: string; description: string }
  | { kind: 'details'; type: 'incident' | 'request'; title: string; description: string }
  | { kind: 'confirm' }
  | { kind: 'ask'; type: 'incident' | 'request' }
  | { kind: 'catalog' }
  | { kind: 'meta'; topic: 'language' | 'need_issue' | 'other' };

export function isMetaUtterance(text: string) {
  return META_UTTERANCE.test(text.trim());
}

export function isQuestion(text: string) {
  const trimmed = text.trim();
  return QUESTION.test(trimmed) || /\?$/.test(trimmed) || CATALOG_QUERY.test(trimmed);
}

export function isCatalogQuery(text: string) {
  return CATALOG_QUERY.test(text.trim());
}

export function looksLikeIssue(text: string) {
  const trimmed = text.trim();
  if (
    !trimmed ||
    isMetaUtterance(trimmed) ||
    STATUS_QUERY.test(trimmed) ||
    NOT_AN_ISSUE.test(trimmed) ||
    REJECT_CI.test(trimmed) ||
    isQuestion(trimmed) ||
    isConfirmIntent(trimmed)
  ) {
    return false;
  }
  return stripCreateIntent(trimmed).length >= 3 && (hasSymptom(trimmed) || /masalah\s*:/i.test(trimmed));
}

export function inferType(text: string): 'incident' | 'request' {
  if (
    /(insiden|incident|gangguan|rusak|putus|down|offline|blur|buram|error|gagal|hang|crash|bsod|lambat|lemot|mati|timeout|unavailable|cannot connect|can'?t connect|tidak connect|tidak terhubung|tidak bisa|tidak merekam|tidak nyala|tidak jalan|tidak masuk)/i.test(
      text,
    )
  ) {
    return 'incident';
  }
  if (/(request|reques|permintaan|akses|reset|password|install|instal|lisensi|footage|rekaman|akses)/i.test(text)) {
    return 'request';
  }
  return 'request';
}

export function stripCreateIntent(text: string) {
  return text
    .replace(/\b(tolong|bisa|mohon|please|can you|could you)\b/gi, ' ')
    .replace(
      /\b(buatkan|buat tiket|create a ticket|open a ticket|buka tiket|submit (a )?(ticket|request))\b/gi,
      ' ',
    )
    .replace(/[:\-?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function skipContext(text: string) {
  return (
    isConfirmIntent(text) ||
    isMetaUtterance(text) ||
    NOT_AN_ISSUE.test(text) ||
    REJECT_CI.test(text) ||
    isCatalogQuery(text) ||
    STATUS_QUERY.test(text)
  );
}

export function collectIssueContext(messages: AssistantMessage[]) {
  const users = messages.filter((item) => item.role === 'user').map((item) => item.content.trim()).filter(Boolean);
  const parts: string[] = [];
  let title = '';
  let type: 'incident' | 'request' = 'request';

  for (const text of users) {
    if (skipContext(text)) continue;
    if (!looksLikeIssue(text) && !/masalah\s*:|lokasi\s*:|terdampak\s*:|kontak\s*:/i.test(text)) {
      continue;
    }
    if (!title) {
      const line = text
        .split('\n')
        .map((item) => item.replace(/^masalah\s*:\s*/i, '').trim())
        .find(Boolean);
      title = stripCreateIntent(line ?? text).slice(0, 200);
      type = inferType(text);
    }
    parts.push(text);
  }

  if (!title) return null;
  const description = parts.join('\n\n');
  return { type, title, description, ready: hasCompleteDetails(description) };
}

export function lastProposedIssue(messages: AssistantMessage[]) {
  const context = collectIssueContext(messages);
  if (!context?.ready) return null;
  return { type: context.type, title: context.title, description: context.description };
}

export function resolvePortalIntake(messages: AssistantMessage[]): PortalIntake | null {
  const users = messages.filter((item) => item.role === 'user').map((item) => item.content.trim()).filter(Boolean);
  const last = users[users.length - 1] ?? '';
  if (!last) return null;

  if (isMetaUtterance(last)) {
    return { kind: 'meta', topic: /bahasa|indonesian|english|inggris/i.test(last) ? 'language' : 'other' };
  }

  if (NOT_AN_ISSUE.test(last)) {
    return { kind: 'meta', topic: 'need_issue' };
  }

  if (isCatalogQuery(last)) {
    return { kind: 'catalog' };
  }

  const context = collectIssueContext(isConfirmIntent(last) || REJECT_CI.test(last) ? messages.slice(0, -1) : messages);

  if (isConfirmIntent(last)) {
    if (context?.ready) return { kind: 'confirm' };
    if (context) return { kind: 'details', type: context.type, title: context.title, description: context.description };
    return { kind: 'meta', topic: 'need_issue' };
  }

  if (REJECT_CI.test(last)) {
    if (context?.ready) {
      return { kind: 'propose', type: context.type, title: context.title, description: context.description };
    }
    if (context) return { kind: 'details', type: context.type, title: context.title, description: context.description };
    return { kind: 'meta', topic: 'need_issue' };
  }

  const lastIntent = CREATE_INTENT.test(last);
  const type = inferType(last);

  if (lastIntent && !looksLikeIssue(stripCreateIntent(last)) && !context) {
    return { kind: 'ask', type };
  }

  if (context?.ready) {
    return { kind: 'propose', type: context.type, title: context.title, description: context.description };
  }

  if (context) {
    return { kind: 'details', type: context.type, title: context.title, description: context.description };
  }

  if (lastIntent) {
    return { kind: 'ask', type };
  }

  return null;
}

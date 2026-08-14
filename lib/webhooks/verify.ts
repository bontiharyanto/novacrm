import { timingSafeEqual } from 'crypto';

const WEAK_SECRETS = new Set([
  'change-me',
  'change-me-whatsapp',
  'change-me-telegram',
  'change-me-email',
  'change-me-alert',
  'change-me-generic',
  'local-whatsapp-secret',
  'local-telegram-secret',
  'local-email-secret',
  'local-alert-secret',
  'local-generic-secret',
  'secret',
  'password',
  'webhook',
]);

export function isUsableWebhookSecret(expected: string | null | undefined): expected is string {
  if (!expected) return false;
  const value = expected.trim();
  if (value.length < 16) return false;
  if (WEAK_SECRETS.has(value.toLowerCase())) return false;
  if (/^change-me/i.test(value)) return false;
  if (/^local-.+-secret$/i.test(value)) return false;
  return true;
}

export function webhookSecretFromHeaders(
  request: { headers: { get(name: string): string | null } },
  extraHeaders: string[] = [],
) {
  for (const name of ['x-webhook-secret', ...extraHeaders]) {
    const value = request.headers.get(name)?.trim();
    if (value) return value;
  }

  const authorization = request.headers.get('authorization');
  if (authorization && /^Bearer\s+\S+/i.test(authorization)) {
    return authorization.replace(/^Bearer\s+/i, '').trim();
  }

  return null;
}

export function verifyWebhookSecret(provided: string | null | undefined, expected: string | undefined) {
  if (!isUsableWebhookSecret(expected) || !provided) {
    return false;
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

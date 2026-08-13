import { timingSafeEqual } from 'crypto';

export function verifyWebhookSecret(provided: string | null | undefined, expected: string | undefined) {
  if (!expected || !provided) {
    return false;
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

export const PRIVACY_SEEN_COOKIE = 'novacrm_privacy_seen';
export const DEEMED_CONSENT_DAYS = 30;

export type PrivacyConsentState = {
  seenOn: Date;
  daysElapsed: number;
  remaining: number;
  dayNumber: number;
  deemed: boolean;
  deemedOn: Date;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function readPrivacySeenFromDocument() {
  if (typeof document === 'undefined') return null;
  const part = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${PRIVACY_SEEN_COOKIE}=`));
  if (!part) return null;
  return parseIsoDate(decodeURIComponent(part.slice(PRIVACY_SEEN_COOKIE.length + 1)));
}

export function markPrivacySeen() {
  const existing = readPrivacySeenFromDocument();
  if (existing) return existing;
  const today = startOfDay(new Date());
  document.cookie = `${PRIVACY_SEEN_COOKIE}=${toIsoDate(today)}; Max-Age=${60 * 60 * 24 * 400}; Path=/; SameSite=Lax`;
  return today;
}

export function getPrivacyConsentState(seenOn: Date, now = new Date()): PrivacyConsentState {
  const start = startOfDay(seenOn);
  const today = startOfDay(now);
  const daysElapsed = Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86_400_000));
  const deemedOn = new Date(start);
  deemedOn.setDate(deemedOn.getDate() + DEEMED_CONSENT_DAYS);
  return {
    seenOn: start,
    daysElapsed,
    remaining: Math.max(0, DEEMED_CONSENT_DAYS - daysElapsed),
    dayNumber: Math.min(DEEMED_CONSENT_DAYS, daysElapsed + 1),
    deemed: daysElapsed >= DEEMED_CONSENT_DAYS,
    deemedOn,
  };
}

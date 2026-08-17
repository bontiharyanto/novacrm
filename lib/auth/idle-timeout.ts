export const IDLE_COOKIE = 'novacrm_last_active';
export const IDLE_OPTIONS = [0, 15, 30, 60] as const;
export const DEFAULT_IDLE_MINUTES = 30;
export const IDLE_WARN_MS = 60_000;

export type IdleMinutes = (typeof IDLE_OPTIONS)[number];

export function parseIdleMinutes(value: unknown): IdleMinutes {
  const n = Number(value);
  if (n === 0 || n === 15 || n === 30 || n === 60) return n;
  return DEFAULT_IDLE_MINUTES;
}

export function idleTimeoutMs(minutes: IdleMinutes) {
  return minutes * 60_000;
}

export function isIdleExpired(lastActiveMs: number | null | undefined, minutes: IdleMinutes, now = Date.now()) {
  if (minutes === 0) return false;
  if (!lastActiveMs || !Number.isFinite(lastActiveMs)) return false;
  return now - lastActiveMs >= idleTimeoutMs(minutes);
}

export function shouldWarnIdle(lastActiveMs: number, minutes: IdleMinutes, now = Date.now()) {
  if (minutes === 0) return false;
  const remaining = idleTimeoutMs(minutes) - (now - lastActiveMs);
  return remaining > 0 && remaining <= IDLE_WARN_MS;
}

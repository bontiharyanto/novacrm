export const TENANT_PLANS = ['trial', 'standard', 'enterprise'] as const;
export type TenantPlan = (typeof TENANT_PLANS)[number];

export const DEFAULT_GRACE_DAYS = 7;
export const TRIAL_DAYS = 14;
export const EXPIRING_SOON_DAYS = 14;

export type TenantAccessState = 'ok' | 'expiring' | 'grace' | 'blocked';

export type TenantLifecycle = {
  status: 'active' | 'paused' | 'archived';
  isProtected?: boolean;
  expiresAt?: string | null;
  graceDays?: number | null;
};

export function graceMs(graceDays?: number | null) {
  return Math.max(0, Number(graceDays ?? DEFAULT_GRACE_DAYS)) * 86_400_000;
}

export function tenantAccessState(tenant: TenantLifecycle, now = new Date()): TenantAccessState {
  if (tenant.status !== 'active') return 'blocked';
  if (tenant.isProtected || !tenant.expiresAt) return 'ok';
  const end = new Date(tenant.expiresAt).getTime();
  if (!Number.isFinite(end)) return 'ok';
  const nowMs = now.getTime();
  if (nowMs > end + graceMs(tenant.graceDays)) return 'blocked';
  if (nowMs > end) return 'grace';
  if (end - nowMs <= EXPIRING_SOON_DAYS * 86_400_000) return 'expiring';
  return 'ok';
}

export function isTenantLoginBlocked(tenant: TenantLifecycle, now = new Date()) {
  return tenantAccessState(tenant, now) === 'blocked';
}

export function dateInputToExpiry(value: string | undefined | null) {
  const raw = value?.trim();
  if (!raw) return null;
  const parsed = new Date(`${raw}T23:59:59.000Z`);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

export function expiryToDateInput(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function trialExpiresAt(from = new Date()) {
  return new Date(from.getTime() + TRIAL_DAYS * 86_400_000).toISOString();
}

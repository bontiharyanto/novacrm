import type { TenantPlan } from '@/lib/tenants/lifecycle';

/** Stored on tenants; not invoice amounts. See docs/PRICING-MATRIX.md */
export type TenantQuotaLimits = {
  maxAccounts: number;
  maxAgents: number;
  maxTicketsPerMonth: number;
};

/**
 * Default caps by plan label:
 * trial ≈ Starter · standard ≈ MSP · enterprise ≈ Enterprise
 */
export const PLAN_QUOTA_DEFAULTS: Record<TenantPlan, TenantQuotaLimits> = {
  trial: { maxAccounts: 1, maxAgents: 8, maxTicketsPerMonth: 800 },
  standard: { maxAccounts: 5, maxAgents: 15, maxTicketsPerMonth: 2000 },
  enterprise: { maxAccounts: 20, maxAgents: 40, maxTicketsPerMonth: 5000 },
};

export function quotasForPlan(plan: TenantPlan): TenantQuotaLimits {
  return { ...PLAN_QUOTA_DEFAULTS[plan] };
}

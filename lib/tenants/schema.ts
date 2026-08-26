import { z } from 'zod';
import { emptyToUndefined } from '@/lib/validation/id';

import { TENANT_PLANS, type TenantPlan } from '@/lib/tenants/lifecycle';

export const TENANT_STATUSES = ['active', 'paused', 'archived'] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];
export { TENANT_PLANS, type TenantPlan };

export const tenantSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens');

export const tenantStatusSchema = z.enum(TENANT_STATUSES);

export const tenantFieldsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: tenantSlugSchema,
  accentColor: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Use a hex color like #3b82f6')
    .default('#3b82f6'),
  timezone: z.string().trim().min(3).max(80).default('Asia/Jakarta'),
  supportEmail: z.preprocess(emptyToUndefined, z.string().trim().email().max(160).optional()),
});

export const tenantPlanSchema = z.enum(TENANT_PLANS);

export const tenantAdminSchema = z.object({
  subscriptionPlan: tenantPlanSchema.optional(),
  expiresAt: z.string().trim().max(40).optional().nullable(),
  graceDays: z.coerce.number().int().min(0).max(90).optional(),
  autoPauseOnExpiry: z.boolean().optional(),
  isProtected: z.boolean().optional(),
  passwordRotationEnabled: z.boolean().optional(),
  passwordMaxAgeDays: z.coerce.number().int().min(7).max(365).optional(),
  /** MinIO object key under this tenant; null clears the logo. */
  logoObjectKey: z.string().trim().max(400).nullable().optional(),
});

export const createTenantSchema = tenantFieldsSchema.extend({
  adminName: z.string().trim().min(2).max(120),
  adminEmail: z.string().trim().email().max(160),
  adminPassword: z.string().min(8).max(72),
  subscriptionPlan: tenantPlanSchema.optional(),
  expiresAt: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  graceDays: z.coerce.number().int().min(0).max(90).optional(),
});

export const updateTenantSchema = tenantFieldsSchema.partial().extend({
  status: tenantStatusSchema.optional(),
}).merge(tenantAdminSchema);

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export type TenantRecord = {
  id: string;
  name: string;
  slug: string;
  accentColor: string;
  timezone: string;
  supportEmail: string;
  status: TenantStatus;
  mfaRequired: boolean;
  isProtected: boolean;
  subscriptionPlan: TenantPlan;
  expiresAt?: string;
  graceDays: number;
  autoPauseOnExpiry: boolean;
  passwordRotationEnabled: boolean;
  passwordMaxAgeDays: number;
  publicUrl: string;
  backendUrl: string;
  loginUrl: string;
  logoObjectKey?: string;
  createdAt: string;
  adminCount: number;
  userCount: number;
};

export const TENANT_TIMEZONES = [
  'Asia/Jakarta',
  'Asia/Makassar',
  'Asia/Jayapura',
  'Asia/Singapore',
  'UTC',
] as const;

export type TenantAuditSeverity = 'fail' | 'warn' | 'pass';

export type TenantAuditFinding = {
  severity: TenantAuditSeverity;
  checkId: string;
  objectName: string;
  detail: string;
  rowCount: number;
};

export type TenantAuditResult = {
  ranAt: string;
  fail: number;
  warn: number;
  pass: number;
  ok: boolean;
  findings: TenantAuditFinding[];
};

export const TENANT_STATUS_LABEL: Record<TenantStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
};

export const TENANT_PLAN_LABEL: Record<TenantPlan, string> = {
  trial: 'Trial',
  standard: 'Standard',
  enterprise: 'Enterprise',
};

/** Commercial proposal — invoice is manual; see docs/BUSINESS.md */
export const TENANT_PLAN_GUIDE: Record<
  TenantPlan,
  { price: string; includes: string; excludes: string }
> = {
  trial: {
    price: '14 days · Rp 0',
    includes: 'Desk, portal, CSAT. Up to ~8 agents. Empty workspace — not the shared lab.',
    excludes: 'Production WhatsApp, heavy custom SLA, mass roster apply.',
  },
  standard: {
    price: 'About Rp 3–8 jt / month (invoice)',
    includes: 'Tickets, portal, CSAT, assets/CMDB, ticket Reports, email notifications. ~15 agents / ~2,000 tickets per month.',
    excludes: 'Full WFM + Workforce export unless sold as Standard+.',
  },
  enterprise: {
    price: 'About Rp 12–25 jt / month · 12-month contract',
    includes: 'All modules, WFM, UC/vendor, SSO test, accent, grace / auto-pause, onboarding.',
    excludes: 'ITOM Discovery, HR payroll, multi-region HA.',
  },
};

export const TENANT_PLAN_FEATURES: Array<{
  label: string;
  trial: string;
  standard: string;
  enterprise: string;
}> = [
  { label: 'Desk + portal + CSAT', trial: 'Yes', standard: 'Yes', enterprise: 'Yes' },
  { label: 'Assets / CMDB', trial: 'Read demo', standard: 'Yes', enterprise: 'Yes' },
  { label: 'Ticket Reports', trial: 'Yes', standard: 'Yes', enterprise: 'Yes' },
  { label: 'WFM + Workforce export', trial: 'No', standard: 'Add-on', enterprise: 'Yes' },
  { label: 'UC / vendor queue', trial: 'No', standard: 'Limited', enterprise: 'Yes' },
  { label: 'Production WhatsApp', trial: 'No', standard: 'Add-on', enterprise: 'Add-on' },
];


import { z } from 'zod';
import { emptyToUndefined } from '@/lib/validation/id';

export const TENANT_STATUSES = ['active', 'paused', 'archived'] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

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

export const createTenantSchema = tenantFieldsSchema.extend({
  adminName: z.string().trim().min(2).max(120),
  adminEmail: z.string().trim().email().max(160),
  adminPassword: z.string().min(8).max(72),
});

export const updateTenantSchema = tenantFieldsSchema.partial().extend({
  status: tenantStatusSchema.optional(),
});

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

export const TENANT_STATUS_LABEL: Record<TenantStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
};

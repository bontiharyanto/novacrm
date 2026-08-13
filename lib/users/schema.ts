import { z } from 'zod';
import type { AppRole } from '@/lib/rbac/ability';
import type { SupportTier } from '@/lib/tickets/pending';

function emptyToUndefined(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
}

export const userAccessSchema = z.object({
  role: z.enum(['admin', 'agent', 'customer']).optional(),
  orgUnitId: z.string().uuid().nullable().optional(),
});

export const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  role: z.enum(['admin', 'agent', 'customer']),
  password: z.string().min(8).max(72),
  accountId: z.string().uuid(),
  orgUnitId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  groupId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

export type DirectoryUser = {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: AppRole;
  orgUnitId?: string;
  orgUnitName?: string;
  supportLevel?: SupportTier;
  groups: Array<{
    membershipId: string;
    groupId: string;
    name: string;
    kind: string;
    tier?: SupportTier;
    memberRole: 'lead' | 'member';
  }>;
  accounts: Array<{
    accountId: string;
    name: string;
    memberRole: string;
  }>;
};

export function highestSupportLevel(tiers: Array<SupportTier | undefined>): SupportTier | undefined {
  if (tiers.includes('l3')) return 'l3';
  if (tiers.includes('l2')) return 'l2';
  if (tiers.includes('l1')) return 'l1';
  return undefined;
}

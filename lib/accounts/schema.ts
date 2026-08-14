import { z } from 'zod';

export const ACCOUNT_COOKIE = 'novacrm_account';
export const ACCOUNT_ALL = 'all';

export const accountTypeSchema = z.enum(['internal', 'customer']);
export const accountStatusSchema = z.enum(['active', 'paused', 'archived']);
export const accountMemberRoleSchema = z.enum(['owner', 'member', 'portal']);

export const accountSchema = z.object({
  name: z.string().min(2).max(120),
  type: accountTypeSchema.default('customer'),
  slug: z.string().max(80).optional(),
  code: z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return String(value).toUpperCase();
  }, z.string().max(12).optional()),
  status: accountStatusSchema.default('active'),
});

export const accountUpdateSchema = accountSchema.partial();

export const accountMemberSchema = z.object({
  userId: z.string().uuid(),
  role: accountMemberRoleSchema.default('member'),
});

export type AccountType = z.infer<typeof accountTypeSchema>;
export type AccountStatus = z.infer<typeof accountStatusSchema>;
export type AccountMemberRole = z.infer<typeof accountMemberRoleSchema>;

export type AccountRecord = {
  id: string;
  tenantId: string;
  type: AccountType;
  name: string;
  slug: string;
  code?: string;
  status: AccountStatus;
  createdAt: string;
};

export type AccountMember = {
  id: string;
  accountId: string;
  userId: string;
  role: AccountMemberRole;
  fullName?: string;
  email?: string;
  appRole?: string;
  createdAt: string;
};

export type AccountScope = {
  accounts: AccountRecord[];
  account: AccountRecord | null;
  viewingAll: boolean;
};

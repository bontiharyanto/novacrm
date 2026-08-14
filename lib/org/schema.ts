import { z } from 'zod';
import { emptyToUndefined, optionalUuidSchema, uuidSchema } from '@/lib/validation/id';

export const orgUnitTypeSchema = z.enum(['division', 'unit']);
export const assignmentGroupKindSchema = z.enum(['assignment', 'cab', 'fulfillment', 'oncall']);
export const supportTierSchema = z.enum(['l1', 'l2', 'l3']);
export const groupMemberRoleSchema = z.enum(['lead', 'member']);

export const orgUnitSchema = z.object({
  name: z.string().min(2).max(120),
  type: orgUnitTypeSchema.default('unit'),
  parentId: optionalUuidSchema,
  managerId: optionalUuidSchema,
  slug: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
});

export const orgUnitUpdateSchema = orgUnitSchema.partial();

export const assignmentGroupSchema = z.object({
  name: z.string().min(2).max(120),
  kind: assignmentGroupKindSchema.default('assignment'),
  tier: supportTierSchema.nullable().optional(),
  slug: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
  isActive: z.boolean().optional().default(true),
});

export const assignmentGroupUpdateSchema = assignmentGroupSchema.partial();

export const groupMemberSchema = z.object({
  userId: uuidSchema,
  role: groupMemberRoleSchema.default('member'),
});

export type OrgUnitType = z.infer<typeof orgUnitTypeSchema>;
export type AssignmentGroupKind = z.infer<typeof assignmentGroupKindSchema>;
export type SupportTier = z.infer<typeof supportTierSchema>;
export type GroupMemberRole = z.infer<typeof groupMemberRoleSchema>;

export type OrgUnit = {
  id: string;
  tenantId: string;
  accountId: string;
  parentId?: string;
  type: OrgUnitType;
  name: string;
  slug: string;
  managerId?: string;
  managerName?: string;
  createdAt: string;
};

export type AssignmentGroupMember = {
  id: string;
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  fullName?: string;
  email?: string;
};

export type AssignmentGroup = {
  id: string;
  tenantId: string;
  accountId: string;
  name: string;
  slug: string;
  kind: AssignmentGroupKind;
  tier?: SupportTier;
  isActive: boolean;
  memberCount: number;
  isMember?: boolean;
  members: AssignmentGroupMember[];
  createdAt: string;
};

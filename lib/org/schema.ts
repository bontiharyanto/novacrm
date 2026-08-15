import { z } from 'zod';
import { emptyToUndefined, nullableUuidSchema, optionalUuidSchema, uuidSchema } from '@/lib/validation/id';

export const orgUnitTypeSchema = z.enum(['division', 'unit']);
export const assignmentGroupKindSchema = z.enum(['assignment', 'cab', 'fulfillment', 'oncall']);
export const supportTierSchema = z.enum(['l1', 'l2', 'l3']);
export const groupPartyKindSchema = z.enum(['internal', 'vendor', 'principal']);
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
  olaResponseMinutes: z.number().int().min(5).max(10080).optional(),
  olaResolveMinutes: z.number().int().min(15).max(43200).optional(),
  partyKind: groupPartyKindSchema.optional().default('internal'),
  partyName: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  ucId: nullableUuidSchema,
});

export const assignmentGroupUpdateSchema = assignmentGroupSchema.partial();

export const groupMemberSchema = z.object({
  userId: uuidSchema,
  role: groupMemberRoleSchema.default('member'),
});

export type OrgUnitType = z.infer<typeof orgUnitTypeSchema>;
export type AssignmentGroupKind = z.infer<typeof assignmentGroupKindSchema>;
export type SupportTier = z.infer<typeof supportTierSchema>;
export type GroupPartyKind = z.infer<typeof groupPartyKindSchema>;
export type GroupMemberRole = z.infer<typeof groupMemberRoleSchema>;

export const PARTY_KIND_LABEL: Record<GroupPartyKind, string> = {
  internal: 'Internal',
  vendor: 'Vendor',
  principal: 'Principal',
};

export function formatGroupQueueLabel(group: {
  name: string;
  tier?: SupportTier | string | null;
  partyKind?: GroupPartyKind | string | null;
  partyName?: string | null;
}) {
  const tier =
    group.tier === 'l1' ? 'L1' : group.tier === 'l2' ? 'L2' : group.tier === 'l3' ? 'L3' : null;
  const party =
    group.partyKind === 'vendor' || group.partyKind === 'principal'
      ? `${PARTY_KIND_LABEL[group.partyKind]}${group.partyName ? ` · ${group.partyName}` : ''}`
      : null;
  return [tier, party, group.name].filter(Boolean).join(' · ');
}

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
  olaResponseMinutes: number;
  olaResolveMinutes: number;
  partyKind: GroupPartyKind;
  partyName?: string;
  ucId?: string;
  ucName?: string;
  memberCount: number;
  isMember?: boolean;
  members: AssignmentGroupMember[];
  createdAt: string;
};

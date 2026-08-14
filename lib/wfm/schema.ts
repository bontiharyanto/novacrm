import { z } from 'zod';
import type { AppRole } from '@/lib/rbac/roles';

export const wfmPresenceStatusSchema = z.enum(['available', 'busy', 'break', 'offline']);
export const wfmTimeOffTypeSchema = z.enum(['leave', 'sick', 'training', 'other']);
export const wfmTimeOffStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export const wfmDispatchStrategySchema = z.enum(['manual', 'least_loaded', 'round_robin', 'skill', 'oncall']);
export const wfmRosterSourceSchema = z.enum(['planned', 'override']);

function emptyToUndefined(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
}

export const presenceSchema = z.object({
  status: wfmPresenceStatusSchema,
  until: z.preprocess(emptyToUndefined, z.string().datetime().optional()),
});

export const shiftTemplateSchema = z.object({
  name: z.string().min(2).max(80),
  startLocal: z.string().regex(/^\d{2}:\d{2}/),
  endLocal: z.string().regex(/^\d{2}:\d{2}/),
  days: z.array(z.number().int().min(1).max(7)).min(1),
  timezone: z.string().min(3).max(80).default('Asia/Jakarta'),
  isActive: z.boolean().optional().default(true),
});

export const rosterEntrySchema = z.object({
  userId: z.string().uuid(),
  groupId: z.string().uuid(),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  templateId: z.string().uuid(),
  source: wfmRosterSourceSchema.optional().default('override'),
});

export const timeOffSchema = z.object({
  userId: z.string().uuid(),
  startsAt: z.string(),
  endsAt: z.string(),
  type: wfmTimeOffTypeSchema.default('leave'),
  note: z.preprocess(emptyToUndefined, z.string().max(240).optional()),
});

export const timeOffStatusSchema = z.object({
  status: wfmTimeOffStatusSchema,
});

export const skillSchema = z.object({
  name: z.string().min(2).max(80),
  category: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
});

export const agentSkillSchema = z.object({
  userId: z.string().uuid(),
  skillId: z.string().uuid(),
  level: z.number().int().min(1).max(5).default(3),
});

export const dispatchPolicySchema = z.object({
  groupId: z.string().uuid(),
  strategy: wfmDispatchStrategySchema.default('manual'),
  maxOpenTickets: z.number().int().min(1).max(50).default(8),
  requiredSkillIds: z.array(z.string().uuid()).default([]),
  oncallGroupId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  isActive: z.boolean().optional().default(true),
});

export const oncallRotationSchema = z.object({
  groupId: z.string().uuid(),
  name: z.string().min(2).max(80),
  cadenceHours: z.number().int().min(1).max(720).default(168),
});

export const oncallSlotSchema = z.object({
  rotationId: z.string().uuid(),
  startsAt: z.string(),
  endsAt: z.string(),
  primaryUserId: z.string().uuid(),
  backupUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

export type WfmPresenceStatus = z.infer<typeof wfmPresenceStatusSchema>;
export type WfmTimeOffType = z.infer<typeof wfmTimeOffTypeSchema>;
export type WfmTimeOffStatus = z.infer<typeof wfmTimeOffStatusSchema>;
export type WfmDispatchStrategy = z.infer<typeof wfmDispatchStrategySchema>;
export type WfmRosterSource = z.infer<typeof wfmRosterSourceSchema>;

export type WfmPresence = {
  userId: string;
  status: WfmPresenceStatus;
  until?: string;
  updatedAt: string;
};

export type WfmShiftTemplate = {
  id: string;
  name: string;
  startLocal: string;
  endLocal: string;
  days: number[];
  timezone: string;
  isActive: boolean;
};

export type WfmRosterEntry = {
  id: string;
  userId: string;
  userName?: string;
  groupId: string;
  workDate: string;
  templateId: string;
  templateName?: string;
  startLocal?: string;
  endLocal?: string;
  source: WfmRosterSource;
};

export type WfmTimeOff = {
  id: string;
  userId: string;
  userName?: string;
  startsAt: string;
  endsAt: string;
  type: WfmTimeOffType;
  status: WfmTimeOffStatus;
  note?: string;
};

export type WfmSkill = {
  id: string;
  name: string;
  slug: string;
  category?: string;
};

export type WfmAgentSkill = {
  id: string;
  userId: string;
  userName?: string;
  skillId: string;
  skillName?: string;
  level: number;
};

export type WfmDispatchPolicy = {
  id: string;
  groupId: string;
  strategy: WfmDispatchStrategy;
  maxOpenTickets: number;
  requiredSkillIds: string[];
  oncallGroupId?: string;
  lastAssigneeId?: string;
  isActive: boolean;
};

export type WfmOncallRotation = {
  id: string;
  groupId: string;
  groupName?: string;
  name: string;
  cadenceHours: number;
  isActive: boolean;
  slots: WfmOncallSlot[];
};

export type WfmOncallSlot = {
  id: string;
  rotationId: string;
  startsAt: string;
  endsAt: string;
  primaryUserId: string;
  primaryName?: string;
  backupUserId?: string;
  backupName?: string;
};

export type WfmEligibleReason = 'off_shift' | 'on_leave' | 'offline' | 'at_cap' | 'missing_skill';

export type WfmEligibleAgent = {
  id: string;
  fullName: string;
  email?: string;
  role: AppRole;
  groupId?: string;
  eligible: boolean;
  reasons: WfmEligibleReason[];
  openTickets: number;
  maxOpen: number;
  presence: WfmPresenceStatus;
  onShift: boolean;
  skillIds: string[];
};

export type WfmOccupancyRow = {
  groupId: string;
  groupName: string;
  kind: string;
  tier?: string;
  strategy: WfmDispatchStrategy;
  agents: WfmEligibleAgent[];
  unassigned: number;
  onShift: number;
  available: number;
};

export type WfmForecastBucket = {
  weekday: number;
  label: string;
  tickets: number;
  headcount: number;
  gap: number;
};

export type WfmAdherenceRow = {
  userId: string;
  fullName: string;
  groupName: string;
  expected: boolean;
  actual: WfmPresenceStatus;
  adherent: boolean;
};

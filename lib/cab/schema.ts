import { z } from 'zod';

export const changeTypeSchema = z.enum(['standard', 'normal', 'emergency']);
export const riskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
export const cabDecisionSchema = z.enum(['approved', 'rejected', 'deferred']);

export const changePlanSchema = z.object({
  changeType: changeTypeSchema.optional(),
  riskLevel: riskLevelSchema.optional(),
  plannedStart: z.string().optional().nullable(),
  plannedEnd: z.string().optional().nullable(),
  implementationPlan: z.string().max(8000).optional(),
  backoutPlan: z.string().max(8000).optional(),
});

export const cabDecisionInputSchema = z.object({
  decision: cabDecisionSchema,
  comment: z.string().max(2000).optional(),
});

export type ChangeType = z.infer<typeof changeTypeSchema>;
export type RiskLevel = z.infer<typeof riskLevelSchema>;
export type CabDecision = z.infer<typeof cabDecisionSchema>;

export type CabApproval = {
  id: string;
  ticketId: string;
  approverId: string;
  approverName?: string;
  decision: CabDecision;
  comment?: string;
  createdAt: string;
};

export const CHANGE_TYPES: Array<{ id: ChangeType; label: string; hint: string }> = [
  { id: 'standard', label: 'Standard', hint: 'Pre-approved, skip CAB' },
  { id: 'normal', label: 'Normal', hint: 'Requires CAB review' },
  { id: 'emergency', label: 'Emergency', hint: 'eCAB, implement after approve' },
];

export const RISK_LEVELS: Array<{ id: RiskLevel; label: string }> = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'critical', label: 'Critical' },
];

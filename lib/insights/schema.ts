import { z } from 'zod';

export const insightKindSchema = z.enum(['queue_pressure', 'sla_risk', 'workforce_load', 'account_health']);
export const insightSeveritySchema = z.enum(['info', 'success', 'warning', 'danger']);
export const insightSourceSchema = z.enum(['ai', 'snapshot']);

export const INSIGHT_KINDS = insightKindSchema.options;
export type InsightKind = z.infer<typeof insightKindSchema>;
export type InsightSeverity = z.infer<typeof insightSeveritySchema>;
export type InsightSource = z.infer<typeof insightSourceSchema>;

export const insightNarrativeSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(400).optional().default(''),
  body: z.string().trim().max(4000).optional().default(''),
  severity: insightSeveritySchema.optional().default('info'),
});

export type InsightNarrative = z.infer<typeof insightNarrativeSchema>;

export type InsightCard = {
  kind: InsightKind;
  title: string;
  summary: string;
  body: string;
  severity: InsightSeverity;
  source: InsightSource;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  generatedAt: string;
};

export type InsightsBoard = {
  cards: InsightCard[];
  aiConfigured: boolean;
  viewingAll: boolean;
  accountCode: string | null;
  role: string;
};

export type QueueSignal = {
  open: number;
  unassigned: number;
  aging: Array<{ number: string; ageDays: number; status: string }>;
  byPriority: Array<{ label: string; value: number }>;
};

export type SlaSignal = {
  slaBreached: number;
  slaRisk: number;
  cabReview: number;
  emergencyChanges: number;
  agingDue: Array<{ number: string; ageDays: number; dueDate?: string }>;
};

export type WorkforceSignal = {
  groups: Array<{
    groupName: string;
    unassigned: number;
    onShift: number;
    available: number;
    overCap: number;
    underUtilised: number;
  }>;
  overCap: number;
  underUtilised: number;
  forecast: Array<{ label: string; tickets: number; headcount: number; gap: number }>;
};

export type AccountHealthSignal = {
  accounts: Array<{
    code: string;
    open: number;
    unassigned: number;
    slaBreached: number;
    slaRisk: number;
  }>;
};

export type InsightSignals = {
  locale: 'en' | 'id';
  role: string;
  viewingAll: boolean;
  accountCode: string | null;
  aiConfigured: boolean;
  queue: QueueSignal;
  sla: SlaSignal;
  workforce: WorkforceSignal;
  accounts: AccountHealthSignal;
};

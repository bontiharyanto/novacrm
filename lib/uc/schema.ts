import { z } from 'zod';
import { emptyToUndefined, optionalEmailSchema, optionalUuidSchema } from '@/lib/validation/id';
import { ticketPrioritySchema, ticketTypeSchema } from '@/lib/tickets/schema';

export const ucPartyKindSchema = z.enum(['vendor', 'principal']);
export const ucCoverageSchema = z.enum(['24x7', 'business_hours']);

export const ucTargetInputSchema = z.object({
  ticketType: ticketTypeSchema,
  priority: ticketPrioritySchema,
  responseMinutes: z.coerce.number().int().min(1).max(200000),
  resolveMinutes: z.coerce.number().int().min(1).max(200000),
});

export const underpinningContractSchema = z.object({
  name: z.string().min(2).max(120),
  contractNumber: z.string().min(2).max(60),
  partyKind: ucPartyKindSchema,
  partyName: z.string().min(2).max(120),
  calendarId: optionalUuidSchema,
  coverage: ucCoverageSchema.default('24x7'),
  startsOn: z.preprocess(emptyToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  endsOn: z.preprocess(emptyToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  contactEmail: optionalEmailSchema,
  contactPhone: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
  serviceScope: z.preprocess(emptyToUndefined, z.string().max(2000).optional()),
  penaltyNotes: z.preprocess(emptyToUndefined, z.string().max(2000).optional()),
  isActive: z.boolean().optional().default(true),
  targets: z.array(ucTargetInputSchema).optional(),
});

export const underpinningContractUpdateSchema = underpinningContractSchema.partial();

export type UcPartyKind = z.infer<typeof ucPartyKindSchema>;
export type UcCoverage = z.infer<typeof ucCoverageSchema>;
export type UcTargetInput = z.infer<typeof ucTargetInputSchema>;

export type UcTarget = {
  id: string;
  ticketType: z.infer<typeof ticketTypeSchema>;
  priority: z.infer<typeof ticketPrioritySchema>;
  responseMinutes: number;
  resolveMinutes: number;
};

export type UnderpinningContract = {
  id: string;
  tenantId: string;
  name: string;
  contractNumber: string;
  partyKind: UcPartyKind;
  partyName: string;
  calendarId?: string;
  coverage: UcCoverage;
  startsOn?: string;
  endsOn?: string;
  contactEmail?: string;
  contactPhone?: string;
  serviceScope?: string;
  penaltyNotes?: string;
  isActive: boolean;
  targets: UcTarget[];
  linkedGroupCount: number;
  createdAt: string;
};

export const UC_PARTY_LABEL: Record<UcPartyKind, string> = {
  vendor: 'Vendor',
  principal: 'Principal',
};

export const UC_COVERAGE_LABEL: Record<UcCoverage, string> = {
  '24x7': '24×7',
  business_hours: 'Business hours',
};

export function defaultUcTargets(partyKind: UcPartyKind): UcTargetInput[] {
  const vendor: Record<string, Record<string, [number, number]>> = {
    incident: { critical: [60, 480], high: [240, 1440], medium: [480, 2880], low: [960, 5760] },
    problem: { critical: [120, 960], high: [480, 2880], medium: [960, 5760], low: [1440, 8640] },
    change: { critical: [240, 1440], high: [480, 2880], medium: [960, 5760], low: [1440, 8640] },
    request: { critical: [120, 960], high: [240, 1440], medium: [480, 2880], low: [960, 5760] },
  };
  const principal: Record<string, Record<string, [number, number]>> = {
    incident: { critical: [30, 240], high: [120, 480], medium: [240, 1440], low: [480, 2880] },
    problem: { critical: [60, 480], high: [240, 1440], medium: [480, 2880], low: [960, 5760] },
    change: { critical: [120, 960], high: [240, 1440], medium: [480, 2880], low: [960, 5760] },
    request: { critical: [60, 480], high: [120, 960], medium: [240, 1440], low: [480, 2880] },
  };
  const pack = partyKind === 'principal' ? principal : vendor;
  return (['incident', 'problem', 'change', 'request'] as const).flatMap((ticketType) =>
    (['critical', 'high', 'medium', 'low'] as const).map((priority) => ({
      ticketType,
      priority,
      responseMinutes: pack[ticketType][priority][0],
      resolveMinutes: pack[ticketType][priority][1],
    })),
  );
}

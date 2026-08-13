import { z } from 'zod';
import { ticketPrioritySchema, ticketTypeSchema } from '@/lib/tickets/schema';
import { WEEKDAYS, type DayKey } from '@/lib/sla/calendar';

const hm = z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/);

export const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().max(80).optional().default(''),
});

export const businessHoursSchema = z.record(
  z.enum(WEEKDAYS),
  z.array(z.tuple([hm, hm])).optional(),
);

export const slaCalendarSchema = z.object({
  name: z.string().min(2).max(120),
  timezone: z.string().min(1).max(80).default('Asia/Jakarta'),
  is24x7: z.boolean().optional().default(false),
  businessHours: businessHoursSchema.optional(),
  holidays: z.array(holidaySchema).optional().default([]),
});

export const slaTargetInputSchema = z.object({
  ticketType: ticketTypeSchema,
  priority: ticketPrioritySchema,
  responseMinutes: z.coerce.number().int().min(1).max(200000),
  resolveMinutes: z.coerce.number().int().min(1).max(200000),
});

export const slaAgreementUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  pauseOnWaiting: z.boolean().optional(),
  isActive: z.boolean().optional(),
  calendar: slaCalendarSchema.optional(),
  targets: z.array(slaTargetInputSchema).optional(),
});

export type SlaHoliday = z.infer<typeof holidaySchema>;
export type SlaTargetInput = z.infer<typeof slaTargetInputSchema>;

export type SlaTarget = {
  id: string;
  ticketType: z.infer<typeof ticketTypeSchema>;
  priority: z.infer<typeof ticketPrioritySchema>;
  responseMinutes: number;
  resolveMinutes: number;
};

export type SlaCalendar = {
  id: string;
  tenantId: string;
  accountId?: string;
  name: string;
  timezone: string;
  is24x7: boolean;
  businessHours: Partial<Record<DayKey, Array<[string, string]>>>;
  holidays: SlaHoliday[];
};

export type SlaAgreement = {
  id: string;
  tenantId: string;
  accountId: string;
  calendarId: string;
  name: string;
  pauseOnWaiting: boolean;
  isActive: boolean;
  calendar: SlaCalendar;
  targets: SlaTarget[];
  createdAt: string;
};

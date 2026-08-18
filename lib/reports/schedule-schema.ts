import { z } from 'zod';

export const REPORT_RANGE_DAYS = [1, 7, 30] as const;
export const REPORT_SEND_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
export const DEFAULT_REPORT_TIMEZONE = 'Asia/Jakarta';

export const reportScheduleSchema = z.object({
  isActive: z.boolean(),
  recipients: z.string().max(2000),
  rangeDays: z.union([z.literal(1), z.literal(7), z.literal(30)]),
  sendHour: z.number().int().min(0).max(23),
  timezone: z.string().min(3).max(80).default(DEFAULT_REPORT_TIMEZONE),
  includeAging: z.boolean(),
});

export type ReportScheduleInput = z.infer<typeof reportScheduleSchema>;

export type ReportSchedule = ReportScheduleInput & {
  id?: string;
  lastSentOn?: string | null;
  lastSentAt?: string | null;
  lastOk?: boolean | null;
  lastError?: string | null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseReportRecipients(raw: string) {
  return raw
    .split(/[,;\n]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item, index, list) => EMAIL.test(item) && list.indexOf(item) === index)
    .slice(0, 20);
}

export function emptyReportSchedule(): ReportSchedule {
  return {
    isActive: false,
    recipients: '',
    rangeDays: 7,
    sendHour: 7,
    timezone: DEFAULT_REPORT_TIMEZONE,
    includeAging: true,
    lastSentOn: null,
    lastSentAt: null,
    lastOk: null,
    lastError: null,
  };
}

export function clockInZone(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const dateKey = `${read('year')}-${read('month')}-${read('day')}`;
  return { dateKey, hour: Number(read('hour')) || 0 };
}
